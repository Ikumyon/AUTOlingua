import { 
    saveEncryptedApiKey,
    getSettingFromIndexedDB,
    deleteSettingFromIndexedDB,
    API_KEY_PREFIX, 
    loadEncryptedApiKey, 
    hasSavedApiKey 
} from './db';
import { 
    alertMessage, 
    createLlmProviderOptionsHtml, 
    createToneOptionsHtml, 
    escapeHTML 
} from './uiUtils';
import { 
    LLMProvider, 
    GlossaryTerm, 
    CustomTone, 
    ModifierCharacter, 
    AppSettings 
} from './types';

export const DEFAULT_MODIFIERS: ModifierCharacter[] = [
    { id: 'def_1', name: '@文字', regex: '@\\w+\\s?', enabled: true, type: 'variable', category: 'at_var' },
    { id: 'def_2', name: '角括弧変数', regex: '@?\\[[^\\]]+\\]', enabled: true, type: 'variable', category: 'bracket_var' },
    { id: 'def_3', name: '£記号変数', regex: '£\\w+?[£\\s]', enabled: true, type: 'variable', category: 'pound_var' },
    { id: 'def_4', name: '@£$パターン', regex: '[@£]\\$.+?\\$', enabled: true, type: 'variable', category: 'complex_var' },
    { id: 'def_5', name: '$囲みパターン', regex: '\\$[\\w.@-]+\\|*[^$]*\\$', enabled: true, type: 'variable', category: 'dollar_var' },
    { id: 'def_6', name: '§単語', regex: '§\\w', enabled: true, type: 'decoration', category: 'color_deco' },
    { id: 'def_7', name: '§感嘆符', regex: '§!', enabled: true, type: 'decoration', category: 'emphasis' },
    { id: 'def_8', name: '通貨記号', regex: '¤', enabled: true, type: 'variable', category: 'currency' },
    { id: 'def_9', name: '@大文字', regex: '@[A-Z]+(\\s|$)', enabled: true, type: 'variable', category: 'caps_var' }
];

const DEFAULT_LLM_PROVIDERS_CONFIG: LLMProvider[] = [
    { id: 'gemini', name: 'Gemini', defaultApiKeyLabel: 'Gemini APIキー', defaultPlaceholder: 'YOUR GEMINI API KEY', models: [] },
    { id: 'openai', name: 'Chat GPT', defaultApiKeyLabel: 'OpenAI APIキー', defaultPlaceholder: 'YOUR OPENAI API KEY', models: [] },
    { id: 'anthropic', name: 'Claude', defaultApiKeyLabel: 'Anthropic APIキー', defaultPlaceholder: 'YOUR ANTHROPIC API KEY', models: [] }
];

export class SettingsManager {
    public LLM_PROVIDERS: LLMProvider[] = [];
    public currentApiKey: string = "";
    public currentLlmProviderId: string = '';
    public currentLlmModelId: string = '';
    public customTones: CustomTone[] = [];
    public glossaryTerms: GlossaryTerm[] = [];
    public modifierCharacters: ModifierCharacter[] = [];
    public isReviewModeEnabled: boolean = false;
    public currentTheme: string = 'system';
    public themeOpacity: number = 0.4;
    public themeBlur: number = 4;
    public parallelCount: number = 10;

    // UI Elements
    private llmProviderSelect: HTMLSelectElement | null = null;
    private llmModelCheckboxList: HTMLElement | null = null;
    private addLlmModelButton: HTMLButtonElement | null = null;
    private globalLlmProviderSelect: HTMLSelectElement | null = null;
    private globalToneSelect: HTMLSelectElement | null = null;
    private defaultToneSelect: HTMLSelectElement | null = null;
    private reviewModeCheckbox: HTMLInputElement | null = null;
    private apiKeyInput: HTMLInputElement | null = null;
    private apiPassphraseInput: HTMLInputElement | null = null;
    private llmProviderList: HTMLElement | null = null;
    private parallelCountInput: HTMLInputElement | null = null;

    constructor() {
        this.LLM_PROVIDERS = JSON.parse(JSON.stringify(DEFAULT_LLM_PROVIDERS_CONFIG));
    }

    public initializeSettingsManager(): void {
        this.llmProviderSelect = document.getElementById('llm-provider-select') as HTMLSelectElement;
        this.llmModelCheckboxList = document.getElementById('llm-model-checkbox-list');
        this.addLlmModelButton = document.getElementById('add-llm-model-button') as HTMLButtonElement;
        this.globalLlmProviderSelect = document.getElementById('global-llm-provider-select') as HTMLSelectElement;
        this.globalToneSelect = document.getElementById('tone-select') as HTMLSelectElement;
        this.defaultToneSelect = document.getElementById('default-tone-select') as HTMLSelectElement;
        this.reviewModeCheckbox = document.getElementById('review-mode-checkbox') as HTMLInputElement;
        this.apiKeyInput = document.getElementById('api-key-input') as HTMLInputElement;
        this.apiPassphraseInput = document.getElementById('api-passphrase-input') as HTMLInputElement;
        this.llmProviderList = document.getElementById('llm-provider-list');
        this.parallelCountInput = document.getElementById('parallel-count-input') as HTMLInputElement;

        if (this.addLlmModelButton && !this.addLlmModelButton.dataset.bound) {
            this.addLlmModelButton.dataset.bound = 'true';
            this.addLlmModelButton.addEventListener('click', () => {
                const currentProviderId = this.llmProviderSelect?.value;
                const provider = this.LLM_PROVIDERS.find(p => p.id === currentProviderId);
                if (!provider) {
                    alertMessage('先に翻訳プロバイダを選択してください。', 'warning');
                    return;
                }
                if (!Array.isArray(provider.models)) provider.models = [];
                const uid = `uid_${Date.now()}_${Math.random().toString(16).slice(2)}`;
                provider.models.push({ id: '', name: '', enabled: true, _uid: uid, isCustom: true, isThinkingModel: false });
                if (currentProviderId) {
                    this.renderLlmModelCheckboxes(currentProviderId);
                }
            });
        }
    }

    public updateCurrentApiKey(key: string) { this.currentApiKey = key; }
    public updateCurrentLlmProviderId(id: string) { this.currentLlmProviderId = id; }
    public updateCurrentLlmModelId(id: string) { this.currentLlmModelId = id; }
    public updateGlossaryTerms(terms: GlossaryTerm[]) { this.glossaryTerms = terms; }
    public updateCustomTones(tones: CustomTone[]) { this.customTones = tones; }
    public updateModifierCharacters(chars: ModifierCharacter[]) { this.modifierCharacters = chars; }
    public updateIsReviewModeEnabled(isEnabled: boolean) { this.isReviewModeEnabled = isEnabled; }
    public updateCurrentTheme(theme: string) { this.currentTheme = theme; }
    public updateThemeOpacity(opacity: number) { this.themeOpacity = opacity; }
    public updateThemeBlur(blur: number) { this.themeBlur = blur; }
    public updateParallelCount(count: number) { this.parallelCount = count; }

    public async checkIfApiKeyIsSaved(providerId: string): Promise<boolean> {
        return await hasSavedApiKey(providerId);
    }

    public saveOtherSettingsToLocalStorage(): void {
        try {
            const settings: AppSettings = {
                defaultTone: this.defaultToneSelect ? this.defaultToneSelect.value : 'da_dearu',
                customTones: this.customTones,
                glossaryTerms: this.glossaryTerms,
                modifierCharacters: this.modifierCharacters,
                isReviewModeEnabled: this.isReviewModeEnabled,
                currentTheme: this.currentTheme,
                themeOpacity: this.themeOpacity,
                themeBlur: this.themeBlur,
                llmProviders: this.LLM_PROVIDERS,
                currentLlmProviderId: this.currentLlmProviderId,
                currentLlmModelId: this.currentLlmModelId,
                parallelCount: this.parallelCountInput ? parseInt(this.parallelCountInput.value, 10) : this.parallelCount,
            };
            this.parallelCount = settings.parallelCount;

            localStorage.setItem('translationAppSettings', JSON.stringify(settings));
            if (this.globalToneSelect) this.globalToneSelect.value = settings.defaultTone;
            console.log("Other settings saved to localStorage:", settings);
        } catch (error) {
            console.error("Error saving other settings to localStorage:", error);
            alertMessage("その他の設定の保存に失敗しました。", 'error');
        }
    }

    public renderLlmModelCheckboxes(providerId: string): void {
        if (!this.llmModelCheckboxList) return;
        this.llmModelCheckboxList.innerHTML = '';
        const selectedProvider = this.LLM_PROVIDERS.find(p => p.id === providerId);

        if (!providerId || !selectedProvider) {
            this.llmModelCheckboxList.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-sm">プロバイダを選択してください。</p>';
            return;
        }

        if (selectedProvider.models.length === 0) {
            this.llmModelCheckboxList.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-sm">モデルがありません。下の「追加」で入力してください。</p>';
            return;
        }

        selectedProvider.models.forEach((model, idx) => {
            if (!model._uid) model._uid = `uid_${Date.now()}_${Math.random().toString(16).slice(2)}`;

            const row = document.createElement('div');
            row.className = 'flex items-center gap-2';

            const currentValue = (model.id || '').trim();

            row.innerHTML = `
                <input type="checkbox"
                       class="h-4 w-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
                       ${model.enabled && currentValue ? 'checked' : ''}>
                <input type="text"
                       class="input-field py-2"
                       placeholder="モデルID（例: gpt-4o / o1-mini）"
                       value="${escapeHTML(currentValue)}">
                <label class="flex items-center gap-1 shrink-0 bg-gray-50 dark:bg-gray-700 px-2 py-1 rounded border dark:border-gray-600 shadow-sm text-xs cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 dark:text-gray-200" title="推論プロセスを含む思考モデルとして扱う場合はチェック">
                    <input type="checkbox" class="model-thinking-checkbox h-3 w-3 text-purple-600 rounded focus:ring-purple-500" ${model.isThinkingModel ? 'checked' : ''}>
                    🧠思考モデル
                </label>
                <button type="button"
                        class="btn btn-danger btn-sm whitespace-nowrap">
                    削除
                </button>
            `;

            const checkbox = row.querySelector('input[type="checkbox"]:not(.model-thinking-checkbox)') as HTMLInputElement;
            const input = row.querySelector('input[type="text"]') as HTMLInputElement;
            const thinkingCheckbox = row.querySelector('.model-thinking-checkbox') as HTMLInputElement;
            const delBtn = row.querySelector('button') as HTMLButtonElement;

            thinkingCheckbox.addEventListener('change', (e: Event) => {
                model.isThinkingModel = (e.target as HTMLInputElement).checked;
            });

            checkbox.addEventListener('change', (e: Event) => {
                const v = (input.value || '').trim();
                if (!v) {
                    (e.target as HTMLInputElement).checked = false;
                    model.enabled = false;
                    alertMessage('モデルIDが空の行は有効化できません。', 'warning');
                } else {
                    model.enabled = (e.target as HTMLInputElement).checked;
                }
            });

            const commitValue = () => {
                const v = (input.value || '').trim();
                if (v) {
                    const dup = selectedProvider.models.some((m, j) => j !== idx && (m.id || '').trim() === v);
                    if (dup) {
                        alertMessage('同じモデルIDが既にあります。別のIDにしてください。', 'warning');
                        input.value = escapeHTML((model.id || '').trim());
                        return;
                    }
                }
                model.id = v;
                model.name = v;
                if (!v) {
                    model.enabled = false;
                    checkbox.checked = false;
                }
            };

            input.addEventListener('blur', commitValue);
            input.addEventListener('keydown', (e: KeyboardEvent) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    input.blur();
                }
            });

            delBtn.addEventListener('click', () => {
                if (!confirm('このモデル行を削除しますか？')) return;
                selectedProvider.models.splice(idx, 1);
                this.renderLlmModelCheckboxes(providerId);
            });

            if (this.llmModelCheckboxList) {
                this.llmModelCheckboxList.appendChild(row);
            }
        });
    }

    public async getSavedAndEnabledLlmProviders(): Promise<{ providerId: string; providerName: string; }[]> {
        const savedProviders: { providerId: string; providerName: string; }[] = [];
        for (const provider of this.LLM_PROVIDERS) {
            const storageKey = `${API_KEY_PREFIX}${provider.id}`;
            const encryptedApiKey = await getSettingFromIndexedDB(storageKey);
            if (encryptedApiKey) {
                const hasEnabledModel = provider.models && provider.models.some(model => model.enabled);
                if (hasEnabledModel) {
                    savedProviders.push({ providerId: provider.id, providerName: provider.name });
                }
            }
        }
        return savedProviders;
    }

    public async populateLlmProviderDropdowns(currentLlmModelIdOverride: string | null = null): Promise<void> {
        if (!this.llmProviderSelect) return;

        this.llmProviderSelect.innerHTML = createLlmProviderOptionsHtml(this.LLM_PROVIDERS, true);
        this.llmProviderSelect.value = this.currentLlmProviderId;

        const savedAndEnabledProviders = await this.getSavedAndEnabledLlmProviders();

        let globalOptionsHtml = '<option value="">選択してください</option>';

        savedAndEnabledProviders.forEach(p => {
            const provider = this.LLM_PROVIDERS.find(x => x.id === p.providerId);
            if (!provider || !provider.models) return;

            provider.models
                .filter(m => m.enabled)
                .forEach(m => {
                    const v = `${provider.id}::${m.id}`;
                    globalOptionsHtml += `<option value="${escapeHTML(v)}">${escapeHTML(provider.name)} (${escapeHTML(m.name)})</option>`;
                });
        });
        
        if (this.globalLlmProviderSelect) {
            this.globalLlmProviderSelect.innerHTML = globalOptionsHtml;
            const targetModelId = currentLlmModelIdOverride || this.currentLlmModelId;
            const currentValue = (this.currentLlmProviderId && targetModelId) ? `${this.currentLlmProviderId}::${targetModelId}` : '';
            if (currentValue && globalOptionsHtml.includes(`value="${escapeHTML(currentValue)}"`)) {
                this.globalLlmProviderSelect.value = currentValue;
            } else {
                this.globalLlmProviderSelect.value = '';
            }
        }

        this.renderLlmModelCheckboxes(this.currentLlmProviderId);
    }

    public async renderLlmProviderList(): Promise<void> {
        if (!this.llmProviderList) return;

        this.llmProviderList.innerHTML = '';
        let hasSavedProviders = false;

        const allProvidersWithSavedKeys: LLMProvider[] = [];
        for (const provider of this.LLM_PROVIDERS) {
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
                listItem.className = 'llm-provider-item flex items-center justify-between p-4 mb-3 rounded-2xl border border-white/20 shadow-sm bg-white/40 dark:bg-slate-800/40 backdrop-blur-md';

                const enabledModels = provider.models.filter(m => m.enabled).map(m => m.name).join(', ');
                const modelDisplay = enabledModels ? ` (${enabledModels})` : ' (モデル未選択)';

                listItem.innerHTML = `
                    <div class="flex-grow">
                        <div class="flex items-center gap-2">
                            <strong class="text-slate-800 dark:text-slate-100 font-bold">${escapeHTML(provider.name)}</strong>
                            <span class="badge badge-success text-[10px]">保存済み</span>
                        </div>
                        <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">有効なモデル: ${escapeHTML(modelDisplay)}</p>
                    </div>
                    <div class="flex items-center gap-2">
                        <button class="edit-llm-provider-button btn btn-success btn-icon btn-sm" data-provider-id="${escapeHTML(provider.id)}" title="編集">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="delete-llm-provider-button btn btn-danger btn-icon btn-sm" data-provider-id="${escapeHTML(provider.id)}" title="削除">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                `;
                if (this.llmProviderList) {
                    this.llmProviderList.appendChild(listItem);
                }
            });
        }

        if (!hasSavedProviders) {
            this.llmProviderList.innerHTML = '<li class="text-slate-500 dark:text-slate-400 text-sm text-center py-4">APIキーが保存されているプロバイダはありません。</li>';
        }
    }

    public populateToneDropdowns(): void {
        const allTones = [
            ...this.customTones.map(tone => ({ 
                value: tone.value, 
                name: tone.name, 
                instruction: tone.instruction,
                isConditional: tone.isConditional
            }))
        ];

        if (this.globalToneSelect) {
            const currentVal = this.globalToneSelect.value;
            this.globalToneSelect.innerHTML = createToneOptionsHtml(allTones);
            this.globalToneSelect.value = currentVal || 'da_dearu';
        }

        if (this.defaultToneSelect) {
            const currentVal = this.defaultToneSelect.value;
            this.defaultToneSelect.innerHTML = createToneOptionsHtml(allTones);
            this.defaultToneSelect.value = currentVal || 'da_dearu';
        }

        const individualToneSelects = document.querySelectorAll('.individual-tone-select') as NodeListOf<HTMLSelectElement>;
        individualToneSelects.forEach(select => {
            const currentVal = select.value;
            select.innerHTML = createToneOptionsHtml(allTones, true);
            select.value = currentVal || 'default';
        });
    }

    public updateReviewColumnVisibility(): void {
        const reviewCells = document.querySelectorAll('.review-column-cell, .review-column-header') as NodeListOf<HTMLElement>;
        if (this.isReviewModeEnabled) {
            reviewCells.forEach(cell => {
                cell.classList.remove('hidden');
                cell.style.display = '';
            });
        } else {
            reviewCells.forEach(cell => {
                cell.classList.add('hidden');
                cell.style.display = 'none';
            });
        }
    }

    public async loadSettings(): Promise<void> {
        try {
            const settingsJson = localStorage.getItem('translationAppSettings');
            if (settingsJson) {
                const settings: AppSettings = JSON.parse(settingsJson);
                this.customTones = settings.customTones || [];
                this.glossaryTerms = settings.glossaryTerms || [];
                this.modifierCharacters = settings.modifierCharacters || [];
                this.isReviewModeEnabled = settings.isReviewModeEnabled || false;
                this.currentTheme = settings.currentTheme || 'system';
                this.themeOpacity = settings.themeOpacity !== undefined ? settings.themeOpacity : 0.4;
                this.themeBlur = settings.themeBlur !== undefined ? settings.themeBlur : 4;
                this.parallelCount = settings.parallelCount || 10;

                this.LLM_PROVIDERS = JSON.parse(JSON.stringify(DEFAULT_LLM_PROVIDERS_CONFIG));

                if (settings.llmProviders && Array.isArray(settings.llmProviders)) {
                    this.LLM_PROVIDERS = this.LLM_PROVIDERS.map(defaultP => {
                        const loadedP = settings.llmProviders.find(p => p.id === defaultP.id);
                        if (loadedP) {
                            defaultP.models = defaultP.models.map(defaultM => {
                                const loadedM = loadedP.models.find(m => m.id === defaultM.id);
                                return loadedM ? { ...defaultM, enabled: loadedM.enabled, isThinkingModel: loadedM.isThinkingModel } : defaultM;
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
                        if (!this.LLM_PROVIDERS.some(p => p.id === loadedP.id)) {
                            this.LLM_PROVIDERS.push(loadedP);
                        }
                    });
                }

                this.currentLlmProviderId = settings.currentLlmProviderId || '';
                this.currentLlmModelId = settings.currentLlmModelId || '';

                if (this.customTones.length === 0) {
                    this.customTones.push({ value: 'da_dearu', name: 'だ・である調', instruction: '自称は「我ら」を使用し、語尾は「である」または「だ」調にしてください。', isConditional: false, conditions: [], elseInstruction: '' });
                    this.customTones.push({ value: 'taigen_dome', name: '体言止め', instruction: '自称は「我ら」を使用し、語尾は体言止めにしてください。', isConditional: false, conditions: [], elseInstruction: '' });
                    this.customTones.push({
                        value: 'event_conditional_tone',
                        name: 'イベント',
                        isConditional: true,
                        conditions: [{
                            condition: ".t$",
                            instruction: "原文に合わせて自称は「我ら」を使用し、語尾は体言止めにしてください。"
                        }],
                        elseInstruction: "原文に合わせて自称は「我々」、「我が」などを使い、「だ。」「である」調にしてください。"
                    });
                    this.saveOtherSettingsToLocalStorage();
                }

                if (this.modifierCharacters.length === 0) {
                    this.modifierCharacters = JSON.parse(JSON.stringify(DEFAULT_MODIFIERS));
                    this.saveOtherSettingsToLocalStorage();
                }

                if (this.defaultToneSelect) this.defaultToneSelect.value = settings.defaultTone || 'da_dearu';
                if (this.reviewModeCheckbox) this.reviewModeCheckbox.checked = this.isReviewModeEnabled;
                if (this.globalToneSelect) this.globalToneSelect.value = settings.defaultTone || 'da_dearu';
                if (this.parallelCountInput) this.parallelCountInput.value = this.parallelCount.toString();

                console.log("Other settings loaded from localStorage:", settings);
            } else {
                console.log("No other settings found in localStorage, initializing with defaults.");
                this.customTones = [];
                this.glossaryTerms = [];
                this.modifierCharacters = [];
                this.isReviewModeEnabled = false;
                this.themeOpacity = 0.4;
                this.themeBlur = 4;
                this.parallelCount = 10;
                this.LLM_PROVIDERS = JSON.parse(JSON.stringify(DEFAULT_LLM_PROVIDERS_CONFIG));

                this.currentLlmProviderId = '';
                this.currentLlmModelId = '';

                this.customTones.push({ value: 'da_dearu', name: 'だ・である調', instruction: '自称は「我ら」を使用し、語尾は「である」または「だ」調にしてください。', isConditional: false, conditions: [], elseInstruction: '' });
                this.customTones.push({ value: 'taigen_dome', name: '体言止め', instruction: '自称は「我ら」を使用し、語尾は体言止めにしてください。', isConditional: false, conditions: [], elseInstruction: '' });
                this.customTones.push({
                    value: 'event_conditional_tone',
                    name: 'イベント',
                    isConditional: true,
                    conditions: [{
                        condition: ".t$",
                        instruction: "原文に合わせて自称は「我ら」を使用し、語尾は体言止めにしてください。"
                    }],
                    elseInstruction: "原文に合わせて自称は「我々」、「我が」などを使い、「だ。」「である」調にしてください。"
                });
                this.modifierCharacters = JSON.parse(JSON.stringify(DEFAULT_MODIFIERS));

                this.saveOtherSettingsToLocalStorage();

                if (this.defaultToneSelect) this.defaultToneSelect.value = 'da_dearu';
                if (this.reviewModeCheckbox) this.reviewModeCheckbox.checked = false;
                if (this.globalToneSelect) this.globalToneSelect.value = 'da_dearu';
                if (this.parallelCountInput) this.parallelCountInput.value = '10';
            }

            this.populateToneDropdowns();
            await this.populateLlmProviderDropdowns();
            this.updateReviewColumnVisibility();
        } catch (error) {
            console.error("Error loading settings:", error);
            alertMessage("設定の読み込み中にエラーが発生しました。", 'error');
        }
    }

    public async loadApiKeyForSelectedProvider(providerId: string, passphrase: string | null = null): Promise<void> {
        if (!providerId) {
            this.currentApiKey = '';
            if (this.apiKeyInput) this.apiKeyInput.value = '';
            return;
        }

        try {
            if (!passphrase && await this.checkIfApiKeyIsSaved(providerId)) {
                this.currentApiKey = '';
                if (this.apiKeyInput) this.apiKeyInput.value = '';
                return;
            }

            const decryptedApiKey = await loadEncryptedApiKey(providerId, passphrase!);
            if (decryptedApiKey) {
                this.currentApiKey = decryptedApiKey;
                if (this.apiKeyInput) this.apiKeyInput.value = this.currentApiKey;
            } else {
                this.currentApiKey = '';
                if (this.apiKeyInput) this.apiKeyInput.value = '';
            }
        } catch (error) {
            console.error('APIキーの読み込みに失敗しました:', error);
            this.currentApiKey = '';
            if (this.apiKeyInput) this.apiKeyInput.value = '';
            throw error;
        }
    }

    public async deleteApiKeyForProvider(providerId: string, updateTranslationButtonsStateCallback?: () => void): Promise<void> {
        const providerName = this.LLM_PROVIDERS.find(p => p.id === providerId)?.name || providerId;

        if (!confirm(`${providerName} のAPIキー情報をIndexedDBから削除してもよろしいですか？この操作は元に戻せません。`)) {
            return;
        }

        try {
            const storageKey = `${API_KEY_PREFIX}${providerId}`;
            await deleteSettingFromIndexedDB(storageKey);
            alertMessage(`${providerName} のAPIキー情報を削除しました。`, 'success');

            if (this.currentLlmProviderId === providerId) {
                this.currentApiKey = '';
                if (this.apiKeyInput) this.apiKeyInput.value = '';
            }
            if (updateTranslationButtonsStateCallback) updateTranslationButtonsStateCallback();
            this.renderLlmProviderList();
            this.populateLlmProviderDropdowns();
        } catch (error) {
            console.error('APIキーの削除に失敗しました:', error);
            alertMessage('APIキーの削除に失敗しました。', 'error');
        }
    }

    public async saveSettings(updateTranslationButtonsStateCallback?: () => void): Promise<void> {
        try {
            const apiKey = this.apiKeyInput ? this.apiKeyInput.value.trim() : '';
            const passphrase = this.apiPassphraseInput ? this.apiPassphraseInput.value.trim() : '';
            const selectedProviderId = this.llmProviderSelect ? this.llmProviderSelect.value : '';

            if (!selectedProviderId) {
                alertMessage('APIキーを保存するには、翻訳プロバイダを選択してください。', 'warning');
                return;
            }

            this.currentLlmProviderId = selectedProviderId;

            if (apiKey) {
                try {
                    await saveEncryptedApiKey(selectedProviderId, apiKey, passphrase);
                    const providerName = this.LLM_PROVIDERS.find(p => p.id === selectedProviderId)?.name || selectedProviderId;
                    alertMessage(`${providerName} のAPIキーを暗号化して保存しました。`, 'success');

                    this.currentApiKey = apiKey;
                    if (this.apiKeyInput) this.apiKeyInput.value = '';
                    if (this.apiPassphraseInput) this.apiPassphraseInput.value = '';
                    if (updateTranslationButtonsStateCallback) updateTranslationButtonsStateCallback();
                } catch (error: any) {
                    alertMessage(error.message || 'APIキーの保存に失敗しました。', 'error');
                    return;
                }
            } else {
                const hasKey = await this.checkIfApiKeyIsSaved(selectedProviderId);
                if (!hasKey) {
                    alertMessage('APIキーが入力されていません。', 'info');
                }
            }

            this.saveOtherSettingsToLocalStorage();
            this.renderLlmProviderList();
            this.populateLlmProviderDropdowns();

            alertMessage("設定を保存しました。", 'success');
        } catch (error) {
            console.error("Error saving settings:", error);
            alertMessage("設定の保存に失敗しました。", 'error');
        }
    }
}

export const settingsManager = new SettingsManager();
