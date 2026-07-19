# Nostr Content Parser

Parse Nostr content into structured tokens with full TypeScript support.

## Installation

```bash
npm install @konemono/nostr-content-parser
```

## Usage

```javascript
import {
  parseContent,
  parseContentAsync,
  TokenType,
  NIP19SubType,
} from "@konemono/nostr-content-parser";

const content = "Hello npub1xyz... Check :custom_emoji: #nostr";
const tags = [["emoji", "custom_emoji", "https://example.com/emoji.png"]];

// Synchronous parsing (recommended for most cases)
const tokens = parseContent(content, tags);
console.log(tokens);

// Asynchronous parsing with URL type detection
const tokensWithUrlTypes = await parseContentAsync(content, tags);
console.log(tokensWithUrlTypes);
```

## Token Types

### Main Types

- `TokenType.TEXT` - Plain text
- `TokenType.NIP19` - NIP-19 entities (npub, nprofile, note, nevent, naddr, nsec)
- `TokenType.URL` - URLs
- `TokenType.CUSTOM_EMOJI` - Custom emojis
- `TokenType.HASHTAG` - Hashtags
- `TokenType.LN_ADDRESS` - Lightning addresses
- `TokenType.LN_URL` - Lightning URLs
- `TokenType.LNBC` - Lightning invoices
- `TokenType.EMAIL` - Email addresses
- `TokenType.BITCOIN_ADDRESS` - Bitcoin addresses
- `TokenType.CASHU_TOKEN` - Cashu tokens
- `TokenType.NIP_IDENTIFIER` - NIP identifiers
- `TokenType.LEGACY_REFERENCE` - Legacy references (#[0])
- `TokenType.RELAY` - Relay URLs (wss://)

### NIP19 Sub Types

- `NIP19SubType.NPUB` - Public key
- `NIP19SubType.NPROFILE` - Profile
- `NIP19SubType.NOTE` - Note
- `NIP19SubType.NEVENT` - Event
- `NIP19SubType.NADDR` - Address
- `NIP19SubType.NSEC` - Secret key

## API

### Core Functions

#### `parseContent(content, tags, options?)`

**Synchronous parsing** - Recommended for most use cases.

**Parameters:**

- `content: string` – Input content to parse.
- `tags: string[][]` – Optional tag array (used for custom emoji, legacy references, etc).
- `options: object` – Optional settings:
  - `includeNostrPrefixOnly?: boolean`
    If `true` (default), only tokens starting with `nostr:` will be included for NIP-19.
    If `false`, plain NIP-19 tokens (without prefix) will also be parsed.
  - `hashtagsFromTagsOnly?: boolean`
    If `true` (default), only hashtags that match a `t` tag will be parsed as hashtags.
    If `false`, all `#`-prefixed words are treated as hashtags.

**Returns:** `Token[]`

URL type detection is performed based on file extensions only (fast and lightweight).

#### `parseContentAsync(content, tags, options?)`

**Asynchronous parsing** - Use when you need comprehensive URL type detection.

**Parameters:**

- `content: string` – Input content to parse.
- `tags: string[][]` – Optional tag array (used for custom emoji, legacy references, etc).
- `options: object` – Optional settings:
  - `includeNostrPrefixOnly?: boolean` (same as sync version)
  - `hashtagsFromTagsOnly?: boolean` (same as sync version)

**Returns:** `Promise<Token[]>`

URL type detection includes HTTP HEAD requests to determine content type when file extension is not available.

### Filter Functions

- `filterTokens(tokens, types)` - Filter tokens by type
- `filterTokensBy(tokens, predicate)` - Filter tokens by custom predicate

### NIP19 Functions

- `getNip19Entities(tokens)` - Get all NIP-19 entities
- `filterNip19BySubType(tokens, subType)` - Filter NIP-19 by sub type
- `getNpubs(tokens)` - Get npub tokens
- `getNprofiles(tokens)` - Get nprofile tokens
- `getNotes(tokens)` - Get note tokens
- `getNevents(tokens)` - Get nevent tokens
- `getNaddrs(tokens)` - Get naddr tokens
- `getNsecs(tokens)` - Get nsec tokens

### Other Entity Functions

- `getUrls(tokens)` - Get URLs
- `getCustomEmojis(tokens)` - Get custom emojis
- `getHashtags(tokens)` - Get hashtags
- `getValidatedHashtags(tokens)` - Get hashtags validated by t tags
- `getLightningAddresses(tokens)` - Get Lightning addresses
- `getLightningUrls(tokens)` - Get Lightning URLs
- `getLightningInvoices(tokens)` - Get Lightning invoices
- `getBitcoinAddresses(tokens)` - Get Bitcoin addresses
- `getCashuTokens(tokens)` - Get Cashu tokens
- `getEmails(tokens)` - Get email addresses
- `getNipIdentifiers(tokens)` - Get NIP identifiers
- `getLegacyReferences(tokens)` - Get legacy references

### Utility Functions

- `resetPatterns()` - Reset regex patterns (call if needed)

## Examples

### Basic Parsing (Synchronous)

```javascript
// Fast, synchronous parsing
const tokens = parseContent("Check out npub1xyz... and #nostr!");
// Returns tokens with NIP19 and HASHTAG types
```

### URL Type Detection (Asynchronous)

```javascript
// Comprehensive URL type detection
const content =
  "Check this image: https://example.com/photo.png and https://example.com/video";
const tokens = await parseContentAsync(content);

const urls = getUrls(tokens);
urls.forEach((url) => {
  console.log(`URL: ${url.content}`);
  if (url.metadata?.scheme) {
    console.log(`Scheme: ${url.metadata.scheme}`); // "https", "http"
  }
  if (url.metadata?.type) {
    console.log(`Type: ${url.metadata.type}`); // "image", "video", "audio"
  }
});
```

### Working with NIP19 Tokens

```javascript
const tokens = parseContent("Check nostr:npub1xyz... and note1abc...", [], {
  includeNostrPrefixOnly: false, // Include plain NIP19 tokens
});

const nip19Tokens = getNip19Entities(tokens);
nip19Tokens.forEach((token) => {
  console.log(`Type: ${token.metadata.subType}`); // "npub", "note", etc.
  console.log(`Has nostr: prefix: ${token.metadata.hasNostrPrefix}`);
  console.log(`Plain NIP19: ${token.metadata.plainNip19}`);
});

// Filter specific NIP19 types
const npubs = getNpubs(tokens);
const notes = filterNip19BySubType(tokens, NIP19SubType.NOTE);
```

### Hashtag Filtering

```javascript
const content = "#nostr #dev";
const tags = [["t", "nostr"]];
const tokens = parseContent(content, tags, {
  hashtagsFromTagsOnly: true,
});

const hashtags = getHashtags(tokens);
hashtags.forEach((tag) => {
  console.log(`Tag: ${tag.metadata.tag}`);
  console.log(`Validated: ${tag.metadata.validated}`);
});

// Only "#nostr" will be returned as a validated HASHTAG token
```

### Custom Emoji Handling

```javascript
const content = "Hello :custom_emoji: and :unknown:!";
const tags = [["emoji", "custom_emoji", "https://example.com/emoji.png"]];
const tokens = parseContent(content, tags);

const emojis = getCustomEmojis(tokens);
emojis.forEach((emoji) => {
  console.log(`Name: ${emoji.metadata.name}`);
  console.log(`URL: ${emoji.metadata.url}`);
  // Optional: emoji-set-address (NIP-30)
  if (emoji.metadata.emojiSetAddress) {
    console.log(`Emoji Set: ${emoji.metadata.emojiSetAddress}`);
  }
});

// Note: Only emojis with matching tags in `tags` are returned as CUSTOM_EMOJI.
// :unknown: (no matching tag) becomes TEXT, not CUSTOM_EMOJI.
```

### Legacy References

```javascript
const content = "See #[0] and #[1] for details";
const tags = [
  ["p", "npub1xyz..."],
  ["e", "note1abc..."],
];
const tokens = parseContent(content, tags);

const references = getLegacyReferences(tokens);
references.forEach((ref) => {
  console.log(`Index: ${ref.metadata.tagIndex}`);
  console.log(`Type: ${ref.metadata.tagType}`); // "p", "e", etc.
  console.log(`ID: ${ref.metadata.referenceId}`);
  console.log(`Reference Type: ${ref.metadata.referenceType}`); // "npub", "note", etc.
});
```

### Performance Comparison

```javascript
// Fast: Extension-based URL type detection only
const fastTokens = parseContent(content);

// Comprehensive: Includes HTTP requests for unknown URLs
const detailedTokens = await parseContentAsync(content);
```

## Token Structure

Each token has the following base structure:

```typescript
interface TokenBase {
  type: TokenType;
  content: string;
  start: number;
  end: number;
}
```

Tokens are **discriminated unions** - the `type` field determines which metadata fields are available, providing full TypeScript type safety.

### Metadata Examples

**NIP19 Token:**

```typescript
{
  type: "nip19",
  content: "nostr:npub1xyz...",
  start: 0,
  end: 69,
  metadata: {
    subType: "npub",
    hasNostrPrefix: true,
    plainNip19: "npub1xyz..."
  }
}
```

**Custom Emoji Token:**

```typescript
{
  type: "custom_emoji",
  content: ":pepe:",
  start: 0,
  end: 6,
  metadata: {
    name: "pepe",
    url: "https://example.com/pepe.png",
    emojiSetAddress: "30030:79c2...ff6:blobcats"  // Optional (NIP-30)
  }
}
```

**Note:** Only emojis with matching tags in the `tags` parameter are returned as `CUSTOM_EMOJI` tokens. Unmatched `:shortcode:` are returned as `TEXT` tokens instead.

**URL Token:**

```typescript
{
  type: "url",
  content: "https://example.com/photo.png",
  start: 0,
  end: 29,
  metadata: {
    scheme: "https",
    type: "image"  // Optional: only if detected
  }
}
```

**Hashtag Token:**

```typescript
{
  type: "hashtag",
  content: "#Nostr",
  start: 0,
  end: 6,
  metadata: {
    tag: "nostr",  // normalized value (lowercase if from t tag, otherwise lowercase of content)
    validated: true  // true if matched with t tag
  }
}
```

**Legacy Reference Token:**

```typescript
{
  type: "legacy_reference",
  content: "#[0]",
  start: 0,
  end: 4,
  metadata: {
    tagIndex: 0,
    tagType: "p",
    referenceId: "npub1xyz...",
    referenceType: "npub"  // "npub", "note", "naddr", or "unknown"
  }
}
```

## TypeScript Support

Version 0.7.0 introduces full TypeScript type safety with discriminated unions:

```typescript
import { parseContent, TokenType } from "@konemono/nostr-content-parser";

const tokens = parseContent("Hello :pepe:", [["emoji", "pepe", "https://example.com/pepe.png"]]);

tokens.forEach((token) => {
  if (token.type === TokenType.CUSTOM_EMOJI) {
    // TypeScript knows metadata structure here
    console.log(token.metadata.name);  // Always available
    console.log(token.metadata.url);   // Always available (only matched emojis become CUSTOM_EMOJI)

    // Optional: emoji-set-address (NIP-30)
    if (token.metadata.emojiSetAddress) {
      console.log(token.metadata.emojiSetAddress);
    }
  }

  if (token.type === TokenType.NIP19) {
    // TypeScript knows these fields exist
    console.log(token.metadata.plainNip19);
    console.log(token.metadata.subType);
    console.log(token.metadata.hasNostrPrefix);
  }
});
```

## Commands

```bash
# Run tests
npm test

# Run tests once
npm run test:run

# Build
npm run build

# Pre-publish check
npm run prepublishOnly

# Publish to npm
npm publish
```

## Changelog

### 0.7.0 (Breaking Changes)

**Type System Overhaul:**

- Complete TypeScript rewrite with discriminated unions for type-safe token handling
- Token metadata is now strongly typed based on token type
- Breaking: Custom emoji tokens are now always created (with `hasMetadata` flag to distinguish between tagged and untagged emojis)
- Breaking: Legacy reference tokens are only created when tags exist (out-of-bounds references are treated as text)

**New Features:**

- `LEGACY_REFERENCE` token type for parsing `#[0]` style references
- `RELAY` token type for WebSocket relay URLs
- Full metadata type safety - TypeScript now knows exactly which fields exist for each token type

**Improvements:**

- Custom emoji handling: Tagged emojis are recognized as `CUSTOM_EMOJI` tokens; untagged emojis become `TEXT`
- URL type detection restored with proper typing (`"image" | "video" | "audio"`)
- Hashtag metadata now includes `validated` field to distinguish t-tag validated hashtags
- Hashtag `tag` value is normalized: uses t-tag value when available, otherwise lowercase of content
- Better discriminated union support for token filtering functions

**Migration Guide:**

```typescript
// Before (0.6.x)
const emoji = tokens.find((t) => t.type === "custom_emoji");
if (emoji.metadata.url) {
  /* ... */
}

// After (0.7.0)
const emoji = tokens.find((t) => t.type === "custom_emoji");
console.log(emoji.metadata.name);
// After (0.7.0)
const emoji = tokens.find((t) => t.type === "custom_emoji");
console.log(emoji.metadata.name); // Always available
if (emoji.metadata.hasMetadata) {
  // TypeScript knows url exists here
  console.log(emoji.metadata.url);
}
```

### 0.8.0 (Breaking Changes)

**Custom Emoji Type Simplification:**

- Removed `hasMetadata` discriminant from `custom_emoji` token type
- `custom_emoji` is now a single type: `{ url: string; name: string; emojiSetAddress?: string }`
- Only emojis with matching tags in `tags` are returned as `CUSTOM_EMOJI` tokens (untagged `:shortcode:` becomes `TEXT`)
- Added `emojiSetAddress` field (NIP-30 emoji-set-address support)

**Migration Guide:**

```typescript
// Before (0.7.x)
const emoji = tokens.find((t) => t.type === "custom_emoji");
if (emoji.metadata.hasMetadata) {
  console.log(emoji.metadata.url);
}

// After (0.8.0)
const emoji = tokens.find((t) => t.type === "custom_emoji");
console.log(emoji.metadata.url);  // Always available
console.log(emoji.metadata.emojiSetAddress);  // Optional (NIP-30)
```
