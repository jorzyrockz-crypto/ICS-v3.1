function renderDashboardView(){
  const canEdit = hasRoleCapability('edit_records');
  const canImport = hasRoleCapability('import_data');
  const canExport = hasRoleCapability('export_data');
  return `
${renderWelcomeBanner('Dashboard')}

<div class="dash-story">
  <div class="dash-hero">
    <div class="dash-hero-top">
      <div>
        <div class="dash-hero-kicker">Portfolio Pulse</div>
        <h3>Inventory lifecycle command view</h3>
        <p>Track portfolio health, EUL pressure, and movement trends in one workspace.</p>
      </div>
      <div class="dash-hero-graphic" aria-hidden="true">
        <svg viewBox="0 0 180 112">
          <defs>
            <linearGradient id="dashHeroGradA" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#60a5fa"></stop>
              <stop offset="100%" stop-color="#1d4ed8"></stop>
            </linearGradient>
            <linearGradient id="dashHeroGradB" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#22d3ee"></stop>
              <stop offset="100%" stop-color="#2563eb"></stop>
            </linearGradient>
          </defs>
          <rect x="6" y="10" width="168" height="92" rx="14" fill="#ffffff" stroke="#dbeafe"></rect>
          <path d="M20 74 L54 50 L83 62 L117 34 L152 44" fill="none" stroke="url(#dashHeroGradA)" stroke-width="5" stroke-linecap="round"></path>
          <rect x="24" y="78" width="12" height="16" rx="4" fill="url(#dashHeroGradB)" opacity=".88"></rect>
          <rect x="42" y="68" width="12" height="26" rx="4" fill="url(#dashHeroGradB)" opacity=".9"></rect>
          <rect x="60" y="58" width="12" height="36" rx="4" fill="url(#dashHeroGradB)" opacity=".92"></rect>
          <rect x="78" y="70" width="12" height="24" rx="4" fill="url(#dashHeroGradB)" opacity=".88"></rect>
          <rect x="96" y="48" width="12" height="46" rx="4" fill="url(#dashHeroGradB)" opacity=".94"></rect>
          <rect x="114" y="42" width="12" height="52" rx="4" fill="url(#dashHeroGradB)" opacity=".95"></rect>
        </svg>
      </div>
    </div>
    <div class="dash-mini-metrics">
      <div class="dash-mini"><div class="k">Book Value</div><div class="v" id="dashMiniBookValue">0.00</div></div>
      <div class="dash-mini"><div class="k">Avg Items / ICS</div><div class="v" id="dashMiniAvgItems">0</div></div>
      <div class="dash-mini"><div class="k">Portfolio Health</div><div class="v" id="dashMiniHealth">100%</div></div>
    </div>
  </div>

  <div class="dash-health">
    <div class="dash-health-head">
      <span class="dash-health-title">Item Status Distribution</span>
      <span class="dash-health-score" id="dashHealthScore">Healthy</span>
    </div>
    <div class="dash-bars" id="dashStatusBars"></div>
    <p class="dash-note" id="dashHealthNote" style="margin-top:10px"></p>
  </div>
</div>

<div class="dash-grid">
  <button class="dash-kpi dash-kpi-btn" onclick="goToView('Manage Inventory')">
    <div class="dash-kpi-head">
      <div class="k">Total ICS Records</div>
      <span class="dash-kpi-ico" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 4h16v2H4V4zm0 4h16v12H4V8zm3 3v2h4v-2H7zm0 4v2h10v-2H7z"/></svg></span>
    </div>
    <div class="v" id="dashKpiRecords">0</div>
    <div class="dash-kpi-sub">Active portfolio files</div>
  </button>
  <button class="dash-kpi dash-kpi-btn" onclick="goToView('Manage Inventory')">
    <div class="dash-kpi-head">
      <div class="k">Active Items</div>
      <span class="dash-kpi-ico" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 2 2 7l10 5 10-5-10-5zm0 7.2L4.5 5.5 12 2.8l7.5 2.7L12 9.2zM4 11l8 4 8-4v6l-8 4-8-4v-6z"/></svg></span>
    </div>
    <div class="v" id="dashKpiItems">0</div>
    <div class="dash-kpi-sub">Items in circulation</div>
  </button>
  <button class="dash-kpi dash-kpi-btn warn" onclick="dashboardOpenActionFiltered('near')">
    <div class="dash-kpi-head">
      <div class="k">Due &lt; 3m</div>
      <span class="dash-kpi-ico" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M13 3a9 9 0 1 0 8.95 10h-2.02A7 7 0 1 1 13 5V1l4 3.5L13 8V3zm-1 5h2v5h4v2h-6V8z"/></svg></span>
    </div>
    <div class="v" id="dashKpiDue">0</div>
    <div class="dash-kpi-sub">Needs advance action</div>
  </button>
  <button class="dash-kpi dash-kpi-btn danger" onclick="dashboardOpenActionFiltered('past')">
    <div class="dash-kpi-head">
      <div class="k">Past EUL</div>
      <span class="dash-kpi-ico" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 2 1 21h22L12 2zm1 14h-2v2h2v-2zm0-6h-2v5h2V10z"/></svg></span>
    </div>
    <div class="v" id="dashKpiPast">0</div>
    <div class="dash-kpi-sub">Immediate attention</div>
  </button>
  <button class="dash-kpi dash-kpi-btn" onclick="dashboardOpenArchives()">
    <div class="dash-kpi-head">
      <div class="k">Archived Items</div>
      <span class="dash-kpi-ico" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M3 3h18v4H3V3zm2 6h14v12H5V9zm3 3v2h8v-2H8z"/></svg></span>
    </div>
    <div class="v" id="dashKpiArchived">0</div>
    <div class="dash-kpi-sub">Disposed and retained history</div>
  </button>
  <button class="dash-kpi dash-kpi-btn good" onclick="goToView('Manage Inventory')">
    <div class="dash-kpi-head">
      <div class="k">Depreciated Value</div>
      <span class="dash-kpi-ico" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3l5 5h-3v6h-4V8H7l5-5zm-7 14h14v4H5v-4z"/></svg></span>
    </div>
    <div class="v" id="dashKpiDep">0.00</div>
    <div class="dash-kpi-sub">Current estimated value</div>
  </button>
</div>

<div class="dash-panels">
  <div class="ics-card records">
    <div class="ics-card-head"><span class="card-title">Attention Queue <span class="card-badge records">PRIORITY</span></span></div>
    <ul class="dash-list" id="dashAttentionList"></ul>
    <div class="dash-chipbar">
      <button id="dashChipAll" class="dash-chip" onclick="dashboardOpenActionFiltered('all')">All (0)</button>
      <button id="dashChipNear" class="dash-chip" onclick="dashboardOpenActionFiltered('near')">Due &lt; 3m (0)</button>
      <button id="dashChipPast" class="dash-chip" onclick="dashboardOpenActionFiltered('past')">Past EUL (0)</button>
      <button id="dashChipArchived" class="dash-chip" onclick="dashboardOpenArchives()">Archived (0)</button>
      <button id="dashChipMissing" class="dash-chip" onclick="dashboardShowMissingData()">Missing Data (0)</button>
    </div>
  </div>
  <div class="ics-card records">
    <div class="ics-card-head"><span class="card-title">Quick Actions <span class="card-badge records">SHORTCUTS</span></span></div>
    <div class="dash-actions">
      <button class="small-btn finalize" onclick="dashboardNewICS()" ${canEdit ? '' : 'disabled title="Requires Encoder/Admin role"'}>New ICS</button>
      <button class="small-btn add" onclick="dashboardImportJSON()" ${canImport ? '' : 'disabled title="Requires Encoder/Admin role"'}>Import JSON</button>
      <button class="small-btn add" onclick="dashboardOpenActions()">Open Action Center</button>
      <button class="small-btn add" onclick="dashboardOpenArchives()">Open Archives</button>
    </div>
    <div class="dash-actions" style="margin-top:8px">
      <button class="small-btn add" onclick="dashboardExportFullBackup()" ${canExport ? '' : 'disabled title="Requires Viewer/Encoder/Admin role"'}>Export Full Backup</button>
      <button class="small-btn add" onclick="dashboardRefreshMetrics()">Refresh</button>
    </div>
    <p class="dash-note" id="dashDataNote" style="margin-top:10px"></p>
    <p class="dash-note" id="dashBackupNote"></p>
  </div>
</div>

<div class="dash-2col">
  <div class="ics-card records">
    <div class="ics-card-head"><span class="card-title">Top Risk Items</span></div>
    <div class="detail-table-wrap">
      <table class="detail-table">
        <thead><tr><th>#</th><th>ICS No.</th><th>Item No.</th><th>Description</th><th>Status</th></tr></thead>
        <tbody id="dashRiskRows"></tbody>
      </table>
    </div>
  </div>
  <div class="ics-card records">
    <div class="ics-card-head"><span class="card-title">Recent Edits</span></div>
    <ul class="dash-list" id="dashRecentList"></ul>
    <div class="detail-table-wrap dash-table-tight" style="margin-top:10px">
      <table class="detail-table">
        <thead><tr><th>Data Quality</th><th>Count</th></tr></thead>
        <tbody id="dashHealthRows"></tbody>
      </table>
    </div>
  </div>
</div>

<div class="dash-empty" id="dashEmptyHint" style="display:none">
  <strong>Start your workspace:</strong> No ICS records found yet. Use <code>Import JSON</code> or <code>New ICS</code> to begin.
</div>`;
}
