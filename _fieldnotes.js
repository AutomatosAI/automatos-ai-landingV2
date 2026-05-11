/**
 * Automatos v2 — field-notes dynamic loader.
 *
 * Direct-fetches blog posts from api.automatos.app and renders them into
 * the existing `.featured` + `.index-grid` markup so the editorial layout
 * stays intact. If the API is unreachable, returns 0 posts, or config is
 * missing, the hand-written static cards stay visible (graceful fallback).
 *
 * Categories: each `.filters a` is wired to re-fetch with a category filter.
 * Pagination: simple Prev/Next appended below the grid.
 *
 * Post links: `/blog/{slug}` — blog detail pages don't exist in v2 yet, so
 * these will 404 until those templates are added. Tracked as a follow-up.
 */
(function () {
  if (window.__automatosFieldnotes) return;
  window.__automatosFieldnotes = true;

  const cfg = window.AUTOMATOS_CONFIG || {};
  const API_BASE   = (cfg.apiBase || 'https://api.automatos.app') + '/api/widgets/blog';
  const WORKSPACE  = cfg.workspaceId;
  const PER_PAGE   = 9;

  // Page-scope state
  let currentPage = 1;
  let currentCategory = null;
  let allCategories = [];

  function $grid()      { return document.querySelector('.index-grid'); }
  function $featured()  { return document.querySelector('.featured'); }
  function $filtersBox(){ return document.querySelector('.filters'); }
  function $count()     { return document.querySelector('.count'); }
  function $section()   { return document.querySelector('[data-comment-anchor="fn-filter"]'); }

  if (!WORKSPACE) {
    console.warn('[fieldnotes] AUTOMATOS_CONFIG.workspaceId missing — static cards remain.');
    return;
  }
  if (!$grid()) return; // not the field-notes page

  // ── Fetch ────────────────────────────────────────────────────────────
  async function fetchPosts(page, category) {
    const params = new URLSearchParams({
      workspace_id: WORKSPACE,
      per_page: String(PER_PAGE),
      page: String(page),
    });
    if (category) params.set('category', category);
    const r = await fetch(`${API_BASE}/posts?${params}`);
    if (!r.ok) throw new Error(`posts ${r.status}`);
    return r.json();
  }

  async function fetchCategories() {
    const r = await fetch(`${API_BASE}/categories?workspace_id=${encodeURIComponent(WORKSPACE)}`);
    if (!r.ok) return [];
    const data = await r.json();
    if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object') {
      return data.map(item => item.category);
    }
    return Array.isArray(data) ? data : [];
  }

  // ── Helpers ──────────────────────────────────────────────────────────
  function fmtShortDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${String(d.getDate()).padStart(2,'0')} ${months[d.getMonth()]}`;
  }
  function fmtPlateDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return `${String(d.getDate()).padStart(2,'0')} · ${String(d.getMonth()+1).padStart(2,'0')} · ${String(d.getFullYear()).slice(-2)}`;
  }
  function pad2(n) { return String(n).padStart(2, '0'); }
  function el(tag, attrs, kids) {
    const n = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      if (k === 'text') n.textContent = attrs[k];
      else if (k === 'style') n.setAttribute('style', attrs[k]);
      else n.setAttribute(k, attrs[k]);
    }
    if (kids) kids.forEach(c => { if (c) n.appendChild(c); });
    return n;
  }
  // Split title for italic accent — last word becomes <em> if title has 2+ words
  function titleNodes(title) {
    const t = String(title || '').trim();
    const words = t.split(/\s+/);
    if (words.length < 2) return [document.createTextNode(t)];
    const head = words.slice(0, -1).join(' ') + ' ';
    const tail = words.slice(-1)[0];
    return [
      document.createTextNode(head),
      el('em', { text: tail })
    ];
  }

  // ── Render: a single note card (field-note plate) ────────────────────
  function renderNoteCard(post, fnNum) {
    const href = `/blog/${encodeURIComponent(post.slug)}`;
    const cat = post.category || 'Field notes';

    // Plate: field-note variant. Title becomes the quote (last word italicised).
    const fnMeta = el('div', { class: 'fn-meta' }, [
      el('span', { text: `FN · ${pad2(fnNum)} / ${cat}` }),
      el('span', { text: fmtPlateDate(post.published_at) }),
    ]);
    const fnQuote = el('div', { class: 'fn-quote' });
    titleNodes(post.title).forEach(n => fnQuote.appendChild(n));
    const fnAttr = el('div', {
      class: 'fn-attr',
      text: post.excerpt ? `— ${(post.excerpt || '').slice(0, 80)}` : `— ${post.author_name || 'Automatos'}`,
    });

    const plate = el('a', { class: 'plate plate-fieldnote', href }, [fnMeta, fnQuote, fnAttr]);

    // Foot row beneath the plate: author/date/category + read link.
    const meta = el('span');
    meta.appendChild(el('b', { text: post.author_name || 'Automatos' }));
    meta.appendChild(document.createTextNode(` · ${fmtShortDate(post.published_at)} · ${cat}`));
    const read = el('a', { class: 'read', href, text: 'Read →' });
    const foot = el('div', { class: 'foot' }, [meta, read]);

    return el('article', { class: 'note' }, [plate, foot]);
  }

  // ── Render: featured (post 0) ────────────────────────────────────────
  // Always render a plate — CMS-driven cover photos are intentionally
  // ignored on field-notes until the CMS has plate metadata. The
  // editorial vocabulary is the visual; photos can come back as the
  // primary figure once `plate_type` is part of the schema.
  function renderFeatured(post, fnNum) {
    const feat = $featured();
    if (!feat) return;

    const photo = el('div', { class: 'photo' });
    const plate = el('div', { class: 'plate plate-fieldnote' });
    const meta = el('div', { class: 'fn-meta' }, [
      el('span', { text: `FN · ${pad2(fnNum)} / ${post.category || 'Field note'}` }),
      el('span', { text: fmtPlateDate(post.published_at) }),
    ]);
    const quote = el('div', { class: 'fn-quote' });
    titleNodes(post.title).forEach(n => quote.appendChild(n));
    const attr = el('div', { class: 'fn-attr', text: `— ${post.author_name || 'Automatos'} · vol. 01` });
    plate.appendChild(meta);
    plate.appendChild(quote);
    plate.appendChild(attr);
    photo.appendChild(plate);

    const body = el('div', { class: 'body' });

    const meta = el('div', { class: 'meta' }, [
      el('span', null, [ el('b', { text: `Field Note · ${pad2(fnNum)}` }) ]),
      el('span', { text: post.category || 'Field notes' }),
      el('span', { text: post.reading_time_minutes ? `${post.reading_time_minutes} min read` : '' }),
    ]);

    const h2 = el('h2');
    titleNodes(post.title).forEach(n => h2.appendChild(n));

    const dek = el('p', { class: 'dek', text: post.excerpt || '' });
    const spacer = el('div');

    const author = el('div', { class: 'author' }, [
      el('span', null, [ el('b', { text: post.author_name || 'Automatos' }) ]),
      el('span', { text: post.published_at ? fmtShortDate(post.published_at) : '' }),
    ]);
    const read = el('a', { class: 'read', href: `/blog/${encodeURIComponent(post.slug)}`, text: 'Read the note →' });

    body.appendChild(meta);
    body.appendChild(h2);
    body.appendChild(dek);
    body.appendChild(spacer);
    body.appendChild(author);
    body.appendChild(read);

    while (feat.firstChild) feat.removeChild(feat.firstChild);
    feat.appendChild(photo);
    feat.appendChild(body);
  }

  // ── Render: filters ──────────────────────────────────────────────────
  function renderFilters(categories, active) {
    const box = $filtersBox();
    if (!box) return;
    while (box.firstChild) box.removeChild(box.firstChild);

    const all = el('a', { class: active ? '' : 'is-on', href: '#', text: 'All' });
    all.addEventListener('click', (e) => { e.preventDefault(); currentCategory = null; currentPage = 1; load(); });
    box.appendChild(all);

    categories.forEach(cat => {
      const a = el('a', { class: active === cat ? 'is-on' : '', href: '#', text: cat });
      a.addEventListener('click', (e) => { e.preventDefault(); currentCategory = cat; currentPage = 1; load(); });
      box.appendChild(a);
    });
  }

  // ── Render: count ────────────────────────────────────────────────────
  function renderCount(showing, total) {
    const c = $count();
    if (!c) return;
    while (c.firstChild) c.removeChild(c.firstChild);
    c.appendChild(document.createTextNode('Showing '));
    c.appendChild(el('b', { text: String(showing) }));
    c.appendChild(document.createTextNode(` of ${total}`));
  }

  // ── Render: pagination ───────────────────────────────────────────────
  function renderPagination(page, totalPages) {
    const section = $section();
    if (!section) return;
    let bar = document.getElementById('fn-pagination');
    if (bar) bar.remove();
    if (totalPages <= 1) return;

    bar = el('div', {
      id: 'fn-pagination',
      style: 'display:flex;justify-content:center;align-items:center;gap:18px;padding:32px var(--gutter);font-family:var(--mono);font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--muted);border-top:1px solid var(--rule-c);'
    });

    const prev = el('button', {
      type: 'button',
      text: '← Prev',
      style: 'padding:8px 14px;border:1px solid var(--rule-strong);background:transparent;color:var(--fg);font:inherit;letter-spacing:inherit;text-transform:inherit;cursor:pointer;'
    });
    if (page <= 1) prev.disabled = true;
    prev.addEventListener('click', () => { currentPage = Math.max(1, page - 1); load(); });

    const status = el('span', { text: `Page ${page} of ${totalPages}` });

    const next = el('button', {
      type: 'button',
      text: 'Next →',
      style: 'padding:8px 14px;border:1px solid var(--rule-strong);background:transparent;color:var(--fg);font:inherit;letter-spacing:inherit;text-transform:inherit;cursor:pointer;'
    });
    if (page >= totalPages) next.disabled = true;
    next.addEventListener('click', () => { currentPage = Math.min(totalPages, page + 1); load(); });

    bar.appendChild(prev);
    bar.appendChild(status);
    bar.appendChild(next);
    section.appendChild(bar);
  }

  // ── Load + render flow ───────────────────────────────────────────────
  async function load() {
    const grid = $grid();
    if (!grid) return;
    grid.style.opacity = '0.5';
    try {
      const data = await fetchPosts(currentPage, currentCategory);
      const posts = data.posts || [];
      const total = data.total ?? posts.length;
      const totalPages = data.total_pages ?? 1;

      if (posts.length === 0) {
        // No posts back. On page 1: leave static cards alone (fallback).
        // On later pages: show empty state.
        if (currentPage > 1) {
          while (grid.firstChild) grid.removeChild(grid.firstChild);
          const empty = el('div', {
            style: 'grid-column:1/-1;padding:80px var(--gutter);text-align:center;font-family:var(--serif);font-size:22px;color:var(--muted);',
            text: 'No notes here yet.'
          });
          grid.appendChild(empty);
        }
        renderCount(0, total);
        renderPagination(currentPage, totalPages);
        return;
      }

      // Numbering: highest FN.NN for the first (most recent) post on page 1
      const baseNum = total - ((currentPage - 1) * PER_PAGE);

      // Featured: keep the hand-built static plate. When the CMS gains
      // `plate_type` + `plate_data`, restore the call:
      //   if (currentPage === 1) renderFeatured(posts[0], baseNum);
      // For now the editorial cutaway is the showpiece.

      // Grid: all but the featured on page 1; all posts on later pages
      const gridPosts = currentPage === 1 ? posts.slice(1) : posts;

      while (grid.firstChild) grid.removeChild(grid.firstChild);
      gridPosts.forEach((post, i) => {
        const fnNum = baseNum - 1 - i; // skip featured
        grid.appendChild(renderNoteCard(post, fnNum));
      });

      renderCount(gridPosts.length + (currentPage === 1 ? 1 : 0), total);
      renderPagination(currentPage, totalPages);
    } catch (err) {
      console.warn('[fieldnotes] fetch failed; keeping static cards:', err && err.message ? err.message : err);
    } finally {
      grid.style.opacity = '';
    }
  }

  async function init() {
    try {
      allCategories = await fetchCategories();
      if (allCategories.length > 0) renderFilters(allCategories, currentCategory);
    } catch (_) { /* swallow — filters stay static */ }
    load();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
