/*
 * ═══════════════════════════════════════════════════════════
 * ISITCStage — main.js
 * Firebase Auth + Firestore
 * 3 Roles: Admin · Encadrant · Étudiant
 * ═══════════════════════════════════════════════════════════
 */

const firebaseConfig = {
  apiKey: "AIzaSyCiQ0UzYVHTsiQwpDxZiY6MU5mrqLatN5w",
  authDomain: "isitcstage.firebaseapp.com",
  projectId: "isitcstage",
  storageBucket: "isitcstage.firebasestorage.app",
  messagingSenderId: "842265659093",
  appId: "1:842265659093:web:e0de0cefa3b8e3f0ab045c",
  measurementId: "G-361FJB1BEK"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
try { firebase.analytics(); } catch (e) {}

// ─── STATE ───
let currentUser = null;
let currentUserData = null;

const ADMIN_EMAIL = 'jaafer.jarray@isitc.u-sousse.tn';
const ADMIN_PASSWORD = 'jaafer1234';
const ADMIN_NAME = 'Jaafer Jarray';

let publications = [
  { titre: "Stage PFE chez Tunisie Telecom", type: "new", desc: "Offre de stage PFE en développement d'applications mobiles.", date: "01/04/2025" },
  { titre: "Hackathon ISITC 2025", type: "comp", desc: "Participez au hackathon annuel de l'ISITC !", date: "15/03/2025" },
  { titre: "Formation DevOps", type: "form", desc: "Formation gratuite en DevOps et Cloud Computing.", date: "20/03/2025" }
];

const opportunites = [
  { titre: "Développeur Full-Stack", partenaire: "Sofrecom Tunisie", desc: "Stage Full-Stack (React + Node.js). 4 mois.", date: "01/04/2025" },
  { titre: "Analyste IA", partenaire: "IBM Tunisie", desc: "Stage en IA et Machine Learning.", date: "25/03/2025" },
  { titre: "Ingénieur DevOps", partenaire: "Vermeg", desc: "Stage Cloud AWS/Azure et CI/CD.", date: "20/03/2025" },
  { titre: "Développeur Flutter", partenaire: "Telnet Holding", desc: "Application mobile cross-platform.", date: "15/03/2025" }
];

/* ═══════════════════════════════════════
   INIT
   ═══════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 ISITCStage init...');
  setAllDates();
  await seedAdmin();
  setupAuthListener();
});

async function seedAdmin() {
  try {
    const snap = await db.collection('users').where('role', '==', 'admin').limit(1).get();
    if (!snap.empty) return;
    let uid;
    try {
      const cred = await auth.createUserWithEmailAndPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
      uid = cred.user.uid; await auth.signOut();
    } catch (e) {
      if (e.code === 'auth/email-already-in-use') {
        const cred = await auth.signInWithEmailAndPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
        uid = cred.user.uid; await auth.signOut();
      } else { console.error('Seed error:', e); return; }
    }
    await db.collection('users').doc(uid).set({
      name: ADMIN_NAME, email: ADMIN_EMAIL, role: 'admin',
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    console.log('✅ Admin seeded');
  } catch (e) { console.error('Seed error:', e); }
}

function setupAuthListener() {
  auth.onAuthStateChanged(async (user) => {
    if (user) {
      currentUser = user;
      try {
        const doc = await db.collection('users').doc(user.uid).get();
        if (doc.exists) {
          currentUserData = doc.data();
          if (currentUserData.role === 'admin') { await setupAdminDash(); showPage('dashboard-admin'); }
          else if (currentUserData.role === 'encadrant') { setupEncadrantDash(); showPage('dashboard-encadrant'); }
          else if (currentUserData.role === 'etudiant') { await setupEtudiantDash(); showPage('dashboard-etudiant'); }
        }
      } catch (e) { console.error(e); }
    }
  });
}

/* ═══════════════════════════════════════
   PAGE / SECTION ROUTER
   ═══════════════════════════════════════ */
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const t = document.getElementById(id);
  if (t) { t.classList.add('active'); window.scrollTo(0, 0); }
}

function showSection(sectionId, sidebarId) {
  const page = document.querySelector('.page.active');
  if (!page) return;
  page.querySelectorAll('.dash-section').forEach(s => s.classList.remove('active'));
  const sec = document.getElementById(sectionId);
  if (sec) sec.classList.add('active');
  const nav = document.getElementById(sidebarId);
  if (nav) {
    nav.querySelectorAll('a').forEach(a => a.classList.remove('active'));
    nav.querySelectorAll('a').forEach(a => {
      const oc = a.getAttribute('onclick');
      if (oc && oc.includes("'" + sectionId + "'")) a.classList.add('active');
    });
  }
  const titles = {
    'etud-accueil':'Accueil','etud-encadrants':'Encadrants','etud-rapport':'Mon Rapport',
    'etud-demandes':'Mes Demandes','etud-params':'Paramètres',
    'enc-accueil':'Accueil','enc-etudiants':'Mes Étudiants','enc-demandes':'Demandes en attente',
    'enc-rapports':'Rapports','enc-params':'Paramètres',
    'admin-accueil':'Tableau de bord','admin-users':'Encadrants','admin-etudiants':'Étudiants','admin-alldemandes':'Toutes les Demandes','admin-stages':'Stages & Partenaires',
    'admin-soutenances':'Soutenances','admin-stats':'Statistiques','admin-publications':'Publications','admin-params':'Paramètres'
  };
  const prefix = sectionId.split('-')[0];
  const titleEl = document.getElementById(prefix + '-topbar-title');
  if (titleEl && titles[sectionId]) titleEl.textContent = titles[sectionId];
}

/* ═══════════════════════════════════════
   LOGIN
   ═══════════════════════════════════════ */
async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value.trim();
  const btn = document.getElementById('login-btn');
  if (!email || !password) { showToast('⚠️ Remplissez tous les champs.', 'warning'); return; }
  btn.classList.add('btn-loading'); btn.innerHTML = '<span class="spinner"></span> Connexion...';
  try {
    const cred = await auth.signInWithEmailAndPassword(email, password);
    const doc = await db.collection('users').doc(cred.user.uid).get();
    if (!doc.exists) { showToast('❌ Profil introuvable.', 'error'); await auth.signOut(); resetLoginBtn(); return; }
    currentUser = cred.user; currentUserData = doc.data();
    const prenom = currentUserData.name ? currentUserData.name.split(' ')[0] : 'Utilisateur';
    showToast('✅ Bienvenue ' + prenom + ' !', 'success');
    setTimeout(() => {
      if (currentUserData.role === 'admin') { setupAdminDash(); showPage('dashboard-admin'); }
      else if (currentUserData.role === 'encadrant') { setupEncadrantDash(); showPage('dashboard-encadrant'); }
      else if (currentUserData.role === 'etudiant') { setupEtudiantDash(); showPage('dashboard-etudiant'); }
      resetLoginBtn();
    }, 500);
  } catch (e) {
    if (e.code === 'auth/user-not-found' || e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential')
      showToast('❌ Email ou mot de passe incorrect.', 'error');
    else if (e.code === 'auth/too-many-requests') showToast('⚠️ Trop de tentatives.', 'warning');
    else showToast('❌ ' + e.message, 'error');
    resetLoginBtn();
  }
}
function resetLoginBtn() {
  const btn = document.getElementById('login-btn');
  if (btn) { btn.classList.remove('btn-loading'); btn.innerHTML = '→ Se connecter'; }
}

/* ═══════════════════════════════════════
   REGISTER (ÉTUDIANT)
   ═══════════════════════════════════════ */
async function handleRegister(e) {
  e.preventDefault();
  const prenom = document.getElementById('reg-prenom').value.trim();
  const nom = document.getElementById('reg-nom').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const niveau = document.getElementById('reg-niveau').value;
  const password = document.getElementById('reg-password').value;
  const confirm = document.getElementById('reg-confirm').value;
  const btn = document.getElementById('register-btn');

  if (!prenom || !nom || !email || !password || !confirm) { showToast('⚠️ Remplissez tous les champs.', 'warning'); return; }
  if (!email.endsWith('@isitc.u-sousse.tn')) { showToast('❌ Email doit être @isitc.u-sousse.tn', 'error'); return; }
  if (password !== confirm) { showToast('❌ Mots de passe différents.', 'error'); return; }
  if (password.length < 6) { showToast('⚠️ Mot de passe : 6 caractères min.', 'warning'); return; }

  btn.classList.add('btn-loading'); btn.innerHTML = '<span class="spinner"></span> Création...';
  try {
    const cred = await auth.createUserWithEmailAndPassword(email, password);
    await db.collection('users').doc(cred.user.uid).set({
      name: prenom + ' ' + nom, email: email, role: 'etudiant', niveau: niveau,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    currentUser = cred.user;
    currentUserData = { name: prenom + ' ' + nom, email, role: 'etudiant', niveau };
    showToast('✅ Compte créé ! Bienvenue ' + prenom + ' !', 'success');
    setTimeout(async () => { await setupEtudiantDash(); showPage('dashboard-etudiant'); }, 600);
  } catch (e) {
    if (e.code === 'auth/email-already-in-use') showToast('❌ Email déjà utilisé.', 'error');
    else showToast('❌ ' + e.message, 'error');
  }
  btn.classList.remove('btn-loading'); btn.innerHTML = '🎓 Créer mon compte';
}

/* ═══════════════════════════════════════
   LOGOUT
   ═══════════════════════════════════════ */
async function handleLogout() {
  try {
    await auth.signOut();
    currentUser = null; currentUserData = null;
    showToast('👋 Déconnexion réussie.');
    setTimeout(() => showPage('page-accueil'), 400);
  } catch (e) { showToast('❌ Erreur.', 'error'); }
}

function fillDemo(email, password) {
  const e = document.getElementById('login-email'), p = document.getElementById('login-password');
  if (e) e.value = email; if (p) p.value = password;
  showToast('✅ Identifiants remplis !');
}

/* ═══════════════════════════════════════
   SETUP: ADMIN DASHBOARD
   ═══════════════════════════════════════ */
async function setupAdminDash() {
  if (!currentUserData) return;
  const n = (currentUserData.name || 'Admin').split(' ');
  setText('admin-prenom', n[0]);
  setText('admin-sidebar-name', currentUserData.name || 'Admin');
  setText('admin-avatar', ((n[0]||'A')[0] + (n[1]||'')[0]).toUpperCase());
  setDate('current-date-admin');
  await loadEncadrantsTable();
  await loadAdminEtudiants();
  await loadAdminDemandes();
  await loadAdminStats();
  renderOppList('opp-list-admin');
  renderPublications();
  renderCalendar();
  showSection('admin-accueil', 'sidebar-admin');
}

/* ═══════════════════════════════════════
   SETUP: ENCADRANT DASHBOARD
   ═══════════════════════════════════════ */
async function setupEncadrantDash() {
  if (!currentUserData) return;
  const n = (currentUserData.name || 'Encadrant').split(' ');
  setText('enc-prenom', n[0]);
  setText('enc-sidebar-name', currentUserData.name || 'Encadrant');
  setText('enc-avatar', ((n[0]||'E')[0] + (n[1]||'')[0]).toUpperCase());
  setDate('current-date-enc');
  const paramName = document.getElementById('enc-param-name');
  if (paramName) paramName.value = currentUserData.name || '';
  const paramEmail = document.getElementById('enc-param-email');
  if (paramEmail) paramEmail.value = currentUserData.email || '';
  const paramSpec = document.getElementById('enc-param-spec');
  if (paramSpec) paramSpec.value = currentUserData.specialite || '';
  await loadEncadrantStats();
  loadEncDemandes();
  loadEncRapports();
  showSection('enc-accueil', 'sidebar-encadrant');
}

async function updateEncadrantProfile() {
  const name = document.getElementById('enc-param-name').value.trim();
  const spec = document.getElementById('enc-param-spec').value.trim();
  if (!name) { showToast('⚠️ Le nom est requis.', 'warning'); return; }
  try {
    await db.collection('users').doc(currentUser.uid).update({ name: name, specialite: spec });
    currentUserData.name = name;
    currentUserData.specialite = spec;
    const n = name.split(' ');
    setText('enc-prenom', n[0]);
    setText('enc-sidebar-name', name);
    setText('enc-avatar', ((n[0]||'E')[0] + (n[1]||'')[0]).toUpperCase());
    showToast('✅ Profil mis à jour !', 'success');
  } catch (e) {
    showToast('❌ Erreur lors de la mise à jour.', 'error');
  }
}

/* ═══════════════════════════════════════
   ENCADRANT: KPI STATS (Firestore)
   ═══════════════════════════════════════ */
async function loadEncadrantStats() {
  if (!currentUser) return;
  const uid = currentUser.uid;
  console.log('[DEBUG loadEncadrantStats] encadrant uid:', uid);
  try {
    // 1) Étudiants encadrés = demandes acceptées (unique students)
    const acceptSnap = await db.collection('demandes')
      .where('encadrantId', '==', uid)
      .where('status', '==', 'acceptee').get();
    // Deduplicate by etudiantId
    const uniqueStudents = new Set();
    acceptSnap.docs.forEach(doc => uniqueStudents.add(doc.data().etudiantId));
    const nbEtudiants = uniqueStudents.size;
    console.log('[DEBUG loadEncadrantStats] étudiants encadrés:', nbEtudiants);
    setText('enc-kpi-etudiants', nbEtudiants.toString());

    // 2) Demandes en attente
    const pendingSnap = await db.collection('demandes')
      .where('encadrantId', '==', uid)
      .where('status', '==', 'en_attente').get();
    console.log('[DEBUG loadEncadrantStats] demandes en attente:', pendingSnap.size);
    setText('enc-kpi-demandes', pendingSnap.size.toString());

    // 3) Rapports à évaluer = rapports from accepted students where note is null
    let rapportsCount = 0;
    for (const studentId of uniqueStudents) {
      try {
        const rapDoc = await db.collection('rapports').doc(studentId).get();
        if (rapDoc.exists) {
          const r = rapDoc.data();
          if (r.note === null || r.note === undefined) rapportsCount++;
        }
      } catch (e) { /* skip */ }
    }
    console.log('[DEBUG loadEncadrantStats] rapports à évaluer:', rapportsCount);
    setText('enc-kpi-rapports', rapportsCount.toString());

    // Also update nbEtudiants in Firestore for admin stats
    await db.collection('users').doc(uid).update({ nbEtudiants: nbEtudiants });
  } catch (e) { console.error('[DEBUG loadEncadrantStats] ERROR:', e); }
}

/* ═══════════════════════════════════════
   SETUP: ÉTUDIANT DASHBOARD
   ═══════════════════════════════════════ */
async function setupEtudiantDash() {
  if (!currentUserData) return;
  const n = (currentUserData.name || 'Étudiant').split(' ');
  setText('etud-prenom', n[0]);
  setText('etud-sidebar-name', currentUserData.name || 'Étudiant');
  setText('etud-avatar', ((n[0]||'E')[0] + (n[1]||'')[0]).toUpperCase());
  setDate('current-date-etud');
  
  const paramName = document.getElementById('etud-param-name');
  if (paramName) paramName.value = currentUserData.name || '';
  const paramEmail = document.getElementById('etud-param-email');
  if (paramEmail) paramEmail.value = currentUserData.email || '';
  const paramNiveau = document.getElementById('etud-param-niveau');
  if (paramNiveau) paramNiveau.value = currentUserData.niveau || '';

  await loadEncadrantCards();
  await loadMesDemandes();
  await loadMonRapport();
  showSection('etud-accueil', 'sidebar-etudiant');
}

/* ═══════════════════════════════════════
   ADMIN: ENCADRANT MANAGEMENT
   ═══════════════════════════════════════ */
async function addEncadrant() {
  const prenom = document.getElementById('add-enc-prenom').value.trim();
  const nom = document.getElementById('add-enc-nom').value.trim();
  const email = document.getElementById('add-enc-email').value.trim();
  const spec = document.getElementById('add-enc-spec').value.trim();
  const password = document.getElementById('add-enc-password').value;
  const btn = document.getElementById('add-enc-btn');
  if (!prenom || !nom || !email || !spec || !password) { showToast('⚠️ Remplissez tout.', 'warning'); return; }
  if (password.length < 6) { showToast('⚠️ Mot de passe : 6 car. min.', 'warning'); return; }
  btn.classList.add('btn-loading'); btn.innerHTML = '<span class="spinner"></span> Enregistrement...';
  try {
    const sec = firebase.initializeApp(firebaseConfig, 'Sec_' + Date.now());
    const cred = await sec.auth().createUserWithEmailAndPassword(email, password);
    const uid = cred.user.uid; await sec.auth().signOut(); await sec.delete();
    await db.collection('users').doc(uid).set({
      name: prenom + ' ' + nom, email, role: 'encadrant', specialite: spec, nbEtudiants: 0,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    showToast('✅ Encadrant ajouté !', 'success');
    closeModal('modal-add-encadrant');
    document.getElementById('add-enc-prenom').value = '';
    document.getElementById('add-enc-nom').value = '';
    document.getElementById('add-enc-email').value = '';
    document.getElementById('add-enc-spec').value = '';
    document.getElementById('add-enc-password').value = '';
    await loadEncadrantsTable(); await loadAdminStats();
  } catch (e) {
    if (e.code === 'auth/email-already-in-use') showToast('❌ Email déjà utilisé.', 'error');
    else showToast('❌ ' + e.message, 'error');
  }
  btn.classList.remove('btn-loading'); btn.innerHTML = '💾 Enregistrer';
}

async function loadEncadrantsTable() {
  const tbody = document.getElementById('encadrants-tbody');
  if (!tbody) return;
  try {
    const snap = await db.collection('users').where('role', '==', 'encadrant').get();
    if (snap.empty) { tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:24px">Aucun encadrant.</td></tr>'; return; }
    tbody.innerHTML = snap.docs.map(doc => {
      const d = doc.data();
      return `<tr><td>${d.name||'—'}</td><td>${d.email||'—'}</td><td>${d.specialite||'—'}</td>
        <td class="td-actions"><button class="btn btn-sm btn-red" onclick="deleteEncadrant('${doc.id}','${d.name}')">🗑️</button></td></tr>`;
    }).join('');
  } catch (e) { tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--red)">Erreur.</td></tr>'; }
}

async function deleteEncadrant(uid, name) {
  if (!confirm('Supprimer "' + name + '" ?')) return;
  try { 
    await db.collection('users').doc(uid).delete();
    
    const demSnap = await db.collection('demandes').where('encadrantId', '==', uid).get();
    const deletes = [];
    demSnap.forEach(doc => deletes.push(doc.ref.delete()));
    
    const msgSnap = await db.collection('messages').where('encadrantId', '==', uid).get();
    msgSnap.forEach(doc => deletes.push(doc.ref.delete()));
    
    await Promise.all(deletes);

    showToast('🗑️ Encadrant supprimé.', 'success'); 
    await loadEncadrantsTable(); 
    await loadAdminDemandes();
    await loadAdminStats(); 
  } catch (e) { showToast('❌ ' + e.message, 'error'); }
}

async function loadAdminEtudiants() {
  const tbody = document.getElementById('admin-etudiants-tbody');
  if (!tbody) return;
  try {
    const snap = await db.collection('users').where('role', '==', 'etudiant').get();
    if (snap.empty) { tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:24px">Aucun étudiant.</td></tr>'; return; }
    tbody.innerHTML = snap.docs.map(doc => {
      const d = doc.data();
      return `<tr><td>${d.name||'—'}</td><td>${d.email||'—'}</td><td>${d.niveau||'—'}</td>
        <td class="td-actions"><button class="btn btn-sm btn-red" onclick="deleteEtudiant('${doc.id}','${d.name}')">🗑️</button></td></tr>`;
    }).join('');
  } catch (e) { tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--red)">Erreur.</td></tr>'; }
}

async function deleteEtudiant(uid, name) {
  if (!confirm(`Supprimer l'étudiant "${name}" ?`)) return;
  try { 
    await db.collection('users').doc(uid).delete();
    
    const demSnap = await db.collection('demandes').where('etudiantId', '==', uid).get();
    const encadrantsToUpdate = new Set();
    const deletes = [];
    demSnap.forEach(doc => {
      if (doc.data().status === 'acceptee') encadrantsToUpdate.add(doc.data().encadrantId);
      deletes.push(doc.ref.delete());
    });
    
    deletes.push(db.collection('rapports').doc(uid).delete());
    
    const msgSnap = await db.collection('messages').where('etudiantId', '==', uid).get();
    msgSnap.forEach(doc => deletes.push(doc.ref.delete()));
    
    await Promise.all(deletes);

    for (let encId of encadrantsToUpdate) {
      if (!encId) continue;
      const acceptSnap = await db.collection('demandes').where('encadrantId', '==', encId).where('status', '==', 'acceptee').get();
      const uniqueS = new Set();
      acceptSnap.docs.forEach(doc => uniqueS.add(doc.data().etudiantId));
      await db.collection('users').doc(encId).update({ nbEtudiants: uniqueS.size });
    }

    showToast('🗑️ Étudiant supprimé.', 'success'); 
    await loadAdminEtudiants(); 
    await loadAdminDemandes();
    await loadAdminStats(); 
  } catch (e) { showToast('❌ ' + e.message, 'error'); }
}

async function loadAdminDemandes() {
  const tbody = document.getElementById('admin-demandes-tbody');
  if (!tbody) return;
  try {
    const snap = await db.collection('demandes').get();
    if (snap.empty) { tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:24px">Aucune demande.</td></tr>'; return; }
    const docs = snap.docs.sort((a, b) => {
      const ta = a.data().createdAt ? a.data().createdAt.toMillis() : 0;
      const tb = b.data().createdAt ? b.data().createdAt.toMillis() : 0;
      return tb - ta;
    });
    tbody.innerHTML = docs.map(doc => {
      const d = doc.data();
      const date = d.createdAt ? d.createdAt.toDate().toLocaleDateString('fr-FR') : '—';
      const badge = d.status === 'acceptee' ? 'badge-green' : d.status === 'refusee' ? 'badge-red' : 'badge-yellow';
      const label = d.status === 'acceptee' ? 'Acceptée' : d.status === 'refusee' ? 'Refusée' : 'En attente';
      return `<tr><td>${d.etudiantName||'—'}</td><td>${d.encadrantName||'—'}</td><td>${date}</td><td><span class="badge ${badge}">${label}</span></td></tr>`;
    }).join('');
  } catch (e) { tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--red)">Erreur.</td></tr>'; }
}

/* ═══════════════════════════════════════
   ADMIN: STATISTICS
   ═══════════════════════════════════════ */
async function loadAdminStats() {
  try {
    const encSnap = await db.collection('users').where('role', '==', 'encadrant').get();
    const etudSnap = await db.collection('users').where('role', '==', 'etudiant').get();
    const demSnap = await db.collection('demandes').get();
    setText('kpi-total-encadrants', encSnap.size.toString());
    setText('kpi-total-etudiants', etudSnap.size.toString());
    setText('kpi-total-demandes', demSnap.size.toString());
    setText('stat-total-encadrants', encSnap.size.toString());

    // fetch limit
    let limit = 10;
    try {
      const setDoc = await db.collection('settings').doc('global').get();
      if (setDoc.exists && setDoc.data().encadrantLimit) {
        limit = setDoc.data().encadrantLimit;
      }
    } catch (e) {}

    const limitInput = document.getElementById('admin-limit-input');
    if (limitInput) limitInput.value = limit;
    const limitDisplay = document.getElementById('kpi-limit-display');
    if (limitDisplay) limitDisplay.textContent = limit;

    const statsC = document.getElementById('stats-encadrants-list');
    const barC = document.getElementById('bar-chart-rows');
    if (encSnap.empty) {
      if (statsC) statsC.innerHTML = '<div class="empty-state"><div class="empty-icon">📊</div><p>Aucun encadrant.</p></div>';
      if (barC) barC.innerHTML = '<div class="empty-state"><p>Aucune donnée.</p></div>';
      return;
    }
    if (statsC) statsC.innerHTML = encSnap.docs.map(doc => {
      const d = doc.data(); const nb = d.nbEtudiants || 0; const pct = Math.round((nb / limit) * 100);
      return `<div class="progress-item"><div class="progress-header"><span>${d.name}</span><span style="color:var(--blue);font-weight:700">${nb}/${limit}</span></div><div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div></div>`;
    }).join('');
    if (barC) {
      const mx = Math.max(...encSnap.docs.map(d => d.data().nbEtudiants || 0), 1);
      barC.innerHTML = encSnap.docs.map(doc => {
        const d = doc.data(); const nb = d.nbEtudiants || 0; const pct = Math.round((nb / mx) * 100);
        return `<div class="bar-row"><div class="bar-label">${d.name}</div><div class="bar-track"><div class="bar-fill" style="width:${pct}%"><span>${nb}</span></div></div></div>`;
      }).join('');
    }
  } catch (e) { console.error('Stats:', e); }
}

async function updateAdminParams() {
  const limitInput = document.getElementById('admin-limit-input');
  if (!limitInput) return;
  const limitValue = parseInt(limitInput.value);
  if (isNaN(limitValue) || limitValue < 1) { showToast('⚠️ Limite invalide.', 'warning'); return; }
  try {
    await db.collection('settings').doc('global').set({ encadrantLimit: limitValue }, { merge: true });
    showToast('✅ Paramètres enregistrés !', 'success');
    await loadAdminStats();
  } catch (e) { showToast('❌ ' + e.message, 'error'); }
}

/* ═══════════════════════════════════════
   ÉTUDIANT: ENCADRANT CARDS
   ═══════════════════════════════════════ */
async function loadEncadrantCards() {
  const grid = document.getElementById('enc-cards-grid');
  if (!grid || !currentUser) return;
  try {
    const encSnap = await db.collection('users').where('role', '==', 'encadrant').get();
    if (encSnap.empty) { grid.innerHTML = '<div class="empty-state"><div class="empty-icon">👥</div><p>Aucun encadrant disponible.</p></div>'; return; }

    const reqSnap = await db.collection('demandes').where('etudiantId', '==', currentUser.uid).get();
    const existingReqs = reqSnap.docs.map(doc => doc.data());
    const hasAccepted = existingReqs.some(r => r.status === 'acceptee');

    grid.innerHTML = encSnap.docs.map(doc => {
      const d = doc.data();
      const initials = (d.name || 'EN').split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2);
      
      const req = existingReqs.find(r => r.encadrantId === doc.id);
      let btnHTML = `<button class="btn btn-orange btn-full" onclick="sendDemande('${doc.id}','${d.name}')">📩 Envoyer une demande</button>`;
      
      if (req) {
        if (req.status === 'en_attente') btnHTML = `<button class="btn btn-full" disabled style="background:#e9ecef;color:var(--text-muted);border:1px solid var(--gray-border);cursor:not-allowed">⏳ Envoyée (En attente)</button>`;
        else if (req.status === 'acceptee') btnHTML = `<button class="btn btn-full" disabled style="background:#d1fae5;color:var(--green);border:1px solid #a7f3d0;cursor:not-allowed">✅ Acceptée</button>`;
        else if (req.status === 'refusee') btnHTML = `<button class="btn btn-full" disabled style="background:#fee2e2;color:var(--red);border:1px solid #fecaca;cursor:not-allowed">❌ Refusée</button>`;
      } else if (hasAccepted) {
        btnHTML = `<button class="btn btn-full" disabled style="background:#e9ecef;color:var(--text-muted);border:1px solid var(--gray-border);cursor:not-allowed">🚫 Indisponible</button>`;
      }

      return `<div class="enc-card">
        <div class="avatar-circle">${initials}</div>
        <div class="enc-name">${d.name}</div>
        <div class="enc-spec">${d.specialite || '—'}</div>
        <div class="enc-badge">👩‍🎓 ${d.nbEtudiants || 0} étudiants</div>
        ${btnHTML}
      </div>`;
    }).join('');
  } catch (e) { grid.innerHTML = '<div class="empty-state"><p>Erreur.</p></div>'; }
}

function filterEncadrants(query) {
  const cards = document.querySelectorAll('#enc-cards-grid .enc-card');
  cards.forEach(c => {
    const name = c.querySelector('.enc-name').textContent.toLowerCase();
    const spec = c.querySelector('.enc-spec').textContent.toLowerCase();
    c.style.display = (name.includes(query.toLowerCase()) || spec.includes(query.toLowerCase())) ? '' : 'none';
  });
}

/* ═══════════════════════════════════════
   ÉTUDIANT: DEMANDES (Firestore)
   ═══════════════════════════════════════ */
window.currentDemandeTarget = null;
async function sendDemande(encadrantId, encadrantName) {
  if (!currentUser) return;
  window.currentDemandeTarget = { id: encadrantId, name: encadrantName };
  document.getElementById('modal-demande-target-name').textContent = "Envoyez une demande d'encadrement à " + encadrantName + ".";
  document.getElementById('modal-demande-msg').value = "Je souhaite effectuer mon stage PFA avec vous. Voici mon CV/GitHub: ";
  document.getElementById('modal-demande').style.display = 'flex';
}

async function submitDemande() {
  if (!currentUser || !window.currentDemandeTarget) return;
  const btn = document.querySelector('#modal-demande .btn-primary');
  if (btn) { btn.disabled = true; btn.textContent = 'Envoi...'; }
  const encadrantId = window.currentDemandeTarget.id;
  const encadrantName = window.currentDemandeTarget.name;
  const msg = document.getElementById('modal-demande-msg').value;

  const fileInput = document.getElementById('modal-demande-file');
  let cvFile = null;
  if (fileInput && fileInput.files.length > 0) {
    cvFile = fileInput.files[0].name;
  }

  try {
    const existing = await db.collection('demandes')
      .where('etudiantId', '==', currentUser.uid)
      .where('encadrantId', '==', encadrantId)
      .where('status', '==', 'en_attente').get();
    if (!existing.empty) { 
      showToast('⚠️ Demande déjà envoyée', 'warning'); 
      if (btn) { btn.disabled = false; btn.textContent = '📩 Envoyer'; } 
      document.getElementById('modal-demande').style.display = 'none';
      return; 
    }

    let encadrantEmail = '';
    try {
      const encDoc = await db.collection('users').doc(encadrantId).get();
      if (encDoc.exists) encadrantEmail = encDoc.data().email || '';
    } catch(e) {}

    await db.collection('demandes').add({
      etudiantId: currentUser.uid,
      etudiantName: currentUserData.name,
      etudiantEmail: currentUserData.email,
      encadrantId: encadrantId,
      encadrantName: encadrantName,
      encadrantEmail: encadrantEmail,
      status: 'en_attente',
      message: msg.trim() || "Demande d'encadrement",
      cvFileName: cvFile,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    showToast('📩 Demande envoyée !', 'success');
    document.getElementById('modal-demande').style.display = 'none';
    if (fileInput) fileInput.value = '';
    document.getElementById('modal-demande-msg').value = '';
    await loadMesDemandes();
    await loadEncadrantCards();
  } catch (e) { 
    showToast('❌ ' + e.message, 'error'); 
  }
  if (btn) { btn.disabled = false; btn.textContent = '📩 Envoyer'; }
  document.getElementById('modal-demande').style.display = 'none';
}

async function loadMesDemandes() {
  const tbody = document.getElementById('mes-demandes-tbody');
  const kpi = document.getElementById('etud-kpi-demandes');
  if (!tbody || !currentUser) return;
  console.log('[DEBUG loadMesDemandes] currentUser.uid:', currentUser.uid);
  try {
    // No orderBy to avoid composite index requirement — sort client-side
    const snap = await db.collection('demandes').where('etudiantId', '==', currentUser.uid).get();
    console.log('[DEBUG loadMesDemandes] Found', snap.size, 'demandes');
    if (kpi) kpi.textContent = snap.size;
    if (snap.empty) { tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:24px">Aucune demande.</td></tr>'; return; }
    // Sort client-side by createdAt descending
    const docs = snap.docs.sort((a, b) => {
      const ta = a.data().createdAt ? a.data().createdAt.toMillis() : 0;
      const tb = b.data().createdAt ? b.data().createdAt.toMillis() : 0;
      return tb - ta;
    });
    tbody.innerHTML = docs.map(doc => {
      const d = doc.data();
      console.log('[DEBUG loadMesDemandes] demande:', doc.id, '| encadrantId:', d.encadrantId, '| encadrantName:', d.encadrantName, '| status:', d.status);
      const date = d.createdAt ? d.createdAt.toDate().toLocaleDateString('fr-FR') : '—';
      const badge = d.status === 'acceptee' ? 'badge-green' : d.status === 'refusee' ? 'badge-red' : 'badge-yellow';
      const label = d.status === 'acceptee' ? 'Acceptée' : d.status === 'refusee' ? 'Refusée' : 'En attente';
      return `<tr><td>${d.encadrantName}</td><td>${date}</td><td><span class="badge ${badge}">${label}</span></td><td class="td-actions">—</td></tr>`;
    }).join('');
  } catch (e) {
    console.error('[DEBUG loadMesDemandes] ERROR:', e);
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:24px">Aucune demande envoyée.</td></tr>';
    if (kpi) kpi.textContent = '0';
  }
}

/* ═══════════════════════════════════════
   ÉTUDIANT: RAPPORT (Firestore)
   ═══════════════════════════════════════ */
async function handleRapportUpload(input) {
  if (!input.files || !input.files[0] || !currentUser) return;
  const file = input.files[0];
  try {
    // Save rapport info to Firestore (file name only — real storage would use Firebase Storage)
    await db.collection('rapports').doc(currentUser.uid).set({
      etudiantId: currentUser.uid,
      etudiantName: currentUserData.name,
      fileName: file.name,
      fileSize: file.size,
      status: 'en_attente',
      note: null,
      depositDate: firebase.firestore.FieldValue.serverTimestamp()
    });
    showToast('✅ Rapport "' + file.name + '" déposé !', 'success');
    await loadMonRapport();
  } catch (e) { showToast('❌ ' + e.message, 'error'); }
}

async function loadMonRapport() {
  const uploadZone = document.getElementById('rapport-upload-zone');
  const deposited = document.getElementById('rapport-deposited');
  const kpi = document.getElementById('etud-kpi-rapport');
  if (!currentUser || !uploadZone || !deposited) return;
  try {
    const doc = await db.collection('rapports').doc(currentUser.uid).get();
    if (doc.exists) {
      const d = doc.data();
      uploadZone.style.display = 'none'; deposited.style.display = 'block';
      document.getElementById('rapport-filename').innerHTML = `<a href="#" onclick="showToast('Ouverture du rapport...', 'info')" style="color:var(--navy);text-decoration:underline">${d.fileName || 'rapport.pdf'}</a>`;
      setText('rapport-date', d.depositDate ? d.depositDate.toDate().toLocaleDateString('fr-FR') : '—');
      if (d.note !== null && d.note !== undefined) {
        document.getElementById('rapport-note-display').innerHTML = '<span class="badge badge-blue">' + d.note + '/20</span>';
        if (kpi) kpi.textContent = d.note + '/20';
      } else {
        document.getElementById('rapport-note-display').innerHTML = '<span class="badge badge-yellow">En attente de notation</span>';
        if (kpi) kpi.textContent = 'Oui';
      }
    } else {
      uploadZone.style.display = 'block'; deposited.style.display = 'none';
      if (kpi) kpi.textContent = 'Non';
    }
    const demSnap = await db.collection('demandes').where('etudiantId', '==', currentUser.uid).where('status', '==', 'acceptee').get();
    if (!demSnap.empty) {
      window.currentChatEncadrantId = demSnap.docs[0].data().encadrantId;
      document.getElementById('etud-chat-container').style.display = 'block';
      if (window.loadEtudChat) window.loadEtudChat();
    } else {
      document.getElementById('etud-chat-container').style.display = 'none';
      window.currentChatEncadrantId = null;
    }
  } catch (e) { if (kpi) kpi.textContent = 'Non'; }
}

let etudChatUnsubscribe = null;
window.loadEtudChat = function() {
  if (!window.currentChatEncadrantId || !currentUser) return;
  const chatC = document.getElementById('etud-chat-messages');
  if (etudChatUnsubscribe) etudChatUnsubscribe();
  etudChatUnsubscribe = db.collection('messages')
    .where('etudiantId', '==', currentUser.uid)
    .where('encadrantId', '==', window.currentChatEncadrantId)
    .onSnapshot(snap => {
      const sortedDocs = snap.docs.sort((a, b) => {
        const ta = a.data().timestamp ? a.data().timestamp.toMillis() : 0;
        const tb = b.data().timestamp ? b.data().timestamp.toMillis() : 0;
        return ta - tb;
      });
      chatC.innerHTML = sortedDocs.map(doc => {
        const d = doc.data();
        const isMe = d.senderRole === 'etudiant';
        return `<div style="display:flex;flex-direction:column;align-items:${isMe?'flex-end':'flex-start'}">
          <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:4px">${d.senderName}</div>
          <div style="background:${isMe?'var(--blue)':'#fff'};color:${isMe?'#fff':'var(--navy)'};padding:12px 16px;border-radius:12px;border:${isMe?'none':'1px solid var(--gray-border)'};max-width:85%;line-height:1.4">
            ${d.text}
          </div>
        </div>`;
      }).join('');
      setTimeout(() => chatC.scrollTop = chatC.scrollHeight, 100);
    });
};

window.sendEtudChat = async function() {
  const inp = document.getElementById('etud-chat-input');
  if (!inp || !inp.value.trim() || !currentUser || !window.currentChatEncadrantId) return;
  try {
    await db.collection('messages').add({
      etudiantId: currentUser.uid,
      encadrantId: window.currentChatEncadrantId,
      senderRole: 'etudiant',
      senderName: currentUserData.name || 'Étudiant',
      text: inp.value.trim(),
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    inp.value = '';
  } catch (e) { showToast("Erreur d'envoi", 'error'); }
};

/* ═══════════════════════════════════════
   ENCADRANT: DEMANDES REÇUES (Firestore)
   ═══════════════════════════════════════ */
async function loadEncDemandes() {
  const cntAttente = document.getElementById('enc-demand-list');
  const cntEtud = document.getElementById('enc-etudiants-list');
  if (!currentUser) return;
  try {
    const snap = await db.collection('demandes').where('encadrantId', '==', currentUser.uid).get();
    const docs = snap.docs.sort((a, b) => {
      const ta = a.data().createdAt ? a.data().createdAt.toMillis() : 0;
      const tb = b.data().createdAt ? b.data().createdAt.toMillis() : 0;
      return tb - ta;
    });

    if (cntAttente) {
      const attenteDocs = docs.filter(doc => doc.data().status === 'en_attente');
      if (attenteDocs.length === 0) {
        cntAttente.innerHTML = '<div class="empty-state"><div class="empty-icon">📬</div><p>Aucune demande en attente.</p></div>';
      } else {
        cntAttente.innerHTML = attenteDocs.map(generateDemandeHTML).join('');
      }
    }

    if (cntEtud) {
      const etudDocs = docs.filter(doc => doc.data().status === 'acceptee');
      if (etudDocs.length === 0) {
        cntEtud.innerHTML = '<div class="empty-state"><div class="empty-icon">👩‍🎓</div><p>Aucun étudiant encadré actuellement.</p></div>';
      } else {
        cntEtud.innerHTML = etudDocs.map(generateDemandeHTML).join('');
      }
    }
  } catch (e) {
    if (cntAttente) cntAttente.innerHTML = '<div class="empty-state"><p>Erreur.</p></div>';
  }
}

function generateDemandeHTML(doc) {
  const d = doc.data();
  const date = d.createdAt ? d.createdAt.toDate().toLocaleDateString('fr-FR') : '—';
  const badge = d.status === 'acceptee' ? 'badge-green' : d.status === 'refusee' ? 'badge-red' : 'badge-yellow';
  const label = d.status === 'acceptee' ? 'Acceptée' : d.status === 'refusee' ? 'Refusée' : 'En attente';
  const actions = d.status === 'en_attente' ? `
    <div class="demand-actions">
      <button class="btn btn-green btn-sm" onclick="handleDemandeAction('${doc.id}','acceptee')">✅ Accepter</button>
      <button class="btn btn-red btn-sm" onclick="handleDemandeAction('${doc.id}','refusee')">❌ Refuser</button>
    </div>` : `<span style="font-weight:600;color:${d.status==='acceptee'?'var(--green)':'var(--red)'}">${label}</span>`;
  return `<div class="demand-card">
    <div class="demand-header"><span class="demand-student">${d.etudiantName}</span><span class="badge ${badge}">${label}</span></div>
    <div style="font-size:.8rem;color:var(--text-muted);margin-bottom:6px">${d.etudiantEmail} · ${date}</div>
    <div class="demand-msg">"${d.message}"</div>
    ${actions}
  </div>`;
}

async function handleDemandeAction(demandeId, newStatus) {
  try {
    if (newStatus === 'acceptee') {
      let limit = 10;
      try {
        const setDoc = await db.collection('settings').doc('global').get();
        if (setDoc.exists && setDoc.data().encadrantLimit) {
          limit = setDoc.data().encadrantLimit;
        }
      } catch (e) {}

      const acceptSnap = await db.collection('demandes')
        .where('encadrantId', '==', currentUser.uid)
        .where('status', '==', 'acceptee').get();
      const uniqueStudents = new Set();
      acceptSnap.docs.forEach(doc => uniqueStudents.add(doc.data().etudiantId));

      const reqDoc = await db.collection('demandes').doc(demandeId).get();
      if (reqDoc.exists) {
        const sid = reqDoc.data().etudiantId;
        if (!uniqueStudents.has(sid) && uniqueStudents.size >= limit) {
          showToast("❌ Impossible : Limite d'étudiants atteinte (" + limit + ").", 'error');
          return;
        }
      }
    }

    await db.collection('demandes').doc(demandeId).update({ status: newStatus });
    
    if (newStatus === 'acceptee') {
      try {
        const reqDoc = await db.collection('demandes').doc(demandeId).get();
        if (reqDoc.exists) {
          const sid = reqDoc.data().etudiantId;
          const otherDems = await db.collection('demandes')
            .where('etudiantId', '==', sid)
            .where('status', '==', 'en_attente').get();
          
          const deletes = [];
          otherDems.forEach(d => {
            if (d.id !== demandeId) {
              deletes.push(d.ref.delete());
            }
          });
          if (deletes.length > 0) {
            await Promise.all(deletes);
          }
        }
      } catch(e) { console.error("Error auto-deleting demands: ", e); }
    }

    showToast(newStatus === 'acceptee' ? '✅ Demande acceptée !' : '❌ Demande refusée.', newStatus === 'acceptee' ? 'success' : 'error');
    // Refresh demand list + KPI stats
    await loadEncDemandes();
    await loadEncadrantStats();
    await loadEncRapports();
    console.log('[DEBUG handleDemandeAction] Stats refreshed after', newStatus);
  } catch (e) { showToast('❌ ' + e.message, 'error'); }
}

/* ═══════════════════════════════════════
   ENCADRANT: RAPPORTS (Firestore)
   ═══════════════════════════════════════ */
async function loadEncRapports() {
  const container = document.getElementById('enc-rapports-list');
  if (!container || !currentUser) return;
  try {
    // Get students who have accepted demandes with this encadrant
    const demSnap = await db.collection('demandes')
      .where('encadrantId', '==', currentUser.uid)
      .where('status', '==', 'acceptee').get();
    if (demSnap.empty) { container.innerHTML = '<div class="empty-state"><div class="empty-icon">📄</div><p>Aucun rapport à évaluer.</p></div>'; return; }

    const studentIds = demSnap.docs.map(d => d.data().etudiantId);
    let html = '';
    for (const sid of studentIds) {
      const rapDoc = await db.collection('rapports').doc(sid).get();
      if (rapDoc.exists) {
        const r = rapDoc.data();
        const date = r.depositDate ? r.depositDate.toDate().toLocaleDateString('fr-FR') : '—';
        html += `<div style="display:flex;flex-direction:column;width:100%;border:1px solid var(--gray-border);border-radius:12px;background:#fff;gap:0;">
          <div class="opp-card" style="border:none;margin:0;border-radius:12px;">
            <div class="opp-info">
              <div class="opp-title">${r.etudiantName} — Rapport</div>
              <div class="opp-desc"><a href="#" onclick="showToast('Ouverture du fichier...', 'info')" style="color:inherit;text-decoration:underline">${r.fileName}</a></div>
              <div class="opp-meta"><span>📅 ${date}</span></div>
            </div>
            <div style="display:flex;align-items:center;gap:12px;flex-shrink:0;">
              <div class="note-row" style="margin-bottom:0;">
                <input type="number" min="0" max="20" placeholder="Note" id="note-${sid}" value="${r.note||''}" style="width:70px;text-align:center"/>
                <span style="font-size:.8rem">/20</span>
              </div>
              <button class="btn btn-green btn-sm" onclick="assignNoteFirestore('${sid}','note-${sid}')">Attribuer</button>
              <button class="btn btn-sm" style="background:#eef2ff;color:var(--blue);border:1px solid var(--blue);" onclick="window.toggleEncChat('${sid}','${r.etudiantName}')">💬 Remarques</button>
            </div>
          </div>
          <div id="enc-chat-wrap-${sid}" style="display:none;background:#f8f9fa;border-top:1px solid var(--gray-border);border-radius:0 0 12px 12px;height:350px;flex-direction:column;">
            <div id="enc-chat-msgs-${sid}" style="flex:1;overflow-y:auto;padding:15px;display:flex;flex-direction:column;gap:10px;"></div>
            <div style="padding:10px;border-top:1px solid var(--gray-border);display:flex;gap:10px;background:#fff;border-radius:0 0 12px 12px;">
              <input type="text" id="enc-chat-in-${sid}" placeholder="Votre remarque..." style="flex:1;padding:10px;border-radius:6px;border:1px solid var(--gray-border);outline:none;" onkeypress="if(event.key==='Enter') window.sendEncChat('${sid}')"/>
              <button class="btn btn-primary btn-sm" onclick="window.sendEncChat('${sid}')">Envoyer</button>
            </div>
          </div>
        </div>`;
      }
    }
    container.innerHTML = html || '<div class="empty-state"><div class="empty-icon">📄</div><p>Aucun rapport déposé.</p></div>';
  } catch (e) { container.innerHTML = '<div class="empty-state"><p>Aucun rapport.</p></div>'; }
}

window.encChatUnsubscribes = window.encChatUnsubscribes || {};
window.toggleEncChat = function(sid, etudName) {
  const wrap = document.getElementById('enc-chat-wrap-' + sid);
  if (wrap.style.display === 'flex') {
    wrap.style.display = 'none';
    if (window.encChatUnsubscribes[sid]) { window.encChatUnsubscribes[sid](); delete window.encChatUnsubscribes[sid]; }
  } else {
    wrap.style.display = 'flex';
    const msgsContainer = document.getElementById('enc-chat-msgs-' + sid);
    if (!currentUser) return;
    window.encChatUnsubscribes[sid] = db.collection('messages')
      .where('etudiantId', '==', sid)
      .where('encadrantId', '==', currentUser.uid)
      .onSnapshot(snap => {
        const sortedDocs = snap.docs.sort((a, b) => {
          const ta = a.data().timestamp ? a.data().timestamp.toMillis() : 0;
          const tb = b.data().timestamp ? b.data().timestamp.toMillis() : 0;
          return ta - tb;
        });
        msgsContainer.innerHTML = sortedDocs.map(doc => {
          const d = doc.data();
          const isMe = d.senderRole === 'encadrant';
          return `<div style="display:flex;flex-direction:column;align-items:${isMe?'flex-end':'flex-start'}">
            <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:4px">${d.senderName}</div>
            <div style="background:${isMe?'var(--blue)':'#fff'};color:${isMe?'#fff':'var(--navy)'};padding:12px 16px;border-radius:12px;border:${isMe?'none':'1px solid var(--gray-border)'};max-width:85%;line-height:1.4">
              ${d.text}
            </div>
          </div>`;
        }).join('');
        setTimeout(() => msgsContainer.scrollTop = msgsContainer.scrollHeight, 100);
      });
  }
};

window.sendEncChat = async function(sid) {
  const inp = document.getElementById('enc-chat-in-' + sid);
  if (!inp || !inp.value.trim() || !currentUser) return;
  try {
    await db.collection('messages').add({
      etudiantId: sid,
      encadrantId: currentUser.uid,
      senderRole: 'encadrant',
      senderName: currentUserData.name || 'Encadrant',
      text: inp.value.trim(),
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    inp.value = '';
  } catch (e) { showToast("Erreur d'envoi", 'error'); }
};

async function assignNoteFirestore(studentId, inputId) {
  const inp = document.getElementById(inputId);
  if (!inp || !inp.value) { showToast('⚠️ Saisissez une note.', 'warning'); return; }
  const note = parseFloat(inp.value);
  if (isNaN(note) || note < 0 || note > 20) { showToast('⚠️ Note entre 0 et 20.', 'warning'); return; }
  try {
    await db.collection('rapports').doc(studentId).update({ note, status: 'note' });
    showToast('✅ Note ' + note + '/20 attribuée !', 'success');
  } catch (e) { showToast('❌ ' + e.message, 'error'); }
}

/* ═══════════════════════════════════════
   OPPORTUNITIES
   ═══════════════════════════════════════ */
function renderOppList(containerId) {
  const c = document.getElementById(containerId);
  if (!c) return;
  c.innerHTML = opportunites.map(o => `
    <div class="opp-card"><div class="opp-info"><div class="opp-title">${o.titre}</div><div class="opp-desc">${o.desc}</div>
    <div class="opp-meta"><span>🏢 ${o.partenaire}</span><span>📅 ${o.date}</span></div></div>
    <div style="flex-shrink:0"><button class="btn btn-primary btn-sm" onclick="showToast('📋 ${o.titre}')">Détails</button></div></div>`).join('');
}

/* ═══════════════════════════════════════
   PUBLICATIONS
   ═══════════════════════════════════════ */
function publishItem() {
  const t = document.getElementById('pub-titre').value.trim();
  const ty = document.getElementById('pub-type').value;
  const d = document.getElementById('pub-desc').value.trim();
  const dt = document.getElementById('pub-date').value;
  if (!t || !d) { showToast('⚠️ Remplissez titre et description.', 'warning'); return; }
  publications.unshift({ titre: t, type: ty, desc: d, date: dt ? new Date(dt).toLocaleDateString('fr-FR') : new Date().toLocaleDateString('fr-FR') });
  renderPublications();
  document.getElementById('pub-titre').value = ''; document.getElementById('pub-desc').value = '';
  showToast('📢 Publié !', 'success');
}

function renderPublications() {
  const l = document.getElementById('pub-list');
  if (!l) return;
  const labels = { new: 'Nouveauté', comp: 'Compétition', form: 'Formation' };
  l.innerHTML = publications.map(p => `<div class="pub-item"><span class="pub-type-badge ${p.type}">${labels[p.type]||p.type}</span>
    <div class="pub-info"><div class="pub-title">${p.titre}</div><div class="pub-desc">${p.desc}</div></div>
    <div class="pub-date">${p.date}</div></div>`).join('');
}

/* ═══════════════════════════════════════
   CALENDAR & SOUTENANCES
   ═══════════════════════════════════════ */
function renderCalendar() {
  const cells = document.getElementById('cal-cells');
  if (!cells) return;
  const events = { 15: 'Soutenance', 16: 'Soutenance', 22: 'Soutenance', 28: 'Soutenance' };
  const today = new Date().getDate();
  let html = '<div class="cal-cell" style="background:var(--gray-bg)"></div>';
  for (let d = 1; d <= 30; d++) {
    const ev = events[d];
    html += `<div class="cal-cell${d===today?' today':''}${ev?' has-event':''}">
      <div style="font-weight:${d===today?'700':'400'};color:${d===today?'var(--blue)':'inherit'}">${d}</div>
      ${ev?`<div class="cal-event">${ev}</div>`:''}</div>`;
  }
  cells.innerHTML = html;
}

function saveSoutenance() {
  const e = document.getElementById('sout-etudiant').value;
  const d = document.getElementById('sout-date').value;
  const t = document.getElementById('sout-time').value;
  const s = document.getElementById('sout-salle').value;
  const j = document.getElementById('sout-jury').value;
  if (!e || !d || !s) { showToast('⚠️ Remplissez les champs.', 'warning'); return; }
  const tbody = document.getElementById('soutenances-tbody');
  if (tbody) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${e}</td><td>${new Date(d).toLocaleDateString('fr-FR')}</td><td>${t||'—'}</td><td>${s}</td><td>${j||'—'}</td><td class="td-actions"><button class="btn btn-sm btn-outline-blue">✏️</button></td>`;
    tbody.appendChild(tr);
  }
  closeModal('modal-soutenance'); showToast('✅ Soutenance planifiée !', 'success');
}

/* ═══════════════════════════════════════
   UTILITIES
   ═══════════════════════════════════════ */
function showToast(msg, type = 'info') {
  const c = document.getElementById('toast-container'); if (!c) return;
  const t = document.createElement('div'); t.className = 'toast ' + type; t.textContent = msg; c.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(40px)'; t.style.transition = '.4s'; setTimeout(() => t.remove(), 400); }, 3000);
}
function togglePwd(id, btn) { const i = document.getElementById(id); if (!i) return; i.type = i.type === 'password' ? 'text' : 'password'; btn.textContent = i.type === 'password' ? '👁' : '🙈'; }
function openModal(id) { const m = document.getElementById(id); if (m) m.classList.add('open'); }
function closeModal(id) { const m = document.getElementById(id); if (m) m.classList.remove('open'); }
function closeModalOnOverlay(e, id) { if (e.target === e.currentTarget) closeModal(id); }
function setText(id, v) { const e = document.getElementById(id); if (e) e.textContent = v; }
function setDate(id) { const e = document.getElementById(id); if (e) e.textContent = new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }); }
function setAllDates() { ['current-date-etud', 'current-date-enc', 'current-date-admin'].forEach(id => setDate(id)); }

console.log('🟢 main.js loaded — ISITCStage (3 roles)');
