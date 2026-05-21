// ════════════════════════════════════════════════════
//  render-program.js  —  Program page & TO detail
// ════════════════════════════════════════════════════

// ── Stoplights ────────────────────────────────────────
function getSlData(pid) {
  const p = S.programs[pid]; if (!p) return {};
  if (!p.pmData)              p.pmData = {};
  if (!p.pmData.stoplights)   p.pmData.stoplights = {};
  return p.pmData.stoplights;
}

function setSlColor(pid, key, color) {
  const sl = getSlData(pid);
  if (!sl[key]) sl[key] = { color:'gray', comment:'', detail:'' };
  sl[key].color = color;
  persist();
  const el = document.getElementById('sl-card-' + key);
  if (el) el.outerHTML = renderSlCard(pid, key);
}

function cycleSlColor(pid, key) {
  const sl = getSlData(pid);
  const d  = sl[key] || { color: 'gray' };
  const cycle = { gray:'green', green:'amber', amber:'red', red:'gray' };
  setSlColor(pid, key, cycle[d.color] || 'green');
}

function saveSlComment(pid, key, val) {
  const sl = getSlData(pid);
  if (!sl[key]) sl[key] = { color:'gray', comment:'', detail:'' };
  sl[key].comment = val;
  schedSave();
}

// Stoplight detail modal state
let _slPid = null, _slKey = null;

function openSlDetail(pid, key) {
  _slPid = pid; _slKey = key;
  const sl  = getSlData(pid);
  const d   = sl[key] || { color:'gray', comment:'', detail:'' };
  const cat = STOPLIGHT_CATS.find(c => c.key === key);
  document.getElementById('sl-detail-title').textContent = cat ? cat.label + ' — Detail' : 'Detail';
  document.getElementById('sl-detail-body').innerHTML = `
    <div style="display:flex;flex-direction:column;gap:14px">
      <div class="field">
        <label>Summary Comment</label>
        <textarea class="comment-box" id="sld-comment" rows="2">${escH(d.comment||'')}</textarea>
      </div>
      <div class="field">
        <label>Detailed Notes / Actions</label>
        <textarea class="comment-box" id="sld-detail" rows="6"
          placeholder="Root cause, corrective actions, responsible party, target resolution date…">${escH(d.detail||'')}</textarea>
      </div>
      <div class="field">
        <label>Status</label>
        <div style="display:flex;gap:8px">
          ${['green','amber','red'].map(c => `
            <label style="display:flex;align-items:center;gap:6px;padding:7px 14px;border:2px solid ${d.color===c?'var(--'+c+')':'var(--bd)'};border-radius:var(--r);background:${d.color===c?'var(--'+c+'-bg)':'var(--s0)'};cursor:pointer;font-family:var(--f-display);font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--${c})">
              <input type="radio" name="sld-color" value="${c}" ${d.color===c?'checked':''} style="display:none">
              ${c.charAt(0).toUpperCase()+c.slice(1)}
            </label>`).join('')}
        </div>
      </div>
    </div>`;
  openModal('modal-sl-detail');
}

function saveSlDetail() {
  if (!_slPid || !_slKey) return;
  const sl = getSlData(_slPid);
  if (!sl[_slKey]) sl[_slKey] = { color:'gray', comment:'', detail:'' };
  sl[_slKey].comment = document.getElementById('sld-comment')?.value || '';
  sl[_slKey].detail  = document.getElementById('sld-detail')?.value  || '';
  const colorEl = document.querySelector('input[name="sld-color"]:checked');
  if (colorEl) sl[_slKey].color = colorEl.value;
  persist();
  closeModal('modal-sl-detail');
  const el = document.getElementById('sl-card-' + _slKey);
  if (el) el.outerHTML = renderSlCard(_slPid, _slKey);
}

function renderSlCard(pid, key) {
  const sl  = getSlData(pid);
  const d   = sl[key] || { color:'gray', comment:'' };
  const cat = STOPLIGHT_CATS.find(c => c.key === key);
  return `
  <div class="sl-card sl-${d.color}" id="sl-card-${key}">
    <div class="sl-top">
      <span class="sl-name">${cat?.label || key}</span>
      <span class="sl-light" title="Click to cycle color" onclick="cycleSlColor('${pid}','${key}')"></span>
    </div>
    <div class="sl-comment"
         contenteditable="true"
         spellcheck="false"
         onclick="event.stopPropagation()"
         onmousedown="event.stopPropagation()"
         onblur="saveSlComment('${pid}','${key}',this.innerText.trim())"
         data-placeholder="Add comment…"
         style="${!d.comment ? 'color:var(--dim2)' : ''}"
    >${escH(d.comment || '')}</div>
    <div class="sl-footer">
      <div class="sl-controls">
        <button class="sl-btn sl-btn-g" onclick="event.stopPropagation();setSlColor('${pid}','${key}','green')" title="Green">●</button>
        <button class="sl-btn sl-btn-a" onclick="event.stopPropagation();setSlColor('${pid}','${key}','amber')" title="Amber">●</button>
        <button class="sl-btn sl-btn-r" onclick="event.stopPropagation();setSlColor('${pid}','${key}','red')"   title="Red">●</button>
      </div>
      <span class="sl-drill" ondblclick="event.stopPropagation();openSlDetail('${pid}','${key}')" title="Double-click for detail notes">⊞ Detail</span>
    </div>
  </div>`;
}

// ── Summary rollup table ──────────────────────────────
function renderSummaryRollup(id, c) {
  const sumNames = Object.keys(c.sumSheets);
  if (!sumNames.length) return `
    <div class="section">
      <div class="section-header"><span class="section-num">02</span><span class="section-title">Financial Rollup</span><div class="section-rule"></div></div>
      <div class="card card-body" style="color:var(--dim);font-size:12px;font-style:italic">
        No summary/roll-up tab detected. Add a sheet named "Summary" or "Roll-Up" with columns:
        Project #, Description, Funded Value, Expended, Balance, % Expended.
        Optional: EAC, Variance, PoP dates.
      </div>
    </div>`;

  const allLines = [];
  let tF = 0, tE = 0, tB = 0;
  sumNames.forEach(name => {
    const { parsed } = c.sumSheets[name];
    parsed.lines.forEach(l => allLines.push(l));
    tF += parsed.totals?.funded   ?? 0;
    tE += parsed.totals?.expended ?? 0;
    tB += parsed.totals?.balance  ?? 0;
  });

  const tableRows = allLines.map(line => {
    const pct = line.pctExp !== null ? line.pctExp
              : (line.funded && line.funded > 0 && line.expended !== null) ? line.expended / line.funded
              : null;
    const pctBar = pct !== null
      ? `<div style="display:flex;align-items:center;gap:6px">
           <div class="burn-bar-wrap" style="width:54px"><div class="burn-bar-fill" style="width:${(Math.min(pct,1)*100).toFixed(1)}%;background:${bcol(pct)}"></div></div>
           <span style="font-family:var(--f-mono);font-size:10px">${fP(pct)}</span>
         </div>` : '—';
    const popRange = line.popEnd
      ? (line.popStart ? line.popStart + ' – ' + line.popEnd : line.popEnd)
      : (line.popStart || '');
    const moRem = monthsUntil(line.popEnd);
    const rowStyle = moRem !== null && moRem < 3 ? 'background:rgba(192,40,46,.04)' : '';

    return `<tr style="${rowStyle}">
      <td class="mono">${escH(line.projNum||'—')}</td>
      <td>${escH(line.desc||'—')}</td>
      <td class="r">${line.funded   !== null ? f$(line.funded)   : '—'}</td>
      <td class="r">${line.expended !== null ? f$(line.expended) : '—'}</td>
      <td class="r" style="color:${line.balance!==null&&line.balance<0?'var(--red)':'inherit'}">${line.balance !== null ? f$(line.balance) : '—'}</td>
      <td class="r">${pctBar}</td>
      <td class="r" style="color:var(--tac)">${line.eac      !== null ? f$(line.eac)      : '<span style="color:var(--dim)">—</span>'}</td>
      <td class="r" style="color:${line.variance!==null?(line.variance>=0?'var(--green)':'var(--red)'):'inherit'}">${line.variance !== null ? f$(line.variance) : '<span style="color:var(--dim)">—</span>'}</td>
      <td style="font-family:var(--f-mono);font-size:10px;color:${moRem!==null&&moRem<3?'var(--red)':moRem!==null&&moRem<6?'var(--amber)':'var(--tx3)'}">${escH(popRange)||'—'}${moRem!==null&&moRem<3?' ⚠':''}</td>
    </tr>`;
  }).join('');

  const totPct = tF > 0 ? tE / tF : null;

  return `
  <div class="section">
    <div class="section-header">
      <span class="section-num">02</span>
      <span class="section-title">Financial Rollup — ${sumNames.join(', ')}</span>
      <div class="section-rule"></div>
      <div class="section-actions"><span style="font-family:var(--f-mono);font-size:10px;color:var(--dim)">${allLines.length} line${allLines.length!==1?'s':''}</span></div>
    </div>
    <div class="tbl-card">
      <div class="tbl-wrap">
        <table class="rollup">
          <thead><tr>
            <th>Project #</th><th>Description</th>
            <th class="r">Funded Value</th><th class="r">Expended</th>
            <th class="r">Balance</th><th class="r">% Expended</th>
            <th class="r">EAC</th><th class="r">Variance</th><th>PoP</th>
          </tr></thead>
          <tbody>${tableRows}</tbody>
          <tfoot><tr>
            <td colspan="2">CUMULATIVE TOTAL</td>
            <td class="r">${f$(tF)}</td>
            <td class="r">${f$(tE)}</td>
            <td class="r" style="color:${tB<0?'var(--red)':'inherit'}">${f$(tB)}</td>
            <td class="r">${totPct !== null ? fP(totPct) : '—'}</td>
            <td class="r" colspan="3"></td>
          </tr></tfoot>
        </table>
      </div>
    </div>
    <div style="font-size:10px;color:var(--dim);margin-top:6px;line-height:1.7">
      EAC and Variance columns are optional — leave blank in your spreadsheet to hide them.
      Rows highlighted in red have &lt; 3 months remaining on PoP.
    </div>
  </div>`;
}

// ── Reconciliation banner ─────────────────────────────
function renderRecon(recon) {
  if (!recon) return '';
  const { tbDelta, taDelta, eacDelta, inTol, to, sum, summaryNames } = recon;
  if (inTol) return `
    <div class="recon-banner recon-ok">
      <div style="font-size:18px">✓</div>
      <div>
        <div class="recon-title txt-green">Reconciliation OK — "${summaryNames.join(', ')}" matches task order totals</div>
        <div class="recon-detail">Budget and actuals are within tolerance.</div>
      </div>
    </div>`;
  const lag = taDelta > Math.max(to.ta, 1) * 0.001;
  const cls = Math.abs(taDelta) / Math.max(to.ta, 1) > 0.05 ? 'recon-err' : 'recon-warn';
  return `
  <div class="recon-banner ${cls}">
    <div style="font-size:18px">${cls==='recon-err'?'⚠':'~'}</div>
    <div style="flex:1">
      <div class="recon-title" style="color:${cls==='recon-err'?'var(--red)':'var(--amber)'}">
        ${lag ? `Likely invoicing lag — summary shows ${f$(Math.abs(taDelta))} less actuals than TO detail`
              : `Reconciliation gap — "${summaryNames.join(', ')}" does not match task order totals`}
      </div>
      <div class="recon-detail">
        ${lag ? 'Summary tab may reflect invoiced amounts only. TO detail includes costs not yet invoiced.'
              : 'Check for missing rows, duplicates, or formula errors in the workbook.'}
      </div>
      <div class="recon-grid">
        <div class="recon-item"><div class="recon-item-lbl">Budget Δ</div><div class="recon-item-val">${f$(tbDelta)}</div></div>
        <div class="recon-item"><div class="recon-item-lbl">Actuals Δ</div><div class="recon-item-val" style="color:var(--amber)">${f$(taDelta)}</div></div>
        <div class="recon-item"><div class="recon-item-lbl">EAC Δ</div><div class="recon-item-val">${f$(eacDelta)}</div></div>
      </div>
      <div style="font-size:11px;color:var(--tx3);margin-top:6px">Using <strong>task order detail</strong> as source of truth.</div>
    </div>
  </div>`;
}

// ── Main program page ─────────────────────────────────
function renderProgram(id) {
  const prog = S.programs[id], meta = prog.meta;

  if (!prog.sheets) return `
    <div class="page-header">
      <div class="ph-left">
        <div class="ph-program-num">${meta.contract||'—'}</div>
        <div class="ph-title">${meta.name}</div>
      </div>
      <div class="ph-right"><button class="btn btn-primary" onclick="openEdit('${id}')">Upload Workbook</button></div>
    </div>
    <div class="empty-state" style="margin-bottom:0">
      <div class="empty-state-icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
      </div>
      <h3>No Workbook Uploaded</h3>
      <p>Upload an Excel workbook to load financial data. All other sections below are available now.</p>
      <button class="btn btn-primary" onclick="openEdit('${id}')">Upload Workbook</button>
    </div>
    <div class="section">
      <div class="section-header"><span class="section-num">01</span><span class="section-title">Program Health — Stoplights</span><div class="section-rule"></div>
        <div class="section-actions"><span style="font-size:11px;color:var(--dim);font-style:italic">Click light to cycle · Double-click card for detail</span></div>
      </div>
      <div class="sl-grid">${STOPLIGHT_CATS.map(cat => renderSlCard(id, cat.key)).join('')}</div>
    </div>
    ${renderProgramTabs(id, null)}`;

  const c = calcProg(prog);
  const [bcls, btxt] = hbdg(c.bp, c.va);
  const tos  = Object.keys(c.tos);
  const diff = prog.prevData ? diffProg(prog.prevData, prog) : null;
  const ctInfo = CONTRACT_TYPES[meta.ctType||'OTHER'];

  // Financial bluff
  const popEnd  = getPmField(id, 'finance', 'popEnd', '');
  const moLeft  = monthsUntil(popEnd);
  const moColor = moLeft !== null ? (moLeft < 3 ? 'var(--red)' : moLeft < 6 ? 'var(--amber)' : 'var(--green)') : 'var(--blue)';
  const balance = c.tb - c.ta;

  const financialBluff = `
  <div class="card" style="padding:16px">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px">
      <span class="section-title">Program Financial Bluff <span class="save-dot"></span></span>
      <span style="font-family:var(--f-mono);font-size:10px;color:var(--dim)">As of ${new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</span>
    </div>
    <div class="fin-bluff" style="margin-bottom:14px">
      <div class="bluff-card ${balance<0?'at-risk':balance<c.tb*0.1?'watch':'ok'}" style="--bc:${balance<0?'var(--red)':balance<c.tb*0.1?'var(--amber)':'var(--green)'}">
        <div class="bluff-label">Funding Balance</div>
        <div class="bluff-value">${f$(balance)}</div>
        <div class="bluff-sub">${fP(c.bp)} expended of ${f$(c.tb)}</div>
      </div>
      <div class="bluff-card ${moLeft!==null&&moLeft<3?'at-risk':moLeft!==null&&moLeft<6?'watch':''}" style="--bc:${moColor}">
        <div class="bluff-label">PoP End Date</div>
        <div class="bluff-value" style="font-size:16px">${popEnd||'—'}</div>
        <div class="bluff-sub" style="color:${moColor}">${moLeft!==null?moLeft.toFixed(1)+' months remaining':''}</div>
        ${moLeft!==null&&moLeft<3?'<div style="font-family:var(--f-display);font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--red);margin-top:4px">⚠ AT RISK</div>':''}
      </div>
      <div class="bluff-card" style="--bc:var(--blue)">
        <div class="bluff-label">EAC</div>
        <div class="bluff-value" style="color:${c.eac>c.tb?'var(--red)':'var(--green)'}">${f$(c.eac)}</div>
        <div class="bluff-sub">Variance: ${f$(c.va)}</div>
      </div>
      <div class="bluff-card" style="--bc:var(--tac)">
        <div class="bluff-label">Burn Rate</div>
        <div class="bluff-value">${fP(c.bp)}</div>
        <div class="bluff-sub">${f$(c.ta)} actuals to date</div>
      </div>
      <div class="bluff-card" style="--bc:var(--navy)">
        <div class="bluff-label">PoP End <span style="font-size:8px;font-weight:400">(editable)</span></div>
        <input value="${escH(popEnd)}"
               onchange="savePmField('${id}','finance','popEnd',this.value);render()"
               style="font-family:var(--f-mono);font-size:13px;background:transparent;border:none;border-bottom:1px dashed var(--bd2);width:100%;color:var(--navy);outline:none;padding:2px 0;margin-top:4px"
               placeholder="e.g. 2026-09-30">
        <div class="bluff-sub">Enter date to calc run-out</div>
      </div>
    </div>
    <div style="background:var(--s2);border:1px solid var(--bd);border-radius:var(--r);padding:12px 14px">
      <div style="font-family:var(--f-display);font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--dim);margin-bottom:10px">DSO — Days Sales Outstanding</div>
      <div class="dso-grid" style="margin-bottom:10px">
        <div class="dso-item">
          <div class="dso-lbl">Prior Period</div>
          <div class="dso-val"><span contenteditable="true" onblur="savePmField('${id}','finance','dsoPrior',this.innerText);schedSave()">${escH(getPmField(id,'finance','dsoPrior','—'))}</span></div>
        </div>
        <div class="dso-item">
          <div class="dso-lbl">Current Period</div>
          <div class="dso-val"><span contenteditable="true" onblur="savePmField('${id}','finance','dsoCurrent',this.innerText);schedSave()">${escH(getPmField(id,'finance','dsoCurrent','—'))}</span></div>
        </div>
        <div class="dso-item">
          <div class="dso-lbl">Target</div>
          <div class="dso-val"><span contenteditable="true" onblur="savePmField('${id}','finance','dsoTarget',this.innerText);schedSave()">${escH(getPmField(id,'finance','dsoTarget','45'))}</span></div>
        </div>
      </div>
      <div class="field">
        <label>DSO Comments</label>
        <textarea class="comment-box" rows="2"
                  onblur="savePmField('${id}','finance','dsoComment',this.value);schedSave()">${escH(getPmField(id,'finance','dsoComment',''))}</textarea>
      </div>
    </div>
  </div>`;

  // KPI cards
  const kpis = `
  <div class="kpi-grid">
    <div class="kpi-card" style="--kc:var(--navy)"><div class="kpi-label">Total Budget</div><div class="kpi-value">${f$(c.tb)}</div>${fmtDelta(diff,'tb')}<div class="kpi-sub">Labor + ODC + Fee</div></div>
    <div class="kpi-card" style="--kc:var(--tac)"><div class="kpi-label">Total Actuals</div><div class="kpi-value">${f$(c.ta)}</div>${fmtDelta(diff,'ta')}<div class="kpi-sub">${fP(c.bp)} burned</div></div>
    <div class="kpi-card" style="--kc:${c.eac>c.tb?'var(--red)':'var(--green)'}"><div class="kpi-label">EAC</div><div class="kpi-value">${f$(c.eac)}</div>${fmtDelta(diff,'eac')}<div class="kpi-sub">Method: ${Object.values(c.tos)[0]?.eacMethod||'—'}</div></div>
    <div class="kpi-card" style="--kc:${c.va>=0?'var(--green)':'var(--red)'}"><div class="kpi-label">Variance</div><div class="kpi-value">${f$(c.va)}</div>${fmtDelta(diff,'va')}<div class="kpi-sub">${c.va>=0?'Under budget':'OVER BUDGET'}</div></div>
    <div class="kpi-card" style="--kc:var(--blue)"><div class="kpi-label">Budget Hours</div><div class="kpi-value">${c.bH>0?fN(c.bH):'—'}</div>${fmtDelta(diff,'bH',true)}<div class="kpi-sub">${c.aH>0?fN(c.aH)+' actual · '+fN(c.hR)+' rem':'Not tracked'}</div></div>
    <div class="kpi-card" style="--kc:var(--amber)"><div class="kpi-label">Budget Labor</div><div class="kpi-value">${f$(c.bL)}</div><div class="kpi-sub">${f$(c.aL)} actual</div></div>
    <div class="kpi-card" style="--kc:var(--tac)"><div class="kpi-label">Budget ODC</div><div class="kpi-value">${c.bO>0?f$(c.bO):'—'}</div><div class="kpi-sub">${c.aO>0?f$(c.aO)+' actual':'Not tracked'}</div></div>
    <div class="kpi-card" style="--kc:var(--navy)"><div class="kpi-label">Fee / Profit</div><div class="kpi-value">${c.fee>0?f$(c.fee):'—'}</div><div class="kpi-sub">${ctInfo.label==='FFP'?'N/A — FFP':c.fee>0?'Budgeted':'Not tracked'}</div></div>
  </div>`;

  return `
  <div class="page-header">
    <div class="ph-left">
      <div class="ph-program-num">${meta.contract||'—'}${meta.pop?' &nbsp;·&nbsp; PoP: '+meta.pop:''}</div>
      <div class="ph-title">${meta.name}</div>
      <div class="ph-meta">
        ${meta.customer?`<span class="ph-meta-item">${meta.customer}</span>`:''}
        <span class="ph-meta-item">${tos.length} Task Order${tos.length!==1?'s':''}</span>
        <span class="ph-meta-item">${fP(c.bp)} Burned</span>
        <span class="ph-meta-item"><span class="badge ${bcls}">${btxt}</span></span>
        <span class="ph-meta-item" style="color:${ctInfo.color}">${ctInfo.label}</span>
      </div>
    </div>
    <div class="ph-right">
      <select onchange="setCtType('${id}',this.value)"
              style="background:var(--s1);border:1.5px solid var(--bd2);border-radius:var(--r);padding:4px 8px;font-family:var(--f-display);font-size:11px;font-weight:600;color:var(--navy);outline:none;cursor:pointer">
        ${Object.entries(CONTRACT_TYPES).map(([k,v])=>`<option value="${k}" ${(meta.ctType||'OTHER')===k?'selected':''}>${v.label} — ${v.full}</option>`).join('')}
      </select>
      <button class="btn btn-secondary btn-sm" onclick="openEdit('${id}')">↑ Upload / Edit</button>
    </div>
  </div>

  ${renderRecon(c.recon)}

  <div class="section">
    <div class="section-header"><span class="section-num">01</span><span class="section-title">Financial Bluff &amp; DSO</span><div class="section-rule"></div></div>
    ${financialBluff}
  </div>

  ${renderSummaryRollup(id, c)}

  <div class="section">
    <div class="section-header"><span class="section-num">03</span><span class="section-title">Program Health — Stoplights</span><div class="section-rule"></div>
      <div class="section-actions"><span style="font-size:11px;color:var(--dim);font-style:italic">Click light to cycle · Double-click card for detail</span></div>
    </div>
    <div class="sl-grid">
      ${STOPLIGHT_CATS.map(cat => renderSlCard(id, cat.key)).join('')}
    </div>
  </div>

  <div class="section">
    <div class="section-header"><span class="section-num">04</span><span class="section-title">Financial Overview</span><div class="section-rule"></div></div>
    ${kpis}
  </div>

  ${renderProgramTabs(id, c)}`;
}

// ── Tab shell (works with or without financial data) ──
function renderProgramTabs(id, c) {
  const tos = c ? Object.keys(c.tos) : [];

  const toRows = tos.map(n => {
    const t = c.tos[n], [bc2,bt2] = hbdg(t.bp,t.va), p = Math.min(t.bp,1);
    return `<tr onclick="go('to','${id}','${n.replace(/'/g,"\\'")}')">
      <td><strong>${n}</strong></td>
      <td class="r">${t.bH>0?fN(t.bH):'—'}</td><td class="r">${t.aH>0?fN(t.aH):'—'}</td><td class="r">${t.hR>0?fN(t.hR):'—'}</td>
      <td class="r">${f$(t.bL)}</td><td class="r">${f$(t.aL)}</td>
      <td class="r">${t.bO>0?f$(t.bO):'—'}</td><td class="r">${t.aO>0?f$(t.aO):'—'}</td>
      <td class="r">${t.fee>0?f$(t.fee):'—'}</td>
      <td class="r">${f$(t.tb)}</td><td class="r">${f$(t.ta)}</td>
      <td class="r" style="color:${t.eac>t.tb?'var(--red)':'var(--green)'}">${f$(t.eac)}</td>
      <td class="r" style="color:${t.va>=0?'var(--green)':'var(--red)'}">${f$(t.va)}</td>
      <td class="r">
        <div style="display:flex;align-items:center;gap:6px">
          <div class="burn-bar-wrap" style="width:58px"><div class="burn-bar-fill" style="width:${(p*100).toFixed(1)}%;background:${bcol(t.bp)}"></div></div>
          <span style="font-family:var(--f-mono);font-size:10px">${fP(t.bp)}</span>
        </div>
      </td>
      <td><span class="badge ${bc2}">${bt2}</span></td>
    </tr>`;
  }).join('');

  const toFoot = c ? `<tr>
    <td>TOTAL</td>
    <td class="r">${c.bH>0?fN(c.bH):'—'}</td><td class="r">${c.aH>0?fN(c.aH):'—'}</td><td class="r">${c.hR>0?fN(c.hR):'—'}</td>
    <td class="r">${f$(c.bL)}</td><td class="r">${f$(c.aL)}</td>
    <td class="r">${c.bO>0?f$(c.bO):'—'}</td><td class="r">${c.aO>0?f$(c.aO):'—'}</td>
    <td class="r">${c.fee>0?f$(c.fee):'—'}</td>
    <td class="r">${f$(c.tb)}</td><td class="r">${f$(c.ta)}</td>
    <td class="r">${f$(c.eac)}</td>
    <td class="r" style="color:${c.va>=0?'var(--green)':'var(--red)'}">${f$(c.va)}</td>
    <td class="r">${fP(c.bp)}</td><td></td>
  </tr>` : '';

  return `
  <div class="section">
    <div class="section-header"><span class="section-num">${c?'05':'01'}</span><span class="section-title">Program Detail</span><div class="section-rule"></div></div>

    <div class="tab-nav" id="prog-tab-nav">
      <button class="tab-btn active" data-tab="tos">Task Orders</button>
      <button class="tab-btn" data-tab="mgmt">Management Review</button>
      <button class="tab-btn" data-tab="staffing">Staffing</button>
      <button class="tab-btn" data-tab="quality">Quality</button>
      <button class="tab-btn" data-tab="risk">Risk &amp; Opps</button>
      <button class="tab-btn" data-tab="visits">Customer Visits</button>
      ${c ? '<button class="tab-btn" data-tab="proj">Run-Out &amp; EAC</button>' : ''}
      <button class="tab-btn" data-tab="hist">Upload History</button>
    </div>

    <div class="tab-pane active" id="tp-tos">
      ${c && tos.length ? `
      <div class="tbl-card">
        <div class="tbl-header">
          <span class="tbl-header-title">Task Order Summary — Click row to drill down</span>
          <div class="tbl-header-actions">
            <button class="btn btn-ghost btn-xs" style="border-color:rgba(255,255,255,.2);color:rgba(255,255,255,.7)" onclick="exportCSV('${id}')">Export CSV</button>
          </div>
        </div>
        <div class="tbl-wrap"><table class="data-table">
          <thead><tr>
            <th>Task Order</th><th class="r">Bud Hrs</th><th class="r">Act Hrs</th><th class="r">Rem Hrs</th>
            <th class="r">Bud Labor</th><th class="r">Act Labor</th>
            <th class="r">Bud ODC</th><th class="r">Act ODC</th><th class="r">Fee</th>
            <th class="r">Tot Budget</th><th class="r">Tot Actuals</th>
            <th class="r">EAC</th><th class="r">Variance</th><th class="r">Burn %</th><th>Status</th>
          </tr></thead>
          <tbody>${toRows}</tbody>
          <tfoot>${toFoot}</tfoot>
        </table></div>
      </div>` : '<div style="color:var(--dim);font-size:12px;font-style:italic;padding:16px">Upload a workbook to see task order data.</div>'}
    </div>

    <div class="tab-pane" id="tp-mgmt">${renderMgmtTab(id)}</div>
    <div class="tab-pane" id="tp-staffing">${renderStaffingTab(id)}</div>
    <div class="tab-pane" id="tp-quality">${renderQualityTab(id)}</div>
    <div class="tab-pane" id="tp-risk">${renderRiskTab(id)}</div>
    <div class="tab-pane" id="tp-visits">${renderVisitsTab(id)}</div>
    ${c ? `<div class="tab-pane" id="tp-proj">${renderProjTab(id)}</div>` : ''}
    <div class="tab-pane" id="tp-hist">${renderHistTab(id)}</div>
  </div>`;
}

// ── Task Order detail page ────────────────────────────
function renderTO(id, toName) {
  const prog = S.programs[id];
  const rows = prog.sheets?.[toName];
  if (!rows) return '<p style="color:var(--dim);padding:40px">No data for this task order.</p>';

  const map = (prog.mappings||{})[toName] || autoMap(rows);
  const ct  = prog.meta?.ctType || 'OTHER';
  const c   = calcSheet(rows, map, ct);
  if (!c) return '<p style="color:var(--dim);padding:40px">Could not parse this sheet. Check column mapping.</p>';

  const [bcls, btxt] = hbdg(c.bp, c.va);
  const colKeys = c.rows.length ? Object.keys(c.rows[0].raw) : [];
  const rawH = colKeys.map(k => `<th>${escH(k)}</th>`).join('');
  const rawR = c.rows.map(row => {
    const cells = colKeys.map(k => {
      const v = row.raw[k];
      if (v === '' || v === null || v === undefined) return `<td class="dim">—</td>`;
      const n  = safeN(v);
      const isN = n !== null && n !== 0 && typeof v !== 'string';
      return `<td class="${isN?'r':''}">${isN ? (String(k).toLowerCase().match(/hour|^hr/) ? fN(n) : f$(n)) : escH(String(v))}</td>`;
    }).join('');
    return `<tr>${cells}</tr>`;
  }).join('');

  return `
  <div class="page-header">
    <div class="ph-left">
      <div class="ph-program-num">${prog.meta.contract||'—'} · ${prog.meta.name}</div>
      <div class="ph-title">${toName}</div>
      <div class="ph-meta">
        <span class="ph-meta-item">Task Order Detail</span>
        <span class="ph-meta-item"><span class="badge ${bcls}">${btxt}</span></span>
        <span class="ph-meta-item" style="font-family:var(--f-mono);font-size:10px;color:var(--dim)">EAC: ${c.eacMethod}</span>
      </div>
    </div>
    <div class="ph-right">
      <button class="btn btn-ghost btn-sm" onclick="exportTOCSV('${id}','${toName.replace(/'/g,"\\'")}')">Export CSV</button>
      <button class="btn btn-ghost btn-sm" onclick="go('program','${id}')">← Back</button>
    </div>
  </div>

  <div class="kpi-grid">
    <div class="kpi-card" style="--kc:var(--navy)"><div class="kpi-label">Total Budget</div><div class="kpi-value">${f$(c.tb)}</div><div class="kpi-sub">Labor + ODC + Fee</div></div>
    <div class="kpi-card" style="--kc:var(--tac)"><div class="kpi-label">Actuals</div><div class="kpi-value">${f$(c.ta)}</div><div class="kpi-sub">${fP(c.bp)} burned</div></div>
    <div class="kpi-card" style="--kc:${c.eac>c.tb?'var(--red)':'var(--green)'}"><div class="kpi-label">EAC</div><div class="kpi-value">${f$(c.eac)}</div><div class="kpi-sub">${c.eacMethod}</div></div>
    <div class="kpi-card" style="--kc:${c.va>=0?'var(--green)':'var(--red)'}"><div class="kpi-label">Variance</div><div class="kpi-value">${f$(c.va)}</div><div class="kpi-sub">${c.va>=0?'Under budget':'OVER BUDGET'}</div></div>
    <div class="kpi-card" style="--kc:var(--blue)"><div class="kpi-label">Budget Hours</div><div class="kpi-value">${c.bH>0?fN(c.bH):'—'}</div><div class="kpi-sub">${c.aH>0?fN(c.aH)+' actual · '+fN(c.hR)+' rem':'Not tracked'}</div></div>
    <div class="kpi-card" style="--kc:var(--amber)"><div class="kpi-label">ETC Labor</div><div class="kpi-value">${f$(c.etcL)}</div><div class="kpi-sub">Est. to complete</div></div>
  </div>

  <div class="two-col">
    <div>
      <div class="section-header" style="margin-bottom:10px"><span class="section-title">Budget vs Actuals</span><div class="section-rule"></div></div>
      <div class="tbl-card"><div class="tbl-wrap"><table class="data-table">
        <thead><tr><th>Item</th><th class="r">Budget</th><th class="r">Actual</th><th class="r">Remaining</th><th class="r">Burn%</th></tr></thead>
        <tbody>
          <tr><td>Hours</td><td class="r">${c.bH>0?fN(c.bH):'—'}</td><td class="r">${c.aH>0?fN(c.aH):'—'}</td><td class="r">${c.hR>0?fN(c.hR):'—'}</td><td class="r">${c.bH>0?fP(c.aH/c.bH):'—'}</td></tr>
          <tr><td>Labor Cost</td><td class="r">${f$(c.bL)}</td><td class="r">${f$(c.aL)}</td><td class="r">${f$(c.bL-c.aL)}</td><td class="r">${c.bL>0?fP(c.aL/c.bL):'—'}</td></tr>
          <tr><td>ODC</td><td class="r">${c.bO>0?f$(c.bO):'—'}</td><td class="r">${c.aO>0?f$(c.aO):'—'}</td><td class="r">${c.bO>0?f$(c.bO-c.aO):'—'}</td><td class="r">${c.bO>0?fP(c.aO/c.bO):'—'}</td></tr>
          <tr><td>Fee</td><td class="r">${c.fee>0?f$(c.fee):'—'}</td><td class="r dim">—</td><td class="r">—</td><td class="r">—</td></tr>
        </tbody>
        <tfoot><tr><td>Total</td><td class="r">${f$(c.tb)}</td><td class="r">${f$(c.ta)}</td><td class="r">${f$(c.tb-c.ta)}</td><td class="r">${fP(c.bp)}</td></tr></tfoot>
      </table></div></div>
    </div>
    <div>
      <div class="section-header" style="margin-bottom:10px"><span class="section-title">EAC Build-Up</span><div class="section-rule"></div></div>
      <div class="tbl-card"><div class="tbl-wrap"><table class="data-table">
        <thead><tr><th>Component</th><th class="r">Value</th></tr></thead>
        <tbody>
          <tr><td>Actuals to Date</td><td class="r">${f$(c.ta)}</td></tr>
          <tr><td>ETC — Labor</td><td class="r">${f$(c.etcL)}</td></tr>
          <tr><td>ETC — ODC</td><td class="r">${f$(c.etcO)}</td></tr>
          <tr><td>Fee (budgeted)</td><td class="r">${c.fee>0?f$(c.fee):'—'}</td></tr>
        </tbody>
        <tfoot>
          <tr><td>EAC</td><td class="r" style="color:${c.eac>c.tb?'var(--red)':'var(--green)'}">${f$(c.eac)}</td></tr>
          <tr><td>Variance</td><td class="r" style="color:${c.va>=0?'var(--green)':'var(--red)'}">${f$(c.va)}</td></tr>
        </tfoot>
      </table></div></div>
    </div>
  </div>

  <div class="section-header" style="margin-bottom:10px"><span class="section-title">Raw Row Data</span><div class="section-rule"></div></div>
  <div class="tbl-card"><div class="tbl-wrap">
    <table class="data-table"><thead><tr>${rawH}</tr></thead><tbody>${rawR}</tbody></table>
  </div></div>`;
}
