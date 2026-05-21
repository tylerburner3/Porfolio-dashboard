// ════════════════════════════════════════════════════
//  render-tabs.js  —  Program detail tab renderers
// ════════════════════════════════════════════════════

// ── Management Review ─────────────────────────────────
function renderMgmtTab(id) {
  const ensureArr = v => Array.isArray(v) ? v : [];
  const kpArr = ensureArr(getPmField(id, 'mgmt', 'keyPoints', []));
  const msArr = ensureArr(getPmField(id, 'mgmt', 'milestones', []));
  const hnArr = ensureArr(getPmField(id, 'mgmt', 'helpNeeded', []));

  const kpRows = kpArr.map((t, i) => `
    <div class="review-item">
      <span class="review-item-num">${i+1}</span>
      <div class="review-item-text" contenteditable="true"
           onblur="updateListItem('${id}','mgmt','keyPoints',${i},this.innerText)">${escH(t)}</div>
      <button class="review-item-del" onclick="removeListItem('${id}','mgmt','keyPoints',${i})">×</button>
    </div>`).join('');

  const msRows = msArr.map((m, i) => `
    <tr>
      <td><span class="editable" contenteditable="true" onblur="updateMilestone('${id}',${i},'title',this.innerText)">${escH(m.title||'')}</span></td>
      <td><span class="editable" contenteditable="true" onblur="updateMilestone('${id}',${i},'date',this.innerText)">${escH(m.date||'')}</span></td>
      <td><span class="editable" contenteditable="true" onblur="updateMilestone('${id}',${i},'status',this.innerText)">${escH(m.status||'Pending')}</span></td>
      <td><button style="background:none;border:none;color:var(--dim);cursor:pointer;font-size:14px" onclick="removeMilestone('${id}',${i})">×</button></td>
    </tr>`).join('');

  const hnRows = hnArr.map((t, i) => `
    <div class="review-item">
      <span class="review-item-num">${i+1}</span>
      <div class="review-item-text" contenteditable="true"
           onblur="updateListItem('${id}','mgmt','helpNeeded',${i},this.innerText)">${escH(t)}</div>
      <button class="review-item-del" onclick="removeListItem('${id}','mgmt','helpNeeded',${i})">×</button>
    </div>`).join('');

  return `
  <div style="display:flex;flex-direction:column;gap:16px">
    <div class="card">
      <div class="card-header"><span class="card-title">Key Points This Reporting Period <span class="save-dot"></span></span></div>
      <div class="card-body">
        <div class="review-list">${kpRows || '<div style="color:var(--dim);font-size:12px;font-style:italic">No key points added yet.</div>'}</div>
        <button class="add-row-btn" onclick="addListItem('${id}','mgmt','keyPoints')">+ Add Key Point</button>
      </div>
    </div>
    <div class="card">
      <div class="card-header"><span class="card-title">Upcoming Milestones</span></div>
      <div class="card-body">
        <div class="tbl-wrap">
          <table class="milestone">
            <thead><tr><th>Milestone</th><th>Target Date</th><th>Status</th><th></th></tr></thead>
            <tbody>${msRows || '<tr><td colspan="4" style="color:var(--dim);font-style:italic;padding:12px">No milestones added yet.</td></tr>'}</tbody>
          </table>
        </div>
        <button class="add-row-btn" onclick="addMilestone('${id}')">+ Add Milestone</button>
      </div>
    </div>
    <div class="card">
      <div class="card-header"><span class="card-title">Help Needed</span></div>
      <div class="card-body">
        <div class="review-list">${hnRows || '<div style="color:var(--dim);font-size:12px;font-style:italic">No items added yet.</div>'}</div>
        <button class="add-row-btn" onclick="addListItem('${id}','mgmt','helpNeeded')">+ Add Item</button>
      </div>
    </div>
  </div>`;
}

// ── Staffing ──────────────────────────────────────────
function renderStaffingTab(id) {
  const g = (k, d) => getPmField(id, 'staffing', k, d);
  const positions = (() => {
    const p = getPmField(id, 'staffing', 'positions', []);
    return Array.isArray(p) ? p : [];
  })();

  const posRows = positions.map((p, i) => `
    <tr>
      <td><span class="editable" contenteditable="true" onblur="updatePosition('${id}',${i},'title',this.innerText)">${escH(p.title||'')}</span></td>
      <td><span class="editable" contenteditable="true" onblur="updatePosition('${id}',${i},'lcat',this.innerText)">${escH(p.lcat||'')}</span></td>
      <td><span class="editable" contenteditable="true" onblur="updatePosition('${id}',${i},'status',this.innerText)">${escH(p.status||'Recruiting')}</span></td>
      <td><span class="editable" contenteditable="true" onblur="updatePosition('${id}',${i},'date',this.innerText)">${escH(p.date||'')}</span></td>
      <td><button style="background:none;border:none;color:var(--dim);cursor:pointer;font-size:14px" onclick="removePosition('${id}',${i})">×</button></td>
    </tr>`).join('');

  const statFields = [
    ['totalFTE',      'Total FTE (Fully Staffed)',   '—'],
    ['currentFTE',    'Current FTE on Contract',      '—'],
    ['openPositions', 'Open Positions',               '0'],
    ['arrivals',      'Arrivals This Period',          '0'],
    ['departures',    'Departures This Period',        '0'],
    ['utilization',   'Utilization %',                '—'],
  ];

  return `
  <div style="display:flex;flex-direction:column;gap:16px">
    <div class="card">
      <div class="card-header">
        <span class="card-title">Staffing Summary <span class="save-dot"></span></span>
        <span style="font-family:var(--f-mono);font-size:10px;color:rgba(255,255,255,.45)">ICMS API — future integration</span>
      </div>
      <div class="card-body">
        <div class="staffing-grid" style="margin-bottom:16px">
          ${statFields.map(([k, lbl, def]) => `
            <div class="staff-stat">
              <div class="staff-stat-lbl">${lbl}</div>
              <div class="staff-stat-val">
                <span contenteditable="true"
                      onblur="savePmField('${id}','staffing','${k}',this.innerText);schedSave()">${escH(g(k, def))}</span>
              </div>
            </div>`).join('')}
        </div>
        <div class="field">
          <label>Staffing Narrative</label>
          <textarea class="comment-box" rows="5"
                    placeholder="Current staffing status, hiring pipeline, key personnel notes…"
                    onblur="savePmField('${id}','staffing','narrative',this.value);schedSave()">${escH(g('narrative',''))}</textarea>
        </div>
      </div>
    </div>
    <div class="card">
      <div class="card-header"><span class="card-title">Open Positions</span></div>
      <div class="card-body">
        <div class="tbl-wrap">
          <table class="milestone">
            <thead><tr><th>Position Title</th><th>Labor Cat</th><th>Status</th><th>Target Date</th><th></th></tr></thead>
            <tbody>${posRows || '<tr><td colspan="5" style="color:var(--dim);font-style:italic;padding:12px">No open positions added.</td></tr>'}</tbody>
          </table>
        </div>
        <button class="add-row-btn" onclick="addPosition('${id}')">+ Add Position</button>
      </div>
    </div>
  </div>`;
}

// ── Quality ───────────────────────────────────────────
function renderQualityTab(id) {
  const kpis = (() => { const k = getPmField(id, 'quality', 'kpis', []); return Array.isArray(k) ? k : []; })();
  const narrative = getPmField(id, 'quality', 'narrative', '');

  const cards = kpis.map((k, i) => `
    <div class="kpi-track-card">
      <div class="kpi-track-name">
        <span contenteditable="true" onblur="updateKpiField('${id}',${i},'name',this.innerText)">${escH(k.name||'KPI Name')}</span>
      </div>
      <div class="kpi-track-vals">
        <div class="kpi-track-val">
          <label>Target</label>
          <div class="v"><span contenteditable="true" onblur="updateKpiField('${id}',${i},'target',this.innerText)">${escH(k.target||'—')}</span></div>
        </div>
        <div class="kpi-track-val">
          <label>Current</label>
          <div class="v" style="color:${k.status==='red'?'var(--red)':k.status==='amber'?'var(--amber)':'var(--green)'}">
            <span contenteditable="true" onblur="updateKpiField('${id}',${i},'current',this.innerText)">${escH(k.current||'—')}</span>
          </div>
        </div>
      </div>
      <div class="kpi-track-status">
        <span contenteditable="true" onblur="updateKpiField('${id}',${i},'notes',this.innerText)">${escH(k.notes||'')}</span>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px">
        <div style="display:flex;gap:4px">
          ${['green','amber','red'].map(c => `
            <button title="${c}" onclick="updateKpiField('${id}',${i},'status','${c}');renderKpiStatus('${id}')"
              style="width:16px;height:16px;border-radius:50%;border:2px solid ${k.status===c?'var(--'+c+')':'var(--bd)'};background:var(--${c}-bg);cursor:pointer;padding:0">
            </button>`).join('')}
        </div>
        <button style="background:none;border:none;color:var(--dim);cursor:pointer;font-size:14px" onclick="removeKpi('${id}',${i})">×</button>
      </div>
    </div>`).join('');

  return `
  <div style="display:flex;flex-direction:column;gap:16px">
    <div class="card">
      <div class="card-header"><span class="card-title">Quality KPIs <span class="save-dot"></span></span></div>
      <div class="card-body">
        <div class="kpi-track-grid" id="kpi-track-grid-${id}">
          ${cards || '<div style="color:var(--dim);font-size:12px;font-style:italic">No KPIs added yet.</div>'}
        </div>
        <button class="add-row-btn" onclick="addKpi('${id}')">+ Add KPI</button>
      </div>
    </div>
    <div class="card">
      <div class="card-header"><span class="card-title">Quality Narrative</span></div>
      <div class="card-body">
        <textarea class="comment-box" rows="5"
                  placeholder="Quality summary, audit findings, corrective actions…"
                  onblur="savePmField('${id}','quality','narrative',this.value);schedSave()">${escH(narrative)}</textarea>
      </div>
    </div>
  </div>`;
}

function renderKpiStatus(id) {
  // Lightweight re-render of just the KPI grid without full page reload
  const el = document.getElementById('kpi-track-grid-' + id);
  if (el) {
    const kpis = (() => { const k = getPmField(id,'quality','kpis',[]); return Array.isArray(k)?k:[]; })();
    schedSave();
    // Re-render inline
    const tmp = document.createElement('div');
    tmp.innerHTML = renderQualityTab(id);
    const newGrid = tmp.querySelector('#kpi-track-grid-' + id);
    if (newGrid) el.innerHTML = newGrid.innerHTML;
  }
}

// ── Risk & Opportunities ──────────────────────────────
function renderRiskTab(id) {
  const items = (() => { const r = getPmField(id,'risk','items',[]); return Array.isArray(r)?r:[]; })();

  const rows = items.map((r, i) => `
    <tr>
      <td>
        <span class="risk-badge risk-${r.type==='opportunity'?'opp':r.level||'med'}">${r.type==='opportunity'?'OPP':(r.level||'MED').toUpperCase()}</span>
      </td>
      <td><span contenteditable="true" onblur="updateRisk('${id}',${i},'title',this.innerText)">${escH(r.title||'')}</span></td>
      <td style="font-size:11px"><span contenteditable="true" onblur="updateRisk('${id}',${i},'impact',this.innerText)">${escH(r.impact||'')}</span></td>
      <td style="font-size:11px"><span contenteditable="true" onblur="updateRisk('${id}',${i},'mitigation',this.innerText)">${escH(r.mitigation||'')}</span></td>
      <td style="font-size:11px"><span contenteditable="true" onblur="updateRisk('${id}',${i},'owner',this.innerText)">${escH(r.owner||'')}</span></td>
      <td><button style="background:none;border:none;color:var(--dim);cursor:pointer;font-size:14px" onclick="removeRisk('${id}',${i})">×</button></td>
    </tr>`).join('');

  return `
  <div class="card">
    <div class="card-header"><span class="card-title">Risk Register &amp; Opportunities <span class="save-dot"></span></span></div>
    <div class="card-body">
      <div class="tbl-wrap">
        <table class="data-table">
          <thead><tr><th>Level</th><th>Title / Description</th><th>Impact</th><th>Mitigation / Action</th><th>Owner</th><th></th></tr></thead>
          <tbody>${rows || '<tr><td colspan="6" style="text-align:center;color:var(--dim);font-style:italic;padding:20px">No risks or opportunities added yet.</td></tr>'}</tbody>
        </table>
      </div>
      <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
        <button class="add-row-btn" onclick="addRisk('${id}','risk','high')">+ High Risk</button>
        <button class="add-row-btn" onclick="addRisk('${id}','risk','med')">+ Med Risk</button>
        <button class="add-row-btn" onclick="addRisk('${id}','risk','low')">+ Low Risk</button>
        <button class="add-row-btn" style="color:var(--blue);border-color:rgba(66,134,244,.4)" onclick="addRisk('${id}','opportunity','med')">+ Opportunity</button>
      </div>
    </div>
  </div>`;
}

// ── Customer Visits ───────────────────────────────────
function renderVisitsTab(id) {
  const visits = (() => { const v = getPmField(id,'visits','list',[]); return Array.isArray(v)?v:[]; })();

  const cards = visits.map((v, i) => `
    <div class="visit-card">
      <div class="visit-header">
        <span class="visit-date">
          <span contenteditable="true" onblur="updateVisit('${id}',${i},'date',this.innerText)">${escH(v.date||'Date')}</span>
        </span>
        <span class="visit-type" style="color:${v.type==='site'?'var(--blue)':v.type==='telecon'?'var(--tac)':'var(--dim)'}">
          <span contenteditable="true" onblur="updateVisit('${id}',${i},'type',this.innerText)">${escH(v.type||'Visit')}</span>
        </span>
        <button style="background:none;border:none;color:var(--dim);cursor:pointer;margin-left:auto" onclick="removeVisit('${id}',${i})">×</button>
      </div>
      <div class="visit-org">
        <span contenteditable="true" onblur="updateVisit('${id}',${i},'org',this.innerText)">${escH(v.org||'Organization / Attendees')}</span>
      </div>
      <div class="visit-notes">
        <span contenteditable="true" onblur="updateVisit('${id}',${i},'notes',this.innerText)">${escH(v.notes||'Key discussion points, action items, outcomes…')}</span>
      </div>
    </div>`).join('');

  return `
  <div class="card">
    <div class="card-header"><span class="card-title">Customer Visit Tracker <span class="save-dot"></span></span></div>
    <div class="card-body">
      <div class="visit-list">
        ${cards || '<div style="color:var(--dim);font-size:12px;font-style:italic;padding:8px 0">No visits recorded yet.</div>'}
      </div>
      <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
        <button class="add-row-btn" onclick="addVisit('${id}','site')">+ Site Visit</button>
        <button class="add-row-btn" onclick="addVisit('${id}','telecon')">+ Telecon / VTC</button>
        <button class="add-row-btn" onclick="addVisit('${id}','review')">+ Program Review</button>
      </div>
    </div>
  </div>`;
}

// ── Run-Out & EAC tab ─────────────────────────────────
function renderProjTab(id) {
  const c = calcProg(S.programs[id]);
  const tos = Object.keys(c.tos);
  const rows = tos.map(n => {
    const t = c.tos[n], rem = t.tb - t.ta, mb = t.ta > 0 ? t.ta / 12 : 0;
    return `<tr onclick="go('to','${id}','${n.replace(/'/g,"\\'")}')">
      <td><strong>${n}</strong></td>
      <td class="r">${f$(t.tb)}</td>
      <td class="r">${f$(t.ta)}</td>
      <td class="r">${f$(rem)}</td>
      <td class="r">${mb > 0 ? f$(mb)+'/mo' : '—'}</td>
      <td class="r">${t.runOut !== null ? t.runOut.toFixed(1)+' mo' : '—'}</td>
      <td class="r" style="color:${t.eac>t.tb?'var(--red)':'var(--green)'}">${f$(t.eac)}</td>
      <td class="r" style="color:${t.va>=0?'var(--green)':'var(--red)'}">${f$(t.va)}</td>
      <td class="r">${fP(t.bp)}</td>
    </tr>`;
  }).join('');

  return `
  <div class="tbl-card">
    <div class="tbl-header"><span class="tbl-header-title">Run-Out Projections &amp; EAC by Task Order</span></div>
    <div class="tbl-wrap">
      <table class="data-table">
        <thead><tr>
          <th>Task Order</th><th class="r">Total Budget</th><th class="r">Actuals</th>
          <th class="r">Remaining</th><th class="r">Monthly Burn</th><th class="r">Est. Run-Out</th>
          <th class="r">EAC</th><th class="r">Variance</th><th class="r">% Burned</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  </div>
  <div style="font-size:11px;color:var(--tx3);margin-top:8px;line-height:1.7">
    <strong>EAC:</strong> Actuals + ETC Labor + Remaining ODC + Fee.
    <strong>Run-Out:</strong> Remaining funds ÷ avg monthly burn (actuals ÷ 12 as proxy).
  </div>`;
}

// ── Upload history tab ────────────────────────────────
function renderHistTab(id) {
  const uploads = S.programs[id].uploads || [];
  if (!uploads.length) return '<div style="color:var(--dim);font-size:12px;font-style:italic;padding:12px">No upload history recorded yet.</div>';
  return `<div class="upload-history">
    ${uploads.slice().reverse().map((u, i) => `
      <div class="upload-entry">
        <svg class="ue-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        <span class="ue-name">${u.filename}</span>
        <span class="ue-meta">${u.tos} TOs · ${u.rows} rows · ${u.date}</span>
        ${i === 0 ? '<span class="ue-badge badge-green">Current</span>' : ''}
      </div>`).join('')}
  </div>`;
}
