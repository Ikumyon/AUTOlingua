
// script.js

// インポート
import {
    escapeHTML,
    showErrorMessage,
    hideErrorMessage,
    alertMessage,
    setupPasswordToggle,
    initTableResizer
} from './js/uiUtils.js';

import {
    initializeSettingsManager,
    updateCurrentApiKey,
    updateCurrentLlmProviderId,
    currentLlmProviderId,
    currentApiKey,
    LLM_PROVIDERS,
    loadSettings,
    saveSettings,
    saveOtherSettingsToLocalStorage,
    renderLlmProviderList,
    populateLlmProviderDropdowns,
    renderLlmModelCheckboxes,
    updateReviewColumnVisibility,
    populateToneDropdowns,
    loadApiKeyForSelectedProvider,
    deleteApiKeyForProvider,
    checkIfApiKeyIsSaved,
    getSavedAndEnabledLlmProviders,
    customTones,
    glossaryTerms,
    modifierCharacters,
    updateGlossaryTerms,
    updateCustomTones,
    updateModifierCharacters,
    updateIsReviewModeEnabled,
    DEFAULT_MODIFIERS // 追加
} from './js/settingsManager.js';

import { initializeTableFilters } from './js/tableFilter.js';
import { initializeAdvancedFilter } from './js/advancedFilter.js';
import { initializeGlossaryManager } from './js/glossaryManager.js';
import { initializeToneManager } from './js/toneManager.js';
import { initializeTranslationManager } from './js/translationManager.js';
import { initializeFileProcessor } from './js/fileProcessor.js';
import { initializeModifierManager } from './js/modifierManager.js'; // 追加
import { openDatabase } from './js/db.js';


document.addEventListener('DOMContentLoaded', async () => {
    // 1. 設定マネージャーの初期化（DOM要素の取得）
    initializeSettingsManager();

    // 2. DOM要素の取得
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const tableWrapper = document.getElementById('table-wrapper'); // wrapper全体を制御
    const tableContainer = document.getElementById('table-container'); // スクロール可能なテーブルコンテナ
    const dataTable = document.getElementById('data-table');
    const translateAllButton = document.getElementById('translate-all-button');
    const cancelTranslateAllButton = document.getElementById('cancel-translate-all-button');
    const translateAllProgressBar = document.getElementById('translate-all-progress-bar');
    const globalToneSelect = document.getElementById('tone-select');
    const translatedFileDownloadSection = document.getElementById('translated-file-download-section');
    const translationProgress = document.getElementById('translation-progress');

    const settingsButton = document.getElementById('settings-button');
    const settingsModal = document.getElementById('settings-modal');
    const closeSettingsButton = document.getElementById('close-settings-button');
    const saveSettingsButton = document.getElementById('save-settings-button');

    // タブ
    const tab1Button = document.getElementById('tab1-button');
    const tab2Button = document.getElementById('tab2-button');
    const tab3Button = document.getElementById('tab3-button');
    const glossaryTabButton = document.getElementById('glossary-tab-button');
    const modifierTabButton = document.getElementById('modifier-tab-button');
    const tab1Content = document.getElementById('tab1-content');
    const tab2Content = document.getElementById('tab2-content');
    const tab3Content = document.getElementById('tab3-content');
    const glossaryTabContent = document.getElementById('glossary-tab-content');
    const modifierTabContent = document.getElementById('modifier-tab-content');

    // APIキー / プロバイダ
    const llmProviderSelect = document.getElementById('llm-provider-select');
    const globalLlmProviderSelect = document.getElementById('global-llm-provider-select');
    const apiKeyInput = document.getElementById('api-key-input');
    const toggleApiKeyButton = document.getElementById('toggle-api-key'); // 追加
    const apiPassphraseInput = document.getElementById('api-passphrase-input');
    const toggleApiPassphraseButton = document.getElementById('toggle-api-passphrase');
    const deleteApiKeyButton = document.getElementById('delete-api-key-button');
    const llmProviderList = document.getElementById('llm-provider-list');
    const addLlmModelButton = document.getElementById('add-llm-model-button');

    // 口調設定
    const defaultToneSelect = document.getElementById('default-tone-select');
    const newToneNameInput = document.getElementById('new-tone-name');
    const conditionalToneCheckbox = document.getElementById('conditional-tone-checkbox');
    const conditionalToneFields = document.getElementById('conditional-tone-fields');
    const conditionalToneList = document.getElementById('conditional-tone-list');
    const addConditionButton = document.getElementById('add-condition-button');
    const elseToneInstructionTextarea = document.getElementById('else-tone-instruction');
    const newToneInstructionTextarea = document.getElementById('new-tone-instruction');
    const addCustomToneButton = document.getElementById('add-custom-tone-button');
    const cancelEditButton = document.getElementById('cancel-edit-button');
    const customToneList = document.getElementById('custom-tone-list');

    // 用語集設定
    const glossaryPosInput = document.getElementById('glossary-pos');
    const glossaryOriginalInput = document.getElementById('glossary-original');
    const glossaryOriginalAltInput = document.getElementById('glossary-original-alt');
    const glossaryTranslationInput = document.getElementById('glossary-translation');
    const glossaryNoteInput = document.getElementById('glossary-note');
    const addGlossaryTermButton = document.getElementById('add-glossary-term-button');
    const cancelGlossaryEditButton = document.getElementById('cancel-glossary-edit-button');
    const glossaryTableBody = document.getElementById('glossary-table-body');
    const glossaryFileDropZone = document.getElementById('glossary-file-drop-zone');
    const glossaryFileInput = document.getElementById('glossary-file-input');
    const clearGlossaryButton = document.getElementById('clear-glossary-button');
    const downloadGlossaryButton = document.getElementById('download-glossary-button');

    // 修飾文字設定
    const modifierNameInput = document.getElementById('modifier-name-input');
    const modifierRegexInput = document.getElementById('modifier-regex-input');
    const addModifierButton = document.getElementById('add-modifier-button');
    const resetModifierButton = document.getElementById('reset-modifier-button');
    const clearAllModifiersButton = document.getElementById('clear-all-modifiers-button');
    const cancelModifierEditButton = document.getElementById('cancel-modifier-edit-button');

    // エクスポート / ダウンロード
    const filePrefixSelect = document.getElementById('file-prefix-select');
    const downloadTranslatedYmlButton = document.getElementById('download-translated-yml-button');
    const downloadLogButton = document.getElementById('download-log-button');

    // レビュー / アバウト / その他
    const appLogo = document.getElementById('app-logo');
    const aboutModal = document.getElementById('about-modal');
    const closeAboutButton = document.getElementById('close-about-button');
    const reviewModeCheckbox = document.getElementById('review-mode-checkbox');

    // パスフレーズモーダル
    const passphraseModal = document.getElementById('passphrase-modal');
    const passphraseInputForDecrypt = document.getElementById('passphrase-input-for-decrypt');
    const toggleDecryptPassphraseButton = document.getElementById('toggle-decrypt-passphrase');
    const submitPassphraseButton = document.getElementById('submit-passphrase-button');
    const cancelPassphraseButton = document.getElementById('cancel-passphrase-button');
    const deleteApiKeyFromDecryptButton = document.getElementById('delete-api-key-from-decrypt-button');

    // 翻訳案オーバーレイ
    const suggestionsOverlay = document.getElementById('suggestions-overlay');
    const suggestionsList = document.getElementById('suggestions-list');
    const closeSuggestionsOverlayButton = document.getElementById('close-suggestions-overlay-button');

    // フィルター
    const statusFilterSelect = document.getElementById('status-filter-select');
    const toneFilterSelect = document.getElementById('tone-filter-select');
    const keywordSearchInput = document.getElementById('keyword-search-input');
    const resetFiltersButton = document.getElementById('reset-filters-button');
    const regexSearchCheckbox = document.getElementById('regex-search-checkbox');
    const advancedFilterButton = document.getElementById('advanced-filter-button');
    const advancedFilterModal = document.getElementById('advanced-filter-modal');
    const closeAdvancedFilterModalButton = document.getElementById('close-advanced-filter-modal-button');
    const cancelAdvancedFilterButton = document.getElementById('cancel-advanced-filter-button');
    const applyAdvancedFilterButton = document.getElementById('apply-advanced-filter-button');
    const filterCanvas = document.getElementById('filter-canvas');

    let isTranslationCancelled = false;
    let currentOverlayRow = null;

    // --- ヘルパーロジック ---
    const switchTab = (tabId) => {
        [tab1Content, tab2Content, tab3Content, glossaryTabContent, modifierTabContent].forEach(c => c.classList.add('hidden'));
        [tab1Button, tab2Button, tab3Button, glossaryTabButton, modifierTabButton].forEach(b => b.classList.remove('active', 'bg-blue-500', 'text-white'));
        const targetContent = document.getElementById(tabId);
        targetContent.classList.remove('hidden');
        let activeButton;
        if (tabId === 'tab1-content') activeButton = tab1Button;
        else if (tabId === 'tab2-content') activeButton = tab2Button;
        else if (tabId === 'tab3-content') activeButton = tab3Button;
        else if (tabId === 'glossary-tab-content') activeButton = glossaryTabButton;
        else if (tabId === 'modifier-tab-content') activeButton = modifierTabButton;
        if (activeButton) activeButton.classList.add('active', 'bg-blue-500', 'text-white');
    };

    const adjustKeyColumnWidth = () => {
        const keyCells = dataTable.querySelectorAll('td.string_key-column-header');
        let maxWidth = 0;
        const tempSpan = document.createElement('span');
        tempSpan.style.visibility = 'hidden';
        tempSpan.style.position = 'absolute';
        tempSpan.style.whiteSpace = 'nowrap';
        const computedStyle = getComputedStyle(dataTable.querySelector('td.string_key-column-header') || dataTable);
        tempSpan.style.fontFamily = computedStyle.fontFamily;
        tempSpan.style.fontSize = computedStyle.fontSize;
        tempSpan.style.fontWeight = computedStyle.fontWeight;
        document.body.appendChild(tempSpan);
        keyCells.forEach(cell => {
            tempSpan.textContent = cell.textContent;
            const currentWidth = tempSpan.offsetWidth;
            if (currentWidth > maxWidth) maxWidth = currentWidth;
        });
        document.body.removeChild(tempSpan);
        const finalWidth = Math.max(10, maxWidth + 12 + 16);
        const keyColumnHeader = dataTable.querySelector('th.string_key-column-header');
        if (keyColumnHeader) {
            keyColumnHeader.style.width = `${finalWidth}px`;
            // minWidthは10pxのままにして、リサイズ可能に
        }
        // tdセルには幅を設定しない。thの幅が適用される
    };

    const updateTranslationButtonsState = () => {
        const isApiKeySet = !!currentApiKey;
        let providerName = 'プロバイダ未選択';
        if (currentLlmProviderId) {
            const selectedProvider = LLM_PROVIDERS.find(p => p.id === currentLlmProviderId);
            providerName = selectedProvider ? selectedProvider.name : 'プロバイダ未選択';
        }
        if (translateAllButton) {
            translateAllButton.disabled = !isApiKeySet;
            const span = translateAllButton.querySelector('span');
            if (span) span.textContent = isApiKeySet ? `すべて翻訳 (${providerName})` : 'APIキー未設定';
        }
        document.querySelectorAll('.translate-button').forEach(b => {
            b.disabled = !isApiKeySet;
            b.textContent = isApiKeySet ? '翻訳' : 'APIキー未設定';
        });
        document.querySelectorAll('.get-suggestions-button').forEach(b => b.disabled = !isApiKeySet);
    };



    const syncStateToSettingsManager = () => {
        if (glossaryManager) updateGlossaryTerms(glossaryManager.getGlossaryTerms());
        if (toneManager) updateCustomTones(toneManager.getCustomTones());
        if (modifierManager) updateModifierCharacters(modifierManager.getModifiers());
    }

    // --- サブモジュールの初期化 ---

    const tableFilter = initializeTableFilters(dataTable, statusFilterSelect, toneFilterSelect, keywordSearchInput, resetFiltersButton, regexSearchCheckbox);
    const advancedFilter = initializeAdvancedFilter({
        modalElement: advancedFilterModal,
        openButton: advancedFilterButton,
        closeButton: closeAdvancedFilterModalButton,
        cancelButton: cancelAdvancedFilterButton,
        applyButton: applyAdvancedFilterButton,
        canvasElement: filterCanvas,
        keywordInputElement: keywordSearchInput,
        mainTableFilter: tableFilter,
        getCustomTones: () => customTones
    });

    const glossaryManager = initializeGlossaryManager({
        glossaryTableBody,
        glossaryPosInput,
        glossaryOriginalInput,
        glossaryOriginalAltInput,
        glossaryTranslationInput,
        glossaryNoteInput,
        addGlossaryTermButton,
        cancelGlossaryEditButton,
        glossaryFileDropZone,
        glossaryFileInput,
        alertMessage,
        saveSettingsCallback: () => {
            syncStateToSettingsManager();
            saveOtherSettingsToLocalStorage();
        }
    });

    const modifierManager = initializeModifierManager({
        modifierTableBody: document.getElementById('modifier-table-body'),
        modifierNameInput: document.getElementById('modifier-name-input'),
        modifierRegexInput: document.getElementById('modifier-regex-input'),
        addModifierButton: document.getElementById('add-modifier-button'),
        cancelModifierEditButton: document.getElementById('cancel-modifier-edit-button'),
        alertMessage,
        saveSettingsCallback: () => {
            syncStateToSettingsManager();
            saveOtherSettingsToLocalStorage();
        }
    });

    if (resetModifierButton) {
        resetModifierButton.addEventListener('click', () => {
            if (confirm('修飾文字設定をデフォルトに戻しますか？')) {
                const defaults = JSON.parse(JSON.stringify(DEFAULT_MODIFIERS));
                modifierManager.setModifiers(defaults);
                // settingsManager側も更新
                updateModifierCharacters(defaults);
                saveOtherSettingsToLocalStorage();
                alertMessage('修飾文字をデフォルトにリセットしました。', 'success');
            }
        });
    }

    if (clearAllModifiersButton) {
        clearAllModifiersButton.addEventListener('click', () => {
            if (confirm('すべての修飾文字設定を削除してもよろしいですか？')) {
                modifierManager.setModifiers([]);
                // settingsManager側も更新
                updateModifierCharacters([]);
                saveOtherSettingsToLocalStorage();
                alertMessage('修飾文字設定を全削除しました。', 'success');
            }
        });
    }

    const toneManager = initializeToneManager({
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
        dataTable,
        alertMessage,
        saveSettingsCallback: () => {
            syncStateToSettingsManager();
            saveOtherSettingsToLocalStorage();
        },
        updateToneFilterOptions: (tones) => {
            // 必要に応じてフィルターを更新するロジック（tableFilterが処理する可能性がある）
            // tableFilterは通常、独自のオプション設定を処理するが、script.jsがトリガーする必要がある場合もある
            // 現時点では、toneManagerがUIドロップダウンを更新し、手動でフィルター更新をトリガーするか、ユーザーに任せる
        }
    });

    // ファイルプロセッサは翻訳マネージャーの初期化が必要
    const translationManager = initializeTranslationManager({
        globalToneSelect,
        tableFilter,
        getCurrentFileName: () => fileProcessor ? fileProcessor.getCurrentFileName() : ''
    });

    const fileProcessor = initializeFileProcessor({
        dataTable,
        tableContainer: tableWrapper, // wrapper全体を表示/非表示制御に使用
        translateAllButton,
        translatedFileDownloadSection,
        filePrefixSelect,
        adjustKeyColumnWidth,
        updateTranslationButtonsState,
        tableFilter,
        translationManager
    });

    await openDatabase();
    await loadSettings();

    // テーブルのリサイズ機能を初期化
    if (dataTable) initTableResizer(dataTable);

    // 読み込み時、プロバイダが選択されておりAPIキーが保存されている場合は復号化を促す
    if (currentLlmProviderId) {
        const isSaved = await checkIfApiKeyIsSaved(currentLlmProviderId);
        if (isSaved) {
            passphraseInputForDecrypt.value = '';
            passphraseModal.classList.remove('hidden');
            // 要素が確実にフォーカス可能になるまで待機
            setTimeout(() => passphraseInputForDecrypt.focus(), 100);
        }
    }

    updateTranslationButtonsState();

    // 読み込んだ設定をサブマネージャーに同期
    if (glossaryManager) {
        glossaryManager.setGlossaryTerms(glossaryTerms);
    }
    if (toneManager) {
        toneManager.setCustomTones(customTones);
    }
    if (modifierManager) {
        modifierManager.setModifiers(modifierCharacters);
    }
    // settingsManager はUIをレンダリングするグローバル関数を呼び出すが、用語集/口調リストのレンダリングはマネージャー内で行われる
    // 用語を設定した後、再レンダリングする必要がある
    // setGlossaryTerms は内部で renderGlossaryTerms を呼び出す（確認済み）
    // setCustomTones は内部で populateToneDropdowns を呼び出す（確認済み）

    // --- イベントリスナー ---

    // ファイル入力
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('border-blue-500', 'bg-blue-50'); });
    dropZone.addEventListener('dragleave', (e) => { e.preventDefault(); dropZone.classList.remove('border-blue-500', 'bg-blue-50'); });
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-blue-500', 'bg-blue-50');
        const files = e.dataTransfer.files;
        if (files.length > 0) fileProcessor.readFile(files[0]);
    });
    dropZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
        const files = e.target.files;
        if (files.length > 0) fileProcessor.readFile(files[0]);
    });

    // 設定モーダル
    settingsButton.addEventListener('click', () => {
        settingsModal.classList.remove('hidden');
        renderLlmProviderList();
        populateLlmProviderDropdowns();
        if (modifierManager) modifierManager.resetModifierForm();
        if (glossaryManager) glossaryManager.resetGlossaryForm();
        if (toneManager) toneManager.resetToneForm();
    });
    closeSettingsButton.addEventListener('click', () => settingsModal.classList.add('hidden'));

    saveSettingsButton.addEventListener('click', () => {
        // 直接編集の場合、保存前に明示的に同期
        syncStateToSettingsManager();
        saveSettings(updateTranslationButtonsState);
    });

    // タブ
    tab1Button.addEventListener('click', () => switchTab('tab1-content'));
    tab2Button.addEventListener('click', () => switchTab('tab2-content'));
    tab3Button.addEventListener('click', () => switchTab('tab3-content'));
    glossaryTabButton.addEventListener('click', () => switchTab('glossary-tab-content'));
    modifierTabButton.addEventListener('click', () => switchTab('modifier-tab-content'));

    // APIキー / プロバイダ
    if (llmProviderSelect) {
        llmProviderSelect.addEventListener('change', async (e) => {
            const selectedProviderId = e.target.value;
            if (!selectedProviderId) {
                await loadApiKeyForSelectedProvider('');
                updateTranslationButtonsState();
                renderLlmModelCheckboxes('');
                return;
            }

            // APIキーが保存されているか確認
            const isSaved = await checkIfApiKeyIsSaved(selectedProviderId);
            if (isSaved) {
                // 保存されている場合はパスフレーズモーダルを表示
                passphraseInputForDecrypt.value = '';
                passphraseModal.classList.remove('hidden');
                passphraseInputForDecrypt.focus();
            } else {
                // 保存されていない場合は空で初期化
                await loadApiKeyForSelectedProvider(selectedProviderId);
                updateTranslationButtonsState();
                renderLlmModelCheckboxes(selectedProviderId);
            }
        });
    }

    if (globalLlmProviderSelect) {
        globalLlmProviderSelect.addEventListener('change', async (e) => {
            const v = e.target.value || '';
            if (!v) {
                updateCurrentLlmProviderId('');
                updateCurrentApiKey('');
                return;
            }
            const [pId, mId] = v.split('::');
            updateCurrentLlmProviderId(pId);
            // updateCurrentLlmModelId(mId); // これを追跡したいが、globalLlmProviderSelectの値は翻訳時にプロバイダ/モデルを導出するために使用される？
            // currentLlmProviderIdは更新される。settingsManagerがエクスポートする場合、currentLlmModelIdの更新が必要かもしれない
            // しかし、translateText は `globalLlmProviderSelect.value` を使用する？
            // いいえ、translateText（TranslationManager内）は `llmProviderId` と `llmModelId_override` を受け取る
            // script.js は `translateText` を呼び出す
            // `globalLlmProviderSelect` から選択されたモデルIDをキャプチャする必要がある
            // `translateAll` ループでは、`currentLlmProviderId` と選択されたモデルを渡す必要がある
        });
    }

    deleteApiKeyButton.addEventListener('click', () => {
        const providerId = llmProviderSelect.value;
        if (providerId) deleteApiKeyForProvider(providerId, updateTranslationButtonsState);
    });

    llmProviderList.addEventListener('click', async (e) => {
        const targetButton = e.target.closest('button');
        if (!targetButton) return;
        const providerId = targetButton.dataset.providerId;
        if (targetButton.classList.contains('edit-llm-provider-button')) {
            if (llmProviderSelect) {
                llmProviderSelect.value = providerId;
                // APIキーが保存されているか確認
                const isSaved = await checkIfApiKeyIsSaved(providerId);
                if (isSaved) {
                    passphraseInputForDecrypt.value = '';
                    passphraseModal.classList.remove('hidden');
                    passphraseInputForDecrypt.focus();
                } else {
                    await loadApiKeyForSelectedProvider(providerId);
                    updateTranslationButtonsState();
                    renderLlmModelCheckboxes(providerId);
                }
                switchTab('tab1-content');
            }
        } else if (targetButton.classList.contains('delete-llm-provider-button')) {
            await deleteApiKeyForProvider(providerId, updateTranslationButtonsState);
        }
    });

    if (toggleApiKeyButton) setupPasswordToggle(apiKeyInput, toggleApiKeyButton);
    if (toggleApiPassphraseButton) setupPasswordToggle(apiPassphraseInput, toggleApiPassphraseButton);
    if (toggleDecryptPassphraseButton) setupPasswordToggle(passphraseInputForDecrypt, toggleDecryptPassphraseButton);

    // パスフレーズモーダルの制御
    submitPassphraseButton.addEventListener('click', async () => {
        const providerId = llmProviderSelect.value;
        const passphrase = passphraseInputForDecrypt.value.trim();
        if (!passphrase) {
            alertMessage('パスフレーズを入力してください。', 'warning');
            return;
        }

        try {
            await loadApiKeyForSelectedProvider(providerId, passphrase);
            passphraseModal.classList.add('hidden');
            alertMessage('APIキーを復号化しました。', 'success');
            updateTranslationButtonsState();
            renderLlmModelCheckboxes(providerId);
        } catch (error) {
            alertMessage(error.message || '復号化に失敗しました。パスフレーズを確認してください。', 'error');
        }
    });

    cancelPassphraseButton.addEventListener('click', () => {
        passphraseModal.classList.add('hidden');
        // 必要に応じて選択を戻すなどの処理
    });

    deleteApiKeyFromDecryptButton.addEventListener('click', async () => {
        const providerId = llmProviderSelect.value;
        if (providerId) {
            await deleteApiKeyForProvider(providerId, updateTranslationButtonsState);
            passphraseModal.classList.add('hidden');
        }
    });

    passphraseInputForDecrypt.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            submitPassphraseButton.click();
        }
    });

    // レビューモード
    reviewModeCheckbox.addEventListener('change', (e) => {
        updateIsReviewModeEnabled(e.target.checked);
        saveOtherSettingsToLocalStorage();
        updateReviewColumnVisibility();
    });

    // すべて翻訳
    translateAllButton.addEventListener('click', async () => {
        const rows = dataTable.querySelectorAll('tbody tr');
        if (rows.length === 0) return;

        translateAllButton.classList.add('hidden');
        cancelTranslateAllButton.classList.remove('hidden');
        cancelTranslateAllButton.disabled = false;
        cancelTranslateAllButton.textContent = '翻訳停止';
        translationProgress.classList.remove('hidden');
        translateAllProgressBar.style.width = '0%';
        isTranslationCancelled = false;

        const totalRows = rows.length;
        let processedRows = 0;

        // グローバルモデル選択を取得
        let selectedModelId = null;
        if (globalLlmProviderSelect && globalLlmProviderSelect.value) {
            const parts = globalLlmProviderSelect.value.split('::');
            if (parts.length === 2) selectedModelId = parts[1];
        }

        for (const row of rows) {
            if (isTranslationCancelled) break;
            if (row.style.display === 'none') continue;
            const translationCell = row.querySelector('.translation-cell');
            if (translationCell.textContent !== '未翻訳') continue;
            row.scrollIntoView({ behavior: 'smooth', block: 'center' });

            // translateRowにselectedModelIdを渡す？
            // TranslationManagerのtranslateRowはmodelId引数を取らず、`currentLlmProviderId`を使用する
            // しかし、`llmModelIdOverride`を取る`translateText`を呼び出す
            // `translateRow`は`llmModelIdOverride`を受け入れるべきか、またはそれを設定する方法が必要
            // `TranslationManager`を更新して`llmModelId`を受け入れるようにする
            // または`translateRow`はDOMから値を取得し、`llmModelId`を無視する？
            // `translateRow`は`translateText`を呼び出す。`translateText`のロジック：
            // llmModelIdOverrideが提供されていればオーバーライド、そうでなければ有効なものを選択
            // `translateAll`の場合、グローバルに選択されたモデルを使用したい
            // `translateRow`は個別のボタンクリックにも使用される
            // `translateAll`が実行されている場合、グローバルに選択されたモデルを渡す必要がある
            // しかし、`TranslationManager`の`translateRow`のシグネチャは`translateRow(rowElement)`
            // `translateRow`のシグネチャを変更するか、`translateAllRow`を追加する必要がある？
            // `translateRow`をオプションの`llmModelId`を受け入れるように更新する
            await translationManager.translateRow(row, selectedModelId);

            processedRows++;
            const progress = (processedRows / totalRows) * 100;
            translateAllProgressBar.style.width = `${progress}%`;
        }

        translateAllButton.classList.remove('hidden');
        cancelTranslateAllButton.classList.add('hidden');
        translationProgress.classList.add('hidden');

        if (isTranslationCancelled) alertMessage('翻訳を停止しました。', 'info');
        else alertMessage('すべての翻訳が完了しました。', 'success');
    });

    cancelTranslateAllButton.addEventListener('click', () => {
        isTranslationCancelled = true;
        cancelTranslateAllButton.disabled = true;
        cancelTranslateAllButton.textContent = '停止中...';
    });

    // データテーブルイベント
    dataTable.addEventListener('click', async (e) => {
        const target = e.target;
        const row = target.closest('tr');
        if (!row) return;

        if (target.classList.contains('translate-button')) {
            await translationManager.translateRow(row);
        } else if (target.closest('.delete-row-button')) {
            row.remove();
            if (dataTable.querySelectorAll('tbody tr').length === 0) {
                tableWrapper.classList.add('hidden');
                translateAllButton.classList.add('hidden');
                translatedFileDownloadSection.classList.add('hidden');
            }
        } else if (target.closest('.get-suggestions-button')) {
            if (currentOverlayRow === row) hideSuggestionsOverlay();
            else {
                if (currentOverlayRow) hideSuggestionsOverlay();
                showSuggestionsOverlay(row);
            }
        }
    });

    // 編集時の自動レビューチェック
    dataTable.addEventListener('input', (e) => {
        const target = e.target;
        if (target.classList.contains('translation-cell')) {
            const row = target.closest('tr');
            if (row) {
                const reviewCheckbox = row.querySelector('.review-checkbox');
                if (reviewCheckbox && !reviewCheckbox.checked) {
                    reviewCheckbox.checked = true;
                    // 必要に応じてフィルターを再適用
                    if (tableFilter) tableFilter.applyFilters();
                }
            }
        }
    });

    // 翻訳案オーバーレイロジック
    const showSuggestionsOverlay = async (row) => {
        if (!currentApiKey) {
            alertMessage('APIキーが設定されていません。', 'error');
            return;
        }
        currentOverlayRow = row;
        const btn = row.querySelector('.get-suggestions-button i');
        if (btn) { btn.classList.remove('fa-caret-down'); btn.classList.add('fa-caret-up'); }

        const translationCell = row.querySelector('.translation-cell');
        const rect = translationCell.getBoundingClientRect();
        const tableRect = tableContainer.getBoundingClientRect();
        suggestionsOverlay.style.top = `${rect.top - tableRect.top + rect.height + 5}px`;
        suggestionsOverlay.style.left = `${rect.left - tableRect.left}px`;
        suggestionsOverlay.style.width = `${rect.width}px`;
        suggestionsOverlay.classList.remove('hidden');
        suggestionsList.innerHTML = '<div class="text-center text-gray-500">読み込み中...</div>';

        const originalText = row.querySelector('.original-text-cell').textContent;
        const key = row.querySelector('td.string_key-column-header').textContent;
        const tone = row.querySelector('.individual-tone-select').value;
        const providerId = currentLlmProviderId;
        const provider = LLM_PROVIDERS.find(p => p.id === providerId);

        const results = [];
        if (provider && provider.models) {
            for (const model of provider.models) {
                if (model.enabled) {
                    try {
                        const res = await translationManager.translateText(originalText, key, tone, providerId, model.id);
                        results.push({
                            providerName: provider.name,
                            modelName: model.name,
                            translatedText: res.translatedText,
                            isError: res.status === 'Error'
                        });
                    } catch (e) {
                        results.push({
                            providerName: provider.name,
                            modelName: model.name,
                            translatedText: e.message,
                            isError: true
                        });
                    }
                }
            }
        }

        suggestionsList.innerHTML = '';
        if (results.length === 0) suggestionsList.innerHTML = '<div class="text-center text-gray-500">翻訳案なし</div>';
        results.forEach(r => {
            const div = document.createElement('div');
            div.className = 'flex items-start justify-between p-2 border-b border-gray-100 last:border-b-0';
            div.innerHTML = `
                <div class="flex-grow pr-2">
                    <strong class="text-sm text-gray-700">${escapeHTML(r.providerName)} (${escapeHTML(r.modelName)}):</strong>
                    <span class="text-gray-900 text-sm whitespace-pre-wrap ${r.isError ? 'text-red-500' : ''}">${escapeHTML(r.translatedText)}</span>
                </div>
                <button class="copy-suggestion-button text-gray-500 hover:text-blue-600 transition-colors duration-200 p-1 rounded-md" title="採用">
                    <i class="fa-solid fa-clone"></i>
                </button>
             `;
            if (!r.isError) {
                const copyBtn = div.querySelector('.copy-suggestion-button');
                copyBtn.onclick = () => {
                    translationCell.textContent = r.translatedText;
                    hideSuggestionsOverlay();
                    alertMessage('翻訳を適用しました。', 'success');
                    tableFilter.applyFilters();
                };
            } else {
                div.querySelector('.copy-suggestion-button').remove();
            }
            suggestionsList.appendChild(div);
        });
    };

    const hideSuggestionsOverlay = () => {
        suggestionsOverlay.classList.add('hidden');
        if (currentOverlayRow) {
            const btn = currentOverlayRow.querySelector('.get-suggestions-button i');
            if (btn) { btn.classList.remove('fa-caret-up'); btn.classList.add('fa-caret-down'); }
            currentOverlayRow = null;
        }
    };
    closeSuggestionsOverlayButton.addEventListener('click', hideSuggestionsOverlay);

    // ダウンロード
    downloadLogButton.addEventListener('click', () => fileProcessor.downloadTranslationLog());
    if (downloadTranslatedYmlButton) downloadTranslatedYmlButton.addEventListener('click', () => fileProcessor.downloadTranslatedYml());
    if (downloadGlossaryButton) downloadGlossaryButton.addEventListener('click', () => glossaryManager.downloadGlossary());

    // 用語集をクリア
    if (clearGlossaryButton) {
        clearGlossaryButton.addEventListener('click', () => {
            if (glossaryManager.getGlossaryTerms().length === 0) {
                alertMessage('削除する用語がありません。', 'warning');
                return;
            }
            if (confirm('すべての用語を削除してもよろしいですか？')) {
                glossaryManager.setGlossaryTerms([]);
                syncStateToSettingsManager();
                saveOtherSettingsToLocalStorage();
                alertMessage('すべての用語を削除しました。', 'success');
                glossaryManager.resetGlossaryForm();
            }
        });
    }

    // 修飾文字


    // アバウト
    if (appLogo) appLogo.addEventListener('click', () => aboutModal.classList.remove('hidden'));
    if (closeAboutButton) closeAboutButton.addEventListener('click', () => aboutModal.classList.add('hidden'));

});
