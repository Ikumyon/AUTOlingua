// js/tableFilter.ts
import { tokenize, parse, ASTNode } from './queryParser';
import { CustomTone } from './types';

/**
 * ハイライト情報のインターフェース
 */
export interface HighlightMatch {
    cell: HTMLElement | null;
    value: string;
    type: string;
    operator?: string;
}

/**
 * HTMLをエスケープします。
 * @param str - エスケープする文字列。
 */
export const escapeHTML = (str: string): string => {
    if (typeof str !== 'string') return '';
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
};

export class TableFilter {
    private dataTable: HTMLTableElement | null = null;
    private statusFilterSelect: HTMLSelectElement | null = null;
    private toneFilterSelect: HTMLSelectElement | null = null;
    private keywordSearchInput: HTMLInputElement | null = null;
    private caseSensitiveToggle: HTMLElement | null = null;
    private regexToggle: HTMLElement | null = null;
    private resetFiltersButton: HTMLElement | null = null;

    private allTableRows: HTMLTableRowElement[] = [];

    public initialize(dataTable: HTMLTableElement): void {
        this.dataTable = dataTable;
        this.statusFilterSelect = document.getElementById('status-filter-select') as HTMLSelectElement;
        this.toneFilterSelect = document.getElementById('tone-filter-select') as HTMLSelectElement;
        this.keywordSearchInput = document.getElementById('keyword-search-input') as HTMLInputElement;
        this.caseSensitiveToggle = document.getElementById('case-sensitive-toggle') as HTMLElement;
        this.regexToggle = document.getElementById('regex-toggle') as HTMLElement;
        this.resetFiltersButton = document.getElementById('reset-filters-button') as HTMLElement;

        this.setupEventListeners();
        this.updateAllTableRows();
    }

    private setupEventListeners(): void {
        this.statusFilterSelect?.addEventListener('change', () => this.applyFilters());
        this.toneFilterSelect?.addEventListener('change', () => this.applyFilters());
        this.keywordSearchInput?.addEventListener('input', () => this.applyFilters());

        this.caseSensitiveToggle?.addEventListener('click', () => {
            this.caseSensitiveToggle?.classList.toggle('active');
            this.applyFilters();
        });

        this.regexToggle?.addEventListener('click', () => {
            this.regexToggle?.classList.toggle('active');
            this.applyFilters();
        });

        this.resetFiltersButton?.addEventListener('click', () => this.resetFilters());
    }

    private escapeRegExp(string: string): string {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    private removeHighlights(rowElement: HTMLElement): void {
        rowElement.querySelectorAll('.highlight').forEach(span => {
            span.outerHTML = span.textContent || '';
        });
    }

    private applyHighlights(
        highlightMatches: HighlightMatch[], 
        useRegex: boolean, 
        isCaseSensitive: boolean
    ): void {
        const cellGroups = new Map<HTMLElement, HighlightMatch[]>();
        highlightMatches.forEach(m => {
            if (!m.cell) return;
            if (!cellGroups.has(m.cell)) cellGroups.set(m.cell, []);
            cellGroups.get(m.cell)!.push(m);
        });

        cellGroups.forEach((matches, cell) => {
            cell.querySelectorAll('.highlight').forEach(span => {
                span.outerHTML = span.textContent || '';
            });

            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = cell.innerHTML;

            matches.forEach(matchInfo => {
                const searchText = matchInfo.value;
                const operator = matchInfo.operator;

                let regex: RegExp;
                if (useRegex || operator === 'matches_regex') {
                    try {
                        regex = new RegExp(searchText, isCaseSensitive ? 'g' : 'ig');
                    } catch (e) {
                        console.warn("ハイライト用の正規表現が無効です:", searchText, e);
                        return;
                    }
                } else {
                    let pattern = this.escapeRegExp(searchText);
                    if (operator === 'starts_with') pattern = `^${pattern}`;
                    else if (operator === 'ends_with') pattern = `${pattern}$`;
                    else if (operator === 'is') pattern = `^${pattern}$`;
                    regex = new RegExp(pattern, isCaseSensitive ? 'g' : 'ig');
                }

                const highlightNode = (node: Node) => {
                    if (node.nodeType === Node.TEXT_NODE) {
                        const originalText = node.nodeValue || '';
                        regex.lastIndex = 0;
                        if (originalText && regex.test(originalText)) {
                            regex.lastIndex = 0;
                            const newHtml = originalText.replace(regex, (match) => `<span class="highlight">${match}</span>`);
                            const tempSpan = document.createElement('span');
                            tempSpan.innerHTML = newHtml;
                            while (tempSpan.firstChild) {
                                node.parentNode!.insertBefore(tempSpan.firstChild, node);
                            }
                            (node as ChildNode).remove();
                        }
                    } else if (node.nodeType === Node.ELEMENT_NODE) {
                        if ((node as HTMLElement).classList.contains('highlight')) return;
                        Array.from(node.childNodes).forEach(highlightNode);
                    }
                };
                Array.from(tempDiv.childNodes).forEach(highlightNode);
            });
            cell.innerHTML = tempDiv.innerHTML;
        });
    }

    private testMatch(
        text: string, 
        value: string, 
        operator: string, 
        useRegex: boolean, 
        isCaseSensitive: boolean, 
        cell: HTMLElement | null, 
        highlightMatches: HighlightMatch[]
    ): boolean {
        const lowerText = text.toLowerCase();
        const lowerValue = value.toLowerCase();

        let isMatch = false;
        let regex: RegExp;

        if (useRegex || operator === 'matches_regex') {
            try {
                regex = new RegExp(value, isCaseSensitive ? '' : 'i');
                isMatch = regex.test(text);
            } catch (e) {
                isMatch = false;
            }
        } else {
            switch (operator) {
                case 'contains': isMatch = lowerText.includes(lowerValue); break;
                case 'is': isMatch = lowerText === lowerValue; break;
                case 'starts_with': isMatch = lowerText.startsWith(lowerValue); break;
                case 'ends_with': isMatch = lowerText.endsWith(lowerValue); break;
                default: isMatch = false;
            }
        }

        if (isMatch && cell) {
            highlightMatches.push({ cell: cell, value: value, operator: operator, type: 'TAG' });
        }
        return isMatch;
    }

    private checkStatusFilter(row: HTMLTableRowElement, filterValue: string): boolean {
        const translationCell = row.querySelector('.translation-cell');
        const statusText = translationCell?.textContent || '';
        const stage = parseInt(row.dataset.stage || '0', 10);
        const isReviewed = stage === 5;

        const isUntranslated = statusText === '未翻訳' || statusText === '';
        const isTranslated = statusText !== '未翻訳' && !statusText.startsWith('翻訳エラー');
        const isError = statusText.startsWith('翻訳エラー');

        switch (filterValue) {
            case 'untranslated': return isUntranslated;
            case 'translated': return isTranslated;
            case 'error': return isError;
            case 'reviewed': return isReviewed;
            case 'unreviewed': return !isReviewed;
            default: return true;
        }
    }

    private checkToneFilter(row: HTMLTableRowElement, filterValue: string): boolean {
        const toneSelect = row.querySelector('.individual-tone-select') as HTMLSelectElement | null;
        return (toneSelect?.value || 'default') === filterValue;
    }

    private evaluateDefault(
        value: string, 
        row: HTMLTableRowElement, 
        useRegex: boolean, 
        isCaseSensitive: boolean, 
        highlightMatches: HighlightMatch[]
    ): boolean {
        const keyCell = row.querySelector('.string_key-column-header') as HTMLElement | null;
        const originalCell = row.querySelector('.original-text-cell') as HTMLElement | null;
        const translationCell = row.querySelector('.translation-cell') as HTMLElement | null;

        let matched = false;
        if (this.testMatch(keyCell?.textContent || '', value, 'contains', useRegex, isCaseSensitive, keyCell, highlightMatches)) matched = true;
        if (this.testMatch(originalCell?.textContent || '', value, 'contains', useRegex, isCaseSensitive, originalCell, highlightMatches)) matched = true;
        if (this.testMatch(translationCell?.textContent || '', value, 'contains', useRegex, isCaseSensitive, translationCell, highlightMatches)) matched = true;

        return matched;
    }

    private evaluateTag(
        key: string, 
        operator: string, 
        value: string, 
        row: HTMLTableRowElement, 
        useRegex: boolean, 
        isCaseSensitive: boolean, 
        highlightMatches: HighlightMatch[], 
        target: string | null = null
    ): boolean {
        const keyCell = row.querySelector('.string_key-column-header') as HTMLElement | null;
        const originalCell = row.querySelector('.original-text-cell') as HTMLElement | null;
        const translationCell = row.querySelector('.translation-cell') as HTMLElement | null;
        const stage = parseInt(row.dataset.stage || '0', 10);
        const individualToneSelect = row.querySelector('.individual-tone-select') as HTMLSelectElement | null;

        if (key === 'status') {
            return this.checkStatusFilter(row, value);
        }
        if (key === 'reviewed') {
            return (stage === 5).toString() === value;
        }
        if (key === 'tone') {
            return (individualToneSelect?.value || '') === value;
        }

        switch (key) {
            case 'key': return this.testMatch(keyCell?.textContent || '', value, operator, useRegex, isCaseSensitive, keyCell, highlightMatches);
            case 'original': return this.testMatch(originalCell?.textContent || '', value, operator, useRegex, isCaseSensitive, originalCell, highlightMatches);
            case 'translation': return this.testMatch(translationCell?.textContent || '', value, operator, useRegex, isCaseSensitive, translationCell, highlightMatches);
            case 'chars': {
                if (!target) return false;

                let text = '';
                let cellToHighlight: HTMLElement | null = null;
                if (target === 'key') {
                    text = keyCell?.textContent || '';
                    cellToHighlight = keyCell;
                } else if (target === 'original') {
                    text = originalCell?.textContent || '';
                    cellToHighlight = originalCell;
                } else if (target === 'translation') {
                    text = translationCell?.textContent || '';
                    cellToHighlight = translationCell;
                }

                const num = parseInt(value, 10);
                let isMatch = false;
                switch (operator) {
                    case '>': isMatch = text.length > num; break;
                    case '<': isMatch = text.length < num; break;
                    case '>=': isMatch = text.length >= num; break;
                    case '<=': isMatch = text.length <= num; break;
                    default: isMatch = false;
                }
                if (isMatch && cellToHighlight) {
                    highlightMatches.push({ cell: cellToHighlight, value: text, operator: 'is', type: 'TAG' });
                }
                return isMatch;
            }
            default: return false;
        }
    }

    private evaluate(
        node: ASTNode | null, 
        row: HTMLTableRowElement, 
        useRegex: boolean, 
        isCaseSensitive: boolean, 
        highlightMatches: HighlightMatch[]
    ): boolean {
        if (!node) return true;
        switch (node.type) {
            case 'AND': {
                const leftMatches: HighlightMatch[] = [];
                const rightMatches: HighlightMatch[] = [];
                const leftResult = this.evaluate(node.left, row, useRegex, isCaseSensitive, leftMatches);
                const rightResult = this.evaluate(node.right, row, useRegex, isCaseSensitive, rightMatches);
                if (leftResult && rightResult) {
                    highlightMatches.push(...leftMatches, ...rightMatches);
                    return true;
                }
                return false;
            }
            case 'OR': {
                const leftMatches: HighlightMatch[] = [];
                const rightMatches: HighlightMatch[] = [];
                const leftResult = this.evaluate(node.left, row, useRegex, isCaseSensitive, leftMatches);
                if (leftResult) {
                    highlightMatches.push(...leftMatches);
                    return true;
                }
                const rightResult = this.evaluate(node.right, row, useRegex, isCaseSensitive, rightMatches);
                if (rightResult) {
                    highlightMatches.push(...rightMatches);
                    return true;
                }
                return false;
            }
            case 'NOT': return !this.evaluate(node.value, row, useRegex, isCaseSensitive, []);
            case 'TAG': return this.evaluateTag(node.key, node.operator, node.value, row, useRegex, isCaseSensitive, highlightMatches, node.target || null);
            case 'DEFAULT': return this.evaluateDefault(node.value, row, useRegex, isCaseSensitive, highlightMatches);
            default: return true;
        }
    }

    public applyFilters(): void {
        if (!this.keywordSearchInput || !this.regexToggle || !this.caseSensitiveToggle) return;

        const query = this.keywordSearchInput.value.trim();
        const useRegex = this.regexToggle.classList.contains('active');
        const isCaseSensitive = this.caseSensitiveToggle.classList.contains('active');

        const currentStatusFilter = this.statusFilterSelect?.value || 'all';
        const currentToneFilter = this.toneFilterSelect?.value || 'all';

        let ast: ASTNode | null = null;
        let isQueryValid = true;
        if (query) {
            try {
                const tokens = tokenize(query);
                ast = parse(tokens);
            } catch (e) {
                console.error("クエリの解析エラー:", e);
                isQueryValid = false;
                this.keywordSearchInput.classList.add('invalid-regex');
            }
        }

        if (isQueryValid) {
            this.keywordSearchInput.classList.remove('invalid-regex');
        }

        this.allTableRows.forEach(row => {
            this.removeHighlights(row);

            let matches = true;

            if (currentStatusFilter !== 'all') {
                if (!this.checkStatusFilter(row, currentStatusFilter)) matches = false;
            }
            if (matches && currentToneFilter !== 'all') {
                if (!this.checkToneFilter(row, currentToneFilter)) matches = false;
            }

            if (matches && ast) {
                const highlightMatches: HighlightMatch[] = [];
                if (!this.evaluate(ast, row, useRegex, isCaseSensitive, highlightMatches)) {
                    matches = false;
                } else if (highlightMatches.length > 0) {
                    this.applyHighlights(highlightMatches, useRegex, isCaseSensitive);
                }
            } else if (matches && query) {
                const highlightMatches: HighlightMatch[] = [];
                const keyCell = row.querySelector('.string_key-column-header') as HTMLElement | null;
                const originalCell = row.querySelector('.original-text-cell') as HTMLElement | null;
                const translationCell = row.querySelector('.translation-cell') as HTMLElement | null;

                const searchValue = useRegex ? query : this.escapeRegExp(query);
                const regex = new RegExp(searchValue, isCaseSensitive ? 'g' : 'ig');

                if (keyCell && regex.test(keyCell.textContent || '')) highlightMatches.push({ cell: keyCell, value: query, type: 'DEFAULT' });
                if (originalCell && regex.test(originalCell.textContent || '')) highlightMatches.push({ cell: originalCell, value: query, type: 'DEFAULT' });
                if (translationCell && regex.test(translationCell.textContent || '')) highlightMatches.push({ cell: translationCell, value: query, type: 'DEFAULT' });

                if (highlightMatches.length === 0) {
                    matches = false;
                } else {
                    this.applyHighlights(highlightMatches, useRegex, isCaseSensitive);
                }
            }

            row.style.display = matches ? '' : 'none';
        });
    }

    public resetFilters(): void {
        if (this.statusFilterSelect) this.statusFilterSelect.value = 'all';
        if (this.toneFilterSelect) this.toneFilterSelect.value = 'all';
        if (this.keywordSearchInput) {
            this.keywordSearchInput.value = '';
            this.keywordSearchInput.classList.remove('invalid-regex');
        }
        this.caseSensitiveToggle?.classList.remove('active');
        this.regexToggle?.classList.remove('active');
        this.allTableRows.forEach(row => this.removeHighlights(row));
        this.applyFilters();
    }

    public updateAllTableRows(): void {
        if (!this.dataTable) return;
        this.allTableRows = Array.from(this.dataTable.querySelectorAll('tbody tr')) as HTMLTableRowElement[];
        this.applyFilters();
    }

    public updateToneFilterOptions(customTones: CustomTone[]): void {
        if (!this.toneFilterSelect) return;
        let optionsHtml = '<option value="all">すべて</option>';
        optionsHtml += '<option value="default">全体設定に沿う</option>';
        customTones.forEach(tone => {
            const displayName = tone.isConditional ? `${tone.name} [条件付き]` : tone.name;
            optionsHtml += `<option value="${escapeHTML(tone.value)}">${escapeHTML(displayName)}</option>`;
        });
        this.toneFilterSelect.innerHTML = optionsHtml;
    }
}

export const tableFilter = new TableFilter();
