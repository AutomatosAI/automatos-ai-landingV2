/**
 * Automatos v2 — research dynamic loader.
 *
 * Sibling of _fieldnotes.js. Filters the blog API to category=Research and
 * renders into research.html's `.featured` + `.index-grid`. Card links
 * point at `/research/{slug}` (server.js routes that to research-paper.html
 * or, when one exists, a hand-built static page).
 */
(function () {
  if (window.__automatosResearch) return;
  window.__automatosResearch = true;

  const cfg = window.AUTOMATOS_CONFIG || {};
  const API_BASE   = (cfg.apiBase || 'https://api.automatos.app') + '/api/widgets/blog';
  const WORKSPACE  = cfg.workspaceId;
  const PER_PAGE   = 12;
  const CATEGORY   = 'Research';

  // Hand-coded papers that aren't in the CMS. Merged into page-1 results
  // and de-duped against API posts by slug (so when one of these eventually
  // lands in the CMS, the API version wins).
  const STATIC_POSTS = [
    {
      title: 'From Tool Lists to Operating Graphs',
      slug: 'from-tool-lists-to-operating-graphs',
      excerpt: "Why the next bottleneck in AI agents isn't tool use — it's tool selection at scale. The pre-prompt intelligence layer that decides what deserves to enter the prompt at all.",
      cover_image_url: '/images/tool-routing-operating-graphs-cover.png',
      tags: ['Tool Routing', 'Attention Budget', 'Operating Graphs', 'Prompt Engineering', 'Agent Architecture'],
      author_name: 'Gerard Kavanagh',
      published_at: '2026-05-02T00:00:00Z',
      reading_time_minutes: 15,
      category: 'Research',
    },
  ];

  let currentPage = 1;

  function $grid()      { return document.querySelector('.index-grid'); }
  function $featured()  { return document.querySelector('.featured'); }
  function $count()     { return document.querySelector('.count'); }
  function $section()   { return document.querySelector('[data-comment-anchor="rs-index"]'); }

  if (!$grid()) return; // not the research page

  if (!WORKSPACE) {
    console.warn('[research] AUTOMATOS_CONFIG.workspaceId missing — set VITE_AUTOMATOS_WORKSPACE_ID in the deploy env.');
    document.addEventListener('DOMContentLoaded', () => {
      const grid = document.querySelector('.index-grid');
      if (!grid) return;
      while (grid.firstChild) grid.removeChild(grid.firstChild);
      const msg = document.createElement('div');
      msg.style.cssText = 'grid-column:1/-1;padding:80px var(--gutter);text-align:center;font-family:var(--serif);font-style:italic;font-size:22px;color:var(--muted);';
      msg.textContent = 'Workspace not configured — set VITE_AUTOMATOS_WORKSPACE_ID in the deploy env.';
      grid.appendChild(msg);
      const section = document.getElementById('rs-feat-section');
      if (section) section.setAttribute('hidden', '');
    });
    return;
  }

  // ── Fetch ────────────────────────────────────────────────────────────
  async function fetchPosts(page) {
    const params = new URLSearchParams({
      workspace_id: WORKSPACE,
      per_page: String(PER_PAGE),
      page: String(page),
      category: CATEGORY,
    });
    const url = `${API_BASE}/posts?${params}`;
    const r = await fetch(url);
    console.log('[research] GET', url, '→', r.status);
    if (!r.ok) {
      const body = await r.text().catch(() => '(no body)');
      console.warn('[research] error body:', body.slice(0, 500));
      throw new Error(`posts ${r.status}`);
    }
    const json = await r.json();
    console.log('[research] papers received:', json.total ?? (json.posts || []).length, 'total');
    return mergeStatic(json, page);
  }

  function mergeStatic(data, page) {
    if (page !== 1) return data;
    const apiSlugs = new Set((data.posts || []).map(p => p.slug));
    const extras = STATIC_POSTS.filter(p => !apiSlugs.has(p.slug));
    if (extras.length === 0) return data;
    return {
      ...data,
      posts: [...extras, ...(data.posts || [])],
      total: (data.total ?? (data.posts || []).length) + extras.length,
    };
  }

  // ── Helpers ──────────────────────────────────────────────────────────
  function fmtShortDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${String(d.getDate()).padStart(2,'0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
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
  function titleNodes(title) {
    const t = String(title || '').trim();
    const words = t.split(/\s+/);
    if (words.length < 2) return [document.createTextNode(t)];
    const head = words.slice(0, -1).join(' ') + ' ';
    const tail = words.slice(-1)[0];
    return [document.createTextNode(head), el('em', { text: tail })];
  }

  // ── Render: a single research card (field-note plate) ────────────────
  function renderPaperCard(post, num) {
    const href = `/research/${encodeURIComponent(post.slug)}`;
    const cat = post.category || 'Research';

    const fnMeta = el('div', { class: 'fn-meta' }, [
      el('span', { text: `RP · ${pad2(num)} / ${cat}` }),
      el('span', { text: fmtPlateDate(post.published_at) }),
    ]);
    const fnQuote = el('div', { class: 'fn-quote' });
    titleNodes(post.title).forEach(n => fnQuote.appendChild(n));
    const fnAttr = el('div', {
      class: 'fn-attr',
      text: post.excerpt ? `— ${(post.excerpt || '').slice(0, 80)}` : `— ${post.author_name || 'Automatos'}`,
    });

    const plate = el('a', { class: 'plate plate-fieldnote', href }, [fnMeta, fnQuote, fnAttr]);

    const meta = el('span');
    meta.appendChild(el('b', { text: post.author_name || 'Automatos' }));
    const minutes = post.reading_time_minutes ? ` · ${post.reading_time_minutes} min` : '';
    meta.appendChild(document.createTextNode(` · ${fmtShortDate(post.published_at)}${minutes}`));
    const read = el('a', { class: 'read', href, text: 'Read paper →' });
    const foot = el('div', { class: 'foot' }, [meta, read]);

    return el('article', { class: 'note' }, [plate, foot]);
  }

  // ── Render: featured paper (field-note plate, large) ─────────────────
  function renderFeatured(post, num) {
    const feat = $featured();
    if (!feat) return;

    const photo = el('div', { class: 'photo' });
    const plate = el('div', { class: 'plate plate-fieldnote' });
    const meta = el('div', { class: 'fn-meta' }, [
      el('span', { text: `RP · ${pad2(num)} / ${post.category || 'Research'}` }),
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
    const bodyMeta = el('div', { class: 'meta' }, [
      el('span', null, [ el('b', { text: `Research paper · ${pad2(num)}` }) ]),
      el('span', { text: post.category || 'Research' }),
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
    const read = el('a', { class: 'read', href: `/research/${encodeURIComponent(post.slug)}`, text: 'Read the paper →' });

    body.appendChild(bodyMeta);
    body.appendChild(h2);
    body.appendChild(dek);
    body.appendChild(spacer);
    body.appendChild(author);
    body.appendChild(read);

    while (feat.firstChild) feat.removeChild(feat.firstChild);
    feat.appendChild(photo);
    feat.appendChild(body);
  }

  function renderCount(showing, total) {
    const c = $count();
    if (!c) return;
    while (c.firstChild) c.removeChild(c.firstChild);
    if (showing === 0 && total === 0) { c.appendChild(document.createTextNode(' ')); return; }
    c.appendChild(document.createTextNode('Showing '));
    c.appendChild(el('b', { text: String(showing) }));
    c.appendChild(document.createTextNode(` of ${total}`));
  }

  function renderPagination(page, totalPages) {
    const section = $section();
    if (!section) return;
    let bar = document.getElementById('rs-pagination');
    if (bar) bar.remove();
    if (totalPages <= 1) return;

    bar = el('div', {
      id: 'rs-pagination',
      style: 'display:flex;justify-content:center;align-items:center;gap:18px;padding:32px var(--gutter);font-family:var(--mono);font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--muted);border-top:1px solid var(--rule-c);'
    });

    const prev = el('button', { type: 'button', text: '← Prev', style: 'padding:8px 14px;border:1px solid var(--rule-strong);background:transparent;color:var(--fg);font:inherit;letter-spacing:inherit;text-transform:inherit;cursor:pointer;' });
    if (page <= 1) prev.disabled = true;
    prev.addEventListener('click', () => { currentPage = Math.max(1, page - 1); load(); });

    const status = el('span', { text: `Page ${page} of ${totalPages}` });

    const next = el('button', { type: 'button', text: 'Next →', style: 'padding:8px 14px;border:1px solid var(--rule-strong);background:transparent;color:var(--fg);font:inherit;letter-spacing:inherit;text-transform:inherit;cursor:pointer;' });
    if (page >= totalPages) next.disabled = true;
    next.addEventListener('click', () => { currentPage = Math.min(totalPages, page + 1); load(); });

    bar.appendChild(prev); bar.appendChild(status); bar.appendChild(next);
    section.appendChild(bar);
  }

  function showEmptyGrid(message) {
    const grid = $grid();
    if (!grid) return;
    while (grid.firstChild) grid.removeChild(grid.firstChild);
    const empty = el('div', {
      style: 'grid-column:1/-1;padding:80px var(--gutter);text-align:center;font-family:var(--serif);font-style:italic;font-size:22px;color:var(--muted);',
      text: message,
    });
    grid.appendChild(empty);
  }

  function revealFeaturedSection(show) {
    const section = document.getElementById('rs-feat-section');
    if (!section) return;
    if (show) section.removeAttribute('hidden');
    else section.setAttribute('hidden', '');
  }

  // ── Load + render flow ───────────────────────────────────────────────
  async function load() {
    const grid = $grid();
    if (!grid) return;
    grid.style.opacity = '0.5';
    try {
      const data = await fetchPosts(currentPage);
      const posts = data.posts || [];
      const total = data.total ?? posts.length;
      const totalPages = data.total_pages ?? 1;

      if (posts.length === 0) {
        revealFeaturedSection(false);
        showEmptyGrid('No research papers published yet.');
        renderCount(0, total);
        renderPagination(currentPage, totalPages);
        return;
      }

      const baseNum = total - ((currentPage - 1) * PER_PAGE);

      if (currentPage === 1) {
        renderFeatured(posts[0], baseNum);
        revealFeaturedSection(true);
      }

      const gridPosts = currentPage === 1 ? posts.slice(1) : posts;

      while (grid.firstChild) grid.removeChild(grid.firstChild);
      gridPosts.forEach((post, i) => {
        const num = baseNum - 1 - i;
        grid.appendChild(renderPaperCard(post, num));
      });

      renderCount(gridPosts.length + (currentPage === 1 ? 1 : 0), total);
      renderPagination(currentPage, totalPages);
    } catch (err) {
      console.warn('[research] fetch failed; falling back to static posts:', err && err.message ? err.message : err);
      // Render the static-only set so at least the hand-coded papers stay visible.
      if (STATIC_POSTS.length > 0 && currentPage === 1) {
        const base = STATIC_POSTS.length;
        renderFeatured(STATIC_POSTS[0], base);
        revealFeaturedSection(true);
        const grid = $grid();
        while (grid.firstChild) grid.removeChild(grid.firstChild);
        STATIC_POSTS.slice(1).forEach((post, i) => {
          grid.appendChild(renderPaperCard(post, base - 1 - i));
        });
        renderCount(STATIC_POSTS.length, STATIC_POSTS.length);
      } else {
        revealFeaturedSection(false);
        showEmptyGrid('Papers are loading from the lab. Check back in a moment.');
        renderCount(0, 0);
      }
    } finally {
      grid.style.opacity = '';
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', load);
  } else {
    load();
  }
})();
