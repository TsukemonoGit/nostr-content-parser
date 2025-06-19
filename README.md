# Nostr Content Parser

Parse Nostr content into structured tokens.

## Installation

```bash
npm install nostr-content-parser
```

## Usage

```javascript
import { parseContent, TokenType } from "nostr-content-parser";

const content = "Hello npub1xyz... Check :custom_emoji: #nostr";
const tags = [["emoji", "custom_emoji", "https://example.com/emoji.png"]];

const tokens = parseContent(content, tags);
console.log(tokens);
```

## API

- `parseContent(content, tags)` - Parse content into tokens
- `TokenType` - Token type constants
- `filterTokens(tokens, types)` - Filter tokens by type
- `getNip19Entities(tokens)` - Get NIP-19 entities
- `getUrls(tokens)` - Get URLs
- `getCustomEmojis(tokens)` - Get custom emojis
- `getHashtags(tokens)` - Get hashtags
- `getMentions(tokens)` - Get mentions

## 6. 実行コマンド

```bash
# テスト実行
npm test

# テスト実行（1回のみ）
npm run test:run

# ビルド
npm run build

# 公開前チェック
npm run prepublishOnly

# npm公開
npm publish
```
