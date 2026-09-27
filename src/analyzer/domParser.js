import * as cheerio from 'cheerio';

/**
 * Deterministic DOM Parser & Accessibility/SEO Scraper.
 * Extracts DOM metadata, accessibility violations, structural stats,
 * and compresses raw web content into a compact token-efficient skeleton (~2KB-5KB).
 */
export class DOMParser {
  /**
   * Fetches HTML from URL or parses provided raw HTML string.
   * @param {string} targetUrlOrHtml 
   * @param {string} [rawHtml]
   */
  static async extractContext(targetUrlOrHtml, rawHtml = null) {
    let htmlContent = rawHtml;
    let finalUrl = targetUrlOrHtml;

    if (!htmlContent && targetUrlOrHtml) {
      if (!targetUrlOrHtml.startsWith('http://') && !targetUrlOrHtml.startsWith('https://')) {
        finalUrl = `https://${targetUrlOrHtml}`;
      }
      
      try {
        const response = await fetch(finalUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
          }
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status} - ${response.statusText}`);
        }
        htmlContent = await response.text();
      } catch (err) {
        throw new Error(`Failed to fetch URL (${finalUrl}): ${err.message}`);
      }
    }

    if (!htmlContent) {
      throw new Error('No valid HTML content or URL provided to DOMParser.');
    }

    const $ = cheerio.load(htmlContent);

    // 1. Meta Tag & Headings Extraction
    const title = $('title').first().text().trim() || $('meta[property="og:title"]').attr('content') || '';
    const metaDescription = $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content') || '';
    const canonical = $('link[rel="canonical"]').attr('href') || '';
    const viewport = $('meta[name="viewport"]').attr('content') || '';
    const ogImage = $('meta[property="og:image"]').attr('content') || '';

    const headings = {
      h1: [],
      h2: [],
      h3: []
    };
    $('h1').each((_, el) => { const txt = $(el).text().trim(); if (txt) headings.h1.push(txt.substring(0, 100)); });
    $('h2').each((_, el) => { const txt = $(el).text().trim(); if (txt) headings.h2.push(txt.substring(0, 100)); });
    $('h3').each((_, el) => { const txt = $(el).text().trim(); if (txt) headings.h3.push(txt.substring(0, 100)); });

    // 2. Accessibility Violation Extraction
    const images = $('img');
    let imagesMissingAlt = 0;
    const missingAltSample = [];

    images.each((_, el) => {
      const alt = $(el).attr('alt');
      const src = $(el).attr('src') || '';
      if (alt === undefined || alt === null || alt.trim() === '') {
        imagesMissingAlt++;
        if (missingAltSample.length < 3) {
          missingAltSample.push(src.substring(0, 80));
        }
      }
    });

    const buttons = $('button, a.btn, a[role="button"], input[type="submit"], input[type="button"]');
    let buttonsMissingLabels = 0;
    buttons.each((_, el) => {
      const text = $(el).text().trim();
      const ariaLabel = $(el).attr('aria-label');
      const titleAttr = $(el).attr('title');
      if (!text && !ariaLabel && !titleAttr) {
        buttonsMissingLabels++;
      }
    });

    const forms = $('form');
    let inputsMissingLabels = 0;
    $('input, select, textarea').each((_, el) => {
      const id = $(el).attr('id');
      const type = $(el).attr('type');
      if (type === 'hidden' || type === 'submit' || type === 'button') return;
      const ariaLabel = $(el).attr('aria-label');
      const placeholder = $(el).attr('placeholder');
      const hasLabel = id ? $(`label[for="${id}"]`).length > 0 : false;
      const parentLabel = $(el).closest('label').length > 0;

      if (!hasLabel && !parentLabel && !ariaLabel && !placeholder) {
        inputsMissingLabels++;
      }
    });

    // 3. Technical DOM & Performance Stats
    const totalNodes = $('*').length;
    const scriptTags = $('script').length;
    const stylesheetTags = $('link[rel="stylesheet"]').length;
    const inlineStyles = $('[style]').length;
    const rawTextLength = $.text().replace(/\s+/g, ' ').trim().length;

    // 4. Compact Skeleton Generation for AI Token Efficiency (~2KB-5KB)
    // Clone body and strip noise
    const $clean = cheerio.load(htmlContent);
    $clean('script, style, svg, iframe, noscript, nav, footer, header, path').remove();
    
    // Remove base64 data images
    $clean('img').each((_, el) => {
      const src = $clean(el).attr('src');
      if (src && src.startsWith('data:')) {
        $clean(el).attr('src', '[inline-base64-image]');
      }
    });

    const cleanBodyText = $clean('body').text().replace(/\s+/g, ' ').trim().substring(0, 1500);

    return {
      url: finalUrl,
      title,
      metaDescription,
      canonical,
      headings,
      accessibility: {
        totalImages: images.length,
        imagesMissingAlt,
        missingAltSample,
        buttonsMissingLabels,
        inputsMissingLabels,
        formCount: forms.length
      },
      stats: {
        domNodes: totalNodes,
        scriptTags,
        stylesheetTags,
        inlineStyles,
        textToCodeRatio: Math.round((rawTextLength / Math.max(1, htmlContent.length)) * 100),
        hasViewport: Boolean(viewport),
        hasCanonical: Boolean(canonical),
        hasOgImage: Boolean(ogImage)
      },
      prunedSnippet: cleanBodyText
    };
  }
}
