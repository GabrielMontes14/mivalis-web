/**
 * Oceanman — Leads View
 * Searchable/filterable leads table with client and agent filters + export
 */
const LeadsView = (() => {
    let allLeads = [];
    let allClients = [];
    let allAgents = [];

    async function render(container) {
        container.innerHTML = `<div class="page-loading"><div class="spinner"></div><p>Cargando leads...</p></div>`;

        try {
            const [leadsResp, clientsResp, agentsResp] = await Promise.all([
                CodavityAPI.getLeads(),
                CodavityAPI.getClientes(),
                CodavityAPI.getAgents(),
            ]);

            allLeads = leadsResp.data || [];
            allClients = clientsResp.data || [];
            allAgents = agentsResp.data || [];

            if (allLeads.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                        <h3>Sin leads todavía</h3>
                        <p>Los leads aparecerán aquí cuando tus agentes empiecen a recibir mensajes.</p>
                    </div>
                `;
                return;
            }

            renderTable(container, allLeads);
        } catch (error) {
            container.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${error.message}</p></div>`;
        }
    }

    function renderTable(container, leads) {
        // Build client map from agents
        const agentClientMap = {};
        allAgents.forEach(a => { if (a.cliente_id) agentClientMap[a.id] = a.cliente_id; });
        const clientMap = {};
        allClients.forEach(c => { clientMap[c.id] = c.nombre_empresa; });

        // Unique client IDs from leads
        const clientIds = [...new Set(leads.map(l => agentClientMap[l.agente_id]).filter(Boolean))];
        const agentIds = [...new Set(leads.map(l => l.agente_id).filter(Boolean))];

        container.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:12px">
                <div class="search-bar" style="flex:1;min-width:200px">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    <input type="text" id="leads-search" placeholder="Buscar por nombre, teléfono o estado...">
                </div>
                <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
                    ${clientIds.length > 0 ? `
                        <select class="form-select" id="leads-client-filter" style="width:auto;padding:6px 12px;font-size:.8125rem">
                            <option value="">Todos los clientes</option>
                            ${clientIds.map(id => `<option value="${id}">${clientMap[id] || id}</option>`).join('')}
                        </select>
                    ` : ''}
                    <button class="btn btn-sm btn-secondary" id="leads-export-btn">
                        📥 Exportar CSV
                    </button>
                </div>
            </div>

            <div class="card">
                <div class="table-wrapper">
                    <table class="data-table" id="leads-table">
                        <thead>
                            <tr>
                                <th>Nombre</th>
                                <th>Teléfono</th>
                                <th>Score</th>
                                <th>Estado</th>
                                <th>Cliente</th>
                                <th>Necesidad</th>
                                <th>Último contacto</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${leads.map(lead => renderLeadRow(lead, agentClientMap, clientMap)).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        // Search
        const searchInput = document.getElementById('leads-search');
        searchInput?.addEventListener('input', () => filterLeads(agentClientMap, clientMap));

        // Client filter
        const clientFilter = document.getElementById('leads-client-filter');
        clientFilter?.addEventListener('change', () => filterLeads(agentClientMap, clientMap));

        // Export
        document.getElementById('leads-export-btn')?.addEventListener('click', () => exportCSV(leads, agentClientMap, clientMap));

        // Conversation view buttons
        container.querySelectorAll('[data-view-chat]').forEach(btn => {
            btn.addEventListener('click', () => {
                const leadId = btn.dataset.viewChat;
                const leadName = btn.dataset.leadName;
                window.location.hash = `conversations?lead=${leadId}&name=${encodeURIComponent(leadName)}`;
            });
        });
    }

    function filterLeads(agentClientMap, clientMap) {
        const query = (document.getElementById('leads-search')?.value || '').toLowerCase();
        const clientFilter = document.getElementById('leads-client-filter')?.value || '';

        let filtered = allLeads;

        if (query) {
            filtered = filtered.filter(l =>
                (l.nombre || '').toLowerCase().includes(query) ||
                (l.telefono || '').includes(query) ||
                (l.estado || '').toLowerCase().includes(query)
            );
        }

        if (clientFilter) {
            const agentIdsForClient = allAgents.filter(a => a.cliente_id === clientFilter).map(a => a.id);
            filtered = filtered.filter(l => agentIdsForClient.includes(l.agente_id));
        }

        const tbody = document.querySelector('#leads-table tbody');
        if (tbody) tbody.innerHTML = filtered.map(l => renderLeadRow(l, agentClientMap, clientMap)).join('');
    }

    function renderLeadRow(lead, agentClientMap = {}, clientMap = {}) {
        const name = lead.nombre || 'Sin nombre';
        const lastContact = new Date(lead.ultimo_contacto).toLocaleDateString('es-CO', {
            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
        });
        const scoreColor = lead.score_interes > 70 ? 'var(--success)' : lead.score_interes > 40 ? 'var(--warning)' : 'var(--text-muted)';
        const clientId = agentClientMap[lead.agente_id];
        const clientName = clientId ? (clientMap[clientId] || '—') : '—';

        return `
            <tr>
                <td style="font-weight:600;color:var(--text-primary)">${name}</td>
                <td>${lead.telefono}</td>
                <td>
                    <div style="display:flex;align-items:center;gap:8px">
                        <span style="font-weight:600;color:${scoreColor}">${lead.score_interes}</span>
                        <div class="score-bar">
                            <div class="score-fill" style="width:${lead.score_interes}%;background:${scoreColor}"></div>
                        </div>
                    </div>
                </td>
                <td><span class="badge badge-${lead.estado}">${lead.estado}</span></td>
                <td style="font-size:.8125rem;color:var(--text-secondary)">${clientName}</td>
                <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${lead.resumen_necesidad || ''}">${lead.resumen_necesidad || '—'}</td>
                <td style="white-space:nowrap">${lastContact}</td>
                <td>
                    <button class="btn btn-sm btn-secondary" data-view-chat="${lead.id}" data-lead-name="${name}">
                        💬 Chat
                    </button>
                </td>
            </tr>
        `;
    }

    function exportCSV(leads, agentClientMap, clientMap) {
        if (leads.length === 0) {
            CodavityApp.showToast('No hay leads para exportar', 'warning');
            return;
        }

        const headers = ['Nombre', 'Teléfono', 'Score', 'Estado', 'Cliente', 'Necesidad', 'Último Contacto'];
        const rows = leads.map(l => {
            const clientId = agentClientMap[l.agente_id];
            const clientName = clientId ? (clientMap[clientId] || '') : '';
            return [
                l.nombre || '',
                l.telefono || '',
                l.score_interes || 0,
                l.estado || '',
                clientName,
                (l.resumen_necesidad || '').replace(/,/g, ';'),
                l.ultimo_contacto || '',
            ].join(',');
        });

        const csv = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `leads_export_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        CodavityApp.showToast('Leads exportados a CSV 📥', 'success');
    }

    return { render };
})();
