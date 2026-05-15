import { pinyin } from "pinyin-pro";

export function toPinyin(hanzi: string): string {
  return pinyin(hanzi, { toneType: "symbol", type: "string", separator: " " });
}

export function isChinese(text: string): boolean {
  return /[\u4e00-\u9fff]/.test(text);
}
