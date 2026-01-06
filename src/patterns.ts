// patterns.ts

// 既存の TokenType 定義に加えて型も作成
export const TokenType = {
  TEXT: "text",
  // NPUB: "npub",
  // NPROFILE: "nprofile",
  // NOTE: "note",
  // NEVENT: "nevent",
  // NADDR: "naddr",
  // NSEC: "nsec",
  NIP19: "nip19", // 統合されたNIP19タイプ
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
  LEGACY_REFERENCE: "legacy_reference", // 旧タイプ引用 #[3]
} as const;

export type TokenType = (typeof TokenType)[keyof typeof TokenType];

// NIP19のサブタイプ定義
export const NIP19SubType = {
  NPUB: "npub",
  NPROFILE: "nprofile",
  NOTE: "note",
  NEVENT: "nevent",
  NADDR: "naddr",
  NSEC: "nsec",
} as const;

export type NIP19SubType = (typeof NIP19SubType)[keyof typeof NIP19SubType];

// NIP19サブタイプマッピング
export const NIP19_TYPE_MAP: Record<string, NIP19SubType> = {
  [NIP19SubType.NPUB]: NIP19SubType.NPUB,
  [NIP19SubType.NPROFILE]: NIP19SubType.NPROFILE,
  [NIP19SubType.NOTE]: NIP19SubType.NOTE,
  [NIP19SubType.NEVENT]: NIP19SubType.NEVENT,
  [NIP19SubType.NADDR]: NIP19SubType.NADDR,
  [NIP19SubType.NSEC]: NIP19SubType.NSEC,
};

export interface Token {
  type: TokenType;
  content: string;
  start: number;
  end: number;
  metadata?: Record<string, unknown>;
}
// 必要なパターンをエクスポート
export const LN_ADDRESS_PATTERN =
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

// ヘルパー関数もエクスポート
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
  tags: string[][]
): { url: string } | null {
  if (!tags) return null;
  const emojiTag = tags.find(
    (tag) => tag[0] === "emoji" && tag[1] === emojiName
  );
  return emojiTag ? { url: emojiTag[2] } : null;
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
  /(?<![\p{XID_Continue}\p{Extended_Pictographic}\p{Emoji_Component}_+\-])[#﹟＃](?:(?![#﹟＃])(?:\p{XID_Continue}|\p{Extended_Pictographic}|\p{Emoji_Component}|[_+\-]))+/gu;

// WebSocket Relay URL パターン
export const RELAY_URL_PATTERN =
  /wss?:\/\/[a-zA-Z0-9.-]+(:[0-9]{1,5})?(\/[a-zA-Z0-9._~%+-]*)*/gi;
// 旧タイプ引用パターン #[数字]
export const LEGACY_REFERENCE_PATTERN = /#\[\d+\]/g;

export const BITCOIN_ADDRESS_PATTERNS = {
  legacy: /\b1[1-9A-HJ-NP-Za-km-z]{25,34}\b/g,
  script: /\b3[1-9A-HJ-NP-Za-km-z]{25,34}\b/g,
  bech32: /\bbc1[02-9ac-hj-np-z]{25,87}\b/gi,
} as const;

// NIP識別子のパターン（NIP-01, NIP-C7, NIP-B0など）
export const NIP_IDENTIFIER_PATTERN = /\bNIP-[0-9A-Za-z]+\b/g;

// NIP識別子の詳細情報を取得するヘルパー関数
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

//------  URLの末尾から不要な文字を除去する関数
// 括弧と句読点を混在して処理する
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

// 正規表現のキャッシュ（パフォーマンス改善）
const bracketRegexCache = new Map<string, RegExp>();

// 文字をエスケープするヘルパー関数
const escapeRegExp = (string: string): string => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

// キャッシュされた正規表現を取得（パフォーマンス改善）
const getCachedRegex = (char: string): RegExp => {
  if (!bracketRegexCache.has(char)) {
    bracketRegexCache.set(char, new RegExp(escapeRegExp(char), "g"));
  }
  return bracketRegexCache.get(char)!;
};

// 括弧のカウントをする効率的な関数（パフォーマンス改善）
const countChar = (str: string, char: string): number => {
  let count = 0;
  for (let i = 0; i < str.length; i++) {
    if (str[i] === char) count++;
  }
  return count;
};

export const cleanUrlEnd = (url: string): string => {
  let cleanedUrl = url;
  let lastLength = -1; // 無限ループ検出用

  // まず、URL内の閉じ括弧をスキャンして、バランスが取れていない位置を見つける
  for (let i = 0; i < cleanedUrl.length; i++) {
    const char = cleanedUrl[i];

    if (Object.keys(brackets).includes(char)) {
      const openChar = brackets[char];
      const beforePart = cleanedUrl.slice(0, i + 1);

      // パフォーマンス改善: 正規表現の代わりに単純なループカウント
      const openCount = countChar(beforePart, openChar);
      const closeCount = countChar(beforePart, char);

      // 閉じ括弧の数が開き括弧より多い = バランスが崩れている
      if (closeCount > openCount) {
        // この閉じ括弧の直前でURLを切る
        cleanedUrl = cleanedUrl.slice(0, i);
        break;
      }
    }
  }

  // 次に、末尾の文字を繰り返しチェック（既存のロジック）
  while (cleanedUrl.length > 0) {
    // 無限ループ検出
    if (cleanedUrl.length === lastLength) {
      break; // 長さが変わらない場合は終了
    }
    lastLength = cleanedUrl.length;

    const lastChar = cleanedUrl.slice(-1);

    // 句読点の場合は即座に除去
    if (trailingChars.test(lastChar)) {
      cleanedUrl = cleanedUrl.slice(0, -1);
      continue;
    }

    // 括弧の場合はペアリングをチェック
    if (Object.keys(brackets).includes(lastChar)) {
      const openChar = brackets[lastChar];

      // パフォーマンス改善: 正規表現の代わりに単純なループカウント
      const openCount = countChar(cleanedUrl, openChar);
      const closeCount = countChar(cleanedUrl, lastChar);

      // 開き括弧の数が閉じ括弧の数以上であれば、URLの一部とみなして除去を終了
      if (openCount >= closeCount) {
        break;
      }

      cleanedUrl = cleanedUrl.slice(0, -1);
      continue;
    }

    // その他の文字の場合は処理を終了
    break;
  }

  return cleanedUrl;
};

//---------------

// 旧タイプ引用のメタデータを取得する関数
export function findLegacyReferenceMetadata(
  referenceMatch: string,
  tags: string[][]
): {
  tagIndex: number;
  tagType?: string;
  referenceId?: string;
  referenceType?: "npub" | "note" | "naddr" | "unknown";
} | null {
  // #[3] から数字部分を抽出
  const indexMatch = referenceMatch.match(/#\[(\d+)\]/);
  if (!indexMatch) return null;

  const tagIndex = parseInt(indexMatch[1], 10);

  if (!tags || tagIndex >= tags.length) {
    return { tagIndex };
  }

  const tag = tags[tagIndex];
  if (!tag || tag.length < 2) {
    return { tagIndex };
  }

  const tagType = tag[0];
  const referenceId = tag[1];

  // tagTypeに基づいて参照タイプを判定
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
