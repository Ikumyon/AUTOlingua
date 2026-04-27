// js/stageManager.ts

export interface StageDefinition {
    value: number;
    name: string;
    description: string;
    colorClass: string;
}

export const STAGES: Record<number, StageDefinition> = {
    0: { value: 0, name: '未翻訳', description: '翻訳が入力されていない。', colorClass: 'stage-btn-0' },
    1: { value: 1, name: '翻訳済み', description: '翻訳が入力された状態。', colorClass: 'stage-btn-1' },
    2: { value: 2, name: '疑問あり', description: '翻訳内容に確認が必要なフラグが立っている状態。', colorClass: 'stage-btn-2' },
    5: { value: 5, name: 'レビュー済み', description: '最終的な審査が完了した状態。', colorClass: 'stage-btn-5' }
};

export class StageManager {
    private globalMenu: HTMLElement | null = null;
    private currentActiveRow: HTMLTableRowElement | null = null;
    private onStageChangeCallbacks: ((row: HTMLTableRowElement, stage: number) => void)[] = [];

    /**
     * ステージ変更時のコールバックを登録
     */
    public onStageChange(callback: (row: HTMLTableRowElement, stage: number) => void) {
        this.onStageChangeCallbacks.push(callback);
    }

    /**
     * 指定したステージの定義を取得
     */
    public getStage(value: number): StageDefinition {
        return STAGES[value] || STAGES[0];
    }

    /**
     * 行のステージを更新
     */
    public updateRowStage(row: HTMLTableRowElement, stageValue: number) {
        const stage = this.getStage(stageValue);
        row.dataset.stage = stageValue.toString();
        
        const mainBtn = row.querySelector('.stage-main-button') as HTMLButtonElement;
        if (mainBtn) {
            mainBtn.textContent = stage.name;
            mainBtn.title = stage.description;
            // 以前の色クラスを削除して新しいものを追加
            Object.values(STAGES).forEach(s => {
                const classes = s.colorClass.split(' ');
                classes.forEach(c => mainBtn.classList.remove(c));
            });
            const newClasses = stage.colorClass.split(' ');
            newClasses.forEach(c => mainBtn.classList.add(c));
        }

        // コールバック実行
        this.onStageChangeCallbacks.forEach(cb => cb(row, stageValue));
    }

    /**
     * グローバルメニューを作成してbodyに追加
     */
    private ensureGlobalMenu() {
        if (this.globalMenu) return;

        this.globalMenu = document.createElement('div');
        this.globalMenu.className = 'stage-menu hidden fixed w-32 rounded-xl z-[9999] p-1 animate-in fade-in slide-in-from-top-1 duration-200 shadow-2xl border border-white/20';
        this.globalMenu.innerHTML = Object.values(STAGES).map(s => `
            <button class="stage-item w-full px-2 py-1.5 text-left text-[10px] font-semibold rounded-lg flex items-center gap-2 transition-all" data-value="${s.value}">
                <span class="w-2 h-2 rounded-full ${s.colorClass}"></span>
                ${s.name}
            </button>
        `).join('');

        document.body.appendChild(this.globalMenu);

        // メニュー内の項目クリックイベント
        this.globalMenu.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            const stageItem = target.closest('.stage-item') as HTMLElement;
            if (stageItem && this.currentActiveRow) {
                const value = parseInt(stageItem.dataset.value || '0', 10);
                this.updateRowStage(this.currentActiveRow, value);
                this.hideMenu();
            }
        });
    }

    private hideMenu() {
        if (this.globalMenu) {
            this.globalMenu.classList.add('hidden');
        }
        this.currentActiveRow = null;
    }

    /**
     * ステージ管理UIのHTMLを生成
     */
    public createStageControlHtml(currentStage: number = 0): string {
        const stage = this.getStage(currentStage);
        
        return `
            <div class="stage-control flex items-center relative group/stage">
                <button class="stage-main-button btn btn-sm text-[10px] font-bold transition-all ${stage.colorClass}" title="${stage.description}">
                    ${stage.name}
                </button>
                <button class="stage-dropdown-toggle btn btn-sm text-white transition-all">
                    <i class="fas fa-chevron-down text-[8px]"></i>
                </button>
            </div>
        `;
    }

    /**
     * イベントリスナーの初期化
     */
    public initEventListeners(container: HTMLElement) {
        this.ensureGlobalMenu();

        container.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            
            // ドロップダウンの切り替え
            const toggleBtn = target.closest('.stage-dropdown-toggle') as HTMLElement | null;
            if (toggleBtn) {
                const row = toggleBtn.closest('tr') as HTMLTableRowElement;
                if (!row || !this.globalMenu) return;

                const isAlreadyOpen = this.currentActiveRow === row && !this.globalMenu.classList.contains('hidden');
                
                this.hideMenu(); // 一旦すべて閉じる
                
                if (!isAlreadyOpen) {
                    this.currentActiveRow = row;
                    
                    // 位置計算
                    const rect = toggleBtn.getBoundingClientRect();
                    const menuWidth = 128;
                    
                    let left = rect.left;
                    if (left + menuWidth > window.innerWidth) {
                        left = window.innerWidth - menuWidth - 10;
                    }

                    let top = rect.bottom + 5;
                    const menuHeight = 150; 
                    if (top + menuHeight > window.innerHeight) {
                        top = rect.top - menuHeight - 5;
                    }

                    this.globalMenu.style.left = `${left}px`;
                    this.globalMenu.style.top = `${top}px`;
                    this.globalMenu.style.width = `${menuWidth}px`;
                    
                    this.globalMenu.classList.remove('hidden');
                    e.stopPropagation();
                }
                return;
            }

            // メインボタンクリック（サイクリング）
            const mainBtn = target.closest('.stage-main-button') as HTMLElement;
            if (mainBtn) {
                const row = mainBtn.closest('tr') as HTMLTableRowElement;
                if (row) {
                    const current = parseInt(row.dataset.stage || '0', 10);
                    let next = 1;
                    
                    if (current === 0) next = 1;
                    else if (current === 1) next = 5;
                    else if (current === 2) next = 1;
                    else if (current === 5) next = 0;
                    
                    this.updateRowStage(row, next);
                }
            }
        });

        // どこかをクリックしたらメニューを閉じる
        document.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            if (this.globalMenu && !this.globalMenu.contains(target) && !target.closest('.stage-dropdown-toggle')) {
                this.hideMenu();
            }
        });

        // スクロールしたらメニューを閉じる
        window.addEventListener('scroll', () => this.hideMenu(), { passive: true });
        
        const tableContainer = document.getElementById('table-container');
        if (tableContainer) {
            tableContainer.addEventListener('scroll', () => this.hideMenu(), { passive: true });
        }
    }
}

export const stageManager = new StageManager();
