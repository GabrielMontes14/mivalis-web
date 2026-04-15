// Dashboard Main Controller
if (!Auth.requireAuth()) throw new Error('Not authenticated');

let currentSection = 'dashboard';
const contentArea = document.getElementById('contentArea');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    updateUserInfo();
    updateBadges();
    loadSection('dashboard');
    setupNavigation();
    setupGlobalSearch();
});

function updateUserInfo() {
    const session = Auth.getSession();
    if (session) {
        document.getElementById('userName').textContent = session.name;
        document.getElementById('userAvatar').textContent = session.name.charAt(0).toUpperCase();
    }
}

function updateBadges() {
    const stats = DataService.getStats();
    document.getElementById('lowStockBadge').textContent = stats.lowStock;
    document.getElementById('pendingBadge').textContent = stats.pendingOrders;
    document.getElementById('notifBadge').textContent = stats.pendingOrders + stats.lowStock;
}

function setupNavigation() {
    document.querySelectorAll('.nav-item[data-section]').forEach(item => {
        item.addEventListener('click', () => {
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            loadSection(item.dataset.section);
        });
    });
    document.getElementById('userDropdown').addEventListener('click', function () {
        this.classList.toggle('active');
    });
}

function setupGlobalSearch() {
    const searchInput = document.getElementById('globalSearch');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();

            // Solo filtrar si estamos en la sección de productos
            if (currentSection === 'products') {
                const productSearchInput = document.getElementById('productSearch');
                if (productSearchInput) {
                    productSearchInput.value = searchTerm;
                    filterProducts();
                }
            }
        });
    }
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('collapsed');
}

function loadSection(section) {
    currentSection = section;
    const titles = { dashboard: 'Dashboard', products: 'Productos', inventory: 'Inventario', customers: 'Clientes', orders: 'Pedidos', invoices: 'Facturas', reports: 'Reportes' };
    document.getElementById('pageTitle').textContent = titles[section] || 'Dashboard';

    const loaders = {
        dashboard: renderDashboard,
        products: renderProducts,
        inventory: renderInventory,
        customers: renderCustomers,
        orders: renderOrders,
        invoices: renderInvoices,
        reports: renderReports
    };
    (loaders[section] || renderDashboard)();
}

// ========== DASHBOARD ==========
function renderDashboard() {
    const stats = DataService.getStats();
    contentArea.innerHTML = `
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-info">
                    <h3>Ventas Totales</h3>
                    <div class="value">$${stats.totalSales.toLocaleString()}</div>
                    <div class="change positive"><i class="fas fa-arrow-up"></i> 12.5%</div>
                </div>
                <div class="stat-icon blue"><i class="fas fa-dollar-sign"></i></div>
            </div>
            <div class="stat-card">
                <div class="stat-info">
                    <h3>Pedidos Pendientes</h3>
                    <div class="value">${stats.pendingOrders}</div>
                    <div class="change ${stats.pendingOrders > 5 ? 'negative' : 'positive'}"><i class="fas fa-clock"></i> Por atender</div>
                </div>
                <div class="stat-icon yellow"><i class="fas fa-shopping-cart"></i></div>
            </div>
            <div class="stat-card">
                <div class="stat-info">
                    <h3>Productos</h3>
                    <div class="value">${stats.totalProducts}</div>
                    <div class="change positive"><i class="fas fa-box"></i> En catálogo</div>
                </div>
                <div class="stat-icon green"><i class="fas fa-boxes"></i></div>
            </div>
            <div class="stat-card">
                <div class="stat-info">
                    <h3>Stock Bajo</h3>
                    <div class="value">${stats.lowStock}</div>
                    <div class="change negative"><i class="fas fa-exclamation-triangle"></i> Requieren atención</div>
                </div>
                <div class="stat-icon red"><i class="fas fa-warehouse"></i></div>
            </div>
        </div>
        <div class="grid-2">
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-chart-line"></i> Ventas del Mes</h3></div>
                <div class="card-body"><div class="chart-container"><canvas id="salesChart"></canvas></div></div>
            </div>
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-clock"></i> Pedidos Recientes</h3></div>
                <div class="card-body">${renderRecentOrders()}</div>
            </div>
        </div>
        <div class="grid-2 mt-3">
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-exclamation-circle"></i> Productos con Bajo Stock</h3></div>
                <div class="card-body">${renderLowStock()}</div>
            </div>
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-trophy"></i> Top Clientes</h3></div>
                <div class="card-body">${renderTopCustomers()}</div>
            </div>
        </div>
    `;
    renderSalesChart();
}

function renderRecentOrders() {
    const orders = DataService.getOrders().slice(-5).reverse();
    if (!orders.length) return '<div class="empty-state"><i class="fas fa-inbox"></i><h3>Sin pedidos</h3></div>';
    return `<div class="table-container"><table class="data-table"><thead><tr><th>Cliente</th><th>Total</th><th>Estado</th></tr></thead><tbody>
        ${orders.map(o => `<tr><td>${o.customerName}</td><td class="price">$${o.total}</td><td><span class="badge badge-${getStatusClass(o.status)}">${o.status}</span></td></tr>`).join('')}
    </tbody></table></div>`;
}

function renderLowStock() {
    const products = DataService.getProducts().filter(p => p.stock < 10);
    if (!products.length) return '<div class="empty-state"><i class="fas fa-check-circle"></i><h3>Todo en orden</h3><p>No hay productos con bajo stock</p></div>';
    return `<div class="table-container"><table class="data-table"><thead><tr><th>Producto</th><th>Stock</th></tr></thead><tbody>
        ${products.map(p => `<tr><td>${p.name}</td><td><span class="badge badge-danger">${p.stock} unidades</span></td></tr>`).join('')}
    </tbody></table></div>`;
}

function renderTopCustomers() {
    const customers = DataService.getCustomers().slice(0, 5);
    return `<div class="table-container"><table class="data-table"><thead><tr><th>Cliente</th><th>Límite Crédito</th></tr></thead><tbody>
        ${customers.map(c => `<tr><td>${c.name}</td><td class="price">$${c.creditLimit.toLocaleString()}</td></tr>`).join('')}
    </tbody></table></div>`;
}

function renderSalesChart() {
    const ctx = document.getElementById('salesChart');
    if (!ctx) return;
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
            datasets: [{ label: 'Ventas', data: [1200, 1900, 1500, 2100, 1800, 2400, 2000], borderColor: '#1a365d', backgroundColor: 'rgba(26,54,93,0.1)', fill: true, tension: 0.4 }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
}

// ========== PRODUCTS ==========
function renderProducts() {
    const products = DataService.getProducts();
    const categories = [...new Set(products.map(p => p.category))];
    contentArea.innerHTML = `
        <div class="filter-bar">
            <div class="search-box"><input type="text" placeholder="Buscar producto..." id="productSearch" onkeyup="filterProducts()"><i class="fas fa-search"></i></div>
            <select id="categoryFilter" onchange="filterProducts()"><option value="">Todas las categorías</option>${categories.map(c => `<option value="${c}">${c.charAt(0).toUpperCase() + c.slice(1)}</option>`).join('')}</select>
            <button class="btn btn-primary" onclick="openProductModal()"><i class="fas fa-plus"></i> Nuevo Producto</button>
        </div>
        <div class="card"><div class="card-body"><div class="table-container"><table class="data-table" id="productsTable"><thead><tr><th>Producto</th><th>Categoría</th><th>Precio</th><th>Stock</th><th>Acciones</th></tr></thead><tbody>
            ${products.map(p => renderProductRow(p)).join('')}
        </tbody></table></div></div></div>
    `;
}

function renderProductRow(p) {
    const stockLevel = p.stock > 50 ? 'high' : p.stock > 10 ? 'medium' : 'low';
    return `<tr data-id="${p.id}" data-category="${p.category}" data-name="${p.name.toLowerCase()}">
        <td><div class="product-info"><div class="product-image"><i class="fas fa-box" style="font-size:1.5rem;color:var(--text-light);padding:12px;"></i></div><div class="details"><h4>${p.name}</h4><span>SKU: ${p.sku}</span></div></div></td>
        <td><span class="badge badge-info">${p.category}</span></td>
        <td class="price">$${p.price.toFixed(2)}</td>
        <td><div class="stock-indicator"><div class="stock-bar"><div class="stock-bar-fill ${stockLevel}" style="width:${Math.min(p.stock, 100)}%"></div></div><span>${p.stock}</span></div></td>
        <td><div class="action-buttons"><button class="action-btn edit" onclick="openProductModal(${p.id})"><i class="fas fa-edit"></i></button><button class="action-btn delete" onclick="deleteProduct(${p.id})"><i class="fas fa-trash"></i></button></div></td>
    </tr>`;
}

function filterProducts() {
    const search = document.getElementById('productSearch').value.toLowerCase();
    const category = document.getElementById('categoryFilter').value;
    document.querySelectorAll('#productsTable tbody tr').forEach(row => {
        const matchName = row.dataset.name.includes(search);
        const matchCat = !category || row.dataset.category === category;
        row.style.display = matchName && matchCat ? '' : 'none';
    });
}

function openProductModal(id = null) {
    const product = id ? DataService.getProducts().find(p => p.id === id) : null;
    showModal(`${id ? 'Editar' : 'Nuevo'} Producto`, `
        <form id="productForm">
            <div class="form-row">
                <div class="form-group"><label>Nombre</label><input type="text" name="name" value="${product?.name || ''}" required></div>
                <div class="form-group"><label>SKU</label><input type="text" name="sku" value="${product?.sku || ''}" required></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Categoría</label><select name="category" required><option value="abarrotes" ${product?.category === 'abarrotes' ? 'selected' : ''}>Abarrotes</option><option value="bebidas" ${product?.category === 'bebidas' ? 'selected' : ''}>Bebidas</option><option value="limpieza" ${product?.category === 'limpieza' ? 'selected' : ''}>Limpieza</option><option value="lacteos" ${product?.category === 'lacteos' ? 'selected' : ''}>Lácteos</option></select></div>
                <div class="form-group"><label>Unidad</label><select name="unit"><option value="unidad" ${product?.unit === 'unidad' ? 'selected' : ''}>Unidad</option><option value="paquete" ${product?.unit === 'paquete' ? 'selected' : ''}>Paquete</option><option value="bulto" ${product?.unit === 'bulto' ? 'selected' : ''}>Bulto</option><option value="caja" ${product?.unit === 'caja' ? 'selected' : ''}>Caja</option></select></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Precio</label><input type="number" name="price" step="0.01" value="${product?.price || ''}" required></div>
                <div class="form-group"><label>Stock</label><input type="number" name="stock" value="${product?.stock || 0}" required></div>
            </div>
        </form>
    `, () => {
        const form = document.getElementById('productForm');
        const data = Object.fromEntries(new FormData(form));
        data.price = parseFloat(data.price);
        data.stock = parseInt(data.stock);
        if (id) { DataService.updateProduct(id, data); showToast('Producto actualizado', 'success'); }
        else { DataService.addProduct(data); showToast('Producto creado', 'success'); }
        renderProducts(); updateBadges();
    });
}

function deleteProduct(id) {
    if (confirm('¿Eliminar este producto?')) {
        DataService.deleteProduct(id);
        showToast('Producto eliminado', 'success');
        renderProducts(); updateBadges();
    }
}

// ========== INVENTORY ==========
function renderInventory() {
    const products = DataService.getProducts();
    const lowStock = products.filter(p => p.stock < 10);
    contentArea.innerHTML = `
        <div class="stats-grid">
            <div class="stat-card"><div class="stat-info"><h3>Total Productos</h3><div class="value">${products.length}</div></div><div class="stat-icon blue"><i class="fas fa-boxes"></i></div></div>
            <div class="stat-card"><div class="stat-info"><h3>Stock Bajo</h3><div class="value">${lowStock.length}</div></div><div class="stat-icon red"><i class="fas fa-exclamation-triangle"></i></div></div>
            <div class="stat-card"><div class="stat-info"><h3>Unidades Totales</h3><div class="value">${products.reduce((s, p) => s + p.stock, 0)}</div></div><div class="stat-icon green"><i class="fas fa-cubes"></i></div></div>
        </div>
        <div class="card">
            <div class="card-header"><h3><i class="fas fa-warehouse"></i> Control de Inventario</h3></div>
            <div class="card-body"><div class="table-container"><table class="data-table"><thead><tr><th>Producto</th><th>Categoría</th><th>Stock Actual</th><th>Estado</th><th>Ajustar</th></tr></thead><tbody>
                ${products.map(p => {
        const status = p.stock > 50 ? 'success' : p.stock > 10 ? 'warning' : 'danger';
        const label = p.stock > 50 ? 'OK' : p.stock > 10 ? 'Medio' : 'Bajo';
        return `<tr><td>${p.name}</td><td>${p.category}</td><td>${p.stock}</td><td><span class="badge badge-${status}">${label}</span></td>
                    <td><div class="action-buttons"><button class="action-btn edit" onclick="adjustStock(${p.id}, 10)"><i class="fas fa-plus"></i></button><button class="action-btn delete" onclick="adjustStock(${p.id}, -10)"><i class="fas fa-minus"></i></button></div></td></tr>`;
    }).join('')}
            </tbody></table></div></div>
        </div>
    `;
}

function adjustStock(id, amount) {
    const product = DataService.getProducts().find(p => p.id === id);
    if (product) {
        DataService.updateProduct(id, { stock: Math.max(0, product.stock + amount) });
        showToast(`Stock ${amount > 0 ? 'aumentado' : 'reducido'}`, 'success');
        renderInventory(); updateBadges();
    }
}

// ========== CUSTOMERS ==========
function renderCustomers() {
    const customers = DataService.getCustomers();
    contentArea.innerHTML = `
        <div class="filter-bar">
            <div class="search-box"><input type="text" placeholder="Buscar cliente..." id="customerSearch" onkeyup="filterCustomers()"><i class="fas fa-search"></i></div>
            <button class="btn btn-primary" onclick="openCustomerModal()"><i class="fas fa-plus"></i> Nuevo Cliente</button>
        </div>
        <div class="card"><div class="card-body"><div class="table-container"><table class="data-table" id="customersTable"><thead><tr><th>Cliente</th><th>Contacto</th><th>Teléfono</th><th>Límite Crédito</th><th>Saldo</th><th>Acciones</th></tr></thead><tbody>
            ${customers.map(c => `<tr data-name="${c.name.toLowerCase()}">
                <td><strong>${c.name}</strong></td><td>${c.contact}</td><td>${c.phone}</td><td class="price">$${c.creditLimit.toLocaleString()}</td>
                <td><span class="badge ${c.balance > 0 ? 'badge-warning' : 'badge-success'}">$${c.balance.toLocaleString()}</span></td>
                <td><div class="action-buttons"><button class="action-btn view" onclick="viewCustomer(${c.id})"><i class="fas fa-eye"></i></button><button class="action-btn edit" onclick="openCustomerModal(${c.id})"><i class="fas fa-edit"></i></button><button class="action-btn delete" onclick="deleteCustomer(${c.id})"><i class="fas fa-trash"></i></button></div></td>
            </tr>`).join('')}
        </tbody></table></div></div></div>
    `;
}

function filterCustomers() {
    const search = document.getElementById('customerSearch').value.toLowerCase();
    document.querySelectorAll('#customersTable tbody tr').forEach(row => {
        row.style.display = row.dataset.name.includes(search) ? '' : 'none';
    });
}

function openCustomerModal(id = null) {
    const customer = id ? DataService.getCustomers().find(c => c.id === id) : null;
    showModal(`${id ? 'Editar' : 'Nuevo'} Cliente`, `
        <form id="customerForm">
            <div class="form-group"><label>Nombre Negocio</label><input type="text" name="name" value="${customer?.name || ''}" required></div>
            <div class="form-row">
                <div class="form-group"><label>Contacto</label><input type="text" name="contact" value="${customer?.contact || ''}" required></div>
                <div class="form-group"><label>Teléfono</label><input type="text" name="phone" value="${customer?.phone || ''}" required></div>
            </div>
            <div class="form-group"><label>Email</label><input type="email" name="email" value="${customer?.email || ''}"></div>
            <div class="form-group"><label>Dirección</label><textarea name="address">${customer?.address || ''}</textarea></div>
            <div class="form-row">
                <div class="form-group"><label>Límite de Crédito</label><input type="number" name="creditLimit" value="${customer?.creditLimit || 0}"></div>
                <div class="form-group"><label>Saldo Actual</label><input type="number" name="balance" value="${customer?.balance || 0}"></div>
            </div>
        </form>
    `, () => {
        const form = document.getElementById('customerForm');
        const data = Object.fromEntries(new FormData(form));
        data.creditLimit = parseFloat(data.creditLimit) || 0;
        data.balance = parseFloat(data.balance) || 0;
        if (id) { DataService.updateCustomer(id, data); showToast('Cliente actualizado', 'success'); }
        else { DataService.addCustomer(data); showToast('Cliente creado', 'success'); }
        renderCustomers();
    });
}

function viewCustomer(id) {
    const c = DataService.getCustomers().find(c => c.id === id);
    const orders = DataService.getOrders().filter(o => o.customerId === id);
    showModal(c.name, `
        <div class="mb-2"><strong>Contacto:</strong> ${c.contact}</div>
        <div class="mb-2"><strong>Teléfono:</strong> ${c.phone}</div>
        <div class="mb-2"><strong>Email:</strong> ${c.email || 'N/A'}</div>
        <div class="mb-2"><strong>Dirección:</strong> ${c.address || 'N/A'}</div>
        <div class="mb-2"><strong>Límite Crédito:</strong> $${c.creditLimit.toLocaleString()}</div>
        <div class="mb-3"><strong>Saldo:</strong> $${c.balance.toLocaleString()}</div>
        <h4 class="mb-2">Historial de Pedidos (${orders.length})</h4>
        ${orders.length ? `<table class="data-table"><thead><tr><th>Fecha</th><th>Total</th><th>Estado</th></tr></thead><tbody>
            ${orders.map(o => `<tr><td>${new Date(o.createdAt).toLocaleDateString()}</td><td>$${o.total}</td><td><span class="badge badge-${getStatusClass(o.status)}">${o.status}</span></td></tr>`).join('')}
        </tbody></table>` : '<p class="text-muted">Sin pedidos</p>'}
    `, null);
}

function deleteCustomer(id) {
    if (confirm('¿Eliminar este cliente?')) {
        DataService.deleteCustomer(id);
        showToast('Cliente eliminado', 'success');
        renderCustomers();
    }
}

// ========== ORDERS ==========
function renderOrders() {
    const orders = DataService.getOrders();
    contentArea.innerHTML = `
        <div class="filter-bar">
            <div class="search-box"><input type="text" placeholder="Buscar pedido..." id="orderSearch" onkeyup="filterOrders()"><i class="fas fa-search"></i></div>
            <select id="statusFilter" onchange="filterOrders()"><option value="">Todos los estados</option><option value="pendiente">Pendiente</option><option value="enviado">Enviado</option><option value="completado">Completado</option><option value="cancelado">Cancelado</option></select>
            <button class="btn btn-primary" onclick="openOrderModal()"><i class="fas fa-plus"></i> Nuevo Pedido</button>
        </div>
        <div class="card"><div class="card-body"><div class="table-container"><table class="data-table" id="ordersTable"><thead><tr><th>ID</th><th>Cliente</th><th>Fecha</th><th>Total</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>
            ${orders.map(o => `<tr data-id="${o.id}" data-status="${o.status}" data-name="${o.customerName.toLowerCase()}">
                <td>#${o.id}</td><td>${o.customerName}</td><td>${new Date(o.createdAt).toLocaleDateString()}</td><td class="price">$${o.total.toLocaleString()}</td>
                <td><select class="badge badge-${getStatusClass(o.status)}" style="border:none;cursor:pointer;" onchange="updateOrderStatus(${o.id}, this.value)">
                    <option value="pendiente" ${o.status === 'pendiente' ? 'selected' : ''}>Pendiente</option>
                    <option value="enviado" ${o.status === 'enviado' ? 'selected' : ''}>Enviado</option>
                    <option value="completado" ${o.status === 'completado' ? 'selected' : ''}>Completado</option>
                    <option value="cancelado" ${o.status === 'cancelado' ? 'selected' : ''}>Cancelado</option>
                </select></td>
                <td><div class="action-buttons"><button class="action-btn view" onclick="viewOrder(${o.id})"><i class="fas fa-eye"></i></button></div></td>
            </tr>`).join('')}
        </tbody></table></div></div></div>
    `;
}

function filterOrders() {
    const search = document.getElementById('orderSearch').value.toLowerCase();
    const status = document.getElementById('statusFilter').value;
    document.querySelectorAll('#ordersTable tbody tr').forEach(row => {
        const matchName = row.dataset.name.includes(search);
        const matchStatus = !status || row.dataset.status === status;
        row.style.display = matchName && matchStatus ? '' : 'none';
    });
}

function updateOrderStatus(id, status) {
    DataService.updateOrder(id, { status });
    showToast('Estado actualizado', 'success');
    updateBadges(); renderOrders();
}

function viewOrder(id) {
    const o = DataService.getOrders().find(o => o.id === id);
    showModal(`Pedido #${o.id}`, `
        <div class="mb-2"><strong>Cliente:</strong> ${o.customerName}</div>
        <div class="mb-2"><strong>Fecha:</strong> ${new Date(o.createdAt).toLocaleString()}</div>
        <div class="mb-3"><strong>Estado:</strong> <span class="badge badge-${getStatusClass(o.status)}">${o.status}</span></div>
        <h4 class="mb-2">Productos</h4>
        <table class="data-table"><thead><tr><th>Producto</th><th>Cantidad</th><th>Precio</th><th>Subtotal</th></tr></thead><tbody>
            ${o.items.map(i => `<tr><td>${i.name}</td><td>${i.qty}</td><td>$${i.price}</td><td>$${i.qty * i.price}</td></tr>`).join('')}
        </tbody></table>
        <div class="mt-2 text-right"><strong>Total: $${o.total.toLocaleString()}</strong></div>
    `, null);
}

function openOrderModal() {
    const customers = DataService.getCustomers();
    const products = DataService.getProducts();
    showModal('Nuevo Pedido', `
        <form id="orderForm">
            <div class="form-group"><label>Cliente</label><select name="customerId" required>${customers.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}</select></div>
            <div class="form-group"><label>Producto</label><select id="orderProduct">${products.map(p => `<option value="${p.id}" data-price="${p.price}">${p.name} - $${p.price}</option>`).join('')}</select></div>
            <div class="form-row">
                <div class="form-group"><label>Cantidad</label><input type="number" id="orderQty" value="1" min="1"></div>
                <div class="form-group"><label>&nbsp;</label><button type="button" class="btn btn-secondary btn-block" onclick="addOrderItem()"><i class="fas fa-plus"></i> Agregar</button></div>
            </div>
            <div id="orderItems" class="mb-2"></div>
            <div><strong>Total: $<span id="orderTotal">0</span></strong></div>
        </form>
    `, () => {
        if (!window.orderItems?.length) { showToast('Agregue al menos un producto', 'warning'); return; }
        const customerId = parseInt(document.querySelector('[name="customerId"]').value);
        const customer = customers.find(c => c.id === customerId);
        DataService.addOrder({ customerId, customerName: customer.name, items: window.orderItems, total: window.orderItems.reduce((s, i) => s + i.qty * i.price, 0) });
        window.orderItems = [];
        showToast('Pedido creado', 'success');
        renderOrders(); updateBadges();
    });
    window.orderItems = [];
}

function addOrderItem() {
    const sel = document.getElementById('orderProduct');
    const qty = parseInt(document.getElementById('orderQty').value);
    const product = DataService.getProducts().find(p => p.id === parseInt(sel.value));
    window.orderItems.push({ productId: product.id, name: product.name, qty, price: product.price });
    updateOrderItemsDisplay();
}

function updateOrderItemsDisplay() {
    const container = document.getElementById('orderItems');
    const total = window.orderItems.reduce((s, i) => s + i.qty * i.price, 0);
    container.innerHTML = window.orderItems.map((i, idx) => `<div class="mb-1">${i.name} x${i.qty} = $${i.qty * i.price} <button type="button" class="btn btn-sm btn-danger" onclick="removeOrderItem(${idx})"><i class="fas fa-times"></i></button></div>`).join('');
    document.getElementById('orderTotal').textContent = total;
}

function removeOrderItem(idx) {
    window.orderItems.splice(idx, 1);
    updateOrderItemsDisplay();
}

// ========== INVOICES ==========
function renderInvoices() {
    const invoices = DataService.getInvoices();
    contentArea.innerHTML = `
        <div class="filter-bar">
            <button class="btn btn-primary" onclick="generateInvoice()"><i class="fas fa-plus"></i> Generar Factura</button>
        </div>
        <div class="card"><div class="card-body">
            ${invoices.length ? `<div class="table-container"><table class="data-table"><thead><tr><th>Número</th><th>Cliente</th><th>Fecha</th><th>Total</th><th>Estado</th></tr></thead><tbody>
                ${invoices.map(i => `<tr><td>${i.number}</td><td>${i.customerName}</td><td>${new Date(i.createdAt).toLocaleDateString()}</td><td class="price">$${i.total.toLocaleString()}</td><td><span class="badge badge-${i.paid ? 'success' : 'warning'}">${i.paid ? 'Pagada' : 'Pendiente'}</span></td></tr>`).join('')}
            </tbody></table></div>` : '<div class="empty-state"><i class="fas fa-file-invoice"></i><h3>Sin facturas</h3><p>Genera tu primera factura desde un pedido completado</p></div>'}
        </div></div>
    `;
}

function generateInvoice() {
    const orders = DataService.getOrders().filter(o => o.status === 'completado');
    if (!orders.length) { showToast('No hay pedidos completados para facturar', 'warning'); return; }
    showModal('Generar Factura', `
        <form id="invoiceForm">
            <div class="form-group"><label>Seleccionar Pedido</label><select name="orderId" required>${orders.map(o => `<option value="${o.id}">#${o.id} - ${o.customerName} - $${o.total}</option>`).join('')}</select></div>
        </form>
    `, () => {
        const orderId = parseInt(document.querySelector('[name="orderId"]').value);
        const order = orders.find(o => o.id === orderId);
        DataService.addInvoice({ orderId, customerName: order.customerName, total: order.total, paid: false });
        showToast('Factura generada', 'success');
        renderInvoices();
    });
}

// ========== REPORTS ==========
function renderReports() {
    const stats = DataService.getStats();
    const products = DataService.getProducts();
    const orders = DataService.getOrders();
    contentArea.innerHTML = `
        <div class="stats-grid">
            <div class="stat-card"><div class="stat-info"><h3>Ventas Totales</h3><div class="value">$${stats.totalSales.toLocaleString()}</div></div><div class="stat-icon blue"><i class="fas fa-dollar-sign"></i></div></div>
            <div class="stat-card"><div class="stat-info"><h3>Total Pedidos</h3><div class="value">${stats.totalOrders}</div></div><div class="stat-icon green"><i class="fas fa-shopping-cart"></i></div></div>
            <div class="stat-card"><div class="stat-info"><h3>Clientes</h3><div class="value">${stats.totalCustomers}</div></div><div class="stat-icon yellow"><i class="fas fa-users"></i></div></div>
        </div>
        <div class="grid-2">
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-chart-pie"></i> Ventas por Categoría</h3></div>
                <div class="card-body"><div class="chart-container"><canvas id="categoryChart"></canvas></div></div>
            </div>
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-list"></i> Productos Más Vendidos</h3></div>
                <div class="card-body"><table class="data-table"><thead><tr><th>Producto</th><th>Stock</th></tr></thead><tbody>
                    ${products.slice(0, 5).map(p => `<tr><td>${p.name}</td><td>${p.stock}</td></tr>`).join('')}
                </tbody></table></div>
            </div>
        </div>
    `;
    renderCategoryChart();
}

function renderCategoryChart() {
    const ctx = document.getElementById('categoryChart');
    if (!ctx) return;
    const products = DataService.getProducts();
    const categories = {};
    products.forEach(p => { categories[p.category] = (categories[p.category] || 0) + p.stock; });
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(categories).map(c => c.charAt(0).toUpperCase() + c.slice(1)),
            datasets: [{ data: Object.values(categories), backgroundColor: ['#1a365d', '#d69e2e', '#38a169', '#e53e3e', '#3182ce'] }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

// ========== UTILITIES ==========
function getStatusClass(status) {
    return { pendiente: 'warning', enviado: 'info', completado: 'success', cancelado: 'danger' }[status] || 'neutral';
}

function showModal(title, content, onSave) {
    const overlay = document.getElementById('modalOverlay');
    const modal = document.getElementById('modal');
    modal.innerHTML = `
        <div class="modal-header"><h3>${title}</h3><button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button></div>
        <div class="modal-body">${content}</div>
        ${onSave ? '<div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" id="modalSave">Guardar</button></div>' : '<div class="modal-footer"><button class="btn btn-primary" onclick="closeModal()">Cerrar</button></div>'}
    `;
    if (onSave) document.getElementById('modalSave').onclick = () => { onSave(); closeModal(); };
    overlay.classList.add('active');
}

function closeModal() {
    document.getElementById('modalOverlay').classList.remove('active');
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icons = { success: 'fa-check-circle', error: 'fa-times-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle' };
    toast.innerHTML = `<i class="fas ${icons[type]}"></i><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 3000);
}
