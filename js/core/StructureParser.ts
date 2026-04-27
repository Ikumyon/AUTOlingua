import { StringStructure, StructureElement } from './StringStructure';
import { ModifierCharacter } from '../types';

export class StructureParser {
    /**
     * 原文を解析し、StringStructure インスタンスを生成する
     */
    public static parse(originalText: string, modifiers: ModifierCharacter[]): StringStructure {
        const enabledModifiers = modifiers.filter(m => m.enabled);
        
        // 1. 正規化（トリム、連続スペースの統合、小文字化）
        let normalized = originalText.trim().replace(/\s+/g, ' ').toLowerCase();

        // 2. 修飾文字から正規表現を構築
        // 各パターンをキャプチャグループで結合し、どのパターンにマッチしたか判別できるようにする
        const patternSources = enabledModifiers.map(m => `(${m.regex})`);
        const combinedRegex = new RegExp(patternSources.join('|'), 'g');
        
        // 変数のみをプレースホルダー化したテキストを作成（ハッシュ用）
        const variablePositions: number[] = [];
        const templateForHash = normalized.replace(combinedRegex, (_match, ...args) => {
            // マッチしたグループのインデックスを特定
            const matchIndex = args.findIndex((val, idx) => idx < enabledModifiers.length && val !== undefined);
            const modifier = enabledModifiers[matchIndex];
            
            if (modifier.type === 'variable') {
                // オフセットは normalized 上の位置
                const offset = args[enabledModifiers.length];
                variablePositions.push(offset);
                return '⟦VAR⟧';
            }
            return ''; // 装飾は除去
        });

        // 3. 全要素の抽出（原文順）
        const elements: StructureElement[] = [];
        let totalRemovedLength = 0;

        // originalText に対して再度マッチングを行い、要素を抽出
        let match;
        // RegExp インスタンスを新しく作成（副作用回避）
        const execRegex = new RegExp(combinedRegex.source, 'g');
        
        while ((match = execRegex.exec(originalText)) !== null) {
            const val = match[0];
            const originalOffset = match.index;
            const relativeOffset = originalOffset - totalRemovedLength;

            // マッチしたグループのインデックスを特定
            const matchIndex = match.slice(1, enabledModifiers.length + 1).findIndex(m => m !== undefined);
            const modifier = enabledModifiers[matchIndex];

            elements.push({
                type: modifier.type,
                originalValue: val,
                category: modifier.category,
                relativeOffset
            });
            
            totalRemovedLength += val.length;
        }

        // ベーステキスト（全要素を除去したもの）を取得
        const baseText = originalText.replace(execRegex, '');

        // 4. ハッシュ生成
        const textHash = StringStructure.generateHash(templateForHash);
        const patternHash = StringStructure.generateHash(variablePositions.join(','));

        // 代表文生成用のテンプレート（すべての要素をプレースホルダー化）
        let elementIdx = 0;
        const fullTemplateText = originalText.replace(execRegex, () => {
            return `⟦ELM_${elementIdx++}⟧`;
        });

        return new StringStructure(fullTemplateText, elements, textHash, patternHash, originalText, baseText);
    }
}
