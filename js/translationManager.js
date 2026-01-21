
import { callLLMService } from './llmService.js';
import { alertMessage } from './uiUtils.js';
import {
    LLM_PROVIDERS,
    currentApiKey,
    currentLlmProviderId,
    glossaryTerms,
    customTones,
    modifierCharacters
} from './settingsManager.js';

let translationLog = [];

/**
 * 翻訳機能を管理するモジュール
 * @param {object} options
 * @param {HTMLElement} options.globalToneSelect - 全体口調設定ドロップダウン
 * @param {object} options.tableFilter - テーブルフィルターモジュール
 * @param {string} options.currentFileNameGetter - 現在のファイル名を取得する関数 (or value if static, but it changes)
 */
export const initializeTranslationManager = ({
    globalToneSelect,
    tableFilter,
    getCurrentFileName // currentFileName getter
}) => {

    const COLOR_CODE_PATTERN = '§\\w+§!';
    const COLOR_CODE_PART_PATTERN = '§\\w';

    /**
     * テキストを翻訳する非同期関数
     */
    const translateText = async (originalText, key, selectedToneValue, llmProviderId, llmModelIdOverride = null) => {
        if (!currentApiKey || currentLlmProviderId !== llmProviderId) {
            const msg = 'APIキーが設定されていないか、選択されたプロバイダのAPIキーがロードされていません。設定モーダルでAPIキーを入力してください。';
            console.warn(msg);
            alertMessage(msg, 'error');
            return { translatedText: 'APIキー未設定', status: 'Error', errorMessage: msg, preModifiedText: originalText, postRestoredText: 'N/A', llmModelId: 'N/A' };
        }

        if (!originalText || originalText.trim() === '') {
            return { translatedText: '', status: 'Success', errorMessage: '', preModifiedText: '', postRestoredText: '', llmModelId: 'N/A' };
        }

        let toneInstruction = '';
        let glossaryInstructions = '';
        let colorcodeInstructions = '';

        const selectedProvider = LLM_PROVIDERS.find(p => p.id === llmProviderId);
        let effectiveLlmModelId = null;

        if (llmModelIdOverride) {
            const m = selectedProvider?.models?.find(x => x.id === llmModelIdOverride);
            if (!m || !m.enabled) {
                const msg = `選択モデルが無効です: ${selectedProvider?.name || llmProviderId} / ${llmModelIdOverride}`;
                alertMessage(msg, 'error');
                return { translatedText: 'モデル未選択', status: 'Error', errorMessage: msg, preModifiedText: originalText, postRestoredText: 'N/A', llmModelId: 'N/A' };
            }
            effectiveLlmModelId = m.id;
        } else {
            const m = selectedProvider?.models?.find(x => x.enabled);
            if (!m) {
                // Default handling if no model found, though usually checked before
            }
            effectiveLlmModelId = m?.id;
        }

        const lowerCaseText = originalText.toLowerCase();
        glossaryTerms.forEach(term => {
            const lowerCaseOriginal = term.original.toLowerCase();
            const matchingAlts = term.originalAlt.filter(alt => lowerCaseText.includes(alt.toLowerCase()));

            if (lowerCaseText.includes(lowerCaseOriginal) || matchingAlts.length > 0) {
                glossaryInstructions += `原文中の「${term.original}」`;
                if (matchingAlts.length > 0) {
                    glossaryInstructions += `またはその派生形（${matchingAlts.join(', ')}）`;
                }
                glossaryInstructions += `は必ず「${term.translation}」と翻訳してください。`;
                if (term.note) {
                    glossaryInstructions += `（ノート: ${term.note}）`;
                }
                glossaryInstructions += '\n';
            }
        });

        let effectiveToneValue = selectedToneValue;
        if (selectedToneValue === 'default') {
            effectiveToneValue = globalToneSelect.value;
        }

        const selectedTone = customTones.find(t => t.value === effectiveToneValue);

        if (selectedTone) {
            if (selectedTone.isConditional) {
                let matchedConditions = [];
                let finalConditionalInstruction = '';
                const currentFileName = getCurrentFileName ? getCurrentFileName() : '';

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
                    return { translatedText: '翻訳エラー', status: 'Error', errorMessage: errorMsg, preModifiedText: originalText, postRestoredText: 'N/A', llmModelId: effectiveLlmModelId };
                } else if (matchedConditions.length === 1) {
                    finalConditionalInstruction = matchedConditions[0].instruction;
                } else {
                    finalConditionalInstruction = selectedTone.elseInstruction || '';
                }
                toneInstruction = finalConditionalInstruction;

            } else {
                toneInstruction = selectedTone.instruction;
            }
        } else {
            toneInstruction = '自称は「我ら」を使用し、語尾は「である」または「だ」調にしてください。';
        }

        let finalTranslatedText = '';
        let translationStatus = 'Success';
        let errorMessageForLog = '';
        let preModifiedText = originalText;
        let postRestoredText = '';

        let modifiedText = originalText;
        let colorcodes = [];
        const codePlaceholderPrefix = "§CODE_PLACEHOLDER_";
        let placeholderCounter = 0;
        const matchResults = [];

        if (modifierCharacters.length > 0 && modifierCharacters[0].regex) {
            try {
                const generalModifierRegex = new RegExp(modifierCharacters[0].regex, 'g');
                let match;
                while ((match = generalModifierRegex.exec(modifiedText)) !== null) {
                    const originalMatch = match[0];
                    const placeholder = `${codePlaceholderPrefix}${placeholderCounter++}§`;
                    modifiedText = modifiedText.split(originalMatch).join(placeholder);
                    matchResults.push([originalMatch, placeholder]);
                }
            } catch (e) {
                console.error("無効な修飾文字正規表現:", e);
                errorMessageForLog = `無効な修飾文字正規表現: ${e.message}`;
                translationStatus = 'Error';
                finalTranslatedText = '翻訳エラー';
            }
        }

        if (translationStatus !== 'Error') {
            try {
                const colorCodeRegex = new RegExp(COLOR_CODE_PATTERN, 'g');
                let match;
                while ((match = colorCodeRegex.exec(modifiedText)) !== null) {
                    const fullMatch = match[0];
                    const colorPartRegex = new RegExp(COLOR_CODE_PART_PATTERN);
                    const colorPartMatch = fullMatch.match(colorPartRegex);
                    let colorPart = '';
                    if (colorPartMatch && colorPartMatch.length > 0) {
                        colorPart = colorPartMatch[0];
                    }

                    const textWithoutCode = fullMatch.replace(new RegExp(colorPart.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '!$', 'g'), '').replace(new RegExp(colorPart.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'), '');

                    colorcodes.push([textWithoutCode, colorPart]);

                    const placeholder = `${codePlaceholderPrefix}${placeholderCounter++}§`;
                    modifiedText = modifiedText.split(fullMatch).join(placeholder);
                    matchResults.push([fullMatch, placeholder]);
                }

                if (colorcodes.length > 0) {
                    colorcodeInstructions += `その際、以下にリストされている「カラーコード以外の部分」の日本語訳は、対応する「カラーコード」と「§!」で挟んでください。`;
                    colorcodeInstructions += `\n- カラーコード以外の部分: "${colorcodes.map(entry => entry[0]).join('", "')}"`;
                    colorcodeInstructions += `\n例: 原文「§Y§!Hello§!」が「こんにちは」と翻訳された場合、最終的な出力は「§Y§!こんにちは§!」としてください。`;
                }

                preModifiedText = modifiedText;
            } catch (e) {
                console.error("無効な修飾文字正規表現 (カラーコード):", e);
                errorMessageForLog = `無効な修飾文字正規表現 (カラーコード): ${e.message}`;
                translationStatus = 'Error';
                finalTranslatedText = '翻訳エラー';
            }
        }

        if (translationStatus === 'Error') {
            translationLog.push({
                timestamp: new Date().toLocaleString(),
                originalText: originalText,
                selectedTone: selectedToneValue,
                translatedText: finalTranslatedText,
                status: translationStatus,
                errorMessage: errorMessageForLog,
                preModifiedText: preModifiedText,
                postRestoredText: 'N/A',
                llmModelId: effectiveLlmModelId
            });
            return { translatedText: finalTranslatedText, status: translationStatus, errorMessage: errorMessageForLog, preModifiedText: preModifiedText, postRestoredText: 'N/A', llmModelId: effectiveLlmModelId };
        }

        try {
            const prompt = `以下の英語のテキストを日本語に翻訳してください。翻訳結果のみを返してください。
改行文字（\\n）は原文の通りに翻訳結果にも含めてください。
余計な説明や前置き、後書きは一切含めないでください。
${toneInstruction}
${glossaryInstructions}
${colorcodeInstructions}
${modifiedText}`;

            const llmResponse = await callLLMService(effectiveLlmModelId, prompt, currentApiKey);
            finalTranslatedText = llmResponse.translatedText;

        } catch (error) {
            finalTranslatedText = '翻訳エラー';
            translationStatus = 'Error';
            errorMessageForLog = error.message || '不明なエラー';
            console.error('翻訳中にエラーが発生しました:', error);
        }

        postRestoredText = finalTranslatedText;

        for (let i = matchResults.length - 1; i >= 0; i--) {
            const item = matchResults[i];
            const originalMatch = item[0];
            const placeholder = item[1];

            const escapedPlaceholder = placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const placeholderRegex = new RegExp(escapedPlaceholder, 'g');
            postRestoredText = postRestoredText.replace(placeholderRegex, originalMatch);
        }

        postRestoredText = postRestoredText.replace(/§！/g, '§!');
        finalTranslatedText = postRestoredText;

        translationLog.push({
            timestamp: new Date().toLocaleString(),
            originalText: originalText,
            selectedTone: selectedToneValue,
            translatedText: finalTranslatedText,
            status: translationStatus,
            errorMessage: errorMessageForLog,
            preModifiedText: preModifiedText,
            postRestoredText: finalTranslatedText,
            llmModelId: effectiveLlmModelId
        });

        return { translatedText: finalTranslatedText, status: translationStatus, errorMessage: errorMessageForLog, preModifiedText: preModifiedText, postRestoredText: postRestoredText, llmModelId: effectiveLlmModelId };
    };

    /**
     * 個別の行を翻訳する関数
     */
    const translateRow = async (rowElement) => {
        if (!currentApiKey) {
            alertMessage('APIキーが設定されていません。設定モーダルでAPIキーを入力してください。', 'error');
            return;
        }

        const keyCell = rowElement.querySelector('td.string_key-column-header');
        const originalTextCell = rowElement.querySelector('.original-text-cell');
        const translationCell = rowElement.querySelector('.translation-cell');
        const translateButton = rowElement.querySelector('.translate-button');
        const individualToneSelect = rowElement.querySelector('.individual-tone-select');
        const reviewCheckbox = rowElement.querySelector('.review-checkbox');

        if (!originalTextCell || !translationCell || !translateButton || !individualToneSelect || !keyCell || !reviewCheckbox) {
            console.error('必要なセルまたはボタン、ドロップダウン、チェックボックスが見つかりません。');
            return;
        }

        const key = keyCell.textContent;
        const originalText = originalTextCell.textContent;
        const selectedIndividualTone = individualToneSelect.value;

        translationCell.textContent = '翻訳中...';
        translateButton.disabled = true;
        translateButton.textContent = '翻訳中...';
        individualToneSelect.disabled = true;
        reviewCheckbox.disabled = true;

        try {
            const result = await translateText(originalText, key, selectedIndividualTone, currentLlmProviderId);
            if (result.status === 'Error') {
                translationCell.textContent = `翻訳エラー: ${result.errorMessage}`;
                alertMessage(`個別の翻訳エラー: ${result.errorMessage}`, 'error');
            } else {
                translationCell.textContent = result.translatedText;
            }
        } catch (error) {
            translationCell.textContent = `翻訳エラー: ${error.message || '不明なエラー'}`;
            console.error('個別の翻訳中にエラーが発生しました:', error);
            alertMessage(`個別の翻訳エラー: ${error.message}`, 'error');
        } finally {
            translateButton.disabled = false;
            translateButton.textContent = '翻訳'; // 元に戻す
            individualToneSelect.disabled = false;
            reviewCheckbox.disabled = false;
            if (tableFilter) tableFilter.applyFilters();
        }
    };

    return {
        translateText,
        translateRow,
        getTranslationLog: () => translationLog,
        clearTranslationLog: () => { translationLog = []; }
    };
};
