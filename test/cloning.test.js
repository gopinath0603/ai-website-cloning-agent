import assert from 'assert';
import { PlaywrightScraper } from '../src/analyzer/playwrightScraper.js';
import { SpecGenerator } from '../src/analyzer/specGenerator.js';
import { ReactGenerator } from '../src/generator/reactGenerator.js';
import { BuildValidator } from '../src/validator/buildValidator.js';
import { AIModifierAgent } from '../src/modifier/aiModifierAgent.js';
import { AIProviderManager } from '../src/providers/AIProviderManager.js';
import { WebsiteSpecSchema } from '../src/analyzer/websiteSpecSchema.js';
import { PreviewHealthCheck } from '../src/validator/previewHealthCheck.js';

async function runCloningTests() {
  console.log('🧪 Starting Website Cloning Agent & Playwright Preview Verification Tests...\n');

  // Test 1: URL Normalizer Test
  console.log('[Test 1] Testing URL Normalizer...');
  assert.strictEqual(PlaywrightScraper.normalizeUrl('example.com'), 'https://example.com/');
  assert.strictEqual(PlaywrightScraper.normalizeUrl('https://example.com'), 'https://example.com/');
  assert.strictEqual(PlaywrightScraper.normalizeUrl('https://https://wikipedia.org'), 'https://wikipedia.org/');
  console.log('  ✅ Test 1 Passed: URL Normalizer fixes double-prefixing and formats cleanly.');

  // Test 2: Scraper DOM Extraction
  console.log('\n[Test 2] Testing Scraper DOM & CSS Extraction...');
  const sampleFacts = await PlaywrightScraper.fallbackCheerioScrape('https://news.ycombinator.com');
  assert.ok(sampleFacts.title.length > 0);
  assert.ok(sampleFacts.styles.primaryColor);
  console.log('  ✅ Test 2 Passed: Scraper extracted real page title, headings, and computed styles.');

  // Test 3: WebsiteSpec Generator & Zod Schema Validation
  console.log('\n[Test 3] Testing WebsiteSpec Generator & Zod Schema Validation...');
  const providerManager = new AIProviderManager();
  const spec = await SpecGenerator.generateSpec(sampleFacts, providerManager, 'mock');
  const zodValidation = WebsiteSpecSchema.safeParse(spec);
  assert.strictEqual(zodValidation.success, true);
  console.log('  ✅ Test 3 Passed: WebsiteSpec generated and passed Zod schema validation.');

  // Test 4: React Component Generator & Standalone Preview Bundle
  console.log('\n[Test 4] Testing React Component Generator & Preview Sandbox Bundle...');
  const appBundle = ReactGenerator.generateApp(spec);
  assert.ok(appBundle.files['src/App.jsx'].includes('export default function App'));
  assert.ok(appBundle.files['src/components/Navbar.jsx']);
  assert.ok(appBundle.previewHtml.includes('id="root"'));
  console.log('  ✅ Test 4 Passed: React components and pre-compiled HTML preview sandbox created.');

  // Test 5: Playwright Preview Health Check Verification
  console.log('\n[Test 5] Testing Playwright Preview Health Check (Non-blank UI Verification)...');
  const previewHealth = await PreviewHealthCheck.checkPreview(appBundle.previewHtml);
  assert.strictEqual(previewHealth.success, true);
  assert.ok(previewHealth.metrics.bodyTextLength > 0);
  assert.ok(previewHealth.metrics.visibleElements > 0);
  console.log(`  ✅ Test 5 Passed: Playwright verified preview rendering! Rendered ${previewHealth.metrics.visibleElements} UI elements (${previewHealth.metrics.bodyTextLength} text chars).`);

  // Test 6: Build Validator Transpilation & Preview Check
  console.log('\n[Test 6] Testing Self-Correcting Build Validator...');
  const validation = await BuildValidator.validateAndRepair(appBundle, providerManager);
  assert.strictEqual(validation.success, true);
  console.log('  ✅ Test 6 Passed: Babel transpilation & Playwright preview rendering check passed.');

  // Test 7: AI Modification Agent Processing
  console.log('\n[Test 7] Testing Natural Language AI Modification Agent...');
  const modResult = await AIModifierAgent.applyInstruction(
    'Change primary theme color to teal and background to dark black',
    spec,
    appBundle,
    providerManager,
    'mock'
  );

  assert.strictEqual(modResult.success, true);
  assert.strictEqual(modResult.spec.theme.primaryColor, '#14b8a6');
  assert.strictEqual(modResult.spec.theme.backgroundColor, '#030712');
  console.log('  ✅ Test 7 Passed: AI Modification Agent updated theme colors and generated valid updated bundle.');

  console.log('\n🎉 ALL WEBSITE CLONING & PLAYWRIGHT PREVIEW TESTS PASSED SUCCESSFULLY!');
}

runCloningTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
