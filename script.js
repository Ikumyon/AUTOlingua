// script.js

// Import the LLM service
import { callLLMService } from './js/llmService.js';

document.addEventListener('DOMContentLoaded', () => {
    // DOM要素の取得
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

    // APIキーとデフォルト口調設定の要素
    const llmProviderSelect = document.getElementById('llm-provider-select'); // LLMプロバイダ選択ドロップダウン (新規追加)
    // const llmModelSelect = document.getElementById('llm-model-select'); // 削除
    const llmModelCheckboxList = document.getElementById('llm-model-checkbox-list'); // モデル選択チェックボックスリスト (新規追加)
    const apiKeyLabel = document.getElementById('api-key-label'); // APIキーラベル (新規追加)
    const apiKeyInput = document.getElementById('api-key-input');
    const apiPassphraseInput = document.getElementById('api-passphrase-input'); // パスフレーズ入力フィールド
    const toggleApiPassphraseButton = document.getElementById('toggle-api-passphrase'); // APIキー設定のパスフレーズ表示切り替えボタン
    const deleteApiKeyButton = document.getElementById('delete-api-key-button'); // APIキー削除ボタン (新規追加)
    const defaultToneSelect = document.getElementById('default-tone-select');

    // LLMプロバイダ管理リスト関連の要素 (新規追加)
    const llmProviderList = document.getElementById('llm-provider-list');

    // 一括翻訳LLM選択ドロップダウン (新規追加)
    const globalLlmProviderSelect = document.getElementById('global-llm-provider-select');
    // const globalLlmModelSelect = document.getElementById('global-llm-model-select'); // 削除

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
    const downloadGlossaryButton = document.getElementById('download-glossary-button'); // 用語集ダウンロードボタン (新規追加)


    // 修飾文字関連の要素
    const modifierNameInput = document.getElementById('modifier-name-input');
    const modifierRegexInput = document.getElementById('modifier-regex-input');
    const addModifierButton = document.getElementById('add-modifier-button');
    const resetModifierButton = document.getElementById('reset-modifier-button'); // デフォルトにリセットボタン
    const cancelModifierEditButton = document.getElementById('cancel-modifier-edit-button');

    // YMLダウンロード関連の要素
    const filePrefixSelect = document.getElementById('file-prefix-select'); // ファイル先頭設定ドロップダウン
    const downloadTranslatedYmlButton = document.getElementById('download-translated-yml-button'); // 翻訳済みYMLダウンロードボタン
    const downloadLogButton = document.getElementById('download-log-button'); // ログダウンロードボタン

    // 作者情報モーダル関連の要素
    const appLogo = document.getElementById('app-logo'); // ロゴ要素
    const aboutModal = document.getElementById('about-modal'); // 作者情報モーダル
    const closeAboutButton = document.getElementById('close-about-button'); // 作者情報モーダル内の閉じるボタン

    // 校閲モード関連の要素
    const reviewModeCheckbox = document.getElementById('review-mode-checkbox'); // 校閲モードチェックボックス

    // パスフレーズ入力モーダル関連の要素
    const passphraseModal = document.getElementById('passphrase-modal');
    const passphraseInputForDecrypt = document.getElementById('passphrase-input-for-decrypt');
    const toggleDecryptPassphraseButton = document.getElementById('toggle-decrypt-passphrase'); // 復号化パスフレーズ表示切り替えボタン
    const submitPassphraseButton = document.getElementById('submit-passphrase-button');
    const cancelPassphraseButton = document.getElementById('cancel-passphrase-button');
    const deleteApiKeyFromDecryptButton = document.getElementById('delete-api-key-from-decrypt-button'); // 復号化モーダル内のAPIキー削除ボタン

    // 翻訳案オーバーレイ関連の要素 (新規追加)
    const suggestionsOverlay = document.getElementById('suggestions-overlay');
    const suggestionsList = document.getElementById('suggestions-list');
    const closeSuggestionsOverlayButton = document.getElementById('close-suggestions-overlay-button');


    // グローバル変数
    let currentApiKey = ""; // 現在選択されているLLMプロバイダのAPIキー
    let currentLlmProviderId = ''; // 現在選択されているLLMプロバイダのID (デフォルトは空)
    let currentLlmModelId = ''; // 現在選択されているLLMモデルのID (一括翻訳や個別翻訳で実際に使用されるモデル)
    let customTones = []; // カスタム口調を保存する配列
    let editingToneIndex = null; // 編集中の口調のインデックス (nullの場合は新規追加)
    let translationLog = []; // ログを保存する配列
    let glossaryTerms = []; // 用語集を保存する配列
    let editingGlossaryIndex = null; // 編集中の用語のインデックス (nullの場合は新規追加)
    let modifierCharacters = []; // 修飾文字を保存する配列
    let editingModifierIndex = null; // 編集中の修飾文字のインデックス
    let currentFileName = ''; // 現在読み込まれているファイル名
    let isReviewModeEnabled = false; // 校閲モードの状態
    let currentOverlayRow = null; // 現在オーバーレイが表示されている行

    // 定数
    const DEFAULT_MODIFIER_REGEX = '@?[\\[@\\$\\£][\\w\\|\\.%@\\+]*[\\w\\]\\£\\$]'; // デフォルトの修飾文字正規表現
    const COLOR_CODE_PATTERN = '§\\w+§!'; // カラーコードの正規表現パターン
    const COLOR_CODE_PART_PATTERN = '§\\w'; // カラーコード部分の正規化表現パターン (例: §Y)
    const CONDITIONAL_TONE_SUFFIX = '-条件付き口調'; // 条件付き口調のサフィックス

    // 品詞の選択肢の定義 (新しい形式)
    const GLOSSARY_POS_OPTIONS = [
        { value: '', name: '選択してください' },
        { value: 'noun', name: '名詞' },
        { value: 'verb', name: '動詞' },
        { value: 'adjectiv', name: '形容詞' }, // 指示通り 'adjectiv'
        { value: 'adverb', name: '副詞' },
        { value: 'other', name: 'その他' }
    ];

    // サポートするLLMプロバイダのリストと対応モデル
    // この配列は `loadSettings` で初期化・更新されるため、`let` で宣言
    let LLM_PROVIDERS = []; // loadSettingsで初期化される


    // IndexedDBの設定
    const DB_NAME = 'AUTOlinguaDB';
    const DB_VERSION = 1;
    const STORE_NAME = 'appSettings';
    // APIキーはプロバイダIDごとに保存
    const API_KEY_PREFIX = 'encryptedApiKey_'; // モデルIDを削除
    const PASSPHRASE_SALT_ITEM_KEY = 'passphraseSalt'; // パスフレーズ導出用ソルト

    let db; // IndexedDBのインスタンス

    /**
     * IndexedDBを開く/作成する関数
     * @returns {Promise<IDBDatabase>} IndexedDBのインスタンス
     */
    const openDatabase = () => {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (event) => {
                db = event.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME);
                }
            };

            request.onsuccess = (event) => {
                db = event.target.result;
                console.log('IndexedDB opened successfully.');
                resolve(db);
            };

            request.onerror = (event) => {
                console.error('IndexedDB error:', event.target.errorCode, event.target.error);
                alertMessage('IndexedDBのオープンに失敗しました。', 'error');
                reject(event.target.error);
            };
        });
    };

    /**
     * ランダムなバイト配列を生成するヘルパー関数
     * @param {number} length - 生成するバイト配列の長さ
     * @returns {Uint8Array} ランダムなバイト配列
     */
    const generateRandomBytes = (length) => {
        return crypto.getRandomValues(new Uint8Array(length));
    };

    /**
     * パスフレーズから暗号化キーを導出する関数 (PBKDF2を使用)
     * @param {string} passphrase - ユーザーが入力したパスフレーズ
     * @param {Uint8Array} salt - パスフレーズ導出用のソルト
     * @returns {Promise<CryptoKey>} 導出された暗号化キー
     */
    const deriveKeyFromPassphrase = async (passphrase, salt) => {
        const encoder = new TextEncoder();
        const keyMaterial = await crypto.subtle.importKey(
            "raw", // format
            encoder.encode(passphrase), // keyData
            { name: "PBKDF2" }, // algorithm
            false, // extractable
            ["deriveKey"] // keyUsages
        );

        return crypto.subtle.deriveKey(
            {
                name: "PBKDF2",
                salt: salt,
                iterations: 100000, // 繰り返し回数を増やすことでブルートフォース攻撃に強くする
                hash: "SHA-256",
            },
            keyMaterial,
            { name: "AES-GCM", length: 256 },
            true, // エクスポート可能にする (IndexedDBに保存するため)
            ["encrypt", "decrypt"]
        );
    };

    /**
     * データを暗号化する関数 (AES-GCMを使用)
     * @param {string} data - 暗号化するデータ（文字列）
     * @param {CryptoKey} key - 暗号化キー
     * @returns {Promise<{iv: number[], ciphertext: number[]}>} IVと暗号化されたデータ
     */
    const encryptData = async (data, key) => {
        const iv = generateRandomBytes(16); // 16バイトのIVを生成 (AES-GCM推奨)
        const encoder = new TextEncoder();
        const encodedData = encoder.encode(data);

        const ciphertext = await crypto.subtle.encrypt(
            {
                name: "AES-GCM",
                iv: iv,
            },
            key,
            encodedData
        );

        // IVと暗号化されたデータを結合して返す (IndexedDBに保存するため)
        return {
            iv: Array.from(iv), // ArrayBufferを配列に変換
            ciphertext: Array.from(new Uint8Array(ciphertext)) // ArrayBufferを配列に変換
        };
    };

    /**
     * 暗号化されたデータを復号化する関数 (AES-GCMを使用)
     * @param {{iv: number[], ciphertext: number[]}} encryptedData - IVと暗号化されたデータ
     * @param {CryptoKey} key - 復号化キー
     * @returns {Promise<string>} 復号化されたデータ（文字列）
     */
    const decryptData = async (encryptedData, key) => {
        const iv = new Uint8Array(encryptedData.iv);
        const ciphertext = new Uint8Array(encryptedData.ciphertext).buffer;

        const decrypted = await crypto.subtle.decrypt(
            {
                name: "AES-GCM",
                iv: iv,
            },
            key,
            ciphertext
        );

        const decoder = new TextDecoder();
        return decoder.decode(decrypted);
    };

    /**
     * APIキーを暗号化してIndexedDBに保存する関数
     * @param {string} providerId - LLMプロバイダのID
     * @param {string} apiKey - 保存するAPIキー
     * @param {string} passphrase - APIキーを暗号化するためのパスフレーズ
     * @returns {Promise<boolean>} 保存が成功したかどうか
     */
    const saveEncryptedApiKey = async (providerId, apiKey, passphrase) => {
        const storageKey = `${API_KEY_PREFIX}${providerId}`; // モデルIDを削除
        if (!passphrase) {
            alertMessage('APIキーを保存するにはパスフレーズを入力してください。', 'warning');
            throw new Error('Passphrase is required to save API key.');
        }

        try {
            // パスフレーズ導出用ソルトの取得または生成
            let passphraseSalt = await getSettingFromIndexedDB(PASSPHRASE_SALT_ITEM_KEY);
            if (!passphraseSalt) {
                const newSalt = generateRandomBytes(16);
                passphraseSalt = Array.from(newSalt);
                await saveSettingToIndexedDB(PASSPHRASE_SALT_ITEM_KEY, passphraseSalt);
                passphraseSalt = new Uint8Array(passphraseSalt);
            } else {
                passphraseSalt = new Uint8Array(passphraseSalt);
            }

            const encryptionKey = await deriveKeyFromPassphrase(passphrase, passphraseSalt);
            const encryptedApiKeyData = await encryptData(apiKey, encryptionKey);

            // プロバイダIDをキーとして保存
            await saveSettingToIndexedDB(storageKey, encryptedApiKeyData);

            const providerName = LLM_PROVIDERS.find(p => p.id === providerId)?.name || providerId;
            alertMessage(`${providerName} のAPIキーを暗号化して保存しました。`, 'success');
            return true;
        } catch (error) {
            console.error('APIキーの暗号化保存に失敗しました:', error);
            alertMessage('APIキーの保存に失敗しました。', 'error');
            return false;
        }
    };

    /**
     * IndexedDBから暗号化されたAPIキーを読み込み、復号化する関数
     * @param {string} providerId - LLMプロバイダのID
     * @param {string} passphrase - APIキーを復号化するためのパスフレーズ
     * @returns {Promise<string|null>} 復号化されたAPIキー、またはnull（読み込み失敗時）
     */
    const loadEncryptedApiKey = async (providerId, passphrase) => {
        if (!passphrase) {
            alertMessage('APIキーを読み込むにはパスフレーズを入力してください。', 'warning');
            throw new Error('Passphrase is required to load API key.');
        }

        try {
            const storageKey = `${API_KEY_PREFIX}${providerId}`;
            const encryptedApiKeyData = await getSettingFromIndexedDB(storageKey);
            const passphraseSalt = await getSettingFromIndexedDB(PASSPHRASE_SALT_ITEM_KEY);

            if (!encryptedApiKeyData || !passphraseSalt) {
                alertMessage('保存されたAPIキーまたはパスフレーズ情報がありません。', 'warning');
                return null;
            }

            const encryptionKey = await deriveKeyFromPassphrase(passphrase, new Uint8Array(passphraseSalt));
            const decryptedApiKey = await decryptData(encryptedApiKeyData, encryptionKey);

            const providerName = LLM_PROVIDERS.find(p => p.id === providerId)?.name || providerId;
            alertMessage(`${providerName} のAPIキーを復号化して読み込みました。`, 'success');
            return decryptedApiKey;
        } catch (error) {
            console.error('APIキーの復号化読み込みに失敗しました:', error);
            alertMessage('パスフレーズが正しくないか、APIキーの復号化に失敗しました。', 'error');
            return null;
        }
    };

    /**
     * IndexedDBから設定を取得する汎用関数
     * @param {string} key - 取得する設定のキー
     * @returns {Promise<any>} 取得した設定データ
     */
    const getSettingFromIndexedDB = (key) => {
        return new Promise((resolve, reject) => {
            if (!db) {
                reject(new Error('IndexedDB is not open.'));
                return;
            }
            const transaction = db.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(key);

            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => reject(event.target.error);
        });
    };

    /**
     * IndexedDBに設定を保存する汎用関数
     * @param {string} key - 保存する設定のキー
     * @param {any} value - 保存する設定データ
     * @returns {Promise<void>}
     */
    const saveSettingToIndexedDB = (key, value) => {
        return new Promise((resolve, reject) => {
            if (!db) {
                reject(new Error('IndexedDB is not open.'));
                return;
            }
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.put(value, key);

            request.onsuccess = () => resolve();
            request.onerror = (event) => reject(event.target.error);
        });
    };

    /**
     * IndexedDBから指定されたキーのデータを削除する汎用関数
     * @param {string} key - 削除するデータのキー
     * @returns {Promise<void>}
     */
    const deleteSettingFromIndexedDB = (key) => {
        return new Promise((resolve, reject) => {
            if (!db) {
                reject(new Error('IndexedDB is not open.'));
                return;
            }
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.delete(key);

            request.onsuccess = () => resolve();
            request.onerror = (event) => reject(event.target.error);
        });
    };

    /**
     * APIキーとパスフレーズ関連データをIndexedDBから削除する関数
     * @param {string} providerId - 削除するLLMプロバイダのID
     */
    const deleteApiKeyForProvider = async (providerId) => {
        const providerName = LLM_PROVIDERS.find(p => p.id === providerId)?.name || providerId;

        if (!confirm(`${providerName} のAPIキー情報をIndexedDBから削除してもよろしいですか？この操作は元に戻せません。`)) {
            return;
        }

        try {
            const storageKey = `${API_KEY_PREFIX}${providerId}`;
            await deleteSettingFromIndexedDB(storageKey);
            alertMessage(`${providerName} のAPIキー情報を削除しました。`, 'success');
            // 現在選択中のプロバイダのAPIキーを削除した場合、UIを更新
            if (currentLlmProviderId === providerId) {
                currentApiKey = '';
                apiKeyInput.value = '';
            }
            updateTranslationButtonsState(); // 翻訳ボタンの状態を更新
            renderLlmProviderList(); // リストを再描画
            populateLlmProviderDropdowns(); // グローバルLLMプロバイダドロップダウンを更新
        } catch (error) {
            console.error('APIキーの削除に失敗しました:', error);
            alertMessage('APIキーの削除に失敗しました。', 'error');
        }
    };


    /**
     * ランダムな文字列を生成するヘルパー関数
     * @param {number} length - 生成する文字列の長さ
     * @returns {string} ランダムな文字列
     */
    const generateRandomString = (length) => {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        return result;
    };

    /**
     * エラーメッセージを表示する関数
     * @param {string} message - 表示するエラーメッセージ
     */
    const showErrorMessage = (message) => {
        errorMessage.textContent = message;
        errorMessage.classList.remove('hidden');
        tableContainer.classList.add('hidden'); // テーブルを非表示にする
        translateAllButton.classList.add('hidden'); // 「すべて翻訳」ボタンも非表示にする
        translatedFileDownloadSection.classList.add('hidden'); // 翻訳済みファイルダウンロードセクションも非表示
        translationProgress.classList.add('hidden'); // 進捗表示も非表示
    };

    /**
     * エラーメッセージを非表示にする関数
     */
    const hideErrorMessage = () => {
        errorMessage.classList.add('hidden');
        errorMessage.textContent = '';
    };

    /**
     * テキストが日本語を含むか判定する関数
     * @param {string} text - 判定するテキスト
     * @returns {boolean} 日本語を含む場合はtrue、それ以外はfalse
     */
    const isJapaneseText = (text) => {
        // ひらがな、カタカナ、一般的な漢字の範囲をチェック
        const japaneseRegex = /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}\u3005-\u3006\u3000-\u303F\uFF00-\uFFEF]/u;
        return japaneseRegex.test(text);
    };

    /**
     * テキストを翻訳する非同期関数
     * @param {string} originalText - 翻訳する原文
     * @param {string} key - 文章キー (条件付き口調の判定に使用)
     * @param {string} selectedToneValue - 選択された口調の値
     * @param {string} llmProviderId - 使用するLLMプロバイダのID
     * @returns {Promise<object>} 翻訳結果、ステータス、エラーメッセージを含むオブジェクト
     */
    const translateText = async (originalText, key, selectedToneValue, llmProviderId) => {
        // APIキーが設定されていない場合は翻訳をスキップ
        if (!currentApiKey || currentLlmProviderId !== llmProviderId) {
            const msg = 'APIキーが設定されていないか、選択されたプロバイダのAPIキーがロードされていません。設定モーダルでAPIキーを入力してください。';
            console.warn(msg);
            alertMessage(msg, 'error');
            return { translatedText: 'APIキー未設定', status: 'Error', errorMessage: msg, preModifiedText: originalText, postRestoredText: 'N/A', llmModelId: 'N/A' };
        }

        if (!originalText || originalText.trim() === '') {
            return { translatedText: '', status: 'Success', errorMessage: '', preModifiedText: '', postRestoredText: '', llmModelId: 'N/A' }; // 空のテキストは翻訳しない
        }

        let toneInstruction = '';
        let glossaryInstructions = ''; // 用語集からの指示を追加する変数
        let colorcodeInstructions = ''; // カラーコードからの指示を追加する変数

        // 翻訳に使用するモデルを決定
        const selectedProvider = LLM_PROVIDERS.find(p => p.id === llmProviderId);
        let effectiveLlmModel = null;
        if (selectedProvider && selectedProvider.models) {
            effectiveLlmModel = selectedProvider.models.find(m => m.enabled); // 最初の有効なモデルを使用
        }

        if (!effectiveLlmModel) {
            const msg = `プロバイダ「${selectedProvider?.name || llmProviderId}」には有効なモデルが選択されていません。設定を確認してください。`;
            console.warn(msg);
            alertMessage(msg, 'error');
            return { translatedText: 'モデル未選択', status: 'Error', errorMessage: msg, preModifiedText: originalText, postRestoredText: 'N/A', llmModelId: 'N/A' };
        }

        const effectiveLlmModelId = effectiveLlmModel.id;

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
                    return { translatedText: '翻訳エラー', status: 'Error', errorMessage: errorMsg, preModifiedText: originalText, postRestoredText: 'N/A', llmModelId: effectiveLlmModelId };
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
        // colorcodes: [ [カラーコード以外の部分, カラーコード部分] ]
        let colorcodes = []; // [カラーコード以外の部分, カラーコード部分]
        const codePlaceholderPrefix = "§CODE_PLACEHOLDER_"; // 一時的なプレースホルダーのプレフィックス
        let placeholderCounter = 0; // プレースホルダーのカウンター

        // まず、ユーザー定義の汎用修飾文字を処理
        // matchResults: [元の一般修飾文字列, 置き換えプレースホルダー]
        const matchResults = []; // ここで初期化

        if (modifierCharacters.length > 0 && modifierCharacters[0].regex) {
            try {
                const generalModifierRegex = new RegExp(modifierCharacters[0].regex, 'g');
                let match;
                while ((match = generalModifierRegex.exec(modifiedText)) !== null) {
                    const originalMatch = match[0];
                    const placeholder = `${codePlaceholderPrefix}${placeholderCounter++}§`; // ユニークなプレースホルダー
                    matchResults.push([originalMatch, placeholder]);
                    modifiedText = modifiedText.split(originalMatch).join(placeholder);
                }
            } catch (e) {
                console.error("無効な修飾文字正規表現:", e);
                errorMessageForLog = `無効な修飾文字正規表現: ${e.message}`;
                translationStatus = 'Error';
                finalTranslatedText = '翻訳エラー';
            }
        }

        // その後、カラーコードを処理
        if (translationStatus !== 'Error') {
            try {
                const colorCodeRegex = new RegExp(COLOR_CODE_PATTERN, 'g'); // グローバルフラグを追加
                let match;
                // modifiedTextに対してカラーコードを検索
                while ((match = colorCodeRegex.exec(modifiedText)) !== null) {
                    const fullMatch = match[0]; // 例: §Y§!
                    const colorPartRegex = new RegExp(COLOR_CODE_PART_PATTERN); // 例: §Y
                    const colorPartMatch = fullMatch.match(colorPartRegex);
                    let colorPart = '';
                    if (colorPartMatch && colorPartMatch.length > 0) {
                        colorPart = colorPartMatch[0]; // 最初のマッチを使用
                    }

                    // 甲文字列から'§\\w'と'§!'を削除した文字列
                    // fullMatchからcolorPartと'§!'を削除
                    const textWithoutCode = fullMatch.replace(new RegExp(colorPart.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '!$', 'g'), '').replace(new RegExp(colorPart.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'), '');

                    // colorcodes: [ [カラーコード以外の部分, カラーコード部分] ]
                    colorcodes.push([textWithoutCode, colorPart]);

                    // modifiedTextから元の甲文字列全体を一時的なプレースホルダーで置き換える
                    const placeholder = `${codePlaceholderPrefix}${placeholderCounter++}§`;
                    matchResults.push([fullMatch, placeholder]); // 復元のためにmatchResultsに追加
                    modifiedText = modifiedText.split(fullMatch).join(placeholder);
                }

                // AIへの指示を追加
                if (colorcodes.length > 0) {
                    colorcodeInstructions += `その際、以下にリストされている「カラーコード以外の部分」の日本語訳は、対応する「カラーコード」と「§!」で挟んでください。`;
                    colorcodeInstructions += `\n- カラーコード以外の部分: "${colorcodes.map(entry => entry[0]).join('", "')}"`;
                    colorcodeInstructions += `\n例: 原文「§Y§!Hello§!」が「こんにちは」と翻訳された場合、最終的な出力は「§Y§!こんにちは§!」としてください。`;
                }

                preModifiedText = modifiedText; // 置換後のテキストをログ用に保存
            } catch (e) {
                console.error("無効な修飾文字正規表現 (カラーコード):", e);
                errorMessageForLog = `無効な修飾文字正規表現 (カラーコード): ${e.message}`;
                translationStatus = 'Error';
                finalTranslatedText = '翻訳エラー';
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
                postRestoredText: 'N/A', // エラーの場合は復元されない
                llmModelId: effectiveLlmModelId // LLMモデルIDを追加
            });
            return { translatedText: finalTranslatedText, status: translationStatus, errorMessage: errorMessageForLog, preModifiedText: preModifiedText, postRestoredText: 'N/A', llmModelId: effectiveLlmModelId };
        }

        try {
            // AIへの最終的なプロンプト
            // AIに送るテキストは修飾文字が置き換えられた modifiedText を使用
            const prompt = `以下の英語のテキストを日本語に翻訳してください。翻訳結果のみを返してください。
改行文字（\\n）は原文の通りに翻訳結果にも含めてください。
余計な説明や前置き、後書きは一切含めないでください。
${toneInstruction}
${glossaryInstructions}
${colorcodeInstructions}
${modifiedText}`;

            // LLM呼び出しを抽象化された関数に置き換え
            const llmResponse = await callLLMService(effectiveLlmModelId, prompt, currentApiKey);
            finalTranslatedText = llmResponse.translatedText;

        } catch (error) {
            finalTranslatedText = '翻訳エラー';
            translationStatus = 'Error';
            errorMessageForLog = error.message || '不明なエラー';
            console.error('翻訳中にエラーが発生しました:', error);
        }

        // --- 修飾文字の事後処理（復元） ---
        postRestoredText = finalTranslatedText; // 復元前の翻訳結果を保存

        // matchResultsに格納された順序の逆順で復元する
        // これにより、ネストされたプレースホルダーも正しく復元される
        for (let i = matchResults.length - 1; i >= 0; i--) {
            const item = matchResults[i];
            const originalMatch = item[0]; // 元の文字列
            const placeholder = item[1];   // 置き換え文字

            // placeholderが正規表現の特殊文字を含む可能性があるためエスケープ
            const escapedPlaceholder = placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const placeholderRegex = new RegExp(escapedPlaceholder, 'g');
            postRestoredText = postRestoredText.replace(placeholderRegex, originalMatch);
        }

        postRestoredText = postRestoredText.replace(/§！/g, '§!'); // 翻訳結果に対して '§！' を '§!' に置換
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
            postRestoredText: finalTranslatedText, // 復元後の翻訳文
            llmModelId: effectiveLlmModelId // LLMモデルIDを追加
        });

        // 翻訳結果、ステータス、エラーメッセージをオブジェクトとして返す
        return { translatedText: finalTranslatedText, status: translationStatus, errorMessage: errorMessageForLog, preModifiedText: preModifiedText, postRestoredText: postRestoredText, llmModelId: effectiveLlmModelId };
    };

    /**
     * 個別の行を翻訳する関数
     * @param {HTMLElement} rowElement - 翻訳対象の行要素
     */
    const translateRow = async (rowElement) => {
        // APIキーが設定されていない場合は処理を中断
        if (!currentApiKey) {
            alertMessage('APIキーが設定されていません。設定モーダルでAPIキーを入力してください。', 'error');
            return;
        }

        const keyCell = rowElement.querySelector('td.string_key-column-header'); // キーセルを取得
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
            // translateText に key と現在のLLMプロバイダIDを渡す
            const result = await translateText(originalText, key, selectedIndividualTone, currentLlmProviderId);
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

    /**
     * ファイルの内容を解析してテーブルを生成する関数
     * @param {string} content - ファイルのテキスト内容
     */
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

                // カラーコードのみの原文を無視
                try {
                    const fullColorCodeRegex = new RegExp(`^${COLOR_CODE_PATTERN}$`); // sourceプロパティで正規表現のパターン文字列を取得
                    if (fullColorCodeRegex.test(value)) {
                        console.log(`Skipping color-code-only text: "${value}"`);
                        return;
                    }
                } catch (e) {
                    console.error("カラーコード正規表現のテスト中にエラーが発生しました:", e);
                }


                html += `<tr data-key="${escapeHTML(key)}" data-is-reviewed="false">`; // data-keyとdata-is-reviewedを追加
                html += `<td class="delete-column-cell"><button class="delete-row-button"><i class="fas fa-trash-alt"></i></button></td>`; // 削除ボタンを追加
                html += `<td class="string_key-column-header">${escapeHTML(key)}</td>`; // キーセルにクラスを追加
                html += `<td class="original-text-cell">${escapeHTML(value)}</td>`; // 原文セルにクラスを追加
                // 翻訳セルに title 属性を追加して、編集可能であることを示す
                html += `<td class="translation-cell" title="クリックして編集">未翻訳</td>`; // 初期表示は「未翻訳」
                // 校閲チェックボックスを追加 (デフォルトでチェックなし)
                html += `<td class="review-column-cell"><input type="checkbox" class="review-checkbox h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"></td>`;
                // 個別の口調設定ドロップダウンを追加
                html += `<td>
                            <select class="individual-tone-select">
                                </select>
                        </td>`;
                html += `<td>
                            <button class="translate-button">翻訳</button>
                            <button class="get-suggestions-button ml-2 bg-purple-600 text-white px-2 py-1 rounded-lg shadow-md hover:bg-purple-700 transition-colors duration-300 text-xs">
                                <i class="fas fa-caret-down"></i>
                            </button>
                        </td>`; // 他の提案ボタンを追加
                html += `</tr>`;
                hasValidEntries = true;
            } else {
                html += `<tr data-key="N/A" data-is-reviewed="false">`; // 解析失敗行にもdata属性を追加
                html += `<td colspan="7" class="text-red-500">解析失敗: ${escapeHTML(line)}</td>`; // colspanを7に修正
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
        updateTranslationButtonsState(); // APIキーの状態に基づいてボタンを更新
    };

    /**
     * HTMLエスケープ関数 (XSS対策)
     * @param {string} str - エスケープする文字列
     * @returns {string} エスケープされた文字列
     */
    const escapeHTML = (str) => {
        const div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    };

    /**
     * ファイルを読み込む関数
     * @param {File} file - 読み込むファイルオブジェクト
     */
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

    /**
     * APIキー以外の設定をlocalStorageに保存する関数
     */
    const saveOtherSettingsToLocalStorage = () => {
        try {
            const settings = {
                defaultTone: defaultToneSelect ? defaultToneSelect.value : 'da_dearu',
                customTones: customTones,
                glossaryTerms: glossaryTerms,
                modifierCharacters: modifierCharacters,
                isReviewModeEnabled: isReviewModeEnabled,
                llmProviders: LLM_PROVIDERS, // LLMプロバイダリストを保存 (enabled状態も含む)
                currentLlmProviderId: currentLlmProviderId, // 現在選択中のLLMプロバイダIDを保存
                // currentLlmModelId はAPIキー管理から独立し、選択されたプロバイダの有効モデルから動的に決定されるため、ここでは保存しない
            };
            localStorage.setItem('translationAppSettings', JSON.stringify(settings));
            globalToneSelect.value = settings.defaultTone;
            console.log("Other settings saved to localStorage:", settings);
        } catch (error) {
            console.error("Error saving other settings to localStorage:", error);
            alertMessage("その他の設定の保存に失敗しました。", 'error');
        }
    };

    /**
     * 設定をIndexedDBとlocalStorageから読み込む関数
     */
    const loadSettings = async () => {
        try {
            // LLM_PROVIDERSのデフォルト値を設定
            const DEFAULT_LLM_PROVIDERS_CONFIG = [
                {
                    id: 'gemini',
                    name: 'Gemini',
                    defaultApiKeyLabel: 'Gemini APIキー',
                    defaultPlaceholder: 'YOUR GEMINI API KEY',
                    models: [
                        { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', enabled: false },
                        { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', enabled: false },
                        { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', enabled: false },
                        { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', enabled: false }
                    ]
                },
                {
                    id: 'openai',
                    name: 'Chat GPT',
                    defaultApiKeyLabel: 'OpenAI APIキー',
                    defaultPlaceholder: 'YOUR OPENAI API KEY',
                    models: [
                        { id: 'gpt-4o', name: 'GPT-4o', enabled: false },
                        { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', enabled: false }
                    ]
                },
                {
                    id: 'anthropic',
                    name: 'Claude',
                    defaultApiKeyLabel: 'Anthropic APIキー',
                    defaultPlaceholder: 'YOUR ANTHROPIC API KEY',
                    models: [
                        { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', enabled: false },
                        { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', enabled: false }
                    ]
                }
            ];

            // APIキー以外の設定をlocalStorageから読み込む
            const settingsJson = localStorage.getItem('translationAppSettings');
            if (settingsJson) {
                const settings = JSON.parse(settingsJson);
                customTones = settings.customTones || [];
                glossaryTerms = settings.glossaryTerms || [];
                modifierCharacters = settings.modifierCharacters || [];
                isReviewModeEnabled = settings.isReviewModeEnabled || false;

                // LLM_PROVIDERSをデフォルト設定で初期化し、localStorageから読み込んだプロバイダで上書き/マージ
                LLM_PROVIDERS = JSON.parse(JSON.stringify(DEFAULT_LLM_PROVIDERS_CONFIG)); // ディープコピー

                if (settings.llmProviders && Array.isArray(settings.llmProviders)) {
                    LLM_PROVIDERS = LLM_PROVIDERS.map(defaultP => {
                        const loadedP = settings.llmProviders.find(p => p.id === defaultP.id);
                        if (loadedP) {
                            // 既存のプロバイダの場合、モデルのenabled状態をマージ
                            defaultP.models = defaultP.models.map(defaultM => {
                                const loadedM = loadedP.models.find(m => m.id === defaultM.id);
                                return loadedM ? { ...defaultM, enabled: loadedM.enabled } : defaultM;
                            });
                            // ロードされたプロバイダに新しいモデルがあれば追加
                            loadedP.models.forEach(loadedM => {
                                if (!defaultP.models.some(m => m.id === loadedM.id)) {
                                    defaultP.models.push(loadedM);
                                }
                            });
                            return defaultP;
                        }
                        return defaultP;
                    });
                    // 以前のカスタムプロバイダも追加 (もしあれば)
                    settings.llmProviders.forEach(loadedP => {
                        if (!LLM_PROVIDERS.some(p => p.id === loadedP.id)) {
                            LLM_PROVIDERS.push(loadedP);
                        }
                    });
                }

                currentLlmProviderId = settings.currentLlmProviderId || ''; // 初期値を空にする
                // currentLlmModelId はAPIキー管理から独立し、選択されたプロバイダの有効モデルから動的に決定されるため、ここでは保存しない

                // customTonesが空の場合、デフォルトの口調を追加
                if (customTones.length === 0) {
                    customTones.push({ value: 'da_dearu', name: 'だ・である調', instruction: '自称は「我ら」を使用し、語尾は「である」または「だ」調にしてください。', isConditional: false, conditions: [], elseInstruction: '' });
                    customTones.push({ value: 'taigen_dome', name: '体言止め', instruction: '自称は「我ら」を使用し、語尾は体言止めにしてください。', isConditional: false, conditions: [], elseInstruction: '' });
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
                    saveOtherSettingsToLocalStorage();
                }

                // modifierCharactersが空の場合、デフォルトの修飾文字を追加
                if (modifierCharacters.length === 0) {
                    modifierCharacters.push({ name: 'デフォルト', regex: DEFAULT_MODIFIER_REGEX });
                    saveOtherSettingsToLocalStorage();
                }

                // UIに反映
                if (defaultToneSelect) {
                    defaultToneSelect.value = settings.defaultTone || 'da_dearu';
                }
                if (reviewModeCheckbox) {
                    reviewModeCheckbox.checked = isReviewModeEnabled;
                }

                populateToneDropdowns();
                globalToneSelect.value = settings.defaultTone || 'da_dearu';
                if (modifierCharacters.length > 0) {
                    modifierNameInput.value = modifierCharacters[0].name;
                    modifierRegexInput.value = modifierCharacters[0].regex;
                } else {
                    modifierNameInput.value = 'デフォルト';
                    modifierRegexInput.value = DEFAULT_MODIFIER_REGEX;
                }

                console.log("Other settings loaded from localStorage:", settings);
            } else {
                console.log("No other settings found in localStorage, initializing with defaults.");
                customTones = [];
                glossaryTerms = [];
                modifierCharacters = [];
                isReviewModeEnabled = false;

                LLM_PROVIDERS = JSON.parse(JSON.stringify(DEFAULT_LLM_PROVIDERS_CONFIG)); // デフォルト設定で初期化
                currentLlmProviderId = ''; // 初期値を空にする
                // currentLlmModelId はここでは初期化しない

                customTones.push({ value: 'da_dearu', name: 'だ・である調', instruction: '自称は「我ら」を使用し、語尾は「である」または「だ」調にしてください。', isConditional: false, conditions: [], elseInstruction: '' });
                customTones.push({ value: 'taigen_dome', name: '体言止め', instruction: '自称は「我ら」を使用し、語尾は体言止めにしてください。', isConditional: false, conditions: [], elseInstruction: '' });
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
                modifierCharacters.push({ name: 'デフォルト', regex: DEFAULT_MODIFIER_REGEX });

                saveOtherSettingsToLocalStorage(); // デフォルト設定をlocalStorageに保存

                if (defaultToneSelect) {
                    defaultToneSelect.value = 'da_dearu';
                }
                if (reviewModeCheckbox) {
                    reviewModeCheckbox.checked = false;
                }

                populateToneDropdowns();
                globalToneSelect.value = 'da_dearu';
                modifierNameInput.value = 'デフォルト';
                modifierRegexInput.value = DEFAULT_MODIFIER_REGEX;
            }

            // LLMプロバイダ選択ドロップダウンを更新
            populateLlmProviderDropdowns();
            updateReviewColumnVisibility(); // 設定ロード後、校閲列の表示を更新
        } catch (error) {
            console.error("Error loading settings:", error);
            alertMessage("設定の読み込み中にエラーが発生しました。", 'error');
        }
    };

    /**
     * 設定を保存する関数 (APIキーの保存ロジックを含む)
     */
    const saveSettings = async () => {
        try {
            const apiKey = apiKeyInput.value.trim();
            const passphrase = apiPassphraseInput.value.trim();
            const selectedProviderId = llmProviderSelect.value;

            // プロバイダが選択されていない場合はエラー
            if (!selectedProviderId) {
                alertMessage('APIキーを保存するには、翻訳プロバイダを選択してください。', 'warning');
                return;
            }

            // 選択されたプロバイダのモデルのenabled状態を更新
            const providerToUpdate = LLM_PROVIDERS.find(p => p.id === selectedProviderId);
            if (providerToUpdate) {
                const checkboxes = llmModelCheckboxList.querySelectorAll('input[type="checkbox"]');
                checkboxes.forEach(checkbox => {
                    const modelId = checkbox.dataset.modelId;
                    const model = providerToUpdate.models.find(m => m.id === modelId);
                    if (model) {
                        model.enabled = checkbox.checked;
                    }
                });
            }

            // 新しいAPIキーが入力されており、かつ既存のAPIキーと異なる場合のみ、暗号化して保存を試みる
            // または、APIキーがまだ設定されていない（初回設定）場合も保存を試みる
            // currentApiKeyは現在メモリ上にロードされているAPIキーを指す
            if (apiKey && (apiKey !== currentApiKey || !currentApiKey)) {
                const success = await saveEncryptedApiKey(selectedProviderId, apiKey, passphrase);
                if (success) {
                    currentApiKey = apiKey; // 成功したらcurrentApiKeyを更新
                    apiKeyInput.value = ''; // APIキー入力フィールドをクリア
                    apiPassphraseInput.value = ''; // パスフレーズ入力フィールドをクリア
                    updateTranslationButtonsState(); // 翻訳ボタンの状態を更新
                } else {
                    // 保存失敗時は処理を中断
                    return;
                }
            } else if (!apiKey && currentApiKey && currentLlmProviderId === selectedProviderId) {
                // APIキーが入力フィールドから削除されたが、既存のAPIキーがメモリにある場合
                // これは、ユーザーがAPIキーをクリアしたが、実際にはまだロードされている状態
                // この場合は何もしないか、ユーザーに明示的に削除を促す
                alertMessage('APIキーが変更されていないため、パスフレーズは不要です。', 'info');
            } else if (!apiKey && !currentApiKey) {
                // APIキーもパスフレーズも入力されていない場合（何もしない）
                alertMessage('APIキーが入力されていません。', 'info');
            }

            // APIキー以外の設定をlocalStorageに保存
            saveOtherSettingsToLocalStorage();
            renderLlmProviderList(); // LLMプロバイダリストを再描画
            populateLlmProviderDropdowns(); // グローバルLLMプロバイダドロップダウンを更新

            alertMessage("設定を保存しました。", 'success');
        } catch (error) {
            console.error("Error saving settings:", error);
            alertMessage("設定の保存に失敗しました。", 'error');
        }
    };

    /**
     * カスタムアラートメッセージボックスを表示する関数
     * @param {string} message - 表示するメッセージ
     * @param {string} type - メッセージの種類 ('success', 'error', 'warning', 'info')
     */
    const alertMessage = (message, type = 'info') => {
        let alertContainer = document.getElementById('alert-container'); // アラートコンテナを取得
        if (!alertContainer) {
            // alert-container がなければ作成し、body に追加
            const newContainer = document.createElement('div');
            newContainer.id = 'alert-container';
            newContainer.className = 'fixed top-4 right-4 z-[9999] flex flex-col items-end space-y-2'; // Tailwind CSS クラスで配置と間隔を定義
            document.body.appendChild(newContainer);
            alertContainer = newContainer;
        }

        const alertDiv = document.createElement('div');
        let bgColor = 'bg-blue-500';
        if (type === 'success') bgColor = 'bg-green-500';
        else if (type === 'error') bgColor = 'bg-red-500';
        else if (type === 'warning') bgColor = 'bg-yellow-500';

        alertDiv.className = `${bgColor} text-white px-6 py-3 rounded-lg shadow-lg opacity-0 transition-opacity duration-300`;
        alertDiv.textContent = message;

        // 新しいアラートをコンテナの先頭に追加 (新しいものが上に来るように)
        alertContainer.prepend(alertDiv);

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
     * LLMプロバイダドロップダウンのオプションHTMLを生成する関数
     * @param {Array<object>} providers - LLMプロバイダの配列
     * @returns {string} オプションのHTML文字列
     */
    const createLlmProviderOptionsHtml = (providers, includeSelectOption = false) => {
        let optionsHtml = '';
        if (includeSelectOption) {
            optionsHtml += '<option value="">選択してください</option>';
        }
        providers.forEach(provider => {
            optionsHtml += `<option value="${escapeHTML(provider.id)}">${escapeHTML(provider.name)}</option>`;
        });
        return optionsHtml;
    };

    /**
     * IndexedDBにAPIキーが保存されているLLMプロバイダと、有効なモデルを持つプロバイダのリストを取得する関数
     * @returns {Promise<Array<object>>} 保存済みAPIキーと有効なモデルを持つLLMプロバイダの配列
     */
    const getSavedAndEnabledLlmProviders = async () => {
        const savedProviders = [];
        for (const provider of LLM_PROVIDERS) {
            const storageKey = `${API_KEY_PREFIX}${provider.id}`;
            const encryptedApiKey = await getSettingFromIndexedDB(storageKey);
            if (encryptedApiKey) {
                // APIキーが保存されており、かつ有効なモデルが少なくとも1つあるプロバイダのみを対象とする
                const hasEnabledModel = provider.models && provider.models.some(model => model.enabled);
                if (hasEnabledModel) {
                    savedProviders.push({ providerId: provider.id, providerName: provider.name });
                }
            }
        }
        return savedProviders;
    };

    /**
     * LLMプロバイダドロップダウンとモデルチェックボックスを動的に生成する関数
     */
    const populateLlmProviderDropdowns = async () => {
        // 設定モーダル内のLLMプロバイダ選択ドロップダウンを更新 (全プロバイダを表示)
        llmProviderSelect.innerHTML = createLlmProviderOptionsHtml(LLM_PROVIDERS, true); // 「選択してください」を追加
        llmProviderSelect.value = currentLlmProviderId; // 現在選択中のプロバイダを選択

        // 一括翻訳LLMプロバイダ選択ドロップダウンを更新 (保存済みかつ有効なモデルを持つプロバイダのみ表示)
        const savedAndEnabledProviders = await getSavedAndEnabledLlmProviders();

        // globalLlmProviderSelectのオプションを生成
        let globalOptionsHtml = '<option value="">選択してください</option>'; // デフォルトで「選択してください」を追加
        savedAndEnabledProviders.forEach(provider => {
            globalOptionsHtml += `<option value="${escapeHTML(provider.providerId)}">${escapeHTML(provider.providerName)}</option>`;
        });
        globalLlmProviderSelect.innerHTML = globalOptionsHtml;

        // 現在選択中のプロバイダが一括翻訳リストに存在するかチェック
        if (savedAndEnabledProviders.some(p => p.providerId === currentLlmProviderId)) {
            globalLlmProviderSelect.value = currentLlmProviderId;
        } else {
            // 存在しない場合は、「選択してください」をデフォルトにする
            globalLlmProviderSelect.value = '';
            currentLlmProviderId = ''; // グローバル変数もクリア
            currentApiKey = ''; // ロードされたAPIキーもクリア
        }

        // 選択されたプロバイダに基づいてモデルチェックボックスを更新
        renderLlmModelCheckboxes(currentLlmProviderId);
    };

    /**
     * 指定されたプロバイダIDに基づいてLLMモデルチェックボックスを更新する関数
     * @param {string} providerId - 選択されたLLMプロバイダのID
     */
    const renderLlmModelCheckboxes = (providerId) => {
        llmModelCheckboxList.innerHTML = ''; // リストをクリア
        const selectedProvider = LLM_PROVIDERS.find(p => p.id === providerId);

        if (selectedProvider && selectedProvider.models && selectedProvider.models.length > 0) {
            selectedProvider.models.forEach(model => {
                const checkboxDiv = document.createElement('div');
                checkboxDiv.className = 'flex items-center';
                checkboxDiv.innerHTML = `
                    <input type="checkbox" id="model-${escapeHTML(model.id)}" data-model-id="${escapeHTML(model.id)}"
                           class="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                           ${model.enabled ? 'checked' : ''}>
                    <label for="model-${escapeHTML(model.id)}" class="ml-2 text-gray-700">${escapeHTML(model.name)}</label>
                `;
                llmModelCheckboxList.appendChild(checkboxDiv);

                // チェックボックスの変更イベントリスナーを追加
                checkboxDiv.querySelector('input').addEventListener('change', (event) => {
                    model.enabled = event.target.checked;
                    // モデルのenabled状態が変更されたら、localStorageに保存
                    saveOtherSettingsToLocalStorage();
                    // populateLlmProviderDropdowns() の呼び出しを削除またはコメントアウト
                    // populateLlmProviderDropdowns(); // <-- この行を削除またはコメントアウト
                });
            });
        } else {
            llmModelCheckboxList.innerHTML = '<p class="text-gray-500 text-sm">プロバイダを選択してください。</p>';
        }
    };


    /**
     * 登録済みLLMプロバイダのリストをレンダリングする関数 (新規追加)
     */
    const renderLlmProviderList = async () => {
        if (!llmProviderList) return;

        llmProviderList.innerHTML = ''; // リストをクリア
        let hasSavedProviders = false;

        // APIキーが保存されているすべてのプロバイダを取得
        const allProvidersWithSavedKeys = [];
        for (const provider of LLM_PROVIDERS) {
            const storageKey = `${API_KEY_PREFIX}${provider.id}`;
            const encryptedApiKey = await getSettingFromIndexedDB(storageKey);
            if (encryptedApiKey) {
                allProvidersWithSavedKeys.push(provider);
            }
        }

        if (allProvidersWithSavedKeys.length > 0) {
            hasSavedProviders = true;
            allProvidersWithSavedKeys.forEach(provider => {
                const listItem = document.createElement('li');
                listItem.className = 'llm-provider-item flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg';

                // 有効なモデルのリストを生成
                const enabledModels = provider.models.filter(m => m.enabled).map(m => m.name).join(', ');
                const modelDisplay = enabledModels ? ` (${enabledModels})` : ' (モデル未選択)';

                listItem.innerHTML = `
                    <div class="flex-grow">
                        <strong class="text-gray-800">${escapeHTML(provider.name)}</strong>
                        <span class="ml-2 text-sm text-green-500">(保存済み)</span>
                        <p class="text-xs text-gray-600">有効なモデル: ${escapeHTML(modelDisplay)}</p>
                    </div>
                    <div class="button-group flex space-x-2">
                        <button class="edit-llm-provider-button bg-blue-500 text-white px-3 py-1 rounded-md text-xs hover:bg-blue-600 transition-colors duration-200" data-provider-id="${escapeHTML(provider.id)}">編集</button>
                        <button class="delete-llm-provider-button bg-red-500 text-white px-3 py-1 rounded-md text-xs hover:bg-red-600 transition-colors duration-200" data-provider-id="${escapeHTML(provider.id)}">削除</button>
                    </div>
                `;
                llmProviderList.appendChild(listItem);
            });
        }

        if (!hasSavedProviders) {
            llmProviderList.innerHTML = '<li class="text-gray-600 text-sm text-center">APIキーが保存されているプロバイダはありません。</li>';
        }
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
        const individualSelects = document.querySelectorAll('.individual-tone-select');
        individualSelects.forEach(selectElement => {
            selectElement.innerHTML = createToneOptionsHtml(allTones, true); // 個別設定には「全体設定に沿う」オプションを追加
        });

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
     * 翻訳ログをダウンロードする関数
     */
    const downloadTranslationLog = () => {
        if (translationLog.length === 0) {
            alertMessage("ダウンロードする翻訳ログがありません。", 'warning');
            return;
        }

        // CSV header
        // 修飾文字置換前と復元後の列を追加, LLMモデルIDも追加
        let csvContent = "number,date,original txt,tone,translated text,status,error_message,pre_modified_text,post_restored_text,llm_model_id\n";

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
                entry.postRestoredText || '', // 修飾文字復元後のテキスト
                entry.llmModelId || '' // LLMモデルIDを追加
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

            // 'variants'が存在し、配列であればそのまま使用。そうでなければ空の配列。
            const originalAlt = Array.isArray(item.variants)
                                ? item.variants.map(v => String(v).trim()).filter(v => v !== '') // 'variants'を'originalAlt'にマッピング
                                : [];

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
            saveOtherSettingsToLocalStorage(); // 用語集を保存
            renderGlossaryTerms(); // リストを更新
            alertMessage(`${newTermsAdded}件の用語を追加しました。${termsSkipped > 0 ? `(${termsSkipped}件の用語をスキップしました。)` : ''}`, 'success');
        } else if (termsSkipped > 0) {
            alertMessage(`用語集ファイルから有効な用語が見つかりませんでした。${termsSkipped}件の用語をスキップしました。`, 'warning');
        } else {
            alertMessage('用語集ファイルから追加できる用語が見つかりませんでした。', 'info');
        }
    };

    /**
     * 修飾文字フォームのリセット関数
     */
    const resetModifierForm = () => {
        modifierNameInput.value = 'デフォルト'; // 名前のデフォルト値
        modifierRegexInput.value = DEFAULT_MODIFIER_REGEX; // 正規表現のデフォルト値
        addModifierButton.textContent = '設定を保存'; // ボタンのテキストを「設定を保存」に変更
        cancelModifierEditButton.classList.add('hidden');
        editingModifierIndex = null; // 編集モードを解除
    };

    /**
     * タブを切り替える関数
     * @param {string} tabId - 表示するタブのID
     */
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
            // ここでllmProviderSelectを「選択してください」にリセット
            llmProviderSelect.value = '';
            renderLlmModelCheckboxes(''); // モデルチェックボックスリストをクリア
            apiKeyInput.value = ''; // APIキー入力フィールドもクリア
            currentApiKey = ''; // currentApiKeyもクリア
            updateTranslationButtonsState(); // 翻訳ボタンの状態を更新
            renderLlmProviderList(); // LLMプロバイダリストを再描画
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

    /**
     * 校閲列の表示/非表示を切り替える関数
     */
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

    /**
     * キー列の幅を調整する関数
     */
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

    /**
     * 翻訳ボタンと全体翻訳ボタンの状態を更新する関数
     */
    const updateTranslationButtonsState = () => {
        // 現在APIキーが設定されているかチェック
        const isApiKeySet = !!currentApiKey;

        // 全体翻訳ボタン
        if (translateAllButton) {
            let providerName = 'プロバイダ未選択';
            if (currentLlmProviderId) {
                const selectedProvider = LLM_PROVIDERS.find(p => p.id === currentLlmProviderId);
                providerName = selectedProvider ? selectedProvider.name : 'プロバイダ未選択';
            }

            translateAllButton.disabled = !isApiKeySet;
            // ボタンのテキストに選択されているプロバイダ名を表示
            translateAllButton.querySelector('span').textContent = isApiKeySet ? `すべて翻訳 (${providerName})` : 'APIキー未設定';
        }

        // 個別翻訳ボタン
        const individualTranslateButtons = document.querySelectorAll('.translate-button');
        individualTranslateButtons.forEach(button => {
            button.disabled = !isApiKeySet;
            button.textContent = isApiKeySet ? '翻訳' : 'APIキー未設定';
        });

        // 他の提案ボタン
        const getSuggestionsButtons = document.querySelectorAll('.get-suggestions-button');
        getSuggestionsButtons.forEach(button => {
            button.disabled = !isApiKeySet;
            // アイコンの表示は、オーバーレイの状態によって制御されるため、ここでは変更しない
        });
    };

    /**
     * パスワード表示/非表示を切り替える汎用関数
     * @param {HTMLInputElement} inputElement - パスワード入力フィールド
     * @param {HTMLButtonElement} toggleButton - 表示切り替えボタン
     */
    const setupPasswordToggle = (inputElement, toggleButton) => {
        if (!inputElement || !toggleButton) return;

        const icon = toggleButton.querySelector('i');

        const showPassword = () => {
            inputElement.type = 'text';
            if (icon) {
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash'); // 隠すアイコン
            }
        };

        const hidePassword = () => {
            inputElement.type = 'password';
            if (icon) {
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye'); // 表示アイコン
            }
        };

        // マウスイベント
        toggleButton.addEventListener('mousedown', showPassword);
        toggleButton.addEventListener('mouseup', hidePassword);
        toggleButton.addEventListener('mouseleave', hidePassword); // ボタンからマウスが離れたら隠す

        // タッチイベント (モバイル対応)
        toggleButton.addEventListener('touchstart', showPassword);
        toggleButton.addEventListener('touchend', hidePassword);
        toggleButton.addEventListener('touchcancel', hidePassword); // タッチがキャンセルされたら隠す
    };

    /**
     * 翻訳案を取得し、オーバーレイに表示する関数
     * @param {HTMLElement} rowElement - 翻訳案を表示する対象の行要素
     */
    const showSuggestionsOverlay = async (rowElement) => {
        // APIキーが設定されていない場合は処理を中断
        if (!currentApiKey) {
            alertMessage('APIキーが設定されていません。設定モーダルでAPIキーを入力してください。', 'error');
            return;
        }

        const originalTextCell = rowElement.querySelector('.original-text-cell');
        const keyCell = rowElement.querySelector('td.string_key-column-header');
        const originalText = originalTextCell.textContent;
        const key = keyCell.textContent;
        const translationCell = rowElement.querySelector('.translation-cell');
        const individualToneSelect = rowElement.querySelector('.individual-tone-select');
        const selectedIndividualTone = individualToneSelect.value; // 個別設定の口調を取得

        currentOverlayRow = rowElement; // 現在オーバーレイが表示されている行を記録

        // オーバーレイの位置を設定
        const rect = translationCell.getBoundingClientRect();
        const tableRect = tableContainer.getBoundingClientRect();

        suggestionsOverlay.style.top = `${rect.top - tableRect.top + rect.height + 5}px`; // 行の下に表示
        suggestionsOverlay.style.left = `${rect.left - tableRect.left}px`;
        suggestionsOverlay.style.width = `${rect.width}px`; // 翻訳セルの幅に合わせる
        suggestionsOverlay.classList.remove('hidden');
        suggestionsList.innerHTML = '<div class="text-center text-gray-500">翻訳案を読み込み中...</div>'; // ロード中メッセージ

        // 他の提案ボタンのアイコンを上向きに変更
        const currentSuggestionButton = rowElement.querySelector('.get-suggestions-button i');
        if (currentSuggestionButton) {
            currentSuggestionButton.classList.remove('fa-caret-down');
            currentSuggestionButton.classList.add('fa-caret-up');
        }

        const suggestionResults = [];

        // 現在選択されているプロバイダの、有効なモデルからのみ翻訳案を取得
        const selectedProvider = LLM_PROVIDERS.find(p => p.id === currentLlmProviderId);
        if (selectedProvider && selectedProvider.models) {
            for (const model of selectedProvider.models) {
                if (model.enabled) {
                    try {
                        const result = await translateText(originalText, key, selectedIndividualTone, selectedProvider.id);
                        if (result.status === 'Success') {
                            suggestionResults.push({
                                providerName: selectedProvider.name,
                                modelName: model.name, // モデル名も追加
                                translatedText: result.translatedText
                            });
                        } else {
                            suggestionResults.push({
                                providerName: selectedProvider.name,
                                modelName: model.name,
                                translatedText: `エラー: ${result.errorMessage}`,
                                isError: true
                            });
                        }
                    } catch (error) {
                        console.error(`Error fetching suggestion from ${selectedProvider.name} (${model.name}):`, error);
                        suggestionResults.push({
                            providerName: selectedProvider.name,
                            modelName: model.name,
                            translatedText: `エラー: ${error.message || '不明なエラー'}`,
                            isError: true
                        });
                    }
                }
            }
        }


        // 翻訳案をリストに表示
        suggestionsList.innerHTML = ''; // クリア
        if (suggestionResults.length === 0) {
            suggestionsList.innerHTML = '<div class="text-center text-gray-500">翻訳案が見つかりませんでした。</div>';
        } else {
            suggestionResults.forEach(suggestion => {
                const suggestionItem = document.createElement('div');
                suggestionItem.className = 'flex items-start justify-between p-2 border-b border-gray-100 last:border-b-0';
                suggestionItem.innerHTML = `
                    <div class="flex-grow pr-2">
                        <strong class="text-sm text-gray-700">${escapeHTML(suggestion.providerName)} (${escapeHTML(suggestion.modelName)}):</strong>
                        <span class="text-gray-900 text-sm whitespace-pre-wrap ${suggestion.isError ? 'text-red-500' : ''}">${escapeHTML(suggestion.translatedText)}</span>
                    </div>
                    <button class="copy-suggestion-button text-gray-500 hover:text-blue-600 transition-colors duration-200 p-1 rounded-md" title="この翻訳を採用">
                        <i class="fa-solid fa-clone"></i>
                    </button>
                `;
                // コピーボタンにイベントリスナーを追加
                const copyButton = suggestionItem.querySelector('.copy-suggestion-button');
                if (copyButton) {
                    copyButton.addEventListener('click', () => {
                        translationCell.textContent = suggestion.translatedText;
                        hideSuggestionsOverlay(); // 採用したらオーバーレイを閉じる
                        alertMessage('翻訳を適用しました。', 'success');
                    });
                }
                suggestionsList.appendChild(suggestionItem);
            });
        }
    };

    /**
     * 翻訳案オーバーレイを非表示にする関数
     */
    const hideSuggestionsOverlay = () => {
        suggestionsOverlay.classList.add('hidden');
        if (currentOverlayRow) {
            const currentSuggestionButton = currentOverlayRow.querySelector('.get-suggestions-button i');
            if (currentSuggestionButton) {
                currentSuggestionButton.classList.remove('fa-caret-up');
                currentSuggestionButton.classList.add('fa-caret-down');
            }
            currentOverlayRow = null; // 現在の行をリセット
        }
    };

    /**
     * 指定されたLLMプロバイダのAPIキーをIndexedDBから読み込み、UIとcurrentApiKeyを更新する関数
     * @param {string} providerId - LLMプロバイダのID
     */
    const loadApiKeyForSelectedProvider = async (providerId) => {
        const provider = LLM_PROVIDERS.find(p => p.id === providerId);

        // APIキー入力欄を有効化し、パスワード表示/非表示ボタンも有効化
        apiKeyInput.disabled = false;
        apiPassphraseInput.disabled = false;
        toggleApiPassphraseButton.disabled = false;
        deleteApiKeyButton.disabled = false;

        if (!providerId || !provider) {
            // 「選択してください」が選択された場合や、プロバイダが見つからない場合
            apiKeyInput.value = '';
            currentApiKey = '';
            apiKeyLabel.textContent = 'APIキー:';
            apiKeyInput.placeholder = 'APIキー';
            updateTranslationButtonsState();
            return;
        }

        // APIキーのラベルとプレースホルダーを更新
        apiKeyLabel.textContent = `${provider.defaultApiKeyLabel || 'APIキー'}:`;
        apiKeyInput.placeholder = provider.defaultPlaceholder || 'YOUR API KEY';

        // currentApiKeyが既に選択されたプロバイダのものであれば、再ロードやパスフレーズ要求は不要
        if (currentLlmProviderId === providerId && currentApiKey) {
            apiKeyInput.value = currentApiKey; // 実際のAPIキーを表示
            updateTranslationButtonsState();
            return;
        }

        try {
            const storageKey = `${API_KEY_PREFIX}${providerId}`;
            const encryptedApiKeyData = await getSettingFromIndexedDB(storageKey);

            if (encryptedApiKeyData) {
                // パスフレーズモーダルを表示して復号化を促す
                passphraseModal.classList.remove('hidden');
                passphraseInputForDecrypt.focus();
                // 復号化が成功したら、currentApiKeyが設定される
                // ここではUIを更新するのみ
                apiKeyInput.value = '********'; // 読み込み中はマスク
                currentApiKey = ''; // 一旦クリア
                currentLlmProviderId = providerId; // パスフレーズモーダルで使うために設定
            } else {
                apiKeyInput.value = ''; // APIキーが保存されていない場合はクリア
                currentApiKey = '';
                currentLlmProviderId = providerId; // プロバイダは選択された状態にする
                alertMessage(`「${provider.name}」のAPIキーは保存されていません。`, 'info');
            }
        } catch (error) {
            console.error(`Failed to load API key for ${providerId}:`, error);
            apiKeyInput.value = '';
            currentApiKey = '';
            alertMessage(`「${provider.name}」のAPIキーの読み込みに失敗しました。`, 'error');
        } finally {
            updateTranslationButtonsState();
        }
    };


    // --- イベントリスナーの設定 ---

    // 設定ボタンクリックでモーダルを開く
    settingsButton.addEventListener('click', () => {
        settingsModal.classList.remove('hidden');
        // 設定モーダルを開くときにAPIキー以外の設定をロード
        // APIキーはパスフレーズモーダルでロードされる
        loadSettings();
        switchTab('tab1-content'); // デフォルトでタブ1を表示
    });

    // 閉じるボタンクリックでモーダルを閉じる
    closeSettingsButton.addEventListener('click', () => {
        // 設定モーダルを閉じる際には確認は不要
        settingsModal.classList.add('hidden');
        resetToneForm(); // 口調フォームをリセット
        resetGlossaryForm(); // 用語集フォームをリセット
        resetModifierForm(); // 修飾文字フォームをリセット
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
    modifierTabButton.addEventListener('click', () => switchTab('modifier-tab-content'));

    // LLMプロバイダ選択ドロップダウンの変更イベント (設定モーダル内)
    llmProviderSelect.addEventListener('change', async (event) => {
        const selectedProviderId = event.target.value;
        currentLlmProviderId = selectedProviderId; // グローバル変数に設定
        renderLlmModelCheckboxes(selectedProviderId); // モデルチェックボックスを更新
        if (selectedProviderId) {
            // 選択されたプロバイダのAPIキーをロード
            await loadApiKeyForSelectedProvider(selectedProviderId);
        } else {
            apiKeyInput.value = '';
            currentApiKey = '';
            updateTranslationButtonsState();
        }
    });

    // グローバル一括翻訳LLMプロバイダ選択ドロップダウンの変更イベント (メイン画面)
    globalLlmProviderSelect.addEventListener('change', async (event) => {
        const selectedProviderId = event.target.value;
        currentLlmProviderId = selectedProviderId; // グローバル変数に設定
        if (selectedProviderId) {
            // 選択されたプロバイダのAPIキーをロード
            await loadApiKeyForSelectedProvider(selectedProviderId);
        } else {
            currentApiKey = '';
            alertMessage('一括翻訳プロバイダが選択されていません。', 'warning');
        }
        updateTranslationButtonsState(); // ボタンのテキストを更新
    });


    // LLMプロバイダリストの編集/削除ボタンのイベント委譲
    if (llmProviderList) {
        llmProviderList.addEventListener('click', async (e) => {
            const targetButton = e.target.closest('button');
            if (!targetButton) return;

            const providerId = targetButton.dataset.providerId;
            if (!providerId) return;

            if (targetButton.classList.contains('edit-llm-provider-button')) {
                // 編集ボタンがクリックされたら、そのプロバイダを選択し、APIキー入力フィールドを更新
                llmProviderSelect.value = providerId;
                currentLlmProviderId = providerId;
                renderLlmModelCheckboxes(providerId); // モデルチェックボックスを更新

                await loadApiKeyForSelectedProvider(providerId);
                const providerName = LLM_PROVIDERS.find(p => p.id === providerId)?.name || providerId;
                alertMessage(`${providerName} を編集モードにしました。`, 'info');
            } else if (targetButton.classList.contains('delete-llm-provider-button')) {
                // 削除ボタンがクリックされたら、APIキーを削除
                await deleteApiKeyForProvider(providerId);
            }
        });
    }

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

            saveOtherSettingsToLocalStorage(); // 口調はlocalStorageに保存
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
                        saveOtherSettingsToLocalStorage(); // 口調はlocalStorageに保存
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

            saveOtherSettingsToLocalStorage(); // 用語集はlocalStorageに保存
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
                        saveOtherSettingsToLocalStorage(); // localStorageに保存
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
                saveOtherSettingsToLocalStorage(); // localStorageに保存
                renderGlossaryTerms(); // UIを更新
                alertMessage('すべての用語を削除しました。', 'success');
                resetGlossaryForm(); // フォームをリセット
            }
        });
    }

    /**
     * 用語集をJSONファイルとしてダウンロードする関数 (新規追加)
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

    // 用語集ダウンロードボタンのイベントリスナー
    if (downloadGlossaryButton) {
        downloadGlossaryButton.addEventListener('click', downloadGlossary);
    }


    // --- 修飾文字追加/編集ボタンのイベント ---
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

            saveOtherSettingsToLocalStorage(); // 修飾文字はlocalStorageに保存
            resetModifierForm(); // フォームをリセット
        });
    }

    // 修飾文字編集キャンセルボタンのイベント
    if (cancelModifierEditButton) {
        cancelModifierEditButton.addEventListener('click', resetModifierForm);
    }

    // デフォルトにリセットボタンのイベント
    if (resetModifierButton) {
        resetModifierButton.addEventListener('click', () => {
            if (confirm('修飾文字の正規表現をデフォルトにリセットしてもよろしいですか？')) {
                modifierNameInput.value = 'デフォルト';
                modifierRegexInput.value = DEFAULT_MODIFIER_REGEX;
                modifierCharacters = [{ name: 'デフォルト', regex: DEFAULT_MODIFIER_REGEX }];
                saveOtherSettingsToLocalStorage();
                alertMessage('修飾文字をデフォルトにリセットしました。', 'success');
            }
        });
    }

    /**
     * 翻訳済みYMLファイルをダウンロードする関数
     */
    const downloadTranslatedYml = () => {
        const tableRows = dataTable.querySelectorAll('tbody tr');
        if (tableRows.length === 0 || tableRows[0].querySelector('.translation-cell').textContent === '未翻訳') {
            alertMessage('ダウンロードする翻訳済み内容がありません。まずファイルを読み込み、翻訳を実行してください。', 'warning');
            return;
        }

        const selectedPrefix = filePrefixSelect.value;
        let ymlContent = `${selectedPrefix}\n`; // 先頭行を設定

        tableRows.forEach(row => {
            const key = row.querySelector('td.string_key-column-header').textContent; // キーセルは2番目のtdになった
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

    /**
     * 「すべて翻訳」ボタンのクリックイベントハンドラ
     */
    translateAllButton.addEventListener('click', async () => {
        // APIキーが設定されているかチェック
        const selectedLlmProviderForBatchId = currentLlmProviderId; // グローバル設定のプロバイダを使用
        const isApiKeySet = !!currentApiKey;
        if (!isApiKeySet) {
            alertMessage('APIキーが設定されていません。「設定」からAPIキーを入力してください。', 'error');
            return; // 処理を中断
        }

        // 選択されたプロバイダに有効なモデルがあるかチェック
        const selectedProvider = LLM_PROVIDERS.find(p => p.id === selectedLlmProviderForBatchId);
        if (!selectedProvider || !selectedProvider.models.some(m => m.enabled)) {
            alertMessage(`選択されたプロバイダ (${selectedProvider?.name || selectedLlmProviderForBatchId}) に有効なモデルがありません。設定を確認してください。`, 'error');
            return;
        }

        translateAllButton.disabled = true; // ボタンを無効化
        translateAllButton.querySelector('span').textContent = 'すべて翻訳中...'; // ボタンのテキストを更新
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
                const keyCell = row.querySelector('td.string_key-column-header'); // キーセルを取得
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
                        translateButton.textContent = '翻訳中...'; // 個別ボタンも更新
                    }
                    if (individualToneSelect) {
                        individualToneSelect.disabled = true;
                    }
                    reviewCheckbox.disabled = true; // チェックボックスを無効化

                    try {
                        // ここで個別口調が'default'の場合、globalToneSelect.valueを渡す
                        const effectiveToneForTranslation = individualToneSelect.value === 'default' ? selectedGlobalTone : individualToneSelect.value;
                        const result = await translateText(originalText, key, effectiveToneForTranslation, selectedLlmProviderForBatchId); // 一括翻訳で選択されたLLMプロバイダを使用
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
                            translateButton.textContent = '再翻訳'; // 個別ボタンも更新
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
        updateTranslationButtonsState(); // ボタンのテキストを元に戻す
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

    // 個別翻訳ボタン、翻訳セル、校閲チェックボックス、他の提案ボタン、削除ボタンのイベント委譲
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
        } else if (e.target.closest('.get-suggestions-button')) { // 他の提案ボタンがクリックされた場合
            const button = e.target.closest('.get-suggestions-button');
            const rowElement = button.closest('tr');

            if (suggestionsOverlay.classList.contains('hidden') || currentOverlayRow !== rowElement) {
                // オーバーレイが非表示の場合、または別の行で表示されている場合
                showSuggestionsOverlay(rowElement);
            } else {
                // 同じ行でオーバーレイが表示されている場合
                hideSuggestionsOverlay();
            }
        } else if (e.target.closest('.delete-row-button')) { // 削除ボタンがクリックされた場合
            const button = e.target.closest('.delete-row-button');
            const rowElement = button.closest('tr');
            if (rowElement) {
                if (confirm('この行を削除してもよろしいですか？')) {
                    rowElement.remove(); // 行をDOMから削除
                    alertMessage('行を削除しました。', 'success');
                }
            }
        }
    });

    // オーバーレイ外をクリックで閉じる
    document.addEventListener('click', (e) => {
        if (!suggestionsOverlay.classList.contains('hidden') &&
            !suggestionsOverlay.contains(e.target) &&
            !e.target.closest('.get-suggestions-button')) { // 他の提案ボタン自身は除く
            hideSuggestionsOverlay();
        }
    });

    // オーバーレイの閉じるボタン
    closeSuggestionsOverlayButton.addEventListener('click', hideSuggestionsOverlay);


    /**
     * 翻訳セルを編集可能にする関数
     * @param {HTMLElement} cellElement - 編集対象のセル要素
     */
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
            saveOtherSettingsToLocalStorage(); // 校閲モードの状態を保存
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

    // --- パスフレーズ入力モーダルのイベントリスナー ---
    if (submitPassphraseButton) {
        submitPassphraseButton.addEventListener('click', async () => {
            const passphrase = passphraseInputForDecrypt.value.trim();
            if (!passphrase) {
                alertMessage('パスフレーズを入力してください。', 'warning');
                return;
            }

            try {
                // currentLlmProviderId はパスフレーズモーダル表示時に設定済み
                const decryptedApiKey = await loadEncryptedApiKey(currentLlmProviderId, passphrase);
                if (decryptedApiKey) {
                    currentApiKey = decryptedApiKey;
                    apiKeyInput.value = decryptedApiKey; // 設定モーダルに表示
                    passphraseModal.classList.add('hidden'); // モーダルを閉じる
                    passphraseInputForDecrypt.value = ''; // パスフレーズ入力フィールドをクリア
                    alertMessage('APIキーが正常に読み込まれました。', 'success');
                    updateTranslationButtonsState(); // 翻訳ボタンの状態を更新
                    renderLlmProviderList(); // リストを再描画
                    populateLlmProviderDropdowns(); // グローバルLLMプロバイダドロップダウンを更新
                } else {
                    currentApiKey = ''; // 読み込み失敗時はAPIキーをクリア
                    updateTranslationButtonsState(); // 翻訳ボタンの状態を更新
                }
            } catch (error) {
                console.error('パスフレーズの提出中にエラー:', error);
                alertMessage('APIキーの読み込みに失敗しました。', 'error');
                currentApiKey = ''; // 読み込み失敗時はAPIキーをクリア
                updateTranslationButtonsState(); // 翻訳ボタンの状態を更新
            }
        });
    }

    if (cancelPassphraseButton) {
        cancelPassphraseButton.addEventListener('click', () => {
            passphraseModal.classList.add('hidden'); // モーダルを閉じる
            passphraseInputForDecrypt.value = ''; // パスフレーズ入力フィールドをクリア
            alertMessage('APIキーの読み込みをキャンセルしました。', 'info');
            currentApiKey = ''; // キャンセル時はAPIキーをクリア
            updateTranslationButtonsState(); // 翻訳ボタンの状態を更新
        });
    }

    // パスワード表示/非表示ボタンのセットアップ
    setupPasswordToggle(apiPassphraseInput, toggleApiPassphraseButton);
    setupPasswordToggle(passphraseInputForDecrypt, toggleDecryptPassphraseButton);

    // APIキー削除ボタンのイベントリスナー (APIキー入力フィールドの横にあるボタン)
    if (deleteApiKeyButton) {
        deleteApiKeyButton.addEventListener('click', () => deleteApiKeyForProvider(llmProviderSelect.value));
    }

    // 復号化モーダル内のAPIキー削除ボタンのイベントリスナー
    if (deleteApiKeyFromDecryptButton) {
        deleteApiKeyFromDecryptButton.addEventListener('click', () => deleteApiKeyForProvider(currentLlmProviderId));
    }


    /**
     * アプリケーションの初期化関数
     */
    const initializeApp = async () => {
        try {
            await openDatabase(); // IndexedDBをオープン
            await loadSettings(); // その他の設定とAPIキーの読み込みを試みる
            updateTranslationButtonsState(); // 初期ロード時に翻訳ボタンの状態を更新
        } catch (error) {
            console.error('アプリケーションの初期化中にエラーが発生しました:', error);
            alertMessage('アプリケーションの初期化に失敗しました。', 'error');
        }
    };

    // アプリケーションの初期化を実行
    initializeApp();
});
