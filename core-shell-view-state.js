function animateViewEntrance(){
  const selectors = [
    '.welcome-banner',
    '.dash-story',
    '.dash-grid',
    '.dash-panels',
    '.dash-analytics',
    '.dash-2col',
    '.dash-hero',
    '.dash-health',
    '.ics-card'
  ];
  const nodes = [...content.querySelectorAll(selectors.join(','))];
  nodes.forEach((el, idx) => {
    el.classList.remove('view-enter');
    el.style.setProperty('--enter-delay', `${Math.min(idx * 45, 260)}ms`);
    el.classList.add('view-enter');
  });
}

function resetSheetPlacement(){
  if (!sheet) return;
  sheet.style.left = '';
  sheet.style.right = '';
  sheet.style.top = '';
  sheet.style.bottom = '';
  sheet.style.transform = '';
}

function placeSheetNearAddItemButton(){
  // Keep the floating form anchored to its default bottom-centered layout.
  resetSheetPlacement();
}

function getUndoSnapshot(){
  return safeParseJSON(localStorage.getItem(UNDO_SNAPSHOT_STORAGE_KEY) || 'null', null);
}

function updateProfileUndoButtonState(){
  const btn = document.getElementById('profileTraceUndoBtn');
  if (!btn) return;
  const canManageRole = hasRoleCapability('manage_roles');
  const hasUndoSnapshot = !!getUndoSnapshot();
  btn.disabled = !canManageRole || !hasUndoSnapshot;
  btn.title = !canManageRole
    ? 'Only Admin can undo data changes.'
    : (hasUndoSnapshot ? '' : 'No undo snapshot available.');
}

function captureUndoSnapshot(reason){
  const snapshot = {
    capturedAt: new Date().toISOString(),
    reason: (reason || '').toString().trim() || 'data-change',
    actorProfileKey: getCurrentActorProfileKey(),
    data: {
      records: JSON.parse(localStorage.getItem('icsRecords') || '[]'),
      archives: getArchivedItems(),
      auditLogs: getAuditLogs(),
      notifications: Array.isArray(notifications) ? JSON.parse(JSON.stringify(notifications)) : []
    }
  };
  localStorage.setItem(UNDO_SNAPSHOT_STORAGE_KEY, JSON.stringify(snapshot));
  updateProfileUndoButtonState();
  return snapshot;
}

function renderProfileRecentDataActivity(){
  const host = document.getElementById('profileRecentDataActivity');
  if (!host) return;
  const types = new Set(['import', 'backup', 'maintenance']);
  const rows = getAuditLogs()
    .filter((log) => types.has(((log?.type || '') + '').toLowerCase()))
    .slice(-10)
    .reverse();
  if (!rows.length){
    host.textContent = 'No recent maintenance/import/export actions.';
    return;
  }
  host.innerHTML = rows.map((log) => {
    const type = escapeHTML(((log?.type || 'info') + '').toUpperCase());
    const detail = escapeHTML((log?.detail || '').toString());
    const time = escapeHTML((log?.time || '').toString());
    const actor = escapeHTML(normalizeProfileKeyValue(log?.actorProfileKey || '') || 'unknown-profile');
    const deviceId = escapeHTML((log?.actorDeviceId || 'unknown-device').toString());
    const sessionId = escapeHTML((log?.actorSessionId || 'unknown-session').toString());
    return `<div><strong>${type}</strong> ${detail}</div><div class="dm-history-time">${time} | ${actor} | ${deviceId} | ${sessionId}</div>`;
  }).join('<div style="height:6px"></div>');
}

function undoLastDataChange(){
  if (!requireAccess('manage_roles', { label: 'undo last data change' })) return;
  const snapshot = getUndoSnapshot();
  if (!snapshot || !snapshot.data){
    notify('error', 'No undo snapshot available.');
    return;
  }
  localStorage.setItem('icsRecords', JSON.stringify(Array.isArray(snapshot.data.records) ? snapshot.data.records : []));
  setArchivedItems(Array.isArray(snapshot.data.archives) ? snapshot.data.archives : []);
  setAuditLogs(Array.isArray(snapshot.data.auditLogs) ? snapshot.data.auditLogs : []);
  notifications = Array.isArray(snapshot.data.notifications) ? snapshot.data.notifications : [];
  saveNotifications();
  renderNotifications();
  localStorage.removeItem(UNDO_SNAPSHOT_STORAGE_KEY);
  updateProfileUndoButtonState();
  recordAudit('maintenance', `Undo restore applied (${snapshot.reason || 'data-change'})`);
  refreshAfterDataImport();
  renderProfileTraceIntegritySummary();
  renderProfileRecentDataActivity();
  notify('success', `Undo restore completed (${snapshot.reason || 'data-change'}).`);
}

const viewRenderers = {
  Dashboard: renderDashboardView,
  'Manage Inventory': renderInventoryView,
  'Action Center': renderActionsView,
  Archives: renderArchivesView
};

function renderView(key){
  const renderer = viewRenderers[key];
  if (!renderer) return;
  content.innerHTML = renderer();
  if (key === 'Manage Inventory') {
    fab.style.display = 'grid';
    renderStageEmptyState();
    setStageContext(getCurrentFormMeta());
    loadICSRecords();
    if (sheet.classList.contains('show')){
      setTimeout(placeSheetNearAddItemButton, 30);
    }
  } else {
    fab.style.display = 'none';
    sheet.classList.remove('show');
    resetSheetPlacement();
    if (key === 'Dashboard') initDashboardView();
    if (key === 'Action Center') initActionsView();
    if (key === 'Archives') initArchivesView();
  }
  requestAnimationFrame(() => animateViewEntrance());
}

function toggleSheet(){
  if (!requireAccess('open_ics_editor')) return;
  const isOpen = sheet.classList.contains('show');
  if (isOpen){
    sheet.classList.remove('show');
    resetSheetPlacement();
    return;
  }
  sheet.classList.add('show');
  if (editingIndex === null) prepareNewICS();
  requestAnimationFrame(placeSheetNearAddItemButton);
  setTimeout(placeSheetNearAddItemButton, 70);
  setTimeout(placeSheetNearAddItemButton, 220);
}

function renderAppLogo(){
  if (!appLogo) return;
  const logo = sanitizeSchoolLogoDataUrl(schoolIdentity.logoDataUrl || '');
  if (logo){
    appLogo.style.backgroundImage = `url("${logo}")`;
    appLogo.classList.add('has-image');
    appLogo.textContent = '';
    appLogo.title = 'School logo';
    return;
  }
  appLogo.style.backgroundImage = '';
  appLogo.classList.remove('has-image');
  appLogo.textContent = getSchoolShortLabel(schoolIdentity.schoolName || '');
  appLogo.title = 'School initials';
}

function getCurrentActorProfileKey(){
  return normalizeProfileKeyValue(currentUser?.profileKey || sessionState?.profileKey || '') || 'unknown-profile';
}

function initArchivesView(){
  const canArchive = hasRoleCapability('archive_items');
  const body = document.getElementById('archiveBody');
  if (!body) return;
  const archived = getArchivedItems().filter((a) => {
    if (!archivesFilterIcs) return true;
    return normalizeICSKey(a.source?.icsNo || '') === normalizeICSKey(archivesFilterIcs);
  });
  if (!archived.length){
    body.innerHTML = '<tr><td class="empty-cell" colspan="10">No archived items yet.</td></tr>';
    return;
  }
  body.innerHTML = archived.map((a, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td>${(a.archivedAt || '').slice(0,10)}</td>
      <td><button class="ics-link-btn" onclick="openArchivedItemHistory(${idx})">${a.source?.icsNo || ''}</button></td>
      <td>${a.item?.desc || ''}</td>
      <td>${a.item?.itemNo || ''}</td>
      <td style="text-align:center">${a.item?.eul ?? ''}</td>
      <td style="text-align:center"><span class="risk-badge ${a.disposal?.status === 'approved' ? 'ok' : 'warn'}">${a.disposal?.status === 'approved' ? 'Approved' : 'Not Approved'}</span></td>
      <td>${a.disposal?.approvedBy || '-'}</td>
      <td>${a.disposal?.remarks || '-'}</td>
      <td style="text-align:center">
        <button class="small-btn add icon-only-btn" title="Unarchive Item" aria-label="Unarchive Item" onclick="unarchiveItem(${idx})" ${canArchive ? '' : 'disabled'}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7h2v7h12v-7h2zM12 3l5 5h-3v6h-4V8H7l5-5z"/></svg></button>
      </td>
    </tr>
  `).join('');
}

function initActionsView(){
  eulCurrentPage = 1;
  const records = JSON.parse(localStorage.getItem('icsRecords') || '[]');
  let c = 0;
  let w = 0;
  let g = 0;
  eulActionRows = [];

  records.forEach((r) => {
    (r.items || []).forEach((it) => {
      const s = classifyEULItem(r, it);
      if (s.code === 'past') c += 1;
      else if (s.code === 'near') w += 1;
      else g += 1;
      if (s.code === 'ok') return;

      const inspections = Array.isArray(it.inspections) ? it.inspections : [];
      const lastInspection = inspections.length ? inspections[inspections.length - 1] : null;
      eulActionRows.push({
        icsNo: r.icsNo || '',
        entity: r.entity || '',
        desc: it.desc || '',
        itemNo: it.itemNo || '',
        eulDays: computeEULDaysLeft(r, it),
        status: s.status,
        cls: s.cls,
        code: s.code,
        inspection: lastInspection
      });
    });
  });

  eulActionRows.sort((a, b) => {
    const rank = (x) => x.code === 'past' ? 0 : 1;
    if (rank(a) !== rank(b)) return rank(a) - rank(b);
    return (a.icsNo || '').localeCompare(b.icsNo || '');
  });

  const validKeys = new Set(eulActionRows.map((r) => `${r.icsNo || ''}||${r.itemNo || ''}`));
  Object.keys(actionCenterSelectedKeys || {}).forEach((k) => {
    if (!validKeys.has(k)) delete actionCenterSelectedKeys[k];
  });

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = String(val); };
  set('eulCritical', c);
  set('eulWarning', w);
  set('eulGood', g);
  renderEULPage();
  bindInspectionModalValidation();
}

function renderEULPage(){
  const canArchive = hasRoleCapability('archive_items');
  const body = document.getElementById('eulBody');
  if (!body) return;
  const rows = actionCenterFilter === 'near'
    ? eulActionRows.filter((r) => r.code === 'near')
    : actionCenterFilter === 'past'
      ? eulActionRows.filter((r) => r.code === 'past')
      : eulActionRows;
  const scoped = actionCenterICSFilter
    ? rows.filter((r) => normalizeICSKey(r.icsNo || '') === normalizeICSKey(actionCenterICSFilter))
    : rows;
  const targeted = actionCenterItemFilter
    ? scoped.filter((r) => normalizeICSKey(r.itemNo || '') === normalizeICSKey(actionCenterItemFilter))
    : scoped;
  body.innerHTML = targeted.length ? targeted.map((row, idx) => {
    const isTargeted = !!actionCenterItemFilter
      && normalizeICSKey(row.itemNo || '') === normalizeICSKey(actionCenterItemFilter)
      && (!actionCenterICSFilter || normalizeICSKey(row.icsNo || '') === normalizeICSKey(actionCenterICSFilter));
    const targetBadge = isTargeted ? '<span class="risk-badge warn">Target</span>' : '';
    const insp = row.inspection
      ? (row.inspection.status === 'unserviceable'
        ? '<span class="risk-badge danger">Unserviceable</span>'
        : '<span class="risk-badge ok">Serviceable</span>')
      : '<span class="card-subtext">Not inspected</span>';
    return `<tr class="${isTargeted ? 'targeted-row' : ''}">
      <td>${idx + 1}</td>
      <td><button class="ics-link-btn" onclick="openICSDetailsByKey('${row.icsNo.replace(/'/g, '&#39;')}','${(row.itemNo || '').replace(/'/g, '&#39;')}')">${row.icsNo}</button></td>
      <td>${row.desc}</td>
      <td style="text-align:center">${row.eulDays === '' ? '' : row.eulDays}</td>
      <td style="text-align:center"><span class="${row.cls}">${row.status}</span></td>
      <td style="text-align:center">${insp}</td>
      <td style="text-align:center">
        <div class="actions-eul-actions">
          ${targetBadge}
          <select class="stage-input action-select" onchange="onInspectionChange(this,'${row.icsNo.replace(/'/g, '&#39;')}','${(row.itemNo || '').replace(/'/g, '&#39;')}')" ${canArchive ? '' : 'disabled title="Requires Encoder/Admin role"'}>
            <option value="">Select</option>
            <option value="serviceable">Serviceable</option>
            <option value="unserviceable">Unserviceable</option>
          </select>
          <button class="small-btn add icon-only-btn" title="Inspection History" aria-label="Inspection History" onclick="openInspectionHistory('${row.icsNo.replace(/'/g, '&#39;')}','${(row.itemNo || '').replace(/'/g, '&#39;')}')"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 3a9 9 0 1 0 8.95 10h-2.02A7 7 0 1 1 13 5V1l4 3.5L13 8V3zm-1 5h2v5h4v2h-6V8z"/></svg></button>
        </div>
      </td>
      <td style="text-align:center">
        <input type="checkbox" ${actionCenterSelectedKeys[getActionItemKey(row.icsNo, row.itemNo)] ? 'checked' : ''} ${canArchive ? '' : 'disabled title="Requires Encoder/Admin role"'} onchange="toggleActionCenterSelection('${row.icsNo.replace(/'/g, '&#39;')}','${(row.itemNo || '').replace(/'/g, '&#39;')}', this.checked)" />
      </td>
    </tr>`;
  }).join('') : '<tr><td colspan="8" class="empty-cell">No items for current filter.</td></tr>';
}

function openEULCenter(){
  initActionsView();
}

function closeEULCenter(){
  // EUL center is now rendered inline in Action Center view.
}
