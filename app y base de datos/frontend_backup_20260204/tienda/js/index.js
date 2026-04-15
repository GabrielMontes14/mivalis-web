/**
 * Index Page Logic
 * Handles global search, theme toggling, and user session display.
 */

// ============================================
// Global Search
// ============================================
function globalSearch() {
    const input = document.getElementById('global-search');
    if (input && input.value.trim()) {
        window.location.href = `/tienda/catalogo.html?search=${encodeURIComponent(input.value.trim())}`;
    }
}

// ============================================
// User Session Management
// ============================================
function checkLoginStatus() {
    const token = localStorage.getItem('customer_token');
    const customerData = localStorage.getItem('customer_data');

    if (token && customerData) {
        try {
            const customer = JSON.parse(customerData);
            const guestLinks = document.getElementById('guest-links');
            const userLinks = document.getElementById('user-links');
            const userName = document.getElementById('user-name');

            if (guestLinks) guestLinks.classList.add('hidden');
            if (userLinks) userLinks.classList.remove('hidden');
            if (userName) userName.textContent = customer.business_name || customer.email;
        } catch (e) {
            // Invalid data, clear and show guest
            logout();
        }
    }
}

function logout() {
    localStorage.removeItem('customer_token');
    localStorage.removeItem('customer_data');

    const guestLinks = document.getElementById('guest-links');
    const userLinks = document.getElementById('user-links');

    if (guestLinks) guestLinks.classList.remove('hidden');
    if (userLinks) userLinks.classList.add('hidden');

    // Optional: reload to clear state cleanly
    window.location.reload();
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

// ============================================
// Initialization & Event Listeners
// ============================================

// Run theme init immediately to prevent flash
initTheme();

document.addEventListener('DOMContentLoaded', () => {
    // Check Login
    checkLoginStatus();

    // Search Box Listener
    const searchInput = document.getElementById('global-search');
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') globalSearch();
        });
    }

    // Search Button Listener
    const searchBtn = document.getElementById('search-btn');
    if (searchBtn) {
        searchBtn.addEventListener('click', globalSearch);
    }

    // Theme Toggle Listener
    const themeBtn = document.querySelector('.theme-toggle');
    if (themeBtn) {
        themeBtn.addEventListener('click', toggleTheme);
    }

    // Logout Link Listener
    const logoutLink = document.querySelector('.logout-link');
    if (logoutLink) {
        logoutLink.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }

    // Load Bestsellers
    loadBestsellers();
});

// ============================================
// Bestsellers / Featured Products
// ============================================
async function loadBestsellers() {
    try {
        const response = await fetch('/products?featured=true&limit=20');
        if (!response.ok) throw new Error('Failed to load featured products');

        const products = await response.json();

        if (products.length === 0) {
            document.querySelectorAll('.sidebar-products').forEach(el => el.style.display = 'none');
            return;
        }

        // Split into two groups
        const midpoint = Math.ceil(products.length / 2);
        const leftProducts = products.slice(0, midpoint);
        const rightProducts = products.slice(midpoint);

        renderSidebarList('bestsellers-left', leftProducts);
        renderSidebarList('bestsellers-right', rightProducts);

    } catch (error) {
        console.error('Error loading bestsellers:', error);
        // Hide sidebars on error
        document.querySelectorAll('.sidebar-products').forEach(el => el.style.display = 'none');
    }
}

function renderSidebarList(containerId, products) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (products.length === 0) {
        container.innerHTML = '<p style="color:rgba(255,255,255,0.5); text-align:center; font-size:0.9rem;">No hay destacados</p>';
        return;
    }

    container.innerHTML = products.map(product => `
        <a href="/tienda/catalogo.html?search=${encodeURIComponent(product.name)}" class="sidebar-product-card">
            <img src="${product.image_url || '/tienda-static/img/placeholder.png'}" 
                 alt="${product.name}" 
                 class="sidebar-product-img"
                 loading="lazy">
            <div class="sidebar-product-info">
                <div class="sidebar-product-name" title="${product.name}">${product.name}</div>
                <div class="sidebar-product-price">$${formatPrice(product.price)}</div>
            </div>
        </a>
    `).join('');
}

function formatPrice(price) {
    return new Intl.NumberFormat('es-CO', {
        maximumFractionDigits: 0
    }).format(price);
}

// Register Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/tienda/sw.js')
            .then(reg => console.log('SW registered:', reg.scope))
            .catch(err => console.log('SW registration failed:', err));
    });
}
