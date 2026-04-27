// script.ts

// インポート
import {
    escapeHTML,
    alertMessage,
    setupPasswordToggle,
    initTableResizer
} from './js/uiUtils';

import { settingsManager, DEFAULT_MODIFIERS } from './js/settingsManager';
import { StructureParser } from './js/core/StructureParser';
import { TranslationMasker } from './js/core/TranslationMasker';

import { themeManager, ThemeMode } from './js/themeManager';

import { tableFilter } from './js/tableFilter';
import { advancedFilter } from './js/advancedFilter';
import { glossaryManager } from './js/glossaryManager';
import { toneManager } from './js/toneManager';
import { translationManager } from './js/translationManager';
import { fileProcessor } from './js/fileProcessor';
import { modifierManager } from './js/modifierManager';
import { helpManager } from './js/helpManager';
import { openDatabase } from './js/db';
import { stageManager } from './js/stageManager';


document.addEventListener('DOMContentLoaded', async () => {
    // 1. 設定マネージャーの初期化（DOM要素の取得）
    settingsManager.initializeSettingsManager();

    // ヘルプマネージャーの初期化
    helpManager.initialize();

    // 2. DOM要素の取得
    const dropZone = document.getElementById('drop-zone') as HTMLElement;
    const fileInput = document.getElementById('file-input') as HTMLInputElement;
    const tableWrapper = document.getElementById('table-wrapper') as HTMLElement;
    const tableContainer = document.getElementById('table-container') as HTMLElement;
    const dataTable = document.getElementById('data-table') as HTMLTableElement;
    const translateAllContainer = document.getElementById('translate-all-container') as HTMLElement;
    const translateAllButton = document.getElementById('translate-all-button') as HTMLButtonElement;
    const translateAllDropdownToggle = document.getElementById('translate-all-dropdown-toggle') as HTMLButtonElement;
    const translateAllDropdownMenu = document.getElementById('translate-all-dropdown-menu') as HTMLElement;
    const translateUntranslatedOnlyItem = document.getElementById('translate-untranslated-only-item') as HTMLElement;
    const translateAllForceItem = document.getElementById('translate-all-force-item') as HTMLElement;
    const cancelTranslateAllButton = document.getElementById('cancel-translate-all-button') as HTMLButtonElement;
    const translateAllProgressBar = document.getElementById('translate-all-progress-bar') as HTMLElement;
    const globalToneSelect = document.getElementById('tone-select') as HTMLSelectElement;
    const translatedFileDownloadSection = document.getElementById('translated-file-download-section') as HTMLElement;
    const translationProgress = document.getElementById('translation-progress') as HTMLElement;

    const settingsButton = document.getElementById('settings-button') as HTMLButtonElement;
    const settingsModal = document.getElementById('settings-modal') as HTMLElement;
    const closeSettingsButton = document.getElementById('close-settings-button') as HTMLButtonElement;
    const saveSettingsButton = document.getElementById('save-settings-button') as HTMLButtonElement;

    // タブ
    const tab1Button = document.getElementById('tab1-button') as HTMLButtonElement;
    const tab2Button = document.getElementById('tab2-button') as HTMLButtonElement;
    const tab3Button = document.getElementById('tab3-button') as HTMLButtonElement;
    const glossaryTabButton = document.getElementById('glossary-tab-button') as HTMLButtonElement;
    const modifierTabButton = document.getElementById('modifier-tab-button') as HTMLButtonElement;
    const tab1Content = document.getElementById('tab1-content') as HTMLElement;
    const tab2Content = document.getElementById('tab2-content') as HTMLElement;
    const tab3Content = document.getElementById('tab3-content') as HTMLElement;
    const glossaryTabContent = document.getElementById('glossary-tab-content') as HTMLElement;
    const modifierTabContent = document.getElementById('modifier-tab-content') as HTMLElement;
    const themeTabButton = document.getElementById('theme-tab-button') as HTMLButtonElement;
    const themeTabContent = document.getElementById('theme-tab-content') as HTMLElement;

    // APIキー / プロバイダ
    const llmProviderSelect = document.getElementById('llm-provider-select') as HTMLSelectElement;
    const globalLlmProviderSelect = document.getElementById('global-llm-provider-select') as HTMLSelectElement;
    const apiKeyInput = document.getElementById('api-key-input') as HTMLInputElement;
    const toggleApiKeyButton = document.getElementById('toggle-api-key') as HTMLButtonElement;
    const apiPassphraseInput = document.getElementById('api-passphrase-input') as HTMLInputElement;
    const toggleApiPassphraseButton = document.getElementById('toggle-api-passphrase') as HTMLButtonElement;
    const deleteApiKeyButton = document.getElementById('delete-api-key-button') as HTMLButtonElement;
    const llmProviderList = document.getElementById('llm-provider-list') as HTMLElement;

    // 口調設定
    const defaultToneSelect = document.getElementById('default-tone-select') as HTMLSelectElement;
    const newToneNameInput = document.getElementById('new-tone-name') as HTMLInputElement;
    const conditionalToneCheckbox = document.getElementById('conditional-tone-checkbox') as HTMLInputElement;
    const conditionalToneFields = document.getElementById('conditional-tone-fields') as HTMLElement;
    const conditionalToneList = document.getElementById('conditional-tone-list') as HTMLElement;
    const addConditionButton = document.getElementById('add-condition-button') as HTMLButtonElement;
    const elseToneInstructionTextarea = document.getElementById('else-tone-instruction') as HTMLTextAreaElement;
    const newToneInstructionTextarea = document.getElementById('new-tone-instruction') as HTMLTextAreaElement;
    const addCustomToneButton = document.getElementById('add-custom-tone-button') as HTMLButtonElement;
    const cancelEditButton = document.getElementById('cancel-edit-button') as HTMLButtonElement;
    const customToneList = document.getElementById('custom-tone-list') as HTMLElement;

    // 用語集設定
    const glossaryPosInput = document.getElementById('glossary-pos') as HTMLSelectElement;
    const glossaryOriginalInput = document.getElementById('glossary-original') as HTMLInputElement;
    const glossaryOriginalAltInput = document.getElementById('glossary-original-alt') as HTMLTextAreaElement;
    const glossaryTranslationInput = document.getElementById('glossary-translation') as HTMLInputElement;
    const glossaryNoteInput = document.getElementById('glossary-note') as HTMLTextAreaElement;
    const addGlossaryTermButton = document.getElementById('add-glossary-term-button') as HTMLButtonElement;
    const cancelGlossaryEditButton = document.getElementById('cancel-glossary-edit-button') as HTMLButtonElement;
    const glossaryTableBody = document.getElementById('glossary-table-body') as HTMLElement;
    const glossaryFileDropZone = document.getElementById('glossary-file-drop-zone') as HTMLElement;
    const glossaryFileInput = document.getElementById('glossary-file-input') as HTMLInputElement;
    const clearGlossaryButton = document.getElementById('clear-glossary-button') as HTMLButtonElement;
    const downloadGlossaryButton = document.getElementById('download-glossary-button') as HTMLButtonElement;

    // 修飾文字設定
    const resetModifierButton = document.getElementById('reset-modifier-button') as HTMLButtonElement;
    const clearAllModifiersButton = document.getElementById('clear-all-modifiers-button') as HTMLButtonElement;

    // エクスポート / ダウンロード
    const filePrefixSelect = document.getElementById('file-prefix-select') as HTMLSelectElement;
    const downloadTranslatedYmlButton = document.getElementById('download-translated-yml-button') as HTMLButtonElement;
    const downloadProgressJsonButton = document.getElementById('download-progress-json-button') as HTMLButtonElement;
    const downloadParatranzJsonButton = document.getElementById('download-paratranz-json-button') as HTMLButtonElement;
    const downloadLogButton = document.getElementById('download-log-button') as HTMLButtonElement;

    // レビュー / アバウト / その他
    const appLogo = document.getElementById('app-logo') as HTMLElement;
    const aboutModal = document.getElementById('about-modal') as HTMLElement;
    const closeAboutButton = document.getElementById('close-about-button') as HTMLButtonElement;
    const reviewModeCheckbox = document.getElementById('review-mode-checkbox') as HTMLInputElement;

    // パスフレーズモーダル
    const passphraseModal = document.getElementById('passphrase-modal') as HTMLElement;
    const passphraseInputForDecrypt = document.getElementById('passphrase-input-for-decrypt') as HTMLInputElement;
    const toggleDecryptPassphraseButton = document.getElementById('toggle-decrypt-passphrase') as HTMLButtonElement;
    const submitPassphraseButton = document.getElementById('submit-passphrase-button') as HTMLButtonElement;
    const cancelPassphraseButton = document.getElementById('cancel-passphrase-button') as HTMLButtonElement;
    const deleteApiKeyFromDecryptButton = document.getElementById('delete-api-key-from-decrypt-button') as HTMLButtonElement;

    // 翻訳案オーバーレイ
    const suggestionsOverlay = document.getElementById('suggestions-overlay') as HTMLElement;
    const suggestionsList = document.getElementById('suggestions-list') as HTMLElement;
    const closeSuggestionsOverlayButton = document.getElementById('close-suggestions-overlay-button') as HTMLButtonElement;

    // フィルター
    const keywordSearchInput = document.getElementById('keyword-search-input') as HTMLInputElement;
    const advancedFilterButton = document.getElementById('advanced-filter-button') as HTMLButtonElement;
    const advancedFilterModal = document.getElementById('advanced-filter-modal') as HTMLElement;
    const closeAdvancedFilterModalButton = document.getElementById('close-advanced-filter-modal-button') as HTMLButtonElement;
    const cancelAdvancedFilterButton = document.getElementById('cancel-advanced-filter-button') as HTMLButtonElement;
    const applyAdvancedFilterButton = document.getElementById('apply-advanced-filter-button') as HTMLButtonElement;
    const filterCanvas = document.getElementById('filter-canvas') as HTMLElement;

    let isTranslationCancelled = false;
    let currentOverlayRow: HTMLElement | null = null;

    // テーマ設定の要素
    const themeSlider = document.getElementById('theme-slider') as HTMLElement;
    const themeButtons = document.querySelectorAll('.theme-option') as NodeListOf<HTMLElement>;
    const themeOpacitySlider = document.getElementById('theme-opacity-slider') as HTMLInputElement;
    const themeOpacityValue = document.getElementById('theme-opacity-value') as HTMLElement;
    const themeBlurSlider = document.getElementById('theme-blur-slider') as HTMLInputElement;
    const themeBlurValue = document.getElementById('theme-blur-value') as HTMLElement;

    // --- ヘルパーロジック ---
    const switchTab = (tabId: string): void => {
        [tab1Content, tab2Content, tab3Content, glossaryTabContent, modifierTabContent, themeTabContent].forEach(c => c.classList.add('hidden'));
        [tab1Button, tab2Button, tab3Button, glossaryTabButton, modifierTabButton, themeTabButton].forEach(b => b.classList.remove('active', 'bg-blue-500', 'text-white'));
        const targetContent = document.getElementById(tabId) as HTMLElement;
        targetContent.classList.remove('hidden');
        let activeButton: HTMLButtonElement | null = null;
        if (tabId === 'tab1-content') activeButton = tab1Button;
        else if (tabId === 'tab2-content') activeButton = tab2Button;
        else if (tabId === 'tab3-content') activeButton = tab3Button;
        else if (tabId === 'glossary-tab-content') activeButton = glossaryTabButton;
        else if (tabId === 'modifier-tab-content') activeButton = modifierTabButton;
        else if (tabId === 'theme-tab-content') activeButton = themeTabButton;
        if (activeButton) activeButton.classList.add('active', 'bg-blue-500', 'text-white');
    };

    const adjustKeyColumnWidth = (): void => {
        const keyColumnHeader = dataTable.querySelector('th.string_key-column-header') as HTMLElement;
        if (!keyColumnHeader) return;

        // 手動で調整された幅が保存されている場合は、自動調整をスキップ
        const savedWidth = localStorage.getItem('auto_lingua_col_width_string_key-column-header');
        if (savedWidth) return;

        const keyCells = dataTable.querySelectorAll('td.string_key-column-header') as NodeListOf<HTMLElement>;
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
            // セル内の各行を個別に評価（改行がある場合を考慮）
            const lines = (cell.innerText || cell.textContent || "").split('\n');
            lines.forEach(line => {
                tempSpan.textContent = line.trim();
                const currentWidth = tempSpan.offsetWidth;
                if (currentWidth > maxWidth) maxWidth = currentWidth;
            });
        });
        document.body.removeChild(tempSpan);
        const finalWidth = Math.max(50, maxWidth + 12 + 16);
        keyColumnHeader.style.width = `${finalWidth}px`;
    };

    const updateTranslationButtonsState = (): void => {
        const isApiKeySet = !!settingsManager.currentApiKey;
        if (translateAllButton) {
            translateAllButton.disabled = !isApiKeySet;
            const span = translateAllButton.querySelector('span');
            if (span) span.textContent = isApiKeySet ? 'すべて翻訳' : 'APIキー未設定';
        }
        document.querySelectorAll('.translate-button').forEach(b => {
            (b as HTMLButtonElement).disabled = !isApiKeySet;
            b.textContent = isApiKeySet ? '翻訳' : 'APIキー未設定';
        });
        document.querySelectorAll('.get-suggestions-button').forEach(b => (b as HTMLButtonElement).disabled = !isApiKeySet);
    };

    const syncStateToSettingsManager = (): void => {
        if (glossaryManager) settingsManager.updateGlossaryTerms(glossaryManager.getGlossaryTerms());
        if (toneManager) settingsManager.updateCustomTones(toneManager.getCustomTones());
        if (modifierManager) settingsManager.updateModifierCharacters(modifierManager.getModifiers());
    };

    // --- サブモジュールの初期化 ---

    tableFilter.initialize(dataTable);
    advancedFilter.initialize({
        modalElement: advancedFilterModal,
        openButton: advancedFilterButton,
        closeButton: closeAdvancedFilterModalButton,
        cancelButton: cancelAdvancedFilterButton,
        applyButton: applyAdvancedFilterButton,
        canvasElement: filterCanvas,
        keywordInputElement: keywordSearchInput,
        getCustomTones: () => settingsManager.customTones
    });

    glossaryManager.initialize({
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
        glossarySearchInput: document.getElementById('glossary-search-input') as HTMLInputElement,
        alertMessage,
        saveSettingsCallback: () => {
            syncStateToSettingsManager();
            settingsManager.saveOtherSettingsToLocalStorage();
        }
    });

    modifierManager.initialize({
        modifierTableBody: document.getElementById('modifier-table-body') as HTMLElement,
        modifierNameInput: document.getElementById('modifier-name-input') as HTMLInputElement,
        modifierRegexInput: document.getElementById('modifier-regex-input') as HTMLInputElement,
        modifierTypeSelect: document.getElementById('modifier-type-select') as HTMLSelectElement,
        modifierCategoryInput: document.getElementById('modifier-category-input') as HTMLInputElement,
        addModifierButton: document.getElementById('add-modifier-button') as HTMLButtonElement,
        cancelModifierEditButton: document.getElementById('cancel-modifier-edit-button') as HTMLButtonElement,
        modifierSearchInput: document.getElementById('modifier-search-input') as HTMLInputElement,
        alertMessage,
        saveSettingsCallback: () => {
            syncStateToSettingsManager();
            settingsManager.saveOtherSettingsToLocalStorage();
        }
    });

    // 各テーブルのリサイズ機能を初期化
    initTableResizer(dataTable);
    const glossaryTable = document.getElementById('glossary-table') as HTMLTableElement;
    if (glossaryTable) initTableResizer(glossaryTable);
    const modifierTable = document.getElementById('modifier-table') as HTMLTableElement;
    if (modifierTable) initTableResizer(modifierTable);

    if (resetModifierButton) {
        resetModifierButton.addEventListener('click', () => {
            if (confirm('修飾文字設定をデフォルトに戻しますか？')) {
                const defaults = JSON.parse(JSON.stringify(DEFAULT_MODIFIERS));
                modifierManager.setModifiers(defaults);
                // settingsManager側も更新
                settingsManager.updateModifierCharacters(defaults);
                settingsManager.saveOtherSettingsToLocalStorage();
                alertMessage('修飾文字をデフォルトにリセットしました。', 'success');
            }
        });
    }

    if (clearAllModifiersButton) {
        clearAllModifiersButton.addEventListener('click', () => {
            if (confirm('すべての修飾文字設定を削除してもよろしいですか？')) {
                modifierManager.setModifiers([]);
                // settingsManager側も更新
                settingsManager.updateModifierCharacters([]);
                settingsManager.saveOtherSettingsToLocalStorage();
                alertMessage('修飾文字設定を全削除しました。', 'success');
            }
        });
    }

    toneManager.initialize({
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
            settingsManager.saveOtherSettingsToLocalStorage();
        },
        updateToneFilterOptions: (_tones) => {
            // 必要に応じてフィルターを更新
        }
    });

    // ファイルプロセッサは翻訳マネージャーの初期化が必要
    translationManager.initialize({
        globalToneSelect,
        tableFilter,
        getCurrentFileName: () => fileProcessor ? fileProcessor.getCurrentFileName() : ''
    });

    fileProcessor.initialize({
        dataTable,
        tableContainer: tableWrapper,
        translateAllButton,
        translatedFileDownloadSection,
        filePrefixSelect,
        adjustKeyColumnWidth,
        updateTranslationButtonsState,
        tableFilter,
        translationManager
    });

    stageManager.initEventListeners(dataTable);

    await openDatabase();
    await settingsManager.loadSettings();

    // テーマの初期化
    themeManager.initializeThemeManager({
        initialTheme: settingsManager.currentTheme as ThemeMode,
        initialOpacity: settingsManager.themeOpacity,
        initialBlur: settingsManager.themeBlur,
        themeSlider: themeSlider,
        themeButtons: themeButtons
    });

    // スライダーの初期値を設定
    if (themeOpacitySlider) {
        themeOpacitySlider.value = settingsManager.themeOpacity.toString();
        themeOpacityValue.textContent = settingsManager.themeOpacity.toFixed(2);
    }
    if (themeBlurSlider) {
        themeBlurSlider.value = settingsManager.themeBlur.toString();
        themeBlurValue.textContent = `${settingsManager.themeBlur}px`;
    }

    // テーブルのリサイズ機能を初期化
    if (dataTable) initTableResizer(dataTable);

    // 読み込み時、プロバイダが選択されておりAPIキーが保存されている場合は復号化を促す
    if (settingsManager.currentLlmProviderId) {
        const isSaved = await settingsManager.checkIfApiKeyIsSaved(settingsManager.currentLlmProviderId);
        if (isSaved) {
            passphraseInputForDecrypt.value = '';
            passphraseModal.classList.remove('hidden');
            setTimeout(() => passphraseInputForDecrypt.focus(), 100);
        }
    }

    updateTranslationButtonsState();

    // 読み込んだ設定をサブマネージャーに同期
    if (glossaryManager) {
        glossaryManager.setGlossaryTerms(settingsManager.glossaryTerms);
    }
    if (toneManager) {
        toneManager.setCustomTones(settingsManager.customTones);
    }
    if (modifierManager) {
        modifierManager.setModifiers(settingsManager.modifierCharacters);
    }
    
    // アプリ起動時の設定に基づいて校閲列の表示/非表示を初期化
    settingsManager.updateReviewColumnVisibility();


    // --- イベントリスナー ---

    // ファイル入力
    dropZone.addEventListener('dragover', (e: DragEvent) => { e.preventDefault(); dropZone.classList.add('border-blue-500', 'bg-blue-50'); });
    dropZone.addEventListener('dragleave', (e: DragEvent) => { e.preventDefault(); dropZone.classList.remove('border-blue-500', 'bg-blue-50'); });
    dropZone.addEventListener('drop', (e: DragEvent) => {
        e.preventDefault();
        dropZone.classList.remove('border-blue-500', 'bg-blue-50');
        const files = e.dataTransfer?.files;
        if (files && files.length > 0) fileProcessor.readFile(files[0]);
    });
    dropZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e: Event) => {
        const files = (e.target as HTMLInputElement).files;
        if (files && files.length > 0) fileProcessor.readFile(files[0]);
    });

    // 設定モーダル
    settingsButton.addEventListener('click', () => {
        settingsModal.classList.remove('hidden');
        settingsManager.renderLlmProviderList();
        settingsManager.populateLlmProviderDropdowns();
        if (modifierManager) modifierManager.resetModifierForm();
        if (glossaryManager) glossaryManager.resetGlossaryForm();
        if (toneManager) toneManager.resetToneForm();
    });
    closeSettingsButton.addEventListener('click', () => settingsModal.classList.add('hidden'));

    saveSettingsButton.addEventListener('click', () => {
        // 直接編集の場合、保存前に明示的に同期
        syncStateToSettingsManager();
        settingsManager.saveSettings(updateTranslationButtonsState);
    });

    downloadProgressJsonButton.addEventListener('click', () => {
        fileProcessor.exportProgressAsJson();
    });

    downloadParatranzJsonButton.addEventListener('click', () => {
        fileProcessor.exportAsParatranzJson();
    });

    // タブ
    tab1Button.addEventListener('click', () => switchTab('tab1-content'));
    tab2Button.addEventListener('click', () => switchTab('tab2-content'));
    tab3Button.addEventListener('click', () => switchTab('tab3-content'));
    glossaryTabButton.addEventListener('click', () => switchTab('glossary-tab-content'));
    modifierTabButton.addEventListener('click', () => switchTab('modifier-tab-content'));
    themeTabButton.addEventListener('click', () => switchTab('theme-tab-content'));

    // テーマ選択イベント
    themeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const theme = btn.dataset.theme as ThemeMode;
            if (theme) {
                settingsManager.updateCurrentTheme(theme);
                themeManager.applyTheme(theme);
                settingsManager.saveOtherSettingsToLocalStorage();
            }
        });
    });

    // 透過度スライダーのイベント
    if (themeOpacitySlider) {
        themeOpacitySlider.addEventListener('input', (e: Event) => {
            const opacity = parseFloat((e.target as HTMLInputElement).value);
            themeOpacityValue.textContent = opacity.toFixed(2);
            settingsManager.updateThemeOpacity(opacity);
            themeManager.applyThemeProperties(opacity, settingsManager.themeBlur);
        });
        themeOpacitySlider.addEventListener('change', () => {
            settingsManager.saveOtherSettingsToLocalStorage();
        });
    }

    // すりガラス強度スライダーのイベント
    if (themeBlurSlider) {
        themeBlurSlider.addEventListener('input', (e: Event) => {
            const blur = parseInt((e.target as HTMLInputElement).value, 10);
            themeBlurValue.textContent = `${blur}px`;
            settingsManager.updateThemeBlur(blur);
            themeManager.applyThemeProperties(settingsManager.themeOpacity, blur);
        });
        themeBlurSlider.addEventListener('change', () => {
            settingsManager.saveOtherSettingsToLocalStorage();
        });
    }

    // APIキー / プロバイダ
    if (llmProviderSelect) {
        llmProviderSelect.addEventListener('change', async (e: Event) => {
            const selectedProviderId = (e.target as HTMLSelectElement).value;
            if (!selectedProviderId) {
                await settingsManager.loadApiKeyForSelectedProvider('');
                updateTranslationButtonsState();
                settingsManager.renderLlmModelCheckboxes('');
                return;
            }

            // プロバイダIDを更新
            settingsManager.updateCurrentLlmProviderId(selectedProviderId);
            
            // 読み込み（APIキー確認等）の前にUIリストをクリアしておく
            settingsManager.renderLlmModelCheckboxes('');

            // APIキーが保存されているか確認
            const isSaved = await settingsManager.checkIfApiKeyIsSaved(selectedProviderId);
            if (isSaved) {
                // 保存されている場合はパスフレーズモーダルを表示
                passphraseInputForDecrypt.value = '';
                passphraseModal.classList.remove('hidden');
                passphraseInputForDecrypt.focus();

                // パスフレーズ入力待ちの間もモデルリストは表示する
                settingsManager.renderLlmModelCheckboxes(selectedProviderId);
            } else {
                // 保存されていない場合は空で初期化
                await settingsManager.loadApiKeyForSelectedProvider(selectedProviderId);
                updateTranslationButtonsState();
                settingsManager.renderLlmModelCheckboxes(selectedProviderId);
            }
        });
    }

    if (globalLlmProviderSelect) {
        globalLlmProviderSelect.addEventListener('change', async (e: Event) => {
            const v = (e.target as HTMLSelectElement).value || '';
            if (!v) {
                settingsManager.updateCurrentLlmProviderId('');
                settingsManager.updateCurrentApiKey('');
                return;
            }
            const [pId] = v.split('::');
            settingsManager.updateCurrentLlmProviderId(pId);
        });
    }

    deleteApiKeyButton.addEventListener('click', () => {
        const providerId = llmProviderSelect.value;
        if (providerId) settingsManager.deleteApiKeyForProvider(providerId, updateTranslationButtonsState);
    });

    llmProviderList.addEventListener('click', async (e: Event) => {
        const targetButton = (e.target as HTMLElement).closest('button');
        if (!targetButton) return;
        const providerId = targetButton.dataset.providerId;
        if (!providerId) return;

        if (targetButton.classList.contains('edit-llm-provider-button')) {
            if (llmProviderSelect) {
                llmProviderSelect.value = providerId;
                settingsManager.updateCurrentLlmProviderId(providerId);

                settingsManager.renderLlmModelCheckboxes('');

                const isSaved = await settingsManager.checkIfApiKeyIsSaved(providerId);
                if (isSaved) {
                    passphraseInputForDecrypt.value = '';
                    passphraseModal.classList.remove('hidden');
                    passphraseInputForDecrypt.focus();
                    settingsManager.renderLlmModelCheckboxes(providerId);
                } else {
                    await settingsManager.loadApiKeyForSelectedProvider(providerId);
                    updateTranslationButtonsState();
                    settingsManager.renderLlmModelCheckboxes(providerId);
                }
                switchTab('tab1-content');
            }
        } else if (targetButton.classList.contains('delete-llm-provider-button')) {
            await settingsManager.deleteApiKeyForProvider(providerId, updateTranslationButtonsState);
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
            await settingsManager.loadApiKeyForSelectedProvider(providerId, passphrase);
            passphraseModal.classList.add('hidden');
            alertMessage('APIキーを復号化しました。', 'success');
            updateTranslationButtonsState();
            settingsManager.renderLlmModelCheckboxes(providerId);
        } catch (error: any) {
            alertMessage(error.message || '復号化に失敗しました。パスフレーズを確認してください。', 'error');
        }
    });

    cancelPassphraseButton.addEventListener('click', () => {
        passphraseModal.classList.add('hidden');
    });

    deleteApiKeyFromDecryptButton.addEventListener('click', async () => {
        const providerId = llmProviderSelect.value;
        if (providerId) {
            await settingsManager.deleteApiKeyForProvider(providerId, updateTranslationButtonsState);
            passphraseModal.classList.add('hidden');
        }
    });

    passphraseInputForDecrypt.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Enter') {
            submitPassphraseButton.click();
        }
    });

    // レビューモード
    reviewModeCheckbox.addEventListener('change', (e: Event) => {
        settingsManager.updateIsReviewModeEnabled((e.target as HTMLInputElement).checked);
        settingsManager.saveOtherSettingsToLocalStorage();
        settingsManager.updateReviewColumnVisibility();
    });

    // --- すべて翻訳（バルク処理）のロジック ---
    const executeBulkTranslation = async (forceAll = false): Promise<void> => {
        const rows = dataTable.querySelectorAll('tbody tr') as NodeListOf<HTMLTableRowElement>;
        if (rows.length === 0) return;

        if (translateAllContainer) translateAllContainer.classList.add('hidden');
        translateAllDropdownMenu.classList.add('hidden');

        cancelTranslateAllButton.classList.remove('hidden');
        cancelTranslateAllButton.disabled = false;
        cancelTranslateAllButton.textContent = '翻訳停止';
        translationProgress.classList.remove('hidden');
        translateAllProgressBar.style.width = '0%';
        isTranslationCancelled = false;

        let processedRows = 0;

        let selectedModelId: string | null = null;
        if (globalLlmProviderSelect && globalLlmProviderSelect.value) {
            const parts = globalLlmProviderSelect.value.split('::');
            if (parts.length === 2) selectedModelId = parts[1];
        }

        const concurrency = Math.max(1, Math.min(500, settingsManager.parallelCount || 10));
        const activeTasks = new Set<Promise<void>>();
        const targetRows = Array.from(rows).filter(row => {
            if (row.style.display === 'none') return false;
            const translationCell = row.querySelector('.translation-cell');
            if (!translationCell) return false;
            return forceAll || translationCell.textContent === '未翻訳';
        });

        const hashGroups = new Map<string, HTMLTableRowElement[]>();
        targetRows.forEach(row => {
            const hash = row.getAttribute('data-hash');
            const key = hash ? hash : `unique-${Math.random()}`;
            if (!hashGroups.has(key)) {
                hashGroups.set(key, []);
            }
            hashGroups.get(key)!.push(row);
        });

        const actualTotal = hashGroups.size;
        if (actualTotal === 0) {
            finishTranslation();
            return;
        }

        for (const [_hashKey, groupRows] of hashGroups.entries()) {
            if (isTranslationCancelled) break;

            const representativeRow = groupRows[0];
            const otherRows = groupRows.slice(1);

            const taskPromise = (async (r, others) => {
                try {
                    const result = await translationManager.translateRow(r, selectedModelId, true);
                    
                    if (result && result.status === 'Success' && result.maskedTranslatedText && result.tokenizedSentence && others.length > 0) {
                        const masker = new TranslationMasker();
                        const replacements = result.tokenizedSentence.replacements;
                        others.forEach(otherRow => {
                            const otherOriginalTextCell = otherRow.querySelector('.original-text-cell') as HTMLElement;
                            const otherTranslationCell = otherRow.querySelector('.translation-cell') as HTMLElement;
                            if (otherOriginalTextCell && otherTranslationCell) {
                                // innerText を使用して改行を保持したテキストを取得
                                const otherRawText = otherOriginalTextCell.innerText;
                                const otherStructure = StructureParser.parse(otherRawText, settingsManager.modifierCharacters);
                                
                                // 元の翻訳で使用されたトークンのスロット情報を用いて、この行用の復元データを生成
                                const otherSentence = masker.createSiblingSentence(otherStructure, replacements);
                                const restoredText = otherSentence.restore(result.maskedTranslatedText);
                                
                                // 表示用に改行を <br> に変換
                                otherTranslationCell.innerHTML = restoredText.replace(/\\n/g, '<br>').replace(/\r?\n/g, '<br>');
                            }
                        });
                    }
                } catch (err) {
                    console.error("Row translation failed:", err);
                } finally {
                    processedRows++;
                    const progress = (processedRows / actualTotal) * 100;
                    translateAllProgressBar.style.width = `${progress}%`;
                }
            })(representativeRow, otherRows).finally(() => {
                activeTasks.delete(taskPromise);
            });

            activeTasks.add(taskPromise);

            if (activeTasks.size >= concurrency) {
                await Promise.race(activeTasks);
            }
        }

        await Promise.all(activeTasks);

        function finishTranslation(): void {
            if (translateAllContainer) translateAllContainer.classList.remove('hidden');
            cancelTranslateAllButton.classList.add('hidden');
            translationProgress.classList.add('hidden');

            if (isTranslationCancelled) alertMessage('翻訳を停止しました。', 'info');
            else alertMessage('すべての翻訳が完了しました。', 'success');
        }

        finishTranslation();
    };

    translateAllDropdownToggle.addEventListener('click', (e: MouseEvent) => {
        e.stopPropagation();
        translateAllDropdownMenu.classList.toggle('hidden');
    });

    document.addEventListener('click', (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (!translateAllDropdownMenu.contains(target) && !translateAllDropdownToggle.contains(target)) {
            translateAllDropdownMenu.classList.add('hidden');
        }
    });

    translateAllButton.addEventListener('click', () => executeBulkTranslation(false));
    translateUntranslatedOnlyItem.addEventListener('click', () => executeBulkTranslation(false));
    translateAllForceItem.addEventListener('click', () => executeBulkTranslation(true));


    cancelTranslateAllButton.addEventListener('click', () => {
        isTranslationCancelled = true;
        cancelTranslateAllButton.disabled = true;
        cancelTranslateAllButton.textContent = '停止中...';
    });

    dataTable.addEventListener('click', async (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        const row = target.closest('tr') as HTMLTableRowElement | null;
        if (!row) return;

        if (target.closest('.translate-button')) {
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

    let originalCellValueBeforeEdit = '';

    dataTable.addEventListener('focusin', (e: Event) => {
        const target = e.target as HTMLElement;
        if (target.classList.contains('translation-cell')) {
            originalCellValueBeforeEdit = target.innerText.trim();
        }
    });

    dataTable.addEventListener('focusout', async (e: Event) => {
        const target = e.target as HTMLElement;
        if (target.classList.contains('translation-cell')) {
            const row = target.closest('tr') as HTMLTableRowElement | null;
            if (row) {
                const currentText = target.innerText.trim();
                console.log(`[EditDetection] focusout on row. Text: "${currentText}", Original: "${originalCellValueBeforeEdit}"`);
                // 内容が変更されており、かつ空でない場合にグループ適用を確認
                if (currentText !== originalCellValueBeforeEdit && currentText !== '' && currentText !== '未翻訳') {
                    console.log(`[EditDetection] Change detected! Calling applyManualEditToGroup...`);
                    await translationManager.applyManualEditToGroup(row, currentText);
                }
            }
        }
    });

    dataTable.addEventListener('input', (e: Event) => {
        const target = e.target as HTMLElement;
        if (target.classList.contains('translation-cell')) {
            const row = target.closest('tr') as HTMLTableRowElement | null;
            if (row) {
                const currentText = target.innerText.trim();
                const stageAttr = row.getAttribute('data-stage');
                const currentStage = stageAttr ? parseInt(stageAttr, 10) : 0;
                
                if (!currentText || currentText === '未翻訳') {
                    // 何も入っていなければ自動で未翻訳 (stage: 0)
                    if (currentStage !== 0) {
                        stageManager.updateRowStage(row, 0);
                    }
                } else {
                    // 何か入っており、かつ現在が「未翻訳」なら「翻訳済み」にする
                    if (currentStage === 0) {
                        stageManager.updateRowStage(row, 1);
                    }
                }
                
                if (tableFilter) tableFilter.applyFilters();
            }
        }
    });

    const showSuggestionsOverlay = async (row: HTMLTableRowElement): Promise<void> => {
        if (!settingsManager.currentApiKey) {
            alertMessage('APIキーが設定されていません。', 'error');
            return;
        }
        currentOverlayRow = row;
        const btn = row.querySelector('.get-suggestions-button i') as HTMLElement | null;
        if (btn) { btn.classList.remove('fa-chevron-down'); btn.classList.add('fa-chevron-up'); }

        const translationCell = row.querySelector('.translation-cell') as HTMLElement;
        const rect = translationCell.getBoundingClientRect();
        const tableRect = tableContainer.getBoundingClientRect();
        // コンテナのスクロール量を考慮して位置を計算
        suggestionsOverlay.style.top = `${(rect.top - tableRect.top) + tableContainer.scrollTop + rect.height + 5}px`;
        suggestionsOverlay.style.left = `${(rect.left - tableRect.left) + tableContainer.scrollLeft}px`;
        suggestionsOverlay.style.width = `${rect.width}px`;
        suggestionsOverlay.classList.remove('hidden');
        suggestionsList.innerHTML = '<div class="text-center text-gray-500">読み込み中...</div>';

        // 表示直後にスクロール調整
        setTimeout(() => ensureOverlayVisible(), 10);

        const originalText = row.querySelector('.original-text-cell')?.textContent || "";
        const key = row.querySelector('td.string_key-column-header')?.textContent || "";
        const toneSelect = row.querySelector('.individual-tone-select') as HTMLSelectElement | null;
        const tone = toneSelect ? toneSelect.value : "default";
        const providerId = settingsManager.currentLlmProviderId;
        const provider = settingsManager.LLM_PROVIDERS.find(p => p.id === providerId);

        // マスキングデータを取得（グループ翻訳対応）
        const maskData = translationManager.getMaskDataForGroup(row);

        let results: any[] = [];
        if (provider && provider.models) {
            const enabledModels = provider.models.filter(m => m.enabled);
            
            const promises = enabledModels.map(async (model) => {
                try {
                    const res = await translationManager.translateText(originalText, key, tone, providerId, model.id, maskData);
                    return {
                        providerName: provider.name,
                        modelName: model.name,
                        result: res, // TranslationResult オブジェクトを保持
                        isError: res.status === 'Error'
                    };
                } catch (e: any) {
                    return {
                        providerName: provider.name,
                        modelName: model.name,
                        result: { translatedText: e.message, status: 'Error' } as any,
                        isError: true
                    };
                }
            });
            
            results = await Promise.all(promises);
        }

        suggestionsList.innerHTML = '';
        if (results.length === 0) suggestionsList.innerHTML = '<div class="text-center text-gray-500">翻訳案なし</div>';
        results.forEach(r => {
            const div = document.createElement('div');
            div.className = 'suggestion-item flex items-start justify-between group/sitem';
            div.innerHTML = `
                <div class="flex-grow pr-4">
                    <div class="flex items-center gap-2 mb-1">
                        <span class="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:bg-indigo-400/20 dark:text-indigo-400">
                            ${escapeHTML(r.modelName)}
                        </span>
                        <span class="text-[10px] text-gray-400 font-medium">${escapeHTML(r.providerName)}</span>
                    </div>
                    <div class="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap leading-relaxed ${r.isError ? 'text-red-500' : ''}">${escapeHTML(r.result.translatedText)}</div>
                </div>
                <button class="copy-suggestion-button btn-icon btn-sm !w-8 !h-8 !rounded-lg opacity-0 group-hover/sitem:opacity-100 transition-all hover:bg-indigo-500 hover:text-white" title="採用">
                    <i class="fa-solid fa-check"></i>
                </button>
             `;
            if (!r.isError) {
                const copyBtn = div.querySelector('.copy-suggestion-button') as HTMLButtonElement;
                copyBtn.onclick = () => {
                    translationManager.applyTranslationToRow(row, r.result);
                    hideSuggestionsOverlay();
                    alertMessage('翻訳を適用しました。', 'success');
                    
                    // 他の行への適用チェック
                    translationManager.checkAndApplyToGroup(row, r.result);
                    
                    if (tableFilter && tableFilter.applyFilters) tableFilter.applyFilters();
                };
            } else {
                div.querySelector('.copy-suggestion-button')?.remove();
            }
            suggestionsList.appendChild(div);
        });

        // 内容が読み込まれた後（高さが確定した後）に再度スクロール調整
        setTimeout(() => ensureOverlayVisible(), 100);
    };

    /**
     * 翻訳案ポップアップがテーブルコンテナ内で完全に見えるようにスクロール位置を調整する
     */
    const ensureOverlayVisible = (): void => {
        if (!suggestionsOverlay || suggestionsOverlay.classList.contains('hidden')) return;

        const container = tableContainer;
        const overlay = suggestionsOverlay;
        
        // オーバーレイの下端位置（コンテナのコンテンツ座標内）
        const overlayTop = parseFloat(overlay.style.top);
        const overlayHeight = overlay.offsetHeight;
        const overlayBottom = overlayTop + overlayHeight;

        // コンテナの現在の表示範囲の下端
        const containerVisibleBottom = container.scrollTop + container.clientHeight;

        // もしオーバーレイの下端が表示範囲を超えていたらスクロール
        if (overlayBottom > containerVisibleBottom) {
            container.scrollTo({
                top: overlayBottom - container.clientHeight + 20, // 20pxの余白
                behavior: 'smooth'
            });
        }
    };

    const hideSuggestionsOverlay = (): void => {
        suggestionsOverlay.classList.add('hidden');
        if (currentOverlayRow) {
            const btn = currentOverlayRow.querySelector('.get-suggestions-button i') as HTMLElement | null;
            if (btn) { btn.classList.remove('fa-chevron-up'); btn.classList.add('fa-chevron-down'); }
            currentOverlayRow = null;
        }
    };
    closeSuggestionsOverlayButton.addEventListener('click', hideSuggestionsOverlay);
    
    // 翻訳案ポップアップの外側をクリックしたら閉じる
    document.addEventListener('click', (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        // ポップアップ自身、または「他の翻訳案を表示」ボタンをクリックした場合は何もしない
        if (suggestionsOverlay && !suggestionsOverlay.classList.contains('hidden')) {
            if (!suggestionsOverlay.contains(target) && !target.closest('.get-suggestions-button')) {
                hideSuggestionsOverlay();
            }
        }
    });

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
                settingsManager.saveOtherSettingsToLocalStorage();
                alertMessage('すべての用語を削除しました。', 'success');
                glossaryManager.resetGlossaryForm();
            }
        });
    }

    // アバウト
    if (appLogo) appLogo.addEventListener('click', () => aboutModal.classList.remove('hidden'));
    if (closeAboutButton) closeAboutButton.addEventListener('click', () => aboutModal.classList.add('hidden'));

});
