// js/tableFilter.js
import { tokenize, parse } from './queryParser.js';
/**
 * Initializes the table filtering functionality.
 * @param {HTMLElement} dataTable - The main data table element.
 * @returns {object} An object with public methods to control the filter.
 */
export const escapeHTML = (str) => {
    if (typeof str !== 'string') return '';
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
};
export const initializeTableFilters = (dataTable) => {
    // DOM Elements
    const statusFilterSelect = document.getElementById('status-filter-select');
    const toneFilterSelect = document.getElementById('tone-filter-select');
    const keywordSearchInput = document.getElementById('keyword-search-input');
    const regexSearchCheckbox = document.getElementById('regex-search-checkbox');
    const resetFiltersButton = document.getElementById('reset-filters-button');

    let allTableRows = [];

    // --- Public Methods ---

    const updateAllTableRows = () => {
        allTableRows = Array.from(dataTable.querySelectorAll('tbody tr'));
        applyFilters();
    };

    const updateToneFilterOptions = (customTones) => {
        let optionsHtml = '<option value="all">すべて</option>';
        optionsHtml += '<option value="default">全体設定に沿う</option>';
        customTones.forEach(tone => {
            optionsHtml += `<option value="${escapeHTML(tone.value)}">${escapeHTML(tone.name)}</option>`;
        });
        toneFilterSelect.innerHTML = optionsHtml;
    };

    const applyFilters = () => {
        const query = keywordSearchInput.value.trim();
        const useRegex = regexSearchCheckbox.checked;

        const currentStatusFilter = statusFilterSelect.value;
        const currentToneFilter = toneFilterSelect.value;

        let ast = null;
        let isQueryValid = true;
        if (query) {
            try {
                const tokens = tokenize(query);
                ast = parse(tokens);
            } catch (e) {
                console.error("Query parse error:", e);
                isQueryValid = false;
                keywordSearchInput.classList.add('invalid-regex');
            }
        }
        
        if (isQueryValid) {
            keywordSearchInput.classList.remove('invalid-regex');
        }

        allTableRows.forEach(row => {
            // 既存のハイライトを削除
            removeHighlights(row); //

            let matches = true;

            // 1. Check simple filters first
            if (currentStatusFilter !== 'all') {
                if (!checkStatusFilter(row, currentStatusFilter)) matches = false;
            }
            if (matches && currentToneFilter !== 'all') {
                if (!checkToneFilter(row, currentToneFilter)) matches = false;
            }

            // 2. If still matching, check advanced query
            if (matches && ast) {
                const highlightMatches = []; // ハイライト情報を収集するための配列
                if (!evaluate(ast, row, useRegex, highlightMatches)) { // highlightMatches配列を渡す
                    matches = false;
                } else if (highlightMatches.length > 0) {
                    applyHighlights(row, highlightMatches, useRegex); // マッチが見つかった場合、ハイライトを適用
                }
            } else if (matches && query) { // ASTがない場合のシンプルなキーワード検索
                const highlightMatches = [];
                const keyText = row.querySelector('.string_key-column-header')?.textContent || '';
                const originalText = row.querySelector('.original-text-cell')?.textContent || '';
                const translationText = row.querySelector('.translation-cell')?.textContent || '';

                const searchValue = useRegex ? query : escapeRegExp(query);
                const regex = new RegExp(searchValue, 'ig'); // 大文字小文字を区別しない、グローバル検索

                // キー、原文、翻訳文のそれぞれでマッチをチェックし、マッチ情報を収集
                if (regex.test(keyText)) highlightMatches.push({ cell: row.querySelector('.string_key-column-header'), value: query, type: 'DEFAULT' }); //
                if (regex.test(originalText)) highlightMatches.push({ cell: row.querySelector('.original-text-cell'), value: query, type: 'DEFAULT' }); //
                if (regex.test(translationText)) highlightMatches.push({ cell: row.querySelector('.translation-cell'), value: query, type: 'DEFAULT' }); //
                
                if (highlightMatches.length === 0) {
                    matches = false; // シンプルな検索でマッチがなければ行を非表示
                } else {
                    applyHighlights(row, highlightMatches, useRegex); //
                }
            }

            row.style.display = matches ? '' : 'none';
        });
    };

    // --- Helper Functions ---

    const checkStatusFilter = (row, filterValue) => {
        const translationCell = row.querySelector('.translation-cell');
        const statusText = translationCell?.textContent || '';
        const isReviewed = row.querySelector('.review-checkbox')?.checked ?? false;
        
        // 翻訳ステータス
        const isUntranslated = statusText === '未翻訳';
        const isTranslated = statusText !== '未翻訳' && !statusText.startsWith('翻訳エラー');
        const isError = statusText.startsWith('翻訳エラー');

        switch(filterValue) {
            case 'untranslated': return isUntranslated;
            case 'translated': return isTranslated;
            case 'error': return isError;
            case 'reviewed': return isReviewed;
            case 'unreviewed': return !isReviewed;
            default: return true;
        }
    };

    const checkToneFilter = (row, filterValue) => {
        return (row.querySelector('.individual-tone-select')?.value || 'default') === filterValue;
    };

    const resetFilters = () => {
        statusFilterSelect.value = 'all';
        toneFilterSelect.value = 'all';
        keywordSearchInput.value = '';
        regexSearchCheckbox.checked = false;
        keywordSearchInput.classList.remove('invalid-regex');
        allTableRows.forEach(row => removeHighlights(row)); // リセット時にも全てのハイライトを削除
        applyFilters();
    };

    // 新しいヘルパー関数：文字列を正規表現用にエスケープする
    const escapeRegExp = (string) => {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $&はマッチした部分全体を指す
    };

    // --- ハイライト関連関数 ---

    /**
     * 指定された行から全てのハイライトを削除する。
     * @param {HTMLElement} rowElement - ハイライトをクリアするテーブルの行。
     */
    const removeHighlights = (rowElement) => {
        rowElement.querySelectorAll('.highlight').forEach(span => {
            span.outerHTML = span.textContent; // スパンタグをそのテキストコンテンツで置き換える
        });
    };

    /**
     * 行の関連するセルにハイライトを適用する。
     * @param {HTMLElement} rowElement - ハイライトを適用するテーブルの行。
     * @param {Array<object>} highlightMatches - ハイライトする情報を格納したオブジェクトの配列: { cell: HTMLElement, value: string, type: string, operator: string }。
     * @param {boolean} useRegex - 値を正規表現として扱うかどうか。
     */
    const applyHighlights = (rowElement, highlightMatches, useRegex) => {
        highlightMatches.forEach(matchInfo => {
            const cell = matchInfo.cell;
            if (!cell) return;

            let textContent = cell.innerHTML; // 以前のHTML（例：escapeHTMLによるもの）を保持するためinnerHTMLを使用
            const searchText = matchInfo.value;
            const operator = matchInfo.operator; // TAGタイプの場合

            // ハイライトを適用する前に、このセルから既存のハイライトを全て削除
            cell.querySelectorAll('.highlight').forEach(span => {
                span.outerHTML = span.textContent;
            });
            textContent = cell.innerHTML; // 削除後にtextContentを更新

            let regex;
            if (useRegex || operator === 'matches_regex') {
                try {
                    regex = new RegExp(searchText, 'ig');
                } catch (e) {
                    console.warn("Invalid regex for highlighting:", searchText, e);
                    return;
                }
            } else {
                // 'is' や 'contains' などの場合、演算子に基づいてリテラル一致または正規表現を使用
                let pattern = escapeRegExp(searchText);
                if (operator === 'starts_with') pattern = `^${pattern}`;
                else if (operator === 'ends_with') pattern = `${pattern}$`;
                else if (operator === 'is') pattern = `^${pattern}$`; // 完全一致

                regex = new RegExp(pattern, 'ig');
            }

            // マッチしたテキストをハイライトされたスパンで置き換える。HTMLが二重にエスケープされないようにする。
            // HTMLをパースし、テキストノードを走査するために一時的なdivを使用
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = textContent; //

            const highlightNode = (node) => {
                if (node.nodeType === Node.TEXT_NODE) {
                    const originalText = node.nodeValue;
                    if (originalText && regex.test(originalText)) {
                        // replaceメソッドの第2引数にコールバック関数を渡すことで、
                        // マッチした部分のみをスパンタグで囲む
                        const newHtml = originalText.replace(regex, (match) => `<span class="highlight">${match}</span>`); //
                        const tempSpan = document.createElement('span');
                        tempSpan.innerHTML = newHtml;
                        while (tempSpan.firstChild) {
                            node.parentNode.insertBefore(tempSpan.firstChild, node);
                        }
                        node.remove();
                    }
                } else if (node.nodeType === Node.ELEMENT_NODE) {
                    // 子ノードがある場合は再帰的に処理
                    Array.from(node.childNodes).forEach(highlightNode);
                }
            };
            highlightNode(tempDiv);
            cell.innerHTML = tempDiv.innerHTML;
        });
    };

    // --- Advanced Query Parsing and Evaluation ---

    // const tokenize = (query) => {
    //     // Updated regex to handle key:operator:value, key:value, and quoted values
    //     const regex = /(!?\(|!?[a-zA-Z_]+(?::[a-zA-Z_]+)?:"(?:[^"\\]|\\.)*"|!?[a-zA-Z_]+(?::[a-zA-Z_]+)?:[^\s()|]+|[()|]|\S+)/g;
    //     return query.match(regex) || [];
    // };

    // const parse = (tokens) => {
    //     let position = 0;
    //     const parseOr = () => {
    //         let left = parseAnd();
    //         while (position < tokens.length && tokens[position] === '|') {
    //             position++;
    //             const right = parseAnd();
    //             left = { type: 'OR', left, right };
    //         }
    //         return left;
    //     };
    //     const parseAnd = () => {
    //         const terms = [];
    //         while (position < tokens.length && tokens[position] !== '|' && tokens[position] !== ')') {
    //             const factor = parseFactor();
    //             if (factor) terms.push(factor); // nullチェックを追加
    //         }
    //         if (terms.length === 0) return null;
    //         if (terms.length === 1) return terms[0];
    //         return terms.reduce((acc, term) => ({ type: 'AND', left: acc, right: term }));
    //     };
    //     const parseFactor = () => {
    //         let token = tokens[position];
    //         let isNot = false;
    //         if (token.startsWith('!')) {
    //             isNot = true;
    //             token = token.substring(1);
    //         }
    //         let node;
    //         if (token === '(') {
    //             position++;
    //             node = parseOr();
    //             if (position >= tokens.length || tokens[position] !== ')') throw new Error('Mismatched parentheses');
    //             position++;
    //         } else {
    //             position++;
    //             const firstColonIndex = token.indexOf(':');
    //             if (firstColonIndex > -1) {
    //                 const key = token.substring(0, firstColonIndex);
    //                 let remainder = token.substring(firstColonIndex + 1);

    //                 let operator = 'contains'; // Default operator for key, original, translation
    //                 let value = remainder;

    //                 // Check if it's a key:operator:value format
    //                 const secondColonIndex = remainder.indexOf(':');
    //                 if (secondColonIndex > -1) {
    //                     operator = remainder.substring(0, secondColonIndex);
    //                     value = remainder.substring(secondColonIndex + 1);
    //                 } else if (['status', 'reviewed', 'tone', 'chars'].includes(key)) {
    //                     // These keys do not use an explicit operator in the tag string for 'is'
    //                     // The 'is_not' case is handled by the '!' prefix
    //                     operator = 'is'; 
    //                 }

    //                 if (value.startsWith('"') && value.endsWith('"')) {
    //                     value = value.substring(1, value.length - 1).replace(/\\"/g, '"');
    //                 }
    //                 node = { type: 'TAG', key, operator, value }; // operator を追加
    //             } else {
    //                 node = { type: 'DEFAULT', value: token };
    //             }
    //         }
    //         return isNot ? { type: 'NOT', value: node } : node;
    //     };
    //     const ast = parseOr();
    //     if (position < tokens.length) throw new Error(`Unexpected token: ${tokens[position]}`);
    //     return ast;
    // };

    /**
     * Evaluates the AST against a row and collects highlighting information.
     * @param {object} node - The current node in the AST.
     * @param {HTMLElement} row - The table row being evaluated.
     * @param {boolean} useRegex - Whether to perform regex matching for default/text searches.
     * @param {Array<object>} highlightMatches - Array to collect objects for highlighting.
     * @returns {boolean} True if the row matches the filter, false otherwise.
     */
    const evaluate = (node, row, useRegex, highlightMatches) => { //
        if (!node) return true;
        switch (node.type) {
            case 'AND': {
                const leftMatches = [];
                const rightMatches = [];
                const leftResult = evaluate(node.left, row, useRegex, leftMatches); //
                const rightResult = evaluate(node.right, row, useRegex, rightMatches); //
                if (leftResult && rightResult) {
                    highlightMatches.push(...leftMatches, ...rightMatches); //
                    return true;
                }
                return false;
            }
            case 'OR': {
                const leftMatches = [];
                const rightMatches = [];
                const leftResult = evaluate(node.left, row, useRegex, leftMatches); //
                if (leftResult) {
                    highlightMatches.push(...leftMatches); //
                    return true;
                }
                const rightResult = evaluate(node.right, row, useRegex, rightMatches); //
                if (rightResult) {
                    highlightMatches.push(...rightMatches); //
                    return true;
                }
                return false;
            }
            case 'NOT': return !evaluate(node.value, row, useRegex, []); // NOT操作はハイライトに寄与しない
            case 'TAG': return evaluateTag(node.key, node.operator, node.value, row, useRegex, highlightMatches, node.target);
            case 'DEFAULT': return evaluateDefault(node.value, row, useRegex, highlightMatches); //
            default: return true;
        }
    };

    /**
     * Tests if text matches a value based on an operator and collects highlight info.
     * @param {string} text - The text to test.
     * @param {string} value - The value to match against.
     * @param {string} operator - The comparison operator.
     * @param {boolean} useRegex - Whether to use regex for matching.
     * @param {HTMLElement} cell - The cell element to highlight.
     * @param {Array<object>} highlightMatches - Array to collect objects for highlighting.
     * @returns {boolean} True if text matches, false otherwise.
     */
    const testMatch = (text, value, operator, useRegex, cell, highlightMatches) => { //
        const lowerText = text.toLowerCase();
        const lowerValue = value.toLowerCase();

        let isMatch = false;
        let regex;

        if (useRegex || operator === 'matches_regex') {
            try {
                regex = new RegExp(value, 'i');
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
                default: isMatch = false; // Should not happen with valid operators
            }
        }

        if (isMatch && cell) {
            // ハイライトのために元の値を保存する。正規表現パターンである可能性があるため。
            highlightMatches.push({ cell: cell, value: value, operator: operator, type: 'TAG' }); //
        }
        return isMatch;
    };

    /**
     * Evaluates a default search and collects highlighting information.
     * @param {string} value - The search value.
     * @param {HTMLElement} row - The table row.
     * @param {boolean} useRegex - Whether to use regex for matching.
     * @param {Array<object>} highlightMatches - Array to collect objects for highlighting.
     * @returns {boolean} True if a match is found in any default search column.
     */
    const evaluateDefault = (value, row, useRegex, highlightMatches) => { //
        const keyCell = row.querySelector('.string_key-column-header');
        const originalCell = row.querySelector('.original-text-cell');
        const translationCell = row.querySelector('.translation-cell');

        let matched = false;
        if (testMatch(keyCell?.textContent || '', value, 'contains', useRegex, keyCell, highlightMatches)) matched = true; //
        if (testMatch(originalCell?.textContent || '', value, 'contains', useRegex, originalCell, highlightMatches)) matched = true; //
        if (testMatch(translationCell?.textContent || '', value, 'contains', useRegex, translationCell, highlightMatches)) matched = true; //
        
        return matched;
    };

    /**
     * Evaluates a tagged search and collects highlighting information.
     * @param {string} key - The tag key (e.g., 'key', 'original', 'status').
     * @param {string} operator - The comparison operator.
     * @param {string} value - The tag value.
     * @param {HTMLElement} row - The table row.
     * @param {boolean} useRegex - Whether to use regex for matching.
     * @param {Array<object>} highlightMatches - Array to collect objects for highlighting.
     * @param {string} [target] - charsの場合のターゲットセル (key, original, translation)
     * @returns {boolean} True if the tag matches.
     */
    const evaluateTag = (key, operator, value, row, useRegex, highlightMatches, target = null) => { // 変更点: targetパラメータを追加
        const keyCell = row.querySelector('.string_key-column-header');
        const originalCell = row.querySelector('.original-text-cell');
        const translationCell = row.querySelector('.translation-cell');
        const reviewCheckbox = row.querySelector('.review-checkbox');
        const individualToneSelect = row.querySelector('.individual-tone-select');

        // status, reviewed, tone の場合は operator は 'is' を想定し、checkStatusFilter など既存のヘルパーを使用
        // これらの要素はセルのテキスト内容を直接ハイライトしないため、ブール値の結果のみを返す。
        if (key === 'status') {
            return checkStatusFilter(row, value);
        }
        if (key === 'reviewed') {
            return (reviewCheckbox?.checked ?? false).toString() === value;
        }
        if (key === 'tone') {
            return (individualToneSelect?.value || '') === value;
        }

        switch (key) {
            case 'key': return testMatch(keyCell?.textContent || '', value, operator, useRegex, keyCell, highlightMatches);
            case 'original': return testMatch(originalCell?.textContent || '', value, operator, useRegex, originalCell, highlightMatches);
            case 'translation': return testMatch(translationCell?.textContent || '', value, operator, useRegex, translationCell, highlightMatches);
            case 'chars': {
                // targetはASTノードのプロパティとして渡される (例: chars:key>=5 の 'key')
                if (!target) return false; // 変更点: targetがない場合は評価しない

                let text = '';
                let cellToHighlight = null;
                if (target === 'key') { // 変更点: targetから直接判断
                    text = keyCell?.textContent || '';
                    cellToHighlight = keyCell;
                } else if (target === 'original') { // 変更点: targetから直接判断
                    text = originalCell?.textContent || '';
                    cellToHighlight = originalCell;
                } else if (target === 'translation') { // 変更点: targetから直接判断
                    text = translationCell?.textContent || '';
                    cellToHighlight = translationCell;
                }
                
                const num = parseInt(value, 10); // valueは数値部分
                let isMatch = false;
                switch (operator) {
                    case '>': isMatch = text.length > num; break;
                    case '<': isMatch = text.length < num; break;
                    case '>=': isMatch = text.length >= num; break;
                    case '<=': isMatch = text.length <= num; break;
                    default: isMatch = false;
                }
                if (isMatch && cellToHighlight) {
                    // 'chars' フィルターの場合、条件が一致すればセル全体をハイライト
                    // 特定のサブ文字列をハイライトするのではなく、文字長条件が満たされたことを示す
                    // ハイライトのためにテキスト内容全体を渡す
                    highlightMatches.push({ cell: cellToHighlight, value: text, operator: 'is', type: 'TAG' });
                }
                return isMatch;
            }
            default: return false;
        }
    };

    // --- Event Listeners & Initialization ---
    statusFilterSelect.addEventListener('change', applyFilters);
    toneFilterSelect.addEventListener('change', applyFilters);
    keywordSearchInput.addEventListener('input', applyFilters);
    regexSearchCheckbox.addEventListener('change', applyFilters);
    resetFiltersButton.addEventListener('click', resetFilters);

    updateAllTableRows();

    return {
        applyFilters,
        updateToneFilterOptions,
        updateAllTableRows
    };
};