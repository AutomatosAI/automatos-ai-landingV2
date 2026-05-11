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
    const m = path.match(/^\/blog\/(.+)$/);
    if (!m) return null;
    return decodeURIComponent(m[1]);
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
  function appendSanitisedHTML(target, html) {
    if (!html) return;
    if (!window.DOMPurify) {
      const p = document.createElement('p');
      p.textContent = 'Content unavailable.';
      target.appendChild(p);
      return;
    }
    const clean = window.DOMPurify.sanitize(html, {
      USE_PROFILES: { html: true },
      RETURN_DOM_FRAGMENT: true,
    });
    target.appendChild(clean);
  }

  function renderPost(post) {
    document.title = `${post.title} — Automatos`;
    setAttr('bpDesc', 'content', post.seo_description || post.excerpt || '');
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
      if (post.cover_image_url) {
        cover.classList.remove('is-empty');
        cover.style.backgroundImage = `url("${post.cover_image_url}")`;
      } else {
        cover.classList.add('is-empty');
      }
    }
    setText('bpCoverFig', `Fig. — ${post.category || 'Field note'}`);
    setText('bpCoverPlate', 'FN / ' + (post.slug || '—').slice(0, 8).toUpperCase());

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

  async function load() {
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
