# Nostr Content Parser

Parse Nostr content into structured tokens.

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
- `tags: string[][]` – Optional tag array (used for custom emoji, etc).
- `options: object` – Optional settings:
  - `includeNostrPrefixOnly?: boolean`  
    If `true` (default), only tokens starting with `nostr:` will be included for NIP-19.  
    If `false`, plain NIP-19 tokens (without prefix) will also be parsed.

**Returns:** `Token[]`

URL type detection is performed based on file extensions only (fast and lightweight).

#### `parseContentAsync(content, tags, options?)`

**Asynchronous parsing** - Use when you need comprehensive URL type detection.

**Parameters:**

- `content: string` – Input content to parse.
- `tags: string[][]` – Optional tag array (used for custom emoji, etc).
- `options: object` – Optional settings:
  - `includeNostrPrefixOnly?: boolean` (same as sync version)

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
- `getLightningAddresses(tokens)` - Get Lightning addresses
- `getLightningUrls(tokens)` - Get Lightning URLs
- `getLightningInvoices(tokens)` - Get Lightning invoices
- `getBitcoinAddresses(tokens)` - Get Bitcoin addresses
- `getCashuTokens(tokens)` - Get Cashu tokens
- `getEmails(tokens)` - Get email addresses
- `getNipIdentifiers(tokens)` - Get NIP identifiers

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
  "Check this image: https://example.com/photo and https://example.com/video.mp4";
const tokens = await parseContentAsync(content);

const urls = getUrls(tokens);
urls.forEach((url) => {
  console.log(`URL: ${url.content}`);
  console.log(`Scheme: ${url.metadata.scheme}`); // "https", "http"
  console.log(`Type: ${url.metadata.type}`); // "image", "video", "audio" (if detected)
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

### Custom Emoji Handling

```javascript
const content = "Hello :custom_emoji:!";
const tags = [["emoji", "custom_emoji", "https://example.com/emoji.png"]];
const tokens = parseContent(content, tags);

const emojis = getCustomEmojis(tokens);
emojis.forEach((emoji) => {
  console.log(`Name: ${emoji.metadata.name}`);
  console.log(`URL: ${emoji.metadata.url}`);
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

Each token has the following structure:

```typescript
interface Token {
  type: TokenType;
  content: string;
  start: number;
  end: number;
  metadata: Record<string, unknown>;
}
```

### Metadata Examples

**NIP19 Token:**

```javascript
{
  subType: "npub",
  hasNostrPrefix: true,
  plainNip19: "npub1xyz..."
}
```

**Custom Emoji Token:**

```javascript
{
  name: "custom_emoji",
  url: "https://example.com/emoji.png"
}
```

**URL Token:**

```javascript
{
  scheme: "https",
  type: "image" // Only present if detected
}
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
