/*
 * ═══════════════════════════════════════════════════════════
 * ISITCStage — Old Script (Original JavaScript preserved)
 * This file contains the ORIGINAL JavaScript from unistage.html
 * It is kept as reference only — main.js replaces this logic.
 * ═══════════════════════════════════════════════════════════
 */

// ─── GLOBAL STATE ───
let _old_currentUser = null;
let _old_rapportDeposited = false;
let _old_publications = [
  { titre: "Stage PFE chez Tunisie Telecom", type: "new", desc: "Offre de stage PFE en développement d'applications mobiles chez Tunisie Telecom. Deadline : 30 Avril 2025.", date: "01/04/2025" },
  { titre: "Hackathon ISITC 2025", type: "comp", desc: "Participez au hackathon annuel de l'ISITC et remportez des prix exceptionnels !", date: "15/03/2025" },
  { titre: "Formation DevOps", type: "form", desc: "Formation gratuite en DevOps et Cloud Computing organisée par l'ISITC.", date: "20/03/2025" }
];

// ─── DEMO ACCOUNTS (ORIGINAL — NOW REPLACED BY FIREBASE) ───
const _old_demoAccounts = [
  { email: 'jaafer.jarray@isitc.u-sousse.tn', password: 'jaafer1234', role: 'admin', nom: 'Jarray', prenom: 'Jaafer' },
  { email: 'ahmed.bennani@isitc.u-sousse.tn', password: 'encadrant123', role: 'encadrant', nom: 'Bennani', prenom: 'Ahmed' },
  { email: 'etudiant@isitc.u-sousse.tn', password: 'etudiant123', role: 'etudiant', nom: 'Trabelsi', prenom: 'Sana' }
];

// ─── SAMPLE DATA (ORIGINAL) ───
const _old_encadrants = [
  { initials: 'AB', nom: 'Ahmed Bennani', spec: 'Développement Web & Mobile', nb: 8 },
  { initials: 'FZ', nom: 'Fatima Zahra Hamdi', spec: 'Intelligence Artificielle', nb: 6 },
  { initials: 'MC', nom: 'Mehdi Chaabane', spec: 'Réseaux & Sécurité Informatique', nb: 5 },
  { initials: 'SB', nom: 'Sonia Belhaj', spec: 'Génie Logiciel & Tests', nb: 4 }
];

const _old_opportunites = [
  { titre: "Développeur Full-Stack", partenaire: "Sofrecom Tunisie", desc: "Stage de fin d'études en développement Full-Stack (React + Node.js). Durée 4 mois.", date: "01/04/2025" },
  { titre: "Analyste en Intelligence Artificielle", partenaire: "IBM Tunisie", desc: "Stage en IA et Machine Learning.", date: "25/03/2025" },
  { titre: "Ingénieur DevOps / Cloud", partenaire: "Vermeg", desc: "Stage orienté Cloud AWS/Azure et intégration continue CI/CD.", date: "20/03/2025" },
  { titre: "Développeur Mobile Flutter", partenaire: "Telnet Holding", desc: "Développement d'une application mobile cross-platform avec Flutter et Firebase.", date: "15/03/2025" }
];

// ─── ROUTER (ORIGINAL) ───
function _old_showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById(id);
  if (target) { target.classList.add('active'); window.scrollTo(0, 0); }
}

// ─── SECTION ROUTER (ORIGINAL) ───
function _old_showSection(sectionId, sidebarId) {
  const page = document.querySelector('.page.active');
  if (!page) return;
  page.querySelectorAll('.dash-section').forEach(s => s.classList.remove('active'));
  const sec = document.getElementById(sectionId);
  if (sec) sec.classList.add('active');
  const nav = document.getElementById(sidebarId);
  if (nav) {
    nav.querySelectorAll('a').forEach(a => a.classList.remove('active'));
    nav.querySelectorAll('a').forEach(a => {
      if (a.getAttribute('onclick') && a.getAttribute('onclick').includes(sectionId)) {
        a.classList.add('active');
      }
    });
  }
  const titles = {
    'etud-accueil': 'Accueil', 'etud-encadrants': 'Encadrants', 'etud-opportunites': 'Opportunités',
    'etud-rapport': 'Mon Rapport', 'etud-demandes': 'Mes Demandes', 'etud-params': 'Paramètres',
    'enc-accueil': 'Accueil', 'enc-etudiants': 'Mes Étudiants', 'enc-demandes': 'Demandes reçues',
    'enc-rapports': 'Rapports', 'enc-params': 'Paramètres',
    'admin-accueil': 'Tableau de bord', 'admin-users': 'Utilisateurs', 'admin-stages': 'Stages & Partenaires',
    'admin-soutenances': 'Soutenances', 'admin-stats': 'Statistiques', 'admin-publications': 'Publications',
    'admin-params': 'Paramètres'
  };
  const prefix = sectionId.split('-')[0];
  const titleEl = document.getElementById(prefix + '-topbar-title');
  if (titleEl && titles[sectionId]) titleEl.textContent = titles[sectionId];
}

// ─── TOAST (ORIGINAL) ───
function _old_showToast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = 'toast ' + type;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0'; toast.style.transform = 'translateX(40px)'; toast.style.transition = '.4s';
    setTimeout(() => toast.remove(), 400);
  }, 3000);
}

// ─── PASSWORD TOGGLE (ORIGINAL) ───
function _old_togglePwd(inputId, btn) {
  const inp = document.getElementById(inputId);
  if (!inp) return;
  inp.type = inp.type === 'password' ? 'text' : 'password';
  btn.textContent = inp.type === 'password' ? '👁' : '🙈';
}

// ─── FILL DEMO (ORIGINAL) ───
function _old_fillDemo(email, password) {
  const emailEl = document.getElementById('login-email');
  const pwdEl = document.getElementById('login-password');
  if (emailEl) emailEl.value = email;
  if (pwdEl) pwdEl.value = password;
  _old_showToast('✅ Identifiants remplis ! Cliquez sur Se connecter.');
}

// ─── LOGIN (ORIGINAL) ───
function _old_handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value.trim();
  if (!email || !password) { _old_showToast('⚠️ Veuillez remplir tous les champs.', 'warning'); return; }
  const found = _old_demoAccounts.find(a => a.email === email && a.password === password);
  if (!found) { _old_showToast('❌ Email ou mot de passe incorrect.', 'error'); return; }
  _old_currentUser = { ...found };
  _old_showToast('✅ Connexion réussie ! Bienvenue ' + found.prenom + ' !', 'success');
  setTimeout(() => {
    if (found.role === 'admin') { _old_setupAdminDash(); _old_showPage('dashboard-admin'); }
    else if (found.role === 'encadrant') { _old_setupEncadrantDash(); _old_showPage('dashboard-encadrant'); }
    else { _old_showPage('dashboard-etudiant'); }
  }, 500);
}

// ─── REGISTER (ORIGINAL) ───
function _old_handleRegister(e) {
  e.preventDefault();
  const prenom = document.getElementById('reg-prenom').value.trim();
  const nom = document.getElementById('reg-nom').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  const confirm = document.getElementById('reg-confirm').value;
  if (!prenom || !nom || !email || !password || !confirm) { _old_showToast('⚠️ Veuillez remplir tous les champs.', 'warning'); return; }
  if (!email.endsWith('@isitc.u-sousse.tn')) { _old_showToast('❌ L\'adresse email doit appartenir au domaine @isitc.u-sousse.tn', 'error'); return; }
  if (password !== confirm) { _old_showToast('❌ Les mots de passe ne correspondent pas.', 'error'); return; }
  if (password.length < 6) { _old_showToast('⚠️ Le mot de passe doit contenir au moins 6 caractères.', 'warning'); return; }
  _old_currentUser = { role: 'etudiant', nom, prenom, email };
  _old_demoAccounts.push({ email, password, role: 'etudiant', nom, prenom });
  _old_showToast('✅ Compte créé avec succès ! Bienvenue ' + prenom + ' !', 'success');
}

// ─── LOGOUT (ORIGINAL) ───
function _old_handleLogout() {
  _old_currentUser = null;
  _old_rapportDeposited = false;
  _old_showToast('👋 Vous avez été déconnecté.');
  setTimeout(() => _old_showPage('page-accueil'), 400);
}

// ─── SETUP DASHBOARDS (ORIGINAL) ───
function _old_setText(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }
function _old_setDate(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const now = new Date();
  el.textContent = now.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function _old_setupEncadrantDash() {
  const prenom = _old_currentUser ? _old_currentUser.prenom : 'Encadrant';
  const nom = _old_currentUser ? _old_currentUser.nom : '';
  const initials = (prenom[0] || '') + (nom[0] || '');
  _old_setText('enc-prenom', prenom);
  _old_setText('enc-sidebar-name', prenom + ' ' + nom);
  _old_setText('enc-avatar', initials.toUpperCase());
  _old_setDate('current-date-enc');
  _old_showSection('enc-accueil', 'sidebar-encadrant');
}

function _old_setupAdminDash() {
  const prenom = _old_currentUser ? _old_currentUser.prenom : 'Admin';
  const nom = _old_currentUser ? _old_currentUser.nom : '';
  const initials = (prenom[0] || '') + (nom[0] || '');
  _old_setText('admin-prenom', prenom);
  _old_setText('admin-sidebar-name', prenom + ' ' + nom);
  _old_setText('admin-avatar', initials.toUpperCase());
  _old_setDate('current-date-admin');
  _old_showSection('admin-accueil', 'sidebar-admin');
}

// ─── RENDER ENCADRANT CARDS (ORIGINAL) ───
function _old_renderEncadrantCards() {
  const grid = document.getElementById('enc-cards-grid');
  if (!grid) return;
  grid.innerHTML = _old_encadrants.map(e => `
    <div class="enc-card">
      <div class="avatar-circle">${e.initials}</div>
      <div class="enc-name">${e.nom}</div>
      <div class="enc-spec">${e.spec}</div>
      <div class="enc-badge">👩‍🎓 ${e.nb} étudiants encadrés</div>
      <button class="btn btn-orange btn-full" onclick="_old_sendDemande('${e.nom}')">📩 Envoyer une demande</button>
    </div>
  `).join('');
}

function _old_sendDemande(nomEncadrant) {
  _old_showToast('📩 Demande envoyée à ' + nomEncadrant + ' !', 'success');
}

// ─── RENDER OPPORTUNITIES (ORIGINAL) ───
function _old_renderOppList(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = _old_opportunites.map(o => `
    <div class="opp-card">
      <div class="opp-info">
        <div class="opp-title">${o.titre}</div>
        <div class="opp-desc">${o.desc}</div>
        <div class="opp-meta"><span>🏢 ${o.partenaire}</span><span>📅 ${o.date}</span></div>
      </div>
      <div style="flex-shrink:0">
        <button class="btn btn-primary btn-sm">Voir détails</button>
      </div>
    </div>
  `).join('');
}

// ─── DEMAND HANDLING (ORIGINAL) ───
function _old_handleDemand(btn, action) {
  const card = btn.closest('.demand-card');
  const badge = card.querySelector('.badge');
  if (action === 'accept') {
    badge.className = 'badge badge-green'; badge.textContent = 'Acceptée';
    card.querySelector('.demand-actions').innerHTML = '<span style="color:var(--green);font-weight:600">✅ Demande acceptée</span>';
    _old_showToast('✅ Demande acceptée avec succès !', 'success');
  } else {
    badge.className = 'badge badge-red'; badge.textContent = 'Refusée';
    card.querySelector('.demand-actions').innerHTML = '<span style="color:var(--red);font-weight:600">❌ Demande refusée</span>';
    _old_showToast('❌ Demande refusée.', 'error');
  }
}

// ─── ASSIGN NOTE (ORIGINAL) ───
function _old_assignNote(inputId) {
  const inp = document.getElementById(inputId);
  if (!inp || !inp.value) { _old_showToast('⚠️ Veuillez saisir une note.', 'warning'); return; }
  const note = parseFloat(inp.value);
  if (isNaN(note) || note < 0 || note > 20) { _old_showToast('⚠️ La note doit être entre 0 et 20.', 'warning'); return; }
  _old_showToast('✅ Note ' + note + '/20 attribuée avec succès !', 'success');
}

// ─── TAB SWITCHER (ORIGINAL) ───
function _old_switchTab(tab) {
  document.getElementById('tab-etudiants').classList.toggle('active', tab === 'etudiants');
  document.getElementById('tab-encadrants-admin').classList.toggle('active', tab === 'encadrants');
  document.getElementById('users-etudiants-table').style.display = tab === 'etudiants' ? 'block' : 'none';
  document.getElementById('users-encadrants-table').style.display = tab === 'encadrants' ? 'block' : 'none';
}

// ─── PUBLISH (ORIGINAL) ───
function _old_publishItem() {
  const titre = document.getElementById('pub-titre').value.trim();
  const type = document.getElementById('pub-type').value;
  const desc = document.getElementById('pub-desc').value.trim();
  const date = document.getElementById('pub-date').value;
  if (!titre || !desc) { _old_showToast('⚠️ Veuillez remplir le titre et la description.', 'warning'); return; }
  const dateStr = date ? new Date(date).toLocaleDateString('fr-FR') : new Date().toLocaleDateString('fr-FR');
  _old_publications.unshift({ titre, type, desc, date: dateStr });
  document.getElementById('pub-titre').value = '';
  document.getElementById('pub-desc').value = '';
  _old_showToast('📢 Publication publiée avec succès !', 'success');
}

// ─── CALENDAR (ORIGINAL) ───
function _old_renderCalendar() {
  const cells = document.getElementById('cal-cells');
  if (!cells) return;
  const events = { 15: 'Gharbi Y.', 16: 'Ben Salah I.', 22: 'Brahmi M.', 28: 'Mansouri R.' };
  let html = '';
  html += '<div class="cal-cell" style="background:var(--gray-bg)"></div>';
  for (let d = 1; d <= 30; d++) {
    const isToday = d === 4;
    const hasEv = events[d];
    html += `<div class="cal-cell${isToday ? ' today' : ''}${hasEv ? ' has-event' : ''}">
      <div style="font-weight:${isToday ? '700' : '400'};color:${isToday ? 'var(--blue)' : 'inherit'}">${d}</div>
      ${hasEv ? `<div class="cal-event">${hasEv}</div>` : ''}
    </div>`;
  }
  cells.innerHTML = html;
}

// ─── MODAL (ORIGINAL) ───
function _old_openModal(id) { const modal = document.getElementById(id); if (modal) modal.classList.add('open'); }
function _old_closeModal(id) { const modal = document.getElementById(id); if (modal) modal.classList.remove('open'); }
function _old_closeModalOnOverlay(e, id) { if (e.target === e.currentTarget) _old_closeModal(id); }

function _old_saveSoutenance() {
  const tbody = document.getElementById('soutenances-tbody');
  if (tbody) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>Nouvel étudiant</td><td>—</td><td>—</td><td>—</td><td>—</td><td class="td-actions"><button class="btn btn-sm btn-outline-blue">✏️ Modifier</button></td>`;
    tbody.appendChild(tr);
  }
  _old_closeModal('modal-soutenance');
  _old_showToast('✅ Soutenance planifiée avec succès !', 'success');
}

console.log('📦 old-script.js loaded (reference only — not active)');
