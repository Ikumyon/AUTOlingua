/**
 * ReplacementEntry.ts
 * トークンと復元対象の対応関係を管理するインターフェース
 */
export interface ReplacementEntry {
    token: string;          // LLMに渡す保護トークン (例: ⟦A1111⟧)
    original: string;       // 元の文字列 (例: [Root.GetName], §Y, §!)
    type: 'variable' | 'decoration';
    category: string;       // 'name_var', 'emphasis' など
    relativeOffset: number; // 要素を除去した本文上の位置
    role: 'value' | 'open' | 'close'; // 役割
    slotKey: string;        // 対応付け用の安定キー
}
