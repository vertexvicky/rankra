let currentChoices = [];
let sortState = { key: 'default', dir: 'asc' };

function parseQueryParams() {
    const params = new URLSearchParams(window.location.search);
    const c = (params.get('c') || '').toLowerCase();
    const cr = params.get('cr') ? parseInt(params.get('cr'), 10) : null;
    const gr = params.get('gr') ? parseInt(params.get('gr'), 10) : null;
    const b = params.get('b') ? params.get('b').split(',').map(s => s.trim().toUpperCase()).filter(Boolean) : [];
    return { c, cr, gr, b };
}

function initThemeToggle() {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;
    btn.addEventListener('click', () => {
        const isDark = document.body.classList.contains('dark');
        if (isDark) {
            document.body.classList.remove('dark');
            document.body.classList.add('light');
            btn.innerHTML = '<i class="fa-solid fa-sun"></i>';
        } else {
            document.body.classList.remove('light');
            document.body.classList.add('dark');
            btn.innerHTML = '<i class="fa-solid fa-moon"></i>';
        }
    });
}

function renderSummary(params, minGr, maxGr) {
    const container = document.getElementById('params-summary');
    if (!container) return;
    container.innerHTML = `
        <div class="param-box">
            <div class="param-label">Community</div>
            <div class="param-value">${params.c.toUpperCase()}</div>
        </div>
        <div class="param-box">
            <div class="param-label">Community Rank</div>
            <div class="param-value">${params.cr !== null ? params.cr : 'N/A'}</div>
        </div>
        <div class="param-box">
            <div class="param-label">General Rank</div>
            <div class="param-value">${params.gr !== null ? params.gr : 'N/A'}</div>
        </div>
        <div class="param-box">
            <div class="param-label">General Rank Buffer</div>
            <div class="param-value">${minGr} - ${maxGr}</div>
        </div>
        <div class="param-box">
            <div class="param-label">Preferred Branch Codes</div>
            <div class="param-value">${params.b.length ? params.b.join(', ') : 'All Branches'}</div>
        </div>
    `;
}

function renderError(msg) {
    document.getElementById('loading-state').classList.add('hidden');
    const errState = document.getElementById('error-state');
    errState.classList.remove('hidden');
    document.getElementById('error-message').textContent = msg;
}

function updateSortIcons() {
    document.querySelectorAll('.sort-header').forEach(h => {
        const key = h.dataset.sort;
        const icon = h.querySelector('.sort-icon');
        if (!icon) return;
        if (key === sortState.key) {
            h.classList.add('active');
            icon.className = sortState.dir === 'asc' ? 'fa-solid fa-sort-up sort-icon' : 'fa-solid fa-sort-down sort-icon';
        } else {
            h.classList.remove('active');
            icon.className = 'fa-solid fa-sort sort-icon';
        }
    });
}

function sortChoices(key) {
    if (sortState.key === key) {
        sortState.dir = sortState.dir === 'asc' ? 'desc' : 'asc';
    } else {
        sortState.key = key;
        sortState.dir = 'asc';
    }
    const m = sortState.dir === 'asc' ? 1 : -1;
    currentChoices.sort((a, b) => {
        if (key === 'default') return (a.defaultIndex - b.defaultIndex) * m;
        if (key === 'college') return (a.con || '').toLowerCase().localeCompare((b.con || '').toLowerCase()) * m;
        if (key === 'branch') return (a.brc || '').toLowerCase().localeCompare((b.brc || '').toLowerCase()) * m;
        if (key === 'tier') return (a.tier - b.tier) * m;
        if (key === 'rank') return ((a.rankVal ?? Infinity) - (b.rankVal ?? Infinity)) * m;
        return 0;
    });
    updateSortIcons();
    renderChoicesList();
}

function renderChoicesList() {
    const list = document.getElementById('choices-list');
    list.innerHTML = '';
    currentChoices.forEach((item, index) => {
        const li = document.createElement('li');
        li.className = 'choice-row';
        li.innerHTML = `
            <span class="choice-idx">${index + 1}</span>
            <div class="choice-college-info">
                <span class="choice-college-code">${item.coc}</span>
                <span class="choice-college-name">${item.con.replace(/\n/g, ' ')}</span>
            </div>
            <div class="choice-branch-full">
                <span class="choice-branch">${item.brc}</span> - ${item.brn}
            </div>
            <span class="choice-tier">Tier ${item.tier}</span>
            <span class="choice-rank">${item.rankVal !== null ? item.rankVal : 'N/A'}</span>
        `;
        list.appendChild(li);
    });
}

function initSortHeaders() {
    document.querySelectorAll('.sort-header').forEach(h => {
        h.addEventListener('click', () => {
            const key = h.dataset.sort;
            if (key) sortChoices(key);
        });
    });
}

function renderChoices(choices) {
    document.getElementById('loading-state').classList.add('hidden');
    document.getElementById('choice-count').textContent = `${choices.length} Choices`;
    const wrapper = document.getElementById('choices-wrapper');
    wrapper.classList.remove('hidden');

    if (!choices.length) {
        renderError('No choices found matching your rank range. Please try adjusting your general rank value.');
        return;
    }

    currentChoices = choices.map((item, idx) => ({ ...item, defaultIndex: idx }));
    sortState = { key: 'default', dir: 'asc' };
    updateSortIcons();
    renderChoicesList();
}

async function runGenerator() {
    initThemeToggle();
    initSortHeaders();
    const params = parseQueryParams();

    if (!params.c || params.gr === null) {
        renderError('Please provide required URL parameters: c (community) and gr (general rank). Example: ?c=bc&gr=25000');
        return;
    }

    const VALID_COMMUNITIES = ['oc', 'bc', 'bcm', 'mbc', 'sc', 'sca', 'st'];
    if (!VALID_COMMUNITIES.includes(params.c)) {
        renderError(`Invalid community "${params.c.toUpperCase()}". Valid values: OC, BC, BCM, MBC, SC, SCA, ST`);
        return;
    }

    const minGr = Math.max(1, params.gr - 35000);
    const maxGr = params.gr + 70000;

    renderSummary(params, minGr, maxGr);

    try {
        const commKey = `${params.c}_cr`;
        const groupUrl = `/assets/db/tnea/college/groups/${params.c}.json`;

        const [groupRes, predRes] = await Promise.all([
            fetch(groupUrl),
            fetch('/assets/db/tnea/cutoff/pred2026.json')
        ]);

        if (!groupRes.ok) throw new Error(`Failed to load group data for community "${params.c.toUpperCase()}".`);
        if (!predRes.ok) throw new Error('Failed to load prediction data.');

        const groupData = await groupRes.json();
        const predData = await predRes.json();

        const validPredChoices = predData.filter(item => {
            const val = item[commKey];
            if (!val || !Array.isArray(val)) return false;

            const predCr = val[1] !== undefined && val[1] !== null ? Number(val[1]) : (val[0] !== null ? Number(val[0]) : null);
            const predGr = val[3] !== undefined && val[3] !== null ? Number(val[3]) : (val[2] !== undefined && val[2] !== null ? Number(val[2]) : null);

            if (predGr === null || isNaN(predGr)) return false;

            if (predGr < minGr || predGr > maxGr) return false;

            item.rankVal = predCr;
            return true;
        });

        const collegePredMap = new Map();
        validPredChoices.forEach(item => {
            const cocInt = parseInt(item.coc, 10);
            if (!collegePredMap.has(cocInt)) collegePredMap.set(cocInt, []);
            collegePredMap.get(cocInt).push(item);
        });

        const tierKeys = Object.keys(groupData)
            .filter(k => k !== 'unranked')
            .map(Number)
            .sort((x, y) => x - y);

        const finalChoiceList = [];

        tierKeys.forEach(tierNum => {
            const collegesInTier = groupData[tierNum] || [];

            if (params.b.length > 0) {
                params.b.forEach(targetBranchCode => {
                    const tierBranchChoices = [];
                    collegesInTier.forEach(colArr => {
                        const cocInt = colArr[0];
                        const overallRankIndex = colArr[1];
                        const collegeChoices = collegePredMap.get(cocInt);
                        if (!collegeChoices) return;
                        collegeChoices.forEach(choice => {
                            if (choice.brc.trim().toUpperCase() === targetBranchCode) {
                                tierBranchChoices.push({ ...choice, tier: tierNum, overallRankIndex });
                            }
                        });
                    });
                    tierBranchChoices.sort((a, b) => a.overallRankIndex - b.overallRankIndex);
                    tierBranchChoices.forEach(c => finalChoiceList.push(c));
                });
            } else {
                const tierAllChoices = [];
                collegesInTier.forEach(colArr => {
                    const cocInt = colArr[0];
                    const overallRankIndex = colArr[1];
                    const collegeChoices = collegePredMap.get(cocInt);
                    if (!collegeChoices) return;
                    collegeChoices.forEach(choice => {
                        tierAllChoices.push({ ...choice, tier: tierNum, overallRankIndex });
                    });
                });
                tierAllChoices.sort((a, b) => a.overallRankIndex - b.overallRankIndex);
                tierAllChoices.forEach(c => finalChoiceList.push(c));
            }
        });

        renderChoices(finalChoiceList);

    } catch (err) {
        renderError(err.message || 'An error occurred while generating choice list.');
    }
}

document.addEventListener('DOMContentLoaded', runGenerator);
