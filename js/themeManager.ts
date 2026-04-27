/**
 * themeManager.ts
 * ダークモード・ライトモードの切り替えおよびシステム設定の監視を担当するモジュール
 */

export const THEME_MODES = {
    SYSTEM: 'system',
    LIGHT: 'light',
    DARK: 'dark'
} as const;

export type ThemeMode = typeof THEME_MODES[keyof typeof THEME_MODES];

export interface ThemeManagerOptions {
    initialTheme?: ThemeMode;
    initialOpacity?: number;
    initialBlur?: number;
    themeSlider: HTMLElement | null;
    themeButtons: NodeList | HTMLElement[];
}

export class ThemeManager {
    private currentTheme: ThemeMode = THEME_MODES.SYSTEM;
    private themeOptions: HTMLElement[] = [];
    private themeSlider: HTMLElement | null = null;

    /**
     * テーマを初期化する
     */
    public initializeThemeManager({ 
        initialTheme = THEME_MODES.SYSTEM, 
        initialOpacity = 0.4, 
        initialBlur = 4, 
        themeSlider: slider, 
        themeButtons 
    }: ThemeManagerOptions): void {
        this.currentTheme = initialTheme;
        this.themeSlider = slider;
        this.themeOptions = Array.from(themeButtons) as HTMLElement[];

        // システム設定の監視
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        mediaQuery.addEventListener('change', () => {
            if (this.currentTheme === THEME_MODES.SYSTEM) {
                this.applyTheme(THEME_MODES.SYSTEM);
            }
        });

        // 初期テーマとプロパティの適用
        this.applyTheme(this.currentTheme);
        this.applyThemeProperties(initialOpacity, initialBlur);
        this.updateSliderPosition(this.currentTheme);
    }

    /**
     * 指定されたテーマを適用する
     */
    public applyTheme(theme: ThemeMode): void {
        this.currentTheme = theme;
        const isDark = theme === THEME_MODES.DARK || 
                       (theme === THEME_MODES.SYSTEM && window.matchMedia('(prefers-color-scheme: dark)').matches);

        if (isDark) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }

        this.updateSliderPosition(theme);
    }

    /**
     * 透過度とすりガラス強度をCSS変数に適用する
     */
    public applyThemeProperties(opacity: number, blur: number): void {
        document.documentElement.style.setProperty('--glass-alpha', opacity.toString());
        document.documentElement.style.setProperty('--glass-blur', `blur(${blur}px)`);
    }

    /**
     * セグメントコントロールのスライダー位置を更新する
     */
    private updateSliderPosition(theme: ThemeMode): void {
        if (!this.themeSlider) return;

        const activeIndex = this.themeOptions.findIndex(opt => opt.dataset.theme === theme);
        if (activeIndex === -1) return;

        const width = 100 / this.themeOptions.length;
        this.themeSlider.style.width = `calc(${width}% - 4px)`;
        this.themeSlider.style.left = `calc(${width * activeIndex}% + 2px)`;

        // ボタンのactiveクラスを切り替え
        this.themeOptions.forEach((btn, idx) => {
            if (idx === activeIndex) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    public getCurrentTheme(): ThemeMode {
        return this.currentTheme;
    }
}

export const themeManager = new ThemeManager();
