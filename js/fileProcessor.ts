import {
    escapeHTML,
    showErrorMessage,
    hideErrorMessage,
    isJapaneseText,
    alertMessage,
    initTableResizer
} from './uiUtils';
import { settingsManager } from './settingsManager';
import { TableFilter } from './tableFilter';
import { TranslationManager } from './translationManager';
import { StructureParser } from './core/StructureParser';
import { stageManager } from './stageManager';
import { ProgressData, ProgressEntry, ParatranzEntry } from './types';

export interface SkippedRow {
    key: string;
    version: string;
    value: string;
}

export interface FileProcessorOptions {
    dataTable: HTMLTableElement;
    tableContainer: HTMLElement;
    translateAllButton: HTMLElement;
    translatedFileDownloadSection: HTMLElement;
    filePrefixSelect: HTMLSelectElement;
    adjustKeyColumnWidth: () => void;
    updateTranslationButtonsState: () => void;
    tableFilter: TableFilter;
    translationManager: TranslationManager;
}

export class FileProcessor {
    private currentFileName: string = '';
    private skippedRows: SkippedRow[] = [];
    private readonly COLOR_CODE_PATTERN = '§\\w+§!';

    private dataTable: HTMLTableElement | null = null;
    private tableContainer: HTMLElement | null = null;
    private translateAllButton: HTMLElement | null = null;
    private translatedFileDownloadSection: HTMLElement | null = null;
    private filePrefixSelect: HTMLSelectElement | null = null;
    private adjustKeyColumnWidthFn: (() => void) | null = null;
    private updateTranslationButtonsStateFn: (() => void) | null = null;
    private tableFilter: TableFilter | null = null;
    private translationManager: TranslationManager | null = null;

    public initialize({
        dataTable,
        tableContainer,
        translateAllButton,
        translatedFileDownloadSection,
        filePrefixSelect,
        adjustKeyColumnWidth,
        updateTranslationButtonsState,
        tableFilter,
        translationManager
    }: FileProcessorOptions): void {
        this.dataTable = dataTable;
        this.tableContainer = tableContainer;
        this.translateAllButton = translateAllButton;
        this.translatedFileDownloadSection = translatedFileDownloadSection;
        this.filePrefixSelect = filePrefixSelect;
        this.adjustKeyColumnWidthFn = adjustKeyColumnWidth;
        this.updateTranslationButtonsStateFn = updateTranslationButtonsState;
        this.tableFilter = tableFilter;
        this.translationManager = translationManager;
    }

    private adjustKeyColumnWidth(): void {
        if (this.adjustKeyColumnWidthFn) this.adjustKeyColumnWidthFn();
    }

    private updateTranslationButtonsState(): void {
        if (this.updateTranslationButtonsStateFn) this.updateTranslationButtonsStateFn();
    }

    public getCurrentFileName(): string {
        return this.currentFileName;
    }

    public async processFileContent(content: string): Promise<void> {
        this.skippedRows = [];
        hideErrorMessage();

        const lines = content.split('\n')
            .filter(line => {
                const trimmedLine = line.trim();
                return trimmedLine !== '' &&
                    !trimmedLine.startsWith('#') &&
                    !/^(?:\uFEFF)?l_[a-z_]+:/i.test(trimmedLine);
            });

        if (lines.length === 0) {
            showErrorMessage('ファイルに有効な内容がありません（コメント行、言語設定行(l_***:)、または空行のみかもしれません）。');
            return;
        }

        let html = '';
        let hasValidEntries = false;

        lines.forEach(line => {
            const match = line.match(/^\s*([^:]+):\s*(\d*)\s*"(.*)"(?:\s*#.*)?\s*$/);

            if (match && match.length === 4) {
                const key = match[1].trim();
                const version = match[2];
                const value = match[3];

                if (isJapaneseText(value)) {
                    console.log(`Skipping Japanese text: "${value}"`);
                    this.skippedRows.push({ key, version, value });
                    if (this.translationManager) {
                        this.translationManager.addLogEntry({
                            originalText: value,
                            status: 'Skipped',
                            errorMessage: 'Japanese text detected',
                            selectedTone: 'N/A',
                            translatedText: '(Skipped)',
                            llmModelId: 'N/A'
                        });
                    }
                    return;
                }

                if (/^\s*\d+(\.\d+)?\s*$/.test(value)) {
                    console.log(`Skipping numeric text: "${value}"`);
                    this.skippedRows.push({ key, version, value });
                    if (this.translationManager) {
                        this.translationManager.addLogEntry({
                            originalText: value,
                            status: 'Skipped',
                            errorMessage: 'Numeric text only',
                            selectedTone: 'N/A',
                            translatedText: '(Skipped)',
                            llmModelId: 'N/A'
                        });
                    }
                    return;
                }

                const enabledModifiers = settingsManager.modifierCharacters.filter(m => m.enabled && m.regex);

                try {
                    let baseValue = value;

                    if (enabledModifiers.length > 0) {
                        const combinedPattern = enabledModifiers
                            .map(m => `(?:${m.regex})`)
                            .join('|');
                        const modifierRegex = new RegExp(combinedPattern, 'g');
                        baseValue = baseValue.replace(modifierRegex, '');
                    }

                    const colorCodeRegex = new RegExp(`${this.COLOR_CODE_PATTERN}|§\\w|§!`, 'g');
                    baseValue = baseValue.replace(colorCodeRegex, '');

                    baseValue = baseValue.replace(/\d+/g, '');
                    baseValue = baseValue.replace(/\\[n"]/g, '');
                    baseValue = baseValue.replace(/[+\-.%,:;!?*=/|<>(){}\[\]\\"]/g, '');

                    if (baseValue.trim() === '') {
                        console.log(`Skipping non-translatable text (modifiers/digits/symbols/formatting only): "${value}"`);
                        this.skippedRows.push({ key, version, value });
                        if (this.translationManager) {
                            this.translationManager.addLogEntry({
                                originalText: value,
                                status: 'Skipped',
                                errorMessage: 'Formatting/Symbols/Digits only',
                                selectedTone: 'N/A',
                                translatedText: '(Skipped)',
                                llmModelId: 'N/A'
                            });
                        }
                        return;
                    }
                } catch (e) {
                    console.error("スキップ判定中にエラーが発生しました:", e);
                }

                try {
                    const fullColorCodeRegex = new RegExp(`^${this.COLOR_CODE_PATTERN}$`);
                    if (fullColorCodeRegex.test(value)) {
                        console.log(`Skipping color-code-only text: "${value}"`);
                        this.skippedRows.push({ key, version, value });
                        if (this.translationManager) {
                            this.translationManager.addLogEntry({
                                originalText: value,
                                status: 'Skipped',
                                errorMessage: 'Color code only',
                                selectedTone: 'N/A',
                                translatedText: '(Skipped)',
                                llmModelId: 'N/A'
                            });
                        }
                        return;
                    }
                } catch (e) {
                    console.error("カラーコード正規表現のテスト中にエラーが発生しました:", e);
                }

                const valueWithBr = escapeHTML(value).replace(/\\n/g, '<br>');
                const structure = StructureParser.parse(value, settingsManager.modifierCharacters);
                const groupKey = structure.groupKey;

                console.log(`[HashEngine] Key: ${key} | TextHash: ${structure.textHash} | PatternHash: ${structure.patternHash} | GroupKey: ${groupKey}`);

                const stageControlHtml = stageManager.createStageControlHtml(0);

                html += `<tr data-key="${escapeHTML(key)}" data-version="${escapeHTML(version)}" data-stage="0" data-hash="${escapeHTML(groupKey)}">`;
                html += `<td class="delete-column-cell"><button class="delete-row-button btn-icon btn-sm danger"><i class="fas fa-trash-alt"></i></button></td>`;
                html += `<td class="string_key-column-header">${escapeHTML(key)}</td>`;
                html += `<td class="original-text-cell">${valueWithBr}</td>`;
                html += `<td class="translation-cell" contenteditable="true" placeholder="未翻訳" title="クリックして編集"></td>`;
                html += `<td class="review-column-cell">${stageControlHtml}</td>`;
                html += `<td class="tone-column-cell">
                            <select class="individual-tone-select">
                            </select>
                        </td>`;
                html += `<td class="action-column-cell">
                            <div class="flex items-center">
                                <button class="translate-button btn btn-primary btn-sm">
                                    <i class="fas fa-magic mr-1"></i>翻訳
                                </button>
                                <button class="get-suggestions-button btn btn-secondary btn-sm !px-2 border-l border-white/10" title="他の翻訳案を表示">
                                    <i class="fas fa-chevron-down"></i>
                                </button>
                            </div>
                        </td>`;
                html += `</tr>`;
                hasValidEntries = true;
            } else {
                console.warn(`解析失敗(正規表現ミスマッチ): "${line.trim()}"`);
                html += `<tr data-key="N/A" data-is-reviewed="false">`;
                html += `<td colspan="7" class="text-red-500">解析失敗: ${escapeHTML(line)}</td>`;
                html += `</tr>`;
                hasValidEntries = true;

                if (this.translationManager) {
                    this.translationManager.addLogEntry({
                        originalText: line,
                        status: 'ParseError',
                        errorMessage: 'Regex pattern mismatch (Key:Value structure not found)',
                        selectedTone: 'N/A',
                        translatedText: '(Failed)',
                        llmModelId: 'N/A'
                    });
                }
            }
        });

        if (this.dataTable) {
            const tbody = this.dataTable.querySelector('tbody');
            if (tbody) {
                tbody.innerHTML = html;
            } else {
                this.dataTable.innerHTML = `<tbody>${html}</tbody>`;
            }
        }

        if (hasValidEntries) {
            if (this.tableContainer) this.tableContainer.classList.remove('hidden');
            if (this.translateAllButton) this.translateAllButton.classList.remove('hidden');
            if (this.translatedFileDownloadSection) this.translatedFileDownloadSection.classList.remove('hidden');
            this.adjustKeyColumnWidth();
            
            const dataTableElem = document.getElementById('data-table') as HTMLTableElement | null;
            if (dataTableElem && typeof initTableResizer === 'function') {
                initTableResizer(dataTableElem);
            }
        } else {
            showErrorMessage('有効な翻訳可能な行が見つかりませんでした。');
        }

        if (this.translationManager) {
            this.translationManager.clearTranslationLog();
        }
        settingsManager.populateToneDropdowns();
        settingsManager.updateReviewColumnVisibility();
        this.updateTranslationButtonsState();
        if (this.tableFilter) this.tableFilter.updateAllTableRows();
    }

    public readFile(file: File): void {
        if (!file) {
            showErrorMessage('ファイルが選択されていません。');
            return;
        }

        this.currentFileName = file.name;

        const reader = new FileReader();

        reader.onload = async (e) => {
            if (e.target && typeof e.target.result === 'string') {
                try {
                    if (file.name.endsWith('.json')) {
                        const jsonData = JSON.parse(e.target.result);
                        if (Array.isArray(jsonData)) {
                            await this.importFromParatranzJson(jsonData);
                        } else {
                            await this.importProgressFromJson(jsonData);
                        }
                    } else {
                        await this.processFileContent(e.target.result);
                    }
                } catch (error) {
                    console.error('ファイルの処理中にエラーが発生しました:', error);
                    showErrorMessage('ファイルの処理中にエラーが発生しました。ファイル形式を確認してください。');
                }
            }
        };

        reader.onerror = () => {
            showErrorMessage('ファイルの読み込み中にエラーが発生しました。');
        };

        reader.readAsText(file);
    }

    public downloadTranslationLog(): void {
        const translationLog = this.translationManager ? this.translationManager.getTranslationLog() : [];
        if (translationLog.length === 0) {
            alertMessage("ダウンロードする翻訳ログがありません。", 'warning');
            return;
        }

        let csvContent = "number,date,original txt,tone,translated text,status,error_message,pre_modified_text,post_restored_text,llm_model_id\n";

        const escapeCsvField = (field: any): string => {
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
    }

    public downloadTranslatedYml(): void {
        if (!this.dataTable) return;
        const rows = this.dataTable.querySelectorAll('tbody tr') as NodeListOf<HTMLTableRowElement>;
        if (rows.length === 0) {
            alertMessage("ダウンロードするデータがありません。", 'warning');
            return;
        }

        let ymlContent = '\ufeffl_english:\n';
        if (this.filePrefixSelect && this.filePrefixSelect.value === 'l_japanese:') {
            ymlContent = '\ufeffl_japanese:\n';
        }

        let hasData = false;

        rows.forEach(row => {
            const keyCell = row.querySelector('td.string_key-column-header') as HTMLElement | null;
            const translationCell = row.querySelector('.translation-cell') as HTMLElement | null;
            const originalTextCell = row.querySelector('.original-text-cell') as HTMLElement | null;

            if (keyCell && translationCell && originalTextCell) {
                const key = (keyCell.textContent || '').trim();
                let translation = (translationCell.innerText || '').trim();
                const originalText = (originalTextCell.innerText || '').trim();

                if (translation === '未翻訳' || translation === '翻訳中...' || translation.startsWith('翻訳エラー')) {
                    translation = originalText;
                }

                translation = translation.replace(/\r?\n/g, '\\n');

                const version = row.dataset.version || '';
                ymlContent += ` ${key}:${version} "${translation}"\n`;
                hasData = true;
            }
        });

        this.skippedRows.forEach(skipped => {
            ymlContent += ` ${skipped.key}:${skipped.version || ''} "${skipped.value}"\n`;
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
        
        let outputFileName = this.currentFileName ? this.currentFileName : `translated_${dateString}.yml`;
        
        if (this.filePrefixSelect && this.filePrefixSelect.value === 'l_japanese:') {
            outputFileName = outputFileName.replace(/l_[a-z_]+/i, 'l_japanese');
        }
        
        a.download = outputFileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    public exportProgressAsJson(): void {
        if (!this.dataTable) return;
        const rows = this.dataTable.querySelectorAll('tbody tr') as NodeListOf<HTMLTableRowElement>;
        if (rows.length === 0) {
            alertMessage("保存するデータがありません。", 'warning');
            return;
        }

        const entries: ProgressEntry[] = [];
        rows.forEach(row => {
            const key = row.getAttribute('data-key') || '';
            const originalTextCell = row.querySelector('.original-text-cell') as HTMLElement;
            const translationCell = row.querySelector('.translation-cell') as HTMLElement;
            const toneSelect = row.querySelector('.individual-tone-select') as HTMLSelectElement;
            const stageAttr = row.getAttribute('data-stage');
            const stage = stageAttr ? parseInt(stageAttr, 10) : 0;

            if (key && originalTextCell && translationCell) {
                entries.push({
                    key,
                    original: originalTextCell.innerText.trim(),
                    translation: translationCell.innerText.trim(),
                    stage: stage,
                    version: row.dataset.version,
                    tone: toneSelect ? toneSelect.value : undefined
                });
            }
        });

        const progressData: ProgressData = {
            version: "1.0",
            fileName: this.currentFileName,
            timestamp: new Date().toISOString(),
            data: entries,
            skippedRows: this.skippedRows
        };

        const jsonString = JSON.stringify(progressData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const date = new Date();
        const dateString = `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}_${date.getHours().toString().padStart(2, '0')}${date.getMinutes().toString().padStart(2, '0')}`;
        a.download = `progress_${this.currentFileName.split('.')[0]}_${dateString}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        alertMessage("作業状況を保存しました。", 'success');
    }

    public exportAsParatranzJson(): void {
        if (!this.dataTable) return;
        const rows = this.dataTable.querySelectorAll('tbody tr') as NodeListOf<HTMLTableRowElement>;
        if (rows.length === 0) {
            alertMessage("保存するデータがありません。", 'warning');
            return;
        }

        const entries: ParatranzEntry[] = [];
        rows.forEach(row => {
            const key = row.getAttribute('data-key') || '';
            const originalTextCell = row.querySelector('.original-text-cell') as HTMLElement;
            const translationCell = row.querySelector('.translation-cell') as HTMLElement;
            const stageAttr = row.getAttribute('data-stage');
            const stage = stageAttr ? parseInt(stageAttr, 10) : 0;

            if (key && originalTextCell && translationCell) {
                // AUTOlingua 5 (レビュー済み) -> Paratranz 2 (校閲済み)
                // AUTOlingua 2 (疑問あり) -> Paratranz 3 (修正済み/競合)
                // その他はそのまま (0->0, 1->1)
                let paratranzStage = stage;
                if (stage === 5) paratranzStage = 2;
                else if (stage === 2) paratranzStage = 3;

                entries.push({
                    key,
                    original: originalTextCell.innerText.trim(),
                    translation: translationCell.innerText.trim(),
                    stage: paratranzStage
                });
            }
        });

        const jsonString = JSON.stringify(entries, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const date = new Date();
        const dateString = `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}`;
        a.download = `${this.currentFileName.split('.')[0]}_paratranz_${dateString}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        alertMessage("Paratranz形式で保存しました。", 'success');
    }

    public async importProgressFromJson(content: string | object): Promise<void> {
        try {
            const progressData: ProgressData = typeof content === 'string' ? JSON.parse(content) : content as ProgressData;
            if (!progressData.data || !Array.isArray(progressData.data)) {
                throw new Error("無効なファイル形式です。");
            }

            this.currentFileName = progressData.fileName || 'imported_progress.yml';
            this.skippedRows = progressData.skippedRows || [];

            let html = '';
            progressData.data.forEach(entry => {
                const valueWithBr = escapeHTML(entry.original).replace(/\\n/g, '<br>');
                const structure = StructureParser.parse(entry.original, settingsManager.modifierCharacters);
                const groupKey = structure.groupKey;
                const stageControlHtml = stageManager.createStageControlHtml(entry.stage);

                html += `<tr data-key="${escapeHTML(entry.key)}" data-version="${escapeHTML(entry.version || '')}" data-stage="${entry.stage}" data-hash="${escapeHTML(groupKey)}">`;
                html += `<td class="delete-column-cell"><button class="delete-row-button btn-icon btn-sm danger"><i class="fas fa-trash-alt"></i></button></td>`;
                html += `<td class="string_key-column-header">${escapeHTML(entry.key)}</td>`;
                html += `<td class="original-text-cell">${valueWithBr}</td>`;
                
                let translationDisplay = entry.translation;
                if (translationDisplay === '未翻訳' || !translationDisplay) {
                    translationDisplay = '';
                }
                
                html += `<td class="translation-cell" contenteditable="true" placeholder="未翻訳" title="クリックして編集">${escapeHTML(translationDisplay).replace(/\\n/g, '<br>')}</td>`;
                html += `<td class="review-column-cell">${stageControlHtml}</td>`;
                html += `<td class="tone-column-cell">
                            <select class="individual-tone-select" data-saved-tone="${escapeHTML(entry.tone || 'default')}">
                            </select>
                        </td>`;
                html += `<td class="action-column-cell">
                            <div class="flex items-center">
                                <button class="translate-button btn btn-primary btn-sm">
                                    <i class="fas fa-magic mr-1"></i>翻訳
                                </button>
                                <button class="get-suggestions-button btn btn-secondary btn-sm !px-2 border-l border-white/10" title="他の翻訳案を表示">
                                    <i class="fas fa-chevron-down"></i>
                                </button>
                            </div>
                        </td>`;
                html += `</tr>`;
            });

            if (this.dataTable) {
                const tbody = this.dataTable.querySelector('tbody');
                if (tbody) tbody.innerHTML = html;
                
                // 口調セレクトの値を復元
                const toneSelects = this.dataTable.querySelectorAll('.individual-tone-select') as NodeListOf<HTMLSelectElement>;
                toneSelects.forEach(select => {
                    const savedTone = select.dataset.savedTone;
                    if (savedTone) select.value = savedTone;
                });
            }

            if (this.tableContainer) this.tableContainer.classList.remove('hidden');
            if (this.translateAllButton) this.translateAllButton.classList.remove('hidden');
            if (this.translatedFileDownloadSection) this.translatedFileDownloadSection.classList.remove('hidden');
            
            this.adjustKeyColumnWidth();
            if (this.dataTable) initTableResizer(this.dataTable);
            
            settingsManager.populateToneDropdowns();
            // 保存されていた口調を再度適用（populateToneDropdownsの後でないと選択肢がないため）
            const toneSelectsAfter = this.dataTable?.querySelectorAll('.individual-tone-select') as NodeListOf<HTMLSelectElement>;
            toneSelectsAfter?.forEach(select => {
                const savedTone = select.dataset.savedTone;
                if (savedTone) select.value = savedTone;
            });

            settingsManager.updateReviewColumnVisibility();
            this.updateTranslationButtonsState();
            if (this.tableFilter) this.tableFilter.updateAllTableRows();
            
            alertMessage("作業状況を復元しました。", 'success');
        } catch (error: any) {
            console.error("作業状況の復元に失敗しました:", error);
            showErrorMessage("作業状況の復元に失敗しました: " + error.message);
        }
    }

    public async importFromParatranzJson(entries: ParatranzEntry[]): Promise<void> {
        try {
            if (!Array.isArray(entries)) {
                throw new Error("無効なParatranz形式です。");
            }

            this.skippedRows = []; // Paratranzからは全行復元される想定

            let html = '';
            entries.forEach(entry => {
                const original = entry.original || '';
                const valueWithBr = escapeHTML(original).replace(/\\n/g, '<br>');
                const structure = StructureParser.parse(original, settingsManager.modifierCharacters);
                const groupKey = structure.groupKey;
                
                // Paratranz 2 (校閲済み) -> AUTOlingua 5 (レビュー済み)
                // Paratranz 3 -> AUTOlingua 2 (疑問あり)
                let autolinguaStage = entry.stage;
                if (entry.stage === 2) autolinguaStage = 5;
                else if (entry.stage === 3) autolinguaStage = 2;

                const stageControlHtml = stageManager.createStageControlHtml(autolinguaStage);

                html += `<tr data-key="${escapeHTML(entry.key)}" data-version="" data-stage="${autolinguaStage}" data-hash="${escapeHTML(groupKey)}">`;
                html += `<td class="delete-column-cell"><button class="delete-row-button btn-icon btn-sm danger"><i class="fas fa-trash-alt"></i></button></td>`;
                html += `<td class="string_key-column-header">${escapeHTML(entry.key)}</td>`;
                html += `<td class="original-text-cell">${valueWithBr}</td>`;
                
                let translationDisplay = entry.translation || '';
                if (translationDisplay === '未翻訳') {
                    translationDisplay = '';
                }
                
                html += `<td class="translation-cell" contenteditable="true" placeholder="未翻訳" title="クリックして編集">${escapeHTML(translationDisplay).replace(/\\n/g, '<br>')}</td>`;
                html += `<td class="review-column-cell">${stageControlHtml}</td>`;
                html += `<td class="tone-column-cell">
                            <select class="individual-tone-select">
                            </select>
                        </td>`;
                html += `<td class="action-column-cell">
                            <div class="flex items-center">
                                <button class="translate-button btn btn-primary btn-sm">
                                    <i class="fas fa-magic mr-1"></i>翻訳
                                </button>
                                <button class="get-suggestions-button btn btn-secondary btn-sm !px-2 border-l border-white/10" title="他の翻訳案を表示">
                                    <i class="fas fa-chevron-down"></i>
                                </button>
                            </div>
                        </td>`;
                html += `</tr>`;
            });

            if (this.dataTable) {
                const tbody = this.dataTable.querySelector('tbody');
                if (tbody) tbody.innerHTML = html;
            }

            if (this.tableContainer) this.tableContainer.classList.remove('hidden');
            if (this.translateAllButton) this.translateAllButton.classList.remove('hidden');
            if (this.translatedFileDownloadSection) this.translatedFileDownloadSection.classList.remove('hidden');
            
            this.adjustKeyColumnWidth();
            if (this.dataTable) initTableResizer(this.dataTable);
            
            settingsManager.populateToneDropdowns();
            settingsManager.updateReviewColumnVisibility();
            this.updateTranslationButtonsState();
            if (this.tableFilter) this.tableFilter.updateAllTableRows();
            
            alertMessage("Paratranz形式から復元しました。", 'success');
        } catch (error: any) {
            console.error("Paratranz形式の読み込みに失敗しました:", error);
            showErrorMessage("Paratranz形式の読み込みに失敗しました: " + error.message);
        }
    }
}

export const fileProcessor = new FileProcessor();
