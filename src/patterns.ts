// patterns.ts - 完全版

export const TokenType = {
  TEXT: "text",
  NIP19: "nip19",
  RELAY: "relay",
  URL: "url",
  CUSTOM_EMOJI: "custom_emoji",
  HASHTAG: "hashtag",
  LN_ADDRESS: "ln_address",
  LN_URL: "ln_url",
  LNBC: "lnbc",
  EMAIL: "email",
  CASHU_TOKEN: "cashu_token",
  BITCOIN_ADDRESS: "bitcoin_address",
  NIP_IDENTIFIER: "nip_identifier",
  LEGACY_REFERENCE: "legacy_reference",
} as const;

export type TokenTypeValue = (typeof TokenType)[keyof typeof TokenType];

export const NIP19SubType = {
  NPUB: "npub",
  NPROFILE: "nprofile",
  NOTE: "note",
  NEVENT: "nevent",
  NADDR: "naddr",
  NSEC: "nsec",
} as const;

export type NIP19SubType = (typeof NIP19SubType)[keyof typeof NIP19SubType];

export const NIP19_TYPE_MAP: Record<string, NIP19SubType> = {
  [NIP19SubType.NPUB]: NIP19SubType.NPUB,
  [NIP19SubType.NPROFILE]: NIP19SubType.NPROFILE,
  [NIP19SubType.NOTE]: NIP19SubType.NOTE,
  [NIP19SubType.NEVENT]: NIP19SubType.NEVENT,
  [NIP19SubType.NADDR]: NIP19SubType.NADDR,
  [NIP19SubType.NSEC]: NIP19SubType.NSEC,
};

type TokenBase = {
  content: string;
  start: number;
  end: number;
};

export type Token =
  | (TokenBase & {
      type: "nip19";
      metadata: {
        plainNip19: string;
        subType: NIP19SubType;
        hasNostrPrefix: boolean;
      };
    })
  | (TokenBase & {
      type: "nip_identifier";
      metadata: { number: string };
    })
  | (TokenBase & {
      type: "custom_emoji";
      metadata: { url: string; name: string; emojiSetAddress?: string };
    })
  | (TokenBase & {
      type: "legacy_reference";
      metadata: {
        tagIndex: number;
        tagType: string;
        referenceId: string;
        referenceType: "npub" | "note" | "naddr" | "unknown";
      };
    })
  | (TokenBase & {
      type: "relay";
      metadata: { scheme: string };
    })
  | (TokenBase & {
      type: "bitcoin_address";
      metadata: { addressType: string };
    })
  | (TokenBase & {
      type: "ln_address";
      metadata: { domain: string };
    })
  | (TokenBase & {
      type: "cashu_token";
      metadata?: undefined;
    })
  | (TokenBase & {
      type: "email";
      metadata?: undefined;
    })
  | (TokenBase & {
      type: "hashtag";
      metadata: { tag: string; validated: boolean };
    })
  | (TokenBase & {
      type: "url";
      metadata?: { scheme?: string; type?: "image" | "video" | "audio" };
    })
  | (TokenBase & {
      type: "ln_url";
      metadata?: undefined;
    })
  | (TokenBase & {
      type: "lnbc";
      metadata?: undefined;
    })
  | (TokenBase & {
      type: "text";
      metadata?: undefined;
    });

export const LN_ADDRESS_PATTERN =
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

export function isLightningAddress(emailLike: string): boolean {
  const commonEmailDomains = [
    "gmail.com",
    "yahoo.com",
    "hotmail.com",
    "outlook.com",
    "icloud.com",
    "protonmail.com",
    "aol.com",
    "live.com",
  ];
  const domain = emailLike.split("@")[1]?.toLowerCase();
  return !!domain && !commonEmailDomains.includes(domain);
}

export function findCustomEmojiMetadata(
  emojiName: string,
  tags: string[][],
): { url: string; emojiSetAddress?: string } | null {
  if (!tags) return null;
  const emojiTag = tags.find(
    (tag) => tag[0] === "emoji" && tag[1] === emojiName,
  );
  if (!emojiTag || !emojiTag[2]) return null;
  return {
    url: emojiTag[2],
    emojiSetAddress: emojiTag[3],
  };
}

export const NIP19_PATTERNS = {
  npub: /nostr:npub1[023456789acdefghjklmnpqrstuvwxyz]{58}/g,
  nprofile: /nostr:nprofile1[023456789acdefghjklmnpqrstuvwxyz]+/g,
  note: /nostr:note1[023456789acdefghjklmnpqrstuvwxyz]{58}/g,
  nevent: /nostr:nevent1[023456789acdefghjklmnpqrstuvwxyz]+/g,
  naddr: /nostr:naddr1[023456789acdefghjklmnpqrstuvwxyz]+/g,
  nsec: /nostr:nsec1[023456789acdefghjklmnpqrstuvwxyz]{58}/g,
} as const;

export const NIP19_PLAIN_PATTERNS = {
  npub: /(?<!nostr:)npub1[023456789acdefghjklmnpqrstuvwxyz]{58}/g,
  nprofile: /(?<!nostr:)nprofile1[023456789acdefghjklmnpqrstuvwxyz]+/g,
  note: /(?<!nostr:)note1[023456789acdefghjklmnpqrstuvwxyz]{58}/g,
  nevent: /(?<!nostr:)nevent1[023456789acdefghjklmnpqrstuvwxyz]+/g,
  naddr: /(?<!nostr:)naddr1[023456789acdefghjklmnpqrstuvwxyz]+/g,
  nsec: /(?<!nostr:)nsec1[023456789acdefghjklmnpqrstuvwxyz]{58}/g,
};

export const URL_PATTERN =
  /(https?:\/\/(?:(?!https?:\/\/)[^\s"'<`])+(?:(?!https?:\/\/)[^\s"'<`:\.\ )\}\({])+)/g;

export const LN_URL_PATTERN = /lnurl1[02-9ac-hj-np-z]+/gi;
export const LNBC_PATTERN = /lnbc[0-9]*[munp]?1[02-9ac-hj-np-z]+/gi;
export const CASHU_TOKEN_PATTERN = /cashu[AB][A-Za-z0-9_-]+=*/g;
export const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
export const CUSTOM_EMOJI_PATTERN = /:([a-zA-Z0-9_+-]+):/g;
export const HASHTAG_PATTERN =
  /(?<=^|[ \u3000\t\r\n])[#﹟＃](?:(?![#﹟＃])(?:\p{XID_Continue}|\p{Extended_Pictographic}|\p{Emoji_Component}|[_+\-]))+/gu;

export const RELAY_URL_PATTERN =
  /wss?:\/\/[a-zA-Z0-9.-]+(:[0-9]{1,5})?(\/[a-zA-Z0-9._~%+-]*)*/gi;

export const LEGACY_REFERENCE_PATTERN = /#\[\d+\]/g;

export const BITCOIN_ADDRESS_PATTERNS = {
  legacy: /\b1[1-9A-HJ-NP-Za-km-z]{25,34}\b/g,
  script: /\b3[1-9A-HJ-NP-Za-km-z]{25,34}\b/g,
  bech32: /\bbc1[02-9ac-hj-np-z]{25,87}\b/gi,
} as const;

export const NIP_IDENTIFIER_PATTERN = /\bNIP-[0-9A-Za-z]+\b/g;

export function parseNipIdentifier(nipId: string): {
  number: string;
  hasAlpha: boolean;
  hasDigit: boolean;
} {
  const match = nipId.match(/^NIP-([0-9A-Za-z]+)$/);
  if (!match) throw new Error("Invalid NIP identifier format");

  const number = match[1];
  const hasAlpha = /[A-Za-z]/.test(number);
  const hasDigit = /[0-9]/.test(number);

  return {
    number,
    hasAlpha,
    hasDigit,
  };
}

const brackets: Record<string, string> = {
  ")": "(",
  "）": "（",
  "]": "[",
  "」": "「",
  "}": "{",
  "｝": "｛",
  ">": "<",
  "〉": "〈",
  "』": "『",
  "》": "《",
};

const trailingChars = /[.．,，;；:：!！?？→←]/;

const bracketRegexCache = new Map<string, RegExp>();

const escapeRegExp = (string: string): string => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const getCachedRegex = (char: string): RegExp => {
  if (!bracketRegexCache.has(char)) {
    bracketRegexCache.set(char, new RegExp(escapeRegExp(char), "g"));
  }
  return bracketRegexCache.get(char)!;
};

const countChar = (str: string, char: string): number => {
  let count = 0;
  for (let i = 0; i < str.length; i++) {
    if (str[i] === char) count++;
  }
  return count;
};

export const cleanUrlEnd = (url: string): string => {
  let cleanedUrl = url;
  let lastLength = -1;

  for (let i = 0; i < cleanedUrl.length; i++) {
    const char = cleanedUrl[i];

    if (Object.keys(brackets).includes(char)) {
      const openChar = brackets[char];
      const beforePart = cleanedUrl.slice(0, i + 1);

      const openCount = countChar(beforePart, openChar);
      const closeCount = countChar(beforePart, char);

      if (closeCount > openCount) {
        cleanedUrl = cleanedUrl.slice(0, i);
        break;
      }
    }
  }

  while (cleanedUrl.length > 0) {
    if (cleanedUrl.length === lastLength) {
      break;
    }
    lastLength = cleanedUrl.length;

    const lastChar = cleanedUrl.slice(-1);

    if (trailingChars.test(lastChar)) {
      cleanedUrl = cleanedUrl.slice(0, -1);
      continue;
    }

    if (Object.keys(brackets).includes(lastChar)) {
      const openChar = brackets[lastChar];

      const openCount = countChar(cleanedUrl, openChar);
      const closeCount = countChar(cleanedUrl, lastChar);

      if (openCount >= closeCount) {
        break;
      }

      cleanedUrl = cleanedUrl.slice(0, -1);
      continue;
    }

    break;
  }

  return cleanedUrl;
};

export function findLegacyReferenceMetadata(
  referenceMatch: string,
  tags: string[][],
): {
  tagIndex: number;
  tagType: string;
  referenceId: string;
  referenceType: "npub" | "note" | "naddr" | "unknown";
} | null {
  const indexMatch = referenceMatch.match(/#\[(\d+)\]/);
  if (!indexMatch) return null;

  const tagIndex = parseInt(indexMatch[1], 10);

  if (!tags || tagIndex >= tags.length) {
    return null;
  }

  const tag = tags[tagIndex];
  if (!tag || tag.length < 2) {
    return null;
  }

  const tagType = tag[0];
  const referenceId = tag[1];

  let referenceType: "npub" | "note" | "naddr" | "unknown" = "unknown";
  if (tagType === "p") {
    referenceType = "npub";
  } else if (tagType === "e") {
    referenceType = "note";
  } else if (tagType === "a") {
    referenceType = "naddr";
  }

  return {
    tagIndex,
    tagType,
    referenceId,
    referenceType,
  };
}
