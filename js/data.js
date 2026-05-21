// ════════════════════════════════════════════════════
//  data.js  —  State, persistence, PM data helpers
// ════════════════════════════════════════════════════

const S = {
  programs : {},
  view     : 'portfolio',
  pid      : null,
  to       : null,
};

// ── Persistence ──────────────────────────────────────
function persist() {
  try { localStorage.setItem('pfd8', JSON.stringify(S.programs)); } catch(e) {}
}
function hydrate() {
  try {
    const r = localStorage.getItem('pfd8');
    if (r) S.programs = JSON.parse(r);
  } catch(e) {}
}

// ── Auto-save with visual dot ─────────────────────────
let _saveTimer = null;
function schedSave() {
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => { persist(); flashSaveDot(); }, 800);
}
function flashSaveDot() {
  document.querySelectorAll('.save-dot').forEach(d => {
    d.classList.add('show');
    setTimeout(() => d.classList.remove('show'), 1800);
  });
}

// ── PM data helpers ───────────────────────────────────
function savePmField(pid, section, key, val) {
  const p = S.programs[pid]; if (!p) return;
  if (!p.pmData)              p.pmData = {};
  if (!p.pmData[section])     p.pmData[section] = {};
  p.pmData[section][key] = val;
  schedSave();
}
function getPmField(pid, section, key, def = '') {
  return S.programs[pid]?.pmData?.[section]?.[key] ?? def;
}

// ── List helpers ──────────────────────────────────────
function addListItem(pid, section, key) {
  const p = S.programs[pid]; if (!p) return;
  if (!p.pmData)           p.pmData = {};
  if (!p.pmData[section])  p.pmData[section] = {};
  if (!Array.isArray(p.pmData[section][key])) p.pmData[section][key] = [];
  p.pmData[section][key].push('');
  persist(); render();
}
function removeListItem(pid, section, key, idx) {
  const arr = S.programs[pid]?.pmData?.[section]?.[key];
  if (Array.isArray(arr)) { arr.splice(idx, 1); persist(); render(); }
}
function updateListItem(pid, section, key, idx, val) {
  const arr = S.programs[pid]?.pmData?.[section]?.[key];
  if (Array.isArray(arr)) { arr[idx] = val; schedSave(); }
}

// ── Milestone helpers ─────────────────────────────────
function addMilestone(pid) {
  const p = S.programs[pid]; if (!p) return;
  if (!p.pmData)        p.pmData = {};
  if (!p.pmData.mgmt)   p.pmData.mgmt = {};
  if (!Array.isArray(p.pmData.mgmt.milestones)) p.pmData.mgmt.milestones = [];
  p.pmData.mgmt.milestones.push({ title: '', date: '', status: 'Pending' });
  persist(); render();
}
function removeMilestone(pid, idx) {
  const arr = S.programs[pid]?.pmData?.mgmt?.milestones;
  if (Array.isArray(arr)) { arr.splice(idx, 1); persist(); render(); }
}
function updateMilestone(pid, idx, field, val) {
  const arr = S.programs[pid]?.pmData?.mgmt?.milestones;
  if (Array.isArray(arr) && arr[idx]) { arr[idx][field] = val; schedSave(); }
}

// ── Position helpers ──────────────────────────────────
function addPosition(pid) {
  const p = S.programs[pid]; if (!p) return;
  if (!p.pmData)            p.pmData = {};
  if (!p.pmData.staffing)   p.pmData.staffing = {};
  if (!Array.isArray(p.pmData.staffing.positions)) p.pmData.staffing.positions = [];
  p.pmData.staffing.positions.push({ title: '', lcat: '', status: 'Recruiting', date: '' });
  persist(); render();
}
function removePosition(pid, idx) {
  const arr = S.programs[pid]?.pmData?.staffing?.positions;
  if (Array.isArray(arr)) { arr.splice(idx, 1); persist(); render(); }
}
function updatePosition(pid, idx, field, val) {
  const arr = S.programs[pid]?.pmData?.staffing?.positions;
  if (Array.isArray(arr) && arr[idx]) { arr[idx][field] = val; schedSave(); }
}

// ── KPI helpers ───────────────────────────────────────
function addKpi(pid) {
  const p = S.programs[pid]; if (!p) return;
  if (!p.pmData)          p.pmData = {};
  if (!p.pmData.quality)  p.pmData.quality = {};
  if (!Array.isArray(p.pmData.quality.kpis)) p.pmData.quality.kpis = [];
  p.pmData.quality.kpis.push({ name: 'New KPI', target: '—', current: '—', status: 'green', notes: '' });
  persist(); render();
}
function removeKpi(pid, idx) {
  const arr = S.programs[pid]?.pmData?.quality?.kpis;
  if (Array.isArray(arr)) { arr.splice(idx, 1); persist(); render(); }
}
function updateKpiField(pid, idx, field, val) {
  const arr = S.programs[pid]?.pmData?.quality?.kpis;
  if (Array.isArray(arr) && arr[idx]) { arr[idx][field] = val; schedSave(); }
}

// ── Risk helpers ──────────────────────────────────────
function addRisk(pid, type, level) {
  const p = S.programs[pid]; if (!p) return;
  if (!p.pmData)       p.pmData = {};
  if (!p.pmData.risk)  p.pmData.risk = {};
  if (!Array.isArray(p.pmData.risk.items)) p.pmData.risk.items = [];
  p.pmData.risk.items.push({ type, level, title: '', impact: '', mitigation: '', owner: '' });
  persist(); render();
}
function removeRisk(pid, idx) {
  const arr = S.programs[pid]?.pmData?.risk?.items;
  if (Array.isArray(arr)) { arr.splice(idx, 1); persist(); render(); }
}
function updateRisk(pid, idx, field, val) {
  const arr = S.programs[pid]?.pmData?.risk?.items;
  if (Array.isArray(arr) && arr[idx]) { arr[idx][field] = val; schedSave(); }
}

// ── Visit helpers ─────────────────────────────────────
function addVisit(pid, type) {
  const p = S.programs[pid]; if (!p) return;
  if (!p.pmData)         p.pmData = {};
  if (!p.pmData.visits)  p.pmData.visits = {};
  if (!Array.isArray(p.pmData.visits.list)) p.pmData.visits.list = [];
  const d = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  p.pmData.visits.list.unshift({ date: d, type, org: '', notes: '' });
  persist(); render();
}
function removeVisit(pid, idx) {
  const arr = S.programs[pid]?.pmData?.visits?.list;
  if (Array.isArray(arr)) { arr.splice(idx, 1); persist(); render(); }
}
function updateVisit(pid, idx, field, val) {
  const arr = S.programs[pid]?.pmData?.visits?.list;
  if (Array.isArray(arr) && arr[idx]) { arr[idx][field] = val; schedSave(); }
}
