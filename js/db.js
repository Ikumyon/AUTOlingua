/**
 * db.js
 * IndexedDB操作とデータの暗号化・復号化を担当するモジュール
 * UI操作には依存せず、純粋なデータアクセスと暗号化ロジックを提供する
 */

// IndexedDBの設定
const DB_NAME = 'AUTOlinguaDB';
const DB_VERSION = 1;
const STORE_NAME = 'appSettings';

// APIキーはプロバイダIDごとに保存
const API_KEY_PREFIX = 'encryptedApiKey_';
const PASSPHRASE_SALT_ITEM_KEY = 'passphraseSalt'; // パスフレーズ導出用ソルト

let db; // IndexedDBのインスタンス

/**
 * IndexedDBを開く/作成する関数
 * @returns {Promise<IDBDatabase>} IndexedDBのインスタンス
 */
export const openDatabase = () => {
    return new Promise((resolve, reject) => {
        if (db) {
            resolve(db);
            return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            console.log('IndexedDB opened successfully.');
            resolve(db);
        };

        request.onerror = (event) => {
            console.error('IndexedDB error:', event.target.errorCode, event.target.error);
            reject(new Error('IndexedDBのオープンに失敗しました。'));
        };
    });
};

/**
 * ランダムなバイト配列を生成するヘルパー関数
 * @param {number} length - 生成するバイト配列の長さ
 * @returns {Uint8Array} ランダムなバイト配列
 */
export const generateRandomBytes = (length) => {
    return crypto.getRandomValues(new Uint8Array(length));
};

/**
 * パスフレーズから暗号化キーを導出する関数 (PBKDF2を使用)
 * @param {string} passphrase - ユーザーが入力したパスフレーズ
 * @param {Uint8Array} salt - パスフレーズ導出用のソルト
 * @returns {Promise<CryptoKey>} 導出された暗号化キー
 */
export const deriveKeyFromPassphrase = async (passphrase, salt) => {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        "raw", // format
        encoder.encode(passphrase), // keyData
        { name: "PBKDF2" }, // algorithm
        false, // extractable
        ["deriveKey"] // keyUsages
    );

    return crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: salt,
            iterations: 100000, // 繰り返し回数を増やすことでブルートフォース攻撃に強くする
            hash: "SHA-256",
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        true, // エクスポート可能にする (IndexedDBに保存するため)
        ["encrypt", "decrypt"]
    );
};

/**
 * データを暗号化する関数 (AES-GCMを使用)
 * @param {string} data - 暗号化するデータ（文字列）
 * @param {CryptoKey} key - 暗号化キー
 * @returns {Promise<{iv: number[], ciphertext: number[]}>} IVと暗号化されたデータ
 */
export const encryptData = async (data, key) => {
    const iv = generateRandomBytes(16); // 16バイトのIVを生成 (AES-GCM推奨)
    const encoder = new TextEncoder();
    const encodedData = encoder.encode(data);

    const ciphertext = await crypto.subtle.encrypt(
        {
            name: "AES-GCM",
            iv: iv,
        },
        key,
        encodedData
    );

    // IVと暗号化されたデータを結合して返す (IndexedDBに保存するため)
    return {
        iv: Array.from(iv), // ArrayBufferを配列に変換
        ciphertext: Array.from(new Uint8Array(ciphertext)) // ArrayBufferを配列に変換
    };
};

/**
 * 暗号化されたデータを復号化する関数 (AES-GCMを使用)
 * @param {{iv: number[], ciphertext: number[]}} encryptedData - IVと暗号化されたデータ
 * @param {CryptoKey} key - 復号化キー
 * @returns {Promise<string>} 復号化されたデータ（文字列）
 */
export const decryptData = async (encryptedData, key) => {
    const iv = new Uint8Array(encryptedData.iv);
    const ciphertext = new Uint8Array(encryptedData.ciphertext).buffer;

    const decrypted = await crypto.subtle.decrypt(
        {
            name: "AES-GCM",
            iv: iv,
        },
        key,
        ciphertext
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
};

/**
 * IndexedDBから設定を取得する汎用関数
 * @param {string} key - 取得する設定のキー
 * @returns {Promise<any>} 取得した設定データ
 */
export const getSettingFromIndexedDB = (key) => {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('IndexedDB is not open.'));
            return;
        }
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(key);

        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => reject(event.target.error);
    });
};

/**
 * IndexedDBに設定を保存する汎用関数
 * @param {string} key - 保存する設定のキー
 * @param {any} value - 保存する設定データ
 * @returns {Promise<void>}
 */
export const saveSettingToIndexedDB = (key, value) => {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('IndexedDB is not open.'));
            return;
        }
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(value, key);

        request.onsuccess = () => resolve();
        request.onerror = (event) => reject(event.target.error);
    });
};

/**
 * IndexedDBから指定されたキーのデータを削除する汎用関数
 * @param {string} key - 削除するデータのキー
 * @returns {Promise<void>}
 */
export const deleteSettingFromIndexedDB = (key) => {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('IndexedDB is not open.'));
            return;
        }
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(key);

        request.onsuccess = () => resolve();
        request.onerror = (event) => reject(event.target.error);
    });
};

/**
 * APIキーを暗号化してIndexedDBに保存する関数
 * @param {string} providerId - LLMプロバイダのID
 * @param {string} apiKey - 保存するAPIキー
 * @param {string} passphrase - APIキーを暗号化するためのパスフレーズ
 * @returns {Promise<void>} 保存に成功した場合は解決、失敗時はエラーをreject
 */
export const saveEncryptedApiKey = async (providerId, apiKey, passphrase) => {
    const storageKey = `${API_KEY_PREFIX}${providerId}`;
    if (!passphrase) {
        throw new Error('Passphrase is required to save API key.');
    }

    try {
        // パスフレーズ導出用ソルトの取得または生成
        let passphraseSalt = await getSettingFromIndexedDB(PASSPHRASE_SALT_ITEM_KEY);
        if (!passphraseSalt) {
            const newSalt = generateRandomBytes(16);
            passphraseSalt = Array.from(newSalt);
            await saveSettingToIndexedDB(PASSPHRASE_SALT_ITEM_KEY, passphraseSalt);
            passphraseSalt = new Uint8Array(passphraseSalt);
        } else {
            passphraseSalt = new Uint8Array(passphraseSalt);
        }

        const encryptionKey = await deriveKeyFromPassphrase(passphrase, passphraseSalt);
        const encryptedApiKeyData = await encryptData(apiKey, encryptionKey);

        // プロバイダIDをキーとして保存
        await saveSettingToIndexedDB(storageKey, encryptedApiKeyData);
        // 成功時はただresolveする (呼び出し元でUIフィードバックを行う)
    } catch (error) {
        console.error('APIキーの暗号化保存に失敗しました:', error);
        throw error;
    }
};

/**
 * IndexedDBから暗号化されたAPIキーを読み込み、復号化する関数
 * @param {string} providerId - LLMプロバイダのID
 * @param {string} passphrase - APIキーを復号化するためのパスフレーズ
 * @returns {Promise<string|null>} 復号化されたAPIキー、またはnull（読み込み失敗またはデータなし時）
 */
export const loadEncryptedApiKey = async (providerId, passphrase) => {
    if (!passphrase) {
        throw new Error('Passphrase is required to load API key.');
    }

    try {
        const storageKey = `${API_KEY_PREFIX}${providerId}`;
        const encryptedApiKeyData = await getSettingFromIndexedDB(storageKey);
        const passphraseSalt = await getSettingFromIndexedDB(PASSPHRASE_SALT_ITEM_KEY);

        if (!encryptedApiKeyData || !passphraseSalt) {
            return null; // データがない
        }

        const encryptionKey = await deriveKeyFromPassphrase(passphrase, new Uint8Array(passphraseSalt));
        const decryptedApiKey = await decryptData(encryptedApiKeyData, encryptionKey);

        return decryptedApiKey;
    } catch (error) {
        console.error('APIキーの復号化読み込みに失敗しました:', error);
        // パスワード間違いの可能性が高いが、詳細なエラー判定はcryptoの実装依存
        throw new Error('パスフレーズが正しくないか、データの読み込みに失敗しました。');
    }
};

/**
 * APIキーが保存されているか確認する関数
 * @param {string} providerId - LLMプロバイダのID
 * @returns {Promise<boolean>} 保存されている場合はtrue
 */
export const hasSavedApiKey = async (providerId) => {
    const storageKey = `${API_KEY_PREFIX}${providerId}`;
    const encryptedApiKeyData = await getSettingFromIndexedDB(storageKey);
    return !!encryptedApiKeyData;
};

// APIキーのプレフィックス定数もエクスポートしておく（削除時などに使用）
export { API_KEY_PREFIX };
