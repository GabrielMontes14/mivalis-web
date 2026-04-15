/**
 * Oceanman — Clients View
 * Client management: list, add, view detail
 */
const ClientsView = (() => {
    async function render(container, params = {}) {
        // If viewing a specific client detail
        if (params.id) {
            return renderClientDetail(container, params.id);
        }

        container.innerHTML = `<div class="page-loading"><div class="spinner"></div><p>Cargando clientes...</p></div>`;

        try {
            const response = await CodavityAPI.getClientes();
            const clientes = response.data || [];

            if (clientes.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                        <h3>Sin clientes todavía</h3>
                        <p>Agrega tu primer cliente para empezar a desplegar agentes de IA.</p>
                        <button class="btn btn-primary" id="btn-add-client">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                            Agregar Cliente
                        </button>
                    </div>
                `;
                container.querySelector('#btn-add-client')?.addEventListener('click', () => showAddClientModal(container));
                return;
            }

            container.innerHTML = `
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px">
                    <p style="color:var(--text-muted);font-size:0.875rem">${clientes.length} cliente${clientes.length > 1 ? 's' : ''}</p>
                    <button class="btn btn-primary btn-sm" id="btn-add-client">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        Nuevo Cliente
                    </button>
                </div>
                <div class="card">
                    <div class="table-wrapper">
                        <table class="data-table" id="clients-table">
                            <thead>
                                <tr>
                                    <th>Empresa</th>
                                    <th>Contacto</th>
                                    <th>Teléfono</th>
                                    <th>Estado</th>
                                    <th>Fecha de Alta</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${clientes.map(client => renderClientRow(client)).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;

            // Event listeners
            container.querySelector('#btn-add-client')?.addEventListener('click', () => showAddClientModal(container));
            container.querySelectorAll('[data-view-client]').forEach(btn => {
                btn.addEventListener('click', () => {
                    window.location.hash = `clients?id=${btn.dataset.viewClient}`;
                });
            });
            container.querySelectorAll('[data-delete-client]').forEach(btn => {
                btn.addEventListener('click', () => confirmDeleteClient(btn.dataset.deleteClient, container));
            });

        } catch (error) {
            container.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${error.message}</p></div>`;
        }
    }

    function renderClientRow(client) {
        const date = new Date(client.creado_en).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
        return `
            <tr>
                <td style="font-weight:600;color:var(--text-primary)">${client.nombre_empresa}</td>
                <td>${client.contacto_nombre || '—'}</td>
                <td>${client.contacto_telefono || '—'}</td>
                <td><span class="badge badge-${client.estado}">${client.estado}</span></td>
                <td style="white-space:nowrap">${date}</td>
                <td>
                    <div style="display:flex;gap:6px">
                        <button class="btn btn-sm btn-secondary" data-view-client="${client.id}">👁 Ver</button>
                        <button class="btn btn-sm btn-danger" data-delete-client="${client.id}">🗑</button>
                    </div>
                </td>
            </tr>
        `;
    }

    async function renderClientDetail(container, clientId) {
        container.innerHTML = `<div class="page-loading"><div class="spinner"></div><p>Cargando detalle...</p></div>`;

        try {
            const [clientsResp, agentsResp, leadsResp] = await Promise.all([
                CodavityAPI.getClientes(),
                CodavityAPI.getAgents(),
                CodavityAPI.getLeads(),
            ]);

            const client = (clientsResp.data || []).find(c => c.id === clientId);
            if (!client) {
                container.innerHTML = `<div class="empty-state"><h3>Cliente no encontrado</h3><a href="#clients" class="btn btn-secondary">Volver</a></div>`;
                return;
            }

            const clientAgents = (agentsResp.data || []).filter(a => a.cliente_id === clientId);
            const clientLeads = (leadsResp.data || []).filter(l => {
                const agentIds = clientAgents.map(a => a.id);
                return agentIds.includes(l.agente_id);
            });

            const date = new Date(client.creado_en).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });

            container.innerHTML = `
                <div style="margin-bottom:20px">
                    <a href="#clients" class="btn btn-sm btn-secondary">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
                        Volver a Clientes
                    </a>
                </div>

                <div class="card" style="margin-bottom:24px">
                    <div class="card-header">
                        <h3 class="card-title">${client.nombre_empresa}</h3>
                        <span class="badge badge-${client.estado}">${client.estado}</span>
                    </div>
                    <div class="settings-row">
                        <span class="settings-label">Contacto</span>
                        <span class="settings-value">${client.contacto_nombre || '—'}</span>
                    </div>
                    <div class="settings-row">
                        <span class="settings-label">Teléfono</span>
                        <span class="settings-value">${client.contacto_telefono || '—'}</span>
                    </div>
                    <div class="settings-row">
                        <span class="settings-label">Email</span>
                        <span class="settings-value">${client.contacto_email || '—'}</span>
                    </div>
                    <div class="settings-row">
                        <span class="settings-label">Cliente desde</span>
                        <span class="settings-value">${date}</span>
                    </div>
                    ${client.notas ? `<div class="settings-row"><span class="settings-label">Notas</span><span class="settings-value">${client.notas}</span></div>` : ''}
                </div>

                <div class="section-grid">
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">Agentes (${clientAgents.length})</h3>
                        </div>
                        ${clientAgents.length === 0
                    ? '<p style="color:var(--text-muted);font-size:.875rem;padding:16px 0">Sin agentes desplegados para este cliente.</p>'
                    : clientAgents.map(a => `
                                <div class="settings-row">
                                    <div>
                                        <span class="settings-label">${a.config_inyectada?.nombre_bot || 'Bot IA'}</span>
                                        <span class="form-hint" style="display:block">${a.plantillas?.ref_nombre || 'sales_v1'}</span>
                                    </div>
                                    <span class="badge badge-${a.estado}"><span class="badge-dot"></span>${a.estado}</span>
                                </div>
                            `).join('')
                }
                    </div>

                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">Leads (${clientLeads.length})</h3>
                        </div>
                        ${clientLeads.length === 0
                    ? '<p style="color:var(--text-muted);font-size:.875rem;padding:16px 0">Sin leads capturados todavía.</p>'
                    : clientLeads.slice(0, 5).map(l => `
                                <div class="settings-row">
                                    <div>
                                        <span class="settings-label">${l.nombre || 'Sin nombre'}</span>
                                        <span class="form-hint" style="display:block">${l.resumen_necesidad || '—'}</span>
                                    </div>
                                    <span class="badge badge-${l.estado}">${l.estado}</span>
                                </div>
                            `).join('') +
                    (clientLeads.length > 5 ? `<p style="color:var(--text-accent);font-size:.875rem;padding-top:8px">+ ${clientLeads.length - 5} más</p>` : '')
                }
                    </div>
                </div>
            `;

        } catch (error) {
            container.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${error.message}</p></div>`;
        }
    }

    function showAddClientModal(container) {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal-card" style="max-width:480px">
                <h3 style="margin-bottom:20px">Nuevo Cliente</h3>
                <div class="form-group">
                    <label>Nombre de la empresa *</label>
                    <input type="text" class="form-input" id="new-client-name" placeholder="Ej: Ferretería El Martillo" required>
                </div>
                <div class="form-group">
                    <label>Nombre de contacto</label>
                    <input type="text" class="form-input" id="new-client-contact" placeholder="Ej: Juan Pérez">
                </div>
                <div class="form-group">
                    <label>Teléfono</label>
                    <input type="text" class="form-input" id="new-client-phone" placeholder="Ej: +57 300 123 4567">
                </div>
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" class="form-input" id="new-client-email" placeholder="Ej: contacto@empresa.com">
                </div>
                <div class="form-group">
                    <label>Notas internas</label>
                    <textarea class="form-textarea" id="new-client-notes" placeholder="Notas privadas sobre este cliente..."></textarea>
                </div>
                <div class="modal-actions">
                    <button class="btn btn-secondary" id="modal-cancel">Cancelar</button>
                    <button class="btn btn-primary" id="modal-save">Guardar Cliente</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        overlay.querySelector('#modal-cancel').addEventListener('click', () => overlay.remove());
        overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

        overlay.querySelector('#modal-save').addEventListener('click', async () => {
            const name = document.getElementById('new-client-name')?.value?.trim();
            if (!name) {
                CodavityApp.showToast('El nombre de la empresa es obligatorio', 'warning');
                return;
            }

            try {
                await CodavityAPI.createCliente({
                    nombre_empresa: name,
                    contacto_nombre: document.getElementById('new-client-contact')?.value?.trim() || '',
                    contacto_telefono: document.getElementById('new-client-phone')?.value?.trim() || '',
                    contacto_email: document.getElementById('new-client-email')?.value?.trim() || '',
                    notas: document.getElementById('new-client-notes')?.value?.trim() || '',
                });
                overlay.remove();
                CodavityApp.showToast('¡Cliente creado exitosamente! 🏢', 'success');
                render(container);
            } catch (e) {
                CodavityApp.showToast('Error: ' + e.message, 'error');
            }
        });
    }

    function confirmDeleteClient(id, container) {
        CodavityApp.showModal(
            '¿Eliminar cliente?',
            'Se eliminará el cliente de la lista. Los agentes y leads asociados se conservarán.',
            async () => {
                try {
                    await CodavityAPI.deleteCliente(id);
                    CodavityApp.showToast('Cliente eliminado', 'success');
                    render(container);
                } catch (e) {
                    CodavityApp.showToast('Error: ' + e.message, 'error');
                }
            }
        );
    }

    return { render };
})();
