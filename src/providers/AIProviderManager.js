import { GeminiProvider } from './GeminiProvider.js';
import { LocalModelProvider } from './LocalModelProvider.js';
import { MockProvider } from './MockProvider.js';

/**
 * AI Provider Manager managing provider selection, security, and execution bounds.
 */
export class AIProviderManager {
  constructor() {
    this.providers = {
      gemini: new GeminiProvider(),
      free_gemini: new GeminiProvider(),
      local: new LocalModelProvider(),
      mock: new MockProvider()
    };
    this.activeProviderKey = process.env.DEFAULT_AI_PROVIDER || 'gemini';
  }

  setApiKey(providerKey, key) {
    if (key && (providerKey === 'gemini' || providerKey === 'free_gemini')) {
      this.providers.gemini.setApiKey(key);
      this.providers.free_gemini.setApiKey(key);
    }
  }

  async getAvailableProvidersStatus() {
    const geminiAvailable = await this.providers.gemini.isAvailable();
    const localAvailable = await this.providers.local.isAvailable();

    return {
      gemini: {
        name: 'Google Gemini 2.0 Flash (Free Tier)',
        isAvailable: geminiAvailable,
        statusText: geminiAvailable ? 'Configured & Ready ($0)' : 'Gemini key not configured in .env.local'
      },
      local: {
        name: 'Local Ollama LLM',
        isAvailable: localAvailable,
        statusText: localAvailable ? 'Ollama Online (localhost:11434)' : 'Ollama Offline'
      },
      mock: {
        name: 'Mock Engine (Deterministic)',
        isAvailable: true,
        statusText: '100% Offline Test Mode'
      }
    };
  }

  async analyze(websiteContext, preferredProviderKey = null, apiKeyOverride = null) {
    const targetKey = preferredProviderKey || this.activeProviderKey || 'gemini';

    if (apiKeyOverride && (targetKey === 'gemini' || targetKey === 'free_gemini')) {
      this.providers.gemini.setApiKey(apiKeyOverride);
    }

    const provider = this.providers[targetKey] || this.providers.gemini;

    // Strict No-Silent-Fallback enforcement for Gemini
    if (targetKey === 'gemini' || targetKey === 'free_gemini') {
      const isAvailable = await provider.isAvailable();
      if (!isAvailable) {
        throw new Error(
          'GEMINI KEY MISSING: Google Gemini is selected as active provider, but GEMINI_API_KEY is not configured. ' +
          'Please set GEMINI_API_KEY in your .env.local file or select Mock Engine explicitly.'
        );
      }
      return await provider.analyzeWebsite(websiteContext);
    }

    if (targetKey === 'local') {
      const isAvailable = await this.providers.local.isAvailable();
      if (!isAvailable) {
        throw new Error('LOCAL OLLAMA OFFLINE: Ollama server not detected on http://localhost:11434.');
      }
      return await this.providers.local.analyzeWebsite(websiteContext);
    }

    // Default to MockProvider when 'mock' is explicitly passed
    return await this.providers.mock.analyzeWebsite(websiteContext);
  }
}
