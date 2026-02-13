function saveNotifications(){
  localStorage.setItem('icsNotifications', JSON.stringify(notifications.slice(-40)));
}

function renderNotifications(){
  const unread = notifications.filter((n) => !n.read).length;
  notifBadge.style.display = unread > 0 ? 'grid' : 'none';
  notifBadge.textContent = unread > 99 ? '99+' : String(unread);

  const empty = notifPanel.querySelector('.notif-empty');
  const oldItems = [...notifPanel.querySelectorAll('.notif-item')];
  oldItems.forEach((n) => n.remove());

  if (notifications.length === 0){
    if (empty) empty.style.display = 'block';
    return;
  }
  if (empty) empty.style.display = 'none';

  notifications.slice().reverse().forEach((n) => {
    const div = document.createElement('div');
    div.className = `notif-item ${n.type || 'info'}`;
    div.innerHTML = `${n.message}<div class="notif-meta">${n.time}</div>`;
    notifPanel.appendChild(div);
  });
}

function markNotificationsRead(){
  notifications = notifications.map((n) => ({ ...n, read: true }));
  saveNotifications();
  renderNotifications();
}

function notify(type, message){
  const time = new Date().toLocaleString();
  notifications.push({ type, message, time, read: false, actorProfileKey: getCurrentActorProfileKey() });
  if (notifications.length > 40) notifications = notifications.slice(-40);
  saveNotifications();
  renderNotifications();
  showActiveModalToast(type, message);
}

function getTopShownOverlay(){
  const ids = [
    'setupOverlay',
    'dataHubOverlay',
    'dataImportOverlay',
    'dataValidationOverlay',
    'dataExportOverlay',
    'wasteReportOverlay',
    'archiveOverlay',
    'inspectionOverlay',
    'inspectionHistoryOverlay',
    'profileOverlay',
    'loginOverlay',
    'archivedHistoryOverlay',
    'icsDetailsOverlay',
    'searchOverlay',
    'modal'
  ];
  for (const id of ids){
    const el = document.getElementById(id);
    if (!el) continue;
    if (id === 'modal'){
      if (el.style.display === 'flex') return el;
      continue;
    }
    if (el.classList?.contains('show')) return el;
  }
  return null;
}

function showActiveModalToast(type, message){
  const overlay = getTopShownOverlay();
  if (!overlay) return;
  const safeType = ['success', 'error', 'warn', 'info'].includes(type) ? type : 'info';
  const existing = overlay.querySelector('.modal-toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = `modal-toast ${safeType}`;
  toast.textContent = message || '';
  overlay.appendChild(toast);
  setTimeout(() => {
    if (toast.parentNode) toast.parentNode.removeChild(toast);
  }, 2600);
}

function initializeNotificationsUI(){
  notifBellBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    notifPanel.classList.toggle('show');
    if (notifPanel.classList.contains('show')) markNotificationsRead();
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.notif-wrap')) notifPanel.classList.remove('show');
  });

  renderNotifications();
}
