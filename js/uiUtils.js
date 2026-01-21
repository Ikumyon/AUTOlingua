/**
 * uiUtils.js
 * 汎用的なUI操作関数を提供するモジュール
 */

/**
 * カスタムアラートメッセージボックスを表示する関数
 * @param {string} message - 表示するメッセージ
 * @param {string} type - メッセージの種類 ('success', 'error', 'warning', 'info')
 */
export const alertMessage = (message, type = 'info') => {
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
 * HTML文字列をエスケープする関数
 * @param {string} str - エスケープする文字列
 * @returns {string} エスケープされた文字列
 */
export const escapeHTML = (str) => {
    if (!str) return '';
    return str.replace(/[&<>"']/g, function (match) {
        const escape = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        };
        return escape[match];
    });
};

/**
 * 口調ドロップダウンのオプションHTMLを生成する共通関数
 * @param {Array<object>} tones - 口調の配列
 * @param {boolean} includeDefaultOption - 「全体設定に沿う」オプションを含めるか
 * @returns {string} オプションのHTML文字列
 */
export const createToneOptionsHtml = (tones, includeDefaultOption = false) => {
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
 * @param {boolean} includeSelectOption
 * @returns {string} オプションのHTML文字列
 */
export const createLlmProviderOptionsHtml = (providers, includeSelectOption = false) => {
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
 * エラーメッセージを表示する関数
 * @param {string} message - 表示するエラーメッセージ
 */
export const showErrorMessage = (message) => {
    const errorMessage = document.getElementById('error-message');
    const tableContainer = document.getElementById('table-container');
    const translateAllButton = document.getElementById('translate-all-button');
    const translatedFileDownloadSection = document.getElementById('translated-file-download-section');
    const translationProgress = document.getElementById('translation-progress');

    if (errorMessage) {
        errorMessage.textContent = message;
        errorMessage.classList.remove('hidden');
    }
    if (tableContainer) tableContainer.classList.add('hidden');
    if (translateAllButton) translateAllButton.classList.add('hidden');
    if (translatedFileDownloadSection) translatedFileDownloadSection.classList.add('hidden');
    if (translationProgress) translationProgress.classList.add('hidden');
};

/**
 * エラーメッセージを非表示にする関数
 */
export const hideErrorMessage = () => {
    const errorMessage = document.getElementById('error-message');
    if (errorMessage) {
        errorMessage.classList.add('hidden');
        errorMessage.textContent = '';
    }
};

/**
 * ランダムな文字列を生成するヘルパー関数
 * @param {number} length - 生成する文字列の長さ
 * @returns {string} ランダムな文字列
 */
export const generateRandomString = (length) => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
};

/**
 * テキストに日本語が含まれているか判定する関数
 * @param {string} text - 判定するテキスト
 * @returns {boolean} 日本語が含まれていればtrue
 */
export const isJapaneseText = (text) => {
    // ひらがな、カタカナ、漢字、全角記号などが含まれているかチェック
    // 簡易的な判定: ひらがな or カタカナ or 漢字
    return /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text);
};

/**
 * パスワード入力フィールドの表示/非表示を切り替える機能を設定する関数
 * @param {HTMLInputElement} inputElement - パスワード入力要素
 * @param {HTMLElement} toggleButton - 切り替えボタン要素
 */
export const setupPasswordToggle = (inputElement, toggleButton) => {
    toggleButton.addEventListener('click', () => {
        const type = inputElement.getAttribute('type') === 'password' ? 'text' : 'password';
        inputElement.setAttribute('type', type);

        // アイコンの切り替え (FontAwesomeを使用している前提)
        const icon = toggleButton.querySelector('i');
        if (icon) {
            icon.classList.toggle('fa-eye');
            icon.classList.toggle('fa-eye-slash');
        }
    });
};

export const initTableResizer = (table) => {
    // 各列のデフォルト幅を設定（CSSからJSに移行）
    const defaultWidths = {
        'delete-column-header': '60px',
        'string_key-column-header': '120px', // 後でadjustKeyColumnWidthで調整される
        'original_text-column-header': '250px',
        'translation-cell': '450px',
        'review-column-header': '70px',
        'tone-column-header': '180px',
        'action-column-header': '150px'
    };

    // 初期幅を設定
    table.querySelectorAll('th').forEach(th => {
        for (const [className, width] of Object.entries(defaultWidths)) {
            if (th.classList.contains(className)) {
                th.style.width = width;
                th.style.minWidth = '10px';
                th.style.maxWidth = 'none'; // 最大幅の制限を解除
                break;
            }
        }
    });

    const cols = table.querySelectorAll('th');
    cols.forEach(col => {
        const resizer = col.querySelector('.resizer');
        if (!resizer) return;

        let x = 0;
        let w = 0;

        const onMouseMove = (e) => {
            const dx = e.clientX - x;
            const newWidth = Math.max(10, w + dx);
            col.style.width = `${newWidth}px`;
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            table.classList.remove('resizing');
        };

        resizer.addEventListener('mousedown', (e) => {
            e.preventDefault(); // デフォルトの選択動作を防ぐ
            x = e.clientX;
            const styles = window.getComputedStyle(col);
            w = parseInt(styles.width, 10);

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
            table.classList.add('resizing');
        });
    });
};
