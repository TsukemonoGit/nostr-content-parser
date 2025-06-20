import { describe, it, expect, beforeEach } from "vitest";
import {
  parseContent,
  TokenType,
  filterTokens,
  getNip19Entities,
  getUrls,
  getCustomEmojis,
  getHashtags,
  getLightningAddresses,
  getLightningUrls,
  getLightningInvoices,
  getBitcoinAddresses,
  getCashuTokens,
  getEmails,
  resetPatterns,
  parseContentAsync,
} from "../src/parseContent.js";
import { TokenType } from "../src/patterns";

// Test data
const TEST_NPUB =
  "npub1sjcvg64knxkrt6ev52rywzu9uzqakgy8ehhk8yezxmpewsthst6sw3jqcw";
const TEST_NOTE =
  "note10vns6zm2xecfs43n40fawleevvtqlc73dv3ptj5xr9nwysywjq9sjyv6r0";
const TEST_NEVENT =
  "nevent1qvzqqqqqqypzpp9sc34tdxdvxh4jeg5xgu9ctcypmvsg0n00vwfjydkrjaqh0qh4qyxhwumn8ghj77tpvf6jumt9qys8wumn8ghj7un9d3shjtt2wqhxummnw3ezuamfwfjkgmn9wshx5uqpzamhxue69uhkummnw3ezu6t5w3skumt09ekk2mspzdmhxue69uhhwmm59ehx7um5wghxuet5qyghwumn8ghj7mnxwfjkccte9eshquqqypajwrgtdgm8pxzkxw4a84ml8933vrlr694jy9w2scvkdcjq36gqknr2489";
const TEST_NPROFILE =
  "nprofile1qyxhwumn8ghj77tpvf6jumt9qqsgfvxyd2mfntp4avk29pj8pwz7pqwmyzrummmrjv3rdsuhg9mc9agccpc2g";

const sampleTokens = [
  { type: TokenType.TEXT, content: "hello" },
  { type: TokenType.NIP19, content: TEST_NPUB },
  { type: TokenType.URL, content: "https://example.com" },
  {
    type: TokenType.CUSTOM_EMOJI,
    content: ":fire:",
    metadata: { name: "fire" },
  },
  { type: TokenType.HASHTAG, content: "#nostr", metadata: { tag: "nostr" } },
  /*    { type: TokenType.MENTION, content: `nostr:${TEST_NPUB}`, metadata: { entity: TEST_NPUB } }, */
  {
    type: TokenType.LN_ADDRESS,
    content: "alice@getalby.com",
    metadata: { domain: "getalby.com" },
  },
  { type: TokenType.LNBC, content: "lnbc1pvjluezpp5..." },
  {
    type: TokenType.BITCOIN_ADDRESS,
    content: "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
    metadata: { addressType: "legacy" },
  },
  { type: TokenType.CASHU_TOKEN, content: "cashuAeyJ0b2tlbiI..." },
];

describe("await parseContent", () => {
  beforeEach(() => {
    resetPatterns();
  });
  it("should get NIP-19 entities", () => {
    const entities = getNip19Entities(sampleTokens);
    console.log(entities);
    expect(entities).toHaveLength(1);
    expect(entities[0].type).toBe(TokenType.NIP19);
  });

  it("should get URLs", () => {
    const urls = getUrls(sampleTokens);
    expect(urls).toHaveLength(1);
    expect(urls[0].content).toBe("https://example.com");
  });

  it("should get custom emojis", () => {
    const emojis = getCustomEmojis(sampleTokens);
    expect(emojis).toHaveLength(1);
    expect(emojis[0].metadata.name).toBe("fire");
  });

  it("should get hashtags", () => {
    const hashtags = getHashtags(sampleTokens);
    expect(hashtags).toHaveLength(1);
    expect(hashtags[0].metadata.tag).toBe("nostr");
  });

  /*   it('should get mentions', () => {
    const mentions = getMentions(sampleTokens);
    expect(mentions).toHaveLength(1);
    expect(mentions[0].metadata.entity).toBe(TEST_NPUB);
  }); */

  it("should get Lightning addresses", () => {
    const lnAddresses = getLightningAddresses(sampleTokens);
    expect(lnAddresses).toHaveLength(1);
    expect(lnAddresses[0].content).toBe("alice@getalby.com");
    expect(lnAddresses[0].metadata.domain).toBe("getalby.com");
  });

  it("should get Lightning invoices", () => {
    const invoices = getLightningInvoices(sampleTokens);
    expect(invoices).toHaveLength(1);
    expect(invoices[0].content).toBe("lnbc1pvjluezpp5...");
  });

  it("should get Bitcoin addresses", () => {
    const btcAddresses = getBitcoinAddresses(sampleTokens);
    expect(btcAddresses).toHaveLength(1);
    expect(btcAddresses[0].content).toBe("1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa");
    expect(btcAddresses[0].metadata.addressType).toBe("legacy");
  });
  it("should parse plain text", async () => {
    const content = "Hello world!";
    const tokens = parseContent(content);

    expect(tokens).toHaveLength(1);
    expect(tokens[0].type).toBe(TokenType.TEXT);
    expect(tokens[0].content).toBe("Hello world!");
    expect(tokens[0].start).toBe(0);
    expect(tokens[0].end).toBe(12);
  });

  it("should parse npub", async () => {
    const content = `Hello nostr:${TEST_NPUB} world!`;
    const tokens = parseContent(content);
    console.log(tokens);

    expect(tokens).toHaveLength(3);
    expect(tokens[0].type).toBe(TokenType.TEXT);
    expect(tokens[0].content).toBe("Hello ");

    expect(tokens[1].type).toBe(TokenType.NIP19);
    expect(tokens[1].content).toBe(`nostr:${TEST_NPUB}`);
    expect(tokens[1].metadata.plainNip19).toBe(`${TEST_NPUB}`);
    expect(tokens[2].type).toBe(TokenType.TEXT);
    expect(tokens[2].content).toBe(" world!");
  });

  it("should parse multiple NIP-19 entities", async () => {
    const content = `${TEST_NPUB} and ${TEST_NOTE}`;
    const tokens = parseContent(content, [], {
      includeNostrPrefixOnly: false,
    });

    console.log(tokens);
    expect(tokens).toHaveLength(3);
    expect(tokens[0].type).toBe(TokenType.NIP19);
    expect(tokens[1].type).toBe(TokenType.TEXT);
    expect(tokens[2].type).toBe(TokenType.NIP19);
  });

  it("should parse URLs", async () => {
    const content = "Check https://example.com and http://test.org";
    const tokens = parseContent(content);

    expect(tokens).toHaveLength(4);
    expect(tokens[1].type).toBe(TokenType.URL);
    expect(tokens[1].content).toBe("https://example.com");
    expect(tokens[3].type).toBe(TokenType.URL);
    expect(tokens[3].content).toBe("http://test.org");
  });

  it("should parse custom emojis with tags", async () => {
    const content = "Hello :pepe: world :bitcoin:";
    const tags = [
      ["emoji", "pepe", "https://example.com/pepe.png"],
      ["emoji", "bitcoin", "https://example.com/bitcoin.png"],
    ];
    const tokens = parseContent(content, tags);

    const emojiTokens = tokens.filter((t) => t.type === TokenType.CUSTOM_EMOJI);
    expect(emojiTokens).toHaveLength(2);

    expect(emojiTokens[0].content).toBe(":pepe:");
    expect(emojiTokens[0].metadata.name).toBe("pepe");
    expect(emojiTokens[0].metadata.url).toBe("https://example.com/pepe.png");

    expect(emojiTokens[1].content).toBe(":bitcoin:");
    expect(emojiTokens[1].metadata.name).toBe("bitcoin");
    expect(emojiTokens[1].metadata.url).toBe("https://example.com/bitcoin.png");
  });

  it("should parse custom emojis without tags", async () => {
    const content = "Hello :unknown_emoji: world";
    const tokens = parseContent(content);

    const emojiTokens = tokens.filter((t) => t.type === TokenType.CUSTOM_EMOJI);
    expect(emojiTokens).toHaveLength(1);
    expect(emojiTokens[0].metadata.name).toBe("unknown_emoji");
    expect(emojiTokens[0].metadata.url).toBeUndefined();
  });

  it("should parse hashtags", async () => {
    const content = "Learning #nostr and #bitcoin today";
    const tokens = parseContent(content, [], { hashtagsFromTagsOnly: false });

    const hashtagTokens = tokens.filter((t) => t.type === TokenType.HASHTAG);
    expect(hashtagTokens).toHaveLength(2);
    expect(hashtagTokens[0].content).toBe("#nostr");
    expect(hashtagTokens[0].metadata.tag).toBe("nostr");
    expect(hashtagTokens[1].content).toBe("#bitcoin");
    expect(hashtagTokens[1].metadata.tag).toBe("bitcoin");
  });

  /* it('should parse mentions', () => {
    const content = `Mentioning nostr:${TEST_NPUB} and nostr:${TEST_NPROFILE}`;
    const tokens = parseContent(content);
    
    const mentionTokens = tokens.filter(t => t.type === TokenType.MENTION);
    expect(mentionTokens).toHaveLength(2);
    
    expect(mentionTokens[0].content).toBe(`nostr:${TEST_NPUB}`);
    expect(mentionTokens[0].metadata.entity).toBe(TEST_NPUB);
    expect(mentionTokens[0].metadata.entityType).toBe(TokenType.NIP19);
    
    expect(mentionTokens[1].content).toBe(`nostr:${TEST_NPROFILE}`);
    expect(mentionTokens[1].metadata.entity).toBe(TEST_NPROFILE);
    expect(mentionTokens[1].metadata.entityType).toBe(TokenType.NPROFILE);
  }); */

  it("should handle complex mixed content", async () => {
    const content = `Hello nostr:${TEST_NPUB}! Check this :fire: link https://example.com #nostr nostr:${TEST_NOTE}`;
    const tags = [
      ["emoji", "fire", "https://example.com/fire.png"],
      ["t", "nostr"],
    ];
    const tokens = parseContent(content, tags);

    const types = tokens.map((t) => t.type);
    expect(types).toContain(TokenType.TEXT);
    expect(types).toContain(TokenType.NIP19);
    expect(types).toContain(TokenType.CUSTOM_EMOJI);
    expect(types).toContain(TokenType.URL);
    expect(types).toContain(TokenType.HASHTAG);
    /*    expect(types).toContain(TokenType.MENTION); */
  });

  it("should handle empty content", async () => {
    const tokens = parseContent("");
    expect(tokens).toHaveLength(0);
  });

  it("should handle null content", async () => {
    const tokens = parseContent(null);
    expect(tokens).toHaveLength(0);
  });

  it("should handle overlapping patterns correctly", async () => {
    // URLの中にnpubっぽい文字列がある場合など
    const content = `https://example.com/npub1test nostr:${TEST_NPUB}`;
    const tokens = parseContent(content);

    expect(tokens[0].type).toBe(TokenType.URL);
    expect(tokens[0].content).toBe("https://example.com/npub1test");
    expect(tokens[2].type).toBe(TokenType.NIP19);
  });
});

describe("filterTokens", () => {
  it("should filter tokens by single type", () => {
    const tokens = [
      { type: TokenType.TEXT, content: "hello" },
      { type: TokenType.NIP19, content: TEST_NPUB },
      { type: TokenType.TEXT, content: "world" },
    ];

    const textTokens = filterTokens(tokens, TokenType.TEXT);
    expect(textTokens).toHaveLength(2);
    expect(textTokens.every((t) => t.type === TokenType.TEXT)).toBe(true);
  });

  it("should filter tokens by multiple types", () => {
    const tokens = [
      { type: TokenType.TEXT, content: "hello" },
      { type: TokenType.NIP19, content: TEST_NPUB },
      { type: TokenType.URL, content: "https://example.com" },
      { type: TokenType.NIP19, content: TEST_NOTE },
    ];

    const filtered = filterTokens(tokens, [TokenType.NIP19, TokenType.NIP19]);
    expect(filtered).toHaveLength(2);
    expect(filtered[0].type).toBe(TokenType.NIP19);
    expect(filtered[1].type).toBe(TokenType.NIP19);
  });
});

describe("utility functions", () => {
  const sampleTokens = [
    { type: TokenType.TEXT, content: "hello" },
    { type: TokenType.NIP19, content: TEST_NPUB },
    { type: TokenType.URL, content: "https://example.com" },
    {
      type: TokenType.CUSTOM_EMOJI,
      content: ":fire:",
      metadata: { name: "fire" },
    },
    { type: TokenType.HASHTAG, content: "#nostr", metadata: { tag: "nostr" } },
    /*   { type: TokenType.MENTION, content: `nostr:${TEST_NPUB}`, metadata: { entity: TEST_NPUB } } */
  ];

  it("should get NIP-19 entities", () => {
    const entities = getNip19Entities(sampleTokens);
    expect(entities).toHaveLength(1);
    expect(entities[0].type).toBe(TokenType.NIP19);
  });

  it("should get URLs", () => {
    const urls = getUrls(sampleTokens);
    expect(urls).toHaveLength(1);
    expect(urls[0].content).toBe("https://example.com");
  });

  it("should get custom emojis", () => {
    const emojis = getCustomEmojis(sampleTokens);
    expect(emojis).toHaveLength(1);
    expect(emojis[0].metadata.name).toBe("fire");
  });

  it("should get hashtags", () => {
    const hashtags = getHashtags(sampleTokens);
    expect(hashtags).toHaveLength(1);
    expect(hashtags[0].metadata.tag).toBe("nostr");
  });

  /*   it('should get mentions', () => {
    const mentions = getMentions(sampleTokens);
    expect(mentions).toHaveLength(1);
    expect(mentions[0].metadata.entity).toBe(TEST_NPUB);
  }); */
});

describe("edge cases", () => {
  beforeEach(() => {
    resetPatterns();
  });

  it("should handle consecutive same-type tokens", async () => {
    const content = `nostr:${TEST_NPUB} nostr:${TEST_NOTE}`;
    const tokens = parseContent(content);

    expect(tokens).toHaveLength(3);
    expect(tokens[0].type).toBe(TokenType.NIP19);
    expect(tokens[1].type).toBe(TokenType.TEXT);
    expect(tokens[1].content).toBe(" ");
    expect(tokens[2].type).toBe(TokenType.NIP19);
  });
  it("should detect npub with and without nostr prefix", async () => {
    const content = `nostr:${TEST_NPUB} nostr:${TEST_NPUB}`;
    const tokens = parseContent(content, [], {
      includeNostrPrefixOnly: false,
    });

    console.log(tokens);
    expect(tokens.filter((t) => t.type === TokenType.NIP19)).toHaveLength(2);
  });
  it("should handle tokens at start and end", async () => {
    const content = `${TEST_NPUB} middle text nostr:${TEST_NOTE}`;
    const tokens = parseContent(content, [], {
      includeNostrPrefixOnly: false,
    });
    console.log(tokens);
    expect(tokens[0].type).toBe(TokenType.NIP19);
    expect(tokens[0].start).toBe(0);
    expect(tokens[tokens.length - 1].content).toBe(`nostr:${TEST_NOTE}`);
    expect(tokens[tokens.length - 1].type).toBe(TokenType.NIP19);
    expect(tokens[tokens.length - 1].end).toBe(content.length);
  });

  it("should handle malformed NIP-19 entities", async () => {
    const content =
      "npub1short note1toolong123456789012345678901234567890123456789012345678901234567890";
    const tokens = parseContent(content);

    // Should treat as text since they don't match the exact pattern
    expect(tokens.every((t) => t.type === TokenType.TEXT)).toBe(true);
  });
});

describe("Lightning and Bitcoin parsing", () => {
  beforeEach(() => {
    resetPatterns();
  });

  it("should parse Lightning addresses", async () => {
    const content = "Send sats to alice@getalby.com and bob@wallet.com";
    const tokens = parseContent(content);

    const lnAddresses = tokens.filter((t) => t.type === TokenType.LN_ADDRESS);
    expect(lnAddresses).toHaveLength(2);
    expect(lnAddresses[0].content).toBe("alice@getalby.com");
    expect(lnAddresses[0].metadata.domain).toBe("getalby.com");
  });

  it("should distinguish Lightning addresses from regular emails", async () => {
    const content = "Contact alice@gmail.com or pay bob@stacker.news";
    const tokens = parseContent(content);

    const emails = tokens.filter((t) => t.type === TokenType.EMAIL);
    const lnAddresses = tokens.filter((t) => t.type === TokenType.LN_ADDRESS);

    expect(emails).toHaveLength(1);
    expect(emails[0].content).toBe("alice@gmail.com");
    expect(lnAddresses).toHaveLength(1);
    expect(lnAddresses[0].content).toBe("bob@stacker.news");
  });

  it("should parse Lightning URLs", async () => {
    const content =
      "Pay via LNURL1DP68GURN8GHJ7AMPD3KX2AR0VEEKZAR0WD5XJTNRDAKJ7TNHV4KXCTTTDEHHWM30D3H82UNVWQHKXMMVVESKGMN5DEKXZGN5DEKXZGN5DE3HXETNDE3HXETNDE3HXETNDE3HXETNDE3HXETNDE3HXETNDE3HXETNDE3HXETNDE3HXETNDE3HXETNDE3HXETNDE3HXETNDE3HXETNDE3HXETNDE3HXETNDE3HXETNDE3HXETNDE3HXETNDE3HXETNDE3HXETNDE3HXETNDE3HXETNDE3HXETNDE3HXETNDE3HXETNDE3HXETNDE3HX";
    const tokens = parseContent(content);

    const lnUrls = tokens.filter((t) => t.type === TokenType.LN_URL);
    expect(lnUrls).toHaveLength(1);
    expect(lnUrls[0].content).toContain(
      "LNURL1DP68GURN8GHJ7AMPD3KX2AR0VEEKZAR0WD5XJTNRDAKJ7TNHV4KXCTTTDEHHWM30D3H82UNVWQHKXMMVVESKGMN5DEKXZGN5DEKXZGN5DE3HXETNDE3HXETNDE3HXETNDE3HXETNDE3HXETNDE3HXETNDE3HXETNDE3HXETNDE3HXETNDE3HXETNDE3HXETNDE3HXETNDE3HXETNDE3HXETNDE3HXETNDE3HXETNDE3HXETNDE3HXETNDE3HXETNDE3HXETNDE3HXETNDE3HXETNDE3HXETNDE3HXETNDE3HXETNDE3HXETNDE3HX"
    );
  });

  it("should parse Lightning invoices", async () => {
    const content =
      "Pay this invoice: lnbc1pvjluezpp5qqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqypqdpl2pkx2ctnv5sxxmmwwd5kgetjypeh2ursdae8g6twvus8g6rfwvs8qun0dfjkxaq8rkx3yf5tcsyz3d73gafnh3cax9rn449d9p5uxz9ezhhypd0elx87sjle52x86fux2ypatgddc6k63n7erqz25le42c4u4ecky03ylcqca784w";
    const tokens = parseContent(content);

    const invoices = tokens.filter((t) => t.type === TokenType.LNBC);
    expect(invoices).toHaveLength(1);
    expect(invoices[0].content).toContain(
      "lnbc1pvjluezpp5qqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqypqdpl2pkx2ctnv5sxxmmwwd5kgetjypeh2ursdae8g6twvus8g6rfwvs8qun0dfjkxaq8rkx3yf5tcsyz3d73gafnh3cax9rn449d9p5uxz9ezhhypd0elx87sjle52x86fux2ypatgddc6k63n7erqz25le42c4u4ecky03ylcqca784w"
    );
  });

  it("should parse Bitcoin addresses", async () => {
    const content =
      "Send to 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa or bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4 or 3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy";
    const tokens = parseContent(content);

    const btcAddresses = tokens.filter(
      (t) => t.type === TokenType.BITCOIN_ADDRESS
    );
    expect(btcAddresses).toHaveLength(3);

    // Check address types
    const legacyAddr = btcAddresses.find((t) => t.content.startsWith("1"));
    const bech32Addr = btcAddresses.find((t) => t.content.startsWith("bc1"));
    const scriptAddr = btcAddresses.find((t) => t.content.startsWith("3"));

    expect(legacyAddr.metadata.addressType).toBe("legacy");
    expect(bech32Addr.metadata.addressType).toBe("bech32");
    expect(scriptAddr.metadata.addressType).toBe("script");
  });

  it("should parse Cashu tokens", async () => {
    const content =
      "Here is a cashu token: cashuAeyJ0b2tlbiI6W3sicHJvb2ZzIjpbeyJpZCI6IjAwOWExZjI5MzI1M2U0MWUiLCJhbW91bnQiOjIsInNlY3JldCI6IjQwNzkxNWJjMjEyYmUxMDFkZDMxMzA5MzMxNGU3MzQ0MjA2MzQyM2VhNGU5NzY5ZGE3NTg1NzM5NjA2NzQyYWIiLCJDIjoiMDJiYzkwOTc5OTdkODFhZmIyY2MxNDAzNGUyNzNhNzEyZDUzMDJlMTU1MGI5OWY0NzI0YjA4OWQxNzNhZGU3OGZjIn1dLCJtaW50IjoiaHR0cHM6Ly9taW50LXRlc3QuZXhhbXBsZS5jb20ifV0sIm1lbW8iOiJjYXNodSBwYXltZW50In0=";
    const tokens = parseContent(content);

    const cashuTokens = tokens.filter((t) => t.type === TokenType.CASHU_TOKEN);
    expect(cashuTokens).toHaveLength(1);
    expect(cashuTokens[0].content).toContain(
      "cashuAeyJ0b2tlbiI6W3sicHJvb2ZzIjpbeyJpZCI6IjAwOWExZjI5MzI1M2U0MWUiLCJhbW91bnQiOjIsInNlY3JldCI6IjQwNzkxNWJjMjEyYmUxMDFkZDMxMzA5MzMxNGU3MzQ0MjA2MzQyM2VhNGU5NzY5ZGE3NTg1NzM5NjA2NzQyYWIiLCJDIjoiMDJiYzkwOTc5OTdkODFhZmIyY2MxNDAzNGUyNzNhNzEyZDUzMDJlMTU1MGI5OWY0NzI0YjA4OWQxNzNhZGU3OGZjIn1dLCJtaW50IjoiaHR0cHM6Ly9taW50LXRlc3QuZXhhbXBsZS5jb20ifV0sIm1lbW8iOiJjYXNodSBwYXltZW50In0="
    );
  });

  it("should prioritize URL over inner npub when overlapping", async () => {
    const innerNpub =
      "npub1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq";
    const content = `Check this link: https://example.com/${innerNpub} end.`;
    const tokens = parseContent(content);

    // 出力確認（任意）
    console.log(tokens);

    // 最初のURLトークンが存在し、npubは無視される
    const urlTokens = tokens.filter((t) => t.type === TokenType.URL);
    const npubTokens = tokens.filter((t) => t.type === TokenType.NIP19);

    expect(urlTokens).toHaveLength(1);
    expect(urlTokens[0].content).toBe(`https://example.com/${innerNpub}`);

    // npubは含まれない
    expect(npubTokens).toHaveLength(0);
  });

  it("拡張子ベースで type を image と判定する", async () => {
    const input = "これは画像です https://example.com/image.png";
    const tokens = parseContent(input);

    const urlToken = tokens.find((t) => t.type === TokenType.URL);
    expect(urlToken).toBeDefined();
    expect(urlToken?.metadata?.type).toBe("image");
  });

  it("HEADリクエストで Content-Type を取得して type を判定する", async () => {
    // fetch をモック
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      headers: {
        get: (key) => {
          if (key.toLowerCase() === "content-type") return "video/mp4";
          return null;
        },
      },
    });

    const input = "https://example.com/videofile"; // 拡張子なし
    const tokens = await parseContentAsync(input, []);

    const urlToken = tokens.find((t) => t.type === TokenType.URL);
    expect(urlToken).toBeDefined();
    expect(urlToken?.metadata?.type).toBe("video");
  });

  it("parseContent のときは Content-Type による判定を行わない", async () => {
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy;

    const input = "https://example.com/unknown";
    const tokens = parseContent(input, []);

    const urlToken = tokens.find((t) => t.type === TokenType.URL);
    expect(urlToken).toBeDefined();
    expect(urlToken?.metadata?.type).toBeUndefined();

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
