// js/advancedFilter.js

/**
 * 高度なフィルターUIとロジックを初期化するモジュール
 * @param {object} options - 初期化オプション
 * @param {HTMLElement} options.modalElement - モーダル本体の要素
 * @param {HTMLElement} options.openButton - モーダルを開くボタン
 * @param {HTMLElement} options.closeButton - モーダルを閉じるボタン
 * @param {HTMLElement} options.cancelButton - キャンセルボタン
 * @param {HTMLElement} options.applyButton - 適用ボタン
 * @param {HTMLElement} options.canvasElement - フィルターブロックを描画するキャンバス要素
 * @param {HTMLElement} options.keywordInputElement - 検索タグを出力するキーワード入力欄
 * @param {object} options.mainTableFilter - メインのテーブルフィルターインスタンス
 * @param {function} options.getCustomTones - カスタム口調のリストを取得する関数
 */

import { tokenize, parse } from './queryParser.js';
import { escapeHTML } from './tableFilter.js';
export function initializeAdvancedFilter({
    modalElement,
    openButton,
    closeButton,
    cancelButton,
    applyButton,
    canvasElement,
    keywordInputElement,
    mainTableFilter,
    getCustomTones
}) {

    let draggedElement = null; // ドラッグ中の要素を保持
    let placeholder = null; // プレースホルダー要素を保持

    // --- モーダルの開閉 ---
    const openModal = () => {
        modalElement.classList.remove('hidden');
        // 現在の検索タグからUIを構築
        buildFilterUIFromQuery(keywordInputElement.value);
    };

    const closeModal = () => {
        modalElement.classList.add('hidden');
    };

    // --- UI構築 ---

    /**
     * キャンバスを初期化し、ルートブロックを作成する
     */
    const initializeCanvas = () => {
        canvasElement.innerHTML = '';
        // ルートとなるロジックブロックを作成
        const rootBlock = createLogicBlock();
        rootBlock.classList.add('is-root');
        // ルートブロックはドラッグ不可にする
        rootBlock.querySelector('.drag-handle').style.display = 'none';
        rootBlock.setAttribute('draggable', false);
        canvasElement.appendChild(rootBlock);
    };

    /**
     * ロジックブロック（AND/ORコンテナ）のHTMLを生成する
     * @param {string} logic - 'AND' または 'OR'
     * @returns {HTMLElement} 生成されたロジックブロック要素
     */
    const createLogicBlock = (logic = 'AND') => {
        const logicBlock = document.createElement('div');
        logicBlock.className = 'filter-block logic-block';
        logicBlock.id = `block-${Date.now()}-${Math.random()}`;
        logicBlock.dataset.type = 'logic';
        logicBlock.setAttribute('draggable', true);

        logicBlock.innerHTML = `
            <div class="guideline"></div>
            <div class="guideline-connector"></div>
            <div class="filter-block-content">
                <div class="flex items-center justify-between p-2 bg-gray-200 rounded-t-md">
                    <div class="flex items-center">
                        <i class="fas fa-grip-vertical drag-handle text-gray-400 mr-2"></i>
                        <select class="logic-operator bg-gray-200 font-semibold text-gray-700 border-none focus:ring-0 text-sm">
                            <option value="AND" ${logic === 'AND' ? 'selected' : ''}>すべての条件を満たす (AND)</option>
                            <option value="OR" ${logic === 'OR' ? 'selected' : ''}>いずれかの条件を満たす (OR)</option>
                        </select>
                    </div>
                    <button class="remove-block-button text-gray-500 hover:text-red-600 p-1"><i class="fas fa-times"></i></button>
                </div>
                <div class="logic-block-body p-2 space-y-2"></div>
                <div class="p-2 border-t mt-2 flex items-center space-x-2">
                    <button class="add-condition-button text-sm bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600">
                        <i class="fas fa-plus mr-1"></i>条件
                    </button>
                    <button class="add-logic-block-button text-sm bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600">
                        <i class="fas fa-sitemap mr-1"></i>グループ
                    </button>
                </div>
            </div>
        `;

        // イベントリスナーを設定
        logicBlock.querySelector('.add-condition-button').addEventListener('click', (e) => {
            const body = e.target.closest('.filter-block-content').querySelector('.logic-block-body');
            addConditionBlock(body);
        });
        logicBlock.querySelector('.add-logic-block-button').addEventListener('click', (e) => {
            const body = e.target.closest('.filter-block-content').querySelector('.logic-block-body');
            const newLogicBlock = createLogicBlock();
            addConditionBlock(newLogicBlock.querySelector('.logic-block-body'));
            body.appendChild(newLogicBlock);
        });
        logicBlock.querySelector('.remove-block-button').addEventListener('click', () => {
            if (!logicBlock.classList.contains('is-root')) {
                logicBlock.remove();
                updateGuidelines();
            } else {
                initializeCanvas();
            }
        });

        addDragDropListeners(logicBlock);
        return logicBlock;
    };

    /**
     * 条件ブロックを作成して親要素に追加する
     * @param {HTMLElement} parentBody - 追加先のロジックブロックのボディ
     * @param {object} [conditionData] - 条件データ（復元時用） {key, operator, value, target, isNot}
     */
    const addConditionBlock = (parentBody, conditionData = {}) => {
        const conditionBlock = document.createElement('div');
        conditionBlock.className = 'filter-block condition-block';
        conditionBlock.id = `block-${Date.now()}-${Math.random()}`;
        conditionBlock.dataset.type = 'condition';
        conditionBlock.setAttribute('draggable', true);

        const isNotChecked = conditionData.isNot ? 'checked' : '';

        conditionBlock.innerHTML = `
            <div class="guideline"></div>
            <div class="guideline-connector"></div>
            <div class="filter-block-content flex items-center space-x-2">
                <i class="fas fa-grip-vertical drag-handle text-gray-400"></i>
                <input type="checkbox" class="not-operator-checkbox h-4 w-4 text-red-600 border-gray-300 rounded focus:ring-red-500" ${isNotChecked}> <label class="text-gray-700 text-sm">NOT</label>
                <select class="filter-key-select bg-white border border-gray-300 rounded px-2 py-1 text-sm">
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
                <button class="remove-block-button text-gray-500 hover:text-red-600 p-1"><i class="fas fa-times"></i></button>
            </div>
        `;
        parentBody.appendChild(conditionBlock);

        const keySelect = conditionBlock.querySelector('.filter-key-select');
        if (conditionData.key) {
            keySelect.value = conditionData.key;
        }

        updateValueInput(keySelect, conditionData.operator, conditionData.value, conditionData.target);

        conditionBlock.querySelector('.filter-key-select').addEventListener('change', (e) => updateValueInput(e.target));
        conditionBlock.querySelector('.remove-block-button').addEventListener('click', () => {
            conditionBlock.remove();
            updateGuidelines();
        });
        addDragDropListeners(conditionBlock);
        updateGuidelines();
    };

    /**
     * 条件ブロックの入力UIを、選択されたキーに応じて更新する
     * @param {HTMLSelectElement} keySelect - キー選択のセレクトボックス
     * @param {string} [initialOperator] - 初期設定する演算子の値
     * @param {string} [initialValue] - 初期設定する値
     * @param {string} [initialTarget] - charsの場合の初期ターゲット
     */
    const updateValueInput = (keySelect, initialOperator = '', initialValue = '', initialTarget = '') => {
        const conditionBlock = keySelect.closest('.condition-block');
        const operatorContainer = conditionBlock.querySelector('.filter-operator-container');
        const valueContainer = conditionBlock.querySelector('.filter-value-container');
        const key = keySelect.value;
        operatorContainer.innerHTML = '';
        valueContainer.innerHTML = '';

        const commonInputClass = "border border-gray-300 rounded px-2 py-1 text-sm w-full";
        const commonSelectClass = "bg-white border border-gray-300 rounded px-2 py-1 text-sm";

        let operatorHtml = '';
        let valueHtml = '';

        if (key === 'status') {
            operatorHtml = `<select class="filter-operator-input ${commonSelectClass}"><option value="is">と一致する</option></select>`;
            valueHtml = `
                <select class="filter-value-input bg-white ${commonInputClass}">
                    <option value="untranslated">未翻訳</option>
                    <option value="translated">翻訳済み</option>
                    <option value="error">翻訳エラー</option>
                    <option value="reviewed">校閲済み</option>
                    <option value="unreviewed">未校閲</option>
                </select>`;
        } else if (key === 'reviewed') {
            operatorHtml = `<select class="filter-operator-input ${commonSelectClass}"><option value="is">と一致する</option></select>`;
            valueHtml = `
                <select class="filter-value-input bg-white ${commonInputClass}">
                    <option value="true">はい</option>
                    <option value="false">いいえ</option>
                </select>`;
        } else if (key === 'tone') {
            operatorHtml = `<select class="filter-operator-input ${commonSelectClass}"><option value="is">と一致する</option></select>`;
            const customTones = getCustomTones();
            const toneOptions = customTones.map(t => `<option value="${escapeHTML(t.value)}">${escapeHTML(t.name)}</option>`).join('');
            valueHtml = `<select class="filter-value-input bg-white ${commonInputClass}">${toneOptions}</select>`;
        } else if (key === 'chars') {
            operatorHtml = `
                <select class="filter-char-operator ${commonSelectClass}">
                    <option value=">" ${initialOperator === '>' ? 'selected' : ''}>&gt;</option>
                    <option value="<" ${initialOperator === '<' ? 'selected' : ''}>&lt;</option>
                    <option value=">=" ${initialOperator === '>=' ? 'selected' : ''}>&gt;=</option>
                    <option value="<=" ${initialOperator === '<=' ? 'selected' : ''}>&lt;=</option>
                </select>`;
            valueHtml = `
                <div class="flex items-center space-x-1">
                    <select class="filter-char-target bg-white border border-gray-300 rounded px-2 py-1 text-sm">
                        <option value="key" ${initialTarget === 'key' ? 'selected' : ''}>キー</option>
                        <option value="original" ${initialTarget === 'original' ? 'selected' : ''}>原文</option>
                        <option value="translation" ${initialTarget === 'translation' ? 'selected' : ''}>翻訳文</option>
                    </select>
                    <input type="number" class="filter-value-input ${commonInputClass} w-24" placeholder="数値" value="${escapeHTML(initialValue)}">
                </div>`;
        } else {
            operatorHtml = `
                <select class="filter-operator-input ${commonSelectClass}">
                    <option value="contains" ${initialOperator === 'contains' || !initialOperator ? 'selected' : ''}>含む</option>
                    <option value="is" ${initialOperator === 'is' ? 'selected' : ''}>と一致する</option>
                    <option value="starts_with" ${initialOperator === 'starts_with' ? 'selected' : ''}>で始まる</option>
                    <option value="ends_with" ${initialOperator === 'ends_with' ? 'selected' : ''}>で終わる</option>
                    <option value="matches_regex" ${initialOperator === 'matches_regex' ? 'selected' : ''}>正規表現に一致する</option>
                </select>`;
            valueHtml = `<input type="text" class="filter-value-input ${commonInputClass}" placeholder="キーワード" value="${escapeHTML(initialValue)}">`;
        }

        operatorContainer.innerHTML = operatorHtml;
        valueContainer.innerHTML = valueHtml;

        if (keySelect.value === 'status' || keySelect.value === 'reviewed' || keySelect.value === 'tone') {
            const selectElement = valueContainer.querySelector('.filter-value-input');
            if (selectElement && initialValue) selectElement.value = initialValue;
        }
        const operatorSelect = operatorContainer.querySelector('.filter-operator-input, .filter-char-operator');
        if (operatorSelect && initialOperator) operatorSelect.value = initialOperator;
    };

    /**
     * ASTノードに基づいてフィルターUI要素を再帰的に構築する
     * @param {object} node - 現在のASTノード
     * @param {HTMLElement} parentElement - 親となるDOM要素
     */
    const reconstructUIFromAST = (node, parentElement) => {
        if (!node) return;

        if (node.type === 'NOT') {
            // NOTノードはUI要素にはならず、子要素にisNotフラグを渡す
            if (node.value.type === 'TAG' || node.value.type === 'DEFAULT') {
                 addConditionBlock(parentElement, { ...node.value, isNot: true });
            } else {
                // NOT (A AND B)のような複雑なケースはここでは単純化し、未対応とする
                console.warn("UI reconstruction for complex NOT statements is not fully supported.");
                reconstructUIFromAST(node.value, parentElement);
            }
            return;
        }

        if (node.type === 'AND' || node.type === 'OR') {
            const logicBlock = createLogicBlock(node.type);
            const logicBody = logicBlock.querySelector('.logic-block-body');
            
            const flatten = (n, type) => {
                if(n.type === type) {
                    return [...flatten(n.left, type), ...flatten(n.right, type)];
                }
                return [n];
            }

            const children = flatten(node, node.type);
            children.forEach(childNode => reconstructUIFromAST(childNode, logicBody));
            parentElement.appendChild(logicBlock);

        } else if (node.type === 'TAG' || node.type === 'DEFAULT') {
            addConditionBlock(parentElement, node);
        }
    };

    /**
     * フィルターUIの状態から検索タグ文字列を生成する
     * @returns {string} 生成された検索タグ文字列
     */
    const generateQueryFromUI = () => {
        const rootBlock = canvasElement.querySelector('.is-root');
        if (!rootBlock) return '';
        
        const parseBlock = (element) => {
            const type = element.dataset.type;
            if (type === 'logic') {
                const operator = element.querySelector('.logic-operator').value === 'AND' ? ' ' : ' | ';
                const children = Array.from(element.querySelector('.logic-block-body').children)
                                    .filter(child => child.classList.contains('filter-block'))
                                    .map(parseBlock)
                                    .filter(q => q);
                if (children.length === 0) return '';
                if (children.length === 1) return children[0];
                return `(${children.join(operator).trim()})`;

            } else if (type === 'condition') {
                const key = element.querySelector('.filter-key-select').value;
                let valueInput = element.querySelector('.filter-value-input');
                let value = valueInput ? valueInput.value.trim() : '';

                const isNot = element.querySelector('.not-operator-checkbox')?.checked || false;

                if (!value && !['reviewed', 'status', 'tone'].includes(key)) return '';

                let tag = '';
                if (key === 'chars') {
                    const target = element.querySelector('.filter-char-target').value;
                    const charOperator = element.querySelector('.filter-char-operator').value;
                    tag = `${key}:${target}${charOperator}${value}`;
                } else {
                    const operatorSelect = element.querySelector('.filter-operator-input');
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
    };
    
    /**
     * 検索タグ文字列からフィルターUIを再構築する
     * @param {string} query - 検索タグ文字列
     */
    const buildFilterUIFromQuery = (query) => {
        initializeCanvas();
        const rootBody = canvasElement.querySelector('.logic-block-body');

        if (!query.trim()) {
            addConditionBlock(rootBody);
            return;
        }

        try {
            const tokens = tokenize(query);
            const ast = parse(tokens);
            if (ast) {
                reconstructUIFromAST(ast, rootBody);
            } else {
                addConditionBlock(rootBody);
            }
        } catch (e) {
            console.error("Error parsing query for UI reconstruction:", e);
            addConditionBlock(rootBody);
        }
        updateGuidelines();
    };

    // --- ドラッグ＆ドロップ ---

    const addDragDropListeners = (element) => {
        element.addEventListener('dragstart', handleDragStart, false);
        element.addEventListener('dragend', handleDragEnd, false);
        element.addEventListener('dragover', handleDragOver, false);
        element.addEventListener('dragenter', handleDragEnter, false);
        element.addEventListener('dragleave', handleDragLeave, false);
        element.addEventListener('drop', handleDrop, false);
    };

    /**
     * ドラッグ開始時の処理
     * @param {DragEvent} e
     */
    function handleDragStart(e) {
        // 入力フォームやボタン上でのドラッグは無効化し、テキスト選択などを可能にする
        if (['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(e.target.tagName) || e.target.closest('button')) {
            e.preventDefault();
            return;
        }

        e.stopPropagation();

        // ドラッグ対象の要素（.filter-block）を特定
        draggedElement = e.currentTarget;

        // ドラッグデータを設定
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', draggedElement.id);

        // 少し遅れてドラッグ中のスタイルを適用（ゴーストイメージの生成を妨げないため）
        setTimeout(() => {
            draggedElement?.classList.add('is-dragging');
        }, 0);
    }

    /**
     * ドラッグ終了時の処理
     * @param {DragEvent} e
     */
    function handleDragEnd(e) {
        e.stopPropagation();
        // スタイルと変数をリセット
        draggedElement?.classList.remove('is-dragging');
        draggedElement = null;
        placeholder?.remove();
        placeholder = null;
        updateGuidelines();
    }

    /**
     * ドラッグ要素がドロップターゲット上にある間の処理
     * @param {DragEvent} e
     */
    function handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'move';

        updatePlaceholderPosition(e);
        return false;
    }

    function updatePlaceholderPosition(e) {
        if (!draggedElement) return;

        const dropTarget = e.target.closest('.filter-block');
        const dropContainer = e.target.closest('.logic-block-body');

        if (placeholder) placeholder.remove();
        placeholder = document.createElement('div');
        placeholder.className = 'drop-placeholder';

        // 1) コンテナ内に落とす場合
        if (dropContainer) {
            const children = Array.from(dropContainer.children)
                .filter(c => c !== draggedElement && !c.classList.contains('drop-placeholder'));

            // 「一番近い中心」を探す（判定を甘く・安定化）
            let targetElement = null;
            let bestDist = Infinity;
            for (const child of children) {
                const rect = child.getBoundingClientRect();
                const centerY = rect.top + rect.height / 2;
                const dist = Math.abs(e.clientY - centerY);
                if (dist < bestDist) {
                    bestDist = dist;
                    targetElement = (e.clientY < centerY) ? child : child.nextSibling;
                }
            }
            dropContainer.insertBefore(placeholder, targetElement || null);
            return;
        }

        // 2) 他ブロックの前後に落とす場合
        if (dropTarget && dropTarget !== draggedElement && !dropTarget.contains(draggedElement)) {
            const rect = dropTarget.getBoundingClientRect();

            // しきい値に「ゆとり」を入れる（半分きっちり判定をやめる）
            const afterThreshold = rect.top + rect.height * 0.55; // 50%→55%など好みで調整
            const isAfter = e.clientY > afterThreshold;

            if (isAfter) {
                dropTarget.parentNode.insertBefore(placeholder, dropTarget.nextSibling);
            } else {
                dropTarget.parentNode.insertBefore(placeholder, dropTarget);
            }
        }
    }

    function handleDragEnter(e) {
        e.preventDefault();
        e.stopPropagation();
        updatePlaceholderPosition(e);
    }

    /**
     * ドラッグ要素がドロップターゲットから離れた時の処理
     * @param {DragEvent} e
     */
    function handleDragLeave(e) {
        e.preventDefault();
    }

    /**
     * ドロップ時の処理
     * @param {DragEvent} e
     */
    function handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        
        // プレースホルダーの位置にドラッグした要素を挿入
        if (placeholder && placeholder.parentNode && draggedElement) {
            placeholder.parentNode.replaceChild(draggedElement, placeholder);
        }
        
        // 後片付け
        placeholder?.remove();
        placeholder = null;
        updateGuidelines();
    }

    /**
     * ガイドラインの表示を更新する
     */
    const updateGuidelines = () => {
        canvasElement.querySelectorAll('.logic-block-body').forEach(body => {
            const blocks = Array.from(body.children).filter(c => c.classList.contains('filter-block'));
            blocks.forEach((block, index) => {
                const guideline = block.querySelector(':scope > .guideline');
                if (guideline) {
                    // 各グループの最後の要素ならガイドラインを短くする
                    guideline.style.height = (index === blocks.length - 1) ? '50%' : '100%';
                }
            });
        });
    };

    // --- 初期化 ---
    openButton.addEventListener('click', openModal);
    closeButton.addEventListener('click', closeModal);
    cancelButton.addEventListener('click', closeModal);

    applyButton.addEventListener('click', () => {
        const query = generateQueryFromUI();
        keywordInputElement.value = query;
        closeModal();
        mainTableFilter.applyFilters();
    });

    initializeCanvas();
}
