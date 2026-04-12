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
  setupAuthListener();
});


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

function toggleSidebar() {
  const asides = document.querySelectorAll('aside');
  asides.forEach(a => {
    // On ne toggle que celle qui appartient au dashboard actif
    if (a.closest('.page.active')) a.classList.toggle('open');
  });
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
    
    // FERMER LE SIDEBAR SUR MOBILE APRES CLIC
    const aside = nav.closest('aside');
    if (aside) aside.classList.remove('open');
  }
  const titles = {
    'etud-accueil':'Accueil','etud-encadrants':'Encadrants','etud-rapport':'Conversations',
    'etud-soutenance':'Ma Soutenance','etud-publications':'Actualités',
    'etud-demandes':'Mes Demandes','etud-params':'Paramètres',
    'enc-accueil':'Accueil','enc-etudiants':'Mes Étudiants','enc-demandes':'Demandes en attente',
    'enc-rapports':'Conversations','enc-params':'Paramètres',
    'admin-accueil':'Tableau de bord','admin-users':'Encadrants','admin-etudiants':'Étudiants','admin-alldemandes':'Toutes les Demandes',
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
    // 1. RECHERCHE DE L'UTILISATEUR DANS FIRESTORE
    const snap = await db.collection('users').where('email', '==', email).get();
    
    if (!snap.empty) {
      const d = snap.docs[0].data();
      
      // 2. VERROUILLAGE SI UN MOT DE PASSE ADMIN EXISTE
      if (d.tempPassword) {
        if (d.tempPassword === password) {
          // Nouveau mot de passe correct -> Connexion Manuelle
          currentUserData = d;
          currentUser = { uid: snap.docs[0].id, email: d.email };
          finishLogin();
          return;
        } else {
          // Ancien mot de passe ou mauvais mot de passe -> REJET IMMÉDIAT
          showToast('❌ Mot de passe obsolète ou incorrect.', 'error');
          resetLoginBtn();
          return;
        }
      }
    }

    // 3. SI AUCUN VERROUILLAGE : Connexion normale via Firebase Auth
    const cred = await auth.signInWithEmailAndPassword(email, password);
    const doc = await db.collection('users').doc(cred.user.uid).get();
    if (!doc.exists) { showToast('❌ Profil introuvable.', 'error'); await auth.signOut(); resetLoginBtn(); return; }
    currentUser = cred.user; currentUserData = doc.data();
    finishLogin();
  } catch (e) {
    if (e.code === 'auth/user-not-found' || e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential')
      showToast('❌ Email ou mot de passe incorrect.', 'error');
    else if (e.code === 'auth/too-many-requests') showToast('⚠️ Trop de tentatives.', 'warning');
    else showToast('❌ ' + e.message, 'error');
    resetLoginBtn();
  }
}

function finishLogin() {
    const prenom = currentUserData.name ? currentUserData.name.split(' ')[0] : 'Utilisateur';
    showToast('✅ Bienvenue ' + prenom + ' !', 'success');
    setTimeout(() => {
      if (currentUserData.role === 'admin') { setupAdminDash(); showPage('dashboard-admin'); }
      else if (currentUserData.role === 'encadrant') { setupEncadrantDash(); showPage('dashboard-encadrant'); }
      else if (currentUserData.role === 'etudiant') { setupEtudiantDash(); showPage('dashboard-etudiant'); }
      resetLoginBtn();
    }, 500);
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

  await loadAllPublications();
  await loadAdminSoutenances();
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
  await loadEtudiantStats();
  await loadAllPublications();
  await loadMaSoutenance();
  showSection('etud-accueil', 'sidebar-etudiant');
}

async function loadEtudiantStats() {
  if (!currentUser) return;
  try {
    const demSnap = await db.collection('demandes').where('etudiantId', '==', currentUser.uid).get();
    setText('etud-kpi-demandes', demSnap.size);
    
    // Note et rapport
    const rapSnap = await db.collection('rapports').doc(currentUser.uid).get();
    if (rapSnap.exists) {
      setText('etud-kpi-rapport', 'Oui');
      const d = rapSnap.data();
      setText('etud-kpi-note', d.note || '—');
    }
  } catch (e) { console.error('loadEtudiantStats:', e); }
}

async function loadMaSoutenance() {
  const infoCard = document.getElementById('etud-soutenance-info');
  const emptyState = document.getElementById('etud-soutenance-empty');
  if (!infoCard || !emptyState || !currentUser) return;

  try {
    const snap = await db.collection('soutenances').where('etudiantId', '==', currentUser.uid).limit(1).get();
    if (!snap.empty) {
      const s = snap.docs[0].data();
      infoCard.style.display = 'block';
      emptyState.style.display = 'none';
      
      const formattedDate = s.date ? new Date(s.date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '—';
      setText('etud-sout-date', formattedDate);
      setText('etud-sout-time', s.time || '—');
      setText('etud-sout-salle', s.salle || '—');
      setText('etud-sout-jury', s.jury || '—');
    } else {
      infoCard.style.display = 'none';
      emptyState.style.display = 'block';
    }
  } catch (e) {
    console.error('Erreur loadMaSoutenance:', e);
  }
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
        <td class="td-actions">
          <button class="btn btn-sm btn-primary" onclick="openModifyUserModal('${doc.id}','encadrant','${d.email}')">✏️</button>
          <button class="btn btn-sm btn-red" onclick="deleteEncadrant('${doc.id}','${d.name}')">🗑️</button>
        </td></tr>`;
    }).join('');
  } catch (e) { tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--red)">Erreur.</td></tr>'; }
}

async function deleteEncadrant(uid, name) {
  const modal = document.getElementById('modal-confirm-delete');
  if (!modal) return;
  document.getElementById('delete-target-uid').value = uid;
  document.getElementById('delete-target-type').value = 'encadrant';
  document.getElementById('delete-user-display-name').textContent = name;
  document.getElementById('admin-delete-password').value = '';
  openModal('modal-confirm-delete');
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
        <td class="td-actions">
          <button class="btn btn-sm btn-primary" onclick="openModifyUserModal('${doc.id}','etudiant','${d.email}')">✏️</button>
          <button class="btn btn-sm btn-red" onclick="deleteEtudiant('${doc.id}','${d.name}')">🗑️</button>
        </td></tr>`;
    }).join('');
  } catch (e) { tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--red)">Erreur.</td></tr>'; }
}

async function deleteEtudiant(uid, name) {
  const modal = document.getElementById('modal-confirm-delete');
  if (!modal) return;
  document.getElementById('delete-target-uid').value = uid;
  document.getElementById('delete-target-type').value = 'etudiant';
  document.getElementById('delete-user-display-name').textContent = name;
  document.getElementById('admin-delete-password').value = '';
  openModal('modal-confirm-delete');
}

async function executeDeletion() {
  const uid = document.getElementById('delete-target-uid').value;
  const type = document.getElementById('delete-target-type').value;
  const adminPassword = document.getElementById('admin-delete-password').value;
  const btn = document.getElementById('btn-confirm-delete');

  if (!adminPassword) { showToast('⚠️ Entrez votre mot de passe.', 'warning'); return; }
  
  btn.classList.add('btn-loading'); btn.disabled = true;

  try {
    const credential = firebase.auth.EmailAuthProvider.credential(currentUser.email, adminPassword);
    await currentUser.reauthenticateWithCredential(credential);

    if (type === 'encadrant') {
      await db.collection('users').doc(uid).delete();
      const demSnap = await db.collection('demandes').where('encadrantId', '==', uid).get();
      const deletes = [];
      demSnap.forEach(doc => deletes.push(doc.ref.delete()));
      const msgSnap = await db.collection('messages').where('encadrantId', '==', uid).get();
      msgSnap.forEach(doc => deletes.push(doc.ref.delete()));
      await Promise.all(deletes);
      showToast('🗑️ Encadrant supprimé.', 'success'); 
      await loadEncadrantsTable();
    } else {
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
      const soutSnap = await db.collection('soutenances').where('etudiantId', '==', uid).get();
      soutSnap.forEach(doc => deletes.push(doc.ref.delete()));
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
    }

    await loadAdminDemandes(); await loadAdminStats(); 
    closeModal('modal-confirm-delete');
  } catch (e) {
    if (e.code === 'auth/wrong-password') showToast('❌ Mot de passe admin incorrect.', 'error');
    else showToast('❌ ' + e.message, 'error');
  } finally {
    btn.classList.remove('btn-loading'); btn.disabled = false;
  }
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
  document.getElementById('modal-demande-msg').value = "Je souhaite effectuer mon stage de PFE avec vous.";
  openModal('modal-demande');
}

async function submitDemande() {
  if (!currentUser || !window.currentDemandeTarget) return;
  const btn = document.querySelector('#modal-demande .btn-primary');
  if (btn) { btn.disabled = true; btn.textContent = 'Envoi...'; }
  const encadrantId = window.currentDemandeTarget.id;
  const encadrantName = window.currentDemandeTarget.name;
  const msg = document.getElementById('modal-demande-msg').value;

  try {
    const existing = await db.collection('demandes')
      .where('etudiantId', '==', currentUser.uid)
      .where('encadrantId', '==', encadrantId)
      .where('status', '==', 'en_attente').get();
    if (!existing.empty) { 
      showToast('⚠️ Demande déjà envoyée', 'warning'); 
      if (btn) { btn.disabled = false; btn.textContent = '📩 Envoyer'; } 
      closeModal('modal-demande');
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
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    showToast('📩 Demande envoyée !', 'success');
    closeModal('modal-demande');
    document.getElementById('modal-demande-msg').value = '';
    await loadMesDemandes();
    await loadEncadrantCards();
  } catch (e) { 
    showToast('❌ ' + e.message, 'error'); 
  }
  if (btn) { btn.disabled = false; btn.textContent = '📩 Envoyer'; }
  closeModal('modal-demande');
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
    // 1. Sauvegarde dans la collection rapports
    await db.collection('rapports').doc(currentUser.uid).set({
      etudiantId: currentUser.uid,
      etudiantName: currentUserData.name,
      fileName: file.name,
      fileSize: file.size,
      status: 'en_attente',
      note: null,
      depositDate: firebase.firestore.FieldValue.serverTimestamp()
    });

    // 2. Enregistrement automatique dans la conversation pour l'historique
    if (window.currentChatEncadrantId) {
      await db.collection('messages').add({
        etudiantId: currentUser.uid,
        encadrantId: window.currentChatEncadrantId,
        senderRole: 'etudiant',
        senderName: currentUserData.name || 'Étudiant',
        text: "📁 Rapport déposé : " + file.name,
        fileName: file.name,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });
    }

    showToast('✅ Rapport "' + file.name + '" déposé et envoyé à l\'encadrant !', 'success');
    await loadMonRapport();
  } catch (e) { showToast('❌ ' + e.message, 'error'); }
}

async function loadMonRapport() {
  const uploadZone = document.getElementById('rapport-upload-zone');
  const deposited = document.getElementById('rapport-deposited');
  const chatContainer = document.getElementById('etud-chat-container');
  const kpi = document.getElementById('etud-kpi-rapport');
  
  if (!currentUser || !uploadZone || !deposited) return;

  // 1. Charger les infos du rapport
  try {
    const doc = await db.collection('rapports').doc(currentUser.uid).get();
    if (doc.exists) {
      const d = doc.data();
      const isGraded = d.note !== null && d.note !== undefined;
      
      uploadZone.style.display = isGraded ? 'block' : 'none';
      if (isGraded) {
        const title = uploadZone.querySelector('h3');
        if (title) title.textContent = 'Renvoyer une nouvelle version du rapport';
      }

      deposited.style.display = 'block';
      const fileLink = document.getElementById('rapport-filename');
      if (fileLink) fileLink.innerHTML = `<a href="#" onclick="showToast('Ouverture du rapport...', 'info')" style="color:var(--navy);text-decoration:underline">${d.fileName || 'rapport.pdf'}</a>`;
      
      setText('rapport-date', d.depositDate ? d.depositDate.toDate().toLocaleDateString('fr-FR') : '—');
      
      const noteDisp = document.getElementById('rapport-note-display');
      if (noteDisp) {
        if (isGraded) {
          noteDisp.innerHTML = '<span class="badge badge-blue">' + d.note + '/20</span>';
          if (kpi) kpi.textContent = d.note + '/20';
        } else {
          noteDisp.innerHTML = '<span class="badge badge-yellow">En attente d\'évaluation</span>';
          if (kpi) kpi.textContent = 'Oui';
        }
      }
    } else {
      uploadZone.style.display = 'block'; 
      const title = uploadZone.querySelector('h3');
      if (title) title.textContent = 'Cliquer pour déposer votre rapport (PDF)';
      deposited.style.display = 'none';
      if (kpi) kpi.textContent = 'Non';
    }
  } catch (e) { 
    console.error("Erreur chargement rapport:", e);
  }

  // 2. Charger la conversation (Indépendant du rapport)
  try {
    const demSnap = await db.collection('demandes')
      .where('etudiantId', '==', currentUser.uid)
      .where('status', '==', 'acceptee')
      .get();
      
    if (!demSnap.empty) {
      window.currentChatEncadrantId = demSnap.docs[0].data().encadrantId;
      if (chatContainer) chatContainer.style.display = 'block';
      if (window.loadEtudChat) window.loadEtudChat();
    } else {
      if (chatContainer) chatContainer.style.display = 'none';
      window.currentChatEncadrantId = null;
    }
  } catch (e) {
    console.error("Erreur chargement chat:", e);
  }
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
        const noteBadge = d.note !== undefined && d.note !== null ? `<span class="badge badge-blue" style="margin-left:8px;font-size:0.75rem;">Note: ${d.note}/20</span>` : '';
        const fileLink = d.fileName ? `<div style="margin-top:8px;padding:8px;background:rgba(0,0,0,0.05);border-radius:6px;display:flex;align-items:center;gap:8px;font-size:0.85rem;">
          <span>📄</span>
          <a href="#" style="color:inherit;text-decoration:underline;">${d.fileName}</a>
          ${noteBadge}
        </div>` : '';
        return `<div style="display:flex;flex-direction:column;align-items:${isMe?'flex-end':'flex-start'}">
          <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:4px">${d.senderName}</div>
          <div style="background:${isMe?'var(--blue)':'#fff'};color:${isMe?'#fff':'var(--navy)'};padding:12px 16px;border-radius:12px;border:${isMe?'none':'1px solid var(--gray-border)'};max-width:85%;line-height:1.4">
            ${d.text}
            ${fileLink}
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

function generateChatHTML(sid) {
  return `<div id="enc-chat-wrap-${sid}" style="display:none;background:#f8f9fa;border-top:1px solid var(--gray-border);border-bottom:1px solid var(--gray-border);height:350px;flex-direction:column;">
    <div id="enc-chat-msgs-${sid}" style="flex:1;overflow-y:auto;padding:15px;display:flex;flex-direction:column;gap:10px;"></div>
    <div style="padding:10px;border-top:1px solid var(--gray-border);display:flex;gap:10px;background:#fff;align-items:center;">
      <div style="display:flex;align-items:center;background:#f0f2f5;border-radius:24px;padding:2px 12px;gap:8px;flex:1;">
        <input type="file" id="enc-chat-file-${sid}" style="display:none" onchange="window.sendChatFile('${sid}', 'encadrant')">
        <button onclick="document.getElementById('enc-chat-file-${sid}').click()" style="background:none;font-size:1.4rem;color:var(--text-muted);display:flex;align-items:center;justify-content:center;padding:0;width:28px;height:28px;border:none;">+</button>
        <input type="text" id="enc-chat-in-${sid}" placeholder="Écrivez un message..." style="flex:1;background:none;border:none;padding:8px 0;outline:none;font-size:0.9rem;" onkeypress="if(event.key==='Enter') window.sendEncChat('${sid}')"/>
        <button class="btn btn-primary btn-sm" onclick="window.sendEncChat('${sid}')" style="border-radius:18px;padding:6px 16px;">Envoyer</button>
      </div>
    </div>
  </div>`;
}

window.sendChatFile = async function(sid, role) {
  const inputId = role === 'etudiant' ? 'etud-chat-file' : 'enc-chat-file-' + sid;
  const fileInput = document.getElementById(inputId);
  if (!fileInput || !fileInput.files.length || !currentUser) return;
  
  const file = fileInput.files[0];
  const eId = role === 'etudiant' ? currentUser.uid : sid;
  const encId = role === 'etudiant' ? window.currentChatEncadrantId : currentUser.uid;

  try {
    await db.collection('messages').add({
      etudiantId: eId,
      encadrantId: encId,
      senderRole: role,
      senderName: currentUserData.name || (role === 'etudiant' ? 'Étudiant' : 'Encadrant'),
      text: "📁 Document envoyé : " + file.name,
      fileName: file.name,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    fileInput.value = '';
    showToast('📎 Fichier envoyé !', 'success');
  } catch (e) { showToast("Erreur d'envoi du fichier", 'error'); }
};

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
    const demSnap = await db.collection('demandes')
      .where('encadrantId', '==', currentUser.uid)
      .where('status', '==', 'acceptee').get();
    
    if (demSnap.empty) { 
      container.innerHTML = '<div class="empty-state"><div class="empty-icon">💬</div><p>Aucun étudiant encadré actuellement.</p></div>'; 
      return; 
    }

    let html = '';
    for (const dDoc of demSnap.docs) {
      const d = dDoc.data();
      const sid = d.etudiantId;
      const rapDoc = await db.collection('rapports').doc(sid).get();
      
      let reportHTML = '';
      if (rapDoc.exists) {
        const r = rapDoc.data();
        const rDate = r.depositDate ? r.depositDate.toDate().toLocaleDateString('fr-FR') : '—';
        reportHTML = `
          <div style="display:flex;align-items:center;background:rgba(26,114,184,0.05);border-radius:10px;padding:12px 16px;margin:12px 0;border:1px dashed var(--blue);">
            <div style="font-size:1.5rem;margin-right:12px;">📄</div>
            <div style="flex:1">
              <div style="font-weight:600;font-size:0.85rem;">Rapport : <a href="#" style="text-decoration:underline;">${r.fileName}</a></div>
              <div style="font-size:0.75rem;color:var(--text-muted)">Déposé le ${rDate}</div>
            </div>
            <div class="note-row" style="margin-right:12px;">
              <input type="number" min="0" max="20" placeholder="Note" id="note-${sid}" value="${r.note||''}" style="width:65px;padding:6px;"/>
              <button class="btn btn-green btn-sm" onclick="assignNoteFirestore('${sid}','note-${sid}')">Noter</button>
            </div>
          </div>`;
      } else {
        reportHTML = `<div style="padding:12px;background:var(--gray-bg);border-radius:10px;font-size:0.8rem;color:var(--text-muted);text-align:center;margin:12px 0;">Aucun rapport déposé pour le moment.</div>`;
      }

      html += `
        <div class="enc-student-card" id="enc-card-${sid}" style="background:#fff;border:1px solid var(--gray-border);border-radius:16px;margin-bottom:28px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.03);">
          <div style="padding:18px 24px;display:flex;align-items:center;justify-content:space-between;background:#fff;border-bottom:1px solid var(--gray-border);">
            <div>
              <div style="font-weight:800;color:var(--navy);font-size:1.05rem;">${d.etudiantName}</div>
              <div style="font-size:0.8rem;color:var(--text-muted);">${d.etudiantEmail}</div>
            </div>
            <button class="btn btn-sm" style="background:var(--blue);color:#fff;border-radius:20px;padding:8px 18px;" onclick="window.toggleEncChat('${sid}','${d.etudiantName}', this)">💬 Ouvrir la conversation</button>
          </div>
          <div style="padding:0 24px;">
            ${reportHTML}
          </div>
          ${generateChatHTML(sid)}
        </div>`;
    }
    container.innerHTML = html;
  } catch (e) { container.innerHTML = '<div class="empty-state"><p>Erreur de chargement.</p></div>'; }
}

window.encChatUnsubscribes = window.encChatUnsubscribes || {};
window.toggleEncChat = function(sid, etudName, btn) {
  const wrap = document.getElementById('enc-chat-wrap-' + sid);
  if (!wrap) return;
  const isOpen = wrap.style.display === 'flex';
  const allCards = document.querySelectorAll('.enc-student-card');
  
  if (isOpen) {
    // Fermer
    wrap.style.display = 'none';
    if (btn) {
      btn.innerHTML = '💬 Ouvrir la conversation';
      btn.style.background = 'var(--blue)';
    }
    // Tout réafficher
    allCards.forEach(c => c.style.display = 'block');
    
    if (window.encChatUnsubscribes[sid]) { window.encChatUnsubscribes[sid](); delete window.encChatUnsubscribes[sid]; }
  } else {
    // Ouvrir
    wrap.style.display = 'flex';
    if (btn) {
      btn.innerHTML = '❌ Fermer la conversation';
      btn.style.background = 'var(--red)';
    }
    // Masquer les autres
    allCards.forEach(c => {
      if (c.id !== 'enc-card-' + sid) c.style.display = 'none';
    });
    
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
          const noteBadge = d.note !== undefined && d.note !== null ? `<span class="badge badge-blue" style="margin-left:8px;font-size:0.75rem;">Note: ${d.note}/20</span>` : '';
          const fileLink = d.fileName ? `<div style="margin-top:8px;padding:8px;background:rgba(0,0,0,0.05);border-radius:6px;display:flex;align-items:center;gap:8px;font-size:0.85rem;">
            <span>📄</span>
            <a href="#" style="color:inherit;text-decoration:underline;">${d.fileName}</a>
            ${noteBadge}
          </div>` : '';
          return `<div style="display:flex;flex-direction:column;align-items:${isMe?'flex-end':'flex-start'}">
            <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:4px">${d.senderName}</div>
            <div style="background:${isMe?'var(--blue)':'#fff'};color:${isMe?'#fff':'var(--navy)'};padding:12px 16px;border-radius:12px;border:${isMe?'none':'1px solid var(--gray-border)'};max-width:85%;line-height:1.4">
              ${d.text}
              ${fileLink}
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
    // 1. Mise à jour de la fiche rapport principale
    const rapSnap = await db.collection('rapports').doc(studentId).get();
    let currentFileName = "";
    if (rapSnap.exists) {
      currentFileName = rapSnap.data().fileName;
    }
    await db.collection('rapports').doc(studentId).update({ note, status: 'note' });

    // 2. Mise à jour des messages de chat correspondants à ce fichier
    if (currentFileName) {
      const msgSnap = await db.collection('messages')
        .where('etudiantId', '==', studentId)
        .where('fileName', '==', currentFileName).get();
      
      const updates = [];
      msgSnap.forEach(doc => updates.push(doc.ref.update({ note })));
      if (updates.length > 0) await Promise.all(updates);
    }

    showToast('✅ Note ' + note + '/20 attribuée ! Elle apparaît aussi dans le chat.', 'success');
  } catch (e) { showToast('❌ ' + e.message, 'error'); }
}

/* ═══════════════════════════════════════
   OPPORTUNITIES
   ═══════════════════════════════════════ */


/* ═══════════════════════════════════════
   PUBLICATIONS
   ═══════════════════════════════════════ */
async function publishItem() {
  const id = document.getElementById('pub-id')?.value; // On ajoute un champ caché pour l'ID si besoin
  const t = document.getElementById('pub-titre').value.trim();
  const ty = document.getElementById('pub-type').value;
  const d = document.getElementById('pub-desc').value.trim();
  const dt = document.getElementById('pub-date').value;
  
  if (!t || !d) { showToast('⚠️ Remplissez le titre et la description.', 'warning'); return; }
  
  try {
    const data = {
      titre: t, type: ty, desc: d, date: dt || new Date().toISOString().split('T')[0],
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    if (id) {
      await db.collection('publications').doc(id).update(data);
      showToast('✅ Publication mise à jour !', 'success');
      document.getElementById('pub-id').value = '';
    } else {
      data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      await db.collection('publications').add(data);
      showToast('📢 Publication réussie !', 'success');
    }

    document.getElementById('pub-titre').value = '';
    document.getElementById('pub-desc').value = '';
    await loadAllPublications();
  } catch (e) { showToast('❌ Erreur : ' + e.message, 'error'); }
}

async function loadAllPublications() {
  try {
    const snap = await db.collection('publications').orderBy('createdAt', 'desc').get();
    const l_admin = document.getElementById('pub-list');
    const l_etud = document.getElementById('etud-pub-list');
    const labels = { new: 'Nouveauté', comp: 'Compétition', form: 'Formation' };
    
    const html = snap.docs.map(doc => {
      const p = doc.data();
      const isAdmin = currentUserData?.role === 'admin';
      return `<div class="pub-item">
        <span class="pub-type-badge ${p.type}">${labels[p.type] || p.type}</span>
        <div class="pub-info">
          <div class="pub-title">${p.titre}</div>
          <div class="pub-desc">${p.desc}</div>
        </div>
        <div class="pub-date">${p.date || ''}</div>
        ${isAdmin ? `
          <div class="td-actions" style="margin-left:12px">
            <button class="btn btn-sm btn-outline-blue" onclick="editPublication('${doc.id}')" title="Modifier">✏️</button>
            <button class="btn btn-sm btn-red" onclick="deletePublication('${doc.id}')" title="Supprimer">🗑️</button>
          </div>
        ` : ''}
      </div>`;
    }).join('');

    if (l_admin) l_admin.innerHTML = html || '<div class="empty-state">Aucune publication.</div>';
    if (l_etud) l_etud.innerHTML = html || '<div class="empty-state">Aucune actualité.</div>';
  } catch (e) { console.error(e); }
}

async function deletePublication(id) {
  if (!confirm('Supprimer cette publication ?')) return;
  try {
    await db.collection('publications').doc(id).delete();
    showToast('🗑️ Publication supprimée.');
    await loadAllPublications();
  } catch (e) { showToast('❌ ' + e.message, 'error'); }
}

async function editPublication(id) {
  try {
    const doc = await db.collection('publications').doc(id).get();
    if (!doc.exists) return;
    const p = doc.data();
    
    if (!document.getElementById('pub-id')) {
      const hidden = document.createElement('input');
      hidden.type = 'hidden';
      hidden.id = 'pub-id';
      document.getElementById('admin-publications').appendChild(hidden);
    }
    
    document.getElementById('pub-id').value = id;
    document.getElementById('pub-titre').value = p.titre;
    document.getElementById('pub-type').value = p.type;
    document.getElementById('pub-desc').value = p.desc;
    document.getElementById('pub-date').value = p.date || '';
    
    document.getElementById('admin-publications').scrollIntoView({ behavior: 'smooth' });
    showToast('📝 Édition en cours...');
  } catch (e) { console.error(e); }
}

/* ═══════════════════════════════════════
   CALENDAR & SOUTENANCES
   ═══════════════════════════════════════ */
/* ═══════════════════════════════════════
   ADMIN: SOUTENANCES (CALENDRIER & PLANIFICATION)
   ═══════════════════════════════════════ */

async function loadAvailableStudentsForSoutenance() {
  const select = document.getElementById('sout-etudiant');
  if (!select) return;
  select.innerHTML = '<option value="">Chargement...</option>';
  try {
    // 1. Récupérer tous les étudiants
    const studentsSnap = await db.collection('users').where('role', '==', 'etudiant').get();
    // 2. Récupérer les ID de ceux qui ont déjà une soutenance planifiée
    const plannedSnap = await db.collection('soutenances').get();
    const plannedIds = plannedSnap.docs.map(doc => doc.data().etudiantId);

    let html = '<option value="">-- Sélectionner l\'étudiant --</option>';
    let count = 0;
    studentsSnap.forEach(doc => {
      if (!plannedIds.includes(doc.id)) {
        html += `<option value="${doc.id}">${doc.data().name}</option>`;
        count++;
      }
    });
    select.innerHTML = count > 0 ? html : '<option value="">Aucun étudiant disponible</option>';
  } catch (e) { select.innerHTML = '<option value="">Erreur de chargement</option>'; }
}

async function saveSoutenance() {
  const id = document.getElementById('sout-id').value;
  const select = document.getElementById('sout-etudiant');
  const etudiantId = select.value;
  const etudiantName = select.options[select.selectedIndex]?.text;
  const dateValue = document.getElementById('sout-date').value;
  const timeValue = document.getElementById('sout-time').value;
  const salle = document.getElementById('sout-salle').value;
  const jury = document.getElementById('sout-jury').value;

  if (!etudiantId || !dateValue || !salle) { showToast('⚠️ Remplissez les champs obligatoires.', 'warning'); return; }

  try {
    const data = {
      etudiantId, etudiantName, date: dateValue, time: timeValue, salle, jury,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    if (id) {
      await db.collection('soutenances').doc(id).update(data);
      showToast('✅ Soutenance mise à jour !', 'success');
    } else {
      data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      await db.collection('soutenances').add(data);
      showToast('✅ Soutenance planifiée !', 'success');
    }
    
    closeModal('modal-soutenance');
    document.getElementById('sout-id').value = ''; 
    await loadAdminSoutenances();
  } catch (e) { showToast('❌ Erreur : ' + e.message, 'error'); }
}

async function openEditSoutenanceModal(id) {
  try {
    const doc = await db.collection('soutenances').doc(id).get();
    if (!doc.exists) return;
    const s = doc.data();
    
    // On remplit le select avec l'étudiant actuel même s'il ne devrait plus être dans la liste des "disponibles"
    const select = document.getElementById('sout-etudiant');
    select.innerHTML = `<option value="${s.etudiantId}" selected>${s.etudiantName}</option>`;
    
    document.getElementById('sout-id').value = id;
    document.getElementById('sout-date').value = s.date;
    document.getElementById('sout-time').value = s.time;
    document.getElementById('sout-salle').value = s.salle;
    document.getElementById('sout-jury').value = s.jury;
    
    openModal('modal-soutenance');
  } catch (e) { console.error(e); }
}

async function loadAdminSoutenances() {
  const tbody = document.getElementById('soutenances-tbody');
  if (!tbody) return;
  try {
    const snap = await db.collection('soutenances').orderBy('date', 'asc').get();
    const events = {};
    
    if (snap.empty) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--text-muted)">Aucune planification.</td></tr>';
      renderCalendar({});
      return;
    }

    tbody.innerHTML = snap.docs.map(doc => {
      const s = doc.data();
      const day = parseInt(s.date.split('-')[2]);
      events[day] = 'Soutenance';
      
      return `<tr>
        <td><strong>${s.etudiantName}</strong></td>
        <td>${new Date(s.date).toLocaleDateString('fr-FR')}</td>
        <td>${s.time || '—'}</td>
        <td>${s.salle}</td>
        <td>${s.jury || '—'}</td>
        <td class="td-actions">
          <button class="btn btn-sm btn-outline-blue" onclick="openEditSoutenanceModal('${doc.id}')">✏️</button>
          <button class="btn btn-sm btn-outline-red" onclick="deleteSoutenance('${doc.id}')">🗑️</button>
        </td>
      </tr>`;
    }).join('');
    
    renderCalendar(events);
  } catch (e) { console.error(e); }
}

async function deleteSoutenance(id) {
  if (!confirm('Supprimer cette planification ?')) return;
  await db.collection('soutenances').doc(id).delete();
  showToast('🗑️ Planification supprimée.');
  await loadAdminSoutenances();
}

function renderCalendar(events = {}) {
  const cells = document.getElementById('cal-cells');
  if (!cells) return;
  const today = new Date().getDate();
  let html = '';
  // On remplit 30 jours pour l'exemple
  for (let d = 1; d <= 30; d++) {
    const ev = events[d];
    html += `<div class="cal-cell${d===today?' today':''}${ev?' has-event':''}">
      <div style="font-weight:${d===today?'700':'400'};color:${d===today?'var(--blue)':'inherit'}">${d}</div>
      ${ev?`<div class="cal-event">${ev}</div>`:''}</div>`;
  }
  cells.innerHTML = html;
}


/* ═══════════════════════════════════════
   ADMIN: USER MODIFICATION
   ═══════════════════════════════════════ */
function openModifyUserModal(uid, role, email) {
  document.getElementById('modify-user-uid').value = uid;
  document.getElementById('modify-user-role').value = role;
  document.getElementById('modify-user-email').value = email;
  document.getElementById('admin-confirm-password').value = '';
  document.getElementById('modify-user-note').textContent = "Modification du compte " + (role === 'encadrant' ? 'Encadrant' : 'Étudiant');
  openModal('modal-modify-user');
}

async function sendResetEmail() {
  const email = document.getElementById('modify-user-email').value.trim();
  if (!email) { showToast('⚠️ Aucun email spécifié.', 'warning'); return; }
  try {
    await auth.sendPasswordResetEmail(email);
    showToast('📧 Email de réinitialisation envoyé à ' + email, 'success');
  } catch (e) {
    showToast('❌ Erreur : ' + e.message, 'error');
  }
}

async function handleModifyUser() {
  const uid = document.getElementById('modify-user-uid').value;
  const role = document.getElementById('modify-user-role').value;
  const newEmail = document.getElementById('modify-user-email').value.trim();
  const newPassword = document.getElementById('modify-user-password').value.trim();
  const adminPassword = document.getElementById('admin-confirm-password').value;
  const btn = document.getElementById('modify-user-btn');

  if (!newEmail) { showToast('⚠️ Email requis.', 'warning'); return; }
  if (!adminPassword) { showToast('⚠️ Confirmation : Mot de passe admin requis.', 'warning'); return; }

  btn.classList.add('btn-loading');
  btn.disabled = true;

  try {
    // 1. Confirmation de l'identité Admin
    const credential = firebase.auth.EmailAuthProvider.credential(currentUser.email, adminPassword);
    await currentUser.reauthenticateWithCredential(credential);

    // 2. Mise à jour Firestore
    const updates = { email: newEmail };
    if (newPassword) {
      updates.tempPassword = newPassword; // Stockage pour le fallback au login
    }
    
    await db.collection('users').doc(uid).update(updates);

    showToast('✅ Modifications enregistrées. L\'utilisateur pourra se connecter avec son nouveau mot de passe.', 'success');
    closeModal('modal-modify-user');
    
    if (role === 'encadrant') await loadEncadrantsTable();
    else await loadAdminEtudiants();
    
    await loadAdminStats();
  } catch (e) {
    if (e.code === 'auth/wrong-password') showToast('❌ Mot de passe admin incorrect.', 'error');
    else showToast('❌ ' + e.message, 'error');
  } finally {
    btn.classList.remove('btn-loading');
    btn.disabled = false;
  }
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
