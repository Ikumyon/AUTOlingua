import { escapeHTML } from './uiUtils.js';

/**
 * 修飾文字管理モジュール
 * @param {object} options
 * @param {HTMLElement} options.modifierTableBody - 修飾文字テーブルのtbody要素
 * @param {HTMLElement} options.modifierNameInput - 修飾文字名入力フィールド
 * @param {HTMLElement} options.modifierRegexInput - 修飾文字正規表現入力フィールド
 * @param {HTMLElement} options.addModifierButton - 追加/保存ボタン
 * @param {HTMLElement} options.cancelModifierEditButton - 編集キャンセルボタン
 * @param {function} options.alertMessage - アラートメッセージ表示関数
 * @param {function} options.saveSettingsCallback - 設定保存時のコールバック関数
 */
export const initializeModifierManager = ({
    modifierTableBody,
    modifierNameInput,
    modifierRegexInput,
    addModifierButton,
    cancelModifierEditButton,
    alertMessage,
    saveSettingsCallback
}) => {
    let modifiers = [];
    let editingIndex = null;

    /**
     * 修飾文字テーブルをレンダリングする関数
     */
    const renderModifierTable = () => {
        modifierTableBody.innerHTML = '';
        modifiers.forEach((modifier, index) => {
            if (!modifier.id) modifier.id = Date.now() + Math.random();

            const row = document.createElement('tr');
            row.className = index % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50 hover:bg-gray-100';

            row.innerHTML = `
                <td class="py-2 px-4 border-b border-gray-200 text-center">
                    <input type="checkbox" class="toggle-modifier-checkbox h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" data-index="${index}" ${modifier.enabled !== false ? 'checked' : ''}>
                </td>
                <td class="py-2 px-4 border-b border-gray-200 text-sm text-gray-700 font-medium">${escapeHTML(modifier.name)}</td>
                <td class="py-2 px-4 border-b border-gray-200 text-sm text-gray-600 font-mono text-xs">${escapeHTML(modifier.regex)}</td>
                <td class="py-2 px-4 border-b border-gray-200 text-center">
                    <div class="flex justify-center space-x-2">
                        <button class="edit-modifier-button text-blue-500 hover:text-blue-700 transition duration-150 ease-in-out" data-index="${index}" title="編集">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="delete-modifier-button text-red-500 hover:text-red-700 transition duration-150 ease-in-out" data-index="${index}" title="削除">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </td>
            `;
            modifierTableBody.appendChild(row);
        });

        // イベントリスナーの追加
        modifierTableBody.querySelectorAll('.toggle-modifier-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => toggleModifier(parseInt(e.target.dataset.index), e.target.checked));
        });
        modifierTableBody.querySelectorAll('.edit-modifier-button').forEach(button => {
            button.addEventListener('click', (e) => editModifier(parseInt(e.currentTarget.dataset.index)));
        });
        modifierTableBody.querySelectorAll('.delete-modifier-button').forEach(button => {
            button.addEventListener('click', (e) => deleteModifier(parseInt(e.currentTarget.dataset.index)));
        });
    };

    /**
     * 修飾文字を追加または更新する関数
     */
    const addOrUpdateModifier = () => {
        const name = modifierNameInput.value.trim();
        const regex = modifierRegexInput.value.trim();

        if (!name || !regex) {
            alertMessage('名前と正規表現の両方を入力してください。', 'warning');
            return;
        }

        // 正規表現の妥当性チェック
        try {
            new RegExp(regex);
        } catch (e) {
            alertMessage('無効な正規表現です: ' + e.message, 'error');
            return;
        }

        if (editingIndex !== null) {
            // 更新
            modifiers[editingIndex].name = name;
            modifiers[editingIndex].regex = regex;
            editingIndex = null;
            addModifierButton.textContent = '追加';
            cancelModifierEditButton.classList.add('hidden');
            alertMessage('修飾文字を更新しました。', 'success');
        } else {
            // 追加
            modifiers.push({
                id: Date.now() + Math.random(),
                name: name,
                regex: regex,
                enabled: true
            });
            alertMessage('修飾文字を追加しました。', 'success');
        }

        modifierNameInput.value = '';
        modifierRegexInput.value = '';
        renderModifierTable();
        if (saveSettingsCallback) saveSettingsCallback();
    };

    /**
     * 修飾文字を編集モードにする関数
     */
    const editModifier = (index) => {
        const modifier = modifiers[index];
        modifierNameInput.value = modifier.name;
        modifierRegexInput.value = modifier.regex;
        editingIndex = index;
        addModifierButton.textContent = '更新';
        cancelModifierEditButton.classList.remove('hidden');

        // フォームまでスクロール
        modifierNameInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        modifierNameInput.focus();
    };

    /**
     * 編集をキャンセルする関数
     */
    const cancelEdit = () => {
        editingIndex = null;
        modifierNameInput.value = '';
        modifierRegexInput.value = '';
        addModifierButton.textContent = '追加';
        cancelModifierEditButton.classList.add('hidden');
    };

    /**
     * 修飾文字を削除する関数
     */
    const deleteModifier = (index) => {
        if (confirm('この修飾文字設定を削除してもよろしいですか？')) {
            modifiers.splice(index, 1);
            if (editingIndex === index) {
                cancelEdit();
            } else if (editingIndex > index) {
                editingIndex--;
            }
            renderModifierTable();
            if (saveSettingsCallback) saveSettingsCallback();
        }
    };

    /**
     * 修飾文字の有効/無効を切り替える関数
     */
    const toggleModifier = (index, isEnabled) => {
        modifiers[index].enabled = isEnabled;
        if (saveSettingsCallback) saveSettingsCallback();
    };

    // イベントリスナーの設定
    addModifierButton.addEventListener('click', addOrUpdateModifier);
    cancelModifierEditButton.addEventListener('click', cancelEdit);

    return {
        getModifiers: () => modifiers,
        setModifiers: (newModifiers) => {
            modifiers = Array.isArray(newModifiers) ? newModifiers : [];
            // 古い形式のデータ（単一オブジェクト配列など）からの移行が必要な場合の処理
            modifiers = modifiers.map(m => {
                if (typeof m.enabled === 'undefined') m.enabled = true; // デフォルトで有効
                return m;
            });
            renderModifierTable();
        },
        resetModifierForm: cancelEdit
    };
};
