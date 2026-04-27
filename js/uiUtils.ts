/**
 * uiUtils.ts
 * 汎用的なUI操作関数を提供するモジュール
 */

import { LLMProvider, CustomTone } from './types';

/**
 * カスタムアラートメッセージボックスを表示する関数 (現代化されたトースト通知)
 * @param message - 表示するメッセージ
 * @param type - メッセージの種類 ('success', 'error', 'warning', 'info')
 */
export const alertMessage = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info'): void => {
    let alertContainer = document.getElementById('alert-container');
    if (!alertContainer) {
        const newContainer = document.createElement('div');
        newContainer.id = 'alert-container';
        newContainer.className = 'fixed top-6 right-6 z-[9999] flex flex-col items-end space-y-3 pointer-events-none';
        document.body.appendChild(newContainer);
        alertContainer = newContainer;
    }

    const alertDiv = document.createElement('div');
    
    // タイプごとの設定
    const config = {
        success: {
            icon: 'fa-check-circle',
            bg: 'bg-emerald-500/90',
            border: 'border-emerald-400/50',
            glow: 'shadow-emerald-500/20'
        },
        error: {
            icon: 'fa-exclamation-circle',
            bg: 'bg-rose-500/90',
            border: 'border-rose-400/50',
            glow: 'shadow-rose-500/20'
        },
        warning: {
            icon: 'fa-exclamation-triangle',
            bg: 'bg-amber-500/90',
            border: 'border-amber-400/50',
            glow: 'shadow-amber-500/20'
        },
        info: {
            icon: 'fa-info-circle',
            bg: 'bg-indigo-500/90',
            border: 'border-indigo-400/50',
            glow: 'shadow-indigo-500/20'
        }
    };

    const { icon, bg, border, glow } = config[type] || config.info;

    alertDiv.className = `
        ${bg} ${border} ${glow} pointer-events-auto
        flex items-center px-6 py-4 rounded-2xl shadow-2xl border backdrop-blur-md
        text-white min-w-[320px] max-w-md transform translate-x-full opacity-0
        transition-all duration-500 ease-out
    `.replace(/\s+/g, ' ').trim();

    alertDiv.innerHTML = `
        <div class="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-xl bg-white/20 mr-4">
            <i class="fas ${icon} text-lg"></i>
        </div>
        <div class="flex-grow font-medium text-sm leading-relaxed">
            ${message}
        </div>
        <button class="ml-4 text-white/50 hover:text-white transition-colors text-lg leading-none">&times;</button>
    `;

    // 閉じるボタンの処理
    const closeBtn = alertDiv.querySelector('button') as HTMLButtonElement;
    const dismiss = () => {
        alertDiv.classList.add('translate-x-full', 'opacity-0');
        alertDiv.addEventListener('transitionend', () => alertDiv.remove());
    };
    closeBtn.onclick = dismiss;

    alertContainer.prepend(alertDiv);

    // アニメーション開始
    requestAnimationFrame(() => {
        alertDiv.classList.remove('translate-x-full', 'opacity-0');
    });

    // 自動消去
    const autoDismissTimeout = setTimeout(dismiss, 4000);
    
    // ホバー時は消去を保留する
    alertDiv.onmouseenter = () => clearTimeout(autoDismissTimeout);
    alertDiv.onmouseleave = () => setTimeout(dismiss, 2000);
};

/**
 * HTML文字列をエスケープする関数
 * @param str - エスケープする文字列
 * @returns エスケープされた文字列
 */
export const escapeHTML = (str: string): string => {
    if (!str) return '';
    return str.replace(/[&<>"']/g, function (match) {
        const escape: Record<string, string> = {
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
 * @param tones - 口調の配列
 * @param includeDefaultOption - 「全体設定に沿う」オプションを含めるか
 * @returns オプションのHTML文字列
 */
export const createToneOptionsHtml = (tones: Partial<CustomTone>[], includeDefaultOption = false): string => {
    let optionsHtml = '';
    if (includeDefaultOption) {
        optionsHtml += '<option value="default">全体設定に沿う</option>';
    }
    tones.forEach(tone => {
        const displayName = tone.isConditional ? `${tone.name} [条件付き]` : tone.name;
        optionsHtml += `<option value="${escapeHTML(tone.value || '')}">${escapeHTML(displayName || '')}</option>`;
    });
    return optionsHtml;
};

/**
 * LLMプロバイダドロップダウンのオプションHTMLを生成する関数
 * @param providers - LLMプロバイダの配列
 * @param includeSelectOption
 * @returns オプションのHTML文字列
 */
export const createLlmProviderOptionsHtml = (providers: LLMProvider[], includeSelectOption = false): string => {
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
 * @param message - 表示するエラーメッセージ
 */
export const showErrorMessage = (message: string): void => {
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
export const hideErrorMessage = (): void => {
    const errorMessage = document.getElementById('error-message');
    if (errorMessage) {
        errorMessage.classList.add('hidden');
        errorMessage.textContent = '';
    }
};

/**
 * ランダムな文字列を生成するヘルパー関数
 * @param length - 生成する文字列の長さ
 * @returns ランダムな文字列
 */
export const generateRandomString = (length: number): string => {
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
 * @param text - 判定するテキスト
 * @returns 日本語が含まれていればtrue
 */
export const isJapaneseText = (text: string): boolean => {
    return /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text);
};

/**
 * パスワード入力フィールドの表示/非表示を切り替える機能を設定する関数
 * @param inputElement - パスワード入力要素
 * @param toggleButton - 切り替えボタン要素
 */
export const setupPasswordToggle = (inputElement: HTMLInputElement, toggleButton: HTMLElement): void => {
    toggleButton.addEventListener('click', () => {
        const type = inputElement.getAttribute('type') === 'password' ? 'text' : 'password';
        inputElement.setAttribute('type', type);

        const icon = toggleButton.querySelector('i');
        if (icon) {
            icon.classList.toggle('fa-eye');
            icon.classList.toggle('fa-eye-slash');
        }
    });
};

/**
 * テーブルのリサイズ機能を初期化する関数
 */
export const initTableResizer = (table: HTMLTableElement): void => {
    const getColumnKey = (th: HTMLElement): string | undefined => {
        return Array.from(th.classList).find(c => 
            c.endsWith('-header') || 
            c === 'translation-cell' || 
            c.endsWith('-column-cell') ||
            c.endsWith('-cell')
        );
    };

    const defaultWidths: Record<string, number> = {
        'delete-column-header': 60,
        'string_key-column-header': 150,
        'original_text-column-header': 300,
        'translation-cell': 450,
        'review-column-header': 70,
        'tone-column-header': 200,
        'action-column-header': 200
    };

    table.querySelectorAll('th').forEach(th => {
        const key = getColumnKey(th);
        if (key) {
            const savedWidth = localStorage.getItem(`auto_lingua_col_width_${key}`);
            if (savedWidth) {
                th.style.width = `${savedWidth}px`;
                th.style.minWidth = `${savedWidth}px`;
            } else if (defaultWidths[key]) {
                th.style.width = `${defaultWidths[key]}px`;
                th.style.minWidth = `${defaultWidths[key]}px`;
            }
        } else {
            th.style.minWidth = '50px';
        }
    });

    const setupResizer = (resizer: HTMLElement): void => {
        const col = resizer.parentElement as HTMLTableCellElement;
        let x = 0;
        let w = 0;

        const onMouseMove = (e: MouseEvent) => {
            const dx = e.clientX - x;
            const newWidth = Math.max(50, w + dx);
            col.style.width = `${newWidth}px`;
            col.style.minWidth = `${newWidth}px`;
        };

        const onMouseUp = () => {
            const key = getColumnKey(col);
            if (key) {
                const finalWidth = parseInt(col.style.width, 10);
                localStorage.setItem(`auto_lingua_col_width_${key}`, finalWidth.toString());
            }
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            table.classList.remove('resizing');
        };

        resizer.addEventListener('mousedown', (e: MouseEvent) => {
            e.preventDefault();
            x = e.clientX;
            const styles = window.getComputedStyle(col);
            w = parseInt(styles.width, 10);

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
            table.classList.add('resizing');
        });

        resizer.addEventListener('dblclick', () => {
            const key = getColumnKey(col);
            const children = Array.from(col.parentElement?.children || []);
            const columnIndex = children.indexOf(col);
            const cells = table.querySelectorAll(`tbody tr td:nth-child(${columnIndex + 1})`) as NodeListOf<HTMLElement>;
            const firstCell = cells[0];
            
            let maxWidth = 0;
            const tempSpan = document.createElement('span');
            tempSpan.style.visibility = 'hidden';
            tempSpan.style.position = 'absolute';
            tempSpan.style.whiteSpace = 'nowrap';
            
            const targetStyleElement = firstCell || col;
            const computedStyle = window.getComputedStyle(targetStyleElement);
            tempSpan.style.fontFamily = computedStyle.fontFamily;
            tempSpan.style.fontSize = computedStyle.fontSize;
            tempSpan.style.fontWeight = computedStyle.fontWeight;
            tempSpan.style.letterSpacing = computedStyle.letterSpacing;
            document.body.appendChild(tempSpan);

            tempSpan.textContent = col.textContent?.trim() || "";
            maxWidth = Math.max(maxWidth, tempSpan.offsetWidth);

            cells.forEach(cell => {
                const rawText = cell.innerText || cell.textContent || "";
                const lines = rawText.split('\n');
                lines.forEach(line => {
                    tempSpan.textContent = line.trim();
                    maxWidth = Math.max(maxWidth, tempSpan.offsetWidth);
                });

                const interactiveElements = cell.querySelectorAll('button, select, input') as NodeListOf<HTMLElement>;
                let elementsWidth = 0;
                interactiveElements.forEach(el => {
                    if (el.offsetWidth > 0) {
                        elementsWidth += el.offsetWidth + 8;
                    }
                });
                maxWidth = Math.max(maxWidth, elementsWidth);
            });

            document.body.removeChild(tempSpan);

            const paddingLeft = parseFloat(computedStyle.paddingLeft) || 0;
            const paddingRight = parseFloat(computedStyle.paddingRight) || 0;
            const borderLeft = parseFloat(computedStyle.borderLeftWidth) || 0;
            const borderRight = parseFloat(computedStyle.borderRightWidth) || 0;
            
            const totalPadding = paddingLeft + paddingRight + borderLeft + borderRight;
            const autoWidth = Math.max(50, maxWidth + totalPadding + 5);
            
            col.style.width = `${autoWidth}px`;
            col.style.minWidth = `${autoWidth}px`;
            
            if (key) {
                localStorage.setItem(`auto_lingua_col_width_${key}`, autoWidth.toString());
            }
        });
    };

    table.querySelectorAll('.resizer').forEach(r => setupResizer(r as HTMLElement));
};

