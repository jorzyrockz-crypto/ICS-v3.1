function getActionItemKey(icsNo, itemNo){
  return `${icsNo || ''}||${itemNo || ''}`;
}

function toggleActionCenterSelection(icsNo, itemNo, checked){
  if (!requireAccess('archive_items', { label: 'select Action Center items for batch actions' })) return;
  const key = getActionItemKey(icsNo, itemNo);
  if (checked) actionCenterSelectedKeys[key] = { icsNo: icsNo || '', itemNo: itemNo || '' };
  else delete actionCenterSelectedKeys[key];
  const active = [...navItems].find(n => n.classList.contains('active'))?.dataset?.view;
  if (active === 'Action Center') renderView('Action Center');
}

function openBatchWasteReportFromActionCenter(){
  if (!requireAccess('archive_items', { label: 'prepare batch Waste Materials Report' })) return;
  const selected = Object.values(actionCenterSelectedKeys || {});
  if (!selected.length){
    notify('error', 'Select at least one item in Action Center for Batch PRINT WMR.');
    return;
  }
  const invalid = selected.filter((x) => !hasDisposalSituation(x.icsNo, x.itemNo));
  if (invalid.length){
    const preview = invalid.slice(0, 4).map((x) => `${x.icsNo || ''}/${x.itemNo || ''}`).join(', ');
    notify('error', `Batch PRINT WMR only allows items with Situation "Item for disposal". Invalid: ${preview}${invalid.length > 4 ? ' ...' : ''}`);
    return;
  }
  openWasteReportModalForTargets(selected, '');
}

function hasDisposalSituation(icsNo, itemNo){
  const ref = findItemRef(icsNo, itemNo);
  if (!ref) return false;
  const item = ref.records?.[ref.rIdx]?.items?.[ref.iIdx];
  const logs = Array.isArray(item?.inspections) ? item.inspections : [];
  return logs.some((log) =>
    (log?.status || '').toString().trim().toLowerCase() === 'unserviceable'
    && isDisposalInspectionReason(log?.reason || '')
  );
}


function unarchiveItem(index){
  if (!requireAccess('archive_items', { label: 'unarchive items' })) return;
  const archived = getArchivedItems();
  const entry = archived[index];
  if (!entry) return;
  const records = JSON.parse(localStorage.getItem('icsRecords') || '[]');
  const targetIdx = records.findIndex(r => (r.icsNo || '') === (entry.source?.icsNo || ''));
  if (targetIdx === -1){
    notify('error', `Cannot unarchive. Source ICS ${entry.source?.icsNo || ''} was not found.`);
    return;
  }

  const target = records[targetIdx];
  target.items = Array.isArray(target.items) ? target.items : [];
  const itemNo = (entry.item?.itemNo || '').trim().toLowerCase();
  const duplicate = target.items.some(it => (it.itemNo || '').trim().toLowerCase() === itemNo && itemNo);
  if (duplicate){
    notify('error', `Cannot unarchive. Item No. ${entry.item?.itemNo || ''} already exists in ICS ${target.icsNo}.`);
    return;
  }

  target.items.push(JSON.parse(JSON.stringify(entry.item)));
  records[targetIdx] = appendRecordLineage(
    target,
    'unarchive',
    `unarchive:${entry.item?.itemNo || 'item'}`
  );
  archived.splice(index, 1);
  localStorage.setItem('icsRecords', JSON.stringify(records));
  setArchivedItems(archived);
  recordAudit(
    'unarchive',
    `Unarchived item ${entry.item?.itemNo || ''} back to ${target.icsNo}.`,
    buildRecordLineageAuditMeta(records[targetIdx], { itemNo: entry.item?.itemNo || '' })
  );
  notify('success', `Unarchived item ${entry.item?.itemNo || ''} back to ${target.icsNo}.`);

  initArchivesView();
  initActionsView();
  loadICSRecords();
}


function onInspectionChange(sel, icsNo, itemNo){
  if (!requireAccess('archive_items', { label: 'record inspection results' })){
    if (sel) sel.value = '';
    return;
  }
  if (!sel || !sel.value) return;
  if (sel.value === 'serviceable'){
    const ref = findItemRef(icsNo, itemNo);
    if (!ref) return;
    const it = ref.records[ref.rIdx].items[ref.iIdx];
    it.inspections = Array.isArray(it.inspections) ? it.inspections : [];
    it.inspections.push({
      status: 'serviceable',
      date: new Date().toISOString().slice(0,10),
      recordedAt: new Date().toISOString(),
      recordedByProfileKey: getCurrentActorProfileKey()
    });
    ref.records[ref.rIdx] = appendRecordLineage(
      ref.records[ref.rIdx],
      'inspection',
      `serviceable:${itemNo || 'item'}`
    );
    localStorage.setItem('icsRecords', JSON.stringify(ref.records));
    notify('info', `Inspection saved (Serviceable) for ${itemNo}`);
    initActionsView();
    return;
  }
  if (sel.value === 'unserviceable'){
    pendingInspection = { icsNo, itemNo };
    sel.value = '';
    let overlay = document.getElementById('inspectionOverlay');
    let reasonEl = document.getElementById('inspReason');
    let dateEl = document.getElementById('inspDate');
    let notesEl = document.getElementById('inspNotes');
    if (!overlay || !reasonEl || !dateEl || !notesEl){
      const shell = document.createElement('div');
      shell.innerHTML = `
        <div class="actions-modal-overlay" id="inspectionOverlay">
          <div class="actions-modal modal-sm">
            <div class="modal-head">
              <h3>Inspection Result - Unserviceable</h3>
              <p class="modal-sub">Record situation details before proceeding to archive or report actions.</p>
            </div>
            <div class="modal-body">
              <div class="form-col modal-form">
                <label>Situation</label>
                <select id="inspReason" class="stage-input">
                  <option value="">Select Situation</option>
                  <option>Item beyond EUL and unserviceable</option>
                  <option>Item damaged / obsolete</option>
                  <option>Item for disposal</option>
                  <option>Item transferred to another office</option>
                  <option>Item lost / destroyed</option>
                </select>
                <label>Date</label>
                <input id="inspDate" type="date" class="stage-input" />
                <label>Remarks</label>
                <textarea id="inspNotes" class="stage-input" rows="3" placeholder="Remarks / inspection notes"></textarea>
              </div>
            </div>
            <div class="modal-foot">
              <div class="ics-card-actions">
                <button class="small-btn add" onclick="closeInspectionModal()">Cancel</button>
                <button id="inspSaveBtn" class="small-btn finalize" onclick="saveInspection()" disabled>Save</button>
                <button id="inspArchiveBtn" class="small-btn finalize" onclick="saveInspectionAndArchive()" disabled>Archive Item</button>
              </div>
            </div>
          </div>
        </div>`;
      const injected = shell.firstElementChild;
      if (injected) document.body.appendChild(injected);
      overlay = document.getElementById('inspectionOverlay');
      reasonEl = document.getElementById('inspReason');
      dateEl = document.getElementById('inspDate');
      notesEl = document.getElementById('inspNotes');
      bindInspectionModalValidation();
    }
    clearFieldErrors(overlay || document);
    if (!overlay || !reasonEl || !dateEl || !notesEl){
      notify('error', 'Inspection modal is unavailable. Reload the page and try again.');
      return;
    }
    reasonEl.value = '';
    dateEl.value = '';
    notesEl.value = '';
    overlay.classList.add('show');
    updateInspectionArchiveButtonState();
  }
}

function closeInspectionModal(){
  const overlay = document.getElementById('inspectionOverlay');
  if (overlay) overlay.classList.remove('show');
  clearFieldErrors(overlay || document);
  pendingInspection = null;
  document.getElementById('inspReason').value = '';
  document.getElementById('inspDate').value = '';
  document.getElementById('inspNotes').value = '';
  updateInspectionArchiveButtonState();
}

function saveInspection(){
  return saveInspectionCore(false);
}

function saveInspectionAndArchive(){
  return saveInspectionCore(true);
}

function saveInspectionCore(openArchiveAfter){
  if (!requireAccess('archive_items', { label: 'save inspection results' })) return false;
  if (!pendingInspection){
    notify('error', 'No selected item for inspection.');
    return false;
  }
  const reason = (document.getElementById('inspReason')?.value || '').trim();
  const date = (document.getElementById('inspDate')?.value || '').trim();
  const notes = (document.getElementById('inspNotes')?.value || '').trim();
  setFieldError('inspReason', false);
  setFieldError('inspDate', false);
  if (!reason || !date){
    setFieldError('inspReason', !reason);
    setFieldError('inspDate', !date);
    notify('error', 'Inspection reason and date are required.');
    return false;
  }
  const ref = findItemRef(pendingInspection.icsNo, pendingInspection.itemNo);
  if (!ref) return false;
  const it = ref.records[ref.rIdx].items[ref.iIdx];
  it.inspections = Array.isArray(it.inspections) ? it.inspections : [];
  it.inspections.push({
    status: 'unserviceable',
    reason,
    date,
    notes,
    recordedAt: new Date().toISOString(),
    recordedByProfileKey: getCurrentActorProfileKey()
  });
  ref.records[ref.rIdx] = appendRecordLineage(
    ref.records[ref.rIdx],
    'inspection',
    `unserviceable:${it.itemNo || pendingInspection.itemNo || 'item'}`
  );
  localStorage.setItem('icsRecords', JSON.stringify(ref.records));
  const target = { icsNo: pendingInspection.icsNo, itemNo: pendingInspection.itemNo };
  pendingInspection = null;
  document.getElementById('inspReason').value = '';
  document.getElementById('inspDate').value = '';
  document.getElementById('inspNotes').value = '';
  updateInspectionArchiveButtonState();
  closeInspectionModal();
  notify('success', `Inspection saved (Unserviceable) for ${it.itemNo || 'item'}`);
  if (isDisposalInspectionReason(reason)){
    openWasteReportModal(target.icsNo, target.itemNo, openArchiveAfter ? 'archive' : '', openArchiveAfter ? 'inspection' : '');
  } else if (openArchiveAfter){
    openArchiveModal(target.icsNo, target.itemNo);
  } else {
    initActionsView();
  }
  return true;
}

function isDisposalInspectionReason(reason){
  return (reason || '').toString().trim().toLowerCase() === 'item for disposal';
}

function bindInspectionModalValidation(){
  const reasonEl = document.getElementById('inspReason');
  const dateEl = document.getElementById('inspDate');
  if (reasonEl && !reasonEl.dataset.boundArchiveCheck){
    reasonEl.addEventListener('change', updateInspectionArchiveButtonState);
    reasonEl.dataset.boundArchiveCheck = '1';
  }
  if (dateEl && !dateEl.dataset.boundArchiveCheck){
    dateEl.addEventListener('input', updateInspectionArchiveButtonState);
    dateEl.addEventListener('change', updateInspectionArchiveButtonState);
    dateEl.dataset.boundArchiveCheck = '1';
  }
  updateInspectionArchiveButtonState();
}

function updateInspectionArchiveButtonState(){
  const saveBtn = document.getElementById('inspSaveBtn');
  const archiveBtn = document.getElementById('inspArchiveBtn');
  const reason = (document.getElementById('inspReason')?.value || '').trim();
  const date = (document.getElementById('inspDate')?.value || '').trim();
  const enabled = !!(reason && date && pendingInspection);
  if (saveBtn) saveBtn.disabled = !enabled;
  if (archiveBtn) archiveBtn.disabled = !enabled;
}

function openInspectionHistory(icsNo, itemNo){
  let body = document.getElementById('inspectionHistoryBody');
  let overlay = document.getElementById('inspectionHistoryOverlay');
  if (!body || !overlay){
    const shell = document.createElement('div');
    shell.innerHTML = `
      <div class="actions-modal-overlay" id="inspectionHistoryOverlay">
        <div class="actions-modal modal-lg inspection-history-modal">
          <div class="modal-head inspection-history-head">
            <h3 class="inspection-history-title">Inspection History</h3>
            <button class="inspection-history-close" onclick="closeInspectionHistory()">Close</button>
          </div>
          <div class="modal-body" id="inspectionHistoryBody"></div>
        </div>
      </div>`;
    const injected = shell.firstElementChild;
    if (injected) document.body.appendChild(injected);
    body = document.getElementById('inspectionHistoryBody');
    overlay = document.getElementById('inspectionHistoryOverlay');
    if (!body || !overlay) return;
    if (typeof window.refreshIcons === 'function') window.refreshIcons();
  }
  const ref = findItemRef(icsNo, itemNo);
  if (!ref){
    body.innerHTML = '<div class="inspection-history-empty">No inspection history found.</div>';
    overlay.classList.add('show');
    return;
  }
  const it = ref.records[ref.rIdx].items[ref.iIdx];
  const sameICSPreparedItems = (ref.records[ref.rIdx].items || []).filter((x) => x?.wasteReport?.preparedAt).map((x) => x.itemNo || '').filter(Boolean);
  const currentHasReport = !!(it.wasteReport && it.wasteReport.preparedAt);
  const logs = Array.isArray(it.inspections) ? it.inspections : [];
  const hasWasteReport = currentHasReport;
  const canArchive = hasRoleCapability('archive_items');
  const archiveTitle = canArchive ? '' : 'Requires Encoder/Admin role';
  const rows = logs.slice().reverse().map((log) => {
    const statusRaw = (log.status || '').toString().trim().toLowerCase();
    const statusLabel = statusRaw || '-';
    const statusClass = statusRaw === 'serviceable' ? 'ok' : (statusRaw === 'unserviceable' ? 'danger' : '');
    const canPrint = hasWasteReport && statusRaw === 'unserviceable';
    const actionCell = canPrint
      ? `<button class="small-btn add icon-only-btn" title="Print Waste Report" aria-label="Print Waste Report" onclick="printWasteMaterialsReport('${(icsNo || '').replace(/'/g, '&#39;')}','${(itemNo || '').replace(/'/g, '&#39;')}')" ${canArchive ? '' : 'disabled'}><i data-lucide="printer" aria-hidden="true"></i></button>`
      : '-';
    const recordedBy = normalizeProfileKeyValue(log.recordedByProfileKey || log.recordedBy || log.by || '');
    const recordedMeta = `${log.recordedAt || '-'}${recordedBy ? ` | ${recordedBy}` : ''}`;
    return `
      <tr>
        <td>${log.date || '-'}</td>
        <td>${statusRaw ? `<span class="insp-status-pill ${statusClass}">${statusLabel}</span>` : '-'}</td>
        <td>${log.reason || '-'}</td>
        <td>${log.notes || '-'}</td>
        <td class="inspection-history-meta">${escapeHTML(recordedMeta)}</td>
        <td>${actionCell}</td>
      </tr>
    `;
  }).join('');
  const printToolbar = `
    <div style="display:flex;justify-content:flex-end;gap:8px;margin:0 0 8px">
      <button class="small-btn add icon-only-btn" title="${canArchive ? 'Batch Print WMR' : archiveTitle}" aria-label="Batch Print WMR" ${sameICSPreparedItems.length && canArchive ? '' : 'disabled'} onclick="printWasteMaterialsReportForICS('${(icsNo || '').replace(/'/g, '&#39;')}')"><i data-lucide="printer" aria-hidden="true"></i></button>
      <button class="small-btn add icon-only-btn" title="${canArchive ? 'Print This Item' : archiveTitle}" aria-label="Print This Item" ${currentHasReport && canArchive ? '' : 'disabled'} onclick="printWasteMaterialsReport('${(icsNo || '').replace(/'/g, '&#39;')}','${(itemNo || '').replace(/'/g, '&#39;')}')"><i data-lucide="printer" aria-hidden="true"></i></button>
    </div>`;
  body.innerHTML = logs.length ? `
    ${printToolbar}
    <div class="inspection-history-table-wrap">
      <table class="inspection-history-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Status</th>
            <th>Reason</th>
            <th>Notes</th>
            <th>Recorded At / By</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  ` : `${printToolbar}<div class="inspection-history-empty">No inspection history found.</div>`;
  if (typeof window.refreshIcons === 'function') window.refreshIcons();
  overlay.classList.add('show');
}

function closeInspectionHistory(){
  const overlay = document.getElementById('inspectionHistoryOverlay');
  if (overlay) overlay.classList.remove('show');
}

function openArchiveModal(icsNo, itemNo){
  if (!requireAccess('archive_items', { label: 'open archive modal' })) return;
  pendingArchiveTarget = { icsNo, itemNo };
  const overlay = document.getElementById('archiveOverlay');
  clearFieldErrors(overlay || document);
  if (overlay) overlay.classList.add('show');
}

function closeArchiveModal(returnToInspection){
  const target = pendingArchiveTarget ? { ...pendingArchiveTarget } : null;
  pendingArchiveTarget = null;
  const overlay = document.getElementById('archiveOverlay');
  if (overlay) overlay.classList.remove('show');
  clearFieldErrors(overlay || document);
  if (returnToInspection && target){
    pendingInspection = { icsNo: target.icsNo, itemNo: target.itemNo };
    const inspOverlay = document.getElementById('inspectionOverlay');
    if (inspOverlay) inspOverlay.classList.add('show');
    updateInspectionArchiveButtonState();
  }
}

function confirmArchiveItem(){
  if (!requireAccess('archive_items', { label: 'archive items' })) return;
  if (!pendingArchiveTarget) return;
  const status = (document.getElementById('archiveApprovalStatus')?.value || '').trim();
  setFieldError('archiveApprovalStatus', false);
  if (!status){
    setFieldError('archiveApprovalStatus', true);
    notify('error', 'Select archive approval status.');
    return;
  }
  const approvedBy = (document.getElementById('archiveApprovedBy')?.value || '').trim();
  const approvedDate = (document.getElementById('archiveApprovedDate')?.value || '').trim();
  const referenceNo = (document.getElementById('archiveReferenceNo')?.value || '').trim();
  const remarks = (document.getElementById('archiveRemarks')?.value || '').trim();

  const ref = findItemRef(pendingArchiveTarget.icsNo, pendingArchiveTarget.itemNo);
  if (!ref){
    notify('error', 'Item not found for archive.');
    closeArchiveModal();
    return;
  }

  const sourceRecord = ref.records[ref.rIdx];
  const item = sourceRecord.items[ref.iIdx];
  const lastInsp = Array.isArray(item.inspections)
    ? [...item.inspections].reverse().find((x) => (x.status || '').toLowerCase() === 'unserviceable')
    : null;
  if (lastInsp && isDisposalInspectionReason(lastInsp.reason) && !(item.wasteReport && item.wasteReport.preparedAt)){
    notify('error', 'Complete Waste Materials Report metadata before archiving this disposal item.');
    closeArchiveModal();
    openWasteReportModal(sourceRecord.icsNo || '', item.itemNo || '', 'archive', 'inspection');
    return;
  }
  const actorProfileKey = getCurrentActorProfileKey();
  const archived = getArchivedItems();
  archived.unshift({
    archivedAt: new Date().toISOString(),
    archivedByProfileKey: actorProfileKey,
    source: {
      icsNo: sourceRecord.icsNo || '',
      entity: sourceRecord.entity || '',
      fund: sourceRecord.fund || '',
      issuedDate: sourceRecord.issuedDate || ''
    },
    item: JSON.parse(JSON.stringify(item)),
    disposal: {
      status,
      approvedBy,
      approvedByProfileKey: actorProfileKey,
      approvedDate,
      referenceNo,
      remarks
    }
  });
  setArchivedItems(archived);

  ref.records[ref.rIdx].items.splice(ref.iIdx, 1);
  ref.records[ref.rIdx] = appendRecordLineage(
    ref.records[ref.rIdx],
    'archive',
    `archive:${item.itemNo || 'item'}`
  );
  localStorage.setItem('icsRecords', JSON.stringify(ref.records));

  document.getElementById('archiveApprovalStatus').value = '';
  document.getElementById('archiveApprovedBy').value = '';
  document.getElementById('archiveApprovedDate').value = '';
  document.getElementById('archiveReferenceNo').value = '';
  document.getElementById('archiveRemarks').value = '';
  closeArchiveModal();
  recordAudit(
    'archive',
    `Archived item ${item.itemNo || ''} from ${sourceRecord.icsNo || ''}.`,
    buildRecordLineageAuditMeta(ref.records[ref.rIdx], { itemNo: item.itemNo || '' })
  );
  notify('success', `Item ${item.itemNo || ''} archived.`);
  initActionsView();
  loadICSRecords();
  if ([...navItems].some(n => n.classList.contains('active') && n.dataset.view === 'Archives')) initArchivesView();
}

function openWasteReportModal(icsNo, itemNo, nextAction, returnModal){
  openWasteReportModalForTargets([{ icsNo, itemNo }], nextAction || '', returnModal || '');
}

function openWasteReportModalForTargets(targets, nextAction, returnModal){
  if (!requireAccess('archive_items', { label: 'prepare Waste Materials Report metadata' })) return;
  const rows = [];
  const icsSet = new Set();
  (targets || []).forEach((t) => {
    const ref = findItemRef(t.icsNo, t.itemNo);
    if (!ref) return;
    const record = ref.records[ref.rIdx];
    const item = record.items[ref.iIdx];
    rows.push({ record, item, icsNo: record.icsNo || '', itemNo: item.itemNo || '' });
    icsSet.add(record.icsNo || '');
  });
  if (!rows.length){
    notify('error', 'Cannot open Waste Materials Report metadata. Selected items not found.');
    return;
  }
  pendingWasteReportRows = rows;
  pendingWasteReportTarget = { icsNo: rows[0].icsNo, itemNo: rows[0].itemNo, nextAction: nextAction || '', returnModal: returnModal || '' };

  const record = rows[0].record;
  const entitySet = new Set(rows.map((r) => r.record?.entity || '').filter(Boolean));
  const defaults = record.wasteReportMeta || {};
  const sharedFromFirst = rows.find((r) => r.item?.wasteReport?.preparedAt)?.item?.wasteReport || {};

  const setText = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value || '-'; };
  const setValue = (id, value) => { const el = document.getElementById(id); if (el) el.value = value || ''; };
  setText('wmrIcsNo', icsSet.size === 1 ? (record.icsNo || '-') : `Multiple ICS (${icsSet.size})`);
  setText('wmrItemCount', String(rows.length));
  setText('wmrEntity', entitySet.size <= 1 ? (record.entity || '-') : `Multiple Entities (${entitySet.size})`);
  setText('wmrPreparedAt', sharedFromFirst.preparedAt ? new Date(sharedFromFirst.preparedAt).toLocaleString() : 'Draft');

  setValue('wmrPlaceOfStorage', sharedFromFirst.placeOfStorage || defaults.placeOfStorage || 'ITEMS FOR DISPOSAL');
  setValue('wmrCertifiedCorrect', sharedFromFirst.certifiedCorrect || defaults.certifiedCorrect || record.signatories?.receivedBy?.name || '');
  setValue('wmrDisposalApproved', sharedFromFirst.disposalApproved || defaults.disposalApproved || record.signatories?.issuedBy?.name || '');
  setValue('wmrInspectionOfficer', sharedFromFirst.inspectionOfficer || defaults.inspectionOfficer || '');
  setValue('wmrWitnessToDisposal', sharedFromFirst.witnessToDisposal || defaults.witnessToDisposal || '');
  setValue('wmrNotes', sharedFromFirst.notes || '');

  const body = document.getElementById('wmrItemsBody');
  if (body){
    body.innerHTML = rows.map((r, idx) => {
      const wr = r.item.wasteReport || {};
      const safeIcs = (r.icsNo || '').replace(/"/g, '&quot;');
      const safeItem = (r.itemNo || '').replace(/"/g, '&quot;');
      return `<tr>
        <td data-label="#">${idx + 1}</td>
        <td data-label="ICS No.">${escapeHTML(r.icsNo || '')}</td>
        <td data-label="Item No.">${escapeHTML(r.itemNo || '')}</td>
        <td data-label="Description">${escapeHTML(r.item.desc || '')}</td>
        <td data-label="Qty">${escapeHTML((r.item.qtyText || r.item.qty || '').toString())}</td>
        <td data-label="Unit">${escapeHTML(r.item.unit || '')}</td>
        <td data-label="Disposition">
          <select class="stage-input wmr-disposition" data-ics="${safeIcs}" data-item="${safeItem}">
            <option value="">Select</option>
            <option value="destroyed" ${wr.disposition === 'destroyed' ? 'selected' : ''}>Destroyed</option>
            <option value="private_sale" ${wr.disposition === 'private_sale' ? 'selected' : ''}>Sold at Private Sale</option>
            <option value="public_auction" ${wr.disposition === 'public_auction' ? 'selected' : ''}>Sold at Public Auction</option>
            <option value="transferred" ${wr.disposition === 'transferred' ? 'selected' : ''}>Transferred without cost</option>
          </select>
        </td>
        <td data-label="Transfer To"><input class="stage-input wmr-transfer" data-ics="${safeIcs}" data-item="${safeItem}" value="${escapeHTML(wr.transferTo || '')}" /></td>
        <td data-label="OR No."><input class="stage-input wmr-or-no" data-ics="${safeIcs}" data-item="${safeItem}" value="${escapeHTML(wr.officialReceiptNo || '')}" /></td>
        <td data-label="OR Date"><input type="date" class="stage-input wmr-or-date" data-ics="${safeIcs}" data-item="${safeItem}" value="${escapeHTML(wr.officialReceiptDate || '')}" /></td>
        <td data-label="OR Amount"><input class="stage-input wmr-or-amount" data-ics="${safeIcs}" data-item="${safeItem}" value="${escapeHTML(wr.officialReceiptAmount || '')}" /></td>
      </tr>`;
    }).join('');
  }

  const overlay = document.getElementById('wasteReportOverlay');
  clearFieldErrors(overlay || document);
  if (overlay) overlay.classList.add('show');
}

function closeWasteReportModal(returnToPrevious = true){
  const target = pendingWasteReportTarget ? { ...pendingWasteReportTarget } : null;
  pendingWasteReportTarget = null;
  pendingWasteReportRows = [];
  const overlay = document.getElementById('wasteReportOverlay');
  if (overlay) overlay.classList.remove('show');
  clearFieldErrors(overlay || document);
  if (!returnToPrevious || !target) return;
  if (target.returnModal === 'archive'){
    pendingArchiveTarget = { icsNo: target.icsNo, itemNo: target.itemNo };
    const arch = document.getElementById('archiveOverlay');
    if (arch) arch.classList.add('show');
    return;
  }
  if (target.returnModal === 'inspection'){
    pendingInspection = { icsNo: target.icsNo, itemNo: target.itemNo };
    const insp = document.getElementById('inspectionOverlay');
    if (insp) insp.classList.add('show');
    updateInspectionArchiveButtonState();
  }
}

function validateWasteReportMetadata(showError){
  const overlay = document.getElementById('wasteReportOverlay');
  clearFieldErrors(overlay || document);
  const required = [
    { id: 'wmrPlaceOfStorage', label: 'Place of Storage' },
    { id: 'wmrCertifiedCorrect', label: 'Certified Correct' },
    { id: 'wmrDisposalApproved', label: 'Disposal Approved' },
    { id: 'wmrInspectionOfficer', label: 'Inspection Officer' },
    { id: 'wmrWitnessToDisposal', label: 'Witness to Disposal' }
  ];
  const missing = [];
  required.forEach((f) => {
    const bad = !((document.getElementById(f.id)?.value || '').trim());
    setFieldError(f.id, bad);
    if (bad) missing.push(f.label);
  });
  (pendingWasteReportRows || []).forEach((r, idx) => {
    const dispInput = getWmrRowInput('wmr-disposition', r.icsNo, r.itemNo);
    const disp = (dispInput?.value || '').trim();
    const missingDisp = !disp;
    setFieldError(dispInput, missingDisp);
    if (missingDisp) missing.push(`Disposition (row ${idx + 1})`);
    if (isSaleDisposition(disp)){
      const orNoInput = getWmrRowInput('wmr-or-no', r.icsNo, r.itemNo);
      const orDateInput = getWmrRowInput('wmr-or-date', r.icsNo, r.itemNo);
      const orAmountInput = getWmrRowInput('wmr-or-amount', r.icsNo, r.itemNo);
      const orNo = (orNoInput?.value || '').trim();
      const orDate = (orDateInput?.value || '').trim();
      const orAmountRaw = (orAmountInput?.value || '').trim();
      const orAmount = parseCurrencyValue(orAmountRaw);
      const missingOrNo = !orNo;
      const missingOrDate = !orDate;
      const missingOrAmount = !orAmountRaw || !Number.isFinite(orAmount) || orAmount <= 0;
      setFieldError(orNoInput, missingOrNo);
      setFieldError(orDateInput, missingOrDate);
      setFieldError(orAmountInput, missingOrAmount);
      if (missingOrNo) missing.push(`Official Receipt No. (row ${idx + 1})`);
      if (missingOrDate) missing.push(`Official Receipt Date (row ${idx + 1})`);
      if (missingOrAmount) missing.push(`Official Receipt Amount (row ${idx + 1})`);
    }
  });
  if (missing.length && showError){
    notify('error', `Complete Waste Materials fields: ${missing.join(', ')}.`);
  }
  return missing.length === 0;
}

function isSaleDisposition(value){
  const v = (value || '').toString().trim();
  return v === 'private_sale' || v === 'public_auction';
}

function getWmrRowInput(cls, icsNo, itemNo){
  return [...document.querySelectorAll(`.${cls}`)].find((el) => (el.dataset.ics || '') === (icsNo || '') && (el.dataset.item || '') === (itemNo || ''));
}

function toggleWasteSaleFields(){}

function saveWasteReportMetadata(printAfterSave){
  if (!requireAccess('archive_items', { label: 'save Waste Materials metadata' })) return;
  if (!pendingWasteReportTarget){
    notify('error', 'No item selected for Waste Materials metadata.');
    return;
  }
  if (!validateWasteReportMetadata(true)) return;
  const nowIso = new Date().toISOString();
  const actorProfileKey = getCurrentActorProfileKey();
  const shared = {
    placeOfStorage: (document.getElementById('wmrPlaceOfStorage')?.value || '').trim(),
    certifiedCorrect: (document.getElementById('wmrCertifiedCorrect')?.value || '').trim(),
    disposalApproved: (document.getElementById('wmrDisposalApproved')?.value || '').trim(),
    inspectionOfficer: (document.getElementById('wmrInspectionOfficer')?.value || '').trim(),
    witnessToDisposal: (document.getElementById('wmrWitnessToDisposal')?.value || '').trim(),
    notes: (document.getElementById('wmrNotes')?.value || '').trim()
  };
  const allRecords = JSON.parse(localStorage.getItem('icsRecords') || '[]');
  let savedCount = 0;
  const touchedICS = {};
  (pendingWasteReportRows || []).forEach((r) => {
    const rIdx = allRecords.findIndex((x) => (x.icsNo || '') === (r.icsNo || ''));
    if (rIdx === -1) return;
    const iIdx = (allRecords[rIdx].items || []).findIndex((x) => (x.itemNo || '') === (r.itemNo || ''));
    if (iIdx === -1) return;
    const disposition = (getWmrRowInput('wmr-disposition', r.icsNo, r.itemNo)?.value || '').trim();
    const transferTo = (getWmrRowInput('wmr-transfer', r.icsNo, r.itemNo)?.value || '').trim();
    const officialReceiptNo = (getWmrRowInput('wmr-or-no', r.icsNo, r.itemNo)?.value || '').trim();
    const officialReceiptDate = (getWmrRowInput('wmr-or-date', r.icsNo, r.itemNo)?.value || '').trim();
    const officialReceiptAmount = formatCurrencyValue(parseCurrencyValue(getWmrRowInput('wmr-or-amount', r.icsNo, r.itemNo)?.value || '')) || '';
    const payload = {
      ...shared,
      disposition,
      dispositionItemNo: r.itemNo || '',
      transferTo,
      officialReceiptNo,
      officialReceiptDate,
      officialReceiptAmount,
      hasSale: isSaleDisposition(disposition),
      preparedAt: nowIso,
      preparedByProfileKey: actorProfileKey
    };
    const item = allRecords[rIdx].items[iIdx];
    item.wasteReport = payload;
    touchedICS[allRecords[rIdx].icsNo || ''] = rIdx;
    item.inspections = Array.isArray(item.inspections) ? item.inspections : [];
    for (let i = item.inspections.length - 1; i >= 0; i--){
      const log = item.inspections[i];
      if ((log.status || '').toLowerCase() !== 'unserviceable') continue;
      const marker = `Prepared Waste Materials Report (${new Date(nowIso).toLocaleString()})`;
      const base = (log.notes || '').trim();
      if (!base.includes('Prepared Waste Materials Report')){
        log.notes = base ? `${base} | ${marker}` : marker;
      }
      log.reportPreparedAt = nowIso;
      log.reportPreparedByProfileKey = actorProfileKey;
      break;
    }
    savedCount += 1;
    delete actionCenterSelectedKeys[getActionItemKey(r.icsNo, r.itemNo)];
  });
  if (!savedCount){
    notify('error', 'No selected items were saved for Waste Materials metadata.');
    return;
  }
  Object.values(touchedICS).forEach((rIdx) => {
    if (rIdx === undefined || rIdx === null || rIdx < 0 || rIdx >= allRecords.length) return;
    allRecords[rIdx].wasteReportMeta = {
      placeOfStorage: shared.placeOfStorage,
      certifiedCorrect: shared.certifiedCorrect,
      disposalApproved: shared.disposalApproved,
      inspectionOfficer: shared.inspectionOfficer,
      witnessToDisposal: shared.witnessToDisposal,
      lastPreparedAt: nowIso,
      lastPreparedByProfileKey: actorProfileKey
    };
    allRecords[rIdx] = appendRecordLineage(
      allRecords[rIdx],
      'waste_report',
      `wmr:${allRecords[rIdx]?.icsNo || 'ics'}`
    );
  });
  localStorage.setItem('icsRecords', JSON.stringify(allRecords));
  const touchedCount = Object.keys(touchedICS).filter(Boolean).length;
  recordAudit('waste_report', `Prepared Waste Materials Report for ${touchedCount} ICS / ${savedCount} item(s).`, {
    touchedIcs: touchedCount,
    touchedItems: savedCount
  });
  notify('success', `Waste Materials metadata saved for ${savedCount} item(s).`);

  const target = { ...pendingWasteReportTarget };
  const targetsForPrint = [...pendingWasteReportRows];
  closeWasteReportModal(false);
  if (printAfterSave){
    printWasteMaterialsReportMulti(targetsForPrint);
  }
  if (target.nextAction === 'archive'){
    openArchiveModal(target.icsNo, target.itemNo);
  } else {
    initActionsView();
  }
}

