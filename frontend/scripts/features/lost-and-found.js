/* ══════════════════════════════════════
   Campus Compass — app.js
   ══════════════════════════════════════ */

/* ── Stars canvas ── */
(function () {
  const c   = document.getElementById('stars-canvas');
  const ctx = c.getContext('2d');
  let stars = [];

  function resize() {
    c.width  = window.innerWidth;
    c.height = window.innerHeight;
  }

  function init() {
    stars = [];
    for (let i = 0; i < 200; i++) {
      stars.push({
        x: Math.random() * c.width,
        y: Math.random() * c.height * 0.7,
        r: Math.random() * 1.5 + 0.3,
        a: Math.random(),
        da: (Math.random() - 0.5) * 0.008,
      });
    }
  }

  function draw() {
    ctx.clearRect(0, 0, c.width, c.height);
    stars.forEach(s => {
      s.a += s.da;
      if (s.a <= 0 || s.a >= 1) s.da *= -1;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${s.a * 0.8})`;
      ctx.fill();
    });
    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', () => { resize(); init(); });
  resize(); init(); draw();
})();

/* ══ NAVIGATION ══ */
function goToLogin() {
  const lw = document.getElementById('landing-wrapper');
  lw.classList.add('hide');
  setTimeout(() => {
    lw.style.display = 'none';
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-login').classList.add('active');
  }, 500);
}

function backToLanding() {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const lw = document.getElementById('landing-wrapper');
  lw.style.display = 'block';
  setTimeout(() => lw.classList.remove('hide'), 10);
}

/* ══ STATE ══ */
const API_BASE = 'http://localhost:3000/api';
let currentUser     = null;
let authToken       = localStorage.getItem('cc_token') || null;
let authMode        = 'login';
let foundCatFilter  = '';
let allFoundItems   = [];
let allLostItems    = [];

/* ══ API HELPER ══ */
async function api(endpoint, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (!(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

  const res  = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}

/* ══ AUTH ══ */
function switchAuthMode(mode, btn) {
  authMode = mode;
  document.querySelectorAll('.login-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  const rf = document.getElementById('register-fields');
  const ab = document.getElementById('auth-btn');
  const as = document.getElementById('auth-switch');

  if (mode === 'register') {
    rf.classList.add('show');
    ab.textContent = 'Create Account →';
    as.innerHTML = 'Already have an account? <span onclick="switchAuthMode(\'login\',document.querySelectorAll(\'.login-tab\')[0])">Login here</span>';
  } else {
    rf.classList.remove('show');
    ab.textContent = 'Sign In →';
    as.innerHTML = 'Don\'t have an account? <span onclick="switchAuthMode(\'register\',document.querySelectorAll(\'.login-tab\')[1])">Register here</span>';
  }
}

async function handleAuth() {
  const isReg    = document.getElementById('register-fields').classList.contains('show');
  const email    = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  const regno    = document.getElementById('auth-regno').value.trim();
  const btn      = document.getElementById('auth-btn');

  btn.disabled    = true;
  btn.textContent = isReg ? 'Creating account...' : 'Signing in...';

  try {
    let data;
    if (isReg) {
      data = await api('/register', {
        method: 'POST',
        body: JSON.stringify({
          full_name:   document.getElementById('reg-name').value.trim(),
          register_no: regno,
          email,
          phone:       document.getElementById('reg-phone').value.trim(),
          password,
          role:        document.getElementById('reg-role').value,
        }),
      });
    } else {
      data = await api('/login', {
        method: 'POST',
        body: JSON.stringify({ register_no: regno, password }),
      });
    }

    authToken   = data.token;
    currentUser = data.user;
    localStorage.setItem('cc_token', data.token);
    localStorage.setItem('cc_user', JSON.stringify(data.user));
    showToast(isReg ? 'Account created successfully!' : 'Welcome back!');
    onLoginSuccess();
  } catch (err) {
    showToast(err.message || 'Server connection failed', 'warn');
  }

  btn.disabled    = false;
  btn.textContent = isReg ? 'Create Account →' : 'Sign In →';
}

function onLoginSuccess() {
  document.getElementById('nav-username').textContent =
    `${currentUser.full_name} (${currentUser.register_no})`;
  document.getElementById('main-nav').classList.add('visible');
  document.getElementById('landing-wrapper').style.display = 'none';
  document.getElementById('page-login').classList.remove('active');
  showPage('report-lost');
}

function logout() {
  authToken   = null;
  currentUser = null;
  localStorage.removeItem('cc_token');
  localStorage.removeItem('cc_user');
  document.getElementById('main-nav').classList.remove('visible');
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const lw = document.getElementById('landing-wrapper');
  lw.style.display = 'block';
  lw.classList.remove('hide');
  lw.scrollTop = 0;
}

window.addEventListener('load', () => {
  const saved = localStorage.getItem('cc_user');
  if (authToken && saved) {
    try { currentUser = JSON.parse(saved); onLoginSuccess(); }
    catch (e) { logout(); }
  }
});

/* ══ PAGE ROUTING ══ */
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-links button').forEach(b => b.classList.remove('active'));

  const page = document.getElementById(`page-${name}`);
  if (page) { page.classList.add('active'); page.scrollTop = 0; }

  const btn = document.getElementById(`nav-${name}`);
  if (btn) btn.classList.add('active');

  if (name === 'found-items') loadFoundItems();
  if (name === 'status')      loadStatusBoard();
}

/* ══ IMAGE PREVIEW ══ */
function previewImage(inputId, previewId) {
  const file = document.getElementById(inputId).files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    document.getElementById(previewId).innerHTML = `<img src="${e.target.result}">`;
  };
  reader.readAsDataURL(file);
}

/* ══ REPORT LOST ITEM ══ */
async function submitLostItem() {
  const item_name   = document.getElementById('lost-item-name').value.trim();
  const category_id = document.getElementById('lost-category').value;
  const date_lost   = document.getElementById('lost-date').value;
  const location    = document.getElementById('lost-location').value.trim();
  const description = document.getElementById('lost-description').value.trim();

  if (!item_name || !date_lost || !location) {
    showToast('Please fill item name, date, and location.', 'warn');
    return;
  }

  const btn       = document.getElementById('lost-submit-btn');
  btn.disabled    = true;
  btn.textContent = 'Submitting...';

  try {
    const fd = new FormData();
    fd.append('item_name',   item_name);
    fd.append('category_id', category_id);
    fd.append('date_lost',   date_lost);
    fd.append('location',    location);
    fd.append('description', description);

    const photo = document.getElementById('lost-photo').files[0];
    if (photo) fd.append('photo', photo);

    const res  = await fetch(`${API_BASE}/lost-items`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
      body: fd,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Submission failed');

    showToast('Lost item reported successfully!');
    ['lost-item-name', 'lost-location', 'lost-description'].forEach(id =>
      (document.getElementById(id).value = ''));
    document.getElementById('lost-category').value  = '';
    document.getElementById('lost-date').value      = '';
    document.getElementById('lost-preview').innerHTML = '';
    document.getElementById('lost-photo').value     = '';
  } catch (err) {
    showToast(err.message, 'warn');
  }

  btn.disabled    = false;
  btn.textContent = 'Submit Report →';
}

/* ══ REPORT FOUND ITEM ══ */
async function submitFoundItem() {
  const item_name   = document.getElementById('found-item-name').value.trim();
  const category_id = document.getElementById('found-category').value;
  const date_found  = document.getElementById('found-date').value;
  const location    = document.getElementById('found-location').value.trim();
  const kept_at     = document.getElementById('found-kept-at').value.trim();
  const description = document.getElementById('found-description').value.trim();

  if (!item_name || !date_found || !location) {
    showToast('Please fill item name, date, and location.', 'warn');
    return;
  }

  const btn       = document.getElementById('found-submit-btn');
  btn.disabled    = true;
  btn.textContent = 'Submitting...';

  try {
    const fd = new FormData();
    fd.append('item_name',   item_name);
    fd.append('category_id', category_id);
    fd.append('date_found',  date_found);
    fd.append('location',    location);
    fd.append('kept_at',     kept_at);
    fd.append('description', description);

    const photo = document.getElementById('found-photo').files[0];
    if (photo) fd.append('photo', photo);

    const res  = await fetch(`${API_BASE}/found-items`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
      body: fd,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Submission failed');

    showToast('Found item submitted!');
    ['found-item-name', 'found-location', 'found-kept-at', 'found-description'].forEach(id =>
      (document.getElementById(id).value = ''));
    document.getElementById('found-category').value    = '';
    document.getElementById('found-date').value        = '';
    document.getElementById('found-preview').innerHTML = '';
    document.getElementById('found-photo').value       = '';
    loadFoundItems();
  } catch (err) {
    showToast(err.message, 'warn');
  }

  btn.disabled    = false;
  btn.textContent = 'Submit Found Item →';
}

/* ══ FOUND ITEMS BROWSER ══ */
async function loadFoundItems() {
  document.getElementById('found-items-list').innerHTML =
    '<div class="loading">⏳ Loading found items...</div>';
  try {
    allFoundItems = await api('/found-items');
    renderFoundList('');
  } catch (err) {
    document.getElementById('found-items-list').innerHTML =
      `<div class="empty-state"><div class="empty-icon">⚠️</div><p>${err.message}</p></div>`;
  }
}

function filterFoundCat(cat, btn) {
  foundCatFilter = cat;
  document.querySelectorAll('#page-found-items .filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderFoundList(document.querySelector('#page-found-items .search-bar')?.value || '');
}

function renderFoundList(search = '') {
  const container = document.getElementById('found-items-list');
  let items = allFoundItems.filter(i => i.status !== 'Collected');
  if (foundCatFilter) items = items.filter(i => i.category_name === foundCatFilter);
  if (search) items = items.filter(i =>
    i.item_name.toLowerCase().includes(search.toLowerCase()) ||
    (i.description || '').toLowerCase().includes(search.toLowerCase()) ||
    i.location.toLowerCase().includes(search.toLowerCase()));

  if (!items.length) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">🔍</div><p>No found items match your search.</p></div>`;
    return;
  }

  container.innerHTML = items.map(item => `
    <div class="item-card">
      <div class="item-thumb">
        ${item.photo_path
          ? `<img src="http://localhost:3000${item.photo_path}" alt="${item.item_name}">`
          : getCategoryEmoji(item.category_name)}
      </div>
      <div class="item-info">
        <h3>${item.item_name}</h3>
        <p>${item.description || 'No description provided'}</p>
        <div class="item-meta">
          <span class="tag location">📍 ${item.location}</span>
          <span class="tag">📅 ${formatDate(item.date_found)}</span>
          ${item.kept_at ? `<span class="tag">🏠 ${item.kept_at}</span>` : ''}
          ${item.category_name ? `<span class="tag">${item.category_name}</span>` : ''}
        </div>
      </div>
      <div class="item-contact">
        <strong>${item.full_name}</strong>
        <div>${item.register_no}</div>
        ${item.phone ? `<a class="contact-link" href="tel:${item.phone}">📞 ${item.phone}</a><br>` : ''}
        <a class="contact-link" href="mailto:${item.email}">✉ ${item.email}</a>
      </div>
    </div>`).join('');
}

/* ══ STATUS BOARD ══ */
async function loadStatusBoard() {
  try {
    const [stats, lostItems, foundItems] = await Promise.all([
      api('/stats'), api('/lost-items'), api('/found-items'),
    ]);
    allLostItems  = lostItems;
    allFoundItems = foundItems;

    document.getElementById('stat-lost').textContent      = stats.total_lost;
    document.getElementById('stat-found').textContent     = stats.total_found;
    document.getElementById('stat-unclaimed').textContent = stats.unclaimed;
    document.getElementById('stat-collected').textContent = stats.collected;

    renderLostTable('');
    renderFoundTable();
  } catch (err) {
    showToast('Error loading status board: ' + err.message, 'warn');
  }
}

function renderLostTable(search = '') {
  let items = allLostItems;
  if (search) items = items.filter(i =>
    i.item_name.toLowerCase().includes(search.toLowerCase()) ||
    i.full_name.toLowerCase().includes(search.toLowerCase()));

  const tbody = document.getElementById('lost-status-body');
  if (!items.length) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:var(--muted);padding:2rem">No lost item reports</td></tr>`;
    return;
  }

  tbody.innerHTML = items.map(item => `
    <tr>
      <td>
        <strong>${item.item_name}</strong>
        ${item.photo_path ? `<br><img src="http://localhost:3000${item.photo_path}" style="width:36px;height:36px;object-fit:cover;border-radius:6px;margin-top:4px">` : ''}
      </td>
      <td>${item.category_name || '—'}</td>
      <td>${formatDate(item.date_lost)}</td>
      <td>${item.location}</td>
      <td>${item.full_name}</td>
      <td><code style="background:var(--surface2);padding:2px 6px;border-radius:4px;font-size:0.8rem">${item.register_no}</code></td>
      <td>
        ${item.phone ? `<a href="tel:${item.phone}" style="color:var(--accent);text-decoration:none">📞 ${item.phone}</a><br>` : ''}
        <a href="mailto:${item.email}" style="color:var(--muted);text-decoration:none;font-size:0.8rem">${item.email}</a>
      </td>
      <td><span class="badge ${item.status === 'Found' ? 'badge-found' : 'badge-pending'}">${item.status}</span></td>
    </tr>`).join('');
}

function canActOnFoundItem(item) {
  if (!currentUser) return false;
  return currentUser.role === 'admin' || currentUser.user_id === item.user_id;
}

function renderFoundTable() {
  const tbody = document.getElementById('found-status-body');
  if (!allFoundItems.length) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;color:var(--muted);padding:2rem">No found item reports</td></tr>`;
    return;
  }

  tbody.innerHTML = allFoundItems.map(item => {
    const canAct = canActOnFoundItem(item);
    let ac = '';
    if      (item.status === 'Collected') ac = `<span style="color:var(--muted);font-size:0.8rem">✓ Done</span>`;
    else if (canAct)                      ac = `<button class="claim-btn" onclick="markCollected(${item.found_id})">Mark Collected</button>`;
    else                                  ac = `<span class="action-locked" title="Only the reporter or admin can update this">🔒 Restricted</span>`;

    return `
      <tr>
        <td>
          <strong>${item.item_name}</strong>
          ${item.photo_path ? `<br><img src="http://localhost:3000${item.photo_path}" style="width:36px;height:36px;object-fit:cover;border-radius:6px;margin-top:4px">` : ''}
        </td>
        <td>${item.category_name || '—'}</td>
        <td>${formatDate(item.date_found)}</td>
        <td>${item.location}</td>
        <td>${item.kept_at || '—'}</td>
        <td>
          ${item.full_name}
          ${item.user_id === currentUser?.user_id ? `<span style="font-size:0.7rem;color:var(--accent);margin-left:4px">(you)</span>` : ''}
        </td>
        <td><code style="background:var(--surface2);padding:2px 6px;border-radius:4px;font-size:0.8rem">${item.register_no}</code></td>
        <td>
          ${item.phone ? `<a href="tel:${item.phone}" style="color:var(--accent);text-decoration:none">📞 ${item.phone}</a><br>` : ''}
          <a href="mailto:${item.email}" style="color:var(--muted);text-decoration:none;font-size:0.8rem">${item.email}</a>
        </td>
        <td><span class="badge ${item.status === 'Collected' ? 'badge-collected' : item.status === 'Claimed' ? 'badge-found' : 'badge-new'}">${item.status}</span></td>
        <td>${ac}</td>
      </tr>`;
  }).join('');
}

async function markCollected(found_id) {
  try {
    const res  = await fetch(`${API_BASE}/found-items/${found_id}/collect`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(
        res.status === 403
          ? 'Only the reporter or an admin can mark this as collected.'
          : (data.error || 'Failed to update'),
        'warn'
      );
      return;
    }
    showToast('Item marked as collected!');
    loadStatusBoard();
  } catch (err) {
    showToast('Error: ' + err.message, 'warn');
  }
}

/* ══ UTILITIES ══ */
function getCategoryEmoji(cat) {
  return ({
    Electronics:    '📱',
    Stationery:     '✏️',
    Clothing:       '👕',
    Accessories:    '⌚',
    'Documents / ID':'🪪',
    Keys:           '🔑',
    Bags:           '🎒',
    'Water Bottle': '🍶',
    Other:          '📦',
  })[cat] || '📦';
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = (type === 'warn' ? '⚠️ ' : '✅ ') + msg;
  t.style.borderLeftColor = type === 'warn' ? 'var(--warning)' : 'var(--success)';
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3500);
}