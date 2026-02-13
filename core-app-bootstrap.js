function bootAppWithUserPreferences(){
  getCurrentDeviceId();
  ensureRecordLineageBaseline();
  currentUser.lastLogin = new Date().toISOString();
  saveCurrentUser();
  ensureDesignationForSchool(schoolIdentity.schoolId, currentUser.designation || '');
  applyThemeAccent(currentUser.preferences?.themeAccent || 'elegant-white');
  applyTableDensity();
  renderUserIdentity();
  schoolSetupEnforced = !isSchoolIdentityConfigured();
  const startView = PROFILE_VIEWS.includes(currentUser.preferences?.defaultView) ? currentUser.preferences.defaultView : 'Dashboard';
  goToView(startView);
  if (schoolSetupEnforced){
    sessionState = { loggedIn: false, schoolId: '', profileKey: '', remember: false, sessionId: '' };
    setupWizardEnforced = true;
    openSetupModal(true);
    setSetupHint('Create School + first Personnel profile to continue.', '');
    return;
  }
  upsertCurrentUserForSchool(schoolIdentity.schoolId);
  if (tryRestoreRememberedSession()){
    notify('success', `Welcome back, ${currentUser.name}.`);
    return;
  }
  sessionState = { loggedIn: false, schoolId: '', profileKey: '', remember: false, sessionId: '' };
  openLoginModal(true);
}

function isAppRunningStandalone(){
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function updateInstallAppButtonState(){
  if (!installAppBtn) return;
  if (isAppRunningStandalone()){
    installAppBtn.textContent = 'App Installed';
    installAppBtn.disabled = true;
    installAppBtn.title = 'App is already running in installed mode.';
    return;
  }
  installAppBtn.disabled = false;
  installAppBtn.textContent = deferredInstallPrompt ? 'Install App' : 'Install Guide';
  installAppBtn.title = deferredInstallPrompt
    ? 'Install Project ICS v3 on this device.'
    : 'Show install instructions for this browser.';
}

async function installPWAApp(){
  if (isAppRunningStandalone()){
    notify('info', 'App is already installed on this device.');
    return;
  }
  if (deferredInstallPrompt){
    try {
      deferredInstallPrompt.prompt();
      const choice = await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      updateInstallAppButtonState();
      if (choice?.outcome === 'accepted'){
        notify('success', 'Install request accepted. App should appear on your device.');
      } else {
        notify('info', 'Install was dismissed. You can try again anytime.');
      }
    } catch {
      deferredInstallPrompt = null;
      updateInstallAppButtonState();
      showModal('Install App', 'Unable to trigger install prompt. Use your browser menu: Install App/Add to Home Screen.');
    }
    return;
  }
  showModal('Install App', 'Use your browser menu to install this app:\n1) Open browser menu\n2) Choose "Install App" or "Add to Home Screen"\n3) Confirm installation');
}

function registerPWAServiceWorker(){
  if (!('serviceWorker' in navigator)) return;
  if (!(location.protocol === 'https:' || location.hostname === 'localhost')) return;

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    updateInstallAppButtonState();
    notify('info', 'Install is ready. Click "Install App" in the sidebar.');
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    updateInstallAppButtonState();
    notify('success', 'App installed successfully.');
  });

  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('./sw.js');
      if (registration.waiting){
        notify('info', 'An app update is ready. Reload to apply the latest version.');
      }
      registration.addEventListener('updatefound', () => {
        const nextWorker = registration.installing;
        if (!nextWorker) return;
        nextWorker.addEventListener('statechange', () => {
          if (nextWorker.state === 'installed' && navigator.serviceWorker.controller){
            notify('info', 'App update downloaded. Reload to apply.');
          }
        });
      });
    } catch (err){
      console.warn('Service worker registration failed:', err);
    }
    updateInstallAppButtonState();
  });
}
