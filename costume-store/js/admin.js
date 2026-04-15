/**
 * Admin Dashboard Logic
 * Handles the logic for the admin panel, including dashboard, products, and orders.
 */

// Ensure global implementation
window.admin = {
    view: 'dashboard',
    container: null,

    /**
     * Initialize the admin panel
     */
    init: () => {
        // DOM is ready, safe to get container
        window.admin.container = document.getElementById('admin-content');
        if (!window.admin.container) {
            console.error("Admin container not found! Check HTML ID 'admin-content'.");
            return;
        }
        window.admin.navigate('dashboard');
    },

    /**
     * Navigation Handler
     */
    navigate: (viewName) => {
        window.admin.view = viewName;
        // Update sidebar active state
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

    /**
     * Renders
     */
    renderDashboard: () => {
        // Use synchronous getters for dashboard stats to be instant
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

        // Use Async API to ensure we display fresh data or fallback
        const products = await DataService.getProductsAsync();

        window.admin.container.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                <h1>Gestión de Productos (Alquiler)</h1>
                <button class="btn" onclick="window.admin.openProductModal()">+ Añadir Producto</button>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Nombre</th>
                        <th>Categoría</th>
                        <th>Precio</th>
                        <th>Stock</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${products.map(p => {
            // Handle snake_case matching for CSS. 'no_devuelto' -> 'status-no_devuelto'
            const statusClass = `status-${p.estado}`;
            return `
                        <tr>
                            <td>${p.id}</td>
                            <td>${p.nombre || p.name}</td>
                            <td>${p.categoria || p.category}</td>
                            <td>$${parseFloat(p.precio || p.price).toFixed(2)}</td>
                            <td>${p.stock}</td>
                            <td>
                                <select 
                                    onchange="window.admin.updateProductStatus(${p.id}, this.value, this)" 
                                    class="status-select ${statusClass}"
                                >
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
                        </tr>
                        `;
        }).join('')}
                </tbody>
            </table>
        `;
    },

    renderOrders: () => {
        const orders = DataService.getOrders();
        window.admin.container.innerHTML = `
            <h1>Gestionar Pedidos</h1>
            ${window.admin.buildOrderTable(orders)}
         `;
    },

    buildOrderTable: (orders) => {
        if (!orders || orders.length === 0) {
            return '<p>No hay pedidos recientes</p>';
        }

        return `
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Fecha</th>
                        <th>Total</th>
                        <th>Estado</th>
                    </tr>
                </thead>
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

    /**
     * Product CRUD
     */
    openProductModal: (id = null) => {
        const modal = document.getElementById('modal-screen');
        const title = document.getElementById('modal-title');
        const form = document.getElementById('product-form');

        // Reset
        form.reset();
        document.getElementById('p-id').value = '';

        if (id) {
            // Edit Mode
            const product = DataService.getProducts().find(p => p.id === id);
            if (product) {
                title.innerText = 'Editar Producto';
                document.getElementById('p-id').value = product.id;
                document.getElementById('p-name').value = product.nombre || product.name;
                document.getElementById('p-category').value = product.categoria || product.category;
                document.getElementById('p-price').value = product.precio || product.price;
                document.getElementById('p-stock').value = product.stock;
                document.getElementById('p-image').value = product.imagen || product.image || "https://images.unsplash.com/photo-1508266205937-4f24c3d3dd52?q=80&w=600&auto=format&fit=crop";
                if (document.getElementById('p-desc')) {
                    document.getElementById('p-desc').value = product.descripcion || product.description || '';
                }
            }
        } else {
            // Add Mode
            title.innerText = 'Añadir Producto';
        }

        modal.classList.add('open');
    },

    // Alias for backward compatibility or incorrect calls
    openModal: (id = null) => {
        window.admin.openProductModal(id);
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

        const productData = {
            id: id ? parseInt(id) : null,
            nombre: name,
            name: name,
            categoria: category,
            category: category,
            precio: price,
            price: price,
            stock: stock,
            imagen: image,
            image: image,
            descripcion: desc,
            description: desc,
            estado: 'listo'
        };

        const result = await DataService.saveProductAsync(productData);
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
        // Visual feedback immediately
        const oldClass = Array.from(selectElement.classList).find(c => c.startsWith('status-'));
        if (oldClass) selectElement.classList.remove(oldClass);
        selectElement.classList.add(`status-${newStatus.toLowerCase().replace(' ', '')}`);

        // Backend Update
        const success = await DataService.updateProductStatusAsync(id, newStatus);

        if (!success) {
            alert("Hubo un problema al guardar el estado.");
        }
    },

    updateOrderStatus: (id, status) => {
        const orders = DataService.getOrders();
        const orderIndex = orders.findIndex(o => o.id === id);
        if (orderIndex !== -1) {
            orders[orderIndex].status = status;
            // Persist order update (Currently using localStorage direct as DataService.updateOrder exists but is slightly different signature? Let's check DataService.updateOrder)
            // DataService.updateOrder(id, {status}) is available, let's use it properly if possible, but manual save is safer given scope
            localStorage.setItem('costume_store_orders', JSON.stringify(orders));
            window.admin.renderDashboard();
            if (window.admin.view === 'orders') window.admin.renderOrders();
        }
    }
};

// Initialize only once on load
document.addEventListener('DOMContentLoaded', () => {
    if (window.admin && typeof window.admin.init === 'function') {
        window.admin.init();
    } else {
        console.error("Critical: window.admin is not defined!");
    }
});
