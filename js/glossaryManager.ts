// js/glossaryManager.ts

import { escapeHTML } from './tableFilter';
import { GlossaryTerm } from './types';

/**
 * 品詞の選択肢のインターフェース
 */
export interface GlossaryPosOption {
    value: string;
    name: string;
}

/**
 * 初期化オプションのインターフェース
 */
export interface GlossaryManagerOptions {
    glossaryTableBody: HTMLElement;
    glossaryPosInput: HTMLSelectElement;
    glossaryOriginalInput: HTMLInputElement;
    glossaryOriginalAltInput: HTMLTextAreaElement;
    glossaryTranslationInput: HTMLInputElement;
    glossaryNoteInput: HTMLTextAreaElement;
    addGlossaryTermButton: HTMLElement;
    cancelGlossaryEditButton: HTMLElement;
    glossaryFileDropZone: HTMLElement;
    glossaryFileInput: HTMLInputElement;
    glossarySearchInput: HTMLInputElement;
    alertMessage: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
    saveSettingsCallback: () => void;
}

/**
 * 用語集マネージャのインターフェース
 */


/**
 * 用語集を管理するモジュール
 */
export class GlossaryManager {
    private glossaryTerms: GlossaryTerm[] = [];
    private editingGlossaryIndex: number | null = null;
    private GLOSSARY_POS_OPTIONS: GlossaryPosOption[] = [
        { value: '', name: '選択してください' },
        { value: 'noun', name: '名詞' },
        { value: 'verb', name: '動詞' },
        { value: 'adjectiv', name: '形容詞' },
        { value: 'adverb', name: '副詞' },
        { value: 'other', name: 'その他' }
    ];

    private glossaryTableBody: HTMLElement | null = null;
    private glossaryPosInput: HTMLSelectElement | null = null;
    private glossaryOriginalInput: HTMLInputElement | null = null;
    private glossaryOriginalAltInput: HTMLTextAreaElement | null = null;
    private glossaryTranslationInput: HTMLInputElement | null = null;
    private glossaryNoteInput: HTMLTextAreaElement | null = null;
    private addGlossaryTermButton: HTMLElement | null = null;
    private cancelGlossaryEditButton: HTMLElement | null = null;
    private glossaryFileDropZone: HTMLElement | null = null;
    private glossaryFileInput: HTMLInputElement | null = null;
    private glossarySearchInput: HTMLInputElement | null = null;
    private alertMessageFn: ((message: string, type: 'success' | 'error' | 'warning' | 'info') => void) | null = null;
    private saveSettingsCallbackFn: (() => void) | null = null;

    public initialize({
        glossaryTableBody,
        glossaryPosInput,
        glossaryOriginalInput,
        glossaryOriginalAltInput,
        glossaryTranslationInput,
        glossaryNoteInput,
        addGlossaryTermButton,
        cancelGlossaryEditButton,
        glossaryFileDropZone,
        glossaryFileInput,
        glossarySearchInput,
        alertMessage,
        saveSettingsCallback
    }: GlossaryManagerOptions): void {
        this.glossaryTableBody = glossaryTableBody;
        this.glossaryPosInput = glossaryPosInput;
        this.glossaryOriginalInput = glossaryOriginalInput;
        this.glossaryOriginalAltInput = glossaryOriginalAltInput;
        this.glossaryTranslationInput = glossaryTranslationInput;
        this.glossaryNoteInput = glossaryNoteInput;
        this.addGlossaryTermButton = addGlossaryTermButton;
        this.cancelGlossaryEditButton = cancelGlossaryEditButton;
        this.glossaryFileDropZone = glossaryFileDropZone;
        this.glossaryFileInput = glossaryFileInput;
        this.glossarySearchInput = glossarySearchInput;
        this.alertMessageFn = alertMessage;
        this.saveSettingsCallbackFn = saveSettingsCallback;
        
        this.setupEventListeners();
    }

    private alertMessage(msg: string, type: 'success' | 'error' | 'warning' | 'info') {
        if (this.alertMessageFn) this.alertMessageFn(msg, type);
    }
    
    private saveSettingsCallback() {
        if (this.saveSettingsCallbackFn) this.saveSettingsCallbackFn();
    }
    /**
     * 用語集リストをレンダリングする関数
     */
    public renderGlossaryTerms(): void {
        if (!this.glossaryTableBody) return;

        if (this.glossaryTableBody) this.glossaryTableBody.innerHTML = ''; // テーブルボディをクリア
        
        const searchQuery = this.glossarySearchInput?.value.toLowerCase().trim() || '';
        const filteredTerms = this.glossaryTerms.filter(term => {
            if (!searchQuery) return true;
            return (
                term.original.toLowerCase().includes(searchQuery) ||
                term.translation.toLowerCase().includes(searchQuery) ||
                (term.originalAlt && term.originalAlt.some(alt => alt.toLowerCase().includes(searchQuery))) ||
                (term.note && term.note.toLowerCase().includes(searchQuery))
            );
        });

        if (filteredTerms.length === 0) {
            if (this.glossaryTableBody) {
                const message = searchQuery ? '一致する用語が見つかりません。' : '用語がありません。';
                this.glossaryTableBody.innerHTML = `<tr><td colspan="6" class="py-10 text-slate-400 dark:text-slate-500 text-sm text-center italic">${message}</td></tr>`;
            }
            return;
        }

        filteredTerms.forEach((term) => {
            const index = this.glossaryTerms.indexOf(term);
            const altCount = (term.originalAlt && term.originalAlt.length > 0) ? term.originalAlt.length : 1;

            for (let i = 0; i < altCount; i++) {
                const row = document.createElement('tr');
                let rowHtml = '';

                const displayPos = this.GLOSSARY_POS_OPTIONS.find(opt => opt.value === term.pos)?.name || term.pos || '';

                if (i === 0) {
                    rowHtml += `<td class="py-2 px-4 border-b border-gray-200 dark:border-gray-700 dark:text-gray-200" rowspan="${altCount}">${escapeHTML(displayPos)}</td>`;
                    rowHtml += `<td class="py-2 px-4 border-b border-gray-200 dark:border-gray-700 dark:text-gray-200" rowspan="${altCount}">${escapeHTML(term.original || '')}</td>`;
                    rowHtml += `<td class="py-2 px-4 border-b border-gray-200 dark:border-gray-700 dark:text-gray-200 glossary-original-alt-cell">${escapeHTML(term.originalAlt && term.originalAlt[i] ? term.originalAlt[i] : '')}</td>`;
                    rowHtml += `<td class="py-2 px-4 border-b border-gray-200 dark:border-gray-700 dark:text-gray-200" rowspan="${altCount}">${escapeHTML(term.translation || '')}</td>`;
                    rowHtml += `<td class="py-2 px-4 border-b border-gray-200 dark:border-gray-700 dark:text-gray-200" rowspan="${altCount}">${escapeHTML(term.note || '')}</td>`;
                    rowHtml += `<td class="py-2 px-4 border-b border-gray-200 dark:border-gray-700 action-column-cell" rowspan="${altCount}">
                                    <div class="flex items-center gap-2">
                                        <button class="edit-glossary-button btn btn-success btn-icon btn-sm" data-index="${index}" title="編集">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                        <button class="delete-glossary-button btn btn-danger btn-icon btn-sm" data-index="${index}" title="削除">
                                            <i class="fas fa-trash-alt"></i>
                                        </button>
                                    </div>
                                </td>`;
                } else {
                    rowHtml += `<td class="py-2 px-4 border-b border-gray-200 dark:border-gray-700 dark:text-gray-200 glossary-original-alt-cell">${escapeHTML(term.originalAlt && term.originalAlt[i] ? term.originalAlt[i] : '')}</td>`;
                }
                row.innerHTML = rowHtml;
                this.glossaryTableBody?.appendChild(row);
            }
        });
    };

    /**
     * 用語集フォームのリセット関数
     */
    public resetGlossaryForm(): void {
        if (this.glossaryPosInput) this.glossaryPosInput.innerHTML = this.GLOSSARY_POS_OPTIONS.map(opt =>
            `<option value="${escapeHTML(opt.value)}">${escapeHTML(opt.name)}</option>`
        ).join('');

        if (this.glossaryPosInput) this.glossaryPosInput.value = '';
        if (this.glossaryOriginalInput) this.glossaryOriginalInput.value = '';
        if (this.glossaryOriginalAltInput) this.glossaryOriginalAltInput.value = '';
        if (this.glossaryTranslationInput) this.glossaryTranslationInput.value = '';
        if (this.glossaryNoteInput) this.glossaryNoteInput.value = '';
        if (this.addGlossaryTermButton) this.addGlossaryTermButton.textContent = '用語を追加';
        if (this.cancelGlossaryEditButton) this.cancelGlossaryEditButton.classList.add('hidden');
        this.editingGlossaryIndex = null;
    };

    /**
     * 用語集JSONファイルを読み込む関数
     */
    public readGlossaryFile(file: File): void {
        if (!file) {
            this.alertMessage('ファイルが選択されていません。', 'warning');
            return;
        }

        const reader = new FileReader();

        reader.onload = (e) => {
            if (e.target && typeof e.target.result === 'string') {
                try {
                    const jsonContent = JSON.parse(e.target.result);
                    this.processGlossaryJsonContent(jsonContent);
                } catch (error) {
                    console.error('用語集ファイルの処理中にエラーが発生しました:', error);
                    this.alertMessage('用語集ファイルの処理中にエラーが発生しました。JSON形式を確認してください。', 'error');
                }
            }
        };

        reader.onerror = () => {
            this.alertMessage('用語集ファイルの読み込み中にエラーが発生しました。', 'error');
        };

        reader.readAsText(file);
    };

    /**
     * 用語集JSONの内容を解析して追加する関数
     */
    public processGlossaryJsonContent(jsonContent: any): void {
        if (!Array.isArray(jsonContent)) {
            this.alertMessage('JSONファイルは配列である必要があります。', 'error');
            return;
        }

        let newTermsAdded = 0;
        let termsSkipped = 0;

        jsonContent.forEach((item, itemIndex) => {
            const original = item.term ? String(item.term).trim() : '';
            const translation = item.translation ? String(item.translation).trim() : '';
            const pos = item.pos ? String(item.pos).trim() : '';
            const note = item.note ? String(item.note).trim() : '';
            const originalAlt = Array.isArray(item.variants) ? item.variants.map((v: any) => String(v).trim()).filter((v: string) => v !== '') : [];

            if (!original) {
                console.warn(`Skipping empty original term in JSON item ${itemIndex + 1}:`, item);
                termsSkipped++;
                return;
            }

            if (pos !== '' && !this.GLOSSARY_POS_OPTIONS.some(option => option.value === pos)) {
                console.warn(`Skipping term with invalid POS in JSON item ${itemIndex + 1}: "${pos}" is not a valid part of speech.`, item);
                termsSkipped++;
                return;
            }

            const isDuplicate = this.glossaryTerms.some((term, idx) =>
                idx !== this.editingGlossaryIndex && term.original.toLowerCase() === original.toLowerCase()
            );
            if (isDuplicate) {
                console.warn(`Skipping duplicate original term in JSON item ${itemIndex + 1}: "${original}"`);
                termsSkipped++;
                return;
            }

            this.glossaryTerms.push({ pos, original, originalAlt, translation, note });
            newTermsAdded++;
        });

        if (newTermsAdded > 0) {
            this.saveSettingsCallback();
            this.renderGlossaryTerms();
            this.alertMessage(`${newTermsAdded}件の用語を追加しました。${termsSkipped > 0 ? `(${termsSkipped}件の用語をスキップしました。)` : ''}`, 'success');
        } else if (termsSkipped > 0) {
            this.alertMessage(`用語集ファイルから有効な用語が見つかりませんでした。${termsSkipped}件の用語をスキップしました。`, 'warning');
        } else {
            this.alertMessage('用語集ファイルから追加できる用語が見つかりませんでした。', 'info');
        }
    };

    /**
     * 用語集をJSONファイルとしてダウンロードする関数
     */
    public downloadGlossary(): void {
        if (this.glossaryTerms.length === 0) {
            this.alertMessage("ダウンロードする用語集がありません。", 'warning');
            return;
        }

        const glossaryForDownload = this.glossaryTerms.map(term => ({
            term: term.original,
            translation: term.translation,
            pos: term.pos,
            variants: term.originalAlt,
            note: term.note
        }));

        const jsonContent = JSON.stringify(glossaryForDownload, null, 2);

        const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        const date = new Date();
        const dateString = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
        a.download = `glossary_${dateString}.json`;

        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        this.alertMessage("用語集をダウンロードしました。", 'success');
    };

        private setupEventListeners(): void {

    if (this.addGlossaryTermButton) {
        this.addGlossaryTermButton?.addEventListener('click', () => {
            const pos = this.glossaryPosInput?.value.trim() || "";
            const original = this.glossaryOriginalInput?.value.trim() || "";
            const originalAlt = (this.glossaryOriginalAltInput?.value.trim() || "").split('\n').map(item => item.trim()).filter(item => item !== "");
            const translation = this.glossaryTranslationInput?.value.trim() || "";
            const note = this.glossaryNoteInput?.value.trim() || "";

            if (!pos || !original || !translation) {
                this.alertMessage('品詞、原文、翻訳文は必須項目です。', 'warning');
                return;
            }

            if (!this.GLOSSARY_POS_OPTIONS.some(option => option.value === pos)) {
                this.alertMessage('選択された品詞は無効です。', 'warning');
                return;
            }

            const isDuplicate = this.glossaryTerms.some((term, idx) =>
                idx !== this.editingGlossaryIndex && term.original.toLowerCase() === original.toLowerCase()
            );
            if (isDuplicate) {
                this.alertMessage('その原文は既に用語集に存在します。', 'warning');
                return;
            }

            if (this.editingGlossaryIndex !== null) {
                this.glossaryTerms[this.editingGlossaryIndex] = { pos, original, originalAlt, translation, note };
                this.alertMessage('用語を更新しました。', 'success');
            } else {
                this.glossaryTerms.push({ pos, original, originalAlt, translation, note });
                this.alertMessage('新しい用語を追加しました。', 'success');
            }

            this.saveSettingsCallback();
            this.renderGlossaryTerms();
            this.resetGlossaryForm();
        });
    }

    if (this.cancelGlossaryEditButton) {
        this.cancelGlossaryEditButton?.addEventListener('click', () => this.resetGlossaryForm());
    }

    if (this.glossaryTableBody) {
        this.glossaryTableBody?.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            if (target.classList.contains('delete-glossary-button') || target.parentElement?.classList.contains('delete-glossary-button')) {
                const btn = target.classList.contains('delete-glossary-button') ? target : target.parentElement!;
                const indexToDelete = parseInt(btn.dataset.index || '');
                if (!isNaN(indexToDelete) && indexToDelete >= 0 && indexToDelete < this.glossaryTerms.length) {
                    const termOriginal = this.glossaryTerms[indexToDelete].original;
                    if (confirm(`用語「${termOriginal}」を削除してもよろしいですか？`)) {
                        this.glossaryTerms.splice(indexToDelete, 1);
                        this.saveSettingsCallback();
                        this.renderGlossaryTerms();
                        this.alertMessage(`用語「${termOriginal}」を削除しました。`, 'success');
                        this.resetGlossaryForm();
                    }
                }
            } else if (target.classList.contains('edit-glossary-button') || target.parentElement?.classList.contains('edit-glossary-button')) {
                const btn = target.classList.contains('edit-glossary-button') ? target : target.parentElement!;
                const indexToEdit = parseInt(btn.dataset.index || '');
                if (!isNaN(indexToEdit) && indexToEdit >= 0 && indexToEdit < this.glossaryTerms.length) {
                    this.editingGlossaryIndex = indexToEdit;
                    const termToEdit = this.glossaryTerms[indexToEdit];

                    if (this.glossaryPosInput) this.glossaryPosInput.innerHTML = this.GLOSSARY_POS_OPTIONS.map(opt =>
                        `<option value="${escapeHTML(opt.value)}">${escapeHTML(opt.name)}</option>`
                    ).join('');
                    if (this.glossaryPosInput) this.glossaryPosInput.value = termToEdit.pos;

                    if (this.glossaryOriginalInput) this.glossaryOriginalInput.value = termToEdit.original;
                    if (this.glossaryOriginalAltInput) this.glossaryOriginalAltInput.value = Array.isArray(termToEdit.originalAlt) ? termToEdit.originalAlt.join('\n') : '';
                    if (this.glossaryTranslationInput) this.glossaryTranslationInput.value = termToEdit.translation;
                    if (this.glossaryNoteInput) this.glossaryNoteInput.value = termToEdit.note || '';
                    if (this.addGlossaryTermButton) this.addGlossaryTermButton.textContent = '用語を上書き保存';
                    if (this.cancelGlossaryEditButton) this.cancelGlossaryEditButton.classList.remove('hidden');
                    this.alertMessage(`用語「${termToEdit.original}」を編集モードにしました。`, 'info');
                }
            }
        });
    }

    if (this.glossaryFileDropZone && this.glossaryFileInput) {
        this.glossaryFileDropZone?.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.glossaryFileDropZone?.classList.add('border-blue-500', 'bg-blue-50');
        });

        this.glossaryFileDropZone?.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.glossaryFileDropZone?.classList.remove('border-blue-500', 'bg-blue-50');
        });

        this.glossaryFileDropZone?.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.glossaryFileDropZone?.classList.remove('border-blue-500', 'bg-blue-50');

            const files = e.dataTransfer?.files;
            if (files && files.length > 0) {
                this.readGlossaryFile(files[0]);
            } else {
                this.alertMessage('ドロップされたファイルがありません。', 'warning');
            }
        });

        this.glossaryFileDropZone?.addEventListener('click', () => {
            this.glossaryFileInput?.click();
        });

        this.glossaryFileInput?.addEventListener('change', (e) => {
            const files = (e.target as HTMLInputElement).files;
            if (files && files.length > 0) {
                this.readGlossaryFile(files[0]);
            } else {
                this.alertMessage('ファイルが選択されていません。', 'warning');
            }
        });
    }

    if (this.glossarySearchInput) {
        this.glossarySearchInput.addEventListener('input', () => this.renderGlossaryTerms());
    }

    }

    public getGlossaryTerms(): GlossaryTerm[] { return this.glossaryTerms; }
    public setGlossaryTerms(terms: GlossaryTerm[]): void {
        this.glossaryTerms = terms;
        this.renderGlossaryTerms();
    }
}
export const glossaryManager = new GlossaryManager();

