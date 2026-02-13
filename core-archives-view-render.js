function renderArchivesView(){
  const scope = archivesFilterIcs ? ` <span class="risk-badge ok">ICS: ${escapeHTML(archivesFilterIcs)}</span> <button class="small-btn add" onclick="clearArchivesFilter()">Clear ICS Filter</button>` : '';
  return `
${renderWelcomeBanner('Archives')}
<div class="ics-card records">
  <div class="ics-card-head"><span class="card-title">Archived Disposal Items <span class="card-badge records">ARCHIVE</span></span></div>
  <p class="card-subtext">Items archived from Action Center with disposal approval metadata.${scope}</p>
  <div class="records-table-wrap">
    <table class="ics-table">
      <colgroup>
        <col style="width:3%">
        <col style="width:10%">
        <col style="width:13%">
        <col style="width:16%">
        <col style="width:13%">
        <col style="width:7%">
        <col style="width:10%">
        <col style="width:10%">
        <col style="width:10%">
        <col style="width:8%">
      </colgroup>
      <thead>
        <tr>
          <th>#</th><th>Archived At</th><th>ICS No.</th><th>Description</th><th>Item No.</th><th style="text-align:center">EUL</th><th style="text-align:center">Approval</th><th>Approved By</th><th>Remarks</th><th style="text-align:center">Actions</th>
        </tr>
      </thead>
      <tbody id="archiveBody"></tbody>
    </table>
  </div>
</div>`;
}
