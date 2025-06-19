// 修正版 parseContent.ts - URL優先対応
import {
  NIP19_PATTERNS,
  URL_PATTERN,
  TokenType,
  LN_URL_PATTERN,
  LNBC_PATTERN,
  CASHU_TOKEN_PATTERN,
  BITCOIN_ADDRESS_PATTERNS,
  EMAIL_PATTERN,
  CUSTOM_EMOJI_PATTERN,
  HASHTAG_PATTERN,
  LN_ADDRESS_PATTERN,
  NIP19_PLAIN_PATTERNS,
  NIP_IDENTIFIER_PATTERN,
  Token,
  parseNipIdentifier,
  isLightningAddress,
  findCustomEmojiMetadata,
  cleanUrlEnd,
} from "./patterns";

function createToken(
  type: TokenType,
  content: string,
  start: number,
  end: number,
  metadata: Record<string, unknown> = {}
): Token {
  return { type, content, start, end, metadata };
}

function isOverlapping(
  start1: number,
  end1: number,
  start2: number,
  end2: number
): boolean {
  return start1 < end2 && start2 < end1;
}

// URLを最初に処理して、その範囲を保護する
function findUrlTokens(content: string): Token[] {
  const urlTokens: Token[] = [];
  const pattern = new RegExp(URL_PATTERN.source, URL_PATTERN.flags);
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(content)) !== null) {
    const originalUrl = match[0];
    const cleanedUrl = cleanUrlEnd(originalUrl);
    const start = match.index;
    const end = start + cleanedUrl.length;

    urlTokens.push(createToken(TokenType.URL, cleanedUrl, start, end));

    // 除去された部分をTEXTトークンとして追加
    if (cleanedUrl !== originalUrl) {
      const removedPart = originalUrl.slice(cleanedUrl.length);
      urlTokens.push(
        createToken(
          TokenType.TEXT,
          removedPart,
          start + cleanedUrl.length,
          start + originalUrl.length
        )
      );
    }
  }

  return urlTokens;
}

const PATTERN_CONFIGS = [
  {
    patterns: { nip_identifier: NIP_IDENTIFIER_PATTERN },
    handler: (match: RegExpExecArray, type: string) => {
      try {
        const nipInfo = parseNipIdentifier(match[0]);
        return { type: TokenType.NIP_IDENTIFIER, metadata: nipInfo };
      } catch {
        return null;
      }
    },
  },
  {
    patterns: { ln_url: LN_URL_PATTERN },
    handler: () => ({ type: TokenType.LN_URL }),
  },
  {
    patterns: { lnbc: LNBC_PATTERN },
    handler: () => ({ type: TokenType.LNBC }),
  },
  {
    patterns: { cashu_token: CASHU_TOKEN_PATTERN },
    handler: () => ({ type: TokenType.CASHU_TOKEN }),
  },
  {
    patterns: BITCOIN_ADDRESS_PATTERNS,
    handler: (match: RegExpExecArray, addressType: string) => ({
      type: TokenType.BITCOIN_ADDRESS,
      metadata: { addressType },
    }),
  },
  {
    patterns: { email: EMAIL_PATTERN },
    handler: (match: RegExpExecArray) => {
      const emailLike = match[0];
      const isLN = isLightningAddress(emailLike);
      return {
        type: isLN ? TokenType.LN_ADDRESS : TokenType.EMAIL,
        metadata: isLN ? { domain: emailLike.split("@")[1] } : {},
      };
    },
  },
  {
    patterns: { custom_emoji: CUSTOM_EMOJI_PATTERN },
    handler: (match: RegExpExecArray, type: string, tags: string[][]) => {
      const emojiName = match[1];
      const metadata = findCustomEmojiMetadata(emojiName, tags);
      return {
        type: TokenType.CUSTOM_EMOJI,
        metadata: { name: emojiName, ...metadata },
      };
    },
  },
  {
    patterns: { hashtag: HASHTAG_PATTERN },
    handler: (match: RegExpExecArray) => ({
      type: TokenType.HASHTAG,
      metadata: { tag: match[0].slice(1) },
    }),
  },
];

function processNip19Patterns(
  content: string,
  patterns: typeof NIP19_PATTERNS,
  matches: Token[],
  protectedRanges: Token[]
): void {
  Object.entries(patterns).forEach(([type, rawPattern]) => {
    const pattern = new RegExp(rawPattern.source, rawPattern.flags);
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(content)) !== null) {
      const [matchedContent] = match;
      const start = match.index;
      const end = start + matchedContent.length;

      // 既存のマッチとの重複チェック
      const hasOverlap = matches.some((m) =>
        isOverlapping(start, end, m.start, m.end)
      );

      // 保護された範囲（URL等）との重複チェック
      const isInProtectedRange = protectedRanges.some((p) =>
        isOverlapping(start, end, p.start, p.end)
      );

      if (!hasOverlap && !isInProtectedRange) {
        matches.push(
          createToken(type as TokenType, matchedContent, start, end, {
            hasNostrPrefix: matchedContent.startsWith("nostr:"),
            plainNip19: matchedContent.replace(/^nostr:/, ""),
          })
        );
      }
    }
  });
}

function processPatterns(
  content: string,
  matches: Token[],
  tags: string[][] = [],
  protectedRanges: Token[] = []
): void {
  for (const config of PATTERN_CONFIGS) {
    for (const [patternType, rawPattern] of Object.entries(config.patterns)) {
      const pattern = new RegExp(rawPattern.source, rawPattern.flags);
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(content)) !== null) {
        const start = match.index;
        const end = start + match[0].length;

        // 既存のマッチとの重複チェック
        if (matches.some((m) => isOverlapping(start, end, m.start, m.end)))
          continue;

        // 保護された範囲との重複チェック
        if (
          protectedRanges.some((p) => isOverlapping(start, end, p.start, p.end))
        )
          continue;

        const result = config.handler(match, patternType, tags);
        if (result) {
          matches.push(
            createToken(
              result.type,
              match[0],
              start,
              end,
              "metadata" in result ? result.metadata : {}
            )
          );
        }
      }
    }
  }
}

//重なったトークン同士があったとき、どちらを優先するか
const PRIORITY: Record<TokenType, number> = {
  [TokenType.URL]: 15,
  [TokenType.NPUB]: 10,
  [TokenType.NPROFILE]: 10,
  [TokenType.NOTE]: 10,
  [TokenType.NEVENT]: 10,
  [TokenType.NADDR]: 10,
  [TokenType.NSEC]: 10,

  [TokenType.CASHU_TOKEN]: 2,
  [TokenType.LNBC]: 2,
  [TokenType.LN_URL]: 2,
  [TokenType.LN_ADDRESS]: 2,

  [TokenType.CUSTOM_EMOJI]: 1,
  [TokenType.BITCOIN_ADDRESS]: 1,
  [TokenType.EMAIL]: 1,

  [TokenType.HASHTAG]: 0,
  [TokenType.NIP_IDENTIFIER]: 0,
  [TokenType.MENTION]: 0,
  [TokenType.TEXT]: 0,
};

function removeOverlaps(matches: Token[]): Token[] {
  const sorted = [...matches].sort((a, b) => {
    if (a.start !== b.start) return a.start - b.start;
    if (a.end !== b.end) return b.end - a.end; // 長い方を先に
    return (PRIORITY[b.type] ?? 0) - (PRIORITY[a.type] ?? 0);
  });

  const result: Token[] = [];

  for (const token of sorted) {
    const overlapIndex = result.findIndex((t) =>
      isOverlapping(t.start, t.end, token.start, token.end)
    );

    if (overlapIndex === -1) {
      result.push(token);
    } else {
      const existing = result[overlapIndex];

      const tokenPriority = PRIORITY[token.type] ?? 0;
      const existingPriority = PRIORITY[existing.type] ?? 0;

      // 同じ位置でも「より外側のトークンを優先」
      const tokenLength = token.end - token.start;
      const existingLength = existing.end - existing.start;

      const shouldReplace =
        tokenPriority > existingPriority ||
        (tokenPriority === existingPriority && tokenLength > existingLength);

      if (shouldReplace) {
        result.splice(overlapIndex, 1, token);
      }
      // else: skip token
    }
  }

  return result.sort((a, b) => a.start - b.start); // 再整列
}

export function parseContent(
  content: string,
  tags: string[][] = [],
  options: { includeNostrPrefixOnly?: boolean } = {}
): Token[] {
  if (!content) return [];
  const { includeNostrPrefixOnly = true } = options;

  // 最初にURLを検出して保護範囲を設定
  const urlTokens = findUrlTokens(content);
  const matches: Token[] = [...urlTokens];

  // NIP-19パターンを処理（URLの範囲を除外）
  processNip19Patterns(content, NIP19_PATTERNS, matches, urlTokens);
  if (!includeNostrPrefixOnly) {
    processNip19Patterns(content, NIP19_PLAIN_PATTERNS, matches, urlTokens);
  }

  // その他のパターンを処理（URLの範囲を除外）
  processPatterns(content, matches, tags, urlTokens);

  // 重複を除去
  const filteredMatches = removeOverlaps(matches);

  // テキストトークンを挿入
  const tokens: Token[] = [];
  let currentPos = 0;
  for (const match of filteredMatches) {
    if (match.start > currentPos) {
      tokens.push(
        createToken(
          TokenType.TEXT,
          content.slice(currentPos, match.start),
          currentPos,
          match.start
        )
      );
    }
    tokens.push(match);
    currentPos = match.end;
  }
  if (currentPos < content.length) {
    tokens.push(
      createToken(
        TokenType.TEXT,
        content.slice(currentPos),
        currentPos,
        content.length
      )
    );
  }
  return tokens;
}

export function filterTokens<T extends TokenType>(
  tokens: Token[],
  types: T | T[]
): Token[] {
  const typeSet = new Set(Array.isArray(types) ? types : [types]);
  return tokens.filter((token) => typeSet.has(token.type as T));
}

export function filterTokensBy(
  tokens: Token[],
  predicate: (token: Token) => boolean
): Token[] {
  return tokens.filter(predicate);
}

export function getNip19Entities(tokens: Token[]): Token[] {
  return filterTokens(tokens, [
    TokenType.NPUB,
    TokenType.NPROFILE,
    TokenType.NOTE,
    TokenType.NEVENT,
    TokenType.NADDR,
    TokenType.NSEC,
  ]);
}

export function getNipIdentifiers(tokens: Token[]): Token[] {
  return filterTokens(tokens, TokenType.NIP_IDENTIFIER);
}

export function getUrls(tokens: Token[]): Token[] {
  return filterTokens(tokens, TokenType.URL);
}

export function getCustomEmojis(tokens: Token[]): Token[] {
  return filterTokens(tokens, TokenType.CUSTOM_EMOJI);
}

export function getHashtags(tokens: Token[]): Token[] {
  return filterTokens(tokens, TokenType.HASHTAG);
}

export function getLightningAddresses(tokens: Token[]): Token[] {
  return filterTokens(tokens, TokenType.LN_ADDRESS);
}

export function getLightningUrls(tokens: Token[]): Token[] {
  return filterTokens(tokens, TokenType.LN_URL);
}

export function getLightningInvoices(tokens: Token[]): Token[] {
  return filterTokens(tokens, TokenType.LNBC);
}

export function getBitcoinAddresses(tokens: Token[]): Token[] {
  return filterTokens(tokens, TokenType.BITCOIN_ADDRESS);
}

export function getCashuTokens(tokens: Token[]): Token[] {
  return filterTokens(tokens, TokenType.CASHU_TOKEN);
}

export function getEmails(tokens: Token[]): Token[] {
  return filterTokens(tokens, TokenType.EMAIL);
}

export function resetPatterns(): void {
  const allPatterns = [
    ...Object.values(NIP19_PATTERNS),
    ...Object.values(NIP19_PLAIN_PATTERNS),
    ...Object.values(BITCOIN_ADDRESS_PATTERNS),
    URL_PATTERN,
    LN_ADDRESS_PATTERN,
    LN_URL_PATTERN,
    LNBC_PATTERN,
    EMAIL_PATTERN,
    CASHU_TOKEN_PATTERN,
    CUSTOM_EMOJI_PATTERN,
    HASHTAG_PATTERN,
    NIP_IDENTIFIER_PATTERN,
  ];
  allPatterns.forEach((pattern) => (pattern.lastIndex = 0));
}
