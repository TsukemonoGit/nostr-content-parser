import { parseContent } from "../../src/parseContent"; // 相対パスで読み込み

const content = `
  Hello nostr:npub1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq
  and note: nostr:note1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq
`;

const tokens = parseContent(content);

document.querySelector<HTMLPreElement>("#output")!.textContent = JSON.stringify(
  tokens,
  null,
  2
);
