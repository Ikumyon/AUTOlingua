import { escapeHTML } from './uiUtils';
import { ModifierCharacter } from './types';

export interface ModifierManagerOptions {
    modifierTableBody: HTMLElement;
    modifierNameInput: HTMLInputElement;
    modifierRegexInput: HTMLInputElement;
    modifierTypeSelect: HTMLSelectElement;
    modifierCategoryInput: HTMLInputElement;
    addModifierButton: HTMLElement;
    cancelModifierEditButton: HTMLElement;
    modifierSearchInput: HTMLInputElement;
    alertMessage: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
    saveSettingsCallback: () => void;
}

export class ModifierManager {
    private modifiers: ModifierCharacter[] = [];
    private editingIndex: number | null = null;

    private modifierTableBody: HTMLElement | null = null;
    private modifierNameInput: HTMLInputElement | null = null;
    private modifierRegexInput: HTMLInputElement | null = null;
    private modifierTypeSelect: HTMLSelectElement | null = null;
    private modifierCategoryInput: HTMLInputElement | null = null;
    private addModifierButton: HTMLElement | null = null;
    private cancelModifierEditButton: HTMLElement | null = null;
    private modifierSearchInput: HTMLInputElement | null = null;
    private alertMessageFn: ((message: string, type: 'success' | 'error' | 'warning' | 'info') => void) | null = null;
    private saveSettingsCallbackFn: (() => void) | null = null;

    public initialize({
        modifierTableBody,
        modifierNameInput,
        modifierRegexInput,
        modifierTypeSelect,
        modifierCategoryInput,
        addModifierButton,
        cancelModifierEditButton,
        modifierSearchInput,
        alertMessage,
        saveSettingsCallback
    }: ModifierManagerOptions): void {
        this.modifierTableBody = modifierTableBody;
        this.modifierNameInput = modifierNameInput;
        this.modifierRegexInput = modifierRegexInput;
        this.modifierTypeSelect = modifierTypeSelect;
        this.modifierCategoryInput = modifierCategoryInput;
        this.addModifierButton = addModifierButton;
        this.cancelModifierEditButton = cancelModifierEditButton;
        this.modifierSearchInput = modifierSearchInput;
        this.alertMessageFn = alertMessage;
        this.saveSettingsCallbackFn = saveSettingsCallback;

        this.setupEventListeners();
    }

    private alertMessage(message: string, type: 'success' | 'error' | 'warning' | 'info'): void {
        if (this.alertMessageFn) this.alertMessageFn(message, type);
    }

    private saveSettingsCallback(): void {
        if (this.saveSettingsCallbackFn) this.saveSettingsCallbackFn();
    }

    private renderModifierTable(): void {
        if (!this.modifierTableBody) return;

        this.modifierTableBody.innerHTML = '';
        
        const searchQuery = this.modifierSearchInput?.value.toLowerCase().trim() || '';
        const filteredModifiers = this.modifiers.filter(m => {
            if (!searchQuery) return true;
            return (
                m.name.toLowerCase().includes(searchQuery) ||
                m.regex.toLowerCase().includes(searchQuery) ||
                (m.category && m.category.toLowerCase().includes(searchQuery))
            );
        });

        if (filteredModifiers.length === 0) {
            const message = searchQuery ? '一致する修飾文字が見つかりません。' : '登録されている修飾文字はありません。';
            this.modifierTableBody.innerHTML = `<tr><td colspan="6" class="py-10 text-slate-400 dark:text-slate-500 text-sm text-center italic">${message}</td></tr>`;
            return;
        }

        filteredModifiers.forEach((modifier) => {
            const index = this.modifiers.indexOf(modifier);
            if (!modifier.id) modifier.id = (Date.now() + Math.random()).toString();

            const row = document.createElement('tr');
            row.className = 'hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors';

            const typeLabel = modifier.type === 'variable' ? '変数' : '装飾';
            const typeClass = modifier.type === 'variable' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700';

            row.innerHTML = `
                <td class="py-2 px-4 border-b border-gray-200 dark:border-gray-700 text-center">
                    <input type="checkbox" class="toggle-modifier-checkbox h-4 w-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500" data-index="${index}" ${modifier.enabled !== false ? 'checked' : ''}>
                </td>
                <td class="py-2 px-4 border-b border-gray-200 dark:border-gray-700 text-sm text-slate-800 dark:text-slate-100 font-medium">
                    ${escapeHTML(modifier.name)}
                </td>
                <td class="py-2 px-4 border-b border-gray-200 dark:border-gray-700 text-sm">
                    <span class="px-2 py-0.5 rounded text-xs font-bold ${typeClass}">${typeLabel}</span>
                </td>
                <td class="py-2 px-4 border-b border-gray-200 dark:border-gray-700 text-sm text-slate-500 dark:text-slate-400 font-mono text-xs italic">${escapeHTML(modifier.category)}</td>
                <td class="py-2 px-4 border-b border-gray-200 dark:border-gray-700 text-sm text-slate-500 dark:text-slate-400 font-mono text-xs">${escapeHTML(modifier.regex)}</td>
                <td class="py-2 px-4 border-b border-gray-200 dark:border-gray-700 text-center action-column-cell">
                    <div class="flex justify-center items-center gap-2">
                        <button class="edit-modifier-button btn btn-success btn-icon btn-sm" data-index="${index}" title="編集">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="delete-modifier-button btn btn-danger btn-icon btn-sm" data-index="${index}" title="削除">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </td>
            `;
            this.modifierTableBody!.appendChild(row);
        });

        this.modifierTableBody.querySelectorAll('.toggle-modifier-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const target = e.target as HTMLInputElement;
                this.toggleModifier(parseInt(target.dataset.index || ''), target.checked);
            });
        });
        this.modifierTableBody.querySelectorAll('.edit-modifier-button').forEach(button => {
            button.addEventListener('click', (e) => {
                const target = e.currentTarget as HTMLElement;
                this.editModifier(parseInt(target.dataset.index || ''));
            });
        });
        this.modifierTableBody.querySelectorAll('.delete-modifier-button').forEach(button => {
            button.addEventListener('click', (e) => {
                const target = e.currentTarget as HTMLElement;
                this.deleteModifier(parseInt(target.dataset.index || ''));
            });
        });
    }

    private addOrUpdateModifier(): void {
        const name = this.modifierNameInput?.value.trim() || '';
        const regex = this.modifierRegexInput?.value.trim() || '';
        const type = (this.modifierTypeSelect?.value || 'variable') as 'variable' | 'decoration';
        const category = this.modifierCategoryInput?.value.trim() || 'default';

        if (!name || !regex) {
            this.alertMessage('名前と正規表現の両方を入力してください。', 'warning');
            return;
        }

        try {
            new RegExp(regex);
        } catch (e: any) {
            this.alertMessage('無効な正規表現です: ' + e.message, 'error');
            return;
        }

        if (this.editingIndex !== null) {
            this.modifiers[this.editingIndex].name = name;
            this.modifiers[this.editingIndex].regex = regex;
            this.modifiers[this.editingIndex].type = type;
            this.modifiers[this.editingIndex].category = category;
            this.editingIndex = null;
            if (this.addModifierButton) this.addModifierButton.textContent = '追加';
            if (this.cancelModifierEditButton) this.cancelModifierEditButton.classList.add('hidden');
            this.alertMessage('修飾文字を更新しました。', 'success');
        } else {
            this.modifiers.push({
                id: (Date.now() + Math.random()).toString(),
                name: name,
                regex: regex,
                enabled: true,
                type: type,
                category: category
            });
            this.alertMessage('修飾文字を追加しました。', 'success');
        }

        this.clearForm();
        this.renderModifierTable();
        this.saveSettingsCallback();
    }

    private clearForm(): void {
        if (this.modifierNameInput) this.modifierNameInput.value = '';
        if (this.modifierRegexInput) this.modifierRegexInput.value = '';
        if (this.modifierTypeSelect) this.modifierTypeSelect.value = 'variable';
        if (this.modifierCategoryInput) this.modifierCategoryInput.value = '';
    }

    private editModifier(index: number): void {
        const modifier = this.modifiers[index];
        if (this.modifierNameInput) this.modifierNameInput.value = modifier.name;
        if (this.modifierRegexInput) this.modifierRegexInput.value = modifier.regex;
        if (this.modifierTypeSelect) this.modifierTypeSelect.value = modifier.type;
        if (this.modifierCategoryInput) this.modifierCategoryInput.value = modifier.category;
        
        this.editingIndex = index;
        if (this.addModifierButton) this.addModifierButton.textContent = '更新';
        if (this.cancelModifierEditButton) this.cancelModifierEditButton.classList.remove('hidden');

        if (this.modifierNameInput) {
            this.modifierNameInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            this.modifierNameInput.focus();
        }
    }

    private cancelEdit(): void {
        this.editingIndex = null;
        this.clearForm();
        if (this.addModifierButton) this.addModifierButton.textContent = '追加';
        if (this.cancelModifierEditButton) this.cancelModifierEditButton.classList.add('hidden');
    }

    private deleteModifier(index: number): void {
        if (confirm('この修飾文字設定を削除してもよろしいですか？')) {
            this.modifiers.splice(index, 1);
            if (this.editingIndex === index) {
                this.cancelEdit();
            } else if (this.editingIndex !== null && this.editingIndex > index) {
                this.editingIndex--;
            }
            this.renderModifierTable();
            this.saveSettingsCallback();
        }
    }

    private toggleModifier(index: number, isEnabled: boolean): void {
        this.modifiers[index].enabled = isEnabled;
        this.saveSettingsCallback();
    }

    private setupEventListeners(): void {
        if (this.addModifierButton) {
            this.addModifierButton.addEventListener('click', () => this.addOrUpdateModifier());
        }
        if (this.cancelModifierEditButton) {
            this.cancelModifierEditButton.addEventListener('click', () => this.cancelEdit());
        }

        if (this.modifierSearchInput) {
            this.modifierSearchInput.addEventListener('input', () => this.renderModifierTable());
        }
    }

    public getModifiers(): ModifierCharacter[] {
        return this.modifiers;
    }

    public setModifiers(newModifiers: ModifierCharacter[]): void {
        this.modifiers = Array.isArray(newModifiers) ? newModifiers : [];
        this.modifiers = this.modifiers.map(m => {
            if (typeof m.enabled === 'undefined') m.enabled = true;
            if (!m.type) m.type = 'variable';
            if (!m.category) m.category = 'default';
            return m;
        });
        this.renderModifierTable();
    }

    public resetModifierForm(): void {
        this.cancelEdit();
    }
}

export const modifierManager = new ModifierManager();
