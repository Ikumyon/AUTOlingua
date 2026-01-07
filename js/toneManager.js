// js/toneManager.js

import { escapeHTML } from './tableFilter.js';

/**
 * カスタム口調を管理するモジュール
 * @param {object} options - オプションオブジェクト
 * @param {HTMLElement} options.newToneNameInput - 新しい口調名入力要素
 * @param {HTMLElement} options.conditionalToneCheckbox - 条件付き口調チェックボックス
 * @param {HTMLElement} options.conditionalToneFields - 条件付き口調のUIコンテナ
 * @param {HTMLElement} options.conditionalToneList - 条件付き口調のリストコンテナ
 * @param {HTMLElement} options.addConditionButton - 更に条件追加ボタン
 * @param {HTMLElement} options.elseToneInstructionTextarea - それら上記以外の口調入力要素
 * @param {HTMLElement} options.newToneInstructionTextarea - 通常口調用指示文入力要素
 * @param {HTMLElement} options.addCustomToneButton - 口調追加/保存ボタン
 * @param {HTMLElement} options.cancelEditButton - 口調編集キャンセルボタン
 * @param {HTMLElement} options.customToneList - カスタム口調表示リスト
 * @param {HTMLElement} options.globalToneSelect - 全体口調設定ドロップダウン
 * @param {HTMLElement} options.defaultToneSelect - デフォルト口調設定ドロップダウン (設定モーダル内)
 * @param {HTMLElement} options.dataTable - メインのデータテーブル要素 (個別口調ドロップダウン更新用)
 * @param {function} options.alertMessage - アラートメッセージ表示関数
 * @param {function} options.saveSettingsCallback - 設定保存コールバック関数
 * @param {function} options.updateToneFilterOptions - フィルターの口調オプション更新関数
 */
export const initializeToneManager = ({
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
    dataTable, // 個別口調ドロップダウン更新のために追加
    alertMessage,
    saveSettingsCallback,
    updateToneFilterOptions // フィルターの口調オプション更新関数を追加
}) => {

    let customTones = []; // カスタム口調を保存する配列
    let editingToneIndex = null; // 編集中の口調のインデックス (nullの場合は新規追加)

    const CONDITIONAL_TONE_SUFFIX = '-条件付き口調'; // 条件付き口調のサフィックス

    /**
     * 口調ドロップダウンのオプションHTMLを生成する共通関数
     * @param {Array<object>} tones - 口調の配列
     * @param {boolean} includeDefaultOption - 「全体設定に沿う」オプションを含めるか
     * @returns {string} オプションのHTML文字列
     */
    const createToneOptionsHtml = (tones, includeDefaultOption = false) => {
        let optionsHtml = '';
        if (includeDefaultOption) {
            optionsHtml += '<option value="default">全体設定に沿う</option>';
        }
        tones.forEach(tone => {
            optionsHtml += `<option value="${escapeHTML(tone.value)}">${escapeHTML(tone.name)}</option>`;
        });
        return optionsHtml;
    };

    /**
     * 口調ドロップダウンを動的に生成する関数
     */
    const populateToneDropdowns = () => {
        // customTones配列には通常の口調と条件付き口調の両方が含まれる
        const allTones = [
            ...customTones.map(tone => ({ value: tone.value, name: tone.name, instruction: tone.instruction }))
        ];

        // 全体口調設定ドロップダウンを更新
        globalToneSelect.innerHTML = createToneOptionsHtml(allTones);
        // 保存されているデフォルト口調があれば選択
        const savedDefaultTone = localStorage.getItem('translationAppSettings') ? JSON.parse(localStorage.getItem('translationAppSettings')).defaultTone : 'da_dearu';
        globalToneSelect.value = savedDefaultTone;

        // デフォルト口調設定ドロップダウンも更新
        if (defaultToneSelect) { // 要素が存在するかチェック
            defaultToneSelect.innerHTML = createToneOptionsHtml(allTones);
            defaultToneSelect.value = savedDefaultTone; // 設定モーダル内のデフォルト口調も更新
        }

        // 個別口調設定ドロップダウンを更新
        const individualSelects = dataTable.querySelectorAll('.individual-tone-select');
        individualSelects.forEach(selectElement => {
            selectElement.innerHTML = createToneOptionsHtml(allTones, true); // 個別設定には「全体設定に沿う」オプションを追加
        });

        // フィルター機能の口調ドロップダウンも更新
        if (updateToneFilterOptions) {
            updateToneFilterOptions(allTones);
        }

        // カスタム口調リストを更新 (タブ3の内容)
        renderCustomToneList();
    };

    /**
     * カスタム口調リストをレンダリングする関数
     */
    const renderCustomToneList = () => {
        if (!customToneList) return; // 要素がない場合は何もしない

        customToneList.innerHTML = ''; // リストをクリア
        if (customTones.length === 0) {
            customToneList.innerHTML = '<li class="text-gray-600 text-sm">カスタム口調がありません。</li>';
            return;
        }
        customTones.forEach((tone, index) => {
            const listItem = document.createElement('li');
            listItem.className = 'custom-tone-item';
            listItem.innerHTML = `
                <span class="tone-name">${escapeHTML(tone.name)}</span>
                ${tone.isConditional ? '<span class="text-blue-500 text-xs ml-2">[条件付き]</span>' : ''}
                <div class="button-group">
                    <button class="edit-tone-button" data-index="${index}">編集</button>
                    <button class="delete-tone-button" data-index="${index}">削除</button>
                </div>
            `;
            customToneList.appendChild(listItem);
        });
    };

    /**
     * 口調編集フォームのリセット関数
     */
    const resetToneForm = () => {
        newToneNameInput.value = '';
        newToneInstructionTextarea.value = '';
        conditionalToneCheckbox.checked = false; // チェックボックスをオフにする
        conditionalToneFields.classList.add('hidden'); // 条件付き口調のフィールドを非表示にする
        conditionalToneList.innerHTML = ''; // 条件リストをクリア
        elseToneInstructionTextarea.value = ''; // それら上記以外の口調をクリア
        newToneInstructionTextarea.classList.remove('hidden'); // 通常口調のテキストエリアを表示
        addCustomToneButton.textContent = '口調を追加';
        cancelEditButton.classList.add('hidden');
        editingToneIndex = null;
    };

    /**
     * 条件付き口調の条件フィールドを追加する関数
     * @param {string} condition - 条件の正規表現文字列
     * @param {string} instruction - 指示文
     */
    const addConditionalToneField = (condition = '', instruction = '') => {
        const conditionDiv = document.createElement('div');
        conditionDiv.className = 'conditional-tone-item p-3 border border-gray-200 rounded-lg bg-gray-100 relative';
        conditionDiv.innerHTML = `
            <div class="mb-2">
                <label class="block text-gray-700 text-sm font-bold mb-1">条件 (正規表現、例: "title" または "EVENT_.*"):</label>
                <input type="text" class="condition-regex-input shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" placeholder="例: title" value="${escapeHTML(condition)}">
            </div>
            <div>
                <label class="block text-gray-700 text-sm font-bold mb-1">指定する口調:</label>
                <textarea rows="2" class="instruction-textarea shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline resize-y" placeholder="例: 語尾は「です、ます」調にしてください。">${escapeHTML(instruction)}</textarea>
            </div>
            <button class="delete-condition-button absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full text-xs leading-none hover:bg-red-600 transition-colors duration-300" title="この条件を削除">
                &times;
            </button>
        `;
        conditionalToneList.appendChild(conditionDiv);
    };


    // --- イベントリスナーの設定 ---

    // 条件付き口調チェックボックスのイベント
    if (conditionalToneCheckbox) {
        conditionalToneCheckbox.addEventListener('change', () => {
            if (conditionalToneCheckbox.checked) {
                conditionalToneFields.classList.remove('hidden');
                newToneInstructionTextarea.classList.add('hidden'); // 通常口調のテキストエリアを非表示
                if (conditionalToneList.children.length === 0) { // 条件が一つもなければ追加
                    addConditionalToneField();
                }
            } else {
                conditionalToneFields.classList.add('hidden');
                newToneInstructionTextarea.classList.remove('hidden'); // 通常口調のテキストエリアを表示
            }
        });
    }

    // 更に条件追加ボタンのイベント
    if (addConditionButton) {
        addConditionButton.addEventListener('click', () => {
            addConditionalToneField();
        });
    }

    // 条件削除ボタンのイベント委譲
    if (conditionalToneList) {
        conditionalToneList.addEventListener('click', (e) => {
            if (e.target.classList.contains('delete-condition-button')) {
                const itemToRemove = e.target.closest('.conditional-tone-item');
                if (itemToRemove) {
                    itemToRemove.remove();
                }
            }
        });
    }


    // カスタム口調追加/編集ボタンのイベント
    if (addCustomToneButton) {
        addCustomToneButton.addEventListener('click', () => {
            let name = newToneNameInput.value.trim();
            const isConditional = conditionalToneCheckbox.checked;
            let instruction = '';
            let conditions = [];
            let elseInstruction = '';

            if (isConditional) {
                // 条件付き口調の場合
                const conditionItems = conditionalToneList.querySelectorAll('.conditional-tone-item');
                if (conditionItems.length === 0) {
                    alertMessage('条件付き口調には少なくとも1つの条件が必要です。', 'warning');
                    return;
                }
                let hasInvalidRegex = false;
                conditionItems.forEach(item => {
                    const conditionInput = item.querySelector('.condition-regex-input'); // 正規表現入力フィールド
                    const instructionTextarea = item.querySelector('.instruction-textarea');
                    if (conditionInput && instructionTextarea && conditionInput.value.trim() && instructionTextarea.value.trim()) {
                        try {
                            new RegExp(conditionInput.value.trim()); // 正規表現の有効性をチェック
                            conditions.push({
                                condition: conditionInput.value.trim(), // conditionRegexからconditionに変更
                                instruction: instructionTextarea.value.trim()
                            });
                        } catch (e) {
                            alertMessage(`無効な正規表現です: ${conditionInput.value.trim()} - ${e.message}`, 'error');
                            hasInvalidRegex = true;
                        }
                    }
                });
                if (hasInvalidRegex) return; // 無効な正規表現があれば処理を中断

                if (conditions.length === 0) {
                    alertMessage('有効な条件と口調のペアを入力してください。', 'warning');
                    return;
                }
                elseInstruction = elseToneInstructionTextarea.value.trim();
                // 条件付き口調の場合、名前にサフィックスを自動で付与
                if (!name.endsWith(CONDITIONAL_TONE_SUFFIX)) {
                    name += CONDITIONAL_TONE_SUFFIX;
                }
            } else {
                // 通常口調の場合
                instruction = newToneInstructionTextarea.value.trim();
                if (!instruction) {
                    alertMessage('AIへの指示文を入力してください。', 'warning');
                    return;
                 }
                 // 通常口調の場合、サフィックスがあれば削除
                if (name.endsWith(CONDITIONAL_TONE_SUFFIX)) {
                    name = name.substring(0, name.length - CONDITIONAL_TONE_SUFFIX.length);
                }
            }

            if (!name) {
                alertMessage('口調名を入力してください。', 'warning');
                return;
            }

            const value = name.replace(/\s+/g, '_').toLowerCase();

            if (editingToneIndex !== null) {
                // 編集モードの場合
                // 編集中の口調以外の口調との重複をチェック
                const isDuplicate = customTones.some((tone, idx) =>
                    idx !== editingToneIndex && tone.value === value
                );
                if (isDuplicate) {
                    alertMessage('その口調名は既に存在します。別の名前を使用してください。', 'warning');
                    return;
                }
                customTones[editingToneIndex] = { value, name, instruction, isConditional, conditions, elseInstruction };
                alertMessage('口調を更新しました。', 'success');
            } else {
                // 新規追加モードの場合
                const isDuplicate = customTones.some(t => t.value === value);
                if (isDuplicate) {
                    alertMessage('その口調名は既に存在します。別の名前を使用してください。', 'warning');
                    return;
                }
                customTones.push({ value, name, instruction, isConditional, conditions, elseInstruction });
                alertMessage('新しい口調を追加しました。', 'success');
            }

            saveSettingsCallback(); // 口調はlocalStorageに保存
            populateToneDropdowns();
            resetToneForm(); // フォームをリセット
        });
    }

    // 編集キャンセルボタンのイベント
    if (cancelEditButton) {
        cancelEditButton.addEventListener('click', resetToneForm);
    }

    // カスタム口調削除/編集ボタンのイベント委譲
    if (customToneList) {
        customToneList.addEventListener('click', (e) => {
            if (e.target.classList.contains('delete-tone-button')) {
                const indexToDelete = parseInt(e.target.dataset.index);
                if (!isNaN(indexToDelete) && indexToDelete >= 0 && indexToDelete < customTones.length) {
                    const toneName = customTones[indexToDelete].name;
                    // window.confirm の代わりにカスタムアラートを使用
                    if (confirm(`「${toneName}」を削除してもよろしいですか？`)) {
                        customTones.splice(indexToDelete, 1);
                        saveSettingsCallback(); // 口調はlocalStorageに保存
                        populateToneDropdowns();
                        alertMessage(`${toneName} を削除しました。`, 'success');
                        resetToneForm(); // 削除後もフォームをリセット
                    }
                }
            } else if (e.target.classList.contains('edit-tone-button')) {
                const indexToEdit = parseInt(e.target.dataset.index);
                if (!isNaN(indexToEdit) && indexToEdit >= 0 && indexToEdit < customTones.length) {
                    editingToneIndex = indexToEdit;
                    const toneToEdit = customTones[indexToEdit];
                    // 名前のサフィックスを編集時に削除して表示
                    let displayName = toneToEdit.name;
                    if (displayName.endsWith(CONDITIONAL_TONE_SUFFIX)) {
                        displayName = displayName.substring(0, displayName.length - CONDITIONAL_TONE_SUFFIX.length);
                    }
                    newToneNameInput.value = displayName;

                    conditionalToneCheckbox.checked = toneToEdit.isConditional || false; // チェックボックスの状態を復元

                    if (toneToEdit.isConditional) {
                        conditionalToneFields.classList.remove('hidden');
                        newToneInstructionTextarea.classList.add('hidden');
                        conditionalToneList.innerHTML = ''; // 一度クリア
                        toneToEdit.conditions.forEach(cond => {
                            addConditionalToneField(cond.condition, cond.instruction); // conditionRegexからconditionに変更
                        });
                        elseToneInstructionTextarea.value = toneToEdit.elseInstruction || '';
                    } else {
                        conditionalToneFields.classList.add('hidden');
                        newToneInstructionTextarea.classList.remove('hidden');
                        newToneInstructionTextarea.value = toneToEdit.instruction;
                    }

                    addCustomToneButton.textContent = '変更を保存';
                    cancelEditButton.classList.remove('hidden');
                    alertMessage(`「${toneToEdit.name}」を編集モードにしました。`, 'info');
                }
            }
        });
    }

    // 公開するAPI
    return {
        getCustomTones: () => customTones,
        setCustomTones: (tones) => {
            customTones = tones;
            populateToneDropdowns();
        },
        populateToneDropdowns,
        resetToneForm,
        renderCustomToneList, // ここを追加
        CONDITIONAL_TONE_SUFFIX // 外部からも参照できるように公開
    };
};
