const fs = require('fs');
let lines = fs.readFileSync('main.js', 'utf8').split(/\r?\n/);

let out = [];
let skip = false;
let i = 0;

while(i < lines.length) {
  const line = lines[i];

  if (line.includes('async function loadEncadrantCards() {')) {
    out.push(`async function loadEncadrantCards() {
  const grid = document.getElementById('enc-cards-grid');
  if (!grid || !currentUser) return;
  try {
    const encSnap = await db.collection('users').where('role', '==', 'encadrant').get();
    if (encSnap.empty) { grid.innerHTML = '<div class="empty-state"><div class="empty-icon">👥</div><p>Aucun encadrant disponible.</p></div>'; return; }

    const reqSnap = await db.collection('demandes').where('etudiantId', '==', currentUser.uid).get();
    const existingReqs = reqSnap.docs.map(doc => doc.data());

    grid.innerHTML = encSnap.docs.map(doc => {
      const d = doc.data();
      const initials = (d.name || 'EN').split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2);
      
      const req = existingReqs.find(r => r.encadrantId === doc.id);
      let btnHTML = \`<button class="btn btn-orange btn-full" onclick="sendDemande('\${doc.id}','\${d.name}')">📩 Envoyer une demande</button>\`;
      if (req) {
        if (req.status === 'en_attente') btnHTML = \`<button class="btn btn-full" disabled style="background:#e9ecef;color:var(--text-muted);border:1px solid var(--gray-border);cursor:not-allowed">⏳ Envoyée (En attente)</button>\`;
        else if (req.status === 'acceptee') btnHTML = \`<button class="btn btn-full" disabled style="background:#d1fae5;color:var(--green);border:1px solid #a7f3d0;cursor:not-allowed">✅ Acceptée</button>\`;
        else if (req.status === 'refusee') btnHTML = \`<button class="btn btn-full" disabled style="background:#fee2e2;color:var(--red);border:1px solid #fecaca;cursor:not-allowed">❌ Refusée</button>\`;
      }

      return \`<div class="enc-card">
        <div class="avatar-circle">\${initials}</div>
        <div class="enc-name">\${d.name}</div>
        <div class="enc-spec">\${d.specialite || '—'}</div>
        <div class="enc-badge">👩‍🎓 \${d.nbEtudiants || 0} étudiants</div>
        \${btnHTML}
      </div>\`;
    }).join('');
  } catch (e) { grid.innerHTML = '<div class="empty-state"><p>Erreur.</p></div>'; }
}`);
    while(i < lines.length && !lines[i].includes('} catch (e) { grid.innerHTML = \'<div class="empty-state"><p>Erreur de chargement.</p></div>\'; }')) {
      i++;
    }
    i++; // skip catch
    if (i < lines.length && lines[i] === '}') { i++; } // skip trailing brace
    continue;
  }

  if (line.includes('async function sendDemande(encadrantId, encadrantName) {')) {
    out.push(`window.currentDemandeTarget = null;
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

  try {
    const existing = await db.collection('demandes')
      .where('etudiantId', '==', currentUser.uid)
      .where('encadrantId', '==', encadrantId)
      .where('status', '==', 'en_attente').get();
    if (!existing.empty) { showToast('⚠️ Demande déjà envoyée', 'warning'); if (btn) { btn.disabled = false; btn.textContent = '📩 Envoyer'; } return; }

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
    await loadMesDemandes();
    await loadEncadrantCards();
  } catch (e) { showToast('❌ ' + e.message, 'error'); }
  if (btn) { btn.disabled = false; btn.textContent = '📩 Envoyer'; }
}`);
    while(i < lines.length && !lines[i].includes('} catch (e) { console.error(\'[DEBUG sendDemande] ERROR:\', e);')) {
      i++;
    }
    i++;
    if (i < lines.length && lines[i] === '}') { i++; }
    continue;
  }

  if (line.includes("setText('rapport-filename', d.fileName || 'rapport.pdf');")) {
    out.push(`      document.getElementById('rapport-filename').innerHTML = \`<a href="#" onclick="showToast('Ouverture du rapport...', 'info')" style="color:var(--navy);text-decoration:underline">\${d.fileName || 'rapport.pdf'}</a>\`;`);
    i++;
    continue;
  }

  if (line.includes("} catch (e) { if (kpi) kpi.textContent = 'Non'; }")) {
    out.push(`    const demSnap = await db.collection('demandes').where('etudiantId', '==', currentUser.uid).where('status', '==', 'acceptee').get();
    if (!demSnap.empty) {
      window.currentChatEncadrantId = demSnap.docs[0].data().encadrantId;
      document.getElementById('etud-chat-container').style.display = 'block';
      if (window.loadEtudChat) window.loadEtudChat();
    } else {
      document.getElementById('etud-chat-container').style.display = 'none';
      window.currentChatEncadrantId = null;
    }`);
    out.push(line);
    i++;
    continue;
  }

  if (line.includes("/* ═══════════════════════════════════════") && i+1 < lines.length && lines[i+1].includes("ENCADRANT: DEMANDES REÇUES (Firestore)")) {
    out.push(`let etudChatUnsubscribe = null;
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
        return \`<div style="display:flex;flex-direction:column;align-items:\${isMe?'flex-end':'flex-start'}">
          <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:4px">\${d.senderName}</div>
          <div style="background:\${isMe?'var(--blue)':'#fff'};color:\${isMe?'#fff':'var(--navy)'};padding:12px 16px;border-radius:12px;border:\${isMe?'none':'1px solid var(--gray-border)'};max-width:85%;line-height:1.4">
            \${d.text}
          </div>
        </div>\`;
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
`);
    out.push(line);
    i++;
    continue;
  }

  if (line.includes('<div class="opp-desc">${r.fileName}</div>')) {
    out.push(`            <div class="opp-desc"><a href="#" onclick="showToast('Ouverture du fichier...', 'info')" style="color:inherit;text-decoration:underline">\${r.fileName}</a></div>`);
    i++;
    continue;
  }

  if (line.includes('<button class="btn btn-green btn-sm" onclick="assignNoteFirestore(')) {
    out.push(line);
    out.push(`            <button class="btn btn-sm" style="background:#eef2ff;color:var(--blue);border:1px solid var(--blue);" onclick="window.toggleEncChat('\${sid}','\${r.etudiantName}')">💬 Remarques</button>
          </div>
        </div>
        <div id="enc-chat-wrap-\${sid}" style="display:none;background:#f8f9fa;border:1px solid var(--gray-border);border-top:none;border-radius:0 0 12px 12px;height:350px;flex-direction:column;margin-bottom:20px;margin-top:-10px;">
          <div id="enc-chat-msgs-\${sid}" style="flex:1;overflow-y:auto;padding:15px;display:flex;flex-direction:column;gap:10px;"></div>
          <div style="padding:10px;border-top:1px solid var(--gray-border);display:flex;gap:10px;background:#fff;border-radius:0 0 12px 12px;">
            <input type="text" id="enc-chat-in-\${sid}" placeholder="Votre remarque..." style="flex:1;padding:10px;border-radius:6px;border:1px solid var(--gray-border);outline:none;" onkeypress="if(event.key==='Enter') window.sendEncChat('\${sid}')"/>
            <button class="btn btn-primary btn-sm" onclick="window.sendEncChat('\${sid}')">Envoyer</button>
          </div>
        </div>\`;`);
    while (i < lines.length && !lines[i].includes('</div>`;')) {
      i++;
    }
    i++;
    continue;
  }

  if (line.includes('async function assignNoteFirestore(studentId, inputId) {')) {
    out.push(`window.encChatUnsubscribes = window.encChatUnsubscribes || {};
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
          return \`<div style="display:flex;flex-direction:column;align-items:\${isMe?'flex-end':'flex-start'}">
            <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:4px">\${d.senderName}</div>
            <div style="background:\${isMe?'var(--blue)':'#fff'};color:\${isMe?'#fff':'var(--navy)'};padding:12px 16px;border-radius:12px;border:\${isMe?'none':'1px solid var(--gray-border)'};max-width:85%;line-height:1.4">
              \${d.text}
            </div>
          </div>\`;
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
`);
    out.push(line);
    i++;
    continue;
  }

  out.push(line);
  i++;
}

fs.writeFileSync('main.js', out.join('\n'));
console.log('main.js successfully updated.');
