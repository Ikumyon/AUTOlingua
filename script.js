// script.js

document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const tableContainer = document.getElementById('table-container');
    const dataTable = document.getElementById('data-table');
    const errorMessage = document.getElementById('error-message');
    const translateAllButton = document.getElementById('translate-all-button');
    const translateAllProgressBar = document.getElementById('translate-all-progress-bar'); // プログレスバー要素
    const globalToneSelect = document.getElementById('tone-select'); // 全体口調設定ドロップダウン
    const translatedFileDownloadSection = document.getElementById('translated-file-download-section'); // 翻訳済みファイルダウンロードセクション
    const translationProgress = document.getElementById('translation-progress'); // 翻訳進捗表示要素

    // 設定モーダル関連の要素
    const settingsButton = document.getElementById('settings-button');
    const settingsModal = document.getElementById('settings-modal');
    const closeSettingsButton = document.getElementById('close-settings-button'); // モーダル内の閉じるボタン
    const saveSettingsButton = document.getElementById('save-settings-button'); // モーダル内の保存ボタン

    // タブ関連の要素
    const tab1Button = document.getElementById('tab1-button');
    const tab2Button = document.getElementById('tab2-button');
    const tab3Button = document.getElementById('tab3-button'); // タブ3ボタン
    const glossaryTabButton = document.getElementById('glossary-tab-button'); // 用語集タブボタン
    const modifierTabButton = document.getElementById('modifier-tab-button'); // 新しい修飾文字タブボタン

    const tab1Content = document.getElementById('tab1-content'); // APIキー
    const tab2Content = document.getElementById('tab2-content'); // デフォルト口調
    const tab3Content = document.getElementById('tab3-content'); // 口調カスタマイズ
    const glossaryTabContent = document.getElementById('glossary-tab-content'); // 用語集タブコンテンツ
    const modifierTabContent = document.getElementById('modifier-tab-content'); // 新しい修飾文字タブコンテンツ

    // APIキーとデフォルト口調設定の要素（タブコンテンツ内に移動）
    const apiKeyInput = document.getElementById('api-key-input');
    const defaultToneSelect = document.getElementById('default-tone-select');

    // 口調カスタマイズ関連の要素
    const newToneNameInput = document.getElementById('new-tone-name');
    const conditionalToneCheckbox = document.getElementById('conditional-tone-checkbox'); // 条件付き口調チェックボックス
    const conditionalToneFields = document.getElementById('conditional-tone-fields'); // 条件付き口調のUIコンテナ
    const conditionalToneList = document.getElementById('conditional-tone-list'); // 条件付き口調のリストコンテナ
    const addConditionButton = document.getElementById('add-condition-button'); // 更に条件追加ボタン
    const elseToneInstructionTextarea = document.getElementById('else-tone-instruction'); // それら上記以外の口調
    const newToneInstructionTextarea = document.getElementById('new-tone-instruction'); // 通常口調用
    const addCustomToneButton = document.getElementById('add-custom-tone-button');
    const cancelEditButton = document.getElementById('cancel-edit-button'); // 口調編集キャンセルボタン
    const customToneList = document.getElementById('custom-tone-list');

    // 用語集関連の要素
    const glossaryPosInput = document.getElementById('glossary-pos');
    const glossaryOriginalInput = document.getElementById('glossary-original');
    const glossaryOriginalAltInput = document.getElementById('glossary-original-alt'); // textareaに変更
    const glossaryTranslationInput = document.getElementById('glossary-translation');
    const glossaryNoteInput = document.getElementById('glossary-note'); // ノート入力フィールド
    const addGlossaryTermButton = document.getElementById('add-glossary-term-button');
    const cancelGlossaryEditButton = document.getElementById('cancel-glossary-edit-button');
    const glossaryTableBody = document.getElementById('glossary-table-body');
    const glossaryFileDropZone = document.getElementById('glossary-file-drop-zone'); // 用語集ファイルドロップゾーン
    const glossaryFileInput = document.getElementById('glossary-file-input'); // 用語集ファイル入力
    const clearGlossaryButton = document.getElementById('clear-glossary-button'); // 用語集全削除ボタン

    // 修飾文字関連の要素 (新規追加)
    const modifierNameInput = document.getElementById('modifier-name-input');
    const modifierRegexInput = document.getElementById('modifier-regex-input');
    const addModifierButton = document.getElementById('add-modifier-button');
    const resetModifierButton = document.getElementById('reset-modifier-button'); // デフォルトにリセットボタン
    const cancelModifierEditButton = document.getElementById('cancel-modifier-edit-button');

    // YMLダウンロード関連の要素
    const filePrefixSelect = document.getElementById('file-prefix-select'); // ファイル先頭設定ドロップダウン
    const downloadTranslatedYmlButton = document.getElementById('download-translated-yml-button'); // 翻訳済みYMLダウンロードボタン
    const downloadLogButton = document.getElementById('download-log-button'); // ログダウンロードボタン (移動)

    // 作者情報モーダル関連の要素
    const appLogo = document.getElementById('app-logo'); // ロゴ要素
    const aboutModal = document.getElementById('about-modal'); // 作者情報モーダル
    const closeAboutButton = document.getElementById('close-about-button'); // 作者情報モーダル内の閉じるボタン

    // 校閲モード関連の要素
    const reviewModeCheckbox = document.getElementById('review-mode-checkbox'); // 校閲モードチェックボックス

    let currentApiKey = ""; // 翻訳に使用するAPIキー (localStorageで管理)
    let customTones = []; // カスタム口調を保存する配列
    let editingToneIndex = null; // 編集中の口調のインデックス (nullの場合は新規追加)
    let translationLog = []; // 翻訳ログを保存する配列
    let glossaryTerms = []; // 用語集を保存する配列
    let editingGlossaryIndex = null; // 編集中の用語のインデックス (nullの場合は新規追加)
    let modifierCharacters = []; // 修飾文字を保存する配列 (新規追加)
    let editingModifierIndex = null; // 編集中の修飾文字のインデックス (新規追加)
    let currentFileName = ''; // 現在読み込まれているファイル名
    let isReviewModeEnabled = false; // 校閲モードの状態

    // デフォルトの修飾文字正規表現
    const DEFAULT_MODIFIER_REGEX = '@?[\\[@\\$\\£][\\w|\\.%@\\+]*[\\w\\]\\£\\$]';
    // 条件付き口調のサフィックス
    const CONDITIONAL_TONE_SUFFIX = '-条件付き口調';

    // ランダムな文字列を生成するヘルパー関数
    const generateRandomString = (length) => {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        return result;
    };

    // エラーメッセージを表示する関数
    const showErrorMessage = (message) => {
        errorMessage.textContent = message;
        errorMessage.classList.remove('hidden');
        tableContainer.classList.add('hidden'); // テーブルを非表示にする
        translateAllButton.classList.add('hidden'); // 「すべて翻訳」ボタンも非表示にする
        translatedFileDownloadSection.classList.add('hidden'); // 翻訳済みファイルダウンロードセクションも非表示
        translationProgress.classList.add('hidden'); // 進捗表示も非表示
    };

    // エラーメッセージを非表示にする関数
    const hideErrorMessage = () => {
        errorMessage.classList.add('hidden');
        errorMessage.textContent = '';
    };

    // --- ヘルパー関数: テキストが日本語を含むか判定 ---
    const isJapaneseText = (text) => {
        // ひらがな、カタカナ、一般的な漢字の範囲をチェック
        const japaneseRegex = /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}\u3005-\u3006\u3000-\u303F\uFF00-\uFFEF]/u;
        return japaneseRegex.test(text);
    };

    // テキストを翻訳する非同期関数
    const translateText = async (originalText, key, selectedToneValue) => { // key 引数を追加
        if (!originalText || originalText.trim() === '') {
            return { translatedText: '', status: 'Success', errorMessage: '', preModifiedText: '', postRestoredText: '' }; // 空のテキストは翻訳しない
        }

        let toneInstruction = '';
        let glossaryInstructions = ''; // 用語集からの指示を追加する変数

        // 1. 原文に用語集から該当する用語を全て抜きだす。
        // 2. 抜き出した用語データをAIに渡し、原文を用語集に合った翻訳をするように指示
        const lowerCaseText = originalText.toLowerCase();
        glossaryTerms.forEach(term => {
            const lowerCaseOriginal = term.original.toLowerCase();
            const matchingAlts = term.originalAlt.filter(alt => lowerCaseText.includes(alt.toLowerCase()));

            if (lowerCaseText.includes(lowerCaseOriginal) || matchingAlts.length > 0) {
                // 原文または他形態がテキストに含まれている場合、指示に追加
                glossaryInstructions += `原文中の「${term.original}」`;
                if (matchingAlts.length > 0) {
                    glossaryInstructions += `またはその派生形（${matchingAlts.join(', ')}）`;
                }
                glossaryInstructions += `は必ず「${term.translation}」と翻訳してください。`;
                if (term.note) {
                    glossaryInstructions += `（ノート: ${term.note}）`;
                }
                glossaryInstructions += '\n';
            }
        });

        // 口調の決定ロジック
        // selectedToneValueが'default'の場合、globalToneSelectの現在の値を使用
        let effectiveToneValue = selectedToneValue;
        if (selectedToneValue === 'default') {
            effectiveToneValue = globalToneSelect.value;
        }

        const selectedTone = customTones.find(t => t.value === effectiveToneValue);

        if (selectedTone) {
            if (selectedTone.isConditional) {
                // 条件付き口調の場合
                let matchedConditions = [];
                let finalConditionalInstruction = '';

                for (const cond of selectedTone.conditions) {
                    try {
                        // 条件を正規表現として評価
                        const regex = new RegExp(cond.condition);
                        if (regex.test(key)) { // 文章キーに対して正規表現をテスト
                            matchedConditions.push(cond);
                        }
                    } catch (e) {
                        console.error(`Invalid regex for condition "${cond.condition}":`, e);
                        // 無効な正規表現はマッチしないとみなすか、エラーとして処理
                    }
                }

                if (matchedConditions.length > 1) {
                    // 複数の条件がマッチした場合のエラー
                    const matchedConditionsStr = matchedConditions.map(c => c.condition).join(', ');
                    const errorMsg = `条件付き口調の条件が複数マッチしました (キー: "${key}", マッチした条件: ${matchedConditionsStr})。設定を見直してください。`;
                    return { translatedText: '翻訳エラー', status: 'Error', errorMessage: errorMsg, preModifiedText: originalText, postRestoredText: 'N/A' };
                } else if (matchedConditions.length === 1) {
                    // 単一の条件がマッチした場合
                    finalConditionalInstruction = matchedConditions[0].instruction;
                } else {
                    // どの条件にもマッチしなかった場合 (elseに相当)
                    finalConditionalInstruction = selectedTone.elseInstruction || '';
                }
                toneInstruction = finalConditionalInstruction;

            } else {
                // 通常の口調の場合
                toneInstruction = selectedTone.instruction;
            }
        } else {
            // 'default' またはカスタム口調が見つからない場合のフォールバック
            // ロード時にデフォルト口調が追加されるため、基本的にはここには来ないはずですが念のため
            toneInstruction = '自称は「我ら」を使用し、語尾は「である」または「だ」調にしてください。';
        }

        let finalTranslatedText = '';
        let translationStatus = 'Success';
        let errorMessageForLog = '';
        let preModifiedText = originalText; // 修飾文字置換前のテキスト
        let postRestoredText = ''; // 修飾文字復元後のテキスト

        // --- 修飾文字の事前処理 ---
        let modifiedText = originalText;
        let matchResults = []; // [元の文字列, 置き換え文字] を保存する二次元配列

        if (modifierCharacters.length > 0 && modifierCharacters[0].regex) {
            try {
                // グローバルマッチを有効にするため 'g' フラグを追加
                const modifierRegex = new RegExp(modifierCharacters[0].regex, 'g');
                let match;
                // text を直接操作するのではなく、modifiedText を更新
                while ((match = modifierRegex.exec(originalText)) !== null) {
                    const originalMatch = match[0];
                    const placeholder = generateRandomString(5); // ランダムな5文字の文字列を生成
                    matchResults.push([originalMatch, placeholder]);
                    // modifiedText の中でマッチした部分を置き換える
                    modifiedText = modifiedText.split(originalMatch).join(placeholder);
                }
                preModifiedText = modifiedText; // 置換後のテキストをログ用に保存
            } catch (e) {
                console.error("無効な修飾文字正規表現:", e);
                errorMessageForLog = `無効な修飾文字正規表現: ${e.message}`;
                translationStatus = 'Error';
                finalTranslatedText = '翻訳エラー';
                // ここで翻訳を中止するか、エラーとしてログに記録するかは要件による
                // 今回は処理を続行し、正規表現が適用されないものとする
            }
        }
        // --- 事前処理ここまで ---

        if (translationStatus === 'Error') { // 修飾文字の正規表現エラーで停止する場合
            translationLog.push({
                timestamp: new Date().toLocaleString(),
                originalText: originalText,
                selectedTone: selectedToneValue,
                translatedText: finalTranslatedText,
                status: translationStatus,
                errorMessage: errorMessageForLog,
                preModifiedText: preModifiedText,
                postRestoredText: 'N/A' // エラーの場合は復元されない
            });
            return { translatedText: finalTranslatedText, status: translationStatus, errorMessage: errorMessageForLog, preModifiedText: preModifiedText, postRestoredText: 'N/A' };
        }

        try {
            if (!currentApiKey) {
                const msg = 'APIキーが設定されていません。設定モーダルでAPIキーを入力してください。';
                console.warn(msg);
                throw new Error(msg);
            }

            let chatHistory = [];
            // AIへの最終的なプロンプト
            // AIに送るテキストは修飾文字が置き換えられた modifiedText を使用
            const prompt = `以下の英語のテキストを日本語に翻訳してください。翻訳結果のみを返してください。
改行文字（\\n）は原文の通りに翻訳結果にも含めてください。
${toneInstruction}
${glossaryInstructions}
${modifiedText}`;
            chatHistory.push({ role: "user", parts: [{ text: prompt }] });
            const payload = { contents: chatHistory };

            const apiKeyToUse = currentApiKey;

            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKeyToUse}`;

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('APIエラーレスポンス:', errorData);
                let apiErrorMessage = '不明なAPIエラー';
                if (errorData && errorData.error && errorData.error.message) {
                    apiErrorMessage = errorData.error.message;
                } else if (response.status === 400) {
                    apiErrorMessage = 'リクエストが無効です。APIキーが正しいか、リクエスト形式が適切か確認してください。';
                } else if (response.status === 401) {
                    apiErrorMessage = '認証に失敗しました。APIキーが有効か確認してください。';
                } else if (response.status === 403) {
                    apiErrorMessage = 'アクセスが拒否されました。APIキーの権限を確認してください。';
                } else if (response.status === 429) {
                    apiErrorMessage = 'レート制限に達しました。しばらく待ってから再度お試しください。';
                }
                throw new Error(`APIリクエストが失敗しました: ${response.status} ${response.statusText} - ${apiErrorMessage}`);
            }

            const result = await response.json();

            if (result.candidates && result.candidates.length > 0 &&
                result.candidates[0].content && result.candidates[0].content.parts &&
                result.candidates[0].content.parts.length > 0) {
                finalTranslatedText = result.candidates[0].content.parts[0].text;
            } else {
                console.warn('翻訳結果の構造が予期せぬものでした:', result);
                finalTranslatedText = '翻訳失敗';
                translationStatus = 'Error';
                errorMessageForLog = '予期せぬAPIレスポンス構造';
            }
        } catch (error) {
            finalTranslatedText = '翻訳エラー';
            translationStatus = 'Error';
            errorMessageForLog = error.message || '不明なエラー';
            console.error('翻訳中にエラーが発生しました:', error);
        }

        // --- 修飾文字の事後処理（復元） ---
        postRestoredText = finalTranslatedText; // 復元前の翻訳結果を保存
        matchResults.forEach(item => {
            const originalMatch = item[0]; // 元の文字列
            const placeholder = item[1];   // 置き換え文字
            // 翻訳後の文字列から置き換え文字を検索し、元の文字列に戻す
            // placeholderが正規表現の特殊文字を含む可能性があるためエスケープ
            const escapedPlaceholder = placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const placeholderRegex = new RegExp(escapedPlaceholder, 'g');
            postRestoredText = postRestoredText.replace(placeholderRegex, originalMatch);
        });
        finalTranslatedText = postRestoredText; // 最終的な翻訳結果を更新
        // --- 事後処理ここまで ---

        // 翻訳ログに記録
        translationLog.push({
            timestamp: new Date().toLocaleString(),
            originalText: originalText,
            selectedTone: selectedToneValue,
            translatedText: finalTranslatedText,
            status: translationStatus,
            errorMessage: errorMessageForLog,
            preModifiedText: preModifiedText, // 置換後の原文
            postRestoredText: finalTranslatedText // 復元後の翻訳文
        });

        // 翻訳結果、ステータス、エラーメッセージをオブジェクトとして返す
        return { translatedText: finalTranslatedText, status: translationStatus, errorMessage: errorMessageForLog, preModifiedText: preModifiedText, postRestoredText: postRestoredText };
    };

    // 個別の行を翻訳する関数
    const translateRow = async (rowElement) => {
        const keyCell = rowElement.querySelector('td:first-child'); // キーセルを取得
        const originalTextCell = rowElement.querySelector('.original-text-cell');
        const translationCell = rowElement.querySelector('.translation-cell');
        const translateButton = rowElement.querySelector('.translate-button');
        const individualToneSelect = rowElement.querySelector('.individual-tone-select'); // 個別口調設定ドロップダウン
        const reviewCheckbox = rowElement.querySelector('.review-checkbox'); // 校閲チェックボックス

        if (!originalTextCell || !translationCell || !translateButton || !individualToneSelect || !keyCell || !reviewCheckbox) {
            console.error('必要なセルまたはボタン、ドロップダウン、チェックボックスが見つかりません。');
            return;
        }

        const key = keyCell.textContent; // キーを取得
        const originalText = originalTextCell.textContent;
        const selectedIndividualTone = individualToneSelect.value; // 個別設定の口調を取得

        // 翻訳中の状態を設定
        translationCell.textContent = '翻訳中...';
        translateButton.disabled = true; // ボタンを無効化
        translateButton.textContent = '翻訳中...';
        individualToneSelect.disabled = true; // ドロップダウンを無効化
        reviewCheckbox.disabled = true; // チェックボックスを無効化

        try {
            // translateText に key を渡す
            const result = await translateText(originalText, key, selectedIndividualTone);
            if (result.status === 'Error') {
                translationCell.textContent = `翻訳エラー: ${result.errorMessage}`;
                alertMessage(`個別の翻訳エラー: ${result.errorMessage}`, 'error'); // 個別翻訳の場合はアラートを表示
            } else {
                translationCell.textContent = result.translatedText;
                // 翻訳が成功しても自動的にチェックを入れない
                // reviewCheckbox.checked = true; // この行を削除
                // rowElement.dataset.isReviewed = 'true'; // この行を削除
            }
        } catch (error) {
            // translateText内でエラーが処理されるため、基本的にはここには来ないはずですが念のため
            translationCell.textContent = `翻訳エラー: ${error.message || '不明なエラー'}`;
            console.error('個別の翻訳中にエラーが発生しました:', error);
            alertMessage(`個別の翻訳エラー: ${error.message}`, 'error'); // 個別翻訳の場合はアラートを表示
        } finally {
            translateButton.disabled = false; // ボタンを有効化
            translateButton.textContent = '再翻訳';
            individualToneSelect.disabled = false; // ドロップダウンを有効化
            reviewCheckbox.disabled = false; // チェックボックスを有効化
        }
    };

    // ファイルの内容を解析してテーブルを生成する関数
    const processFileContent = async (content) => {
        hideErrorMessage(); // 以前のエラーメッセージをクリア

        // #で始まる行、l_english:で始まる行、および空行を除去
        const lines = content.split('\n')
                           .filter(line => {
                               const trimmedLine = line.trim();
                               return trimmedLine !== '' &&
                                      !trimmedLine.startsWith('#') &&
                                      !trimmedLine.startsWith('l_english:');
                           });

        if (lines.length === 0) {
            showErrorMessage('ファイルに有効な内容がありません（コメント行、l_english:行、または空行のみかもしれません）。');
            return;
        }

        let html = '<tbody>'; // theadはHTMLに固定されているためtbodyのみ生成
        let hasValidEntries = false; // 有効な行が追加されたかどうかのフラグ

        lines.forEach(line => {
            const match = line.match(/^([^:]+):\s*"(.*)"\s*$/);

            if (match && match.length === 3) {
                const key = match[1].trim();
                const value = match[2];

                // 原文が日本語の場合は無視
                if (isJapaneseText(value)) {
                    console.log(`Skipping Japanese text: "${value}"`);
                    return; // この行はスキップ
                }

                // 空白のみの原文を無視
                if (value.trim() === '') {
                    console.log(`Skipping empty text: "${value}"`);
                    return;
                }

                // 数字のみの原文を無視 (整数または浮動小数点数)
                if (/^\s*\d+(\.\d+)?\s*$/.test(value)) {
                    console.log(`Skipping numeric text: "${value}"`);
                    return;
                }

                // 修飾文字のみの原文を無視
                if (modifierCharacters.length > 0 && modifierCharacters[0].regex) {
                    try {
                        // 正規表現が文字列全体にマッチするかを確認するために、^と$を追加
                        const fullMatchRegex = new RegExp(`^${modifierCharacters[0].regex}$`);
                        if (fullMatchRegex.test(value)) {
                            console.log(`Skipping modifier-only text: "${value}"`);
                            return;
                        }
                    } catch (e) {
                        console.error("修飾文字正規表現のテスト中にエラーが発生しました:", e);
                        // エラーが発生した場合は、その行をスキップせずに処理を続行する（またはエラーとして表示する）
                        // ここではスキップしない選択をする
                    }
                }


                html += `<tr data-key="${escapeHTML(key)}" data-is-reviewed="false">`; // data-keyとdata-is-reviewedを追加
                html += `<td class="string_key-column-header">${escapeHTML(key)}</td>`; // キーセルにクラスを追加
                html += `<td class="original-text-cell">${escapeHTML(value)}</td>`; // 原文セルにクラスを追加
                // 翻訳セルに title 属性を追加して、編集可能であることを示す
                html += `<td class="translation-cell" title="クリックして編集">未翻訳</td>`; // 初期表示は「未翻訳」
                // 校閲チェックボックスを追加 (デフォルトでチェックなし)
                html += `<td class="review-column-cell"><input type="checkbox" class="review-checkbox h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"></td>`;
                // 個別の口調設定ドロップダウンを追加
                html += `<td>
                            <select class="individual-tone-select">
                                <!-- オプションはJavaScriptで動的に生成されます -->
                            </select>
                        </td>`;
                html += `<td><button class="translate-button">翻訳</button></td>`; // 個別翻訳ボタンの初期テキスト
                html += `</tr>`;
                hasValidEntries = true;
            } else {
                html += `<tr data-key="N/A" data-is-reviewed="false">`; // 解析失敗行にもdata属性を追加
                html += `<td colspan="6" class="text-red-500">解析失敗: ${escapeHTML(line)}</td>`; // colspanを6に修正
                html += `</tr>`;
                hasValidEntries = true; // 解析失敗行も表示する場合は有効なエントリとみなす
            }
        });
        html += '</tbody>';

        // 既存のtbodyをクリアし、新しい内容を挿入
        const existingTbody = dataTable.querySelector('tbody');
        if (existingTbody) {
            existingTbody.remove();
        }
        dataTable.insertAdjacentHTML('beforeend', html);

        if (hasValidEntries) {
            tableContainer.classList.remove('hidden'); // テーブルコンテナを表示
            translateAllButton.classList.remove('hidden'); // 「すべて翻訳」ボタンを表示
            translatedFileDownloadSection.classList.remove('hidden'); // 翻訳済みファイルダウンロードセクションを表示
            adjustKeyColumnWidth(); // キー列の幅を調整
        } else {
            showErrorMessage('有効な翻訳可能な行が見つかりませんでした。');
        }

        translationLog = []; // 新しいファイルを読み込んだらログをクリア
        populateToneDropdowns(); // 新しい行が追加されたので、口調ドロップダウンを更新
        updateReviewColumnVisibility(); // ファイルロード時に校閲列の表示を更新
    };

    // HTMLエスケープ関数 (XSS対策)
    const escapeHTML = (str) => {
        const div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    };

    // ファイルを読み込む関数
    const readFile = (file) => {
        if (!file) {
            showErrorMessage('ファイルが選択されていません。');
            return;
        }

        currentFileName = file.name; // ファイル名を保存

        const reader = new FileReader();

        reader.onload = async (e) => {
            try {
                await processFileContent(e.target.result);
            } catch (error) {
                console.error('ファイルの処理中にエラーが発生しました:', error);
                showErrorMessage('ファイルの処理中にエラーが発生しました。ファイル形式を確認してください。');
            }
        };

        reader.onerror = () => {
            showErrorMessage('ファイルの読み込み中にエラーが発生しました。');
        };

        reader.readAsText(file);
    };

    // --- localStorage関連の関数 ---

    // 設定をlocalStorageから読み込む関数
    const loadSettings = () => {
        try {
            const settingsJson = localStorage.getItem('translationAppSettings');
            if (settingsJson) {
                const settings = JSON.parse(settingsJson);
                currentApiKey = settings.apiKey || "";
                customTones = settings.customTones || [];
                glossaryTerms = settings.glossaryTerms || []; // 用語集を読み込む
                modifierCharacters = settings.modifierCharacters || []; // 修飾文字を読み込む (新規追加)
                isReviewModeEnabled = settings.isReviewModeEnabled || false; // 校閲モードの状態を読み込む

                // customTonesが空の場合、デフォルトの口調を追加
                if (customTones.length === 0) {
                    customTones.push({ value: 'da_dearu', name: 'だ・である調', instruction: '自称は「我ら」を使用し、語尾は「である」または「だ」調にしてください。', isConditional: false, conditions: [], elseInstruction: '' });
                    customTones.push({ value: 'taigen_dome', name: '体言止め', instruction: '自称は「我ら」を使用し、語尾は体言止めにしてください。', isConditional: false, conditions: [], elseInstruction: '' });
                    // 新しい条件付き口調「イベント」を追加
                    customTones.push({
                        value: 'event_conditional_tone',
                        name: 'イベント',
                        isConditional: true,
                        conditions: [{
                            condition: ".t$",
                            instruction: "原文に合わせて自称は「我ら」を使用し、語尾は体言止めにしてください。"
                        }],
                        elseInstruction: "原文に合わせて自称は「我々」、「我が」などを使い、「だ。」「である」調にしてください。"
                    });
                    saveSettings(); // デフォルト口調を追加したら保存
                }

                // modifierCharactersが空の場合、デフォルトの修飾文字を追加
                if (modifierCharacters.length === 0) {
                    modifierCharacters.push({ name: 'デフォルト', regex: DEFAULT_MODIFIER_REGEX });
                    saveSettings(); // デフォルト修飾文字を追加したら保存
                }

                // UIに反映
                if (apiKeyInput) apiKeyInput.value = currentApiKey;
                // defaultToneSelectが存在する場合のみ値を設定
                if (defaultToneSelect) {
                    defaultToneSelect.value = settings.defaultTone || 'da_dearu';
                }
                if (reviewModeCheckbox) {
                    reviewModeCheckbox.checked = isReviewModeEnabled; // 校閲モードチェックボックスの状態を復元
                }

                populateToneDropdowns(); // 口調ドロップダウンを更新
                globalToneSelect.value = settings.defaultTone || 'da_dearu';
                // 修飾文字入力フィールドに現在の値を設定
                if (modifierCharacters.length > 0) {
                    modifierNameInput.value = modifierCharacters[0].name;
                    modifierRegexInput.value = modifierCharacters[0].regex;
                } else {
                    modifierNameInput.value = 'デフォルト';
                    modifierRegexInput.value = DEFAULT_MODIFIER_REGEX;
                }

                console.log("Settings loaded from localStorage:", settings);
            } else {
                console.log("No settings found in localStorage, initializing with defaults.");
                currentApiKey = "";
                customTones = [];
                glossaryTerms = []; // デフォルトで用語集はなし
                modifierCharacters = []; // デフォルトで修飾文字はなし (新規追加)
                isReviewModeEnabled = false; // デフォルトで校閲モードは無効

                // customTonesが空の場合、デフォルトの口調を追加
                customTones.push({ value: 'da_dearu', name: 'だ・である調', instruction: '自称は「我ら」を使用し、語尾は「である」または「だ」調にしてください。', isConditional: false, conditions: [], elseInstruction: '' });
                customTones.push({ value: 'taigen_dome', name: '体言止め', instruction: '自称は「我ら」を使用し、語尾は体言止めにしてください。', isConditional: false, conditions: [], elseInstruction: '' });
                // 新しい条件付き口調「イベント」を追加
                customTones.push({
                    value: 'event_conditional_tone',
                    name: 'イベント',
                    isConditional: true,
                    conditions: [{
                        condition: ".t$",
                        instruction: "原文に合わせて自称は「我ら」を使用し、語尾は体言止めにしてください。"
                    }],
                    elseInstruction: "原文に合わせて自称は「我々」、「我が」などを使い、「だ。」「である」調にしてください。"
                });
                // デフォルト修飾文字を追加
                modifierCharacters.push({ name: 'デフォルト', regex: DEFAULT_MODIFIER_REGEX }); // 新しいデフォルト正規表現

                saveSettings(); // デフォルト口調と修飾文字を追加したら保存

                if (apiKeyInput) apiKeyInput.value = '';
                // defaultToneSelectが存在する場合のみ値を設定
                if (defaultToneSelect) {
                    defaultToneSelect.value = 'da_dearu';
                }
                if (reviewModeCheckbox) {
                    reviewModeCheckbox.checked = false;
                }

                populateToneDropdowns(); // 口調ドロップダウンを更新
                globalToneSelect.value = 'da_dearu';
                modifierNameInput.value = 'デフォルト';
                modifierRegexInput.value = DEFAULT_MODIFIER_REGEX;
            }
            // 設定ロード後、校閲列の表示を更新
            updateReviewColumnVisibility();
        } catch (error) {
            console.error("Error loading settings from localStorage:", error);
            alertMessage("設定の読み込み中にエラーが発生しました。", 'error');
        }
    };

    // 設定をlocalStorageに保存する関数
    const saveSettings = () => {
        try {
            const settings = {
                apiKey: apiKeyInput ? apiKeyInput.value.trim() : "", // apiKeyInputが存在しない場合を考慮
                defaultTone: defaultToneSelect ? defaultToneSelect.value : 'da_dearu', // defaultToneSelectが存在しない場合を考慮
                customTones: customTones, // カスタム口調も保存
                glossaryTerms: glossaryTerms, // 用語集も保存
                modifierCharacters: modifierCharacters, // 修飾文字も保存 (新規追加)
                isReviewModeEnabled: isReviewModeEnabled // 校閲モードの状態を保存
            };
            localStorage.setItem('translationAppSettings', JSON.stringify(settings));
            currentApiKey = settings.apiKey; // 翻訳に使用するAPIキーを更新
            globalToneSelect.value = settings.defaultTone; // メインページの口調も更新
            console.log("Settings saved to localStorage:", settings);
            alertMessage("設定を保存しました。", 'success'); // 簡易的な通知
        } catch (error) {
            console.error("Error saving settings to localStorage:", error);
            alertMessage("設定の保存に失敗しました。", 'error');
        }
    };

    // カスタムアラートメッセージボックス
    // type: 'success', 'error', 'warning', 'info'
    const alertMessage = (message, type = 'info') => {
        const alertDiv = document.createElement('div');
        let bgColor = 'bg-blue-500';
        if (type === 'success') bgColor = 'bg-green-500';
        else if (type === 'error') bgColor = 'bg-red-500';
        else if (type === 'warning') bgColor = 'bg-yellow-500';

        alertDiv.className = `custom-alert fixed top-4 right-4 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg z-[9999] opacity-0 transition-opacity duration-300`;
        alertDiv.textContent = message;
        document.body.appendChild(alertDiv);

        // フェードイン
        setTimeout(() => {
            alertDiv.style.opacity = '1';
        }, 10);

        // フェードアウトして削除
        setTimeout(() => {
            alertDiv.style.opacity = '0';
            alertDiv.addEventListener('transitionend', () => alertDiv.remove());
        }, 3000); // 3秒後にフェードアウト開始
    };

    // --- 口調ドロップダウンを動的に生成する共通関数 ---
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

    // --- 口調ドロップダウンを動的に生成する関数 ---
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
        const individualSelects = document.querySelectorAll('.individual-tone-select');
        individualSelects.forEach(selectElement => {
            selectElement.innerHTML = createToneOptionsHtml(allTones, true); // 個別設定には「全体設定に沿う」オプションを追加
        });

        // カスタム口調リストを更新 (タブ3の内容)
        renderCustomToneList();
    };

    // --- カスタム口調リストをレンダリングする関数 ---
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

    // --- 翻訳ログをダウンロードする関数 ---
    const downloadTranslationLog = () => {
        if (translationLog.length === 0) {
            alertMessage("ダウンロードする翻訳ログがありません。", 'warning');
            return;
        }

        // CSV header
        // 修飾文字置換前と復元後の列を追加
        let csvContent = "number,date,original txt,tone,translated text,status,error_message,pre_modified_text,post_restored_text\n";

        // Helper to escape CSV fields
        const escapeCsvField = (field) => {
            if (field === null || field === undefined) return '';
            let stringField = String(field);
            // If field contains comma, double quote, or newline, enclose in double quotes
            if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
                // Escape double quotes by doubling them
                stringField = stringField.replace(/"/g, '""');
                return `"${stringField}"`;
            }
            return stringField;
        };

        translationLog.forEach((entry, index) => {
            const row = [
                index + 1,
                entry.timestamp,
                entry.originalText,
                entry.selectedTone, // 口調の値 (例: da_dearu, taigen_dome, custom_tone_name)
                entry.translatedText,
                entry.status,
                entry.errorMessage, // エラーメッセージを追加
                entry.preModifiedText || '', // 修飾文字置換前のテキスト
                entry.postRestoredText || '' // 修飾文字復元後のテキスト
            ].map(escapeCsvField).join(',');
            csvContent += row + '\n';
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `translation_log_${new Date().toISOString().slice(0, 10)}.csv`; // Change extension to .csv
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url); // Release the object URL
        alertMessage("翻訳ログをダウンロードしました。", 'success');
    };

    // --- 用語集リストをレンダリングする関数 ---
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

                if (i === 0) {
                    // 最初の行は品詞、原文、翻訳文、ノート、アクションを結合して表示
                    rowHtml += `<td class="py-2 px-4 border-b border-gray-200" rowspan="${altCount}">${escapeHTML(term.pos || '')}</td>`;
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

    // --- 用語集フォームのリセット関数 ---
    const resetGlossaryForm = () => {
        glossaryPosInput.value = ''; // ドロップダウンの値をリセット
        glossaryOriginalInput.value = '';
        glossaryOriginalAltInput.value = ''; // textareaをクリア
        glossaryTranslationInput.value = '';
        glossaryNoteInput.value = ''; // ノート入力フィールドをクリア
        addGlossaryTermButton.textContent = '用語を追加';
        cancelGlossaryEditButton.classList.add('hidden');
        editingGlossaryIndex = null;
    };

    // --- 用語集JSONファイルを読み込む関数 ---
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

    // --- 用語集JSONの内容を解析して追加する関数 ---
    const processGlossaryJsonContent = (jsonContent) => {
        if (!Array.isArray(jsonContent)) {
            alertMessage('JSONファイルは配列である必要があります。', 'error');
            return;
        }

        let newTermsAdded = 0;
        let termsSkipped = 0;

        jsonContent.forEach((item, itemIndex) => {
            // 必要なフィールドを抽出
            const original = item.term ? String(item.term).trim() : '';
            const translation = item.translation ? String(item.translation).trim() : '';
            const pos = item.pos ? String(item.pos).trim() : '';
            const note = item.note ? String(item.note).trim() : ''; // noteフィールドを追加

            // variantsが存在し、配列であればそのまま使用。そうでなければ空の配列。
            const originalAlt = Array.isArray(item.variants)
                                ? item.variants.map(v => String(v).trim()).filter(v => v !== '')
                                : [];

            // 原文が空でないことを確認
            if (!original) {
                console.warn(`Skipping empty original term in JSON item ${itemIndex + 1}:`, item);
                termsSkipped++;
                return;
            }

            // 重複チェック (原文でチェック)
            const isDuplicate = glossaryTerms.some(term => term.original.toLowerCase() === original.toLowerCase());
            if (isDuplicate) {
                console.warn(`Skipping duplicate original term in JSON item ${itemIndex + 1}: "${original}"`);
                termsSkipped++;
                return;
            }

            glossaryTerms.push({ pos, original, originalAlt, translation, note }); // noteを追加
            newTermsAdded++;
        });

        if (newTermsAdded > 0) {
            saveSettings(); // 用語集を保存
            renderGlossaryTerms(); // リストを更新
            alertMessage(`${newTermsAdded}件の用語を追加しました。${termsSkipped > 0 ? `(${termsSkipped}件の用語をスキップしました。)` : ''}`, 'success');
        } else if (termsSkipped > 0) {
            alertMessage(`用語集ファイルから有効な用語が見つかりませんでした。${termsSkipped}件の用語をスキップしました。`, 'warning');
        } else {
            alertMessage('用語集ファイルから追加できる用語が見つかりませんでした。', 'info');
        }
    };

    // --- 修飾文字フォームのリセット関数 (新規追加) ---
    const resetModifierForm = () => {
        modifierNameInput.value = 'デフォルト'; // 名前のデフォルト値
        modifierRegexInput.value = DEFAULT_MODIFIER_REGEX; // 正規表現のデフォルト値
        addModifierButton.textContent = '設定を保存'; // ボタンのテキストを「設定を保存」に変更
        cancelModifierEditButton.classList.add('hidden');
        editingModifierIndex = null; // 編集モードを解除
    };


    // --- タブ切り替え関数 ---
    const switchTab = (tabId) => {
        // すべてのタブボタンからactiveクラスを削除し、すべてのタブコンテンツを非表示にする
        tab1Button.classList.remove('active', 'bg-blue-500', 'text-white');
        tab1Button.classList.add('text-gray-700', 'hover:bg-gray-100');
        tab2Button.classList.remove('active', 'bg-blue-500', 'text-white');
        tab2Button.classList.add('text-gray-700', 'hover:bg-gray-100');
        tab3Button.classList.remove('active', 'bg-blue-500', 'text-white');
        tab3Button.classList.add('text-gray-700', 'hover:bg-gray-100');
        glossaryTabButton.classList.remove('active', 'bg-blue-500', 'text-white');
        glossaryTabButton.classList.add('text-gray-700', 'hover:bg-gray-100');
        modifierTabButton.classList.remove('active', 'bg-blue-500', 'text-white'); // 新しいタブボタン
        modifierTabButton.classList.add('text-gray-700', 'hover:bg-gray-100'); // 新しいタブボタン

        tab1Content.classList.add('hidden');
        tab2Content.classList.add('hidden');
        tab3Content.classList.add('hidden');
        glossaryTabContent.classList.add('hidden');
        modifierTabContent.classList.add('hidden'); // 新しいタブコンテンツ

        // 選択されたタブを表示し、対応するボタンにactiveクラスを追加
        if (tabId === 'tab1-content') {
            tab1Content.classList.remove('hidden');
            tab1Button.classList.add('active', 'bg-blue-500', 'text-white');
            tab1Button.classList.remove('text-gray-700', 'hover:bg-gray-100');
        } else if (tabId === 'tab2-content') {
            tab2Content.classList.remove('hidden');
            tab2Button.classList.add('active', 'bg-blue-500', 'text-white');
            tab2Button.classList.remove('text-gray-700', 'hover:bg-gray-100');
            populateToneDropdowns(); // タブ2表示時にデフォルト口調ドロップダウンを更新
        } else if (tabId === 'tab3-content') {
            tab3Content.classList.remove('hidden');
            tab3Button.classList.add('active', 'bg-blue-500', 'text-white');
            tab3Button.classList.remove('text-gray-700', 'hover:bg-gray-100');
            renderCustomToneList(); // カスタム口調タブ表示時にリストを更新
            resetToneForm(); // タブ3表示時にフォームをリセット
        } else if (tabId === 'glossary-tab-content') {
            glossaryTabContent.classList.remove('hidden');
            glossaryTabButton.classList.add('active', 'bg-blue-500', 'text-white');
            glossaryTabButton.classList.remove('text-gray-700', 'hover:bg-gray-100');
            renderGlossaryTerms(); // 用語集タブ表示時にリストを更新
            resetGlossaryForm(); // 用語集タブ表示時にフォームをリセット
        } else if (tabId === 'modifier-tab-content') { // 新しいタブの切り替え
            modifierTabContent.classList.remove('hidden');
            modifierTabButton.classList.add('active', 'bg-blue-500', 'text-white');
            modifierTabButton.classList.remove('text-gray-700', 'hover:bg-gray-100');
            resetModifierForm(); // 修飾文字タブ表示時にフォームをリセット
        }
    };

    // --- 口調編集フォームのリセット関数 ---
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

    // --- 条件付き口調の条件フィールドを追加する関数 ---
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

    // --- 校閲列の表示/非表示を切り替える関数 ---
    const updateReviewColumnVisibility = () => {

        const checkboxes = document.querySelectorAll('.review-checkbox'); // すべてのチェックボックスを取得

        checkboxes.forEach(checkbox => {
            if (isReviewModeEnabled) {
                checkbox.classList.remove('hidden'); // 校閲モード有効ならチェックボックスを表示
            } else {
                checkbox.classList.add('hidden');    // 校閲モード無効ならチェックボックスを非表示
            }
        });
    };

    // --- キー列の幅を調整する関数 (新規追加) ---
    const adjustKeyColumnWidth = () => {
        const keyCells = dataTable.querySelectorAll('td.string_key-column-header');
        let maxWidth = 0;

        // 一時的な要素を作成してテキストの幅を測定
        const tempSpan = document.createElement('span');
        tempSpan.style.visibility = 'hidden';
        tempSpan.style.position = 'absolute';
        tempSpan.style.whiteSpace = 'nowrap'; // 測定中はテキストが改行されないようにする
        // dataTableの計算済みスタイルを適用して正確な幅を測定
        const computedStyle = getComputedStyle(dataTable.querySelector('td.string_key-column-header') || dataTable);
        tempSpan.style.fontFamily = computedStyle.fontFamily;
        tempSpan.style.fontSize = computedStyle.fontSize;
        tempSpan.style.fontWeight = computedStyle.fontWeight; // フォントの太さも考慮
        document.body.appendChild(tempSpan);

        keyCells.forEach(cell => {
            tempSpan.textContent = cell.textContent;
            const currentWidth = tempSpan.offsetWidth;
            if (currentWidth > maxWidth) {
                maxWidth = currentWidth;
            }
        });

        document.body.removeChild(tempSpan);

        // 計算された幅にパディングを追加して見栄えを良くする
        // 現在のpadding-left (12px) と padding-right (16px) を考慮
        const finalWidth = maxWidth + 12 + 16; // 左右のパディング分を追加

        // キー列のヘッダーとすべてのキーセルに計算された幅を適用
        const keyColumnHeader = dataTable.querySelector('th.string_key-column-header');
        if (keyColumnHeader) {
            keyColumnHeader.style.width = `${finalWidth}px`;
        }
        keyCells.forEach(cell => {
            cell.style.width = `${finalWidth}px`;
        });
    };


    // --- イベントリスナーの設定 ---

    // 設定ボタンクリックでモーダルを開く
    settingsButton.addEventListener('click', () => {
        settingsModal.classList.remove('hidden');
        loadSettings(); // 設定モーダルを開くときに設定をロード
        switchTab('tab1-content'); // デフォルトでタブ1を表示
    });

    // 閉じるボタンクリックでモーダルを閉じる
    closeSettingsButton.addEventListener('click', () => {
        // 設定モーダルを閉じる際には確認は不要
        settingsModal.classList.add('hidden');
        resetToneForm(); // 口調フォームをリセット
        resetGlossaryForm(); // 用語集フォームをリセット
        resetModifierForm(); // 修飾文字フォームをリセット (新規追加)
    });

    // 保存ボタンクリックで設定を保存
    saveSettingsButton.addEventListener('click', saveSettings);

    // ログダウンロードボタンのクリックイベント
    downloadLogButton.addEventListener('click', downloadTranslationLog);

    // 翻訳済みYMLダウンロードボタンのクリックイベント
    if (downloadTranslatedYmlButton) {
        downloadTranslatedYmlButton.addEventListener('click', () => {
            downloadTranslatedYml();
        });
    }

    // タブボタンのクリックイベント
    tab1Button.addEventListener('click', () => switchTab('tab1-content'));
    tab2Button.addEventListener('click', () => switchTab('tab2-content'));
    tab3Button.addEventListener('click', () => switchTab('tab3-content'));
    glossaryTabButton.addEventListener('click', () => switchTab('glossary-tab-content'));
    modifierTabButton.addEventListener('click', () => switchTab('modifier-tab-content')); // 新しいタブのイベント


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

            saveSettings();
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
                        saveSettings();
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

    // --- 用語集追加/編集ボタンのイベント ---
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

            saveSettings();
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
                        saveSettings();
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

    // 用語集ファイルドロップゾーンのイベントリスナー
    if (glossaryFileDropZone) {
        glossaryFileDropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            glossaryFileDropZone.classList.add('border-blue-500', 'bg-blue-50');
        });

        glossaryFileDropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            glossaryFileDropZone.classList.remove('border-blue-500', 'bg-blue-50');
        });

        glossaryFileDropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            glossaryFileDropZone.classList.remove('border-blue-500', 'bg-blue-50');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                readGlossaryFile(files[0]);
            } else {
                alertMessage('ドロップされたファイルがありません。', 'warning');
            }
        });

        glossaryFileDropZone.addEventListener('click', () => {
            glossaryFileInput.click();
        });
    }

    // 用語集全削除ボタンのイベントリスナー
    if (clearGlossaryButton) {
        clearGlossaryButton.addEventListener('click', () => {
            if (glossaryTerms.length === 0) {
                alertMessage('削除する用語がありません。', 'warning');
                return;
            }
            // window.confirm の代わりにカスタムアラートを使用
            if (confirm('すべての用語を削除してもよろしいですか？この操作は元に戻せません。')) {
                glossaryTerms = []; // 用語集を空にする
                saveSettings(); // localStorageに保存
                renderGlossaryTerms(); // UIを更新
                alertMessage('すべての用語を削除しました。', 'success');
                resetGlossaryForm(); // フォームをリセット
            }
        });
    }

    // --- 修飾文字追加/編集ボタンのイベント (新規追加) ---
    if (addModifierButton) {
        addModifierButton.addEventListener('click', () => {
            const name = modifierNameInput.value.trim();
            const regex = modifierRegexInput.value.trim();

            if (!name || !regex) {
                alertMessage('名前と正規表現の両方を入力してください。', 'warning');
                return;
            }

            // 正規表現の有効性をチェック
            try {
                new RegExp(regex);
            } catch (e) {
                alertMessage(`無効な正規表現です: ${e.message}`, 'error');
                return;
            }

            // 修飾文字は一つだけなので、常に最初の要素を更新
            modifierCharacters = [{ name, regex }];
            alertMessage('修飾文字を更新しました。', 'success');

            saveSettings();
            resetModifierForm(); // フォームをリセット
        });
    }

    // 修飾文字編集キャンセルボタンのイベント (新規追加)
    if (cancelModifierEditButton) {
        cancelModifierEditButton.addEventListener('click', resetModifierForm);
    }

    // デフォルトにリセットボタンのイベント (新規追加)
    if (resetModifierButton) {
        resetModifierButton.addEventListener('click', () => {
            if (confirm('修飾文字の正規表現をデフォルトにリセットしてもよろしいですか？')) {
                modifierNameInput.value = 'デフォルト';
                modifierRegexInput.value = DEFAULT_MODIFIER_REGEX;
                modifierCharacters = [{ name: 'デフォルト', regex: DEFAULT_MODIFIER_REGEX }];
                saveSettings();
                alertMessage('修飾文字をデフォルトにリセットしました。', 'success');
            }
        });
    }

    // --- 翻訳済みYMLファイルをダウンロードする関数 ---
    const downloadTranslatedYml = () => {
        const tableRows = dataTable.querySelectorAll('tbody tr');
        if (tableRows.length === 0 || tableRows[0].querySelector('.translation-cell').textContent === '未翻訳') {
            alertMessage('ダウンロードする翻訳済み内容がありません。まずファイルを読み込み、翻訳を実行してください。', 'warning');
            return;
        }

        const selectedPrefix = filePrefixSelect.value;
        let ymlContent = `${selectedPrefix}\n`; // 先頭行を設定

        tableRows.forEach(row => {
            const key = row.querySelector('td:first-child').textContent;
            let translatedText = row.querySelector('.translation-cell').textContent; // let に変更
            const reviewCheckbox = row.querySelector('.review-checkbox');
            const isRowReviewed = reviewCheckbox ? reviewCheckbox.checked : false; // チェックボックスの状態を取得

            // 校閲モードが有効で、かつチェックが入っていない場合はスキップ
            if (isReviewModeEnabled && !isRowReviewed) {
                return;
            }

            // 翻訳がエラーでない場合のみ追加
            if (!translatedText.startsWith('翻訳エラー') && translatedText !== '未翻訳' && translatedText !== '翻訳中...') { // "翻訳エラー"で始まる場合も除外
                // 翻訳文の末尾の改行を削除
                translatedText = translatedText.trim();

                // YML形式にエスケープ（特に引用符）
                const escapedText = translatedText.replace(/"/g, '""');
                // 訳文の後に改行を入れないように修正
                ymlContent += ` ${key}: "${escapedText}"\n`;
            }
        });

        const blob = new Blob([ymlContent], { type: 'text/yaml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;

        let downloadFileName = currentFileName;
        if (selectedPrefix === 'l_japanese:') {
            downloadFileName = downloadFileName.replace('l_english', 'l_japanese');
        }
        // 拡張子が.ymlでない場合は.ymlを追加
        if (!downloadFileName.endsWith('.yml')) {
            downloadFileName = downloadFileName.split('.').slice(0, -1).join('.') + '.yml';
        }

        a.download = downloadFileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        alertMessage('翻訳済みYMLファイルをダウンロードしました。', 'success');
    };


    // 「すべて翻訳」ボタンのクリックイベント
    translateAllButton.addEventListener('click', async () => {
        // APIキーが設定されているかチェック
        if (!currentApiKey) {
            alertMessage('APIキーが設定されていません。「設定」からAPIキーを入力してください。', 'error');
            return; // 処理を中断
        }

        translateAllButton.disabled = true; // ボタンを無効化
        translateAllButton.textContent = 'すべて翻訳中...'; // ボタンのテキストを更新
        translateAllProgressBar.style.width = '0%'; // プログレスバーをリセット
        translateAllProgressBar.classList.remove('hidden'); // プログressバーを表示
        translationProgress.classList.remove('hidden'); // 進捗表示を表示

        const selectedGlobalTone = globalToneSelect.value; // 全体設定の口調を取得

        const allRows = Array.from(dataTable.querySelectorAll('tbody tr'));
        const totalRows = allRows.length;
        let translatedCount = 0;
        const chunkSize = 100; // チャンクサイズを100に設定

        for (let i = 0; i < totalRows; i += chunkSize) {
            const chunk = allRows.slice(i, i + chunkSize);
            const translationPromises = chunk.map(async (row) => {
                const keyCell = row.querySelector('td:first-child'); // キーセルを取得
                const originalTextCell = row.querySelector('.original-text-cell');
                const translationCell = row.querySelector('.translation-cell');
                const translateButton = row.querySelector('.translate-button');
                const individualToneSelect = row.querySelector('.individual-tone-select');
                const reviewCheckbox = row.querySelector('.review-checkbox'); // 校閲チェックボックス

                if (originalTextCell && translationCell && keyCell && reviewCheckbox) {
                    const key = keyCell.textContent; // キーを取得
                    const originalText = originalTextCell.textContent;
                    // 翻訳中の状態を設定
                    translationCell.textContent = '翻訳中...';
                    if (translateButton) {
                        translateButton.disabled = true;
                        translateButton.textContent = '翻訳中...';
                    }
                    if (individualToneSelect) {
                        individualToneSelect.disabled = true;
                    }
                    reviewCheckbox.disabled = true; // チェックボックスを無効化

                    try {
                        // ここで個別口調が'default'の場合、globalToneSelect.valueを渡す
                        const effectiveToneForTranslation = individualToneSelect.value === 'default' ? selectedGlobalTone : individualToneSelect.value;
                        const result = await translateText(originalText, key, effectiveToneForTranslation);
                        if (result.status === 'Error') {
                            translationCell.textContent = `翻訳エラー: ${result.errorMessage}`;
                        } else {
                            translationCell.textContent = result.translatedText;
                            // 翻訳が成功しても自動的にチェックを入れない
                            // reviewCheckbox.checked = true; // この行を削除
                            // row.dataset.isReviewed = 'true'; // この行を削除
                        }
                    } catch (error) {
                        // translateText内でエラーが処理されるため、基本的にはここには来ないはずですが念のため
                        translationCell.textContent = `翻訳エラー: ${error.message || '不明なエラー'}`;
                        console.error('一括翻訳中にエラーが発生しました:', error);
                    } finally {
                        if (translateButton) {
                            translateButton.disabled = false;
                            translateButton.textContent = '再翻訳';
                        }
                        if (individualToneSelect) {
                            individualToneSelect.disabled = false;
                        }
                        reviewCheckbox.disabled = false; // チェックボックスを有効化
                        translatedCount++;
                        // プログレスバーの幅を更新
                        const progress = (translatedCount / totalRows) * 100;
                        translateAllProgressBar.style.width = `${progress}%`;
                        translationProgress.textContent = `翻訳中... (${translatedCount}/${totalRows})`;
                    }
                }
            });

            await Promise.allSettled(translationPromises); // 現在のチャンクの翻訳が完了するのを待つ

            // チャンク間に短い遅延を設ける
            if (i + chunkSize < totalRows) {
                await new Promise(resolve => setTimeout(resolve, 500)); // 500ミリ秒の遅延
            }
        }

        translateAllButton.disabled = false; // ボタンを有効化
        translateAllButton.textContent = 'すべて翻訳'; // ボタンのテキストを元に戻す
        translateAllProgressBar.style.width = '0%'; // プログレスバーをリセット
        translateAllProgressBar.classList.add('hidden'); // プログレスバーを非表示
        translationProgress.classList.add('hidden'); // 進捗表示を非表示
        alertMessage('すべての翻訳が完了しました。', 'success');
    });


    // ドラッグオーバー時の処理
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.add('border-blue-500', 'bg-blue-50');
    });

    // ドラッグリーブ時の処理
    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('border-blue-500', 'bg-blue-50');
    });

    // ドロップ時の処理
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('border-blue-500', 'bg-blue-50');

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            readFile(files[0]);
        } else {
            showErrorMessage('ドロップされたファイルがありません。');
        }
    });

    // ファイル入力（input type="file"）が変更された時の処理
    fileInput.addEventListener('change', (e) => {
        const files = e.target.files;
        if (files.length > 0) {
            readFile(files[0]);
        } else {
            showErrorMessage('ファイルが選択されていません。');
        }
    });

    // ドロップゾーンクリックでファイル選択ダイアログを開く
    dropZone.addEventListener('click', () => {
        fileInput.click();
    });

    // 個別翻訳ボタン、翻訳セル、校閲チェックボックスのイベント委譲
    dataTable.addEventListener('click', (e) => {
        if (e.target.classList.contains('translate-button')) {
            const rowElement = e.target.closest('tr'); // クリックされたボタンの親行を取得
            if (rowElement) {
                translateRow(rowElement);
            }
        } else if (e.target.classList.contains('translation-cell')) {
            // 翻訳セルがクリックされたら編集可能にする
            makeTranslationCellEditable(e.target);
        } else if (e.target.classList.contains('review-checkbox')) {
            // 校閲チェックボックスがクリックされたら、その行のデータ属性を更新
            const rowElement = e.target.closest('tr');
            if (rowElement) {
                rowElement.dataset.isReviewed = e.target.checked ? 'true' : 'false';
            }
        }
    });

    // 翻訳セルを編集可能にする関数
    const makeTranslationCellEditable = (cellElement) => {
        // 既に編集中の場合は何もしない
        if (cellElement.querySelector('textarea')) {
            return;
        }

        const originalText = cellElement.textContent;
        const textarea = document.createElement('textarea');
        textarea.value = originalText;
        textarea.classList.add(
            'w-full', 'h-full', 'p-2', 'border', 'border-blue-300', 'rounded', 'resize-none',
            'focus:outline-none', 'focus:border-blue-500', 'shadow-sm', 'text-sm', 'bg-white'
        );
        textarea.style.minHeight = '40px'; // 最小の高さを設定
        textarea.style.boxSizing = 'border-box'; // パディングを含めてサイズを計算

        // テキストエリアの自動リサイズ
        const adjustHeight = () => {
            textarea.style.height = 'auto';
            textarea.style.height = textarea.scrollHeight + 'px';
        };
        textarea.addEventListener('input', adjustHeight);

        // 元のコンテンツをクリアし、textareaを追加
        cellElement.innerHTML = '';
        cellElement.appendChild(textarea);
        textarea.focus();
        adjustHeight(); // 初期表示時の高さ調整

        const finishEditing = () => {
            const newText = textarea.value;
            cellElement.textContent = newText; // セルの内容を更新
            // 翻訳セルが手動で編集された場合でも、校閲済みとみなさない
            // const rowElement = cellElement.closest('tr'); // このブロックを削除
            // if (rowElement) {
            //     const reviewCheckbox = rowElement.querySelector('.review-checkbox');
            //     if (reviewCheckbox) {
            //         reviewCheckbox.checked = true;
            //         rowElement.dataset.isReviewed = 'true';
            //     }
            // }
            // localStorageへの保存は、saveSettings()で一括で行われるため、ここでは行わない
        };

        textarea.addEventListener('blur', () => {
            finishEditing();
        });

        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) { // Enterキーのみで確定、Shift+Enterは改行
                e.preventDefault(); // デフォルトの改行を防止
                textarea.blur(); // blurイベントをトリガーして編集を終了
            }
        });
    };

    // --- ロゴクリックイベント ---
    if (appLogo) {
        appLogo.addEventListener('click', () => {
            aboutModal.classList.remove('hidden');
        });
    }

    // --- 作者情報モーダルを閉じるイベント ---
    if (closeAboutButton) {
        closeAboutButton.addEventListener('click', () => {
            aboutModal.classList.add('hidden');
        });
    }

    // --- 校閲モードチェックボックスのイベントリスナー ---
    if (reviewModeCheckbox) {
        reviewModeCheckbox.addEventListener('change', () => {
            isReviewModeEnabled = reviewModeCheckbox.checked;
            saveSettings(); // 校閲モードの状態を保存
            updateReviewColumnVisibility(); // 校閲列の表示を更新
        });
    }

    // --- サイトを離れる際の確認ダイアログ ---
    window.onbeforeunload = (event) => {
        // 翻訳テーブルに内容があり、かつ翻訳が完了していない（未翻訳、翻訳中、翻訳エラーのいずれかがある）場合
        const rows = dataTable.querySelectorAll('tbody tr');
        let unsavedChanges = false;
        if (rows.length > 0) {
            for (const row of rows) {
                const translationCell = row.querySelector('.translation-cell');
                // "翻訳エラー"で始まるテキストも未保存とみなす
                if (translationCell && (translationCell.textContent === '未翻訳' || translationCell.textContent === '翻訳中...' || translationCell.textContent.startsWith('翻訳エラー'))) {
                    unsavedChanges = true;
                    break;
                }
            }
        }

        // 設定モーダルが開いている場合も変更がある可能性があるとみなす
        if (settingsModal && !settingsModal.classList.contains('hidden')) {
            unsavedChanges = true;
        }

        if (unsavedChanges) {
            const message = '保存されていない変更がある可能性があります。このページを離れてもよろしいですか？';
            event.returnValue = message; // 標準的な方法
            return message; // 一部のブラウザ向け
        }
    };


    // ページ読み込み時に設定をロード
    loadSettings();
});
