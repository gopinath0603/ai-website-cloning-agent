import { WebsiteSpecSchema } from './websiteSpecSchema.js';

/**
 * WebsiteSpec Generator.
 * Transforms raw browser/DOM scraped facts into a structured, validated WebsiteSpec JSON object.
 * Validates Gemini AI output against Zod schema with self-correction retry capabilities.
 */
export class SpecGenerator {
  /**
   * Generates a WebsiteSpec object using Gemini or selected provider.
   * @param {Object} scrapedFacts 
   * @param {AIProviderManager} providerManager 
   * @param {string} [preferredProvider='gemini'] 
   * @param {string} [apiKey] 
   */
  static async generateSpec(scrapedFacts, providerManager, preferredProvider = 'gemini', apiKey = null) {
    const targetProvider = preferredProvider || 'gemini';

    // If Mock engine explicitly requested, return MockProvider output
    if (targetProvider === 'mock') {
      console.log('[SpecGenerator] Explicit Mock Engine selected. Running MockProvider...');
      return await providerManager.providers.mock.analyzeWebsite(scrapedFacts);
    }

    const systemPrompt = `You are an expert AI Frontend Architect.
Synthesize the provided scraped website facts into a clean, comprehensive "WebsiteSpec" JSON blueprint object.

EXTRACTED WEBSITE FACTS:
- Target URL: ${scrapedFacts.url}
- Title: ${scrapedFacts.title}
- Meta Description: ${scrapedFacts.metaDesc}
- Brand Name: ${scrapedFacts.brandName}
- Headings: ${JSON.stringify(scrapedFacts.headings)}
- Navigation Links: ${JSON.stringify(scrapedFacts.navLinks)}
- Hero Copy: "${scrapedFacts.heroHeading}" — "${scrapedFacts.heroSubheading}"
- Extracted Paragraphs: ${JSON.stringify(scrapedFacts.paragraphs)}
- Buttons: ${JSON.stringify(scrapedFacts.buttons)}
- Computed CSS Styles: ${JSON.stringify(scrapedFacts.styles)}
- Assets: ${JSON.stringify(scrapedFacts.images)}

Create a structured WebsiteSpec JSON object that represents THIS website's actual content, brand, sections, colors, and typography.

OUTPUT SCHEMA REQUIREMENTS (JSON ONLY):
{
  "metadata": {
    "title": "${scrapedFacts.title || 'Website Title'}",
    "description": "${scrapedFacts.metaDesc || ''}",
    "originalUrl": "${scrapedFacts.url}",
    "viewport": "width=device-width, initial-scale=1.0"
  },
  "theme": {
    "primaryColor": "${scrapedFacts.styles?.primaryColor || '#6366f1'}",
    "secondaryColor": "#a855f7",
    "backgroundColor": "${scrapedFacts.styles?.backgroundColor || '#0f172a'}",
    "textColor": "${scrapedFacts.styles?.textColor || '#f8fafc'}",
    "fontFamily": "${scrapedFacts.styles?.fontFamily || 'Inter, sans-serif'}",
    "borderRadius": "${scrapedFacts.styles?.borderRadius || '8px'}"
  },
  "navigation": {
    "brandName": "${scrapedFacts.brandName || 'Brand'}",
    "links": ${JSON.stringify(scrapedFacts.navLinks || ['Main Page', 'Contents', 'About'])},
    "ctaButton": { "text": "${scrapedFacts.buttons?.[0] || 'Explore'}", "variant": "primary" }
  },
  "sections": [
    {
      "id": "hero",
      "type": "hero",
      "heading": "${scrapedFacts.heroHeading || 'Welcome'}",
      "subheading": "${scrapedFacts.heroSubheading || ''}",
      "buttons": [
        { "text": "${scrapedFacts.buttons?.[0] || 'Explore'}", "primary": true }
      ]
    },
    {
      "id": "features",
      "type": "features",
      "heading": "Featured Articles & Topics",
      "subheading": "Key capabilities extracted from website.",
      "items": [
        { "title": "Featured Content 1", "description": "${scrapedFacts.paragraphs?.[1] || 'Extracted content section 1'}", "icon": "📚" },
        { "title": "Featured Content 2", "description": "${scrapedFacts.paragraphs?.[2] || 'Extracted content section 2'}", "icon": "🌐" }
      ]
    },
    {
      "id": "footer",
      "type": "footer",
      "copyright": "© 2026 ${scrapedFacts.brandName || 'Brand'} Inc. All rights reserved.",
      "links": ["Privacy Policy", "Terms of Service", "Contact"]
    }
  ],
  "assets": ${JSON.stringify(scrapedFacts.images || [])},
  "responsive": {
    "mobileNavType": "hamburger",
    "gridColumnsDesktop": 3,
    "gridColumnsMobile": 1
  }
}

Return ONLY raw JSON matching schema.`;

    let attempts = 0;
    const maxRetries = 2;
    let lastError = null;

    while (attempts < maxRetries) {
      attempts++;
      console.log(`[SpecGenerator] Gemini WebsiteSpec synthesis attempt ${attempts}/${maxRetries}...`);

      try {
        const payload = {
          prompt: attempts === 1 ? systemPrompt : `${systemPrompt}\n\nNOTE FOR RETRY ${attempts}: Ensure valid complete JSON. Previous error: ${lastError}`
          // Pass clean text prompt without 160KB base64 overhead for fast 503-free execution
        };

        const result = await providerManager.analyze(payload, targetProvider, apiKey);

        // Zod validation check
        const validation = WebsiteSpecSchema.safeParse(result);
        if (validation.success) {
          console.log(`[SpecGenerator] ✅ WebsiteSpec Zod validation PASSED cleanly! (Retry count: ${attempts - 1})`);
          return validation.data;
        }

        lastError = validation.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ');
        console.warn(`[SpecGenerator] ⚠️ Zod validation warning on attempt ${attempts}: ${lastError}`);

        if (result && result.navigation && result.sections && Array.isArray(result.sections)) {
          console.log('[SpecGenerator] ✅ Safe Zod spec normalization applied.');
          return SpecGenerator.normalizePartialSpec(result, scrapedFacts);
        }

      } catch (err) {
        lastError = err.message;
        console.warn(`[SpecGenerator] Gemini synthesis attempt ${attempts} error: ${err.message}`);
      }
    }

    throw new Error(`Gemini WebsiteSpec Generation failed after ${maxRetries} attempts: ${lastError}`);
  }

  static normalizePartialSpec(partial, facts) {
    return {
      metadata: {
        title: partial.metadata?.title || facts.title || 'Cloned Website',
        description: partial.metadata?.description || facts.metaDesc || '',
        originalUrl: facts.url,
        viewport: 'width=device-width, initial-scale=1.0'
      },
      theme: {
        primaryColor: partial.theme?.primaryColor || facts.styles?.primaryColor || '#6366f1',
        secondaryColor: partial.theme?.secondaryColor || '#a855f7',
        backgroundColor: partial.theme?.backgroundColor || facts.styles?.backgroundColor || '#0f172a',
        textColor: partial.theme?.textColor || facts.styles?.textColor || '#f8fafc',
        fontFamily: partial.theme?.fontFamily || facts.styles?.fontFamily || 'Inter, sans-serif',
        borderRadius: partial.theme?.borderRadius || facts.styles?.borderRadius || '8px'
      },
      navigation: {
        brandName: partial.navigation?.brandName || facts.brandName || 'Brand',
        links: partial.navigation?.links || facts.navLinks || ['Main Page', 'Contents', 'About'],
        ctaButton: partial.navigation?.ctaButton || { text: 'Explore', variant: 'primary' }
      },
      sections: Array.isArray(partial.sections) && partial.sections.length > 0 ? partial.sections : [
        {
          id: 'hero',
          type: 'hero',
          heading: facts.heroHeading || 'Welcome',
          subheading: facts.heroSubheading || '',
          buttons: [{ text: 'Explore', primary: true }]
        },
        {
          id: 'footer',
          type: 'footer',
          copyright: `© ${new Date().getFullYear()} ${facts.brandName || 'Brand'} Inc.`,
          links: ['Privacy', 'Terms']
        }
      ],
      assets: partial.assets || facts.images || [],
      responsive: {
        mobileNavType: 'hamburger',
        gridColumnsDesktop: 3,
        gridColumnsMobile: 1
      }
    };
  }
}
