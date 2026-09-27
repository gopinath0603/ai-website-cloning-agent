import babel from '@babel/core';

/**
 * React Code Generator Engine.
 * Converts structured WebsiteSpec JSON blueprints into modular, production-ready React components,
 * clean CSS stylesheets, and a robust standalone HTML preview bundle.
 */
export class ReactGenerator {
  /**
   * Generates a complete React component codebase and executable preview bundle.
   * @param {Object} spec WebsiteSpec blueprint object
   * @returns {Object} React files map & HTML preview bundle
   */
  static generateApp(spec) {
    const theme = spec.theme || {};
    const nav = spec.navigation || {};
    const sections = spec.sections || [];
    const meta = spec.metadata || {};

    const primaryColor = theme.primaryColor || '#6366f1';
    const secondaryColor = theme.secondaryColor || '#a855f7';
    const bgColor = theme.backgroundColor || '#0f172a';
    const textColor = theme.textColor || '#f8fafc';
    const fontFamily = theme.fontFamily || 'Inter, sans-serif';
    const borderRadius = theme.borderRadius || '8px';

    const navLinkStrings = (nav.links || ['Features', 'Solutions', 'Pricing', 'About']).map(l => 
      typeof l === 'object' ? l.label : String(l)
    );

    // 1. Generate Navbar.jsx
    const navbarCode = `import React, { useState } from 'react';

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="cloned-nav">
      <div className="nav-container">
        <a href="#top" className="brand-logo">
          ${nav.brandName || 'Brand'}
        </a>
        <div className={\`nav-links \${mobileMenuOpen ? 'open' : ''}\`}>
          ${navLinkStrings.map(l => `<a href="#${l.toLowerCase().replace(/\s+/g, '-')}">${l}</a>`).join('\n          ')}
          <button className="btn-cta">${nav.ctaButton?.text || 'Get Started'}</button>
        </div>
        <button className="mobile-toggle" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          ☰
        </button>
      </div>
    </nav>
  );
}`;

    // Generate HTML snippet for preview
    let previewNavbarHtml = `<nav class="cloned-nav">
  <div class="nav-container">
    <a href="#top" class="brand-logo">${nav.brandName || 'Brand'}</a>
    <div class="nav-links" id="navLinksMenu">
      ${navLinkStrings.map(l => `<a href="#${l.toLowerCase().replace(/\s+/g, '-')}">${l}</a>`).join('')}
      <button class="btn-cta">${nav.ctaButton?.text || 'Get Started'}</button>
    </div>
    <button class="mobile-toggle" onclick="document.getElementById('navLinksMenu').classList.toggle('open')">☰</button>
  </div>
</nav>`;

    // Render Dynamic Sections based on WebsiteSpec
    const componentCodes = {};
    const appImports = ["import React from 'react';", "import { Navbar } from './components/Navbar';"];
    const appJSXElements = ["<Navbar />"];
    const previewSectionsHtml = [previewNavbarHtml];

    sections.forEach((sec, idx) => {
      const secType = sec.type || 'section';
      const compName = secType.charAt(0).toUpperCase() + secType.slice(1) + (idx > 0 ? idx : '');

      if (secType === 'hero') {
        const heroCode = `import React from 'react';

export function ${compName}() {
  return (
    <section className="cloned-hero" id="${sec.id || 'hero'}">
      <div className="hero-content">
        <h1 className="hero-heading">${sec.heading || meta.title || 'Welcome'}</h1>
        <p className="hero-subheading">${sec.subheading || meta.description || ''}</p>
        <div className="hero-actions">
          ${(sec.buttons || [{ text: 'Get Started Free', primary: true }]).map(b => 
            `<button className="${b.primary ? 'btn-cta' : 'btn-secondary'}">${b.text}</button>`
          ).join('\n          ')}
        </div>
      </div>
    </section>
  );
}`;
        componentCodes[`src/components/${compName}.jsx`] = heroCode;
        appImports.push(`import { ${compName} } from './components/${compName}';`);
        appJSXElements.push(`<${compName} />`);

        previewSectionsHtml.push(`<section class="cloned-hero" id="${sec.id || 'hero'}">
  <div class="hero-content">
    <h1 class="hero-heading">${sec.heading || meta.title || 'Welcome'}</h1>
    <p class="hero-subheading">${sec.subheading || meta.description || ''}</p>
    <div class="hero-actions">
      ${(sec.buttons || [{ text: 'Get Started Free', primary: true }]).map(b => 
        `<button class="${b.primary ? 'btn-cta' : 'btn-secondary'}">${b.text}</button>`
      ).join('')}
    </div>
  </div>
</section>`);

      } else if (secType === 'features' || secType === 'cards') {
        const items = sec.items || [
          { title: 'Lightning Performance', description: 'Optimized architecture for max speed.', icon: '⚡' },
          { title: 'Bank-Grade Security', description: 'Enterprise encryption standard.', icon: '🛡️' },
          { title: 'Seamless Scale', description: 'Built to scale with your team.', icon: '🚀' }
        ];

        const featuresCode = `import React from 'react';

export function ${compName}() {
  const items = ${JSON.stringify(items, null, 2)};

  return (
    <section className="cloned-features" id="${sec.id || 'features'}">
      <div className="section-container">
        <h2 className="section-heading">${sec.heading || 'Core Features'}</h2>
        <p className="section-subheading">${sec.subheading || 'Everything you need to succeed.'}</p>
        <div className="features-grid">
          {items.map((item, idx) => (
            <div key={idx} className="feature-card">
              <div className="feature-icon">{item.icon || '✨'}</div>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}`;
        componentCodes[`src/components/${compName}.jsx`] = featuresCode;
        appImports.push(`import { ${compName} } from './components/${compName}';`);
        appJSXElements.push(`<${compName} />`);

        previewSectionsHtml.push(`<section class="cloned-features" id="${sec.id || 'features'}">
  <div class="section-container">
    <h2 class="section-heading">${sec.heading || 'Core Features'}</h2>
    <p class="section-subheading">${sec.subheading || 'Everything you need to succeed.'}</p>
    <div class="features-grid">
      ${items.map(item => `
        <div class="feature-card">
          <div class="feature-icon">${item.icon || '✨'}</div>
          <h3>${item.title || 'Feature'}</h3>
          <p>${item.description || ''}</p>
        </div>
      `).join('')}
    </div>
  </div>
</section>`);

      } else if (secType === 'pricing') {
        const items = sec.items || [
          { title: 'Starter', price: '$0 / mo', description: 'Basic features for individuals.' },
          { title: 'Pro Plan', price: '$29 / mo', description: 'Advanced tools for teams.' }
        ];

        const pricingCode = `import React from 'react';

export function ${compName}() {
  const plans = ${JSON.stringify(items, null, 2)};

  return (
    <section className="cloned-pricing" id="${sec.id || 'pricing'}">
      <div className="section-container">
        <h2 className="section-heading">${sec.heading || 'Pricing Plans'}</h2>
        <p className="section-subheading">${sec.subheading || 'Choose the right plan for you.'}</p>
        <div className="pricing-grid">
          {plans.map((plan, idx) => (
            <div key={idx} className="pricing-card">
              <h3>{plan.title}</h3>
              <div className="price-tag">{plan.price}</div>
              <p>{plan.description}</p>
              <button className="btn-cta">Select Plan</button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}`;
        componentCodes[`src/components/${compName}.jsx`] = pricingCode;
        appImports.push(`import { ${compName} } from './components/${compName}';`);
        appJSXElements.push(`<${compName} />`);

        previewSectionsHtml.push(`<section class="cloned-pricing" id="${sec.id || 'pricing'}">
  <div class="section-container">
    <h2 class="section-heading">${sec.heading || 'Pricing Plans'}</h2>
    <p class="section-subheading">${sec.subheading || 'Choose the right plan for you.'}</p>
    <div class="pricing-grid">
      ${items.map(plan => `
        <div class="pricing-card">
          <h3>${plan.title || 'Plan'}</h3>
          <div class="price-tag">${plan.price || '$0'}</div>
          <p>${plan.description || ''}</p>
          <button class="btn-cta">Select Plan</button>
        </div>
      `).join('')}
    </div>
  </div>
</section>`);

      } else if (secType === 'testimonials') {
        const items = sec.items || [
          { title: 'Sarah Jenkins', description: 'Transformed our frontend pipeline overnight!', icon: '⭐' },
          { title: 'Michael Chang', description: 'Outstanding build quality and speed.', icon: '⭐' }
        ];

        const testimonialsCode = `import React from 'react';

export function ${compName}() {
  const items = ${JSON.stringify(items, null, 2)};

  return (
    <section className="cloned-testimonials" id="${sec.id || 'testimonials'}">
      <div className="section-container">
        <h2 className="section-heading">${sec.heading || 'What Our Users Say'}</h2>
        <p className="section-subheading">${sec.subheading || 'Loved by developers worldwide.'}</p>
        <div className="testimonials-grid">
          {items.map((item, idx) => (
            <div key={idx} className="testimonial-card">
              <div className="testimonial-icon">{item.icon || '⭐'}</div>
              <h3>{item.title}</h3>
              <p>"{item.description}"</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}`;
        componentCodes[`src/components/${compName}.jsx`] = testimonialsCode;
        appImports.push(`import { ${compName} } from './components/${compName}';`);
        appJSXElements.push(`<${compName} />`);

        previewSectionsHtml.push(`<section class="cloned-testimonials" id="${sec.id || 'testimonials'}">
  <div class="section-container">
    <h2 class="section-heading">${sec.heading || 'What Our Users Say'}</h2>
    <p class="section-subheading">${sec.subheading || 'Loved by developers worldwide.'}</p>
    <div class="testimonials-grid">
      ${items.map(item => `
        <div class="testimonial-card">
          <div class="testimonial-icon">${item.icon || '⭐'}</div>
          <h3>${item.title || 'User'}</h3>
          <p>"${item.description || ''}"</p>
        </div>
      `).join('')}
    </div>
  </div>
</section>`);

      } else if (secType === 'footer') {
        const footerCode = `import React from 'react';

export function ${compName}() {
  return (
    <footer className="cloned-footer" id="${sec.id || 'footer'}">
      <div className="footer-container">
        <div className="footer-brand">${nav.brandName || 'Brand'}</div>
        <p className="copyright">${sec.copyright || `© ${new Date().getFullYear()} ${nav.brandName || 'Brand'} Inc.`}</p>
        <div className="footer-links">
          ${(sec.links || ['Privacy', 'Terms', 'Support']).map(l => `<a href="#${l.toLowerCase()}">${l}</a>`).join('\n          ')}
        </div>
      </div>
    </footer>
  );
}`;
        componentCodes[`src/components/${compName}.jsx`] = footerCode;
        appImports.push(`import { ${compName} } from './components/${compName}';`);
        appJSXElements.push(`<${compName} />`);

        previewSectionsHtml.push(`<footer class="cloned-footer" id="${sec.id || 'footer'}">
  <div class="footer-container">
    <div class="footer-brand">${nav.brandName || 'Brand'}</div>
    <p class="copyright">${sec.copyright || `© ${new Date().getFullYear()} ${nav.brandName || 'Brand'} Inc.`}</p>
    <div class="footer-links">
      ${(sec.links || ['Privacy', 'Terms', 'Support']).map(l => `<a href="#${l.toLowerCase()}">${l}</a>`).join('')}
    </div>
  </div>
</footer>`);
      }
    });

    // Generate App.jsx
    appImports.push("import './App.css';");
    const appCode = `${appImports.join('\n')}

export default function App() {
  return (
    <div className="cloned-app-wrapper">
      ${appJSXElements.join('\n      ')}
    </div>
  );
}`;

    // Generate App.css
    const cssCode = `/* Generated Stylesheet matching WebsiteSpec */
:root {
  --primary-color: ${primaryColor};
  --secondary-color: ${secondaryColor};
  --bg-color: ${bgColor};
  --text-color: ${textColor};
  --font-family: ${fontFamily};
  --border-radius: ${borderRadius};
}

* { box-sizing: border-box; margin: 0; padding: 0; }
body { background-color: var(--bg-color); color: var(--text-color); font-family: var(--font-family); line-height: 1.6; }

.cloned-app-wrapper { min-height: 100vh; display: flex; flex-direction: column; background: var(--bg-color); color: var(--text-color); }

.cloned-nav { background: rgba(15, 23, 42, 0.95); border-bottom: 1px solid rgba(255, 255, 255, 0.1); position: sticky; top: 0; z-index: 100; backdrop-filter: blur(8px); }
.nav-container { max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.5rem; }
.brand-logo { font-size: 1.4rem; font-weight: 800; color: #fff; text-decoration: none; }
.nav-links { display: flex; gap: 1.5rem; align-items: center; }
.nav-links a { color: #94a3b8; text-decoration: none; font-size: 0.95rem; transition: color 0.2s; }
.nav-links a:hover { color: #fff; }
.mobile-toggle { display: none; background: none; border: none; color: #fff; font-size: 1.5rem; cursor: pointer; }

.btn-cta { background: var(--primary-color); color: #fff; border: none; padding: 0.65rem 1.25rem; border-radius: var(--border-radius); font-weight: 600; cursor: pointer; transition: transform 0.2s, opacity 0.2s; }
.btn-cta:hover { opacity: 0.9; transform: translateY(-1px); }
.btn-secondary { background: transparent; color: #fff; border: 1px solid rgba(255,255,255,0.2); padding: 0.65rem 1.25rem; border-radius: var(--border-radius); font-weight: 600; cursor: pointer; }

.cloned-hero { padding: 5rem 1.5rem; text-align: center; background: radial-gradient(circle at center, rgba(99,102,241,0.18) 0%, transparent 70%); }
.hero-content { max-width: 800px; margin: 0 auto; }
.hero-heading { font-size: 3rem; font-weight: 800; margin-bottom: 1rem; line-height: 1.2; }
.hero-subheading { font-size: 1.2rem; color: #94a3b8; margin-bottom: 2rem; }
.hero-actions { display: flex; gap: 1rem; justify-content: center; }

.section-container { max-width: 1100px; margin: 0 auto; padding: 4rem 1.5rem; text-align: center; }
.section-heading { font-size: 2.2rem; font-weight: 700; margin-bottom: 0.5rem; }
.section-subheading { font-size: 1.05rem; color: #94a3b8; margin-bottom: 2.5rem; }

.features-grid, .pricing-grid, .testimonials-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.75rem; }
.feature-card, .pricing-card, .testimonial-card { background: rgba(30, 41, 59, 0.6); border: 1px solid rgba(255,255,255,0.08); padding: 2rem; border-radius: var(--border-radius); text-align: left; }
.feature-icon, .testimonial-icon { font-size: 2.2rem; margin-bottom: 1rem; }
.feature-card h3, .pricing-card h3, .testimonial-card h3 { font-size: 1.25rem; margin-bottom: 0.5rem; }
.price-tag { font-size: 2rem; font-weight: 800; color: var(--primary-color); margin: 0.75rem 0; }

.cloned-footer { background: #090d16; border-top: 1px solid rgba(255,255,255,0.08); padding: 2.5rem 1.5rem; }
.footer-container { max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; }
.copyright { font-size: 0.88rem; color: #64748b; }
.footer-links { display: flex; gap: 1.25rem; }
.footer-links a { color: #94a3b8; text-decoration: none; font-size: 0.88rem; }

@media (max-width: 768px) {
  .hero-heading { font-size: 2.2rem; }
  .nav-links { display: none; }
  .nav-links.open { display: flex; flex-direction: column; position: absolute; top: 100%; left: 0; right: 0; background: #0f172a; padding: 1rem; }
  .mobile-toggle { display: block; }
}
`;

    // Construct 100% self-contained standalone HTML bundle for iframe sandbox
    const previewHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${meta.title || 'Generated React App'}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
  <style>${cssCode}</style>
</head>
<body>
  <div id="root" class="cloned-app-wrapper">
    ${previewSectionsHtml.join('\n    ')}
  </div>
</body>
</html>`;

    return {
      files: {
        'src/components/Navbar.jsx': navbarCode,
        ...componentCodes,
        'src/App.jsx': appCode,
        'src/App.css': cssCode
      },
      previewHtml
    };
  }
}
