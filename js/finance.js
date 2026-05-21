// ════════════════════════════════════════════════════
//  finance.js  —  Financial engine & formatters
// ════════════════════════════════════════════════════

// ── Contract types ────────────────────────────────────
const CONTRACT_TYPES = {
  TM:   { label:'T&M',  full:'Time & Materials',             color:'var(--blue)',   abbr:'T&M'  },
  CPFF: { label:'CPFF', full:'Cost Plus Fixed Fee',          color:'var(--tac)',    abbr:'CPFF' },
  CPAF: { label:'CPAF', full:'Cost Plus Award Fee',          color:'var(--tac)',    abbr:'CPAF' },
  FFP:  { label:'FFP',  full:'Firm Fixed Price',             color:'var(--green)',  abbr:'FFP'  },
  IDIQ: { label:'IDIQ', full:'Indefinite Delivery/Quantity', color:'var(--purple)', abbr:'IDIQ' },
  OTHER:{ label:'Other',full:'Other / Not Specified',        color:'var(--dim)',    abbr:'—'    },
};

const CT_REQ = {
  TM:   { required:['bH','aH','bL','aL'], optional:['bO','aO','fee'], eacMethod:'hoursRate' },
  CPFF: { required:['bL','aL'], optional:['bH','aH','bO','aO'],       eacMethod:'cpff'      },
  CPAF: { required:['bL','aL'], optional:['bH','aH','bO','aO'],       eacMethod:'cpff'      },
  FFP:  { required:['bL','aL'], optional:['bH','aH'],                 eacMethod:'ffp'       },
  IDIQ: { required:['bL','aL'], optional:['bH','aH','bO','aO'],       eacMethod:'hoursRate' },
  OTHER:{ required:['bL','aL'], optional:['bH','aH','bO','aO'],       eacMethod:'hoursRate' },
};

// ── Stoplight categories ──────────────────────────────
const STOPLIGHT_CATS = [
  { key:'customer',    label:'Customer Relationship' },
  { key:'growth',      label:'Growth / Opportunity'  },
  { key:'finance',     label:'Finance'               },
  { key:'schedule',    label:'Schedule / Milestones' },
  { key:'staffing',    label:'Staffing'              },
  { key:'utilization', label:'Utilization'           },
  { key:'quality',     label:'Quality'               },
  { key:'risk',        label:'Risk'                  },
  { key:'suppliers',   label:'Suppliers / Subs'      },
  { key:'safety',      label:'Safety'                },
];

// ── calcSheet ─────────────────────────────────────────
function calcSheet(rows, map, ctType) {
  if (!rows?.length || !map) return null;
  const ct  = ctType || 'OTHER';
  const req = CT_REQ[ct] || CT_REQ.OTHER;
  let bH=0, aH=0, bL=0, aL=0, bO=0, aO=0, fee=0;

  const ro = rows.map(row => {
    const g = f => { const c = map[f]; return (c && row[c] !== undefined) ? safeN0(row[c]) : 0; };
    const [rbH,raH,rbL,raL,rbO,raO,rf] = ['bH','aH','bL','aL','bO','aO','fee'].map(g);
    bH+=rbH; aH+=raH; bL+=rbL; aL+=raL; bO+=rbO; aO+=raO; fee+=rf;
    return {
      label : map.label && row[map.label] ? String(row[map.label]) : '—',
      bH:rbH, aH:raH, bL:rbL, aL:raL, bO:rbO, aO:raO, fee:rf, raw:row,
    };
  });

  const tb  = bL + bO + fee;
  const ta  = aL + aO;
  const bp  = tb > 0 ? ta / tb : 0;
  const hR  = Math.max(bH - aH, 0);
  const rph = aH > 0 ? aL / aH : 0;
  const etcO = bO > aO ? bO - aO : 0;

  // EAC by contract type
  let eac, etcL, eacMethod;
  if (req.eacMethod === 'hoursRate' && aH > 0 && bH > 0) {
    etcL = rph * hR;
    eac  = aL + etcL + aO + etcO + fee;
    eacMethod = 'Hours × Rate';
  } else if (req.eacMethod === 'cpff') {
    const cpi = tb > 0 ? ta / tb : 1;
    etcL = cpi > 0 ? (bL - aL) / Math.min(cpi, 2) : (bL - aL);
    eac  = aL + Math.max(etcL, 0) + aO + etcO + fee;
    eacMethod = 'CPI-adjusted';
  } else if (req.eacMethod === 'ffp') {
    etcL = Math.max(bL - aL, 0);
    eac  = ta > tb ? ta : tb;
    eacMethod = 'Funded Value';
  } else {
    etcL = Math.max(bL - aL, 0);
    eac  = aL + etcL + aO + etcO + fee;
    eacMethod = 'Budget Remaining';
  }

  const va     = tb - eac;
  const mb     = ta > 0 ? ta / 12 : 0;
  const runOut = mb > 0 ? (tb - ta) / mb : null;

  // Data quality
  const detFields = ['bH','aH','bL','aL','bO','aO','fee'];
  const det      = detFields.filter(f => !!map[f]);
  const reqMiss  = req.required.filter(f => !map[f]);
  const dq = {
    score      : Math.round(det.length / detFields.length * 100),
    reqMissing : reqMiss,
    severity   : reqMiss.length > 0 ? 'warn' : det.length < detFields.length ? 'info' : 'ok',
    canCalc    : {
      burnRate     : !!(map.bL && map.aL) || !!(map.bH && map.aH),
      eac          : !!(map.aL || map.aH),
      variance     : !!(map.bL && map.aL),
      hoursAnalysis: !!(map.bH && map.aH),
      odcTracking  : !!(map.bO && map.aO),
      feeTracking  : !!map.fee,
      runOut       : !!(map.aL || map.aH),
    },
  };

  return { rows:ro, bH, aH, hR, bL, aL, bO, aO, fee, tb, ta, bp, eac, va, etcL, etcO, runOut, rph, eacMethod, ct, dq };
}

// ── calcProg ──────────────────────────────────────────
function calcProg(prog) {
  const { sheets={}, mappings={}, roles={}, meta={} } = prog;
  const ctType = meta.ctType || 'OTHER';
  const tos = {}, sumSheets = {};

  Object.entries(sheets).forEach(([n, rows]) => {
    const role = roles[n] || (isSumTab(n) ? 'summary' : 'to');
    if (role === 'skip') return;

    if (role === 'summary') {
      const map    = autoMapSummary(rows);
      const parsed = parseSummaryRows(rows, map);
      // Also run as detail sheet for reconciliation
      const detMap = mappings[n] || autoMap(rows);
      const detC   = calcSheet(rows, detMap, ctType);
      sumSheets[n] = { map, parsed, detC };
    } else {
      const map  = mappings[n] || autoMap(rows);
      const toCT = (prog.toTypes || {})[n] || ctType;
      const c    = calcSheet(rows, map, toCT);
      if (c) tos[n] = c;
    }
  });

  let bH=0, aH=0, bL=0, aL=0, bO=0, aO=0, fee=0;
  Object.values(tos).forEach(t => { bH+=t.bH; aH+=t.aH; bL+=t.bL; aL+=t.aL; bO+=t.bO; aO+=t.aO; fee+=t.fee; });

  const tb  = bL + bO + fee;
  const ta  = aL + aO;
  const bp  = tb > 0 ? ta / tb : 0;
  const hR  = Math.max(bH - aH, 0);
  const eac = Object.values(tos).reduce((s, t) => s + t.eac, 0);
  const va  = tb - eac;

  // Aggregate data quality
  const allDQ = Object.values(tos).map(t => t.dq).filter(Boolean);
  const dqSummary = {
    score    : allDQ.length ? Math.round(allDQ.reduce((s,d) => s+d.score, 0) / allDQ.length) : 0,
    severity : allDQ.some(d => d.severity==='warn') ? 'warn' : allDQ.some(d => d.severity==='info') ? 'info' : 'ok',
    toCount  : allDQ.length,
  };

  // Reconciliation
  let recon = null;
  const sumDetC = Object.values(sumSheets).map(s => s.detC).filter(Boolean);
  if (sumDetC.length) {
    let sTb=0, sTa=0, sEac=0, sBh=0, sAh=0;
    sumDetC.forEach(s => { sTb+=s.tb; sTa+=s.ta; sEac+=s.eac; sBh+=s.bH; sAh+=s.aH; });
    const tol = Math.max(tb, sTb) * 0.005;
    recon = {
      to  : { tb, ta, eac, bH, aH },
      sum : { tb:sTb, ta:sTa, eac:sEac, bH:sBh, aH:sAh },
      tbDelta : tb-sTb, taDelta : ta-sTa, eacDelta : eac-sEac,
      inTol   : Math.abs(tb-sTb) <= tol && Math.abs(ta-sTa) <= tol,
      summaryNames : Object.keys(sumSheets),
    };
  }

  return { tos, sumSheets, bH, aH, hR, bL, aL, bO, aO, fee, tb, ta, bp, eac, va, recon, dqSummary, ctType };
}

function diffProg(old, nw) {
  const o = calcProg(old), n = calcProg(nw);
  return {
    tb : { old:o.tb,  new:n.tb  },
    ta : { old:o.ta,  new:n.ta  },
    eac: { old:o.eac, new:n.eac },
    va : { old:o.va,  new:n.va  },
    bH : { old:o.bH,  new:n.bH  },
  };
}

// ── Formatters ────────────────────────────────────────
const f$ = v => {
  if (v === null || isNaN(v)) return '—';
  const a = Math.abs(v);
  const s = a >= 1e6 ? '$' + (v/1e6).toFixed(2) + 'M'
          : a >= 1e3 ? '$' + (v/1e3).toFixed(1) + 'K'
          : '$' + v.toFixed(0);
  return v < 0 ? '(' + s.replace('-', '') + ')' : s;
};
const fN = v => (v === null || isNaN(v)) ? '—' : v.toLocaleString(undefined, { maximumFractionDigits: 0 });
const fP = v => (v === null || isNaN(v)) ? '—' : (v * 100).toFixed(1) + '%';

const hcol = (bp, va) => bp > 0.95 || va < 0 ? 'var(--red)' : bp > 0.8 ? 'var(--amber)' : 'var(--green)';
const hbdg = (bp, va) => bp > 0.95 || va < 0 ? ['badge-red','At Risk'] : bp > 0.8 ? ['badge-amber','Watch'] : ['badge-green','On Track'];
const bcol = p => p > 0.95 ? 'var(--red)' : p > 0.80 ? 'var(--amber)' : 'var(--blue)';

function fmtDelta(diff, key, isH = false) {
  if (!diff) return '';
  const d = diff[key]; if (!d) return '';
  const delta = d.new - d.old;
  if (Math.abs(delta) < 0.01) return `<div class="kpi-delta delta-nil">Unchanged</div>`;
  const sign = delta > 0 ? '+' : '';
  const val  = isH ? sign + fN(delta) : sign + f$(delta);
  const good = (key === 'va') ? delta > 0 : delta < 0;
  return `<div class="kpi-delta ${good ? 'delta-neg' : 'delta-pos'}">${val} vs prior</div>`;
}

function monthsUntil(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr); if (isNaN(d)) return null;
  return Math.round((d - new Date()) / (1000 * 60 * 60 * 24 * 30.44) * 10) / 10;
}
