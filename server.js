import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { PlaywrightScraper } from './src/analyzer/playwrightScraper.js';
import { SpecGenerator } from './src/analyzer/specGenerator.js';
import { ReactGenerator } from './src/generator/reactGenerator.js';
import { BuildValidator } from './src/validator/buildValidator.js';
import { AIModifierAgent } from './src/modifier/aiModifierAgent.js';
import { AIProviderManager } from './src/providers/AIProviderManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local first, then fallback to .env
if (fs.existsSync(path.join(__dirname, '.env.local'))) {
  dotenv.config({ path: path.join(__dirname, '.env.local') });
}
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const providerManager = new AIProviderManager();
const cloneCache = new Map();

/**
 * Health Check API
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'AI-Powered Frontend Website Cloning Agent',
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > 10),
    activeModel: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
    timestamp: new Date().toISOString()
  });
});

/**
 * Engine Selector & Provider Discovery API
 */
app.get('/api/providers', async (req, res) => {
  try {
    const status = await providerManager.getAvailableProvidersStatus();
    res.json({
      success: true,
      activeDefault: process.env.DEFAULT_AI_PROVIDER || 'gemini',
      activeModel: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
      geminiKeyConfigured: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > 10),
      providers: status
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Clone Website API Pipeline:
 * 1. Playwright Browser Analysis & Screenshot Capture
 * 2. Gemini WebsiteSpec Generation & Zod Validation
 * 3. React Component Codebase Generation
 * 4. Self-Correcting Build & Playwright Preview Health Validation Loop
 */
app.post('/api/clone', async (req, res) => {
  const { url, provider } = req.body;
  const activeProvider = provider || process.env.DEFAULT_AI_PROVIDER || 'gemini';

  if (!url) {
    return res.status(400).json({
      success: false,
      error: 'Please provide a valid public website URL to clone.'
    });
  }

  // Enforce strict key validation when Gemini is requested
  if ((activeProvider === 'gemini' || activeProvider === 'free_gemini') && (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.trim() === '')) {
    return res.status(400).json({
      success: false,
      error: 'GEMINI KEY NOT CONFIGURED: Gemini Free Tier is selected, but GEMINI_API_KEY is not set in .env.local. ' +
             'Please add GEMINI_API_KEY=your_key in .env.local or select Mock Engine explicitly.'
    });
  }

  let normalizedUrl;
  try {
    normalizedUrl = PlaywrightScraper.normalizeUrl(url);
  } catch (urlErr) {
    return res.status(400).json({
      success: false,
      error: urlErr.message
    });
  }

  const cacheKey = `${normalizedUrl}:${activeProvider}`;
  if (cloneCache.has(cacheKey)) {
    console.log(`[Cache Hit] Serving cached clone payload for: ${normalizedUrl}`);
    return res.json({
      success: true,
      cached: true,
      ...cloneCache.get(cacheKey)
    });
  }

  try {
    console.log(`\n=====================================================`);
    console.log(`[Clone Pipeline] 1/4 Inspecting website via Playwright: ${normalizedUrl}...`);
    const scrapedFacts = await PlaywrightScraper.scrapeWebsite(normalizedUrl);

    console.log(`[Clone Pipeline] 2/4 Synthesizing WebsiteSpec via '${activeProvider}' provider...`);
    const websiteSpec = await SpecGenerator.generateSpec(scrapedFacts, providerManager, activeProvider);

    console.log(`[Clone Pipeline] 3/4 Generating React components & stylesheet...`);
    const initialBundle = ReactGenerator.generateApp(websiteSpec);

    console.log(`[Clone Pipeline] 4/4 Transpiling JSX & running Playwright Preview Health Check...`);
    const validationResult = await BuildValidator.validateAndRepair(initialBundle, providerManager);

    if (!validationResult.success) {
      console.error(`[Clone Pipeline Error] Validation failed: ${validationResult.error}`);
      return res.status(422).json({
        success: false,
        error: `Build or Preview Validation failed: ${validationResult.error}`,
        spec: websiteSpec,
        bundle: validationResult.bundle
      });
    }

    const payload = {
      spec: websiteSpec,
      scrapedFacts: {
        url: scrapedFacts.url,
        title: scrapedFacts.title,
        brandName: scrapedFacts.brandName,
        styles: scrapedFacts.styles,
        navLinks: scrapedFacts.navLinks
      },
      bundle: validationResult.bundle,
      validation: {
        success: validationResult.success,
        attempts: validationResult.attempts,
        previewHealth: validationResult.previewHealth
      }
    };

    if (cloneCache.size > 20) {
      const oldestKey = cloneCache.keys().next().value;
      cloneCache.delete(oldestKey);
    }
    cloneCache.set(cacheKey, payload);

    res.json({
      success: true,
      cached: false,
      ...payload
    });

  } catch (err) {
    console.error(`[Clone Pipeline Error] ${err.message}`);
    res.status(500).json({
      success: false,
      error: err.message || 'An error occurred during website cloning pipeline.'
    });
  }
});

/**
 * Natural Language AI Modification API Endpoint
 */
app.post('/api/modify', async (req, res) => {
  const { instruction, spec, bundle, provider } = req.body;
  const activeProvider = provider || process.env.DEFAULT_AI_PROVIDER || 'gemini';

  if (!instruction || !spec) {
    return res.status(400).json({
      success: false,
      error: 'Missing natural language instruction or WebsiteSpec payload.'
    });
  }

  if ((activeProvider === 'gemini' || activeProvider === 'free_gemini') && (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.trim() === '')) {
    return res.status(400).json({
      success: false,
      error: 'GEMINI KEY NOT CONFIGURED: Please set GEMINI_API_KEY in .env.local to run Gemini AI modifications.'
    });
  }

  try {
    console.log(`[Modify Pipeline] Applying instruction: "${instruction}"...`);
    const result = await AIModifierAgent.applyInstruction(
      instruction,
      spec,
      bundle,
      providerManager,
      activeProvider
    );

    if (!result.success) {
      return res.status(422).json({
        success: false,
        error: result.error,
        spec: result.spec,
        bundle: result.bundle
      });
    }

    res.json({
      success: true,
      ...result
    });

  } catch (err) {
    console.error(`[Modify Error] ${err.message}`);
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to apply AI code modification.'
    });
  }
});

app.listen(PORT, () => {
  console.log(`
=====================================================
🚀 AI Frontend Website Cloning Agent Server Running!
📍 URL: http://localhost:${PORT}
🤖 Default Provider: ${process.env.DEFAULT_AI_PROVIDER || 'gemini'} (${process.env.GEMINI_MODEL || 'gemini-3.8-flash'})
🔑 Gemini Key: ${process.env.GEMINI_API_KEY ? 'Configured in .env.local ✅' : 'Missing in .env.local ⚠️'}
🛡️ Guarantee: 100% Free / Zero Paid API Dependencies
=====================================================
  `);
});
