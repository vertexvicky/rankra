import { SiteHeader } from '../../../shared/js/SiteHeader.js';
import { applyTheme, initTheme } from '../../../shared/js/theme.js';
import { requestJSON } from '../../../shared/js/caching.js';

/* ── Configuration & Constants ── */
const PLACEHOLDER_LOGO = '../../../assets/college_logo_placeholder.svg';
const COMMUNITY_ORDER = ['OC', 'BC', 'MBC', 'BCM', 'SC', 'SCA', 'ST'];

/**
 * Fallback / Sample data for testing or empty states
 */
export const SAMPLE_COLLEGE = {
  'college code': 1,
  'college logo': 'sample',
  name: 'Anna University CEG',
  type: 'Autonomous — Anna University',
  district: 'Chennai',
  estd: '1794',
  'college quote': 'Top-tier college, but high competition — not for chill mindset.',
  overview: 'College of Engineering, Guindy (CEG) is one of the oldest technical institutions in Asia. Known for its strong academic rigour, vibrant campus culture, and competitive peer group, CEG is a preferred choice for serious engineering aspirants across Tamil Nadu.',
  NIRF: '28',
  Tier: 'Tier 1',
  highestPackage: '40.0',
  avgPlacement: '8.5',
  placmentpercentage: '92',
  placementsupport: 4.5,
  studypressure: 'High',
  freedom: 'Medium',
  startup: 'High',
  Hostel: 'Yes',
  website: 'annauniv.edu'
};

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
  const src = raw?.Cutoff || raw?.cutoff;
  if (!src || typeof src !== 'object') return [];
  return Object.entries(src).map(([code, data]) => {
    if (!data || typeof data !== 'object') return null;
    const isNew = 'name' in data;
    const name = isNew ? `${code} - ${data.name}` : code;
    const entries = Object.entries(data).filter(([k]) => k !== 'name');
    const isMultiYear = entries.some(([k, v]) => v && typeof v === 'object' && !Array.isArray(v));
    let rows = [];
    if (isMultiYear) {
      rows = entries.filter(([k, v]) => v && typeof v === 'object' && !Array.isArray(v))
        .map(([y, c]) => ({ year: y, communities: c||{} }))
        .sort((a, b) => Number(b.year) - Number(a.year));
    } else {
      const communities = {};
      for (const [k, v] of entries) communities[k] = v;
      rows = [{ year: '2025', communities }];
    }
    return { courseName: name, rows };
  }).filter(Boolean);
};

const normalizeCommunities = (raw, cutoffs) => {
  const keys = [];
  for (const c of cutoffs) for (const r of c.rows||[]) keys.push(...Object.keys(r.communities||{}));
  return sortCommunityKeys(keys.length ? keys : COMMUNITY_ORDER);
};

const normalizeCourses = (raw, commOrder) => {
  if (!raw?.coursenseats || typeof raw.coursenseats !== 'object') return [];
  return Object.entries(raw.coursenseats).map(([code, sm]) => {
    const isNew = sm && typeof sm === 'object' && 'name' in sm;
    const name = isNew ? `${code} - ${sm.name}` : code;
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
      medianSalary: fmtSalary(raw.medianPackage ?? raw.medianSalary ?? raw.avgPlacement ?? '12.5'),
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
    relatedColleges: Array.isArray(raw.relatedcolleges) ? raw.relatedcolleges : [],
    metaTitle: raw.metaTitle || null,
    metaDescription: raw.metaDescription || null,
  };
};

/* ── renderers ── */
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

const sectionHead = (icon, iconClass, title) => el('div', { class: 'section-header' }, [
  el('div', { class: `section-icon ${iconClass}` }, [el('i', { class: icon })]),
  el('span', { class: 'section-title-text' }, title),
]);

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
  return hero;
};

const renderNav = () => el('nav', { class: 'college-nav', 'aria-label': 'College sections' }, [
  el('a', { class: 'nav-item active', href: '#overview', 'data-target': 'overview' }, 'Overview'),
  el('a', { class: 'nav-item', href: '#cutoff', 'data-target': 'cutoff' }, 'Cutoff'),
  el('a', { class: 'nav-item', href: '#seats', 'data-target': 'seats' }, 'Seats'),
  el('a', { class: 'nav-item', href: '#recruiters', 'data-target': 'recruiters' }, 'Recruiters'),
  el('a', { class: 'nav-item', href: '#more', 'data-target': 'more' }, 'More'),
]);

const renderOverview = (c) => {
  const sec = el('section', { class: 'college-section', id: 'overview' });
  sec.append(sectionHead('fa-solid fa-chart-pie', 'overview-icon', 'Overview'));
  if (c.overview) sec.append(el('p', {}, c.overview));
  const grid = el('div', { class: 'stat-grid' });
  const statItems = [
    ['NIRF Ranking', c.stats.nirf, 'text'],
    ['College Tier', c.stats.tier, 'text'],
    ['Highest Salary', c.stats.highSalary, 'text'],
    ['Median Salary', c.stats.medianSalary, 'text'],
    ['Lowest Salary', c.stats.lowSalary, 'text'],
    ['Placement Rate', c.stats.placementPct, 'text'],
    ['Placement Support', c.signals.placementSupport, 'rating'],
    ['Academic Rigor', c.signals.studyPressure, 'level'],
    ['Campus Freedom', c.signals.freedom, 'level-opp'],
    ['Innovation Index', c.signals.startup, 'level-opp'],
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
        ? el('div', { class: 'stat-value' }, [el('a', { href, target: '_blank', rel: 'noreferrer noopener' }, value?.label || '—')])
        : el('div', { class: 'stat-value' }, value?.label || '—'));
    }
    else card.append(el('div', { class: 'stat-value' }, value));
    grid.append(card);
  }
  sec.append(grid);
  return sec;
};

const renderCutoff = (c) => {
  const sec = el('section', { class: 'college-section', id: 'cutoff' });
  sec.append(sectionHead('fa-solid fa-chart-line', 'cutoff-icon', 'Cutoff Analysis'));
  if (!c.cutoffs.length) { sec.append(el('p', {}, 'Cutoff data not available yet.')); return sec; }
  const stack = el('div', { class: 'cutoff-stack' });
  for (const course of c.cutoffs) {
    stack.append(el('article', { class: 'cutoff-card' }, [
      el('div', { class: 'cutoff-course-name' }, course.courseName),
      el('div', { class: 'cutoff-table-wrap' }, [
        el('table', { class: 'cutoff-table' }, [
          el('thead', {}, [el('tr', {}, [el('th', {}, 'Year'), ...c.communities.map(cm => el('th', {}, cm))])]),
          el('tbody', {}, course.rows.map(row => el('tr', {}, [
            el('th', { scope: 'row' }, row.year || '—'),
            ...c.communities.map(cm => {
              const val = row.communities?.[cm];
              const displayVal = String(val ?? '').trim().split(',')[0].trim();
              return el('td', {}, displayVal || '—');
            })
          ]))),
        ])
      ])
    ]));
  }
  sec.append(stack);
  return sec;
};

const renderSeats = (c) => {
  const sec = el('section', { class: 'college-section', id: 'seats' });
  sec.append(sectionHead('fa-solid fa-graduation-cap', 'courses-icon', 'Seats & Intake'));
  if (!c.courses.length) { sec.append(el('p', {}, 'Seat distribution data not available yet.')); return sec; }
  const list = el('div', { class: 'courses-grid' });
  for (const course of c.courses) {
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
      seatTable,
    ]));
  }
  sec.append(list);
  return sec;
};

const renderRecruiters = (c) => {
  if (!c.recruitersMd) return null;
  const sec = el('section', { class: 'college-section', id: 'recruiters' });
  sec.append(sectionHead('fa-solid fa-briefcase', 'recruiters-icon', 'Top Recruiters'));
  sec.append(renderMarkdown(c.recruitersMd));
  return sec;
};

const renderMoreInfo = (c) => {
  const hasContent = c.detailedInfoMd || c.faqs.length;
  if (!hasContent) return null;
  const sec = el('section', { class: 'college-section', id: 'more' });
  sec.append(sectionHead('fa-solid fa-book-open', 'info-icon', 'More Information'));
  if (c.detailedInfoMd) sec.append(renderMarkdown(c.detailedInfoMd));
  if (c.faqs.length) {
    sec.append(el('div', { class: 'college-divider', style: 'margin:16px 0' }));
    const faqList = el('div', { class: 'faq-list' });
    for (const item of c.faqs) {
      const ans = el('div', { class: 'faq-a' }); appendInlineMd(ans, item.a || '');
      faqList.append(el('details', { class: 'faq-item' }, [el('summary', { class: 'faq-q' }, item.q || ''), ans]));
    }
    sec.append(faqList);
  }
  return sec;
};

const renderRelated = (c, allColleges) => {
  if (!c.relatedColleges?.length) return null;
  const sec = el('section', { class: 'college-section', id: 'related' });
  sec.append(sectionHead('fa-solid fa-link', 'related-icon', 'Related Colleges'));
  
  const grid = el('div', { class: 'related-grid' });
  for (const relCode of c.relatedColleges) {
    const raw = Array.isArray(allColleges) ? allColleges.find(clg => String(clg['college code'] || clg.code) === String(relCode)) : allColleges[relCode];
    if (!raw) continue;
    
    const name = toText(raw.name || raw.collegeName);
    const district = toText(raw.district || raw.location);
    
    grid.append(el('a', { href: `?code=${relCode}`, class: 'related-card' }, [
      el('div', { class: 'related-name' }, name),
      el('div', { class: 'related-meta' }, [
        el('span', { class: 'related-code' }, `Code ${relCode}`),
        el('span', { class: 'related-dist' }, district)
      ])
    ]));
  }
  sec.append(grid);
  return sec;
};

const setupScrollSpy = (root) => {
  const nav = root.querySelector('.college-nav');
  if (!nav) return;
  const links = Array.from(nav.querySelectorAll('.nav-item'));
  const sections = links.map(a => root.querySelector(`#${a.dataset.target}`)).filter(Boolean);
  const getOffset = () => (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 50) + (nav.getBoundingClientRect().height || 0) + 16;
  const obs = new IntersectionObserver((entries) => {
    const v = entries.filter(e => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (v?.target?.id) { for (const a of links) a.classList.toggle('active', a.dataset.target === v.target.id); }
  }, { root: null, threshold: [0.1, 0.3, 0.5], rootMargin: `-${getOffset() + 10}px 0px -40% 0px` });
  for (const s of sections) obs.observe(s);
};

const updateSEO = (c) => {
  document.title = c.metaTitle || `${c.name} - Cutoff, Placement, Seats 2025`;
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) metaDesc.setAttribute('content', c.metaDescription || `Explore ${c.name} stats and cutoffs.`);
  const schema = {
    "@context": "https://schema.org",
    "@type": "CollegeOrUniversity",
    "name": c.name,
    "url": window.location.href,
    "identifier": c.code,
    "address": { "@type": "PostalAddress", "addressLocality": c.district }
  };
  let script = document.getElementById('college-schema');
  if (!script) {
    script = el('script', { id: 'college-schema', type: 'application/ld+json' });
    document.head.append(script);
  }
  script.textContent = JSON.stringify(schema);
};

/* ── Main execution ── */
const shareLink = async () => {
  const url = window.location.href;
  try {
    if (navigator.share) { await navigator.share({ title: document.title, url }); return; }
    await navigator.clipboard.writeText(url);
    alert('Link copied to clipboard.');
  } catch { prompt('Copy this link:', url); }
};

document.addEventListener('DOMContentLoaded', async () => {
  const mount = document.getElementById('college-page');
  try {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (!code) throw new Error('No college code provided');

    const clgPath = '/assets/db/tnea/college/clgs.gzip';
    const dataMap = await requestJSON([clgPath]);
    const allColleges = dataMap[clgPath];
    const rawData = Array.isArray(allColleges) ? allColleges.find(c => String(c['college code']) === code) : allColleges[code];
    
    if (!rawData) throw new Error(`College ${code} not found`);

    const c = normalize(rawData);
    mount.innerHTML = '';

    // Update Nav items if related exists
    const nav = renderNav();
    if (c.relatedColleges?.length) {
      nav.append(el('a', { class: 'nav-item', href: '#related', 'data-target': 'related' }, 'Related'));
    }

    const sections = [
      renderHero(c),
      nav,
      renderOverview(c),
      renderCutoff(c),
      renderSeats(c),
      renderRecruiters(c),
      renderMoreInfo(c),
      renderRelated(c, allColleges)
    ].filter(Boolean);
    
    mount.append(...sections);
    
    setupScrollSpy(mount);
    updateSEO(c);

    new SiteHeader({
      title: 'College',
      logoPath: '../../../assets/rankra_logo50.png',
      onShare: () => shareLink()
    });
    initTheme();

  } catch (err) {
    console.error(err);
    if (mount) mount.innerHTML = `<div style="padding:2rem;text-align:center;"><h1>Error</h1><p>${err.message}</p></div>`;
  }
});