/**
 * DigitalOcean GradientAI Client
 * Replaces Anthropic SDK with GradientAI REST API
 */

export class GradientAIClient {
    constructor(apiKey, model = 'llama3.3-70b-instruct') {
        this.apiKey = apiKey;
        this.model = model;
        // DigitalOcean GradientAI Serverless Inference API endpoint
        // Documentation: https://docs.digitalocean.com/products/gradient-ai-platform/how-to/use-serverless-inference
        this.baseUrl = 'https://inference.do-ai.run/v1';
    }

    /**
     * Chat completion - main method
     */
    async chat(messages, options = {}) {
        const { max_tokens = 2048, temperature = 0.7 } = options;

        // Convert messages format for GradientAI
        // GradientAI expects: [{ role: 'user', content: '...' }]
        const formattedMessages = messages.map(msg => {
            if (typeof msg === 'string') {
                return { role: 'user', content: msg };
            }
            return {
                role: msg.role || 'user',
                content: msg.content || msg.text || ''
            };
        });

        try {
            const response = await fetch(`${this.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: formattedMessages,
                    max_tokens,
                    temperature,
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`❌ GradientAI API error: ${response.status}`, errorText);
                throw new Error(`GradientAI API error: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            
            // Extract text from response (GradientAI format)
            const text = data.choices?.[0]?.message?.content || 
                         data.content || 
                         data.text ||
                         (data.choices?.[0]?.text) ||
                         JSON.stringify(data);

            return {
                content: [{ text }],
                text
            };
        } catch (error) {
            console.error('❌ GradientAI request failed:', error);
            throw error;
        }
    }

    /**
     * Anthropic-compatible interface
     * This allows drop-in replacement for anthropic.messages.create()
     */
    async messages_create(options) {
        const { messages, max_tokens, model, temperature } = options;
        
        // Use provided model or default
        const useModel = model || this.model;
        
        const result = await this.chat(messages, { 
            max_tokens, 
            model: useModel,
            temperature 
        });
        
        // Return in Anthropic-compatible format
        return {
            content: result.content,
            text: result.text
        };
    }
}

