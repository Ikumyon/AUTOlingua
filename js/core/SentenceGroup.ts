import { TokenizedSentence } from './TokenizedSentence';
import { TokenManager } from './TokenManager';
import { StringStructure, StructureElement } from './StringStructure';
import { ReplacementEntry } from './ReplacementEntry';

/**
 * SentenceGroup.ts
 * 類似するテキスト行をグループ化し、代表文の生成と翻訳結果の分配を行うクラス
 */
export class SentenceGroup {
    private sentences: TokenizedSentence[] = [];
    private representativeTokens: string[] = [];
    private maskedRepresentativeText: string = '';
    private representativeEntries: ReplacementEntry[] = [];

    constructor(structures: StringStructure[], tokenManager: TokenManager) {
        if (structures.length === 0) {
            throw new Error('SentenceGroup requires at least one structure.');
        }

        // 1. すべての文からユニークなスロットを収集する
        const slotMap = new Map<string, StructureElement>();
        structures.forEach(structure => {
            structure.elements.forEach(elm => {
                const slotKey = this.buildSlotKey(elm);
                if (!slotMap.has(slotKey)) {
                    slotMap.set(slotKey, elm);
                }
            });
        });

        // 2. スロットをソートする
        // relativeOffset (昇順) -> role (open -> value -> close) の順
        const roleOrder = { 'open': 0, 'value': 1, 'close': 2 };
        const sortedSlotKeys = Array.from(slotMap.keys()).sort((a, b) => {
            const [offsetA, roleA] = a.split(':');
            const [offsetB, roleB] = b.split(':');
            
            const offA = parseInt(offsetA, 10);
            const offB = parseInt(offsetB, 10);
            
            if (offA !== offB) return offA - offB;
            return roleOrder[roleA as keyof typeof roleOrder] - roleOrder[roleB as keyof typeof roleOrder];
        });

        // 3. 代表文用の情報を生成
        this.representativeEntries = sortedSlotKeys.map(slotKey => {
            const elm = slotMap.get(slotKey)!;
            const token = tokenManager.generateToken();
            this.representativeTokens.push(token);
            
            return {
                token,
                original: elm.originalValue,
                type: elm.type,
                category: elm.category,
                relativeOffset: elm.relativeOffset,
                role: this.detectRole(elm),
                slotKey
            };
        });

        // 4. マージされたテンプレート（代表文）を構築
        const baseText = structures[0].baseText;
        let superTemplate = '';
        let currentPos = 0;
        
        this.representativeEntries.forEach(entry => {
            superTemplate += baseText.substring(currentPos, entry.relativeOffset);
            superTemplate += entry.token;
            currentPos = entry.relativeOffset;
        });
        superTemplate += baseText.substring(currentPos);
        this.maskedRepresentativeText = superTemplate;

        // 5. 各文のマッピング（TokenizedSentence）を作成
        this.sentences = structures.map(structure => {
            const mapping = new Map<string, string>();
            const rowSlotMap = new Map<string, StructureElement>();
            const rowReplacements: ReplacementEntry[] = [];

            // この文のスロットマップを作成
            structure.elements.forEach(elm => {
                rowSlotMap.set(this.buildSlotKey(elm), elm);
            });
            
            this.representativeEntries.forEach(rep => {
                const element = rowSlotMap.get(rep.slotKey);
                const originalValue = element ? element.originalValue : '';
                mapping.set(rep.token, originalValue);
                
                rowReplacements.push({
                    ...rep,
                    original: originalValue
                });
            });

            return new TokenizedSentence(structure.originalText, mapping, rowReplacements);
        });
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
     * マスキングされた代表文を取得する
     */
    public getMaskedRepresentativeText(): string {
        return this.maskedRepresentativeText;
    }

    /**
     * 代表文に使用されているトークンリストを取得する
     */
    public getTokens(): string[] {
        return [...this.representativeTokens];
    }

    /**
     * 代表文の置き換え情報リストを取得する
     */
    public getRepresentativeEntries(): ReplacementEntry[] {
        return [...this.representativeEntries];
    }

    /**
     * グループ内の文のリストを取得する
     */
    public getSentences(): TokenizedSentence[] {
        return this.sentences;
    }
}
