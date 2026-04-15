/**
 * Client-Side Application Logic
 */

let STORE_PRODUCTS_CACHE = [];

const app = {
    view: 'home',
    container: document.getElementById('app-root'),

    init: () => {
        app.updateCartCount();
        app.updateAuthNav();
        app.navigate('home');
    },

    navigate: (viewName, params = {}) => {
        app.view = viewName;
        window.scrollTo(0, 0);

        switch (viewName) {
            case 'home': app.renderHome(); break;
            case 'catalog': app.renderCatalog(params); break;
            case 'product': app.renderProductDetail(params.id); break;
            case 'cart': app.renderCart(); break;
            case 'checkout': app.renderCheckout(); break;
            case 'profile':
                if (!DataService.isLoggedIn()) return app.navigate('login');
                app.renderProfile(params.tab || 'info');
                break;
            case 'contact': app.renderContact(); break;
            case 'login': app.renderLogin(); break;
            case 'register': app.renderRegister(); break;
            default: app.renderHome();
        }
        lucide.createIcons();
    },

    updateAuthNav: () => {
        const authLink = document.getElementById('auth-nav-link');
        if (!authLink) return;
        if (DataService.isLoggedIn()) {
            const user = DataService.getAuth();
            authLink.innerHTML = `<i data-lucide="user" style="width:16px;height:16px;vertical-align:middle;margin-right:4px"></i> ${user.name}`;
            authLink.setAttribute('onclick', "app.navigate('profile')");
        } else {
            authLink.textContent = 'Iniciar Sesión';
            authLink.setAttribute('onclick', "app.navigate('login')");
        }
        lucide.createIcons();
    },

    showNotification: (message, type = 'success') => {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        const icon = type === 'success' ? 'check-circle' : 'alert-circle';
        toast.innerHTML = `<i data-lucide="${icon}"></i><span class="toast-message">${message}</span>`;
        container.appendChild(toast);
        lucide.createIcons();
        setTimeout(() => {
            toast.style.animation = 'fadeOut 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    toggleMobileMenu: () => {
        const menu = document.getElementById('nav-links');
        menu.classList.toggle('open');
    },

    /**
     * AUTH
     */
    renderLogin: () => {
        app.container.innerHTML = `
            <div class="container section">
                <div class="auth-box">
                    <h2>Iniciar Sesión</h2>
                    <form onsubmit="event.preventDefault(); app.doLogin(this)">
                        <div class="form-group">
                            <label>Correo Electrónico</label>
                            <input type="email" name="email" class="input-block" required placeholder="tu@correo.com">
                        </div>
                        <div class="form-group">
                            <label>Contraseña</label>
                            <input type="password" name="password" class="input-block" required placeholder="Tu contraseña" minlength="4">
                        </div>
                        <button type="submit" class="btn" style="width:100%">Ingresar</button>
                    </form>
                    <p style="text-align:center; margin-top:1rem">
                        ¿No tienes cuenta? <a href="#" onclick="app.navigate('register')" class="text-mint" style="font-weight:bold">Regístrate aquí</a>
                    </p>
                </div>
            </div>
        `;
    },

    doLogin: async (form) => {
        const fd = new FormData(form);
        const btn = form.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.textContent = 'Ingresando...';

        const result = await DataService.loginAsync(fd.get('email'), fd.get('password'));

        if (result.success || result.user) {
            app.showNotification('¡Bienvenido de vuelta!');
            app.updateAuthNav();
            app.navigate('home');
        } else {
            app.showNotification(result.error || 'Error al iniciar sesión', 'error');
            btn.disabled = false;
            btn.textContent = 'Ingresar';
        }
    },

    renderRegister: () => {
        app.container.innerHTML = `
            <div class="container section">
                <div class="auth-box">
                    <h2>Crear Cuenta</h2>
                    <form onsubmit="event.preventDefault(); app.doRegister(this)">
                        <div class="form-group">
                            <label>Nombre Completo</label>
                            <input type="text" name="name" class="input-block" required placeholder="Tu nombre">
                        </div>
                        <div class="form-group">
                            <label>Correo Electrónico</label>
                            <input type="email" name="email" class="input-block" required placeholder="tu@correo.com">
                        </div>
                        <div class="form-group">
                            <label>Contraseña</label>
                            <input type="password" name="password" class="input-block" required placeholder="Mínimo 6 caracteres" minlength="6">
                        </div>
                        <div class="form-group">
                            <label>Confirmar Contraseña</label>
                            <input type="password" name="password2" class="input-block" required placeholder="Repite tu contraseña">
                        </div>
                        <button type="submit" class="btn" style="width:100%">Registrarse</button>
                    </form>
                    <p style="text-align:center; margin-top:1rem">
                        ¿Ya tienes cuenta? <a href="#" onclick="app.navigate('login')" class="text-mint" style="font-weight:bold">Inicia sesión</a>
                    </p>
                </div>
            </div>
        `;
    },

    doRegister: async (form) => {
        const fd = new FormData(form);
        if (fd.get('password') !== fd.get('password2')) {
            return app.showNotification('Las contraseñas no coinciden', 'error');
        }
        const btn = form.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.textContent = 'Creando cuenta...';

        const result = await DataService.registerAsync(fd.get('name'), fd.get('email'), fd.get('password'));

        if (result.success || result.user) {
            app.showNotification('¡Cuenta creada exitosamente!');
            app.updateAuthNav();
            app.navigate('home');
        } else {
            app.showNotification(result.error || 'Error al registrarse', 'error');
            btn.disabled = false;
            btn.textContent = 'Registrarse';
        }
    },

    logout: () => {
        DataService.clearAuth();
        app.updateAuthNav();
        app.showNotification('Sesión cerrada');
        app.navigate('home');
    },

    /**
     * VIEWS
     */
    renderHome: () => {
        app.container.innerHTML = `
            <section class="hero">
                <div class="container hero-content">
                    <h2>Libera tu Alter Ego</h2>
                    <p>Disfraces premium para cada ocasión. Destaca con nuestra colección exclusiva.</p>
                    <button class="btn" onclick="app.navigate('catalog')">Comprar Ahora</button>
                </div>
            </section>

            <section class="section container">
                <h3>Categorías Populares</h3>
                <div class="grid category-grid">
                    <div class="cat-card" onclick="app.navigate('catalog', {filter: 'Superhéroes'})">
                        <i data-lucide="shield" style="width:48px;height:48px;margin-bottom:1rem;color:var(--color-mint)"></i>
                        <h4>Superhéroes</h4>
                    </div>
                    <div class="cat-card" onclick="app.navigate('catalog', {filter: 'Terror'})">
                        <i data-lucide="skull" style="width:48px;height:48px;margin-bottom:1rem;color:var(--color-mint)"></i>
                        <h4>Terror</h4>
                    </div>
                    <div class="cat-card" onclick="app.navigate('catalog', {filter: 'De Época'})">
                        <i data-lucide="crown" style="width:48px;height:48px;margin-bottom:1rem;color:var(--color-mint)"></i>
                        <h4>De Época</h4>
                    </div>
                </div>
            </section>
        `;
    },

    renderCatalog: async (params = {}) => {
        app.container.innerHTML = '<div style="text-align:center; padding:5rem;"><i data-lucide="loader-2" class="spin"></i> Cargando catálogo...</div>';
        lucide.createIcons();

        STORE_PRODUCTS_CACHE = await DataService.getStoreProductsAsync();

        let filtered = STORE_PRODUCTS_CACHE;
        const searchTerm = (params.search || '').toLowerCase();

        if (params.filter) {
            filtered = filtered.filter(p => (p.category || p.categoria) === params.filter);
        }
        if (searchTerm) {
            filtered = filtered.filter(p => {
                const name = (p.nombre || p.name || '').toLowerCase();
                const desc = (p.descripcion || p.description || '').toLowerCase();
                const cat = (p.categoria || p.category || '').toLowerCase();
                return name.includes(searchTerm) || desc.includes(searchTerm) || cat.includes(searchTerm);
            });
        }

        const categories = [...new Set(STORE_PRODUCTS_CACHE.map(p => p.category || p.categoria))].filter(Boolean);

        app.container.innerHTML = `
            <div class="container section">
                <div class="catalog-header">
                    <div class="search-box">
                        <i data-lucide="search" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);width:18px;height:18px;color:#999"></i>
                        <input type="text" placeholder="Buscar disfraces..." value="${params.search || ''}"
                            onkeyup="if(event.key==='Enter') app.navigate('catalog', {filter:'${params.filter || ''}', search: this.value})"
                            class="input-block search-input">
                    </div>
                </div>
                <div class="catalog-layout">
                    <aside class="filters">
                        <h4>Filtros</h4>
                        <div class="filter-group">
                            <label>Categoría</label>
                            <select onchange="app.navigate('catalog', {filter: this.value, search: '${params.search || ''}'})">
                                <option value="">Todas</option>
                                ${categories.map(cat => `
                                    <option value="${cat}" ${params.filter === cat ? 'selected' : ''}>${cat}</option>
                                `).join('')}
                            </select>
                        </div>
                    </aside>
                    <div class="product-grid">
                        ${filtered.length === 0 ? '<p style="grid-column:1/-1;text-align:center;padding:3rem;color:#999">No se encontraron productos.</p>' : filtered.map(product => `
                            <div class="product-card">
                                <div class="img-wrapper" onclick="app.navigate('product', {id: ${product.id}})">
                                    <img src="${product.imagen || product.image}" alt="${product.nombre || product.name}"
                                         onerror="this.onerror=null;this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22300%22%3E%3Crect width=%22400%22 height=%22300%22 fill=%22%23ddd%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-family=%22sans-serif%22 font-size=%2220%22 fill=%22%23888%22%3ESin imagen%3C/text%3E%3C/svg%3E'">
                                </div>
                                <div class="p-info">
                                    <h5>${product.nombre || product.name}</h5>
                                    <p class="price">$${parseFloat(product.precio || product.price).toFixed(2)}</p>
                                    <button class="btn-sm" onclick="app.addToCart(${product.id})">
                                        <i data-lucide="shopping-cart" style="width:14px;height:14px;vertical-align:middle;margin-right:4px"></i>
                                        Añadir
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    },

    renderProductDetail: (id) => {
        const product = STORE_PRODUCTS_CACHE.find(p => p.id === Number(id));
        if (!product) return app.navigate('catalog');

        app.container.innerHTML = `
            <div class="container section">
                <button class="btn-outline" onclick="app.navigate('catalog')" style="margin-bottom: 1rem;">&larr; Volver</button>
                <div class="product-detail">
                    <div class="pd-image">
                        <img src="${product.imagen || product.image}" alt="${product.nombre || product.name}"
                             onerror="this.onerror=null;this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22600%22 height=%22400%22%3E%3Crect width=%22600%22 height=%22400%22 fill=%22%23ddd%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-family=%22sans-serif%22 font-size=%2224%22 fill=%22%23888%22%3ESin imagen%3C/text%3E%3C/svg%3E'">
                    </div>
                    <div class="pd-info">
                        <span class="category-badge">${product.categoria || product.category}</span>
                        <h2>${product.nombre || product.name}</h2>
                        <p class="price-large">$${parseFloat(product.precio || product.price).toFixed(2)}</p>
                        <p class="desc">${product.descripcion || product.description || 'Sin descripción disponible.'}</p>

                        <div class="meta">
                            <span>Talla: <strong>${product.size || 'Única'}</strong></span>
                            <span>Género: <strong>${product.gender || 'Unisex'}</strong></span>
                            <span>Stock: <strong>${product.stock || 0} disponibles</strong></span>
                        </div>

                        <button class="btn btn-large" onclick="app.addToCart(${product.id})">
                            <i data-lucide="shopping-cart" style="width:18px;height:18px;vertical-align:middle;margin-right:6px"></i>
                            Añadir al Carrito
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    renderCart: () => {
        const cart = DataService.getCart();
        const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        app.container.innerHTML = `
            <div class="container section">
                <h2>Tu Carrito</h2>
                ${cart.length === 0 ? `
                    <div style="text-align:center;padding:4rem 0">
                        <i data-lucide="shopping-cart" style="width:64px;height:64px;color:#ddd;margin-bottom:1rem"></i>
                        <p style="color:#999;margin-bottom:1rem">El carrito está vacío</p>
                        <button class="btn" onclick="app.navigate('catalog')">Ver Catálogo</button>
                    </div>
                ` : `
                    <div class="cart-list">
                        ${cart.map(item => `
                            <div class="cart-item">
                                <img src="${item.image}" width="80" style="border-radius:8px;object-fit:cover;height:80px"
                                     onerror="this.onerror=null;this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2280%22 height=%2280%22%3E%3Crect width=%2280%22 height=%2280%22 fill=%22%23ddd%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-family=%22sans-serif%22 font-size=%2214%22 fill=%22%23888%22%3EIMG%3C/text%3E%3C/svg%3E'">
                                <div class="cart-item-info">
                                    <h4>${item.name}</h4>
                                    <p class="text-muted">$${item.price.toFixed(2)} c/u</p>
                                </div>
                                <div class="cart-item-qty">
                                    <button class="qty-btn" onclick="app.changeQty(${item.id}, -1)">-</button>
                                    <span>${item.quantity}</span>
                                    <button class="qty-btn" onclick="app.changeQty(${item.id}, 1)">+</button>
                                </div>
                                <p class="item-total">$${(item.price * item.quantity).toFixed(2)}</p>
                                <button class="remove-btn" onclick="app.removeFromCart(${item.id})">
                                    <i data-lucide="trash-2" style="width:16px;height:16px"></i>
                                </button>
                            </div>
                        `).join('')}
                    </div>
                    <div class="cart-summary">
                        <h3>Total: <span class="text-mint">$${total.toFixed(2)}</span></h3>
                        <button class="btn" onclick="app.navigate('checkout')">Proceder al Pago</button>
                    </div>
                `}
            </div>
        `;
    },

    renderCheckout: () => {
        const cart = DataService.getCart();
        if (cart.length === 0) return app.navigate('cart');

        const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const auth = DataService.getAuth();

        app.container.innerHTML = `
            <div class="container section">
                <h2>Finalizar Pedido</h2>
                <div class="checkout-layout">
                    <div class="checkout-form">
                        <h3>Datos de Envío</h3>
                        <form id="checkout-form" onsubmit="event.preventDefault(); app.completeOrder()">
                            <div class="form-grid">
                                <div class="form-group">
                                    <label>Nombre Completo</label>
                                    <input type="text" id="co-name" class="input-block" required
                                        value="${auth ? auth.name : ''}">
                                </div>
                                <div class="form-group">
                                    <label>Teléfono</label>
                                    <input type="tel" id="co-phone" class="input-block" required placeholder="+57 300 000 0000">
                                </div>
                            </div>
                            <div class="form-group">
                                <label>Dirección de Envío</label>
                                <input type="text" id="co-address" class="input-block" required placeholder="Calle, barrio, ciudad...">
                            </div>
                            <div class="form-group">
                                <label>Notas (opcional)</label>
                                <textarea id="co-notes" class="input-block" rows="2" placeholder="Indicaciones especiales..."></textarea>
                            </div>
                            <button type="submit" class="btn" style="width:100%">Confirmar Pedido — $${total.toFixed(2)}</button>
                        </form>
                    </div>
                    <div class="checkout-summary">
                        <h3>Resumen</h3>
                        ${cart.map(item => `
                            <div class="checkout-item">
                                <span>${item.name} x${item.quantity}</span>
                                <span>$${(item.price * item.quantity).toFixed(2)}</span>
                            </div>
                        `).join('')}
                        <hr>
                        <div class="checkout-item" style="font-weight:bold;font-size:1.1rem">
                            <span>Total</span>
                            <span class="text-mint">$${total.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    renderProfile: (activeTab = 'info') => {
        const auth = DataService.getAuth();
        if (!auth) return app.navigate('login');

        const user = DataService.getUser();
        // Sync auth name
        user.name = auth.name || user.name;
        user.email = auth.email || user.email;

        app.container.innerHTML = `
            <div class="container section">
                <div class="profile-layout">
                    <aside class="profile-sidebar">
                        <div class="user-brief">
                            <div class="avatar-circle">${(user.name || 'U').charAt(0).toUpperCase()}</div>
                            <h4>${user.name}</h4>
                            <p>${user.email}</p>
                        </div>
                        <nav class="profile-nav">
                            <a href="#" class="${activeTab === 'info' ? 'active' : ''}" onclick="app.navigate('profile', {tab: 'info'})">
                                <i data-lucide="user"></i> Información
                            </a>
                            <a href="#" class="${activeTab === 'orders' ? 'active' : ''}" onclick="app.navigate('profile', {tab: 'orders'})">
                                <i data-lucide="package"></i> Mis Pedidos
                            </a>
                            <a href="#" class="${activeTab === 'security' ? 'active' : ''}" onclick="app.navigate('profile', {tab: 'security'})">
                                <i data-lucide="lock"></i> Seguridad
                            </a>
                            <hr>
                            <a href="#" onclick="app.logout()">
                                <i data-lucide="log-out"></i> Cerrar Sesión
                            </a>
                        </nav>
                    </aside>
                    <main class="profile-content">
                        ${app.getProfileContent(activeTab)}
                    </main>
                </div>
            </div>
        `;
        lucide.createIcons();
    },

    getProfileContent: (tab) => {
        const user = DataService.getUser();
        switch (tab) {
            case 'info':
                return `
                    <h3>Información Personal</h3>
                    <form onsubmit="event.preventDefault(); app.updateProfile(this)">
                        <div class="form-grid">
                            <div class="form-group">
                                <label>Nombre</label>
                                <input type="text" name="name" class="input-block" value="${user.name}" required>
                            </div>
                            <div class="form-group">
                                <label>Apellidos</label>
                                <input type="text" name="lastname" class="input-block" value="${user.lastname || ''}">
                            </div>
                            <div class="form-group">
                                <label>Correo Electrónico</label>
                                <input type="email" name="email" class="input-block" value="${user.email}" required>
                            </div>
                            <div class="form-group">
                                <label>Teléfono</label>
                                <input type="tel" name="phone" class="input-block" value="${user.phone || ''}">
                            </div>
                        </div>
                        <button type="submit" class="btn">Guardar Cambios</button>
                    </form>
                `;
            case 'security':
                return `
                    <h3>Seguridad</h3>
                    <form onsubmit="event.preventDefault(); app.showNotification('Contraseña actualizada correctamente');">
                        <div class="form-group">
                            <label>Contraseña Actual</label>
                            <input type="password" class="input-block" required>
                        </div>
                        <div class="form-group">
                            <label>Nueva Contraseña</label>
                            <input type="password" class="input-block" required minlength="6">
                        </div>
                        <div class="form-group">
                            <label>Confirmar Nueva Contraseña</label>
                            <input type="password" class="input-block" required>
                        </div>
                        <button type="submit" class="btn">Actualizar Contraseña</button>
                    </form>
                `;
            case 'orders':
                setTimeout(async () => {
                    const container = document.getElementById('orders-container');
                    if (!container) return;
                    container.innerHTML = '<div style="text-align:center; padding:2rem;"><i data-lucide="loader-2" class="spin"></i> Cargando...</div>';
                    lucide.createIcons();
                    const orders = await DataService.getOrdersAsync();
                    if (orders.length === 0) {
                        container.innerHTML = `
                            <div style="text-align:center;padding:3rem 0;color:#999">
                                <i data-lucide="package" style="width:48px;height:48px;margin-bottom:1rem;color:#ddd"></i>
                                <p>No has realizado pedidos aún</p>
                                <button class="btn-sm" style="margin-top:1rem" onclick="app.navigate('catalog')">Ir al catálogo</button>
                            </div>
                        `;
                        lucide.createIcons();
                    } else {
                        container.innerHTML = `
                        <div class="order-list">
                            ${orders.map(o => `
                                <div class="order-card">
                                    <div class="order-header">
                                        <div>
                                            <span style="font-weight:bold">#${o.id}</span>
                                            <span class="text-muted" style="font-size:0.9em; margin-left:10px">${new Date(o.date).toLocaleDateString()}</span>
                                        </div>
                                        <span class="status ${(o.status || '').toLowerCase()}">${o.status}</span>
                                    </div>
                                    <div style="margin-top:0.5rem">
                                        <p>Total: <strong>$${parseFloat(o.total).toFixed(2)}</strong> — ${o.items ? o.items.length : 0} artículos</p>
                                    </div>
                                    ${o.status === 'Pending' ? `
                                        <button class="btn-sm" style="margin-top:0.5rem;background:#ff4444;border-color:#ff4444;color:white"
                                            onclick="app.cancelOrder('${o.id}')">Cancelar</button>
                                    ` : ''}
                                </div>
                            `).join('')}
                        </div>`;
                    }
                    lucide.createIcons();
                }, 0);
                return `<h3>Mis Pedidos</h3><div id="orders-container"></div>`;
            default: return '<p>Opción no válida</p>';
        }
    },

    updateProfile: (form) => {
        const formData = new FormData(form);
        const user = DataService.getUser();
        const updates = {
            name: formData.get('name'),
            lastname: formData.get('lastname'),
            email: formData.get('email'),
            phone: formData.get('phone')
        };
        DataService.saveUser({ ...user, ...updates });
        // Also update auth
        const auth = DataService.getAuth();
        if (auth) {
            auth.name = updates.name;
            auth.email = updates.email;
            DataService.saveAuth(auth);
            app.updateAuthNav();
        }
        app.showNotification('Perfil actualizado');
        app.renderProfile('info');
    },

    cancelOrder: (orderId) => {
        if (confirm('¿Cancelar este pedido?')) {
            DataService.updateOrder(orderId, { status: 'Cancelled' });
            app.showNotification('Pedido cancelado');
            app.renderProfile('orders');
        }
    },

    renderContact: () => {
        app.container.innerHTML = `
            <div class="container section">
                <div class="contact-container">
                    <h2><span class="text-mint">Contáctanos</span></h2>
                    <p style="max-width: 600px; margin-bottom: 2rem;">Estamos aquí para ayudarte a encontrar el disfraz perfecto.</p>

                    <div class="contact-info-grid">
                        <div class="contact-card">
                            <i data-lucide="map-pin" width="48" height="48"></i>
                            <h4>Dirección</h4>
                            <p>Montería, Córdoba<br>Colombia</p>
                        </div>
                        <div class="contact-card">
                            <i data-lucide="phone" width="48" height="48"></i>
                            <h4>Teléfono</h4>
                            <p><a href="tel:+573105016135">+57 310 501 6135</a></p>
                        </div>
                        <div class="contact-card">
                            <i data-lucide="mail" width="48" height="48"></i>
                            <h4>Correo</h4>
                            <p><a href="mailto:gcrisaimara@gmail.com">gcrisaimara@gmail.com</a></p>
                        </div>
                    </div>
                    <div style="margin-top: 3rem;">
                        <button class="btn" onclick="app.navigate('home')">Volver al Inicio</button>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * CART ACTIONS
     */
    addToCart: (id) => {
        const rawProduct = STORE_PRODUCTS_CACHE.find(p => p.id === id);
        if (rawProduct) {
            const product = {
                id: rawProduct.id,
                name: rawProduct.nombre || rawProduct.name,
                price: parseFloat(rawProduct.precio || rawProduct.price),
                image: rawProduct.imagen || rawProduct.image
            };
            DataService.addToCart(product);
            app.updateCartCount();
            app.showNotification('Añadido al carrito');
        }
    },

    removeFromCart: (id) => {
        DataService.removeFromCart(id);
        app.updateCartCount();
        app.renderCart();
    },

    changeQty: (id, delta) => {
        const cart = DataService.getCart();
        const item = cart.find(i => i.id === id);
        if (item) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) {
                DataService.removeFromCart(id);
            } else {
                DataService.updateCartQuantity(id, newQty);
            }
            app.updateCartCount();
            app.renderCart();
        }
    },

    updateCartCount: () => {
        const count = DataService.getCart().reduce((sum, item) => sum + item.quantity, 0);
        const el = document.getElementById('cart-count');
        if (el) el.innerText = count;
    },

    completeOrder: async () => {
        const cart = DataService.getCart();
        if (cart.length === 0) return;

        const auth = DataService.getAuth();
        const name = document.getElementById('co-name').value;
        const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        const orderData = {
            total,
            customer: name,
            user_id: auth ? auth.id : 0,
            address: document.getElementById('co-address').value,
            items: cart
        };

        await DataService.placeOrderAsync(orderData);
        app.updateCartCount();
        app.showNotification('Pedido realizado con éxito');
        app.navigate('profile', { tab: 'orders' });
    }
};

// Initialize
document.addEventListener('DOMContentLoaded', app.init);
