// ════════════════════════════════════════════════════
//  parser.js  —  Excel parsing & column detection
// ════════════════════════════════════════════════════

// ── Summary tab name patterns ─────────────────────────
const SUM_TAB_PATS = [
  'summary','roll.?up','rollup','total','consolidated',
  'overview','contract.*summary','program.*summary','financial.*summary',
];
const isSumTab = n => SUM_TAB_PATS.some(p => new RegExp(p, 'i').test(n));

// ── Column patterns for DETAIL tabs ──────────────────
const DETAIL_COL_PATS = {
  label: ['wbs.*element','wbs.*desc','project.*line','clin','task.*desc','category','wbs','description','item.*desc','work.*element','line.*item','element','task','name','item','line'],
  bH:   ['budget.?hour','authorized.*hour','planned.*hour','ceiling.*hour','budg.*hrs','hrs.*budget','bud.*hrs','hour.*budget','target.*hours'],
  aH:   ['actual.?hour','hours.*expend','labor.*hour.*actual','hrs.*to.*date','act.*hr','hour.*actual','hrs.*actual'],
  bL:   ['budget.*labor.*cost','authorized.*labor','planned.*labor.*cost','labor.*ceiling','labor.*budget','budget.*labor','budg.*labor','bud.*lab'],
  aL:   ['actual.*labor.*cost','labor.*cost.*to.*date','labor.*expend','act.*labor.*cost','labor.*actual','actual.*labor','act.*labor'],
  bO:   ['budget.*odc','budg.*odc','authorized.*odc','planned.*odc','budget.*material','budg.*mat','odc.*budget','odc.*ceiling'],
  aO:   ['actual.*odc','odc.*to.*date','odc.*expend','odc.*incurred','act.*odc','actual.*material','odc.*actual'],
  fee:  ['award.*fee','fixed.*fee','fee.*budget','profit.*budget','fee.*ceiling','fee.*authorized','fee','profit'],
  funded: ['funded.*value','contract.*value','ceiling','authorized.*amount','funded.*amount','total.*funded'],
};

// ── Column patterns for SUMMARY tabs ─────────────────
const SUM_COL_PATS = {
  projNum:  ['project.*#','project.*num','proj.*#','task.*order','clin','contract.*line','line.*item','#'],
  desc:     ['description','desc','project.*name','name','title','task.*name'],
  funded:   ['funded.*value','funded.*amount','ceiling','contract.*value','authorized.*amount','total.*funded','funded'],
  expended: ['expended','actuals','actual.*cost','costs.*to.*date','cost.*to.*date','total.*cost','total.*expend','actual.*to.*date'],
  balance:  ['balance','remaining','funds.*remaining','available','uncommitted','remaining.*balance'],
  pctExp:   ['percent.*expend','pct.*expend','%.*expend','expend.*%','percent.*complete','%.*complete','percent','pct'],
  eac:      ['eac','estimate.*at.*completion','est.*at.*comp','est.*complete'],
  variance: ['variance','var','over.*under','budget.*variance'],
  popStart: ['pop.*start','start.*date','period.*start','begin','commence'],
  popEnd:   ['pop.*end','end.*date','period.*end','expir','completion.*date','pop'],
};

// ── COL_FIELDS for mapping UI ─────────────────────────
const COL_FIELDS = [
  { key:'label', label:'Category / WBS',  hint:'Row description' },
  { key:'bH',    label:'Budget Hours',    hint:'Total budgeted hours' },
  { key:'aH',    label:'Actual Hours',    hint:'Hours expended to date' },
  { key:'bL',    label:'Budget Labor $',  hint:'Budgeted labor cost' },
  { key:'aL',    label:'Actual Labor $',  hint:'Labor cost to date' },
  { key:'bO',    label:'Budget ODC $',    hint:'Other direct costs budgeted' },
  { key:'aO',    label:'Actual ODC $',    hint:'ODC incurred to date' },
  { key:'fee',   label:'Fee / Profit $',  hint:'Fee or profit budgeted' },
];

// ── Safe number parse ─────────────────────────────────
const safeN  = v => { if (v===''||v===null||v===undefined) return null; const n = parseFloat(String(v).replace(/[$,%\s]/g,'').replace(/,/g,'')); return isNaN(n) ? null : n; };
const safeN0 = v => { const n = safeN(v); return n === null ? 0 : n; };
const escH   = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

// ── Find a column by pattern list ─────────────────────
function findCol(row, pats) {
  const keys = Object.keys(row);
  for (const p of pats) {
    const m = keys.find(k => new RegExp(p, 'i').test(k));
    if (m !== undefined) return m;
  }
  return null;
}

// ── Auto-map DETAIL tab ───────────────────────────────
function autoMap(rows) {
  if (!rows?.length) return {};
  const map = {};
  Object.entries(DETAIL_COL_PATS).forEach(([f, pats]) => {
    const m = findCol(rows[0], pats);
    if (m) map[f] = m;
  });
  // Fallback: funded → bL if no labor budget found
  if (!map.bL && map.funded) map.bL = map.funded;
  // Fallback: loose expended → aL if no labor actual found
  if (!map.aL && !map.bH) {
    const ec = Object.keys(rows[0]).find(k => /expend|actuals/i.test(k));
    if (ec) map.aL = ec;
  }
  return map;
}

// ── Auto-map SUMMARY tab ──────────────────────────────
// Handles your specific structure:
// Col1: Project# | Col2: Description | Col3: Funded Value
// Col4: Expended | Col5: Balance     | Col6: % Expended
// Col7: EAC (optional) | Col8: Variance (optional)
// Col9: PoP dates (optional)
function autoMapSummary(rows) {
  if (!rows?.length) return {};
  const keys = Object.keys(rows[0]);
  const map  = {};

  // Pattern matching first
  Object.entries(SUM_COL_PATS).forEach(([f, pats]) => {
    const m = findCol(rows[0], pats);
    if (m) map[f] = m;
  });

  // Identify numeric columns by sampling first 5 rows
  const numCols = keys.filter(k => {
    const vals = rows.slice(0, 5).map(r => safeN(r[k])).filter(v => v !== null);
    return vals.length >= 1;
  });

  // Positional fallback for your 6-column structure
  if (!map.projNum  && keys[0])     map.projNum  = keys[0];
  if (!map.desc     && keys[1])     map.desc     = keys[1];
  if (!map.funded   && numCols[0])  map.funded   = numCols[0];
  if (!map.expended && numCols[1])  map.expended = numCols[1];
  if (!map.balance  && numCols[2])  map.balance  = numCols[2];
  if (!map.pctExp   && numCols[3])  map.pctExp   = numCols[3];
  if (!map.eac      && numCols[4])  map.eac      = numCols[4];
  if (!map.variance && numCols[5])  map.variance = numCols[5];

  return map;
}

// ── Parse summary rows into structured objects ────────
function parseSummaryRows(rows, map) {
  if (!rows?.length) return { lines: [], totals: null };
  const lines = [];
  let tF = 0, tE = 0, tB = 0, foundTotalRow = false;

  rows.forEach(row => {
    const projNum  = map.projNum  ? String(row[map.projNum]  || '').trim() : '';
    const desc     = map.desc     ? String(row[map.desc]     || '').trim() : '';
    const funded   = map.funded   ? safeN(row[map.funded])   : null;
    const expended = map.expended ? safeN(row[map.expended]) : null;
    const balance  = map.balance  ? safeN(row[map.balance])  : null;
    const pctExp   = map.pctExp   ? safeN(row[map.pctExp])   : null;
    const eac      = map.eac      ? safeN(row[map.eac])      : null;
    const variance = map.variance ? safeN(row[map.variance]) : null;
    const popStart = map.popStart ? String(row[map.popStart] || '').trim() : '';
    const popEnd   = map.popEnd   ? String(row[map.popEnd]   || '').trim() : '';

    // Detect and skip total/header rows
    const combined = (projNum + desc).toLowerCase();
    if (/^(total|grand total|sum|cumulative)/i.test(combined)) {
      foundTotalRow = true;
      if (funded   !== null) tF = funded;
      if (expended !== null) tE = expended;
      if (balance  !== null) tB = balance;
      return;
    }

    // Skip completely empty rows
    if (!projNum && !desc && funded === null && expended === null) return;

    lines.push({ projNum, desc, funded, expended, balance, pctExp, eac, variance, popStart, popEnd, raw: row });
    if (funded   !== null) tF += funded;
    if (expended !== null) tE += expended;
    if (balance  !== null) tB += balance;
  });

  // If no explicit total row, compute from lines
  const totals = {
    funded:   tF,
    expended: tE,
    balance:  tB,
    pctExp:   tF > 0 ? tE / tF : null,
  };

  return { lines, totals };
}

// ── Parse Excel workbook file ─────────────────────────
function parseFile(file) {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'binary' });
        const sheets = {};
        wb.SheetNames.forEach(name => {
          const rows  = XLSX.utils.sheet_to_json(wb.Sheets[name], { defval: '' });
          const clean = rows.filter(row => Object.values(row).some(v => v !== '' && v !== 0 && v !== null));
          if (clean.length) sheets[name] = clean;
        });
        res(sheets);
      } catch(err) { rej(err); }
    };
    reader.onerror = rej;
    reader.readAsBinaryString(file);
  });
}

// ── Pending mapping state (used during upload modal) ──
const pendingMaps  = {};
const pendingRoles = {};
