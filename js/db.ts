/**
 * db.ts
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

let db: IDBDatabase | null = null; // IndexedDBのインスタンス

/**
 * 暗号化データの構造
 */
export interface EncryptedData {
    iv: number[];
    ciphertext: number[];
}

/**
 * IndexedDBを開く/作成する関数
 * @returns IndexedDBのインスタンス
 */
export const openDatabase = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        if (db) {
            resolve(db);
            return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
            const target = event.target as IDBOpenDBRequest;
            db = target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };

        request.onsuccess = (event: Event) => {
            const target = event.target as IDBOpenDBRequest;
            db = target.result;
            console.log('IndexedDB opened successfully.');
            resolve(db);
        };

        request.onerror = (event: Event) => {
            const target = event.target as IDBOpenDBRequest;
            console.error('IndexedDB error:', target.error);
            reject(new Error('IndexedDBのオープンに失敗しました。'));
        };
    });
};

/**
 * ランダムなバイト配列を生成するヘルパー関数
 * @param length - 生成するバイト配列の長さ
 * @returns ランダムなバイト配列
 */
export const generateRandomBytes = (length: number): Uint8Array => {
    return crypto.getRandomValues(new Uint8Array(length));
};

/**
 * パスフレーズから暗号化キーを導出する関数 (PBKDF2を使用)
 * @param passphrase - ユーザーが入力したパスフレーズ
 * @param salt - パスフレーズ導出用のソルト
 * @returns 導出された暗号化キー
 */
export const deriveKeyFromPassphrase = async (passphrase: string, salt: Uint8Array): Promise<CryptoKey> => {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        "raw",
        encoder.encode(passphrase),
        { name: "PBKDF2" },
    
        false,
        ["deriveKey"]
    );

    return crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: salt as any,
            iterations: 100000,
            hash: "SHA-256",
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
    );
};

/**
 * データを暗号化する関数 (AES-GCMを使用)
 * @param data - 暗号化するデータ（文字列）
 * @param key - 暗号化キー
 * @returns IVと暗号化されたデータ
 */
export const encryptData = async (data: string, key: CryptoKey): Promise<EncryptedData> => {
    const iv = generateRandomBytes(16);
    const encoder = new TextEncoder();
    const encodedData = encoder.encode(data);

    const ciphertext = await crypto.subtle.encrypt(
        {
            name: "AES-GCM",
            iv: iv as any,
        },
        key,
        encodedData
    );

    return {
        iv: Array.from(iv),
        ciphertext: Array.from(new Uint8Array(ciphertext))
    };
};

/**
 * 暗号化されたデータを復号化する関数 (AES-GCMを使用)
 * @param encryptedData - IVと暗号化されたデータ
 * @param key - 復号化キー
 * @returns 復号化されたデータ（文字列）
 */
export const decryptData = async (encryptedData: EncryptedData, key: CryptoKey): Promise<string> => {
    const iv = new Uint8Array(encryptedData.iv);
    const ciphertext = new Uint8Array(encryptedData.ciphertext).buffer;

    const decrypted = await crypto.subtle.decrypt(
        {
            name: "AES-GCM",
            iv: iv as any,
        },
        key,
        ciphertext
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
};

/**
 * IndexedDBから設定を取得する汎用関数
 * @param key - 取得する設定のキー
 * @returns 取得した設定データ
 */
export const getSettingFromIndexedDB = <T = any>(key: string): Promise<T | undefined> => {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('IndexedDB is not open.'));
            return;
        }
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(key);

        request.onsuccess = () => resolve(request.result);
        request.onerror = (event: Event) => {
            const target = event.target as IDBRequest;
            reject(target.error);
        };
    });
};

/**
 * IndexedDBに設定を保存する汎用関数
 * @param key - 保存する設定のキー
 * @param value - 保存する設定データ
 */
export const saveSettingToIndexedDB = (key: string, value: any): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('IndexedDB is not open.'));
            return;
        }
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(value, key);

        request.onsuccess = () => resolve();
        request.onerror = (event: Event) => {
            const target = event.target as IDBRequest;
            reject(target.error);
        };
    });
};

/**
 * IndexedDBから指定されたキーのデータを削除する汎用関数
 * @param key - 削除するデータのキー
 */
export const deleteSettingFromIndexedDB = (key: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('IndexedDB is not open.'));
            return;
        }
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(key);

        request.onsuccess = () => resolve();
        request.onerror = (event: Event) => {
            const target = event.target as IDBRequest;
            reject(target.error);
        };
    });
};

/**
 * APIキーを暗号化してIndexedDBに保存する関数
 * @param providerId - LLMプロバイダのID
 * @param apiKey - 保存するAPIキー
 * @param passphrase - APIキーを暗号化するためのパスフレーズ
 */
export const saveEncryptedApiKey = async (providerId: string, apiKey: string, passphrase: string): Promise<void> => {
    const storageKey = `${API_KEY_PREFIX}${providerId}`;
    if (!passphrase) {
        throw new Error('APIキーを保存するにはパスフレーズが必要です。');
    }

    try {
        let passphraseSalt = await getSettingFromIndexedDB<number[]>(PASSPHRASE_SALT_ITEM_KEY);
        let saltUint8: Uint8Array;

        if (!passphraseSalt) {
            saltUint8 = generateRandomBytes(16);
            await saveSettingToIndexedDB(PASSPHRASE_SALT_ITEM_KEY, Array.from(saltUint8));
        } else {
            saltUint8 = new Uint8Array(passphraseSalt);
        }

        const encryptionKey = await deriveKeyFromPassphrase(passphrase, saltUint8);
        const encryptedApiKeyData = await encryptData(apiKey, encryptionKey);

        await saveSettingToIndexedDB(storageKey, encryptedApiKeyData);
    } catch (error) {
        console.error('APIキーの暗号化保存に失敗しました:', error);
        throw error;
    }
};

/**
 * IndexedDBから暗号化されたAPIキーを読み込み、復号化する関数
 * @param providerId - LLMプロバイダのID
 * @param passphrase - APIキーを復号化するためのパスフレーズ
 * @returns 復号化されたAPIキー、またはnull
 */
export const loadEncryptedApiKey = async (providerId: string, passphrase: string): Promise<string | null> => {
    if (!passphrase) {
        throw new Error('APIキーを復号化するにはパスフレーズが必要です。');
    }

    try {
        const storageKey = `${API_KEY_PREFIX}${providerId}`;
        const encryptedApiKeyData = await getSettingFromIndexedDB<EncryptedData>(storageKey);
        const passphraseSalt = await getSettingFromIndexedDB<number[]>(PASSPHRASE_SALT_ITEM_KEY);

        if (!encryptedApiKeyData || !passphraseSalt) {
            return null;
        }

        const encryptionKey = await deriveKeyFromPassphrase(passphrase, new Uint8Array(passphraseSalt));
        const decryptedApiKey = await decryptData(encryptedApiKeyData, encryptionKey);

        return decryptedApiKey;
    } catch (error) {
        console.error('APIキーの復号化読み込みに失敗しました:', error);
        throw new Error('パスフレーズが正しくないか、データの読み込みに失敗しました。');
    }
};

/**
 * APIキーが保存されているか確認する関数
 * @param providerId - LLMプロバイダのID
 * @returns 保存されている場合はtrue
 */
export const hasSavedApiKey = async (providerId: string): Promise<boolean> => {
    const storageKey = `${API_KEY_PREFIX}${providerId}`;
    const encryptedApiKeyData = await getSettingFromIndexedDB(storageKey);
    return !!encryptedApiKeyData;
};

export { API_KEY_PREFIX };
