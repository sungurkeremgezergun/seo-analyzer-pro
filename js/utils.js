// Shared utility functions

// XSS protection helper
function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// DOM element safe access helper
function safeElementUpdate(id, updateFunction) {
  const element = document.getElementById(id);
  if (element && typeof updateFunction === 'function') {
    updateFunction(element);
  }
}

// Safe event listener attachment
function safeAddEventListener(elementId, eventType, handler) {
  const element = document.getElementById(elementId);
  if (element) {
    element.addEventListener(eventType, handler);
    return true;
  }
  return false;
}

// i18n helper — translate message key, with optional substitutions
function i18n(key, ...subs) {
  if (typeof chrome !== 'undefined' && chrome.i18n) {
    return chrome.i18n.getMessage(key, subs) || key;
  }
  return key;
}

// Apply i18n to all elements with data-i18n attribute
function applyI18n() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const msg = i18n(key);
    if (msg && msg !== key) el.textContent = msg;
  });
}

// Centralized error handler
function handleError(error, context) {
  const message = error?.message || String(error);
  console.error(`[SEO Analyzer] ${context}: ${message}`);

  // Show user-visible error if showError is available
  if (typeof showError === 'function' && context === 'analysis') {
    showError(i18n('errorMessage'));
  }

  return { error: true, context, message };
}

// Safe async wrapper — prevents unhandled promise rejections
function safeAsync(fn, context) {
  return async function (...args) {
    try {
      return await fn.apply(this, args);
    } catch (error) {
      return handleError(error, context || fn.name || 'unknown');
    }
  };
}

// Initialize collapsible click handlers within a container (or document)
// Uses event delegation to avoid duplicate listeners
// SVG chevron for collapsible headers
const CHEVRON_SVG = '<svg class="collapsible-chevron" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 6 8 10 12 6"/></svg>';

function initCollapsibles(container) {
  const root = container || document;
  root.querySelectorAll('.collapsible-header').forEach(header => {
    // Avoid binding multiple times
    if (header.dataset.collapsibleBound) return;
    header.dataset.collapsibleBound = 'true';
    header.setAttribute('role', 'button');
    header.setAttribute('tabindex', '0');
    header.setAttribute('aria-expanded', 'false');

    // Replace text arrow with SVG chevron
    const arrow = header.querySelector('span:last-child');
    if (arrow && (arrow.textContent.trim() === '▼' || arrow.textContent.trim() === '▲')) {
      arrow.innerHTML = CHEVRON_SVG;
    }

    function toggle() {
      const collapsible = header.parentElement;
      const isOpen = collapsible.classList.toggle('open');
      header.setAttribute('aria-expanded', String(isOpen));
    }

    header.addEventListener('click', toggle);
    header.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggle();
      }
    });
  });
}

// Format byte values to human-readable string
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// CSV cell escape (handles commas, quotes, newlines)
function csvEscape(value) {
  if (value == null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}
