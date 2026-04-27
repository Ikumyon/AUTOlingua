// js/llmService.ts

/**
 * LLMResponse: 翻訳結果の共通インターフェース
 */
export interface LLMResponse {
    translatedText: string;
}

/**
 * OpenAI / GPT 系のレスポンス型
 */
interface OpenAIResponse {
    choices: Array<{
        message: {
            content: string;
        };
    }>;
}

/**
 * Gemini 系のレスポンス型
 */
interface GeminiResponse {
    candidates: Array<{
        content: {
            parts: Array<{
                text: string;
            }>;
        };
    }>;
}

/**
 * Anthropic / Claude 系のレスポンス型
 */
interface AnthropicResponse {
    content: Array<{
        text: string;
    }>;
}

/**
 * LLMサービスを呼び出す関数。
 * @param modelId - 使用するLLMモデルのID
 * @param systemPrompt - LLMにシステムとして送信するプロンプト設定
 * @param userMessage - ユーザーとして送信するメッセージ（主に翻訳対象用）
 * @param apiKey - LLMサービスのAPIキー
 * @param isThinkingModel - o1等の思考モデル特有の挙動を適用するか
 * @returns 翻訳結果とその他の情報を含むオブジェクト
 */
export const callLLMService = async (
    modelId: string,
    systemPrompt: string,
    userMessage: string,
    apiKey: string,
    isThinkingModel: boolean = false
): Promise<LLMResponse> => {
    let apiUrl = '';
    let payload: any = {};
    let headers: Record<string, string> = { 'Content-Type': 'application/json' };

    // モデルIDに基づいてAPIエンドポイントとペイロードを構築
    if (modelId.startsWith('gemini')) {
        // Gemini APIの場合
        apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;
        payload = { 
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [{ role: "user", parts: [{ text: userMessage }] }] 
        };
    } else if (modelId.startsWith('gpt') || modelId.startsWith('o1') || modelId.startsWith('o3')) {
        // OpenAI API (Chat GPT / o1 / o3) の場合
        apiUrl = 'https://api.openai.com/v1/chat/completions';
        headers['Authorization'] = `Bearer ${apiKey}`;
        
        let messages = [];
        if (isThinkingModel) {
            messages.push({ role: "developer", content: systemPrompt });
            messages.push({ role: "user", content: userMessage });
            payload = {
                model: modelId,
                messages: messages
            };
        } else {
            messages.push({ role: "system", content: systemPrompt });
            messages.push({ role: "user", content: userMessage });
            payload = {
                model: modelId,
                messages: messages,
                max_tokens: 2000
            };
        }
    } else if (modelId.startsWith('claude')) {
        // Anthropic API (Claude) の場合
        apiUrl = 'https://api.anthropic.com/v1/messages';
        headers['x-api-key'] = apiKey;
        headers['anthropic-version'] = '2023-06-01'; 
        headers['Content-Type'] = 'application/json';

        payload = {
            model: modelId,
            system: systemPrompt,
            max_tokens: 4000, 
            messages: [{ role: "user", content: userMessage }]
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
            const geminiResult = result as GeminiResponse;
            if (geminiResult.candidates && geminiResult.candidates.length > 0 &&
                geminiResult.candidates[0].content && geminiResult.candidates[0].content.parts &&
                geminiResult.candidates[0].content.parts.length > 0) {
                translatedText = geminiResult.candidates[0].content.parts[0].text;
            } else {
                throw new Error('Gemini APIからの応答が予期しない形式です。');
            }
        } else if (modelId.startsWith('gpt') || modelId.startsWith('o1') || modelId.startsWith('o3')) {
            const openaiResult = result as OpenAIResponse;
            if (openaiResult.choices && openaiResult.choices.length > 0 && openaiResult.choices[0].message) {
                translatedText = openaiResult.choices[0].message.content;
            } else {
                throw new Error('OpenAI APIからの応答が予期しない形式です。');
            }
        } else if (modelId.startsWith('claude')) {
            const anthropicResult = result as AnthropicResponse;
            if (anthropicResult.content && anthropicResult.content.length > 0 && anthropicResult.content[0].text) {
                translatedText = anthropicResult.content[0].text;
            } else {
                throw new Error('Anthropic APIからの応答が予期しない形式です。');
            }
        }

        return { translatedText: translatedText };

    } catch (error: any) {
        console.error('LLMサービス呼び出し中にエラーが発生しました:', error);
        throw new Error(`LLMサービス呼び出しエラー: ${error.message}`);
    }
};
