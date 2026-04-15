function getCart() {
    return JSON.parse(localStorage.getItem('bodega_cart') || '[]');
}

function saveCart(cart) {
    localStorage.setItem('bodega_cart', JSON.stringify(cart));
    renderCart();
}

function renderCart() {
    const cart = getCart();
    const itemsContainer = document.getElementById('cart-items');
    const summaryContainer = document.getElementById('cart-summary');
    const emptyContainer = document.getElementById('empty-cart');

    if (cart.length === 0) {
        itemsContainer.innerHTML = '';
        summaryContainer.style.display = 'none';
        emptyContainer.style.display = 'block';
        return;
    }

    emptyContainer.style.display = 'none';
    summaryContainer.style.display = 'block';

    let total = 0;
    itemsContainer.innerHTML = cart.map(item => {
        const subtotal = item.price * item.quantity;
        total += subtotal;
        return `
            <div class="cart-item">
                <img src="${item.image || 'https://via.placeholder.com/100x100?text=Producto'}" alt="${item.name}">
                <div class="cart-item-info">
                    <h3>${item.name}</h3>
                    <p class="price">$${formatPrice(item.price)} c/u</p>
                    <p style="color: var(--text-light); font-size: 0.9rem;">Subtotal: $${formatPrice(subtotal)}</p>
                </div>
                <div class="cart-item-controls">
                    <button class="qty-btn" onclick="updateQuantity(${item.id}, -1)">−</button>
                    <input type="number" 
                           value="${item.quantity}" 
                           min="1" 
                           onchange="setQuantity(${item.id}, this.value)"
                           class="qty-input">
                    <button class="qty-btn" onclick="updateQuantity(${item.id}, 1)">+</button>
                    <button class="qty-btn" onclick="removeItem(${item.id})" style="margin-left: 10px; color: #ef4444;">✕</button>
                </div>
            </div>
        `;
    }).join('');

    document.getElementById('cart-total').textContent = `$${formatPrice(total)}`;
}

function updateQuantity(id, delta) {
    const cart = getCart();
    const item = cart.find(i => i.id === id);

    if (item) {
        item.quantity += delta;
        if (item.quantity <= 0) {
            removeItem(id);
            return;
        }
    }

    saveCart(cart);
}

function setQuantity(id, value) {
    const qty = parseInt(value);
    if (isNaN(qty) || qty < 1) {
        renderCart(); // Reset to current valid value
        return;
    }

    const cart = getCart();
    const item = cart.find(i => i.id === id);

    if (item) {
        item.quantity = qty;
        saveCart(cart);
    }
}

function removeItem(id) {
    const cart = getCart().filter(i => i.id !== id);
    saveCart(cart);
}

function formatPrice(price) {
    return parseFloat(price).toLocaleString('es-CO', { maximumFractionDigits: 0 });
}

function goToCheckout() {
    window.location.href = '/tienda/checkout.html';
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
document.addEventListener('DOMContentLoaded', renderCart);
