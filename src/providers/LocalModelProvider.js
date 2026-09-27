import { AIProvider } from './AIProvider.js';

/**
 * Local Model Provider connecting to Ollama running on localhost:11434.
 * Enables 100% offline, private, zero-cost local LLM execution.
 */
export class LocalModelProvider extends AIProvider {
  constructor(endpoint = process.env.OLLAMA_ENDPOINT || 'http://localhost:11434', model = process.env.OLLAMA_MODEL || 'llama3.2:3b') {
    super('LocalModelProvider');
    this.endpoint = endpoint.replace(/\/$/, '');
    this.model = model;
  }

  async isAvailable() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const response = await fetch(`${this.endpoint}/api/tags`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (response.ok) {
        const data = await response.json();
        return Array.isArray(data.models) && data.models.length > 0;
      }
      return false;
    } catch {
      return false;
    }
  }

  async analyzeWebsite(websiteContext) {
    const isAlive = await this.isAvailable();
    if (!isAlive) {
      throw new Error(`Local Ollama LLM server not detected at ${this.endpoint}. Please start Ollama or switch provider.`);
    }

    const prompt = `${this.getSystemPrompt()}\n\nAnalyze this website context:\n${JSON.stringify(websiteContext, null, 2)}`;

    const startTime = Date.now();
    const response = await fetch(`${this.endpoint}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        prompt: prompt,
        stream: false,
        format: 'json',
        options: {
          temperature: 0.2,
          num_predict: 1024
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama local inference error (${response.status}): ${await response.text()}`);
    }

    const data = await response.json();
    const executionTimeMs = Date.now() - startTime;
    const rawText = data.response;

    let parsedResult;
    try {
      const cleanedJson = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
      parsedResult = JSON.parse(cleanedJson);
    } catch (e) {
      throw new Error(`Failed to parse local LLM JSON output: ${e.message}`);
    }

    return {
      ...parsedResult,
      meta: {
        provider: this.name,
        model: this.model,
        executionTimeMs,
        tokenUsageEstimate: Math.ceil((prompt.length + rawText.length) / 4),
        cost: "$0.00 (Local Hardware)"
      }
    };
  }
}
