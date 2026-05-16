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

    // Subscribe to auth changes to update header state
    const setupAuth = () => {
      if (window.RankraAuth) {
        window.RankraAuth.onAuthChange(() => this.update());
      } else {
        setTimeout(setupAuth, 50);
      }
    };
    setupAuth();
  }

  render() {
    const header = $('filter-bar') ? $('filter-bar').previousElementSibling : document.querySelector('.site-header');
    if (!header || !header.classList.contains('site-header')) return;

    const normalizePath = (p) => {
      const withoutIndex = String(p || '/').replace(/index\.html$/i, '');
      const collapsed = withoutIndex.replace(/\/{2,}/g, '/');
      return collapsed.endsWith('/') ? collapsed : `${collapsed}/`;
    };

    const currentPath = normalizePath(window.location?.pathname || '/');
    const isActive = (targetPath) => currentPath === normalizePath(targetPath);
    
    const isGuest = window.RankraAuth?.isGuest();
    const user = window.RankraAuth?.getCurrentUser();

    header.innerHTML = `
      <div class="header-left">
        <a href="/" class="header-logo-link" aria-label="Go to home">
          <img src="${this.logoPath}" height="30" alt="Rankra Logo" class="header-logo" />
        </a>
        <span class="header-title">${this.title}</span>
      </div>

      <div class="header-actions">
        <button id="export-btn" class="header-export-btn" aria-label="Share App">
          <i class="fa-solid fa-link"></i>
          <span>Share</span>
        </button>
        
        <button class="icon-btn hamburger-btn" id="hamburger-btn" aria-label="Open menu" aria-expanded="false">
          <span class="hamburger-bar"></span>
          <span class="hamburger-bar"></span>
          <span class="hamburger-bar"></span>
        </button>
      </div>

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
          <div class="hmenu-section">
            <a href="/" class="hmenu-item ${isActive('/') ? 'active' : ''}"><i class="fa-solid fa-house"></i> Home</a>
            <a href="/tnea/cutoff/" class="hmenu-item ${isActive('/tnea/cutoff/') ? 'active' : ''}"><i class="fa-solid fa-certificate"></i> TNEA Cutoffs</a>
            <a href="/tnea/college/" class="hmenu-item ${isActive('/tnea/college/') ? 'active' : ''}"><i class="fa-solid fa-building-columns"></i> Colleges</a>
            <a href="/course/" class="hmenu-item ${isActive('/course/') ? 'active' : ''}"><i class="fa-solid fa-graduation-cap"></i> Courses</a>
          </div>
        </div>
        <div class="hmenu-footer">
          <div class="hmenu-footer-links">
            <a href="/account/" class="hmenu-item"><i class="fa-solid fa-user-circle"></i> Account</a>
            <a href="/about/" class="hmenu-item"><i class="fa-solid fa-circle-info"></i> About Us</a>
            <a href="/contact/" class="hmenu-item"><i class="fa-solid fa-envelope"></i> Contact Us</a>
            <a href="/privacy/" class="hmenu-item"><i class="fa-solid fa-shield-halved"></i> Privacy Policy</a>
            <a href="/terms/" class="hmenu-item"><i class="fa-solid fa-file-contract"></i> Terms of Service</a>
            <a href="/disclaimer/" class="hmenu-item"><i class="fa-solid fa-triangle-exclamation"></i> Disclaimer</a>
            
            ${user ? `
              <button class="hmenu-item hmenu-logout" id="hmenu-logout" style="width:100%;text-align:left;background:none;border:none;cursor:pointer;color:var(--red);font-family:inherit;font-size:inherit;padding:12px 20px;"><i class="fa-solid fa-right-from-bracket"></i> Logout</button>
            ` : `
              <button class="hmenu-item hmenu-login" id="hmenu-login" style="width:100%;text-align:left;background:none;border:none;cursor:pointer;color:var(--accent);font-family:inherit;font-size:inherit;padding:12px 20px; font-weight: 600;"><i class="fa-solid fa-right-to-bracket"></i> Log in</button>
            `}
          </div>
          <p class="hmenu-copyright">&copy; 2026 Rankra. All rights reserved. <br> Developed by <a href="https://github.com/vertexvicky" target="_blank" style="color: var(--accent); text-decoration: none; font-weight: 600;">vigneswaran</a></p>
        </div>
      </div>
      <div class="hamburger-backdrop hidden" id="hamburger-backdrop"></div>
    `;
  }

  bindEvents() {
    const hamburgerBtn = $('hamburger-btn');
    const hamburgerMenu = $('hamburger-menu');
    const hamburgerBackdrop = $('hamburger-backdrop');

    if (!hamburgerBtn || !hamburgerMenu) return;

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

    if ($('hmenu-close')) $('hmenu-close').addEventListener('click', closeMenu);
    if (hamburgerBackdrop) hamburgerBackdrop.addEventListener('click', closeMenu);

    if ($('theme-toggle')) {
      $('theme-toggle').addEventListener('click', () => {
        const newTheme = document.body.classList.contains('dark') ? 'light' : 'dark';
        applyTheme(newTheme);
        this.syncThemePill();
      });
    }

    if ($('export-btn')) {
      $('export-btn').addEventListener('click', () => {
        this.onShare();
      });
    }

    const logoutBtn = $('hmenu-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        if (window.RankraAuth) {
          // Clear personal information and onboarding state
          const keysToClear = [
            'rankra_cutoff', 'rankra_comm', 'rankra_guest_filters',
            'disclaimerAccept', 'rankra_tour_done', 'tnea-primary'
          ];
          keysToClear.forEach(k => localStorage.removeItem(k));
          window.RankraAuth.logout();
        }
      });
    }

    const loginBtn = $('hmenu-login');
    if (loginBtn) {
      loginBtn.addEventListener('click', () => {
        if (window.RankraAuth) window.RankraAuth.showLogin();
      });
    }
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

  update() {
    this.render();
    this.bindEvents();
    this.syncThemePill();
  }
}
