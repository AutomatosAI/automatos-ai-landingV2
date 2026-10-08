/**
 * Automatos v2 — the EU AI Act checker (/eu-ai-act/checker).
 *
 * Five questions → an indicative risk tier (prohibited, high, limited,
 * minimal), the articles to review, an obligations checklist and why the
 * answers landed there. Runs entirely in the browser: nothing is sent or
 * stored. Ported from the Studio site's EuAiActChecker (8 Oct 2026), which
 * moves here as the canonical copy.
 *
 * Educational only, not legal advice. Each answer can force a tier; the
 * highest forced tier wins.
 */
(function () {
  const QUESTIONS = [
    { id: 'domain', title: 'What domain does your AI system operate in?',
      description: 'Annex III of the EU AI Act lists domains that are automatically high-risk. Pick the closest match.',
      options: [
        { label: 'Critical infrastructure (energy, water, transport, digital)', value: 'critical-infra', forces: 'high', articles: ['Art. 6', 'Annex III §2'], hint: 'Annex III §2: systems used as safety components of critical infrastructure are classified high-risk.' },
        { label: 'Employment, HR, recruiting, worker management', value: 'hr', forces: 'high', articles: ['Art. 6', 'Annex III §4'], hint: 'Annex III §4: AI in recruitment, promotion, task allocation or monitoring of workers is high-risk.' },
        { label: 'Education, admissions, or assessment of students', value: 'education', forces: 'high', articles: ['Art. 6', 'Annex III §3'], hint: 'Annex III §3: AI used to determine access to education or evaluate learning outcomes is high-risk.' },
        { label: 'Credit scoring, insurance, or essential private services', value: 'finance', forces: 'high', articles: ['Art. 6', 'Annex III §5'], hint: 'Annex III §5: creditworthiness and risk assessment for essential services is high-risk.' },
        { label: 'Law enforcement, migration, border control, justice', value: 'law', forces: 'high', articles: ['Art. 6', 'Annex III §6–8'], hint: 'Annex III §6–8: law-enforcement, migration and judicial AI systems are high-risk.' },
        { label: 'Healthcare, medical devices, or patient-facing diagnostics', value: 'health', forces: 'high', articles: ['Art. 6(1)(a)'], hint: 'A safety component of a medical device is high-risk under Art. 6(1)(a).' },
        { label: 'General business automation (marketing, support, ops)', value: 'business', articles: ['Art. 50'] },
        { label: 'Internal productivity / developer tooling', value: 'internal' },
      ] },
    { id: 'prohibited', title: 'Does your system do any of the following?',
      description: 'Article 5 lists practices that are banned outright. If any of these apply, the system cannot be deployed in the EU.',
      options: [
        { label: 'Social scoring of individuals by public or private actors', value: 'social-scoring', forces: 'prohibited', articles: ['Art. 5(1)(c)'] },
        { label: 'Manipulative techniques exploiting vulnerabilities', value: 'manipulation', forces: 'prohibited', articles: ['Art. 5(1)(a)–(b)'] },
        { label: 'Real-time biometric identification in public spaces', value: 'biometric', forces: 'prohibited', articles: ['Art. 5(1)(h)'] },
        { label: 'Emotion recognition at work or in education', value: 'emotion', forces: 'prohibited', articles: ['Art. 5(1)(f)'] },
        { label: 'Predictive policing based solely on profiling', value: 'predictive-policing', forces: 'prohibited', articles: ['Art. 5(1)(d)'] },
        { label: 'None of the above', value: 'none' },
      ] },
    { id: 'interaction', title: 'How do end users interact with the system?',
      description: 'Article 50 requires transparency when users interact with AI, receive AI-generated content, or could be misled.',
      options: [
        { label: 'Users chat directly with an AI (chatbot, assistant, voicebot)', value: 'direct-chat', forces: 'limited', articles: ['Art. 50(1)'], hint: 'Art. 50(1): you must clearly inform users they are interacting with AI.' },
        { label: 'AI generates content users consume (text, images, video)', value: 'content-gen', forces: 'limited', articles: ['Art. 50(2)', 'Art. 50(4)'], hint: 'Art. 50(2) and 50(4): synthetic content must be machine-readable as AI-generated; deep-fakes must be labelled.' },
        { label: 'AI runs in the background, with no direct user-facing output', value: 'background' },
        { label: 'AI advises internal staff who then act on its recommendations', value: 'internal-advice' },
      ] },
    { id: 'data', title: 'What kind of data does the system process?',
      description: 'Article 10 sets data governance obligations for high-risk systems.',
      options: [
        { label: 'Personal data of EU residents at scale', value: 'pii', articles: ['Art. 10', 'GDPR Art. 35'], hint: 'Personal data at scale triggers Art. 10 data governance obligations and GDPR DPIA requirements.' },
        { label: 'Special category data (health, biometric, political, etc.)', value: 'special', articles: ['Art. 10(5)'], hint: 'Special category data processing for bias mitigation is permitted under Art. 10(5) with strict safeguards.' },
        { label: 'Anonymised or aggregate business data', value: 'anonymised' },
        { label: 'Public or synthetic data only', value: 'public' },
      ] },
    { id: 'oversight', title: 'What level of human oversight exists over agent actions?',
      description: 'Article 14 requires meaningful human oversight proportionate to the risk tier.',
      options: [
        { label: 'Every material action is human-approved before execution', value: 'approve-all', articles: ['Art. 14'] },
        { label: 'Human-in-the-loop for high-stakes decisions only', value: 'hitl-selective', articles: ['Art. 14'] },
        { label: 'Human review after the fact (logs and audit)', value: 'post-hoc', articles: ['Art. 14', 'Art. 12'] },
        { label: 'Fully autonomous, no human oversight today', value: 'none', articles: ['Art. 14'], hint: 'High-risk systems without human oversight cannot be deployed in the EU.' },
      ] },
  ];

  const RANK = { prohibited: 4, high: 3, limited: 2, minimal: 1 };

  // fit: how Automatos helps, per tier. Kept to what the platform does today
  // (checked against the code, 8 Oct 2026; the posture page has the detail).
  const TIERS = {
    prohibited: { label: 'Prohibited',
      summary: 'Your described use case falls under the Article 5 prohibited practices. This system cannot be placed on the market or put into service in the EU.',
      obligations: ['Redesign the use case to remove the prohibited practice.', 'Document the decision trail for your compliance register.', 'Article 5 has applied since 2 February 2025: a system already deployed must be withdrawn.'],
      fit: "Don't build it. Automatos won't help you deploy a prohibited practice, and a platform-wide filter for Article 5 practices is on our roadmap." },
    high: { label: 'High risk',
      summary: 'Your system is classified high-risk. It can be deployed in the EU, but you must meet the full Chapter III provider and deployer obligations before placing it on the market.',
      obligations: ['Implement a risk-management system across the lifecycle (Art. 9).', 'Enforce data governance, lineage and bias mitigation (Art. 10).', 'Keep logs with appropriate retention (Art. 12).', 'Publish transparency and user instructions (Art. 13).', 'Design meaningful human oversight (Art. 14).', 'Meet accuracy, robustness and cybersecurity requirements (Art. 15).', 'Register the system in the EU database before deployment (Art. 71).', 'Report serious incidents within statutory timelines (Art. 73).'],
      fit: "Automatos gives you the oversight pieces today: every gated action carries a risk class and an oversight tier, approvals can be granted, denied or revoked, missions can be paused, and audit logs are kept for at least 180 days. Other Chapter III pieces (Annex III classification, tamper-evident logs, per-agent documentation, incident reporting) are on our roadmap, so plan for them with your counsel." },
    limited: { label: 'Limited risk',
      summary: 'Your system falls under the transparency obligations of Article 50. No conformity assessment is required, but users must be clearly informed when they interact with AI or consume AI-generated content.',
      obligations: ['Clearly disclose AI interaction to users (Art. 50(1)).', 'Mark AI-generated content as machine-readable synthetic content (Art. 50(2)).', 'Label deep-fakes and AI image, audio or video output (Art. 50(4)).', 'Keep records sufficient to demonstrate transparency compliance.'],
      fit: "Automatos doesn't add an AI-interaction notice for you yet; it's on our roadmap. Until then, add the disclosure in your own chat, voice or widget copy. Every approval and audit event is still logged for at least 180 days." },
    minimal: { label: 'Minimal risk',
      summary: 'Your system sits in the minimal-risk tier. The EU AI Act imposes no mandatory obligations, but voluntary codes of conduct (Art. 95) and AI literacy (Art. 4) still apply.',
      obligations: ['Adopt a voluntary code of conduct to demonstrate good practice (Art. 95).', 'Make sure the staff operating the AI have sufficient AI literacy (Art. 4).', 'Keep basic records so you can demonstrate your classification if challenged.'],
      fit: "Even at minimal risk, Automatos keeps audit logs for at least 180 days and shows who approved what, which helps you defend your classification if you're asked." },
  };

  const answers = {};

  function h(tag, attrs, kids) {
    const n = document.createElement(tag);
    for (const k in attrs || {}) {
      if (k === 'text') n.textContent = attrs[k];
      else if (k === 'on') n.addEventListener('click', attrs[k]);
      else n.setAttribute(k, attrs[k]);
    }
    (kids || []).forEach((c) => c && n.appendChild(c));
    return n;
  }

  function compute() {
    let tier = 'minimal';
    const articles = new Set();
    const hints = [];
    QUESTIONS.forEach((q) => {
      const opt = q.options.find((o) => o.value === answers[q.id]);
      if (!opt) return;
      if (opt.forces && RANK[opt.forces] > RANK[tier]) tier = opt.forces;
      (opt.articles || []).forEach((a) => articles.add(a));
      if (opt.hint) hints.push(opt.hint);
    });
    return { tier, articles: [...articles], hints };
  }

  function question(q, i, onPick) {
    const opts = h('div', { class: 'ck-opts', role: 'radiogroup', 'aria-label': q.title });
    q.options.forEach((o) => {
      const b = h('button', { type: 'button', class: 'ck-opt', role: 'radio', 'aria-checked': 'false', text: o.label });
      b.addEventListener('click', () => {
        answers[q.id] = o.value;
        opts.querySelectorAll('.ck-opt').forEach((x) => x.setAttribute('aria-checked', String(x === b)));
        onPick();
      });
      opts.appendChild(b);
    });
    return h('fieldset', { class: 'ck-q' }, [
      h('legend', {}, [h('span', { class: 'ck-num', text: String(i + 1).padStart(2, '0') }), h('span', { text: q.title })]),
      h('p', { class: 'ck-desc', text: q.description }),
      opts,
    ]);
  }

  function list(items, cls) {
    return h('ul', { class: cls }, items.map((t) => h('li', { text: t })));
  }

  function result(root, r) {
    const t = TIERS[r.tier];
    const panel = h('div', { class: `ck-result tier-${r.tier}` }, [
      h('div', { class: 'ck-tier' }, [h('span', { class: 'ck-k', text: 'Risk tier' }), h('h2', { text: t.label }), h('p', { text: t.summary })]),
      r.articles.length ? h('div', { class: 'ck-block' }, [h('h3', { text: 'Articles to review' }), h('div', { class: 'ck-tags' }, r.articles.map((a) => h('span', { text: a })))]) : null,
      h('div', { class: 'ck-block' }, [h('h3', { text: 'Your obligations checklist' }), list(t.obligations, 'ck-list')]),
      r.hints.length ? h('div', { class: 'ck-block' }, [h('h3', { text: 'Why you landed here' }), list(r.hints, 'ck-list ck-why')]) : null,
      h('div', { class: 'ck-block ck-fit' }, [h('h3', { text: 'How Automatos helps' }), h('p', { text: t.fit }),
        h('div', { class: 'ck-actions' }, [h('a', { class: 'ck-btn solid', href: '/eu-ai-act', text: 'See the full posture →' }), h('a', { class: 'ck-btn', href: '/contact', text: 'Talk to us about your deployment' })])]),
      h('div', { class: 'ck-foot' }, [h('button', { type: 'button', class: 'ck-btn', text: '↺ Start over', on: () => render(root) }), h('span', { text: 'Not legal advice. Confirm with qualified counsel.' })]),
    ]);
    root.replaceChildren(panel);
    root.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function render(root) {
    Object.keys(answers).forEach((k) => delete answers[k]);
    const count = h('span', { class: 'ck-count' });
    const go = h('button', { type: 'button', class: 'ck-btn solid', disabled: '', text: 'Get my classification →' });
    const update = () => {
      const n = Object.keys(answers).length;
      count.textContent = `${n}/${QUESTIONS.length} answered · runs in your browser, nothing is sent`;
      if (n === QUESTIONS.length) go.removeAttribute('disabled');
    };
    go.addEventListener('click', () => result(root, compute()));
    root.replaceChildren(...QUESTIONS.map((q, i) => question(q, i, update)), h('div', { class: 'ck-submit' }, [count, go]));
    update();
  }

  function init() {
    const root = document.querySelector('[data-aiact-checker]');
    if (root) render(root);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
