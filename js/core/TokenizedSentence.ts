import { ReplacementEntry } from './ReplacementEntry';

/**
 * TokenizedSentence.ts
 * 各原文行に対応し、トークンと元の記号（変数・装飾）のマッピングを保持するクラス
 */
export class TokenizedSentence {
    /**
     * @param originalText 原文
     * @param tokenMap トークン -> 元の文字列 (変数・装飾) のマッピング
     * @param replacements 詳細な置き換え情報のリスト
     */
    constructor(
        public readonly originalText: string,
        private readonly tokenMap: Map<string, string>,
        public readonly replacements: ReplacementEntry[] = []
    ) {}

    /**
     * 翻訳済みのマスキングテキストから、自身のマッピングに基づき記号を復元する
     * @param translatedMaskedText LLMから返ってきたトークン付き翻訳文
     * @returns 記号が復元された最終的な翻訳文
     */
    public restore(translatedMaskedText: string): string {
        let result = translatedMaskedText;

        // すべてのトークンを対応する元の値に置換
        this.tokenMap.forEach((originalValue, token) => {
            // トークンをエスケープして正規表現を作成（大文字小文字を区別しない）
            const escapedToken = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(escapedToken, 'gi');
            
            // 値が空文字の場合も適切に置換（装飾なしのケース）
            result = result.replace(regex, originalValue);
        });

        return result;
    }

    /**
     * 指定されたトークンに対応する元の値を取得する
     */
    public getOriginalValue(token: string): string | undefined {
        return this.tokenMap.get(token);
    }

    /**
     * 保持しているトークンリストを取得する
     */
    public getTokens(): string[] {
        return Array.from(this.tokenMap.keys());
    }
}
