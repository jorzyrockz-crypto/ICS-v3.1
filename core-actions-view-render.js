function renderActionsView(){
  const canArchive = hasRoleCapability('archive_items');
  const filterLabel = actionCenterFilter === 'near' ? 'Due < 3m only' : (actionCenterFilter === 'past' ? 'Past EUL only' : 'All due and past EUL items');
  const icsScope = actionCenterICSFilter ? ` <span class="risk-badge ok">ICS: ${escapeHTML(actionCenterICSFilter)}</span>` : '';
  const itemScope = actionCenterItemFilter ? ` <span class="risk-badge warn">Item: ${escapeHTML(actionCenterItemFilter)}</span>` : '';
  const clearBtn = (actionCenterICSFilter || actionCenterItemFilter) ? ` <button class="small-btn add" onclick="clearActionCenterICSFilter()">Clear Target Filter</button>` : '';
  const selectedCount = Object.keys(actionCenterSelectedKeys || {}).length;
  const densityCtl = `<div class="table-density-toggle">
    <button class="density-btn ${tableDensity === 'comfortable' ? 'active' : ''}" onclick="setTableDensity('comfortable')">Comfortable</button>
    <button class="density-btn ${tableDensity === 'compact' ? 'active' : ''}" onclick="setTableDensity('compact')">Compact</button>
  </div>`;
  const batchBtn = `<span style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end">${densityCtl}<button class="small-btn finalize" onclick="openBatchWasteReportFromActionCenter()" ${canArchive ? '' : 'disabled title="Requires Encoder/Admin role"'}>Batch PRINT WMR (${selectedCount})</button></span>`;
  return `
${renderWelcomeBanner('Action Center')}
<div class="ics-card records">
  <div class="ics-card-head"><span class="card-title">EUL Action Center <span class="card-badge records">ACTIONS</span></span><span>${batchBtn}</span></div>
  <p class="card-subtext">Only items with status <strong>Due &lt; 3m</strong> or <strong>Past EUL</strong> are shown below. Filter: <strong>${filterLabel}</strong>.${icsScope}${itemScope}${clearBtn}</p>
  <div class="records-table-wrap actions-eul-wrap">
    <table class="ics-table actions-eul-table">
      <colgroup>
        <col style="width:3%">
        <col style="width:9%">
        <col style="width:25%">
        <col style="width:8%">
        <col style="width:11%">
        <col style="width:11%">
        <col style="width:22%">
        <col style="width:6%">
      </colgroup>
      <thead>
        <tr>
          <th>#</th><th>ICS No.</th><th>Description</th><th style="text-align:center">EUL (Days)</th><th style="text-align:center">EUL Status</th><th style="text-align:center">Inspection</th><th style="text-align:center">Actions</th><th style="text-align:center">Batch</th>
        </tr>
      </thead>
      <tbody id="eulBody"></tbody>
    </table>
  </div>
</div>

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
</div>

<div class="actions-modal-overlay" id="inspectionHistoryOverlay">
  <div class="actions-modal modal-lg inspection-history-modal">
    <div class="modal-head inspection-history-head">
      <h3 class="inspection-history-title">Inspection History</h3>
      <button class="inspection-history-close" onclick="closeInspectionHistory()">Close</button>
    </div>
    <div class="modal-body" id="inspectionHistoryBody"></div>
  </div>
</div>

<div class="actions-modal-overlay" id="archiveOverlay">
  <div class="actions-modal modal-md">
    <div class="modal-head">
      <h3>Archive Item for Disposal</h3>
      <p class="modal-sub">Confirm disposal approval details before moving this item to Archives.</p>
    </div>
    <div class="modal-body">
    <div class="form-col modal-form">
      <label>Approval Status</label>
      <select id="archiveApprovalStatus" class="stage-input">
        <option value="">Select status</option>
        <option value="approved">Approved for disposal</option>
        <option value="not_approved">Not approved for disposal</option>
      </select>
      <label>Approved By</label>
      <input id="archiveApprovedBy" class="stage-input" placeholder="Approver name" />
      <label>Approval Date</label>
      <input id="archiveApprovedDate" type="date" class="stage-input" />
      <label>Reference No. (Optional)</label>
      <input id="archiveReferenceNo" class="stage-input" placeholder="Memo / approval ref no." />
      <label>Remarks</label>
      <textarea id="archiveRemarks" class="stage-input" rows="3" placeholder="Additional notes"></textarea>
    </div>
    </div>
    <div class="modal-foot">
    <div class="ics-card-actions">
      <button class="small-btn add" onclick="closeArchiveModal(true)">Cancel</button>
      <button class="small-btn finalize" onclick="confirmArchiveItem()">Archive Item</button>
    </div>
    </div>
  </div>
</div>
${renderWasteReportModal()}`;
}

function renderWasteReportModal(){
  return `
<div class="actions-modal-overlay" id="wasteReportOverlay">
  <div class="actions-modal modal-xl wmr-modal">
    <div class="modal-head">
      <div class="wmr-head-row">
        <h3>Waste Materials Report Metadata</h3>
        <button class="wmr-head-close" onclick="closeWasteReportModal()">Close</button>
      </div>
      <p class="modal-sub">Complete disposal metadata for report printing. Saved values can be reused and reprinted from Inspection History.</p>
    </div>
    <div class="modal-body">
    <div class="detail-grid">
      <div class="detail-item"><div class="k">ICS No.</div><div class="v" id="wmrIcsNo">-</div></div>
      <div class="detail-item"><div class="k">Selected Items</div><div class="v" id="wmrItemCount">0</div></div>
      <div class="detail-item"><div class="k">Entity</div><div class="v" id="wmrEntity">-</div></div>
      <div class="detail-item"><div class="k">Prepared At</div><div class="v" id="wmrPreparedAt">Draft</div></div>
    </div>
    <div class="wmr-section">
      <h4 class="wmr-section-title">Report Header</h4>
      <div class="wmr-grid">
        <div>
          <label>Place of Storage</label>
          <input id="wmrPlaceOfStorage" class="stage-input" placeholder="e.g., ITEMS FOR DISPOSAL" />
        </div>
      </div>
    </div>

    <div class="wmr-section">
      <h4 class="wmr-section-title">Items and Disposition (Per Item)</h4>
      <div class="detail-table-wrap" style="max-height:300px">
        <table class="detail-table">
          <thead>
            <tr>
              <th>#</th>
              <th>ICS No.</th>
              <th>Item No.</th>
              <th>Description</th>
              <th>Qty</th>
              <th>Unit</th>
              <th>Disposition</th>
              <th>Transfer To</th>
              <th>OR No.</th>
              <th>OR Date</th>
              <th>OR Amount</th>
            </tr>
          </thead>
          <tbody id="wmrItemsBody"></tbody>
        </table>
      </div>
      <div class="wmr-sale-note">Each selected item can have its own disposition. Sales fields are required only for sale dispositions.</div>
    </div>

    <div class="wmr-section">
      <h4 class="wmr-section-title">Signatories</h4>
      <div class="wmr-grid">
        <div>
          <label>Certified Correct</label>
          <input id="wmrCertifiedCorrect" class="stage-input" placeholder="Property Custodian name" />
        </div>
        <div>
          <label>Disposal Approved</label>
          <input id="wmrDisposalApproved" class="stage-input" placeholder="Approving officer name" />
        </div>
        <div>
          <label>Inspection Officer</label>
          <input id="wmrInspectionOfficer" class="stage-input" placeholder="Inspection officer name" />
        </div>
        <div>
          <label>Witness to Disposal</label>
          <input id="wmrWitnessToDisposal" class="stage-input" placeholder="Witness name" />
        </div>
      </div>
      <label style="margin-top:8px;display:block">Additional Notes</label>
      <textarea id="wmrNotes" class="stage-input" rows="2" placeholder="Additional notes"></textarea>
    </div>
    </div>
    <div class="modal-foot">
    <div class="ics-card-actions">
      <button class="small-btn add" onclick="closeWasteReportModal()">Cancel</button>
      <button class="small-btn add" onclick="saveWasteReportMetadata(false)">Save</button>
      <button class="small-btn finalize" onclick="saveWasteReportMetadata(true)">Save & Print</button>
    </div>
    </div>
  </div>
</div>`;
}
