// Login page logic
document.getElementById('loginForm').addEventListener('submit', function (e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    if (Auth.login(username, password)) {
        window.location.href = 'dashboard.html';
    } else {
        showToast('Usuario o contraseña incorrectos', 'error');
    }
});

// Check if already logged in
if (Auth.isLoggedIn()) {
    window.location.href = 'dashboard.html';
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icons = { success: 'fa-check-circle', error: 'fa-times-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle' };
    toast.innerHTML = `<i class="fas ${icons[type]}"></i><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => { toast.style.animation = 'slideIn 0.3s ease-out reverse'; setTimeout(() => toast.remove(), 300); }, 3000);
}
