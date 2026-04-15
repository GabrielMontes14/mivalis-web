/**
 * Oceanman — Settings View (System Configuration)
 * API keys, integrations, templates, and preferences
 */
const SettingsView = (() => {
    async function render(container) {
        container.innerHTML = `<div class="page-loading"><div class="spinner"></div><p>Cargando configuración...</p></div>`;

        try {
            const [infraResp, plantillasResp] = await Promise.all([
                CodavityAPI.getInfraStatus(),
                CodavityAPI.getPlantillas(),
            ]);

            const infra = infraResp.data;
            const plantillas = plantillasResp.data || [];

            container.innerHTML = `
                <div class="settings-section">
                    <!-- Integrations / Infrastructure -->
                    <div class="card" style="margin-bottom:24px">
                        <div class="card-header">
                            <h3 class="card-title">Conexiones de Infraestructura</h3>
                        </div>
                        <div class="settings-row">
                            <div>
                                <span class="settings-label">n8n</span>
                                <span class="form-hint" style="display:block">Motor de ejecución de agentes</span>
                            </div>
                            <span class="badge badge-${infra.n8n?.status === 'conectado' ? 'activo' : 'error'}">
                                <span class="badge-dot"></span>
                                ${infra.n8n?.status === 'conectado' ? 'Conectado' : 'Desconectado'}
                            </span>
                        </div>
                        <div class="settings-row">
                            <div>
                                <span class="settings-label">Supabase</span>
                                <span class="form-hint" style="display:block">Base de datos y autenticación</span>
                            </div>
                            <span class="badge badge-${infra.supabase?.status === 'conectado' ? 'activo' : 'error'}">
                                <span class="badge-dot"></span>
                                ${infra.supabase?.status === 'conectado' ? 'Conectado' : 'Desconectado'}
                            </span>
                        </div>
                        <div class="settings-row">
                            <div>
                                <span class="settings-label">Gemini Flash</span>
                                <span class="form-hint" style="display:block">Motor de IA — ${infra.gemini?.model || 'gemini-1.5-flash'}</span>
                            </div>
                            <span class="badge badge-${infra.gemini?.status === 'conectado' ? 'activo' : 'error'}">
                                <span class="badge-dot"></span>
                                ${infra.gemini?.status === 'conectado' ? 'Conectado' : 'Desconectado'}
                            </span>
                        </div>
                    </div>

                    <!-- Agent Templates -->
                    <div class="card" style="margin-bottom:24px">
                        <div class="card-header">
                            <h3 class="card-title">Plantillas de Agentes</h3>
                        </div>
                        ${plantillas.length === 0
                    ? '<p style="color:var(--text-muted);font-size:.875rem;padding:12px 0">No hay plantillas configuradas.</p>'
                    : plantillas.map(p => `
                                <div class="settings-row">
                                    <div>
                                        <span class="settings-label">${p.descripcion}</span>
                                        <span class="form-hint" style="display:block">Ref: ${p.ref_nombre} · v${p.version}</span>
                                    </div>
                                    <span class="badge" style="background:var(--accent-gradient);color:white;font-size:.75rem">${p.variables_requeridas?.length || 0} variables</span>
                                </div>
                            `).join('')
                }
                    </div>

                    <!-- General Preferences -->
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">Preferencias Generales</h3>
                        </div>
                        <div class="settings-row">
                            <div>
                                <span class="settings-label">Idioma</span>
                                <span class="form-hint" style="display:block">Idioma de la interfaz del dashboard</span>
                            </div>
                            <span class="settings-value">Español</span>
                        </div>
                        <div class="settings-row">
                            <div>
                                <span class="settings-label">Zona horaria</span>
                                <span class="form-hint" style="display:block">Para reportes y logs</span>
                            </div>
                            <span class="settings-value">America/Bogota (UTC-5)</span>
                        </div>
                        <div class="settings-row">
                            <div>
                                <span class="settings-label">Versión</span>
                                <span class="form-hint" style="display:block">Oceanman Agency Console</span>
                            </div>
                            <span class="settings-value">v1.0.0</span>
                        </div>
                    </div>
                </div>
            `;
        } catch (error) {
            container.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${error.message}</p></div>`;
        }
    }

    return { render };
})();
