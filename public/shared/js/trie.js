export class Trie {
  constructor() { this.r = {}; }
  add(w, i) { 
    if (!w) return;
    const s = String(w).toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!s) return;
    let n = this.r; 
    for (const c of s) { 
      if (!n[c]) n[c] = { _: [] }; 
      if (n[c]._.length < 5000) n[c]._.push(i); 
      n = n[c]; 
    } 
  }
  find(p) { 
    if (!p) return new Set();
    const s = String(p).toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!s) return new Set();
    let n = this.r; 
    for (const c of s) { if (!n[c]) return new Set(); n = n[c]; } 
    return new Set(this._c(n)); 
  }
  search(q) {
    if (!q) return [];
    const words = String(q).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w);
    if (!words.length) return [];
    let results = null;
    for (const w of words) {
      const set = this.find(w);
      if (results === null) results = set;
      else {
        const next = new Set();
        for (const id of set) if (results.has(id)) next.add(id);
        results = next;
      }
    }
    if (!results) return [];
    const data = (window.S && window.S.data) || [];
    return Array.from(results).map(i => data[i]).filter(Boolean);
  }
  _c(n) { let r = [...n._]; for (const k in n) { if (k !== '_') r = r.concat(this._c(n[k])); } return r; }
}
