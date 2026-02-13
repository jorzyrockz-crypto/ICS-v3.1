function initializeUIEventWiring(){
  searchBtn.addEventListener('click', () => openSearchOverlay());
  dataManagerBtn?.addEventListener('click', () => openDataManagerModal('hub'));
  sidebarProfileBtn?.addEventListener('click', () => openProfileModal());
  sidebarSignOutIconBtn?.addEventListener('click', () => signOutSession());
  searchOverlay.addEventListener('click', (e) => {
    if (e.target === searchOverlay) closeSearchOverlay();
  });
  document.getElementById('profileOverlay')?.addEventListener('click', (e) => {
    if (e.target?.id === 'profileOverlay') closeProfileModal();
  });
  document.querySelectorAll('#profileSideMenu .profile-menu-btn').forEach((btn) => {
    btn.addEventListener('click', () => setProfileSettingsTab(btn.dataset.profileTab || 'identity', true));
  });
  document.getElementById('setupOverlay')?.addEventListener('click', (e) => {
    if (e.target?.id === 'setupOverlay') closeSetupModal();
  });
  document.getElementById('loginOverlay')?.addEventListener('click', (e) => {
    if (e.target?.id === 'loginOverlay') closeLoginModal();
  });
  document.getElementById('icsDetailsOverlay')?.addEventListener('click', (e) => {
    if (e.target?.id === 'icsDetailsOverlay') closeICSDetailsModal();
  });
  document.getElementById('archivedHistoryOverlay')?.addEventListener('click', (e) => {
    if (e.target?.id === 'archivedHistoryOverlay') closeArchivedHistoryModal();
  });
  document.getElementById('wasteReportOverlay')?.addEventListener('click', (e) => {
    if (e.target?.id === 'wasteReportOverlay') closeWasteReportModal();
  });
  document.getElementById('dataHubOverlay')?.addEventListener('click', (e) => {
    if (e.target?.id === 'dataHubOverlay') closeDataHubModal();
  });
  document.getElementById('dataImportOverlay')?.addEventListener('click', (e) => {
    if (e.target?.id === 'dataImportOverlay') closeDataImportModal();
  });
  document.getElementById('dataValidationOverlay')?.addEventListener('click', (e) => {
    if (e.target?.id === 'dataValidationOverlay') closeDataValidationModal();
  });
  document.getElementById('dataExportOverlay')?.addEventListener('click', (e) => {
    if (e.target?.id === 'dataExportOverlay') closeDataExportModal();
  });
  document.getElementById('dmExportYear')?.addEventListener('change', () => refreshDataManagerExportFilters());
  document.getElementById('dmExportMonth')?.addEventListener('change', () => updateDataManagerExportFilterHint());
  document.getElementById('profileName')?.addEventListener('input', (e) => {
    const avatar = document.getElementById('profileAvatarPreview');
    const type = (document.getElementById('profileAvatarType')?.value || currentUser.avatar || 'initials').toLowerCase();
    renderUserAvatar(avatar, e.target?.value || currentUser.name || '', type);
    renderUserAvatar(sidebarUserAvatar, e.target?.value || currentUser.name || '', type);
  });
  document.querySelectorAll('#profileAvatarPicker .avatar-picker-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const next = (btn.dataset.avatar || 'initials').toLowerCase();
      applyAvatarPreviewSelection(next);
      const name = (document.getElementById('profileName')?.value || currentUser.name || '');
      renderUserAvatar(document.getElementById('profileAvatarPreview'), name, next);
      renderUserAvatar(sidebarUserAvatar, name, next);
    });
  });
  document.getElementById('profileSchoolId')?.addEventListener('input', (e) => {
    const next = normalizeSchoolId(e.target?.value || '');
    if (e.target.value !== next) e.target.value = next;
  });
  document.getElementById('profileSchoolLogoInput')?.addEventListener('change', (e) => handleSchoolLogoUpload(e));
  document.getElementById('setupSchoolId')?.addEventListener('input', (e) => {
    const next = normalizeSchoolId(e.target?.value || '');
    if (e.target.value !== next) e.target.value = next;
  });
  document.getElementById('loginSchoolId')?.addEventListener('input', (e) => {
    const next = normalizeSchoolId(e.target?.value || '');
    if (e.target.value !== next) e.target.value = next;
    renderLoginProfileOptions();
  });
  document.getElementById('loginProfileSelect')?.addEventListener('change', () => {
    setLoginHint('Press Login to continue.', '');
  });
  document.querySelectorAll('#profileThemePreview .theme-preview-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetTheme = btn.dataset.theme || '';
      syncProfileThemePreview(targetTheme);
      applyThemeAccent(targetTheme);
    });
  });
}
