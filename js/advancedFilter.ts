// js/advancedFilter.ts

import { tokenize, parse } from './queryParser';
import { escapeHTML, tableFilter } from './tableFilter';

/**
 * 初期化オプションのインターフェース
 */
export interface AdvancedFilterOptions {
    modalElement: HTMLElement;
    openButton: HTMLElement;
    closeButton: HTMLElement;
    cancelButton: HTMLElement;
    applyButton: HTMLElement;
    canvasElement: HTMLElement;
    keywordInputElement: HTMLInputElement;
    getCustomTones: () => any[];
}

/**
 * 条件データのインターフェース
 */
export interface ConditionData {
    key?: string;
    operator?: string;
    value?: string;
    target?: string;
    isNot?: boolean;
    type?: string;
    left?: any;
    right?: any;
}

/**
 * 高度なフィルターUIとロジックを管理するクラス
 */
export class AdvancedFilter {
    private modalElement: HTMLElement | null = null;
    private openButton: HTMLElement | null = null;
    private closeButton: HTMLElement | null = null;
    private cancelButton: HTMLElement | null = null;
    private applyButton: HTMLElement | null = null;
    private canvasElement: HTMLElement | null = null;
    private keywordInputElement: HTMLInputElement | null = null;
    private getCustomTones: (() => any[]) | null = null;

    private draggedElement: HTMLElement | null = null; // ドラッグ中の要素を保持
    private placeholder: HTMLElement | null = null; // プレースホルダー要素を保持

    public initialize({
        modalElement,
        openButton,
        closeButton,
        cancelButton,
        applyButton,
        canvasElement,
        keywordInputElement,
        getCustomTones
    }: AdvancedFilterOptions): void {
        this.modalElement = modalElement;
        this.openButton = openButton;
        this.closeButton = closeButton;
        this.cancelButton = cancelButton;
        this.applyButton = applyButton;
        this.canvasElement = canvasElement;
        this.keywordInputElement = keywordInputElement;
        this.getCustomTones = getCustomTones;

        this.setupEventListeners();
        this.initializeCanvas();
    }

    private setupEventListeners(): void {
        this.openButton?.addEventListener('click', () => this.openModal());
        this.closeButton?.addEventListener('click', () => this.closeModal());
        this.cancelButton?.addEventListener('click', () => this.closeModal());

        this.applyButton?.addEventListener('click', () => {
            const query = this.generateQueryFromUI();
            if (this.keywordInputElement) {
                this.keywordInputElement.value = query;
            }
            this.closeModal();
            tableFilter.applyFilters();
        });
    }

    private openModal(): void {
        this.modalElement?.classList.remove('hidden');
        // 現在の検索タグからUIを構築
        this.buildFilterUIFromQuery(this.keywordInputElement?.value || '');
    }

    private closeModal(): void {
        this.modalElement?.classList.add('hidden');
    }

    private initializeCanvas(): void {
        if (!this.canvasElement) return;
        this.canvasElement.innerHTML = '';
        // ルートとなるロジックブロックを作成
        const rootBlock = this.createLogicBlock();
        rootBlock.classList.add('is-root');
        // ルートブロックはドラッグ不可にする
        const dragHandle = rootBlock.querySelector('.drag-handle') as HTMLElement;
        if (dragHandle) dragHandle.style.display = 'none';
        rootBlock.setAttribute('draggable', 'false');
        this.canvasElement.appendChild(rootBlock);
    }

    private createLogicBlock(logic = 'AND'): HTMLElement {
        const logicBlock = document.createElement('div');
        logicBlock.className = 'filter-block logic-block animate-in fade-in slide-in-from-top-1';
        logicBlock.id = `block-${Date.now()}-${Math.random()}`;
        logicBlock.dataset.type = 'logic';
        logicBlock.setAttribute('draggable', 'true');

        logicBlock.innerHTML = `
            <div class="guideline"></div>
            <div class="guideline-connector"></div>
            <div class="filter-block-content">
                <div class="logic-block-header">
                    <div class="flex items-center gap-2">
                        <div class="drag-handle">
                            <i class="fas fa-grip-vertical"></i>
                        </div>
                        <select class="logic-operator">
                            <option value="AND" ${logic === 'AND' ? 'selected' : ''}>すべての条件を満たす (AND)</option>
                            <option value="OR" ${logic === 'OR' ? 'selected' : ''}>いずれかの条件を満たす (OR)</option>
                        </select>
                    </div>
                    <button class="remove-block-button btn-icon danger btn-sm" title="グループを削除">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="logic-block-body space-y-3"></div>
                <div class="logic-block-footer">
                    <button class="add-condition-button btn btn-primary !py-1.5 !px-3 !rounded-lg !text-xs">
                        <i class="fas fa-plus"></i>条件を追加
                    </button>
                    <button class="add-logic-block-button btn btn-secondary !py-1.5 !px-3 !rounded-lg !text-xs">
                        <i class="fas fa-layer-group"></i>グループを追加
                    </button>
                </div>
            </div>
        `;

        // イベントリスナーを設定
        (logicBlock.querySelector('.add-condition-button') as HTMLElement).addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            const content = target.closest('.filter-block-content');
            if (content) {
                const body = content.querySelector('.logic-block-body') as HTMLElement;
                this.addConditionBlock(body);
            }
        });
        (logicBlock.querySelector('.add-logic-block-button') as HTMLElement).addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            const content = target.closest('.filter-block-content');
            if (content) {
                const body = content.querySelector('.logic-block-body') as HTMLElement;
                const newLogicBlock = this.createLogicBlock();
                const newBody = newLogicBlock.querySelector('.logic-block-body') as HTMLElement;
                this.addConditionBlock(newBody);
                body.appendChild(newLogicBlock);
            }
        });
        (logicBlock.querySelector('.remove-block-button') as HTMLElement).addEventListener('click', () => {
            if (!logicBlock.classList.contains('is-root')) {
                logicBlock.remove();
                this.updateGuidelines();
            } else {
                this.initializeCanvas();
            }
        });

        this.addDragDropListeners(logicBlock);
        return logicBlock;
    }

    private addConditionBlock(parentBody: HTMLElement, conditionData: ConditionData = {}): void {
        const conditionBlock = document.createElement('div');
        conditionBlock.className = 'filter-block condition-block animate-in fade-in slide-in-from-top-1';
        conditionBlock.id = `block-${Date.now()}-${Math.random()}`;
        conditionBlock.dataset.type = 'condition';
        conditionBlock.setAttribute('draggable', 'true');

        const isNotActive = conditionData.isNot ? 'is-active' : '';
        const isNotChecked = conditionData.isNot ? 'checked' : '';

        conditionBlock.innerHTML = `
            <div class="guideline"></div>
            <div class="guideline-connector"></div>
            <div class="filter-block-content gap-3">
                <div class="drag-handle">
                    <i class="fas fa-grip-vertical"></i>
                </div>
                
                <label class="not-operator-container ${isNotActive}">
                    <input type="checkbox" class="not-operator-checkbox" ${isNotChecked}>
                    <span>NOT</span>
                </label>

                <div class="flex items-center gap-2 flex-grow flex-wrap">
                    <select class="filter-key-select">
                        <option value="key">キー</option>
                        <option value="original">原文</option>
                        <option value="translation">翻訳文</option>
                        <option value="status">ステータス</option>
                        <option value="reviewed">校閲状態</option>
                        <option value="tone">口調</option>
                        <option value="chars">文字数</option>
                    </select>
                    <div class="filter-operator-container"></div>
                    <div class="filter-value-container flex-grow"></div>
                </div>

                <button class="remove-block-button btn-icon danger btn-sm" title="条件を削除">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        parentBody.appendChild(conditionBlock);

        // NOT 演算子のトグル処理
        const notContainer = conditionBlock.querySelector('.not-operator-container') as HTMLElement;
        const notCheckbox = conditionBlock.querySelector('.not-operator-checkbox') as HTMLInputElement;
        notCheckbox.addEventListener('change', () => {
            notContainer.classList.toggle('is-active', notCheckbox.checked);
        });

        const keySelect = conditionBlock.querySelector('.filter-key-select') as HTMLSelectElement;
        if (conditionData.key) {
            keySelect.value = conditionData.key;
        }

        this.updateValueInput(keySelect, conditionData.operator, conditionData.value, conditionData.target);

        keySelect.addEventListener('change', (e) => this.updateValueInput(e.target as HTMLSelectElement));
        (conditionBlock.querySelector('.remove-block-button') as HTMLElement).addEventListener('click', () => {
            conditionBlock.remove();
            this.updateGuidelines();
        });
        this.addDragDropListeners(conditionBlock);
        this.updateGuidelines();
    }

    private updateValueInput(keySelect: HTMLSelectElement, initialOperator = '', initialValue = '', initialTarget = ''): void {
        const conditionBlock = keySelect.closest('.condition-block') as HTMLElement;
        const operatorContainer = conditionBlock.querySelector('.filter-operator-container') as HTMLElement;
        const valueContainer = conditionBlock.querySelector('.filter-value-container') as HTMLElement;
        const key = keySelect.value;
        operatorContainer.innerHTML = '';
        valueContainer.innerHTML = '';

        let operatorHtml = '';
        let valueHtml = '';

        if (key === 'status') {
            operatorHtml = `<select class="filter-operator-input"><option value="is">と一致する</option></select>`;
            valueHtml = `
                <select class="filter-value-input">
                    <option value="untranslated">未翻訳</option>
                    <option value="translated">翻訳済み</option>
                    <option value="error">翻訳エラー</option>
                    <option value="reviewed">校閲済み</option>
                    <option value="unreviewed">未校閲</option>
                </select>`;
        } else if (key === 'reviewed') {
            operatorHtml = `<select class="filter-operator-input"><option value="is">と一致する</option></select>`;
            valueHtml = `
                <select class="filter-value-input">
                    <option value="true">はい</option>
                    <option value="false">いいえ</option>
                </select>`;
        } else if (key === 'tone') {
            operatorHtml = `<select class="filter-operator-input"><option value="is">と一致する</option></select>`;
            const customTones = this.getCustomTones ? this.getCustomTones() : [];
            const toneOptions = customTones.map(t => `<option value="${escapeHTML(t.value)}">${escapeHTML(t.name)}</option>`).join('');
            valueHtml = `<select class="filter-value-input">${toneOptions}</select>`;
        } else if (key === 'chars') {
            operatorHtml = `
                <select class="filter-char-operator">
                    <option value=">" ${initialOperator === '>' ? 'selected' : ''}>&gt;</option>
                    <option value="<" ${initialOperator === '<' ? 'selected' : ''}>&lt;</option>
                    <option value=">=" ${initialOperator === '>=' ? 'selected' : ''}>&gt;=</option>
                    <option value="<=" ${initialOperator === '<=' ? 'selected' : ''}>&lt;=</option>
                </select>`;
            valueHtml = `
                <div class="flex items-center gap-2">
                    <select class="filter-char-target min-w-[100px]">
                        <option value="key" ${initialTarget === 'key' ? 'selected' : ''}>キー</option>
                        <option value="original" ${initialTarget === 'original' ? 'selected' : ''}>原文</option>
                        <option value="translation" ${initialTarget === 'translation' ? 'selected' : ''}>翻訳文</option>
                    </select>
                    <input type="number" class="filter-value-input w-24" placeholder="数値" value="${escapeHTML(initialValue)}">
                </div>`;
        } else {
            operatorHtml = `
                <select class="filter-operator-input">
                    <option value="contains" ${initialOperator === 'contains' || !initialOperator ? 'selected' : ''}>含む</option>
                    <option value="is" ${initialOperator === 'is' ? 'selected' : ''}>と一致する</option>
                    <option value="starts_with" ${initialOperator === 'starts_with' ? 'selected' : ''}>で始まる</option>
                    <option value="ends_with" ${initialOperator === 'ends_with' ? 'selected' : ''}>で終わる</option>
                    <option value="matches_regex" ${initialOperator === 'matches_regex' ? 'selected' : ''}>正規表現に一致する</option>
                </select>`;
            valueHtml = `<input type="text" class="filter-value-input" placeholder="キーワード" value="${escapeHTML(initialValue)}">`;
        }

        operatorContainer.innerHTML = operatorHtml;
        valueContainer.innerHTML = valueHtml;

        if (key === 'status' || key === 'reviewed' || key === 'tone') {
            const selectElement = valueContainer.querySelector('.filter-value-input') as HTMLSelectElement;
            if (selectElement && initialValue) selectElement.value = initialValue;
        }
        const operatorSelect = operatorContainer.querySelector('.filter-operator-input, .filter-char-operator') as HTMLSelectElement;
        if (operatorSelect && initialOperator) operatorSelect.value = initialOperator;
    }

    private reconstructUIFromAST(node: any, parentElement: HTMLElement): void {
        if (!node) return;

        if (node.type === 'NOT') {
            if (node.value.type === 'TAG' || node.value.type === 'DEFAULT') {
                this.addConditionBlock(parentElement, { ...node.value, isNot: true });
            } else {
                console.warn("UI reconstruction for complex NOT statements is not fully supported.");
                this.reconstructUIFromAST(node.value, parentElement);
            }
            return;
        }

        if (node.type === 'AND' || node.type === 'OR') {
            const logicBlock = this.createLogicBlock(node.type);
            const logicBody = logicBlock.querySelector('.logic-block-body') as HTMLElement;

            const flatten = (n: any, type: string): any[] => {
                if (n.type === type) {
                    return [...flatten(n.left, type), ...flatten(n.right, type)];
                }
                return [n];
            }

            const children = flatten(node, node.type);
            children.forEach(childNode => this.reconstructUIFromAST(childNode, logicBody));
            parentElement.appendChild(logicBlock);

        } else if (node.type === 'TAG' || node.type === 'DEFAULT') {
            this.addConditionBlock(parentElement, node);
        }
    }

    private generateQueryFromUI(): string {
        if (!this.canvasElement) return '';
        const rootBlock = this.canvasElement.querySelector('.is-root') as HTMLElement;
        if (!rootBlock) return '';

        const parseBlock = (element: HTMLElement): string => {
            const type = element.dataset.type;
            if (type === 'logic') {
                const operatorSelect = element.querySelector('.logic-operator') as HTMLSelectElement;
                const operator = operatorSelect.value === 'AND' ? ' ' : ' | ';
                const body = element.querySelector('.logic-block-body') as HTMLElement;
                const children = Array.from(body.children)
                    .filter(child => (child as HTMLElement).classList.contains('filter-block'))
                    .map(child => parseBlock(child as HTMLElement))
                    .filter(q => q);
                if (children.length === 0) return '';
                if (children.length === 1) return children[0];
                return `(${children.join(operator).trim()})`;

            } else if (type === 'condition') {
                const keySelect = element.querySelector('.filter-key-select') as HTMLSelectElement;
                const key = keySelect.value;
                const valueInput = element.querySelector('.filter-value-input') as (HTMLInputElement | HTMLSelectElement | null);
                let value = valueInput ? valueInput.value.trim() : '';

                const notCheckbox = element.querySelector('.not-operator-checkbox') as HTMLInputElement | null;
                const isNot = notCheckbox?.checked || false;

                if (!value && !['reviewed', 'status', 'tone'].includes(key)) return '';

                let tag = '';
                if (key === 'chars') {
                    const targetSelect = element.querySelector('.filter-char-target') as HTMLSelectElement;
                    const target = targetSelect.value;
                    const charOperatorSelect = element.querySelector('.filter-char-operator') as HTMLSelectElement;
                    const charOperator = charOperatorSelect.value;
                    tag = `${key}:${target}${charOperator}${value}`;
                } else {
                    const operatorSelect = element.querySelector('.filter-operator-input') as HTMLSelectElement | null;
                    let operator = operatorSelect ? operatorSelect.value : 'is';

                    if (/\s/.test(value) && !value.startsWith('"')) {
                        value = `"${value}"`;
                    }

                    if (['status', 'reviewed', 'tone'].includes(key) || operator === 'is') {
                        tag = `${key}:${value}`;
                    } else {
                        tag = `${key}:${operator}:${value}`;
                    }
                }
                return isNot ? `!${tag}` : tag;
            }
            return '';
        };

        let query = parseBlock(rootBlock);
        if (query.startsWith('(') && query.endsWith(')')) {
            query = query.substring(1, query.length - 1);
        }
        return query;
    }

    private buildFilterUIFromQuery(query: string): void {
        this.initializeCanvas();
        if (!this.canvasElement) return;
        const rootBody = this.canvasElement.querySelector('.logic-block-body') as HTMLElement;

        if (!query.trim()) {
            this.addConditionBlock(rootBody);
            return;
        }

        try {
            const tokens = tokenize(query);
            const ast = parse(tokens);
            if (ast) {
                this.reconstructUIFromAST(ast, rootBody);
            } else {
                this.addConditionBlock(rootBody);
            }
        } catch (e) {
            console.error("Error parsing query for UI reconstruction:", e);
            this.addConditionBlock(rootBody);
        }
        this.updateGuidelines();
    }

    private addDragDropListeners(element: HTMLElement): void {
        element.addEventListener('dragstart', (e) => this.handleDragStart(e, element), false);
        element.addEventListener('dragend', (e) => this.handleDragEnd(e), false);
        element.addEventListener('dragover', (e) => this.handleDragOver(e), false);
        element.addEventListener('dragenter', (e) => this.handleDragEnter(e), false);
        element.addEventListener('dragleave', (e) => this.handleDragLeave(e), false);
        element.addEventListener('drop', (e) => this.handleDrop(e), false);
    }

    private handleDragStart(e: DragEvent, element: HTMLElement): void {
        const target = e.target as HTMLElement;
        if (['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(target.tagName) || target.closest('button')) {
            e.preventDefault();
            return;
        }

        e.stopPropagation();

        this.draggedElement = element;

        if (e.dataTransfer) {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', element.id);
        }

        setTimeout(() => {
            this.draggedElement?.classList.add('is-dragging');
        }, 0);
    }

    private handleDragEnd(e: DragEvent): void {
        e.stopPropagation();
        this.draggedElement?.classList.remove('is-dragging');
        this.draggedElement = null;
        this.placeholder?.remove();
        this.placeholder = null;
        this.updateGuidelines();
    }

    private handleDragOver(e: DragEvent): boolean {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer) {
            e.dataTransfer.dropEffect = 'move';
        }

        this.updatePlaceholderPosition(e);
        return false;
    }

    private updatePlaceholderPosition(e: DragEvent): void {
        if (!this.draggedElement) return;

        const target = e.target as HTMLElement;
        const dropTarget = target.closest('.filter-block') as HTMLElement | null;
        const dropContainer = target.closest('.logic-block-body') as HTMLElement | null;

        if (this.placeholder) this.placeholder.remove();
        this.placeholder = document.createElement('div');
        this.placeholder.className = 'drop-placeholder';

        if (dropContainer) {
            const children = Array.from(dropContainer.children)
                .filter(c => c !== this.draggedElement && !c.classList.contains('drop-placeholder'));

            let targetElement: Element | null = null;
            let bestDist = Infinity;
            for (const child of children) {
                const rect = child.getBoundingClientRect();
                const centerY = rect.top + rect.height / 2;
                const dist = Math.abs(e.clientY - centerY);
                if (dist < bestDist) {
                    bestDist = dist;
                    targetElement = (e.clientY < centerY) ? child : child.nextElementSibling;
                }
            }
            dropContainer.insertBefore(this.placeholder, targetElement);
            return;
        }

        if (dropTarget && dropTarget !== this.draggedElement && !dropTarget.contains(this.draggedElement)) {
            const rect = dropTarget.getBoundingClientRect();
            const afterThreshold = rect.top + rect.height * 0.55;
            const isAfter = e.clientY > afterThreshold;

            if (isAfter) {
                dropTarget.parentNode?.insertBefore(this.placeholder, dropTarget.nextSibling);
            } else {
                dropTarget.parentNode?.insertBefore(this.placeholder, dropTarget);
            }
        }
    }

    private handleDragEnter(e: DragEvent): void {
        e.preventDefault();
        e.stopPropagation();
        this.updatePlaceholderPosition(e);
    }

    private handleDragLeave(e: DragEvent): void {
        e.preventDefault();
    }

    private handleDrop(e: DragEvent): void {
        e.preventDefault();
        e.stopPropagation();

        if (this.placeholder && this.placeholder.parentNode && this.draggedElement) {
            this.placeholder.parentNode.replaceChild(this.draggedElement, this.placeholder);
        }

        this.placeholder?.remove();
        this.placeholder = null;
        this.updateGuidelines();
    }

    private updateGuidelines(): void {
        this.canvasElement?.querySelectorAll('.logic-block-body').forEach(body => {
            const blocks = Array.from(body.children).filter(c => (c as HTMLElement).classList.contains('filter-block'));
            blocks.forEach((block, index) => {
                const guideline = (block as HTMLElement).querySelector(':scope > .guideline') as HTMLElement | null;
                if (guideline) {
                    guideline.style.height = (index === blocks.length - 1) ? '50%' : '100%';
                }
            });
        });
    }
}

export const advancedFilter = new AdvancedFilter();
