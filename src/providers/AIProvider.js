/**
 * Abstract Base Class defining the AI Provider Interface Contract.
 * All providers (FreeGemini, LocalModel, MockDevelopment) implement this contract.
 */
export class AIProvider {
  constructor(name) {
    this.name = name;
  }

  /**
   * Checks if this provider is configured and reachable.
   * @returns {Promise<boolean>}
   */
  async isAvailable() {
    throw new Error('isAvailable() must be implemented by subclass');
  }

  /**
   * Analyzes compressed website context and returns structured audit results.
   * @param {Object} websiteContext - Compact pruned website summary
   * @returns {Promise<Object>} Audit result containing scores, issues, and actionable recommendations
   */
  async analyzeWebsite(websiteContext) {
    throw new Error('analyzeWebsite() must be implemented by subclass');
  }

  /**
   * Generates standard system prompt for compact website analysis.
   */
  getSystemPrompt() {
    return `You are an expert AI Web Auditor & UX/SEO Engineer.
Your goal is to perform a strict, high-value web audit based on pre-extracted website DOM metadata.
Analyze the provided JSON website skeleton and output a JSON response matching EXACTLY this structure:
{
  "seoScore": number (0-100),
  "accessibilityScore": number (0-100),
  "designScore": number (0-100),
  "performanceScore": number (0-100),
  "executiveSummary": "Concise 2-sentence assessment of the website.",
  "seoIssues": ["Specific SEO flaw 1", "Specific SEO flaw 2"],
  "accessibilityIssues": ["Accessibility flaw 1", "Accessibility flaw 2"],
  "designSuggestions": ["Modern UI enhancement 1", "Typography/spacing fix 2"],
  "codeFixes": [
    {
      "issue": "Brief issue title",
      "impact": "High | Medium | Low",
      "codeBefore": "Current problematic HTML/CSS",
      "codeAfter": "Optimized replacement HTML/CSS",
      "explanation": "Why this fix works"
    }
  ],
  "quickWins": ["Immediate easy win 1", "Immediate easy win 2"]
}
Keep recommendations actionable, practical, and highly specific to the provided content. Do not include markdown code block formatting in the raw JSON output.`;
  }
}
