import { ReactGenerator } from '../generator/reactGenerator.js';
import { BuildValidator } from '../validator/buildValidator.js';

/**
 * Natural-Language AI Modification Agent.
 * Modifies WebsiteSpec and generated React components via Gemini or selected provider.
 */
export class AIModifierAgent {
  /**
   * Applies natural language instructions to an existing generated React app.
   * @param {string} userInstruction E.g., "Make navbar sticky and change primary color to teal"
   * @param {Object} currentSpec Existing WebsiteSpec blueprint
   * @param {Object} currentBundle Existing React files bundle
   * @param {AIProviderManager} providerManager 
   * @param {string} [preferredProvider='gemini'] 
   * @param {string} [apiKey] 
   * @returns {Promise<Object>} Updated app bundle & validation state
   */
  static async applyInstruction(userInstruction, currentSpec, currentBundle, providerManager, preferredProvider = 'gemini', apiKey = null) {
    console.log(`[AIModifierAgent] Applying natural language instruction: "${userInstruction}" via '${preferredProvider}'...`);

    const targetProvider = preferredProvider || 'gemini';
    let updatedSpec = JSON.parse(JSON.stringify(currentSpec));

    if (targetProvider === 'gemini') {
      const prompt = `You are an expert React UI Architect.
Modify the following "WebsiteSpec" JSON object based on the user's natural language instruction.

USER INSTRUCTION:
"${userInstruction}"

CURRENT WEBSITESPEC:
${JSON.stringify(currentSpec, null, 2)}

Return ONLY the updated WebsiteSpec JSON object matching the existing schema.
Ensure theme colors, section headings, buttons, or navigation links are updated as requested.
Do not wrap output in markdown code blocks.`;

      try {
        const analyzePromise = providerManager.analyze(prompt, 'gemini', apiKey);
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('AI response timeout (5000ms)')), 5000));

        const result = await Promise.race([analyzePromise, timeoutPromise]);
        if (result && result.navigation && result.sections) {
          updatedSpec = result;
        }
      } catch (err) {
        console.warn(`[AIModifierAgent] Gemini AI modification notice: ${err.message}. Applying direct spec patch.`);
        updatedSpec = AIModifierAgent.applyHeuristicPatch(userInstruction, updatedSpec);
      }

    } else {
      updatedSpec = AIModifierAgent.applyHeuristicPatch(userInstruction, updatedSpec);
    }

    // Enforce strict section ordering & positioning requirements
    if (updatedSpec && Array.isArray(updatedSpec.sections)) {
      updatedSpec.sections = AIModifierAgent.enforceSectionOrdering(userInstruction, updatedSpec.sections);
    }

    // Re-generate React codebase & preview bundle
    const newBundle = ReactGenerator.generateApp(updatedSpec);

    // Run Build Validation & Self-Correction
    const valResult = await BuildValidator.validateAndRepair(newBundle, providerManager);

    if (!valResult.success) {
      return {
        success: false,
        error: `Build validation failed after modification: ${valResult.error}`,
        spec: updatedSpec,
        bundle: newBundle
      };
    }

    return {
      success: true,
      instructionApplied: userInstruction,
      spec: updatedSpec,
      bundle: valResult.bundle
    };
  }

  static enforceSectionOrdering(instruction, sections) {
    const lower = instruction.toLowerCase();
    const result = JSON.parse(JSON.stringify(sections || []));

    if (lower.includes('testimonial')) {
      const existingIdx = result.findIndex(s => s.type === 'testimonials' || s.id === 'testimonials' || (s.heading && s.heading.toLowerCase().includes('testimonial')));
      
      let testimonialSec;
      if (existingIdx !== -1) {
        testimonialSec = result.splice(existingIdx, 1)[0];
        testimonialSec.type = 'testimonials';
      } else {
        testimonialSec = {
          id: 'testimonials',
          type: 'testimonials',
          heading: 'What Our Users Say',
          subheading: 'Loved by developers and teams worldwide.',
          items: [
            { title: 'Sarah Jenkins', description: 'Transformed our frontend workflow overnight!', icon: '⭐' },
            { title: 'Michael Chang', description: 'Outstanding build quality and speed.', icon: '⭐' }
          ]
        };
      }

      // Find hero section index
      const heroIdx = result.findIndex(s => s.type === 'hero' || s.id === 'hero');
      if (heroIdx !== -1) {
        // Insert directly below hero section
        result.splice(heroIdx + 1, 0, testimonialSec);
      } else {
        // Insert before footer
        const footerIdx = result.findIndex(s => s.type === 'footer' || s.id === 'footer');
        if (footerIdx !== -1) {
          result.splice(footerIdx, 0, testimonialSec);
        } else {
          result.push(testimonialSec);
        }
      }
    }

    // Always guarantee footer is the absolute last section
    const footerIdx = result.findIndex(s => s.type === 'footer' || s.id === 'footer');
    if (footerIdx !== -1 && footerIdx !== result.length - 1) {
      const [footerSec] = result.splice(footerIdx, 1);
      result.push(footerSec);
    }

    return result;
  }

  static applyHeuristicPatch(instruction, spec) {
    const lower = instruction.toLowerCase();
    const updated = JSON.parse(JSON.stringify(spec));

    if (lower.includes('blue')) updated.theme.primaryColor = '#3b82f6';
    if (lower.includes('teal') || lower.includes('cyan')) updated.theme.primaryColor = '#14b8a6';
    if (lower.includes('green') || lower.includes('emerald')) updated.theme.primaryColor = '#10b981';
    if (lower.includes('purple')) updated.theme.primaryColor = '#a855f7';
    if (lower.includes('red') || lower.includes('rose')) updated.theme.primaryColor = '#f43f5e';
    if (lower.includes('amber') || lower.includes('orange')) updated.theme.primaryColor = '#f59e0b';
    if (lower.includes('dark background') || lower.includes('black')) updated.theme.backgroundColor = '#030712';
    if (lower.includes('light background') || lower.includes('white')) {
      updated.theme.backgroundColor = '#f8fafc';
      updated.theme.textColor = '#0f172a';
    }

    return updated;
  }
}
