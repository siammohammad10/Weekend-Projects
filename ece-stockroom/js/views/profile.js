// Student profile, photo and lab safety certificate.

// Student: profile
function vProfile() {
  const t = myTeam(),
    ins = inst(t.instructor),
    c = myCert();
  const stepState = i => {
    if (c.status === 'verified') return 'done';
    if (c.status === 'pending') return i === 0 ? 'done' : i === 1 ? 'current' : '';
    if (c.status === 'rejected') return i === 0 ? 'done' : i === 1 ? 'bad' : '';
    return '';
  };
  const steps = ['Upload', 'Under review', 'Verified', 'Lab access'];
  const preview = c.kind === 'img' && c.preview ? `<img src="${c.preview}" alt="">` : I('file');
  return `
  <header class="page-head"><div class="rise"><div class="eyebrow">Profile · ${esc(S.me.u)}@ttu.edu</div><h1>${esc(S.me.name)}</h1><p>Your photo, your team, and the lab safety certificate that unlocks the Project Lab.</p></div></header>
  <div class="profile">
    <section class="panel rise" style="--i:1">
      <div class="me-card">
        <button class="avatar-big" data-act="pick-avatar" data-drop="avatar" aria-label="Change profile picture">
          ${S.me.avatar ? `<img src="${S.me.avatar}" alt="">` : initials(S.me.name)}
          <span class="cam">${S.me.avatar ? 'Change photo' : 'Add photo'}</span>
        </button>
        <div class="field"><label for="me-name">Display name</label><input id="me-name" value="${esc(S.me.name)}" maxlength="40" autocomplete="name"></div>
      </div>
      <input type="file" id="avatar-input" accept="image/*" hidden>
      <dl class="facts">
        <dt>eRaider</dt><dd>${esc(S.me.u)}</dd>
        <dt>Team</dt><dd>${t.name}</dd>
        <dt>Project</dt><dd>${esc(t.project)}</dd>
        <dt>Instructor</dt><dd>${esc(ins.name)}</dd>
        <dt>Course</dt><dd>${esc(ins.course)}, ${esc(ins.section)}</dd>
      </dl>
      <div class="mates"><div class="eyebrow">Teammates</div>
        ${t.members
          .filter(m => m !== S.me.name)
          .map(m => `<div class="mate">${avatar(m)}<span>${esc(m)}</span></div>`)
          .join('')}
      </div>
    </section>
    <section class="panel rise" style="--i:2">
      <div class="panel-head"><div><div class="eyebrow">Lab access</div><h2>Lab safety certificate</h2></div>${chip(c.status)}</div>
      <p class="muted">Upload the certificate from your lab safety training. Once the stockroom verifies it, you get access to the Project Lab.</p>
      <div class="steps">${steps.map((s, i) => `<div class="step ${stepState(i)}" style="--i:${i}"><span class="bar"></span><span>${s}</span></div>`).join('')}</div>
      <div class="lab ${c.status === 'verified' ? 'granted' : ''}">
        <span class="lockbox">${LOCK(c.status === 'verified')}</span>
        <div><b>${c.status === 'verified' ? 'Project Lab access granted' : 'Project Lab access locked'}</b>
        <span>${c.status === 'verified' ? 'Verified by the stockroom. Your card works at the lab door.' : c.status === 'pending' ? 'Waiting for the stockroom to verify your certificate.' : 'Upload your certificate to request access.'}</span></div>
      </div>
      ${
        c.file
          ? `<div class="filecard">
          <span class="ft">${preview}</span>
          <div class="fi"><b>${esc(c.file)}</b><span>Uploaded ${rel(c.at)}</span></div>
          ${c.status !== 'verified' ? `<button class="btn btn-ghost btn-sm" data-act="pick-cert">${I('upload')} Replace file</button>` : ''}
        </div>
        ${c.status === 'rejected' && c.note ? `<div class="notebox"><b>Stockroom note:</b> ${esc(c.note)}</div>` : ''}`
          : ''
      }
      ${
        c.status === 'none' || c.status === 'rejected'
          ? `<button class="drop" data-act="pick-cert" data-drop="cert" style="margin-top:${c.file ? '14px' : '0'}">
          <span class="up">${I('upload')}</span><b>${c.status === 'rejected' ? 'Upload a clearer copy' : 'Drop your certificate here'}</b><span>or click to choose a file · PDF, JPG or PNG up to 10 MB</span>
        </button>`
          : ''
      }
      <input type="file" id="cert-input" accept="image/*,application/pdf" hidden>
    </section>
  </div>`;
}
