import * as cheerio from 'cheerio';
import { chromium } from 'playwright';

/**
 * Playwright & DOM Scraper Agent.
 * Visually & structurally analyzes target website URLs, capturing section hierarchy,
 * computed CSS styles, real colors, typography, layout bounds, and image assets.
 * Compactly caps text fields to prevent huge token payloads on complex sites like Wikipedia.
 */
export class PlaywrightScraper {
  /**
   * Normalizes and validates raw URL input, preventing double-prefix bugs.
   * @param {string} inputUrl 
   * @returns {string} Normalized URL (e.g. https://example.com)
   */
  static normalizeUrl(inputUrl) {
    if (!inputUrl || typeof inputUrl !== 'string') {
      throw new Error('URL input is required.');
    }
    
    let trimmed = inputUrl.trim();
    trimmed = trimmed.replace(/^(https?:\/\/)+/i, '');
    const finalUrl = `https://${trimmed}`;

    try {
      const parsed = new URL(finalUrl);
      if (!parsed.hostname || (!parsed.hostname.includes('.') && parsed.hostname !== 'localhost')) {
        throw new Error(`Invalid domain name: "${parsed.hostname}". Please enter a valid URL.`);
      }
      return parsed.href;
    } catch (err) {
      throw new Error(`Malformed website URL (${inputUrl}): ${err.message}`);
    }
  }

  /**
   * Scrapes website DOM structure, computed styles, screenshots, and layout metadata.
   * @param {string} rawUrl 
   */
  static async scrapeWebsite(rawUrl) {
    const url = PlaywrightScraper.normalizeUrl(rawUrl);
    let scrapedData = null;

    try {
      console.log(`[PlaywrightScraper] Launching browser for URL: ${url}...`);
      const browser = await chromium.launch({ headless: true });
      const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      });
      const page = await context.newPage();

      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });

      let screenshotBase64 = null;
      try {
        const screenshotBuf = await page.screenshot({ type: 'png', fullPage: false });
        screenshotBase64 = `data:image/png;base64,${screenshotBuf.toString('base64')}`;
      } catch (scErr) {
        console.warn(`[PlaywrightScraper] Screenshot notice: ${scErr.message}`);
      }

      scrapedData = await page.evaluate(() => {
        const truncate = (str, len = 120) => {
          if (!str) return '';
          const cleaned = str.replace(/\s+/g, ' ').trim();
          return cleaned.length > len ? cleaned.substring(0, len) + '...' : cleaned;
        };

        const getStyles = (el) => {
          if (!el) return {};
          const comp = window.getComputedStyle(el);
          return {
            bgColor: comp.backgroundColor !== 'rgba(0, 0, 0, 0)' ? comp.backgroundColor : null,
            color: comp.color,
            fontFamily: comp.fontFamily,
            fontSize: comp.fontSize,
            borderRadius: comp.borderRadius
          };
        };

        const title = truncate(document.title || '', 80);
        const metaDesc = truncate(document.querySelector('meta[name="description"]')?.content || '', 150);

        const navEl = document.querySelector('nav, header, #mw-head, .vector-header');
        const brandText = truncate(navEl?.querySelector('.logo, .brand, a')?.textContent || title.split('|')[0]?.split('-')[0] || 'Brand', 30);
        
        const navLinks = [];
        navEl?.querySelectorAll('a').forEach(a => {
          const txt = truncate(a.textContent, 25);
          if (txt && txt.length > 2 && !navLinks.includes(txt) && navLinks.length < 6) {
            navLinks.push(txt);
          }
        });

        // Compact Headings
        const h1s = Array.from(document.querySelectorAll('h1')).map(h => truncate(h.textContent, 100)).filter(Boolean).slice(0, 3);
        const h2s = Array.from(document.querySelectorAll('h2')).map(h => truncate(h.textContent, 80)).filter(Boolean).slice(0, 5);

        // Compact Paragraphs (limit max 4 paragraphs, max 150 chars each)
        const paragraphs = Array.from(document.querySelectorAll('p'))
          .map(p => truncate(p.textContent, 140))
          .filter(p => p.length > 20)
          .slice(0, 4);

        // Compact Buttons
        const buttons = Array.from(document.querySelectorAll('button, a.btn, a[role="button"]'))
          .map(b => truncate(b.textContent, 25))
          .filter(Boolean)
          .slice(0, 5);

        // Compact Assets
        const images = Array.from(document.querySelectorAll('img'))
          .map(img => ({
            src: img.src,
            alt: truncate(img.alt || '', 50),
            width: img.naturalWidth || img.width || 300,
            height: img.naturalHeight || img.height || 200
          }))
          .filter(img => img.src && !img.src.startsWith('data:') && !img.src.endsWith('.svg'))
          .slice(0, 6);

        const bodyStyle = getStyles(document.body);
        const heroEl = document.querySelector('.hero, header, main section, #content, .mw-parser-output');
        const heroStyle = getStyles(heroEl);

        return {
          title,
          metaDesc,
          brandName: brandText,
          navLinks: navLinks.length > 0 ? navLinks : ['Main Page', 'Contents', 'Current Events', 'Random Article'],
          heroHeading: h1s[0] || title || 'Welcome to Wikipedia',
          heroSubheading: paragraphs[0] || metaDesc || 'The Free Encyclopedia that anyone can edit.',
          headings: { h1s, h2s },
          paragraphs,
          buttons,
          images,
          styles: {
            backgroundColor: bodyStyle.bgColor || heroStyle.bgColor || '#0f172a',
            textColor: bodyStyle.color || '#f8fafc',
            primaryColor: heroStyle.color || '#3b82f6',
            fontFamily: bodyStyle.fontFamily || 'sans-serif',
            borderRadius: '6px'
          }
        };
      });

      await browser.close();
      console.log(`[PlaywrightScraper] Extraction complete for ${url}. Payload size: ~${JSON.stringify(scrapedData).length} bytes`);
      return { url, screenshotBase64, ...scrapedData };

    } catch (err) {
      console.warn(`[PlaywrightScraper] Playwright browser fell back to Cheerio scraper: ${err.message}`);
    }

    return await PlaywrightScraper.fallbackCheerioScrape(url);
  }

  static async fallbackCheerioScrape(url) {
    console.log(`[PlaywrightScraper] Running Cheerio HTTP scraper for: ${url}...`);
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} when fetching ${url}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const title = $('title').first().text().trim().substring(0, 80) || 'Cloned Website';
    const metaDesc = $('meta[name="description"]').attr('content')?.substring(0, 150) || '';
    const brandName = $('header .logo, header a, nav a').first().text().trim().substring(0, 30) || title.split('|')[0]?.trim() || 'Brand';

    const navLinks = [];
    $('nav a, header a').each((_, el) => {
      const txt = $(el).text().trim().substring(0, 25);
      if (txt && txt.length > 2 && !navLinks.includes(txt) && navLinks.length < 6) navLinks.push(txt);
    });

    const h1s = [];
    $('h1').each((_, el) => { const txt = $(el).text().trim().substring(0, 100); if (txt && h1s.length < 3) h1s.push(txt); });
    const h2s = [];
    $('h2').each((_, el) => { const txt = $(el).text().trim().substring(0, 80); if (txt && h2s.length < 5) h2s.push(txt); });

    const paragraphs = [];
    $('p').each((_, el) => { const txt = $(el).text().trim().substring(0, 140); if (txt.length > 20 && paragraphs.length < 4) paragraphs.push(txt); });

    const buttons = [];
    $('button, a.btn, a[role="button"]').each((_, el) => { const txt = $(el).text().trim().substring(0, 25); if (txt && buttons.length < 5) buttons.push(txt); });

    const images = [];
    $('img').each((_, el) => {
      const src = $(el).attr('src');
      if (src && !src.startsWith('data:') && !src.endsWith('.svg') && images.length < 6) {
        let fullSrc = src;
        if (src.startsWith('/')) {
          const origin = new URL(url).origin;
          fullSrc = `${origin}${src}`;
        }
        images.push({ src: fullSrc, alt: $(el).attr('alt')?.substring(0, 50) || '', width: 300, height: 200 });
      }
    });

    return {
      url,
      title,
      metaDesc,
      brandName,
      navLinks: navLinks.length > 0 ? navLinks : ['Main Page', 'Contents', 'Current Events', 'Donate'],
      heroHeading: h1s[0] || h2s[0] || title || 'Welcome to Wikipedia',
      heroSubheading: paragraphs[0] || metaDesc || 'The Free Encyclopedia.',
      headings: { h1s, h2s, h3s: [] },
      paragraphs,
      buttons,
      images,
      styles: {
        backgroundColor: '#0f172a',
        textColor: '#f8fafc',
        primaryColor: '#3b82f6',
        fontFamily: 'sans-serif',
        borderRadius: '6px'
      }
    };
  }
}
