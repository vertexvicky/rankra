
export class FilterSheet {
  constructor(id, options = {}) {
    this.id = id;
    this.title = options.title || 'Select';
    this.placeholder = options.placeholder || 'Search...';
    this.showModeToggle = options.showModeToggle || false;
    this.onApply = options.onApply || (() => { });
    this.onClear = options.onClear || (() => { });

    this.mode = 'include';
    this.selectedSet = new Set();
    this.items = [];

    this.el = null;
    this.init();
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
      const q = e.target.value.toLowerCase();
      this.listEl.querySelectorAll('label').forEach(l => {
        l.style.display = l.textContent.toLowerCase().includes(q) ? '' : 'none';
      });
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
    this.items = items;
    this.selectedSet = new Set(selectedSet);
    this.mode = mode;

    if (this.showModeToggle) {
      this.el.querySelector('.sheet-mode-btn-text').textContent = this.mode === 'include' ? 'Include' : 'Exclude';
      this.el.querySelectorAll('.sheet-mode-dropdown .sort-option').forEach(b => b.classList.toggle('active', b.dataset.mode === this.mode));
    }

    const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    this.listEl.innerHTML = items.map(item => {
      const label = typeof item === 'object' ? item.label : item;
      const val = typeof item === 'object' ? item.value : item;
      return `
        <label>
          <input type="checkbox" value="${esc(val)}" ${this.selectedSet.has(String(val)) ? 'checked' : ''}>
          ${esc(label)}
        </label>
      `;
    }).join('');

    this.searchInp.value = '';
    this.listEl.querySelectorAll('label').forEach(l => l.style.display = '');
  }

  open() {
    const labels = Array.from(this.listEl.querySelectorAll('label'));
    const checkedNodes = [];
    const uncheckedNodes = [];

    labels.forEach(l => {
      const cb = l.querySelector('input');
      const isSelected = this.selectedSet.has(cb.value);
      cb.checked = isSelected;
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
