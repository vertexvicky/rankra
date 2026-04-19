
/**
 * Universal FilterSheet Component
 * Handles mobile bottom sheets with search, selection, and include/exclude modes.
 */
export class FilterSheet {
  constructor(id, options = {}) {
    this.id = id;
    this.title = options.title || 'Select';
    this.placeholder = options.placeholder || 'Search...';
    this.showModeToggle = options.showModeToggle || false;
    this.onApply = options.onApply || (() => { });
    this.onClear = options.onClear || (() => { });

    this.mode = 'include'; // 'include' or 'exclude'
    this.selectedSet = new Set();
    this.items = [];

    this.el = null;
    this.init();
  }

  init() {
    // Create DOM element if not exists
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

    const modeRow = this.showModeToggle ? `
      <div class="sheet-mode-row">
        <button class="sheet-mode-btn ${this.mode === 'include' ? 'active' : ''}" data-mode="include">Include</button>
        <button class="sheet-mode-btn ${this.mode === 'exclude' ? 'active' : ''}" data-mode="exclude">Exclude</button>
      </div>
    ` : '';

    this.el.innerHTML = `
      <div class="overlay-backdrop"></div>
      <div class="sheet-content">
        <div class="sheet-drag-handle"></div>
        <div class="sheet-header">
          <button class="btn-ghost sheet-clear">Clear all</button>
          <div class="sheet-title">${esc(this.title)}</div>
          <button class="sheet-close"><i class="fa-solid fa-xmark"></i></button>
        </div>
        ${modeRow}
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
      this.el.querySelectorAll('.sheet-mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          this.mode = btn.dataset.mode;
          this.el.querySelectorAll('.sheet-mode-btn').forEach(b => b.classList.toggle('active', b === btn));
        });
      });
    }

    // Drag-down to close logic
    const sheetContent = this.el.querySelector('.sheet-content');
    let startY = 0;
    let currentY = 0;
    let isDragging = false;

    sheetContent.addEventListener('touchstart', (e) => {
      // Abort drag if the user is scrolling down inside the list
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

      if (deltaY > 70) { // Threshold to trigger close
        this.close();
        setTimeout(() => { sheetContent.style.transform = ''; }, 300);
      } else {
        // Bounce back
        sheetContent.style.transform = '';
      }
    });
  }

  updateItems(items, selectedSet, mode = 'include') {
    this.items = items;
    this.selectedSet = new Set(selectedSet);
    this.mode = mode;

    // Update mode buttons
    if (this.showModeToggle) {
      this.el.querySelectorAll('.sheet-mode-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === this.mode));
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
    // Dynamically sort DOM labels so selected items float to the top
    const labels = Array.from(this.listEl.querySelectorAll('label'));
    const checkedNodes = [];
    const uncheckedNodes = [];

    labels.forEach(l => {
      const cb = l.querySelector('input');
      const isSelected = this.selectedSet.has(cb.value);
      cb.checked = isSelected;
      l.style.display = ''; // reset search visibility
      if (isSelected) checkedNodes.push(l);
      else uncheckedNodes.push(l);
    });

    // Re-append nodes in sorted order
    this.listEl.innerHTML = '';
    checkedNodes.forEach(l => this.listEl.appendChild(l));
    uncheckedNodes.forEach(l => this.listEl.appendChild(l));

    if (this.showModeToggle) {
      this.el.querySelectorAll('.sheet-mode-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === this.mode));
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
