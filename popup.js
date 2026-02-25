// popup.js — Main orchestrator

// Programmatic content script injection helper
async function ensureContentScript(tabId) {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, { action: "ping" }, (response) => {
      if (chrome.runtime.lastError || !response) {
        chrome.scripting.executeScript({
          target: { tabId: tabId },
          files: ['content.js']
        }).then(() => resolve()).catch((err) => {
          console.error('[SEO Analyzer] Content script injection failed:', err.message);
          resolve();
        });
      } else {
        resolve();
      }
    });
  });
}

async function getPageData(tabId) {
  await ensureContentScript(tabId);
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, { action: "analyzePage" }, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else if (response) {
        resolve(response);
      } else {
        reject(new Error(i18n('contentScriptNoResponse')));
      }
    });
  });
}

// Theme management
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const btn = document.getElementById('themeToggle');
  if (btn) btn.textContent = theme === 'dark' ? '☾' : '☀';
}

function initTheme() {
  chrome.storage.local.get('theme', (result) => {
    applyTheme(result.theme || 'light');
  });
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.classList.add('theme-transitioning');
  applyTheme(next);
  chrome.storage.local.set({ theme: next });
  setTimeout(() => document.documentElement.classList.remove('theme-transitioning'), 400);
}

// Entry point
document.addEventListener('DOMContentLoaded', async () => {
  // i18n
  applyI18n();

  // Theme
  initTheme();
  safeAddEventListener('themeToggle', 'click', toggleTheme);

  // Tab switching
  const tabs = Array.from(document.querySelectorAll('.nav-tabs li'));

  function activateTab(tab) {
    tabs.forEach(t => {
      t.classList.remove('active');
      t.setAttribute('aria-selected', 'false');
      t.setAttribute('tabindex', '-1');
    });
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

    tab.classList.add('active');
    tab.setAttribute('aria-selected', 'true');
    tab.setAttribute('tabindex', '0');
    tab.focus();

    // Scroll active tab into view
    tab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });

    const tabContent = document.getElementById(tab.getAttribute('data-tab'));
    if (tabContent) tabContent.classList.add('active');
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', () => activateTab(tab));
    tab.addEventListener('keydown', (e) => {
      const idx = tabs.indexOf(tab);
      let target = null;
      if (e.key === 'ArrowRight') target = tabs[(idx + 1) % tabs.length];
      else if (e.key === 'ArrowLeft') target = tabs[(idx - 1 + tabs.length) % tabs.length];
      else if (e.key === 'Home') target = tabs[0];
      else if (e.key === 'End') target = tabs[tabs.length - 1];
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activateTab(tab); }

      if (target) { e.preventDefault(); activateTab(target); }
    });
  });

  // Export dropdown
  const exportToggle = document.getElementById('exportToggle');
  const exportMenu = document.getElementById('exportMenu');
  if (exportToggle && exportMenu) {
    exportToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = !exportMenu.classList.contains('hidden');
      exportMenu.classList.toggle('hidden');
      exportToggle.setAttribute('aria-expanded', String(!isOpen));
    });

    // Close on outside click
    document.addEventListener('click', () => {
      exportMenu.classList.add('hidden');
      exportToggle.setAttribute('aria-expanded', 'false');
    });

    // Keyboard: Escape to close, arrow keys to navigate
    exportMenu.addEventListener('keydown', (e) => {
      const items = Array.from(exportMenu.querySelectorAll('.export-menu-item'));
      const idx = items.indexOf(document.activeElement);
      if (e.key === 'Escape') {
        exportMenu.classList.add('hidden');
        exportToggle.setAttribute('aria-expanded', 'false');
        exportToggle.focus();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        items[(idx + 1) % items.length]?.focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        items[(idx - 1 + items.length) % items.length]?.focus();
      }
    });
  }

  // Retry button
  safeAddEventListener('retryAnalysisButton', 'click', () => location.reload());

  // Load page data
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const data = await getPageData(tab.id);
    displayResults(data);

    // Geçmiş kaydet ve trend göster
    saveAndDisplayHistory(tab.url, _lastScoreResult?.score || 0);

    // Crawlability analizi (async, sonradan yüklenir)
    loadCrawlabilityData(tab.id);

    // Redirect chain analizi (async)
    loadRedirectChain(tab.url);

    // Broken link check butonu
    setupLinkCheckButton(data);

    // Competitor comparison
    setupCompareButton(data);
  } catch (error) {
    showError(i18n('errorMessage'));
  }
});

// ── SEO History / Trend ──
const MAX_HISTORY = 30;

function getHistoryKey(url) {
  // Normalize: remove hash, trailing slash
  try {
    const u = new URL(url);
    u.hash = '';
    let path = u.pathname.replace(/\/+$/, '') || '/';
    return `history_${u.origin}${path}${u.search}`;
  } catch {
    return `history_${url}`;
  }
}

async function saveAndDisplayHistory(url, score) {
  const key = getHistoryKey(url);

  chrome.storage.local.get(key, (result) => {
    const history = result[key] || [];

    // Add current entry
    history.push({
      score,
      date: new Date().toISOString(),
      timestamp: Date.now()
    });

    // Keep only last MAX_HISTORY entries
    while (history.length > MAX_HISTORY) history.shift();

    chrome.storage.local.set({ [key]: history });

    // Display trend if more than 1 entry
    if (history.length > 1) {
      displayTrend(history);
    }
  });
}

function displayTrend(history) {
  const section = document.getElementById('trendSection');
  const chartEl = document.getElementById('trendChart');
  const metaEl = document.getElementById('trendMeta');
  if (!section || !chartEl) return;

  section.classList.remove('hidden');

  // SVG mini sparkline chart
  const width = 520;
  const height = 80;
  const padding = 4;
  const scores = history.map(h => h.score);
  const min = Math.max(0, Math.min(...scores) - 10);
  const max = Math.min(100, Math.max(...scores) + 10);
  const range = max - min || 1;

  const points = scores.map((s, i) => {
    const x = padding + (i / (scores.length - 1)) * (width - padding * 2);
    const y = height - padding - ((s - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  });

  const latest = scores[scores.length - 1];
  const previous = scores[scores.length - 2];
  const diff = latest - previous;
  const lineColor = diff >= 0 ? 'var(--bar-good)' : 'var(--bar-poor)';

  chartEl.innerHTML = `
    <svg width="100%" height="${height}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
      <polyline
        fill="none"
        stroke="${lineColor}"
        stroke-width="2"
        stroke-linejoin="round"
        stroke-linecap="round"
        points="${points.join(' ')}"
      />
      ${scores.map((s, i) => {
        const x = padding + (i / (scores.length - 1)) * (width - padding * 2);
        const y = height - padding - ((s - min) / range) * (height - padding * 2);
        return `<circle cx="${x}" cy="${y}" r="3" fill="${lineColor}" />`;
      }).join('')}
    </svg>
  `;

  if (metaEl) {
    const diffText = diff > 0 ? `+${diff}` : String(diff);
    const diffClass = diff > 0 ? 'good' : diff < 0 ? 'poor' : '';
    const firstDate = new Date(history[0].date).toLocaleDateString();
    metaEl.innerHTML = `
      <span class="trend-change score ${diffClass}">${diffText}</span>
      <span class="text-muted text-sm">${i18n('records', String(history.length), firstDate)}</span>
    `;
  }
}

function loadRedirectChain(pageUrl) {
  chrome.runtime.sendMessage({ action: 'checkRedirectChain', url: pageUrl }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('[SEO Analyzer] Redirect chain check failed:', chrome.runtime.lastError.message);
      return;
    }
    if (!response) return;
    displayRedirectChain(response);
  });
}

function setupLinkCheckButton(data) {
  const btn = document.getElementById('checkLinksBtn');
  if (!btn || !data.links) return;

  btn.addEventListener('click', () => {
    // Unique URLs
    const uniqueUrls = [...new Set(data.links.map(l => l.url))];
    btn.disabled = true;
    btn.textContent = i18n('checkLinksRunning');

    chrome.runtime.sendMessage({ action: 'checkLinks', urls: uniqueUrls }, (response) => {
      btn.disabled = false;

      if (chrome.runtime.lastError) {
        console.error('[SEO Analyzer] Link check failed:', chrome.runtime.lastError.message);
        btn.textContent = i18n('linkCheckError');
        return;
      }
      if (!response) {
        btn.textContent = i18n('linkCheckError');
        return;
      }
      btn.textContent = i18n('checkLinks');
      displayLinkCheckResults(response);
    });
  });
}

function setupCompareButton(currentData) {
  const btn = document.getElementById('compareBtn');
  const input = document.getElementById('competitorUrl');
  if (!btn || !input) return;

  btn.addEventListener('click', () => {
    const url = input.value.trim();
    if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) {
      const errorEl = document.getElementById('compareError');
      if (errorEl) {
        errorEl.classList.remove('hidden');
        errorEl.innerHTML = `<div class="heading-alert heading-alert-error"><span class="heading-alert-icon">!</span> ${i18n('invalidUrlError')}</div>`;
      }
      return;
    }

    const loadingEl = document.getElementById('compareLoading');
    const errorEl = document.getElementById('compareError');
    const resultsEl = document.getElementById('compareResults');

    if (loadingEl) loadingEl.classList.remove('hidden');
    if (errorEl) errorEl.classList.add('hidden');
    if (resultsEl) resultsEl.classList.add('hidden');
    btn.disabled = true;

    chrome.runtime.sendMessage({ action: 'analyzeCompetitor', url }, (response) => {
      if (loadingEl) loadingEl.classList.add('hidden');
      btn.disabled = false;

      if (chrome.runtime.lastError || !response || response.error) {
        if (errorEl) {
          errorEl.classList.remove('hidden');
          const errorCode = response?.error || 'error_network';
          const errorMsg = i18n(errorCode) !== errorCode ? i18n(errorCode) : escapeHtml(errorCode);
          errorEl.innerHTML = `<div class="heading-alert heading-alert-error"><span class="heading-alert-icon">!</span> ${errorMsg}</div>`;
        }
        return;
      }

      displayComparison(currentData, response);
    });
  });
}

function loadCrawlabilityData(tabId) {
  chrome.tabs.sendMessage(tabId, { action: "analyzeCrawlability" }, (response) => {
    const loadingEl = document.getElementById('crawlLoading');
    const resultsEl = document.getElementById('crawlResults');
    if (loadingEl) loadingEl.classList.add('hidden');
    if (resultsEl) resultsEl.classList.remove('hidden');

    if (chrome.runtime.lastError || !response) {
      const robotsEl = document.getElementById('robotsResult');
      if (robotsEl) robotsEl.innerHTML = `<div class="heading-alert heading-alert-warning"><span class="heading-alert-icon">!</span> ${i18n('crawlDataError')}</div>`;
      return;
    }
    updateCrawlability(response);
  });
}
