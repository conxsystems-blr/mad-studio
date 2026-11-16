// MAD Studio — single-file app. Data lives in localStorage and syncs to Supabase when signed in.
const SUPABASE_JS = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
const TABLE = 'mad_records';

/* ---------------- Defaults ---------------- */
const DEF_SETTINGS = {
  business: {
    brand: 'MAD', company: 'CONX SYSTEMS', tagline: 'Candles for a brighter you',
    address: '#473/A, Dasarahalli Main Road, HAF Post\nBengaluru 560024, Karnataka',
    gstin: '29ARYPN0777G2ZY', stateCode: '29', phone: '96869 39373', email: 'deepak@conxsystems.in',
    instagram: '', bankName: '', bankAccName: 'Conx Systems', bankAcc: '', ifsc: '', upi: '',
    invTerms: '1. Payment due within 7 days of invoice date.\n2. Candles are hand-poured; slight variation in colour and surface is natural.\n3. Please report any damage within 48 hours of delivery.',
    quoteTerms: '1. Prices are valid for 15 days from the quotation date. GST extra as shown.\n2. Delivery within 5–7 working days of order confirmation.\n3. Payment due within 7 days of invoice date.',
    hsn: '3406', dueDays: 7, validDays: 15
  },
  rates: { wax: 300, fo: 1500, wick: 2, logoSt: 3, baseSt: 2, boxS: 15, boxM: 18, boxL: 22, boxSt: 2, dust: 3, tissue: 4, misc: 1 },
  size: { S: { name: 'Small', w: 65, wicks: 1, lab: 12, hrs: 15, box: 15 }, M: { name: 'Medium', w: 125, wicks: 1, lab: 15, hrs: 30, box: 18 }, L: { name: 'Large', w: 220, wicks: 2, lab: 20, hrs: 50, box: 22 } },
  set: { load: 10, waste: 5, mkWs: 1.8, mkRt: 3, gst: 5, cureDays: 10, lowStock: 5 },
  tins: [
    { id: 'RS', name: 'Round · small', size: 'S', rate: 18, wax: 65 }, { id: 'RM', name: 'Round · medium', size: 'M', rate: 28, wax: 125 },
    { id: 'RL', name: 'Round · large', size: 'L', rate: 45, wax: 220 }, { id: 'SqM', name: 'Square · medium', size: 'M', rate: 32, wax: 125 },
    { id: 'HtM', name: 'Heart · medium', size: 'M', rate: 35, wax: 125 }],
  packs: [
    { id: 'tin', name: 'Tin', box: false, gift: false, extra: 0 }, { id: 'box', name: 'Boxed', box: true, gift: false, extra: 0 },
    { id: 'gift', name: 'Gift set', box: true, gift: true, extra: 0 }],
  scents: ['White Tea & Ginger', 'Sandalwood & Vetiver', 'Oud & Amber', 'Vanilla & Tonka', 'Coffee & Cardamom', 'Saffron & Amber', 'Sea Salt & Sage', 'Black Fig & Cassis']
};
const RATE_FIELDS = [['wax','Soy wax','per kg'],['fo','Fragrance oil','per kg'],['wick','Wick with tab','each'],['logoSt','Logo sticker (UV)','each'],['baseSt','Bottom sticker (UV)','each'],['boxSt','Box back sticker','each'],['dust','Dust cover card','each'],['tissue','Tissue + seal','per set'],['misc','Misc (glue dot etc.)','per candle']];
const SET_FIELDS = [['load','Fragrance load','% of wax weight'],['waste','Wastage','% of wax + oil'],['mkWs','Wholesale markup','× cost'],['mkRt','Retail markup','× cost'],['gst','GST on candles','%'],['cureDays','Cure time','days'],['lowStock','Low-stock alert','candles or fewer']];
const SIZE_NAMES = { S: 'Small', M: 'Medium', L: 'Large' };
const SOP = {
  prep: ['Room 20–27 °C, no fans or drafts', 'Tins clean, dry, at room temperature', 'Wicks stuck centred (2 in large tins) and clipped upright', 'Wax weighed (+5%); oil weighed and labelled per scent', 'Batch number written on the record'],
  pour: ['Melted fully at 80–85 °C (probe checked, never over 90 °C)', 'Fragrance added at 80–85 °C', 'Stirred slowly for a full 2 minutes', 'Poured at 55–60 °C, about 1 cm below the rim', '10% kept back for top-up; jug wiped before next scent'],
  cure: ['Left untouched 4–6 hours', 'Sinkholes topped up at 60 °C', 'After 24 hours: bars off, wicks trimmed to 5 mm', 'Lids on, curing out of sunlight'],
  pack: ['Logo sticker top-left; bottom sticker scent checked', 'Batch number on every candle', 'Boxed: box + back sticker', 'Gift set: dust cover, box, tissue + seal', 'Counted against the order']
};
const SOP_TITLES = { prep: '1 · Prep', pour: '2 · Melt & pour', cure: '3 · Set & cure', pack: '4 · Label & pack' };

/* ---------------- Helpers ---------------- */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clone = o => JSON.parse(JSON.stringify(o));
const uid = p => p + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const inr = (n, d = 2) => '₹' + (Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d });
const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;   // local date, not UTC
const today = () => ymd(new Date());
const fmtDate = s => s ? new Date(s + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
const addDays = (s, n) => { const d = new Date(s + 'T00:00:00'); d.setDate(d.getDate() + Number(n || 0)); return ymd(d); };
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('on'), 2600); }
function lsGet(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } }
function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage full or blocked */ } }
function fyLabel(dateStr) { const d = new Date(dateStr + 'T00:00:00'); const y = d.getMonth() < 3 ? d.getFullYear() - 1 : d.getFullYear(); return String(y % 100).padStart(2, '0') + '-' + String((y + 1) % 100).padStart(2, '0'); }
function inWords(num) {
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const two = n => n < 20 ? a[n] : b[Math.floor(n / 10)] + (n % 10 ? ' ' + a[n % 10] : '');
  const three = n => (n >= 100 ? a[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' : '') : '') + (n % 100 ? two(n % 100) : '');
  const conv = n => { if (!n) return ''; const out = []; const cr = Math.floor(n / 1e7); n %= 1e7; const lk = Math.floor(n / 1e5); n %= 1e5; const th = Math.floor(n / 1e3); n %= 1e3;
    if (cr) out.push(conv(cr) + ' Crore'); if (lk) out.push(two(lk) + ' Lakh'); if (th) out.push(two(th) + ' Thousand'); if (n) out.push(three(n)); return out.join(' '); };
  const r = Math.round(Number(num) || 0); return r ? 'Rupees ' + conv(r) + ' only' : 'Rupees Zero only';
}

/* ---------------- Data store ---------------- */
const store = {
  recs: new Map(),           // id -> {id, kind, data, updated_at, deleted}
  pending: new Set(lsGet('mad.pending', [])),
  load() { lsGet('mad.records', []).forEach(r => this.recs.set(r.id, r)); if (!this.recs.has('settings')) this.put('settings', 'settings', clone(DEF_SETTINGS), true); },
  persist() { lsSet('mad.records', [...this.recs.values()]); lsSet('mad.pending', [...this.pending]); },
  get(id) { const r = this.recs.get(id); return r && !r.deleted ? r.data : null; },
  list(kind) { return [...this.recs.values()].filter(r => r.kind === kind && !r.deleted).map(r => r.data); },
  put(id, kind, data, quiet) { const rec = { id, kind, data, updated_at: new Date().toISOString(), deleted: false }; this.recs.set(id, rec); this.pending.add(id); this.persist(); if (!quiet) sync.push(); return data; },
  remove(id) { const r = this.recs.get(id); if (!r) return; r.deleted = true; r.updated_at = new Date().toISOString(); this.pending.add(id); this.persist(); sync.push(); }
};
function S() { const s = store.get('settings') || clone(DEF_SETTINGS);
  // fill any keys added in later versions
  for (const k of Object.keys(DEF_SETTINGS)) if (s[k] == null) s[k] = clone(DEF_SETTINGS[k]);
  for (const k of ['business', 'rates', 'set']) s[k] = Object.assign(clone(DEF_SETTINGS[k]), s[k]);
  for (const z of ['S', 'M', 'L']) s.size[z] = Object.assign(clone(DEF_SETTINGS.size[z]), s.size[z]);
  // older saves kept box prices under rates (boxS/boxM/boxL)
  for (const z of Object.keys(s.size)) { const d = s.size[z]; if (!d.name) d.name = SIZE_NAMES[z] || z; if (d.box == null) d.box = s.rates['box' + z] ?? 0; }
  return s; }
function saveSettings(s) { store.put('settings', 'settings', s); }

/* ---------------- Supabase sync ---------------- */
const sync = {
  client: null, user: null, busy: false,
  cfg() { return lsGet('mad.supabase', null); },
  badge(text, cls) { const b = $('#syncBadge'); if (!b) return; b.textContent = text; b.className = 'sync ' + (cls || ''); },
  async init() {
    const cfg = this.cfg(); if (!cfg || !cfg.url || !cfg.key) { this.badge('Local only — set up sync in Settings'); return; }
    try {
      const { createClient } = await import(SUPABASE_JS);
      this.client = createClient(cfg.url, cfg.key, { auth: { persistSession: true, autoRefreshToken: true } });
      const { data } = await this.client.auth.getSession();
      this.user = data.session ? data.session.user : null;
      this.client.auth.onAuthStateChange((_e, session) => { this.user = session ? session.user : null; this.refreshBadge(); });
      this.refreshBadge();
      if (this.user) await this.pull();
    } catch (e) { this.badge('Sync unavailable (offline?)', 'err'); }
  },
  refreshBadge() { if (!this.client) return this.badge('Local only — set up sync in Settings'); this.badge(this.user ? 'Synced · ' + this.user.email : 'Signed out — sign in in Settings', this.user ? 'ok' : 'err'); },
  async pull() {
    if (!this.client || !this.user || this.busy) return; this.busy = true; this.badge('Syncing…');
    try {
      const { data, error } = await this.client.from(TABLE).select('id,kind,data,deleted,updated_at');
      if (error) throw error;
      const remote = new Map((data || []).map(r => [r.id, r]));
      for (const r of remote.values()) { const l = store.recs.get(r.id); if (!l || new Date(r.updated_at) > new Date(l.updated_at)) { store.recs.set(r.id, r); store.pending.delete(r.id); } }
      for (const l of store.recs.values()) { const r = remote.get(l.id); if (!r || new Date(l.updated_at) > new Date(r.updated_at)) store.pending.add(l.id); }
      store.persist(); this.busy = false; await this.push(true); render();
    } catch (e) { this.busy = false; this.badge('Sync error — ' + (e.message || 'check connection'), 'err'); }
  },
  async push(force) {
    if (!this.client || !this.user || (this.busy && !force) || !store.pending.size) { if (this.client && this.user && !store.pending.size) this.refreshBadge(); return; }
    this.busy = true;
    const rows = [...store.pending].map(id => store.recs.get(id)).filter(Boolean).map(r => ({ user_id: this.user.id, id: r.id, kind: r.kind, data: r.data, deleted: !!r.deleted, updated_at: r.updated_at }));
    try { const { error } = await this.client.from(TABLE).upsert(rows, { onConflict: 'user_id,id' }); if (error) throw error;
      rows.forEach(r => store.pending.delete(r.id)); store.persist(); this.refreshBadge();
    } catch (e) { this.badge('Not synced yet — will retry', 'err'); }
    this.busy = false;
  }
};
window.addEventListener('online', () => sync.push());
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') sync.pull(); });

/* ---------------- Costing engine ---------------- */
const tinOf = (s, id) => s.tins.find(t => t.id === id) || s.tins[0];
// Wax per candle: the tin's own weight if entered, otherwise the size default.
const sizeOf = (s, t) => s.size[t.size] || s.size.M;
const sizeKey = (s, t) => (s.size[t.size] ? t.size : 'M');
const sizeName = (s, z) => s.size[z]?.name || SIZE_NAMES[z] || z;
const waxOf = (s, t) => (+t.wax > 0 ? +t.wax : (s.size[t.size] || s.size.M).w);
const tinLabel = (s, t) => `${t.name} · ${waxOf(s, t)} g`;
const packOf = (s, id) => s.packs.find(p => p.id === id) || s.packs[0];
function unitCost(s, tinId, packId) {
  const t = tinOf(s, tinId), p = packOf(s, packId), z = s.size[t.size] || s.size.M, r = s.rates;
  const w = waxOf(s, t), wax = w / 1000 * r.wax, oil = w * s.set.load / 100 / 1000 * r.fo;
  let c = (wax + oil) * (1 + s.set.waste / 100) + z.wicks * r.wick + (+t.rate || 0) + r.logoSt + r.baseSt + r.misc + z.lab;
  if (p.box) c += (+z.box || 0) + r.boxSt;
  if (p.gift) c += r.dust + r.tissue;
  return c + (+p.extra || 0);
}
const unitPrice = (s, tinId, packId, basis) => Math.ceil(unitCost(s, tinId, packId) * (basis === 'rt' ? s.set.mkRt : s.set.mkWs) / 5) * 5;
const linePrice = (s, l, basis) => (l.ovr !== '' && l.ovr != null && !isNaN(+l.ovr)) ? +l.ovr : unitPrice(s, l.tin, l.pack, basis);
function orderCalc(s, lines, basis) {
  const o = { sub: 0, cost: 0, qty: 0, waxG: 0, wicks: 0, gift: 0, boxed: 0, tinsQ: {}, fo: {}, boxQ: {}, dustQ: {}, base: { small: 0, other: 0 }, extraQ: {} };
  lines.forEach(l => { const q = +l.qty || 0; if (!q) return; const t = tinOf(s, l.tin), p = packOf(s, l.pack), z = s.size[t.size] || s.size.M;
    o.sub += linePrice(s, l, basis) * q; o.cost += unitCost(s, l.tin, l.pack) * q; o.qty += q;
    const g = waxOf(s, t) * q * (1 + s.set.waste / 100); o.waxG += g; o.fo[l.scent] = (o.fo[l.scent] || 0) + g * s.set.load / 100;
    o.wicks += z.wicks * q; o.tinsQ[t.id] = (o.tinsQ[t.id] || 0) + q; if (t.size === 'S') o.base.small += q; else o.base.other += q;
    if (p.box) { const zk = sizeKey(s, t); o.boxQ[zk] = (o.boxQ[zk] || 0) + q; o.boxed += q; } if (p.gift) { o.gift += q; o.dustQ[t.id] = (o.dustQ[t.id] || 0) + q; }
    if (+p.extra) o.extraQ[p.id] = (o.extraQ[p.id] || 0) + q; });
  return o;
}
function gstSplit(s, sub, supply) { const g = Math.round(sub * s.set.gst) / 100; return supply === 'out' ? { cgst: 0, sgst: 0, igst: g, total: Math.round(sub + g), gst: g } : { cgst: g / 2, sgst: g / 2, igst: 0, total: Math.round(sub + g), gst: g }; }

/* ---------------- Router ---------------- */
const routes = { calc: viewCalc, docs: viewDocs, doc: viewDoc, print: viewPrint, batches: viewBatches, batch: viewBatch, recipes: viewRecipes, recipe: viewRecipe, tests: viewTests, test: viewTest, stock: viewStock, produce: viewProduce, brand: viewBrand, settings: viewSettings };
function render() {
  const [name, id] = (location.hash.replace(/^#\/?/, '') || 'calc').split('/');
  const fn = routes[name] || viewCalc;
  const tab = { doc: 'docs', print: 'docs', batch: 'batches', recipes: 'batches', recipe: 'batches', produce: 'batches', tests: 'batches', test: 'batches' }[name] || name;
  $$('#nav a').forEach(a => a.classList.toggle('on', a.dataset.tab === tab));
  window.onbeforeunload = null;
  const v = document.createElement('div'); $('#view').replaceChildren(v);   // fresh node so old listeners are dropped
  fn(v, id ? decodeURIComponent(id) : null); window.scrollTo(0, 0);
}
window.addEventListener('hashchange', render);

/* ---------------- Calculator ---------------- */
let calcState = lsGet('mad.calcDraft', null);
function calcDraft(s) {
  if (!calcState) calcState = { customer: '', basis: 'ws', supply: 'in', lines: [{ tin: s.tins[1]?.id || s.tins[0].id, pack: s.packs[0].id, scent: s.scents[0], qty: 10, ovr: '' }] };
  calcState.lines.forEach(l => { if (!s.tins.some(t => t.id === l.tin)) l.tin = s.tins[0].id; if (!s.packs.some(p => p.id === l.pack)) l.pack = s.packs[0].id; if (!s.scents.includes(l.scent)) l.scent = s.scents[0]; });
  return calcState;
}
const opt = (items, val) => items.map(o => `<option value="${esc(o.v)}"${o.v === val ? ' selected' : ''}>${esc(o.t)}</option>`).join('');
function viewCalc(v) {
  const s = S(), st = calcDraft(s);
  v.innerHTML = `<div class="wrap">
  <div class="head"><div><span class="eyebrow">Costing &amp; quotes</span><h1>Order calculator</h1></div><span class="sub">Cost, quote price, GST and materials to buy.</span></div>
  <div class="grid2"><section>
    <div class="fields">
      <label>Customer<input id="cCust" value="${esc(st.customer)}" placeholder="Customer name"></label>
      <label>Price basis<select id="cBasis">${opt([{ v: 'ws', t: 'Wholesale (trade)' }, { v: 'rt', t: 'Retail' }], st.basis)}</select></label>
      <label>Supply<select id="cSupply">${opt([{ v: 'in', t: 'Within Karnataka (CGST+SGST)' }, { v: 'out', t: 'Outside Karnataka (IGST)' }], st.supply)}</select></label>
    </div>
    <div class="scroll"><table class="lines"><thead><tr><th>Tin</th><th>Packaging</th><th>Scent</th><th class="num">Qty</th><th class="num">Price/pc</th><th class="num">Amount</th><th></th></tr></thead><tbody id="cLines"></tbody></table></div>
    <div class="row"><button id="cAdd" type="button">Add line</button><button id="cClear" class="ghost" type="button">Clear</button><span class="note">Leave Price/pc blank for the calculated price.</span></div>
    <h2 style="margin-top:12px">Materials to buy</h2>
    <div class="scroll"><table><thead><tr><th>Material</th><th class="num">Quantity</th><th class="num">Rate</th><th class="num">Cost</th></tr></thead><tbody id="cMats"></tbody></table></div>
  </section><section>
    <div class="card"><h2>Quote</h2><div class="totals" id="cTot"></div><div class="kpis" id="cKpi"></div>
      <div class="row"><button id="cSave" type="button">Save quote</button><button id="cDoc" class="ghost" type="button">Make quotation</button><button id="cInv" class="ghost" type="button">Make invoice</button><button id="cCopy" class="ghost" type="button">Copy for WhatsApp</button></div>
      <textarea id="cCopyBox" hidden aria-label="Quote text"></textarea></div>
    <div class="card"><h2>Saved quotes</h2><div class="list" id="cSaved"></div></div>
  </section></div></div>`;
  const tinO = s.tins.map(t => ({ v: t.id, t: tinLabel(s, t) })), packO = s.packs.map(p => ({ v: p.id, t: p.name })), scO = s.scents.map(x => ({ v: x, t: x }));
  const drawLines = () => { $('#cLines').innerHTML = st.lines.map((l, i) => `<tr data-i="${i}">
      <td data-l="Tin"><select data-f="tin" aria-label="Tin">${opt(tinO, l.tin)}</select></td><td data-l="Packaging"><select data-f="pack" aria-label="Packaging">${opt(packO, l.pack)}</select></td>
      <td data-l="Scent"><select data-f="scent" aria-label="Scent">${opt(scO, l.scent)}</select></td>
      <td class="num q" data-l="Qty"><input data-f="qty" type="number" inputmode="numeric" min="0" value="${esc(l.qty)}" aria-label="Quantity"></td>
      <td class="num p" data-l="Price/pc"><input data-f="ovr" type="number" inputmode="decimal" min="0" value="${esc(l.ovr)}" aria-label="Price per piece"></td>
      <td class="num" data-amt data-l="Amount"></td><td><button class="x" type="button" data-del="${i}" aria-label="Remove line">×</button></td></tr>`).join('') || `<tr><td colspan="7" class="empty">No lines. Add a line to start.</td></tr>`; };
  const draw = () => {
    lsSet('mad.calcDraft', st);
    $$('#cLines tr[data-i]').forEach(tr => { const l = st.lines[+tr.dataset.i]; tr.querySelector('[data-amt]').textContent = inr(linePrice(s, l, st.basis) * (+l.qty || 0), 0); tr.querySelector('[data-f=ovr]').placeholder = unitPrice(s, l.tin, l.pack, st.basis); });
    const o = orderCalc(s, st.lines, st.basis), g = gstSplit(s, o.sub, st.supply), profit = o.sub - o.cost, m = o.sub ? profit / o.sub : 0;
    $('#cTot').innerHTML = `<span class="k">Candles</span><span class="v">${o.qty}</span><span class="k">Taxable value</span><span class="v">${inr(o.sub)}</span>` +
      (st.supply === 'in' ? `<span class="k">CGST @ ${s.set.gst / 2}%</span><span class="v">${inr(g.cgst)}</span><span class="k">SGST @ ${s.set.gst / 2}%</span><span class="v">${inr(g.sgst)}</span>` : `<span class="k">IGST @ ${s.set.gst}%</span><span class="v">${inr(g.igst)}</span>`) +
      `<span class="k g">Total</span><span class="v g">${inr(g.total, 0)}</span>`;
    $('#cKpi').innerHTML = `<div class="kpi"><b>${inr(o.cost, 0)}</b><span>Your cost</span></div><div class="kpi"><b>${inr(profit, 0)}</b><span>Profit</span></div><div class="kpi"><b class="${m >= .4 ? 'ok' : 'warnc'}">${(m * 100).toFixed(1)}%</b><span>Margin</span></div>`;
    const r = s.rates, rows = [], add = (n, q, u, rate) => { if (q > 0) rows.push(`<tr><td>${esc(n)}</td><td class="num">${q} ${u}</td><td class="num">${inr(rate, rate % 1 ? 2 : 0)}</td><td class="num">${inr(q * rate, 0)}</td></tr>`); };
    if (o.waxG) rows.push(`<tr><td>Soy wax</td><td class="num">${(o.waxG / 1000).toFixed(2)} kg</td><td class="num">${inr(r.wax, 0)}/kg</td><td class="num">${inr(o.waxG / 1000 * r.wax, 0)}</td></tr>`);
    Object.entries(o.fo).forEach(([k, g2]) => rows.push(`<tr><td>Fragrance oil · ${esc(k)}</td><td class="num">${Math.ceil(g2)} g</td><td class="num">${inr(r.fo, 0)}/kg</td><td class="num">${inr(g2 / 1000 * r.fo, 0)}</td></tr>`));
    add('Wicks with tab', o.wicks, 'pcs', r.wick); s.tins.forEach(t => add('Tin · ' + t.name, o.tinsQ[t.id] || 0, 'pcs', +t.rate || 0));
    add('Logo stickers (UV)', o.qty, 'pcs', r.logoSt); add('Bottom stickers 45 mm', o.base.small, 'pcs', r.baseSt); add('Bottom stickers 55 mm', o.base.other, 'pcs', r.baseSt);
    Object.keys(s.size).forEach(z => add('Box · ' + sizeName(s, z).toLowerCase(), o.boxQ[z] || 0, 'pcs', +s.size[z].box || 0)); add('Box back stickers', o.boxed, 'pcs', r.boxSt);
    s.tins.forEach(t => add('Dust cover · ' + t.name, o.dustQ[t.id] || 0, 'pcs', r.dust)); add('Tissue + seal sets', o.gift, 'sets', r.tissue);
    s.packs.forEach(p => add('Packaging extra · ' + p.name, o.extraQ[p.id] || 0, 'pcs', +p.extra || 0));
    $('#cMats').innerHTML = rows.join('') || `<tr><td colspan="4" class="empty">Add order lines to see what to buy.</td></tr>`;
  };
  const drawSaved = () => { const qs = store.list('quote').sort((a, b) => (b.savedAt || '').localeCompare(a.savedAt || ''));
    $('#cSaved').innerHTML = qs.length ? qs.map(q => `<div class="item"><div><div class="t">${esc(q.customer || 'Untitled')}</div><div class="m">${fmtDate(q.date)} · ${q.qty} candles · ${inr(q.total, 0)}</div></div><div class="row"><button class="ghost" type="button" data-load="${esc(q.id)}">Load</button><button class="x" type="button" data-rm="${esc(q.id)}" aria-label="Delete quote">×</button></div></div>`).join('') : '<div class="empty">No saved quotes yet.</div>'; };
  drawLines(); draw(); drawSaved();
  $('#cCust').oninput = e => { st.customer = e.target.value; lsSet('mad.calcDraft', st); };
  $('#cBasis').onchange = e => { st.basis = e.target.value; draw(); };
  $('#cSupply').onchange = e => { st.supply = e.target.value; draw(); };
  $('#cLines').addEventListener('input', e => { const tr = e.target.closest('tr[data-i]'); if (!tr || !e.target.dataset.f) return; st.lines[+tr.dataset.i][e.target.dataset.f] = e.target.value; draw(); });
  $('#cLines').addEventListener('click', e => { const b = e.target.closest('[data-del]'); if (!b) return; st.lines.splice(+b.dataset.del, 1); drawLines(); draw(); });
  $('#cAdd').onclick = () => { const t = s.tins.find(x => x.size === 'M') || s.tins[0]; st.lines.push({ tin: t.id, pack: s.packs[0].id, scent: s.scents[0], qty: 10, ovr: '' }); drawLines(); draw(); };
  $('#cClear').onclick = () => { st.lines = []; st.customer = ''; $('#cCust').value = ''; drawLines(); draw(); };
  $('#cSave').onclick = () => { const o = orderCalc(s, st.lines, st.basis), g = gstSplit(s, o.sub, st.supply), id = uid('q');
    store.put(id, 'quote', { id, customer: st.customer, basis: st.basis, supply: st.supply, lines: clone(st.lines), qty: o.qty, total: g.total, cost: Math.round(o.cost), date: today(), savedAt: new Date().toISOString() }); drawSaved(); toast('Quote saved'); };
  $('#cSaved').addEventListener('click', e => { const ld = e.target.closest('[data-load]'), rm = e.target.closest('[data-rm]');
    if (ld) { const q = store.get(ld.dataset.load); if (!q) return; Object.assign(st, { customer: q.customer, basis: q.basis, supply: q.supply, lines: clone(q.lines) }); render(); toast('Loaded ' + (q.customer || 'quote')); }
    if (rm) { store.remove(rm.dataset.rm); drawSaved(); toast('Quote deleted'); } });
  const toDoc = type => { const lines = st.lines.filter(l => +l.qty > 0).map(l => ({ desc: `${l.scent} — ${tinOf(s, l.tin).name}, ${packOf(s, l.pack).name}`, hsn: s.business.hsn, qty: +l.qty, rate: linePrice(s, l, st.basis), scent: l.scent, tin: l.tin }));
    const id = newDoc(type, { customer: { name: st.customer, address: '', gstin: '', contact: '' }, supply: st.supply, lines }); location.hash = '#/doc/' + id; };
  $('#cDoc').onclick = () => toDoc('quotation'); $('#cInv').onclick = () => toDoc('invoice');
  $('#cCopy').onclick = () => { const o = orderCalc(s, st.lines, st.basis), g = gstSplit(s, o.sub, st.supply);
    const txt = [`MAD · Quotation${st.customer ? ' for ' + st.customer : ''}`, fmtDate(today()), '', ...st.lines.filter(l => +l.qty > 0).map(l => { const p = linePrice(s, l, st.basis); return `• ${l.scent} — ${tinOf(s, l.tin).name}, ${packOf(s, l.pack).name}: ${l.qty} × ${inr(p, 0)} = ${inr(p * l.qty, 0)}`; }), '',
      `Taxable value: ${inr(o.sub)}`, st.supply === 'in' ? `CGST + SGST ${s.set.gst}%: ${inr(g.gst)}` : `IGST ${s.set.gst}%: ${inr(g.gst)}`, `Total: ${inr(g.total, 0)}`, '', 'Hand-poured soy candles · Prices valid 15 days', 'WhatsApp ' + s.business.phone].join('\n');
    const box = $('#cCopyBox'); const fb = () => { box.hidden = false; box.value = txt; box.select(); toast('Select the text and copy it'); };
    if (navigator.clipboard) navigator.clipboard.writeText(txt).then(() => toast('Copied — paste into WhatsApp'), fb); else fb(); };
}

/* ---------------- Invoices & quotations ---------------- */
function nextNumber(type, date) {
  const fy = fyLabel(date), pre = type === 'invoice' ? `MAD/${fy}/` : `MAD/Q/${fy}/`;
  const nums = store.list('doc').filter(d => d.type === type && (d.number || '').startsWith(pre)).map(d => parseInt(d.number.slice(pre.length), 10) || 0);
  return pre + String((nums.length ? Math.max(...nums) : 0) + 1).padStart(3, '0');
}
function newDoc(type, init = {}) {
  const s = S(), date = today(), id = uid(type === 'invoice' ? 'inv' : 'quo');
  const d = Object.assign({ id, type, number: nextNumber(type, date), date, due: addDays(date, type === 'invoice' ? s.business.dueDays : s.business.validDays), status: 'Draft',
    customer: { name: '', address: '', gstin: '', contact: '' }, supply: 'in', lines: [], terms: type === 'invoice' ? s.business.invTerms : s.business.quoteTerms }, init);
  if (!d.lines.length) d.lines = [{ desc: '', hsn: s.business.hsn, qty: 1, rate: 0 }];
  store.put(id, 'doc', d); return id;
}
function docTotals(s, d) { const sub = d.lines.reduce((a, l) => a + (+l.qty || 0) * (+l.rate || 0), 0); const g = gstSplit(s, sub, d.supply); const raw = sub + g.gst; return Object.assign({ sub, round: g.total - raw }, g); }
function viewDocs(v) {
  const docs = store.list('doc').sort((a, b) => (b.date + b.number).localeCompare(a.date + a.number)), s = S();
  const statusCls = st => ({ Paid: 'ok', Sent: 'goldc', Accepted: 'ok', Draft: '' }[st] || '');
  v.innerHTML = `<div class="wrap"><div class="head"><div><span class="eyebrow">Billing · ${esc(s.business.company)}</span><h1>Invoices &amp; quotations</h1></div>
    <div class="row"><button id="nInv" type="button">New invoice</button><button id="nQuo" class="ghost" type="button">New quotation</button></div></div>
    <div class="list">${docs.length ? docs.map(d => { const t = docTotals(s, d); return `<a class="item" href="#/doc/${encodeURIComponent(d.id)}"><div><div class="t">${esc(d.number)} · ${esc(d.customer.name || 'No customer')}</div><div class="m">${d.type === 'invoice' ? 'Invoice' : 'Quotation'} · ${fmtDate(d.date)}</div></div><div class="row"><span class="num">${inr(t.total, 0)}</span><span class="pill ${statusCls(d.status)}">${esc(d.status)}</span></div></a>`; }).join('') : '<div class="empty">No invoices or quotations yet. Start one here or from the calculator.</div>'}</div></div>`;
  $('#nInv').onclick = () => location.hash = '#/doc/' + newDoc('invoice');
  $('#nQuo').onclick = () => location.hash = '#/doc/' + newDoc('quotation');
}
function viewDoc(v, id) {
  const s = S(), d0 = store.get(id); if (!d0) { v.innerHTML = '<div class="wrap"><div class="empty">Document not found. <a href="#/docs">Back to list</a></div></div>'; return; }
  const d = clone(d0), isInv = d.type === 'invoice';
  const statuses = isInv ? ['Draft', 'Sent', 'Paid'] : ['Draft', 'Sent', 'Accepted', 'Declined'];
  v.innerHTML = `<div class="wrap"><div class="head"><div><span class="eyebrow"><a href="#/docs" class="goldc">← All documents</a></span><h1>${isInv ? 'Tax invoice' : 'Quotation'} ${esc(d.number)}</h1></div>
    <div class="row"><a class="btn" href="#/print/${encodeURIComponent(id)}">Print / PDF</a>${isInv ? '' : '<button id="dConv" class="ghost" type="button">Convert to invoice</button>'}<button id="dDel" class="danger" type="button">Delete</button></div></div>
    <div class="grid2"><section>
      <div class="fields">
        <label>Number<input id="dNum" value="${esc(d.number)}"></label>
        <label>Date<input id="dDate" type="date" value="${esc(d.date)}"></label>
        <label>${isInv ? 'Due date' : 'Valid until'}<input id="dDue" type="date" value="${esc(d.due)}"></label>
        <label>Status<select id="dStatus">${opt(statuses.map(x => ({ v: x, t: x })), d.status)}</select></label>
        <label>Supply<select id="dSupply">${opt([{ v: 'in', t: 'Within Karnataka' }, { v: 'out', t: 'Outside Karnataka' }], d.supply)}</select></label>
      </div>
      <h2>${isInv ? 'Bill to' : 'Quoted to'}</h2>
      <div class="fields">
        <label>Customer name<input id="dCn" value="${esc(d.customer.name)}"></label>
        <label>GSTIN<input id="dCg" value="${esc(d.customer.gstin)}" placeholder="If registered"></label>
        <label>Contact<input id="dCc" value="${esc(d.customer.contact)}" placeholder="Name · phone"></label>
        <label style="grid-column:1/-1">Address<textarea id="dCa">${esc(d.customer.address)}</textarea></label>
      </div>
      <h2>Items</h2>
      <div class="scroll"><table class="lines"><thead><tr><th>Description</th><th>HSN</th><th class="num">Qty</th><th class="num">Rate ₹</th><th class="num">Amount</th><th></th></tr></thead><tbody id="dLines"></tbody></table></div>
      <div class="row"><button id="dAdd" class="ghost" type="button">Add item</button></div>
      <label>Terms<textarea id="dTerms" rows="4">${esc(d.terms)}</textarea></label>
    </section><section><div class="card"><h2>Totals</h2><div class="totals" id="dTot"></div><div class="note" id="dWords"></div></div>${isInv ? '<div class="card"><h2>Stock</h2><div class="row" id="dStock"></div></div>' : ''}</section></div></div>`;
  const drawLines = () => { $('#dLines').innerHTML = d.lines.map((l, i) => `<tr data-i="${i}"><td data-l="Description" class="wide"><input data-f="desc" value="${esc(l.desc)}" aria-label="Description" style="min-width:220px"></td><td data-l="HSN"><input data-f="hsn" value="${esc(l.hsn)}" aria-label="HSN" style="width:80px"></td>
    <td class="num q" data-l="Qty"><input data-f="qty" type="number" inputmode="numeric" value="${esc(l.qty)}" aria-label="Quantity"></td><td class="num p" data-l="Rate ₹"><input data-f="rate" type="number" inputmode="decimal" value="${esc(l.rate)}" aria-label="Rate"></td><td class="num" data-amt data-l="Amount"></td><td><button class="x" type="button" data-del="${i}" aria-label="Remove item">×</button></td></tr>`).join(''); };
  let saveT; const save = () => { clearTimeout(saveT); saveT = setTimeout(() => store.put(id, 'doc', clone(d)), 400); };
  const draw = () => { $$('#dLines tr').forEach(tr => { const l = d.lines[+tr.dataset.i]; tr.querySelector('[data-amt]').textContent = inr((+l.qty || 0) * (+l.rate || 0), 0); });
    const t = docTotals(s, d);
    $('#dTot').innerHTML = `<span class="k">Taxable value</span><span class="v">${inr(t.sub)}</span>` + (d.supply === 'in' ? `<span class="k">CGST @ ${s.set.gst / 2}%</span><span class="v">${inr(t.cgst)}</span><span class="k">SGST @ ${s.set.gst / 2}%</span><span class="v">${inr(t.sgst)}</span>` : `<span class="k">IGST @ ${s.set.gst}%</span><span class="v">${inr(t.igst)}</span>`) +
      `<span class="k">Round off</span><span class="v">${inr(t.round)}</span><span class="k g">Total</span><span class="v g">${inr(t.total, 0)}</span>`;
    $('#dWords').textContent = inWords(t.total); };
  drawLines(); draw();
  const bind = (sel, fn) => { $(sel).addEventListener('input', e => { fn(e.target.value); draw(); save(); }); };
  bind('#dNum', x => d.number = x); bind('#dDate', x => d.date = x); bind('#dDue', x => d.due = x); bind('#dTerms', x => d.terms = x);
  bind('#dCn', x => d.customer.name = x); bind('#dCg', x => d.customer.gstin = x); bind('#dCc', x => d.customer.contact = x); bind('#dCa', x => d.customer.address = x);
  $('#dStatus').onchange = e => { d.status = e.target.value; save(); };
  $('#dSupply').onchange = e => { d.supply = e.target.value; draw(); save(); };
  $('#dLines').addEventListener('input', e => { const tr = e.target.closest('tr'); if (!tr) return; d.lines[+tr.dataset.i][e.target.dataset.f] = e.target.value; draw(); save(); });
  $('#dLines').addEventListener('click', e => { const b = e.target.closest('[data-del]'); if (!b) return; d.lines.splice(+b.dataset.del, 1); drawLines(); draw(); save(); });
  $('#dAdd').onclick = () => { d.lines.push({ desc: '', hsn: s.business.hsn, qty: 1, rate: 0 }); drawLines(); draw(); save(); };
  $('#dDel').onclick = () => { if ($('#dDel').dataset.sure) { store.remove(id); location.hash = '#/docs'; toast('Deleted'); } else { $('#dDel').dataset.sure = '1'; $('#dDel').textContent = 'Tap again to delete'; } };
  const drawStock = () => { const box = $('#dStock'); if (!box) return; const ls = d.lines.filter(l => l.scent && l.tin && +l.qty > 0);
    if (d.stockOut && d.stockOut.length) { box.innerHTML = `<span class="pill ok">Taken out of stock</span><button id="dUnstock" class="ghost" type="button">Undo</button>`;
      $('#dUnstock').onclick = () => { d.stockOut.forEach(m => store.remove(m)); d.stockOut = []; store.put(id, 'doc', clone(d)); drawStock(); toast('Put back into stock'); }; return; }
    if (!ls.length) { box.innerHTML = '<span class="note">Only invoices made from the calculator know the scent and tin of each line. For others, record the stock out on the Stock page.</span>'; return; }
    box.innerHTML = `<button id="dToStock" type="button">Take ${ls.reduce((a, l) => a + (+l.qty || 0), 0)} candles out of stock</button>`;
    $('#dToStock').onclick = () => { d.stockOut = ls.map(l => addMove({ type: 'out', scent: l.scent, tin: l.tin, qty: +l.qty, note: d.number + (d.customer.name ? ' · ' + d.customer.name : ''), ref: id })); store.put(id, 'doc', clone(d)); drawStock(); toast('Taken out of stock'); }; };
  drawStock();
  const conv = $('#dConv'); if (conv) conv.onclick = () => { store.put(id, 'doc', clone(d)); const nid = newDoc('invoice', { customer: clone(d.customer), supply: d.supply, lines: clone(d.lines) }); location.hash = '#/doc/' + nid; };
}
function viewPrint(v, id) {
  const s = S(), d = store.get(id); if (!d) { v.innerHTML = '<div class="empty">Not found.</div>'; return; }
  const t = docTotals(s, d), b = s.business, isInv = d.type === 'invoice', nl = x => esc(x).replace(/\n/g, '<br>');
  const bank = [b.bankAccName && 'Account name: ' + b.bankAccName, b.bankName && 'Bank: ' + b.bankName, b.bankAcc && 'A/c no.: ' + b.bankAcc, b.ifsc && 'IFSC: ' + b.ifsc, b.upi && 'UPI: ' + b.upi].filter(Boolean);
  v.innerHTML = `<div class="wrap"><div class="row noprint"><a class="btn ghost" href="#/doc/${encodeURIComponent(id)}">← Edit</a><button id="pPrint" type="button">Print / Save as PDF</button><span class="note">In the print dialog choose “Save as PDF”, paper A4, margins none.</span></div>
  <div class="paperwrap"><div class="paper"><img class="lh" src="assets/letterhead.png" alt="">
   <div class="pc">
    <div><div class="ttl">${isInv ? 'TAX INVOICE' : 'QUOTATION'}</div></div>
    <div class="two">
      <div><div class="lbl">From</div><b>${esc(b.company)}</b> (${esc(b.brand)} Candles)<br>${nl(b.address)}<br>GSTIN: ${esc(b.gstin)} · State code: ${esc(b.stateCode)}<br>Ph: ${esc(b.phone)} · ${esc(b.email)}</div>
      <div><table class="meta"><tr><td>${isInv ? 'Invoice no.' : 'Quotation no.'}</td><td style="text-align:right"><b>${esc(d.number)}</b></td></tr><tr><td>Date</td><td style="text-align:right">${fmtDate(d.date)}</td></tr><tr><td>${isInv ? 'Due date' : 'Valid until'}</td><td style="text-align:right">${fmtDate(d.due)}</td></tr><tr><td>Place of supply</td><td style="text-align:right">${d.supply === 'in' ? 'Karnataka (29)' : 'Outside Karnataka'}</td></tr></table></div>
    </div>
    <div><div class="lbl">${isInv ? 'Bill to' : 'Quoted to'}</div><b>${esc(d.customer.name)}</b><br>${nl(d.customer.address)}${d.customer.gstin ? '<br>GSTIN: ' + esc(d.customer.gstin) : ''}${d.customer.contact ? '<br>' + esc(d.customer.contact) : ''}</div>
    <table><thead><tr><th style="text-align:left">#</th><th style="text-align:left">Description</th><th>HSN</th><th style="text-align:right">Qty</th><th style="text-align:right">Rate (₹)</th><th style="text-align:right">Amount (₹)</th></tr></thead>
      <tbody>${d.lines.filter(l => l.desc || +l.qty).map((l, i) => `<tr><td>${i + 1}</td><td>${esc(l.desc)}</td><td style="text-align:center">${esc(l.hsn)}</td><td style="text-align:right">${esc(l.qty)}</td><td style="text-align:right">${(+l.rate || 0).toFixed(2)}</td><td style="text-align:right">${((+l.qty || 0) * (+l.rate || 0)).toFixed(2)}</td></tr>`).join('')}</tbody></table>
    <div class="two"><div><div class="lbl">Amount in words</div><i>${inWords(t.total)}</i>${bank.length ? `<div class="lbl" style="margin-top:4mm">Payment details</div>${bank.map(esc).join('<br>')}` : ''}</div>
      <div><table class="tot"><tr><td>Taxable value</td><td style="text-align:right">${inr(t.sub)}</td></tr>${d.supply === 'in' ? `<tr><td>CGST @ ${s.set.gst / 2}%</td><td style="text-align:right">${inr(t.cgst)}</td></tr><tr><td>SGST @ ${s.set.gst / 2}%</td><td style="text-align:right">${inr(t.sgst)}</td></tr>` : `<tr><td>IGST @ ${s.set.gst}%</td><td style="text-align:right">${inr(t.igst)}</td></tr>`}<tr><td>Round off</td><td style="text-align:right">${inr(t.round)}</td></tr><tr><td>TOTAL</td><td style="text-align:right">${inr(t.total, 0)}</td></tr></table></div></div>
    <div class="two" style="margin-top:auto"><div><div class="lbl">Terms</div><div style="font-size:8pt">${nl(d.terms)}</div></div><div style="text-align:right;align-self:end"><b>For ${esc(b.company)}</b><div style="height:14mm"></div><div style="border-top:1px solid #B89A6A;padding-top:1mm;font-size:8pt;color:#8A6A38">Authorised Signatory</div></div></div>
   </div></div></div></div>`;
  $('#pPrint').onclick = () => window.print();
}

/* ---------------- Production ---------------- */
function batchStatus(b) { const done = k => (b.checks?.[k] || []).filter(Boolean).length === SOP[k].length;
  if (done('pack')) return ['Packed', 'ok']; if (b.cureReady && today() >= b.cureReady && done('pour')) return ['Ready to pack', 'goldc']; if (done('pour')) return ['Curing', '']; return ['In progress', 'warnc']; }
function nextBatchNo(date) { const p = 'MAD-' + date.slice(2).replace(/-/g, '') + '-'; const n = store.list('batch').filter(b => (b.number || '').startsWith(p)).length; return p + String(n + 1).padStart(2, '0'); }
function viewBatches(v) {
  const s = S(), bs = store.list('batch').sort((a, b) => (b.date + b.number).localeCompare(a.date + a.number));
  v.innerHTML = `<div class="wrap"><div class="head"><div><span class="eyebrow">Production</span><h1>Batches</h1></div><div class="row"><button id="bNew" type="button">New batch</button></div></div>${subnav('batches')}
   <div class="keynums"><div><span>MELT</span><b>80–85 °C</b></div><div><span>FRAGRANCE</span><b>${s.set.load}% at 80–85 °C</b></div><div><span>POUR</span><b>55–60 °C</b></div><div><span>CURE</span><b>7–14 days</b></div></div>
   <div class="list">${bs.length ? bs.map(b => { const [st, cls] = batchStatus(b); return `<a class="item" href="#/batch/${encodeURIComponent(b.id)}"><div><div class="t">${esc(b.number)} · ${esc(b.scent)}</div><div class="m">${esc(tinOf(s, b.tin).name)} × ${b.count} · poured ${fmtDate(b.date)} · ready ${fmtDate(b.cureReady)}</div></div><div class="row">${b.stockMove ? '<span class="pill ok">In stock</span>' : ''}<span class="pill ${cls}">${st}</span></div></a>`; }).join('') : '<div class="empty">No batches yet. Start one when you pour.</div>'}</div>
   <div class="card"><h2>Troubleshooting</h2><div class="scroll" style="border-top:none"><table><thead><tr><th>Problem</th><th>Likely cause</th><th>Fix</th></tr></thead><tbody>
   ${[['Weak scent', 'Fragrance added too cool or stirred too briefly; short cure', 'Add at 80–85 °C, stir 2 min, cure 10–14 days'], ['Oil beading on top', 'Fragrance not bound in', 'Stir longer; check oil is rated for 10% in soy'], ['Sinkhole near wick', 'Poured too hot, cooled too fast', 'Pour 55–60 °C, warm tins, top up after 4–6 hrs'], ['Wet spots on sides', 'Cold or dirty tin', 'Warm and clean tins; mostly cosmetic'], ['White frosting', 'Natural to soy', 'Pour slightly cooler; heat-gun the top'], ['Tunnelling', 'Wick too small or first burn too short', 'Size wick up; burn 2–3 hrs first time'], ['Big flame or soot', 'Wick too large or untrimmed', 'Size wick down; trim to 5 mm']].map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join('')}
   </tbody></table></div></div></div>`;
  $('#bNew').onclick = () => { const date = today(), t = s.tins.find(x => x.size === 'M') || s.tins[0], id = uid('b'), count = 20, z = s.size[t.size];
    const wax = Math.round(waxOf(s, t) * count * (1 + s.set.waste / 100));
    store.put(id, 'batch', { id, number: nextBatchNo(date), date, scent: s.scents[0], tin: t.id, count, waxG: wax, oilG: Math.round(wax * s.set.load / 100), waxLot: '', addTemp: '', pourTemp: '', cureReady: addDays(date, s.set.cureDays), wick: wickChart(s)[t.id]?.wick || '', notes: '', checks: { prep: [], pour: [], cure: [], pack: [] } });
    location.hash = '#/batch/' + id; };
}
function viewBatch(v, id) {
  const s = S(), b0 = store.get(id); if (!b0) { v.innerHTML = '<div class="wrap"><div class="empty">Batch not found. <a href="#/batches">Back</a></div></div>'; return; }
  const b = clone(b0); b.checks = b.checks || { prep: [], pour: [], cure: [], pack: [] };
  v.innerHTML = `<div class="wrap"><div class="head"><div><span class="eyebrow"><a href="#/batches" class="goldc">← All batches</a></span><h1>Batch ${esc(b.number)}</h1></div><div class="row"><span class="pill" id="bSt"></span><button id="bDel" class="danger" type="button">Delete</button></div></div>
   <div class="fields">
     <label>Batch no.<input id="bNo" value="${esc(b.number)}"></label><label>Pour date<input id="bDate" type="date" value="${esc(b.date)}"></label>
     <label>Scent<select id="bScent">${opt(s.scents.map(x => ({ v: x, t: x })), b.scent)}</select></label>
     <label>Tin<select id="bTin">${opt(s.tins.map(t => ({ v: t.id, t: tinLabel(s, t) })), b.tin)}</select></label>
     <label>Count<input id="bCount" type="number" inputmode="numeric" value="${esc(b.count)}"></label>
     <label>Wax (g, incl. 5%)<input id="bWax" type="number" value="${esc(b.waxG)}"></label><label>Fragrance oil (g)<input id="bOil" type="number" value="${esc(b.oilG)}"></label>
     <label>Wax lot<input id="bLot" value="${esc(b.waxLot)}"></label>
     <label>Fragrance added at (°C)<input id="bAdd" type="number" value="${esc(b.addTemp)}"></label><label>Poured at (°C)<input id="bPour" type="number" value="${esc(b.pourTemp)}"></label>
     <label>Wick used<input id="bWick" value="${esc(b.wick)}" placeholder="e.g. Size 30"></label>
     <label>Cure ready<input id="bReady" type="date" value="${esc(b.cureReady)}"></label>
   </div>
   <span class="note" id="bWickHint"></span>
   <div class="card" id="bBlend" hidden></div>
   <div class="card"><h2>Stock</h2><div class="row" id="bStock"></div></div>
   <div class="fields" style="grid-template-columns:repeat(auto-fill,minmax(260px,1fr))">${Object.keys(SOP).map(k => `<div class="card"><h2>${SOP_TITLES[k]}</h2><div class="checks">${SOP[k].map((t, i) => `<label><input type="checkbox" data-k="${k}" data-i="${i}"${b.checks[k][i] ? ' checked' : ''}><span>${esc(t)}</span></label>`).join('')}</div></div>`).join('')}</div>
   <label>Notes<textarea id="bNotes">${esc(b.notes)}</textarea></label></div>`;
  let saveT; const save = () => { clearTimeout(saveT); saveT = setTimeout(() => store.put(id, 'batch', clone(b)), 400); };
  const status = () => { const [t, c] = batchStatus(b); $('#bSt').textContent = t; $('#bSt').className = 'pill ' + c; };
  const recalc = () => { b.waxG = Math.round(waxOf(s, tinOf(s, b.tin)) * (+b.count || 0) * (1 + s.set.waste / 100)); b.oilG = Math.round(b.waxG * s.set.load / 100); $('#bWax').value = b.waxG; $('#bOil').value = b.oilG; };
  status();
  const f = (sel, key, after) => $(sel).addEventListener('input', e => { b[key] = e.target.value; if (after) after(); save(); status(); });
  f('#bNo', 'number'); f('#bDate', 'date', () => { b.cureReady = addDays(b.date, s.set.cureDays); $('#bReady').value = b.cureReady; }); f('#bScent', 'scent'); f('#bTin', 'tin', recalc); f('#bCount', 'count', recalc);
  f('#bWax', 'waxG'); f('#bOil', 'oilG'); f('#bLot', 'waxLot'); f('#bAdd', 'addTemp'); f('#bPour', 'pourTemp'); f('#bReady', 'cureReady'); f('#bNotes', 'notes'); f('#bWick', 'wick');
  const extras = () => { const ch = wickChart(s)[b.tin]; $('#bWickHint').textContent = ch ? `Wick chart for this tin: ${ch.wick} (passed ${fmtDate(ch.date)}).` + (b.wick && b.wick !== ch.wick ? ' This batch uses a different wick.' : '') : 'No passed wick test for this tin yet (Production → Wick tests).';
    const r = recipeFor(b.scent), bl = $('#bBlend'); bl.hidden = !r; if (r) bl.innerHTML = `<h2>Blend for this batch · ${esc(r.name)}</h2>${blendTable(r, +b.oilG || 0)}<span class="note">Scaled to ${esc(b.oilG)} g of oil (about 1 ml per g). <a href="#/recipe/${encodeURIComponent(r.id)}">Open recipe</a></span>`;
    const mv = b.stockMove && store.get(b.stockMove); $('#bStock').innerHTML = mv ? `<span class="pill ok">Added ${mv.qty} to stock on ${fmtDate(mv.date)}</span><button id="bUnstock" class="ghost" type="button">Undo</button>` : `<button id="bToStock" type="button">Add ${esc(b.count)} to stock</button><span class="note">Do this once the batch is cured and packed.</span>`;
    const ts = $('#bToStock'), us = $('#bUnstock');
    if (ts) ts.onclick = () => { if (!(+b.count > 0)) { toast('Enter the count first'); return; } b.stockMove = addMove({ type: 'in', scent: b.scent, tin: b.tin, qty: +b.count, note: 'Batch ' + b.number, ref: id }); store.put(id, 'batch', clone(b)); extras(); toast('Added to stock'); };
    if (us) us.onclick = () => { store.remove(b.stockMove); b.stockMove = ''; store.put(id, 'batch', clone(b)); extras(); toast('Removed from stock'); }; };
  extras(); v.addEventListener('input', () => setTimeout(extras, 0));
  v.addEventListener('change', e => { const c = e.target; if (c.type !== 'checkbox' || !c.dataset.k) return; b.checks[c.dataset.k][+c.dataset.i] = c.checked; save(); status(); });
  $('#bDel').onclick = () => { if ($('#bDel').dataset.sure) { store.remove(id); location.hash = '#/batches'; } else { $('#bDel').dataset.sure = 1; $('#bDel').textContent = 'Tap again to delete'; } };
}

/* ---------------- Production sub-pages: shared bits ---------------- */
const subnav = on => `<div class="subnav" role="navigation" aria-label="Production">${[['produce', 'Ready to produce'], ['batches', 'Batches'], ['recipes', 'Recipes'], ['tests', 'Wick tests']].map(([k, t]) => `<a href="#/${k}"${k === on ? ' class="on"' : ''}>${t}</a>`).join('')}</div>`;
const delBtn = (btn, fn) => { btn.onclick = () => { if (btn.dataset.sure) fn(); else { btn.dataset.sure = 1; btn.textContent = 'Tap again to delete'; } }; };

/* ---------------- Stock ---------------- */
const MOVE_TYPES = { in: 'Stock in', out: 'Stock out (sold / sent)', adj: 'Adjust (+ or −)' };
const moveQty = m => m.type === 'out' ? -Math.abs(+m.qty || 0) : m.type === 'in' ? Math.abs(+m.qty || 0) : (+m.qty || 0);
function stockMap() { const m = {}; store.list('move').forEach(x => { const k = x.scent + '|' + x.tin; m[k] = (m[k] || 0) + moveQty(x); }); return m; }
function addMove(data) { const id = uid('mv'); store.put(id, 'move', Object.assign({ id, date: today(), note: '', ref: '' }, data)); return id; }
function viewStock(v) {
  const s = S(), low = +s.set.lowStock || 0, m = stockMap(), moves = store.list('move').sort((a, b) => (b.date + b.id).localeCompare(a.date + a.id));
  const tins = s.tins.filter(t => moves.some(x => x.tin === t.id)), scents = [...new Set([...s.scents, ...moves.map(x => x.scent)])].filter(sc => moves.some(x => x.scent === sc));
  const total = Object.values(m).reduce((a, b) => a + b, 0), lowCount = Object.values(m).filter(q => q > 0 && q <= low).length;
  const month = today().slice(0, 7), outMonth = moves.filter(x => x.type === 'out' && (x.date || '').startsWith(month)).reduce((a, x) => a + Math.abs(+x.qty || 0), 0);
  v.innerHTML = `<div class="wrap"><div class="head"><div><span class="eyebrow">Inventory</span><h1>Stock</h1></div><span class="sub">Finished candles ready to sell, by scent and tin.</span></div>
   <div class="keynums"><div><span>IN STOCK</span><b>${total}</b></div><div><span>SCENTS</span><b>${scents.filter(sc => s.tins.some(t => (m[sc + '|' + t.id] || 0) > 0)).length}</b></div><div><span>LOW (≤ ${low})</span><b class="${lowCount ? 'warnc' : ''}">${lowCount}</b></div><div><span>OUT THIS MONTH</span><b>${outMonth}</b></div></div>
   <div class="grid2"><section>
     <h2>On hand</h2>
     ${tins.length ? `<div class="scroll"><table><thead><tr><th>Scent</th>${tins.map(t => `<th class="num">${esc(t.name)}</th>`).join('')}<th class="num">Total</th></tr></thead><tbody>
       ${scents.map(sc => { const row = tins.map(t => m[sc + '|' + t.id] || 0); return `<tr><td>${esc(sc)}</td>${row.map(q => `<td class="num ${q < 0 ? 'warnc' : q > 0 && q <= low ? 'warnc' : ''}">${q || '–'}</td>`).join('')}<td class="num"><b>${row.reduce((a, b) => a + b, 0)}</b></td></tr>`; }).join('')}
       </tbody></table></div><span class="note">Orange numbers are at or below the low-stock alert (${low}), or below zero. Change the alert level in Settings → Recipe &amp; pricing.</span>` : '<div class="empty">Nothing in stock yet. Add candles from a finished batch (Production → batch → “Add to stock”) or record stock in here.</div>'}
     <h2 style="margin-top:12px">History</h2>
     <div class="list" id="kHist">${moves.length ? moves.slice(0, 80).map(x => { const q = moveQty(x); return `<div class="item" style="flex-wrap:nowrap"><div><div class="t"><span class="${q < 0 ? 'warnc' : 'ok'}">${q > 0 ? '+' : ''}${q}</span> · ${esc(x.scent)} · ${esc(tinOf(s, x.tin).name)}</div><div class="m">${fmtDate(x.date)} · ${esc(MOVE_TYPES[x.type] || x.type)}${x.note ? ' · ' + esc(x.note) : ''}</div></div><button class="x" type="button" data-rm="${esc(x.id)}" aria-label="Delete entry">×</button></div>`; }).join('') : '<div class="empty">No entries yet.</div>'}</div>
   </section><section><div class="card"><h2>Record stock</h2>
     <div class="fields" style="grid-template-columns:repeat(auto-fill,minmax(150px,1fr))">
       <label>Type<select id="kType">${opt(Object.entries(MOVE_TYPES).map(([k, t]) => ({ v: k, t })), 'in')}</select></label>
       <label>Date<input id="kDate" type="date" value="${today()}"></label>
       <label>Scent<select id="kScent">${opt(s.scents.map(x => ({ v: x, t: x })), s.scents[0])}</select></label>
       <label>Tin<select id="kTin">${opt(s.tins.map(t => ({ v: t.id, t: t.name })), s.tins[0].id)}</select></label>
       <label>Quantity<input id="kQty" type="number" inputmode="numeric" value="10"></label>
       <label>Note<input id="kNote" placeholder="e.g. Astro Aura order, damaged"></label>
     </div><div class="row"><button id="kSave" type="button">Save</button><span class="note" id="kHint">Adds to stock.</span></div></div>
     <div class="card"><h2>How stock moves</h2><div class="note" style="font-size:13px">• <b>In:</b> open a finished batch and tap “Add to stock”.<br>• <b>Out:</b> open an invoice made from the calculator and tap “Take out of stock”.<br>• Anything else (samples, damaged, a recount): record it here. For Adjust, type a minus number to reduce.</div></div>
   </section></div></div>`;
  const hint = { in: 'Adds to stock.', out: 'Takes out of stock.', adj: 'Type −3 to remove 3, or 3 to add 3.' };
  $('#kType').onchange = e => $('#kHint').textContent = hint[e.target.value];
  $('#kSave').onclick = () => { const q = +$('#kQty').value; if (!q) { toast('Enter a quantity'); return; }
    addMove({ type: $('#kType').value, date: $('#kDate').value || today(), scent: $('#kScent').value, tin: $('#kTin').value, qty: q, note: $('#kNote').value.trim() }); toast('Saved'); render(); };
  $('#kHist').addEventListener('click', e => { const b = e.target.closest('[data-rm]'); if (!b) return; if (b.dataset.sure) { store.remove(b.dataset.rm); render(); } else { b.dataset.sure = 1; b.textContent = 'Delete?'; b.style.fontSize = '13px'; } });
}

/* ---------------- Recipes (fragrance blends) ---------------- */
const RECIPE_GROUPS = ['For her', 'For him', 'Astro Aura', 'Single scent', 'Other'];
const DEF_RECIPES = [
  ['r-tobacco-honey', 'TOBACCO HONEY', 'Single scent', 'Tobacco Honey oil on its own', [['Tobacco Honey', 10]]],
  ['r-soft-riot', 'SOFT RIOT', 'For her', 'Berry jam and lavender, soft earthy base', [['Berry Muse', 3], ['Lavender', 2], ['Lemon Citrus', 1.5], ['Sandalwood', 1.5], ['Sweet Patchouli', 1], ['Vanilla', 1]]],
  ['r-sunday-crush', 'SUNDAY CRUSH', 'For her', 'Orange cream latte, warm spice', [['Orange', 3], ['Sandalwood', 2], ['Vanilla', 2], ['Coffee', 1.5], ['Lemon Citrus', 1.2], ['Cinnamon Bark EO', 0.3]]],
  ['r-open-window', 'OPEN WINDOW', 'For her', 'Fresh air, clean laundry and lavender', [['Cool Water', 3], ['Lavender', 2.5], ['Sandalwood', 1.5], ['Lemon Citrus', 1], ['Rosemary Sage', 1], ['Vanilla', 1]]],
  ['r-ember-room', 'EMBER ROOM', 'For him', 'Tobacco and honey in a wood-panelled study', [['Tobacco Honey', 3], ['American Mahogany', 2], ['Indian Cedarwood EO', 2], ['OUD O.S.F.O', 1], ['Sweet Patchouli', 1], ['Orange', 1]]],
  ['r-wild-ground', 'WILD GROUND', 'For him', 'Herbs, cedar and incense, forest after rain', [['Rosemary Sage', 3], ['Indian Cedarwood EO', 2], ['Lemongrass', 1.5], ['Frankincense EO', 1.5], ['Lemon Citrus', 1], ['Sweet Patchouli', 1]]],
  ['r-black-ledger', 'BLACK LEDGER', 'For him', 'Dark roast, oud and smoky wood', [['Roasted Coffee', 3], ['OUD O.S.F.O', 2], ['American Mahogany', 2], ['Sandalwood', 1.5], ['Frankincense EO', 1.2], ['Cinnamon Bark EO', 0.3]]],
  ['r-kayal', 'KAYAL', 'Astro Aura', 'Calm lavender and incense, lifted by orange, soft vanilla base', [['Lavender', 2.5], ['Frankincense EO', 2], ['Orange', 2], ['Vanilla', 1.5], ['Sweet Patchouli', 1], ['Lemon Citrus', 1]]],
  ['r-temple-door', 'TEMPLE DOOR', 'Astro Aura', 'Oud and temple woods with a green lemongrass top and a warm spice edge', [['American Mahogany', 2.5], ['OUD O.S.F.O', 2], ['Indian Cedarwood EO', 2], ['Lemongrass', 1.5], ['Frankincense EO', 1], ['Orange', 0.7], ['Cinnamon Bark EO', 0.3]]]
];
// Starter recipes live on each device with an old timestamp and are not queued for sync,
// so any edit or delete made on another device always wins over them.
function seedRecipes() { let n = 0; DEF_RECIPES.forEach(([id, name, group, note, parts]) => { if (store.recs.has(id)) return; n++;
  store.recs.set(id, { id, kind: 'recipe', data: { id, name, group, note, parts: parts.map(([oil, ml]) => ({ oil, ml })) }, updated_at: '2026-11-01T00:00:00.000Z', deleted: false }); }); if (n) store.persist(); }
const recipeFor = scent => store.list('recipe').find(r => (r.name || '').trim().toLowerCase() === (scent || '').trim().toLowerCase());
const partsTotal = r => (r.parts || []).reduce((a, p) => a + (+p.ml || 0), 0);
const fmtMl = n => (Math.round(n * 10) / 10).toLocaleString('en-IN');
function blendTable(r, oilMl) { const tot = partsTotal(r) || 1;
  return `<div class="scroll"><table><thead><tr><th>Oil</th><th class="num">Per 10 ml</th><th class="num">This batch</th></tr></thead><tbody>${(r.parts || []).map(p => `<tr><td>${esc(p.oil)}</td><td class="num">${fmtMl(+p.ml || 0)} ml</td><td class="num"><b>${fmtMl((+p.ml || 0) / tot * oilMl)} ml</b></td></tr>`).join('')}<tr><td><b>Total</b></td><td class="num">${fmtMl(tot)} ml</td><td class="num"><b>${fmtMl(oilMl)} ml</b></td></tr></tbody></table></div>`; }
function viewRecipes(v) {
  const s = S(), rs = store.list('recipe');
  v.innerHTML = `<div class="wrap"><div class="head"><div><span class="eyebrow">Production</span><h1>Blend recipes</h1></div><div class="row"><button id="rAll" class="ghost" type="button"${rs.every(r => s.scents.includes(r.name)) ? ' hidden' : ''}>Add all to scent list</button><button id="rNew" type="button">New recipe</button></div></div>${subnav('recipes')}
   <span class="sub">Each recipe is per 10 ml of oil for 100 g of wax (${s.set.load}% load). Open one to scale it to a batch.</span>
   ${RECIPE_GROUPS.map(g => { const list = rs.filter(r => (r.group || 'Other') === g).sort((a, b) => a.name.localeCompare(b.name)); return list.length ? `<section><h2>${esc(g)}</h2><div class="list">${list.map(r => { const t = partsTotal(r); return `<a class="item" href="#/recipe/${encodeURIComponent(r.id)}"><div><div class="t">${esc(r.name)}</div><div class="m">${esc(r.note || '')}${r.note ? ' · ' : ''}${(r.parts || []).length} oils</div></div><div class="row">${Math.abs(t - 10) > 0.05 ? `<span class="pill warnc">${fmtMl(t)} ml</span>` : ''}${s.scents.includes(r.name) ? '' : '<span class="pill">Not in scent list</span>'}</div></a>`; }).join('')}</div></section>` : ''; }).join('') || '<div class="empty">No recipes yet.</div>'}
   </div>`;
  $('#rAll').onclick = () => { const add = rs.map(r => r.name.trim()).filter(n => n && !s.scents.includes(n)); s.scents.push(...add); saveSettings(s); toast(`Added ${add.length} to the scent list`); render(); };
  $('#rNew').onclick = () => { const id = uid('r'); store.put(id, 'recipe', { id, name: 'NEW BLEND', group: 'Other', note: '', parts: [{ oil: '', ml: 10 }] }); location.hash = '#/recipe/' + id; };
}
function viewRecipe(v, id) {
  const s = S(), r0 = store.get(id); if (!r0) { v.innerHTML = '<div class="wrap"><div class="empty">Recipe not found. <a href="#/recipes">Back</a></div></div>'; return; }
  const r = clone(r0), calc = { tin: (s.tins.find(t => t.size === 'M') || s.tins[0]).id, count: 20 };
  v.innerHTML = `<div class="wrap"><div class="head"><div><span class="eyebrow"><a href="#/recipes" class="goldc">← All recipes</a></span><h1 id="rTitle">${esc(r.name)}</h1></div><div class="row"><button id="rScent" class="ghost" type="button" hidden>Add to scent list</button><button id="rDel" class="danger" type="button">Delete</button></div></div>
   <div class="grid2"><section>
     <div class="fields"><label>Name<input id="rName" value="${esc(r.name)}"></label><label>Group<select id="rGroup">${opt(RECIPE_GROUPS.map(x => ({ v: x, t: x })), r.group || 'Other')}</select></label><label style="grid-column:1/-1">Character<input id="rNote" value="${esc(r.note)}" placeholder="One line on how it smells"></label></div>
     <h2>Oils · per 10 ml</h2>
     <div class="scroll"><table><thead><tr><th>Oil</th><th class="num">ml</th><th></th></tr></thead><tbody id="rParts"></tbody></table></div>
     <div class="row"><button id="rAdd" class="ghost" type="button">Add oil</button><span class="note" id="rTot"></span></div>
   </section><section><div class="card"><h2>Scale to a batch</h2>
     <div class="fields" style="grid-template-columns:repeat(auto-fill,minmax(140px,1fr))"><label>Tin<select id="rTin">${opt(s.tins.map(t => ({ v: t.id, t: tinLabel(s, t) })), calc.tin)}</select></label><label>Candles<input id="rCount" type="number" inputmode="numeric" value="${calc.count}"></label><label>Wax (g, incl. ${s.set.waste}%)<input id="rWax" type="number" inputmode="numeric"></label></div>
     <div id="rOut"></div><span class="note">Fragrance = ${s.set.load}% of wax: 10 ml of blend per 100 g wax. Weigh it on the scale as grams if you prefer; most oils are close to 1 g per ml. Cinnamon Bark EO: never above 0.3 ml per 10 ml, wear gloves.</span></div></section></div></div>`;
  let saveT; const save = () => { clearTimeout(saveT); saveT = setTimeout(() => store.put(id, 'recipe', clone(r)), 400); };
  const drawParts = () => { $('#rParts').innerHTML = r.parts.map((p, i) => `<tr data-i="${i}"><td><input data-f="oil" value="${esc(p.oil)}" aria-label="Oil" style="min-width:160px"></td><td class="num"><input data-f="ml" type="number" step="0.1" inputmode="decimal" value="${esc(p.ml)}" style="width:80px" aria-label="ml"></td><td><button class="x" type="button" data-del="${i}" aria-label="Remove oil">×</button></td></tr>`).join(''); };
  const waxNow = () => Math.round(waxOf(s, tinOf(s, calc.tin)) * (+calc.count || 0) * (1 + s.set.waste / 100));
  const draw = () => { const t = partsTotal(r); $('#rTot').innerHTML = `Total ${fmtMl(t)} ml ${Math.abs(t - 10) > 0.05 ? '<span class="warnc">— should add up to 10 ml</span>' : '<span class="ok">✓</span>'}`;
    const wax = +$('#rWax').value || 0; $('#rOut').innerHTML = blendTable(r, wax * s.set.load / 100); $('#rTitle').textContent = r.name;
    $('#rScent').hidden = s.scents.includes(r.name.trim()) || !r.name.trim(); };
  drawParts(); $('#rWax').value = waxNow(); draw();
  $('#rName').oninput = e => { r.name = e.target.value.toUpperCase(); draw(); save(); };
  $('#rName').onblur = e => { e.target.value = r.name; };
  $('#rGroup').onchange = e => { r.group = e.target.value; save(); };
  $('#rNote').oninput = e => { r.note = e.target.value; save(); };
  $('#rParts').addEventListener('input', e => { const tr = e.target.closest('tr'); if (!tr) return; const f = e.target.dataset.f; r.parts[+tr.dataset.i][f] = f === 'ml' ? (parseFloat(e.target.value) || 0) : e.target.value; draw(); save(); });
  $('#rParts').addEventListener('click', e => { const b = e.target.closest('[data-del]'); if (!b) return; r.parts.splice(+b.dataset.del, 1); drawParts(); draw(); save(); });
  $('#rAdd').onclick = () => { r.parts.push({ oil: '', ml: 0 }); drawParts(); draw(); save(); };
  $('#rTin').onchange = e => { calc.tin = e.target.value; $('#rWax').value = waxNow(); draw(); };
  $('#rCount').oninput = e => { calc.count = e.target.value; $('#rWax').value = waxNow(); draw(); };
  $('#rWax').oninput = draw;
  $('#rScent').onclick = () => { const s2 = S(); if (!s2.scents.includes(r.name.trim())) { s2.scents.push(r.name.trim()); saveSettings(s2); s.scents = s2.scents; } draw(); toast('Added to the scent list'); };
  delBtn($('#rDel'), () => { store.remove(id); location.hash = '#/recipes'; toast('Recipe deleted'); });
}

/* ---------------- Wick & test-burn log ---------------- */
const POOL = { full: 'Full to the edge', nearly: 'Nearly full (under 5 mm left)', tunnel: 'Tunnelling', '': '—' };
const FLAME = { steady: 'Steady', big: 'Too big / flickers', small: 'Too small / drowning', soot: 'Smoking / soot', '': '—' };
const RESULT = { testing: ['Testing', 'warnc'], pass: ['Pass', 'ok'], fail: ['Fail', ''] };
function wickChart(s) { const out = {}; store.list('burn').filter(b => b.result === 'pass').sort((a, b) => (a.date || '').localeCompare(b.date || '')).forEach(b => { out[b.tin] = b; }); return out; }
function viewTests(v) {
  const s = S(), ts = store.list('burn').sort((a, b) => (b.date + b.id).localeCompare(a.date + a.id)), chart = wickChart(s);
  v.innerHTML = `<div class="wrap"><div class="head"><div><span class="eyebrow">Production</span><h1>Wick &amp; test burns</h1></div><div class="row"><button id="tNew" type="button">New test burn</button></div></div>${subnav('tests')}
   <div class="card"><h2>Wick chart · latest passed test per tin</h2><div class="scroll" style="border-top:none"><table><thead><tr><th>Tin</th><th>Wick</th><th>Scent tested</th><th class="num">Burn</th><th>Passed</th></tr></thead><tbody>
     ${s.tins.map(t => { const b = chart[t.id]; return `<tr><td style="white-space:nowrap">${esc(tinLabel(s, t))}</td>${b ? `<td><b>${esc(b.wick)}</b></td><td>${esc(b.scent)}</td><td class="num">${b.totalHrs ? esc(b.totalHrs) + ' h' : '–'}</td><td><a href="#/test/${encodeURIComponent(b.id)}">${fmtDate(b.date)}</a></td>` : '<td colspan="4" class="note">Not tested yet</td>'}</tr>`; }).join('')}
   </tbody></table></div><span class="note">New batches pick up this wick automatically. A test only counts here once you mark it Pass.</span></div>
   <div class="list">${ts.length ? ts.map(b => { const [rt, rc] = RESULT[b.result] || RESULT.testing; return `<a class="item" href="#/test/${encodeURIComponent(b.id)}"><div><div class="t">${esc(tinOf(s, b.tin).name)} · ${esc(b.wick || 'wick?')} · ${esc(b.scent)}</div><div class="m">${fmtDate(b.date)}${b.pool ? ' · ' + esc(POOL[b.pool]) : ''}${b.flame ? ' · ' + esc(FLAME[b.flame]) : ''}${b.totalHrs ? ' · ' + esc(b.totalHrs) + ' h total' : ''}</div></div><span class="pill ${rc}">${rt}</span></a>`; }).join('') : '<div class="empty">No test burns yet. Pour one candle per tin and wick size, cure it, then log each burn here.</div>'}</div>
   <div class="card"><h2>How to test a wick</h2><div class="note" style="font-size:13px">1. Pour one candle per tin with the wick you want to try, using your real blend at ${s.set.load}%. Cure 7–14 days.<br>2. First burn: about 1 hour per 2.5 cm of tin width (usually 2–3 hours). The melt pool should reach the edge.<br>3. Check the flame: steady, 1–2 cm tall, no smoke. Tunnelling means size up; a big flame or soot means size down.<br>4. Burn to the end in 3–4 hour sessions and note the total hours. Mark Pass or Fail.</div></div></div>`;
  $('#tNew').onclick = () => { const id = uid('w'), t = s.tins.find(x => x.size === 'M') || s.tins[0];
    store.put(id, 'burn', { id, date: today(), tin: t.id, scent: s.scents[0], wick: chart[t.id]?.wick || '', firstBurnHrs: '', pool: '', flame: '', throwCold: '', throwHot: '', totalHrs: '', result: 'testing', notes: '' }); location.hash = '#/test/' + id; };
}
function viewTest(v, id) {
  const s = S(), b0 = store.get(id); if (!b0) { v.innerHTML = '<div class="wrap"><div class="empty">Test not found. <a href="#/tests">Back</a></div></div>'; return; }
  const b = clone(b0), stars = [{ v: '', t: '—' }, ...[1, 2, 3, 4, 5].map(n => ({ v: String(n), t: '★'.repeat(n) + '☆'.repeat(5 - n) }))];
  v.innerHTML = `<div class="wrap"><div class="head"><div><span class="eyebrow"><a href="#/tests" class="goldc">← All tests</a></span><h1>Test burn</h1></div><div class="row"><span class="pill" id="tSt"></span><button id="tDel" class="danger" type="button">Delete</button></div></div>
   <div class="fields">
     <label>Date poured<input data-k="date" type="date" value="${esc(b.date)}"></label>
     <label>Tin<select data-k="tin">${opt(s.tins.map(t => ({ v: t.id, t: tinLabel(s, t) })), b.tin)}</select></label>
     <label>Scent<select data-k="scent">${opt([...new Set([...s.scents, b.scent])].map(x => ({ v: x, t: x })), b.scent)}</select></label>
     <label>Wick (size / series)<input data-k="wick" value="${esc(b.wick)}" placeholder="e.g. Size 30"></label>
     <label>First burn (hours)<input data-k="firstBurnHrs" type="number" step="0.5" value="${esc(b.firstBurnHrs)}"></label>
     <label>Melt pool after first burn<select data-k="pool">${opt(Object.entries(POOL).map(([v, t]) => ({ v, t })), b.pool)}</select></label>
     <label>Flame<select data-k="flame">${opt(Object.entries(FLAME).map(([v, t]) => ({ v, t })), b.flame)}</select></label>
     <label>Cold throw<select data-k="throwCold">${opt(stars, String(b.throwCold || ''))}</select></label>
     <label>Hot throw<select data-k="throwHot">${opt(stars, String(b.throwHot || ''))}</select></label>
     <label>Total burn time (hours)<input data-k="totalHrs" type="number" step="0.5" value="${esc(b.totalHrs)}"></label>
     <label>Result<select data-k="result">${opt(Object.entries(RESULT).map(([v, [t]]) => ({ v, t })), b.result)}</select></label>
   </div>
   <span class="note" id="tAdvice"></span>
   <label>Notes<textarea data-k="notes" placeholder="Session times, how it looked, what to try next">${esc(b.notes)}</textarea></label></div>`;
  let saveT; const save = () => { clearTimeout(saveT); saveT = setTimeout(() => store.put(id, 'burn', clone(b)), 400); };
  const status = () => { const [t, c] = RESULT[b.result] || RESULT.testing; $('#tSt').textContent = t; $('#tSt').className = 'pill ' + c;
    const tips = []; if (b.pool === 'tunnel') tips.push('Tunnelling: try one wick size up, or a longer first burn.'); if (b.flame === 'big' || b.flame === 'soot') tips.push('Flame too big or sooty: try one wick size down and trim to 5 mm.'); if (b.flame === 'small') tips.push('Flame drowning: try one wick size up.'); if (b.pool === 'full' && b.flame === 'steady') tips.push('Full pool and a steady flame: this wick looks right. Burn to the end, then mark Pass.');
    $('#tAdvice').textContent = tips.join(' '); };
  status();
  v.addEventListener('input', e => { const k = e.target.dataset.k; if (!k) return; b[k] = e.target.value; save(); status(); });
  delBtn($('#tDel'), () => { store.remove(id); location.hash = '#/tests'; toast('Test deleted'); });
}

/* ---------------- Ready to produce (a guided quest, one step per screen) ---------------- */
const STAGES = [['prep', 'Prep the studio'], ['pour', 'Melt & pour'], ['cure', 'Set & cure'], ['pack', 'Finish & pack']];
const RANKS = [[0, 'Apprentice'], [3, 'Maker'], [10, 'Artisan'], [25, 'Master Chandler'], [60, 'Legend of MAD']];
const ICON = {
  room: '<path d="M14 14.8V4a2 2 0 1 0-4 0v10.8a4 4 0 1 0 4 0z"/><path d="M12 9v7"/>',
  list: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/>',
  tin: '<ellipse cx="12" cy="7" rx="7" ry="2.5"/><path d="M5 7v10c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V7"/>',
  wick: '<path d="M12 3v14"/><path d="M8 21h8"/><path d="M6 5h12"/>',
  scale: '<path d="M4 20h16"/><path d="M6 20l2-9h8l2 9"/><path d="M12 11V5M9 5h6"/>',
  drop: '<path d="M12 3c3 4 6 7.5 6 11a6 6 0 0 1-12 0c0-3.5 3-7 6-11z"/>',
  flame: '<path d="M12 3c2.5 3.5 5 5.5 5 9.5a5 5 0 0 1-10 0C7 10 9 9 9.5 6.5 11 8 11.5 9 12 3z"/>',
  addin: '<path d="M12 3v9M8.5 8.5 12 12l3.5-3.5"/><path d="M5 14h14v4a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3z"/>',
  stir: '<path d="M6 13h12v3a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5z"/><path d="M15 4l-3 11"/>',
  cool: '<path d="M14 14.8V4a2 2 0 1 0-4 0v10.8a4 4 0 1 0 4 0z"/><path d="M19 5v6M17 9l2 2 2-2"/>',
  pour: '<path d="M4 6h9l-1 6H6z"/><path d="M13 7l4 2"/><path d="M17 12v3"/><path d="M14 17h8v3a1 1 0 0 1-1 1h-6a1 1 0 0 1-1-1z"/>',
  wait: '<path d="M7 3h10M7 21h10"/><path d="M8 3c0 5 8 5 8 9s-8 4-8 9M16 3c0 5-8 5-8 9s8 4 8 9"/>',
  topup: '<path d="M12 5v8M8 9h8"/><path d="M5 15h14v3a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3z"/>',
  trim: '<circle cx="6" cy="17" r="3"/><circle cx="18" cy="17" r="3"/><path d="M8 15 18 4M16 15 6 4"/>',
  cure: '<rect x="4" y="5" width="16" height="16" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/><path d="m9 15 2 2 4-4"/>',
  label: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.5"/>',
  box: '<path d="M3 8l9-5 9 5v8l-9 5-9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
  star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>'
};
const ico = (k, cls = '') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICON[k] || ICON.star}</svg>`;
function rankOf(done) { let r = RANKS[0], nxt = null; RANKS.forEach((x, i) => { if (done >= x[0]) { r = x; nxt = RANKS[i + 1] || null; } }); return { name: r[1], at: r[0], next: nxt }; }
function makerStats() { const bs = store.list('batch'); const done = bs.filter(b => b.prodDone).length;
  const xp = bs.reduce((a, b) => a + (b.prodDone ? 18 * 10 + 50 : (+b.prodStep || 0) * 10), 0) + bs.filter(b => b.prodDone).reduce((a, b) => a + (+b.count || 0), 0);
  return { done, xp, candles: bs.filter(b => b.prodDone).reduce((a, b) => a + (+b.count || 0), 0), rank: rankOf(done) }; }
function prodPlan(s, b) {
  const t = tinOf(s, b.tin), z = sizeOf(s, t), r = recipeFor(b.scent), n = +b.count || 0;
  const wax = +b.waxG || 0, oil = +b.oilG || 0, wicks = n * (+z.wicks || 1), pack = packOf(s, b.pack || s.packs[0].id);
  const tot = r ? (partsTotal(r) || 1) : 1, oils = r ? r.parts.map(p => `<b>${esc(p.oil)}: ${fmtMl((+p.ml || 0) / tot * oil)} ml</b>`) : [];
  return { t, z, r, n, wax, oil, wicks, pack, oils };
}
function prodSteps(s, b) {
  const P = prodPlan(s, b), tin = esc(P.t.name), wick = b.wick ? esc(b.wick) : 'your tested wick', num = esc(b.number);
  return [
    { g: 'prep', i: 'room', h: 'Get the room ready', hero: '20–27 °C', items: ['<b>Room between 20 and 27 °C</b>', '<b>No fans, no AC blowing, no open windows</b>', 'Table cleared and covered with paper', 'Melter plugged in, thermometer and scale beside it'] },
    { g: 'prep', i: 'list', h: 'Collect everything', items: [`<b>${P.n} × ${tin} tins</b>`, `<b>${P.wicks} wicks</b> · ${wick}${P.z.wicks > 1 ? ` · ${P.z.wicks} per tin` : ''}`, `<b>${P.wax.toLocaleString('en-IN')} g soy wax</b>`, `<b>${P.oil} g fragrance</b> · ${esc(b.scent)}`, 'Wick stickers, wick bars, jug, spatula', `Logo + bottom stickers${P.pack.box ? ', boxes, back stickers' : ''}${P.pack.gift ? ', dust covers, tissue, seals' : ''}`] },
    { g: 'prep', i: 'tin', h: 'Prepare the tins', items: ['<b>Every tin wiped clean and dry</b>', '<b>Tins at room temperature</b> (cold tins make wet spots)', `<b>Batch ${num}</b> written on the record`] },
    { g: 'prep', i: 'wick', h: 'Fix the wicks', items: [`<b>${P.z.wicks > 1 ? P.z.wicks + ' wicks' : 'One wick'} stuck in the centre of each tin</b>`, '<b>Pressed down firmly</b>', '<b>Clipped upright with a wick bar</b>'] },
    { g: 'prep', i: 'scale', h: 'Weigh the wax', hero: `${P.wax.toLocaleString('en-IN')} g`, items: [`<b>Soy wax weighed for ${P.n} candles</b>`, `Includes ${s.set.waste}% extra for top-ups`] },
    { g: 'prep', i: 'drop', h: 'Measure the fragrance', hero: `${P.oil} g`, items: P.oils.length ? [...P.oils, `<b>All blended in one clean cup, labelled ${esc(b.scent)}</b>`] : [`<b>${esc(b.scent)} weighed into a clean, labelled cup</b>`], sub: `${esc(b.scent)} · ${s.set.load}% of the wax` },
    { g: 'pour', i: 'flame', h: 'Melt the wax', hero: '80–85 °C', items: ['<b>Wax fully melted in the electric melter</b>', '<b>Checked with the thermometer</b>', '<b>Never above 90 °C</b>'] },
    { g: 'pour', i: 'addin', h: 'Add the fragrance', hero: 'at 80–85 °C', items: ['<b>Fragrance poured in while the wax is 80–85 °C</b>', 'Too cool and the scent will not bind'] },
    { g: 'pour', i: 'stir', h: 'Stir', hero: '2:00', timer: 120, items: ['<b>Stirred slowly for the full 2 minutes</b>', 'Sides and bottom scraped', 'No air whipped in'] },
    { g: 'pour', i: 'cool', h: 'Cool to pouring heat', hero: '55–60 °C', items: ['<b>Wax cooled to 55–60 °C</b>', 'Too hot means sinkholes and cracks'] },
    { g: 'pour', i: 'pour', h: 'Pour', items: ['<b>Poured slowly, about 1 cm below the rim</b>', '<b>About 10% kept back for top-ups</b>', 'Jug wiped before the next scent'] },
    { g: 'cure', i: 'wait', h: 'Leave it alone', hero: '4–6 hours', timer: 4 * 3600, items: ['<b>Not moved, touched or covered</b>', 'Away from fans and sunlight'] },
    { g: 'cure', i: 'topup', h: 'Top up', hero: '60 °C', items: ['<b>Kept-back wax re-melted to 60 °C</b>', '<b>Sinkholes and dips filled with a thin layer</b>'] },
    { g: 'cure', i: 'trim', h: 'Bars off, wicks trimmed', hero: 'after 24 h', items: ['<b>Wick bars removed</b>', '<b>Every wick trimmed to 5 mm</b>'] },
    { g: 'cure', i: 'cure', h: 'Cure', hero: fmtDate(b.cureReady), sub: 'ready to sell from this date', items: ['<b>Lids on</b>', '<b>Stored out of sunlight at room temperature</b>', `<b>Not sold before ${fmtDate(b.cureReady)}</b>`] },
    { g: 'pack', i: 'label', h: 'Label', items: ['<b>Logo sticker: small, top-left of the tin side</b>', '<b>Bottom sticker on, scent checked</b>', `<b>Batch ${num} on every candle</b>`] },
    { g: 'pack', i: 'box', h: 'Pack', sub: esc(P.pack.name), items: [P.pack.gift ? '<b>Dust cover on, boxed with tissue and a seal</b>' : P.pack.box ? '<b>Boxed, back sticker on</b>' : '<b>Lid on, tin wiped clean</b>', `<b>Counted: ${P.n} candles</b>`] },
    { g: 'pack', i: 'star', h: 'Ready to sell', hero: `${P.n} candles`, items: [], last: true }
  ];
}
function questMap(steps, i) { return `<div class="quest">${STAGES.map(([g, name], si) => { const idx = steps.map((x, k) => x.g === g ? k : -1).filter(k => k >= 0), done = idx.every(k => k < i), cur = idx.includes(i);
  return `<div class="stage${done ? ' done' : ''}${cur ? ' cur' : ''}"><div class="sname"><span>${si + 1}</span>${name}</div><div class="dots">${idx.map(k => `<i class="${k < i ? 'd' : k === i ? 'c' : ''}"></i>`).join('')}</div></div>`; }).join('')}</div>`; }
function candleSvg(p, lit) { const h = Math.round(46 * p); return `<svg class="candle${lit ? ' lit' : ''}" viewBox="0 0 64 96" aria-hidden="true">
  <path class="fl" d="M32 8c4 6 7 9 7 14a7 7 0 0 1-14 0c0-4 3-6 4-9 1 2 2 3 3-5z"/>
  <path class="wk" d="M32 30v10"/><rect class="tn" x="8" y="38" width="48" height="52" rx="5"/>
  <rect class="wx" x="11" y="${87 - h}" width="42" height="${h}" rx="2"/><text x="32" y="70" class="pc">${Math.round(p * 100)}%</text></svg>`; }
function confetti(el) { const c = document.createElement('div'); c.className = 'confetti'; c.innerHTML = Array.from({ length: 60 }, (_, k) => `<i style="left:${Math.random() * 100}%;animation-delay:${Math.random() * .6}s;animation-duration:${1.6 + Math.random() * 1.4}s;transform:rotate(${Math.random() * 360}deg);background:${['#C8A266', '#9C7A45', '#1E1611', '#2C3428', '#EDE3D3'][k % 5]}"></i>`).join(''); el.appendChild(c); setTimeout(() => c.remove(), 3500); }
const buzz = n => { try { navigator.vibrate && navigator.vibrate(n); } catch { } };
const fmtT = x => { x = Math.max(0, Math.round(x)); const h = Math.floor(x / 3600), m = Math.floor(x % 3600 / 60), sec = x % 60; return h ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`; };
function viewProduce(v, id) {
  const s = S();
  if (!id) {
    const r1 = store.list('recipe').map(r => r.name), scents = [...new Set([...s.scents, ...r1])], tin = (s.tins.find(t => t.size === 'M') || s.tins[0]).id;
    const st = lsGet('mad.produceDraft', null) || { scent: scents[0], tin, count: 20, pack: s.packs[0].id };
    const open = store.list('batch').filter(b => b.prodStep != null && !b.prodDone).sort((a, b) => (b.date + b.number).localeCompare(a.date + a.number));
    const ms = makerStats(), rk = ms.rank, toNext = rk.next ? rk.next[0] - ms.done : 0, pct = rk.next ? Math.round((ms.done - rk.at) / (rk.next[0] - rk.at) * 100) : 100;
    v.innerHTML = `<div class="wrap"><div class="head"><div><span class="eyebrow">Production</span><h1>Ready to produce</h1></div></div>${subnav('produce')}
     <div class="rankcard"><div class="badge">${ico('star')}</div><div class="rk"><span class="eyebrow">Your rank</span><b>${rk.name}</b><div class="xpbar"><div style="width:${pct}%"></div></div><span class="note">${rk.next ? `${toNext} more batch${toNext === 1 ? '' : 'es'} to <b>${rk.next[1]}</b>` : 'Top rank reached'}</span></div>
       <div class="rstats"><div><b>${ms.xp.toLocaleString('en-IN')}</b><span>XP</span></div><div><b>${ms.done}</b><span>Batches</span></div><div><b>${ms.candles.toLocaleString('en-IN')}</b><span>Candles</span></div></div></div>
     ${open.length ? `<section><h2>Continue your quest</h2><div class="list">${open.map(b => `<a class="item" href="#/produce/${encodeURIComponent(b.id)}"><div><div class="t">${esc(b.scent)} · ${esc(tinOf(s, b.tin).name)} × ${b.count}</div><div class="m">Batch ${esc(b.number)} · step ${(+b.prodStep || 0) + 1} of 18</div></div><span class="btn">Continue →</span></a>`).join('')}</div></section>` : ''}
     <section><h2>Choose your next batch</h2>
     <div class="grid2"><section><div class="fields">
       <label>Scent<select id="pScent">${opt(scents.map(x => ({ v: x, t: x })), scents.includes(st.scent) ? st.scent : scents[0])}</select></label>
       <label>Tin<select id="pTin">${opt(s.tins.map(t => ({ v: t.id, t: tinLabel(s, t) })), s.tins.some(t => t.id === st.tin) ? st.tin : tin)}</select></label>
       <label>How many candles<input id="pCount" type="number" inputmode="numeric" value="${esc(st.count)}"></label>
       <label>Packaging<select id="pPack">${opt(s.packs.map(p => ({ v: p.id, t: p.name })), s.packs.some(p => p.id === st.pack) ? st.pack : s.packs[0].id)}</select></label>
     </div><div class="row"><button id="pGo" class="go" type="button">${ico('flame')} Start the quest</button><button id="pPrint" class="ghost" type="button">Print steps (one per A4 sheet)</button></div></section>
     <section><div class="card" id="pSum"></div></section></div></section></div>`;
    const draft = () => { const tn = tinOf(s, st.tin), wax = Math.round(waxOf(s, tn) * (+st.count || 0) * (1 + s.set.waste / 100));
      return { number: nextBatchNo(today()), date: today(), scent: st.scent, tin: st.tin, count: +st.count || 0, pack: st.pack, waxG: wax, oilG: Math.round(wax * s.set.load / 100), wick: wickChart(s)[st.tin]?.wick || '', cureReady: addDays(today(), s.set.cureDays) }; };
    const sum = () => { const d = draft(), P = prodPlan(s, d); lsSet('mad.produceDraft', st);
      $('#pSum').innerHTML = `<h2>Your loadout</h2><div class="loot">${[['scale', d.waxG.toLocaleString('en-IN') + ' g', 'Wax'], ['drop', d.oilG + ' g', 'Fragrance'], ['wick', P.wicks, 'Wicks'], ['tin', P.n, 'Tins']].map(([k, val, l]) => `<div>${ico(k)}<b>${val}</b><span>${l}</span></div>`).join('')}</div>${P.r ? blendTable(P.r, d.oilG) : '<span class="note">No recipe saved for this scent, so the fragrance is one oil.</span>'}<span class="note">Wax includes ${s.set.waste}% extra. Fragrance is ${s.set.load}% of the wax. Wick: ${d.wick ? esc(d.wick) + ' (from the wick chart)' : 'no passed test for this tin yet'}. Reward: <b>+${18 * 10 + 50 + P.n} XP</b></span>`; };
    sum();
    const bind = (sel, k) => $(sel).addEventListener('input', e => { st[k] = e.target.value; sum(); });
    bind('#pScent', 'scent'); bind('#pTin', 'tin'); bind('#pCount', 'count'); bind('#pPack', 'pack');
    $('#pGo').onclick = () => { if (!(+st.count > 0)) { toast('Enter how many candles'); return; } const bid = uid('b');
      store.put(bid, 'batch', Object.assign({ id: bid, waxLot: '', addTemp: '', pourTemp: '', notes: '', prodStep: 0, ticks: {}, checks: { prep: [], pour: [], cure: [], pack: [] } }, draft())); location.hash = '#/produce/' + encodeURIComponent(bid); };
    $('#pPrint').onclick = () => { const d = draft(); d.number = d.number + ' (to confirm)'; printSteps(s, d); };
    return;
  }
  const b0 = store.get(id); if (!b0) { v.innerHTML = '<div class="wrap"><div class="empty">Not found. <a href="#/produce">Back</a></div></div>'; return; }
  const b = clone(b0); b.checks = b.checks || { prep: [], pour: [], cure: [], pack: [] }; b.ticks = b.ticks || {};
  const steps = prodSteps(s, b); let i = Math.min(+b.prodStep || 0, steps.length - 1), tmr = null;
  v.innerHTML = `<div class="wrap produce"><div class="phead"><a href="#/produce" class="goldc eyebrow">← Quests</a><div class="ptitle"><b>${esc(b.scent)}</b><span>${esc(tinOf(s, b.tin).name)} × ${esc(b.count)} · ${esc(b.number)}</span></div><div class="xp" id="sXp"></div></div>
    <div id="sMap"></div><div class="stagewrap"><div class="sheet" id="sSheet" aria-live="polite"></div><div class="side2" id="sCandle"></div></div>
    <div class="stepnav"><button id="sBack" class="ghost" type="button">←</button><button id="sNext" class="go" type="button"></button><button id="sPrint" class="ghost" type="button" title="Print steps">⎙</button></div></div>`;
  const save = () => store.put(id, 'batch', clone(b));
  const markGroups = () => STAGES.forEach(([g]) => { const idxs = steps.map((x, k) => x.g === g ? k : -1).filter(k => k >= 0); if (idxs.length && idxs.every(k => k < i)) b.checks[g] = SOP[g].map(() => true); });
  const ready = () => { const st = steps[i], t = b.ticks[i] || []; return st.items.every((_, k) => t[k]); };
  const drawNav = () => { const st = steps[i], ok = ready(); const left = st.items.length - (b.ticks[i] || []).filter(Boolean).length;
    $('#sNext').disabled = !ok && !st.last; $('#sNext').innerHTML = st.last ? `${ico('star')} Finish quest` : ok ? 'Next step →' : `Tick ${left} more to unlock`; $('#sBack').disabled = i === 0;
    $('#sXp').innerHTML = `<b>${i * 10}</b> XP`; };
  const draw = (anim) => { const st = steps[i], t = b.ticks[i] || [];
    if (tmr) { clearInterval(tmr); tmr = null; }
    $('#sMap').innerHTML = questMap(steps, i);
    $('#sCandle').innerHTML = candleSvg(i / (steps.length - 1), i >= 10) + `<div class="note" style="text-align:center">Step ${i + 1} of ${steps.length}</div>`;
    $('#sSheet').innerHTML = `<div class="sh${anim ? ' in-' + anim : ''}"><div class="stephead"><div class="bigico">${ico(st.i)}</div><div><div class="stepno">${STAGES.find(x => x[0] === st.g)[1]} · step ${i + 1}</div><h2 class="steph">${esc(st.h)}</h2></div></div>
      ${st.hero ? `<p class="hero">${st.hero}</p>` : ''}${st.sub ? `<p class="hsub">${st.sub}</p>` : ''}
      ${st.timer ? `<div class="timer"><div class="tt" id="tT">${fmtT(st.timer)}</div><button id="tGo" class="ghost" type="button">Start timer</button></div>` : ''}
      <div class="tasks">${st.items.map((x, k) => `<button type="button" class="task${t[k] ? ' on' : ''}" data-k="${k}"><span class="box"></span><span>${x}</span><em>+${Math.round(10 / st.items.length)}</em></button>`).join('')}</div>
      ${st.last ? `<div class="win">${b.stockMove ? '<p class="ok"><b>✓ Added to stock</b></p>' : `<button id="sStock" class="go" type="button">${ico('box')} Add ${esc(b.count)} to stock</button>`}</div>` : ''}</div>`;
    drawNav();
    $$('.task', v).forEach(el => el.onclick = () => { const k = +el.dataset.k; b.ticks[i] = b.ticks[i] || []; b.ticks[i][k] = !b.ticks[i][k]; el.classList.toggle('on', b.ticks[i][k]); el.classList.add('pop'); setTimeout(() => el.classList.remove('pop'), 300); buzz(12); save(); drawNav(); if (ready()) $('#sNext').classList.add('pulse'); });
    const tg = $('#tGo'); if (tg) tg.onclick = () => { if (tmr) { clearInterval(tmr); tmr = null; tg.textContent = 'Start timer'; return; } const end = Date.now() + st.timer * 1000; tg.textContent = 'Stop';
      tmr = setInterval(() => { const left = (end - Date.now()) / 1000; const el = $('#tT'); if (!el) { clearInterval(tmr); return; } el.textContent = fmtT(left); if (left <= 0) { clearInterval(tmr); tmr = null; el.textContent = 'Done!'; el.classList.add('ok'); buzz([200, 100, 200]); toast('Timer done'); } }, 250); };
    const sb = $('#sStock'); if (sb) sb.onclick = () => { b.stockMove = addMove({ type: 'in', scent: b.scent, tin: b.tin, qty: +b.count, note: 'Batch ' + b.number, ref: id }); save(); draw(); confetti($('#sSheet')); toast('Added to stock'); };
    window.scrollTo(0, 0); };
  draw();
  const splash = (title, sub) => { const o = document.createElement('div'); o.className = 'splash'; o.innerHTML = `<div class="sc">${ico('star', 'sb')}<b>${title}</b><span>${sub}</span></div>`; document.body.appendChild(o); confetti(o); buzz([30, 40, 30]); setTimeout(() => o.classList.add('out'), 1500); setTimeout(() => o.remove(), 1900); };
  $('#sNext').onclick = () => { const st = steps[i];
    if (st.last) { i = steps.length; markGroups(); b.prodDone = true; b.prodStep = steps.length - 1; save(); const ms = makerStats(); splash('Quest complete!', `+${18 * 10 + 50 + (+b.count || 0)} XP · rank: ${ms.rank.name}`); setTimeout(() => { location.hash = '#/produce'; }, 1900); return; }
    if (!ready()) return; const g = st.g; i++; markGroups(); b.prodStep = i; save();
    if (steps[i].g !== g) splash('Stage cleared!', `${STAGES.find(x => x[0] === g)[1]} done · next: ${STAGES.find(x => x[0] === steps[i].g)[1]}`);
    draw('next'); };
  $('#sBack').onclick = () => { if (i > 0) { i--; b.prodStep = i; save(); draw('back'); } };
  $('#sPrint').onclick = () => printSteps(s, b);
}
function printSteps(s, b) {
  const steps = prodSteps(s, b), box = document.createElement('div'); box.className = 'printsteps';
  box.innerHTML = steps.map((st, k) => `<section class="psheet"><img src="assets/logo-brown.png" alt="MAD"><div class="pmeta">${esc(b.scent)} · ${esc(tinOf(s, b.tin).name)} × ${esc(b.count)} · Batch ${esc(b.number)}</div><div class="pstage">${STAGES.find(x => x[0] === st.g)[1]} · Step ${k + 1} of ${steps.length}</div><div class="phd">${ico(st.i, 'pico')}<h2 class="steph">${esc(st.h)}</h2></div>${st.hero ? `<p class="hero">${st.hero}</p>` : ''}${st.sub ? `<p class="hsub">${st.sub}</p>` : ''}<div class="ptasks">${st.items.map(x => `<div><span class="box"></span><span>${x}</span></div>`).join('')}</div><div class="pfoot">Initials ______ &nbsp;&nbsp; Time ______</div></section>`).join('');
  document.body.appendChild(box); document.body.classList.add('printing-steps');
  const done = () => { document.body.classList.remove('printing-steps'); box.remove(); window.removeEventListener('afterprint', done); };
  window.addEventListener('afterprint', done); setTimeout(() => window.print(), 300);
}

/* ---------------- Brand reference ---------------- */
function viewBrand(v) {
  const s = S(), b = s.business;
  const price = (t, p, basis) => unitPrice(s, t.id, p.id, basis);
  const rt = (t, p) => Math.ceil(price(t, p, 'rt') * (1 + s.set.gst / 100) / 5) * 5;
  v.innerHTML = `<div class="wrap"><div class="head"><div><span class="eyebrow">${esc(b.tagline)}</span><h1>Brand &amp; product reference</h1></div><span class="sub">The MAD brand is fixed. Use these files and specs as they are.</span></div>
   <section><h2>Logo files</h2><div class="assets">
     <a class="asset" href="assets/logo-original.png" download><div class="im bg-cream"><img src="assets/logo-original.png" alt="Original logo"></div>Original (HD)</a>
     <a class="asset" href="assets/logo-brown.png" download><div class="im bg-cream"><img src="assets/logo-brown.png" alt="Brown logo"></div>Dark brown · transparent</a>
     <a class="asset" href="assets/logo-black.png" download><div class="im bg-cream"><img src="assets/logo-black.png" alt="Black logo"></div>Black ink · transparent</a>
     <a class="asset" href="assets/logo-white.png" download><div class="im bg-dark"><img src="assets/logo-white.png" alt="White logo"></div>White ink · transparent</a>
     <a class="asset" href="assets/logo-gold.png" download><div class="im bg-green"><img src="assets/logo-gold.png" alt="Gold logo"></div>Gold foil · transparent</a>
     <a class="asset" href="assets/letterhead.png" download><div class="im bg-cream"><img src="assets/letterhead.png" alt="Letterhead"></div>Letterhead (A4)</a>
     <a class="asset" href="assets/icon-pack.jpg" download><div class="im bg-cream"><img src="assets/icon-pack.jpg" alt="Icon pack"></div>Icon pack</a>
   </div><span class="note">Printers need vector files (SVG/AI/PDF) for sharp stickers and boxes; these PNGs are for screen and digital print.</span></section>
   <div class="card"><h2>Brand rules</h2><dl class="spec">
     <dt>Name &amp; tagline</dt><dd>MAD · ${esc(b.tagline)}</dd><dt>Footer line</dt><dd>Candles | Fragrances | Rituals | Wellbeing</dd>
     <dt>Colours</dt><dd>Cream #FBF5EB · Dark brown #1E1611 · Gold #9C7A45 / foil #C8A266 · Dark green #2C3428 · Black #151515</dd>
     <dt>Type</dt><dd>Jost, light weights, wide-spaced capitals for labels</dd><dt>Rule</dt><dd>Logo, icon pack and letterhead are fixed. Never redraw or restyle them; only recolour for print ink.</dd></dl></div>
   <div class="card"><h2>Packaging specs</h2><dl class="spec">
     <dt>Logo sticker (UV)</dt><dd>Top-left of tin side, 6 mm in, 5 mm below lid edge. 14 mm small · 16 mm medium/square/heart · 18 mm large. White ink on black tins, black ink on all others.</dd>
     <dt>Bottom sticker (UV)</dt><dd>45 mm small, 55 mm others: scent, weight, burn time, safety, “MAD · Bengaluru, India”.</dd>
     <dt>Boxes</dt><dd>Tuck-end. Cream/brown, dark green/gold foil, black/white. Small 65×65×45, medium 80×80×55, large 95×95×65 mm. Front: small logo top-left + “SCENTED CANDLE / HAND POURED”.</dd>
     <dt>Box back sticker</dt><dd>60×40 mm: scented soy candle, hand poured, burn time, maker address, customer care, Made in India.</dd>
     <dt>Dust cover card</dt><dd>Round, 51 mm (match each tin), 8 mm wick hole, pull tab, one side. Rim: “Remove cover before lighting · Replace when cool”.${b.instagram ? ' Instagram: ' + esc(b.instagram) : ' Instagram handle still to add.'}</dd>
     <dt>Tissue seal</dt><dd>30 mm round, logo + short rule, colour to match the box.</dd>
     <dt>Retail note</dt><dd>For public retail sale, net weight, MRP and month of manufacture must appear on each pack (price sticker or stamp).</dd></dl></div>
   <section><h2>Current price list (from your rates)</h2>
     <div class="scroll"><table><thead><tr><th>Tin</th>${s.packs.map(p => `<th class="num">${esc(p.name)} · trade</th>`).join('')}${s.packs.map(p => `<th class="num">${esc(p.name)} · MRP</th>`).join('')}</tr></thead>
     <tbody>${s.tins.map(t => `<tr><td>${esc(t.name)}</td>${s.packs.map(p => `<td class="num">${inr(price(t, p, 'ws'), 0)}</td>`).join('')}${s.packs.map(p => `<td class="num">${inr(rt(t, p), 0)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
     <span class="note">Trade = wholesale, excl. GST. MRP = retail incl. ${s.set.gst}% GST, rounded up to ₹5. Update rates in Settings and these follow.</span></section>
   <section><h2>Scents</h2><div class="chips">${s.scents.map(x => `<span class="pill">${esc(x)}</span>`).join('')}</div></section></div>`;
}

/* ---------------- Settings ---------------- */
function viewSettings(v) {
  const s = S(), cfg = sync.cfg() || { url: '', key: '' }, b = s.business;
  const bf = [['company', 'Billing company'], ['brand', 'Brand'], ['gstin', 'GSTIN'], ['stateCode', 'State code'], ['phone', 'Phone / WhatsApp'], ['email', 'Email'], ['instagram', 'Instagram handle'], ['hsn', 'HSN code'], ['bankAccName', 'Bank account name'], ['bankName', 'Bank & branch'], ['bankAcc', 'Account number'], ['ifsc', 'IFSC'], ['upi', 'UPI ID'], ['dueDays', 'Invoice due (days)'], ['validDays', 'Quote valid (days)']];
  v.innerHTML = `<div class="wrap"><div class="head"><div><span class="eyebrow">Settings</span><h1>Products, rates &amp; sync</h1></div><button id="sSave" type="button">Save settings</button></div>
   <div class="card"><h2>Sync across devices</h2><div id="syncBox"></div></div>
   <section><h2>Sizes</h2><div class="scroll" style="border-top:none"><table><thead><tr><th>Size name</th><th class="num">Default wax (g)</th><th class="num">Wicks</th><th class="num">Labour ₹</th><th class="num">Box ₹</th><th class="num">Burn hrs</th><th></th></tr></thead><tbody id="sSize"></tbody></table></div><div class="row"><button id="sAddSize" class="ghost" type="button">Add size</button><span class="note">A new size appears in each tin's Size list straight away.</span></div></section>
   <section><h2>Tins</h2><div class="scroll" style="border-top:none"><table><thead><tr><th>Name</th><th>Size</th><th class="num">Wax (g)</th><th class="num">₹ each</th><th></th></tr></thead><tbody id="sTins"></tbody></table></div><div class="row"><button id="sAddTin" class="ghost" type="button">Add tin</button><span class="note">Wax (g) is the wax that goes into one tin; leave blank to use the size default. Size (above) sets wicks, labour and box.</span></div></section>
   <section><h2>Packaging</h2><div class="scroll" style="border-top:none"><table><thead><tr><th>Name</th><th>Box</th><th>Dust cover + tissue</th><th class="num">Extra ₹/candle</th><th></th></tr></thead><tbody id="sPacks"></tbody></table></div><div class="row"><button id="sAddPack" class="ghost" type="button">Add packaging</button></div></section>
   <section><h2>Scents</h2><div class="chips" id="sScents"></div><div class="row"><input id="sNewScent" placeholder="New scent name" style="max-width:280px"><button id="sAddScent" class="ghost" type="button">Add scent</button></div></section>
   <section><h2>Material rates · ₹ excl. GST</h2><div class="fields" id="sRates"></div></section>
   <section><h2>Recipe &amp; pricing</h2><div class="fields" id="sSet"></div></section>
   <section><h2>Business details (invoices)</h2><div class="fields">${bf.map(([k, n]) => `<label>${n}<input data-b="${k}" value="${esc(b[k])}"></label>`).join('')}<label style="grid-column:1/-1">Address<textarea data-b="address">${esc(b.address)}</textarea></label>
     <label style="grid-column:1/-1">Invoice terms<textarea data-b="invTerms" rows="4">${esc(b.invTerms)}</textarea></label><label style="grid-column:1/-1">Quotation terms<textarea data-b="quoteTerms" rows="4">${esc(b.quoteTerms)}</textarea></label></div></section>
   <div class="card"><h2>Backup</h2><div class="row"><button id="sExport" class="ghost" type="button">Download backup</button><label class="btn ghost" style="flex-direction:row">Restore backup<input id="sImport" type="file" accept="application/json" hidden></label></div><span class="note">A backup file holds everything: settings, quotes, invoices, batches, stock, recipes and wick tests.</span></div>
   <div class="row"><button id="sSave2" type="button">Save settings</button></div></div>`;
  const drawProducts = () => {
    $('#sTins').innerHTML = s.tins.map((t, i) => `<tr data-t="${i}"><td><input data-k="name" value="${esc(t.name)}" aria-label="Tin name" style="min-width:160px"></td><td><select data-k="size" aria-label="Size">${opt(Object.keys(s.size).map(z => ({ v: z, t: sizeName(s, z) })), sizeKey(s, t))}</select></td><td class="num"><input data-k="wax" type="number" min="0" value="${+t.wax > 0 ? t.wax : ''}" placeholder="${s.size[t.size]?.w ?? ''}" style="width:80px" aria-label="Wax grams per tin"></td><td class="num"><input data-k="rate" type="number" value="${t.rate}" style="width:90px" aria-label="Rate"></td><td><button class="x" type="button" data-rmt="${i}" aria-label="Remove tin"${s.tins.length < 2 ? ' disabled' : ''}>×</button></td></tr>`).join('');
    $('#sPacks').innerHTML = s.packs.map((p, i) => `<tr data-p="${i}"><td><input data-k="name" value="${esc(p.name)}" aria-label="Packaging name" style="min-width:140px"></td><td><input data-k="box" type="checkbox"${p.box ? ' checked' : ''} aria-label="Uses box"></td><td><input data-k="gift" type="checkbox"${p.gift ? ' checked' : ''} aria-label="Adds dust cover and tissue"></td><td class="num"><input data-k="extra" type="number" value="${p.extra || 0}" style="width:90px" aria-label="Extra"></td><td><button class="x" type="button" data-rmp="${i}" aria-label="Remove packaging"${s.packs.length < 2 ? ' disabled' : ''}>×</button></td></tr>`).join('');
    $('#sScents').innerHTML = s.scents.map((x, i) => `<span class="chip"><input data-sc="${i}" value="${esc(x)}" aria-label="Scent"><button class="x" type="button" data-rms="${i}" aria-label="Remove scent"${s.scents.length < 2 ? ' disabled' : ''}>×</button></span>`).join('');
  };
  drawProducts();
  $('#sRates').innerHTML = RATE_FIELDS.map(([k, n, u]) => `<label>${n} (₹ ${u})<input data-r="${k}" type="number" step="0.5" value="${s.rates[k]}"></label>`).join('');
  const drawSizes = () => { const used = new Set(s.tins.map(t => t.size));
    $('#sSize').innerHTML = Object.keys(s.size).map(z => { const d = s.size[z], fixed = ['S', 'M', 'L'].includes(z), n = (k, w, st) => `<td class="num"><input data-zk="${esc(z)}" data-zf="${k}" type="number" min="0"${st ? ` step="${st}"` : ''} value="${d[k] ?? 0}" style="width:${w}px" aria-label="${esc(d.name)} ${k}"></td>`;
      return `<tr><td><input data-zk="${esc(z)}" data-zf="name" value="${esc(d.name)}" aria-label="Size name" style="min-width:120px"></td>${n('w', 80)}${n('wicks', 60)}${n('lab', 70, '0.5')}${n('box', 70, '0.5')}${n('hrs', 60)}<td><button class="x" type="button" data-rmz="${esc(z)}" aria-label="Remove size"${fixed || used.has(z) ? ` disabled title="${fixed ? 'Built-in size' : 'Used by a tin'}"` : ''}>×</button></td></tr>`; }).join(''); };
  drawSizes();
  $('#sSet').innerHTML = SET_FIELDS.map(([k, n, u]) => `<label>${n} (${u})<input data-g="${k}" type="number" step="0.1" value="${s.set[k]}"></label>`).join('');
  let dirty = false; const mark = () => { dirty = true; $('#sSave').textContent = 'Save settings •'; };
  v.addEventListener('input', e => { const t = e.target, num = parseFloat(t.value);
    const tr = t.closest('[data-t]'), pr = t.closest('[data-p]');
    if (tr && t.dataset.k) { s.tins[+tr.dataset.t][t.dataset.k] = ['rate', 'wax'].includes(t.dataset.k) ? (num || 0) : t.value; if (t.dataset.k === 'size') { const w = tr.querySelector('[data-k=wax]'); if (w) w.placeholder = s.size[t.value]?.w ?? ''; drawSizes(); } }
    else if (pr && t.dataset.k) { s.packs[+pr.dataset.p][t.dataset.k] = t.type === 'checkbox' ? t.checked : t.dataset.k === 'extra' ? (num || 0) : t.value; }
    else if (t.dataset.sc != null) { if (t.value.trim()) s.scents[+t.dataset.sc] = t.value.trim(); }
    else if (t.dataset.r) { if (!isNaN(num)) s.rates[t.dataset.r] = num; }
    else if (t.dataset.zk) { const d = s.size[t.dataset.zk]; if (t.dataset.zf === 'name') { d.name = t.value; drawProducts(); } else if (!isNaN(num)) d[t.dataset.zf] = num; }
    else if (t.dataset.g) { if (!isNaN(num)) s.set[t.dataset.g] = num; }
    else if (t.dataset.b) { s.business[t.dataset.b] = ['dueDays', 'validDays'].includes(t.dataset.b) ? (num || 0) : t.value; }
    else return; mark(); });
  v.addEventListener('click', e => { const rz = e.target.closest('[data-rmz]'); if (rz && !rz.disabled) { delete s.size[rz.dataset.rmz]; drawSizes(); drawProducts(); mark(); } });
  v.addEventListener('click', e => { const rt = e.target.closest('[data-rmt]'), rp = e.target.closest('[data-rmp]'), rs = e.target.closest('[data-rms]');
    if (rt && s.tins.length > 1) s.tins.splice(+rt.dataset.rmt, 1); else if (rp && s.packs.length > 1) s.packs.splice(+rp.dataset.rmp, 1); else if (rs && s.scents.length > 1) s.scents.splice(+rs.dataset.rms, 1); else return; drawProducts(); drawSizes(); mark(); });
  $('#sAddSize').onclick = () => { const z = uid('z'); s.size[z] = { name: 'New size', w: 150, wicks: 1, lab: 15, hrs: 35, box: 20 }; drawSizes(); drawProducts(); mark(); $(`#sSize [data-zk="${z}"][data-zf=name]`)?.select(); };
  $('#sAddTin').onclick = () => { s.tins.push({ id: uid('t'), name: 'New tin', size: 'M', rate: 30, wax: '' }); drawProducts(); mark(); };
  $('#sAddPack').onclick = () => { s.packs.push({ id: uid('p'), name: 'New packaging', box: false, gift: false, extra: 10 }); drawProducts(); mark(); };
  const addScent = () => { const x = $('#sNewScent').value.trim(); if (!x) return; if (s.scents.some(y => y.toLowerCase() === x.toLowerCase())) { toast('Already in the list'); return; } s.scents.push(x); $('#sNewScent').value = ''; drawProducts(); mark(); };
  $('#sAddScent').onclick = addScent; $('#sNewScent').onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); addScent(); } };
  const doSave = () => { saveSettings(s); dirty = false; $('#sSave').textContent = 'Save settings'; toast('Settings saved'); };
  $('#sSave').onclick = doSave; $('#sSave2').onclick = doSave;
  window.onbeforeunload = () => dirty ? true : undefined;
  $('#sExport').onclick = () => { const blob = new Blob([JSON.stringify({ app: 'MAD Studio', exported: new Date().toISOString(), records: [...store.recs.values()] }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'mad-backup-' + today() + '.json'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); };
  $('#sImport').onchange = async e => { const f = e.target.files[0]; if (!f) return; try { const j = JSON.parse(await f.text()); (j.records || []).forEach(r => { const l = store.recs.get(r.id); if (!l || new Date(r.updated_at) > new Date(l.updated_at)) { store.recs.set(r.id, r); store.pending.add(r.id); } }); store.persist(); sync.push(); toast('Backup restored'); render(); } catch { toast('That file is not a MAD backup'); } };
  drawSync();
}
function drawSync() {
  const box = $('#syncBox'); if (!box) return; const cfg = sync.cfg() || { url: '', key: '' };
  if (!sync.client) {
    box.innerHTML = `<p class="sub" style="margin:0">Connect your free Supabase project once on each device. See README step 2 for where to find these two values.</p>
     <div class="fields"><label>Project URL<input id="yUrl" value="${esc(cfg.url)}" placeholder="https://xxxx.supabase.co" autocomplete="off"></label><label>Publishable key<input id="yKey" value="${esc(cfg.key)}" placeholder="sb_publishable_…" autocomplete="off"></label></div>
     <div class="row"><button id="yConnect" type="button">Connect</button></div>`;
    $('#yConnect').onclick = async () => { const url = $('#yUrl').value.trim(), key = $('#yKey').value.trim(); if (!/^https:\/\/.+/.test(url) || key.length < 20) { toast('Check the URL and key'); return; } lsSet('mad.supabase', { url, key }); await sync.init(); drawSync(); toast(sync.client ? 'Connected — now sign in' : 'Could not load Supabase. Check your connection.'); };
    return;
  }
  if (!sync.user) {
    box.innerHTML = `<div class="fields"><label>Email<input id="yEmail" type="email" autocomplete="username" value="${esc(S().business.email)}"></label><label>Password<input id="yPass" type="password" autocomplete="current-password"></label></div>
     <div class="row"><button id="yIn" type="button">Sign in</button><button id="yUp" class="ghost" type="button">Create account (first time only)</button><button id="yForget" class="ghost" type="button">Disconnect project</button></div><span class="note" id="yMsg"></span>`;
    const go = async up => { const email = $('#yEmail').value.trim(), password = $('#yPass').value; if (!email || password.length < 6) { $('#yMsg').textContent = 'Enter your email and a password of at least 6 characters.'; return; }
      const fn = up ? sync.client.auth.signUp({ email, password }) : sync.client.auth.signInWithPassword({ email, password });
      const { data, error } = await fn; if (error) { $('#yMsg').textContent = error.message; return; }
      if (up && !data.session) { $('#yMsg').textContent = 'Account created. Open the confirmation email, then come back and sign in.'; return; }
      sync.user = data.user || data.session?.user; sync.refreshBadge(); await sync.pull(); toast('Signed in and synced'); };
    $('#yIn').onclick = () => go(false); $('#yUp').onclick = () => go(true);
    $('#yForget').onclick = () => { lsSet('mad.supabase', null); sync.client = null; sync.refreshBadge(); drawSync(); };
    return;
  }
  box.innerHTML = `<p style="margin:0">Signed in as <b>${esc(sync.user.email)}</b>. Changes sync automatically; opening the app pulls the latest.</p><div class="row"><button id="yNow" type="button">Sync now</button><button id="yOut" class="ghost" type="button">Sign out</button></div>`;
  $('#yNow').onclick = async () => { await sync.pull(); toast('Synced'); };
  $('#yOut').onclick = async () => { await sync.client.auth.signOut(); sync.user = null; sync.refreshBadge(); drawSync(); };
}

/* ---------------- Boot ---------------- */
store.load();
seedRecipes();
if (!location.hash) location.hash = '#/calc';
render();
sync.init().then(() => { if (location.hash.startsWith('#/settings')) drawSync(); });
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
