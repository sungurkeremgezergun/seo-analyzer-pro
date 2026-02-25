// UI update functions for all tabs

// Global analysis data — export fonksiyonları tarafından kullanılır
let _lastAnalysisData = null;
let _lastScoreResult = null;

function showError(message) {
  document.getElementById('loading').classList.add('hidden');
  document.getElementById('results').classList.add('hidden');
  document.getElementById('error').classList.remove('hidden');
  document.getElementById('errorMessage').textContent = message;
}

function renderScoreRing(score) {
  const container = document.getElementById('scoreRing');
  if (!container) return;

  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const colorClass = score >= 80 ? 'score-ring-good' : score >= 50 ? 'score-ring-warning' : 'score-ring-poor';

  container.className = `score-ring-container ${colorClass}`;
  container.innerHTML = `
    <svg viewBox="0 0 140 140">
      <circle class="score-ring-bg" cx="70" cy="70" r="${radius}" />
      <circle class="score-ring-fill" cx="70" cy="70" r="${radius}"
        stroke-dasharray="${circumference}"
        stroke-dashoffset="${circumference}" />
    </svg>
    <div class="score-ring-text">
      <span class="score-ring-value">${score}</span>
      <span class="score-ring-label">/100</span>
    </div>
  `;

  // Animate the ring fill after render
  requestAnimationFrame(() => {
    const fillCircle = container.querySelector('.score-ring-fill');
    if (fillCircle) fillCircle.style.strokeDashoffset = offset;
  });
}

function displayResults(data) {
  document.getElementById('loading').classList.add('hidden');
  document.getElementById('results').classList.remove('hidden');

  updateOverview(data);
  updateHeadings(data.headings);
  updateHreflang(data.hreflang);
  updateLinks(data.links);
  updateImages(data.images);
  updateSchema(data.schema);
  updatePerformanceTab(data.webVitals);
  updateKeywords(data.keywordAnalysis);
  updateSocial(data);

  document.getElementById('wordCount').textContent = data.wordCount || 0;

  const result = calculateOverallScore(data);
  _lastAnalysisData = data;
  _lastScoreResult = result;

  // Render SVG score ring
  renderScoreRing(result.score);

  // Skor breakdown göster
  const breakdownContainer = document.getElementById('scoreBreakdown');
  if (breakdownContainer) {
    const categories = ['onPage', 'content', 'technical', 'linkHealth', 'performance'];
    breakdownContainer.innerHTML = categories.map(key => {
      const cat = result.breakdown[key];
      const percent = Math.round((cat.score / cat.max) * 100);
      const colorClass = percent >= 80 ? 'good' : percent >= 50 ? 'warning' : 'poor';
      return `
        <div class="breakdown-item">
          <div class="breakdown-label">
            <span>${escapeHtml(cat.label)}</span>
            <span class="breakdown-score ${colorClass}">${cat.score}/${cat.max}</span>
          </div>
          <div class="breakdown-bar">
            <div class="breakdown-fill ${colorClass}" style="width: ${percent}%"></div>
          </div>
        </div>
      `;
    }).join('');
  }

  addExportListeners();

  // Nofollow highlight button
  const highlightBtn = document.querySelector('.highlight-btn');
  if (highlightBtn) {
    highlightBtn.addEventListener('click', async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      await ensureContentScript(tab.id);
      chrome.tabs.sendMessage(tab.id, { action: "highlightNofollow" }, (response) => {
        if (response) {
          if (response.highlighted) {
            highlightBtn.textContent = i18n('nofollowHighlighted', String(response.count));
            highlightBtn.classList.add('active');
          } else {
            highlightBtn.textContent = i18n('highlightNofollow');
            highlightBtn.classList.remove('active');
          }
        }
      });
    });
  }
}

function updateOverview(data) {
  const overviewSection = document.querySelector('#overview .details-list');
  overviewSection.innerHTML = '';

  if (data.basicSeo) {
    // Title
    const titleLen = data.basicSeo.title.length;
    let titleStatus, titleHint;
    if (!data.basicSeo.title.content) {
      titleStatus = 'poor'; titleHint = i18n('missing');
    } else if (titleLen >= 30 && titleLen <= 60) {
      titleStatus = 'good'; titleHint = i18n('charsCount', String(titleLen));
    } else if ((titleLen >= 20 && titleLen < 30) || (titleLen > 60 && titleLen <= 70)) {
      titleStatus = 'non-canonical'; titleHint = i18n('charsRecommended', String(titleLen), '30-60');
    } else {
      titleStatus = 'poor'; titleHint = i18n('charsRecommended', String(titleLen), '30-60');
    }
    overviewSection.innerHTML += `
      <div class="item">
        <div class="detail-header">
          <span class="detail-label">${i18n('title')}</span>
          <span class="score ${titleStatus}">${escapeHtml(titleHint)}</span>
        </div>
        <div class="detail-content">${escapeHtml(data.basicSeo.title.content || i18n('titleNotFound'))}</div>
      </div>
    `;

    // Description
    if (data.basicSeo.metaDescription) {
      const descLength = data.basicSeo.metaDescription.length;
      let descStatus, descHint;
      if (descLength >= 70 && descLength <= 160) {
        descStatus = 'good'; descHint = i18n('charsCount', String(descLength));
      } else if ((descLength >= 50 && descLength < 70) || (descLength > 160 && descLength <= 200)) {
        descStatus = 'non-canonical'; descHint = i18n('charsRecommended', String(descLength), '70-160');
      } else {
        descStatus = 'poor'; descHint = i18n('charsRecommended', String(descLength), '70-160');
      }
      overviewSection.innerHTML += `
        <div class="item">
          <div class="detail-header">
            <span class="detail-label">${i18n('description')}</span>
            <span class="score ${descStatus}">${escapeHtml(descHint)}</span>
          </div>
          <div class="detail-content">${escapeHtml(data.basicSeo.metaDescription)}</div>
        </div>
      `;
    } else {
      overviewSection.innerHTML += `
        <div class="item">
          <div class="detail-header">
            <span class="detail-label">${i18n('description')}</span>
            <span class="score poor">${i18n('missing')}</span>
          </div>
          <div class="detail-content">${i18n('metaDescNotFound')}</div>
        </div>
      `;
    }

    // URL
    overviewSection.innerHTML += `
      <div class="item">
        <div class="detail-header">
          <span class="detail-label">URL</span>
        </div>
        <div class="detail-content">${escapeHtml(data.basicSeo.url)}</div>
      </div>
    `;

    // Canonical
    if (data.basicSeo.canonical) {
      const isMatch = data.basicSeo.canonical === data.basicSeo.url;
      const canonicalStatus = isMatch ? 'canonical' : 'non-canonical';
      const canonicalLabel = isMatch ? 'canonical' : 'non-canonical';
      overviewSection.innerHTML += `
        <div class="item">
          <div class="detail-header">
            <span class="detail-label">Canonical URL</span>
            <span class="score ${canonicalStatus}">${canonicalLabel}</span>
          </div>
          <div class="detail-content">${escapeHtml(data.basicSeo.canonical)}</div>
        </div>
      `;
    }

    // Robots
    overviewSection.innerHTML += `
      <div class="item">
        <div class="detail-header">
          <span class="detail-label">Meta Robots</span>
        </div>
        <div class="detail-content">${escapeHtml(data.basicSeo.robots || i18n('notSpecified'))}</div>
      </div>
    `;
  }

  // Security
  if (data.security) {
    let statusClass, statusIcon, statusText;
    if (!data.security.isHttps) {
      statusClass = 'poor';
      statusIcon = '🔓';
      statusText = i18n('securityHttp');
    } else if (data.security.mixedContentCount > 0) {
      statusClass = 'warning-text';
      statusIcon = '⚠';
      statusText = i18n('securityMixed', String(data.security.mixedContentCount));
    } else {
      statusClass = 'good';
      statusIcon = '🔒';
      statusText = i18n('securityHttps');
    }

    overviewSection.innerHTML += `
      <div class="item">
        <div class="detail-header">
          <span class="detail-label">${i18n('security')}</span>
          <span class="score ${statusClass}">${statusIcon} ${statusText}</span>
        </div>
        ${data.security.mixedContentCount > 0 ? `
          <div class="mixed-content-list">
            ${data.security.mixedContent.slice(0, 5).map(mc => `
              <div class="detail-content mixed-content-entry">
                <span class="score poor">${escapeHtml(mc.tag)}</span> ${escapeHtml(mc.url)}
              </div>
            `).join('')}
            ${data.security.mixedContentCount > 5 ? `<div class="detail-content" style="color:var(--text-muted);">${i18n('nMoreItems', String(data.security.mixedContentCount - 5))}</div>` : ''}
          </div>
        ` : ''}
      </div>
    `;
  }
}

function analyzeHeadingHierarchy(headings) {
  const alerts = [];
  const h1Count = headings.h1?.length || 0;

  if (h1Count === 0) {
    alerts.push({ type: 'error', message: i18n('h1Missing') });
  } else if (h1Count > 1) {
    alerts.push({ type: 'warning', message: i18n('h1Multiple', String(h1Count)) });
  } else {
    alerts.push({ type: 'success', message: i18n('h1Correct') });
  }

  // Seviye atlama kontrolü
  const usedLevels = [];
  for (let i = 1; i <= 6; i++) {
    if ((headings[`h${i}`]?.length || 0) > 0) usedLevels.push(i);
  }

  if (usedLevels.length > 1) {
    const skips = [];
    for (let i = 1; i < usedLevels.length; i++) {
      const gap = usedLevels[i] - usedLevels[i - 1];
      if (gap > 1) {
        skips.push(`H${usedLevels[i - 1]} → H${usedLevels[i]}`);
      }
    }
    if (skips.length === 0) {
      alerts.push({ type: 'success', message: i18n('hierarchyCorrect') });
    } else {
      alerts.push({ type: skips.length === 1 ? 'warning' : 'error', message: i18n('hierarchySkip', skips.join(', ')) });
    }
  }

  return alerts;
}

function updateHeadings(headings) {
  if (!headings) return;

  for (let i = 1; i <= 6; i++) {
    const count = headings[`h${i}`]?.length || 0;
    document.querySelector(`.heading-stat:nth-child(${i}) p`).textContent = count;
  }

  // Hiyerarşi uyarıları
  const alertsContainer = document.getElementById('headingAlerts');
  if (alertsContainer) {
    const alerts = analyzeHeadingHierarchy(headings);
    alertsContainer.innerHTML = alerts.map(alert => `
      <div class="heading-alert heading-alert-${alert.type}">
        <span class="heading-alert-icon">${alert.type === 'error' ? '✗' : alert.type === 'warning' ? '!' : '✓'}</span>
        ${escapeHtml(alert.message)}
      </div>
    `).join('');
  }

  const headingsList = document.querySelector('.headings-list');
  headingsList.innerHTML = '';

  for (let i = 1; i <= 6; i++) {
    const headingsOfType = headings[`h${i}`] || [];
    if (headingsOfType.length > 0) {
      headingsList.innerHTML += `
        <div class="collapsible">
          <div class="collapsible-header">
            <span>${i18n('headingsLabel', String(i))} (${headingsOfType.length})</span>
            <span>▼</span>
          </div>
          <div class="collapsible-content">
            ${headingsOfType.map(h => `
              <div class="item">
                <div class="text-sm">${escapeHtml(h.text)}</div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }
  }

  initCollapsibles(document.querySelector('.headings-list'));
}

function updateLinks(links) {
  if (!links) return;

  const stats = {
    total: links.length,
    unique: new Set(links.map(l => l.url)).size,
    internal: links.filter(l => l.isInternal).length,
    external: links.filter(l => !l.isInternal).length
  };

  document.querySelector('.links-stats .links-stat:nth-child(1) p').textContent = stats.total;
  document.querySelector('.links-stats .links-stat:nth-child(2) p').textContent = stats.unique;
  document.querySelector('.links-stats .links-stat:nth-child(3) p').textContent = stats.internal;
  document.querySelector('.links-stats .links-stat:nth-child(4) p').textContent = stats.external;

  const internalLinks = links.filter(l => l.isInternal);
  document.querySelector('.internal-links-list').innerHTML = internalLinks.map(link => `
    <div class="item">
      <div class="text-sm">${escapeHtml(link.text)}</div>
      <div class="text-sm mt-2">
        <a href="${encodeURI(link.url)}" target="_blank">${escapeHtml(link.url)}</a>
        ${link.nofollow ? '<span class="score poor">nofollow</span>' : ''}
      </div>
    </div>
  `).join('');

  const externalLinks = links.filter(l => !l.isInternal);
  document.querySelector('.external-links-list').innerHTML = externalLinks.map(link => `
    <div class="item">
      <div class="text-sm">${escapeHtml(link.text)}</div>
      <div class="text-sm mt-2">
        <a href="${encodeURI(link.url)}" target="_blank">${escapeHtml(link.url)}</a>
        ${link.nofollow ? '<span class="score poor">nofollow</span>' : ''}
      </div>
    </div>
  `).join('');

  initCollapsibles(document.getElementById('links'));
}

const IMAGES_PER_PAGE = 10;
let currentImagePage = 0;
let allImages = [];

function updateImages(images) {
  if (!images) return;

  allImages = images;
  currentImagePage = 0;

  const stats = {
    total: images.length,
    withAlt: images.filter(img => img.alt).length,
    withoutAlt: images.filter(img => !img.alt).length
  };

  document.querySelector('.images-stats .links-stat:nth-child(1) p').textContent = stats.total;
  document.querySelector('.images-stats .links-stat:nth-child(2) p').textContent = stats.withAlt;
  document.querySelector('.images-stats .links-stat:nth-child(3) p').textContent = stats.withoutAlt;

  const imagesList = document.querySelector('.images-list');
  imagesList.innerHTML = '';
  renderImagePage(imagesList);
}

function renderImageCard(img) {
  return `
    <div class="image-card">
      <img src="${encodeURI(img.src)}" alt="${escapeHtml(img.alt || '')}" loading="lazy" style="max-height:150px;object-fit:contain;">
      <div class="text-sm mt-2">
        <strong>Alt:</strong> ${img.alt ? escapeHtml(img.alt) : `<span class="score poor">${i18n('altMissing')}</span>`}
      </div>
      <div class="text-sm mt-2">
        <strong>URL:</strong> ${escapeHtml(img.src)}
      </div>
    </div>
  `;
}

function renderImagePage(container) {
  const start = 0;
  const end = (currentImagePage + 1) * IMAGES_PER_PAGE;
  const visible = allImages.slice(start, end);

  container.innerHTML = visible.map(renderImageCard).join('');

  // Remove old button if exists
  const oldBtn = container.parentElement.querySelector('.load-more-images');
  if (oldBtn) oldBtn.remove();

  // Add "load more" button if there are more images
  if (end < allImages.length) {
    const btn = document.createElement('button');
    btn.className = 'secondary-button load-more-images';
    btn.textContent = i18n('showMore', String(allImages.length - end));
    btn.addEventListener('click', () => {
      currentImagePage++;
      renderImagePage(container);
    });
    container.parentElement.appendChild(btn);
  }
}

const SCHEMA_RULES = {
  'Article': { required: ['headline', 'datePublished', 'author'], recommended: ['image', 'publisher', 'dateModified'] },
  'NewsArticle': { required: ['headline', 'datePublished', 'author'], recommended: ['image', 'publisher', 'dateModified'] },
  'BlogPosting': { required: ['headline', 'datePublished', 'author'], recommended: ['image', 'publisher', 'dateModified'] },
  'Product': { required: ['name', 'image'], recommended: ['description', 'offers', 'brand', 'review'] },
  'Organization': { required: ['name', 'url'], recommended: ['logo', 'contactPoint', 'sameAs'] },
  'LocalBusiness': { required: ['name', 'address'], recommended: ['telephone', 'openingHours', 'geo'] },
  'FAQPage': { required: ['mainEntity'], recommended: [] },
  'BreadcrumbList': { required: ['itemListElement'], recommended: [] },
  'Event': { required: ['name', 'startDate', 'location'], recommended: ['description', 'image', 'offers'] },
  'VideoObject': { required: ['name', 'description', 'thumbnailUrl', 'uploadDate'], recommended: ['duration', 'contentUrl'] },
  'WebSite': { required: ['name', 'url'], recommended: ['potentialAction'] },
  'Person': { required: ['name'], recommended: ['url', 'image', 'jobTitle'] }
};

function validateSchemaItem(type, item) {
  const rules = SCHEMA_RULES[type];
  if (!rules) return null;

  const results = [];
  rules.required.forEach(field => {
    results.push({ field, required: true, present: item[field] != null });
  });
  rules.recommended.forEach(field => {
    results.push({ field, required: false, present: item[field] != null });
  });
  return results;
}

function renderSchemaValidation(type, items) {
  const firstItem = items[0];
  const validation = validateSchemaItem(type, firstItem);
  if (!validation) return '';

  return `
    <div class="schema-validation">
      ${validation.map(v => {
        const icon = v.present ? '✅' : (v.required ? '❌' : '⚠️');
        const cls = v.present ? 'good' : (v.required ? 'poor' : 'non-canonical');
        return `<span class="schema-field score ${cls}">${icon} ${escapeHtml(v.field)}</span>`;
      }).join('')}
    </div>
  `;
}

function renderStructuredDataSection(title, items, isJsonLd) {
  if (!items || (Array.isArray(items) && items.length === 0) || (!Array.isArray(items) && Object.keys(items).length === 0)) return '';

  const entries = isJsonLd ? Object.entries(items) : items.map(item => [item.type, [item]]);
  if (entries.length === 0) return '';

  return `
    <h3 class="schema-section-title">${escapeHtml(title)}</h3>
    ${entries.map(([type, data]) => `
      <div class="collapsible">
        <div class="collapsible-header">
          <span>${escapeHtml(type)} <span class="text-muted">(${data.length})</span></span>
          <span>▼</span>
        </div>
        <div class="collapsible-content">
          ${isJsonLd ? renderSchemaValidation(type, data) : ''}
          <pre class="text-sm schema-json">${escapeHtml(JSON.stringify(isJsonLd ? data : data[0].properties, null, 2))}</pre>
        </div>
      </div>
    `).join('')}
  `;
}

function updateSchema(schema) {
  if (!schema) return;

  const schemaList = document.querySelector('.schema-list');
  const jsonLd = schema.jsonLd || schema;
  const microdata = schema.microdata || [];
  const rdfa = schema.rdfa || [];

  const hasJsonLd = Object.keys(jsonLd).length > 0;
  const hasMicrodata = microdata.length > 0;
  const hasRdfa = rdfa.length > 0;

  if (!hasJsonLd && !hasMicrodata && !hasRdfa) {
    schemaList.innerHTML = `<div class="heading-alert heading-alert-warning"><span class="heading-alert-icon">!</span> ${i18n('noStructuredData')}</div>`;
    return;
  }

  schemaList.innerHTML =
    renderStructuredDataSection('JSON-LD', jsonLd, true) +
    renderStructuredDataSection('Microdata', microdata, false) +
    renderStructuredDataSection('RDFa', rdfa, false);

  initCollapsibles(document.querySelector('.schema-list'));
}

function renderSocialChecklist(label, fields) {
  return fields.map(f => {
    const icon = f.value ? '✅' : (f.required ? '❌' : '⚠️');
    const statusClass = f.value ? 'good' : (f.required ? 'poor' : 'non-canonical');
    return `
      <div class="social-check-item">
        <span>${icon}</span>
        <span class="social-check-name">${escapeHtml(f.name)}</span>
        <span class="score ${statusClass}">${f.value ? escapeHtml(f.value.length > 60 ? f.value.substring(0, 57) + '...' : f.value) : (f.required ? i18n('requiredMissing') : i18n('recommendedMissing'))}</span>
      </div>
    `;
  }).join('');
}

function updateSocial(data) {
  const og = data.social?.og || {};
  const tw = data.social?.twitter || {};
  const fbImage = og.image || data.basicSeo.ogImage;
  const twImage = tw.image || data.basicSeo.twitterImage || fbImage;

  const facebookPreview = document.querySelector('.facebook-preview');
  facebookPreview.innerHTML = `
    ${fbImage ? `<img src="${encodeURI(fbImage)}" class="social-preview-image">` : `<div class="social-preview-image" style="background:#f0f0f0;height:150px;display:flex;align-items:center;justify-content:center;color:#999;border-radius:4px;">${i18n('ogImageNotFound')}</div>`}
    <div class="social-preview-title">${escapeHtml(og.title || data.basicSeo.title.content)}</div>
    <div class="social-preview-description">${escapeHtml(og.description || data.basicSeo.metaDescription || '')}</div>
  `;

  const twitterPreview = document.querySelector('.twitter-preview');
  twitterPreview.innerHTML = `
    ${twImage ? `<img src="${encodeURI(twImage)}" class="social-preview-image">` : `<div class="social-preview-image" style="background:#f0f0f0;height:150px;display:flex;align-items:center;justify-content:center;color:#999;border-radius:4px;">${i18n('twitterImageNotFound')}</div>`}
    <div class="social-preview-title">${escapeHtml(tw.title || data.basicSeo.title.content)}</div>
    <div class="social-preview-description">${escapeHtml(tw.description || data.basicSeo.metaDescription || '')}</div>
  `;

  // OG doğrulama kontrol listesi
  const ogChecklist = document.querySelector('.og-checklist');
  if (ogChecklist) {
    ogChecklist.innerHTML = renderSocialChecklist('Open Graph', [
      { name: 'og:title', value: og.title, required: true },
      { name: 'og:type', value: og.type, required: true },
      { name: 'og:url', value: og.url, required: true },
      { name: 'og:image', value: og.image, required: true },
      { name: 'og:description', value: og.description, required: false },
      { name: 'og:site_name', value: og.siteName, required: false },
      { name: 'og:locale', value: og.locale, required: false }
    ]);
  }

  // Twitter Card doğrulama kontrol listesi
  const twChecklist = document.querySelector('.twitter-checklist');
  if (twChecklist) {
    twChecklist.innerHTML = renderSocialChecklist('Twitter Card', [
      { name: 'twitter:card', value: tw.card, required: true },
      { name: 'twitter:title', value: tw.title, required: true },
      { name: 'twitter:description', value: tw.description, required: true },
      { name: 'twitter:image', value: tw.image, required: true },
      { name: 'twitter:site', value: tw.site, required: false },
      { name: 'twitter:creator', value: tw.creator, required: false }
    ]);
  }
}

function updateHreflang(data) {
  if (!data) return;

  const hreflangList = document.getElementById('hreflangList');
  const warningElement = document.getElementById('hreflangWarning');

  if (data.warning) {
    warningElement.textContent = data.warning;
    warningElement.style.display = 'block';
    hreflangList.innerHTML = '';
    return;
  }

  warningElement.style.display = 'none';
  hreflangList.innerHTML = data.tags.map(tag => `
    <tr>
      <td>${escapeHtml(tag.lang)}</td>
      <td><a href="${encodeURI(tag.url)}" target="_blank">${escapeHtml(tag.url)}</a></td>
      <td><span class="score good">${escapeHtml(tag.status)}</span></td>
    </tr>
  `).join('');
}

function perfColor(value, good, warn) {
  if (value <= good) return 'good';
  if (value <= warn) return 'non-canonical';
  return 'poor';
}

function updatePerformanceTab(vitals) {
  if (!vitals) return;

  // Stat kartları with color coding
  safeElementUpdate('perfDomLoad', el => {
    const val = vitals.domContentLoaded;
    el.textContent = val || '—';
    if (val != null) {
      const cls = val <= 1000 ? 'good' : val <= 2500 ? 'non-canonical' : 'poor';
      el.closest('.perf-stat').classList.add(`perf-stat-${cls}`);
    }
  });
  safeElementUpdate('perfFcp', el => {
    const val = vitals.fcp;
    el.textContent = val != null ? val : '—';
    if (val != null) {
      const cls = val <= 1800 ? 'good' : val <= 3000 ? 'non-canonical' : 'poor';
      el.closest('.perf-stat').classList.add(`perf-stat-${cls}`);
    }
  });
  safeElementUpdate('perfDomCount', el => {
    const val = vitals.domElementCount;
    el.textContent = val || '—';
    if (val != null) {
      const cls = val <= 1500 ? 'good' : val <= 3000 ? 'non-canonical' : 'poor';
      el.closest('.perf-stat').classList.add(`perf-stat-${cls}`);
    }
  });

  // Detay satırları
  safeElementUpdate('perfBlockingCount', el => {
    el.textContent = vitals.blockingResourceCount;
    el.className = 'perf-value score ' + (vitals.blockingResourceCount === 0 ? 'good' : vitals.blockingResourceCount <= 3 ? 'non-canonical' : 'poor');
  });
  safeElementUpdate('perfTransferSize', el => {
    el.textContent = formatBytes(vitals.totalTransferSize);
  });
  safeElementUpdate('perfResourceCount', el => {
    el.textContent = vitals.resourceCount;
  });

  // En büyük 10 kaynak
  const list = document.getElementById('perfTopResources');
  if (list && vitals.topResources) {
    const maxSize = Math.max(...vitals.topResources.map(r => r.size || 0), 1);
    list.innerHTML = vitals.topResources.map(r => {
      const barWidth = Math.round(((r.size || 0) / maxSize) * 100);
      return `
      <div class="perf-resource-item">
        <span class="perf-resource-type">${escapeHtml(r.type)}</span>
        <div class="perf-resource-name" title="${escapeHtml(r.fullUrl)}">
          ${escapeHtml(r.name)}
        </div>
        <div class="perf-resource-meta">
          <span>${formatBytes(r.size)}</span>
          <span class="text-muted">${r.duration}ms</span>
        </div>
      </div>
      <div class="perf-resource-bar"><div class="perf-resource-bar-fill" style="width:${barWidth}%"></div></div>`;
    }).join('');
  }
}

function renderKeywordTable(keywords, showMeta) {
  if (!keywords || keywords.length === 0) return `<p class="text-sm text-muted">${i18n('kwNotEnough')}</p>`;
  return `
    <table class="keyword-table">
      <thead>
        <tr>
          <th>${i18n('kwWord')}</th>
          <th>${i18n('kwCount')}</th>
          <th>${i18n('kwDensity')}</th>
          ${showMeta ? '<th>Title</th><th>Desc</th>' : ''}
        </tr>
      </thead>
      <tbody>
        ${keywords.map(k => {
          const densityClass = k.density > 3 ? 'poor' : k.density >= 1 ? 'good' : '';
          return `
            <tr>
              <td>${escapeHtml(k.word)}</td>
              <td>${k.count}</td>
              <td><span class="score ${densityClass}">${k.density}%</span></td>
              ${showMeta && k.inTitle !== undefined ? `
                <td>${k.inTitle ? '✅' : '❌'}</td>
                <td>${k.inDescription ? '✅' : '❌'}</td>
              ` : ''}
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
}

function updateKeywords(kw) {
  if (!kw) return;

  safeElementUpdate('kwTotalWords', el => { el.textContent = kw.totalWords; });
  safeElementUpdate('kwAvgSentence', el => { el.textContent = kw.avgSentenceLen; });
  safeElementUpdate('kwAvgWordLen', el => { el.textContent = kw.avgWordLen; });

  // Keyword stuffing uyarısı
  const alertEl = document.getElementById('kwStuffingAlert');
  if (alertEl && kw.stuffedKeywords.length > 0) {
    alertEl.innerHTML = `
      <div class="heading-alert heading-alert-error">
        <span class="heading-alert-icon">!</span>
        ${i18n('kwStuffingDetected', kw.stuffedKeywords.map(k => `"${escapeHtml(k.word)}" (${k.density}%)`).join(', '))}
      </div>
    `;
  }

  // Tablolar
  const uniEl = document.getElementById('kwUnigrams');
  if (uniEl) uniEl.innerHTML = renderKeywordTable(kw.titleKeywords.length > 0 ? kw.titleKeywords : kw.unigrams, kw.titleKeywords.length > 0);

  const biEl = document.getElementById('kwBigrams');
  if (biEl) biEl.innerHTML = renderKeywordTable(kw.bigrams, false);

  const triEl = document.getElementById('kwTrigrams');
  if (triEl) triEl.innerHTML = renderKeywordTable(kw.trigrams, false);
}

function updateCrawlability(data) {
  // Robots.txt
  const robotsEl = document.getElementById('robotsResult');
  if (robotsEl && data.robots) {
    if (data.robots.found) {
      const blockedClass = data.robots.isCurrentPageBlocked ? 'error' : 'success';
      const blockedText = data.robots.isCurrentPageBlocked
        ? i18n('robotsBlocked')
        : i18n('robotsNotBlocked');
      robotsEl.innerHTML = `
        <div class="heading-alert heading-alert-success"><span class="heading-alert-icon">✓</span> ${i18n('robotsFound')}</div>
        <div class="heading-alert heading-alert-${blockedClass}">
          <span class="heading-alert-icon">${data.robots.isCurrentPageBlocked ? '✗' : '✓'}</span>
          ${escapeHtml(blockedText)}
        </div>
        <div class="crawl-detail">
          <span>${i18n('disallowRuleCount')}</span>
          <span class="perf-value">${data.robots.disallowCount}</span>
        </div>
        ${data.robots.sitemapUrls.length > 0 ? `
          <div class="crawl-detail">
            <span>${i18n('sitemapInRobots')}</span>
            <span class="text-sm">${data.robots.sitemapUrls.map(u => escapeHtml(u)).join('<br>')}</span>
          </div>
        ` : ''}
        <div class="collapsible" style="margin-top:8px;">
          <div class="collapsible-header"><span>${i18n('robotsTxtContent')}</span><span>▼</span></div>
          <div class="collapsible-content"><pre class="text-sm schema-json">${escapeHtml(data.robots.content)}</pre></div>
        </div>
      `;
    } else {
      robotsEl.innerHTML = `<div class="heading-alert heading-alert-error"><span class="heading-alert-icon">✗</span> ${i18n('robotsNotFound')}</div>`;
    }
  }

  // Sitemap
  const sitemapEl = document.getElementById('sitemapResult');
  if (sitemapEl && data.sitemap) {
    if (data.sitemap.found) {
      // Genel durum
      const inSitemapClass = data.sitemap.isCurrentPageInSitemap ? 'success' : 'warning';
      const inSitemapText = data.sitemap.isCurrentPageInSitemap
        ? i18n('pageInSitemap')
        : i18n('pageNotInSitemap');
      const foundInInfo = data.sitemap.foundInSitemapUrl
        ? `<span class="text-sm text-muted">(${escapeHtml(data.sitemap.foundInSitemapUrl)})</span>` : '';

      // Sitemap ağaç yapısı
      let treeHtml = '';
      for (const sm of data.sitemap.sitemaps) {
        if (!sm.found) {
          treeHtml += `<div class="sitemap-node sitemap-node-error">
            <span class="sitemap-node-icon">✗</span>
            <span class="sitemap-node-url">${escapeHtml(sm.url)}</span>
            <span class="sitemap-node-badge sitemap-badge-error">${i18n('sitemapNotFound')}</span>
          </div>`;
          continue;
        }

        if (sm.type === 'index') {
          treeHtml += `<div class="sitemap-node sitemap-node-index">
            <span class="sitemap-node-icon">📑</span>
            <span class="sitemap-node-url">${escapeHtml(sm.url)}</span>
            <span class="sitemap-node-badge sitemap-badge-index">${i18n('sitemapIndex')}</span>
          </div>`;
          if (sm.children) {
            treeHtml += '<div class="sitemap-children">';
            for (const child of sm.children) {
              const countText = child.found !== false ? String(child.urlCount) : '—';
              const matchIcon = child.containsPage ? '<span class="sitemap-match" title="' + i18n('pageInSitemap') + '">★</span>' : '';
              const badgeClass = child.found !== false ? 'sitemap-badge-urlset' : 'sitemap-badge-error';
              const fileName = child.url.split('/').pop();
              treeHtml += `<div class="sitemap-node sitemap-node-child">
                <span class="sitemap-node-icon">📄</span>
                <span class="sitemap-node-url" title="${escapeHtml(child.url)}">${escapeHtml(fileName)}</span>
                <span class="sitemap-node-badge ${badgeClass}">${countText} URL</span>
                ${matchIcon}
              </div>`;
            }
            treeHtml += '</div>';
          }
        } else {
          const matchIcon = sm.containsPage ? '<span class="sitemap-match" title="' + i18n('pageInSitemap') + '">★</span>' : '';
          treeHtml += `<div class="sitemap-node">
            <span class="sitemap-node-icon">📄</span>
            <span class="sitemap-node-url">${escapeHtml(sm.url)}</span>
            <span class="sitemap-node-badge sitemap-badge-urlset">${sm.urlCount} URL</span>
            ${matchIcon}
          </div>`;
        }
      }

      sitemapEl.innerHTML = `
        <div class="heading-alert heading-alert-success">
          <span class="heading-alert-icon">✓</span>
          ${i18n('sitemapFound', String(data.sitemap.totalUrls))}
        </div>
        <div class="heading-alert heading-alert-${inSitemapClass}">
          <span class="heading-alert-icon">${data.sitemap.isCurrentPageInSitemap ? '✓' : '!'}</span>
          ${escapeHtml(inSitemapText)} ${foundInInfo}
        </div>
        <div class="sitemap-tree">${treeHtml}</div>
      `;
    } else {
      sitemapEl.innerHTML = `<div class="heading-alert heading-alert-error"><span class="heading-alert-icon">✗</span> ${i18n('sitemapNotFound')}</div>`;
    }
  }

  initCollapsibles(document.getElementById('crawl'));
}

function checkHeadingHierarchy(headings) {
  // Hangi seviyeler kullanılmış
  const usedLevels = [];
  for (let i = 1; i <= 6; i++) {
    if ((headings[`h${i}`]?.length || 0) > 0) {
      usedLevels.push(i);
    }
  }
  if (usedLevels.length === 0) return 0;

  // Seviye atlamalarını say
  let skips = 0;
  for (let i = 1; i < usedLevels.length; i++) {
    const gap = usedLevels[i] - usedLevels[i - 1];
    if (gap > 1) skips += gap - 1;
  }

  if (skips === 0) return 5;
  if (skips === 1) return 2;
  return 0;
}

function calculateOverallScore(data) {
  const breakdown = {};

  // ── On-Page SEO (30 puan) ──
  let onPage = 0;

  // Title (10 puan)
  if (data.basicSeo?.title?.content) {
    const len = data.basicSeo.title.length;
    if (len >= 30 && len <= 60) onPage += 10;
    else if ((len >= 20 && len < 30) || (len > 60 && len <= 70)) onPage += 7;
    else onPage += 3;
  }

  // Meta Description (8 puan)
  if (data.basicSeo?.metaDescription) {
    const len = data.basicSeo.metaDescription.length;
    if (len >= 120 && len <= 155) onPage += 8;
    else if ((len >= 80 && len < 120) || (len > 155 && len <= 200)) onPage += 5;
    else onPage += 2;
  }

  // Canonical (5 puan)
  if (data.basicSeo?.canonical) {
    if (data.basicSeo.canonical === data.basicSeo.url) onPage += 5;
    else onPage += 3;
  }

  // Robots (3 puan)
  if (data.basicSeo?.robots) onPage += 3;

  // Viewport (2 puan)
  if (data.basicSeo?.viewport) onPage += 2;

  // URL yapısı (2 puan)
  if (data.basicSeo?.url) {
    const hasHttps = data.basicSeo.url.startsWith('https://');
    const queryPart = data.basicSeo.url.split('?')[1] || '';
    const isClean = queryPart.length < 50;
    if (hasHttps && isClean) onPage += 2;
    else if (hasHttps || isClean) onPage += 1;
  }

  breakdown.onPage = { score: onPage, max: 30, label: i18n('scoreOnPage') };

  // ── İçerik Kalitesi (20 puan) ──
  let content = 0;

  // H1 sayısı (5 puan)
  const h1Count = data.headings?.h1?.length || 0;
  if (h1Count === 1) content += 5;
  else if (h1Count > 1) content += 2;

  // Heading hiyerarşisi (5 puan)
  if (data.headings) {
    content += checkHeadingHierarchy(data.headings);
  }

  // Kelime sayısı (5 puan)
  const wordCount = data.wordCount || 0;
  if (wordCount >= 300) content += 5;
  else if (wordCount >= 150) content += 3;
  else if (wordCount > 0) content += 1;

  // Görsel alt kapsama (5 puan)
  if (data.images && data.images.length > 0) {
    const altRatio = data.images.filter(img => img.alt).length / data.images.length;
    if (altRatio === 1) content += 5;
    else if (altRatio >= 0.7) content += 3;
    else if (altRatio >= 0.3) content += 1;
  } else {
    content += 5; // Görsel yoksa ceza yok
  }

  breakdown.content = { score: content, max: 20, label: i18n('scoreContent') };

  // ── Teknik SEO (20 puan) ──
  let technical = 0;

  // HTTPS (5 puan)
  if (data.basicSeo?.url?.startsWith('https://')) technical += 5;

  // Schema (5 puan) — JSON-LD, Microdata veya RDFa
  if (data.schema) {
    const jsonLd = data.schema.jsonLd || data.schema;
    const microdata = data.schema.microdata || [];
    const rdfa = data.schema.rdfa || [];
    const hasJsonLd = Object.keys(jsonLd).length > 0 && Object.values(jsonLd).some(arr => arr.length > 0);
    const hasMicrodata = microdata.length > 0;
    const hasRdfa = rdfa.length > 0;
    if (hasJsonLd) technical += 5;
    else if (hasMicrodata || hasRdfa) technical += 3;
  }

  // Hreflang (3 puan)
  if (data.hreflang?.tags?.length > 0) {
    technical += data.hreflang.hasXDefault ? 3 : 2;
  }

  // Open Graph (4 puan)
  if (data.social?.og) {
    const og = data.social.og;
    const present = [og.title, og.type, og.url, og.image].filter(Boolean).length;
    technical += Math.round((present / 4) * 4);
  } else if (data.basicSeo?.ogImage) {
    technical += 1;
  }

  // Twitter Card (3 puan)
  if (data.social?.twitter) {
    const tw = data.social.twitter;
    const present = [tw.card, tw.title, tw.description, tw.image].filter(Boolean).length;
    technical += Math.round((present / 4) * 3);
  } else if (data.basicSeo?.twitterImage) {
    technical += 1;
  }

  breakdown.technical = { score: technical, max: 20, label: i18n('scoreTechnical') };

  // ── Link Sağlığı (15 puan) ──
  let linkHealth = 0;

  if (data.links && data.links.length > 0) {
    // Dahili link varlığı (5 puan)
    const internalCount = data.links.filter(l => l.isInternal).length;
    if (internalCount >= 3) linkHealth += 5;
    else if (internalCount > 0) linkHealth += 3;

    // Harici link (3 puan)
    const externalCount = data.links.filter(l => !l.isInternal).length;
    if (externalCount >= 1) linkHealth += 3;

    // Nofollow oranı (3 puan)
    const nofollowRatio = data.links.filter(l => l.nofollow).length / data.links.length;
    if (nofollowRatio <= 0.5) linkHealth += 3;
    else if (nofollowRatio <= 0.8) linkHealth += 1;

    // Boş anchor (4 puan)
    const emptyRatio = data.links.filter(l => !l.text || !l.text.trim()).length / data.links.length;
    if (emptyRatio === 0) linkHealth += 4;
    else if (emptyRatio <= 0.2) linkHealth += 2;
  } else {
    linkHealth += 5; // Link yoksa kısmi puan
  }

  breakdown.linkHealth = { score: linkHealth, max: 15, label: i18n('scoreLinkHealth') };

  // ── Performans Sinyalleri (15 puan) ──
  let perf = 0;

  if (data.performance) {
    // Lazy loading (5 puan)
    if (data.performance.totalImages > 0) {
      const lazyRatio = data.performance.lazyLoadedImages / data.performance.totalImages;
      if (lazyRatio >= 0.8) perf += 5;
      else if (lazyRatio >= 0.5) perf += 3;
      else if (lazyRatio > 0) perf += 1;
    } else {
      perf += 5;
    }

    // Görsel boyut belirtimi (5 puan)
    if (data.performance.totalImages > 0) {
      const dimRatio = data.performance.imagesWithDimensions / data.performance.totalImages;
      if (dimRatio >= 0.8) perf += 5;
      else if (dimRatio >= 0.5) perf += 3;
      else if (dimRatio > 0) perf += 1;
    } else {
      perf += 5;
    }

    // Inline style sayısı (5 puan)
    if (data.performance.inlineStyleCount === 0) perf += 5;
    else if (data.performance.inlineStyleCount <= 5) perf += 3;
    else if (data.performance.inlineStyleCount <= 15) perf += 1;
  } else {
    perf += 8; // Performans verisi yoksa nötr puan
  }

  breakdown.performance = { score: perf, max: 15, label: i18n('scorePerformance') };

  // ── Toplam ──
  const total = onPage + content + technical + linkHealth + perf;
  return { score: Math.max(0, Math.min(100, total)), breakdown };
}

// ── Broken Link Check Results ──
function displayLinkCheckResults(data) {
  const summaryEl = document.getElementById('linkCheckSummary');
  const listEl = document.getElementById('linkCheckList');
  const container = document.getElementById('linkCheckResults');
  if (!summaryEl || !listEl || !container) return;

  container.classList.remove('hidden');

  const brokenCount = data.broken || 0;
  const redirectCount = data.redirected || 0;
  const okCount = data.checked - brokenCount - redirectCount;

  summaryEl.innerHTML = `
    <div class="link-check-stat"><span class="score good">${okCount}</span> ${i18n('linkStatusOk')}</div>
    <div class="link-check-stat"><span class="score non-canonical">${redirectCount}</span> ${i18n('linkStatusRedirect')}</div>
    <div class="link-check-stat"><span class="score poor">${brokenCount}</span> ${i18n('linkStatusBroken')}</div>
  `;

  // Sort: broken first, then redirected, then ok
  const sorted = [...data.results].sort((a, b) => {
    const priority = r => r.error ? 0 : (!r.ok ? 1 : (r.redirected ? 2 : 3));
    return priority(a) - priority(b);
  });

  listEl.innerHTML = sorted.map(r => {
    let statusClass, statusText;
    if (r.error) {
      statusClass = 'poor';
      statusText = r.error === 'timeout' ? i18n('linkStatusTimeout') : i18n('linkStatusError');
    } else if (!r.ok) {
      statusClass = 'poor';
      statusText = String(r.status);
    } else if (r.redirected) {
      statusClass = 'non-canonical';
      statusText = String(r.status);
    } else {
      statusClass = 'good';
      statusText = String(r.status);
    }
    return `
      <div class="link-check-item">
        <span class="score ${statusClass}">${statusText}</span>
        <a href="${encodeURI(r.url)}" target="_blank" class="link-check-url">${escapeHtml(r.url)}</a>
      </div>
    `;
  }).join('');
}

// ── Redirect Chain Display ──
function displayRedirectChain(data) {
  const section = document.getElementById('redirectChainSection');
  if (!section) return;

  if (data.redirectCount === 0) {
    section.classList.add('hidden');
    return;
  }

  section.classList.remove('hidden');

  const alertType = data.redirectCount >= 3 ? 'error' : 'warning';
  const alertIcon = data.redirectCount >= 3 ? '✗' : '!';

  section.innerHTML = `
    <div class="heading-alert heading-alert-${alertType}">
      <span class="heading-alert-icon">${alertIcon}</span>
      ${i18n('redirectChainMsg', String(data.redirectCount))}
    </div>
    <div class="redirect-chain">
      ${data.chain.map((hop, i) => `
        <div class="redirect-hop">
          <span class="redirect-hop-num">${i + 1}</span>
          <span class="score ${hop.status >= 200 && hop.status < 300 ? 'good' : hop.status >= 300 && hop.status < 400 ? 'non-canonical' : 'poor'}">${hop.status || 'ERR'}</span>
          <span class="redirect-hop-url">${escapeHtml(hop.url)}</span>
        </div>
        ${i < data.chain.length - 1 ? '<div class="redirect-arrow">↓</div>' : ''}
      `).join('')}
    </div>
  `;
}

// ── Competitor Comparison ──
function displayComparison(current, competitor) {
  const container = document.getElementById('compareResults');
  if (!container) return;
  container.classList.remove('hidden');

  // Calculate scores for both
  const currentScore = _lastScoreResult?.score || 0;

  // Build a minimal data object for competitor scoring
  const compData = {
    basicSeo: competitor.basicSeo,
    headings: competitor.headings,
    links: competitor.links,
    images: competitor.images,
    schema: competitor.schema,
    social: competitor.social,
    security: competitor.security,
    wordCount: competitor.wordCount,
    performance: null // No performance data for competitor
  };
  const compResult = calculateOverallScore(compData);
  const compScore = compResult.score;

  const diffScore = currentScore - compScore;
  const diffClass = diffScore > 0 ? 'good' : diffScore < 0 ? 'poor' : 'non-canonical';

  function compareRow(label, currentVal, compVal, goodWhen) {
    let currentClass = '', compClass = '';
    if (goodWhen === 'higher') {
      currentClass = currentVal > compVal ? 'good' : currentVal < compVal ? 'poor' : '';
      compClass = compVal > currentVal ? 'good' : compVal < currentVal ? 'poor' : '';
    } else if (goodWhen === 'lower') {
      currentClass = currentVal < compVal ? 'good' : currentVal > compVal ? 'poor' : '';
      compClass = compVal < currentVal ? 'good' : compVal > currentVal ? 'poor' : '';
    }
    return `
      <tr>
        <td>${escapeHtml(label)}</td>
        <td class="${currentClass}">${currentVal}</td>
        <td class="${compClass}">${compVal}</td>
      </tr>
    `;
  }

  const curLinks = current.links || [];
  const compLinks = competitor.links || [];
  const curImages = current.images || [];
  const compImages = competitor.images || [];
  const curJsonLd = current.schema?.jsonLd || {};
  const compJsonLd = competitor.schema?.jsonLd || {};

  container.innerHTML = `
    <div class="compare-score-header">
      <div class="compare-score-box">
        <div class="text-sm text-muted">${i18n('thisPage')}</div>
        <div class="compare-score-value">${currentScore}</div>
      </div>
      <div class="compare-vs">
        <span class="score ${diffClass}">${diffScore > 0 ? '+' : ''}${diffScore}</span>
      </div>
      <div class="compare-score-box">
        <div class="text-sm text-muted">${i18n('competitor')}</div>
        <div class="compare-score-value">${compScore}</div>
      </div>
    </div>

    <table class="compare-table">
      <thead>
        <tr><th>${i18n('metric')}</th><th>${i18n('thisPage')}</th><th>${i18n('competitor')}</th></tr>
      </thead>
      <tbody>
        ${compareRow(i18n('compareScore'), currentScore, compScore, 'higher')}
        ${compareRow(i18n('compareTitleLen'), current.basicSeo?.title?.length || 0, competitor.basicSeo?.title?.length || 0, '')}
        ${compareRow(i18n('compareDescLen'), current.basicSeo?.metaDescription?.length || 0, competitor.basicSeo?.metaDescription?.length || 0, '')}
        ${compareRow(i18n('compareWordCount'), current.wordCount || 0, competitor.wordCount || 0, 'higher')}
        ${compareRow(i18n('compareH1Count'), current.headings?.h1?.length || 0, competitor.headings?.h1?.length || 0, '')}
        ${compareRow(i18n('compareTotalHeading'), Object.values(current.headings || {}).flat().length, Object.values(competitor.headings || {}).flat().length, 'higher')}
        ${compareRow(i18n('compareInternalLink'), curLinks.filter(l => l.isInternal).length, compLinks.filter(l => l.isInternal).length, 'higher')}
        ${compareRow(i18n('compareExternalLink'), curLinks.filter(l => !l.isInternal).length, compLinks.filter(l => !l.isInternal).length, '')}
        ${compareRow(i18n('compareTotalImages'), curImages.length, compImages.length, '')}
        ${compareRow(i18n('compareAltCoverage'), curImages.length ? Math.round(curImages.filter(i => i.alt).length / curImages.length * 100) : 100, compImages.length ? Math.round(compImages.filter(i => i.alt).length / compImages.length * 100) : 100, 'higher')}
        ${compareRow(i18n('compareSchemaTypes'), Object.keys(curJsonLd).length, Object.keys(compJsonLd).length, 'higher')}
        ${compareRow(i18n('compareHttps'), current.security?.isHttps ? i18n('yes') : i18n('no'), competitor.security?.isHttps ? i18n('yes') : i18n('no'), '')}
        ${compareRow(i18n('compareCanonical'), current.basicSeo?.canonical ? i18n('exists') : i18n('notExists'), competitor.basicSeo?.canonical ? i18n('exists') : i18n('notExists'), '')}
        ${compareRow(i18n('compareOgTags'), Object.values(current.social?.og || {}).filter(Boolean).length, Object.values(competitor.social?.og || {}).filter(Boolean).length, 'higher')}
        ${compareRow(i18n('compareTwitterTags'), Object.values(current.social?.twitter || {}).filter(Boolean).length, Object.values(competitor.social?.twitter || {}).filter(Boolean).length, 'higher')}
      </tbody>
    </table>
  `;
}
