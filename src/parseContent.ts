// 修正版 parseContent.ts - ハッシュタグオプション追加
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
  RELAY_URL_PATTERN,
  NIP19_TYPE_MAP,
  NIP19SubType,
  LEGACY_REFERENCE_PATTERN,
  findLegacyReferenceMetadata,
} from "./patterns.js";

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

function detectUrlTypeFromExtension(url: string): string | undefined {
  const ext = url.split("?")[0].split("#")[0].split(".").pop()?.toLowerCase();
  if (!ext) return;

  const videoExt = ["mp4", "webm", "mov", "mkv"];
  const audioExt = ["mp3", "wav", "ogg", "flac"];
  const imageExt = ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"];

  if (videoExt.includes(ext)) return "video";
  if (audioExt.includes(ext)) return "audio";
  if (imageExt.includes(ext)) return "image";
  return;
}

// tタグからハッシュタグセットを作成
function extractHashtagsFromTags(tags: string[][]): Set<string> {
  const hashtags = new Set<string>();
  for (const tag of tags) {
    if (tag.length >= 2 && tag[0] === "t") {
      hashtags.add(tag[1].toLowerCase());
    }
  }
  return hashtags;
}

// 同期版：拡張子ベースの判定のみ
function findUrlTokensSync(content: string): Token[] {
  const urlTokens: Token[] = [];
  const pattern = new RegExp(URL_PATTERN.source, URL_PATTERN.flags);
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(content)) !== null) {
    const originalUrl = match[0];
    const cleanedUrl = cleanUrlEnd(originalUrl);
    const start = match.index;
    const end = start + cleanedUrl.length;

    // 無限ループ防止: cleanedUrlが空の場合はスキップ
    if (cleanedUrl.length === 0) {
      continue;
    }

    const scheme = cleanedUrl.startsWith("https://")
      ? "https"
      : cleanedUrl.startsWith("http://")
      ? "http"
      : null;

    const metadata: Record<string, unknown> = { scheme };

    const detectedType = detectUrlTypeFromExtension(cleanedUrl);
    if (detectedType) {
      metadata.type = detectedType;
    }

    urlTokens.push(
      createToken(TokenType.URL, cleanedUrl, start, end, metadata)
    );

    // originalUrlと異なる場合のみlastIndexを調整（パフォーマンス改善）
    if (cleanedUrl !== originalUrl) {
      // 削除された部分から再度パースを開始するため、lastIndexを調整
      const newLastIndex = start + cleanedUrl.length;
      // 前進していることを保証（無限ループ防止）
      if (newLastIndex > pattern.lastIndex) {
        pattern.lastIndex = newLastIndex;
      }
    }
  }

  return urlTokens;
}

// 非同期版：HTTPヘッダーも確認
async function findUrlTokensAsync(content: string): Promise<Token[]> {
  const urlTokens: Token[] = [];
  const pattern = new RegExp(URL_PATTERN.source, URL_PATTERN.flags);
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(content)) !== null) {
    const originalUrl = match[0];
    const cleanedUrl = cleanUrlEnd(originalUrl);
    const start = match.index;
    const end = start + cleanedUrl.length;

    // 無限ループ防止: cleanedUrlが空の場合はスキップ
    if (cleanedUrl.length === 0) {
      continue;
    }

    const scheme = cleanedUrl.startsWith("https://")
      ? "https"
      : cleanedUrl.startsWith("http://")
      ? "http"
      : null;

    const metadata: Record<string, unknown> = { scheme };

    const detectedType = detectUrlTypeFromExtension(cleanedUrl);
    if (detectedType) {
      metadata.type = detectedType;
    } else {
      const fetchedType = await fetchUrlContentType(cleanedUrl);
      if (fetchedType) metadata.type = fetchedType;
    }

    urlTokens.push(
      createToken(TokenType.URL, cleanedUrl, start, end, metadata)
    );

    // originalUrlと異なる場合のみlastIndexを調整（パフォーマンス改善）
    if (cleanedUrl !== originalUrl) {
      // 削除された部分から再度パースを開始するため、lastIndexを調整
      const newLastIndex = start + cleanedUrl.length;
      // 前進していることを保証（無限ループ防止）
      if (newLastIndex > pattern.lastIndex) {
        pattern.lastIndex = newLastIndex;
      }
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
    patterns: { legacy_reference: LEGACY_REFERENCE_PATTERN },
    handler: (match: RegExpExecArray, type: string, tags: string[][]) => {
      const metadata = findLegacyReferenceMetadata(match[0], tags);
      return {
        type: TokenType.LEGACY_REFERENCE,
        metadata: metadata || { tagIndex: -1 },
      };
    },
  },
  {
    patterns: { [TokenType.RELAY]: RELAY_URL_PATTERN },
    handler: (match: RegExpExecArray, type: string, tags: string[][]) => {
      const url = match[0];
      const scheme = url.startsWith("wss://")
        ? "wss"
        : url.startsWith("ws://")
        ? "ws"
        : null;

      return {
        type: TokenType.RELAY,
        metadata: scheme ? { scheme } : {},
      };
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
];

function processNip19Patterns(
  content: string,
  patterns: typeof NIP19_PATTERNS,
  matches: Token[],
  protectedRanges: Token[]
): void {
  Object.entries(patterns).forEach(([oldType, rawPattern]) => {
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
        // NIP19統合: subTypeをmetadataに格納
        const subType = NIP19_TYPE_MAP[oldType] || oldType;
        matches.push(
          createToken(TokenType.NIP19, matchedContent, start, end, {
            subType: subType,
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
  protectedRanges: Token[] = [],
  hashtagsFromTagsOnly: boolean = true
): void {
  const validHashtags = hashtagsFromTagsOnly
    ? extractHashtagsFromTags(tags)
    : null;

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

  // ハッシュタグの処理（別途処理）
  processHashtagPatterns(content, matches, protectedRanges, validHashtags);
}

function processHashtagPatterns(
  content: string,
  matches: Token[],
  protectedRanges: Token[],
  validHashtags: Set<string> | null
): void {
  const pattern = new RegExp(HASHTAG_PATTERN.source, HASHTAG_PATTERN.flags);
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(content)) !== null) {
    const start = match.index;
    const end = start + match[0].length;
    const hashtag = match[0].slice(1); // # を除去

    // 既存のマッチとの重複チェック
    if (matches.some((m) => isOverlapping(start, end, m.start, m.end)))
      continue;

    // 保護された範囲との重複チェック
    if (protectedRanges.some((p) => isOverlapping(start, end, p.start, p.end)))
      continue;

    // tタグ検証が有効な場合のチェック
    if (validHashtags && !validHashtags.has(hashtag.toLowerCase())) {
      continue;
    }

    matches.push(
      createToken(TokenType.HASHTAG, match[0], start, end, {
        tag: hashtag,
        validated: validHashtags !== null,
      })
    );
  }
}

//重なったトークン同士があったとき、どちらを優先するか
const PRIORITY: Record<TokenType, number> = {
  [TokenType.URL]: 15,
  [TokenType.NIP19]: 10,

  [TokenType.RELAY]: 10,
  [TokenType.CASHU_TOKEN]: 2,
  [TokenType.LNBC]: 2,
  [TokenType.LN_URL]: 2,
  [TokenType.LN_ADDRESS]: 2,

  [TokenType.CUSTOM_EMOJI]: 1,
  [TokenType.BITCOIN_ADDRESS]: 1,
  [TokenType.EMAIL]: 1,
  [TokenType.LEGACY_REFERENCE]: 1,

  [TokenType.HASHTAG]: 0,
  [TokenType.NIP_IDENTIFIER]: 0,

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

function buildTokens(content: string, matches: Token[]): Token[] {
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

export interface ParseOptions {
  includeNostrPrefixOnly?: boolean;
  hashtagsFromTagsOnly?: boolean;
}

// 同期版：detectUrlType = falseの場合
export function parseContent(
  content: string,
  tags: string[][] = [],
  options: ParseOptions = {}
): Token[] {
  if (!content) return [];
  const { includeNostrPrefixOnly = true, hashtagsFromTagsOnly = true } =
    options;

  // URLを検出（拡張子ベースのみ）
  const urlTokens = findUrlTokensSync(content);

  // NIP-19パターンを処理（URLの範囲を除外）
  processNip19Patterns(content, NIP19_PATTERNS, urlTokens, urlTokens);
  if (!includeNostrPrefixOnly) {
    processNip19Patterns(content, NIP19_PLAIN_PATTERNS, urlTokens, urlTokens);
  }

  // その他のパターンを処理（URLの範囲を除外）
  processPatterns(content, urlTokens, tags, urlTokens, hashtagsFromTagsOnly);

  return buildTokens(content, urlTokens);
}

// 非同期版：detectUrlType = trueの場合
export async function parseContentAsync(
  content: string,
  tags: string[][] = [],
  options: ParseOptions = {}
): Promise<Token[]> {
  if (!content) return [];
  const { includeNostrPrefixOnly = true, hashtagsFromTagsOnly = true } =
    options;

  // URLを検出（HTTPヘッダーも確認）
  const urlTokens = await findUrlTokensAsync(content);

  // NIP-19パターンを処理（URLの範囲を除外）
  processNip19Patterns(content, NIP19_PATTERNS, urlTokens, urlTokens);
  if (!includeNostrPrefixOnly) {
    processNip19Patterns(content, NIP19_PLAIN_PATTERNS, urlTokens, urlTokens);
  }

  // その他のパターンを処理（URLの範囲を除外）
  processPatterns(content, urlTokens, tags, urlTokens, hashtagsFromTagsOnly);

  return buildTokens(content, urlTokens);
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

// NIP19統合後のフィルター関数
export function getNip19Entities(tokens: Token[]): Token[] {
  return filterTokens(tokens, TokenType.NIP19);
}

// 特定のNIP19サブタイプでフィルター
export function filterNip19BySubType(
  tokens: Token[],
  subType: NIP19SubType | NIP19SubType[]
): Token[] {
  const subTypeSet = new Set(Array.isArray(subType) ? subType : [subType]);
  return tokens.filter(
    (token) =>
      token.type === TokenType.NIP19 &&
      token.metadata?.subType &&
      subTypeSet.has(token.metadata.subType as NIP19SubType)
  );
}

// 個別のNIP19サブタイプ取得関数
export function getNpubs(tokens: Token[]): Token[] {
  return filterNip19BySubType(tokens, NIP19SubType.NPUB);
}

export function getNprofiles(tokens: Token[]): Token[] {
  return filterNip19BySubType(tokens, NIP19SubType.NPROFILE);
}

export function getNotes(tokens: Token[]): Token[] {
  return filterNip19BySubType(tokens, NIP19SubType.NOTE);
}

export function getNevents(tokens: Token[]): Token[] {
  return filterNip19BySubType(tokens, NIP19SubType.NEVENT);
}

export function getNaddrs(tokens: Token[]): Token[] {
  return filterNip19BySubType(tokens, NIP19SubType.NADDR);
}

export function getNsecs(tokens: Token[]): Token[] {
  return filterNip19BySubType(tokens, NIP19SubType.NSEC);
}

export function getNipIdentifiers(tokens: Token[]): Token[] {
  return filterTokens(tokens, TokenType.NIP_IDENTIFIER);
}
// 旧タイプ引用を取得する関数
export function getLegacyReferences(tokens: Token[]): Token[] {
  return filterTokens(tokens, TokenType.LEGACY_REFERENCE);
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

// tタグで検証されたハッシュタグのみを取得
export function getValidatedHashtags(tokens: Token[]): Token[] {
  return tokens.filter(
    (token) =>
      token.type === TokenType.HASHTAG && token.metadata?.validated === true
  );
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
    RELAY_URL_PATTERN,
    LN_ADDRESS_PATTERN,
    LN_URL_PATTERN,
    LNBC_PATTERN,
    EMAIL_PATTERN,
    CASHU_TOKEN_PATTERN,
    CUSTOM_EMOJI_PATTERN,
    HASHTAG_PATTERN,
    NIP_IDENTIFIER_PATTERN,
    LEGACY_REFERENCE_PATTERN,
  ];
  allPatterns.forEach((pattern) => (pattern.lastIndex = 0));
}

// モジュール内キャッシュ
const urlTypeCache = new Map<string, string>(); // cleanedUrl → "image"/"video"/...

async function fetchUrlContentType(url: string): Promise<string | undefined> {
  if (urlTypeCache.has(url)) {
    return urlTypeCache.get(url);
  }

  try {
    const res = await fetch(url, { method: "HEAD" });
    const contentType = res.headers.get("Content-Type") || "";
    let type: string | undefined;

    if (contentType.startsWith("video/")) type = "video";
    else if (contentType.startsWith("audio/")) type = "audio";
    else if (contentType.startsWith("image/")) type = "image";

    if (type) {
      urlTypeCache.set(url, type); // 成功したものだけキャッシュ
    }

    return type;
  } catch {
    return undefined; // ネットワークエラー時はキャッシュしない
  }
}
