function openInventoryView(){
  const item = [...navItems].find((n) => n.dataset.view === 'Manage Inventory');
  if (item && !item.classList.contains('active')) item.click();
}

function monthsUntil(dateIso){
  const target = new Date(dateIso);
  if (Number.isNaN(target.getTime())) return null;
  const now = new Date();
  const yearDiff = target.getFullYear() - now.getFullYear();
  const monthDiff = target.getMonth() - now.getMonth();
  const dayAdj = target.getDate() < now.getDate() ? -1 : 0;
  return yearDiff * 12 + monthDiff + dayAdj;
}

function classifyEULItem(record, item){
  const issued = new Date(record.issuedDate);
  const eulYears = Number((item.eul ?? '').toString().trim());
  if (Number.isNaN(issued.getTime()) || !Number.isFinite(eulYears) || eulYears <= 0){
    return { status: 'Within EUL', cls: 'risk-badge ok', code: 'ok' };
  }
  const expiry = new Date(issued);
  expiry.setFullYear(expiry.getFullYear() + eulYears);
  const monthsLeft = monthsUntil(expiry.toISOString().slice(0, 10));
  if (monthsLeft === null) return { status: 'Within EUL', cls: 'risk-badge ok', code: 'ok' };
  if (monthsLeft < 0) return { status: 'Past EUL', cls: 'risk-badge danger', code: 'past' };
  if (monthsLeft <= 3) return { status: 'Due < 3m', cls: 'risk-badge warn', code: 'near' };
  return { status: 'Within EUL', cls: 'risk-badge ok', code: 'ok' };
}

function classifyEULUrgencyTier(record, item){
  const issued = new Date(record?.issuedDate || '');
  const eulYears = Number((item?.eul ?? '').toString().trim());
  if (Number.isNaN(issued.getTime()) || !Number.isFinite(eulYears) || eulYears <= 0) return { tier: 'ok' };
  const expiry = new Date(issued);
  expiry.setFullYear(expiry.getFullYear() + eulYears);
  const ms = new Date(expiry.getFullYear(), expiry.getMonth(), expiry.getDate()).getTime() - new Date().setHours(0, 0, 0, 0);
  const daysLeft = Math.round(ms / 86400000);
  if (daysLeft < 0) return { tier: 'overdue', daysLeft };
  if (daysLeft <= 30) return { tier: 'lt30', daysLeft };
  if (daysLeft <= 90) return { tier: 'lt90', daysLeft };
  return { tier: 'ok', daysLeft };
}

function computeEULDaysLeft(record, item){
  const issued = new Date(record?.issuedDate || '');
  const eulYears = Number((item?.eul ?? '').toString().trim());
  if (Number.isNaN(issued.getTime()) || !Number.isFinite(eulYears) || eulYears <= 0) return '';
  const expiry = new Date(issued);
  expiry.setFullYear(expiry.getFullYear() + eulYears);
  const ms = new Date(expiry.getFullYear(), expiry.getMonth(), expiry.getDate()).getTime() - new Date().setHours(0, 0, 0, 0);
  return Math.round(ms / 86400000);
}

function computeRecordMetrics(record){
  const issued = new Date(record.issuedDate);
  const now = new Date();
  const elapsedYears = Number.isNaN(issued.getTime()) ? 0 : Math.max(0, (now - issued) / (1000 * 60 * 60 * 24 * 365.25));
  const items = record.items || [];
  let dueSoon = 0;
  let pastDue = 0;
  let totalValue = 0;
  let depreciatedValue = 0;

  items.forEach((it) => {
    const qty = parseQuantityValue(it.qtyText ?? it.qty);
    const unitCost = parseCurrencyValue(it.unitCost);
    const lineTotal = Number.isFinite(parseCurrencyValue(it.total))
      ? parseCurrencyValue(it.total)
      : (Number.isFinite(qty) && Number.isFinite(unitCost) ? qty * unitCost : 0);
    const eulYears = Number((it.eul ?? '').toString().trim());
    totalValue += lineTotal || 0;

    if (Number.isFinite(eulYears) && eulYears > 0 && !Number.isNaN(issued.getTime())){
      const expiry = new Date(issued);
      expiry.setFullYear(expiry.getFullYear() + eulYears);
      const monthsLeft = monthsUntil(expiry.toISOString().slice(0, 10));
      if (monthsLeft !== null){
        if (monthsLeft < 0) pastDue += 1;
        else if (monthsLeft <= 3) dueSoon += 1;
      }
      const factor = Math.max(0, 1 - (elapsedYears / eulYears));
      depreciatedValue += (lineTotal || 0) * factor;
    } else {
      depreciatedValue += lineTotal || 0;
    }
  });

  return {
    totalItems: items.length,
    dueSoon,
    pastDue,
    totalValue,
    depreciatedValue
  };
}

function renderEULStatus(record){
  const items = Array.isArray(record?.items) ? record.items : [];
  const groups = {
    overdue: [],
    lt30: [],
    lt90: []
  };

  items.forEach((it, idx) => {
    const tier = classifyEULUrgencyTier(record, it).tier;
    if (!groups[tier]) return;
    const label = (it.itemNo || '').toString().trim() || `Item ${idx + 1}`;
    const itemNo = (it.itemNo || '').toString().trim();
    groups[tier].push({ label, itemNo });
  });

  const totalAtRisk = groups.overdue.length + groups.lt30.length + groups.lt90.length;
  if (totalAtRisk){
    const summaryClass = groups.overdue.length ? 'danger' : 'warn';
    const summary = `<span class="risk-badge ${summaryClass}">At Risk: ${totalAtRisk} item${totalAtRisk === 1 ? '' : 's'}</span>`;
    const renderTier = (tier, cls, label, action) => {
      const bucket = groups[tier];
      if (!bucket.length) return '';
      const firstItemNo = bucket.find((x) => x.itemNo)?.itemNo || '';
      const tooltip = `${label} items: ${bucket.map((x) => x.label).join(', ')}`;
      const badge = `<span class="risk-badge ${cls}" title="${escapeHTML(tooltip)}">${label}: ${bucket.length}</span>`;
      if (!firstItemNo) return badge;
      const icsNo = escapeHTML(record.icsNo || '');
      const safeItem = escapeHTML(firstItemNo);
      return `<button class="ics-link-btn" onclick="${action}('${icsNo}','${safeItem}')">${badge}</button>`;
    };

    const overdueBadge = renderTier('overdue', 'danger', 'Overdue', 'openPastEULForItem');
    const lt30Badge = renderTier('lt30', 'warn', 'Due <30d', 'openNearEULForItem');
    const lt90Badge = renderTier('lt90', 'near', 'Due <90d', 'openNearEULForItem');
    return `${summary}${overdueBadge}${lt30Badge}${lt90Badge}`.trim();
  }
  return '<span class="risk-badge ok">Within EUL</span>';
}

function renderValueCell(record){
  const m = computeRecordMetrics(record);
  const total = formatCurrencyValue(m.totalValue);
  const dep = formatCurrencyValue(m.depreciatedValue);
  const ratio = m.totalValue > 0 ? (m.depreciatedValue / m.totalValue) : 1;
  const depClass = ratio < 0.4 ? 'danger' : (ratio < 0.75 ? 'warn' : 'ok');
  return `<div class="value-main">${total}</div><div class="value-sub"><span class="risk-badge ${depClass}">Depreciated</span> ${dep}</div>`;
}

function loadICSRecords(){
  const canEdit = hasRoleCapability('edit_records');
  const canDelete = hasRoleCapability('delete_records');
  const canExport = hasRoleCapability('export_data');
  const allRecords = JSON.parse(localStorage.getItem('icsRecords') || '[]');
  const body = document.getElementById('icsRecords');
  if (!body) return;
  body.innerHTML = '';
  refreshAutoSuggest();
  const rows = allRecords
    .map((r, i) => ({ r, i }))
    .filter(({ r }) => (inventoryFilter === 'missing' ? recordHasMissingData(r) : true));

  if (rows.length === 0){
    body.innerHTML = inventoryFilter === 'missing'
      ? '<tr><td class="empty-cell" colspan="9">No ICS records with missing data.</td></tr>'
      : '<tr><td class="empty-cell" colspan="9">No ICS records yet. Add or import an ICS to get started.</td></tr>';
    return;
  }

  rows.forEach((entry, rowIdx) => {
    const r = entry.r;
    const i = entry.i;
    const metrics = computeRecordMetrics(r);
    const statusPill = renderRecordStatusPill(r);
    const safeIcs = escapeHTML(r.icsNo || '');
    const safeEntity = escapeHTML(r.entity || '');
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${rowIdx + 1}</td>
      <td><div class="ics-no-wrap"><div class="ics-no-line"><button class="ics-link-btn" title="${safeIcs}" aria-label="Open ICS ${safeIcs}" onclick="openICSDetailsByIndex(${i})">${safeIcs}</button>${statusPill}</div></div></td>
      <td>${safeEntity}</td>
      <td>${r.issuedDate}</td>
      <td>${r.accountable}</td>
      <td>${renderEULStatus(r)}</td>
      <td>${metrics.totalItems}</td>
      <td>${renderValueCell(r)}</td>
      <td>
        <button class="small-btn add icon-only-btn" title="Edit ICS" aria-label="Edit ICS" onclick="editICS(${i})" ${canEdit ? '' : 'disabled'}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 17.25V21h3.75L17.8 9.94l-3.75-3.75L3 17.25zm2.92 2.33H5v-.92l9.06-9.06.92.92L5.92 19.58zM20.7 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg></button>
        <button class="small-btn add icon-only-btn" title="Print ICS" aria-label="Print ICS" onclick="printICS(${i})"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9V3h12v6H6zm10-4H8v2h8V5zM6 19v2h12v-2H6zm14-8h-2V9H6v2H4a2 2 0 0 0-2 2v4h4v-3h12v3h4v-4a2 2 0 0 0-2-2z"/></svg></button>
        <button class="small-btn add icon-only-btn" title="Export ICS" aria-label="Export ICS" onclick="exportICS(${i})" ${canExport ? '' : 'disabled'}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l5 5h-3v6h-4V8H7l5-5zm-7 14h14v4H5v-4z"/></svg></button>
        <button class="small-btn del icon-only-btn" title="Delete ICS" aria-label="Delete ICS" onclick="deleteICS(${i})" ${canDelete ? '' : 'disabled'}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6l1 2h4v2H4V5h4l1-2zm1 6h2v9h-2V9zm4 0h2v9h-2V9zM7 9h2v9H7V9z"/></svg></button>
      </td>`;
    body.appendChild(tr);
  });
}

function deleteICS(i){
  if (!requireAccess('delete_record')) return;
  const records = JSON.parse(localStorage.getItem('icsRecords') || '[]');
  const target = records[i];
  if (!target) return;
  showConfirm(
    'Confirm Delete',
    `Delete ICS ${target.icsNo}? This action cannot be undone.`,
    () => {
      records.splice(i, 1);
      localStorage.setItem('icsRecords', JSON.stringify(records));
      recordAudit('delete', `Deleted ICS ${target.icsNo || 'record'}.`, buildRecordLineageAuditMeta(target));
      loadICSRecords();
      notify('info', `Deleted ${target.icsNo || 'ICS record'}.`);
    },
    'Delete'
  );
}
