const API_BASE = '/api';

// Zone configurations
const ZONES = {
    apple: {
        icon: '/tienda-static/img/zone_apple.png',
        title: 'Apple Zone',
        heroTitle: 'Apple Zone',
        heroSubtitle: 'iPhones, iPads, MacBooks y todo el ecosistema Apple',
        categoryId: 1
    },
    android: {
        icon: '/tienda-static/img/zone_android.png',
        title: 'Android Zone',
        heroTitle: 'Android Zone',
        heroSubtitle: 'Samsung, Xiaomi, Motorola y dispositivos Android',
        categoryId: 2
    },
    cacharros: {
        icon: '/tienda-static/img/zone_cacharros.png',
        title: 'Cacharros',
        heroTitle: 'Cacharros',
        heroSubtitle: 'Artículos variados de tecnología y electrónica',
        categoryId: 3
    },
    accesorios: {
        icon: '/tienda-static/img/zone_accesorios.png',
        title: 'Accesorios',
        heroTitle: 'Accesorios',
        heroSubtitle: 'Fundas, audífonos, vidrios templados y más',
        categoryId: 4
    }
};

// Get current zone from URL
const urlParams = new URLSearchParams(window.location.search);
const currentZone = urlParams.get('zona');

// Apply zone theme
function applyZoneTheme() {
    const body = document.getElementById('page-body');
    const searchParam = urlParams.get('search');

    if (currentZone && ZONES[currentZone]) {
        const zone = ZONES[currentZone];
        body.setAttribute('data-zone', currentZone);

        document.getElementById('zone-icon').src = zone.icon;
        document.getElementById('zone-title').textContent = zone.title;
        document.getElementById('hero-title').textContent = zone.heroTitle;
        document.getElementById('hero-subtitle').textContent = zone.heroSubtitle;
        document.getElementById('products-title').textContent = `Productos ${zone.title}`;
        document.title = `${zone.title} - Bodega Mayorista`;

        // Set placeholder for specific zone
        const searchInput = document.getElementById('catalog-search');
        if (searchInput) {
            searchInput.placeholder = `Buscar en ${zone.title}...`;
        }
    } else if (searchParam) {
        // Global Search Mode
        document.getElementById('zone-icon').src = '/tienda-static/img/logo.png';
        document.getElementById('zone-title').textContent = 'Búsqueda Global';
        document.getElementById('hero-title').textContent = `Resultados para "${searchParam}"`;
        document.getElementById('hero-subtitle').textContent = 'Explorando todo el catálogo';
        document.getElementById('products-title').textContent = 'Resultados encontrados';
        document.title = `Búsqueda: ${searchParam} - Bodega Mayorista`;

        const searchInput = document.getElementById('catalog-search');
        if (searchInput) {
            searchInput.value = searchParam;
            searchInput.placeholder = "Buscar en todo el catálogo...";
        }
    } else {
        // Default / All Products Mode
        document.getElementById('zone-icon').src = '/tienda-static/img/logo.png';
        document.getElementById('zone-title').textContent = 'Catálogo General';
        document.getElementById('hero-title').textContent = 'Todos los Productos';
        document.getElementById('hero-subtitle').textContent = 'Explora nuestro catálogo completo';
        document.getElementById('products-title').textContent = 'Catálogo Completo';
        document.title = `Catálogo - Bodega Mayorista`;
    }
}

// Load products
let searchDebounceTimeout;

async function loadProducts(searchTerm = '') {
    try {
        let url = `${API_BASE}/store/products`;
        const params = new URLSearchParams();

        if (currentZone && ZONES[currentZone]) {
            params.append('category_id', ZONES[currentZone].categoryId);
        }

        if (searchTerm) {
            params.append('search', searchTerm);
        }

        const queryString = params.toString();
        if (queryString) {
            url += `?${queryString}`;
        }

        const response = await fetch(url);
        const products = await response.json();

        renderProducts(products);
    } catch (error) {
        console.error('Error loading products:', error);
        document.getElementById('products-grid').innerHTML =
            '<p style="text-align: center; padding: 40px; color: #888;">Error cargando productos</p>';
    }
}

// Initialize Search
const searchInput = document.getElementById('catalog-search');
if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchDebounceTimeout);
        searchDebounceTimeout = setTimeout(() => {
            loadProducts(e.target.value.trim());
        }, 300);
    });

    // Focus on load if not mobile
    if (window.innerWidth > 768) {
        searchInput.focus();
    }
}

// Render products
function renderProducts(products) {
    const grid = document.getElementById('products-grid');

    if (products.length === 0) {
        grid.innerHTML = '<p style="text-align: center; padding: 40px; color: var(--text-secondary);">No hay productos disponibles</p>';
        return;
    }

    grid.innerHTML = products.map(p => `
        <div class="product-card">
            <img src="${p.image_url || 'https://via.placeholder.com/300x200?text=Producto'}" alt="${p.name}">
            <div class="product-info">
                <div class="brand">${p.brand || 'Genérico'}</div>
                <h3>${p.name}</h3>
                <div class="prices">
                    <span class="price-retail">$${formatPrice(p.price)}</span>
                    ${p.wholesale_price ? `
                        <span class="price-wholesale">
                            Mayoreo: <span>$${formatPrice(p.wholesale_price)}</span> (${p.min_wholesale_qty}+)
                        </span>
                    ` : ''}
                </div>
                <button class="add-to-cart" onclick="addToCart(${p.id}, '${escapeHtml(p.name)}', ${p.price}, '${p.image_url || ''}')">
                    Agregar al Carrito
                </button>
            </div>
        </div>
    `).join('');
}

// Format price
function formatPrice(price) {
    return parseFloat(price).toLocaleString('es-CO', { maximumFractionDigits: 0 });
}

// Escape HTML
function escapeHtml(text) {
    return text.replace(/'/g, "\\'").replace(/"/g, '\\"');
}

// Cart functions
function getCart() {
    return JSON.parse(localStorage.getItem('bodega_cart') || '[]');
}

function saveCart(cart) {
    localStorage.setItem('bodega_cart', JSON.stringify(cart));
    updateCartCount();
}

function addToCart(id, name, price, image) {
    const cart = getCart();
    const existing = cart.find(item => item.id === id);

    if (existing) {
        existing.quantity++;
    } else {
        cart.push({ id, name, price: parseFloat(price), image, quantity: 1 });
    }

    saveCart(cart);
    showNotification(`${name} agregado al carrito`);
}

function updateCartCount() {
    const cart = getCart();
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    document.getElementById('cart-count').textContent = count;
}

function showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        bottom: 100px;
        right: 30px;
        background: var(--primary, #6366f1);
        color: white;
        padding: 15px 25px;
        border-radius: 8px;
        font-weight: 600;
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => notification.remove(), 3000);
}

// ============================================
// Theme Toggle (Dark/Light Mode)
// ============================================
const THEME_STORAGE_KEY = 'bodega_theme';

function initTheme() {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
    } else if (prefersDark) {
        document.documentElement.setAttribute('data-theme', 'dark');
    }
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
}

// Initialize
initTheme();
document.addEventListener('DOMContentLoaded', () => {
    applyZoneTheme();
    // Check for initial search param
    const initialSearch = urlParams.get('search') || '';
    loadProducts(initialSearch);
    updateCartCount();
});
