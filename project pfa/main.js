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
    'enc-accueil':'Accueil','enc-etudiants':'Mes Étudiants','enc-demandes':'Demandes reçues',
    'enc-rapports':'Rapports','enc-params':'Paramètres',
    'admin-accueil':'Tableau de bord','admin-users':'Encadrants','admin-stages':'Stages & Partenaires',
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
  await loadEncadrantStats();
  loadEncDemandes();
  loadEncRapports();
  showSection('enc-accueil', 'sidebar-encadrant');
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
  try { await db.collection('users').doc(uid).delete(); showToast('🗑️ Supprimé.', 'error'); await loadEncadrantsTable(); await loadAdminStats(); }
  catch (e) { showToast('❌ ' + e.message, 'error'); }
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

    const statsC = document.getElementById('stats-encadrants-list');
    const barC = document.getElementById('bar-chart-rows');
    if (encSnap.empty) {
      if (statsC) statsC.innerHTML = '<div class="empty-state"><div class="empty-icon">📊</div><p>Aucun encadrant.</p></div>';
      if (barC) barC.innerHTML = '<div class="empty-state"><p>Aucune donnée.</p></div>';
      return;
    }
    const limit = 10;
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

/* ═══════════════════════════════════════
   ÉTUDIANT: ENCADRANT CARDS
   ═══════════════════════════════════════ */
async function loadEncadrantCards() {
  const grid = document.getElementById('enc-cards-grid');
  if (!grid) return;
  try {
    const snap = await db.collection('users').where('role', '==', 'encadrant').get();
    if (snap.empty) { grid.innerHTML = '<div class="empty-state"><div class="empty-icon">👥</div><p>Aucun encadrant disponible.</p></div>'; return; }
    grid.innerHTML = snap.docs.map(doc => {
      const d = doc.data();
      const initials = (d.name || 'EN').split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2);
      return `<div class="enc-card">
        <div class="avatar-circle">${initials}</div>
        <div class="enc-name">${d.name}</div>
        <div class="enc-spec">${d.specialite || '—'}</div>
        <div class="enc-badge">👩‍🎓 ${d.nbEtudiants || 0} étudiants</div>
        <button class="btn btn-orange btn-full" onclick="sendDemande('${doc.id}','${d.name}')">📩 Envoyer une demande</button>
      </div>`;
    }).join('');
  } catch (e) { grid.innerHTML = '<div class="empty-state"><p>Erreur de chargement.</p></div>'; }
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
async function sendDemande(encadrantId, encadrantName) {
  if (!currentUser) return;
  console.log('[DEBUG sendDemande] encadrantId:', encadrantId, '| encadrantName:', encadrantName);
  console.log('[DEBUG sendDemande] currentUser.uid:', currentUser.uid, '| role:', currentUserData.role);
  try {
    // Check if already sent (simple query without orderBy to avoid index issues)
    const existing = await db.collection('demandes')
      .where('etudiantId', '==', currentUser.uid)
      .where('encadrantId', '==', encadrantId)
      .where('status', '==', 'en_attente').get();
    if (!existing.empty) { showToast('⚠️ Demande déjà envoyée à ' + encadrantName, 'warning'); return; }

    // Fetch encadrant email from Firestore to store it
    let encadrantEmail = '';
    try {
      const encDoc = await db.collection('users').doc(encadrantId).get();
      if (encDoc.exists) encadrantEmail = encDoc.data().email || '';
    } catch (err) { console.warn('Could not fetch encadrant email:', err); }

    const demandeData = {
      etudiantId: currentUser.uid,
      etudiantName: currentUserData.name,
      etudiantEmail: currentUserData.email,
      encadrantId: encadrantId,
      encadrantName: encadrantName,
      encadrantEmail: encadrantEmail,
      status: 'en_attente',
      message: 'Demande d\'encadrement de la part de ' + currentUserData.name,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    console.log('[DEBUG sendDemande] Writing to Firestore:', JSON.stringify(demandeData));
    await db.collection('demandes').add(demandeData);
    showToast('📩 Demande envoyée à ' + encadrantName + ' !', 'success');
    await loadMesDemandes();
  } catch (e) { console.error('[DEBUG sendDemande] ERROR:', e); showToast('❌ ' + e.message, 'error'); }
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
      setText('rapport-filename', d.fileName || 'rapport.pdf');
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
  } catch (e) { if (kpi) kpi.textContent = 'Non'; }
}

/* ═══════════════════════════════════════
   ENCADRANT: DEMANDES REÇUES (Firestore)
   ═══════════════════════════════════════ */
async function loadEncDemandes() {
  const container = document.getElementById('enc-demand-list');
  if (!container || !currentUser) return;
  console.log('[DEBUG loadEncDemandes] currentUser.uid:', currentUser.uid, '| email:', currentUser.email);
  try {
    // No orderBy to avoid composite index requirement — sort client-side
    const snap = await db.collection('demandes').where('encadrantId', '==', currentUser.uid).get();
    console.log('[DEBUG loadEncDemandes] Found', snap.size, 'demandes for encadrant', currentUser.uid);
    if (snap.empty) { container.innerHTML = '<div class="empty-state"><div class="empty-icon">📬</div><p>Aucune demande reçue.</p></div>'; return; }
    // Sort client-side by createdAt descending
    const docs = snap.docs.sort((a, b) => {
      const ta = a.data().createdAt ? a.data().createdAt.toMillis() : 0;
      const tb = b.data().createdAt ? b.data().createdAt.toMillis() : 0;
      return tb - ta;
    });
    container.innerHTML = docs.map(doc => {
      const d = doc.data();
      console.log('[DEBUG loadEncDemandes] demande:', doc.id, '| from:', d.etudiantName, '| encadrantId:', d.encadrantId, '| status:', d.status);
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
    }).join('');
  } catch (e) {
    console.error('[DEBUG loadEncDemandes] ERROR:', e);
    container.innerHTML = '<div class="empty-state"><p>Erreur de chargement des demandes. Vérifiez la console.</p></div>';
  }
}

async function handleDemandeAction(demandeId, newStatus) {
  try {
    await db.collection('demandes').doc(demandeId).update({ status: newStatus });
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
        html += `<div class="opp-card">
          <div class="opp-info">
            <div class="opp-title">${r.etudiantName} — Rapport</div>
            <div class="opp-desc">${r.fileName}</div>
            <div class="opp-meta"><span>📅 ${date}</span></div>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px;flex-shrink:0">
            <div class="note-row">
              <input type="number" min="0" max="20" placeholder="Note" id="note-${sid}" value="${r.note||''}" style="width:70px;text-align:center"/>
              <span style="font-size:.8rem">/20</span>
              <button class="btn btn-green btn-sm" onclick="assignNoteFirestore('${sid}','note-${sid}')">Attribuer</button>
            </div>
          </div>
        </div>`;
      }
    }
    container.innerHTML = html || '<div class="empty-state"><div class="empty-icon">📄</div><p>Aucun rapport déposé.</p></div>';
  } catch (e) { container.innerHTML = '<div class="empty-state"><p>Aucun rapport.</p></div>'; }
}

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
