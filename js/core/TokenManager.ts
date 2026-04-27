/**
 * TokenManager.ts
 * 翻訳時に使用するランダムなトークン (例: ⟦A7KQ2⟧) を生成・管理するクラス
 */
export class TokenManager {
    private usedTokens: Set<string> = new Set();
    private readonly chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

    /**
     * 新しいユニークなトークンを生成する
     * @returns ⟦ランダム5文字⟧ 形式のトークン
     */
    public generateToken(): string {
        let token: string;
        do {
            let randomPart = '';
            for (let i = 0; i < 5; i++) {
                randomPart += this.chars.charAt(Math.floor(Math.random() * this.chars.length));
            }
            token = `⟦${randomPart}⟧`;
        } while (this.usedTokens.has(token));

        this.usedTokens.add(token);
        return token;
    }

    /**
     * 使用済みトークンをリセットする
     */
    public reset(): void {
        this.usedTokens.clear();
    }
}
