/**
 * Oceanman — Conversations View
 * Chat history viewer for leads
 */
const ConversationsView = (() => {
    async function render(container, params = {}) {
        const leadId = params.lead;
        const leadName = params.name ? decodeURIComponent(params.name) : 'Lead';

        if (!leadId) {
            // Show lead selection prompt
            container.innerHTML = `
                <div class="empty-state">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    <h3>Selecciona un Lead</h3>
                    <p>Ve a la sección de <a href="#leads">Leads</a> y haz click en el botón "Chat" para ver las conversaciones.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `<div class="page-loading"><div class="spinner"></div><p>Cargando conversación...</p></div>`;

        try {
            const response = await CodavityAPI.getConversations(leadId);
            const messages = response.data || [];

            container.innerHTML = `
                <div style="margin-bottom:20px">
                    <a href="#leads" style="display:inline-flex;align-items:center;gap:6px;font-size:0.8125rem;color:var(--text-muted)">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
                        Volver a Leads
                    </a>
                </div>

                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Conversación con ${leadName}</h3>
                        <span class="badge badge-info">${messages.length} mensajes</span>
                    </div>

                    ${messages.length === 0 ? `
                        <div class="empty-state" style="padding:40px 20px">
                            <h3>Sin mensajes</h3>
                            <p>Aún no hay conversaciones registradas con este lead.</p>
                        </div>
                    ` : `
                        <div class="chat-container" id="chat-container">
                            ${messages.map(msg => renderMessage(msg)).join('')}
                        </div>
                    `}
                </div>
            `;

            // Scroll to bottom
            const chatContainer = document.getElementById('chat-container');
            if (chatContainer) {
                chatContainer.scrollTop = chatContainer.scrollHeight;
            }

        } catch (error) {
            container.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${error.message}</p></div>`;
        }
    }

    function renderMessage(msg) {
        const isOutgoing = msg.direccion === 'saliente';
        const time = new Date(msg.creado_en).toLocaleTimeString('es-CO', {
            hour: '2-digit', minute: '2-digit'
        });

        return `
            <div class="chat-message ${isOutgoing ? 'outgoing' : 'incoming'}">
                <div>${msg.contenido}</div>
                <div class="chat-time">${time}</div>
            </div>
        `;
    }

    return { render };
})();
