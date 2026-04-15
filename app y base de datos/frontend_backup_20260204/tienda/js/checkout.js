// =====================================================
// CONFIGURACIÓN - WOMPI SANDBOX (PRUEBAS)
// =====================================================
// Esta es la llave PÚBLICA de sandbox de Wompi
// En producción, reemplaza con tu llave pública real
const WOMPI_PUBLIC_KEY = 'pub_stagtest_g2u0HQd3ZMh05hsSgTS2lUV8t3s4mOt7';

// URL de tu sitio (para redirecciones)
const SITE_URL = window.location.origin;

// Moneda (COP = Pesos Colombianos)
const CURRENCY = 'COP';

// =====================================================
// VARIABLES GLOBALES
// =====================================================
let selectedPaymentMethod = 'card';
let orderTotal = 0;
let orderReference = '';

// =====================================================
// FUNCIONES DE UTILIDAD
// =====================================================

function getCart() {
    return JSON.parse(localStorage.getItem('bodega_cart') || '[]');
}

function clearCart() {
    localStorage.removeItem('bodega_cart');
}

function getCustomerToken() {
    return localStorage.getItem('customer_token');
}

function getCustomerData() {
    const data = localStorage.getItem('customer_data');
    return data ? JSON.parse(data) : null;
}

function formatPrice(price) {
    return parseFloat(price).toLocaleString('es-CO', { maximumFractionDigits: 0 });
}

function generateReference() {
    // Genera referencia única para la transacción
    return 'BM-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5).toUpperCase();
}

function showMessage(text, type = 'info') {
    const msg = document.getElementById('msg');
    msg.textContent = text;
    msg.className = 'message ' + type;
}

// =====================================================
// SELECCIÓN DE MÉTODO DE PAGO
// =====================================================

function selectPayment(method) {
    selectedPaymentMethod = method;

    // Actualizar UI
    document.querySelectorAll('.payment-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    event.currentTarget.classList.add('selected');

    // Mostrar/ocultar botones según método
    const payBtn = document.getElementById('pay-btn');
    const paypalContainer = document.getElementById('paypal-button-container');

    if (method === 'paypal') {
        payBtn.style.display = 'none';
        paypalContainer.style.display = 'block';
    } else {
        payBtn.style.display = 'block';
        paypalContainer.style.display = 'none';
    }
}

// =====================================================
// INICIALIZACIÓN
// =====================================================

function initCheckout() {
    const token = getCustomerToken();
    const cart = getCart();

    // Verificar login
    if (!token) {
        document.getElementById('checkout-content').style.display = 'none';
        document.getElementById('login-required').style.display = 'block';
        return;
    }

    // Verificar carrito
    if (cart.length === 0) {
        window.location.href = '/tienda/carrito.html';
        return;
    }

    // Pre-llenar datos del cliente
    const customer = getCustomerData();
    if (customer) {
        if (customer.contact_name) document.getElementById('customer_name').value = customer.contact_name;
        if (customer.email) document.getElementById('email').value = customer.email;
        if (customer.phone) document.getElementById('phone').value = customer.phone;
        if (customer.address) document.getElementById('address').value = customer.address;
    }

    // Renderizar items
    renderOrderItems(cart);

    // Generar referencia
    orderReference = generateReference();

    // Inicializar PayPal
    initPayPal();
}

function renderOrderItems(cart) {
    const container = document.getElementById('order-items');
    let subtotal = 0;

    container.innerHTML = cart.map(item => {
        const itemTotal = item.price * item.quantity;
        subtotal += itemTotal;
        return `
            <div class="order-item">
                <img src="${item.image || 'https://via.placeholder.com/55x55?text=📦'}" alt="${item.name}">
                <div class="order-item-info">
                    <h4>${item.name}</h4>
                    <span class="qty">Cant: ${item.quantity}</span>
                </div>
                <span class="order-item-price">$${formatPrice(itemTotal)}</span>
            </div>
        `;
    }).join('');

    orderTotal = subtotal;
    document.getElementById('subtotal').textContent = `$${formatPrice(subtotal)}`;
    document.getElementById('total').textContent = `$${formatPrice(subtotal)}`;
}

// =====================================================
// PROCESAMIENTO DE PAGOS - WOMPI
// =====================================================

function processPayment() {
    // Validar formulario
    const name = document.getElementById('customer_name').value;
    const email = document.getElementById('email').value;
    const phone = document.getElementById('phone').value;
    const address = document.getElementById('address').value;

    if (!name || !email || !phone || !address) {
        showMessage('Por favor completa todos los campos requeridos', 'error');
        return;
    }

    // Validar email
    if (!email.includes('@')) {
        showMessage('Por favor ingresa un email válido', 'error');
        return;
    }

    // Procesar según método seleccionado
    switch (selectedPaymentMethod) {
        case 'card':
        case 'pse':
        case 'nequi':
        case 'bancolombia':
            openWompiCheckout();
            break;
        case 'cash':
            processCashPayment();
            break;
        case 'transfer':
            processTransferPayment();
            break;
        default:
            showMessage('Método de pago no válido', 'error');
    }
}

// =====================================================
// PAGO POR TRANSFERENCIA BANCARIA (Pedido Manual)
// =====================================================

async function processTransferPayment() {
    const payBtn = document.getElementById('pay-btn');
    payBtn.disabled = true;
    payBtn.textContent = 'Procesando...';
    showMessage('Creando tu pedido...', 'info');

    try {
        const cart = getCart();
        const token = getCustomerToken();

        // Preparar datos del pedido
        const orderData = {
            items: cart.map(item => ({
                product_id: item.id,
                quantity: item.quantity,
                product_name: item.name,
                unit_price: item.price
            })),
            delivery_address: document.getElementById('address').value,
            notes: `Pago por Transferencia Bancaria - Ref: ${orderReference}`
        };

        // Crear pedido en el backend
        const response = await fetch('/api/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(orderData)
        });

        if (response.ok) {
            const order = await response.json();

            // Limpiar carrito
            clearCart();

            // Guardar info para página de resultado
            localStorage.setItem('last_transaction', JSON.stringify({
                id: order.order_number,
                reference: orderReference,
                amount: orderTotal,
                status: 'PENDING',
                payment_method: 'transfer'
            }));

            showMessage('¡Pedido creado! Te llegará un correo de confirmación.', 'success');

            setTimeout(() => {
                window.location.href = 'pago-resultado.html?status=pending';
            }, 2000);
        } else {
            const error = await response.json();
            showMessage(error.detail || 'Error al crear el pedido', 'error');
            payBtn.disabled = false;
            payBtn.textContent = 'Pagar Ahora 🔒';
        }
    } catch (error) {
        console.error('Error:', error);
        showMessage('Error de conexión. Intenta de nuevo.', 'error');
        payBtn.disabled = false;
        payBtn.textContent = 'Pagar Ahora 🔒';
    }
}

// =====================================================
// WOMPI CHECKOUT WIDGET
// =====================================================

function openWompiCheckout() {
    /*
     * FLUJO DE PAGO CON WOMPI:
     * 1. Cliente hace clic en "Pagar"
     * 2. Se abre el widget de Wompi (checkout seguro)
     * 3. Cliente ingresa datos de pago en el widget de Wompi
     * 4. Wompi procesa el pago con el banco
     * 5. Wompi redirige de vuelta con el resultado
     * 6. (Opcional) Webhook notifica a tu servidor
     * 
     * IMPORTANTE: Los datos de tarjeta NUNCA tocan tu servidor
     */

    const checkout = new WidgetCheckout({
        currency: CURRENCY,
        amountInCents: orderTotal * 100, // Wompi usa centavos
        reference: orderReference,
        publicKey: WOMPI_PUBLIC_KEY,

        // Información del cliente
        customerData: {
            email: document.getElementById('email').value,
            fullName: document.getElementById('customer_name').value,
            phoneNumber: document.getElementById('phone').value.replace(/\s/g, ''),
            phoneNumberPrefix: '+57',
            legalId: document.getElementById('document').value || '1234567890',
            legalIdType: 'CC'
        },

        // Metadatos (se guardan con la transacción)
        metadata: {
            orden_ref: orderReference,
            direccion: document.getElementById('address').value,
            metodo: selectedPaymentMethod
        },

        // URLs de redirección
        redirectUrl: `${SITE_URL}/tienda/pago-resultado.html`
    });

    // Abrir el widget
    checkout.open(function (result) {
        /*
         * CALLBACK cuando se cierra el widget
         * result contiene información de la transacción
         */
        const transaction = result.transaction;

        if (transaction) {
            console.log('Transacción:', transaction);

            if (transaction.status === 'APPROVED') {
                handlePaymentSuccess(transaction);
            } else if (transaction.status === 'PENDING') {
                handlePaymentPending(transaction);
            } else {
                handlePaymentError(transaction);
            }
        }
    });
}

// =====================================================
// PAGO EN EFECTIVO (Referencia)
// =====================================================

function processCashPayment() {
    /*
     * PAGO EN EFECTIVO:
     * 1. Se genera una referencia de pago
     * 2. Cliente lleva la referencia a Efecty/Baloto
     * 3. Paga en efectivo
     * 4. Wompi notifica via webhook cuando se confirma
     */

    showMessage('Generando referencia de pago...', 'info');

    // En producción, esto iría al backend para crear la referencia
    // Por ahora, simulamos con el widget de Wompi
    openWompiCheckout();
}

// =====================================================
// PAYPAL INTEGRATION
// =====================================================

function initPayPal() {
    /*
     * PAYPAL CHECKOUT:
     * - Ideal para pagos internacionales
     * - Soporta múltiples monedas
     * - El cliente puede pagar con su cuenta PayPal o tarjeta
     */

    paypal.Buttons({
        style: {
            layout: 'vertical',
            color: 'blue',
            shape: 'rect',
            label: 'pay'
        },

        // Crear la orden en PayPal
        createOrder: function (data, actions) {
            // Convertir COP a USD (aproximado)
            const usdAmount = (orderTotal / 4000).toFixed(2);

            return actions.order.create({
                purchase_units: [{
                    reference_id: orderReference,
                    description: 'Compra en Bodega Mayorista',
                    amount: {
                        currency_code: 'USD',
                        value: usdAmount
                    }
                }]
            });
        },

        // Cuando el pago es aprobado
        onApprove: function (data, actions) {
            return actions.order.capture().then(function (details) {
                console.log('PayPal Success:', details);
                handlePaymentSuccess({
                    id: details.id,
                    status: 'APPROVED',
                    payment_method_type: 'PAYPAL',
                    reference: orderReference
                });
            });
        },

        // Cuando hay un error
        onError: function (err) {
            console.error('PayPal Error:', err);
            showMessage('Error en el pago con PayPal. Intenta de nuevo.', 'error');
        },

        // Cuando el usuario cancela
        onCancel: function (data) {
            showMessage('Pago cancelado', 'info');
        }

    }).render('#paypal-button-container');
}

// =====================================================
// MANEJADORES DE RESULTADO
// =====================================================

function handlePaymentSuccess(transaction) {
    showMessage('¡Pago exitoso! Procesando tu pedido...', 'success');

    // Limpiar carrito
    clearCart();

    // Guardar info de la transacción
    localStorage.setItem('last_transaction', JSON.stringify({
        id: transaction.id,
        reference: orderReference,
        amount: orderTotal,
        status: 'APPROVED'
    }));

    // Redirigir a página de confirmación
    setTimeout(() => {
        window.location.href = 'pago-resultado.html?status=success';
    }, 2000);
}

function handlePaymentPending(transaction) {
    showMessage('Pago pendiente. Te notificaremos cuando se confirme.', 'info');

    localStorage.setItem('last_transaction', JSON.stringify({
        id: transaction.id,
        reference: orderReference,
        amount: orderTotal,
        status: 'PENDING'
    }));

    setTimeout(() => {
        window.location.href = 'pago-resultado.html?status=pending';
    }, 2000);
}

function handlePaymentError(transaction) {
    const errorMessages = {
        'DECLINED': 'Pago rechazado por el banco. Verifica tus datos.',
        'VOIDED': 'Transacción anulada.',
        'ERROR': 'Error al procesar el pago. Intenta de nuevo.'
    };

    showMessage(errorMessages[transaction.status] || 'Error en el pago', 'error');
}

// =====================================================
// INICIAR
// =====================================================
document.addEventListener('DOMContentLoaded', initCheckout);
