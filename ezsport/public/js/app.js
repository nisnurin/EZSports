// =========================================================================
// API CONFIG — point this at your Render backend URL
// =========================================================================
const API_BASE = 'https://ezsportssss.onrender.com';

// Wrapper around fetch() that:
// 1. Prefixes every relative /api/... call with the Render backend URL
// 2. Sends credentials (cookies) cross-domain, required for sessions to work
function apiFetch(path, options = {}) {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  return fetch(url, { ...options, credentials: 'include' });
}

// ===== STATE =====
let currentUser = null;
let currentLoginRole = 'user';
let currentRegRole = 'user';
let allGear = [];
let currentBookingGear = null;
let selectedRating = 0;
let currentSportEdit = null;
let currentGearEdit = null;
let confirmCallback = null;

// ===== INIT =====
document.addEventListener('DOMContentLoaded', async () => {
  await checkAuth();
  await seedData();
  loadNotifications();
  setInterval(loadNotifications, 30000);
});

async function seedData() {
  try {
    await apiFetch('/api/gear/seed/default', { method: 'POST' });
    await apiFetch('/api/sports/seed/default', { method: 'POST' });
  } catch (e) {}
}

// ===== AUTH =====
async function checkAuth() {
  try {
    const res = await apiFetch('/api/auth/me');
    const data = await res.json();
    if (data.user) {
      currentUser = data.user;
      showApp();
    } else {
      navigate('splash');
    }
  } catch (e) {
    navigate('splash');
  }
}

function showApp() {
  showNavbar();
  updateNavForRole();
  navigate('home');
  loadAdminStats();
}

function showNavbar() {
  document.getElementById('navbar').classList.remove('hidden');
}

function updateNavForRole() {
  const adminLinks = document.querySelectorAll('.admin-only');
  const userLinks = document.querySelectorAll('.user-only');
  if (currentUser?.role === 'admin') {
    adminLinks.forEach(el => el.classList.remove('hidden'));
    userLinks.forEach(el => el.classList.add('hidden'));
  } else {
    adminLinks.forEach(el => el.classList.add('hidden'));
    userLinks.forEach(el => el.classList.remove('hidden'));
    const regLink = document.getElementById('nav-register-link');
    if (regLink) regLink.textContent = 'Dashboard';
  }
}

async function doLogin() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  if (!email || !password) return toast('Please fill in all fields', 'error');
  try {
    const res = await apiFetch('/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, role: currentLoginRole })
    });
    const data = await res.json();
    if (!res.ok) return toast(data.error || 'Login failed', 'error');
    currentUser = data.user;
    toast(`Welcome back, ${data.user.fullName}! 👋`, 'success');
    showApp();
  } catch (e) {
    toast('Connection error. Is the server running?', 'error');
  }
}

async function doRegister() {
  const fullName = document.getElementById('reg-fullname').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const phone = document.getElementById('reg-phone').value.trim();
  const studentId = document.getElementById('reg-studentid').value.trim();
  const staffId = document.getElementById('reg-staffid').value.trim();
  const password = document.getElementById('reg-password').value;
  if (!fullName || !email || !password) return toast('Please fill all required fields', 'error');
  try {
    const res = await apiFetch('/api/auth/register', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName, email, phoneNumber: phone, studentId, staffId, password, role: currentRegRole })
    });
    const data = await res.json();
    if (!res.ok) return toast(data.error || 'Registration failed', 'error');
    currentUser = data.user;
    toast(`Account created! Welcome, ${fullName} 🎉`, 'success');
    showApp();
  } catch (e) {
    toast('Connection error. Is the server running?', 'error');
  }
}

async function doLogout() {
  await apiFetch('/api/auth/logout', { method: 'POST' });
  currentUser = null;
  document.getElementById('navbar').classList.add('hidden');
  navigate('splash');
  toast('Logged out successfully', 'success');
}

function switchLoginRole(role) {
  currentLoginRole = role;
  document.getElementById('login-tab-user').classList.toggle('active', role === 'user');
  document.getElementById('login-tab-admin').classList.toggle('active', role === 'admin');
  document.getElementById('login-role-label').textContent = role === 'admin' ? 'Staff / Admin Login' : 'Student / Staff Login';
}

function switchRegRole(role) {
  currentRegRole = role;
  document.getElementById('reg-tab-user').classList.toggle('active', role === 'user');
  document.getElementById('reg-tab-admin').classList.toggle('active', role === 'admin');
  document.getElementById('reg-student-group').classList.toggle('hidden', role === 'admin');
  document.getElementById('reg-staff-group').classList.toggle('hidden', role === 'user');
}

// ===== NAVIGATION =====
function navigate(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  const el = document.getElementById(`page-${page}`);
  if (el) el.classList.add('active');
  const navLink = document.querySelector(`[data-page="${page}"]`);
  if (navLink) navLink.classList.add('active');
  closeMobileNav();
  window.scrollTo(0, 0);
  // Page-specific loaders
  if (page === 'gear-rental') loadGear();
  if (page === 'sport-info') loadSports();
  if (page === 'about') loadAbout();
  if (page === 'dashboard') loadUserDashboard();
  if (page === 'admin-dashboard') loadAdminDashboard();
  if (page === 'home') loadHomeStats();
}

function goHome() { navigate('home'); }

// ===== HOME STATS =====
async function loadHomeStats() {
  try {
    const stats = await apiFetch('/api/admin/stats').then(r => r.json());
    document.getElementById('stat-users').textContent = stats.totalUsers + '+';
  } catch (e) {}
}

// ===== NOTIFICATIONS =====
async function loadNotifications() {
  if (!currentUser) return;
  try {
    const notifs = await apiFetch('/api/notifications').then(r => r.json());
    const unread = notifs.filter(n => !n.read).length;
    const badge = document.getElementById('notif-badge');
    if (unread > 0) {
      badge.textContent = unread;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
    const list = document.getElementById('notif-list');
    if (!notifs.length) {
      list.innerHTML = '<div class="notif-item" style="color:var(--clr-muted);font-size:13px;">No notifications yet.</div>';
      return;
    }
    list.innerHTML = notifs.map(n => `
      <div class="notif-item ${n.read ? '' : 'unread'}">
        <div>${n.message}</div>
        <div class="notif-time">${timeAgo(n.createdAt)}</div>
      </div>
    `).join('');
  } catch (e) {}
}

function toggleNotifPanel() {
  const panel = document.getElementById('notif-panel');
  const overlay = document.getElementById('notif-overlay');
  panel.classList.toggle('hidden');
  overlay.classList.toggle('hidden');
}

async function markAllRead() {
  await apiFetch('/api/notifications/read-all', { method: 'PUT' });
  loadNotifications();
}

// ===== ABOUT =====
async function loadAbout() {
  try {
    const data = await apiFetch('/api/about').then(r => r.json());
    document.getElementById('about-phone1').textContent = data.phone1 || '—';
    document.getElementById('about-phone2').textContent = data.phone2 || '—';
    document.getElementById('about-email').textContent = data.email || '—';
    document.getElementById('about-address').textContent = data.address || '—';
    document.getElementById('about-hours').textContent = data.officeHours || '—';
    document.getElementById('about-instagram-link').title = data.instagram;
    document.getElementById('about-tiktok-link').title = data.tiktok;
    // Show edit button for admin
    const editBtn = document.getElementById('about-edit-btn');
    if (currentUser?.role === 'admin') editBtn.classList.remove('hidden');
  } catch (e) {}
}

function startAboutEdit() {
  document.getElementById('about-details-display').classList.add('hidden');
  document.getElementById('about-edit-form').classList.remove('hidden');
  document.getElementById('about-edit-btn').classList.add('hidden');
  apiFetch('/api/about').then(r => r.json()).then(data => {
    document.getElementById('edit-phone1').value = data.phone1 || '';
    document.getElementById('edit-phone2').value = data.phone2 || '';
    document.getElementById('edit-email').value = data.email || '';
    document.getElementById('edit-address').value = data.address || '';
    document.getElementById('edit-hours').value = data.officeHours || '';
  });
}

async function saveAbout() {
  const payload = {
    phone1: document.getElementById('edit-phone1').value,
    phone2: document.getElementById('edit-phone2').value,
    email: document.getElementById('edit-email').value,
    instagram: document.getElementById('edit-instagram').value,
    tiktok: document.getElementById('edit-tiktok').value,
    address: document.getElementById('edit-address').value,
    officeHours: document.getElementById('edit-hours').value
  };
  await apiFetch('/api/about', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  cancelAboutEdit();
  loadAbout();
  toast('About info updated!', 'success');
}

function cancelAboutEdit() {
  document.getElementById('about-details-display').classList.remove('hidden');
  document.getElementById('about-edit-form').classList.add('hidden');
  document.getElementById('about-edit-btn').classList.remove('hidden');
}

// ===== SPORT INFO =====
async function loadSports() {
  try {
    const sports = await apiFetch('/api/sports').then(r => r.json());
    const grid = document.getElementById('sports-grid');
    if (!sports.length) { grid.innerHTML = '<div class="empty-state"><div class="empty-icon">🏅</div><p>No sports added yet.</p></div>'; return; }
    grid.innerHTML = sports.map(s => `
      <div class="sport-card">
        <div class="sport-icon">${s.icon || '🏅'}</div>
        <div class="sport-name">${s.name}</div>
        <div class="sport-tagline">${s.tagline || ''}</div>
        <div class="sport-players">👥 ${s.players || '—'}</div>
        <div class="sport-desc">${s.description || ''}</div>
        <div class="sport-equipment">
          ${(s.equipment || []).map(e => `<span class="equip-tag">${e}</span>`).join('')}
        </div>
        ${currentUser?.role === 'admin' ? `
        <div class="sport-actions admin-only">
          <button class="btn-outline-sm btn-sm" onclick="openEditSportModal('${s._id || s.name}')">Edit</button>
          <button class="btn-danger btn-sm" onclick="confirmDelete('sport','${s._id}')">Delete</button>
        </div>` : ''}
      </div>
    `).join('');
  } catch (e) { console.error(e); }
}

function openAddSportModal() {
  currentSportEdit = null;
  document.getElementById('sport-modal-title').textContent = 'Add New Sport';
  document.getElementById('sport-edit-id').value = '';
  ['sport-name','sport-tagline','sport-description','sport-players','sport-equipment','sport-icon'].forEach(id => document.getElementById(id).value = '');
  openModal('modal-sport');
}

async function openEditSportModal(id) {
  try {
    const sports = await apiFetch('/api/sports').then(r => r.json());
    const sport = sports.find(s => s._id === id || s.name === id);
    if (!sport) return;
    currentSportEdit = sport;
    document.getElementById('sport-modal-title').textContent = 'Edit Sport';
    document.getElementById('sport-edit-id').value = sport._id || '';
    document.getElementById('sport-name').value = sport.name || '';
    document.getElementById('sport-tagline').value = sport.tagline || '';
    document.getElementById('sport-description').value = sport.description || '';
    document.getElementById('sport-players').value = sport.players || '';
    document.getElementById('sport-equipment').value = (sport.equipment || []).join(', ');
    document.getElementById('sport-icon').value = sport.icon || '';
    openModal('modal-sport');
  } catch (e) {}
}

async function saveSport() {
  const payload = {
    name: document.getElementById('sport-name').value,
    tagline: document.getElementById('sport-tagline').value,
    description: document.getElementById('sport-description').value,
    players: document.getElementById('sport-players').value,
    equipment: document.getElementById('sport-equipment').value.split(',').map(e => e.trim()).filter(Boolean),
    icon: document.getElementById('sport-icon').value
  };
  const id = document.getElementById('sport-edit-id').value;
  if (id) {
    await apiFetch(`/api/sports/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  } else {
    await apiFetch('/api/sports', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  }
  closeModal('modal-sport');
  loadSports();
  toast('Sport info saved!', 'success');
}

// ===== GEAR RENTAL =====
async function loadGear() {
  try {
    allGear = await apiFetch('/api/gear').then(r => r.json());
    renderGear(allGear);
  } catch (e) { console.error(e); }
}

function renderGear(gear) {
  const isAdmin = currentUser?.role === 'admin';
  if (isAdmin) {
    document.getElementById('gear-admin-table').classList.remove('hidden');
    document.getElementById('gear-cards').classList.add('hidden');
    const tbody = document.getElementById('gear-admin-tbody');
    tbody.innerHTML = gear.map(g => `
      <tr>
        <td>${g.gearId}</td>
        <td><strong>${g.itemName}</strong></td>
        <td>${g.category}</td>
        <td>${g.condition}</td>
        <td><span class="status-badge badge-${g.status.toLowerCase().replace(' ','-')}">${g.status}</span></td>
        <td>${g.availableQuantity}/${g.totalQuantity}</td>
        <td>${g.lastRental ? new Date(g.lastRental).toLocaleDateString() : '—'}</td>
        <td>
          <div class="action-btns">
            <button class="btn-outline-sm btn-sm" onclick="openEditGearModal('${g._id}')">Edit</button>
            <button class="btn-danger btn-sm" onclick="confirmDelete('gear','${g._id}')">Delete</button>
          </div>
        </td>
      </tr>
    `).join('');
  } else {
    document.getElementById('gear-admin-table').classList.add('hidden');
    document.getElementById('gear-cards').classList.remove('hidden');
    const categoryEmojis = { Badminton:'🏸', Basketball:'🏀', Soccer:'⚽', Volleyball:'🏐', Rugby:'🏉', Handball:'🤾', Takraw:'⚽', Pingpong:'🏓', Netball:'🏀' };
    const cards = document.getElementById('gear-cards');
    if (!gear.length) { cards.innerHTML = '<div class="empty-state"><div class="empty-icon">🏋️</div><p>No equipment found.</p></div>'; return; }
  cards.innerHTML = gear.map(g => {
      const rentedQty = g.totalQuantity - g.availableQuantity;

      let badgeText = g.status;
      let badgeStyle = ""; 

      if (g.availableQuantity === 0 && g.status === 'Rented') {
        badgeText = "Fully Rented";
        badgeStyle = "background-color: #8B4513; color: #fff; border: none;"; // Warna Koko / Coklat
      } else if (g.status === 'Available') {
        badgeText = "Available";
      }
      
      return`
      <div class="gear-card">
        <div class="gear-card-img">${g.photo ? `<img src="${g.photo}" alt="${g.itemName}" style="width:100%;height:140px;object-fit:cover;" />` : (categoryEmojis[g.category] || '🎽')}</div>
        <div class="gear-card-body">
          <div class="gear-card-name">${g.itemName}</div>
          <div class="gear-card-avail">Available: <span class="avail-count">${g.availableQuantity}</span></div>
          <div class="gear-card-rented" style="font-size: 0.85rem; color: #8a8d93; margin-bottom: 8px; margin-top: 2px;">
  Rented: ${rentedQty} 
</div>
          <span class="status-badge badge-${g.status.toLowerCase().replace(' ','-')}">${g.status}</span>
          <div style="margin-top:12px;">
            <button class="btn-primary btn-sm full-width" onclick="openBookingModal('${g._id}')" ${g.availableQuantity < 1 || g.status === 'Damaged' || g.status === 'Not Available' ? 'disabled style="opacity:0.5"' : ''}>
              ${g.availableQuantity < 1 || g.status === 'Damaged' || g.status === 'Not Available' ? 'Unavailable' : 'Book Now'}
            </button>
          </div>
        </div>
      </div>
    `} ).join('');
  }
}

function filterGear() {
  const search = document.getElementById('gear-search').value.toLowerCase();
  const checkedCats = Array.from(document.querySelectorAll('#gear-categories input:checked')).map(c => c.value);
  const avail = document.querySelector('input[name="avail"]:checked')?.value || '';
  let filtered = allGear.filter(g => {
    const matchSearch = !search || g.itemName.toLowerCase().includes(search) || g.category.toLowerCase().includes(search);
    const matchCat = !checkedCats.length || checkedCats.includes(g.category);
    const matchAvail = !avail || g.status === avail;
    return matchSearch && matchCat && matchAvail;
  });
  renderGear(filtered);
}

// ===== BOOKING =====
function openBookingModal(gearId) {
  if (!currentUser) { toast('Please log in first', 'error'); navigate('login'); return; }
  const gear = allGear.find(g => g._id === gearId);
  if (!gear) return;
  currentBookingGear = gear;
  const categoryEmojis = { Badminton:'🏸', Basketball:'🏀', Soccer:'⚽', Volleyball:'🏐', Rugby:'🏉', Handball:'🤾', Takraw:'⚽', Pingpong:'🏓', Netball:'🏀' };
  document.getElementById('booking-gear-icon').textContent = categoryEmojis[gear.category] || '🎽';
  document.getElementById('booking-gear-name').textContent = gear.itemName;
  document.getElementById('booking-gear-id').textContent = `ID: ${gear.gearId}`;
  document.getElementById('booking-renter').textContent = currentUser.fullName;
  document.getElementById('booking-renter-id').textContent = currentUser.studentId || currentUser.staffId || 'N/A';
  document.getElementById('booking-qty').max = gear.availableQuantity;
  // Set default dates
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('booking-rental-date').value = today;
  document.getElementById('booking-return-date').value = today;
  document.getElementById('booking-pickup-time').value = '10:00';
  document.getElementById('booking-return-time').value = '16:00';
  openModal('modal-booking');
}

async function submitBooking() {
  if (!currentBookingGear) return;
  const payload = {
    gearId: currentBookingGear._id,
    rentalDate: document.getElementById('booking-rental-date').value,
    returnDate: document.getElementById('booking-return-date').value,
    pickupTime: document.getElementById('booking-pickup-time').value,
    returnTime: document.getElementById('booking-return-time').value,
    quantity: parseInt(document.getElementById('booking-qty').value) || 1,
    rentalType: document.getElementById('booking-type').value
  };
  if (!payload.rentalDate || !payload.returnDate || !payload.pickupTime) return toast('Please fill all fields', 'error');
  try {
    const res = await apiFetch('/api/bookings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) return toast(data.error || 'Booking failed', 'error');
    closeModal('modal-booking');
    toast('Booking submitted! Awaiting approval. 📬', 'success');
    loadGear();
  } catch (e) { toast('Error submitting booking', 'error'); }
}

// ===== USER DASHBOARD =====
async function loadUserDashboard() {
  try {
    const bookings = await apiFetch('/api/bookings/my').then(r => r.json());
    const list = document.getElementById('user-bookings-list');
    if (!bookings.length) {
      list.innerHTML = '<div class="empty-state"><div class="empty-icon">📋</div><p>No bookings yet. Go rent some gear!</p></div>';
    } else {
      list.innerHTML = bookings.map(b => `
        <div class="booking-item">
          <div class="booking-item-header">
            <div class="booking-gear">${b.gearName || (b.gear?.itemName) || '—'}</div>
            <span class="status-badge badge-${b.status}">${b.status.toUpperCase()}</span>
          </div>
          <div class="booking-meta">
            <div>📅 ${new Date(b.rentalDate).toLocaleDateString()}</div>
            <div>🔄 ${new Date(b.returnDate).toLocaleDateString()}</div>
            <div>⏰ Pickup: ${b.pickupTime}</div>
            <div>📦 Qty: ${b.quantity}</div>
          </div>
          ${b.status === 'pending' ? `<button class="btn-danger btn-sm" style="margin-top:10px;" onclick="cancelBooking('${b._id}')">Cancel</button>` : ''}
        </div>
      `).join('');
    }
    // Populate feedback select
    const select = document.getElementById('feedback-booking-select');
    const completed = bookings.filter(b => b.status === 'returned' || b.status === 'accepted');
    select.innerHTML = '<option value="">Select a completed booking...</option>' +
      completed.map(b => `<option value="${b._id}">${b.gearName} — ${new Date(b.rentalDate).toLocaleDateString()}</option>`).join('');
  } catch (e) { console.error(e); }
}

async function cancelBooking(id) {
  await apiFetch(`/api/bookings/${id}/cancel`, { method: 'PUT' });
  toast('Booking cancelled', 'success');
  loadUserDashboard();
}

function setRating(val) {
  selectedRating = val;
  document.querySelectorAll('.star').forEach((s, i) => s.classList.toggle('active', i < val));
}

async function submitFeedback() {
  const bookingId = document.getElementById('feedback-booking-select').value;
  const feedback = document.getElementById('feedback-text').value.trim();
  if (!bookingId || !feedback) return toast('Please select a booking and write feedback', 'error');
  await apiFetch('/api/feedback', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bookingId, feedback, rating: selectedRating })
  });
  toast('Feedback submitted! Thank you 🙏', 'success');
  document.getElementById('feedback-text').value = '';
  setRating(0);
}

// ===== ADMIN DASHBOARD =====
async function loadAdminStats() {
  try {
    const stats = await apiFetch('/api/admin/stats').then(r => r.json());
    document.getElementById('stat-users').textContent = stats.totalUsers + '+';
  } catch (e) {}
}

async function loadAdminDashboard() {
  try {
    const [stats, bookings, feedbacks] = await Promise.all([
      apiFetch('/api/admin/stats').then(r => r.json()),
      apiFetch('/api/bookings/all').then(r => r.json()),
      apiFetch('/api/feedback/all').then(r => r.json())
    ]);
    document.getElementById('dash-active').textContent = stats.activeLoans;
    document.getElementById('dash-pending').textContent = stats.pendingRequests;
    document.getElementById('dash-users').textContent = stats.totalUsers;
    document.getElementById('dash-feedback').textContent = stats.feedbackCount;

    // Active loans
    const active = bookings.filter(b => b.status === 'accepted' || b.status === 'active');
    document.getElementById('active-loans-tbody').innerHTML = active.length ? active.map(b => `
      <tr>
        <td>${b.studentId || b.staffId || b.renterName}</td>
        <td>${b.gearName}</td>
        <td>${b.quantity}</td>
        <td>${b.pickupTime}</td>
        <td>${new Date(b.returnDate).toLocaleDateString()}</td>
        <td><span class="status-badge badge-active">ACTIVE</span></td>
        <td>
          <div class="action-btns">
            <button class="btn-danger btn-sm" onclick="updateBookingStatus('${b._id}','late-returned')">Late Returned</button>
            <button class="btn-primary btn-sm" onclick="updateBookingStatus('${b._id}','returned')">Returned</button>
          </div>
        </td>
      </tr>
    `).join('') : '<tr><td colspan="7" style="text-align:center;color:var(--clr-muted);padding:24px;">No active loans</td></tr>';

    // Pending requests
    const pending = bookings.filter(b => b.status === 'pending');
    document.getElementById('pending-tbody').innerHTML = pending.length ? pending.map(b => `
      <tr>
        <td>${b.studentId || b.staffId || b.renterName}</td>
        <td>${b.gearName}</td>
        <td>${b.quantity}</td>
        <td>${b.pickupTime}</td>
        <td>${new Date(b.returnDate).toLocaleDateString()}</td>
        <td><span class="status-badge badge-pending">PENDING</span></td>
        <td>
          <div class="action-btns">
            <button class="btn-primary btn-sm" onclick="updateBookingStatus('${b._id}','accepted')">Accept</button>
            <button class="btn-danger btn-sm" onclick="updateBookingStatus('${b._id}','rejected')">Reject</button>
          </div>
        </td>
      </tr>
    `).join('') : '<tr><td colspan="7" style="text-align:center;color:var(--clr-muted);padding:24px;">No pending requests</td></tr>';

    // Feedback
    const fbList = document.getElementById('admin-feedback-list');
    fbList.innerHTML = feedbacks.length ? feedbacks.map(f => `
      <div class="feedback-card">
        <div class="f-stars">${'★'.repeat(f.rating || 0)}${'☆'.repeat(5-(f.rating||0))}</div>
        <div class="f-user">${f.renterName || 'Anonymous'}</div>
        <div class="f-text">${f.feedback}</div>
        <div style="font-size:12px;color:var(--clr-muted);margin-top:8px;">For: ${f.gearName || '—'}</div>
      </div>
    `).join('') : '<div class="empty-state"><div class="empty-icon">💬</div><p>No feedback yet.</p></div>';
  } catch (e) { console.error(e); }
}

async function updateBookingStatus(id, status) {
  try {
    const res = await apiFetch(`/api/bookings/${id}/status`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    const data = await res.json();
    if (!res.ok) {
      return toast(data.error || 'Failed to update booking', 'error');
    }
    toast(`Booking ${status}!`, 'success');
    loadAdminDashboard();
  } catch (e) {
    toast('Connection error. Is the server running?', 'error');
  }
}

// ===== GEAR ADMIN =====
function openAddGearModal() {
  currentGearEdit = null;
  document.getElementById('gear-modal-title').textContent = 'Add New Gear';
  document.getElementById('gear-edit-id').value = '';
  ['gear-item-name','gear-photo'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('gear-category').value = '';
  document.getElementById('gear-condition').value = 'Good';
  document.getElementById('gear-status').value = 'Available';
  document.getElementById('gear-total-qty').value = '1';
  document.getElementById('gear-avail-qty').value = '1';
  openModal('modal-gear');
}

function openEditGearModal(id) {
  const gear = allGear.find(g => g._id === id);
  if (!gear) return;
  currentGearEdit = gear;
  document.getElementById('gear-modal-title').textContent = 'Edit Gear';
  document.getElementById('gear-edit-id').value = gear._id;
  document.getElementById('gear-item-name').value = gear.itemName;
  document.getElementById('gear-category').value = gear.category;
  document.getElementById('gear-condition').value = gear.condition;
  document.getElementById('gear-status').value = gear.status;
  document.getElementById('gear-total-qty').value = gear.totalQuantity;
  document.getElementById('gear-avail-qty').value = gear.availableQuantity;
  document.getElementById('gear-photo').value = gear.photo || '';
  openModal('modal-gear');
}

async function saveGear() {
  const payload = {
    itemName: document.getElementById('gear-item-name').value,
    category: document.getElementById('gear-category').value,
    condition: document.getElementById('gear-condition').value,
    status: document.getElementById('gear-status').value,
    totalQuantity: parseInt(document.getElementById('gear-total-qty').value) || 1,
    availableQuantity: parseInt(document.getElementById('gear-avail-qty').value) || 1,
    photo: document.getElementById('gear-photo').value
  };
  const id = document.getElementById('gear-edit-id').value;
  if (id) {
    await apiFetch(`/api/gear/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  } else {
    await apiFetch('/api/gear', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  }
  closeModal('modal-gear');
  loadGear();
  toast('Gear saved!', 'success');
}

// ===== CONFIRM DELETE =====
function confirmDelete(type, id) {
  document.getElementById('confirm-title').textContent = 'Confirm Delete';
  document.getElementById('confirm-message').textContent = `Are you sure you want to delete this ${type}? This cannot be undone.`;
  const btn = document.getElementById('confirm-action-btn');
  btn.onclick = async () => {
    if (type === 'gear') { await apiFetch(`/api/gear/${id}`, { method: 'DELETE' }); loadGear(); }
    if (type === 'sport') { await apiFetch(`/api/sports/${id}`, { method: 'DELETE' }); loadSports(); }
    closeModal('modal-confirm');
    toast(`${type} deleted`, 'success');
  };
  openModal('modal-confirm');
}

function scrollToSection(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

// ===== MODALS =====
function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

// ===== MOBILE NAV =====
function toggleMobileNav() {
  document.getElementById('nav-links').classList.toggle('open');
}
function closeMobileNav() {
  document.getElementById('nav-links').classList.remove('open');
}

// ===== UTILS =====
function togglePwd(id) {
  const el = document.getElementById(id);
  el.type = el.type === 'password' ? 'text' : 'password';
}

function toast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  return `${Math.floor(diff/86400)}d ago`;
}