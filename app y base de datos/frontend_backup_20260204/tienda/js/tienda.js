/**
 * Bodega Mayorista - Tienda JavaScript
 * E-commerce functionality with cart and checkout
 */

// ============================================
// Configuration
// ============================================
const API_BASE = '/api';
const CART_STORAGE_KEY = 'bodega_cart';

// ============================================
// State
// ============================================
let cart = [];
let products = [];
let categories = [];
let customer = null;
let customerToken = localStorage.getItem('customer_token');

// ============================================
// UI Helper Functions
// ============================================

/**
 * Show toast notification
 * @param {string} message - Message to display
 * @param {string} type - Type: 'success', 'error', 'info', 'warning'
 * @param {number} duration - Duration in ms (default: 3000)
 */
function showToast(message, type = 'info', duration = 3000) {
    // Create toast container if it doesn't exist
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    // Icon map
    const icons = {
        success: '✓',
        error: '✕',
        info: 'ℹ',
        warning: '⚠'
    };

    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || icons.info}</span>
        <span class="toast-message">${message}</span>
    `;

    container.appendChild(toast);

    // Auto-dismiss
    setTimeout(() => {
        toast.classList.add('hiding');
        setTimeout(() => {
            container.removeChild(toast);
            // Remove container if empty
            if (container.children.length === 0) {
                document.body.removeChild(container);
            }
        }, 300);
    }, duration);
}

/**
 * Show loading overlay
 */
function showLoading() {
    let overlay = document.querySelector('.loading-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.innerHTML = '<div class="loading-spinner large"></div>';
        document.body.appendChild(overlay);
    }
    overlay.style.display = 'flex';
}

/**
 * Hide loading overlay
 */
function hideLoading() {
    const overlay = document.querySelector('.loading-overlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

/**
 * Add pulse animation to cart badge
 */
function pulseCartBadge() {
    const badge = document.querySelector('.cart-badge');
    if (badge) {
        badge.classList.add('pulse');
        setTimeout(() => badge.classList.remove('pulse'), 500);
    }
}

/**
 * Get placeholder image based on category
 * @param {string} categoryName - Category name (apple, android, cacharros, accesorios)
 * @returns {string} - Placeholder image path
 */
function getPlaceholderImage(categoryName) {
    const placeholders = {
        'apple': '/tienda-static/img/placeholder_apple.png',
        'android': '/tienda-static/img/placeholder_android.png',
        'cacharros': '/tienda-static/img/placeholder_cacharros.png',
        'accesorios': '/tienda-static/img/placeholder_accesorios.png'
    };

    const category = categoryName ? categoryName.toLowerCase() : '';
    return placeholders[category] || placeholders['cacharros'];
}

// ============================================
// Initialization
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    loadCart();
    updateCartCount();
    checkCustomerAuth();

    // Initialize based on current page
    const path = window.location.pathname;

    if (path.includes('catalogo')) {
        initCatalogPage();
    } else if (path.includes('carrito')) {
        initCartPage();
    } else if (path.includes('login')) {
        initAuthPage();
    } else if (path.includes('checkout')) {
        initCheckoutPage();
    } else {
        // Home page
        initHomePage();
    }

    // Mobile menu
    initMobileMenu();

    // Search
    initSearch();
});

// ============================================
// API Functions
// ============================================
async function fetchAPI(endpoint, options = {}) {
    try {
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (customerToken) {
            headers['Authorization'] = `Bearer ${customerToken}`;
        }

        const response = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Error en la solicitud');
        }

        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// ============================================
// Home Page
// ============================================
async function initHomePage() {
    await loadCategories();
    await loadFeaturedProducts();
}

async function loadFeaturedProducts() {
    const container = document.getElementById('featured-carousel');
    const section = document.querySelector('.featured-section');
    if (!container || !section) return;

    try {
        const products = await fetchAPI('/store/featured');

        if (products.length > 0) {
            section.style.display = 'block';
            renderFeaturedCarousel(products);
        } else {
            section.style.display = 'none';
        }
    } catch (error) {
        console.error('Error loading featured:', error);
        section.style.display = 'none';
    }
}

function renderFeaturedCarousel(products) {
    const container = document.getElementById('featured-carousel');
    const customerRole = localStorage.getItem('customer_role') || 'retail';

    container.innerHTML = products.map(p => {
        // Determine price to show based on role
        let price = parseFloat(p.price);
        let oldPrice = '';

        if (customerRole === 'wholesale') {
            price = parseFloat(p.wholesale_price || p.price); // Use wholesale price
            // Show retail price as crossed out if wholesale price is lower
            if (p.price > price) {
                oldPrice = `<span class="old">$${parseFloat(p.price).toLocaleString('es-MX')}</span>`;
            }
        }

        return `
        <div class="carousel-card">
            <div class="carousel-image-container">
                <img src="${p.image_url || getPlaceholderImage(p.category?.name)}" alt="${p.name}" loading="lazy">
                ${p.stock < 5 ? `<span class="status-badge low-stock">¡Pocas Unidades!</span>` : ''}
            </div>
            <div class="carousel-info">
                <div class="carousel-brand">${p.brand || 'Genérico'}</div>
                <h3>${p.name}</h3>
                <div class="carousel-price">
                    <div>
                        ${oldPrice}
                        <span class="current">$${price.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <button class="carousel-add-btn" onclick="addToCart({
                        id: ${p.id},
                        name: '${p.name.replace(/'/g, "\\'")}',
                        price: ${p.price}, 
                        wholesale_price: ${p.wholesale_price || p.price},
                        image_url: '${p.image_url || ''}',
                        stock: ${p.stock}
                    })" title="Agregar al carrito">
                        +
                    </button>
                </div>
            </div>
        </div>
    `}).join('');
}

function scrollCarousel(direction) {
    const container = document.getElementById('featured-carousel');
    if (container) {
        const scrollAmount = 300; // Card width + gap approx
        container.scrollBy({
            left: direction * scrollAmount,
            behavior: 'smooth'
        });
    }
}


function renderCategories() {
    const grid = document.getElementById('categories-grid');
    if (!grid) return;

    grid.innerHTML = categories.map(cat => `
        <a href="/tienda/catalogo.html?category=${cat.id}" class="category-card">
            <div class="category-icon">${cat.icon || '📦'}</div>
            <div class="category-name">${cat.name}</div>
        </a>
    `).join('');
}

// Duplicate function removed.


// ============================================
// Catalog Page
// ============================================
async function initCatalogPage() {
    await loadCategories();
    renderCategoryFilters();

    // Get category from URL
    const urlParams = new URLSearchParams(window.location.search);
    const categoryId = urlParams.get('category');

    await loadProducts(categoryId);
}

function renderCategoryFilters() {
    const container = document.getElementById('category-filters');
    if (!container) return;

    const allBtn = `<button class="filter-btn active" data-category="">Todos</button>`;
    const catBtns = categories.map(cat => `
        <button class="filter-btn" data-category="${cat.id}">${cat.icon} ${cat.name}</button>
    `).join('');

    container.innerHTML = allBtn + catBtns;

    // Add click handlers
    container.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            container.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            await loadProducts(btn.dataset.category);
        });
    });
}

async function loadProducts(categoryId = null, search = null) {
    try {
        let endpoint = '/store/products?limit=50';
        if (categoryId) endpoint += `&category_id=${categoryId}`;
        if (search) endpoint += `&search=${encodeURIComponent(search)}`;

        products = await fetchAPI(endpoint);
        renderProducts(products, 'products-grid');

        // Update count
        const resultsEl = document.getElementById('results-count');
        if (resultsEl) {
            resultsEl.textContent = `${products.length} producto${products.length !== 1 ? 's' : ''} encontrado${products.length !== 1 ? 's' : ''}`;
        }
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

// ============================================
// Product Rendering
// ============================================
function renderProducts(productList, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (productList.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>No se encontraron productos</p>
            </div>
        `;
        return;
    }

    container.innerHTML = productList.map(product => {
        const userRole = localStorage.getItem('customer_role');
        const isWholesaleUser = userRole === 'wholesale';
        const hasWholesale = product.wholesale_price && product.wholesale_price < product.price;
        const discount = hasWholesale ? Math.round((1 - product.wholesale_price / product.price) * 100) : 0;
        let displayPrice = parseFloat(product.price);
        if (isWholesaleUser && product.wholesale_price) displayPrice = parseFloat(product.wholesale_price);

        return `
            <div class="product-card" data-product-id="${product.id}">
                <div class="product-image">
                    ${product.image_url ?
                `<img src="${product.image_url}" alt="${product.name}" onerror="this.src='${getPlaceholderImage(product.category?.name)}'">` :
                `<img src="${getPlaceholderImage(product.category?.name)}" alt="${product.name}">`
            }
                    ${discount > 0 ? `<span class="product-badge">-${discount}% Mayoreo</span>` : ''}
                </div>
                <div class="product-info">
                    <div class="product-category">${product.category?.name || 'General'}</div>
                    <h3 class="product-name">${product.name}</h3>
                    <p class="product-brand">${product.brand || ''} • ${product.unit}</p>
                    <div class="product-pricing">
                        <span class="price-current">$${displayPrice.toFixed(2)}</span>
                        ${(!isWholesaleUser && hasWholesale) ?
                `<span class="price-wholesale">$${parseFloat(product.wholesale_price).toFixed(2)} x${product.min_wholesale_qty}+</span>` :
                ''
            }
                    </div>
                    <p class="product-stock">Stock: ${product.stock} unidades</p>
                    <button class="add-to-cart-btn" onclick="openStoreModal(${product.id})">
                        ${(product.storage || product.color) ? '🎨 Ver Opciones' : '🛒 Agregar'}
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// ============================================
// Cart Functions
// ============================================
function loadCart() {
    try {
        const saved = localStorage.getItem(CART_STORAGE_KEY);
        cart = saved ? JSON.parse(saved) : [];
    } catch (error) {
        cart = [];
    }
}

function saveCart() {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    updateCartCount();
    pulseCartBadge();
}

function updateCartCount() {
    const countEl = document.getElementById('cart-count');
    if (countEl) {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        countEl.textContent = totalItems;
    }
}

async function addToCart(productId, quantity = 1) {
    // Find product in current list or fetch it
    let product = products.find(p => p.id === productId);

    if (!product) {
        try {
            product = await fetchAPI(`/store/products/${productId}`);
        } catch (error) {
            showToast('Error al agregar producto', 'error');
            return;
        }
    }

    // Check if already in cart
    const existingIndex = cart.findIndex(item => item.product_id === productId);

    if (existingIndex >= 0) {
        cart[existingIndex].quantity += quantity;
        // Recalculate price based on new quantity
        cart[existingIndex].unit_price = getUnitPrice(product, cart[existingIndex].quantity);
    } else {
        const unitPrice = getUnitPrice(product, quantity);
        cart.push({
            product_id: productId,
            name: product.name,
            brand: product.brand,
            unit: product.unit,
            quantity: quantity,
            unit_price: unitPrice,
            base_price: parseFloat(product.price),
            wholesale_price: product.wholesale_price ? parseFloat(product.wholesale_price) : null,
            min_wholesale_qty: product.min_wholesale_qty || 12,
            image_url: product.image_url,
            category_name: product.category?.name,
            tiered_pricing: product.tiered_pricing || []
        });
    }

    saveCart();
    showToast(`${product.name} agregado al carrito`, 'success');
}

function getUnitPrice(product, quantity) {
    // Check if user is wholesale
    const userRole = localStorage.getItem('customer_role');

    // If user is wholesale, ALWAYS use wholesale price (if available)
    if (userRole === 'wholesale' && product.wholesale_price) {
        return parseFloat(product.wholesale_price);
    }

    // Standard Tiered Pricing (for retail users or volume discounts)
    if (product.tiered_pricing && product.tiered_pricing.length > 0) {
        const sortedTiers = [...product.tiered_pricing].sort((a, b) => b.min_quantity - a.min_quantity);
        for (const tier of sortedTiers) {
            if (quantity >= tier.min_quantity) {
                return parseFloat(tier.price_per_unit);
            }
        }
    }

    // Volume-based wholesale (for non-wholesale users who buy enough quantity)
    if (product.wholesale_price && quantity >= (product.min_wholesale_qty || 12)) {
        return parseFloat(product.wholesale_price);
    }

    return parseFloat(product.price);
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.product_id !== productId);
    saveCart();
    if (window.location.pathname.includes('carrito')) {
        renderCartPage();
    }
}

function updateCartQuantity(productId, newQuantity) {
    const index = cart.findIndex(item => item.product_id === productId);
    if (index >= 0) {
        if (newQuantity <= 0) {
            removeFromCart(productId);
        } else {
            cart[index].quantity = newQuantity;
            // Recalculate price based on new quantity
            cart[index].unit_price = getUnitPriceFromCart(cart[index], newQuantity);
            saveCart();
            renderCartPage();
        }
    }
}

function getUnitPriceFromCart(cartItem, quantity) {
    // Check if user is wholesale
    const userRole = localStorage.getItem('customer_role');

    // If user is wholesale, ALWAYS use wholesale price (if available)
    if (userRole === 'wholesale' && cartItem.wholesale_price) {
        return parseFloat(cartItem.wholesale_price);
    }

    // Check tiered pricing first
    if (cartItem.tiered_pricing && cartItem.tiered_pricing.length > 0) {
        const sortedTiers = [...cartItem.tiered_pricing].sort((a, b) => b.min_quantity - a.min_quantity);
        for (const tier of sortedTiers) {
            if (quantity >= tier.min_quantity) {
                return parseFloat(tier.price_per_unit);
            }
        }
    }

    // Fall back to wholesale price (volume based)
    if (cartItem.wholesale_price && quantity >= cartItem.min_wholesale_qty) {
        return cartItem.wholesale_price;
    }

    return cartItem.base_price;
}

// ============================================
// Cart Page
// ============================================
function initCartPage() {
    renderCartPage();
}

function renderCartPage() {
    const container = document.getElementById('cart-content');
    if (!container) return;

    if (cart.length === 0) {
        container.innerHTML = `
            <div class="empty-cart">
                <div class="empty-cart-icon">🛒</div>
                <h3>Tu carrito está vacío</h3>
                <p>Agrega productos desde nuestro catálogo</p>
                <a href="/tienda/catalogo.html" class="btn btn-primary">Ver Catálogo</a>
            </div>
        `;
        return;
    }

    // Calculate totals
    let subtotal = 0;
    let originalTotal = 0;

    cart.forEach(item => {
        subtotal += item.unit_price * item.quantity;
        originalTotal += item.base_price * item.quantity;
    });

    const discount = originalTotal - subtotal;
    const total = subtotal;

    container.innerHTML = `
        <div class="cart-container">
            <div class="cart-items">
                <h3>Productos en tu carrito</h3>
                ${cart.map(item => `
                    <div class="cart-item">
                        <div class="cart-item-image">
                            <img src="${item.image_url || 'https://via.placeholder.com/80?text=Producto'}" alt="${item.name}">
                        </div>
                        <div class="cart-item-info">
                            <h4>${item.name}</h4>
                            <p>${item.brand || ''} • ${item.unit}</p>
                            <p class="item-unit-price">$${item.unit_price.toFixed(2)} c/u</p>
                        </div>
                        <div class="cart-item-quantity">
                            <button class="qty-btn" onclick="updateCartQuantity(${item.product_id}, ${item.quantity - 1})">−</button>
                            <input type="number" class="qty-input" value="${item.quantity}" 
                                   onchange="updateCartQuantity(${item.product_id}, parseInt(this.value) || 1)"
                                   min="1">
                            <button class="qty-btn" onclick="updateCartQuantity(${item.product_id}, ${item.quantity + 1})">+</button>
                        </div>
                        <div class="cart-item-total">
                            $${(item.unit_price * item.quantity).toFixed(2)}
                        </div>
                        <button class="remove-item" onclick="removeFromCart(${item.product_id})">✕</button>
                    </div>
                `).join('')}
            </div>
            
            <div class="cart-summary">
                <h3>Resumen del Pedido</h3>
                <div class="summary-row">
                    <span>Subtotal</span>
                    <span>$${originalTotal.toFixed(2)}</span>
                </div>
                ${discount > 0 ? `
                    <div class="summary-row" style="color: var(--accent);">
                        <span>Descuento Mayorista</span>
                        <span>-$${discount.toFixed(2)}</span>
                    </div>
                ` : ''}
                <div class="summary-row total">
                    <span>Total</span>
                    <span class="value">$${total.toFixed(2)}</span>
                </div>
                ${discount > 0 ? `
                    <div class="discount-note">
                        ✅ ¡Estás ahorrando $${discount.toFixed(2)} con precios mayoristas!
                    </div>
                ` : `
                    <div class="discount-note" style="color: var(--text-secondary);">
                        💡 Compra más para obtener descuentos mayoristas
                    </div>
                `}
                <button class="checkout-btn" onclick="goToCheckout()" ${!customerToken ? 'disabled' : ''}>
                    ${customerToken ? 'Proceder al Pago' : 'Inicia sesión para comprar'}
                </button>
                ${!customerToken ? `
                    <p style="text-align: center; margin-top: 15px; font-size: 0.9rem;">
                        <a href="/tienda/login.html" style="color: var(--primary);">Iniciar sesión</a> o 
                        <a href="/tienda/login.html" style="color: var(--primary);">crear cuenta</a>
                    </p>
                ` : ''}
            </div>
        </div>
    `;
}

function goToCheckout() {
    if (!customerToken) {
        showToast('Inicia sesión para continuar', 'error');
        window.location.href = '/tienda/login.html';
        return;
    }
    window.location.href = '/tienda/checkout.html';
}

// ============================================
// Checkout Page
// ============================================
async function initCheckoutPage() {
    if (!customerToken) {
        window.location.href = '/tienda/login.html';
        return;
    }

    if (cart.length === 0) {
        window.location.href = '/tienda/carrito.html';
        return;
    }

    renderCheckoutPage();
}

function renderCheckoutPage() {
    const container = document.getElementById('checkout-content');
    if (!container) return;

    // Calculate totals
    let subtotal = 0;
    cart.forEach(item => {
        subtotal += item.unit_price * item.quantity;
    });

    container.innerHTML = `
        <div class="checkout-container">
            <div class="checkout-form">
                <h3>Datos de Entrega</h3>
                <form id="checkout-form" onsubmit="submitOrder(event)">
                    <div class="form-group">
                        <label>Dirección de Entrega</label>
                        <textarea id="delivery-address" rows="3" placeholder="Calle, número, colonia, ciudad..." required></textarea>
                    </div>
                    <div class="form-group">
                        <label>Notas del Pedido (opcional)</label>
                        <textarea id="order-notes" rows="2" placeholder="Instrucciones especiales..."></textarea>
                    </div>
                    <button type="submit" class="checkout-btn">Confirmar Pedido</button>
                </form>
            </div>
            
            <div class="checkout-summary">
                <h3>Tu Pedido</h3>
                ${cart.map(item => `
                    <div class="checkout-item">
                        <span>${item.quantity}x ${item.name}</span>
                        <span>$${(item.unit_price * item.quantity).toFixed(2)}</span>
                    </div>
                `).join('')}
                <div class="summary-row total">
                    <span>Total</span>
                    <span class="value">$${subtotal.toFixed(2)}</span>
                </div>
            </div>
        </div>
    `;
}

async function submitOrder(event) {
    event.preventDefault();

    const deliveryAddress = document.getElementById('delivery-address').value;
    const notes = document.getElementById('order-notes').value;

    const orderData = {
        items: cart.map(item => ({
            product_id: item.product_id,
            quantity: item.quantity
        })),
        delivery_address: deliveryAddress,
        notes: notes
    };

    try {
        const order = await fetchAPI('/orders', {
            method: 'POST',
            body: JSON.stringify(orderData)
        });

        // Clear cart
        cart = [];
        saveCart();

        showToast('¡Pedido realizado exitosamente!', 'success');

        // Show confirmation
        document.getElementById('checkout-content').innerHTML = `
            <div class="order-confirmation">
                <div class="confirmation-icon">✅</div>
                <h2>¡Gracias por tu pedido!</h2>
                <p>Tu número de orden es: <strong>${order.order_number}</strong></p>
                <p>Total: <strong>$${parseFloat(order.total).toFixed(2)}</strong></p>
                <p>Te contactaremos pronto para coordinar la entrega.</p>
                <a href="/tienda/catalogo.html" class="btn btn-primary">Seguir Comprando</a>
            </div>
        `;
    } catch (error) {
        showToast(error.message || 'Error al procesar el pedido', 'error');
    }
}

// ============================================
// Authentication
// ============================================
function checkCustomerAuth() {
    if (customerToken) {
        // Verify token is still valid
        fetchAPI('/customers/me')
            .then(data => {
                customer = data;
                updateAuthUI();
            })
            .catch(() => {
                // Token invalid, clear it
                localStorage.removeItem('customer_token');
                customerToken = null;
                customer = null;
                updateAuthUI();
            });
    }
}

function updateAuthUI() {
    const authBtn = document.getElementById('auth-btn');
    if (authBtn) {
        if (customer) {
            authBtn.textContent = customer.business_name || 'Mi Cuenta';
            authBtn.href = '/tienda/cuenta.html';
        } else {
            authBtn.textContent = 'Iniciar Sesión';
            authBtn.href = '/tienda/login.html';
        }
    }
}

function initAuthPage() {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const tabs = document.querySelectorAll('.auth-tab');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const formType = tab.dataset.form;
            if (formType === 'login') {
                loginForm.style.display = 'block';
                registerForm.style.display = 'none';
            } else {
                loginForm.style.display = 'none';
                registerForm.style.display = 'block';
            }
        });
    });

    loginForm?.addEventListener('submit', handleLogin);
    registerForm?.addEventListener('submit', handleRegister);
}

async function handleLogin(event) {
    event.preventDefault();

    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        const data = await fetchAPI('/customers/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });

        localStorage.setItem('customer_token', data.access_token);
        customerToken = data.access_token;
        customer = data.customer;

        showToast('¡Bienvenido!', 'success');

        // Redirect
        setTimeout(() => {
            window.location.href = cart.length > 0 ? '/tienda/carrito.html' : '/tienda/';
        }, 1000);
    } catch (error) {
        showToast(error.message || 'Error al iniciar sesión', 'error');
    }
}

async function handleRegister(event) {
    event.preventDefault();

    const formData = {
        email: document.getElementById('register-email').value,
        password: document.getElementById('register-password').value,
        business_name: document.getElementById('register-business').value,
        contact_name: document.getElementById('register-contact').value,
        phone: document.getElementById('register-phone').value
    };

    try {
        const data = await fetchAPI('/customers/register', {
            method: 'POST',
            body: JSON.stringify(formData)
        });

        localStorage.setItem('customer_token', data.access_token);
        customerToken = data.access_token;
        customer = data.customer;

        showToast('¡Cuenta creada exitosamente!', 'success');

        setTimeout(() => {
            window.location.href = '/tienda/';
        }, 1000);
    } catch (error) {
        showToast(error.message || 'Error al crear cuenta', 'error');
    }
}

function logout() {
    localStorage.removeItem('customer_token');
    customerToken = null;
    customer = null;
    window.location.href = '/tienda/';
}

// ============================================
// Search
// ============================================
function initSearch() {
    const searchInput = document.getElementById('global-search');
    const searchBtn = document.querySelector('.search-btn') || document.getElementById('search-btn');

    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                performSearch(searchInput.value);
            }
        });
    }

    if (searchBtn) {
        searchBtn.addEventListener('click', () => {
            performSearch(searchInput?.value);
        });
    }
}

function performSearch(query) {
    if (!query || query.trim() === '') return;
    window.location.href = `/tienda/catalogo.html?search=${encodeURIComponent(query.trim())}`;
}

// ============================================
// Mobile Menu
// ============================================
function initMobileMenu() {
    const menuBtn = document.getElementById('mobile-menu-btn');
    const closeBtn = document.getElementById('close-menu');
    const mobileMenu = document.getElementById('mobile-menu');

    menuBtn?.addEventListener('click', () => {
        mobileMenu?.classList.add('active');
    });

    closeBtn?.addEventListener('click', () => {
        mobileMenu?.classList.remove('active');
    });
}

// Duplicate showToast removed


// ============================================
// Modal Functions
// ============================================
function openStoreModal(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const modal = document.getElementById('store-modal');
    if (!modal) return;

    // Populate data
    document.getElementById('modal-img').src = product.image_url || getPlaceholderImage(product.category?.name);
    document.getElementById('modal-brand').textContent = product.brand || 'Genérico';
    document.getElementById('modal-name').textContent = product.name;
    document.getElementById('modal-price').textContent = `$${parseFloat(product.price).toLocaleString('es-MX')}`;
    document.getElementById('modal-description').textContent = product.description || '';

    // Quantity
    document.getElementById('modal-qty').value = 1;

    // Wholesale info
    const wholesaleDiv = document.getElementById('modal-wholesale-info');
    if (product.wholesale_price && product.wholesale_price < product.price) {
        wholesaleDiv.textContent = `Mayorista: $${parseFloat(product.wholesale_price).toLocaleString('es-MX')} (x${product.min_wholesale_qty}+)`;
    } else {
        wholesaleDiv.textContent = '';
    }

    // Add button action
    const addBtn = document.getElementById('modal-add-btn');
    addBtn.onclick = () => {
        const qty = parseInt(document.getElementById('modal-qty').value) || 1;
        addToCart(product.id, qty);
        closeStoreModal();
    };

    modal.classList.add('active');
}

function closeStoreModal() {
    document.getElementById('store-modal')?.classList.remove('active');
}

function updateModalQty(change) {
    const input = document.getElementById('modal-qty');
    let val = parseInt(input.value) || 1;
    val += change;
    if (val < 1) val = 1;
    input.value = val;
}

// ============================================
// Additional Helpers
// ============================================
async function loadCategories() {
    try {
        categories = await fetchAPI('/categories');
        renderCategories(); // For home page
        renderCategoryFilters(); // For catalog
    } catch (error) {
        console.warn('Could not load categories:', error);
        categories = [];
    }
}

// Expose functions globally
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.updateCartQuantity = updateCartQuantity;
window.goToCheckout = goToCheckout;
window.logout = logout;
window.openStoreModal = openStoreModal;
window.closeStoreModal = closeStoreModal;
window.updateModalQty = updateModalQty;

