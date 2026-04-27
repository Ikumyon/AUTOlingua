/**
 * helpManager.ts
 * アプリケーション全体のヘルプガイド（中央モーダル形式）を管理します。
 */

export interface HelpItem {
    title: string;
    content: string;
}

export type HelpData = Record<string, HelpItem>;

const HELP_DATA: HelpData = {
    'file-drop': {
        title: 'ファイルの読み込み',
        content: `
            <p>.yml, .yaml, .txt形式のファイルに対応しています。</p>
            <p>Paradox Interactive社のゲーム（Stellaris, CK3等）のローカライズファイル形式を自動的に認識し、キーとテキストを抽出します。</p>
            <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">※BOM付きUTF-8での保存を推奨します。</p>
        `
    },
    'status-filter': {
        title: 'ステータスフィルター',
        content: `
            <p>翻訳作業の状態（ステージ）に基づいて表示行を絞り込みます。</p>
            <ul class="list-disc list-inside space-y-1 mt-2 text-sm">
                <li><strong class="text-slate-500">未翻訳</strong>: まだ翻訳が行われていない状態。</li>
                <li><strong class="text-blue-500">翻訳済み</strong>: AIまたは手動で翻訳が入力された状態。</li>
                <li><strong class="text-amber-500">疑問あり</strong>: 翻訳内容に確認が必要なフラグが立っている状態。</li>
                <li><strong class="text-indigo-500">レビュー済み</strong>: 最終的な確認・審査が完了した状態。</li>
            </ul>
        `
    },
    'tone-filter': {
        title: '口調フィルター',
        content: `
            <p>特定の口調が指定された行のみを表示します。</p>
            <p>「全体設定に沿う」を選択すると、個別に口調が設定されていない全ての行が表示されます。</p>
        `
    },
    'search-options': {
        title: '高度な検索',
        content: `
            <p>キーワード検索の動作をカスタマイズします。</p>
            <ul class="list-disc list-inside space-y-1 mt-2">
                <li><strong>Aa</strong>: 大文字と小文字を厳密に区別します。</li>
                <li><strong>.*</strong>: 正規表現による検索を有効にします。例: <code class="bg-gray-100 dark:bg-gray-700 px-1 rounded">^test</code> で「test」から始まる行を検索。</li>
            </ul>
        `
    },
    'advanced-filter': {
        title: '高度なフィルター',
        content: `
            <p>複数の条件（ステータス、口調、キーワードなど）をAND/OR条件で組み合わせて、より詳細な絞り込みを行います。</p>
            <p>複雑な翻訳ファイルから特定の条件に合うテキストを効率的に探し出すのに最適です。</p>
        `
    },
    'translate-actions': {
        title: '翻訳の実行',
        content: `
            <p>LLM（大規模言語モデル）を使用して翻訳を実行します。</p>
            <ul class="list-disc list-inside space-y-1 mt-2">
                <li><strong>すべて翻訳</strong>: 表示されている「未翻訳」行を一括で翻訳します。</li>
                <li><strong>未翻訳のみ翻訳</strong>: 「未翻訳」ステータスのセルのみを処理対象にします。</li>
                <li><strong>翻訳済みも翻訳</strong>: 既存の翻訳を破棄し、最初から翻訳し直します。</li>
            </ul>
        `
    },
    'review-mode': {
        title: '校閲モード',
        content: `
            <p>翻訳結果を一つずつ確認し、ステータスを管理するためのワークフローです。</p>
            <p class="mt-2">有効にすると「ステータス」列が表示され、各行の状態を 4 段階で管理できます。メインボタンをクリックして切り替えるか、右側のメニューから直接選択してください。</p>
            <p class="mt-2 text-xs text-indigo-500 dark:text-indigo-400">※ 翻訳文を入力すると自動的に「翻訳済み」になり、空にすると「未翻訳」に戻ります。</p>
        `
    },
    'global-tone': {
        title: '全体口調設定',
        content: `
            <p>ファイル全体の基本となる翻訳のスタイルを設定します。</p>
            <p>個別の行で口調が指定されていない場合、AIはこの設定に従って翻訳文を生成します。</p>
        `
    },
    'api-settings': {
        title: 'LLMプロバイダ設定',
        content: `
            <p>翻訳に使用するAI（Claude, Gemini, GPT等）のAPIキーを設定します。</p>
            <p><strong>APIキーの取得先:</strong></p>
            <ul class="list-disc list-inside space-y-1 mb-4">
                <li><a href="https://aistudio.google.com/app/apikey" target="_blank" class="text-blue-500 hover:underline">Google Gemini (AI Studio)</a> ※無料で利用可能</li>
                <li><a href="https://console.anthropic.com/settings/keys" target="_blank" class="text-blue-500 hover:underline">Anthropic Claude</a></li>
                <li><a href="https://platform.openai.com/api-keys" target="_blank" class="text-blue-500 hover:underline">OpenAI GPT</a></li>
            </ul>
            <p><strong>セキュリティについて:</strong><br>入力されたAPIキーは強力な暗号化（AES-256）を施した上で、あなたのブラウザ内（IndexedDB）にのみ保存されます。サーバーへ送信されることはありません。</p>
        `
    },
    'api-passphrase': {
        title: 'パスフレーズ（重要）',
        content: `
            <p>保存されたAPIキーを保護するための「合言葉」です。</p>
            <p>ブラウザを閉じたり再起動した際、このパスフレーズを入力することで安全にAPIキーを復元できます。忘れないように注意してください。</p>
        `
    },
    'conditional-tone': {
        title: '条件付き口調',
        content: `
            <p>特定のルールに基づいて口調を自動的に切り替えます。</p>
            <p>例: キー名に「_desc」が含まれる場合は「情景描写風」、キー名が「event_」で始まる場合は「物語風」といったルールを作成でき、上から順に優先適用されます。</p>
        `
    },
    'glossary': {
        title: '用語集機能',
        content: `
            <p>特定の単語の訳し方を固定し、翻訳の一貫性を保ちます。</p>
            <p>固有名詞や技術用語、ゲーム特有の造語などを登録してください。AIに指示として送信され、文脈に応じた適切な活用で翻訳されます。</p>
            <div class="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800/30">
                <p class="text-base font-bold text-blue-700 dark:text-blue-300 flex items-center mb-1">
                    <i class="fas fa-exchange-alt mr-2"></i>Paratranz 互換
                </p>
                <p class="text-base text-blue-600 dark:text-blue-400 leading-relaxed">
                    本アプリの用語集（JSON形式）は、翻訳支援ツール「<a href="https://paratranz.cn/" target="_blank" class="underline hover:text-blue-800 dark:hover:text-blue-200">Paratranz</a>」の用語集と互換性があります。エクスポートしたファイルはそのまま Paratranz で読み込むことができ、Paratranz からエクスポートした用語集も本アプリで利用可能です。
                </p>
            </div>
        `
    },
    'modifiers': {
        title: '修飾文字（正規表現）',
        content: `
            <p>翻訳時にAIが触れてはいけない「保護すべき記号や変数」を定義します。</p>
            <p>例: <code class="bg-gray-100 dark:bg-gray-700 px-1 rounded">\\[[^\\]]+\\]</code> と設定すると、<code class="text-blue-500">[target_name]</code> のような変数を破壊せずに翻訳を維持できます。</p>
        `
    },
    'download-options': {
        title: 'ファイルのダウンロード',
        content: `
            <p>翻訳が完了したデータをファイルとして書き出します。</p>
            <ul class="list-disc list-inside space-y-1 mt-2">
                <li><strong>ファイル先頭設定</strong>: Paradox Interactive形式のファイルの冒頭に記述される言語識別子（l_japanese等）を指定します。</li>
                <li><strong>翻訳済みYMLダウンロード</strong>: 翻訳後のデータを現在の設定でファイルとして保存します。</li>
                <li><strong>翻訳ログ（CSV）</strong>: どのキーがどう翻訳されたかの履歴を、Excel等で開ける形式で保存します。</li>
            </ul>
        `
    },
    'save-progress': {
        title: '作業状況の保存・復元',
        content: `
            <p>現在の翻訳作業を一時保存し、後で再開するための機能です。</p>
            <ul class="list-disc list-inside space-y-1 mt-2">
                <li><strong>保存 (JSON)</strong>: 翻訳文、ステータス、個別口調設定などを一つのファイルとしてダウンロードします。</li>
                <li><strong>復元</strong>: 保存したJSONファイルをアプリにドラッグ＆ドロップするだけで、作業状態を完全に復元できます。</li>
            </ul>
            <p class="mt-2 text-xs text-indigo-500">※ ブラウザを閉じても作業を失わないよう、こまめな保存を推奨します。</p>
        `
    },
    'parallel-processing': {
        title: '並列処理数',
        content: `
            <p>一度に同時に送信する翻訳リクエストの数です。</p>
            <p><strong>推奨値: 10〜50</strong></p>
            <p>この数値を大きくすると翻訳速度は上がりますが、APIプロバイダ（Google, Anthropic等）の<strong>レート制限（Rate Limit）</strong>にかかり、翻訳エラーが発生しやすくなるため注意してください。</p>
        `
    },
    'table-resizing': {
        title: 'テーブルの幅調整',
        content: `
            <p>テーブルの各列は、使いやすいように自由に調整できます。</p>
            <ul class="list-disc list-inside space-y-1 mt-2">
                <li><strong>ドラッグで調整</strong>: 見出し（ヘッダー）の右側の境界線をドラッグすると、その列の幅を変更できます。</li>
                <li><strong>ダブルクリックで自動調整</strong>: 境界線をダブルクリックすると、その列の内容（テキストやボタンなど）が一行でピッタリ収まる幅に自動フィットします。</li>
                <li><strong>最小幅（50px）</strong>: すべての列は最小50pxまで縮めることが可能です。</li>
            </ul>
        `
    },
    'llm-models': {
        title: 'モデルIDの見つけ方・書き方',
        content: `
            <p>各AIプロバイダが定義している「モデルID」を正確に入力する必要があります。</p>
            <div class="mt-4 space-y-4">
                <div class="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                    <div class="flex justify-between items-start mb-1">
                        <p class="font-bold text-sm">Google Gemini</p>
                        <a href="https://ai.google.dev/models" target="_blank" class="text-sm text-blue-500 hover:underline">公式リスト <i class="fas fa-external-link-alt"></i></a>
                    </div>
                    <code class="text-xs text-blue-600 dark:text-blue-400">gemini-1.5-pro</code>, <code class="text-xs text-blue-600 dark:text-blue-400">gemini-1.5-flash</code>
                </div>
                <div class="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                    <div class="flex justify-between items-start mb-1">
                        <p class="font-bold text-sm">Anthropic Claude</p>
                        <a href="https://docs.anthropic.com/en/docs/about-claude/models" target="_blank" class="text-sm text-blue-500 hover:underline">公式リスト <i class="fas fa-external-link-alt"></i></a>
                    </div>
                    <code class="text-xs text-blue-600 dark:text-blue-400">claude-3-5-sonnet-20240620</code>, <code class="text-xs text-blue-600 dark:text-blue-400">claude-3-opus-20240229</code>
                </div>
                <div class="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                    <div class="flex justify-between items-start mb-1">
                        <p class="font-bold text-sm">OpenAI GPT</p>
                        <a href="https://platform.openai.com/docs/models" target="_blank" class="text-sm text-blue-500 hover:underline">公式リスト <i class="fas fa-external-link-alt"></i></a>
                    </div>
                    <code class="text-xs text-blue-600 dark:text-blue-400">gpt-4o</code>, <code class="text-xs text-blue-600 dark:text-blue-400">gpt-4o-mini</code>, <code class="text-xs text-blue-600 dark:text-blue-400">gpt-4-turbo</code>
                </div>
            </div>
            <p class="mt-4 text-xs text-gray-500">※モデルIDは頻繁に更新されます。正確な最新IDは、各プロバイダのAPIリファレンス（公式ドキュメント）を参照してください。</p>
        `
    },
    'translation-group': {
        title: 'グループ適用の仕組み',
        content: `
            <p>同じテキスト構造（変数や装飾の位置）を持つ行が自動的にグループ化されています。</p>
            <ul class="list-disc list-inside space-y-2 mt-3">
                <li><span class="font-mono bg-amber-200/50 dark:bg-amber-800/50 px-2 py-0.5 rounded border border-amber-300/30 text-sm">⟦...⟧</span> は名前や数値、装飾記号などを保護する<strong>トークン</strong>です。</li>
                <li><strong>代表文 (テンプレート)</strong> を編集して適用すると、グループ内の全行に同じ翻訳ルールが反映されます。</li>
                <li><strong>重要:</strong> 各行固有の値（個別の名前や数値など）は、適用時に自動的に維持・復元されます。</li>
            </ul>
            <p class="mt-4 text-sm text-gray-500 italic">※不足しているトークンをクリックまたはドラッグすることで、簡単に<strong>代表文</strong>へ挿入できます。</p>
        `
    }
};

export class HelpManager {
    public initialize(): void {
        this.createHelpModalStructure();
        this.setupHelpTriggers();
        this.injectHelpIcons(); // 動的注入を開始
    }

    private createHelpModalStructure(): void {
        if (document.getElementById('help-modal')) return;

        const modalHTML = `
            <div id="help-modal" class="fixed inset-0 modal-overlay flex items-center justify-center z-[1000] hidden opacity-0 transition-opacity duration-300">
                <div id="help-modal-content" class="p-8 rounded-[2rem] shadow-2xl w-full max-w-lg transform scale-95 transition-transform duration-300">
                    <div class="flex justify-between items-center mb-6 border-b dark:border-gray-700 pb-4">
                        <h2 id="help-title" class="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center">
                            <div class="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center mr-3">
                                <i class="fas fa-info-circle text-indigo-500"></i>
                            </div>
                            <span>ヘルプ</span>
                        </h2>
                        <button id="close-help-button" class="text-gray-400 hover:text-indigo-500 text-3xl leading-none transition-all hover:scale-110 active:scale-95">&times;</button>
                    </div>
                    <div id="help-body" class="text-gray-600 dark:text-gray-300 leading-relaxed mb-8">
                        <!-- 内容は動的に注入されます -->
                    </div>
                    <div class="flex justify-end">
                        <button id="close-help-action-button" class="btn btn-primary px-8">
                            了解しました
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        const modal = document.getElementById('help-modal') as HTMLElement;
        const content = document.getElementById('help-modal-content') as HTMLElement;
        const closeBtn = document.getElementById('close-help-button') as HTMLElement;
        const closeActionBtn = document.getElementById('close-help-action-button') as HTMLElement;

        const closeModal = (): void => {
            modal.classList.add('opacity-0');
            content.classList.add('scale-95');
            setTimeout(() => modal.classList.add('hidden'), 300);
        };

        closeBtn.onclick = closeModal;
        closeActionBtn.onclick = closeModal;
        modal.onclick = (e: MouseEvent) => {
            if (e.target === modal) closeModal();
        };

        // Escキーで閉じる
        document.addEventListener('keydown', (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
                closeModal();
            }
        });
    }

    public showHelp(helpId: string): void {
        const data = HELP_DATA[helpId];
        if (!data) return;

        const modal = document.getElementById('help-modal') as HTMLElement;
        const titleEl = document.getElementById('help-title')?.querySelector('span') as HTMLElement;
        const bodyEl = document.getElementById('help-body') as HTMLElement;
        const content = document.getElementById('help-modal-content') as HTMLElement;

        if (titleEl) titleEl.textContent = data.title;
        if (bodyEl) bodyEl.innerHTML = data.content;

        modal.classList.remove('hidden');
        // アニメーションのために微調整
        setTimeout(() => {
            modal.classList.remove('opacity-0');
            content.classList.remove('scale-95');
        }, 10);
    }

    public createHelpIcon(helpId: string): HTMLElement {
        const icon = document.createElement('i');
        icon.className = 'fas fa-question-circle help-trigger';
        icon.setAttribute('data-help-id', helpId);
        return icon;
    }

    /**
     * [data-help="id"] 属性を持つ要素内にヘルプアイコンを自動注入する
     */
    public injectHelpIcons(): void {
        document.querySelectorAll('[data-help]').forEach(el => {
            const helpId = el.getAttribute('data-help');
            if (!helpId) return;
            
            // すでに注入済み、あるいは data-help-id が直接指定されている要素（静的アイコン）はスキップ
            if (el.querySelector('[data-help-id]') || el.hasAttribute('data-help-id')) return;

            const icon = this.createHelpIcon(helpId);
            el.appendChild(icon);
        });
    }

    private setupHelpTriggers(): void {
        // 静的な要素に対するイベント委譲
        document.addEventListener('click', (e: MouseEvent) => {
            const target = (e.target as HTMLElement).closest('[data-help-id]');
            if (target && !target.classList.contains('help-icon')) {
                const helpId = target.getAttribute('data-help-id');
                if (helpId) this.showHelp(helpId);
            }
        });
    }
}

export const helpManager = new HelpManager();
