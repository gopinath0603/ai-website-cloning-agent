import babel from '@babel/core';
import { RepairAgent } from './repairAgent.js';
import { PreviewHealthCheck } from './previewHealthCheck.js';

/**
 * Self-Correcting Build & Preview Validator.
 * Transpiles generated React JSX files and verifies Playwright DOM preview rendering.
 * If errors or blank rendered pages are detected, triggers RepairAgent to self-correct up to maxRetries.
 */
export class BuildValidator {
  /**
   * Validates generated React files & verifies Playwright preview rendering.
   * @param {Object} appBundle { files, previewHtml }
   * @param {AIProviderManager} providerManager 
   * @param {number} [maxRetries=3] 
   * @returns {Promise<Object>} Validated bundle with build & preview health status
   */
  static async validateAndRepair(appBundle, providerManager, maxRetries = 3) {
    console.log('[BuildValidator] Running transpilation & Playwright preview health checks...');

    let currentBundle = { ...appBundle };
    let attempts = 0;
    let isValid = false;
    let lastError = null;
    let previewReport = null;

    while (attempts < maxRetries && !isValid) {
      attempts++;
      console.log(`[BuildValidator] Validation pass ${attempts}/${maxRetries}...`);

      // 1. Babel JSX Syntax & Transpilation Check
      const syntaxErrors = BuildValidator.checkJSXSyntax(currentBundle.files);
      if (syntaxErrors.length > 0) {
        lastError = syntaxErrors.join('\n');
        console.warn(`[BuildValidator] ❌ JSX compilation failed on pass ${attempts}:\n${lastError}`);
      } else {
        // 2. Playwright Preview Health Check (verifies page is NOT blank)
        previewReport = await PreviewHealthCheck.checkPreview(currentBundle.previewHtml);
        if (previewReport.success) {
          isValid = true;
          console.log('[BuildValidator] ✅ Build compilation & Playwright preview rendering PASSED cleanly!');
          break;
        } else {
          lastError = previewReport.error;
          console.warn(`[BuildValidator] ❌ Playwright preview rendering failed on pass ${attempts}:\n${lastError}`);
        }
      }

      // Attempt AI Repair loop if attempts remaining
      if (attempts < maxRetries) {
        console.log('[BuildValidator] Triggering AI Repair Agent...');
        const brokenFileKey = Object.keys(currentBundle.files)[0];
        const fixedCode = await RepairAgent.fixCode(
          currentBundle.files[brokenFileKey],
          lastError,
          providerManager
        );
        currentBundle.files[brokenFileKey] = fixedCode;
      }
    }

    return {
      success: isValid,
      attempts,
      error: isValid ? null : lastError,
      previewHealth: previewReport,
      bundle: currentBundle
    };
  }

  /**
   * Performs Babel transpilation check on JSX component files.
   * @param {Object} files Map of filename -> code string
   * @returns {Array<string>} List of syntax/compilation errors
   */
  static checkJSXSyntax(files) {
    const errors = [];

    for (const [filename, code] of Object.entries(files)) {
      if (filename.endsWith('.jsx') || filename.endsWith('.js')) {
        try {
          babel.transformSync(code, {
            presets: ['@babel/preset-react'],
            filename
          });
        } catch (err) {
          errors.push(`[${filename}] ${err.message}`);
        }
      }
    }

    return errors;
  }
}
