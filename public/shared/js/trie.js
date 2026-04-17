export class Trie {
  constructor() { this.r = {}; }
  add(w, i) { let n = this.r; for (const c of w) { if (!n[c]) n[c] = { _: [] }; if (n[c]._.length < 5000) n[c]._.push(i); n = n[c]; } }
  find(p) { let n = this.r; for (const c of p) { if (!n[c]) return new Set(); n = n[c]; } return new Set(this._c(n)); }
  _c(n) { let r = [...n._]; for (const k in n) { if (k !== '_') r = r.concat(this._c(n[k])); } return r; }
}
