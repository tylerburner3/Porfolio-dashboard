// ════════════════════════════════════════════════════
//  render-portfolio.js  —  Portfolio view
// ════════════════════════════════════════════════════

function renderPortfolio() {
  const ids = Object.keys(S.programs);
  let ptb=0, pta=0, peac=0, pva=0, pbH=0, paH=0;

  ids.forEach(id => {
    const p = S.programs[id]; if (!p.sheets) return;
    const c = calcProg(p);
    ptb += c.tb; pta += c.ta; peac += c.eac; pva += c.va; pbH += c.bH; paH += c.aH;
  });
  const pbp = ptb > 0 ? pta / ptb : 0;

  const kpis = ids.length ? `
    <div class="kpi-grid">
      <div class="kpi-card" style="--kc:var(--navy)"><div class="kpi-label">Portfolio Budget</div><div class="kpi-value">${f$(ptb)}</div><div class="kpi-sub">${ids.length} program${ids.length!==1?'s':''}</div></div>
      <div class="kpi-card" style="--kc:var(--tac)"><div class="kpi-label">Total Actuals</div><div class="kpi-value">${f$(pta)}</div><div class="kpi-sub">${fP(pbp)} burned</div></div>
      <div class="kpi-card" style="--kc:${peac>ptb?'var(--red)':'var(--green)'}"><div class="kpi-label">Portfolio EAC</div><div class="kpi-value">${f$(peac)}</div><div class="kpi-sub">Est. at completion</div></div>
      <div class="kpi-card" style="--kc:${pva>=0?'var(--green)':'var(--red)'}"><div class="kpi-label">Portfolio Variance</div><div class="kpi-value">${f$(pva)}</div><div class="kpi-sub">${pva>=0?'Under budget':'OVER BUDGET'}</div></div>
      <div class="kpi-card" style="--kc:var(--blue)"><div class="kpi-label">Budget Hours</div><div class="kpi-value">${fN(pbH)}</div><div class="kpi-sub">${fN(paH)} actual · ${fN(pbH-paH)} rem</div></div>
    </div>` : '';

  const cards = ids.map(id => {
    const prog = S.programs[id];
    if (!prog.sheets) return `
      <div class="prog-card" onclick="openEdit('${id}')">
        <div class="prog-card-stripe" style="background:var(--dim2)"></div>
        <div class="prog-card-body">
          <div class="prog-card-top">
            <div><div class="prog-card-num">${prog.meta.contract||'—'}</div><div class="prog-card-name">${prog.meta.name}</div></div>
            <span class="badge badge-gray">No Data</span>
          </div>
          <div style="font-size:11px;color:var(--dim);font-style:italic;margin-top:6px">Click to upload workbook</div>
        </div>
      </div>`;

    const c = calcProg(prog);
    const [bcls,btxt] = hbdg(c.bp, c.va);
    const pct = Math.min(c.bp, 1);
    const tos = Object.keys(c.tos).length;
    const ctInfo = CONTRACT_TYPES[prog.meta.ctType||'OTHER'];

    return `
    <div class="prog-card" onclick="go('program','${id}')">
      <div class="prog-card-stripe" style="background:${hcol(c.bp,c.va)}"></div>
      <div class="prog-card-body">
        <div class="prog-card-top">
          <div>
            <div class="prog-card-num">${prog.meta.contract||'—'}${prog.meta.pop?' · '+prog.meta.pop:''}</div>
            <div class="prog-card-name">${prog.meta.name}</div>
            <div class="prog-card-customer">${prog.meta.customer||''}</div>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
            <span class="badge ${bcls}">${btxt}</span>
            <span style="font-family:var(--f-display);font-size:9px;font-weight:700;color:${ctInfo.color};border:1px solid var(--bd);border-radius:2px;padding:1px 5px">${ctInfo.abbr}</span>
          </div>
        </div>
        <div class="prog-card-nums">
          <div class="prog-card-stat"><label>Budget</label><div class="v">${f$(c.tb)}</div></div>
          <div class="prog-card-stat"><label>Actuals</label><div class="v">${f$(c.ta)}</div></div>
          <div class="prog-card-stat"><label>EAC</label><div class="v" style="color:${c.eac>c.tb?'var(--red)':'var(--green)'}">${f$(c.eac)}</div></div>
        </div>
        <div class="burn-bar-wrap" style="margin-bottom:10px">
          <div class="burn-bar-fill" style="width:${(pct*100).toFixed(1)}%;background:${bcol(c.bp)}"></div>
        </div>
        <div class="prog-card-footer">
          <span class="prog-card-footer-stat">Burn <span>${fP(c.bp)}</span></span>
          <span class="prog-card-footer-stat">Var <span style="color:${c.va>=0?'var(--green)':'var(--red)'}">${f$(c.va)}</span></span>
          <span class="prog-card-footer-stat"><span>${tos}</span> TO${tos!==1?'s':''}</span>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:10px;padding-top:8px;border-top:1px solid var(--bd)">
          <span style="font-family:var(--f-mono);font-size:9px;color:var(--dim)">Updated ${prog.meta.lastUpdated||'—'}</span>
          <button class="btn btn-ghost btn-xs" onclick="event.stopPropagation();openEdit('${id}')">Update ↑</button>
        </div>
      </div>
    </div>`;
  }).join('');

  return `
  <div class="page-header">
    <div class="ph-left">
      <div class="ph-program-num">Portfolio Management System</div>
      <div class="ph-title">Program Portfolio</div>
      <div class="ph-meta">
        <span class="ph-meta-item">${ids.length} Active Program${ids.length!==1?'s':''}</span>
        <span class="ph-meta-item">${f$(ptb)} Total Contract Value</span>
      </div>
    </div>
    <div class="ph-right">
      <button class="btn btn-primary" onclick="openAdd()">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Add Program
      </button>
    </div>
  </div>

  <div class="section">
    <div class="section-header"><span class="section-num">01</span><span class="section-title">Portfolio Summary</span><div class="section-rule"></div></div>
    ${kpis}
  </div>

  <div class="section">
    <div class="section-header"><span class="section-num">02</span><span class="section-title">Active Programs</span><div class="section-rule"></div></div>
    <div class="prog-grid">
      ${cards}
      <div class="add-prog-card" onclick="openAdd()">
        <div class="apc-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </div>
        <p>Add Program</p>
        <p style="font-size:10px;color:var(--dim2);font-weight:400;text-transform:none;letter-spacing:0;font-family:var(--f-body)">Upload a workbook or start with metadata</p>
      </div>
    </div>
  </div>`;
}
