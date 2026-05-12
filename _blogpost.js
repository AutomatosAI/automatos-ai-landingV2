/**
 * Automatos v2 — single blog post loader.
 *
 * Reads the slug from the URL path, fetches the post from
 * `${apiBase}/api/widgets/blog/posts/{slug}?workspace_id=...` (same
 * endpoint v1's BlogPost.tsx uses), and renders into the blog-post.html
 * shell. Sanitises HTML content with DOMPurify (loaded via CDN) and
 * appends parsed nodes — no innerHTML assignment.
 *
 * 404 on the post → minimal "not found" state with a link back to
 * field-notes.
 */
(function () {
  if (window.__automatosBlogPost) return;
  window.__automatosBlogPost = true;

  const cfg = window.AUTOMATOS_CONFIG || {};
  const API_BASE  = (cfg.apiBase || 'https://api.automatos.app') + '/api/widgets/blog';
  const WORKSPACE = cfg.workspaceId;

  function getSlug() {
    const path = window.location.pathname.replace(/\/+$/, '');
    const m = path.match(/^\/(?:blog|research)\/(.+)$/);
    if (!m) return null;
    return decodeURIComponent(m[1]);
  }

  function isResearch() {
    return /^\/research\//.test(window.location.pathname);
  }

  function fmtDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${String(d.getDate()).padStart(2,'0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
  }
  function setText(id, v) { const el = document.getElementById(id); if (el && v != null) el.textContent = v; }
  function setAttr(id, attr, v) { const el = document.getElementById(id); if (el && v != null) el.setAttribute(attr, v); }

  function fail(msg) {
    const title = document.getElementById('bpTitleBlock');
    const body = document.getElementById('bpBody');
    const masthead = document.getElementById('bpMasthead');
    const cover = document.getElementById('bpCover');
    const authorStrip = document.querySelector('.author-strip');
    if (masthead) masthead.style.display = 'none';
    if (cover) cover.style.display = 'none';
    if (authorStrip) authorStrip.style.display = 'none';
    if (title) title.remove();
    if (body) {
      while (body.firstChild) body.removeChild(body.firstChild);
      const wrap = document.createElement('div');
      wrap.className = 'err';
      const h = document.createElement('h1');
      h.textContent = 'Note not found.';
      const p = document.createElement('p');
      p.textContent = msg || 'This field note may have been moved or unpublished. Head back to the index for the latest entries.';
      const a = document.createElement('a');
      a.href = '/field-notes';
      a.textContent = '← Back to Field notes';
      a.style.cssText = 'font-family:var(--mono);font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:var(--fg);border-bottom:1px solid var(--fg);padding-bottom:2px;';
      wrap.appendChild(h); wrap.appendChild(p); wrap.appendChild(a);
      body.appendChild(wrap);
      body.style.maxWidth = 'none';
      body.style.padding = '0';
    }
    document.title = 'Note not found — Automatos';
  }

  // Wait for DOMPurify to be available (CDN script is defer-loaded)
  function waitForPurify(cb, tries) {
    tries = tries || 0;
    if (window.DOMPurify) return cb();
    if (tries > 40) return cb(); // give up after ~4s, render text fallback
    setTimeout(() => waitForPurify(cb, tries + 1), 100);
  }

  // Sanitise HTML, parse into nodes, append to target — never assigns innerHTML directly.
  // SVG profile is enabled so inline editorial plates (cutaway) survive.
  function appendSanitisedHTML(target, html) {
    if (!html) return;
    if (!window.DOMPurify) {
      const p = document.createElement('p');
      p.textContent = 'Content unavailable.';
      target.appendChild(p);
      return;
    }
    const clean = window.DOMPurify.sanitize(html, {
      USE_PROFILES: { html: true, svg: true, svgFilters: true },
      RETURN_DOM_FRAGMENT: true,
    });
    target.appendChild(clean);
  }

  // Build a field-note plate as a fallback cover. Uses the post excerpt or
  // (when missing) the title as the quote — leans into the editorial vocabulary.
  function buildCoverPlate(post) {
    const plate = document.createElement('div');
    plate.className = 'plate plate-fieldnote';

    const fmtPlateDate = (iso) => {
      if (!iso) return '';
      const d = new Date(iso);
      if (isNaN(d.getTime())) return '';
      return `${String(d.getDate()).padStart(2,'0')} · ${String(d.getMonth()+1).padStart(2,'0')} · ${String(d.getFullYear()).slice(-2)}`;
    };

    const meta = document.createElement('div');
    meta.className = 'fn-meta';
    const metaL = document.createElement('span');
    metaL.textContent = `Field note / ${post.category || 'Field note'}`;
    const metaR = document.createElement('span');
    metaR.textContent = fmtPlateDate(post.published_at);
    meta.appendChild(metaL); meta.appendChild(metaR);

    const quote = document.createElement('div');
    quote.className = 'fn-quote';
    const quoteText = post.excerpt || post.title || '';
    const words = String(quoteText).trim().split(/\s+/);
    if (words.length >= 2) {
      quote.appendChild(document.createTextNode(words.slice(0, -1).join(' ') + ' '));
      const em = document.createElement('em');
      em.textContent = words[words.length - 1];
      quote.appendChild(em);
    } else {
      quote.textContent = quoteText;
    }

    const attr = document.createElement('div');
    attr.className = 'fn-attr';
    attr.textContent = `— ${post.author_name || 'Automatos'} · vol. 01`;

    plate.appendChild(meta); plate.appendChild(quote); plate.appendChild(attr);
    return plate;
  }

  function injectCanonical(slug) {
    const path = isResearch() ? `/research/${slug}` : `/blog/${slug}`;
    let link = document.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      document.head.appendChild(link);
    }
    link.setAttribute('href', `https://automatos.app${path}`);
  }

  function injectArticleSchema(post) {
    const path = isResearch() ? `/research/${post.slug}` : `/blog/${post.slug}`;
    const url = `https://automatos.app${path}`;
    const section = isResearch() ? 'Research' : (post.category || 'Field note');
    const indexUrl = isResearch() ? 'https://automatos.app/research' : 'https://automatos.app/field-notes';
    const indexName = isResearch() ? 'Research' : 'Field notes';

    const article = {
      '@context': 'https://schema.org',
      '@type': isResearch() ? 'ScholarlyArticle' : 'Article',
      headline: post.title,
      description: post.seo_description || post.excerpt || '',
      url,
      mainEntityOfPage: url,
      datePublished: post.published_at,
      dateModified: post.updated_at || post.published_at,
      author: { '@type': 'Person', name: post.author_name || 'Automatos AI' },
      publisher: {
        '@type': 'Organization',
        name: 'Automatos AI',
        logo: { '@type': 'ImageObject', url: 'https://automatos.app/images/automatos-mark-black.png' },
      },
      articleSection: section,
      inLanguage: 'en',
    };
    if (post.cover_image_url) {
      article.image = post.cover_image_url.startsWith('http')
        ? post.cover_image_url
        : `https://automatos.app${post.cover_image_url}`;
    }
    if (Array.isArray(post.tags) && post.tags.length) article.keywords = post.tags.join(', ');

    const breadcrumb = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://automatos.app/' },
        { '@type': 'ListItem', position: 2, name: indexName, item: indexUrl },
        { '@type': 'ListItem', position: 3, name: post.title, item: url },
      ],
    };

    // Remove any previously-injected schemas, then add the two for this post.
    document.querySelectorAll('script[data-jsonld="post"]').forEach((s) => s.remove());
    [article, breadcrumb].forEach((data) => {
      const s = document.createElement('script');
      s.type = 'application/ld+json';
      s.setAttribute('data-jsonld', 'post');
      s.textContent = JSON.stringify(data);
      document.head.appendChild(s);
    });
  }

  function renderPost(post) {
    document.title = `${post.title} — Automatos`;
    setAttr('bpDesc', 'content', post.seo_description || post.excerpt || '');
    injectCanonical(post.slug);
    injectArticleSchema(post);
    setAttr('bpOgTitle', 'content', post.title);
    setAttr('bpOgDesc', 'content', post.seo_description || post.excerpt || '');
    setAttr('bpOgImage', 'content', post.cover_image_url || '');

    // Heading with italic-em on the last word (editorial accent)
    const h = document.getElementById('bpHeading');
    if (h) {
      while (h.firstChild) h.removeChild(h.firstChild);
      const words = String(post.title || '').trim().split(/\s+/);
      if (words.length >= 2) {
        h.appendChild(document.createTextNode(words.slice(0, -1).join(' ') + ' '));
        const em = document.createElement('em');
        em.textContent = words[words.length - 1];
        h.appendChild(em);
      } else {
        h.textContent = post.title || '';
      }
    }

    setText('bpDek', post.excerpt || '');
    setText('bpCategory', post.category || 'Field note');
    setText('bpDate', fmtDate(post.published_at));
    setText('bpReading', post.reading_time_minutes ? `${post.reading_time_minutes} min read` : '— min read');

    const cover = document.getElementById('bpCover');
    if (cover) {
      const url = post.cover_image_url;
      const usePlate = () => {
        cover.classList.add('is-empty');
        while (cover.firstChild) cover.removeChild(cover.firstChild);
        cover.appendChild(buildCoverPlate(post));
      };
      if (url) {
        // Preload the image — only show it if it actually loads. Otherwise
        // fall back to the field-note plate so we never leave an empty box.
        const probe = new Image();
        probe.onload = () => {
          cover.classList.remove('is-empty');
          cover.style.backgroundImage = `url("${url}")`;
          setText('bpCoverFig', `Fig. — ${post.category || 'Field note'}`);
          setText('bpCoverPlate', 'FN / ' + (post.slug || '—').slice(0, 8).toUpperCase());
        };
        probe.onerror = () => {
          console.warn('[blogpost] cover image failed to load:', url, '— falling back to plate');
          usePlate();
        };
        probe.src = url;
      } else {
        usePlate();
      }
    }

    waitForPurify(() => {
      const body = document.getElementById('bpBody');
      if (!body) return;
      while (body.firstChild) body.removeChild(body.firstChild);
      appendSanitisedHTML(body, post.content || '');
    });

    setText('bpAuthor', post.author_name || 'Automatos');
    const meta = [];
    if (post.published_at) meta.push(fmtDate(post.published_at));
    if (post.category) meta.push(post.category);
    setText('bpAuthorMeta', meta.length ? '· ' + meta.join(' · ') : '');
  }

  function adoptResearchContext() {
    if (!isResearch()) return;
    const fn = document.getElementById('bpNavFieldNotes');
    const rs = document.getElementById('bpNavResearch');
    if (fn) fn.classList.remove('is-current');
    if (rs) rs.classList.add('is-current');
    const idx = document.getElementById('bpIndexLink');
    if (idx) { idx.href = '/research'; }
    const back = document.getElementById('bpBackLink');
    if (back) { back.href = '/research'; back.textContent = '← Back to Research'; }
  }

  async function load() {
    adoptResearchContext();
    const slug = getSlug();
    if (!slug) { fail('No post specified.'); return; }
    if (!WORKSPACE) { fail('Blog config missing.'); return; }
    try {
      const url = `${API_BASE}/posts/${encodeURIComponent(slug)}?workspace_id=${encodeURIComponent(WORKSPACE)}`;
      const r = await fetch(url);
      if (r.status === 404) { fail(); return; }
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const post = await r.json();
      renderPost(post);
    } catch (err) {
      console.warn('[blogpost] fetch failed:', err && err.message ? err.message : err);
      fail();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', load);
  } else {
    load();
  }
})();
