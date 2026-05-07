/**
 * translationManager.ts
 * 翻訳機能を管理するモジュール
 */

import { callLLMService } from './llmService';
import { alertMessage } from './uiUtils';
import { settingsManager } from './settingsManager';
import { GlossaryTerm, CustomToneCondition } from './types';
import { StructureParser } from './core/StructureParser';
import { TranslationMasker } from './core/TranslationMasker';
import { TokenizedSentence } from './core/TokenizedSentence';
import { ReplacementEntry } from './core/ReplacementEntry';
import { stageManager } from './stageManager';

/**
 * 翻訳結果のインターフェース
 */
export interface TranslationResult {
    translatedText: string;
    maskedTranslatedText: string;
    tokenizedSentence?: TokenizedSentence;
    status: 'Success' | 'Error';
    errorMessage: string;
    preModifiedText: string;
    postRestoredText: string;
    llmModelId: string;
}

/**
 * 翻訳ログのエントリー
 */
export interface TranslationLogEntry {
    timestamp: string;
    originalText: string;
    selectedTone: string;
    translatedText: string;
    status: string;
    errorMessage: string;
    preModifiedText: string;
    postRestoredText: string;
    llmModelId: string;
}

/**
 * テーブルフィルターのインターフェース
 */
export interface TableFilter {
    applyFilters: () => void;
    updateToneFilterOptions: (customTones: any[]) => void;
    updateAllTableRows: () => void;
}

/**
 * 初期化オプションのインターフェース
 */
export interface TranslationManagerOptions {
    globalToneSelect: HTMLSelectElement;
    tableFilter: TableFilter;
    getCurrentFileName: () => string;
}

/**
 * 翻訳マネージャーの戻り値のインターフェース
 */




/**
 * 翻訳機能を初期化する
 */
export class TranslationManager {
    private translationLog: TranslationLogEntry[] = [];
    private globalToneSelect: HTMLSelectElement | null = null;
    private tableFilter: TableFilter | null = null;
    
    private getCurrentFileNameFn: (() => string) | null = null;

    public initialize({
        globalToneSelect,
        tableFilter,
        getCurrentFileName
    }: TranslationManagerOptions): void {
        this.globalToneSelect = globalToneSelect;
        this.tableFilter = tableFilter;
        
        this.getCurrentFileNameFn = getCurrentFileName;
    }

    /**
     * テキストを翻訳する非同期関数
     */
    public async translateText(
        originalText: string,
        key: string,
        selectedToneValue: string,
        llmProviderId: string,
        llmModelIdOverride: string | null = null,
        maskData?: { maskedText: string, sentence: TokenizedSentence }
    ): Promise<TranslationResult> {
        if (!settingsManager.currentApiKey || settingsManager.currentLlmProviderId !== llmProviderId) {
            const msg = 'APIキーが設定されていないか、選択されたプロバイダのAPIキーがロードされていません。設定モーダルでAPIキーを入力してください。';
            console.warn(msg);
            alertMessage(msg, 'error');
            return {
                translatedText: 'APIキー未設定',
                maskedTranslatedText: '',
                status: 'Error',
                errorMessage: msg,
                preModifiedText: originalText,
                postRestoredText: 'N/A',
                llmModelId: 'N/A'
            };
        }

        if (!originalText || originalText.trim() === '') {
            return {
                translatedText: '',
                maskedTranslatedText: '',
                status: 'Success',
                errorMessage: '',
                preModifiedText: '',
                postRestoredText: '',
                llmModelId: 'N/A'
            };
        }

        let toneInstruction = '';
        let glossaryInstructions = '';

        const selectedProvider = settingsManager.LLM_PROVIDERS.find(p => p.id === llmProviderId);
        let effectiveLlmModelId = '';
        let isThinkingModel = false;

        if (llmModelIdOverride) {
            const m = selectedProvider?.models?.find(x => x.id === llmModelIdOverride);
            if (!m || !m.enabled) {
                const msg = `選択モデルが無効です: ${selectedProvider?.name || llmProviderId} / ${llmModelIdOverride}`;
                alertMessage(msg, 'error');
                return {
                    translatedText: 'モデル未選択',
                    maskedTranslatedText: '',
                    status: 'Error',
                    errorMessage: msg,
                    preModifiedText: originalText,
                    postRestoredText: 'N/A',
                    llmModelId: 'N/A'
                };
            }
            effectiveLlmModelId = m.id;
            isThinkingModel = !!m.isThinkingModel;
        } else {
            const m = selectedProvider?.models?.find(x => x.enabled);
            effectiveLlmModelId = m?.id || '';
            isThinkingModel = !!m?.isThinkingModel;
        }

        const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const checkMatch = (text: string, term: string) => {
            const escapedTerm = escapeRegex(term);
            const startBoundary = /^\w/.test(term) ? '\\b' : '';
            const endBoundary = /\w$/.test(term) ? '\\b' : '';
            const regex = new RegExp(`${startBoundary}${escapedTerm}${endBoundary}`, 'i');
            return regex.test(text);
        };

        const matchedGlossaryTerms: GlossaryTerm[] = [];

        settingsManager.glossaryTerms.forEach(term => {
            const matchFound = checkMatch(originalText, term.original) || 
                               term.originalAlt.some(alt => checkMatch(originalText, alt));

            if (matchFound) {
                matchedGlossaryTerms.push(term);
            }
        });

        if (matchedGlossaryTerms.length > 0) {
            glossaryInstructions += `\n以下の用語集を厳格に適用してください：\n`;
            glossaryInstructions += `| 原文 | 翻訳 | ノート |\n|---|---|---|\n`;
            matchedGlossaryTerms.forEach(term => {
                const note = term.note ? term.note.replace(/\n/g, ' ') : '';
                glossaryInstructions += `| ${term.original} | ${term.translation} | ${note} |\n`;
            });
        }

        let effectiveToneValue = selectedToneValue;
        if (selectedToneValue === 'default' && this.globalToneSelect) {
            effectiveToneValue = this.globalToneSelect.value;
        }

        const selectedTone = settingsManager.customTones.find(t => t.value === effectiveToneValue);

        if (selectedTone) {
            if (selectedTone.isConditional) {
                let matchedConditions: CustomToneCondition[] = [];
                let finalConditionalInstruction = '';
                const currentFileName = this.getCurrentFileNameFn ? this.getCurrentFileNameFn() : '';

                for (const cond of selectedTone.conditions) {
                    try {
                        let target = 'key';
                        let regexStr = cond.condition;

                        if (cond.condition.startsWith('key:')) {
                            target = 'key';
                            regexStr = cond.condition.substring(4);
                        } else if (cond.condition.startsWith('text:') || cond.condition.startsWith('original:')) {
                            target = 'text';
                            regexStr = cond.condition.substring(cond.condition.indexOf(':') + 1);
                        } else if (cond.condition.startsWith('file:') || cond.condition.startsWith('filename:')) {
                            target = 'file';
                            regexStr = cond.condition.substring(cond.condition.indexOf(':') + 1);
                        }

                        const regex = new RegExp(regexStr);
                        let isMatch = false;

                        if (target === 'key') {
                            isMatch = regex.test(key);
                        } else if (target === 'text') {
                            isMatch = regex.test(originalText);
                        } else if (target === 'file') {
                            isMatch = regex.test(currentFileName);
                        }

                        if (isMatch) {
                            matchedConditions.push(cond);
                        }
                    } catch (e) {
                        console.error(`Invalid regex for condition "${cond.condition}":`, e);
                    }
                }

                if (matchedConditions.length > 1) {
                    const matchedConditionsStr = matchedConditions.map(c => c.condition).join(', ');
                    const errorMsg = `条件付き口調の条件が複数マッチしました (キー: "${key}", マッチした条件: ${matchedConditionsStr})。設定を見直してください。`;
                    return {
                        translatedText: '翻訳エラー',
                        maskedTranslatedText: '',
                        status: 'Error',
                        errorMessage: errorMsg,
                        preModifiedText: originalText,
                        postRestoredText: 'N/A',
                        llmModelId: effectiveLlmModelId
                    };
                } else if (matchedConditions.length === 1) {
                    finalConditionalInstruction = matchedConditions[0].instruction;
                } else {
                    finalConditionalInstruction = selectedTone.elseInstruction || '';
                }
                toneInstruction = finalConditionalInstruction;

            } else {
                toneInstruction = selectedTone.instruction || '';
            }
        } else {
            toneInstruction = '自称は「我ら」を使用し、語尾は「である」または「だ」調にしてください。';
        }

        let finalTranslatedText = '';
        let translationStatus: 'Success' | 'Error' = 'Success';
        let errorMessageForLog = '';
        let postRestoredText = '';
        
        const masker = new TranslationMasker();
        let maskedText: string;
        let sentence: TokenizedSentence;

        if (maskData) {
            maskedText = maskData.maskedText;
            sentence = maskData.sentence;
        } else {
            const structure = StructureParser.parse(originalText, settingsManager.modifierCharacters);
            const res = masker.maskSingle(structure);
            maskedText = res.maskedText;
            sentence = res.sentence;
        }
        
        const preModifiedText = maskedText;

        const tokensInText = sentence.getTokens();
        let tokenRule = "";
        if (tokensInText.length > 0) {
            tokenRule = `2. **改変禁止**: ${tokensInText.join(', ')} などの二重角括弧で囲まれたトークンは、変数や制御コードを保護したものです。これらを翻訳したり改変したりせず、日本語として自然な位置に必ずそのまま残すこと。\n`;
        }

        try {
            const systemPrompt = `# 役割
日本語の翻訳者

# 目的
提供された「原文」を、文脈と指定されたスタイルに沿って自然な「日本語」に翻訳する。

# 重要ルール
1. **出力フォーマット**: 最終的な翻訳結果は、必ず <translation> と </translation> のタグで挟んで出力すること。
${tokenRule}

# スタイル・用語指示
- **口調**: ${toneInstruction}
- ${glossaryInstructions || '用語集: 特になし'}`;

        const userMessage = `原文: """\n${maskedText}\n"""`;

            const llmResponse = await callLLMService(effectiveLlmModelId, systemPrompt, userMessage, settingsManager.currentApiKey, isThinkingModel);
            
            let responseText = llmResponse.translatedText;

            // デバッグログをコンソールに出力
            console.groupCollapsed(`%c[AutoLingua] 翻訳実行: ${key}`, 'color: #4f46e5; font-weight: bold;');
            console.log('%cシステムプロンプト:', 'color: #6366f1; font-weight: bold;', systemPrompt);
            console.log('%cユーザーメッセージ (原文):', 'color: #6366f1; font-weight: bold;', userMessage);
            console.groupCollapsed('%cAIの応答結果 (全文):', 'color: #10b981; font-weight: bold;');
            console.log(responseText);
            console.groupEnd();

            const translationMatch = responseText.match(/<translation>([\s\S]*?)<\/translation>/);
            if (translationMatch) {
                finalTranslatedText = translationMatch[1].trim();
            } else {
                finalTranslatedText = responseText.trim();
            }

            console.log('%c最終的な翻訳結果:', 'color: #3b82f6; font-weight: bold;', finalTranslatedText);
            console.groupEnd();

            // バリデーション: 全てのトークンが正しく含まれているかチェック
            const validation = masker.validate(finalTranslatedText, sentence.getTokens());
            if (!validation.isValid) {
                const missing = validation.missingTokens.join(', ');
                throw new Error(`翻訳結果に不足しているトークンがあります: ${missing}`);
            }

        } catch (error: any) {
            finalTranslatedText = `翻訳エラー: ${error.message}`;
            translationStatus = 'Error';
            errorMessageForLog = error.message || '不明なエラー';
            console.error('翻訳中にエラーが発生しました:', error);
        }

        const maskedTranslatedText = finalTranslatedText; // 復元前のトークン付きテキスト
        postRestoredText = sentence.restore(finalTranslatedText);
        finalTranslatedText = postRestoredText;

        const result: TranslationResult = {
            translatedText: finalTranslatedText,
            maskedTranslatedText: maskedTranslatedText,
            tokenizedSentence: sentence,
            status: translationStatus,
            errorMessage: errorMessageForLog,
            preModifiedText: preModifiedText,
            postRestoredText: postRestoredText,
            llmModelId: effectiveLlmModelId
        };

        this.translationLog.push({
            timestamp: new Date().toLocaleString(),
            originalText: originalText,
            selectedTone: selectedToneValue,
            translatedText: result.translatedText,
            status: result.status,
            errorMessage: result.errorMessage,
            preModifiedText: result.preModifiedText,
            postRestoredText: result.postRestoredText,
            llmModelId: result.llmModelId
        });

        return result;
    }

    /**
     * 行のハッシュに基づいてマスキングデータを取得する
     */
    public getMaskDataForGroup(rowElement: HTMLElement): { maskedText: string, sentence: TokenizedSentence, representativeEntries: ReplacementEntry[], allSentences: TokenizedSentence[] } | undefined {
        const hash = rowElement.getAttribute('data-hash');
        if (!hash || hash === '5381') return undefined;

        const masker = new TranslationMasker();
        const allRows = Array.from(document.querySelectorAll('tbody tr'));
        const sameHashRows = allRows.filter(r => r.getAttribute('data-hash') === hash) as HTMLElement[];
        
        const structures = sameHashRows.map(r => {
            const cell = r.querySelector('.original-text-cell') as HTMLElement;
            return StructureParser.parse(cell ? cell.innerText : '', settingsManager.modifierCharacters);
        });

        const groupResult = masker.maskGroup(structures);
        const targetRowIndex = sameHashRows.indexOf(rowElement);
        
        if (targetRowIndex !== -1) {
            return {
                maskedText: groupResult.maskedText,
                sentence: groupResult.sentences[targetRowIndex],
                representativeEntries: groupResult.representativeEntries,
                allSentences: groupResult.sentences
            };
        }
        return undefined;
    }

    /**
     * 翻訳結果を特定の行に適用し、ステージを更新する
     */
    public applyTranslationToRow(rowElement: HTMLElement, result: TranslationResult | string): void {
        const translationCell = rowElement.querySelector('.translation-cell') as HTMLElement;
        if (!translationCell) return;

        const text = typeof result === 'string' ? result : result.translatedText;
        
        // \n (リテラルまたは実際の改行) を <br> に変換して表示
        translationCell.innerHTML = text.replace(/\\n/g, '<br>').replace(/\r?\n/g, '<br>');
        
        // 翻訳成功時にステージを 1 (翻訳済み) に更新 (現在が未翻訳の場合)
        const currentStage = parseInt(rowElement.dataset.stage || '0', 10);
        if (currentStage === 0) {
            stageManager.updateRowStage(rowElement as HTMLTableRowElement, 1);
        }
    }

    /**
     * 同じハッシュを持つ他の行に翻訳を適用するかユーザーに確認し、実行する
     */
    public checkAndApplyToGroup(rowElement: HTMLElement, result: TranslationResult): void {
        const hash = rowElement.getAttribute('data-hash');
        if (!hash || hash === '5381' || !result.maskedTranslatedText || !result.tokenizedSentence) return;

        const allRows = Array.from(document.querySelectorAll('tbody tr'));
        const otherRows = allRows.filter(r => r !== rowElement && r.getAttribute('data-hash') === hash) as HTMLElement[];
        
        if (otherRows.length > 1) {
            if (confirm(`同じテキスト構造を持つ他の ${otherRows.length} 行にもこの翻訳結果を適用しますか？\n（変数や装飾は各行に合わせて自動的に調整されます）`)) {
                this.applyTemplateToGroup(otherRows, result.maskedTranslatedText, result.tokenizedSentence.replacements);
                alertMessage(`${otherRows.length} 行に翻訳結果を適用しました。`, 'success');
            }
        } else if (otherRows.length === 1) {
            this.applyTemplateToGroup(otherRows, result.maskedTranslatedText, result.tokenizedSentence.replacements);
            alertMessage(`他の 1 行にも翻訳結果を自動適用しました。`, 'success');
        }
    }

    /**
     * 手動編集された内容をグループ全体に適用するための確認UIを表示し、必要に応じて実行する
     */
    public async applyManualEditToGroup(rowElement: HTMLElement, manualText: string): Promise<void> {
        const hash = rowElement.getAttribute('data-hash');
        if (!hash || hash === '5381') return;

        const allRows = Array.from(document.querySelectorAll('tbody tr'));
        const groupRows = allRows.filter(r => r.getAttribute('data-hash') === hash) as HTMLElement[];
        const otherRows = groupRows.filter(r => r !== rowElement);
        if (otherRows.length === 0) return;

        // 自動翻訳時と同じロジック（getMaskDataForGroup）を使用して、この行の構造解析データ（対応表）を取得
        const maskData = this.getMaskDataForGroup(rowElement);
        if (!maskData) return;
        
        const masker = new TranslationMasker();
        const targetReplacements = maskData.sentence.replacements;

        // 現在の行の対応表（Sentence）で手動編集文を「ひな形（代表文）」に変換
        const reverseResult = masker.reverseMask(manualText, maskData.sentence);

        // UI要素の取得

        // UI要素の取得
        const modal = document.getElementById('manual-edit-group-modal');
        const originalTemplateElem = document.getElementById('manual-edit-original-template');
        const repTextElem = document.getElementById('manual-edit-representative-text') as HTMLElement;
        const missingContainer = document.getElementById('manual-edit-missing-elements-container');
        const missingList = document.getElementById('manual-edit-missing-elements-list');
        const applyBtn = document.getElementById('apply-manual-edit-to-group-button') as HTMLButtonElement;
        const cancelBtn = document.getElementById('cancel-manual-edit-group-button');

        if (otherRows.length === 1) {
            this.applyTemplateToGroup(otherRows, reverseResult.maskedText, maskData.sentence.replacements);
            alertMessage(`他の 1 行にも変更を自動適用しました。`, 'success');
            return;
        }

        // 2行以上の場合はモーダルを表示（または confirm）
        if (!modal || !repTextElem || !missingContainer || !missingList || !applyBtn || !cancelBtn) {
            // モーダルがない場合のフォールバック（従来のconfirm）
            if (confirm(`同じ構造を持つ他の ${otherRows.length} 行にもこの変更を適用しますか？`)) {
                this.applyTemplateToGroup(otherRows, reverseResult.maskedText, maskData.sentence.replacements);
                alertMessage(`${otherRows.length} 行に適用しました。`, 'success');
            }
            return;
        }

        // 表示内容のセット
        if (originalTemplateElem) {
            originalTemplateElem.textContent = maskData.maskedText;
        }

        // グループ全体のトークンごとのユニークな元の値を収集
        const tokenToOriginalsMap = new Map<string, Set<string>>();
        maskData.allSentences.forEach(sentence => {
            sentence.replacements.forEach(rep => {
                if (!tokenToOriginalsMap.has(rep.token)) {
                    tokenToOriginalsMap.set(rep.token, new Set());
                }
                if (rep.original) {
                    tokenToOriginalsMap.get(rep.token)!.add(rep.original);
                }
            });
        });

        // バリデーション関数（リアルタイム更新用）
        const validate = () => {
            const currentText = repTextElem.innerText.trim();
            const missing = masker.checkMissingTokens(currentText, targetReplacements);
            
            if (missing.length > 0) {
                missingContainer.classList.remove('hidden');
                missingList.innerHTML = missing.map(m => {
                    const originals = Array.from(tokenToOriginalsMap.get(m.token) || []);
                    const displayOriginal = originals.length > 0 ? originals.join(', ') : (m.original || '---');
                    
                    return `<li class="flex items-center gap-2 mb-1.5">
                        <span class="token-badge font-mono bg-amber-200/50 dark:bg-amber-800/50 hover:bg-amber-300 dark:hover:bg-amber-700 px-2 py-0.5 rounded cursor-grab active:cursor-grabbing transition-colors select-none text-sm border border-amber-300/30" 
                              draggable="true" 
                              data-token="${m.token}"
                              title="クリックで挿入、ドラッグで移動">
                            ${m.token}
                        </span> 
                        <span class="text-xs opacity-50">:</span>
                        <span class="font-bold text-indigo-600 dark:text-indigo-400 text-xs truncate max-w-[150px]" title="${displayOriginal}">${displayOriginal}</span> 
                        <span class="text-[10px] opacity-50">(${m.type})</span>
                    </li>`;
                }).join('');

                // イベントリスナーの追加
                const tokenBadges = missingList.querySelectorAll('.token-badge');
                tokenBadges.forEach(badge => {
                    const token = badge.getAttribute('data-token');
                    if (!token) return;

                    badge.addEventListener('click', (e) => {
                        e.preventDefault();
                        this.insertTextAtCursor(repTextElem, token);
                        validate(); // リアルタイムで再バリデーション
                    });

                    badge.addEventListener('dragstart', (e: any) => {
                        e.dataTransfer.setData('text/plain', token);
                    });
                });

                applyBtn.disabled = true;
                applyBtn.classList.add('opacity-50', 'cursor-not-allowed');
            } else {
                missingContainer.classList.add('hidden');
                applyBtn.disabled = false;
                applyBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            }
        };

        // contenteditableでのドロップ後のバリデーション用
        repTextElem.addEventListener('drop', () => {
            setTimeout(validate, 0);
        });

        // モーダルの初期設定
        repTextElem.textContent = reverseResult.maskedText;
        validate();

        // 表示
        modal.classList.remove('hidden');
        modal.style.display = 'flex';

        // プロミスで結果を待機
        return new Promise((resolve) => {
            const onInput = () => validate();
            
            const onApply = () => {
                const finalMaskedText = repTextElem.innerText.trim();
                this.applyTemplateToGroup(groupRows, finalMaskedText, maskData.sentence.replacements);
                alertMessage(`${groupRows.length} 行に適用しました。`, 'success');
                close();
                resolve();
            };

            const onCancel = () => {
                close();
                resolve();
            };

            const close = () => {
                modal.classList.add('hidden');
                modal.style.display = '';
                repTextElem.removeEventListener('input', onInput);
                applyBtn.removeEventListener('click', onApply);
                cancelBtn.removeEventListener('click', onCancel);
            };

            repTextElem.addEventListener('input', onInput);
            applyBtn.addEventListener('click', onApply);
            cancelBtn.addEventListener('click', onCancel);
        });
    }

    /**
     * テンプレート（マスキング済みテキスト）と置換情報を用いて、複数の行に翻訳を適用する共通処理
     */
    private applyTemplateToGroup(rows: HTMLElement[], maskedText: string, replacements: any[]): void {
        const masker = new TranslationMasker();
        rows.forEach(row => {
            const otherOriginalCell = row.querySelector('.original-text-cell') as HTMLElement;
            const otherTranslationCell = row.querySelector('.translation-cell') as HTMLElement;
            
            if (otherOriginalCell && otherTranslationCell) {
                const otherOriginalText = otherOriginalCell.innerText;
                const otherStructure = StructureParser.parse(otherOriginalText, settingsManager.modifierCharacters);
                
                const otherSentence = masker.createSiblingSentence(otherStructure, replacements);
                const restoredText = otherSentence.restore(maskedText);
                
                otherTranslationCell.innerHTML = restoredText.replace(/\\n/g, '<br>').replace(/\r?\n/g, '<br>');
                
                // ステージの更新
                const currentStage = parseInt(row.dataset.stage || '0', 10);
                if (currentStage === 0) {
                    stageManager.updateRowStage(row as HTMLTableRowElement, 1);
                }
            }
        });

        if (this.tableFilter && this.tableFilter.applyFilters) {
            this.tableFilter.applyFilters();
        }
    }

    /**
     * 個別の行を翻訳する関数
     */
    public async translateRow(
        rowElement: HTMLElement,
        llmModelIdOverride: string | null = null,
        isBulk: boolean = false
    ): Promise<TranslationResult | null> {
        if (!settingsManager.currentApiKey) {
            alertMessage('APIキーが設定されていません。設定モーダルでAPIキーを入力してください。', 'error');
            return null;
        }

        const keyCell = rowElement.querySelector('td.string_key-column-header');
        const originalTextCell = rowElement.querySelector('.original-text-cell') as HTMLElement;
        const translationCell = rowElement.querySelector('.translation-cell') as HTMLElement;
        const translateButton = rowElement.querySelector('.translate-button') as HTMLButtonElement;
        const individualToneSelect = rowElement.querySelector('.individual-tone-select') as HTMLSelectElement;

        if (!originalTextCell || !translationCell || !translateButton || !individualToneSelect || !keyCell) {
            console.error('必要なセルまたはボタン、ドロップダウンが見つかりません。');
            return null;
        }

        const key = keyCell.textContent || '';
        const originalText = originalTextCell.innerText;
        const selectedIndividualTone = individualToneSelect.value;

        const actionContainer = translateButton.parentElement;
        if (actionContainer) actionContainer.classList.add('hidden');
        
        translationCell.textContent = '翻訳中...';
        individualToneSelect.disabled = true;

        let finalStatus = 'Success';
        let translationResult: TranslationResult | null = null;

        try {
            const maskData = this.getMaskDataForGroup(rowElement);
            const result = await this.translateText(originalText, key, selectedIndividualTone, settingsManager.currentLlmProviderId, llmModelIdOverride, maskData);
            translationResult = result;
            
            if (result.status === 'Error') {
                translationCell.textContent = `翻訳エラー: ${result.errorMessage}`;
                alertMessage(`個別の翻訳エラー: ${result.errorMessage}`, 'error');
                finalStatus = 'Error';
            } else {
                this.applyTranslationToRow(rowElement, result);
            }
        } catch (error: any) {
            translationCell.textContent = `翻訳エラー: ${error.message || '不明なエラー'}`;
            console.error('個別の翻訳中にエラーが発生しました:', error);
            alertMessage(`個別の翻訳エラー: ${error.message}`, 'error');
            finalStatus = 'Error';
        } finally {
            if (actionContainer) actionContainer.classList.remove('hidden');
            individualToneSelect.disabled = false;

            if (!isBulk && finalStatus === 'Success' && translationResult) {
                this.checkAndApplyToGroup(rowElement, translationResult);
            }

            if (this.tableFilter && this.tableFilter.applyFilters) this.tableFilter.applyFilters();
        }

        return translationResult;
    }

    public addLogEntry(entry: Partial<TranslationLogEntry>): void {
        this.translationLog.push({
            timestamp: new Date().toLocaleString(),
            originalText: '',
            selectedTone: '',
            translatedText: '',
            status: '',
            errorMessage: '',
            preModifiedText: '',
            postRestoredText: '',
            llmModelId: '',
            ...entry
        } as TranslationLogEntry);
    }

    public getTranslationLog(): TranslationLogEntry[] {
        return this.translationLog;
    }

    public clearTranslationLog(): void {
        this.translationLog = [];
    }

    /**
     * contenteditable要素内のカーソル位置にテキストを挿入する
     */
    private insertTextAtCursor(element: HTMLElement, text: string): void {
        element.focus();
        const selection = window.getSelection();
        if (!selection || !selection.rangeCount) {
            element.innerText += text;
            return;
        }

        const range = selection.getRangeAt(0);
        // 選択範囲が要素の外にある場合は末尾に追加
        if (!element.contains(range.commonAncestorContainer)) {
            element.innerText += text;
            return;
        }

        range.deleteContents();
        const textNode = document.createTextNode(text);
        range.insertNode(textNode);

        // カーソルを挿入したテキストの直後に移動
        range.setStartAfter(textNode);
        range.setEndAfter(textNode);
        selection.removeAllRanges();
        selection.addRange(range);
    }
}

export const translationManager = new TranslationManager();
