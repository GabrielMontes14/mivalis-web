const API_BASE = '/api';

function showTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.form-content').forEach(form => form.classList.remove('active'));

    if (tab === 'login') {
        document.querySelectorAll('.tab-btn')[0].classList.add('active');
        document.getElementById('login-form').classList.add('active');
    } else {
        document.querySelectorAll('.tab-btn')[1].classList.add('active');
        document.getElementById('register-form').classList.add('active');
    }

    hideMessages();
}

function showError(msg) {
    const el = document.getElementById('error-msg');
    el.textContent = msg;
    el.style.display = 'block';
    document.getElementById('success-msg').style.display = 'none';
}

function showSuccess(msg) {
    const el = document.getElementById('success-msg');
    el.textContent = msg;
    el.style.display = 'block';
    document.getElementById('error-msg').style.display = 'none';
}

function hideMessages() {
    document.getElementById('error-msg').style.display = 'none';
    document.getElementById('success-msg').style.display = 'none';
}

async function handleLogin(e) {
    e.preventDefault();
    hideMessages();

    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        const response = await fetch(`${API_BASE}/customers/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('customer_token', data.access_token);
            localStorage.setItem('customer_data', JSON.stringify(data.customer));
            showSuccess('¡Bienvenido! Redirigiendo...');
            setTimeout(() => window.location.href = '/tienda/index.html', 1500);
        } else {
            showError(data.detail || 'Credenciales incorrectas');
        }
    } catch (error) {
        showError('Error de conexión. Intenta de nuevo.');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    hideMessages();

    const data = {
        business_name: document.getElementById('reg-business').value,
        email: document.getElementById('reg-email').value,
        phone: document.getElementById('reg-phone').value || null,
        password: document.getElementById('reg-password').value
    };

    try {
        const response = await fetch(`${API_BASE}/customers/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (response.ok) {
            localStorage.setItem('customer_token', result.access_token);
            localStorage.setItem('customer_data', JSON.stringify(result.customer));
            showSuccess('¡Cuenta creada! Redirigiendo...');
            setTimeout(() => window.location.href = '/tienda/index.html', 1500);
        } else {
            showError(result.detail || 'Error al crear cuenta');
        }
    } catch (error) {
        showError('Error de conexión. Intenta de nuevo.');
    }
}

// Show forgot password form
function showForgotPassword() {
    // Hide all forms and deselect tabs
    document.querySelectorAll('.form-content').forEach(f => f.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

    // Show forgot form
    document.getElementById('forgot-form').classList.add('active');
    hideMessages();
}

// Hide forgot password form
function hideForgotPassword() {
    showTab('login');
}

// Handle forgot password submit
async function handleForgotPassword(e) {
    e.preventDefault();
    hideMessages();

    const email = document.getElementById('forgot-email').value;

    try {
        const response = await fetch(`${API_BASE}/customers/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        const result = await response.json();
        showSuccess(result.message || 'Si el correo existe, recibirás un enlace');
        document.getElementById('forgot-email').value = '';
    } catch (error) {
        showError('Error de conexión. Intenta de nuevo.');
    }
}

// Check if already logged in
if (localStorage.getItem('customer_token')) {
    window.location.href = '/tienda/index.html';
}
