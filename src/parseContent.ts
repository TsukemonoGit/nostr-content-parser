// 型安全版 parseContent.ts
import {
  NIP19_PATTERNS,
  URL_PATTERN,
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
  TokenType,
  type Token,
  type TokenTypeValue,
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

// 型安全なトークン作成関数群
function createNip19Token(
  content: string,
  start: number,
  end: number,
  plainNip19: string,
  subType: NIP19SubType,
  hasNostrPrefix: boolean,
): Token {
  return {
    type: TokenType.NIP19,
    content,
    start,
    end,
    metadata: { plainNip19, subType, hasNostrPrefix },
  };
}

function createNipIdentifierToken(
  content: string,
  start: number,
  end: number,
  number: string,
): Token {
  return {
    type: TokenType.NIP_IDENTIFIER,
    content,
    start,
    end,
    metadata: { number },
  };
}

function createCustomEmojiToken(
  content: string,
  start: number,
  end: number,
  name: string,
  url?: string,
): Token {
  if (url) {
    return {
      type: TokenType.CUSTOM_EMOJI,
      content,
      start,
      end,
      metadata: { url, name, hasMetadata: true },
    };
  } else {
    return {
      type: TokenType.CUSTOM_EMOJI,
      content,
      start,
      end,
      metadata: { name, hasMetadata: false },
    };
  }
}

function createHashtagToken(
  content: string,
  start: number,
  end: number,
  tag: string,
  validated: boolean,
): Token {
  return {
    type: TokenType.HASHTAG,
    content,
    start,
    end,
    metadata: { tag, validated },
  };
}

function createUrlToken(
  content: string,
  start: number,
  end: number,
  scheme?: string,
  type?: "image" | "video" | "audio",
): Token {
  const metadata: { scheme?: string; type?: "image" | "video" | "audio" } = {};
  if (scheme) metadata.scheme = scheme;
  if (type) metadata.type = type;

  return {
    type: TokenType.URL,
    content,
    start,
    end,
    ...(Object.keys(metadata).length > 0 ? { metadata } : {}),
  };
}

function createSimpleToken(
  type: "text" | "ln_url" | "lnbc",
  content: string,
  start: number,
  end: number,
): Token {
  return { type, content, start, end };
}

function isOverlapping(
  start1: number,
  end1: number,
  start2: number,
  end2: number,
): boolean {
  return start1 < end2 && start2 < end1;
}

function detectUrlTypeFromExtension(
  url: string,
): "image" | "video" | "audio" | undefined {
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

const urlTypeCache = new Map<string, "image" | "video" | "audio">();

async function fetchUrlContentType(
  url: string,
): Promise<"image" | "video" | "audio" | undefined> {
  if (urlTypeCache.has(url)) {
    return urlTypeCache.get(url);
  }

  try {
    const res = await fetch(url, { method: "HEAD" });
    const contentType = res.headers.get("Content-Type") || "";
    let type: "image" | "video" | "audio" | undefined;

    if (contentType.startsWith("video/")) type = "video";
    else if (contentType.startsWith("audio/")) type = "audio";
    else if (contentType.startsWith("image/")) type = "image";

    if (type) {
      urlTypeCache.set(url, type);
    }

    return type;
  } catch {
    return undefined;
  }
}

function extractHashtagsFromTags(tags: string[][]): Set<string> {
  const hashtags = new Set<string>();
  for (const tag of tags) {
    if (tag.length >= 2 && tag[0] === "t") {
      hashtags.add(tag[1].toLowerCase());
    }
  }
  return hashtags;
}

function findUrlTokensSync(content: string): Token[] {
  const urlTokens: Token[] = [];
  const pattern = new RegExp(URL_PATTERN.source, URL_PATTERN.flags);
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(content)) !== null) {
    const originalUrl = match[0];
    const cleanedUrl = cleanUrlEnd(originalUrl);
    const start = match.index;
    const end = start + cleanedUrl.length;

    if (cleanedUrl.length === 0) {
      continue;
    }

    const scheme = cleanedUrl.startsWith("https://")
      ? "https"
      : cleanedUrl.startsWith("http://")
        ? "http"
        : undefined;

    const detectedType = detectUrlTypeFromExtension(cleanedUrl);

    urlTokens.push(
      createUrlToken(cleanedUrl, start, end, scheme, detectedType),
    );

    if (cleanedUrl !== originalUrl) {
      const newLastIndex = start + cleanedUrl.length;
      if (newLastIndex > pattern.lastIndex) {
        pattern.lastIndex = newLastIndex;
      }
    }
  }

  return urlTokens;
}

async function findUrlTokensAsync(content: string): Promise<Token[]> {
  const urlTokens: Token[] = [];
  const pattern = new RegExp(URL_PATTERN.source, URL_PATTERN.flags);
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(content)) !== null) {
    const originalUrl = match[0];
    const cleanedUrl = cleanUrlEnd(originalUrl);
    const start = match.index;
    const end = start + cleanedUrl.length;

    if (cleanedUrl.length === 0) {
      continue;
    }

    const scheme = cleanedUrl.startsWith("https://")
      ? "https"
      : cleanedUrl.startsWith("http://")
        ? "http"
        : undefined;

    let detectedType = detectUrlTypeFromExtension(cleanedUrl);

    if (!detectedType) {
      const fetchedType = await fetchUrlContentType(cleanedUrl);
      if (fetchedType) detectedType = fetchedType;
    }

    urlTokens.push(
      createUrlToken(cleanedUrl, start, end, scheme, detectedType),
    );

    if (cleanedUrl !== originalUrl) {
      const newLastIndex = start + cleanedUrl.length;
      if (newLastIndex > pattern.lastIndex) {
        pattern.lastIndex = newLastIndex;
      }
    }
  }

  return urlTokens;
}

function processNip19Patterns(
  content: string,
  patterns: typeof NIP19_PATTERNS,
  matches: Token[],
  protectedRanges: Token[],
): void {
  Object.entries(patterns).forEach(([oldType, rawPattern]) => {
    const pattern = new RegExp(rawPattern.source, rawPattern.flags);
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(content)) !== null) {
      const [matchedContent] = match;
      const start = match.index;
      const end = start + matchedContent.length;

      const hasOverlap = matches.some((m) =>
        isOverlapping(start, end, m.start, m.end),
      );

      const isInProtectedRange = protectedRanges.some((p) =>
        isOverlapping(start, end, p.start, p.end),
      );

      if (!hasOverlap && !isInProtectedRange) {
        const hasNostrPrefix = matchedContent.startsWith("nostr:");
        const plainNip19 = matchedContent.replace(/^nostr:/, "");
        const subType = (NIP19_TYPE_MAP[oldType] || oldType) as NIP19SubType;
        matches.push(
          createNip19Token(
            matchedContent,
            start,
            end,
            plainNip19,
            subType,
            hasNostrPrefix,
          ),
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
  hashtagsFromTagsOnly: boolean = true,
): void {
  const validHashtags = hashtagsFromTagsOnly
    ? extractHashtagsFromTags(tags)
    : null;

  // NIP_IDENTIFIER
  {
    const pattern = new RegExp(
      NIP_IDENTIFIER_PATTERN.source,
      NIP_IDENTIFIER_PATTERN.flags,
    );
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(content)) !== null) {
      const start = match.index;
      const end = start + match[0].length;

      if (matches.some((m) => isOverlapping(start, end, m.start, m.end)))
        continue;
      if (
        protectedRanges.some((p) => isOverlapping(start, end, p.start, p.end))
      )
        continue;

      try {
        const nipInfo = parseNipIdentifier(match[0]);
        matches.push(
          createNipIdentifierToken(match[0], start, end, nipInfo.number),
        );
      } catch {
        // パース失敗時はスキップ
      }
    }
  }

  // LEGACY_REFERENCE
  {
    const pattern = new RegExp(
      LEGACY_REFERENCE_PATTERN.source,
      LEGACY_REFERENCE_PATTERN.flags,
    );
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(content)) !== null) {
      const start = match.index;
      const end = start + match[0].length;

      if (matches.some((m) => isOverlapping(start, end, m.start, m.end)))
        continue;
      if (
        protectedRanges.some((p) => isOverlapping(start, end, p.start, p.end))
      )
        continue;

      const metadata = findLegacyReferenceMetadata(match[0], tags);
      if (metadata) {
        matches.push({
          type: TokenType.LEGACY_REFERENCE,
          content: match[0],
          start,
          end,
          metadata,
        } as Token);
      }
    }
  }

  // RELAY
  {
    const pattern = new RegExp(
      RELAY_URL_PATTERN.source,
      RELAY_URL_PATTERN.flags,
    );
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(content)) !== null) {
      const start = match.index;
      const end = start + match[0].length;

      if (matches.some((m) => isOverlapping(start, end, m.start, m.end)))
        continue;
      if (
        protectedRanges.some((p) => isOverlapping(start, end, p.start, p.end))
      )
        continue;

      const url = match[0];
      const scheme = url.startsWith("wss://")
        ? "wss"
        : url.startsWith("ws://")
          ? "ws"
          : "wss";

      matches.push({
        type: TokenType.RELAY,
        content: match[0],
        start,
        end,
        metadata: { scheme },
      } as Token);
    }
  }

  // LN_URL
  {
    const pattern = new RegExp(LN_URL_PATTERN.source, LN_URL_PATTERN.flags);
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(content)) !== null) {
      const start = match.index;
      const end = start + match[0].length;

      if (matches.some((m) => isOverlapping(start, end, m.start, m.end)))
        continue;
      if (
        protectedRanges.some((p) => isOverlapping(start, end, p.start, p.end))
      )
        continue;

      matches.push(createSimpleToken(TokenType.LN_URL, match[0], start, end));
    }
  }

  // LNBC
  {
    const pattern = new RegExp(LNBC_PATTERN.source, LNBC_PATTERN.flags);
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(content)) !== null) {
      const start = match.index;
      const end = start + match[0].length;

      if (matches.some((m) => isOverlapping(start, end, m.start, m.end)))
        continue;
      if (
        protectedRanges.some((p) => isOverlapping(start, end, p.start, p.end))
      )
        continue;

      matches.push(createSimpleToken(TokenType.LNBC, match[0], start, end));
    }
  }

  // CASHU_TOKEN
  {
    const pattern = new RegExp(
      CASHU_TOKEN_PATTERN.source,
      CASHU_TOKEN_PATTERN.flags,
    );
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(content)) !== null) {
      const start = match.index;
      const end = start + match[0].length;

      if (matches.some((m) => isOverlapping(start, end, m.start, m.end)))
        continue;
      if (
        protectedRanges.some((p) => isOverlapping(start, end, p.start, p.end))
      )
        continue;

      matches.push({
        type: TokenType.CASHU_TOKEN,
        content: match[0],
        start,
        end,
      } as Token);
    }
  }

  // BITCOIN_ADDRESS
  {
    for (const [addressType, rawPattern] of Object.entries(
      BITCOIN_ADDRESS_PATTERNS,
    )) {
      const pattern = new RegExp(rawPattern.source, rawPattern.flags);
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(content)) !== null) {
        const start = match.index;
        const end = start + match[0].length;

        if (matches.some((m) => isOverlapping(start, end, m.start, m.end)))
          continue;
        if (
          protectedRanges.some((p) => isOverlapping(start, end, p.start, p.end))
        )
          continue;

        matches.push({
          type: TokenType.BITCOIN_ADDRESS,
          content: match[0],
          start,
          end,
          metadata: { addressType },
        } as Token);
      }
    }
  }

  // EMAIL / LN_ADDRESS
  {
    const pattern = new RegExp(EMAIL_PATTERN.source, EMAIL_PATTERN.flags);
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(content)) !== null) {
      const start = match.index;
      const end = start + match[0].length;

      if (matches.some((m) => isOverlapping(start, end, m.start, m.end)))
        continue;
      if (
        protectedRanges.some((p) => isOverlapping(start, end, p.start, p.end))
      )
        continue;

      const emailLike = match[0];
      const isLN = isLightningAddress(emailLike);

      matches.push({
        type: isLN ? TokenType.LN_ADDRESS : TokenType.EMAIL,
        content: match[0],
        start,
        end,
        ...(isLN ? { metadata: { domain: emailLike.split("@")[1] } } : {}),
      } as Token);
    }
  }

  // CUSTOM_EMOJI
  {
    const pattern = new RegExp(
      CUSTOM_EMOJI_PATTERN.source,
      CUSTOM_EMOJI_PATTERN.flags,
    );
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(content)) !== null) {
      const start = match.index;
      const end = start + match[0].length;

      if (matches.some((m) => isOverlapping(start, end, m.start, m.end)))
        continue;
      if (
        protectedRanges.some((p) => isOverlapping(start, end, p.start, p.end))
      )
        continue;

      const emojiName = match[1];
      const metadata = findCustomEmojiMetadata(emojiName, tags);

      // タグありでもなしでもカスタム絵文字トークンを作成
      matches.push(
        createCustomEmojiToken(match[0], start, end, emojiName, metadata?.url),
      );
    }
  }

  // HASHTAG
  processHashtagPatterns(content, matches, protectedRanges, validHashtags);
}

function processHashtagPatterns(
  content: string,
  matches: Token[],
  protectedRanges: Token[],
  validHashtags: Set<string> | null,
): void {
  const pattern = new RegExp(HASHTAG_PATTERN.source, HASHTAG_PATTERN.flags);
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(content)) !== null) {
    const start = match.index;
    const end = start + match[0].length;
    const hashtag = match[0].slice(1);

    if (matches.some((m) => isOverlapping(start, end, m.start, m.end)))
      continue;
    if (protectedRanges.some((p) => isOverlapping(start, end, p.start, p.end)))
      continue;

    if (validHashtags && !validHashtags.has(hashtag.toLowerCase())) {
      continue;
    }

    matches.push(
      createHashtagToken(match[0], start, end, hashtag, validHashtags !== null),
    );
  }
}

const PRIORITY: Record<TokenTypeValue, number> = {
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
    if (a.end !== b.end) return b.end - a.end;
    return (PRIORITY[b.type] ?? 0) - (PRIORITY[a.type] ?? 0);
  });

  const result: Token[] = [];

  for (const token of sorted) {
    const overlapIndex = result.findIndex((t) =>
      isOverlapping(t.start, t.end, token.start, token.end),
    );

    if (overlapIndex === -1) {
      result.push(token);
    } else {
      const existing = result[overlapIndex];
      const tokenPriority = PRIORITY[token.type] ?? 0;
      const existingPriority = PRIORITY[existing.type] ?? 0;
      const tokenLength = token.end - token.start;
      const existingLength = existing.end - existing.start;

      const shouldReplace =
        tokenPriority > existingPriority ||
        (tokenPriority === existingPriority && tokenLength > existingLength);

      if (shouldReplace) {
        result.splice(overlapIndex, 1, token);
      }
    }
  }

  return result.sort((a, b) => a.start - b.start);
}

function buildTokens(content: string, matches: Token[]): Token[] {
  const filteredMatches = removeOverlaps(matches);

  const tokens: Token[] = [];
  let currentPos = 0;
  for (const match of filteredMatches) {
    if (match.start > currentPos) {
      tokens.push(
        createSimpleToken(
          TokenType.TEXT,
          content.slice(currentPos, match.start),
          currentPos,
          match.start,
        ),
      );
    }
    tokens.push(match);
    currentPos = match.end;
  }
  if (currentPos < content.length) {
    tokens.push(
      createSimpleToken(
        TokenType.TEXT,
        content.slice(currentPos),
        currentPos,
        content.length,
      ),
    );
  }
  return tokens;
}

export interface ParseOptions {
  includeNostrPrefixOnly?: boolean;
  hashtagsFromTagsOnly?: boolean;
}

export function parseContent(
  content: string,
  tags: string[][] = [],
  options: ParseOptions = {},
): Token[] {
  if (!content) return [];
  const { includeNostrPrefixOnly = true, hashtagsFromTagsOnly = true } =
    options;

  const urlTokens = findUrlTokensSync(content);

  processNip19Patterns(content, NIP19_PATTERNS, urlTokens, urlTokens);
  if (!includeNostrPrefixOnly) {
    processNip19Patterns(content, NIP19_PLAIN_PATTERNS, urlTokens, urlTokens);
  }

  processPatterns(content, urlTokens, tags, urlTokens, hashtagsFromTagsOnly);

  return buildTokens(content, urlTokens);
}

export async function parseContentAsync(
  content: string,
  tags: string[][] = [],
  options: ParseOptions = {},
): Promise<Token[]> {
  if (!content) return [];
  const { includeNostrPrefixOnly = true, hashtagsFromTagsOnly = true } =
    options;

  const urlTokens = await findUrlTokensAsync(content);

  processNip19Patterns(content, NIP19_PATTERNS, urlTokens, urlTokens);
  if (!includeNostrPrefixOnly) {
    processNip19Patterns(content, NIP19_PLAIN_PATTERNS, urlTokens, urlTokens);
  }

  processPatterns(content, urlTokens, tags, urlTokens, hashtagsFromTagsOnly);

  return buildTokens(content, urlTokens);
}

export function filterTokens<T extends TokenTypeValue>(
  tokens: Token[],
  types: T | T[],
): Token[] {
  const typeSet = new Set(Array.isArray(types) ? types : [types]);
  return tokens.filter((token) => typeSet.has(token.type as T));
}

export function filterTokensBy(
  tokens: Token[],
  predicate: (token: Token) => boolean,
): Token[] {
  return tokens.filter(predicate);
}

export function getNip19Entities(tokens: Token[]): Token[] {
  return filterTokens(tokens, TokenType.NIP19);
}

export function filterNip19BySubType(
  tokens: Token[],
  subType: NIP19SubType | NIP19SubType[],
): Token[] {
  const subTypeSet = new Set(Array.isArray(subType) ? subType : [subType]);
  return tokens.filter(
    (token) =>
      token.type === TokenType.NIP19 && subTypeSet.has(token.metadata.subType),
  );
}

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

export function getValidatedHashtags(tokens: Token[]): Token[] {
  return tokens.filter(
    (token) =>
      token.type === TokenType.HASHTAG && token.metadata.validated === true,
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
