import { chromium } from 'playwright';

/**
 * Playwright Preview Health Check Agent.
 * Opens the generated HTML preview bundle in headless Chromium, waits for DOM rendering,
 * captures runtime console errors, verifies document text content is NOT blank, and captures a screenshot.
 */
export class PreviewHealthCheck {
  /**
   * Verifies that the preview HTML bundle renders visible content without fatal console/runtime errors.
   * @param {string} previewHtml Complete standalone HTML preview bundle
   * @returns {Promise<Object>} Health check report
   */
  static async checkPreview(previewHtml) {
    console.log('[PreviewHealthCheck] Testing preview rendering with Playwright...');

    if (!previewHtml || typeof previewHtml !== 'string' || previewHtml.trim().length === 0) {
      return {
        success: false,
        error: 'Preview HTML bundle is empty or invalid.'
      };
    }

    const consoleErrors = [];
    const pageErrors = [];

    try {
      const browser = await chromium.launch({ headless: true });
      const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      const page = await context.newPage();

      // Listen for browser console & runtime errors
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(`[Console Error] ${msg.text()}`);
        }
      });
      page.on('pageerror', err => {
        pageErrors.push(`[Page Error] ${err.message}`);
      });

      // Load generated preview HTML
      await page.setContent(previewHtml, { waitUntil: 'domcontentloaded', timeout: 10000 });
      await page.waitForTimeout(1000); // Allow React UMD & mounting to settle

      // Check visible rendered DOM content
      const renderMetrics = await page.evaluate(() => {
        const rootEl = document.getElementById('root');
        const bodyText = document.body ? document.body.innerText.trim() : '';
        const rootChildren = rootEl ? rootEl.children.length : 0;
        const visibleElements = document.querySelectorAll('h1, h2, h3, p, button, a, nav, header, section, footer').length;

        return {
          bodyTextLength: bodyText.length,
          bodyTextSnippet: bodyText.substring(0, 150),
          rootChildren,
          visibleElements
        };
      });

      // Capture preview screenshot
      let screenshotBase64 = null;
      try {
        const buf = await page.screenshot({ type: 'png', fullPage: false });
        screenshotBase64 = `data:image/png;base64,${buf.toString('base64')}`;
      } catch (scErr) {
        console.warn(`[PreviewHealthCheck] Screenshot capture notice: ${scErr.message}`);
      }

      await browser.close();

      const allErrors = [...pageErrors, ...consoleErrors];
      const hasContent = renderMetrics.bodyTextLength > 10 || renderMetrics.rootChildren > 0 || renderMetrics.visibleElements > 0;

      if (!hasContent) {
        console.error('[PreviewHealthCheck] ❌ Preview check FAILED: Rendered page is blank!');
        return {
          success: false,
          error: `Preview rendered a BLANK page (0 visible elements found in #root). Console errors: ${allErrors.join('; ') || 'None'}`,
          metrics: renderMetrics,
          errors: allErrors
        };
      }

      if (pageErrors.length > 0) {
        console.error(`[PreviewHealthCheck] ❌ Preview check FAILED due to fatal page errors: ${pageErrors.join('; ')}`);
        return {
          success: false,
          error: `Fatal runtime error in preview execution: ${pageErrors.join('; ')}`,
          metrics: renderMetrics,
          errors: allErrors
        };
      }

      console.log(`[PreviewHealthCheck] ✅ Preview check PASSED! Rendered ${renderMetrics.visibleElements} visible UI elements (${renderMetrics.bodyTextLength} chars).`);
      return {
        success: true,
        metrics: renderMetrics,
        screenshotBase64,
        errors: allErrors
      };

    } catch (err) {
      console.error(`[PreviewHealthCheck] Exception during preview verification: ${err.message}`);
      return {
        success: false,
        error: `Playwright preview verification failed: ${err.message}`
      };
    }
  }
}
