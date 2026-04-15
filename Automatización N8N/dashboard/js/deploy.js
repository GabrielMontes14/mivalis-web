/**
 * Oceanman — Deploy Wizard View
 * Step-by-step wizard for deploying a new agent with client association
 */
const DeployView = (() => {
    let currentStep = 1;
    let formData = {
        plantilla_ref: 'sales_v1',
        cliente_id: '',
        config_personalizada: {},
    };

    async function render(container) {
        currentStep = 1;
        formData = { plantilla_ref: 'sales_v1', cliente_id: '', config_personalizada: {} };

        try {
            const [plantillasResp, clientsResp] = await Promise.all([
                CodavityAPI.getPlantillas(),
                CodavityAPI.getClientes(),
            ]);
            const plantillas = plantillasResp.data || [];
            const clients = clientsResp.data || [];

            container.innerHTML = `
                <div class="wizard">
                    <div class="wizard-steps">
                        <div class="wizard-step">
                            <div class="step-circle active" id="step-1-circle">1</div>
                        </div>
                        <div class="step-line" id="step-line-1"></div>
                        <div class="wizard-step">
                            <div class="step-circle" id="step-2-circle">2</div>
                        </div>
                        <div class="step-line" id="step-line-2"></div>
                        <div class="wizard-step">
                            <div class="step-circle" id="step-3-circle">3</div>
                        </div>
                    </div>

                    <div class="wizard-content" id="wizard-content">
                        ${renderStep1(plantillas, clients)}
                    </div>
                </div>
            `;

            attachStepListeners(container, plantillas, clients);
        } catch (error) {
            container.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${error.message}</p></div>`;
        }
    }

    function renderStep1(plantillas, clients) {
        return `
            <div class="card" style="margin-top:8px">
                <h3 class="card-title" style="margin-bottom:20px">Paso 1: Plantilla y Cliente</h3>
                <div class="form-group">
                    <label for="plantilla-select">Tipo de agente</label>
                    <select class="form-select" id="plantilla-select">
                        ${plantillas.map(p => `<option value="${p.ref_nombre}" ${p.ref_nombre === formData.plantilla_ref ? 'selected' : ''}>${p.descripcion} (${p.ref_nombre})</option>`).join('')}
                    </select>
                    <p class="form-hint">Selecciona el tipo de agente que deseas desplegar.</p>
                </div>
                <div class="form-group">
                    <label for="client-select">Cliente / Empresa *</label>
                    <select class="form-select" id="client-select">
                        <option value="">— Selecciona un cliente —</option>
                        ${clients.map(c => `<option value="${c.id}" ${c.id === formData.cliente_id ? 'selected' : ''}>${c.nombre_empresa}</option>`).join('')}
                    </select>
                    <p class="form-hint">Asocia este agente a un cliente. <a href="#clients" style="color:var(--text-accent)">Crear nuevo cliente</a></p>
                </div>
            </div>
            <div class="wizard-actions">
                <div></div>
                <button class="btn btn-primary" id="wizard-next-1">
                    Siguiente
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </button>
            </div>
        `;
    }

    function renderStep2() {
        return `
            <div class="card" style="margin-top:8px">
                <h3 class="card-title" style="margin-bottom:20px">Paso 2: Configura el Agente</h3>
                <div class="form-group">
                    <label for="deploy-empresa">Nombre del negocio del cliente *</label>
                    <input type="text" class="form-input" id="deploy-empresa" placeholder="Ej: Ferretería El Martillo" value="${formData.config_personalizada.empresa_nombre || ''}" required>
                </div>
                <div class="form-group">
                    <label for="deploy-bot-name">Nombre del bot</label>
                    <input type="text" class="form-input" id="deploy-bot-name" placeholder="Ej: MartilloBot" value="${formData.config_personalizada.nombre_bot || ''}">
                    <p class="form-hint">El nombre con el que el bot se presentará.</p>
                </div>
                <div class="form-group">
                    <label for="deploy-whatsapp">WhatsApp del cliente</label>
                    <input type="text" class="form-input" id="deploy-whatsapp" placeholder="Ej: +57 300 123 4567" value="${formData.config_personalizada.whatsapp || ''}">
                    <p class="form-hint">Número de WhatsApp al que se conectará el webhook.</p>
                </div>
                <div class="form-group">
                    <label for="deploy-descripcion">Descripción del negocio</label>
                    <textarea class="form-textarea" id="deploy-descripcion" placeholder="Describe brevemente el negocio, productos y servicios principales...">${formData.config_personalizada.descripcion_negocio || ''}</textarea>
                </div>
                <div class="form-group">
                    <label for="deploy-productos">Lista de productos/servicios</label>
                    <textarea class="form-textarea" id="deploy-productos" placeholder="Lista de productos o servicios con precios...">${formData.config_personalizada.lista_productos || ''}</textarea>
                </div>
                <div class="form-group">
                    <label for="deploy-objetivo">Objetivo de conversión</label>
                    <input type="text" class="form-input" id="deploy-objetivo" placeholder="Ej: Agendar una cita, Hacer una venta" value="${formData.config_personalizada.objetivo_conversion || ''}">
                </div>
                <div class="form-group">
                    <label for="deploy-prompt">Prompt del sistema (avanzado)</label>
                    <textarea class="form-textarea" id="deploy-prompt" placeholder="Instrucciones detalladas para la IA...">${formData.config_personalizada.prompt_sistema || ''}</textarea>
                    <p class="form-hint">Opcional. Define la personalidad, tono y comportamiento del agente.</p>
                </div>
                <div class="form-group">
                    <label for="deploy-notas">Notas internas</label>
                    <textarea class="form-textarea" id="deploy-notas" placeholder="Notas privadas: cobro mensual, contrato, etc.">${formData.config_personalizada.notas_internas || ''}</textarea>
                </div>
            </div>
            <div class="wizard-actions">
                <button class="btn btn-secondary" id="wizard-back-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
                    Atrás
                </button>
                <button class="btn btn-primary" id="wizard-next-2">
                    Siguiente
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </button>
            </div>
        `;
    }

    function renderStep3(clients) {
        const cfg = formData.config_personalizada;
        const clientName = clients.find(c => c.id === formData.cliente_id)?.nombre_empresa || '—';
        return `
            <div class="card" style="margin-top:8px">
                <h3 class="card-title" style="margin-bottom:20px">Paso 3: Confirmar y Desplegar</h3>
                <p style="color:var(--text-secondary);font-size:0.875rem;margin-bottom:20px">Revisa la configuración antes de desplegar:</p>

                <div class="settings-row">
                    <span class="settings-label">Plantilla</span>
                    <span class="settings-value">${formData.plantilla_ref}</span>
                </div>
                <div class="settings-row">
                    <span class="settings-label">Cliente</span>
                    <span class="settings-value">${clientName}</span>
                </div>
                <div class="settings-row">
                    <span class="settings-label">Negocio</span>
                    <span class="settings-value">${cfg.empresa_nombre || '—'}</span>
                </div>
                <div class="settings-row">
                    <span class="settings-label">Bot</span>
                    <span class="settings-value">${cfg.nombre_bot || 'Asistente de IA'}</span>
                </div>
                <div class="settings-row">
                    <span class="settings-label">WhatsApp</span>
                    <span class="settings-value">${cfg.whatsapp || '—'}</span>
                </div>
                <div class="settings-row">
                    <span class="settings-label">Objetivo</span>
                    <span class="settings-value">${cfg.objetivo_conversion || 'Agendar una cita'}</span>
                </div>
            </div>
            <div class="wizard-actions">
                <button class="btn btn-secondary" id="wizard-back-3">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
                    Atrás
                </button>
                <button class="btn btn-primary" id="wizard-deploy">
                    🚀 Desplegar Agente
                </button>
            </div>
        `;
    }

    function updateSteps() {
        for (let i = 1; i <= 3; i++) {
            const circle = document.getElementById(`step-${i}-circle`);
            if (circle) {
                circle.className = 'step-circle';
                if (i < currentStep) circle.classList.add('done');
                if (i === currentStep) circle.classList.add('active');
            }
        }
        for (let i = 1; i <= 2; i++) {
            const line = document.getElementById(`step-line-${i}`);
            if (line) {
                line.className = 'step-line';
                if (i < currentStep) line.classList.add('done');
            }
        }
    }

    function attachStepListeners(container, plantillas, clients) {
        container.addEventListener('click', async (e) => {
            const btn = e.target.closest('button');
            if (!btn) return;

            if (btn.id === 'wizard-next-1') {
                const select = document.getElementById('plantilla-select');
                const clientSelect = document.getElementById('client-select');
                formData.plantilla_ref = select ? select.value : 'sales_v1';
                formData.cliente_id = clientSelect ? clientSelect.value : '';

                if (!formData.cliente_id) {
                    CodavityApp.showToast('Selecciona un cliente para este agente', 'warning');
                    return;
                }

                currentStep = 2;
                updateSteps();
                document.getElementById('wizard-content').innerHTML = renderStep2();
            }

            if (btn.id === 'wizard-next-2') {
                formData.config_personalizada = {
                    empresa_nombre: document.getElementById('deploy-empresa')?.value || '',
                    nombre_bot: document.getElementById('deploy-bot-name')?.value || '',
                    whatsapp: document.getElementById('deploy-whatsapp')?.value || '',
                    descripcion_negocio: document.getElementById('deploy-descripcion')?.value || '',
                    lista_productos: document.getElementById('deploy-productos')?.value || '',
                    objetivo_conversion: document.getElementById('deploy-objetivo')?.value || '',
                    prompt_sistema: document.getElementById('deploy-prompt')?.value || '',
                    notas_internas: document.getElementById('deploy-notas')?.value || '',
                };

                if (!formData.config_personalizada.empresa_nombre) {
                    CodavityApp.showToast('El nombre del negocio es obligatorio', 'warning');
                    return;
                }

                currentStep = 3;
                updateSteps();
                document.getElementById('wizard-content').innerHTML = renderStep3(clients);
            }

            if (btn.id === 'wizard-back-2') {
                formData.config_personalizada = {
                    empresa_nombre: document.getElementById('deploy-empresa')?.value || '',
                    nombre_bot: document.getElementById('deploy-bot-name')?.value || '',
                    whatsapp: document.getElementById('deploy-whatsapp')?.value || '',
                    descripcion_negocio: document.getElementById('deploy-descripcion')?.value || '',
                    lista_productos: document.getElementById('deploy-productos')?.value || '',
                    objetivo_conversion: document.getElementById('deploy-objetivo')?.value || '',
                    prompt_sistema: document.getElementById('deploy-prompt')?.value || '',
                    notas_internas: document.getElementById('deploy-notas')?.value || '',
                };
                currentStep = 1;
                updateSteps();
                document.getElementById('wizard-content').innerHTML = renderStep1(plantillas, clients);
            }

            if (btn.id === 'wizard-back-3') {
                currentStep = 2;
                updateSteps();
                document.getElementById('wizard-content').innerHTML = renderStep2();
            }

            if (btn.id === 'wizard-deploy') {
                btn.disabled = true;
                btn.innerHTML = '<div class="spinner" style="width:18px;height:18px;border-width:2px"></div> Desplegando...';

                try {
                    const result = await CodavityAPI.deploy(formData);
                    CodavityApp.showToast('¡Agente desplegado exitosamente! 🚀', 'success');

                    document.getElementById('wizard-content').innerHTML = `
                        <div class="card" style="margin-top:8px;text-align:center;padding:40px">
                            <div style="font-size:3rem;margin-bottom:16px">🎉</div>
                            <h3 style="margin-bottom:12px">¡Agente Desplegado!</h3>
                            <p style="color:var(--text-secondary);margin-bottom:24px">Tu agente está listo para recibir mensajes.</p>
                            <div class="settings-row" style="justify-content:center;gap:12px">
                                <span class="settings-label">Webhook URL:</span>
                                <code style="background:var(--bg-input);padding:4px 10px;border-radius:6px;font-size:0.8125rem;color:var(--text-accent)">${result.webhook_url || 'N/A'}</code>
                            </div>
                            <div style="margin-top:24px;display:flex;gap:12px;justify-content:center">
                                <a href="#agents" class="btn btn-primary">Ver Agentes</a>
                                <button class="btn btn-secondary" onclick="location.hash='deploy'">Desplegar Otro</button>
                            </div>
                        </div>
                    `;
                } catch (error) {
                    CodavityApp.showToast('Error: ' + error.message, 'error');
                    btn.disabled = false;
                    btn.innerHTML = '🚀 Desplegar Agente';
                }
            }
        });
    }

    return { render };
})();
