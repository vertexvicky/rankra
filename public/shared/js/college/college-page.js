const PLACEHOLDER_LOGO = '../../assets/college_logo_placeholder.svg';
const COMMUNITY_ORDER = ['OC', 'BC', 'MBC', 'BCM', 'SC', 'SCA', 'ST'];

/* ── tiny DOM helper ── */
const el = (tag, attrs = {}, children = []) => {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, String(v));
  }
  for (const c of Array.isArray(children) ? children : [children]) {
    if (c == null) continue;
    node.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return node;
};

/* ── utilities ── */
const safeHref = (h) => {
  const v = String(h || '').trim();
  if (!v) return '#';
  if (/^(https?:)?\/\//i.test(v) || v.startsWith('/') || v.startsWith('./') || v.startsWith('../') || v.startsWith('#')) return v;
  if (/^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(v)) return `https://${v}`;
  return '#';
};
const toText = (v, fb = '—') => { const s = String(v ?? '').trim(); return s || fb; };
const toNumber = (v) => { const n = Number(v); return Number.isFinite(n) ? n : null; };
const normalizeBoolean = (v) => {
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  const t = String(v || '').trim().toLowerCase();
  if (['yes','y','true','1','available'].includes(t)) return 'Yes';
  if (['no','n','false','0','not available'].includes(t)) return 'No';
  return '—';
};
const normalizeLevel = (v) => {
  const t = String(v || '').trim().toLowerCase();
  if (t === 'high') return 'High';
  if (t === 'medium') return 'Medium';
  if (t === 'low') return 'Low';
  return toText(v);
};
const fmtSalary = (v) => { const t = String(v||'').trim(); return !t ? '—' : /^\d+(\.\d+)?$/.test(t) ? `₹${t} LPA` : t; };
const fmtPct = (v) => { const t = String(v||'').trim(); return !t ? '—' : /^\d+(\.\d+)?$/.test(t) ? `${t}%` : t; };
const fmtWebsite = (v) => String(v||'').trim().replace(/^https?:\/\//i,'') || '—';
const resolveLogoPath = (v) => {
  const t = String(v||'').trim();
  if (!t || t.toLowerCase() === 'sample') return PLACEHOLDER_LOGO;
  if (/^(https?:)?\/\//i.test(t) || t.startsWith('/') || t.startsWith('./') || t.startsWith('../')) return t;
  if (/\.(svg|png|jpe?g|gif|webp)$/i.test(t)) return t;
  return PLACEHOLDER_LOGO;
};

const sortCommunityKeys = (keys) => [...new Set(keys)].filter(Boolean).sort((a, b) => {
  const ai = COMMUNITY_ORDER.indexOf(a), bi = COMMUNITY_ORDER.indexOf(b);
  if (ai === -1 && bi === -1) return a.localeCompare(b);
  if (ai === -1) return 1; if (bi === -1) return -1;
  return ai - bi;
});

const orderedCommunityEntries = (rec, order = COMMUNITY_ORDER) => {
  const src = rec && typeof rec === 'object' ? rec : {};
  return sortCommunityKeys([...order, ...Object.keys(src)])
    .filter(k => src[k] != null && String(src[k]).trim() !== '')
    .map(k => [k, src[k]]);
};

/* ── inline markdown ── */
const appendInlineMd = (parent, text) => {
  const src = String(text || '');
  const pat = /(\[([^\]]+)\]\(([^)]+)\)|`([^`]+)`|\*\*([^*]+)\*\*|__([^_]+)__|\*([^*]+)\*|_([^_]+)_)/g;
  let last = 0, m;
  while ((m = pat.exec(src))) {
    if (m.index > last) parent.append(document.createTextNode(src.slice(last, m.index)));
    if (m[2] && m[3]) { const hr = safeHref(m[3]); parent.append(el('a', { href: hr, target: hr.startsWith('http') ? '_blank' : null, rel: hr.startsWith('http') ? 'noreferrer noopener' : null }, m[2])); }
    else if (m[4]) parent.append(el('code', { class: 'inline-code' }, m[4]));
    else if (m[5] || m[6]) { const s = el('strong'); appendInlineMd(s, m[5]||m[6]); parent.append(s); }
    else if (m[7] || m[8]) { const e = el('em'); appendInlineMd(e, m[7]||m[8]); parent.append(e); }
    last = pat.lastIndex;
  }
  if (last < src.length) parent.append(document.createTextNode(src.slice(last)));
};
const inlineNode = (tag, attrs, text) => { const n = el(tag, attrs||{}, []); appendInlineMd(n, text); return n; };

const renderMarkdown = (md) => {
  const wrap = el('div', { class: 'markdown-body' });
  const lines = String(md||'').replace(/\r\n?/g,'\n').split('\n');
  let pLines = [], listNode = null, listType = null;
  const flushP = () => { if (!pLines.length) return; wrap.append(inlineNode('p', {}, pLines.join(' '))); pLines = []; };
  const resetList = () => { listNode = null; listType = null; };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { flushP(); resetList(); continue; }
    const hm = /^(#{1,3})\s+(.*)$/.exec(line);
    if (hm) { flushP(); resetList(); wrap.append(inlineNode(`h${Math.min(6, hm[1].length+2)}`, {}, hm[2].trim())); continue; }
    const bm = /^[-*]\s+(.*)$/.exec(line), nm = /^\d+\.\s+(.*)$/.exec(line);
    if (bm || nm) { flushP(); const nt = nm ? 'ol' : 'ul'; if (!listNode || listType !== nt) { listNode = el(nt); listType = nt; wrap.append(listNode); } listNode.append(inlineNode('li', {}, (bm||nm)[1].trim())); continue; }
    pLines.push(line);
  }
  flushP();
  return wrap.childNodes.length ? wrap : inlineNode('p', {}, 'Detailed info coming soon.');
};

/* ── data normalizer ── */
const normalizeCutoffs = (raw) => {
  if (Array.isArray(raw?.cutoffs)) return raw.cutoffs.map(c => ({ courseName: c.courseName||'Course', rows: Array.isArray(c.rows) ? [...c.rows].map(r => ({ year: r.year||'—', communities: r.communities||{} })).sort((a,b) => Number(b.year)-Number(a.year)) : [] }));
  if (!raw?.Cutoff || typeof raw.Cutoff !== 'object') return [];
  return Object.entries(raw.Cutoff).map(([code, data]) => {
    const isNew = data && typeof data === 'object' && 'name' in data;
    const name = isNew ? `${code} ${data.name}` : code;
    const rows = Object.entries(data || {})
      .filter(([k]) => k !== 'name' && data[k] && typeof data[k] === 'object')
      .map(([y, c]) => ({ year: y, communities: c||{} }))
      .sort((a,b) => Number(b.year)-Number(a.year));
    return { courseName: name, rows };
  });
};

const normalizeCommunities = (raw, cutoffs) => {
  const keys = Array.isArray(raw?.cutoffCommunities) ? [...raw.cutoffCommunities] : [];
  for (const c of cutoffs) for (const r of c.rows||[]) keys.push(...Object.keys(r.communities||{}));
  if (raw?.coursenseats && typeof raw.coursenseats === 'object') {
    for (const sm of Object.values(raw.coursenseats)) {
      if (sm && typeof sm === 'object') {
        for (const k of Object.keys(sm)) if (k !== 'name') keys.push(k);
      }
    }
  }
  return sortCommunityKeys(keys.length ? keys : COMMUNITY_ORDER);
};

const normalizeCourses = (raw, commOrder) => {
  if (Array.isArray(raw?.courses)) return raw.courses.map(c => {
    const sb = orderedCommunityEntries(c.seatBreakdown||c.communities||{}, commOrder);
    const es = toNumber(c.seats), ds = sb.reduce((t,[,v]) => t+(toNumber(v)||0), 0);
    return { name: c.name||'Course', duration: c.duration||'', seats: es??(ds||null), seatBreakdown: sb };
  });
  if (!raw?.coursenseats || typeof raw.coursenseats !== 'object') return [];
  return Object.entries(raw.coursenseats).map(([code, sm]) => {
    const isNew = sm && typeof sm === 'object' && 'name' in sm;
    const name = isNew ? `${code} ${sm.name}` : code;
    const dataOnly = { ...sm };
    if (isNew) delete dataOnly.name;
    const sb = orderedCommunityEntries(dataOnly, commOrder);
    const ts = sb.reduce((s,[,v]) => s+(toNumber(v)||0), 0);
    return { name, duration: '', seats: ts||null, seatBreakdown: sb };
  });
};

const normalize = (raw = {}) => {
  const cutoffs = normalizeCutoffs(raw);
  const communities = normalizeCommunities(raw, cutoffs);
  const courses = normalizeCourses(raw, communities);
  const website = String(raw.website||'').trim();
  return {
    code: raw['college code'] ?? raw.code ?? null,
    logoPath: resolveLogoPath(raw['college logo'] || raw.logoPath),
    name: toText(raw.name, 'College name'),
    type: toText(raw.type, 'College'),
    district: toText(raw.district || raw.location, '—'),
    estd: toText(raw.estd || raw.establishedIn, '—'),
    quote: String(raw['college quote'] || raw.quote || '').trim(),
    overview: String(raw.overview || '').trim(),
    websiteLabel: fmtWebsite(website),
    websiteHref: safeHref(website),
    stats: {
      nirf: toText(raw.NIRF),
      tier: toText(raw.Tier),
      highSalary: fmtSalary(raw.highestPackage ?? raw.highSalary ?? '40.0'),
      medianSalary: fmtSalary(raw.medianPackage ?? raw.medianSalary ?? raw.AVGplacment ?? raw.avgPlacement ?? '12.5'),
      lowSalary: fmtSalary(raw.lowestPackage ?? raw.lowSalary ?? '4.5'),
      placementPct: fmtPct(raw.placmentpercentage ?? raw.placementPercentage ?? '98'),
    },
    signals: {
      placementSupport: raw.placementsupport ?? 5,
      studyPressure: normalizeLevel(raw.studypressure ?? 'High'),
      freedom: normalizeLevel(raw.freedom ?? 'Medium'),
      startup: normalizeLevel(raw.startup ?? 'High'),
    },
    hostel: normalizeBoolean(raw.Hostel ?? raw.hostelAvailable ?? true),
    collegeBus: normalizeBoolean(raw.collegeBus ?? raw.busAvailable ?? true),
    communities, cutoffs, courses,
    recruitersMd: String(raw.recruiters || raw.recruitersMd || '').trim(),
    detailedInfoMd: String(raw.detailedinfo || raw.detailedInfo || '').trim(),
    faqs: Array.isArray(raw.faqs) ? raw.faqs : [],
    relatedColleges: Array.isArray(raw.relatedColleges) ? raw.relatedColleges : [],
    // SEO Overrides from AI
    metaTitle: raw.metaTitle || raw.seoTitle || null,
    metaDescription: raw.metaDescription || raw.seoDescription || null,
  };
};

/* ── render stars ── */
const renderStars = (val) => {
  const n = toNumber(val);
  if (n === null) return el('span', { class: 'stat-value' }, '—');
  const full = Math.min(5, Math.floor(n));
  const half = n - full >= 0.5 && full < 5;
  const empty = 5 - full - (half ? 1 : 0);
  const wrap = el('div', { class: 'star-rating' });
  for (let i = 0; i < full; i++) wrap.append(el('span', { class: 'star filled' }, '★'));
  if (half) wrap.append(el('span', { class: 'star half' }, '★'));
  for (let i = 0; i < empty; i++) wrap.append(el('span', { class: 'star empty' }, '☆'));
  wrap.append(el('span', { class: 'rating-num' }, `${n.toFixed(n%1?1:0)}/5`));
  return wrap;
};

/* ── level pill with sentiment ── */
const renderLevelPill = (val, isOpposite = false) => {
  const level = String(val || '').trim();
  let sentiment = 'neutral';
  const lowered = level.toLowerCase();
  
  if (lowered === 'high') sentiment = isOpposite ? 'positive' : 'negative';
  else if (lowered === 'medium') sentiment = 'warning';
  else if (lowered === 'low') sentiment = isOpposite ? 'negative' : 'positive';
  else if (lowered === 'yes') sentiment = 'positive';
  else if (lowered === 'no') sentiment = 'negative';

  return el('span', { class: 'level-pill', dataset: { level, sentiment } }, level);
};

/* ── section header helper ── */
const sectionHead = (icon, iconClass, title) => el('div', { class: 'section-header' }, [
  el('div', { class: `section-icon ${iconClass}` }, [el('i', { class: icon })]),
  el('span', { class: 'section-title-text' }, title),
]);

/* ══════════════════════ HERO ══════════════════════ */
const renderHero = (c) => {
  const hero = el('section', { class: 'college-hero', id: 'top' });
  const chips = [];
  if (c.district !== '—') chips.push({ icon: 'fa-solid fa-location-dot', text: c.district });
  if (c.estd !== '—') chips.push({ icon: 'fa-solid fa-calendar', text: `Est. ${c.estd}` });
  if (c.hostel !== '—') chips.push({ icon: 'fa-solid fa-bed', text: `Hostel: ${c.hostel}` });

  hero.append(el('div', { class: 'college-identity' }, [
    el('div', { class: 'college-heading' }, [
      c.code != null ? el('div', { class: 'college-code-badge' }, `Code ${c.code}`) : null,
      el('h1', { class: 'college-title' }, c.name),
      el('p', { class: 'college-meta' }, c.type),
      chips.length ? el('div', { class: 'college-meta-list' },
        chips.map(ch => el('span', { class: 'college-meta-chip' }, [el('i', { class: ch.icon }), ` ${ch.text}`]))
      ) : null,
    ])
  ]));

  if (c.quote) {
    hero.append(el('div', { class: 'college-divider' }));
    hero.append(el('p', { class: 'college-quote' }, `"${c.quote}"`));
  }
  return hero;
};

/* ══════════════════════ NAV ══════════════════════ */
const renderNav = () => el('nav', { class: 'college-nav', 'aria-label': 'College sections' }, [
  el('a', { class: 'nav-item active', href: '#overview', 'data-target': 'overview' }, 'Overview'),
  el('a', { class: 'nav-item', href: '#cutoff', 'data-target': 'cutoff' }, 'Cutoff'),
  el('a', { class: 'nav-item', href: '#seats', 'data-target': 'seats' }, 'Seats'),
  el('a', { class: 'nav-item', href: '#recruiters', 'data-target': 'recruiters' }, 'Recruiters'),
  el('a', { class: 'nav-item', href: '#more', 'data-target': 'more' }, 'More'),
]);

/* ══════════════════════ OVERVIEW ══════════════════════ */
const renderOverview = (c) => {
  const sec = el('section', { class: 'college-section', id: 'overview' });
  sec.append(sectionHead('fa-solid fa-chart-pie', 'overview-icon', 'Overview'));
  if (c.overview) sec.append(el('p', {}, c.overview));

  // Stat cards
  const grid = el('div', { class: 'stat-grid' });
  const nirfClean = String(c.stats.nirf || '').replace(/\(Engineering\)/gi, '').trim() || '—';
  
  const statItems = [
    ['NIRF Ranking', nirfClean, 'text'],
    ['College Tier', c.stats.tier, 'text'],
    ['Highest Salary', c.stats.highSalary, 'text'],
    ['Median Salary', c.stats.medianSalary, 'text'],
    ['Lowest Salary', c.stats.lowSalary, 'text'],
    ['Placement Rate', c.stats.placementPct, 'text'],
    ['Placement Support', c.signals.placementSupport, 'rating'],
    ['Academic Rigor', c.signals.studyPressure, 'level'],
    ['Campus Freedom', c.signals.freedom, 'level-opp'],
    ['Innovation Index', c.signals.startup, 'level-opp'],
    ['Residential Facility', c.hostel, 'level-opp'],
    ['College Bus', c.collegeBus, 'level-opp'],
    ['Official Website', { label: c.websiteLabel, href: c.websiteHref }, 'link'],
    ['Campus Location', c.district, 'text'],
  ];

  for (const [label, value, kind] of statItems) {
    const card = el('div', { class: 'stat-card' }, [el('div', { class: 'stat-label' }, label)]);
    if (kind === 'rating') card.append(renderStars(value));
    else if (kind === 'level') card.append(el('div', {}, [renderLevelPill(value, false)]));
    else if (kind === 'level-opp') card.append(el('div', {}, [renderLevelPill(value, true)]));
    else if (kind === 'link') {
      const href = value?.href || '#';
      card.append(href !== '#'
        ? el('div', { class: 'stat-value' }, [el('a', { href, target: href.startsWith('http') ? '_blank' : null, rel: href.startsWith('http') ? 'noreferrer noopener' : null }, value?.label || '—')])
        : el('div', { class: 'stat-value' }, value?.label || '—'));
    }
    else card.append(el('div', { class: 'stat-value' }, value));
    grid.append(card);
  }
  sec.append(grid);
  return sec;
};

/* ══════════════════════ CUTOFF ══════════════════════ */
const renderCutoff = (c) => {
  const sec = el('section', { class: 'college-section', id: 'cutoff' });
  sec.append(sectionHead('fa-solid fa-chart-line', 'cutoff-icon', 'Cutoff Analysis'));

  if (!c.cutoffs.length) { sec.append(el('p', {}, 'Cutoff data not available yet.')); return sec; }

  const stack = el('div', { class: 'cutoff-stack' });
  for (const course of c.cutoffs) {
    const block = el('article', { class: 'cutoff-card' }, [
      el('div', { class: 'cutoff-course-name' }, course.courseName),
      el('div', { class: 'cutoff-table-wrap' }, [
        el('table', { class: 'cutoff-table' }, [
          el('thead', {}, [el('tr', {}, [
            el('th', {}, 'Year'),
            ...c.communities.map(cm => el('th', {}, cm)),
          ])]),
          el('tbody', {}, course.rows.map(row => el('tr', {}, [
            el('th', { scope: 'row' }, row.year || '—'),
            ...c.communities.map(cm => el('td', {}, row.communities?.[cm] ?? '—')),
          ]))),
        ])
      ])
    ]);
    stack.append(block);
  }
  sec.append(stack);
  return sec;
};

/* ══════════════════════ SEATS ══════════════════════ */
const renderSeats = (c) => {
  const sec = el('section', { class: 'college-section', id: 'seats' });
  sec.append(sectionHead('fa-solid fa-graduation-cap', 'courses-icon', 'Seats & Intake'));

  if (!c.courses.length) { sec.append(el('p', {}, 'Seat distribution data not available yet.')); return sec; }

  const list = el('div', { class: 'courses-grid' });
  for (const course of c.courses) {
    const metaItems = [];
    if (course.duration) metaItems.push(el('span', { class: 'chip' }, course.duration));

    // Seat table per course
    let seatTable = null;
    if (course.seatBreakdown.length) {
      seatTable = el('div', { class: 'course-seat-table-wrap' }, [
        el('table', { class: 'course-seat-table' }, [
          el('thead', {}, [el('tr', {}, course.seatBreakdown.map(([cm]) => el('th', {}, cm)))]),
          el('tbody', {}, [el('tr', {}, course.seatBreakdown.map(([, v]) => el('td', {}, v)))]),
        ])
      ]);
    }

    list.append(el('div', { class: 'course-card' }, [
      el('div', { class: 'course-head' }, [el('div', { class: 'course-name' }, course.name)]),
      metaItems.length ? el('div', { class: 'course-meta' }, metaItems) : null,
      seatTable,
    ]));
  }
  sec.append(list);
  return sec;
};

/* ══════════════════════ RECRUITERS ══════════════════════ */
const renderRecruiters = (c) => {
  const sec = el('section', { class: 'college-section', id: 'recruiters' });
  sec.append(sectionHead('fa-solid fa-briefcase', 'recruiters-icon', 'Top Recruiters'));
  sec.append(renderMarkdown(c.recruitersMd));
  return sec;
};

/* ══════════════════════ MORE (DETAILED INFO) ══════════════════════ */
const renderMoreInfo = (c) => {
  const sec = el('section', { class: 'college-section', id: 'more' });
  sec.append(sectionHead('fa-solid fa-book-open', 'info-icon', 'More Information'));
  sec.append(renderMarkdown(c.detailedInfoMd));

  // FAQ
  if (c.faqs.length) {
    sec.append(el('div', { class: 'college-divider', style: 'margin:16px 0 12px' }));
    sec.append(el('span', { class: 'section-title-text', style: 'display:block;margin-bottom:8px' }, 'Frequently Asked Questions'));
    const faqList = el('div', { class: 'faq-list' });
    for (const item of c.faqs) {
      const ans = el('div', { class: 'faq-a' }); appendInlineMd(ans, item.a || 'Answer');
      faqList.append(el('details', { class: 'faq-item' }, [el('summary', { class: 'faq-q' }, item.q || 'Question'), ans]));
    }
    sec.append(faqList);
  }

  return sec;
};

/* ══════════════════════ RELATED (reused) ══════════════════════ */
const renderRelated = (c) => {
  if (!c.relatedColleges.length) return el('div');
  const sec = el('section', { class: 'college-section', id: 'related-colleges' });
  sec.append(sectionHead('fa-solid fa-link', 'info-icon', 'Similar Colleges'));
  sec.append(el('div', { class: 'related-block', style: 'border:none; padding:0; margin:0;' }, [
    el('ol', { class: 'related-list' }, c.relatedColleges.slice(0, 5).map(item =>
      el('li', {}, [el('a', { href: safeHref(item.href || '#') }, item.name || 'College')])
    ))
  ]));
  return sec;
};

/* ══════════════════════ SCROLL SPY ══════════════════════ */
const setupScrollSpy = (root) => {
  const nav = root.querySelector('.college-nav');
  if (!nav) return;
  const links = Array.from(nav.querySelectorAll('.nav-item'));
  const sections = links.map(a => root.querySelector(`#${a.dataset.target}`)).filter(Boolean);

  const setActive = (id) => { for (const a of links) a.classList.toggle('active', a.dataset.target === id); };
  const getOffset = () => {
    const hh = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 50;
    return hh + (nav.getBoundingClientRect().height || 0) + 16;
  };
  const scrollToId = (id) => {
    const t = root.querySelector(`#${id}`);
    if (!t) return;
    window.scrollTo({ top: Math.max(0, window.scrollY + t.getBoundingClientRect().top - getOffset()), behavior: 'auto' });
  };

  const obs = new IntersectionObserver((entries) => {
    const v = entries.filter(e => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (v?.target?.id) setActive(v.target.id);
  }, { root: null, threshold: [0.1, 0.3, 0.5], rootMargin: `-${getOffset() + 10}px 0px -40% 0px` });

  for (const s of sections) obs.observe(s);
  const syncHash = () => {
    const h = (window.location.hash || '').replace('#', '');
    if (h && sections.some(s => s.id === h)) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          scrollToId(h);
          setActive(h); // Explicitly set active on hash load
        });
      });
    }
  };
  window.addEventListener('hashchange', syncHash);
  syncHash();
};

/* ══════════════════════ SEO & RICH SNIPPETS ══════════════════════ */
const updateSEO = (c) => {
  // 1. Dynamic Meta Tags (with AI overrides)
  document.title = c.metaTitle || `${c.name} - Cutoff, Placement, Seats & More 2024`;
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) {
    const defaultDesc = `Explore ${c.name} (${c.district}). Detailed TNEA cutoff history, recruitment stats (${c.stats.highSalary} highest salary), seat intake, and campus facilities. Updated for 2024.`;
    metaDesc.setAttribute('content', c.metaDescription || defaultDesc);
  }

  // 2. JSON-LD Structured Data
  const schema = {
    "@context": "https://schema.org",
    "@type": "CollegeOrUniversity",
    "name": c.name,
    "description": c.metaDescription || c.overview || `Detailed information about ${c.name}, including placements, cutoffs, and courses.`,
    "url": window.location.href,
    "identifier": c.code,
    "address": {
      "@type": "PostalAddress",
      "addressLocality": c.district
    },
    "sameAs": c.websiteHref !== '#' ? [c.websiteHref] : []
  };

  // Inject or Update Script Tag
  let script = document.getElementById('college-schema');
  if (!script) {
    script = el('script', { id: 'college-schema', type: 'application/ld+json' });
    document.head.append(script);
  }
  script.textContent = JSON.stringify(schema);
};

/* ══════════════════════ MAIN EXPORT ══════════════════════ */
export const renderCollegePage = (mountEl, rawCollege) => {
  if (!mountEl) return;
  const c = normalize(rawCollege);
  mountEl.innerHTML = '';
  mountEl.append(
    renderHero(c), 
    renderNav(), 
    renderOverview(c), 
    renderCutoff(c), 
    renderSeats(c), 
    renderRecruiters(c),
    renderMoreInfo(c),
    renderRelated(c)
  );
  setupScrollSpy(mountEl);
  updateSEO(c);
};

export const collegeLink = (href) => {
  const p = String(href || '/').replace(/index\.html$/i, '').replace(/\/{2,}/g, '/');
  return p.endsWith('/') ? p : `${p}/`;
};
