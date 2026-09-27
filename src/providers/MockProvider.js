import { AIProvider } from './AIProvider.js';

/**
 * Mock Engine Provider.
 * Performs deterministic parsing & synthesis for testing or when Mock engine is explicitly selected.
 * Clearly labels all outputs as MOCK / Deterministic.
 */
export class MockProvider extends AIProvider {
  constructor() {
    super('MockProvider');
  }

  async isAvailable() {
    return true;
  }

  async analyzeWebsite(websiteContext) {
    const startTime = Date.now();

    const facts = websiteContext.scrapedFacts || websiteContext;
    const url = facts.url || 'https://example.com';
    const title = facts.title || 'Mock Website Title';
    const brandName = facts.brandName || 'MockBrand';

    const mockSpec = {
      metadata: {
        title: `[MOCK] ${title}`,
        description: facts.metaDesc || 'Mock deterministic WebsiteSpec output.',
        originalUrl: url,
        viewport: 'width=device-width, initial-scale=1.0'
      },
      theme: {
        primaryColor: facts.styles?.primaryColor || '#6366f1',
        secondaryColor: '#a855f7',
        backgroundColor: facts.styles?.backgroundColor || '#0f172a',
        textColor: facts.styles?.textColor || '#f8fafc',
        fontFamily: facts.styles?.fontFamily || 'Inter, sans-serif',
        borderRadius: facts.styles?.borderRadius || '8px'
      },
      navigation: {
        brandName: `[MOCK] ${brandName}`,
        links: facts.navLinks?.length ? facts.navLinks : ['Features', 'Solutions', 'Pricing', 'About'],
        ctaButton: { text: facts.buttons?.[0] || 'Get Started (Mock)', variant: 'primary' }
      },
      sections: [
        {
          id: 'hero',
          type: 'hero',
          heading: facts.heroHeading || 'Welcome to Mock Rebuild',
          subheading: facts.heroSubheading || 'Deterministic mock spec generated without cloud AI.',
          buttons: [
            { text: facts.buttons?.[0] || 'Primary Action', primary: true },
            { text: facts.buttons?.[1] || 'Secondary Action', primary: false }
          ]
        },
        {
          id: 'features',
          type: 'features',
          heading: facts.headings?.h2s?.[0] || 'Extracted Features',
          subheading: 'Capabilities parsed from target website DOM.',
          items: [
            { title: 'Feature 1', description: facts.paragraphs?.[0] || 'Description of capability 1.', icon: '⚡' },
            { title: 'Feature 2', description: facts.paragraphs?.[1] || 'Description of capability 2.', icon: '🛡️' },
            { title: 'Feature 3', description: facts.paragraphs?.[2] || 'Description of capability 3.', icon: '🚀' }
          ]
        },
        {
          id: 'footer',
          type: 'footer',
          copyright: `© ${new Date().getFullYear()} ${brandName} [MOCK]. All rights reserved.`,
          links: ['Privacy', 'Terms', 'Support']
        }
      ],
      assets: facts.images || [],
      responsive: {
        mobileNavType: 'hamburger',
        gridColumnsDesktop: 3,
        gridColumnsMobile: 1
      },
      meta: {
        provider: this.name,
        model: 'MockEngine-v2.0 (Deterministic)',
        executionTimeMs: Date.now() - startTime,
        tokenUsageEstimate: 0,
        cost: "$0.00 (Mock Engine)"
      }
    };

    return mockSpec;
  }
}

export { MockProvider as MockDevelopmentProvider };
