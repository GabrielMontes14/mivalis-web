/**
 * TiendaBot Admin Panel - JavaScript
 * Handles all frontend interactions and API calls
 */

// API Base URL
const API_BASE = '/api';

// Auth Check handled in index.html head for performance

// State
let currentView = 'dashboard';
let currentSection = null; // Selected section/category for filtering
let products = [];
let categories = [];
let users = [];
let conversations = [];
let orders = [];
let editingProductId = null;

// Order notification state
let lastKnownPendingOrders = 0;
let orderNotificationInterval = null;

// Section selection for products
function selectSection(categoryId) {
    currentSection = categoryId;

    // Update active tab
    document.querySelectorAll('.section-tab').forEach(tab => {
        const tabCategoryId = tab.dataset.category === '' ? null : parseInt(tab.dataset.category);
        tab.classList.toggle('active', tabCategoryId === categoryId);
    });

    // Reload products
    filterProducts();
}

// Auth Headers Helper
const getHeaders = () => {
    return {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
    };
};

// Fetch Wrapper to handle 401s
const authenticatedFetch = async (url, options = {}) => {
    // If headers not provided, use default
    // If body is FormData, do NOT set Content-Type
    let headers = options.headers || {};

    // Add Authorization if not present
    if (!headers['Authorization']) {
        headers['Authorization'] = `Bearer ${localStorage.getItem('token')}`;
    }

    // Default Content-Type to json if not present and not FormData
    if (!headers['Content-Type'] && !(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, { ...options, headers });

    if (response.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/static/login.html';
        return null;
    }

    return response;
};

// ============================================
// Initialization
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    // Show/Hide Elements based on Role
    const role = localStorage.getItem('user_role');
    if (role === 'admin') {
        const usersLink = document.querySelector('[data-view="users"]');
        if (usersLink) usersLink.style.display = 'flex';
    }

    // Set user info
    const usernameDisplay = document.getElementById('user-display');
    if (usernameDisplay) {
        usernameDisplay.textContent = localStorage.getItem('username') || 'Usuario';
    }

    initNavigation();
    initProductModal();
    initChatTest();
    initFilters();
    initUserManagement();
    initMobileMenu();

    // Load initial data
    loadDashboardStats();
    loadCategories();

    // Start auto-refresh for sales dashboard
    startDailySalesAutoRefresh();

    // Start auto-refresh for economy dashboard
    startEconomyAutoRefresh();

    // Start order notification polling
    startOrderNotifications();
});

// ============================================
// Navigation
// ============================================
function initNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const view = item.dataset.view;
            switchView(view);
        });
    });

    // Logout
    document.getElementById('logout-btn')?.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('token');
        window.location.href = '/static/login.html';
    });
}

function switchView(view) {
    currentView = view;

    // Update nav
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.view === view);
    });

    // Update views
    document.querySelectorAll('.view').forEach(v => {
        v.classList.toggle('active', v.id === `${view}-view`);
    });

    // Update header
    const titles = {
        'dashboard': 'Dashboard',
        'products': 'Productos',
        'orders': 'Órdenes',
        'conversations': 'Conversaciones',
        'users': 'Usuarios',
        'economy': 'Economía'
    };
    document.getElementById('page-title').textContent = titles[view] || view;

    // Show/hide add buttons
    document.getElementById('add-product-btn').style.display =
        view === 'products' ? 'flex' : 'none';

    document.getElementById('add-user-btn').style.display =
        view === 'users' ? 'flex' : 'none';

    // Load data for view
    if (view === 'dashboard') loadDashboardStats();
    if (view === 'products') loadProducts();
    if (view === 'orders') loadOrders();
    if (view === 'conversations') loadConversations();
    if (view === 'users') loadUsers();
    if (view === 'economy') loadEconomyStats();
}

// ============================================
// Dashboard
// ============================================
async function loadDashboardStats() {
    try {
        const response = await authenticatedFetch(`${API_BASE}/stats`);
        if (!response) return;
        const stats = await response.json();

        document.getElementById('stat-total-products').textContent = stats.total_products;
        document.getElementById('stat-active-products').textContent = stats.active_products;
        document.getElementById('stat-low-stock').textContent = stats.low_stock_products;

        // Check for elements before updating
        const escalatedStat = document.getElementById('stat-escalated');
        if (escalatedStat) escalatedStat.textContent = stats.escalated_conversations;

        const pendingOrdersStat = document.getElementById('stat-pending-orders');
        if (pendingOrdersStat) pendingOrdersStat.textContent = stats.pending_orders;

        // Update alerts
        updateAlerts(stats);

        // Load daily sales
        loadDailySales();
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// ... (rest of file)

async function loadCategories() {
    try {
        const response = await authenticatedFetch(`${API_BASE}/products/categories/all`);
        if (response) {
            categories = await response.json();

            // Populate category filters
            const options = categories.map(c => `<option value="${c.id}">${c.icon} ${c.name}</option>`).join('');

            const productCategorySelect = document.getElementById('product-category');
            if (productCategorySelect) {
                productCategorySelect.innerHTML = '<option value="">Sin categoría</option>' + options;
            }
        }
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

// Daily sales with auto-refresh
let dailySalesInterval = null;

async function loadDailySales() {
    try {
        const response = await authenticatedFetch(`${API_BASE}/orders/stats/daily?days=30`);
        if (!response) return;
        const result = await response.json();

        const tbody = document.getElementById('daily-sales-tbody');
        if (!tbody) return;

        if (!result.data || result.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="empty-message">No hay ventas registradas</td></tr>';
            return;
        }

        tbody.innerHTML = result.data.map(day => `
            <tr>
                <td>${formatDate(day.date)}</td>
                <td><strong>${day.order_count}</strong></td>
                <td>$${formatCurrency(day.total_sales)}</td>
            </tr>
        `).join('');

        // Update timer badge
        const badge = document.getElementById('daily-sales-timer');
        if (badge) {
            badge.textContent = `🔄 Actualizado: ${new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}`;
        }
    } catch (error) {
        console.error('Error loading daily sales:', error);
    }
}

function formatDate(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' });
}

function formatCurrency(amount) {
    return parseFloat(amount).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

// Start auto-refresh for daily sales (every 10 minutes)
function startDailySalesAutoRefresh() {
    if (dailySalesInterval) clearInterval(dailySalesInterval);
    dailySalesInterval = setInterval(() => {
        if (currentView === 'dashboard') {
            loadDailySales();
        }
    }, 600000); // 10 minutes
}

// ============================================
// Economy Dashboard
// ============================================
let economyInterval = null;

async function loadEconomyStats() {
    try {
        const response = await authenticatedFetch(`${API_BASE}/stats/economy`);
        if (!response) return;
        const data = await response.json();

        // Update today's stats
        document.getElementById('eco-today-sales').textContent = `$${formatCurrency(data.today.sales)}`;
        document.getElementById('eco-today-costs').textContent = `$${formatCurrency(data.today.costs)}`;
        document.getElementById('eco-today-profit').textContent = `$${formatCurrency(data.today.profit)}`;
        document.getElementById('eco-today-cancelled').textContent = `$${formatCurrency(data.today.cancelled)}`;
        document.getElementById('eco-today-orders').textContent = data.today.orders;

        // Week and month
        document.getElementById('eco-week-sales').textContent = `$${formatCurrency(data.week.sales)}`;
        document.getElementById('eco-month-sales').textContent = `$${formatCurrency(data.month.sales)}`;

        // Profit color coding
        const profitEl = document.getElementById('eco-today-profit');
        if (data.today.profit >= 0) {
            profitEl.style.color = 'var(--accent-green)';
        } else {
            profitEl.style.color = 'var(--accent-red)';
        }

        // Update timestamp
        const timer = document.getElementById('economy-timer');
        timer.textContent = `🔄 ${new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}`;

        document.getElementById('eco-last-update').textContent =
            new Date(data.last_updated).toLocaleString('es-CO');

    } catch (error) {
        console.error('Error loading economy stats:', error);
    }
}

// Start auto-refresh for economy (every 5 minutes)
function startEconomyAutoRefresh() {
    if (economyInterval) clearInterval(economyInterval);
    economyInterval = setInterval(() => {
        if (currentView === 'economy') {
            loadEconomyStats();
        }
    }, 300000); // 5 minutes
}

// ============================================
// Order Notifications
// ============================================
async function checkNewOrders() {
    try {
        const response = await authenticatedFetch(`${API_BASE}/orders/new-count`);
        if (!response) return;
        const data = await response.json();

        // Update pending orders badge
        const badge = document.getElementById('pending-orders-badge');
        if (badge) {
            badge.textContent = data.total_pending;
            badge.style.display = data.total_pending > 0 ? 'flex' : 'none';
        }

        // Play sound if new orders appeared
        if (data.total_pending > lastKnownPendingOrders && lastKnownPendingOrders > 0) {
            playNotificationSound();
            showOrderNotification(data.total_pending - lastKnownPendingOrders);
        }

        lastKnownPendingOrders = data.total_pending;
    } catch (error) {
        console.error('Error checking new orders:', error);
    }
}

function playNotificationSound() {
    try {
        // Use Web Audio API for notification sound
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        gainNode.gain.value = 0.3;

        oscillator.start();

        // Two beeps
        setTimeout(() => {
            oscillator.frequency.value = 1000;
        }, 150);
        setTimeout(() => {
            oscillator.stop();
        }, 300);
    } catch (e) {
        console.log('Audio not available');
    }
}

function showOrderNotification(count) {
    // Create toast notification
    const message = count === 1
        ? '🛒 ¡Nuevo pedido recibido!'
        : `🛒 ¡${count} nuevos pedidos recibidos!`;
    showToast(message, 'success');

    // Flash the orders nav item
    const ordersNav = document.querySelector('[data-view="orders"]');
    if (ordersNav) {
        ordersNav.classList.add('notification-flash');
        setTimeout(() => ordersNav.classList.remove('notification-flash'), 3000);
    }
}

function startOrderNotifications() {
    // Initial check
    checkNewOrders();

    // Poll every 30 seconds
    if (orderNotificationInterval) clearInterval(orderNotificationInterval);
    orderNotificationInterval = setInterval(checkNewOrders, 30000);
}

function updateAlerts(stats) {
    const container = document.getElementById('alerts-container');
    const alerts = [];

    if (stats.escalated_conversations > 0) {
        alerts.push({
            type: 'warning',
            icon: '⚠️',
            message: `${stats.escalated_conversations} conversación(es) esperando atención`
        });
    }

    if (stats.low_stock_products > 0) {
        alerts.push({
            type: 'info',
            icon: '📦',
            message: `${stats.low_stock_products} producto(s) con stock bajo`
        });
    }

    if (alerts.length === 0) {
        container.innerHTML = '<p class="empty-message">✅ No hay alertas nuevas</p>';
    } else {
        container.innerHTML = alerts.map(a => `
            <div class="alert-item">
                <span class="alert-icon">${a.icon}</span>
                <span class="alert-message">${a.message}</span>
            </div>
        `).join('');
    }
}

// ============================================
// Products
// ============================================
async function loadProducts() {
    await filterProducts();
}

async function loadCategories() {
    try {
        const response = await authenticatedFetch(`${API_BASE}/products/categories/all`);
        if (response) {
            categories = await response.json();

            // Populate category filters
            const options = categories.map(c => `<option value="${c.id}">${c.icon} ${c.name}</option>`).join('');

            const productCategorySelect = document.getElementById('product-category');
            if (productCategorySelect) {
                productCategorySelect.innerHTML = '<option value="">Sin categoría</option>' + options;
            }
        }
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

function renderProducts(productsList) {
    const tbody = document.getElementById('products-tbody');

    if (productsList.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-message">No hay productos</td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = productsList.map(p => `
        <tr>
            <td>
                <div class="product-cell-name">
                    ${p.image_url ? `<img src="${p.image_url}" class="table-thumb" alt="${p.name}">` : ''}
                    <div>
                        <div class="font-bold">${p.name}</div>
                        <div class="text-sm text-gray">${p.brand || ''} ${p.model || ''}</div>
                    </div>
                </div>
            </td>
            <td>${p.category?.name || '-'}</td>
            <td>$${parseFloat(p.price).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
            <td>
                <span class="stock-badge ${p.stock < 10 ? 'low-stock' : 'in-stock'}">
                    ${p.stock}
                </span>
            </td>
            <td><span class="badge badge-${p.condition}">${capitalize(p.condition)}</span></td>
            <td>
                <label class="switch-sm">
                    <input type="checkbox" 
                        ${p.is_featured ? 'checked' : ''} 
                        onchange="toggleFeatured(${p.id}, this.checked)">
                    <span class="slider round"></span>
                </label>
            </td>
            <td>
                <div class="actions">
                    <button class="btn-icon" onclick='openProductModal(${JSON.stringify(p).replace(/'/g, "&#39;")})' title="Editar">✏️</button>
                    <button class="btn-icon" onclick="deleteProduct(${p.id})" title="Eliminar">🗑️</button>
                </div>
            </td>
        </tr>
    `).join('');
}

function initFilters() {
    // Search
<<<<<<< HEAD
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', debounce((e) => {
            filterProducts();
        }, 300));
    }
=======
    document.getElementById('search-input').addEventListener('input', debounce((e) => {
        filterProducts();
    }, 300));

    // Category filter
    document.getElementById('category-filter').addEventListener('change', filterProducts);
    document.getElementById('condition-filter').addEventListener('change', filterProducts);

    // Advanced Filters Events
    document.getElementById('toggle-advanced-filters')?.addEventListener('click', () => {
        const row = document.getElementById('advanced-filters-row');
        if (row) {
            row.style.display = row.style.display === 'none' ? 'flex' : 'none';
        }
    });

    ['brand-filter', 'model-filter', 'supplier-filter'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', debounce(() => filterProducts(), 500));
    });

    document.getElementById('status-filter')?.addEventListener('change', filterProducts);
    document.getElementById('low-stock-filter')?.addEventListener('change', filterProducts);

    document.getElementById('clear-filters')?.addEventListener('click', () => {
        document.getElementById('brand-filter').value = '';
        document.getElementById('model-filter').value = '';
        document.getElementById('supplier-filter').value = '';
        document.getElementById('status-filter').value = 'active'; // Default
        document.getElementById('low-stock-filter').checked = false;
        document.getElementById('search-input').value = '';
        document.getElementById('category-filter').value = '';
        document.getElementById('condition-filter').value = '';
        selectSection(null); // Resets section tabs
        filterProducts();
    });
>>>>>>> 43f9ece (Optimize frontend/backend, implement advanced admin search, and fix imports)
}

async function filterProducts() {
    const categoryId = currentSection;
    const searchInput = document.getElementById('search-input');
    const searchQuery = searchInput ? searchInput.value.trim() : '';

    // Advanced filters
    const brand = document.getElementById('brand-filter')?.value.trim();
    const model = document.getElementById('model-filter')?.value.trim();
    const supplier = document.getElementById('supplier-filter')?.value.trim();
    const lowStock = document.getElementById('low-stock-filter')?.checked;
    const status = document.getElementById('status-filter')?.value;

    let url = `${API_BASE}/products?`;
    if (categoryId) url += `category_id=${categoryId}&`;
    if (searchQuery) url += `search=${encodeURIComponent(searchQuery)}&`;

    if (brand) url += `brand=${encodeURIComponent(brand)}&`;
    if (model) url += `model=${encodeURIComponent(model)}&`;
    if (supplier) url += `supplier=${encodeURIComponent(supplier)}&`;
    if (lowStock) url += `low_stock=true&`;

    // Status logic: active (default=true), inactive (false), all (none)
    if (status === 'inactive') {
        url += `is_active=false&`;
    } else if (status === 'all') {
        url += `show_hidden=true&`;
    } else {
        // Default active
        url += `is_active=true&`;
    }

    try {
        const response = await authenticatedFetch(url);
        if (response) {
            products = await response.json();
            renderProducts(products);
        }
    } catch (error) {
        console.error('Error filtering products:', error);
        showToast('Error cargando productos', 'error');
    }
}


// ============================================
// Product Modal
// ============================================
function initProductModal() {
    const modal = document.getElementById('product-modal');
    const form = document.getElementById('product-form');

    document.getElementById('add-product-btn').addEventListener('click', () => {
        openProductModal();
    });

    document.getElementById('close-modal').addEventListener('click', closeModal);
    document.getElementById('cancel-modal').addEventListener('click', closeModal);

    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveProduct();
    });
}

function openProductModal(product = null) {
    const modal = document.getElementById('product-modal');
    const title = document.getElementById('modal-title');
    const preview = document.getElementById('image-preview');

    if (product) {
        title.textContent = 'Editar Producto';
        editingProductId = product.id;

        document.getElementById('product-id').value = product.id;
        document.getElementById('product-name').value = product.name;
        document.getElementById('product-category').value = product.category_id || '';
        document.getElementById('product-brand').value = product.brand || '';
        document.getElementById('product-model').value = product.model || '';
        document.getElementById('product-color').value = product.color || '';
        document.getElementById('product-storage').value = product.storage || '';
        document.getElementById('product-cost-price').value = product.cost_price || '';
        document.getElementById('product-price').value = product.price || '';
        document.getElementById('product-stock').value = product.stock;
        document.getElementById('product-supplier').value = product.supplier || '';
        document.getElementById('product-condition').value = product.condition || 'nuevo';
        document.getElementById('product-active').value = product.is_active.toString();
        document.getElementById('product-description').value = product.description || '';
        document.getElementById('product-image').value = product.image_url || '';

        // Show image preview if exists
        if (product.image_url) {
            preview.innerHTML = `<img src="${product.image_url}" alt="Preview">`;
        } else {
            preview.innerHTML = '<span class="preview-placeholder">Vista previa</span>';
        }
    } else {
        title.textContent = 'Nuevo Producto';
        editingProductId = null;
        document.getElementById('product-form').reset();
        preview.innerHTML = '<span class="preview-placeholder">Vista previa</span>';
    }

    modal.classList.add('active');
}

// Handle image file upload
async function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const preview = document.getElementById('image-preview');
    const imageUrlInput = document.getElementById('product-image');

    // Show loading state
    preview.innerHTML = '<span class="preview-placeholder">Subiendo...</span>';

    try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await authenticatedFetch(`${API_BASE}/upload/image`, {
            method: 'POST',
            body: formData
        });

        if (response && response.ok) {
            const result = await response.json();

            // Set the URL in the input field
            imageUrlInput.value = result.image_url;

            // Show preview
            preview.innerHTML = `<img src="${result.image_url}" alt="Preview">`;

            showToast('Imagen subida correctamente', 'success');
        } else {
            const error = await response.json();
            showToast(error.detail || 'Error subiendo imagen', 'error');
            preview.innerHTML = '<span class="preview-placeholder">Error</span>';
        }
    } catch (error) {
        console.error('Upload error:', error);
        showToast('Error subiendo imagen', 'error');
        preview.innerHTML = '<span class="preview-placeholder">Error</span>';
    }

    // Reset file input
    event.target.value = '';
}

function closeModal() {
    document.getElementById('product-modal').classList.remove('active');
    document.getElementById('user-modal')?.classList.remove('active');
    editingProductId = null;
}

async function saveProduct() {
    const costPriceVal = document.getElementById('product-cost-price').value;
    const priceVal = document.getElementById('product-price').value;

    const data = {
        name: document.getElementById('product-name').value,
        category_id: document.getElementById('product-category').value || null,
        brand: document.getElementById('product-brand').value || null,
        model: document.getElementById('product-model').value || null,
        color: document.getElementById('product-color').value || null,
        storage: document.getElementById('product-storage').value || null,
        cost_price: costPriceVal ? parseFloat(costPriceVal) : null,
        price: priceVal ? parseFloat(priceVal) : null,
        stock: parseInt(document.getElementById('product-stock').value),
        supplier: document.getElementById('product-supplier').value || null,
        condition: document.getElementById('product-condition').value,
        is_active: document.getElementById('product-active').value === 'true',
        description: document.getElementById('product-description').value || null,
        image_url: document.getElementById('product-image').value || null
    };

    try {
        let response;
        if (editingProductId) {
            response = await authenticatedFetch(`${API_BASE}/products/${editingProductId}`, {
                method: 'PUT',
                body: JSON.stringify(data)
            });
        } else {
            response = await authenticatedFetch(`${API_BASE}/products`, {
                method: 'POST',
                body: JSON.stringify(data)
            });
        }

        if (response && response.ok) {
            showToast(editingProductId ? 'Producto actualizado' : 'Producto creado', 'success');
            closeModal();
            loadProducts();
        } else if (response) {
            const error = await response.json();
            showToast(error.detail || 'Error guardando producto', 'error');
        }
    } catch (error) {
        console.error('Error saving product:', error);
        showToast('Error guardando producto', 'error');
    }
}

async function editProduct(id) {
    const product = products.find(p => p.id === id);
    if (product) {
        openProductModal(product);
    }
}

async function deleteProduct(id) {
    if (!confirm('¿Estás seguro de eliminar este producto?')) return;

    try {
        const response = await authenticatedFetch(`${API_BASE}/products/${id}`, {
            method: 'DELETE'
        });

        if (response && response.ok) {
            showToast('Producto eliminado', 'success');
            loadProducts();
        }
    } catch (error) {
        showToast('Error eliminando producto', 'error');
    }
}

// ============================================
// User Management
// ============================================
function initUserManagement() {
    document.getElementById('add-user-btn')?.addEventListener('click', () => {
        openUserModal();
    });

    document.getElementById('user-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveUser();
    });

    document.getElementById('close-user-modal')?.addEventListener('click', closeModal);

    // Search listener
    document.getElementById('user-search-input')?.addEventListener('input', () => {
        filterUsers();
    });
}

function filterUsers() {
    const query = document.getElementById('user-search-input').value.toLowerCase().trim();

    if (!query) {
        renderUsers(users);
        return;
    }

    const filtered = users.filter(u =>
        u.username.toLowerCase().includes(query) ||
        (u.role === 'admin' ? 'administrador' : 'empleado').toLowerCase().includes(query)
    );

    renderUsers(filtered);
}

async function loadUsers() {
    try {
        const response = await authenticatedFetch(`${API_BASE}/users`);
        if (response) {
            users = await response.json();
            renderUsers(users);
        }
    } catch (error) {
        console.error('Error loading users:', error);
        showToast('Error cargando usuarios', 'error');
    }
}

function renderUsers(usersList) {
    const tbody = document.getElementById('users-tbody');
    if (!tbody) return;

    if (usersList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="empty-message">No hay usuarios</td></tr>`;
        return;
    }

    tbody.innerHTML = usersList.map(u => `
        <tr>
            <td>${u.username}</td>
            <td><span class="badge badge-${u.role === 'admin' ? 'reacondicionado' : 'nuevo'}">${u.role === 'admin' ? 'Administrador' : 'Empleado'}</span></td>
            <td><span class="badge badge-${u.is_active ? 'active' : 'closed'}">${u.is_active ? 'Activo' : 'Inactivo'}</span></td>
            <td>
                <div class="actions">
                    <button class="btn-icon" onclick="deleteUser(${u.id})" title="Eliminar">🗑️</button>
                </div>
            </td>
        </tr>
    `).join('');
}

function openUserModal() {
    document.getElementById('user-modal').classList.add('active');
    document.getElementById('user-form').reset();
}

async function saveUser() {
    const data = {
        username: document.getElementById('user-username').value,
        password: document.getElementById('user-password').value,
        role: document.getElementById('user-role').value,
        is_active: true
    };

    try {
        const response = await authenticatedFetch(`${API_BASE}/users`, {
            method: 'POST',
            body: JSON.stringify(data)
        });

        if (response && response.ok) {
            showToast('Usuario creado exitosamente', 'success');
            closeModal();
            loadUsers();
        } else if (response) {
            const error = await response.json();
            showToast(error.detail || 'Error creando usuario', 'error');
        }
    } catch (error) {
        showToast('Error creando usuario', 'error');
    }
}

async function deleteUser(id) {
    if (!confirm('¿Estás seguro de eliminar este usuario?')) return;

    try {
        const response = await authenticatedFetch(`${API_BASE}/users/${id}`, {
            method: 'DELETE'
        });

        if (response && response.ok) {
            showToast('Usuario eliminado', 'success');
            loadUsers();
        } else if (response) {
            const error = await response.json();
            showToast(error.detail || 'Error eliminando usuario', 'error');
        }
    } catch (error) {
        showToast('Error eliminando usuario', 'error');
    }
}


// ============================================
// Conversations
// ============================================
async function loadConversations() {
    try {
        const status = document.getElementById('conv-status-filter')?.value || '';
        const platform = document.getElementById('conv-platform-filter')?.value || '';

        let url = `${API_BASE}/webhook/conversations?`;
        if (status) url += `status=${status}&`;
        if (platform) url += `platform=${platform}&`;

        const response = await authenticatedFetch(url);
        if (response) {
            conversations = await response.json();
            renderConversations(conversations);
        }
    } catch (error) {
        console.error('Error loading conversations:', error);
    }
}

function renderConversations(convsList) {
    const container = document.getElementById('conversations-list');

    if (convsList.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">💬</span>
                <p>No hay conversaciones</p>
            </div>
        `;
        return;
    }

    container.innerHTML = convsList.map(c => `
        <div class="conversation-item" onclick="selectConversation(${c.id})" data-id="${c.id}">
            <div class="conversation-header">
                <span class="conversation-sender">${c.sender_name || `Usuario ${c.sender_id.slice(-4)}`}</span>
                <span class="badge badge-${c.status}">${capitalize(c.status)}</span>
            </div>
            <div class="conversation-preview">
                <span class="conversation-platform">${c.platform === 'instagram' ? '📷' : '📱'} ${capitalize(c.platform)}</span>
            </div>
        </div>
    `).join('');
}

async function selectConversation(id) {
    // Update active state
    document.querySelectorAll('.conversation-item').forEach(item => {
        item.classList.toggle('active', item.dataset.id === id.toString());
    });

    // Load messages
    try {
        const response = await authenticatedFetch(`${API_BASE}/webhook/conversations/${id}/messages`);
        if (response) {
            const messages = await response.json();

            const container = document.getElementById('conversation-detail');
            container.innerHTML = `
                <div class="conversation-messages">
                    ${messages.map(m => `
                        <div class="message ${m.sender_type === 'customer' ? 'user' : 'bot'}">
                            <div class="message-content">${m.content}</div>
                        </div>
                    `).join('')}
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading messages:', error);
    }
}

// ============================================
// Chat Test
// ============================================
function initChatTest() {
    const input = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-chat-btn');

    sendBtn?.addEventListener('click', sendTestMessage);
    input?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendTestMessage();
    });
}

async function sendTestMessage() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    if (!message) return;

    // Add user message to chat
    addChatMessage(message, 'user');
    input.value = '';

    // Send to API
    try {
        const response = await authenticatedFetch(`${API_BASE}/webhook/test`, {
            method: 'POST',
            body: JSON.stringify({
                query: message,
                sender_id: 'test_user',
                platform: 'web'
            })
        });

        if (response) {
            const data = await response.json();
            addChatMessage(data.message, 'bot');

            if (data.should_escalate) {
                addChatMessage('⚠️ [Sistema] Esta conversación sería escalada a un asesor humano.', 'bot');
            }
        }
    } catch (error) {
        console.error('Error sending message:', error);
        addChatMessage('Error: No se pudo conectar con el servidor', 'bot');
    }
}

function addChatMessage(content, type) {
    const container = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.innerHTML = `<div class="message-content">${escapeHtml(content)}</div>`;
    container.appendChild(messageDiv);
    container.scrollTop = container.scrollHeight;
}

// ============================================
// Utilities
// ============================================
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.querySelector('.toast-message').textContent = message;
    toast.className = `toast ${type} active`;

    setTimeout(() => {
        toast.classList.remove('active');
    }, 3000);
}

function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Initialize conversation filters
document.getElementById('conv-status-filter')?.addEventListener('change', loadConversations);
document.getElementById('conv-platform-filter')?.addEventListener('change', loadConversations);

// ============================================
// Orders Management
// ============================================
async function loadOrders() {
    try {
        const status = document.getElementById('order-status-filter')?.value || '';
        let url = `${API_BASE}/orders/all`;
        if (status) url += `?status=${status}`;

        const response = await authenticatedFetch(url);
        if (response) {
            orders = await response.json();
            filterOrders(); // Apply client-side search if any
        }
    } catch (error) {
        console.error('Error loading orders:', error);
        showToast('Error cargando órdenes', 'error');
    }
}

function filterOrders() {
    const searchTerm = document.getElementById('order-search-input')?.value.toLowerCase().trim() || '';

    let filteredOrders = orders;

    if (searchTerm) {
        filteredOrders = orders.filter(o =>
            o.order_number.toLowerCase().includes(searchTerm) ||
            (o.customer?.business_name || '').toLowerCase().includes(searchTerm) ||
            (o.customer?.email || '').toLowerCase().includes(searchTerm)
        );
    }

    renderOrders(filteredOrders);
}

function renderOrders(ordersList) {
    const tbody = document.getElementById('orders-tbody');
    if (!tbody) return;

    if (ordersList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="empty-message">No hay órdenes</td></tr>`;
        return;
    }

    const statusColors = {
        'pendiente': 'orange',
        'confirmado': 'blue',
        'preparando': 'purple',
        'enviado': 'teal',
        'entregado': 'green',
        'cancelado': 'red'
    };

    tbody.innerHTML = ordersList.map(o => `
        <tr>
            <td><strong>#${o.order_number}</strong></td>
            <td>${o.customer?.business_name || 'Cliente'}</td>
            <td>${o.items?.length || 0} productos</td>
            <td>$${parseFloat(o.total_amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
            <td>
                <select class="status-select ${statusColors[o.status] || ''}" onchange="updateOrderStatus(${o.id}, this.value)">
                    <option value="pendiente" ${o.status === 'pendiente' ? 'selected' : ''}>Pendiente</option>
                    <option value="confirmado" ${o.status === 'confirmado' ? 'selected' : ''}>Confirmado</option>
                    <option value="preparando" ${o.status === 'preparando' ? 'selected' : ''}>Preparando</option>
                    <option value="enviado" ${o.status === 'enviado' ? 'selected' : ''}>Enviado</option>
                    <option value="entregado" ${o.status === 'entregado' ? 'selected' : ''}>Entregado</option>
                    <option value="cancelado" ${o.status === 'cancelado' ? 'selected' : ''}>Cancelado</option>
                </select>
            </td>
            <td>${new Date(o.created_at).toLocaleDateString('es-MX')}</td>
            <td>
                <button class="btn-icon" onclick="viewOrderDetails(${o.id})" title="Ver detalles">👁️</button>
            </td>
        </tr>
    `).join('');
}

async function updateOrderStatus(orderId, newStatus) {
    try {
        const response = await authenticatedFetch(`${API_BASE}/orders/${orderId}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status: newStatus })
        });

        if (response && response.ok) {
            showToast('Estado actualizado', 'success');
            loadOrders();
            loadDashboardStats();
        } else {
            showToast('Error actualizando estado', 'error');
        }
    } catch (error) {
        console.error('Error updating order status:', error);
        showToast('Error actualizando estado', 'error');
    }
}

async function viewOrderDetails(orderId) {
    try {
        const response = await authenticatedFetch(`${API_BASE}/orders/${orderId}`);
        if (response) {
            const order = await response.json();

            const itemsHtml = order.items.map(item => `
                <tr>
                    <td>${item.product?.name || 'Producto'}</td>
                    <td>${item.quantity}</td>
                    <td>$${parseFloat(item.unit_price).toFixed(2)}</td>
                    <td>$${parseFloat(item.total_price).toFixed(2)}</td>
                </tr>
            `).join('');

            const detailsHtml = `
                <div class="modal-overlay active" id="order-detail-modal">
                    <div class="modal" style="max-width: 600px;">
                        <div class="modal-header">
                            <h2>Orden #${order.order_number}</h2>
                            <button class="modal-close" onclick="closeOrderModal()">&times;</button>
                        </div>
                        <div class="modal-body">
                            <p><strong>Cliente:</strong> ${order.customer?.business_name || 'N/A'}</p>
                            <p><strong>Email:</strong> ${order.customer?.email || 'N/A'}</p>
                            <p><strong>Estado:</strong> ${capitalize(order.status)}</p>
                            <p><strong>Dirección:</strong> ${order.shipping_address || 'N/A'}</p>
                            <h4 style="margin-top: 20px;">Productos</h4>
                            <table class="data-table" style="margin-top: 10px;">
                                <thead>
                                    <tr>
                                        <th>Producto</th>
                                        <th>Cant.</th>
                                        <th>P. Unit.</th>
                                        <th>Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody>${itemsHtml}</tbody>
                            </table>
                            <p style="margin-top: 20px; text-align: right; font-size: 1.2em;">
                                <strong>Total: $${parseFloat(order.total_amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong>
                            </p>
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', detailsHtml);
        }
    } catch (error) {
        console.error('Error loading order details:', error);
        showToast('Error cargando detalles', 'error');
    }
}

function closeOrderModal() {
    const modal = document.getElementById('order-detail-modal');
    if (modal) modal.remove();
}

// Initialize order filter
document.getElementById('order-status-filter')?.addEventListener('change', loadOrders);

// ============================================
// Export Orders to Excel
// ============================================
async function exportOrdersToExcel() {
    try {
        showToast('Preparando exportación...', 'info');

        // Fetch all orders with details
        const response = await authenticatedFetch(`${API_BASE}/orders/all`);
        if (!response) {
            showToast('Error obteniendo órdenes', 'error');
            return;
        }

        const allOrders = await response.json();

        if (allOrders.length === 0) {
            showToast('No hay órdenes para exportar', 'warning');
            return;
        }

        // Create rows array - one row per product sold
        const rows = [];

        // Header row
        rows.push([
            'N° Orden',
            'Fecha',
            'Cliente',
            'Email Cliente',
            'Teléfono',
            'Ciudad',
            'Producto',
            'Cantidad',
            'Precio Unitario',
            'Subtotal',
            'Estado Orden',
            'Dirección Envío'
        ]);

        // Data rows - extract each product from each order
        for (const order of allOrders) {
            const orderDate = new Date(order.created_at).toLocaleDateString('es-CO');
            const customerName = order.customer?.business_name || 'Sin nombre';
            const customerEmail = order.customer?.email || '';
            const customerPhone = order.customer?.phone || '';
            const customerCity = order.customer?.city || '';

            if (order.items && order.items.length > 0) {
                for (const item of order.items) {
                    rows.push([
                        order.order_number,
                        orderDate,
                        customerName,
                        customerEmail,
                        customerPhone,
                        customerCity,
                        item.product?.name || 'Producto eliminado',
                        item.quantity,
                        parseFloat(item.unit_price).toFixed(0),
                        parseFloat(item.total_price).toFixed(0),
                        capitalize(order.status),
                        order.shipping_address || ''
                    ]);
                }
            } else {
                // Order without items (shouldn't happen, but just in case)
                rows.push([
                    order.order_number,
                    orderDate,
                    customerName,
                    customerEmail,
                    customerPhone,
                    customerCity,
                    'Sin productos',
                    0,
                    0,
                    0,
                    capitalize(order.status),
                    order.shipping_address || ''
                ]);
            }
        }

        // Convert to CSV
        const csvContent = rows.map(row =>
            row.map(cell => {
                // Escape quotes and wrap in quotes if contains comma or quote
                const cellStr = String(cell).replace(/"/g, '""');
                return cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')
                    ? `"${cellStr}"`
                    : cellStr;
            }).join(',')
        ).join('\n');

        // Add BOM for Excel to recognize UTF-8
        const BOM = '\uFEFF';
        const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });

        // Create download link
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        const fileName = `ventas_bodega_${new Date().toISOString().split('T')[0]}.csv`;

        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showToast(`Exportado: ${rows.length - 1} productos vendidos`, 'success');

    } catch (error) {
        console.error('Error exporting orders:', error);
        showToast('Error exportando órdenes', 'error');
    }
}

// ============================================
// Import Products from Excel/CSV
// ============================================

// Download CSV template for importing products
async function downloadProductTemplate() {
    try {
        showToast('Generando inventario...', 'info');

        // Fetch all products from API
        const response = await authenticatedFetch(`${API_BASE}/products?is_active=true&limit=1000`);
        if (!response) {
            showToast('Error obteniendo productos', 'error');
            return;
        }

        const allProducts = await response.json();

        const headers = [
            'id',
            'nombre',
            'marca',
            'modelo',
            'categoria_id',
            'categoria',
            'precio',
            'precio_mayoreo',
            'cantidad_min_mayoreo',
            'stock',
            'descripcion',
            'condicion',
            'url_imagen'
        ];

        // Build rows
        const rows = [headers.join(';')];

        for (const p of allProducts) {
            const row = [
                p.id || '',
                (p.name || '').replace(/;/g, ','),
                (p.brand || '').replace(/;/g, ','),
                (p.model || '').replace(/;/g, ','),
                p.category_id || '',
                p.category?.name || '',
                p.price || 0,
                p.wholesale_price || '',
                p.min_wholesale_qty || 3,
                p.stock || 0,
                (p.description || '').replace(/;/g, ',').replace(/\n/g, ' '),
                p.condition || 'nuevo',
                p.image_url || ''
            ];
            rows.push(row.join(';'));
        }

        // Add notes at the end
        rows.push('');
        rows.push('# NOTAS PARA IMPORTAR:');
        rows.push('# - categoria_id: 1=Apple; 2=Android; 3=Cacharros; 4=Accesorios');
        rows.push('# - condicion: nuevo; usado; reacondicionado');
        rows.push('# - Para agregar nuevos productos; deja el campo "id" vacio');
        rows.push('# - Elimina estas lineas antes de importar');

        const content = rows.join('\n');
        const BOM = '\uFEFF';
        const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8;' });

        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        const fecha = new Date().toISOString().split('T')[0];
        link.download = `inventario_productos_${fecha}.csv`;
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showToast(`Exportados ${allProducts.length} productos`, 'success');

    } catch (error) {
        console.error('Error downloading products:', error);
        showToast('Error exportando productos', 'error');
    }
}

// Handle file import
async function handleImportFile(event) {
    console.log('File handler started');
    const file = event.target.files[0];
    if (!file) {
        console.log('No file');
        return;
    }

    // Reset input so same file can be selected again
    event.target.value = '';

    const fileName = file.name.toLowerCase();
    console.log('Selected file:', fileName);

    if (fileName.endsWith('.csv')) {
        await importFromCSV(file);
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        console.log('Calling importFromExcel...');
        await importFromExcel(file);
    } else {
        showToast('Formato no soportado. Usa CSV o Excel', 'error');
        return;
    }
}

// Import Excel file
async function importFromExcel(file) {
    const formData = new FormData();
    formData.append('file', file);

    // If a section is currently selected (and not "All"), use it as default category
    if (currentSection) {
        formData.append('category_id', currentSection);
    }

    try {
        showToast('Subiendo y procesando Excel...', 'info');

        const response = await authenticatedFetch(`${API_BASE}/import/excel`, {
            method: 'POST',
            body: formData
            // Note: Content-Type header is automatically handled by browser/fetch for FormData
        });

        if (response && response.ok) {
            const result = await response.json();

            if (result.success) {
                let msg = `Importación exitosa: ${result.products_created} creados, ${result.products_updated} actualizados`;
                if (result.errors && result.errors.length > 0) {
                    msg += `. Hubo ${result.total_errors} errores en filas (ver consola)`;
                    console.warn('Errores de importación:', result.errors);
                }
                showToast(msg, 'success');
                loadProducts(); // Reload list
            }
        } else if (response) {
            const error = await response.json();
            showToast(error.detail || 'Error importando archivo', 'error');
        }
    } catch (error) {
        console.error('Error uploading excel:', error);
        showToast('Error de conexión o servidor', 'error');
    }
}

// Parse and import CSV file
async function importFromCSV(file) {
    try {
        showToast('Procesando archivo...', 'info');

        const text = await file.text();
        const lines = text.split('\n').filter(line =>
            line.trim() && !line.trim().startsWith('#')
        );

        if (lines.length < 2) {
            showToast('El archivo está vacío o solo tiene encabezados', 'error');
            return;
        }

        // Parse header
        const headers = parseCSVLine(lines[0]);
        const expectedHeaders = ['nombre', 'marca', 'modelo', 'categoria_id', 'precio',
            'precio_mayoreo', 'cantidad_min_mayoreo', 'stock',
            'descripcion', 'condicion', 'url_imagen'];

        // Map headers to indices
        const headerMap = {};
        headers.forEach((h, i) => {
            const normalized = h.toLowerCase().trim()
                .replace(/á/g, 'a').replace(/é/g, 'e')
                .replace(/í/g, 'i').replace(/ó/g, 'o').replace(/ú/g, 'u');
            headerMap[normalized] = i;
        });

        // Parse data rows
        const products = [];
        let errors = [];

        for (let i = 1; i < lines.length; i++) {
            const values = parseCSVLine(lines[i]);
            if (values.length < 5) continue; // Skip incomplete rows

            try {
                const product = {
                    name: values[headerMap['nombre']] || '',
                    brand: values[headerMap['marca']] || '',
                    model: values[headerMap['modelo']] || '',
                    category_id: parseInt(values[headerMap['categoria_id']]) || 1,
                    price: parseFloat(values[headerMap['precio']]) || 0,
                    wholesale_price: parseFloat(values[headerMap['precio_mayoreo']]) || null,
                    min_wholesale_qty: parseInt(values[headerMap['cantidad_min_mayoreo']]) || 3,
                    stock: parseInt(values[headerMap['stock']]) || 0,
                    description: values[headerMap['descripcion']] || '',
                    condition: values[headerMap['condicion']] || 'nuevo',
                    image_url: values[headerMap['url_imagen']] || '',
                    is_active: true
                };

                if (!product.name || product.price <= 0) {
                    errors.push(`Fila ${i + 1}: Nombre o precio inválido`);
                    continue;
                }

                products.push(product);
            } catch (e) {
                errors.push(`Fila ${i + 1}: Error de formato`);
            }
        }

        if (products.length === 0) {
            showToast('No se encontraron productos válidos', 'error');
            return;
        }

        // Show confirmation
        if (!confirm(`¿Importar ${products.length} productos?${errors.length > 0 ? '\n\nAdvertencias:\n' + errors.slice(0, 5).join('\n') : ''}`)) {
            return;
        }

        // Import products one by one
        let imported = 0;
        let failed = 0;

        for (const product of products) {
            try {
                const response = await authenticatedFetch(`${API_BASE}/products`, {
                    method: 'POST',
                    body: JSON.stringify(product)
                });

                if (response && response.ok) {
                    imported++;
                } else {
                    failed++;
                }
            } catch (e) {
                failed++;
            }
        }

        // Reload products list
        loadProducts();
        loadDashboardStats();

        if (failed === 0) {
            showToast(`✅ ${imported} productos importados exitosamente`, 'success');
        } else {
            showToast(`Importados: ${imported}, Fallidos: ${failed}`, 'warning');
        }

    } catch (error) {
        console.error('Error importing CSV:', error);
        showToast('Error procesando archivo', 'error');
    }
}

// Parse CSV line handling quoted values (supports both , and ; as separators)
function parseCSVLine(line, separator = null) {
    // Auto-detect separator if not specified
    if (!separator) {
        // Count occurrences of ; and , outside quotes
        let semicolonCount = 0;
        let commaCount = 0;
        let inQuotes = false;
        for (const char of line) {
            if (char === '"') inQuotes = !inQuotes;
            else if (!inQuotes) {
                if (char === ';') semicolonCount++;
                else if (char === ',') commaCount++;
            }
        }
        separator = semicolonCount >= commaCount ? ';' : ',';
    }

    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === separator && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }

    result.push(current.trim());
    return result;
}

// ============================================
// Mobile Menu
// ============================================
function initMobileMenu() {
    const toggle = document.getElementById('mobile-menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    if (!toggle || !sidebar || !overlay) return;

    function toggleMenu() {
        sidebar.classList.toggle('active');
        overlay.classList.toggle('active');
    }

    function closeMenu() {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
    }

    toggle.addEventListener('click', toggleMenu);
    overlay.addEventListener('click', closeMenu);

    // Close menu when clicking a nav item (UX improvement)
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                closeMenu();
            }
        });
    });
}
