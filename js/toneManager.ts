// js/toneManager.ts
import { escapeHTML } from './tableFilter';
import { CustomTone, CustomToneCondition } from './types';

/**
 * 初期化オプションのインターフェース
 */
export interface ToneManagerOptions {
    newToneNameInput: HTMLInputElement;
    conditionalToneCheckbox: HTMLInputElement;
    conditionalToneFields: HTMLElement;
    conditionalToneList: HTMLElement;
    addConditionButton: HTMLElement;
    elseToneInstructionTextarea: HTMLTextAreaElement;
    newToneInstructionTextarea: HTMLTextAreaElement;
    addCustomToneButton: HTMLElement;
    cancelEditButton: HTMLElement;
    customToneList: HTMLElement;
    globalToneSelect: HTMLSelectElement;
    defaultToneSelect: HTMLSelectElement;
    dataTable: HTMLTableElement;
    alertMessage: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
    saveSettingsCallback: () => void;
    updateToneFilterOptions: (tones: any[]) => void;
}

/**
 * 口調マネージャのインターフェース
 */


/**
 * カスタム口調を管理するモジュール
 */
export class ToneManager {
    private customTones: CustomTone[] = [];
    private editingToneIndex: number | null = null;
    public readonly CONDITIONAL_TONE_SUFFIX = '-条件付き口調';

    private newToneNameInput: HTMLInputElement | null = null;
    private conditionalToneCheckbox: HTMLInputElement | null = null;
    private conditionalToneFields: HTMLElement | null = null;
    private conditionalToneList: HTMLElement | null = null;
    private addConditionButton: HTMLElement | null = null;
    private elseToneInstructionTextarea: HTMLTextAreaElement | null = null;
    private newToneInstructionTextarea: HTMLTextAreaElement | null = null;
    private addCustomToneButton: HTMLElement | null = null;
    private cancelEditButton: HTMLElement | null = null;
    private customToneList: HTMLElement | null = null;
    private globalToneSelect: HTMLSelectElement | null = null;
    private defaultToneSelect: HTMLSelectElement | null = null;
    private dataTable: HTMLTableElement | null = null;
    private alertMessageFn: ((message: string, type: 'success' | 'error' | 'warning' | 'info') => void) | null = null;
    private saveSettingsCallbackFn: (() => void) | null = null;
    private updateToneFilterOptionsFn: ((tones: any[]) => void) | null = null;

    public initialize({
        newToneNameInput,
        conditionalToneCheckbox,
        conditionalToneFields,
        conditionalToneList,
        addConditionButton,
        elseToneInstructionTextarea,
        newToneInstructionTextarea,
        addCustomToneButton,
        cancelEditButton,
        customToneList,
        globalToneSelect,
        defaultToneSelect,
        dataTable,
        alertMessage,
        saveSettingsCallback,
        updateToneFilterOptions
    }: ToneManagerOptions): void {
        this.newToneNameInput = newToneNameInput;
        this.conditionalToneCheckbox = conditionalToneCheckbox;
        this.conditionalToneFields = conditionalToneFields;
        this.conditionalToneList = conditionalToneList;
        this.addConditionButton = addConditionButton;
        this.elseToneInstructionTextarea = elseToneInstructionTextarea;
        this.newToneInstructionTextarea = newToneInstructionTextarea;
        this.addCustomToneButton = addCustomToneButton;
        this.cancelEditButton = cancelEditButton;
        this.customToneList = customToneList;
        this.globalToneSelect = globalToneSelect;
        this.defaultToneSelect = defaultToneSelect;
        this.dataTable = dataTable;
        this.alertMessageFn = alertMessage;
        this.saveSettingsCallbackFn = saveSettingsCallback;
        this.updateToneFilterOptionsFn = updateToneFilterOptions;

        this.setupEventListeners();
    }

    private alertMessage(msg: string, type: 'success' | 'error' | 'warning' | 'info') {
        if (this.alertMessageFn) this.alertMessageFn(msg, type);
    }
    
    private saveSettingsCallback() {
        if (this.saveSettingsCallbackFn) this.saveSettingsCallbackFn();
    }

    private updateToneFilterOptions(tones: any[]) {
        if (this.updateToneFilterOptionsFn) this.updateToneFilterOptionsFn(tones);
    }
    /**
     * 口調ドロップダウンのオプションHTMLを生成する共通関数
     */
    private createToneOptionsHtml(tones: any[], includeDefaultOption = false): string {
        // tones: any[], includeDefaultOption = false): string => {
        let optionsHtml = '';
        if (includeDefaultOption) {
            optionsHtml += '<option value="default">全体設定に沿う</option>';
        }
        tones.forEach(tone => {
            const displayName = tone.isConditional ? `${tone.name} [条件付き]` : tone.name;
            optionsHtml += `<option value="${escapeHTML(tone.value)}">${escapeHTML(displayName)}</option>`;
        });
        return optionsHtml;
    };

    /**
     * 口調ドロップダウンを動的に生成する関数
     */
    public populateToneDropdowns(): void {
        const allTones = [
            ...this.customTones.map(tone => ({ 
                value: tone.value, 
                name: tone.name, 
                instruction: tone.instruction,
                isConditional: tone.isConditional 
            }))
        ];

        if (this.globalToneSelect) this.globalToneSelect.innerHTML = this.createToneOptionsHtml(allTones);
        const settings = localStorage.getItem('translationAppSettings');
        const savedDefaultTone = settings ? JSON.parse(settings).defaultTone : 'da_dearu';
        if (this.globalToneSelect) this.globalToneSelect.value = savedDefaultTone;

        if (this.defaultToneSelect) {
            if (this.defaultToneSelect) this.defaultToneSelect.innerHTML = this.createToneOptionsHtml(allTones);
            if (this.defaultToneSelect) this.defaultToneSelect.value = savedDefaultTone;
        }

        const individualSelects = this.dataTable?.querySelectorAll('.individual-tone-select') as NodeListOf<HTMLSelectElement>;
        individualSelects.forEach(selectElement => {
            const currentValue = selectElement.value;
            selectElement.innerHTML = this.createToneOptionsHtml(allTones, true);
            selectElement.value = currentValue || 'default';
        });

        if (this.updateToneFilterOptionsFn) {
            this.updateToneFilterOptions(allTones);
        }

        this.renderCustomToneList();
    };

    /**
     * カスタム口調リストをレンダリングする関数
     */
    public renderCustomToneList(): void {
        if (!this.customToneList) return;

        if (this.customToneList) this.customToneList.innerHTML = '';
        if (this.customTones.length === 0) {
            if (this.customToneList) this.customToneList.innerHTML = '<li class="text-gray-600 dark:text-gray-400 text-sm">カスタム口調がありません。</li>';
            return;
        }
        this.customTones.forEach((tone, index) => {
            const listItem = document.createElement('li');
            listItem.className = 'custom-tone-item flex items-center justify-between p-4 mb-3 rounded-2xl border border-white/20 shadow-sm bg-white/40 dark:bg-slate-800/40 backdrop-blur-md';
            listItem.innerHTML = `
                <div class="flex items-center gap-3">
                    <div class="icon-box">
                        <i class="fas fa-comment-dots"></i>
                    </div>
                    <div>
                        <span class="font-bold text-slate-800 dark:text-slate-100">${escapeHTML(tone.name)}</span>
                        ${tone.isConditional ? '<span class="badge badge-success ml-2">条件付き</span>' : ''}
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <button class="edit-tone-button btn btn-success btn-icon btn-sm" data-index="${index}" title="編集">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="delete-tone-button btn btn-danger btn-icon btn-sm" data-index="${index}" title="削除">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            `;
            this.customToneList?.appendChild(listItem);
        });
    };

    /**
     * 口調編集フォームのリセット関数
     */
    public resetToneForm(): void {
        if (this.newToneNameInput) this.newToneNameInput.value = '';
        if (this.newToneInstructionTextarea) this.newToneInstructionTextarea.value = '';
        if (this.conditionalToneCheckbox) this.conditionalToneCheckbox.checked = false;
        if (this.conditionalToneFields) this.conditionalToneFields.classList.add('hidden');
        if (this.conditionalToneList) this.conditionalToneList.innerHTML = '';
        if (this.elseToneInstructionTextarea) this.elseToneInstructionTextarea.value = '';
        if (this.newToneInstructionTextarea) this.newToneInstructionTextarea.classList.remove('hidden');
        if (this.addCustomToneButton) this.addCustomToneButton.textContent = '口調を追加';
        if (this.cancelEditButton) this.cancelEditButton.classList.add('hidden');
        this.editingToneIndex = null;
    };

    /**
     * 条件付き口調の条件フィールドを追加する関数
     */
    private addConditionalToneField(condition = '', instruction = ''): void {
        const conditionDiv = document.createElement('div');
        conditionDiv.className = 'conditional-tone-item settings-row p-5 relative mb-4';
        conditionDiv.innerHTML = `
            <div class="mb-4">
                <label class="sub-label">
                    <i class="fas fa-code mr-2 text-indigo-500"></i>
                    条件 (正規表現)
                </label>
                <input type="text" class="condition-regex-input input-field font-mono" placeholder="例: title" value="${escapeHTML(condition)}">
            </div>
            <div>
                <label class="sub-label">
                    <i class="fas fa-terminal mr-2 text-indigo-500"></i>
                    指定する口調
                </label>
                <textarea rows="2" class="instruction-textarea input-field p-3 resize-y" placeholder="例: 語尾は「です、ます」調にしてください。">${escapeHTML(instruction)}</textarea>
            </div>
            <button class="delete-condition-button absolute top-3 right-3 btn-icon danger shadow-lg" title="この条件を削除">
                <i class="fas fa-times pointer-events-none"></i>
            </button>
        `;
        this.conditionalToneList?.appendChild(conditionDiv);
    };

    private setupEventListeners(): void {

    if (this.conditionalToneCheckbox) {
        this.conditionalToneCheckbox?.addEventListener('change', () => {
            if ((this.conditionalToneCheckbox ? this.conditionalToneCheckbox.checked : false)) {
                if (this.conditionalToneFields) this.conditionalToneFields.classList.remove('hidden');
                if (this.newToneInstructionTextarea) this.newToneInstructionTextarea.classList.add('hidden');
                if (this.conditionalToneList?.children.length === 0) {
                    this.addConditionalToneField();
                }
            } else {
                if (this.conditionalToneFields) this.conditionalToneFields.classList.add('hidden');
                if (this.newToneInstructionTextarea) this.newToneInstructionTextarea.classList.remove('hidden');
            }
        });
    }

    if (this.addConditionButton) {
        this.addConditionButton?.addEventListener('click', () => {
            this.addConditionalToneField();
        });
    }

    if (this.conditionalToneList) {
        this.conditionalToneList?.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            if (target.classList.contains('delete-condition-button')) {
                const itemToRemove = target.closest('.conditional-tone-item');
                if (itemToRemove) {
                    itemToRemove.remove();
                }
            }
        });
    }

    if (this.addCustomToneButton) {
        this.addCustomToneButton?.addEventListener('click', () => {
            let name = this.newToneNameInput?.value.trim() || "";
            const isConditional = (this.conditionalToneCheckbox ? this.conditionalToneCheckbox.checked : false);
            let instruction = '';
            let conditions: CustomToneCondition[] = [];
            let elseInstruction = '';

            if (isConditional) {
                const conditionItems = this.conditionalToneList?.querySelectorAll('.conditional-tone-item') || [];
                if (conditionItems.length === 0) {
                    this.alertMessage('条件付き口調には少なくとも1つの条件が必要です。', 'warning');
                    return;
                }
                let hasInvalidRegex = false;
                conditionItems.forEach(item => {
                    const conditionInput = item.querySelector('.condition-regex-input') as HTMLInputElement | null;
                    const instructionTextarea = item.querySelector('.instruction-textarea') as HTMLTextAreaElement | null;
                    if (conditionInput && instructionTextarea && conditionInput.value.trim() && instructionTextarea.value.trim()) {
                        try {
                            new RegExp(conditionInput.value.trim());
                            conditions.push({
                                condition: conditionInput.value.trim(),
                                instruction: instructionTextarea.value.trim()
                            });
                        } catch (e: any) {
                            this.alertMessage(`無効な正規表現です: ${conditionInput.value.trim()} - ${e.message}`, 'error');
                            hasInvalidRegex = true;
                        }
                    }
                });
                if (hasInvalidRegex) return;

                if (conditions.length === 0) {
                    this.alertMessage('有効な条件と口調のペアを入力してください。', 'warning');
                    return;
                }
                elseInstruction = this.elseToneInstructionTextarea?.value.trim() || "";
            } else {
                instruction = this.newToneInstructionTextarea?.value.trim() || "";
                if (!instruction) {
                    this.alertMessage('AIへの指示文を入力してください。', 'warning');
                    return;
                }
            }

            if (!name) {
                this.alertMessage('口調名を入力してください。', 'warning');
                return;
            }

            const value = name.replace(/\s+/g, '_').toLowerCase();

            if (this.editingToneIndex == null) {
                const isDuplicate = this.customTones.some((tone, idx) =>
                    idx == this.editingToneIndex && tone.value === value
                );
                if (isDuplicate) {
                    this.alertMessage('その口調名は既に存在します。別の名前を使用してください。', 'warning');
                    return;
                }
                this.customTones[this.editingToneIndex!] = { value, name, instruction, isConditional, conditions, elseInstruction };
                this.alertMessage('口調を更新しました。', 'success');
            } else {
                const isDuplicate = this.customTones.some(t => t.value === value);
                if (isDuplicate) {
                    this.alertMessage('その口調名は既に存在します。別の名前を使用してください。', 'warning');
                    return;
                }
                this.customTones.push({ value, name, instruction, isConditional, conditions, elseInstruction });
                this.alertMessage('新しい口調を追加しました。', 'success');
            }

            this.saveSettingsCallback();
            this.populateToneDropdowns();
            this.resetToneForm();
        });
    }

    if (this.cancelEditButton) {
        this.cancelEditButton?.addEventListener('click', () => this.resetToneForm());
    }

    if (this.customToneList) {
        this.customToneList?.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            if (target.classList.contains('delete-tone-button') || target.parentElement?.classList.contains('delete-tone-button')) {
                const btn = target.classList.contains('delete-tone-button') ? target : target.parentElement!;
                const indexToDelete = parseInt(btn.dataset.index || '');
                if (!isNaN(indexToDelete) && indexToDelete >= 0 && indexToDelete < this.customTones.length) {
                    const toneName = this.customTones[indexToDelete].name;
                    if (confirm(`「${toneName}」を削除してもよろしいですか？`)) {
                        this.customTones.splice(indexToDelete, 1);
                        this.saveSettingsCallback();
                        this.populateToneDropdowns();
                        this.alertMessage(`${toneName} を削除しました。`, 'success');
                        this.resetToneForm();
                    }
                }
            } else if (target.classList.contains('edit-tone-button') || target.parentElement?.classList.contains('edit-tone-button')) {
                const btn = target.classList.contains('edit-tone-button') ? target : target.parentElement!;
                const indexToEdit = parseInt(btn.dataset.index || '');
                if (!isNaN(indexToEdit) && indexToEdit >= 0 && indexToEdit < this.customTones.length) {
                    this.editingToneIndex = indexToEdit;
                    const toneToEdit = this.customTones[indexToEdit];
                    if (this.newToneNameInput) this.newToneNameInput.value = toneToEdit.name;

                    if (this.conditionalToneCheckbox) this.conditionalToneCheckbox.checked = toneToEdit.isConditional ? true : false;

                    if (toneToEdit.isConditional) {
                        if (this.conditionalToneFields) this.conditionalToneFields.classList.remove('hidden');
                        if (this.newToneInstructionTextarea) this.newToneInstructionTextarea.classList.add('hidden');
                        if (this.conditionalToneList) this.conditionalToneList.innerHTML = '';
                        toneToEdit.conditions.forEach(cond => {
                            this.addConditionalToneField(cond.condition, cond.instruction);
                        });
                        if (this.elseToneInstructionTextarea) this.elseToneInstructionTextarea.value = toneToEdit.elseInstruction || '';
                    } else {
                        if (this.conditionalToneFields) this.conditionalToneFields.classList.add('hidden');
                        if (this.newToneInstructionTextarea) this.newToneInstructionTextarea.classList.remove('hidden');
                        if (this.newToneInstructionTextarea) this.newToneInstructionTextarea.value = toneToEdit.instruction || '';
                    }

                    if (this.addCustomToneButton) this.addCustomToneButton.textContent = '変更を保存';
                    if (this.cancelEditButton) this.cancelEditButton.classList.remove('hidden');
                    this.alertMessage(`「${toneToEdit.name}」を編集モードにしました。`, 'info');
                }
            }
        });
    }
    }

    public getCustomTones(): CustomTone[] { return this.customTones; }
    public setCustomTones(tones: CustomTone[]): void {
        this.customTones = tones;
        this.populateToneDropdowns();
    }
}
export const toneManager = new ToneManager();

