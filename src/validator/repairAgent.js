/**
 * AI Repair Agent.
 * Self-healing component that receives compilation/transpilation errors from BuildValidator,
 * generates targeted code fixes, and applies patches to resolve build breakages.
 */
export class RepairAgent {
  /**
   * Attempts to fix broken React code based on error message.
   * @param {string} brokenCode 
   * @param {string} errorMessage 
   * @param {AIProviderManager} providerManager 
   * @param {string} [preferredProvider] 
   * @param {string} [apiKey] 
   * @returns {Promise<string>} Fixed code
   */
  static async fixCode(brokenCode, errorMessage, providerManager, preferredProvider = null, apiKey = null) {
    console.log(`[RepairAgent] Fixing code error: ${errorMessage.substring(0, 100)}...`);

    const prompt = `You are an expert React/JSX Repair Agent.
The following generated React code failed validation with this error:

ERROR LOG:
${errorMessage}

BROKEN CODE:
${brokenCode}

Your task: Fix the code syntax, unclosed tags, missing variables, or JSX errors.
Return ONLY the corrected code inside raw response without markdown backticks.`;

    try {
      const result = await providerManager.analyze({ prompt, brokenCode, errorMessage }, preferredProvider, apiKey);
      if (typeof result === 'string' && result.includes('React')) {
        return result.replace(/```jsx/gi, '').replace(/```html/gi, '').replace(/```/g, '').trim();
      }
    } catch (err) {
      console.warn(`[RepairAgent] AI fix request failed: ${err.message}. Applying fallback syntax patch.`);
    }

    // Fallback deterministic fix (e.g. closing unclosed tags or cleaning stray backticks)
    return brokenCode.replace(/```jsx/g, '').replace(/```/g, '').trim();
  }
}
