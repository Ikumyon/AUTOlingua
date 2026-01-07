// js/glossaryManager.js

import { escapeHTML } from './tableFilter.js'; // escapeHTML関数をインポート

/**
 * 用語集を管理するモジュール
 * @param {object} options - オプションオブジェクト
 * @param {HTMLElement} options.glossaryTableBody - 用語集テーブルのtbody要素
 * @param {HTMLElement} options.glossaryPosInput - 品詞入力要素
 * @param {HTMLElement} options.glossaryOriginalInput - 原文入力要素
 * @param {HTMLElement} options.glossaryOriginalAltInput - 他形態入力要素
 * @param {HTMLElement} options.glossaryTranslationInput - 翻訳文入力要素
 * @param {HTMLElement} options.glossaryNoteInput - ノート入力要素
 * @param {HTMLElement} options.addGlossaryTermButton - 用語追加/保存ボタン
 * @param {HTMLElement} options.cancelGlossaryEditButton - 編集キャンセルボタン
 * @param {HTMLElement} options.glossaryFileDropZone - 用語集ファイルドロップゾーン要素 (追加)
 * @param {HTMLElement} options.glossaryFileInput - 用語集ファイル入力要素 (追加)
 * @param {function} options.alertMessage - アラートメッセージ表示関数
 * @param {function} options.saveSettingsCallback - 設定保存コールバック関数
 */
export const initializeGlossaryManager = ({
    glossaryTableBody,
    glossaryPosInput,
    glossaryOriginalInput,
    glossaryOriginalAltInput,
    glossaryTranslationInput,
    glossaryNoteInput,
    addGlossaryTermButton,
    cancelGlossaryEditButton,
    glossaryFileDropZone, // 追加
    glossaryFileInput,    // 追加
    alertMessage,
    saveSettingsCallback
}) => {

    let glossaryTerms = []; // 用語集を保存する配列
    let editingGlossaryIndex = null; // 編集中の用語のインデックス (nullの場合は新規追加)

    // 品詞の選択肢の定義
    const GLOSSARY_POS_OPTIONS = [
        { value: '', name: '選択してください' },
        { value: 'noun', name: '名詞' },
        { value: 'verb', name: '動詞' },
        { value: 'adjectiv', name: '形容詞' }, // 指示通り 'adjectiv'
        { value: 'adverb', name: '副詞' },
        { value: 'other', name: 'その他' }
    ];

    /**
     * 用語集リストをレンダリングする関数
     */
    const renderGlossaryTerms = () => {
        if (!glossaryTableBody) return;

        glossaryTableBody.innerHTML = ''; // テーブルボディをクリア
        if (glossaryTerms.length === 0) {
            glossaryTableBody.innerHTML = '<tr><td colspan="6" class="py-2 px-4 text-gray-600 text-sm text-center">用語がありません。</td></tr>';
            return;
        }

        glossaryTerms.forEach((term, index) => {
            // 他形態が空の場合でも最低1行は表示
            const altCount = (term.originalAlt && term.originalAlt.length > 0) ? term.originalAlt.length : 1;

            for (let i = 0; i < altCount; i++) {
                const row = document.createElement('tr');
                let rowHtml = '';

                // 品詞の表示名を検索
                const displayPos = GLOSSARY_POS_OPTIONS.find(opt => opt.value === term.pos)?.name || term.pos || '';

                if (i === 0) {
                    // 最初の行は品詞、原文、翻訳文、ノート、アクションを結合して表示
                    rowHtml += `<td class="py-2 px-4 border-b border-gray-200" rowspan="${altCount}">${escapeHTML(displayPos)}</td>`;
                    rowHtml += `<td class="py-2 px-4 border-b border-gray-200" rowspan="${altCount}">${escapeHTML(term.original || '')}</td>`;
                    rowHtml += `<td class="py-2 px-4 border-b border-gray-200 glossary-original-alt-cell">${escapeHTML(term.originalAlt && term.originalAlt[i] ? term.originalAlt[i] : '')}</td>`; // 他形態の最初の要素
                    rowHtml += `<td class="py-2 px-4 border-b border-gray-200" rowspan="${altCount}">${escapeHTML(term.translation || '')}</td>`;
                    rowHtml += `<td class="py-2 px-4 border-b border-gray-200" rowspan="${altCount}">${escapeHTML(term.note || '')}</td>`; // ノートの表示
                    rowHtml += `<td class="py-2 px-4 border-b border-gray-200" rowspan="${altCount}">
                                    <div class="glossary-button-group">
                                        <button class="edit-glossary-button" data-index="${index}">編集</button>
                                        <button class="delete-glossary-button" data-index="${index}">削除</button>
                                    </div>
                                </td>`;
                } else {
                    // 2行目以降は他形態のみ表示
                    rowHtml += `<td class="py-2 px-4 border-b border-gray-200 glossary-original-alt-cell">${escapeHTML(term.originalAlt && term.originalAlt[i] ? term.originalAlt[i] : '')}</td>`;
                }
                row.innerHTML = rowHtml;
                glossaryTableBody.appendChild(row);
            }
        });
    };

    /**
     * 用語集フォームのリセット関数
     */
    const resetGlossaryForm = () => {
        // 品詞ドロップダウンのオプションを生成
        glossaryPosInput.innerHTML = GLOSSARY_POS_OPTIONS.map(opt =>
            `<option value="${escapeHTML(opt.value)}">${escapeHTML(opt.name)}</option>`
        ).join('');

        glossaryPosInput.value = ''; // ドロップダウンの値をリセット
        glossaryOriginalInput.value = '';
        glossaryOriginalAltInput.value = ''; // textareaをクリア
        glossaryTranslationInput.value = '';
        glossaryNoteInput.value = ''; // ノート入力フィールドをクリア
        addGlossaryTermButton.textContent = '用語を追加';
        cancelGlossaryEditButton.classList.add('hidden');
        editingGlossaryIndex = null;
    };

    /**
     * 用語集JSONファイルを読み込む関数
     * @param {File} file - 読み込むファイルオブジェクト
     */
    const readGlossaryFile = (file) => {
        if (!file) {
            alertMessage('ファイルが選択されていません。', 'warning');
            return;
        }

        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const jsonContent = JSON.parse(e.target.result);
                processGlossaryJsonContent(jsonContent);
            } catch (error) {
                console.error('用語集ファイルの処理中にエラーが発生しました:', error);
                alertMessage('用語集ファイルの処理中にエラーが発生しました。JSON形式を確認してください。', 'error');
            }
        };

        reader.onerror = () => {
            alertMessage('用語集ファイルの読み込み中にエラーが発生しました。', 'error');
        };

        reader.readAsText(file);
    };

    /**
     * 用語集JSONの内容を解析して追加する関数
     * @param {Array<object>} jsonContent - JSON形式の用語集データ
     */
    const processGlossaryJsonContent = (jsonContent) => {
        if (!Array.isArray(jsonContent)) {
            alertMessage('JSONファイルは配列である必要があります。', 'error');
            return;
        }

        let newTermsAdded = 0;
        let termsSkipped = 0;

        jsonContent.forEach((item, itemIndex) => {
            // 必要なフィールドを抽出
            // JSONファイルからの読み込み時は 'term' と 'variants' を想定
            const original = item.term ? String(item.term).trim() : ''; // 'term'を'original'にマッピング
            const translation = item.translation ? String(item.translation).trim() : '';
            const pos = item.pos ? String(item.pos).trim() : ''; // 品詞は文字列としてそのまま取得
            const note = item.note ? String(item.note).trim() : ''; // ノート入力フィールド
            // variantsは配列として取得し、originalAltにマッピング
            const originalAlt = Array.isArray(item.variants) ? item.variants.map(v => String(v).trim()).filter(v => v !== '') : [];


            // 原文が空でないことを確認
            if (!original) {
                console.warn(`Skipping empty original term in JSON item ${itemIndex + 1}:`, item);
                termsSkipped++;
                return;
            }

            // 品詞が定義済みのオプションに含まれているかチェック (空文字列も許可)
            if (pos !== '' && !GLOSSARY_POS_OPTIONS.some(option => option.value === pos)) {
                console.warn(`Skipping term with invalid POS in JSON item ${itemIndex + 1}: "${pos}" is not a valid part of speech.`, item);
                termsSkipped++;
                return;
            }

            // 重複チェック (原文でチェック)
            const isDuplicate = glossaryTerms.some((term, idx) =>
                idx !== editingGlossaryIndex && term.original.toLowerCase() === original.toLowerCase()
            );
            if (isDuplicate) {
                console.warn(`Skipping duplicate original term in JSON item ${itemIndex + 1}: "${original}"`);
                termsSkipped++;
                return;
            }

            // glossaryTermsは'original'と'originalAlt'プロパティを持つ形式で保存
            glossaryTerms.push({ pos, original, originalAlt, translation, note }); // noteを追加
            newTermsAdded++;
        });

        if (newTermsAdded > 0) {
            saveSettingsCallback(); // 用語集を保存
            renderGlossaryTerms(); // リストを更新
            alertMessage(`${newTermsAdded}件の用語を追加しました。${termsSkipped > 0 ? `(${termsSkipped}件の用語をスキップしました。)` : ''}`, 'success');
        } else if (termsSkipped > 0) {
            alertMessage(`用語集ファイルから有効な用語が見つかりませんでした。${termsSkipped}件の用語をスキップしました。`, 'warning');
        } else {
            alertMessage('用語集ファイルから追加できる用語が見つかりませんでした。', 'info');
        }
    };

    /**
     * 用語集をJSONファイルとしてダウンロードする関数
     */
    const downloadGlossary = () => {
        if (glossaryTerms.length === 0) {
            alertMessage("ダウンロードする用語集がありません。", 'warning');
            return;
        }

        // ダウンロード用にプロパティ名を変更した新しい配列を作成
        const glossaryForDownload = glossaryTerms.map(term => ({
            term: term.original,       // 'original' を 'term' に変更
            translation: term.translation,
            pos: term.pos,
            variants: term.originalAlt, // 'originalAlt' を 'variants' に変更
            note: term.note
        }));

        // JSONデータを整形して文字列に変換
        const jsonContent = JSON.stringify(glossaryForDownload, null, 2);

        const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        const date = new Date();
        const dateString = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
        a.download = `glossary_${dateString}.json`; // ファイル名を自動生成

        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url); // オブジェクトURLを解放
        alertMessage("用語集をダウンロードしました。", 'success');
    };

    // --- イベントリスナーの設定 ---
    // 用語集追加/編集ボタンのイベント
    if (addGlossaryTermButton) {
        addGlossaryTermButton.addEventListener('click', () => {
            const pos = glossaryPosInput.value.trim();
            const original = glossaryOriginalInput.value.trim();
            // 他形態はtextareaから取得し、改行で分割して配列として保存
            const originalAlt = glossaryOriginalAltInput.value.trim().split('\n').map(item => item.trim()).filter(item => item !== '');
            const translation = glossaryTranslationInput.value.trim();
            const note = glossaryNoteInput.value.trim(); // ノートの値を取得

            if (!pos || !original || !translation) {
                alertMessage('品詞、原文、翻訳文は必須項目です。', 'warning');
                return;
            }

            // 品詞が定義済みのオプションに含まれているかチェック
            if (!GLOSSARY_POS_OPTIONS.some(option => option.value === pos)) {
                alertMessage('選択された品詞は無効です。', 'warning');
                return;
            }

            // 重複チェック (原文でチェック)
            const isDuplicate = glossaryTerms.some((term, idx) =>
                idx !== editingGlossaryIndex && term.original.toLowerCase() === original.toLowerCase()
            );
            if (isDuplicate) {
                alertMessage('その原文は既に用語集に存在します。', 'warning');
                return;
            }

            if (editingGlossaryIndex !== null) {
                // 編集モード
                glossaryTerms[editingGlossaryIndex] = { pos, original, originalAlt, translation, note }; // noteを追加
                alertMessage('用語を更新しました。', 'success');
            } else {
                // 新規追加モード
                glossaryTerms.push({ pos, original, originalAlt, translation, note }); // noteを追加
                alertMessage('新しい用語を追加しました。', 'success');
            }

            saveSettingsCallback(); // 用語集はlocalStorageに保存
            renderGlossaryTerms(); // リストを更新
            resetGlossaryForm(); // フォームをリセット
        });
    }

    // 用語集編集キャンセルボタンのイベント
    if (cancelGlossaryEditButton) {
        cancelGlossaryEditButton.addEventListener('click', resetGlossaryForm);
    }

    // 用語集削除/編集ボタンのイベント委譲
    if (glossaryTableBody) {
        glossaryTableBody.addEventListener('click', (e) => {
            if (e.target.classList.contains('delete-glossary-button')) {
                const indexToDelete = parseInt(e.target.dataset.index);
                if (!isNaN(indexToDelete) && indexToDelete >= 0 && indexToDelete < glossaryTerms.length) {
                    const termOriginal = glossaryTerms[indexToDelete].original;
                    // window.confirm の代わりにカスタムアラートを使用
                    if (confirm(`用語「${termOriginal}」を削除してもよろしいですか？`)) {
                        glossaryTerms.splice(indexToDelete, 1);
                        saveSettingsCallback(); // localStorageに保存
                        renderGlossaryTerms();
                        alertMessage(`用語「${termOriginal}」を削除しました。`, 'success');
                        resetGlossaryForm(); // フォームをリセット
                    }
                }
            } else if (e.target.classList.contains('edit-glossary-button')) {
                const indexToEdit = parseInt(e.target.dataset.index);
                if (!isNaN(indexToEdit) && indexToEdit >= 0 && indexToEdit < glossaryTerms.length) {
                    editingGlossaryIndex = indexToEdit;
                    const termToEdit = glossaryTerms[indexToEdit];
                    
                    // 品詞ドロップダウンのオプションを生成
                    glossaryPosInput.innerHTML = GLOSSARY_POS_OPTIONS.map(opt =>
                        `<option value="${escapeHTML(opt.value)}">${escapeHTML(opt.name)}</option>`
                    ).join('');
                    glossaryPosInput.value = termToEdit.pos; // ドロップダウンの値を設定
                    
                    glossaryOriginalInput.value = termToEdit.original;
                    // textareaには配列を改行で結合して文字列として設定
                    glossaryOriginalAltInput.value = Array.isArray(termToEdit.originalAlt) ? termToEdit.originalAlt.join('\n') : '';
                    glossaryTranslationInput.value = termToEdit.translation;
                    glossaryNoteInput.value = termToEdit.note || ''; // ノートの値を設定
                    addGlossaryTermButton.textContent = '変更を保存';
                    cancelGlossaryEditButton.classList.remove('hidden');
                    alertMessage(`用語「${termToEdit.original}」を編集モードにしました。`, 'info');
                }
            }
        });
    }

    // --- 用語集ファイルドロップゾーンのイベントリスナー (追加) ---
    if (glossaryFileDropZone && glossaryFileInput) {
        // ドラッグオーバー時の処理
        glossaryFileDropZone.addEventListener('dragover', (e) => {
            e.preventDefault(); // デフォルトの動作をキャンセル
            e.stopPropagation();
            glossaryFileDropZone.classList.add('border-blue-500', 'bg-blue-50'); // UIのフィードバック
        });

        // ドラッグリーブ時の処理
        glossaryFileDropZone.addEventListener('dragleave', (e) => {
            e.preventDefault(); // デフォルトの動作をキャンセル
            e.stopPropagation();
            glossaryFileDropZone.classList.remove('border-blue-500', 'bg-blue-50'); // UIのフィードバックを削除
        });

        // ドロップ時の処理
        glossaryFileDropZone.addEventListener('drop', (e) => {
            e.preventDefault(); // デフォルトの動作をキャンセル
            e.stopPropagation();
            glossaryFileDropZone.classList.remove('border-blue-500', 'bg-blue-50'); // UIのフィードバックを削除

            const files = e.dataTransfer.files;
            if (files.length > 0) {
                readGlossaryFile(files[0]); // readGlossaryFile関数を呼び出す
            } else {
                alertMessage('ドロップされたファイルがありません。', 'warning');
            }
        });

        // ドロップゾーンクリックでファイル選択ダイアログを開く
        glossaryFileDropZone.addEventListener('click', () => {
            glossaryFileInput.click();
        });

        // ファイル入力（input type="file"）が変更された時の処理
        glossaryFileInput.addEventListener('change', (e) => {
            const files = e.target.files;
            if (files.length > 0) {
                readGlossaryFile(files[0]); // readGlossaryFile関数を呼び出す
            } else {
                alertMessage('ファイルが選択されていません。', 'warning');
            }
        });
    }

    // 公開するAPI
    return {
        getGlossaryTerms: () => glossaryTerms,
        setGlossaryTerms: (terms) => {
            glossaryTerms = terms;
            renderGlossaryTerms();
        },
        renderGlossaryTerms,
        resetGlossaryForm,
        readGlossaryFile,
        downloadGlossary,
        processGlossaryJsonContent // 外部からJSONコンテンツを処理できるように公開
    };
};
