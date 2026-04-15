/**
 * Oceanman — Agents View
 * Agent list with client filter and management
 */
const AgentsView = (() => {
    async function render(container) {
        container.innerHTML = `<div class="page-loading"><div class="spinner"></div><p>Cargando agentes...</p></div>`;

        try {
            const [agentsResp, clientsResp] = await Promise.all([
                CodavityAPI.getAgents(),
                CodavityAPI.getClientes(),
            ]);

            const agents = agentsResp.data || [];
            const clients = clientsResp.data || [];

            if (agents.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
                        <h3>Sin agentes desplegados</h3>
                        <p>Despliega tu primer agente de IA para comenzar.</p>
                        <a href="#deploy" class="btn btn-primary">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                            Desplegar Agente
                        </a>
                    </div>
                `;
                return;
            }

            // Build client lookup
            const clientMap = {};
            clients.forEach(c => { clientMap[c.id] = c.nombre_empresa; });

            // Get unique client IDs from agents
            const clientIds = [...new Set(agents.filter(a => a.cliente_id).map(a => a.cliente_id))];

            container.innerHTML = `
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;flex-wrap:wrap;gap:12px">
                    <div style="display:flex;align-items:center;gap:12px">
                        <p style="color:var(--text-muted);font-size:0.875rem">${agents.length} agente${agents.length > 1 ? 's' : ''}</p>
                        ${clientIds.length > 0 ? `
                            <select class="form-select" id="agent-client-filter" style="width:auto;padding:6px 12px;font-size:.8125rem">
                                <option value="">Todos los clientes</option>
                                ${clientIds.map(id => `<option value="${id}">${clientMap[id] || id}</option>`).join('')}
                            </select>
                        ` : ''}
                    </div>
                    <a href="#deploy" class="btn btn-primary btn-sm">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        Nuevo Agente
                    </a>
                </div>
                <div class="section-grid" id="agents-grid">
                    ${agents.map(agent => renderAgentCard(agent, clientMap)).join('')}
                </div>
            `;

            // Client filter
            const filterSelect = document.getElementById('agent-client-filter');
            filterSelect?.addEventListener('change', () => {
                const filterId = filterSelect.value;
                const filtered = filterId ? agents.filter(a => a.cliente_id === filterId) : agents;
                document.getElementById('agents-grid').innerHTML = filtered.map(a => renderAgentCard(a, clientMap)).join('');
                attachActions(container);
            });

            attachActions(container);

        } catch (error) {
            container.innerHTML = `<div class="empty-state"><h3>Error al cargar agentes</h3><p>${error.message}</p></div>`;
        }
    }

    function attachActions(container) {
        container.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const action = btn.dataset.action;
                const agentId = btn.dataset.id;
                if (action === 'toggle') toggleAgent(agentId, btn.dataset.estado);
                if (action === 'delete') confirmDelete(agentId);
                if (action === 'copy') copyWebhook(btn.dataset.url);
                if (action === 'chat') {
                    window.location.hash = `chat?agentId=${agentId}`;
                    CodavityApp.navigate('chat', { agentId });
                }
            });
        });
    }

    function renderAgentCard(agent, clientMap = {}) {
        const name = agent.config_inyectada?.empresa_nombre || 'Agente sin nombre';
        const botName = agent.config_inyectada?.nombre_bot || 'Bot IA';
        const template = agent.plantillas?.ref_nombre || 'unknown';
        const date = new Date(agent.creado_en).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
        const isActive = agent.estado === 'activo';
        const clientName = agent.cliente_id ? (clientMap[agent.cliente_id] || '') : '';

        return `
            <div class="spotlight-wrapper">
            <div class="agent-card spotlight-card">
                <div class="agent-card-header">
                    <div>
                        <div class="agent-name">${name}</div>
                        <div class="agent-template">${botName} · ${template}</div>
                        ${clientName ? `<div class="agent-template" style="color:var(--text-accent);margin-top:2px">🏢 ${clientName}</div>` : ''}
                    </div>
                    <span class="badge badge-${agent.estado}">
                        <span class="badge-dot"></span>
                        ${agent.estado.charAt(0).toUpperCase() + agent.estado.slice(1)}
                    </span>
                </div>
                <div class="agent-meta">
                    <div class="agent-meta-item">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                        ${date}
                    </div>
                    <div class="agent-meta-item">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                        Workflow: ${agent.n8n_workflow_id}
                    </div>
                </div>
                <div class="agent-actions">
                    <button class="btn btn-sm ${isActive ? 'btn-secondary' : 'btn-success'}" data-action="toggle" data-id="${agent.id}" data-estado="${isActive ? 'pausado' : 'activo'}">
                        ${isActive ? '⏸ Pausar' : '▶ Activar'}
                    </button>
                    <button class="btn btn-sm btn-secondary" data-action="copy" data-url="${agent.webhook_url || ''}">
                        📋 Copiar Webhook
                    </button>
                    ${isActive ? `<button class="btn btn-sm btn-primary" data-action="chat" data-id="${agent.id}">
                        💬 Probar Chat
                    </button>` : ''}
                    <button class="btn btn-sm btn-danger" data-action="delete" data-id="${agent.id}">
                        🗑 Eliminar
                    </button>
                </div>
            </div>
            </div>
        `;
    }

    async function toggleAgent(id, newEstado) {
        try {
            await CodavityAPI.updateAgent(id, newEstado);
            CodavityApp.showToast(`Agente ${newEstado === 'activo' ? 'activado' : 'pausado'}`, 'success');
            render(document.getElementById('page-container'));
        } catch (e) {
            CodavityApp.showToast('Error: ' + e.message, 'error');
        }
    }

    function confirmDelete(id) {
        CodavityApp.showModal(
            '¿Eliminar agente?',
            'Esta acción desactivará el agente permanentemente. Los leads y conversaciones se conservarán.',
            async () => {
                try {
                    await CodavityAPI.deleteAgent(id);
                    CodavityApp.showToast('Agente eliminado correctamente', 'success');
                    render(document.getElementById('page-container'));
                } catch (e) {
                    CodavityApp.showToast('Error: ' + e.message, 'error');
                }
            }
        );
    }

    function copyWebhook(url) {
        if (!url) {
            CodavityApp.showToast('URL no disponible', 'warning');
            return;
        }
        navigator.clipboard.writeText(url).then(() => {
            CodavityApp.showToast('Webhook URL copiada', 'success');
        }).catch(() => {
            CodavityApp.showToast('No se pudo copiar', 'error');
        });
    }

    return { render };
})();
