// js/types.ts

export interface LLMModel {
    id: string;
    name: string;
    enabled: boolean;
    _uid: string;
    isCustom?: boolean;
    isThinkingModel?: boolean;
}

export interface LLMProvider {
    id: string;
    name: string;
    defaultApiKeyLabel: string;
    defaultPlaceholder: string;
    models: LLMModel[];
}

export interface GlossaryTerm {
    original: string;
    originalAlt: string[];
    translation: string;
    pos: string;
    note: string;
}

export interface CustomToneCondition {
    condition: string;
    instruction: string;
}

export interface CustomTone {
    value: string;
    name: string;
    instruction?: string;
    isConditional: boolean;
    conditions: CustomToneCondition[];
    elseInstruction: string;
}

export interface ModifierCharacter {
    id: string;
    name: string;
    regex: string;
    enabled: boolean;
    type: 'variable' | 'decoration';
    category: string;
}

export interface AppSettings {
    defaultTone: string;
    customTones: CustomTone[];
    glossaryTerms: GlossaryTerm[];
    modifierCharacters: ModifierCharacter[];
    isReviewModeEnabled: boolean;
    currentTheme: string;
    themeOpacity: number;
    themeBlur: number;
    llmProviders: LLMProvider[];
    currentLlmProviderId: string;
    parallelCount: number;
}

export interface ProgressEntry {
    key: string;
    original: string;
    translation: string;
    stage: number;
    version?: string;
    tone?: string;
}

export interface ProgressData {
    version: string;
    fileName: string;
    timestamp: string;
    data: ProgressEntry[];
    skippedRows: any[];
}
