/**
 * Oceanman — Centro de Mando (Dashboard)
 * Agency KPIs, infrastructure health, and activity feed
 */
const DashboardView = (() => {
    async function render(container) {
        container.innerHTML = `<div class="page-loading"><div class="spinner"></div><p>Cargando centro de mando...</p></div>`;

        try {
            const [statsResp, infraResp, activityResp] = await Promise.all([
                CodavityAPI.getStats(),
                CodavityAPI.getInfraStatus(),
                CodavityAPI.getActivity(),
            ]);

            const s = statsResp.data;
            const infra = infraResp.data;
            const activity = activityResp.data || [];

            container.innerHTML = `
                <div class="kpi-grid">
                    <div class="kpi-card accent">
                        <div class="kpi-icon accent">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                        </div>
                        <div class="kpi-value">${s.clientes_activos}</div>
                        <div class="kpi-label">Clientes Activos</div>
                        <div class="kpi-detail">Empresas con agentes</div>
                    </div>

                    <div class="kpi-card success">
                        <div class="kpi-icon success">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
                        </div>
                        <div class="kpi-value">${s.agentes_desplegados}</div>
                        <div class="kpi-label">Agentes Desplegados</div>
                        <div class="kpi-detail">${s.agentes_activos} activos</div>
                    </div>

                    <div class="kpi-card warning">
                        <div class="kpi-icon warning">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                        </div>
                        <div class="kpi-value">${s.leads_total}</div>
                        <div class="kpi-label">Leads Capturados</div>
                        <div class="kpi-detail">Total global</div>
                    </div>

                    <div class="kpi-card info">
                        <div class="kpi-icon info">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                        </div>
                        <div class="kpi-value">${s.mensajes_24h}</div>
                        <div class="kpi-label">Mensajes (24h)</div>
                        <div class="kpi-detail">${s.mensajes_total.toLocaleString()} total histórico</div>
                    </div>
                </div>

                <div class="section-grid">
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">Actividad Reciente</h3>
                        </div>
                        <div class="activity-feed" id="activity-feed">
                            ${renderActivityFeed(activity)}
                        </div>
                    </div>

                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">Estado de Infraestructura</h3>
                        </div>
                        <div class="infra-panel">
                            ${renderInfraStatus(infra)}
                        </div>
                    </div>
                </div>
            `;

            // Update top bar infra indicator
            updateTopBarStatus(infra);

            // Enhance UI interactions (JS Driven Spotlight)
            if (window.applySpotlight) window.applySpotlight('.kpi-card, .card');

        } catch (error) {
            container.innerHTML = `<div class="empty-state"><h3>Error al cargar el centro de mando</h3><p>${error.message}</p></div>`;
        }
    }

    function renderActivityFeed(activity) {
        if (!activity || activity.length === 0) {
            return `
                <div class="empty-state" style="padding:32px 16px">
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity:.4"><path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="10"/></svg>
                    <p style="margin-top:12px;font-size:.875rem;color:var(--text-muted)">Sin actividad todavía.<br>Los eventos aparecerán cuando despliegues agentes y empiecen a interactuar.</p>
                </div>
            `;
        }

        return activity.slice(0, 10).map(event => {
            const time = new Date(event.fecha).toLocaleString('es-CO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
            const icons = { agente_desplegado: '🚀', lead_nuevo: '👤', mensaje: '💬', cliente_nuevo: '🏢', error: '⚠️' };
            return `
                <div class="activity-item">
                    <span class="activity-icon">${icons[event.tipo] || '📌'}</span>
                    <div class="activity-content">
                        <span class="activity-text">${event.mensaje}</span>
                        <span class="activity-time">${time}</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    function renderInfraStatus(infra) {
        const services = [
            { key: 'n8n', name: 'n8n', desc: 'Motor de ejecución de agentes', data: infra.n8n },
            { key: 'supabase', name: 'Supabase', desc: 'Base de datos y autenticación', data: infra.supabase },
            { key: 'gemini', name: 'Gemini Flash', desc: 'Motor de IA', data: infra.gemini },
        ];

        return services.map(svc => {
            const isConnected = svc.data?.status === 'conectado';
            return `
                <div class="settings-row">
                    <div>
                        <span class="settings-label">${svc.name}</span>
                        <span class="form-hint" style="display:block">${svc.desc}</span>
                    </div>
                    <span class="badge badge-${isConnected ? 'activo' : 'error'}">
                        <span class="badge-dot"></span>
                        ${isConnected ? 'Conectado' : 'Desconectado'}
                    </span>
                </div>
            `;
        }).join('');
    }

    function updateTopBarStatus(infra) {
        const el = document.getElementById('infra-status');
        if (!el) return;
        const allOk = infra.n8n?.status === 'conectado' && infra.supabase?.status === 'conectado' && infra.gemini?.status === 'conectado';
        el.innerHTML = `<span class="badge badge-${allOk ? 'activo' : 'error'}" style="font-size:0.75rem"><span class="badge-dot"></span>${allOk ? 'Sistemas OK' : 'Atención'}</span>`;
    }

    return { render };
})();
