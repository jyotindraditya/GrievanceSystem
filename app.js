// ===== Griever — Grievance Management System =====
// SPA Router, CRUD, Role-Based Access, Dashboard, Admin Panel, Toast Notifications
// Data powered by Supabase (PostgreSQL)

(async function () {
  'use strict';

  // ===== Loading Overlay =====
  const loadingOverlay = document.getElementById('loading-overlay');

  function showLoading() {
    loadingOverlay.classList.add('active');
  }

  function hideLoading() {
    loadingOverlay.classList.remove('active');
  }

  // ===== Supabase Data Layer =====
  // `db` is the Supabase client created in supabase.js

  async function fetchGrievances() {
    try {
      const { data, error } = await db
        .from('grievances')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Failed to fetch grievances:', err);
      showToast('Failed to load grievances: ' + err.message, 'error');
      return [];
    }
  }

  async function fetchAdminsForDisplay() {
    try {
      const { data, error } = await db
        .from('admins')
        .select('id, username, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Failed to fetch admins:', err);
      showToast('Failed to load admin accounts: ' + err.message, 'error');
      return [];
    }
  }

  async function validateAdminLogin(username, password) {
    try {
      const { data, error } = await db
        .from('admins')
        .select('username')
        .ilike('username', username)
        .eq('password', password);
      if (error) throw error;
      return data && data.length > 0;
    } catch (err) {
      console.error('Admin login validation error:', err);
      showToast('Login error: ' + err.message, 'error');
      return false;
    }
  }

  async function insertGrievanceToDB(grievance) {
    try {
      const { error } = await db.from('grievances').insert([grievance]);
      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Failed to insert grievance:', err);
      showToast('Failed to submit grievance: ' + err.message, 'error');
      return false;
    }
  }

  async function updateGrievanceInDB(id, updates) {
    try {
      const { error } = await db
        .from('grievances')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Failed to update grievance:', err);
      showToast('Failed to update grievance: ' + err.message, 'error');
      return false;
    }
  }

  async function deleteGrievanceFromDB(id) {
    try {
      const { error } = await db
        .from('grievances')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Failed to delete grievance:', err);
      showToast('Failed to delete grievance: ' + err.message, 'error');
      return false;
    }
  }

  async function insertAdminToDB(admin) {
    try {
      const { error } = await db.from('admins').insert([admin]);
      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Failed to register admin:', err);
      // Check for unique constraint violation
      if (err.code === '23505' || (err.message && err.message.includes('duplicate'))) {
        showToast(`Username "${admin.username}" is already registered.`, 'error');
      } else {
        showToast('Failed to register admin: ' + err.message, 'error');
      }
      return false;
    }
  }

  async function deleteAdminFromDB(id) {
    try {
      const { error } = await db
        .from('admins')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Failed to delete admin:', err);
      showToast('Failed to delete admin: ' + err.message, 'error');
      return false;
    }
  }

  // ===== Local Data Cache =====
  let grievances = [];
  let admins = [];

  // Helper to refresh grievances from DB into local cache
  async function refreshGrievancesCache() {
    grievances = await fetchGrievances();
  }

  // ===== Session / Role Management =====
  const SESSION_KEY = 'griever_session';
  let currentUser = null; // { name, role }

  function loadSession() {
    try {
      return JSON.parse(sessionStorage.getItem(SESSION_KEY));
    } catch {
      return null;
    }
  }

  function saveSession(user) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
  }

  function clearSession() {
    sessionStorage.removeItem(SESSION_KEY);
  }

  function isAdmin() {
    return currentUser && currentUser.role === 'admin';
  }

  // ===== ID Generator =====
  function generateId() {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `GRV-${timestamp.slice(-4)}${random}`;
  }

  // ===== Date Formatter =====
  function formatDate(isoString) {
    const d = new Date(isoString);
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return d.toLocaleDateString('en-US', options);
  }

  function formatDateTime(isoString) {
    const d = new Date(isoString);
    return d.toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  // ===== Toast Notifications =====
  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span class="toast-message">${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('removing');
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // ===== Login Screen =====
  const loginScreen = document.getElementById('login-screen');
  const appLayout = document.getElementById('app-layout');
  const sidebarToggle = document.getElementById('sidebarToggle');
  const roleOptions = document.querySelectorAll('.role-option');

  // Role selection UI
  const adminPasswordGroup = document.getElementById('admin-password-group');
  const loginNameInstruction = document.getElementById('login-name-instruction');

  roleOptions.forEach(option => {
    option.addEventListener('click', () => {
      roleOptions.forEach(o => o.classList.remove('selected'));
      option.classList.add('selected');
      option.querySelector('input[type="radio"]').checked = true;

      // Show/hide admin password field & toggle name instruction
      const selectedRole = option.querySelector('input[type="radio"]').value;
      if (selectedRole === 'admin') {
        adminPasswordGroup.style.display = 'flex';
        if (loginNameInstruction) loginNameInstruction.style.display = 'none';
      } else {
        adminPasswordGroup.style.display = 'none';
        document.getElementById('admin-password').value = '';
        if (loginNameInstruction) loginNameInstruction.style.display = 'block';
      }
    });
  });

  // Login button
  document.getElementById('login-btn').addEventListener('click', async () => {
    const name = document.getElementById('login-name').value.trim();
    if (!name) {
      showToast('Please enter your name', 'error');
      return;
    }

    const role = document.querySelector('input[name="role"]:checked').value;

    // Validate admin password against Supabase admins table
    if (role === 'admin') {
      const password = document.getElementById('admin-password').value;
      if (!password) {
        showToast('Please enter the admin password', 'error');
        return;
      }

      const loginBtn = document.getElementById('login-btn');
      loginBtn.classList.add('loading');

      const isValid = await validateAdminLogin(name, password);

      loginBtn.classList.remove('loading');

      if (!isValid) {
        showToast('Invalid administrator username or password. Access denied.', 'error');
        document.getElementById('admin-password').value = '';
        return;
      }
    }

    currentUser = { name, role };
    saveSession(currentUser);
    await enterApp();
  });

  // Login on Enter key
  document.getElementById('login-name').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      document.getElementById('login-btn').click();
    }
  });

  // Also allow Enter on admin password field
  document.getElementById('admin-password').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      document.getElementById('login-btn').click();
    }
  });

  // Logout
  document.getElementById('logout-btn').addEventListener('click', () => {
    clearSession();
    currentUser = null;
    // Reset UI
    loginScreen.classList.remove('hidden');
    appLayout.classList.add('hidden');
    sidebarToggle.classList.add('hidden');
    document.getElementById('login-name').value = '';
    document.getElementById('admin-password').value = '';
    adminPasswordGroup.style.display = 'none';
    if (loginNameInstruction) loginNameInstruction.style.display = 'block';
    resetAdminTabs();
    // Reset role selection to Member
    roleOptions.forEach(o => o.classList.remove('selected'));
    document.getElementById('role-member-option').classList.add('selected');
    document.querySelector('input[name="role"][value="member"]').checked = true;
    // Reset to dashboard for next login
    switchView('dashboard');
  });

  async function enterApp() {
    showLoading();

    loginScreen.classList.add('hidden');
    appLayout.classList.remove('hidden');
    sidebarToggle.classList.remove('hidden');

    // Update sidebar user info
    const initial = currentUser.name.charAt(0).toUpperCase();
    document.getElementById('user-avatar').textContent = initial;
    document.getElementById('user-display-name').textContent = currentUser.name;
    document.getElementById('user-display-role').textContent = isAdmin() ? 'Administrator' : 'Member';

    // Show/hide admin nav
    const adminNavLabel = document.getElementById('admin-nav-label');
    const adminNavItem = document.getElementById('nav-admin');

    if (isAdmin()) {
      adminNavLabel.classList.remove('hidden');
      adminNavItem.classList.remove('hidden');
    } else {
      adminNavLabel.classList.add('hidden');
      adminNavItem.classList.add('hidden');
      // If currently on admin view, redirect to dashboard
      if (document.getElementById('view-admin').classList.contains('active')) {
        switchView('dashboard');
      }
    }

    // Seed demo data on first use then load grievances
    await seedDemoData();
    await refreshGrievancesCache();
    refreshDashboard();

    hideLoading();
    showToast(`Welcome, ${currentUser.name}!`, 'success');
  }

  // ===== SPA Router =====
  const navItems = document.querySelectorAll('.nav-item[data-view]');
  const views = document.querySelectorAll('.view');
  const cardActions = document.querySelectorAll('.card-action[data-view]');

  function switchView(viewName) {
    // Block admin view for non-admins
    if (viewName === 'admin' && !isAdmin()) {
      showToast('Access denied. Admin privileges required.', 'error');
      return;
    }

    // Update nav
    navItems.forEach(item => item.classList.remove('active'));
    const activeNav = document.querySelector(`.nav-item[data-view="${viewName}"]`);
    if (activeNav) activeNav.classList.add('active');

    // Update views
    views.forEach(v => v.classList.remove('active'));
    const activeView = document.getElementById(`view-${viewName}`);
    if (activeView) {
      activeView.classList.remove('active');
      // Force reflow for animation
      void activeView.offsetWidth;
      activeView.classList.add('active');
    }

    // Close sidebar on mobile
    document.getElementById('sidebar').classList.remove('open');

    // Refresh view data
    if (viewName === 'dashboard') refreshDashboard();
    if (viewName === 'my-grievances') renderGrievancesTable();
    if (viewName === 'admin') {
      resetAdminTabs();
      renderAdminTable();
    }
  }

  navItems.forEach(item => {
    item.addEventListener('click', () => switchView(item.dataset.view));
  });

  cardActions.forEach(action => {
    action.addEventListener('click', () => switchView(action.dataset.view));
  });

  // Mobile sidebar toggle
  sidebarToggle.addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });

  // ===== Dashboard =====
  function refreshDashboard() {
    const total = grievances.length;
    const pending = grievances.filter(g => g.status === 'Pending').length;
    const progress = grievances.filter(g => g.status === 'In Progress').length;
    const resolved = grievances.filter(g => g.status === 'Resolved').length;

    animateCounter('stat-total', total);
    animateCounter('stat-pending', pending);
    animateCounter('stat-progress', progress);
    animateCounter('stat-resolved', resolved);

    // Update badge
    document.getElementById('grievance-count-badge').textContent = total;

    // Priority distribution
    const priorities = { Low: 0, Medium: 0, High: 0, Critical: 0 };
    grievances.forEach(g => {
      if (priorities[g.priority] !== undefined) priorities[g.priority]++;
    });

    const maxPriority = Math.max(...Object.values(priorities), 1);
    ['low', 'medium', 'high', 'critical'].forEach(p => {
      const key = p.charAt(0).toUpperCase() + p.slice(1);
      const count = priorities[key];
      document.getElementById(`priority-${p}-count`).textContent = count;
      document.getElementById(`priority-${p}-bar`).style.width = `${(count / maxPriority) * 100}%`;
    });

    // Recent grievances
    renderRecentGrievances();
  }

  function animateCounter(elementId, target) {
    const el = document.getElementById(elementId);
    const current = parseInt(el.textContent) || 0;
    if (current === target) return;

    const duration = 500;
    const steps = 20;
    const increment = (target - current) / steps;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      el.textContent = Math.round(current + increment * step);
      if (step >= steps) {
        el.textContent = target;
        clearInterval(timer);
      }
    }, duration / steps);
  }

  function renderRecentGrievances() {
    const container = document.getElementById('recent-grievances');
    const recent = [...grievances]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5);

    if (recent.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <h4>No grievances yet</h4>
          <p>Submit your first grievance to get started</p>
        </div>`;
      return;
    }

    container.innerHTML = recent.map(g => `
      <div class="recent-item" data-id="${g.id}">
        <div class="ri-priority ${g.priority.toLowerCase()}"></div>
        <div class="ri-info">
          <div class="ri-title">${escapeHtml(g.title)}</div>
          <div class="ri-meta">${g.id} · ${formatDate(g.created_at)}</div>
        </div>
        <div class="ri-status">
          <span class="badge ${statusClass(g.status)}">${g.status}</span>
        </div>
      </div>
    `).join('');

    // Click to view detail
    container.querySelectorAll('.recent-item').forEach(item => {
      item.addEventListener('click', () => openDetailModal(item.dataset.id));
    });
  }

  // ===== Submit Grievance =====
  const form = document.getElementById('grievance-form');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const title = document.getElementById('grievance-title').value.trim();
    const category = document.getElementById('grievance-category').value;
    const priority = document.getElementById('grievance-priority').value;
    const email = document.getElementById('grievance-email').value.trim();
    const department = document.getElementById('grievance-department').value.trim();
    const description = document.getElementById('grievance-description').value.trim();

    // Validation
    if (!title || !category || !priority || !description) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    const grievance = {
      id: generateId(),
      title,
      category,
      priority,
      name: currentUser.name,  // Auto-populated from login
      email,
      department,
      description,
      status: 'Pending',
      admin_response: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Show loading state on submit button
    const submitBtn = document.getElementById('submit-btn');
    submitBtn.classList.add('loading');

    const success = await insertGrievanceToDB(grievance);

    submitBtn.classList.remove('loading');

    if (success) {
      grievances.push(grievance); // Update local cache
      showToast(`Grievance ${grievance.id} submitted successfully!`, 'success');
      form.reset();
      refreshDashboard();
    }
  });

  // ===== My Grievances Table =====
  function renderGrievancesTable() {
    const search = document.getElementById('search-grievances').value.toLowerCase();
    const statusFilter = document.getElementById('filter-status').value;
    const priorityFilter = document.getElementById('filter-priority').value;

    let filtered = [...grievances];

    // Members only see their own grievances
    if (!isAdmin()) {
      filtered = filtered.filter(g => g.name === currentUser.name);
    }

    if (search) {
      filtered = filtered.filter(g =>
        g.title.toLowerCase().includes(search) ||
        g.id.toLowerCase().includes(search)
      );
    }
    if (statusFilter) {
      filtered = filtered.filter(g => g.status === statusFilter);
    }
    if (priorityFilter) {
      filtered = filtered.filter(g => g.priority === priorityFilter);
    }

    filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const tbody = document.getElementById('grievances-tbody');
    const emptyMsg = document.getElementById('no-grievances-msg');
    const table = document.getElementById('grievances-table');

    if (filtered.length === 0) {
      tbody.innerHTML = '';
      table.style.display = 'none';
      emptyMsg.style.display = 'block';
      return;
    }

    table.style.display = 'table';
    emptyMsg.style.display = 'none';

    tbody.innerHTML = filtered.map(g => `
      <tr>
        <td><span class="table-id">${g.id}</span></td>
        <td><span class="table-title">${escapeHtml(g.title)}</span></td>
        <td>${escapeHtml(g.category)}</td>
        <td><span class="badge-priority ${g.priority.toLowerCase()}">${g.priority}</span></td>
        <td><span class="badge ${statusClass(g.status)}">${g.status}</span></td>
        <td><span class="table-date">${formatDate(g.created_at)}</span></td>
        <td>
          <div class="table-actions">
            <button class="btn btn-sm btn-secondary" data-action="view" data-id="${g.id}" style="padding: 4px 10px; font-size: 0.75rem;">View</button>
            <button class="btn btn-sm btn-danger" data-action="delete" data-id="${g.id}" style="padding: 4px 10px; font-size: 0.75rem;">Delete</button>
          </div>
        </td>
      </tr>
    `).join('');

    // Attach events
    tbody.querySelectorAll('[data-action="view"]').forEach(btn => {
      btn.addEventListener('click', () => openDetailModal(btn.dataset.id));
    });
    tbody.querySelectorAll('[data-action="delete"]').forEach(btn => {
      btn.addEventListener('click', () => deleteGrievance(btn.dataset.id));
    });
  }

  // Filters / Search
  document.getElementById('search-grievances').addEventListener('input', renderGrievancesTable);
  document.getElementById('filter-status').addEventListener('change', renderGrievancesTable);
  document.getElementById('filter-priority').addEventListener('change', renderGrievancesTable);

  // ===== Admin Table =====
  function renderAdminTable() {
    const search = document.getElementById('admin-search').value.toLowerCase();
    const statusFilter = document.getElementById('admin-filter-status').value;
    const priorityFilter = document.getElementById('admin-filter-priority').value;

    let filtered = [...grievances];

    if (search) {
      filtered = filtered.filter(g =>
        g.title.toLowerCase().includes(search) ||
        g.id.toLowerCase().includes(search) ||
        g.name.toLowerCase().includes(search)
      );
    }
    if (statusFilter) {
      filtered = filtered.filter(g => g.status === statusFilter);
    }
    if (priorityFilter) {
      filtered = filtered.filter(g => g.priority === priorityFilter);
    }

    filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const tbody = document.getElementById('admin-tbody');
    const emptyMsg = document.getElementById('no-admin-msg');
    const table = document.getElementById('admin-table');

    if (filtered.length === 0) {
      tbody.innerHTML = '';
      table.style.display = 'none';
      emptyMsg.style.display = 'block';
      return;
    }

    table.style.display = 'table';
    emptyMsg.style.display = 'none';

    tbody.innerHTML = filtered.map(g => `
      <tr>
        <td><span class="table-id">${g.id}</span></td>
        <td><span class="table-title">${escapeHtml(g.title)}</span></td>
        <td>${escapeHtml(g.name)}</td>
        <td>${escapeHtml(g.category)}</td>
        <td><span class="badge-priority ${g.priority.toLowerCase()}">${g.priority}</span></td>
        <td><span class="badge ${statusClass(g.status)}">${g.status}</span></td>
        <td><span class="table-date">${formatDate(g.created_at)}</span></td>
        <td>
          <div class="table-actions">
            <button class="btn btn-sm btn-secondary" data-action="admin-view" data-id="${g.id}" style="padding: 4px 10px; font-size: 0.75rem;">Manage</button>
          </div>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('[data-action="admin-view"]').forEach(btn => {
      btn.addEventListener('click', () => openAdminModal(btn.dataset.id));
    });
  }

  // Admin filters
  document.getElementById('admin-search').addEventListener('input', renderAdminTable);
  document.getElementById('admin-filter-status').addEventListener('change', renderAdminTable);
  document.getElementById('admin-filter-priority').addEventListener('change', renderAdminTable);

  // ===== Admin Sub-tabs switching =====
  const adminTabs = document.querySelectorAll('.admin-tab[data-admin-tab]');
  const adminSubviews = document.querySelectorAll('.admin-subview');

  adminTabs.forEach(tab => {
    tab.addEventListener('click', async () => {
      adminTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const targetSubview = tab.dataset.adminTab;
      adminSubviews.forEach(view => {
        if (view.id === `admin-subview-${targetSubview}`) {
          view.style.display = 'block';
        } else {
          view.style.display = 'none';
        }
      });

      if (targetSubview === 'database') {
        admins = await fetchAdminsForDisplay();
        renderAdminsTableUI();
      } else {
        renderAdminTable();
      }
    });
  });

  // Reset admin subtabs to default (Grievances active) on logout or view switch
  function resetAdminTabs() {
    adminTabs.forEach(t => t.classList.remove('active'));
    const defaultTab = document.querySelector('.admin-tab[data-admin-tab="grievances"]');
    if (defaultTab) defaultTab.classList.add('active');

    adminSubviews.forEach(view => {
      if (view.id === 'admin-subview-grievances') {
        view.style.display = 'block';
      } else {
        view.style.display = 'none';
      }
    });
  }

  // ===== Administrator Accounts Table =====
  function renderAdminsTableUI() {
    const search = document.getElementById('admin-db-search').value.toLowerCase().trim();
    let filteredAdmins = [...admins];

    if (search) {
      filteredAdmins = filteredAdmins.filter(a => a.username.toLowerCase().includes(search));
    }

    filteredAdmins.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const tbody = document.getElementById('admin-db-tbody');
    const emptyMsg = document.getElementById('no-admin-db-msg');
    const table = document.getElementById('admin-db-table');

    if (filteredAdmins.length === 0) {
      tbody.innerHTML = '';
      table.style.display = 'none';
      emptyMsg.style.display = 'block';
      return;
    }

    table.style.display = 'table';
    emptyMsg.style.display = 'none';

    tbody.innerHTML = filteredAdmins.map(a => `
      <tr>
        <td style="font-weight: 600; color: var(--text-primary);">${escapeHtml(a.username)}</td>
        <td class="table-date">${formatDateTime(a.created_at)}</td>
        <td>
          <button class="btn btn-sm btn-danger" data-action="delete-admin" data-id="${a.id}" data-username="${escapeHtml(a.username)}" style="padding: 4px 10px; font-size: 0.75rem;" ${currentUser && currentUser.name === a.username ? 'disabled title="Cannot delete yourself"' : ''}>Delete</button>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('[data-action="delete-admin"]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!btn.disabled) {
          deleteAdmin(btn.dataset.id, btn.dataset.username);
        }
      });
    });
  }

  // Search admin accounts list (filters locally)
  document.getElementById('admin-db-search').addEventListener('input', renderAdminsTableUI);

  // Register New Admin Form Submit
  document.getElementById('register-admin-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const usernameInput = document.getElementById('reg-admin-username');
    const passwordInput = document.getElementById('reg-admin-password');

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    if (!username || !password) {
      showToast('Please fill out all fields', 'error');
      return;
    }

    // Username alphanumeric check (3-20 chars)
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(username)) {
      showToast('Username must be 3-20 alphanumeric characters or underscores.', 'error');
      return;
    }

    // Password length check
    if (password.length < 6) {
      showToast('Password must be at least 6 characters long.', 'error');
      return;
    }

    // Insert into Supabase (unique constraint will prevent duplicates)
    const newAdmin = {
      username: username,
      password: password
      // created_at will be set by the database default
    };

    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.classList.add('loading');

    const success = await insertAdminToDB(newAdmin);

    submitBtn.classList.remove('loading');

    if (success) {
      showToast(`Administrator "${username}" registered successfully!`, 'success');

      // Reset form fields
      usernameInput.value = '';
      passwordInput.value = '';

      // Refresh admin list from DB
      admins = await fetchAdminsForDisplay();
      renderAdminsTableUI();
    }
  });

  // ===== Modals =====
  const modalOverlay = document.getElementById('modal-overlay');
  const modalContent = document.getElementById('modal-content');

  function openModal() {
    modalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    modalOverlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  document.getElementById('modal-close').addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  // User detail modal
  function openDetailModal(id) {
    const g = grievances.find(gr => gr.id === id);
    if (!g) return;

    modalContent.innerHTML = `
      <h3>${escapeHtml(g.title)}</h3>
      <div class="detail-grid">
        <div class="detail-item">
          <span class="detail-label">Ticket ID</span>
          <span class="detail-value" style="color: var(--accent-secondary); font-family: monospace;">${g.id}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Status</span>
          <span class="detail-value"><span class="badge ${statusClass(g.status)}">${g.status}</span></span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Category</span>
          <span class="detail-value">${escapeHtml(g.category)}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Priority</span>
          <span class="detail-value"><span class="badge-priority ${g.priority.toLowerCase()}">${g.priority}</span></span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Submitted By</span>
          <span class="detail-value">${escapeHtml(g.name)}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Email</span>
          <span class="detail-value">${g.email ? escapeHtml(g.email) : '—'}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Department</span>
          <span class="detail-value">${g.department ? escapeHtml(g.department) : '—'}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Submitted On</span>
          <span class="detail-value">${formatDateTime(g.created_at)}</span>
        </div>
        <div class="detail-item full-width">
          <span class="detail-label">Description</span>
          <div class="detail-description">${escapeHtml(g.description)}</div>
        </div>
      </div>
      ${g.admin_response ? `
        <div class="admin-response-section">
          <h4>Admin Response</h4>
          <div class="admin-response-box">${escapeHtml(g.admin_response)}</div>
          <p style="font-size: 0.75rem; color: var(--text-muted); margin-top: 8px;">Last updated: ${formatDateTime(g.updated_at)}</p>
        </div>
      ` : ''}
    `;
    openModal();
  }

  // Admin modal with controls
  function openAdminModal(id) {
    if (!isAdmin()) {
      showToast('Access denied', 'error');
      return;
    }

    const g = grievances.find(gr => gr.id === id);
    if (!g) return;

    modalContent.innerHTML = `
      <h3>Manage: ${escapeHtml(g.title)}</h3>
      <div class="detail-grid">
        <div class="detail-item">
          <span class="detail-label">Ticket ID</span>
          <span class="detail-value" style="color: var(--accent-secondary); font-family: monospace;">${g.id}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Current Status</span>
          <span class="detail-value"><span class="badge ${statusClass(g.status)}">${g.status}</span></span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Submitted By</span>
          <span class="detail-value">${escapeHtml(g.name)}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Priority</span>
          <span class="detail-value"><span class="badge-priority ${g.priority.toLowerCase()}">${g.priority}</span></span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Category</span>
          <span class="detail-value">${escapeHtml(g.category)}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Date</span>
          <span class="detail-value">${formatDateTime(g.created_at)}</span>
        </div>
        <div class="detail-item full-width">
          <span class="detail-label">Description</span>
          <div class="detail-description">${escapeHtml(g.description)}</div>
        </div>
      </div>

      <div class="admin-controls">
        <h4>Update Status</h4>
        <div class="status-buttons">
          <button class="btn btn-sm btn-secondary" data-status="Pending" ${g.status === 'Pending' ? 'disabled style="opacity:0.4"' : ''}>Pending</button>
          <button class="btn btn-sm" style="background: var(--status-progress-bg); color: var(--status-progress); border: 1px solid #1a2a48;" data-status="In Progress" ${g.status === 'In Progress' ? 'disabled style="opacity:0.4"' : ''}>In Progress</button>
          <button class="btn btn-sm btn-success" data-status="Resolved" ${g.status === 'Resolved' ? 'disabled style="opacity:0.4"' : ''}>Resolved</button>
          <button class="btn btn-sm btn-danger" data-status="Rejected" ${g.status === 'Rejected' ? 'disabled style="opacity:0.4"' : ''}>Rejected</button>
        </div>
      </div>

      <div class="admin-controls" style="border-top: none; padding-top: 4px;">
        <h4>Admin Response</h4>
        <textarea class="form-textarea" id="admin-response-input" placeholder="Add a response or note for the grievance submitter...">${g.admin_response ? escapeHtml(g.admin_response) : ''}</textarea>
        <button class="btn btn-primary btn-sm" id="save-admin-response" style="align-self: flex-start;">Save Response</button>
      </div>
    `;

    // Status button handlers
    modalContent.querySelectorAll('[data-status]').forEach(btn => {
      btn.addEventListener('click', async () => {
        btn.classList.add('loading');
        await updateGrievanceStatus(id, btn.dataset.status);
        btn.classList.remove('loading');
        openAdminModal(id); // Re-render modal
      });
    });

    // Save response handler
    document.getElementById('save-admin-response').addEventListener('click', async () => {
      const response = document.getElementById('admin-response-input').value.trim();
      const saveBtn = document.getElementById('save-admin-response');
      saveBtn.classList.add('loading');
      await updateAdminResponse(id, response);
      saveBtn.classList.remove('loading');
    });

    openModal();
  }

  // ===== CRUD Operations =====
  async function updateGrievanceStatus(id, newStatus) {
    if (!isAdmin()) return;

    const idx = grievances.findIndex(g => g.id === id);
    if (idx === -1) return;

    const oldStatus = grievances[idx].status;
    const now = new Date().toISOString();

    const success = await updateGrievanceInDB(id, {
      status: newStatus,
      updated_at: now
    });

    if (success) {
      // Update local cache
      grievances[idx].status = newStatus;
      grievances[idx].updated_at = now;

      showToast(`${id}: Status changed from "${oldStatus}" to "${newStatus}"`, 'success');
      refreshDashboard();
      renderAdminTable();
    }
  }

  async function updateAdminResponse(id, response) {
    if (!isAdmin()) return;

    const idx = grievances.findIndex(g => g.id === id);
    if (idx === -1) return;

    const now = new Date().toISOString();

    const success = await updateGrievanceInDB(id, {
      admin_response: response,
      updated_at: now
    });

    if (success) {
      // Update local cache
      grievances[idx].admin_response = response;
      grievances[idx].updated_at = now;

      showToast('Admin response saved successfully', 'success');
    }
  }

  async function deleteGrievance(id) {
    const g = grievances.find(gr => gr.id === id);
    if (!g) return;

    // Members can only delete their own grievances
    if (!isAdmin() && g.name !== currentUser.name) {
      showToast('You can only delete your own grievances', 'error');
      return;
    }

    if (!confirm(`Delete grievance "${g.title}" (${g.id})?`)) return;

    const success = await deleteGrievanceFromDB(id);

    if (success) {
      grievances = grievances.filter(gr => gr.id !== id);

      showToast(`Grievance ${id} deleted`, 'warning');
      renderGrievancesTable();
      refreshDashboard();
    }
  }

  async function deleteAdmin(id, username) {
    if (!isAdmin()) return;

    if (currentUser && currentUser.name === username) {
      showToast('You cannot delete your own admin account.', 'error');
      return;
    }

    if (!confirm(`Delete administrator account "${username}"?`)) return;

    const success = await deleteAdminFromDB(id);

    if (success) {
      admins = admins.filter(a => a.id !== id);
      showToast(`Administrator "${username}" deleted`, 'warning');
      renderAdminsTableUI();
    }
  }

  // ===== Helpers =====
  function statusClass(status) {
    const map = {
      'Pending': 'pending',
      'In Progress': 'in-progress',
      'Resolved': 'resolved',
      'Rejected': 'rejected'
    };
    return map[status] || 'pending';
  }

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ===== Seed demo data if empty =====
  async function seedDemoData() {
    try {
      // Check if any grievances exist
      const { data, error } = await db
        .from('grievances')
        .select('id')
        .limit(1);

      if (error) throw error;
      if (data && data.length > 0) return; // Table is not empty

      const demoData = [
        {
          id: generateId(),
          title: 'Library AC not functioning properly',
          category: 'Infrastructure',
          priority: 'High',
          name: 'Arjun Mehta',
          email: 'arjun.mehta@university.edu',
          department: 'Computer Science',
          description: 'The air conditioning unit in the main library (Block A, 2nd floor) has been malfunctioning for the past week. The temperature is uncomfortably high, making it impossible to study for extended periods. Multiple students have raised this concern verbally.',
          status: 'In Progress',
          admin_response: 'Maintenance team has been notified. Parts have been ordered and repair is scheduled for next Monday.',
          created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: generateId(),
          title: 'Delay in scholarship disbursement',
          category: 'Financial',
          priority: 'Critical',
          name: 'Priya Sharma',
          email: 'priya.s@university.edu',
          department: 'Economics',
          description: 'The merit-based scholarship for the semester was supposed to be disbursed by April 15th but has still not been credited to my account. I have submitted all required documents on time and verified my bank details with the finance office.',
          status: 'Pending',
          admin_response: '',
          created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: generateId(),
          title: 'Incorrect marks in semester result',
          category: 'Academic',
          priority: 'High',
          name: 'Ravi Kumar',
          email: 'ravi.k@university.edu',
          department: 'Mechanical Engineering',
          description: 'My marks in the subject "Thermodynamics II" (ME301) have been incorrectly entered in the result portal. I scored 78 in the internal assessment but it shows 48. I have my graded answer sheet as proof.',
          status: 'Pending',
          admin_response: '',
          created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: generateId(),
          title: 'Hostel water supply issues',
          category: 'Infrastructure',
          priority: 'Medium',
          name: 'Sneha Patel',
          email: 'sneha.p@university.edu',
          department: 'Biotechnology',
          description: 'Hostel Block C has been facing irregular water supply for the past two weeks. Water is available only for 2 hours in the morning and 1 hour in the evening, which is insufficient for daily needs.',
          status: 'Resolved',
          admin_response: 'The municipal water supply issue has been resolved. An additional water tank has been installed for Block C. Please report if the issue persists.',
          created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: generateId(),
          title: 'Request for additional lab hours',
          category: 'Academic',
          priority: 'Low',
          name: 'Aditya Singh',
          email: 'aditya.s@university.edu',
          department: 'Electronics',
          description: 'The current lab hours (10AM-1PM) are insufficient for completing the circuit design projects. Requesting the lab to be accessible till 6PM on weekdays and also on Saturdays for students working on their final year projects.',
          status: 'Resolved',
          admin_response: 'Lab hours have been extended to 5PM on weekdays. Saturday access from 10AM-2PM is also now available. Students must register at the lab office.',
          created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: generateId(),
          title: 'Staff behavior complaint at admin office',
          category: 'Administrative',
          priority: 'Medium',
          name: 'Kavita Reddy',
          email: 'kavita.r@university.edu',
          department: 'Chemistry',
          description: 'I visited the administrative office to collect my migration certificate and was met with extremely rude behavior from the front-desk staff. They were dismissive, uncooperative, and refused to give a timeline for the certificate processing despite my urgent need.',
          status: 'In Progress',
          admin_response: '',
          created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
        }
      ];

      const { error: insertError } = await db.from('grievances').insert(demoData);
      if (insertError) {
        console.error('Failed to seed demo data:', insertError);
      }
    } catch (err) {
      console.error('Seed demo data error:', err);
    }
  }

  // ===== Initialize =====
  // Check for existing session
  const existingSession = loadSession();
  if (existingSession) {
    currentUser = existingSession;
    await enterApp();
  }

})();
