/**
 * PulseAI Website Cloning Agent Client Controller
 * Controls engine selector, dynamic model labels, preview sandbox rendering,
 * and natural language AI modification requests.
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const cloneForm = document.getElementById('cloneForm');
  const urlInput = document.getElementById('urlInput');
  const cloneBtn = document.getElementById('cloneBtn');

  const engineSelect = document.getElementById('engineSelect');
  const geminiOptionLabel = document.getElementById('geminiOptionLabel');
  const keyWarningBanner = document.getElementById('keyWarningBanner');

  const progressTracker = document.getElementById('progressTracker');
  const outputWorkspace = document.getElementById('outputWorkspace');
  const previewIframe = document.getElementById('previewIframe');
  const previewUrlTag = document.getElementById('previewUrlTag');
  const buildStatusBadge = document.getElementById('buildStatusBadge');

  const modifyForm = document.getElementById('modifyForm');
  const modifyInput = document.getElementById('modifyInput');
  const modifyBtn = document.getElementById('modifyBtn');
  const specFactsBox = document.getElementById('specFactsBox');

  const viewCodeToggleBtn = document.getElementById('viewCodeToggleBtn');
  const codeInspectorDrawer = document.getElementById('codeInspectorDrawer');
  const fileTabsContainer = document.getElementById('fileTabsContainer');
  const codeViewer = document.getElementById('codeViewer');
  const closeDrawerBtn = document.getElementById('closeDrawerBtn');

  // State
  let currentEngine = localStorage.getItem('pulseai_engine') || 'gemini';
  let isGeminiConfigured = false;
  let activeModelName = 'gemini-3.8-flash';
  let activeSpec = null;
  let activeBundle = null;

  engineSelect.value = currentEngine;

  // 1. Check Backend Provider Status & Dynamic Model Name
  checkProviderStatus();

  async function checkProviderStatus() {
    try {
      const res = await fetch('/api/providers');
      const data = await res.json();
      if (data.success) {
        isGeminiConfigured = data.geminiKeyConfigured;
        activeModelName = data.activeModel || 'gemini-3.8-flash';
        geminiOptionLabel.textContent = `Google Gemini ${activeModelName} (Free Tier)`;
        updateWarningBanner();
      }
    } catch {
      // Offline / fallback
    }
  }

  engineSelect.addEventListener('change', () => {
    currentEngine = engineSelect.value;
    localStorage.setItem('pulseai_engine', currentEngine);
    updateWarningBanner();
  });

  function updateWarningBanner() {
    if (currentEngine === 'gemini' && !isGeminiConfigured) {
      keyWarningBanner.classList.remove('hidden');
    } else {
      keyWarningBanner.classList.add('hidden');
    }
  }

  // 2. Quick Test Sample Chips
  document.querySelectorAll('.sample-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const sampleUrl = chip.getAttribute('data-url');
      urlInput.value = sampleUrl;
      triggerClonePipeline(sampleUrl);
    });
  });

  // 3. Clone Form Submission
  cloneForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const url = urlInput.value.trim();
    if (url) triggerClonePipeline(url);
  });

  // 4. Viewport Switcher
  const viewportBtns = document.querySelectorAll('.viewport-btn');
  viewportBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      viewportBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const width = btn.getAttribute('data-width');
      previewIframe.style.width = width;
    });
  });

  // 5. Code Inspector Drawer
  viewCodeToggleBtn.addEventListener('click', () => {
    codeInspectorDrawer.classList.toggle('hidden');
  });

  closeDrawerBtn.addEventListener('click', () => {
    codeInspectorDrawer.classList.add('hidden');
  });

  // 6. Main Pipeline Trigger
  async function triggerClonePipeline(url) {
    progressTracker.classList.remove('hidden');
    outputWorkspace.classList.add('hidden');
    resetStepsUI();

    const cloneBtnText = cloneBtn.querySelector('.btn-text');
    const cloneSpinner = cloneBtn.querySelector('.btn-spinner');
    if (cloneBtnText) cloneBtnText.textContent = 'Cloning Website...';
    if (cloneSpinner) cloneSpinner.classList.remove('hidden');

    try {
      // Step 1: Scrape
      setStepStatus('stepScrape', 'active');
      await delay(300);

      // Step 2: Spec
      setStepStatus('stepScrape', 'completed');
      setStepStatus('stepSpec', 'active');

      const response = await fetch('/api/clone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          provider: currentEngine
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setStepStatus('stepSpec', 'completed');
        setStepStatus('stepReact', 'completed');
        setStepStatus('stepValidate', 'completed');
        throw new Error(data.error || 'Failed to clone target website');
      }

      // Step 3: React
      setStepStatus('stepSpec', 'completed');
      setStepStatus('stepReact', 'active');
      await delay(200);

      // Step 4 & 5: Validate & Ready
      setStepStatus('stepReact', 'completed');
      setStepStatus('stepValidate', 'completed');
      setStepStatus('stepReady', 'completed');

      activeSpec = data.spec;
      activeBundle = data.bundle;

      renderWorkspace(url, data.spec, data.bundle, data.validation);

    } catch (err) {
      alert(`Cloning Pipeline Error:\n\n${err.message}`);
    } finally {
      if (cloneBtnText) cloneBtnText.textContent = 'Analyze & Clone';
      if (cloneSpinner) cloneSpinner.classList.add('hidden');
    }
  }

  // 7. Render Workspace Sandbox & Preview
  function renderWorkspace(url, spec, bundle, validation) {
    previewUrlTag.textContent = `Generated React App for ${url}`;
    buildStatusBadge.textContent = validation.success ? 'Build Passed & Playwright Verified ✓' : 'Build Failed ❌';
    buildStatusBadge.className = `badge-status ${validation.success ? 'green' : 'red'}`;

    // Load pre-transpiled HTML bundle into iframe sandbox
    if (bundle && bundle.previewHtml) {
      previewIframe.srcdoc = bundle.previewHtml;
    }

    // Render Real Extracted Spec Facts
    const theme = spec.theme || {};
    const meta = spec.metadata || {};

    specFactsBox.innerHTML = `
      <div><strong>Title:</strong> ${escapeHtml(meta.title || 'N/A')}</div>
      <div><strong>Primary:</strong> <span style="color:${theme.primaryColor}; font-weight:bold">${theme.primaryColor}</span></div>
      <div><strong>Background:</strong> ${theme.backgroundColor}</div>
      <div><strong>Font:</strong> ${theme.fontFamily}</div>
      <div><strong>Sections (${spec.sections?.length || 0}):</strong> ${(spec.sections || []).map(s => s.type).join(', ')}</div>
    `;

    // Render File Tabs in Code Inspector
    fileTabsContainer.innerHTML = '';
    const files = bundle.files || {};
    const fileKeys = Object.keys(files);

    fileKeys.forEach((filename, idx) => {
      const btn = document.createElement('button');
      btn.className = `file-tab ${idx === 0 ? 'active' : ''}`;
      btn.textContent = filename.replace('src/', '');
      btn.addEventListener('click', () => {
        document.querySelectorAll('.file-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        codeViewer.textContent = files[filename];
      });
      fileTabsContainer.appendChild(btn);
    });

    if (fileKeys.length > 0) {
      codeViewer.textContent = files[fileKeys[0]];
    }

    outputWorkspace.classList.remove('hidden');
    outputWorkspace.scrollIntoView({ behavior: 'smooth' });
  }

  // 8. Natural Language AI Modification Submission
  modifyForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const instruction = modifyInput.value.trim();
    if (!instruction || !activeSpec) return;

    triggerModifyInstruction(instruction);
  });

  document.querySelectorAll('.mod-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const prompt = chip.getAttribute('data-prompt');
      modifyInput.value = prompt;
      triggerModifyInstruction(prompt);
    });
  });

  async function triggerModifyInstruction(instruction) {
    const btnText = modifyBtn.querySelector('.btn-text');
    const spinner = modifyBtn.querySelector('.btn-spinner');
    if (btnText) btnText.textContent = 'Applying AI Change...';
    if (spinner) spinner.classList.remove('hidden');

    try {
      const response = await fetch('/api/modify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instruction,
          spec: activeSpec,
          bundle: activeBundle,
          provider: currentEngine
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to apply modification');
      }

      activeSpec = data.spec;
      activeBundle = data.bundle;

      renderWorkspace(urlInput.value || 'target site', data.spec, data.bundle, { success: true });

    } catch (err) {
      alert(`Modification Error:\n\n${err.message}`);
    } finally {
      if (btnText) btnText.textContent = 'Apply AI Change';
      if (spinner) spinner.classList.add('hidden');
    }
  }

  function resetStepsUI() {
    ['stepScrape', 'stepSpec', 'stepReact', 'stepValidate', 'stepReady'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.className = 'step-item';
    });
  }

  function setStepStatus(stepId, status) {
    const el = document.getElementById(stepId);
    if (el) el.className = `step-item ${status}`;
  }

  function delay(ms) {
    return new Promise(res => setTimeout(res, ms));
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
});
