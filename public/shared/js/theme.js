import { $, $$ } from "./utils.js";

export function applyTheme(mode) {
  document.body.classList.remove('light', 'dark');
  document.body.classList.add(mode);
  
  const iconSun = $('icon-sun');
  const iconMoon = $('icon-moon');
  if (iconSun) iconSun.classList.toggle('hidden', mode === 'light');
  if (iconMoon) iconMoon.classList.toggle('hidden', mode === 'dark');
  
  localStorage.setItem('rankra-theme', mode);
}
