const API_BASE = '/api';

// Get token from URL
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token');

if (!token) {
    document.getElementById('message').textContent = 'Enlace inválido. Solicita uno nuevo.';
    document.getElementById('message').classList.add('error');
    document.getElementById('reset-form').style.display = 'none';
}

async function handleReset(e) {
    e.preventDefault();

    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    const messageEl = document.getElementById('message');
    const submitBtn = document.getElementById('submit-btn');

    // Clear previous messages
    messageEl.className = 'message';
    messageEl.style.display = 'none';

    // Validate passwords match
    if (newPassword !== confirmPassword) {
        messageEl.textContent = 'Las contraseñas no coinciden';
        messageEl.classList.add('error');
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Procesando...';

    try {
        const response = await fetch(`${API_BASE}/customers/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                token: token,
                new_password: newPassword
            })
        });

        const result = await response.json();

        if (response.ok) {
            messageEl.textContent = '¡Contraseña actualizada! Redirigiendo...';
            messageEl.classList.add('success');
            document.getElementById('reset-form').style.display = 'none';
            setTimeout(() => window.location.href = 'login.html', 2000);
        } else {
            messageEl.textContent = result.detail || 'Error al cambiar contraseña';
            messageEl.classList.add('error');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Cambiar Contraseña';
        }
    } catch (error) {
        messageEl.textContent = 'Error de conexión. Intenta de nuevo.';
        messageEl.classList.add('error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Cambiar Contraseña';
    }
}
