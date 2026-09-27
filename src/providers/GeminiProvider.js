import { AIProvider } from './AIProvider.js';

/**
 * Gemini Provider using Google AI Studio Free Tier API.
 * 100% Free Tier API ($0.00 cost, zero billing required).
 * Executed STRICTLY server-side. Key is never exposed to browser client JS.
 */
export class GeminiProvider extends AIProvider {
  constructor(apiKey = process.env.GEMINI_API_KEY, model = process.env.GEMINI_MODEL || 'gemini-3.8-flash') {
    super('GeminiProvider');
    this.apiKey = apiKey || process.env.GEMINI_API_KEY;
    this.model = process.env.GEMINI_MODEL || model || 'gemini-3.8-flash';
    this.candidateModels = ['gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-3.5-flash-lite'];
  }

  setApiKey(apiKey) {
    if (apiKey && apiKey.trim()) {
      this.apiKey = apiKey.trim();
    }
  }

  async isAvailable() {
    const key = this.apiKey || process.env.GEMINI_API_KEY;
    if (!key || key.trim() === '') {
      return false;
    }
    return key.length >= 15;
  }

  /**
   * Generates content using Gemini API with server-side logging & model fallback.
   * @param {string} prompt System & user prompt
   * @param {string} [imageBase64] Optional screenshot base64 image data
   * @returns {Promise<Object>} Generated content & metadata
   */
  async generate(prompt, imageBase64 = null) {
    const activeKey = this.apiKey || process.env.GEMINI_API_KEY;
    if (!activeKey || activeKey.trim() === '') {
      throw new Error(
        'GEMINI API KEY MISSING: Gemini provider is selected, but GEMINI_API_KEY is not configured in .env.local. ' +
        'Please set GEMINI_API_KEY in .env.local'
      );
    }

    let activeModel = process.env.GEMINI_MODEL || this.model || 'gemini-3.8-flash';
    const inputSize = prompt.length + (imageBase64 ? imageBase64.length : 0);
    
    // Detailed server-side logging (never logs API keys)
    console.log(`\n-----------------------------------------------------`);
    console.log(`[Gemini] provider = gemini`);
    console.log(`[Gemini] model = ${activeModel}`);
    console.log(`[Gemini] request started (Input Analysis Size: ${inputSize} bytes)`);
    console.log(`[Gemini] structured output mode = responseMimeType: "application/json"`);

    const parts = [{ text: prompt }];
    if (imageBase64) {
      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      parts.push({
        inlineData: {
          mimeType: 'image/png',
          data: cleanBase64
        }
      });
    }

    const requestBody = {
      contents: [{ role: 'user', parts }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 4096, // High output token ceiling to prevent JSON truncation
        responseMimeType: "application/json"
      }
    };

    let response = null;
    let lastError = null;
    const startTime = Date.now();

    const modelsToTry = [activeModel, ...this.candidateModels.filter(m => m !== activeModel)];

    for (const tryModel of modelsToTry) {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${tryModel}:generateContent?key=${activeKey}`;
      
      let attempts = 0;
      const maxAttemptsPerModel = 2;

      while (attempts < maxAttemptsPerModel) {
        attempts++;
        try {
          response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
          });

          if (response.ok) {
            activeModel = tryModel;
            this.model = tryModel;
            break;
          }

          const errorText = await response.text();
          lastError = `[Model ${tryModel}] HTTP ${response.status}: ${errorText}`;

          if (response.status === 503 || response.status === 429) {
            const backoffMs = attempts * 2000;
            console.warn(`[Gemini] Model '${tryModel}' returned HTTP ${response.status} (attempt ${attempts}/${maxAttemptsPerModel}). Retrying in ${backoffMs}ms...`);
            await new Promise(r => setTimeout(r, backoffMs));
          } else {
            console.warn(`[Gemini] Model '${tryModel}' returned HTTP ${response.status}. Trying fallback models...`);
            break;
          }
        } catch (fetchErr) {
          lastError = fetchErr.message;
          break;
        }
      }

      if (response && response.ok) {
        break;
      }
    }

    if (!response || !response.ok) {
      throw new Error(`GEMINI REQUEST FAILED: ${lastError || 'Unknown error calling Gemini API'}`);
    }

    const data = await response.json();
    const executionTimeMs = Date.now() - startTime;
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      throw new Error('Gemini API returned an empty response candidate.');
    }

    console.log(`[Gemini] response received (Output Size: ${rawText.length} bytes, Time: ${executionTimeMs}ms)`);
    console.log(`-----------------------------------------------------\n`);

    // Safe JSON parsing with truncation recovery
    let parsedResult;
    try {
      const cleanedJson = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
      parsedResult = JSON.parse(cleanedJson);
    } catch (e) {
      console.warn(`[Gemini] Direct JSON parse failed: ${e.message}. Attempting truncated JSON auto-repair...`);
      parsedResult = GeminiProvider.tryFixTruncatedJson(rawText);
      if (!parsedResult) {
        throw new Error(`Failed to parse raw JSON output from Gemini model: ${e.message}. Output snippet: ${rawText.substring(0, 150)}`);
      }
    }

    return {
      result: parsedResult,
      rawText,
      meta: {
        provider: this.name,
        model: activeModel,
        executionTimeMs,
        tokenUsageEstimate: Math.ceil((prompt.length + rawText.length) / 4),
        cost: "$0.00 (Gemini Free Tier)"
      }
    };
  }

  /**
   * Auto-completes unclosed strings, arrays, or objects in truncated JSON responses.
   * @param {string} rawJson 
   * @returns {Object|null}
   */
  static tryFixTruncatedJson(rawJson) {
    if (!rawJson) return null;
    let clean = rawJson.replace(/```json/gi, '').replace(/```/g, '').trim();

    // If an unclosed string exists, close quote
    const quoteCount = (clean.match(/"/g) || []).length;
    if (quoteCount % 2 !== 0) {
      clean += '"';
    }

    // Count open/close braces and brackets
    const openBraces = (clean.match(/\{/g) || []).length;
    const closeBraces = (clean.match(/\}/g) || []).length;
    const openBrackets = (clean.match(/\[/g) || []).length;
    const closeBrackets = (clean.match(/\]/g) || []).length;

    for (let i = 0; i < (openBrackets - closeBrackets); i++) {
      clean += ']';
    }
    for (let i = 0; i < (openBraces - closeBraces); i++) {
      clean += '}';
    }

    try {
      const parsed = JSON.parse(clean);
      console.log('[Gemini] ✅ Truncated JSON successfully auto-repaired!');
      return parsed;
    } catch {
      return null;
    }
  }

  async analyzeWebsite(websiteContext) {
    const prompt = typeof websiteContext === 'string' 
      ? websiteContext 
      : websiteContext.prompt || JSON.stringify(websiteContext);
      
    const imageBase64 = websiteContext.imageBase64 || null;

    const output = await this.generate(prompt, imageBase64);
    return {
      ...output.result,
      meta: output.meta
    };
  }
}

export { GeminiProvider as FreeGeminiProvider };
