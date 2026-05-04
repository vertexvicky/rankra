/**
 * @license
 * (c) 2026 Rankra. All rights reserved.
 */

// Manifest with individual versions per path
export const CACHE_MANIFEST = {
    '/assets/db/tnea/cutoff/0202.gzip': '1.0.0',
    '/assets/db/tnea/cutoff/1202.gzip': '1.0.0',
    '/assets/db/tnea/cutoff/2202.gzip': '1.0.0',
    '/assets/db/tnea/cutoff/3202.gzip': '1.0.0',
    '/assets/db/tnea/cutoff/4202.gzip': '1.0.0',
    '/assets/db/tnea/cutoff/5202.gzip': '1.0.0',
    '/assets/db/tnea/college/clgs.gzip': '1.0.0',
    '/assets/db/tnea/college/brnc.json': '1.0.0',
    '/assets/db/tndistricts.json': '1.0.1'
};

const _0x1 = "\u0076\u0069\u0063\u006b\u0079", _0x2 = "\u0072", _0x3 = "\u0031\u0036", _0x4 = "\u006e\u006b", _0x5 = "\u0061", _0x6 = "\u0031\u0031", _0x7 = "\u0063\u0061\u0063\u0068\u0065\u0064\u005f";

async function _0x8(_0x9) {
    const _0xa = (_0x2 + _0x5 + _0x4 + _0x2 + _0x5 + _0x1 + _0x3 + _0x6).split('').map(_0xb => _0xb.charCodeAt(0));
    const _0xc = new Uint8Array(_0x9);
    for (let _0xd = 0; _0xd < _0xc.length; _0xd++) {
        _0xc[_0xd] ^= _0xa[_0xd % _0xa.length];
    }
    const _0xe = new Response(_0xc).body.pipeThrough(new DecompressionStream('gzip'));
    return new Response(_0xe).json();
}

/**
 * Checks if a specific version of a file has been verified in the last 5 days.
 */
function _0xf(_0x10, _v) {
    const _0x11 = `\u0072\u0061\u006e\u006b\u0072\u0061\u005f${_0x7}${_0x10}_${_v}`;
    const _0x12 = localStorage.getItem(_0x11);
    if (!_0x12) return false;
    return (Date.now() - parseInt(_0x12, 10)) < 432000000;
}

function _0x13(_0x14, _v) {
    localStorage.setItem(`\u0072\u0061\u006e\u006b\u0072\u0061\u005f${_0x7}${_0x14}_${_v}`, Date.now().toString());
}

/**
 * requestJSON: Skips network (200 from cache) if verified within 5 days.
 */
export async function requestJSON(paths) {
    const results = {};
    const promises = paths.map(async (path) => {
        try {
            const v = CACHE_MANIFEST[path] || '0';
            const url = `${path}?v=${v}`;
            
            // If already verified recently, use 'force-cache' for instant loading
            const mode = _0xf(path, v) ? '\u0066\u006f\u0072\u0063\u0065\u002d\u0063\u0061\u0063\u0068\u0065' : '\u006e\u006f\u002d\u0063\u0061\u0063\u0068\u0065';
            
            const res = await fetch(url, { cache: mode });
            if (!res.ok) return;
            
            _0x13(path, v);
            if (path.includes('\u0067\u007a\u0069\u0070')) { 
                const buffer = await res.arrayBuffer();
                results[path] = await _0x8(buffer);
            } else {
                results[path] = await res.json();
            }
        } catch (e) {
            results[path] = null;
        }
    });

    await Promise.all(promises);
    return results;
}

export function getYearFromURL(fallback = '2025') {
    const params = new URLSearchParams(window.location.search);
    return params.get('year') || fallback;
}

/**
 * initBackgroundCache: Skips network if verified within 5 days.
 */
export async function initBackgroundCache() {
    await new Promise(r => setTimeout(r, 4000));
    for (const [path, v] of Object.entries(CACHE_MANIFEST)) {
        if (!_0xf(path, v)) {
            const url = `${path}?v=${v}`;
            fetch(url, { cache: '\u006e\u006f\u002d\u0063\u0061\u0063\u0068\u0065' })
                .then(() => _0x13(path, v))
                .catch(() => {});
            await new Promise(r => setTimeout(r, 1500));
        }
    }
}
