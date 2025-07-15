// js/llmService.js

/*
 * LLMサービスを呼び出す関数。
 * @param {string} modelId - 使用するLLMモデルのID
 * @param {string} prompt - LLMに送信するプロンプト
 * @param {string} apiKey - LLMサービスのAPIキー
 * @returns {Promise<object>} 翻訳結果とその他の情報を含むオブジェクト
 */
export const callLLMService = async (modelId, prompt, apiKey) => {
    let apiUrl = '';
    let payload = {};
    let headers = { 'Content-Type': 'application/json' };

    // モデルIDに基づいてAPIエンドポイントとペイロードを構築
    if (modelId.startsWith('gemini')) {
        // Gemini APIの場合
        apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;
        payload = { contents: [{ role: "user", parts: [{ text: prompt }] }] };
    } else if (modelId.startsWith('gpt')) {
        // OpenAI API (Chat GPT) の場合
        apiUrl = 'https://api.openai.com/v1/chat/completions';
        headers['Authorization'] = `Bearer ${apiKey}`;
        payload = {
            model: modelId,
            messages: [{ role: "user", content: prompt }],
            max_tokens: 2000 // 必要に応じて調整
        };
    } else if (modelId.startsWith('claude')) {
        // Anthropic API (Claude) の場合
        apiUrl = 'https://api.anthropic.com/v1/messages';
        headers['x-api-key'] = apiKey;
        headers['anthropic-version'] = '2023-06-01'; // 最新のAPIバージョンを指定
        headers['Content-Type'] = 'application/json'; // 明示的に指定

        payload = {
            model: modelId,
            max_tokens: 2000, // 必要に応じて調整
            messages: [{ role: "user", content: prompt }]
        };
    } else {
        throw new Error(`Unsupported LLM model: ${modelId}`);
    }

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('LLM API Error:', errorData);
            throw new Error(`LLM APIからのエラー: ${response.status} ${response.statusText} - ${errorData.error?.message || JSON.stringify(errorData)}`);
        }

        const result = await response.json();

        let translatedText = '';
        if (modelId.startsWith('gemini')) {
            if (result.candidates && result.candidates.length > 0 &&
                result.candidates[0].content && result.candidates[0].content.parts &&
                result.candidates[0].content.parts.length > 0) {
                translatedText = result.candidates[0].content.parts[0].text;
            } else {
                throw new Error('Gemini APIからの応答が予期しない形式です。');
            }
        } else if (modelId.startsWith('gpt')) {
            if (result.choices && result.choices.length > 0 && result.choices[0].message) {
                translatedText = result.choices[0].message.content;
            } else {
                throw new Error('OpenAI APIからの応答が予期しない形式です。');
            }
        } else if (modelId.startsWith('claude')) {
            if (result.content && result.content.length > 0 && result.content[0].text) {
                translatedText = result.content[0].text;
            } else {
                throw new Error('Anthropic APIからの応答が予期しない形式です。');
            }
        }

        return { translatedText: translatedText };

    } catch (error) {
        console.error('LLMサービス呼び出し中にエラーが発生しました:', error);
        throw new Error(`LLMサービス呼び出しエラー: ${error.message}`);
    }
};
