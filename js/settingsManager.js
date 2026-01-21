/**
 * settingsManager.js
 * アプリケーションの設定管理、状態管理、および設定関連のUI操作を担当するモジュール
 */

import { saveEncryptedApiKey, getSettingFromIndexedDB, saveSettingToIndexedDB, deleteSettingFromIndexedDB, API_KEY_PREFIX, loadEncryptedApiKey, hasSavedApiKey } from './db.js';
import { alertMessage, createLlmProviderOptionsHtml, createToneOptionsHtml, escapeHTML } from './uiUtils.js';

// --- Global State Variables ---
// これらの変数はアプリケーション全体で共有される状態
export let LLM_PROVIDERS = [];
export let currentApiKey = "";
export let currentLlmProviderId = '';
export let currentLlmModelId = ''; // 追加
export let customTones = [];
export let glossaryTerms = [];
export let modifierCharacters = [];
export let isReviewModeEnabled = false;

// --- DOM Elements (Initialized in initializeSettingsManager) ---
let llmProviderSelect;
let llmModelCheckboxList;
let addLlmModelButton;
let globalLlmProviderSelect;
let globalToneSelect;
let defaultToneSelect;
let reviewModeCheckbox;
let apiKeyInput;
let apiPassphraseInput;
let llmProviderList;
let modifierNameInput;
let modifierRegexInput;

// --- Constants ---
// --- Constants ---
// 修飾文字のデフォルト設定リスト
export const DEFAULT_MODIFIERS = [
    { id: 'def_1', name: 'ユーザー名/メンション', regex: '@\\w+\\s?', enabled: true },
    { id: 'def_2', name: '角括弧変数', regex: '@?\\[[^\\]]+\\]', enabled: true },
    { id: 'def_3', name: '£記号変数', regex: '£\\w+?[£\\s]', enabled: true },
    { id: 'def_4', name: '@£$パターン', regex: '[@£]\\$.+?\\$', enabled: true },
    { id: 'def_5', name: '$囲みパターン', regex: '\\$[\\w.@-]+\\|*[^$]*\\$', enabled: true },
    { id: 'def_6', name: '§単語', regex: '§\\w', enabled: true },
    { id: 'def_7', name: '§感嘆符', regex: '§!', enabled: true },
    { id: 'def_8', name: '通貨記号', regex: '¤', enabled: true },
    { id: 'def_9', name: '@大文字', regex: '@[A-Z]+(\\s|$)', enabled: true }
];

// デフォルトのLLMプロバイダ設定
const DEFAULT_LLM_PROVIDERS_CONFIG = [
    { id: 'gemini', name: 'Gemini', defaultApiKeyLabel: 'Gemini APIキー', defaultPlaceholder: 'YOUR GEMINI API KEY', models: [] },
    { id: 'openai', name: 'Chat GPT', defaultApiKeyLabel: 'OpenAI APIキー', defaultPlaceholder: 'YOUR OPENAI API KEY', models: [] },
    { id: 'anthropic', name: 'Claude', defaultApiKeyLabel: 'Anthropic APIキー', defaultPlaceholder: 'YOUR ANTHROPIC API KEY', models: [] }
];

/**
 * SettingsManagerを初期化する関数
 * DOM要素の取得などを行う
 */
export const initializeSettingsManager = () => {
    llmProviderSelect = document.getElementById('llm-provider-select');
    llmModelCheckboxList = document.getElementById('llm-model-checkbox-list');
    addLlmModelButton = document.getElementById('add-llm-model-button');
    globalLlmProviderSelect = document.getElementById('global-llm-provider-select');
    globalToneSelect = document.getElementById('tone-select');
    defaultToneSelect = document.getElementById('default-tone-select');
    reviewModeCheckbox = document.getElementById('review-mode-checkbox');
    apiKeyInput = document.getElementById('api-key-input');
    apiPassphraseInput = document.getElementById('api-passphrase-input');
    llmProviderList = document.getElementById('llm-provider-list');
    llmProviderList = document.getElementById('llm-provider-list');
    // modifierNameInput, modifierRegexInput は script.js の modifierManager で管理するためここでは取得しない
};

// --- State Setters (if needed for external updates) ---
export const updateCurrentApiKey = (key) => currentApiKey = key;
export const updateCurrentLlmProviderId = (id) => currentLlmProviderId = id;
export const updateCurrentLlmModelId = (id) => currentLlmModelId = id;
export const updateGlossaryTerms = (terms) => glossaryTerms = terms;
export const updateCustomTones = (tones) => customTones = tones;
export const updateModifierCharacters = (chars) => modifierCharacters = chars;
export const updateIsReviewModeEnabled = (isEnabled) => isReviewModeEnabled = isEnabled;

/**
 * プロバイダのAPIキーが保存されているか確認する関数
 * @param {string} providerId 
 * @returns {Promise<boolean>}
 */
export const checkIfApiKeyIsSaved = async (providerId) => {
    return await hasSavedApiKey(providerId);
};



/**
 * APIキー以外の設定をlocalStorageに保存する関数
 */
export const saveOtherSettingsToLocalStorage = () => {
    try {
        const settings = {
            defaultTone: defaultToneSelect ? defaultToneSelect.value : 'da_dearu',
            customTones: customTones,
            glossaryTerms: glossaryTerms,
            modifierCharacters: modifierCharacters,
            isReviewModeEnabled: isReviewModeEnabled,
            llmProviders: LLM_PROVIDERS, // LLMプロバイダリストを保存 (enabled状態も含む)
            currentLlmProviderId: currentLlmProviderId, // 現在選択中のLLMプロバイダIDを保存
        };
        localStorage.setItem('translationAppSettings', JSON.stringify(settings));
        if (globalToneSelect) globalToneSelect.value = settings.defaultTone;
        console.log("Other settings saved to localStorage:", settings);
    } catch (error) {
        console.error("Error saving other settings to localStorage:", error);
        alertMessage("その他の設定の保存に失敗しました。", 'error');
    }
};

/**
 * 指定されたプロバイダIDに基づいてLLMモデルチェックボックスを更新する関数
 * @param {string} providerId - 選択されたLLMプロバイダのID
 */
export const renderLlmModelCheckboxes = (providerId) => {
    if (!llmModelCheckboxList) return;
    llmModelCheckboxList.innerHTML = ''; // リストをクリア
    const selectedProvider = LLM_PROVIDERS.find(p => p.id === providerId);

    // プロバイダ未選択
    if (!providerId || !selectedProvider) {
        llmModelCheckboxList.innerHTML = '<p class="text-gray-500 text-sm">プロバイダを選択してください。</p>';
        return;
    }

    // models を必ず配列として扱う
    if (!Array.isArray(selectedProvider.models)) selectedProvider.models = [];

    // 追加ボタン（1回だけバインドするためのフラグチェックは本来ここではなく初期化時にやるべきだが、動的要素の関係でここにある場合）
    // NOTE: script.jsでは `dataset.bound` チェックがあったが、ここでは都度イベントを設定しなおさないように注意が必要。
    // settingsManagerの再利用性を考えると、イベントリスナーは外部で設定するか、ここでの設定を工夫する必要がある。
    // ひとまず script.js のロジックを維持し、addLlmModelButtonへのリスナーはこの関数内ではなく、
    // create時に設定するか、あるいは script.js 側でイベント委譲を使うべきだが、
    // ここでは移植に留め、dataset.bound パターンを維持する。

    if (addLlmModelButton && !addLlmModelButton.dataset.bound) {
        addLlmModelButton.dataset.bound = 'true';
        addLlmModelButton.addEventListener('click', () => {
            const currentProviderId = llmProviderSelect?.value || providerId;
            const provider = LLM_PROVIDERS.find(p => p.id === currentProviderId);
            if (!provider) {
                alertMessage('先に翻訳プロバイダを選択してください。', 'warning');
                return;
            }
            if (!Array.isArray(provider.models)) provider.models = [];
            const uid = `uid_${Date.now()}_${Math.random().toString(16).slice(2)}`;
            provider.models.push({ id: '', name: '', enabled: true, _uid: uid, isCustom: true });
            saveOtherSettingsToLocalStorage();
            renderLlmModelCheckboxes(currentProviderId);
        });
    }

    // モデルがまだ無い場合もUIは出す（空メッセージのみ）
    if (selectedProvider.models.length === 0) {
        llmModelCheckboxList.innerHTML = '<p class="text-gray-500 text-sm">モデルがありません。下の「追加」で入力してください。</p>';
        return;
    }

    selectedProvider.models.forEach((model, idx) => {
        if (!model._uid) model._uid = `uid_${Date.now()}_${Math.random().toString(16).slice(2)}`;

        const row = document.createElement('div');
        row.className = 'flex items-center gap-2';

        // 現在値（重複チェック用）
        const currentValue = (model.id || '').trim();

        row.innerHTML = `
            <input type="checkbox"
                   class="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                   ${model.enabled && currentValue ? 'checked' : ''}>
            <input type="text"
                   class="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                   placeholder="モデルIDを入力（例: gpt-4o-mini / gemini-1.5-pro / claude-3-5-sonnet）"
                   value="${escapeHTML(currentValue)}">
            <button type="button"
                    class="bg-red-500 text-white px-3 py-2 rounded-lg shadow-md hover:bg-red-600 transition-colors duration-300 text-sm whitespace-nowrap">
                削除
            </button>
        `;

        const checkbox = row.querySelector('input[type="checkbox"]');
        const input = row.querySelector('input[type="text"]');
        const delBtn = row.querySelector('button');

        // チェックで有効/無効
        checkbox.addEventListener('change', (e) => {
            const v = (input.value || '').trim();
            if (!v) {
                e.target.checked = false;
                model.enabled = false;
                alertMessage('モデルIDが空の行は有効化できません。', 'warning');
            } else {
                model.enabled = e.target.checked;
            }
            saveOtherSettingsToLocalStorage();
        });

        // テキスト変更でIDを更新（blur時に確定）
        const commitValue = () => {
            const v = (input.value || '').trim();

            // 重複チェック（空は除外）
            if (v) {
                const dup = selectedProvider.models.some((m, j) => j !== idx && (m.id || '').trim() === v);
                if (dup) {
                    alertMessage('同じモデルIDが既にあります。別のIDにしてください。', 'warning');
                    input.value = escapeHTML((model.id || '').trim());
                    return;
                }
            }

            model.id = v;
            model.name = v; // 表示名はIDと同一扱い
            // 空なら強制無効
            if (!v) {
                model.enabled = false;
                checkbox.checked = false;
            }
            saveOtherSettingsToLocalStorage();
        };

        input.addEventListener('blur', commitValue);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                input.blur();
            }
        });

        // 削除
        delBtn.addEventListener('click', () => {
            if (!confirm('このモデル行を削除しますか？')) return;
            selectedProvider.models.splice(idx, 1);
            saveOtherSettingsToLocalStorage();
            renderLlmModelCheckboxes(providerId);
        });

        llmModelCheckboxList.appendChild(row);
    });
};

/**
 * IndexedDBにAPIキーが保存されているLLMプロバイダと、有効なモデルを持つプロバイダのリストを取得する関数
 */
export const getSavedAndEnabledLlmProviders = async () => {
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
export const populateLlmProviderDropdowns = async (currentLlmModelId = null) => {
    if (!llmProviderSelect) return;

    // 設定モーダル内のLLMプロバイダ選択ドロップダウンを更新 (全プロバイダを表示)
    llmProviderSelect.innerHTML = createLlmProviderOptionsHtml(LLM_PROVIDERS, true); // 「選択してください」を追加
    llmProviderSelect.value = currentLlmProviderId; // 現在選択中のプロバイダを選択

    // 一括翻訳LLMプロバイダ選択ドロップダウンを更新 (保存済みかつ有効なモデルを持つプロバイダのみ表示)
    const savedAndEnabledProviders = await getSavedAndEnabledLlmProviders();

    // globalLlmProviderSelectのオプションを生成（モデル別）
    let globalOptionsHtml = '<option value="">選択してください</option>';

    savedAndEnabledProviders.forEach(p => {
        const provider = LLM_PROVIDERS.find(x => x.id === p.providerId);
        if (!provider || !provider.models) return;

        provider.models
            .filter(m => m.enabled)
            .forEach(m => {
                // valueは「providerId::modelId」にする
                const v = `${provider.id}::${m.id}`;
                globalOptionsHtml += `<option value="${escapeHTML(v)}">${escapeHTML(provider.name)} / ${escapeHTML(m.id)}</option>`;
            });
    });
    if (globalLlmProviderSelect) {
        globalLlmProviderSelect.innerHTML = globalOptionsHtml;
        // デフォルト選択
        const currentValue = (currentLlmProviderId && currentLlmModelId) ? `${currentLlmProviderId}::${currentLlmModelId}` : '';
        if (currentValue && globalOptionsHtml.includes(`value="${escapeHTML(currentValue)}"`)) {
            globalLlmProviderSelect.value = currentValue;
        } else {
            globalLlmProviderSelect.value = '';
        }
    }

    // 選択されたプロバイダに基づいてモデルチェックボックスを更新
    renderLlmModelCheckboxes(currentLlmProviderId);
};

/**
 * 登録済みLLMプロバイダのリストをレンダリングする関数
 */
export const renderLlmProviderList = async () => {
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

            // 削除ボタンと編集ボタンのイベントは、リスト全体レンダリング後に委譲するか、ここでバインドする必要がある
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
export const populateToneDropdowns = () => {
    const allTones = [
        ...customTones.map(tone => ({ value: tone.value, name: tone.name, instruction: tone.instruction }))
    ];

    // globalToneSelectの更新
    if (globalToneSelect) {
        const currentVal = globalToneSelect.value;
        globalToneSelect.innerHTML = createToneOptionsHtml(allTones);
        globalToneSelect.value = currentVal || 'da_dearu';
    }

    // defaultToneSelectの更新
    if (defaultToneSelect) {
        const currentVal = defaultToneSelect.value;
        defaultToneSelect.innerHTML = createToneOptionsHtml(allTones);
        defaultToneSelect.value = currentVal || 'da_dearu';
    }

    // 画面内のすべての individual-tone-select を更新
    const individualToneSelects = document.querySelectorAll('.individual-tone-select');
    individualToneSelects.forEach(select => {
        const currentVal = select.value;
        select.innerHTML = createToneOptionsHtml(allTones, true); // 全体設定に沿うオプションを含める
        select.value = currentVal || 'default';
    });
};

/**
 * 設定のロード後に校閲列の表示などのUI更新を行う必要があるため、この関数をexport
 */
export const updateReviewColumnVisibility = () => {
    const reviewCells = document.querySelectorAll('.review-column-cell, .review-column-header');
    if (isReviewModeEnabled) {
        reviewCells.forEach(cell => cell.classList.remove('hidden'));
    } else {
        reviewCells.forEach(cell => cell.classList.add('hidden'));
    }

    // テーブルが再生成されたときのためにスタイルも調整（簡易的）
    // 必要ならCSSクラス操作を追加
};

/**
 * 設定をIndexedDBとlocalStorageから読み込む関数
 */
export const loadSettings = async () => {
    try {
        // APIキー以外の設定をlocalStorageから読み込む
        const settingsJson = localStorage.getItem('translationAppSettings');
        if (settingsJson) {
            const settings = JSON.parse(settingsJson);
            customTones = settings.customTones || [];
            glossaryTerms = settings.glossaryTerms || [];
            modifierCharacters = settings.modifierCharacters || [];
            isReviewModeEnabled = settings.isReviewModeEnabled || false;

            // LLM_PROVIDERSの復元ロジック
            LLM_PROVIDERS = JSON.parse(JSON.stringify(DEFAULT_LLM_PROVIDERS_CONFIG));

            if (settings.llmProviders && Array.isArray(settings.llmProviders)) {
                LLM_PROVIDERS = LLM_PROVIDERS.map(defaultP => {
                    const loadedP = settings.llmProviders.find(p => p.id === defaultP.id);
                    if (loadedP) {
                        defaultP.models = defaultP.models.map(defaultM => {
                            const loadedM = loadedP.models.find(m => m.id === defaultM.id);
                            return loadedM ? { ...defaultM, enabled: loadedM.enabled } : defaultM;
                        });
                        loadedP.models.forEach(loadedM => {
                            if (!defaultP.models.some(m => m.id === loadedM.id)) {
                                defaultP.models.push(loadedM);
                            }
                        });
                        return defaultP;
                    }
                    return defaultP;
                });
                settings.llmProviders.forEach(loadedP => {
                    if (!LLM_PROVIDERS.some(p => p.id === loadedP.id)) {
                        LLM_PROVIDERS.push(loadedP);
                    }
                });
            }

            currentLlmProviderId = settings.currentLlmProviderId || '';

            // デフォルト値の注入 (customTones空の場合など)
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

            if (modifierCharacters.length === 0) {
                modifierCharacters = JSON.parse(JSON.stringify(DEFAULT_MODIFIERS));
                saveOtherSettingsToLocalStorage();
            }

            // UIへの反映
            if (defaultToneSelect) defaultToneSelect.value = settings.defaultTone || 'da_dearu';
            if (reviewModeCheckbox) reviewModeCheckbox.checked = isReviewModeEnabled;
            if (globalToneSelect) globalToneSelect.value = settings.defaultTone || 'da_dearu';

            // modifierNameInput への反映は modifierManager に委譲するため削除

            console.log("Other settings loaded from localStorage:", settings);
        } else {
            console.log("No other settings found in localStorage, initializing with defaults.");
            // デフォルト初期化
            customTones = [];
            glossaryTerms = [];
            modifierCharacters = [];
            isReviewModeEnabled = false;
            LLM_PROVIDERS = JSON.parse(JSON.stringify(DEFAULT_LLM_PROVIDERS_CONFIG));
            currentLlmProviderId = '';

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
            modifierCharacters = JSON.parse(JSON.stringify(DEFAULT_MODIFIERS));

            saveOtherSettingsToLocalStorage();

            if (defaultToneSelect) defaultToneSelect.value = 'da_dearu';
            if (reviewModeCheckbox) reviewModeCheckbox.checked = false;
            if (globalToneSelect) globalToneSelect.value = 'da_dearu';
            // modifierNameInput への反映は modifierManager に委譲するため削除
        }

        populateToneDropdowns();
        await populateLlmProviderDropdowns();
        updateReviewColumnVisibility();
    } catch (error) {
        console.error("Error loading settings:", error);
        alertMessage("設定の読み込み中にエラーが発生しました。", 'error');
    }
};

/**
 * 指定されたLLMプロバイダのAPIキーをIndexedDBから読み込み、UIとcurrentApiKeyを更新する関数
 * @param {string} providerId - LLMプロバイダのID
 * @param {string} [passphrase] - オプションのパスフレーズ
 */
export const loadApiKeyForSelectedProvider = async (providerId, passphrase = null) => {
    if (!providerId) {
        currentApiKey = '';
        if (apiKeyInput) apiKeyInput.value = '';
        return;
    }

    try {
        // パスフレーズが渡されていない場合は何もしない（パスフレーズが必要な場合に誤って空でクリアするのを防ぐ）
        if (!passphrase && await hasSavedApiKey(providerId)) {
            currentApiKey = '';
            if (apiKeyInput) apiKeyInput.value = '';
            return;
        }

        const decryptedApiKey = await loadEncryptedApiKey(providerId, passphrase); // db.jsの関数を使用
        if (decryptedApiKey) {
            currentApiKey = decryptedApiKey; // 復号化されたAPIキーを設定
            if (apiKeyInput) apiKeyInput.value = currentApiKey; // UIに表示
        } else {
            currentApiKey = '';
            if (apiKeyInput) apiKeyInput.value = '';
        }
    } catch (error) {
        console.error('APIキーの読み込みに失敗しました:', error);
        currentApiKey = '';
        if (apiKeyInput) apiKeyInput.value = '';
        throw error; // エラーを呼び出し元に伝播させてUIで表示できるようにする
    }
};

/**
 * プロバイダのAPIキー情報を削除する関数
 * @param {string} providerId
 */
export const deleteApiKeyForProvider = async (providerId, updateTranslationButtonsStateCallback) => {
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
            updateCurrentApiKey('');
            if (apiKeyInput) apiKeyInput.value = '';
        }
        if (updateTranslationButtonsStateCallback) updateTranslationButtonsStateCallback();
        renderLlmProviderList();
        populateLlmProviderDropdowns();
    } catch (error) {
        console.error('APIキーの削除に失敗しました:', error);
        alertMessage('APIキーの削除に失敗しました。', 'error');
    }
};

/**
 * 設定を保存する関数 (APIキーの保存ロジックを含む)
 */
export const saveSettings = async (updateTranslationButtonsStateCallback) => {
    try {
        const apiKey = apiKeyInput.value.trim();
        const passphrase = apiPassphraseInput.value.trim();
        const selectedProviderId = llmProviderSelect.value;
        const previousApiKey = currentApiKey;

        if (!selectedProviderId) {
            alertMessage('APIキーを保存するには、翻訳プロバイダを選択してください。', 'warning');
            return;
        }

        // 選択されたプロバイダのモデルのenabled状態を更新
        const providerToUpdate = LLM_PROVIDERS.find(p => p.id === selectedProviderId);
        if (providerToUpdate) {
            const checkboxes = llmModelCheckboxList.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach(checkbox => {
                // DOMからdatasetを取得できない場合があるため、表示順序などで特定するか、再レンダリング時のデータを信用する
                // renderLlmModelCheckboxesで生成したinputにはdata属性がない可能性があるため、
                // render時の構造依存 (input[type=checkbox]の隣のinput[type=text]) を利用して値を拾うのが確実
                // ここでは簡易的に、renderLlmModelCheckboxesがDOMとprovider.modelsの同期を取っている（changeイベント等で）ことを前提とし、
                // ここでの明示的なsave動作では saveOtherSettingsToLocalStorage() を呼ぶだけでよいかもしれないが、
                // 念のため再チェック
            });
            // 実装上、チェックボックスのchangeイベントで既にモデルの状態は更新され、saveOtherSettingsToLocalStorageされている。
            // なのでここでは明示的な同期は不要かもしれない。
        }

        if (apiKey && (apiKey !== currentApiKey || !currentApiKey)) {
            try {
                await saveEncryptedApiKey(selectedProviderId, apiKey, passphrase);
                // 成功
                const providerName = LLM_PROVIDERS.find(p => p.id === selectedProviderId)?.name || selectedProviderId;
                alertMessage(`${providerName} のAPIキーを暗号化して保存しました。`, 'success');

                currentApiKey = apiKey;
                apiKeyInput.value = '';
                apiPassphraseInput.value = '';
                if (updateTranslationButtonsStateCallback) updateTranslationButtonsStateCallback();
            } catch (error) {
                alertMessage(error.message || 'APIキーの保存に失敗しました。', 'error');
                return;
            }
        } else if (!apiKey && currentApiKey && currentLlmProviderId === selectedProviderId) {
            alertMessage('APIキーが変更されていないため、パスフレーズは不要です。', 'info');
        } else if (!apiKey && !currentApiKey) {
            alertMessage('APIキーが入力されていません。', 'info');
        }

        saveOtherSettingsToLocalStorage();
        renderLlmProviderList();
        populateLlmProviderDropdowns();

        alertMessage("設定を保存しました。", 'success');
    } catch (error) {
        console.error("Error saving settings:", error);
        alertMessage("設定の保存に失敗しました。", 'error');
    }
};
