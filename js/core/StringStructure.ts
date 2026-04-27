/**
 * StringStructure.ts
 * 原文の構造データ（本文と変数・装飾パターンのハッシュ等）を保持するクラス
 */

export interface StructureElement {
    type: 'variable' | 'decoration';
    originalValue: string;
    category: string; // 'country_name', 'emphasis', etc.
    relativeOffset: number; // 要素を除去したベーステキスト内での文字オフセット
}

export class StringStructure {
    constructor(
        public readonly templateText: string,           // 全要素をプレースホルダー化したテキスト
        public readonly elements: StructureElement[],    // 抽出された全要素（変数・装飾）
        public readonly textHash: string,               // 本文（装飾なし・変数プレースホルダー）のハッシュ
        public readonly patternHash: string,            // 変数の位置パターンのハッシュ
        public readonly originalText: string,           // 完全な原文
        public readonly baseText: string                // 全要素（変数・装飾）を除去した純粋な本文
    ) {}

    /**
     * 本文ハッシュとパターンハッシュを組み合わせた一意のグループキーを取得する
     * 装飾（§Y等）の違いはハッシュに含まれないため、類似文が同じグループになる
     */
    public get groupKey(): string {
        return `${this.textHash}-${this.patternHash}`;
    }

    /**
     * 文字列からハッシュ値を生成する
     */
    public static generateHash(text: string): string {
        let hash = 5381;
        if (!text || text.length === 0) return hash.toString();
        for (let i = 0; i < text.length; i++) {
            const char = text.charCodeAt(i);
            hash = ((hash << 5) + hash) + char;
            hash |= 0;
        }
        return hash.toString();
    }
}
