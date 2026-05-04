
function getEditDistance(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
      }
    }
  }
  return matrix[b.length][a.length];
}

export class FilterSheet {
  constructor(id, options = {}) {
    this.id = id;
    this.title = options.title || 'Select';
    this.placeholder = options.placeholder || 'Search...';
    this.showModeToggle = options.showModeToggle || false;
    this.onApply = options.onApply || (() => { });
    this.onClear = options.onClear || (() => { });

    this.mode = options.mode || 'include';
    this.selectedSet = new Set(options.selected || []);
    this.items = options.items || [];

    this.el = null;
    this.init();

    if (this.items.length > 0) {
      this.updateItems(this.items, this.selectedSet, this.mode);
    }
  }

  init() {
    let el = document.getElementById(this.id);
    if (!el) {
      el = document.createElement('div');
      el.id = this.id;
      el.className = 'overlay-full sheet-overlay hidden';
      document.body.appendChild(el);
    }
    this.el = el;
    this.renderBase();
    this.bindInternalEvents();
  }

  renderBase() {
    const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    const modeDropdown = this.showModeToggle ? `
      <div class="district-wrap sheet-mode-wrap" style="position: relative; margin-right: 20px;">
        <button class="pill-btn sheet-mode-dropdown-btn" aria-haspopup="true" aria-expanded="false" style="background: transparent; padding: 4px 10px;">
          <span class="sheet-mode-btn-text">${this.mode === 'include' ? 'Include' : 'Exclude'}</span>
          <svg class="chevron" width="10" height="6" viewBox="0 0 10 6" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M1 1l4 4 4-4" /></svg>
        </button>
        <div class="sort-dropdown sheet-mode-dropdown" hidden style="right: 0; min-width: 120px;">
          <div class="sort-option ${this.mode === 'include' ? 'active' : ''}" data-mode="include">Include</div>
          <div class="sort-option ${this.mode === 'exclude' ? 'active' : ''}" data-mode="exclude">Exclude</div>
        </div>
      </div>
    ` : '';

    this.el.innerHTML = `
      <div class="overlay-backdrop"></div>
      <div class="sheet-content">
        <div class="sheet-drag-handle"></div>
        <div class="sheet-header">
          <button class="btn-ghost sheet-clear">Clear all</button>
          <div class="sheet-title">${esc(this.title)}</div>
          <div style="display: flex; align-items: center; margin-left: auto;">
            ${modeDropdown}
            <button class="sheet-close" style="width: auto; height: auto;"><i class="fa-solid fa-xmark" style="font-size: 1.2rem;"></i></button>
          </div>
        </div>
        <div class="sheet-search-wrap">
          <input type="text" placeholder="${esc(this.placeholder)}" autocomplete="off">
        </div>
        <div class="sheet-list"></div>
      </div>
    `;

    this.listEl = this.el.querySelector('.sheet-list');
    this.searchInp = this.el.querySelector('.sheet-search-wrap input');
  }

  bindInternalEvents() {
    this.el.querySelector('.overlay-backdrop').addEventListener('click', () => this.close());
    this.el.querySelector('.sheet-close').addEventListener('click', () => this.close());

    this.searchInp.addEventListener('input', e => {
      const rawQ = e.target.value;
      const q = rawQ.toLowerCase().replace(/[^a-z0-9]/g, '');
      const labels = Array.from(this.listEl.querySelectorAll('label'));

      // Clean up previous suggestion header
      const oldHeader = this.listEl.querySelector('.sheet-suggestion-header');
      if (oldHeader) oldHeader.remove();

      if (!q) {
        labels.forEach(l => {
          l.style.display = '';
          const span = l.querySelector('.sheet-item-text');
          if (span) span.textContent = l.dataset.label || '';
        });
        return;
      }

      const direct = [];
      const fuzzy  = [];

      // Allowed edit distance scales with query length
      const tolerance = q.length <= 3 ? 1 : q.length <= 6 ? 2 : 3;

      labels.forEach(l => {
        const originalText = l.dataset.label || '';
        const normText = originalText.toLowerCase().replace(/[^a-z0-9]/g, '');
        const words = normText.split(/\s+/);

        // 1. Exact substring match (highest priority)
        if (normText.includes(q)) {
          direct.push(l);
          l.style.display = 'none';
          return;
        }

        // 2. Prefix edit-distance match on each word
        //    Compare q against the prefix of each word of equal length
        let best = Infinity;
        for (const w of words) {
          if (w.length < 2) continue;
          const slice = w.substring(0, q.length);          // same-length prefix
          const d = getEditDistance(q, slice);
          if (d < best) best = d;
        }

        if (best <= tolerance) {
          // Low distance on prefix = very likely what user meant
          (best === 0 ? direct : fuzzy).push(l);
        }

        l.style.display = 'none';
      });

      if (direct.length > 0) {
        direct.forEach(l => {
          l.style.display = '';
          const span = l.querySelector('.sheet-item-text');
          if (span) {
            const regex = new RegExp(`(${rawQ.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')})`, 'gi');
            span.innerHTML = (l.dataset.label || '').replace(regex, '<span class="highlight">$1</span>');
          }
        });
      } else if (fuzzy.length > 0) {
        const header = document.createElement('div');
        header.className = 'sheet-suggestion-header';
        header.textContent = 'Did you mean?';
        this.listEl.prepend(header);
        fuzzy.forEach(l => {
          l.style.display = '';
          const span = l.querySelector('.sheet-item-text');
          if (span) span.textContent = l.dataset.label || '';
        });
      }
    });

    this.el.querySelector('.sheet-clear').addEventListener('click', () => {
      this.selectedSet.clear();
      this.listEl.querySelectorAll('input').forEach(cb => cb.checked = false);
      this.onClear();
    });

    if (this.showModeToggle) {
      const btn = this.el.querySelector('.sheet-mode-dropdown-btn');
      const dd = this.el.querySelector('.sheet-mode-dropdown');
      const text = this.el.querySelector('.sheet-mode-btn-text');

      btn.addEventListener('click', e => {
        e.stopPropagation();
        const willBeOpen = dd.hidden;
        dd.hidden = !willBeOpen;
        btn.setAttribute('aria-expanded', String(willBeOpen));
      });

      this.el.querySelectorAll('.sheet-mode-dropdown .sort-option').forEach(opt => {
        opt.addEventListener('click', e => {
          e.stopPropagation();
          this.mode = opt.dataset.mode;
          text.textContent = this.mode === 'include' ? 'Include' : 'Exclude';
          this.el.querySelectorAll('.sheet-mode-dropdown .sort-option').forEach(o => o.classList.toggle('active', o === opt));
          dd.hidden = true;
          btn.setAttribute('aria-expanded', 'false');
        });
      });

      this.el.addEventListener('click', e => {
        if (!this.el.querySelector('.sheet-mode-wrap').contains(e.target)) {
          dd.hidden = true;
          btn.setAttribute('aria-expanded', 'false');
        }
      });
    }

    const sheetContent = this.el.querySelector('.sheet-content');
    let startY = 0;
    let currentY = 0;
    let isDragging = false;

    sheetContent.addEventListener('touchstart', (e) => {
      if (e.target.closest('.sheet-list') && this.listEl.scrollTop > 0) return;

      startY = e.touches[0].clientY;
      currentY = startY;
      isDragging = true;
      sheetContent.style.transition = 'none';
    }, { passive: true });

    sheetContent.addEventListener('touchmove', (e) => {
      if (!isDragging) return;
      currentY = e.touches[0].clientY;
      const deltaY = currentY - startY;

      if (deltaY > 0) {
        e.preventDefault();
        sheetContent.style.transform = `translateY(${deltaY}px)`;
      } else {
        isDragging = false;
        sheetContent.style.transform = '';
      }
    }, { passive: false });

    sheetContent.addEventListener('touchend', () => {
      if (!isDragging) return;
      isDragging = false;
      const deltaY = currentY - startY;
      sheetContent.style.transition = 'transform 0.25s ease';

      if (deltaY > 70) {
        this.close();
        setTimeout(() => { sheetContent.style.transform = ''; }, 300);
      } else {
        sheetContent.style.transform = '';
      }
    });
  }

  updateItems(items, selectedSet, mode = 'include') {
    this.items = items || [];
    this.selectedSet = new Set(selectedSet);
    this.mode = mode;

    if (!this.listEl) return;

    if (this.showModeToggle) {
      const modeText = this.el.querySelector('.sheet-mode-btn-text');
      if (modeText) modeText.textContent = this.mode === 'include' ? 'Include' : 'Exclude';
      this.el.querySelectorAll('.sheet-mode-dropdown .sort-option').forEach(b => b.classList.toggle('active', b.dataset.mode === this.mode));
    }

    const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    this.listEl.innerHTML = this.items.map(item => {
      const label = typeof item === 'object' ? item.label : item;
      const val = typeof item === 'object' ? item.value : item;
      const safeLabel = esc(label);
      return `
        <label data-label="${safeLabel}">
          <input type="checkbox" value="${esc(val)}" ${this.selectedSet.has(String(val)) ? 'checked' : ''}>
          <span class="sheet-item-text">${safeLabel}</span>
        </label>
      `;
    }).join('');

    if (this.searchInp) this.searchInp.value = '';
    this.listEl.querySelectorAll('label').forEach(l => l.style.display = '');
  }

  open() {
    // Clean up any previous suggestion header
    const oldHeader = this.listEl.querySelector('.sheet-suggestion-header');
    if (oldHeader) oldHeader.remove();

    const labels = Array.from(this.listEl.querySelectorAll('label'));
    const checkedNodes = [];
    const uncheckedNodes = [];

    labels.forEach(l => {
      const cb = l.querySelector('input');
      const isSelected = this.selectedSet.has(cb.value);
      if (cb) cb.checked = isSelected;

      // Ensure the original text is restored (removing any highlights)
      const span = l.querySelector('.sheet-item-text');
      if (span) span.textContent = l.dataset.label || '';

      l.style.display = '';
      if (isSelected) checkedNodes.push(l);
      else uncheckedNodes.push(l);
    });

    this.listEl.innerHTML = '';
    checkedNodes.forEach(l => this.listEl.appendChild(l));
    uncheckedNodes.forEach(l => this.listEl.appendChild(l));

    if (this.showModeToggle) {
      this.el.querySelector('.sheet-mode-btn-text').textContent = this.mode === 'include' ? 'Include' : 'Exclude';
      this.el.querySelectorAll('.sheet-mode-dropdown .sort-option').forEach(b => b.classList.toggle('active', b.dataset.mode === this.mode));
    }
    this.searchInp.value = '';

    this.el.classList.remove('hidden');
  }

  close() {
    this.selectedSet.clear();
    this.listEl.querySelectorAll('input:checked').forEach(cb => this.selectedSet.add(cb.value));
    this.onApply(this.selectedSet, this.mode);
    this.el.classList.add('hidden');
  }
}
