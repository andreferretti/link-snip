/* ============================================================
   LinkSnip — app.js
   ============================================================ */

const API = window.location.origin;

// ── State ──
let token    = localStorage.getItem('token');
let userMail = localStorage.getItem('email');

// ── DOM refs ──
const headerAuth      = document.getElementById('headerAuth');
const headerUser      = document.getElementById('headerUser');
const userEmailDisplay = document.getElementById('userEmailDisplay');
const btnLogin        = document.getElementById('btnLogin');
const btnRegister     = document.getElementById('btnRegister');
const btnLogout       = document.getElementById('btnLogout');

const shortenForm     = document.getElementById('shortenForm');
const urlInput        = document.getElementById('urlInput');
const shortenBtn      = document.getElementById('shortenBtn');
const shortenError    = document.getElementById('shortenError');
const result          = document.getElementById('result');
const resultUrl       = document.getElementById('resultUrl');
const resultLink      = document.getElementById('resultLink');
const existingBadge   = document.getElementById('existingBadge');
const copyBtn         = document.getElementById('copyBtn');

const linksSection    = document.getElementById('linksSection');
const linksGrid       = document.getElementById('linksGrid');
const linksEmpty      = document.getElementById('linksEmpty');
const linksCount      = document.getElementById('linksCount');

const modalOverlay    = document.getElementById('modalOverlay');
const modalClose      = document.getElementById('modalClose');
const loginForm       = document.getElementById('loginForm');
const registerForm    = document.getElementById('registerForm');
const loginBtn        = document.getElementById('loginBtn');
const registerBtn     = document.getElementById('registerBtn');
const loginError      = document.getElementById('loginError');
const registerError   = document.getElementById('registerError');
const modalTabs       = document.querySelectorAll('.modal-tab');
const toastEl         = document.getElementById('toast');

// ── Helpers ──

function relativeTime(dateStr) {
  const diff  = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)  return 'just now';
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days  < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function truncate(str, max) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max) + '…' : str;
}

function escHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

let toastTimer;
function showToast(msg, duration = 2600) {
  clearTimeout(toastTimer);
  toastEl.textContent = msg;
  toastEl.classList.remove('hidden');
  toastTimer = setTimeout(() => toastEl.classList.add('hidden'), duration);
}

function setLoading(btn, loading) {
  btn.disabled = loading;
  btn.querySelector('.btn-label').classList.toggle('hidden', loading);
  btn.querySelector('.btn-spinner').classList.toggle('hidden', !loading);
}

function showError(el, msg) {
  el.textContent = msg;
  el.classList.remove('hidden');
}

function clearError(el) {
  el.textContent = '';
  el.classList.add('hidden');
}

// ── UI State ──

function updateUI() {
  if (token) {
    headerAuth.classList.add('hidden');
    headerUser.classList.remove('hidden');
    userEmailDisplay.textContent = userMail || '';
    linksSection.classList.remove('hidden');
    loadMyLinks();
  } else {
    headerAuth.classList.remove('hidden');
    headerUser.classList.add('hidden');
    linksSection.classList.add('hidden');
  }
}

// ── Modal ──

function openModal(tab = 'login') {
  modalOverlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  switchTab(tab);
  setTimeout(() => {
    const id = tab === 'login' ? 'loginEmail' : 'registerEmail';
    document.getElementById(id).focus();
  }, 80);
}

function closeModal() {
  modalOverlay.classList.add('hidden');
  document.body.style.overflow = '';
  clearError(loginError);
  clearError(registerError);
  loginForm.reset();
  registerForm.reset();
}

function switchTab(tab) {
  modalTabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  loginForm.classList.toggle('hidden', tab !== 'login');
  registerForm.classList.toggle('hidden', tab !== 'register');
}

btnLogin.addEventListener('click',    () => openModal('login'));
btnRegister.addEventListener('click', () => openModal('register'));
modalClose.addEventListener('click',  closeModal);
modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeModal(); });
document.addEventListener('keydown',  e => { if (e.key === 'Escape') closeModal(); });
modalTabs.forEach(t => t.addEventListener('click', () => switchTab(t.dataset.tab)));

// ── Auth: Login ──

loginForm.addEventListener('submit', async e => {
  e.preventDefault();
  clearError(loginError);
  setLoading(loginBtn, true);

  const emailVal = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  try {
    const res  = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailVal, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');

    token    = data.token;
    userMail = data.user.email;
    localStorage.setItem('token', token);
    localStorage.setItem('email', userMail);
    closeModal();
    updateUI();
    showToast('Welcome back! 👋');
  } catch (err) {
    showError(loginError, err.message);
  } finally {
    setLoading(loginBtn, false);
  }
});

// ── Auth: Register ──

registerForm.addEventListener('submit', async e => {
  e.preventDefault();
  clearError(registerError);
  setLoading(registerBtn, true);

  const emailVal = document.getElementById('registerEmail').value.trim();
  const password = document.getElementById('registerPassword').value;

  try {
    const res  = await fetch(`${API}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailVal, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');

    token    = data.token;
    userMail = data.user.email;
    localStorage.setItem('token', token);
    localStorage.setItem('email', userMail);
    closeModal();
    updateUI();
    showToast('Account created! ✅');
  } catch (err) {
    showError(registerError, err.message);
  } finally {
    setLoading(registerBtn, false);
  }
});

// ── Auth: Logout ──

btnLogout.addEventListener('click', () => {
  token    = null;
  userMail = null;
  localStorage.removeItem('token');
  localStorage.removeItem('email');
  updateUI();
  showToast('Logged out');
});

// ── Shorten ──

shortenForm.addEventListener('submit', async e => {
  e.preventDefault();
  clearError(shortenError);
  result.classList.add('hidden');
  setLoading(shortenBtn, true);

  const url = urlInput.value.trim();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const res  = await fetch(`${API}/links`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ url }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to shorten URL');

    const shortUrl = `${API}/${data.link.short_code}`;
    resultUrl.value = shortUrl;
    resultLink.href = shortUrl;
    existingBadge.classList.toggle('hidden', !data.existing);
    copyBtn.querySelector('.copy-label').textContent = 'Copy';
    copyBtn.classList.remove('copied');
    result.classList.remove('hidden');
    resultUrl.select();

    if (token) loadMyLinks();
  } catch (err) {
    showError(shortenError, err.message);
  } finally {
    setLoading(shortenBtn, false);
  }
});

// ── Copy (result) ──

copyBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(resultUrl.value);
    copyBtn.querySelector('.copy-label').textContent = '✓ Copied';
    copyBtn.classList.add('copied');
    setTimeout(() => {
      copyBtn.querySelector('.copy-label').textContent = 'Copy';
      copyBtn.classList.remove('copied');
    }, 2000);
  } catch {
    resultUrl.select();
  }
});

resultUrl.addEventListener('click', () => resultUrl.select());

// ── My Links ──

async function loadMyLinks() {
  try {
    const res  = await fetch(`${API}/links`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error('Failed to load links');
    renderLinks(data.links);
  } catch (err) {
    console.error(err);
  }
}

function renderLinks(links) {
  linksGrid.innerHTML = '';
  const count = links.length;

  linksCount.textContent = count;
  linksCount.classList.toggle('hidden', count === 0);

  if (count === 0) {
    linksEmpty.classList.remove('hidden');
    linksGrid.classList.add('hidden');
    return;
  }

  linksEmpty.classList.add('hidden');
  linksGrid.classList.remove('hidden');

  links.forEach(link => {
    const shortUrl  = `${API}/${link.short_code}`;
    const shortDisp = shortUrl.replace(/^https?:\/\//, '');
    const clicks    = link.click_count ?? 0;

    const card = document.createElement('div');
    card.className = 'link-card';
    card.innerHTML = `
      <div class="link-card-body">
        <div class="link-short-row">
          <a class="link-short-url" href="${escHtml(shortUrl)}" target="_blank" rel="noopener">${escHtml(shortDisp)}</a>
          <button class="link-copy-icon" title="Copy short link" data-url="${escHtml(shortUrl)}">⎘</button>
        </div>
        <div class="link-original" title="${escHtml(link.original_url)}">${escHtml(truncate(link.original_url, 65))}</div>
        <div class="link-meta">
          <span class="link-clicks">📊 ${clicks} click${clicks === 1 ? '' : 's'}</span>
          <span class="link-date">${relativeTime(link.created_at)}</span>
        </div>
      </div>
      <button class="link-delete" title="Delete link" data-id="${link.id}">🗑</button>
    `;

    // Copy
    card.querySelector('.link-copy-icon').addEventListener('click', async function () {
      try {
        await navigator.clipboard.writeText(this.dataset.url);
        this.textContent = '✓';
        this.classList.add('copied');
        showToast('Copied to clipboard!');
        setTimeout(() => {
          this.textContent = '⎘';
          this.classList.remove('copied');
        }, 2000);
      } catch { /* silent */ }
    });

    // Delete
    card.querySelector('.link-delete').addEventListener('click', async function () {
      const id = this.dataset.id;
      try {
        const res = await fetch(`${API}/links/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!res.ok) throw new Error();
        card.style.transition = 'opacity 0.22s, transform 0.22s';
        card.style.opacity    = '0';
        card.style.transform  = 'scale(0.96)';
        setTimeout(() => { card.remove(); loadMyLinks(); }, 230);
        showToast('Link deleted');
      } catch {
        showToast('Failed to delete link');
      }
    });

    linksGrid.appendChild(card);
  });
}

// ── Init ──
updateUI();
urlInput.focus();
