// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "ping") {
        sendResponse({ status: "alive" });
    } else if (request.action === "analyzePage") {
        const data = getPageData();
        sendResponse(data);
    } else if (request.action === "highlightNofollow") {
        const nofollowLinks = document.querySelectorAll('a[rel*="nofollow"]');
        // Toggle highlight
        const isHighlighted = document.body.dataset.nofollowHighlighted === 'true';
        if (isHighlighted) {
            nofollowLinks.forEach(link => {
                link.style.removeProperty('outline');
                link.style.removeProperty('background-color');
            });
            document.body.dataset.nofollowHighlighted = 'false';
            sendResponse({ count: nofollowLinks.length, highlighted: false });
        } else {
            nofollowLinks.forEach(link => {
                link.style.outline = '2px solid #c5221f';
                link.style.backgroundColor = 'rgba(197, 34, 31, 0.1)';
            });
            document.body.dataset.nofollowHighlighted = 'true';
            sendResponse({ count: nofollowLinks.length, highlighted: true });
        }
    } else if (request.action === "getPageContent") {
        const pageContent = {
            title: document.title,
            metaDescription: document.querySelector('meta[name="description"]')?.content,
            h1: Array.from(document.querySelectorAll('h1')).map(h => h.textContent),
            h2: Array.from(document.querySelectorAll('h2')).map(h => h.textContent),
            mainContent: document.querySelector('main, article, .content')?.textContent || '',
            metaTags: Array.from(document.querySelectorAll('meta')).map(meta => ({
                name: meta.getAttribute('name') || meta.getAttribute('property'),
                content: meta.getAttribute('content')
            }))
        };
        sendResponse(pageContent);
    } else if (request.action === "analyzeCrawlability") {
        analyzeCrawlability()
            .then(data => sendResponse(data))
            .catch(err => {
                console.error('[SEO Analyzer] analyzeCrawlability error:', err.message);
                sendResponse(null);
            });
        return true; // async response
    }
});

function getPageData() {
    try {
        return {
            basicSeo: safeParse(getBasicSeoData, 'basicSeo'),
            headings: safeParse(getHeadingsData, 'headings'),
            links: safeParse(getLinksData, 'links') || [],
            images: safeParse(getImagesData, 'images') || [],
            schema: safeParse(getSchemaData, 'schema') || { jsonLd: {}, microdata: [], rdfa: [] },
            hreflang: safeParse(getHreflangData, 'hreflang'),
            social: safeParse(getSocialMetaData, 'social'),
            performance: safeParse(getPerformanceSignals, 'performance'),
            security: safeParse(getSecurityData, 'security'),
            webVitals: safeParse(getWebVitals, 'webVitals'),
            keywordAnalysis: safeParse(getKeywordAnalysis, 'keywordAnalysis'),
            wordCount: safeParse(getWordCount, 'wordCount') || 0
        };
    } catch (error) {
        return { error: error.message };
    }
}

function safeParse(fn, context) {
    try {
        return fn();
    } catch (error) {
        console.error(`[SEO Analyzer] ${context} error:`, error.message);
        return null;
    }
}

function getBasicSeoData() {
    return {
        title: {
            content: document.title,
            length: document.title.length
        },
        url: window.location.href,
        canonical: document.querySelector('link[rel="canonical"]')?.href || null,
        metaDescription: document.querySelector('meta[name="description"]')?.content || null,
        metaKeywords: document.querySelector('meta[name="keywords"]')?.content || null,
        robots: document.querySelector('meta[name="robots"]')?.content || 'index,follow',
        viewport: document.querySelector('meta[name="viewport"]')?.content || null,
        ogImage: document.querySelector('meta[property="og:image"]')?.content || null,
        twitterImage: document.querySelector('meta[name="twitter:image"]')?.content || null
    };
}

function getWordCount() {
    // Get all text content from the body
    const text = document.body.innerText;
    
    // Remove extra whitespace and split into words
    const words = text.trim().split(/\s+/);
    
    // Filter out empty strings and return count
    return words.filter(word => word.length > 0).length;
}

function getHreflangData() {
    const hreflangs = Array.from(document.querySelectorAll('link[rel="alternate"][hreflang]'));
    const hasXDefault = hreflangs.some(link => link.getAttribute('hreflang') === 'x-default');
    
    const data = {
        tags: hreflangs.map(link => ({
            lang: link.getAttribute('hreflang'),
            url: link.href,
            status: 'Valid' // You could add validation logic here
        })),
        hasXDefault: hasXDefault,
        warning: null
    };

    if (hreflangs.length === 0) {
        data.warning = 'No hreflang tags detected on this page.';
    } else if (!hasXDefault) {
        data.warning = 'x-default hreflang tag is missing. It should be added for better internationalization.';
    }

    return data;
}

function getHeadingsData() {
    const headings = {};
    ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].forEach(tag => {
        headings[tag] = Array.from(document.querySelectorAll(tag)).map(h => ({
            text: h.textContent.trim(),
            length: h.textContent.trim().length
        }));
    });
    return headings;
}

function getLinksData() {
    const links = Array.from(document.querySelectorAll('a'));
    const currentDomain = window.location.hostname;

    return links.map(link => {
        try {
            const href = link.getAttribute('href') || '';
            // Filter out javascript:, data:, and other dangerous protocols
            if (/^(javascript|data|vbscript):/i.test(href.trim())) return null;
            const url = new URL(link.href);
            // Only allow http/https protocols
            if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
            return {
                url: link.href,
                text: link.textContent.trim(),
                isInternal: url.hostname === currentDomain,
                nofollow: link.rel.includes('nofollow'),
                target: link.target
            };
        } catch (e) {
            return null;
        }
    }).filter(Boolean);
}

function getImagesData() {
    return Array.from(document.querySelectorAll('img')).map(img => ({
        src: img.src,
        alt: img.alt || null,
        width: img.width,
        height: img.height,
        loading: img.loading || 'eager'
    }));
}

function getSchemaData() {
    const jsonLd = {};
    const scriptTags = document.querySelectorAll('script[type="application/ld+json"]');

    scriptTags.forEach(script => {
        try {
            const data = JSON.parse(script.textContent);
            if (data['@type']) {
                if (!jsonLd[data['@type']]) jsonLd[data['@type']] = [];
                jsonLd[data['@type']].push(data);
            }
        } catch (e) {
            // Invalid JSON-LD, skip
        }
    });

    // Microdata
    const microdata = [];
    document.querySelectorAll('[itemscope]').forEach(el => {
        const type = el.getAttribute('itemtype') || 'Unknown';
        const props = {};
        el.querySelectorAll('[itemprop]').forEach(prop => {
            const name = prop.getAttribute('itemprop');
            props[name] = prop.content || prop.textContent?.trim().substring(0, 200) || prop.href || '';
        });
        microdata.push({ type: type.split('/').pop(), properties: props });
    });

    // RDFa
    const rdfa = [];
    document.querySelectorAll('[typeof]').forEach(el => {
        const type = el.getAttribute('typeof') || 'Unknown';
        const props = {};
        el.querySelectorAll('[property]').forEach(prop => {
            const name = prop.getAttribute('property');
            props[name] = prop.content || prop.textContent?.trim().substring(0, 200) || prop.href || '';
        });
        rdfa.push({ type, properties: props });
    });

    return { jsonLd, microdata, rdfa };
}

function getSocialMetaData() {
    return {
        og: {
            title: document.querySelector('meta[property="og:title"]')?.content || null,
            type: document.querySelector('meta[property="og:type"]')?.content || null,
            url: document.querySelector('meta[property="og:url"]')?.content || null,
            image: document.querySelector('meta[property="og:image"]')?.content || null,
            description: document.querySelector('meta[property="og:description"]')?.content || null,
            siteName: document.querySelector('meta[property="og:site_name"]')?.content || null,
            locale: document.querySelector('meta[property="og:locale"]')?.content || null
        },
        twitter: {
            card: document.querySelector('meta[name="twitter:card"]')?.content || null,
            site: document.querySelector('meta[name="twitter:site"]')?.content || null,
            title: document.querySelector('meta[name="twitter:title"]')?.content || null,
            description: document.querySelector('meta[name="twitter:description"]')?.content || null,
            image: document.querySelector('meta[name="twitter:image"]')?.content || null,
            creator: document.querySelector('meta[name="twitter:creator"]')?.content || null
        }
    };
}

function getPerformanceSignals() {
    const images = document.querySelectorAll('img');
    let lazyCount = 0;
    let dimensionCount = 0;

    images.forEach(img => {
        if (img.loading === 'lazy') lazyCount++;
        if (img.getAttribute('width') && img.getAttribute('height')) dimensionCount++;
    });

    return {
        totalImages: images.length,
        lazyLoadedImages: lazyCount,
        imagesWithDimensions: dimensionCount,
        inlineStyleCount: document.querySelectorAll('[style]').length
    };
}

function getSecurityData() {
    const isHttps = window.location.protocol === 'https:';
    const mixedContent = [];

    if (isHttps) {
        // HTTP kaynak kullanan elementleri tara
        const selectors = [
            { tag: 'img', attr: 'src' },
            { tag: 'script', attr: 'src' },
            { tag: 'link[rel="stylesheet"]', attr: 'href' },
            { tag: 'iframe', attr: 'src' },
            { tag: 'video', attr: 'src' },
            { tag: 'audio', attr: 'src' }
        ];

        selectors.forEach(({ tag, attr }) => {
            document.querySelectorAll(tag).forEach(el => {
                const value = el.getAttribute(attr);
                if (value && value.startsWith('http://')) {
                    mixedContent.push({
                        tag: el.tagName.toLowerCase(),
                        url: value
                    });
                }
            });
        });
    }

    return {
        isHttps,
        mixedContent,
        mixedContentCount: mixedContent.length
    };
}

function getWebVitals() {
    const nav = performance.getEntriesByType('navigation')[0] || {};
    const paint = performance.getEntriesByType('paint') || [];
    const resources = performance.getEntriesByType('resource') || [];

    // FCP
    const fcpEntry = paint.find(p => p.name === 'first-contentful-paint');

    // Render-blocking kaynaklar (sync script/style yüklenmeden önce)
    const blockingResources = resources.filter(r =>
        (r.initiatorType === 'script' || r.initiatorType === 'link' || r.initiatorType === 'css') &&
        r.renderBlockingStatus === 'blocking'
    );

    // Transfer boyutu
    let totalTransferSize = 0;
    resources.forEach(r => {
        if (r.transferSize) totalTransferSize += r.transferSize;
    });

    // En büyük 10 kaynak
    const topResources = [...resources]
        .filter(r => r.transferSize > 0)
        .sort((a, b) => b.transferSize - a.transferSize)
        .slice(0, 10)
        .map(r => ({
            name: r.name.split('/').pop().split('?')[0] || r.name,
            fullUrl: r.name,
            type: r.initiatorType,
            size: r.transferSize,
            duration: Math.round(r.duration)
        }));

    return {
        domContentLoaded: Math.round(nav.domContentLoadedEventEnd - nav.startTime || 0),
        fcp: fcpEntry ? Math.round(fcpEntry.startTime) : null,
        domElementCount: document.querySelectorAll('*').length,
        blockingResourceCount: blockingResources.length,
        totalTransferSize,
        resourceCount: resources.length,
        topResources
    };
}

function getKeywordAnalysis() {
    // Stopword listeleri
    const trStop = new Set(['bir','ve','ile','bu','da','de','için','olan','den','dan','var','çok','daha','ne','ama','gibi','en','mi','mı','mu','mü','ya','hem','her','hiç','kadar','sonra','bütün','diye','ben','sen','biz','siz','onlar','şu','o','ki','ancak','veya','ise','sadece','buna','olan','olarak','üzerinde','arasında','tarafından','göre']);
    const enStop = new Set(['the','be','to','of','and','a','in','that','have','i','it','for','not','on','with','he','as','you','do','at','this','but','his','by','from','they','we','say','her','she','or','an','will','my','one','all','would','there','their','what','so','up','out','if','about','who','get','which','go','me','when','make','can','like','time','no','just','him','know','take','people','into','year','your','good','some','could','them','see','other','than','then','now','look','only','come','its','over','think','also','back','after','use','two','how','our','work','first','well','way','even','new','want','because','any','these','give','day','most','us','is','are','was','were','been','being','has','had','did','does','doing','am']);

    // Ana metin (nav, header, footer, sidebar hariç)
    const mainEl = document.querySelector('main, article, [role="main"], .content, .post-content, .entry-content');
    const rawText = (mainEl || document.body).innerText || '';

    // Cümle analizi
    const sentences = rawText.split(/[.!?]+/).filter(s => s.trim().length > 5);
    const avgSentenceLen = sentences.length > 0
        ? Math.round(sentences.reduce((sum, s) => sum + s.trim().split(/\s+/).length, 0) / sentences.length)
        : 0;

    // Tokenize
    const words = rawText.toLowerCase()
        .replace(/[^\wçğıöşüâîûÇĞIİÖŞÜ\s-]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 2);

    const totalWords = words.length;
    const avgWordLen = totalWords > 0
        ? parseFloat((words.reduce((sum, w) => sum + w.length, 0) / totalWords).toFixed(1))
        : 0;

    // Stopword filtrele
    const filtered = words.filter(w => !trStop.has(w) && !enStop.has(w));

    // n-gram oluştur
    function buildNgrams(arr, n) {
        const freq = {};
        for (let i = 0; i <= arr.length - n; i++) {
            const gram = arr.slice(i, i + n).join(' ');
            freq[gram] = (freq[gram] || 0) + 1;
        }
        return Object.entries(freq)
            .filter(([, c]) => c >= 2)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 15)
            .map(([word, count]) => ({
                word,
                count,
                density: parseFloat(((count / totalWords) * 100).toFixed(2))
            }));
    }

    const unigrams = buildNgrams(filtered, 1);
    const bigrams = buildNgrams(filtered, 2);
    const trigrams = buildNgrams(filtered, 3);

    // Title ve description'da keyword kontrolü
    const title = document.title.toLowerCase();
    const desc = (document.querySelector('meta[name="description"]')?.content || '').toLowerCase();

    const titleKeywords = unigrams.slice(0, 5).map(k => ({
        ...k,
        inTitle: title.includes(k.word),
        inDescription: desc.includes(k.word)
    }));

    // Keyword stuffing kontrolü
    const stuffed = unigrams.filter(k => k.density > 3);

    return {
        totalWords,
        avgSentenceLen,
        avgWordLen,
        unigrams,
        bigrams,
        trigrams,
        titleKeywords,
        stuffedKeywords: stuffed
    };
}

async function analyzeCrawlability() {
    const origin = window.location.origin;
    const currentUrl = window.location.href;
    const result = { robots: null, sitemap: null };

    // robots.txt analizi
    try {
        const robotsResp = await fetch(origin + '/robots.txt', { cache: 'no-cache' });
        if (robotsResp.ok) {
            const text = await robotsResp.text();
            const lines = text.split('\n').map(l => l.trim());

            // Parse
            const disallowRules = [];
            const allowRules = [];
            let sitemapUrls = [];
            let currentAgent = null;

            lines.forEach(line => {
                if (line.startsWith('#') || !line) return;
                const [directive, ...rest] = line.split(':');
                const value = rest.join(':').trim();
                const dir = directive.trim().toLowerCase();

                if (dir === 'user-agent') currentAgent = value;
                else if (dir === 'disallow' && value) disallowRules.push({ agent: currentAgent, path: value });
                else if (dir === 'allow' && value) allowRules.push({ agent: currentAgent, path: value });
                else if (dir === 'sitemap' && value) sitemapUrls.push(value);
            });

            // Mevcut sayfa engellenmiş mi?
            const path = window.location.pathname;
            const isBlocked = disallowRules.some(r =>
                (r.agent === '*' || r.agent === null) && path.startsWith(r.path)
            );
            const isExplicitlyAllowed = allowRules.some(r =>
                (r.agent === '*' || r.agent === null) && path.startsWith(r.path)
            );

            result.robots = {
                found: true,
                content: text.substring(0, 2000),
                disallowCount: disallowRules.length,
                isCurrentPageBlocked: isBlocked && !isExplicitlyAllowed,
                sitemapUrls
            };
        } else {
            result.robots = { found: false };
        }
    } catch (e) {
        result.robots = { found: false, error: e.message };
    }

    // sitemap analizi — tüm sitemap'leri ve sitemap index'leri destekler
    const sitemapSources = (result.robots?.sitemapUrls?.length > 0)
        ? [...result.robots.sitemapUrls]
        : [origin + '/sitemap.xml'];

    // Tek bir sitemap URL'sini fetch + parse eden yardımcı
    async function fetchSitemap(url) {
        try {
            const resp = await fetch(url, { cache: 'no-cache' });
            if (!resp.ok) return { found: false, url };
            const text = await resp.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(text, 'text/xml');

            // Sitemap Index mi yoksa normal urlset mi?
            const childSitemaps = Array.from(doc.querySelectorAll('sitemap > loc')).map(el => el.textContent.trim());
            if (childSitemaps.length > 0) {
                return { found: true, url, type: 'index', children: childSitemaps };
            }

            const urls = Array.from(doc.querySelectorAll('url > loc')).map(el => el.textContent.trim());
            return { found: true, url, type: 'urlset', urls };
        } catch (e) {
            return { found: false, url, error: e.message };
        }
    }

    // Tüm sitemap kaynaklarını paralel olarak çek
    const sitemapResults = await Promise.all(sitemapSources.map(u => fetchSitemap(u)));

    // Sitemap index dosyalarındaki alt sitemap'leri de çek
    const subFetches = [];
    for (const sm of sitemapResults) {
        if (sm.found && sm.type === 'index') {
            for (const childUrl of sm.children) {
                subFetches.push(fetchSitemap(childUrl).then(r => ({ parent: sm.url, ...r })));
            }
        }
    }
    const subResults = await Promise.all(subFetches);

    // Sonuçları birleştir
    const allUrls = new Set();
    const sitemaps = [];  // Her sitemap'in bilgisi
    let foundInSitemap = null; // Hangi sitemap'te bulundu

    const currentNorm = currentUrl.replace(/\/+$/, '');

    for (const sm of sitemapResults) {
        if (!sm.found) {
            sitemaps.push({ url: sm.url, found: false });
            continue;
        }
        if (sm.type === 'index') {
            // Alt sitemap sonuçlarını bul
            const children = subResults.filter(s => s.parent === sm.url);
            const childInfos = [];
            for (const child of children) {
                if (child.found && child.type === 'urlset') {
                    child.urls.forEach(u => allUrls.add(u));
                    const match = child.urls.some(u => u.replace(/\/+$/, '') === currentNorm);
                    if (match && !foundInSitemap) foundInSitemap = child.url;
                    childInfos.push({ url: child.url, urlCount: child.urls.length, containsPage: match });
                } else {
                    childInfos.push({ url: child.url, urlCount: 0, found: false });
                }
            }
            sitemaps.push({ url: sm.url, found: true, type: 'index', children: childInfos });
        } else {
            sm.urls.forEach(u => allUrls.add(u));
            const match = sm.urls.some(u => u.replace(/\/+$/, '') === currentNorm);
            if (match && !foundInSitemap) foundInSitemap = sm.url;
            sitemaps.push({ url: sm.url, found: true, type: 'urlset', urlCount: sm.urls.length, containsPage: match });
        }
    }

    result.sitemap = {
        found: sitemaps.some(s => s.found),
        sitemaps,
        totalUrls: allUrls.size,
        isCurrentPageInSitemap: !!foundInSitemap,
        foundInSitemapUrl: foundInSitemap
    };

    return result;
}