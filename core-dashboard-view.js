function getWelcomeGreeting(){
  const h = new Date().getHours();
  const name = (currentUser?.name || 'Custodian').toString().trim() || 'Custodian';
  const first = name.split(/\s+/).filter(Boolean)[0] || name;
  if (h < 12) return { text: `Good morning, ${first}`, icon: '\u2601' };
  if (h < 18) return { text: `Good afternoon, ${first}`, icon: '\u2600' };
  return { text: `Good evening, ${first}`, icon: '\u263D' };
}

function getViewSubtitle(view){
  if (view === 'Dashboard') return 'Portfolio overview, action priorities, and lifecycle trends at a glance.';
  if (view === 'Manage Inventory') return 'Encode new ICS entries, stage items, and maintain finalized records in one workspace.';
  if (view === 'Action Center') return 'Review items nearing or past EUL and complete required inspection and disposal actions.';
  if (view === 'Archives') return 'Track archived items with disposal approvals and complete historical inspection metadata.';
  return 'Inventory Custodian Slip management workspace.';
}

function renderWelcomeBanner(view){
  const g = getWelcomeGreeting();
  return `
<div class="welcome-banner">
  <div class="welcome-badge"><span class="dot"></span>System Live | ICS Manager</div>
  <h2 class="welcome-title">${g.text} <span class="welcome-icon">${g.icon}</span></h2>
  <p class="welcome-subtitle">${getViewSubtitle(view)}</p>
</div>`;
}
