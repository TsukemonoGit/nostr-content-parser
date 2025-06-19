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

/**
 * Create a token object
 */
function createToken(
  type: TokenType,
  content: string,
  start: number,
  end: number,
  metadata: Record<string, unknown> = {}
): Token {
  return {
    type,
    content,
    start,
    end,
    metadata,
  };
}

/**
 * Check if two ranges overlap
 */
function isOverlapping(
  start1: number,
  end1: number,
  start2: number,
  end2: number
): boolean {
  return start1 < end2 && start2 < end1;
}

/**
 * Pattern matching configurations
 */
const PATTERN_CONFIGS: {
  patterns: { [key: string]: RegExp };
  handler: (
    match: RegExpExecArray,
    type: string,
    tags: string[][]
  ) => { type: TokenType; metadata?: Record<string, unknown> } | null;
}[] = [
  {
    patterns: { nip_identifier: NIP_IDENTIFIER_PATTERN },
    handler: (match: RegExpExecArray, type: string) => {
      try {
        const nipInfo = parseNipIdentifier(match[0]);
        return {
          type: TokenType.NIP_IDENTIFIER,
          metadata: nipInfo,
        };
      } catch {
        return null; // Skip invalid NIP identifiers
      }
    },
  },
  {
    patterns: { url: URL_PATTERN },
    handler: (match: RegExpExecArray) => {
      const originalUrl = match[0];
      const cleanedUrl = cleanUrlEnd(originalUrl);

      return {
        type: TokenType.URL,
        metadata: {
          cleanedUrl: cleanedUrl,
          removedPart:
            cleanedUrl !== originalUrl
              ? originalUrl.slice(cleanedUrl.length)
              : null,
        },
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
  {
    patterns: { hashtag: HASHTAG_PATTERN },
    handler: (match: RegExpExecArray) => ({
      type: TokenType.HASHTAG,
      metadata: { tag: match[0].slice(1) },
    }),
  },
];

/**
 * Process NIP-19 patterns with prefix handling
 */
function processNip19Patterns(
  content: string,
  patterns: typeof NIP19_PATTERNS,
  matches: Token[]
): void {
  Object.entries(patterns).forEach(([type, pattern]) => {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(content)) !== null) {
      const matchedContent = match[0];
      const start = match.index;
      const end = start + matchedContent.length;

      // Check for overlap with existing matches
      const hasOverlap = matches.some((existing) =>
        isOverlapping(start, end, existing.start, existing.end)
      );

      if (!hasOverlap) {
        matches.push({
          type: type as TokenType,
          content: matchedContent,
          start,
          end,
          metadata: {
            hasNostrPrefix: matchedContent.startsWith("nostr:"),
            plainNip19: matchedContent.startsWith("nostr:")
              ? matchedContent.slice(6)
              : matchedContent,
          },
        });
      }
    }
  });
}

/**
 * Process regular patterns
 */
function processPatterns(
  content: string,
  matches: Token[],
  tags: string[][] = []
): void {
  for (const config of PATTERN_CONFIGS) {
    Object.entries(config.patterns).forEach(([patternType, pattern]) => {
      pattern.lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = pattern.exec(content)) !== null) {
        const start = match.index;
        let end = start + match[0].length;
        let matchContent = match[0];

        // Check for overlap with existing matches
        const hasOverlap = matches.some((existing) =>
          isOverlapping(start, end, existing.start, existing.end)
        );

        if (!hasOverlap) {
          const result = config.handler(match, patternType, tags);
          if (result) {
            // URLの場合の特別処理
            if (result.type === TokenType.URL && result.metadata?.cleanedUrl) {
              const cleanedUrl = result.metadata.cleanedUrl as string;
              const removedPart = result.metadata.removedPart as string;

              // クリーンなURLトークンを追加
              matches.push({
                type: TokenType.URL,
                content: cleanedUrl,
                start,
                end: start + cleanedUrl.length,
                metadata: {},
              });

              // 削除された部分があればTEXTトークンとして追加
              if (removedPart) {
                matches.push(
                  createToken(
                    TokenType.TEXT,
                    removedPart,
                    start + cleanedUrl.length,
                    start + match[0].length
                  )
                );
              }
            } else {
              // その他のトークンはそのまま追加
              matches.push({
                type: result.type,
                content: match[0],
                start,
                end,
                metadata: result.metadata || {},
              });
            }
          }
        }
      }
    });
  }
}

/**
 * Remove overlapping matches, keeping the first occurrence
 */
function removeOverlaps(matches: Token[]): Token[] {
  const sorted = [...matches].sort((a, b) => a.start - b.start);
  const filtered: Token[] = [];
  let lastEnd = 0;

  for (const match of sorted) {
    if (match.start >= lastEnd) {
      filtered.push(match);
      lastEnd = match.end;
    }
  }

  return filtered;
}

/**
 * Parse content into tokens
 */
export function parseContent(
  content: string,
  tags: string[][] = [],
  options: { includeNostrPrefixOnly?: boolean } = {}
): Token[] {
  if (!content) return [];

  const { includeNostrPrefixOnly = true } = options;
  const matches: Token[] = [];

  // Process NIP-19 patterns with prefix handling
  processNip19Patterns(content, NIP19_PATTERNS, matches);

  if (!includeNostrPrefixOnly) {
    processNip19Patterns(content, NIP19_PLAIN_PATTERNS, matches);
  }

  // Process other patterns
  processPatterns(content, matches, tags);

  // Remove overlapping matches
  const filteredMatches = removeOverlaps(matches);

  // Create tokens with text segments
  const tokens: Token[] = [];
  let currentPos = 0;

  for (const match of filteredMatches) {
    // Add text before the match
    if (match.start > currentPos) {
      const textContent = content.slice(currentPos, match.start);
      tokens.push(
        createToken(TokenType.TEXT, textContent, currentPos, match.start)
      );
    }

    // Add the match token
    tokens.push(match);
    currentPos = match.end;
  }

  // Add remaining text
  if (currentPos < content.length) {
    const textContent = content.slice(currentPos);
    tokens.push(
      createToken(TokenType.TEXT, textContent, currentPos, content.length)
    );
  }

  return tokens;
}

/**
 * Filter tokens by type(s)
 */
export function filterTokens<T extends TokenType>(
  tokens: Token[],
  types: T | T[]
): Token[] {
  const typeSet = new Set(Array.isArray(types) ? types : [types]);
  return tokens.filter((token) => typeSet.has(token.type as T));
}

/**
 * Get all NIP-19 entities from tokens
 */
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

/**
 * Get all NIP identifiers from tokens
 */
export function getNipIdentifiers(tokens: Token[]): Token[] {
  return filterTokens(tokens, TokenType.NIP_IDENTIFIER);
}

/**
 * Get all URLs from tokens
 */
export function getUrls(tokens: Token[]): Token[] {
  return filterTokens(tokens, TokenType.URL);
}

/**
 * Get all custom emojis from tokens
 */
export function getCustomEmojis(tokens: Token[]): Token[] {
  return filterTokens(tokens, TokenType.CUSTOM_EMOJI);
}

/**
 * Get all hashtags from tokens
 */
export function getHashtags(tokens: Token[]): Token[] {
  return filterTokens(tokens, TokenType.HASHTAG);
}

/**
 * Get all Lightning addresses from tokens
 */
export function getLightningAddresses(tokens: Token[]): Token[] {
  return filterTokens(tokens, TokenType.LN_ADDRESS);
}

/**
 * Get all Lightning URLs from tokens
 */
export function getLightningUrls(tokens: Token[]): Token[] {
  return filterTokens(tokens, TokenType.LN_URL);
}

/**
 * Get all Lightning invoices from tokens
 */
export function getLightningInvoices(tokens: Token[]): Token[] {
  return filterTokens(tokens, TokenType.LNBC);
}

/**
 * Get all Bitcoin addresses from tokens
 */
export function getBitcoinAddresses(tokens: Token[]): Token[] {
  return filterTokens(tokens, TokenType.BITCOIN_ADDRESS);
}

/**
 * Get all Cashu tokens from tokens
 */
export function getCashuTokens(tokens: Token[]): Token[] {
  return filterTokens(tokens, TokenType.CASHU_TOKEN);
}

/**
 * Get all emails from tokens
 */
export function getEmails(tokens: Token[]): Token[] {
  return filterTokens(tokens, TokenType.EMAIL);
}

/**
 * Reset regex global state
 */
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

  allPatterns.forEach((pattern) => {
    pattern.lastIndex = 0;
  });
}
