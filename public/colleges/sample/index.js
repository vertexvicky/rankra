import { SiteHeader } from '../../shared/js/SiteHeader.js';
import { applyTheme, initTheme } from '../../shared/js/theme.js';
import { renderCollegePage } from '../../shared/js/college/college-page.js';
import { college } from './college-config.js';

const shareLink = async () => {
  const url = window.location.href;
  try {
    if (navigator.share) {
      await navigator.share({ title: document.title, url });
      return;
    }
  } catch { }

  try {
    await navigator.clipboard.writeText(url);
    alert('Link copied to clipboard.');
  } catch {
    prompt('Copy this link:', url);
  }
};

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const res = await fetch('../../assets/db/colleges/1.json');
    if (!res.ok) throw new Error('Failed to fetch test college data');
    const collegeData = await res.json();

    const pageName = collegeData.name || 'College';
    document.title = `${pageName} — Rankra`;
    
    new SiteHeader({
      title: 'College',
      logoPath: '../../assets/rankra_logo50.png',
      onShare: () => shareLink()
    });

    initTheme();

    const mount = document.getElementById('college-page');
    renderCollegePage(mount, collegeData);
  } catch (err) {
    console.error(err);
    document.body.innerHTML = `<div style="padding: 2rem; text-align: center;"><h1>Error loading college data</h1><p>${err.message}</p></div>`;
  }
});
