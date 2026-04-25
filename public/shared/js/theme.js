import { $, $$ } from "./utils.js";

/**
 * Applies the theme to the document body and updates UI elements.
 * @param {string} mode - 'light' or 'dark'
 * @param {boolean} save - Whether to persist the choice in localStorage.
 */
export function applyTheme(mode, save = true) {
  // If mode is not provided, try to determine it
  if (!mode) {
    const saved = localStorage.getItem('rankra-theme');
    if (saved) {
      mode = saved;
      save = false; // Already saved
    } else {
      mode = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      save = false; // Don't save system preference by default
    }
  }

  document.body.classList.remove('light', 'dark');
  document.body.classList.add(mode);
  
  const iconSun = $('icon-sun');
  const iconMoon = $('icon-moon');
  if (iconSun) iconSun.classList.toggle('hidden', mode === 'light');
  if (iconMoon) iconMoon.classList.toggle('hidden', mode === 'dark');
  
  if (save) {
    localStorage.setItem('rankra-theme', mode);
  }
}

/**
 * Initializes the theme on page load.
 * Respects localStorage if set, otherwise uses system preference.
 * Does NOT save to localStorage.
 */
export function initTheme() {
  applyTheme(null, false);
}
