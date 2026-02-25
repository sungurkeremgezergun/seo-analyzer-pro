// CSV, PDF, JSON export and clipboard copy functionality

let exportListenersAdded = false;

function addExportListeners() {
  if (exportListenersAdded) return;
  safeAddEventListener('export-csv', 'click', exportToCSV);
  safeAddEventListener('export-pdf', 'click', exportToPDF);
  safeAddEventListener('export-json', 'click', exportToJSON);
  safeAddEventListener('export-clipboard', 'click', copyToClipboard);
  exportListenersAdded = true;
}

// ── Download helper ──
function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ── CSV Export (kapsamlı — tüm tablar) ──
async function exportToCSV() {
  try {
    const data = _lastAnalysisData;
    const scoreResult = _lastScoreResult;
    if (!data) return;

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const rows = [];
    rows.push(['Section', 'Type', 'Value', 'Details']);

    // Overview
    rows.push(['Overview', 'URL', csvEscape(data.basicSeo?.url || tab.url), '']);
    rows.push(['Overview', 'SEO Score', scoreResult?.score || 0, '']);
    rows.push(['Overview', 'Title', csvEscape(data.basicSeo?.title?.content || ''), data.basicSeo?.title?.length || 0]);
    rows.push(['Overview', 'Meta Description', csvEscape(data.basicSeo?.metaDescription || ''), data.basicSeo?.metaDescription?.length || 0]);
    rows.push(['Overview', 'Canonical', csvEscape(data.basicSeo?.canonical || ''), '']);
    rows.push(['Overview', 'Meta Robots', csvEscape(data.basicSeo?.robots || ''), '']);
    rows.push(['Overview', 'Word Count', data.wordCount || 0, '']);

    // Score Breakdown
    if (scoreResult?.breakdown) {
      Object.entries(scoreResult.breakdown).forEach(([key, cat]) => {
        rows.push(['Score', csvEscape(cat.label), `${cat.score}/${cat.max}`, `${Math.round((cat.score / cat.max) * 100)}%`]);
      });
    }

    // Security
    if (data.security) {
      rows.push(['Security', 'HTTPS', data.security.isHttps ? 'Yes' : 'No', '']);
      rows.push(['Security', 'Mixed Content', data.security.mixedContentCount, '']);
    }

    // Headings (sayı + text)
    if (data.headings) {
      for (let i = 1; i <= 6; i++) {
        const items = data.headings[`h${i}`] || [];
        rows.push(['Headings', `H${i} Count`, items.length, '']);
        items.forEach(h => {
          rows.push(['Headings', `H${i}`, csvEscape(h.text), h.length]);
        });
      }
    }

    // Links
    if (data.links) {
      const internal = data.links.filter(l => l.isInternal);
      const external = data.links.filter(l => !l.isInternal);
      rows.push(['Links', 'Total', data.links.length, '']);
      rows.push(['Links', 'Internal', internal.length, '']);
      rows.push(['Links', 'External', external.length, '']);
      rows.push(['Links', 'Unique', new Set(data.links.map(l => l.url)).size, '']);

      data.links.forEach(link => {
        rows.push(['Links', link.isInternal ? 'Internal' : 'External', csvEscape(link.url), csvEscape(link.text) + (link.nofollow ? ' [nofollow]' : '')]);
      });
    }

    // Images
    if (data.images) {
      const withAlt = data.images.filter(img => img.alt);
      rows.push(['Images', 'Total', data.images.length, '']);
      rows.push(['Images', 'With Alt', withAlt.length, '']);
      rows.push(['Images', 'Without Alt', data.images.length - withAlt.length, '']);

      data.images.forEach(img => {
        rows.push(['Images', img.alt ? 'Has Alt' : 'No Alt', csvEscape(img.src), csvEscape(img.alt || '')]);
      });
    }

    // Schema
    if (data.schema) {
      const jsonLd = data.schema.jsonLd || {};
      Object.entries(jsonLd).forEach(([type, items]) => {
        rows.push(['Schema', 'JSON-LD', type, `${items.length} item(s)`]);
      });
      (data.schema.microdata || []).forEach(item => {
        rows.push(['Schema', 'Microdata', item.type, '']);
      });
      (data.schema.rdfa || []).forEach(item => {
        rows.push(['Schema', 'RDFa', item.type, '']);
      });
    }

    // Social / OG
    if (data.social?.og) {
      Object.entries(data.social.og).forEach(([key, val]) => {
        if (val) rows.push(['Social', `og:${key}`, csvEscape(val), '']);
      });
    }
    if (data.social?.twitter) {
      Object.entries(data.social.twitter).forEach(([key, val]) => {
        if (val) rows.push(['Social', `twitter:${key}`, csvEscape(val), '']);
      });
    }

    // Performance / Web Vitals
    if (data.webVitals) {
      rows.push(['Performance', 'DOM Content Loaded', data.webVitals.domContentLoaded + 'ms', '']);
      rows.push(['Performance', 'FCP', data.webVitals.fcp != null ? data.webVitals.fcp + 'ms' : 'N/A', '']);
      rows.push(['Performance', 'DOM Elements', data.webVitals.domElementCount, '']);
      rows.push(['Performance', 'Blocking Resources', data.webVitals.blockingResourceCount, '']);
      rows.push(['Performance', 'Total Transfer Size', formatBytes(data.webVitals.totalTransferSize), '']);
      rows.push(['Performance', 'Total Resources', data.webVitals.resourceCount, '']);
    }

    // Keywords
    if (data.keywordAnalysis) {
      const kw = data.keywordAnalysis;
      rows.push(['Keywords', 'Total Words', kw.totalWords, '']);
      rows.push(['Keywords', 'Avg Sentence Length', kw.avgSentenceLen, '']);
      rows.push(['Keywords', 'Avg Word Length', kw.avgWordLen, '']);

      kw.unigrams?.forEach(k => {
        rows.push(['Keywords', '1-gram', csvEscape(k.word), `count:${k.count} density:${k.density}%`]);
      });
      kw.bigrams?.forEach(k => {
        rows.push(['Keywords', '2-gram', csvEscape(k.word), `count:${k.count} density:${k.density}%`]);
      });
      kw.trigrams?.forEach(k => {
        rows.push(['Keywords', '3-gram', csvEscape(k.word), `count:${k.count} density:${k.density}%`]);
      });
    }

    // Hreflang
    if (data.hreflang?.tags?.length > 0) {
      data.hreflang.tags.forEach(tag => {
        rows.push(['Hreflang', tag.lang, csvEscape(tag.url), tag.status]);
      });
    }

    const csvContent = rows.map(row => row.join(',')).join('\n');
    downloadFile('\ufeff' + csvContent, 'seo-analysis.csv', 'text/csv;charset=utf-8;');
  } catch (error) {
    console.error('CSV export error:', error);
  }
}

// ── Lazy load jsPDF ──
let _jsPDFLoaded = false;
function loadJsPDF() {
  return new Promise((resolve, reject) => {
    if (_jsPDFLoaded || window.jspdf) {
      _jsPDFLoaded = true;
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'jspdf.min.js';
    script.onload = () => { _jsPDFLoaded = true; resolve(); };
    script.onerror = () => reject(new Error(i18n('jspdfLoadError')));
    document.head.appendChild(script);
  });
}

// ── PDF Export (skor breakdown + detaylı) ──
async function exportToPDF() {
  try {
    await loadJsPDF();
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const data = _lastAnalysisData;
    const scoreResult = _lastScoreResult;
    if (!data) return;

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const pageUrl = data.basicSeo?.url || tab.url;

    let y = 20;
    const leftMargin = 15;
    const pageWidth = 180;

    function checkPage(needed) {
      if (y + needed > 275) { doc.addPage(); y = 20; }
    }

    // ── Header ──
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text('SEO Analysis Report', leftMargin, y);
    y += 10;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(100);
    doc.text(pageUrl, leftMargin, y, { maxWidth: pageWidth });
    y += 6;
    doc.text(`Date: ${new Date().toLocaleDateString()}`, leftMargin, y);
    y += 10;
    doc.setTextColor(0);

    // ── Score ──
    const score = scoreResult?.score || 0;
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text(`SEO Score: ${score}/100`, leftMargin, y);
    y += 10;

    // Score breakdown bars
    if (scoreResult?.breakdown) {
      doc.setFontSize(9);
      Object.entries(scoreResult.breakdown).forEach(([, cat]) => {
        checkPage(10);
        const percent = Math.round((cat.score / cat.max) * 100);

        doc.setFont(undefined, 'normal');
        doc.text(`${cat.label}`, leftMargin, y);
        doc.text(`${cat.score}/${cat.max}`, leftMargin + 120, y);

        // Bar background
        const barX = leftMargin + 55;
        const barW = 60;
        const barH = 4;
        doc.setFillColor(230, 230, 230);
        doc.rect(barX, y - 3, barW, barH, 'F');

        // Bar fill
        if (percent >= 80) doc.setFillColor(19, 115, 51);
        else if (percent >= 50) doc.setFillColor(176, 96, 0);
        else doc.setFillColor(197, 34, 31);
        doc.rect(barX, y - 3, barW * (percent / 100), barH, 'F');

        y += 7;
      });
      y += 5;
    }

    // ── Overview Section ──
    checkPage(20);
    doc.setFontSize(13);
    doc.setFont(undefined, 'bold');
    doc.text('Overview', leftMargin, y);
    y += 7;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');

    const overviewItems = [
      ['Title', data.basicSeo?.title?.content || '', `${data.basicSeo?.title?.length || 0} chars`],
      ['Meta Description', data.basicSeo?.metaDescription || 'Missing', `${data.basicSeo?.metaDescription?.length || 0} chars`],
      ['Canonical', data.basicSeo?.canonical || 'Not set', ''],
      ['Robots', data.basicSeo?.robots || 'Not specified', ''],
      ['HTTPS', data.security?.isHttps ? 'Yes' : 'No', data.security?.mixedContentCount ? `${data.security.mixedContentCount} mixed` : ''],
      ['Word Count', String(data.wordCount || 0), '']
    ];

    overviewItems.forEach(([label, value, detail]) => {
      checkPage(12);
      doc.setFont(undefined, 'bold');
      doc.text(`${label}:`, leftMargin, y);
      doc.setFont(undefined, 'normal');
      const lines = doc.splitTextToSize(`${value} ${detail}`.trim(), pageWidth - 40);
      doc.text(lines, leftMargin + 40, y);
      y += lines.length * 4.5 + 2;
    });
    y += 5;

    // ── Headings ──
    checkPage(15);
    doc.setFontSize(13);
    doc.setFont(undefined, 'bold');
    doc.text('Headings', leftMargin, y);
    y += 7;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');

    if (data.headings) {
      let headingSummary = '';
      for (let i = 1; i <= 6; i++) {
        const count = data.headings[`h${i}`]?.length || 0;
        headingSummary += `H${i}: ${count}   `;
      }
      doc.text(headingSummary.trim(), leftMargin, y);
      y += 6;

      // H1 text
      const h1s = data.headings.h1 || [];
      h1s.forEach(h => {
        checkPage(8);
        const lines = doc.splitTextToSize(`H1: ${h.text}`, pageWidth);
        doc.text(lines, leftMargin, y);
        y += lines.length * 4.5;
      });
    }
    y += 5;

    // ── Links ──
    checkPage(15);
    doc.setFontSize(13);
    doc.setFont(undefined, 'bold');
    doc.text('Links', leftMargin, y);
    y += 7;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');

    if (data.links) {
      const internal = data.links.filter(l => l.isInternal).length;
      const external = data.links.filter(l => !l.isInternal).length;
      doc.text(`Total: ${data.links.length}  |  Internal: ${internal}  |  External: ${external}  |  Unique: ${new Set(data.links.map(l => l.url)).size}`, leftMargin, y);
      y += 8;
    }

    // ── Images ──
    checkPage(15);
    doc.setFontSize(13);
    doc.setFont(undefined, 'bold');
    doc.text('Images', leftMargin, y);
    y += 7;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');

    if (data.images) {
      const withAlt = data.images.filter(img => img.alt).length;
      doc.text(`Total: ${data.images.length}  |  With Alt: ${withAlt}  |  Without Alt: ${data.images.length - withAlt}`, leftMargin, y);
      y += 8;
    }

    // ── Performance ──
    if (data.webVitals) {
      checkPage(20);
      doc.setFontSize(13);
      doc.setFont(undefined, 'bold');
      doc.text('Performance', leftMargin, y);
      y += 7;
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');

      doc.text(`DOM Load: ${data.webVitals.domContentLoaded}ms  |  FCP: ${data.webVitals.fcp != null ? data.webVitals.fcp + 'ms' : 'N/A'}  |  DOM Elements: ${data.webVitals.domElementCount}`, leftMargin, y);
      y += 5;
      doc.text(`Blocking: ${data.webVitals.blockingResourceCount}  |  Transfer: ${formatBytes(data.webVitals.totalTransferSize)}  |  Resources: ${data.webVitals.resourceCount}`, leftMargin, y);
      y += 8;
    }

    // ── Keywords top 5 ──
    if (data.keywordAnalysis?.unigrams?.length > 0) {
      checkPage(25);
      doc.setFontSize(13);
      doc.setFont(undefined, 'bold');
      doc.text('Top Keywords', leftMargin, y);
      y += 7;
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');

      data.keywordAnalysis.unigrams.slice(0, 5).forEach(k => {
        checkPage(6);
        doc.text(`${k.word}  —  ${k.count}x  (${k.density}%)`, leftMargin, y);
        y += 5;
      });
      y += 5;
    }

    // ── Social ──
    if (data.social?.og || data.social?.twitter) {
      checkPage(20);
      doc.setFontSize(13);
      doc.setFont(undefined, 'bold');
      doc.text('Social Meta', leftMargin, y);
      y += 7;
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');

      if (data.social.og) {
        const ogPresent = Object.values(data.social.og).filter(Boolean).length;
        doc.text(`Open Graph: ${ogPresent}/7 fields set`, leftMargin, y);
        y += 5;
      }
      if (data.social.twitter) {
        const twPresent = Object.values(data.social.twitter).filter(Boolean).length;
        doc.text(`Twitter Card: ${twPresent}/6 fields set`, leftMargin, y);
        y += 5;
      }
      y += 3;
    }

    // ── Footer ──
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`SEO Analyzer Pro — Page ${i}/${pageCount}`, leftMargin, 290);
    }

    doc.save('seo-analysis.pdf');
  } catch (error) {
    console.error('PDF export error:', error);
  }
}

// ── JSON Export ──
async function exportToJSON() {
  try {
    const data = _lastAnalysisData;
    const scoreResult = _lastScoreResult;
    if (!data) return;

    const exportData = {
      exportDate: new Date().toISOString(),
      url: data.basicSeo?.url || '',
      score: scoreResult?.score || 0,
      scoreBreakdown: scoreResult?.breakdown || {},
      basicSeo: data.basicSeo || {},
      security: data.security || {},
      headings: data.headings || {},
      links: {
        total: data.links?.length || 0,
        internal: data.links?.filter(l => l.isInternal)?.length || 0,
        external: data.links?.filter(l => !l.isInternal)?.length || 0,
        items: data.links || []
      },
      images: {
        total: data.images?.length || 0,
        withAlt: data.images?.filter(i => i.alt)?.length || 0,
        withoutAlt: data.images?.filter(i => !i.alt)?.length || 0,
        items: data.images || []
      },
      schema: data.schema || {},
      social: data.social || {},
      hreflang: data.hreflang || {},
      webVitals: data.webVitals || {},
      keywordAnalysis: data.keywordAnalysis || {},
      wordCount: data.wordCount || 0
    };

    const json = JSON.stringify(exportData, null, 2);
    downloadFile(json, 'seo-analysis.json', 'application/json;charset=utf-8;');
  } catch (error) {
    console.error('JSON export error:', error);
  }
}

// ── Clipboard Copy (SEO özeti) ──
async function copyToClipboard() {
  try {
    const data = _lastAnalysisData;
    const scoreResult = _lastScoreResult;
    if (!data) return;

    const lines = [];
    lines.push('=== SEO Analysis Summary ===');
    lines.push(`URL: ${data.basicSeo?.url || ''}`);
    lines.push(`Score: ${scoreResult?.score || 0}/100`);
    lines.push('');

    // Breakdown
    if (scoreResult?.breakdown) {
      lines.push('--- Score Breakdown ---');
      Object.values(scoreResult.breakdown).forEach(cat => {
        const bar = '█'.repeat(Math.round((cat.score / cat.max) * 10)) + '░'.repeat(10 - Math.round((cat.score / cat.max) * 10));
        lines.push(`${cat.label}: ${bar} ${cat.score}/${cat.max}`);
      });
      lines.push('');
    }

    // Overview
    lines.push('--- Overview ---');
    lines.push(`Title: ${data.basicSeo?.title?.content || 'Missing'} (${data.basicSeo?.title?.length || 0} chars)`);
    lines.push(`Description: ${data.basicSeo?.metaDescription || 'Missing'} (${data.basicSeo?.metaDescription?.length || 0} chars)`);
    lines.push(`Canonical: ${data.basicSeo?.canonical || 'Not set'}`);
    lines.push(`HTTPS: ${data.security?.isHttps ? 'Yes' : 'No'}${data.security?.mixedContentCount ? ` (${data.security.mixedContentCount} mixed content)` : ''}`);
    lines.push(`Word Count: ${data.wordCount || 0}`);
    lines.push('');

    // Headings
    if (data.headings) {
      lines.push('--- Headings ---');
      for (let i = 1; i <= 6; i++) {
        const count = data.headings[`h${i}`]?.length || 0;
        if (count > 0) lines.push(`H${i}: ${count}`);
      }
      lines.push('');
    }

    // Links
    if (data.links) {
      lines.push('--- Links ---');
      lines.push(`Total: ${data.links.length} | Internal: ${data.links.filter(l => l.isInternal).length} | External: ${data.links.filter(l => !l.isInternal).length}`);
      lines.push('');
    }

    // Images
    if (data.images) {
      const withAlt = data.images.filter(i => i.alt).length;
      lines.push('--- Images ---');
      lines.push(`Total: ${data.images.length} | With Alt: ${withAlt} | Without Alt: ${data.images.length - withAlt}`);
      lines.push('');
    }

    // Top Keywords
    if (data.keywordAnalysis?.unigrams?.length > 0) {
      lines.push('--- Top Keywords ---');
      data.keywordAnalysis.unigrams.slice(0, 5).forEach(k => {
        lines.push(`${k.word}: ${k.count}x (${k.density}%)`);
      });
      lines.push('');
    }

    lines.push(`Generated by SEO Analyzer Pro — ${new Date().toLocaleDateString()}`);

    await navigator.clipboard.writeText(lines.join('\n'));

    // Buton feedback
    const btn = document.getElementById('export-clipboard');
    if (btn) {
      const original = btn.textContent;
      btn.textContent = i18n('copied');
      btn.disabled = true;
      setTimeout(() => {
        btn.textContent = original;
        btn.disabled = false;
      }, 2000);
    }
  } catch (error) {
    console.error('Clipboard copy error:', error);
  }
}
