function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        status: params.get('status') || 'unknown',
        id: params.get('id'),
        env: params.get('env')
    };
}

function getLastTransaction() {
    const data = localStorage.getItem('last_transaction');
    return data ? JSON.parse(data) : null;
}

function formatPrice(price) {
    return parseFloat(price).toLocaleString('es-CO', { maximumFractionDigits: 0 });
}

function renderResult() {
    const params = getUrlParams();
    const transaction = getLastTransaction();
    const card = document.getElementById('result-card');
    const content = document.getElementById('result-content');

    let html = '';

    switch (params.status) {
        case 'success':
        case 'APPROVED':
            card.classList.add('status-success');
            html = `
                <div class="result-icon">✅</div>
                <h1>¡Pago Exitoso!</h1>
                <p>Tu pedido ha sido procesado correctamente</p>
                ${transaction ? `
                    <div class="result-details">
                        <div class="row">
                            <span class="label">Referencia:</span>
                            <span class="value">${transaction.reference || '-'}</span>
                        </div>
                        <div class="row">
                            <span class="label">Total:</span>
                            <span class="value">$${formatPrice(transaction.amount)} COP</span>
                        </div>
                        <div class="row">
                            <span class="label">Estado:</span>
                            <span class="value" style="color: #22c55e;">Aprobado ✓</span>
                        </div>
                    </div>
                ` : ''}
                <p style="font-size: 0.9rem;">Te enviaremos un correo con los detalles de tu pedido</p>
                <div style="margin-top: 25px;">
                    <a href="index.html" class="btn btn-primary">Volver a la Tienda</a>
                </div>
            `;
            break;

        case 'pending':
        case 'PENDING':
            card.classList.add('status-pending');
            html = `
                <div class="result-icon">⏳</div>
                <h1>Pago Pendiente</h1>
                <p>Tu pago está siendo procesado</p>
                ${transaction ? `
                    <div class="result-details">
                        <div class="row">
                            <span class="label">Referencia:</span>
                            <span class="value">${transaction.reference || '-'}</span>
                        </div>
                        <div class="row">
                            <span class="label">Total:</span>
                            <span class="value">$${formatPrice(transaction.amount)} COP</span>
                        </div>
                        <div class="row">
                            <span class="label">Estado:</span>
                            <span class="value" style="color: #f59e0b;">Pendiente</span>
                        </div>
                    </div>
                ` : ''}
                <p style="font-size: 0.9rem;">Te notificaremos por correo cuando se confirme el pago</p>
                <div style="margin-top: 25px;">
                    <a href="index.html" class="btn btn-primary">Volver a la Tienda</a>
                </div>
            `;
            break;

        case 'error':
        case 'DECLINED':
        case 'VOIDED':
        case 'ERROR':
            card.classList.add('status-error');
            html = `
                <div class="result-icon">❌</div>
                <h1>Pago No Completado</h1>
                <p>Hubo un problema al procesar tu pago</p>
                <p style="font-size: 0.9rem;">Verifica los datos de tu tarjeta o intenta con otro método de pago</p>
                <div style="margin-top: 25px;">
                    <a href="checkout.html" class="btn btn-primary">Intentar de Nuevo</a>
                    <a href="carrito.html" class="btn btn-secondary">Ver Carrito</a>
                </div>
            `;
            break;

        default:
            html = `
                <div class="result-icon">🤔</div>
                <h1>Estado Desconocido</h1>
                <p>No pudimos determinar el estado de tu pago</p>
                <p style="font-size: 0.9rem;">Si realizaste un pago, contacta con soporte</p>
                <div style="margin-top: 25px;">
                    <a href="index.html" class="btn btn-primary">Ir a la Tienda</a>
                </div>
            `;
    }

    content.innerHTML = html;
}

// Render on load
document.addEventListener('DOMContentLoaded', renderResult);
