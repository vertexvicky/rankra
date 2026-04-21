import { generateAdMockup } from '../components/dummy-ad/dummy-ad.js';

const DISABLED_PATHS = [
  '/tnea/cutoff/',
];

function isAdDisabled() {
  const path = window.location.pathname;
  return DISABLED_PATHS.some(p => path.includes(p));
}

const AD_MIN_INTERVAL_MS = 10_000;
const AD_MAX_INTERVAL_MS = 15_000;
const STORAGE_KEY_INFEED   = 'rankra_infeed_ad_last';
const STORAGE_KEY_VIGNETTE = 'vignette_ad_time';
const VIGNETTE_INTERVAL_MS = 10 * 60 * 1000;

let _nextAdThreshold = _pickThreshold();

function _pickThreshold() {
  return AD_MIN_INTERVAL_MS + Math.random() * (AD_MAX_INTERVAL_MS - AD_MIN_INTERVAL_MS);
}

function _getLastInfeed() {
  return parseInt(localStorage.getItem(STORAGE_KEY_INFEED) || '0', 10);
}

function _markInfeed() {
  localStorage.setItem(STORAGE_KEY_INFEED, Date.now().toString());
  _nextAdThreshold = _pickThreshold();
}

export function canShowInfeedAd() {
  const elapsed = Date.now() - _getLastInfeed();
  return elapsed >= _nextAdThreshold;
}

export function buildInfeedAd() {
  if (isAdDisabled() || !canShowInfeedAd()) return null;
  const wrapper = document.createElement('div');
  wrapper.className = 'ad-container in-feed-ad';
  wrapper.innerHTML = generateAdMockup();
  _markInfeed();
  return wrapper;
}

export function initVignetteAd(overlayId, closeId) {
  const lastTime = localStorage.getItem(STORAGE_KEY_VIGNETTE);
  const now = Date.now();
  const overlay = document.getElementById(overlayId);
  if (!overlay || isAdDisabled()) return;

  if (!lastTime || (now - parseInt(lastTime, 10)) > VIGNETTE_INTERVAL_MS) {
    const slot = overlay.querySelector('.ad-vignette');
    if (slot) slot.innerHTML = generateAdMockup();
    overlay.classList.remove('hidden');
    localStorage.setItem(STORAGE_KEY_VIGNETTE, now.toString());
  }

  const closeBtn = document.getElementById(closeId);
  if (closeBtn) {
    closeBtn.addEventListener('click', () => overlay.classList.add('hidden'));
  }
}
