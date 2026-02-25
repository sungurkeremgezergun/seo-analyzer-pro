// Background service worker — link checking & redirect analysis

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'checkLinks') {
    checkLinks(request.urls).then(sendResponse);
    return true;
  }
  if (request.action === 'checkRedirectChain') {
    checkRedirectChain(request.url).then(sendResponse);
    return true;
  }
  if (request.action === 'analyzeCompetitor') {
    analyzeCompetitorPage(request.url).then(sendResponse);
    return true;
  }
});

// ── Broken Link Detection ──
// Max 50 unique URLs, 5 concurrent requests, 5s timeout each
async function checkLinks(urls) {
  const CONCURRENCY = 5;
  const TIMEOUT = 5000;
  const MAX_URLS = 50;

  // Filter out non-HTTP URLs
  const httpUrls = urls
    .filter(url => url.startsWith('http://') || url.startsWith('https://'))
    .slice(0, MAX_URLS);

  const results = [];
  let index = 0;

  async function checkOne(url) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT);

    try {
      const resp = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
        redirect: 'follow',
        cache: 'no-cache'
      });
      clearTimeout(timer);
      return { url, status: resp.status, ok: resp.ok, redirected: resp.redirected };
    } catch (e) {
      clearTimeout(timer);
      if (e.name === 'AbortError') {
        return { url, status: 0, ok: false, error: 'timeout' };
      }
      // Try GET as fallback (some servers block HEAD)
      try {
        const controller2 = new AbortController();
        const timer2 = setTimeout(() => controller2.abort(), TIMEOUT);
        const resp = await fetch(url, {
          method: 'GET',
          signal: controller2.signal,
          redirect: 'follow',
          cache: 'no-cache'
        });
        clearTimeout(timer2);
        // We don't need the body
        return { url, status: resp.status, ok: resp.ok, redirected: resp.redirected };
      } catch (e2) {
        return { url, status: 0, ok: false, error: e2.name === 'AbortError' ? 'timeout' : 'network' };
      }
    }
  }

  // Process in batches
  async function worker() {
    while (index < httpUrls.length) {
      const i = index++;
      const result = await checkOne(httpUrls[i]);
      results.push(result);
    }
  }

  const workers = [];
  for (let i = 0; i < Math.min(CONCURRENCY, httpUrls.length); i++) {
    workers.push(worker());
  }
  await Promise.all(workers);

  return {
    results,
    checked: results.length,
    broken: results.filter(r => !r.ok).length,
    redirected: results.filter(r => r.redirected).length
  };
}

// ── Redirect Chain Analysis ──
async function checkRedirectChain(url) {
  const chain = [];
  const TIMEOUT = 5000;
  const MAX_HOPS = 10;
  let currentUrl = url;

  for (let i = 0; i < MAX_HOPS; i++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT);

    try {
      const resp = await fetch(currentUrl, {
        method: 'HEAD',
        redirect: 'manual',
        signal: controller.signal,
        cache: 'no-cache'
      });
      clearTimeout(timer);

      chain.push({
        url: currentUrl,
        status: resp.status
      });

      // If redirect, follow the Location header
      if (resp.status >= 300 && resp.status < 400) {
        const location = resp.headers.get('Location');
        if (!location) break;
        // Handle relative URLs
        try {
          currentUrl = new URL(location, currentUrl).href;
        } catch {
          break;
        }
      } else {
        break; // Final destination reached
      }
    } catch (e) {
      clearTimeout(timer);
      chain.push({
        url: currentUrl,
        status: 0,
        error: e.name === 'AbortError' ? 'timeout' : 'network'
      });
      break;
    }
  }

  return {
    chain,
    redirectCount: Math.max(0, chain.length - 1),
    finalUrl: chain.length > 0 ? chain[chain.length - 1].url : url,
    finalStatus: chain.length > 0 ? chain[chain.length - 1].status : 0
  };
}

// ── Competitor Page Analysis ──
async function analyzeCompetitorPage(url) {
  const TIMEOUT = 10000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);

  try {
    const resp = await fetch(url, {
      signal: controller.signal,
      cache: 'no-cache'
    });
    clearTimeout(timer);

    if (!resp.ok) {
      return { error: `HTTP ${resp.status}` };
    }

    const html = await resp.text();
    return parseCompetitorHtml(html, url);
  } catch (e) {
    clearTimeout(timer);
    return { error: e.name === 'AbortError' ? 'error_timeout' : 'error_network' };
  }
}

function parseCompetitorHtml(html, url) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Basic SEO
  const title = doc.querySelector('title')?.textContent || '';
  const metaDesc = doc.querySelector('meta[name="description"]')?.content || null;
  const canonical = doc.querySelector('link[rel="canonical"]')?.href || null;
  const robots = doc.querySelector('meta[name="robots"]')?.content || 'index,follow';
  const viewport = doc.querySelector('meta[name="viewport"]')?.content || null;

  // Headings
  const headings = {};
  for (let i = 1; i <= 6; i++) {
    headings[`h${i}`] = Array.from(doc.querySelectorAll(`h${i}`)).map(h => ({
      text: h.textContent.trim(),
      length: h.textContent.trim().length
    }));
  }

  // Links
  const links = Array.from(doc.querySelectorAll('a[href]'));
  let parsedUrl;
  try { parsedUrl = new URL(url); } catch { parsedUrl = null; }
  const hostname = parsedUrl?.hostname || '';

  const linkData = links.map(link => {
    const href = link.getAttribute('href') || '';
    try {
      const linkUrl = new URL(href, url);
      return {
        url: linkUrl.href,
        text: link.textContent.trim(),
        isInternal: linkUrl.hostname === hostname,
        nofollow: (link.getAttribute('rel') || '').includes('nofollow')
      };
    } catch {
      return null;
    }
  }).filter(Boolean);

  // Images
  const images = Array.from(doc.querySelectorAll('img')).map(img => ({
    src: img.getAttribute('src') || '',
    alt: img.getAttribute('alt') || null
  }));

  // Schema (JSON-LD)
  const jsonLd = {};
  doc.querySelectorAll('script[type="application/ld+json"]').forEach(script => {
    try {
      const data = JSON.parse(script.textContent);
      if (data['@type']) {
        if (!jsonLd[data['@type']]) jsonLd[data['@type']] = [];
        jsonLd[data['@type']].push(data);
      }
    } catch { /* skip */ }
  });

  // Social
  const og = {
    title: doc.querySelector('meta[property="og:title"]')?.content || null,
    type: doc.querySelector('meta[property="og:type"]')?.content || null,
    url: doc.querySelector('meta[property="og:url"]')?.content || null,
    image: doc.querySelector('meta[property="og:image"]')?.content || null,
    description: doc.querySelector('meta[property="og:description"]')?.content || null
  };
  const twitter = {
    card: doc.querySelector('meta[name="twitter:card"]')?.content || null,
    title: doc.querySelector('meta[name="twitter:title"]')?.content || null,
    description: doc.querySelector('meta[name="twitter:description"]')?.content || null,
    image: doc.querySelector('meta[name="twitter:image"]')?.content || null
  };

  // Word count
  const bodyText = doc.body?.innerText || doc.body?.textContent || '';
  const wordCount = bodyText.trim().split(/\s+/).filter(w => w.length > 0).length;

  // HTTPS
  const isHttps = url.startsWith('https://');

  return {
    url,
    basicSeo: {
      title: { content: title, length: title.length },
      metaDescription: metaDesc,
      canonical,
      robots,
      viewport,
      url
    },
    headings,
    links: linkData,
    images,
    schema: { jsonLd, microdata: [], rdfa: [] },
    social: { og, twitter },
    security: { isHttps, mixedContent: [], mixedContentCount: 0 },
    wordCount
  };
}
