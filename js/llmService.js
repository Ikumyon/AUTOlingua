// llmService.js

/*
 * 指定されたLLMモデルの設定とAPI呼び出しロジックを提供します。
 * @param {string} model - 使用するLLMのモデル名 (例: 'gemini-2.0-flash', 'dummy-llm-model', 'gpt-4o', 'claude-3-opus-20240229')
 * @param {string} prompt - LLMに渡すプロンプト
 * @param {string} apiKey - LLMのAPIキー
 * @returns {Promise<{translatedText: string}>} LLMからの応答テキストを含むオブジェクト
 * @throws {Error} APIリクエストが失敗した場合、または予期せぬ応答構造の場合
 */
export const callLLMService = async (model, prompt, apiKey) => {
    let apiUrl = '';
    let payload = {};
    let headers = { 'Content-Type': 'application/json' };

    // モデルに基づいてAPIエンドポイントとペイロードを構築
    switch (model) {
        // Gemini Models
        case 'gemini-2.5-flash':
        case 'gemini-2.0-flash':
        case 'gemini-1.5-flash': // 新しいGeminiモデル
        case 'gemini-1.5-pro': // 新しいGeminiモデル
            apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
            payload = {
                contents: [{ role: "user", parts: [{ text: prompt }] }]
            };
            break;

        // OpenAI Models
        case 'gpt-4o':
        case 'gpt-3.5-turbo':
            apiUrl = `https://api.openai.com/v1/chat/completions`;
            headers['Authorization'] = `Bearer ${apiKey}`;
            payload = {
                model: model,
                messages: [{ role: "user", content: prompt }]
            };
            break;

        // Anthropic Claude Models
        case 'claude-3-opus-20240229':
        case 'claude-3-sonnet-20240229':
            apiUrl = `https://api.anthropic.com/v1/messages`;
            headers['x-api-key'] = apiKey;
            headers['anthropic-version'] = '2023-06-01'; // APIバージョンを指定
            payload = {
                model: model,
                max_tokens: 1024, // 必要に応じて調整
                messages: [{ role: "user", content: prompt }]
            };
            break;
        default:
            // ダミーモデルの場合はエラーをスローしない
            if (model.startsWith('dummy-llm-model')) {
                return { translatedText: 'ダミー翻訳結果' };
            }
            throw new Error(`Unsupported LLM model: ${model}`);
    }

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorData = await response.json();
        console.error('APIエラーレスポンス:', errorData);
        let apiErrorMessage = '不明なAPIエラー';
        if (errorData && errorData.error && errorData.error.message) {
            apiErrorMessage = errorData.error.message;
        } else if (response.status === 400) {
            apiErrorMessage = 'リクエストが無効です。APIキーが正しいか、リクエスト形式が適切か確認してください。';
        } else if (response.status === 401) {
            apiErrorMessage = '認証に失敗しました。APIキーが有効か確認してください。';
        } else if (response.status === 403) {
            apiErrorMessage = 'アクセスが拒否されました。APIキーの権限を確認してください。';
        } else if (response.status === 429) {
            apiErrorMessage = 'レート制限に達しました。しばらく待ってから再度お試しください。';
        }
        throw new Error(`APIリクエストが失敗しました: ${response.status} ${response.statusText} - ${apiErrorMessage}`);
    }

    const result = await response.json();
    // モデルに応じた応答の解析
    switch (model) {
        case 'gemini-2.5-flash':
        case 'gemini-2.0-flash':
        case 'gemini-1.5-flash':
        case 'gemini-1.5-pro':
            if (result.candidates && result.candidates.length > 0 &&
                result.candidates[0].content && result.candidates[0].content.parts &&
                result.candidates[0].content.parts.length > 0) {
                return { translatedText: result.candidates[0].content.parts[0].text };
            }
            break;
        case 'gpt-4o':
        case 'gpt-3.5-turbo':
            if (result.choices && result.choices.length > 0 && result.choices[0].message && result.choices[0].message.content) {
                return { translatedText: result.choices[0].message.content };
            }
            break;
        case 'claude-3-opus-20240229':
        case 'claude-3-sonnet-20240229':
            if (result.content && result.content.length > 0 && result.content[0].text) {
                return { translatedText: result.content[0].text };
            }
            break;
        case 'dummy-llm-model': // ダミーモデルの応答処理
            return { translatedText: 'ダミー翻訳結果' };
    }

    console.warn('LLM応答の構造が予期せぬものでした:', result);
    throw new Error('予期せぬLLM応答構造');
};
