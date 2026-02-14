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

const LAST_SEEN_APP_VERSION_STORAGE_KEY = 'icsLastSeenAppVersion';
const RELEASE_NOTES_BY_VERSION = {
  '3.3': [
    'New responsive mobile and tablet navigation with a centered New ICS action.',
    'Notification Center upgraded with filters, grouped feed, and bulk actions.',
    'ICS and Archive Details layouts refreshed for cleaner readability.',
    'ICS records table improved with dedicated status column and compact markers.'
  ],
  '3.2': [
    'Lucide icon standardization completed across the app with local runtime assets.',
    'Data Hub modal redesigned into card-based layout.',
    'Action Center modal reliability fixes for Inspection History and Unserviceable flow.',
    'Desktop sidebar now supports persisted collapse mode.'
  ]
};

function getReleaseNotesForVersion(version){
  const key = String(version || '').trim();
  if (!key) return [];
  return Array.isArray(RELEASE_NOTES_BY_VERSION[key]) ? RELEASE_NOTES_BY_VERSION[key] : [];
}

async function getRuntimeAppVersion(){
  const fallbackVersion = String(APP_UI_VERSION_FALLBACK || '').trim();
  try {
    const manifestLink = document.querySelector('link[rel="manifest"]');
    const manifestHref = manifestLink?.getAttribute('href') || './manifest.webmanifest';
    const response = await fetch(manifestHref, { cache: 'no-store' });
    if (!response.ok) return fallbackVersion;
    const manifest = await response.json();
    const manifestVersion = String(manifest?.version || '').trim();
    return manifestVersion || fallbackVersion;
  } catch (_err){
    return fallbackVersion;
  }
}

async function announceReleaseNotesIfNeeded(){
  const version = await getRuntimeAppVersion();
  if (!version) return;
  const lastSeenVersion = String(localStorage.getItem(LAST_SEEN_APP_VERSION_STORAGE_KEY) || '').trim();
  if (lastSeenVersion === version) return;

  const notes = getReleaseNotesForVersion(version);
  const fallbackNote = ['General quality, reliability, and UX improvements.'];
  const lines = (notes.length ? notes : fallbackNote)
    .map((line, idx) => `${idx + 1}. ${line}`)
    .join('\n');

  showModal(`What\'s New in v${version}`, lines);
  notify('info', `What\'s New v${version}: ${(notes.length ? notes : fallbackNote).join(' | ')}`);
  localStorage.setItem(LAST_SEEN_APP_VERSION_STORAGE_KEY, version);
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
  let isRefreshingForUpdate = false;

  function requestWorkerActivation(worker){
    if (!worker) return;
    worker.postMessage({ type: 'SKIP_WAITING' });
  }

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
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (isRefreshingForUpdate) return;
        isRefreshingForUpdate = true;
        notify('info', 'Applying latest app update...');
        window.location.reload();
      });
      if (registration.waiting){
        notify('info', 'App update found. Applying now...');
        requestWorkerActivation(registration.waiting);
      }
      registration.addEventListener('updatefound', () => {
        const nextWorker = registration.installing;
        if (!nextWorker) return;
        nextWorker.addEventListener('statechange', () => {
          if (nextWorker.state === 'installed' && navigator.serviceWorker.controller){
            notify('info', 'App update downloaded. Applying now...');
            requestWorkerActivation(nextWorker);
          }
        });
      });
    } catch (err){
      console.warn('Service worker registration failed:', err);
    }
    updateInstallAppButtonState();
  });
}
