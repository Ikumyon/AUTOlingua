
import {
    escapeHTML,
    showErrorMessage,
    hideErrorMessage,
    isJapaneseText,
    alertMessage,
    initTableResizer
} from './uiUtils.js';
import {
    modifierCharacters,
    updateReviewColumnVisibility,
    populateToneDropdowns
} from './settingsManager.js';

let currentFileName = '';

/**
 * ファイル処理を管理するモジュール
 * @param {object} options
 * @param {HTMLElement} options.dataTable - データテーブル要素
 * @param {HTMLElement} options.tableContainer - テーブルコンテナ要素
 * @param {HTMLElement} options.translateAllButton - すべて翻訳ボタン
 * @param {HTMLElement} options.translatedFileDownloadSection - ダウンロードセクション
 * @param {HTMLSelectElement} options.filePrefixSelect - ファイルプレフィックス選択要素
 * @param {function} options.adjustKeyColumnWidth - キー列幅調整関数
 * @param {function} options.updateTranslationButtonsState - ボタン状態更新関数
 * @param {object} options.tableFilter - テーブルフィルターモジュール
 * @param {object} options.translationManager - 翻訳マネージャー (ログ操作用)
 */
export const initializeFileProcessor = ({
    dataTable,
    tableContainer,
    translateAllButton,
    translatedFileDownloadSection,
    filePrefixSelect,
    adjustKeyColumnWidth,
    updateTranslationButtonsState,
    tableFilter,
    translationManager
}) => {

    const COLOR_CODE_PATTERN = '§\\w+§!';

    // スキップした行を保存する配列（ダウンロード時に復元するため）
    let skippedRows = [];

    /**
     * ファイルの内容を解析してテーブルを生成する関数
     */
    const processFileContent = async (content) => {
        // 新しいファイルを読み込む際にスキップした行をクリア
        skippedRows = [];
        hideErrorMessage();

        const lines = content.split('\n')
            .filter(line => {
                const trimmedLine = line.trim();
                return trimmedLine !== '' &&
                    !trimmedLine.startsWith('#') &&
                    !trimmedLine.startsWith('l_english:');
            });

        if (lines.length === 0) {
            showErrorMessage('ファイルに有効な内容がありません（コメント行、l_english:行、または空行のみかもしれません）。');
            return;
        }

        let html = '<tbody>';
        let hasValidEntries = false;

        lines.forEach(line => {
            const match = line.match(/^([^:]+):\s*"(.*)"\s*$/);

            if (match && match.length === 3) {
                const key = match[1].trim();
                const value = match[2];

                if (isJapaneseText(value)) {
                    console.log(`Skipping Japanese text: "${value}"`);
                    // 日本語テキストはスキップした行に保存（ダウンロード時に復元）
                    skippedRows.push({ key, value });
                    return;
                }

                if (/^\s*\d+(\.\d+)?\s*$/.test(value)) {
                    console.log(`Skipping numeric text: "${value}"`);
                    // 数値のみもスキップした行に保存（ダウンロード時に復元）
                    skippedRows.push({ key, value });
                    return;
                }

                // 空白または修飾文字のみで構成されているかチェック
                // 空白または修飾文字のみで構成されているかチェック
                const enabledModifiers = modifierCharacters.filter(m => m.enabled && m.regex);

                if (enabledModifiers.length > 0) {
                    try {
                        // 有効な修飾文字パターンをすべて結合 (regex1)|(regex2)|...
                        // 個々のパターンを非キャプチャグループ (?:...) で囲む
                        const combinedPattern = enabledModifiers
                            .map(m => `(?:${m.regex})`)
                            .join('|');

                        const modifierRegex = new RegExp(combinedPattern, 'g');
                        const withoutModifiers = value.replace(modifierRegex, '');

                        // 修飾文字を削除した後、空白のみ（または空）になるかチェック
                        if (withoutModifiers.trim() === '') {
                            console.log(`Skipping modifier-only or whitespace-only text: "${value}"`);
                            // 空白または修飾文字のみの行をスキップした行に保存（ダウンロード時に復元）
                            skippedRows.push({ key, value });
                            return;
                        }
                    } catch (e) {
                        console.error("修飾文字正規表現のテスト中にエラーが発生しました:", e);
                    }
                }

                try {
                    const fullColorCodeRegex = new RegExp(`^${COLOR_CODE_PATTERN}$`);
                    if (fullColorCodeRegex.test(value)) {
                        console.log(`Skipping color-code-only text: "${value}"`);
                        // カラーコードのみもスキップした行に保存（ダウンロード時に復元）
                        skippedRows.push({ key, value });
                        return;
                    }
                } catch (e) {
                    console.error("カラーコード正規表現のテスト中にエラーが発生しました:", e);
                }

                html += `<tr data-key="${escapeHTML(key)}" data-is-reviewed="false">`;
                html += `<td class="delete-column-cell"><button class="delete-row-button"><i class="fas fa-trash-alt"></i></button></td>`;
                html += `<td class="string_key-column-header">${escapeHTML(key)}</td>`;
                html += `<td class="original-text-cell">${escapeHTML(value).replace(/\\n/g, '<br>')}</td>`;
                html += `<td class="translation-cell" contenteditable="true" title="クリックして編集">未翻訳</td>`;
                html += `<td class="review-column-cell"><input type="checkbox" class="review-checkbox h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"></td>`;
                html += `<td>
                            <select class="individual-tone-select">
                            </select>
                        </td>`;
                html += `<td>
                            <button class="translate-button">翻訳</button>
                            <button class="get-suggestions-button ml-2 bg-purple-600 text-white px-2 py-1 rounded-lg shadow-md hover:bg-purple-700 transition-colors duration-300 text-xs">
                                <i class="fas fa-caret-down"></i>
                            </button>
                        </td>`;
                html += `</tr>`;
                hasValidEntries = true;
            } else {
                html += `<tr data-key="N/A" data-is-reviewed="false">`;
                html += `<td colspan="7" class="text-red-500">解析失敗: ${escapeHTML(line)}</td>`;
                html += `</tr>`;
                hasValidEntries = true;
            }
        });
        html += '</tbody>';

        const existingTbody = dataTable.querySelector('tbody');
        if (existingTbody) {
            existingTbody.remove();
        }
        dataTable.insertAdjacentHTML('beforeend', html);

        if (hasValidEntries) {
            tableContainer.classList.remove('hidden');
            translateAllButton.classList.remove('hidden');
            translatedFileDownloadSection.classList.remove('hidden');
            if (adjustKeyColumnWidth) adjustKeyColumnWidth();
            // テーブルのリサイズ機能を再初期化
            const dataTableElem = document.getElementById('data-table');
            if (dataTableElem && typeof initTableResizer === 'function') {
                initTableResizer(dataTableElem);
            }
        } else {
            showErrorMessage('有効な翻訳可能な行が見つかりませんでした。');
        }

        if (translationManager) {
            translationManager.clearTranslationLog();
        }
        populateToneDropdowns();
        updateReviewColumnVisibility();
        if (updateTranslationButtonsState) updateTranslationButtonsState();
        if (tableFilter) tableFilter.updateAllTableRows();
    };

    /**
     * ファイルを読み込む関数
     */
    const readFile = (file) => {
        if (!file) {
            showErrorMessage('ファイルが選択されていません。');
            return;
        }

        currentFileName = file.name;

        const reader = new FileReader();

        reader.onload = async (e) => {
            try {
                await processFileContent(e.target.result);
            } catch (error) {
                console.error('ファイルの処理中にエラーが発生しました:', error);
                showErrorMessage('ファイルの処理中にエラーが発生しました。ファイル形式を確認してください。');
            }
        };

        reader.onerror = () => {
            showErrorMessage('ファイルの読み込み中にエラーが発生しました。');
        };

        reader.readAsText(file);
    };

    /**
     * 翻訳ログをダウンロードする関数
     */
    const downloadTranslationLog = () => {
        const translationLog = translationManager ? translationManager.getTranslationLog() : [];
        if (translationLog.length === 0) {
            alertMessage("ダウンロードする翻訳ログがありません。", 'warning');
            return;
        }

        let csvContent = "number,date,original txt,tone,translated text,status,error_message,pre_modified_text,post_restored_text,llm_model_id\n";

        const escapeCsvField = (field) => {
            if (field === null || field === undefined) return '';
            let stringField = String(field);
            if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
                stringField = stringField.replace(/"/g, '""');
                return `"${stringField}"`;
            }
            return stringField;
        };

        translationLog.forEach((entry, index) => {
            const row = [
                index + 1,
                entry.timestamp,
                entry.originalText,
                entry.selectedTone,
                entry.translatedText,
                entry.status,
                entry.errorMessage,
                entry.preModifiedText || '',
                entry.postRestoredText || '',
                entry.llmModelId || ''
            ].map(escapeCsvField).join(',');
            csvContent += row + '\n';
        });

        const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const date = new Date();
        const dateString = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
        a.download = `translation_log_${dateString}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    /**
     * 翻訳済みYMLファイルをダウンロードする関数
     */
    const downloadTranslatedYml = () => {
        if (!dataTable) return;
        const rows = dataTable.querySelectorAll('tbody tr');
        if (rows.length === 0) {
            alertMessage("ダウンロードするデータがありません。", 'warning');
            return;
        }

        let ymlContent = '\ufeffl_english:\n';
        if (filePrefixSelect && filePrefixSelect.value === 'l_japanese:') {
            ymlContent = '\ufeffl_japanese:\n';
        }

        let hasData = false;

        rows.forEach(row => {
            const keyCell = row.querySelector('td.string_key-column-header');
            const translationCell = row.querySelector('.translation-cell');
            const originalTextCell = row.querySelector('.original-text-cell');

            if (keyCell && translationCell && originalTextCell) {
                const key = keyCell.textContent.trim();
                // textContentだと改行がスペースになる場合があるためinnerTextを使用
                let translation = translationCell.innerText.trim();
                const originalText = originalTextCell.innerText.trim();

                if (translation === '未翻訳' || translation === '翻訳中...' || translation.startsWith('翻訳エラー')) {
                    translation = originalText;
                }

                ymlContent += ` ${key}: "${translation}"\n`;
                hasData = true;
            }
        });

        // スキップした行も復元して追加
        skippedRows.forEach(skipped => {
            ymlContent += ` ${skipped.key}: "${skipped.value}"\n`;
            hasData = true;
        });

        if (!hasData) {
            alertMessage("有効なデータが見つかりませんでした。", 'warning');
            return;
        }

        const blob = new Blob([ymlContent], { type: 'text/yaml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const date = new Date();
        const dateString = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
        a.download = `translated_${dateString}.yml`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return {
        processFileContent,
        readFile,
        downloadTranslationLog,
        downloadTranslatedYml,
        getCurrentFileName: () => currentFileName
    };
};
