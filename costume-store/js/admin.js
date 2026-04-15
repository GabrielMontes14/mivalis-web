/**
 * Admin Dashboard Logic
 * Protected — requires authenticated user with admin role.
 */

window.admin = {
    view: 'dashboard',
    container: null,

    init: async () => {
        window.admin.container = document.getElementById('admin-content');
        if (!window.admin.container) return;

        window.admin.container.innerHTML = '<div style="text-align:center;padding:3rem;">Verificando acceso...</div>';
        await DataService.preload();

        if (!DataService.isLoggedIn()) {
            window.admin.renderLoginGate();
            return;
        }

        const user = DataService.getAuth();
        const session = await sb.auth.getSession();
        const role = session?.data?.session?.user?.user_metadata?.role;

        if (role !== 'admin') {
            window.admin.renderAccessDenied();
            return;
        }

        document.getElementById('admin-sidebar').style.display = '';
        window.admin.navigate('dashboard');
    },

    renderLoginGate: () => {
        document.getElementById('admin-sidebar').style.display = 'none';
        window.admin.container.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:center;min-height:80vh;width:100%;">
                <div class="auth-box" style="max-width:400px;width:100%;">
                    <h2 style="text-align:center;margin-bottom:0.5rem;">Panel Admin</h2>
                    <p style="text-align:center;color:#999;margin-bottom:1.5rem;">Inicia sesión con tu cuenta de administrador</p>
                    <form onsubmit="event.preventDefault(); window.admin.doLogin(this)">
                        <div class="form-group">
                            <label>Correo</label>
                            <input type="email" name="email" class="input-block" required placeholder="admin@mivalis.com">
                        </div>
                        <div class="form-group">
                            <label>Contraseña</label>
                            <input type="password" name="password" class="input-block" required>
                        </div>
                        <p id="admin-login-error" style="color:#ff4444;display:none;margin-bottom:1rem;font-size:0.9rem;"></p>
                        <button type="submit" class="btn" style="width:100%;">Ingresar</button>
                    </form>
                    <p style="text-align:center;margin-top:1.5rem;">
                        <a href="index.html" style="color:var(--neon-cyan,#0af);">Volver a la tienda</a>
                    </p>
                </div>
            </div>
        `;
    },

    doLogin: async (form) => {
        const fd = new FormData(form);
        const btn = form.querySelector('button[type="submit"]');
        const errEl = document.getElementById('admin-login-error');
        btn.disabled = true;
        btn.textContent = 'Verificando...';
        errEl.style.display = 'none';

        const result = await DataService.loginAsync(fd.get('email'), fd.get('password'));

        if (!result.success) {
            errEl.textContent = result.error || 'Credenciales incorrectas';
            errEl.style.display = 'block';
            btn.disabled = false;
            btn.textContent = 'Ingresar';
            return;
        }

        // Check admin role
        const session = await sb.auth.getSession();
        const role = session?.data?.session?.user?.user_metadata?.role;

        if (role !== 'admin') {
            await sb.auth.signOut();
            DataService.clearAuth();
            errEl.textContent = 'Acceso denegado. Esta cuenta no tiene permisos de administrador.';
            errEl.style.display = 'block';
            btn.disabled = false;
            btn.textContent = 'Ingresar';
            return;
        }

        document.getElementById('admin-sidebar').style.display = '';
        window.admin.navigate('dashboard');
    },

    renderAccessDenied: () => {
        document.getElementById('admin-sidebar').style.display = 'none';
        window.admin.container.innerHTML = `
            <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:80vh;">
                <h2 style="color:#ff4444;margin-bottom:1rem;">Acceso Denegado</h2>
                <p style="color:#999;margin-bottom:2rem;">Tu cuenta no tiene permisos de administrador.</p>
                <div style="display:flex;gap:1rem;">
                    <button class="btn-outline" onclick="DataService.clearAuth(); window.admin.renderLoginGate();">Cerrar Sesión</button>
                    <a href="index.html" class="btn">Volver a la Tienda</a>
                </div>
            </div>
        `;
    },

    navigate: (viewName) => {
        window.admin.view = viewName;
        document.querySelectorAll('#admin-sidebar a').forEach(el => el.classList.remove('active'));
        const link = document.querySelector(`#admin-sidebar a[onclick*="${viewName}"]`);
        if (link) link.classList.add('active');

        switch (viewName) {
            case 'dashboard': window.admin.renderDashboard(); break;
            case 'products': window.admin.renderProducts(); break;
            case 'orders': window.admin.renderOrders(); break;
        }

        if (window.lucide) window.lucide.createIcons();
    },

    renderDashboard: () => {
        const products = DataService.getProducts();
        const orders = DataService.getOrders();

        const totalSales = orders
            .filter(o => o.status !== 'Cancelled')
            .reduce((sum, o) => sum + (Number(o.total) || 0), 0);

        const lowStock = products.filter(p => p.stock < 5).length;

        window.admin.container.innerHTML = `
            <h1>Resumen del Panel</h1>
            <div class="stats-grid">
                <div class="stat-card">
                    <h3>Ventas Totales</h3>
                    <p class="price">$${totalSales.toFixed(2)}</p>
                </div>
                <div class="stat-card">
                    <h3>Pedidos Totales</h3>
                    <p class="price" style="color:black">${orders.length}</p>
                </div>
                <div class="stat-card">
                    <h3>Alertas de Stock Bajo</h3>
                    <p class="price" style="color: ${lowStock > 0 ? 'var(--color-black)' : 'var(--color-mint)'}; font-weight: 900;">${lowStock}</p>
                </div>
            </div>
            <div class="section">
                <h3>Pedidos Recientes</h3>
                ${window.admin.buildOrderTable(orders.slice(0, 5))}
            </div>
        `;
    },

    renderProducts: async () => {
        window.admin.container.innerHTML = '<div style="text-align:center; padding:2rem;">Cargando productos...</div>';
        const products = await DataService.getProductsAsync();

        window.admin.container.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                <h1>Gestión de Productos (Alquiler)</h1>
                <button class="btn" onclick="window.admin.openProductModal()">+ Añadir Producto</button>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>ID</th><th>Nombre</th><th>Categoría</th><th>Precio</th><th>Stock</th><th>Estado</th><th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${products.map(p => {
            const statusClass = `status-${p.estado}`;
            return `
                        <tr>
                            <td>${p.id}</td>
                            <td>${p.nombre || p.name}</td>
                            <td>${p.categoria || p.category}</td>
                            <td>$${parseFloat(p.precio || p.price).toFixed(2)}</td>
                            <td>${p.stock}</td>
                            <td>
                                <select onchange="window.admin.updateProductStatus(${p.id}, this.value, this)" class="status-select ${statusClass}">
                                    <option value="listo" ${p.estado === 'listo' ? 'selected' : ''}>Listo para alquilar</option>
                                    <option value="alquilado" ${p.estado === 'alquilado' ? 'selected' : ''}>Alquilado</option>
                                    <option value="mantenimiento" ${p.estado === 'mantenimiento' ? 'selected' : ''}>En mantenimiento</option>
                                    <option value="no_devuelto" ${p.estado === 'no_devuelto' ? 'selected' : ''}>No devuelto</option>
                                </select>
                            </td>
                            <td>
                                <button class="action-btn edit-btn" onclick="window.admin.openProductModal(${p.id})">Editar</button>
                                <button class="action-btn delete-btn" onclick="window.admin.deleteProduct(${p.id})">Borrar</button>
                            </td>
                        </tr>`;
        }).join('')}
                </tbody>
            </table>
        `;
    },

    renderOrders: async () => {
        window.admin.container.innerHTML = '<div style="text-align:center;padding:2rem;">Cargando pedidos...</div>';
        const orders = await DataService.getOrdersAsync({ allOrders: true });
        window.admin.container.innerHTML = `
            <h1>Gestionar Pedidos</h1>
            ${window.admin.buildOrderTable(orders)}
        `;
    },

    buildOrderTable: (orders) => {
        if (!orders || orders.length === 0) return '<p>No hay pedidos recientes</p>';
        return `
            <table>
                <thead><tr><th>ID</th><th>Fecha</th><th>Total</th><th>Estado</th></tr></thead>
                <tbody>
                    ${orders.map(order => `
                        <tr>
                            <td>${order.id || 'N/A'}</td>
                            <td>${order.date ? new Date(order.date).toLocaleDateString() : 'N/A'}</td>
                            <td>$${(Number(order.total) || 0).toFixed(2)}</td>
                            <td>
                                <select onchange="window.admin.updateOrderStatus('${order.id}', this.value)">
                                    <option value="Pending" ${order.status === 'Pending' ? 'selected' : ''}>Pendiente</option>
                                    <option value="Shipped" ${order.status === 'Shipped' ? 'selected' : ''}>Enviado</option>
                                    <option value="Delivered" ${order.status === 'Delivered' ? 'selected' : ''}>Entregado</option>
                                    <option value="Cancelled" ${order.status === 'Cancelled' ? 'selected' : ''}>Cancelado</option>
                                </select>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    },

    openProductModal: (id = null) => {
        const modal = document.getElementById('modal-screen');
        const title = document.getElementById('modal-title');
        const form = document.getElementById('product-form');
        form.reset();
        document.getElementById('p-id').value = '';

        if (id) {
            const product = DataService.getProducts().find(p => p.id === id);
            if (product) {
                title.innerText = 'Editar Producto';
                document.getElementById('p-id').value = product.id;
                document.getElementById('p-name').value = product.nombre || product.name;
                document.getElementById('p-category').value = product.categoria || product.category;
                document.getElementById('p-price').value = product.precio || product.price;
                document.getElementById('p-stock').value = product.stock;
                document.getElementById('p-image').value = product.imagen || product.image || '';
                if (document.getElementById('p-desc')) {
                    document.getElementById('p-desc').value = product.descripcion || product.description || '';
                }
            }
        } else {
            title.innerText = 'Añadir Producto';
        }
        modal.classList.add('open');
    },

    closeModal: () => {
        document.getElementById('modal-screen').classList.remove('open');
    },

    saveProduct: async () => {
        const id = document.getElementById('p-id').value;
        const name = document.getElementById('p-name').value;
        const category = document.getElementById('p-category').value;
        const price = parseFloat(document.getElementById('p-price').value);
        const stock = parseInt(document.getElementById('p-stock').value);
        const image = document.getElementById('p-image').value;
        const desc = document.getElementById('p-desc') ? document.getElementById('p-desc').value : '';

        if (!name || isNaN(price) || isNaN(stock) || !image) {
            alert("Por favor complete todos los campos requeridos.");
            return;
        }

        const result = await DataService.saveProductAsync({
            id: id ? parseInt(id) : null,
            nombre: name, categoria: category, precio: price,
            stock, imagen: image, descripcion: desc, estado: 'listo'
        });

        if (result.success) {
            window.admin.closeModal();
            window.admin.renderProducts();
        } else {
            alert('Error al guardar: ' + (result.error || 'Error desconocido'));
        }
    },

    deleteProduct: async (id) => {
        if (confirm('¿Estás seguro de eliminar este producto?')) {
            await DataService.deleteProductAsync(id);
            window.admin.renderProducts();
        }
    },

    updateProductStatus: async (id, newStatus, selectElement) => {
        const oldClass = Array.from(selectElement.classList).find(c => c.startsWith('status-'));
        if (oldClass) selectElement.classList.remove(oldClass);
        selectElement.classList.add(`status-${newStatus.toLowerCase().replace(' ', '')}`);
        const success = await DataService.updateProductStatusAsync(id, newStatus);
        if (!success) alert("Hubo un problema al guardar el estado.");
    },

    updateOrderStatus: async (id, status) => {
        await DataService.updateOrderAsync(id, { status });
        window.admin.renderDashboard();
        if (window.admin.view === 'orders') window.admin.renderOrders();
    }
};

document.addEventListener('DOMContentLoaded', () => {
    if (window.admin) window.admin.init();
});
