import assert from 'assert';
import { DOMParser } from '../src/analyzer/domParser.js';
import { AIProviderManager } from '../src/providers/AIProviderManager.js';
import { MockDevelopmentProvider } from '../src/providers/MockDevelopmentProvider.js';

async function runTests() {
  console.log('🧪 Starting Zero-Budget Web Analyzer Verification Tests...');

  // Test 1: Deterministic DOMParser extraction
  const sampleHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Sample Test Webpage</title>
        <meta name="description" content="This is a test webpage meta description for auditing.">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body>
        <h1>Welcome to Test Site</h1>
        <img src="test.jpg"> <!-- missing alt -->
        <button></button> <!-- missing label -->
        <p>Some clean body text for pruning test.</p>
      </body>
    </html>
  `;

  const context = await DOMParser.extractContext('http://localhost:3000', sampleHtml);
  assert.strictEqual(context.title, 'Sample Test Webpage');
  assert.strictEqual(context.accessibility.imagesMissingAlt, 1);
  assert.strictEqual(context.accessibility.buttonsMissingLabels, 1);
  assert.strictEqual(context.stats.hasViewport, true);
  console.log('  ✅ Test 1 Passed: Deterministic DOMParser correctly identifies metadata & accessibility flaws.');

  // Test 2: MockDevelopmentProvider offline execution
  const mockProvider = new MockDevelopmentProvider();
  assert.strictEqual(await mockProvider.isAvailable(), true);

  const mockResult = await mockProvider.analyzeWebsite(context);
  assert.ok(mockResult.seoScore > 0 && mockResult.seoScore <= 100);
  assert.ok(mockResult.accessibilityIssues.length > 0);
  assert.strictEqual(mockResult.meta.cost, '$0.00 (Pure Deterministic)');
  console.log('  ✅ Test 2 Passed: MockDevelopmentProvider executes 100% offline with zero cost.');

  // Test 3: AIProviderManager Fallback Chain
  const manager = new AIProviderManager();
  const fallbackResult = await manager.analyze(context, 'mock');
  assert.ok(fallbackResult.meta.provider.includes('Mock'));
  console.log('  ✅ Test 3 Passed: AIProviderManager successfully selects offline provider.');

  console.log('\n🎉 ALL ZERO-BUDGET TESTS PASSED SUCCESSFULLY!');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
