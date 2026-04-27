import { StringStructure, StructureElement } from './StringStructure';
import { TokenManager } from './TokenManager';
import { TokenizedSentence } from './TokenizedSentence';
import { SentenceGroup } from './SentenceGroup';
import { ReplacementEntry } from './ReplacementEntry';

export class TranslationMasker {
    private tokenManager: TokenManager = new TokenManager();

    /**
     * 文を解析して TokenizedSentence を生成し、代表文をマスキングする
     * @param structures 同じグループに属する構造データのリスト
     * @returns { maskedText, sentences, representativeEntries }
     */
    public maskGroup(structures: StringStructure[]): { 
        maskedText: string, 
        sentences: TokenizedSentence[], 
        representativeEntries: ReplacementEntry[] 
    } {
        this.tokenManager.reset();
        
        const group = new SentenceGroup(structures, this.tokenManager);

        return {
            maskedText: group.getMaskedRepresentativeText(),
            sentences: group.getSentences(),
            representativeEntries: group.getRepresentativeEntries()
        };
    }

    /**
     * 単一の文をマスキングする（個別翻訳用）
     */
    public maskSingle(structure: StringStructure): { 
        maskedText: string, 
        sentence: TokenizedSentence,
        representativeEntries: ReplacementEntry[]
    } {
        const result = this.maskGroup([structure]);
        return {
            maskedText: result.maskedText,
            sentence: result.sentences[0],
            representativeEntries: result.representativeEntries
        };
    }

    /**
     * 既存のトークンリストを使用して、別の文の構造に基づいた復元用データを生成する
     * @param structure 別の文の構造データ
     * @param representativeEntries 代表文の置き換え情報リスト
     */
    public createSiblingSentence(
        structure: StringStructure, 
        representativeEntries: ReplacementEntry[]
    ): TokenizedSentence {
        const mapping = new Map<string, string>();
        const rowSlotMap = new Map<string, StructureElement>();
        const rowReplacements: ReplacementEntry[] = [];

        // この文のスロットマップを作成
        structure.elements.forEach(elm => {
            rowSlotMap.set(this.buildSlotKey(elm), elm);
        });
        
        representativeEntries.forEach(rep => {
            const element = rowSlotMap.get(rep.slotKey);
            const originalValue = element ? element.originalValue : '';
            mapping.set(rep.token, originalValue);
            
            rowReplacements.push({
                ...rep,
                original: originalValue
            });
        });

        return new TokenizedSentence(structure.originalText, mapping, rowReplacements);
    }

    private buildSlotKey(elm: StructureElement): string {
        const role = this.detectRole(elm);
        return `${elm.relativeOffset}:${role}:${elm.type}:${elm.category}`;
    }

    private detectRole(elm: StructureElement): 'value' | 'open' | 'close' {
        if (elm.type === 'variable') {
            return 'value';
        }
        if (elm.originalValue === '§!') {
            return 'close';
        }
        return 'open';
    }

    /**
     * 翻訳結果が有効か（トークンがすべて含まれているか）チェックする
     * @param translatedMaskedText 翻訳結果
     * @param tokens 含まれているべきトークンのリスト
     */
    public validate(translatedMaskedText: string, tokens: string[]): { isValid: boolean; missingTokens: string[] } {
        const missingTokens: string[] = [];
        tokens.forEach(token => {
            const escapedToken = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(escapedToken, 'i');
            if (!regex.test(translatedMaskedText)) {
                missingTokens.push(token);
            }
        });

        return {
            isValid: missingTokens.length === 0,
            missingTokens
        };
    }

    /**
     * 復元されたテキスト（手動編集後など）を、指定された文の構造に基づいて再度マスキングする
     * @param restoredText 復元済みのテキスト
     * @param sentence 元の文の情報（トークンマッピングを含む）
     */
    public reverseMask(restoredText: string, sentence: TokenizedSentence): { 
        maskedText: string, 
        missingTokens: { token: string, original: string, type: string }[] 
    } {
        let maskedText = restoredText;
        const missingTokens: { token: string, original: string, type: string }[] = [];

        // トークンに置き換えるべき元の値を順次置換していく
        // 変数や装飾タグが複数ある場合、出現順に処理を試みる
        sentence.replacements.forEach(rep => {
            if (!rep.original) {
                // 元の値が空（稀なケース）の場合はスキップしつつ不足とはみなさない
                return;
            }

            const escapedOriginal = rep.original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            // 複数ある場合に備え、1回ずつ置換する（gフラグなし）
            const regex = new RegExp(escapedOriginal, 'i');
            
            if (regex.test(maskedText)) {
                maskedText = maskedText.replace(regex, rep.token);
            } else {
                missingTokens.push({ 
                    token: rep.token, 
                    original: rep.original,
                    type: rep.type
                });
            }
        });

        return { maskedText, missingTokens };
    }

    /**
     * 指定されたテキスト内に、期待されるトークンが含まれているかチェックし、不足しているものを返す
     */
    public checkMissingTokens(text: string, replacements: { token: string, original: string, type: string }[]): { token: string, original: string, type: string }[] {
        return replacements.filter(rep => !text.includes(rep.token));
    }
}
