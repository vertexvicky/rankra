import { $, $$ } from './utils.js';
import { applyTheme } from './theme.js';

export class SiteHeader {
  constructor(options = {}) {
    this.title = options.title || 'Rankra';
    this.onShare = options.onShare || (() => { });
    this.logoPath = options.logoPath || '../../assets/rankra_logo50.png';
    this.init();
  }

  init() {
    this.render();
    this.bindEvents();
    this.syncThemePill();
  }

  render() {
    const header = $('filter-bar') ? $('filter-bar').previousElementSibling : document.querySelector('.site-header');
    if (!header || !header.classList.contains('site-header')) return;

    header.innerHTML = `
      <div class="header-left">
        <a href="/" class="header-logo-link" aria-label="Go to home">
          <img src="${this.logoPath}" height="30" alt="Rankra Logo" class="header-logo" />
        </a>
        <span class="header-title">${this.title}</span>
      </div>

      <button id="export-btn" class="header-export-btn" aria-label="Share App">
        <i class="fa-solid fa-link"></i>
        <span>Share</span>
      </button>
      <button class="icon-btn hamburger-btn" id="hamburger-btn" aria-label="Open menu" aria-expanded="false">
        <span class="hamburger-bar"></span>
        <span class="hamburger-bar"></span>
        <span class="hamburger-bar"></span>
      </button>

      <div class="hamburger-menu" id="hamburger-menu" aria-hidden="true">
        <div class="hmenu-header">
          <img src="${this.logoPath}" height="26" alt="Rankra" class="hmenu-logo" />
          <div class="hmenu-header-right">
            <button class="theme-pill-toggle" id="theme-toggle" aria-label="Toggle dark mode">
              <span class="tpt-knob">
                <svg id="icon-sun" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
                <svg id="icon-moon" class="hidden" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              </span>
              <span class="tpt-label" id="tpt-label">DAY MODE</span>
            </button>
            <button class="hmenu-close" id="hmenu-close" aria-label="Close menu">✕</button>
          </div>
        </div>
        <div class="hmenu-body">
        </div>
      </div>
      <div class="hamburger-backdrop hidden" id="hamburger-backdrop"></div>
    `;
  }

  bindEvents() {
    const hamburgerBtn = $('hamburger-btn');
    const hamburgerMenu = $('hamburger-menu');
    const hamburgerBackdrop = $('hamburger-backdrop');

    const openMenu = () => {
      hamburgerMenu.classList.add('open');
      hamburgerMenu.setAttribute('aria-hidden', 'false');
      hamburgerBtn.setAttribute('aria-expanded', 'true');
      hamburgerBackdrop.classList.remove('hidden');
    };

    const closeMenu = () => {
      hamburgerMenu.classList.remove('open');
      hamburgerMenu.setAttribute('aria-hidden', 'true');
      hamburgerBtn.setAttribute('aria-expanded', 'false');
      hamburgerBackdrop.classList.add('hidden');
    };

    hamburgerBtn.addEventListener('click', e => {
      e.stopPropagation();
      hamburgerMenu.classList.contains('open') ? closeMenu() : openMenu();
    });

    $('hmenu-close').addEventListener('click', closeMenu);
    hamburgerBackdrop.addEventListener('click', closeMenu);

    $('theme-toggle').addEventListener('click', () => {
      const newTheme = document.body.classList.contains('dark') ? 'light' : 'dark';
      applyTheme(newTheme);
      this.syncThemePill();
    });

    $('export-btn').addEventListener('click', () => {
      this.onShare();
    });
  }

  syncThemePill() {
    const isDark = document.body.classList.contains('dark');
    const label = $('tpt-label');
    const sun = $('icon-sun');
    const moon = $('icon-moon');
    if (label) label.textContent = isDark ? 'NIGHT MODE' : 'DAY MODE';
    if (sun) sun.classList.toggle('hidden', isDark);
    if (moon) moon.classList.toggle('hidden', !isDark);
  }
}
