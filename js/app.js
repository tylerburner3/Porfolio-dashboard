// ════════════════════════════════════════════════════
//  app.js  —  Router, CRUD, upload, mapping, boot
// ════════════════════════════════════════════════════

// ── Routing ───────────────────────────────────────────
function go(view, pid, to) {
  S.view = view; S.pid = pid || null; S.to = to || null;
  render();
}

function render() {
  const main = document.getElementById('main');
  const bc   = document.getElementById('breadcrumb');
  const nc   = document.getElementById('nav-ctx');
  const cnt  = document.getElementById('prog-count');
  const st   = document.getElementById('subbar-tag');

  cnt.textContent = Object.keys(S.programs).length + ' Program' + (Object.keys(S.programs).length !== 1 ? 's' : '');

  if (S.view === 'portfolio') {
    nc.textContent = 'Portfolio View';
    bc.innerHTML   = `<a onclick="go('portfolio')" class="bc-active">Portfolio</a>`;
    if (st) st.textContent = 'All Programs';
    main.innerHTML = renderPortfolio();
  }
  else if (S.view === 'program') {
    const p = S.programs[S.pid];
    nc.textContent = p.meta.name;
    bc.innerHTML   = `<a onclick="go('portfolio')">Portfolio</a><span class="bc-sep">/</span><span class="bc-active">${p.meta.name}</span>`;
    if (st) st.textContent = p.meta.contract || p.meta.name;
    main.innerHTML = renderProgram(S.pid);
    // Wire tabs after DOM has fully painted
    requestAnimationFrame(() => wireTabs());
  }
  else if (S.view === 'to') {
    const p = S.programs[S.pid];
    nc.textContent = p.meta.name;
    bc.innerHTML   = `<a onclick="go('portfolio')">Portfolio</a><span class="bc-sep">/</span><a onclick="go('program','${S.pid}')">${p.meta.name}</a><span class="bc-sep">/</span><span class="bc-active">${S.to}</span>`;
    if (st) st.textContent = S.to;
    main.innerHTML = renderTO(S.pid, S.to);
  }
}

// Wire tab navigation — called every time program view renders
function wireTabs() {
  const nav = document.getElementById('prog-tab-nav');
  if (!nav) return;
  // Remove any existing listeners by cloning
  nav.querySelectorAll('.tab-btn').forEach(btn => {
    // Use onclick attribute so it survives re-renders
    btn.onclick = function() {
      nav.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
      this.classList.add('active');
      const pane = document.getElementById('tp-' + this.dataset.tab);
      if (pane) {
        pane.classList.add('active');
      } else {
        console.warn('Tab pane not found: tp-' + this.dataset.tab);
      }
    };
  });
}

// ── Contract type setter ──────────────────────────────
function setCtType(id, ct) {
  if (!S.programs[id]) return;
  S.programs[id].meta.ctType = ct;
  persist(); render();
}

// ── Drop zone ─────────────────────────────────────────
let _addFile = null, _editFile = null, _mapSheetsCurrent = null;

function setupDZ(dzId, onFile) {
  const el = document.getElementById(dzId); if (!el) return;
  el._onFile = onFile;
  el.addEventListener('dragover',  e => { e.preventDefault(); el.classList.add('drag-over'); });
  el.addEventListener('dragleave', ()  => el.classList.remove('drag-over'));
  el.addEventListener('drop', e => {
    e.preventDefault(); el.classList.remove('drag-over');
    const f = e.dataTransfer.files[0]; if (f) handleDroppedFile(f, dzId, onFile);
  });
}

function triggerFile(dzId) {
  const hi = document.getElementById('hidden-file');
  hi._dzId = dzId; hi.value = '';
  hi.onchange = () => {
    const f = hi.files[0]; if (!f) return;
    const el = document.getElementById(dzId);
    handleDroppedFile(f, dzId, el?._onFile);
  };
  hi.click();
}

async function handleDroppedFile(file, dzId, cb) {
  if (!file.name.match(/\.(xlsx|xls)$/i)) {
    setDZStatus(dzId, '<span style="color:var(--red)">✗ Please upload an .xlsx or .xls file</span>');
    return;
  }
  setDZStatus(dzId, '<span style="color:var(--dim)">⟳ Reading workbook…</span>');
  try {
    const sheets  = await parseFile(file);
    const toCount = Object.keys(sheets).filter(n => !isSumTab(n)).length;
    const suCount = Object.keys(sheets).filter(n =>  isSumTab(n)).length;
    let msg = `✓ ${file.name} — ${toCount} task order tab${toCount!==1?'s':''}`;
    if (suCount) msg += `, ${suCount} summary tab${suCount>1?'s':''} detected`;
    msg += ' · Review column mapping below';
    setDZStatus(dzId, `<span style="color:var(--green)">${msg}</span>`);

    // Show column mapping panel
    _mapSheetsCurrent = sheets;
    const mapAreaId = dzId === 'ap-dz' ? 'ap-map-area' : 'ep-map-area';
    const mapArea   = document.getElementById(mapAreaId);
    if (mapArea) mapArea.innerHTML = renderMapPanel(sheets, Object.keys(sheets)[0]);

    if (cb) cb(sheets, file.name);
  } catch(e) {
    setDZStatus(dzId, `<span style="color:var(--red)">✗ Error: ${escH(e.message)}</span>`);
  }
}

function setDZStatus(dzId, html) {
  const s = document.getElementById(dzId + '-status');
  if (s) s.innerHTML = html;
}

// ── Column mapping UI ─────────────────────────────────
function renderMapPanel(sheets, active) {
  const names = Object.keys(sheets); if (!names.length) return '';

  // Initialise pending state for each sheet
  names.forEach(n => {
    if (!pendingRoles[n]) pendingRoles[n] = isSumTab(n) ? 'summary' : 'to';
    if (!pendingMaps[n])  pendingMaps[n]  = isSumTab(n) ? autoMapSummary(sheets[n]) : autoMap(sheets[n]);
  });

  const tabs = names.map(n => {
    const role = pendingRoles[n] || 'to';
    const rspan = `<span class="map-tab-role role-${role}">${role==='to'?'TO':role==='summary'?'SUM':'SKIP'}</span>`;
    return `<button class="map-tab ${isSumTab(n)?'summary-tab':''} ${n===active?'active':''}"
              onclick="switchMapTab('${n.replace(/'/g,"\\'")}',this)">${escH(n)}${rspan}</button>`;
  }).join('');

  const rows  = sheets[active] || [];
  const keys  = rows.length ? Object.keys(rows[0]) : [];
  const role  = pendingRoles[active] || (isSumTab(active) ? 'summary' : 'to');
  const isSum = role === 'summary';
  const map   = pendingMaps[active] || {};
  const defs  = isSum ? [
    { key:'projNum',   label:'Project # / Task Order' },
    { key:'desc',      label:'Description'            },
    { key:'funded',    label:'Funded Value (Budget) *'},
    { key:'expended',  label:'Expended (Actuals) *'   },
    { key:'balance',   label:'Balance'                },
    { key:'pctExp',    label:'Percent Expended'        },
    { key:'eac',       label:'EAC (optional)'         },
    { key:'variance',  label:'Variance (optional)'    },
    { key:'popStart',  label:'PoP Start (optional)'   },
    { key:'popEnd',    label:'PoP End (optional)'     },
  ] : COL_FIELDS;

  const det  = defs.filter(f => !!map[f.key]).length;
  const status = `<div style="font-size:11px;color:var(--tx3);margin-bottom:10px">
    Detected <strong>${det}/${defs.length}</strong> columns · ${keys.length} columns in sheet
    ${isSum ? '<span style="color:var(--amber);margin-left:8px">Summary/roll-up tab — confirm mapping below</span>' : ''}
    ${det < defs.length ? ' · <span style="color:var(--amber)">Unresolved columns in amber</span>' : ''}
  </div>`;

  const roleRow = `
  <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;padding:8px 10px;background:var(--s2);border-radius:var(--r);border:1px solid var(--bd);flex-wrap:wrap">
    <span style="font-family:var(--f-display);font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--tx3)">Tab Role:</span>
    ${['to','summary','skip'].map(rv => `
      <label style="display:flex;align-items:center;gap:5px;cursor:pointer;font-size:12px;color:var(--tx2)">
        <input type="radio" name="role-${active.replace(/\W/g,'_')}" value="${rv}"
               ${role===rv?'checked':''} onchange="setTabRole('${active.replace(/'/g,"\\'")}','${rv}')"
               style="accent-color:var(--blue)">
        ${rv==='to'?'Task Order (parse financials)':rv==='summary'?'Summary / Roll-up (reconcile)':'Skip (ignore)'}
      </label>`).join('')}
  </div>`;

  const fieldRows = defs.map(f => {
    const cur = map[f.key] || '';
    const cls = cur ? 'detected' : 'unresolved';
    const opts = `<option value="">— not mapped —</option>` +
      keys.map(k => `<option value="${escH(k)}" ${cur===k?'selected':''}>${escH(k)}</option>`).join('');
    return `<div class="map-row">
      <label>${f.label}</label>
      <select class="${cls}" onchange="setColMap('${active.replace(/'/g,"\\'")}','${f.key}',this.value);this.className=this.value?'detected':'unresolved'">${opts}</select>
    </div>`;
  }).join('');

  return `
  <div class="map-panel" style="margin-top:10px">
    <div class="map-hdr">
      <span class="map-hdr-title">Column Mapping &amp; Sheet Roles — ${names.length} sheet${names.length!==1?'s':''} found</span>
    </div>
    <div class="map-tab-bar">${tabs}</div>
    <div class="map-body">
      ${roleRow}
      ${role !== 'skip' ? status + '<div class="map-grid">' + fieldRows + '</div>'
                        : '<div style="font-size:11px;color:var(--dim);padding:8px 0">This tab will be ignored during import.</div>'}
    </div>
  </div>`;
}

function switchMapTab(name) {
  if (!_mapSheetsCurrent) return;
  const cId = editId ? 'ep-map-area' : 'ap-map-area';
  const el  = document.getElementById(cId);
  if (el) el.innerHTML = renderMapPanel(_mapSheetsCurrent, name);
}

function setTabRole(name, role) {
  pendingRoles[name] = role;
  if (_mapSheetsCurrent) {
    const cId = editId ? 'ep-map-area' : 'ap-map-area';
    const el  = document.getElementById(cId);
    if (el) el.innerHTML = renderMapPanel(_mapSheetsCurrent, name);
  }
}

function setColMap(sheet, field, col) {
  if (!pendingMaps[sheet]) pendingMaps[sheet] = {};
  pendingMaps[sheet][field] = col;
}

// ── Add Program ───────────────────────────────────────
let editId = null;

function openAdd() {
  _addFile = null; _mapSheetsCurrent = null;
  ['ap-name','ap-contract','ap-customer','ap-pop'].forEach(i => { const el = document.getElementById(i); if (el) el.value = ''; });
  const ma = document.getElementById('ap-map-area'); if (ma) ma.innerHTML = '';
  setDZStatus('ap-dz', '');
  openModal('modal-add');
  setTimeout(() => setupDZ('ap-dz', (s, n) => { _addFile = { sheets:s, fname:n }; }), 60);
}

async function confirmAdd() {
  const name = document.getElementById('ap-name').value.trim();
  if (!name) { toast('Program name is required', 'err'); return; }

  const id   = 'prog_' + Date.now();
  const meta = {
    name,
    contract    : document.getElementById('ap-contract').value.trim(),
    customer    : document.getElementById('ap-customer').value.trim(),
    pop         : document.getElementById('ap-pop').value.trim(),
    ctType      : document.getElementById('ap-cttype')?.value || 'OTHER',
    lastUpdated : null,
    lastFile    : null,
  };

  S.programs[id] = { meta, sheets:null, mappings:{}, roles:{}, prevData:null, uploads:[], pmData:{} };

  if (_addFile) {
    Object.keys(_addFile.sheets).forEach(n => {
      S.programs[id].mappings[n] = pendingMaps[n] || (isSumTab(n) ? autoMapSummary(_addFile.sheets[n]) : autoMap(_addFile.sheets[n]));
      S.programs[id].roles[n]    = pendingRoles[n] || (isSumTab(n) ? 'summary' : 'to');
    });
    applyUpload(id, _addFile.sheets, _addFile.fname);
  }

  persist();
  closeModal('modal-add');
  toast(_addFile ? `Program added — ${Object.keys(_addFile.sheets).filter(n => S.programs[id].roles[n] !== 'skip').length} sheets loaded` : 'Program added');
  _addFile = null; _mapSheetsCurrent = null;
  render();
}

// ── Edit Program ──────────────────────────────────────
function openEdit(id) {
  editId = id; _editFile = null; _mapSheetsCurrent = null;
  const p = S.programs[id].meta;
  const tt = document.getElementById('edit-modal-title'); if (tt) tt.textContent = 'Edit: ' + p.name;
  document.getElementById('ep-name').value     = p.name;
  document.getElementById('ep-contract').value = p.contract || '';
  document.getElementById('ep-customer').value = p.customer || '';
  document.getElementById('ep-pop').value      = p.pop      || '';
  const epCt = document.getElementById('ep-cttype'); if (epCt) epCt.value = p.ctType || 'OTHER';

  const ma = document.getElementById('ep-map-area'); if (ma) ma.innerHTML = '';
  setDZStatus('ep-dz', '');

  // Upload history
  const hist = S.programs[id].uploads || [];
  const he   = document.getElementById('ep-hist-area');
  if (he && hist.length) {
    he.innerHTML = `
      <div style="margin-top:12px">
        <div class="section-header" style="margin-bottom:8px"><span class="section-title" style="font-size:10px">Upload History</span><div class="section-rule"></div></div>
        <div class="upload-history">
          ${hist.slice().reverse().slice(0,3).map((u,i) => `
            <div class="upload-entry">
              <span class="ue-name">${u.filename}</span>
              <span class="ue-meta">${u.date}</span>
              ${i===0?'<span class="ue-badge badge-green">Current</span>':''}
            </div>`).join('')}
        </div>
      </div>`;
  } else if (he) he.innerHTML = '';

  openModal('modal-edit');
  setTimeout(() => setupDZ('ep-dz', (s, n) => { _editFile = { sheets:s, fname:n }; }), 60);
}

async function confirmEdit() {
  if (!editId || !S.programs[editId]) return;
  const prog = S.programs[editId];
  prog.meta.name     = document.getElementById('ep-name').value.trim()     || prog.meta.name;
  prog.meta.contract = document.getElementById('ep-contract').value.trim();
  prog.meta.customer = document.getElementById('ep-customer').value.trim();
  prog.meta.pop      = document.getElementById('ep-pop').value.trim();
  prog.meta.ctType   = document.getElementById('ep-cttype')?.value || prog.meta.ctType || 'OTHER';

  if (_editFile) {
    Object.keys(_editFile.sheets).forEach(n => {
      prog.mappings[n] = pendingMaps[n] || (isSumTab(n) ? autoMapSummary(_editFile.sheets[n]) : autoMap(_editFile.sheets[n]));
      prog.roles[n]    = pendingRoles[n] || (isSumTab(n) ? 'summary' : 'to');
    });
    applyUpload(editId, _editFile.sheets, _editFile.fname);
    toast('Data updated');
  } else {
    toast('Metadata saved');
  }

  persist(); closeModal('modal-edit');
  _editFile = null; _mapSheetsCurrent = null;
  render();
}

function applyUpload(id, sheets, fname) {
  const prog = S.programs[id];
  prog.prevData = prog.sheets
    ? { sheets: JSON.parse(JSON.stringify(prog.sheets)), mappings: {...prog.mappings}, roles: {...prog.roles} }
    : null;
  prog.sheets           = sheets;
  prog.meta.lastUpdated = new Date().toLocaleString();
  prog.meta.lastFile    = fname;
  if (!prog.uploads) prog.uploads = [];
  const toC  = Object.keys(sheets).filter(n => (prog.roles[n]||'to') === 'to').length;
  const rowC = Object.values(sheets).reduce((s,r) => s + r.length, 0);
  prog.uploads.push({ filename:fname, date:new Date().toLocaleString(), tos:toC, rows:rowC });
  if (prog.uploads.length > 10) prog.uploads = prog.uploads.slice(-10);
}

function deleteProgram() {
  if (!confirm('Delete this program? All data will be permanently removed.')) return;
  delete S.programs[editId];
  persist(); closeModal('modal-edit'); go('portfolio');
}

// ── CSV Export ────────────────────────────────────────
function exportCSV(id) {
  const prog = S.programs[id]; if (!prog.sheets) return;
  const c = calcProg(prog);
  const rows = [['Task Order','Budget Hours','Actual Hours','Remaining Hours','Budget Labor','Actual Labor','Budget ODC','Actual ODC','Fee','Total Budget','Total Actuals','EAC','Variance','Burn %','Status']];
  Object.entries(c.tos).forEach(([n,t]) => {
    const [,bt] = hbdg(t.bp, t.va);
    rows.push([n, t.bH||'', t.aH||'', t.hR||'', t.bL, t.aL, t.bO||'', t.aO||'', t.fee||'', t.tb, t.ta, t.eac, t.va, (t.bp*100).toFixed(1)+'%', bt]);
  });
  rows.push(['TOTAL','','','', c.bL, c.aL, c.bO||'', c.aO||'', c.fee||'', c.tb, c.ta, c.eac, c.va, (c.bp*100).toFixed(1)+'%','']);
  dlCSV(rows, prog.meta.name.replace(/\s+/g,'_') + '_summary.csv');
  toast('CSV exported', 'ok');
}

function exportTOCSV(id, n) {
  const prog = S.programs[id]; if (!prog.sheets?.[n]) return;
  const rows = prog.sheets[n]; if (!rows.length) return;
  const h = Object.keys(rows[0]);
  dlCSV([h, ...rows.map(r => h.map(k => r[k]))], n.replace(/\s+/g,'_') + '_detail.csv');
  toast('Exported', 'ok');
}

function dlCSV(rows, filename) {
  const csv = rows.map(r => r.map(v => `"${String(v??'').replace(/"/g,'""')}"`).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type:'text/csv' }));
  a.download = filename; a.click();
}

// ── Modals ────────────────────────────────────────────
function openModal(id)  { document.getElementById(id)?.classList.add('open'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.overlay').forEach(m => {
    m.addEventListener('click', e => { if (e.target === m) m.classList.remove('open'); });
  });
});

// ── Toast ─────────────────────────────────────────────
let _toastTimer;
function toast(msg, type = '') {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className   = 'show' + (type ? ' toast-' + type : '');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => t.className = '', 3500);
}

// ── Boot ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Live date in topbar
  const dateEl = document.getElementById('topbar-date');
  if (dateEl) dateEl.textContent = new Date().toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric', year:'numeric' }).toUpperCase();

  hydrate();
  render();
});
