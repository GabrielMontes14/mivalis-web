/**
 * Oceanman — Chat de Prueba
 * Simulador de chat para probar bots desplegados directamente desde el dashboard
 */
const ChatView = (() => {

    const PROXY_URL = 'http://localhost:8000/api/v1/chat/proxy';

    // ── Render principal ──────────────────────────────────────
    async function render(container, params = {}) {
        container.innerHTML = `
            <div class="chat-page">
                <!-- Left panel: agent selector -->
                <div class="chat-sidebar">
                    <div class="chat-sidebar-header">
                        <h3>Bots Desplegados</h3>
                        <p class="text-muted" style="font-size:0.8rem;margin:4px 0 0;">Selecciona un bot para chatear</p>
                    </div>
                    <div id="chat-agent-list" class="chat-agent-list">
                        <div class="page-loading" style="min-height:120px;">
                            <div class="spinner"></div>
                        </div>
                    </div>
                    <div class="chat-tester-info">
                        <div class="form-group" style="margin-bottom:10px;">
                            <label style="font-size:0.75rem;color:var(--text-muted);">📱 Teléfono simulado</label>
                            <input type="text" id="chat-phone" value="573210009999"
                                style="width:100%;box-sizing:border-box;background:var(--bg-tertiary);border:1px solid var(--border);color:var(--text-primary);padding:6px 10px;border-radius:6px;font-size:0.85rem;">
                        </div>
                        <div class="form-group">
                            <label style="font-size:0.75rem;color:var(--text-muted);">👤 Nombre simulado</label>
                            <input type="text" id="chat-name" value="Tester"
                                style="width:100%;box-sizing:border-box;background:var(--bg-tertiary);border:1px solid var(--border);color:var(--text-primary);padding:6px 10px;border-radius:6px;font-size:0.85rem;">
                        </div>
                    </div>
                </div>

                <!-- Right panel: chat window -->
                <div class="chat-window">
                    <div class="chat-window-header" id="chat-window-header">
                        <div class="chat-bot-avatar">🤖</div>
                        <div>
                            <div class="chat-bot-name" id="chat-bot-name">Selecciona un bot</div>
                            <div class="chat-bot-status" id="chat-bot-status">— Elige un agente para comenzar —</div>
                        </div>
                        <button id="chat-clear-btn" class="btn btn-sm btn-secondary" style="margin-left:auto;" title="Limpiar chat">
                            🗑 Limpiar
                        </button>
                    </div>

                    <div class="chat-messages" id="chat-messages">
                        <div class="chat-empty-state">
                            <div style="font-size:3rem;margin-bottom:12px;">💬</div>
                            <div style="font-size:1rem;color:var(--text-muted);">Selecciona un bot de la izquierda para comenzar la prueba</div>
                        </div>
                    </div>

                    <div class="chat-typing" id="chat-typing" style="display:none;">
                        <span class="typing-dots"><span></span><span></span><span></span></span>
                        <span style="font-size:0.8rem;color:var(--text-muted);margin-left:8px;">El bot está escribiendo...</span>
                    </div>

                    <form class="chat-input-area" id="chat-form">
                        <input type="text" id="chat-input" placeholder="Escribe un mensaje al bot..." autocomplete="off" disabled>
                        <button type="submit" class="chat-send-btn" id="chat-send-btn" disabled>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="22" y1="2" x2="11" y2="13"></line>
                                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                            </svg>
                        </button>
                    </form>
                </div>
            </div>
        `;

        await loadAgents(container, params.agentId);
        attachEvents(container);
    }

    // ── Cargar lista de agentes ───────────────────────────────
    async function loadAgents(container, preselectedId = null) {
        const listEl = document.getElementById('chat-agent-list');
        try {
            const result = await CodavityAPI.getAgents();
            // getAgents() returns {status, data: [...]} or an array directly
            const agents = Array.isArray(result) ? result : (result.data || []);
            const activeAgents = agents.filter(a => a.estado === 'activo' && a.webhook_url);

            if (activeAgents.length === 0) {
                listEl.innerHTML = `
                    <div style="padding:16px;text-align:center;color:var(--text-muted);font-size:0.85rem;">
                        No hay bots activos desplegados.<br>
                        <a href="#deploy" onclick="CodavityApp.navigate('deploy')" style="color:var(--accent);">Despliega uno →</a>
                    </div>`;
                return;
            }

            listEl.innerHTML = activeAgents.map(agent => {
                const name = agent.config_inyectada?.empresa_nombre || 'Agente';
                const botName = agent.config_inyectada?.nombre_bot || 'Bot IA';
                const template = agent.plantillas?.ref_nombre || '';
                return `
                    <div class="chat-agent-item ${preselectedId === agent.id ? 'active' : ''}"
                         data-id="${agent.id}"
                         data-webhook="${agent.webhook_url}"
                         data-name="${botName}"
                         data-empresa="${name}">
                        <div class="chat-agent-avatar">🤖</div>
                        <div class="chat-agent-info">
                            <div class="chat-agent-item-name">${botName}</div>
                            <div class="chat-agent-item-sub">${name} · ${template}</div>
                        </div>
                        <span class="badge badge-activo" style="font-size:0.65rem;flex-shrink:0;">
                            <span class="badge-dot"></span>Activo
                        </span>
                    </div>`;
            }).join('');

            // Auto-select if preselectedId passed
            if (preselectedId) {
                const target = activeAgents.find(a => a.id === preselectedId);
                if (target) selectAgent(target.id, target.webhook_url,
                    target.config_inyectada?.nombre_bot || 'Bot IA',
                    target.config_inyectada?.empresa_nombre || 'Agente');
            }

        } catch (err) {
            listEl.innerHTML = `<div style="padding:16px;color:#f87171;font-size:0.85rem;">Error al cargar agentes: ${err.message}</div>`;
        }
    }

    // ── Estado actual del chat ────────────────────────────────
    let currentWebhook = null;
    let currentBotName = null;

    function selectAgent(id, webhookUrl, botName, empresa) {
        currentWebhook = webhookUrl;
        currentBotName = botName;

        // Update sidebar active state
        document.querySelectorAll('.chat-agent-item').forEach(el => {
            el.classList.toggle('active', el.dataset.id === id);
        });

        // Update header
        document.getElementById('chat-bot-name').textContent = botName;
        document.getElementById('chat-bot-status').textContent = `${empresa} · Conectado ✓`;

        // Enable input
        const input = document.getElementById('chat-input');
        const sendBtn = document.getElementById('chat-send-btn');
        input.disabled = false;
        sendBtn.disabled = false;
        input.placeholder = `Escribe un mensaje a ${botName}...`;
        input.focus();

        // Clear messages and add welcome
        const messagesEl = document.getElementById('chat-messages');
        messagesEl.innerHTML = '';
        addMessage(`¡Hola! Estás chateando con **${botName}**. Escribe cualquier mensaje para probar cómo responde.`, 'system-info');
    }

    // ── Adjuntar eventos ──────────────────────────────────────
    function attachEvents(container) {
        // Agent list click
        const listEl = document.getElementById('chat-agent-list');
        listEl.addEventListener('click', e => {
            const item = e.target.closest('.chat-agent-item');
            if (!item) return;
            selectAgent(item.dataset.id, item.dataset.webhook, item.dataset.name, item.dataset.empresa);
        });

        // Form submit
        const form = document.getElementById('chat-form');
        form.addEventListener('submit', async e => {
            e.preventDefault();
            await sendMessage();
        });

        // Clear button
        document.getElementById('chat-clear-btn').addEventListener('click', () => {
            const messagesEl = document.getElementById('chat-messages');
            messagesEl.innerHTML = '';
            if (currentBotName) {
                addMessage(`Chat limpiado. Continúa probando a **${currentBotName}**.`, 'system-info');
            }
        });
    }

    // ── Enviar mensaje ────────────────────────────────────────
    async function sendMessage() {
        const input = document.getElementById('chat-input');
        const text = input.value.trim();
        if (!text || !currentWebhook) return;

        const phone = document.getElementById('chat-phone').value.trim() || '573210009999';
        const name = document.getElementById('chat-name').value.trim() || 'Tester';

        addMessage(text, 'user');
        input.value = '';

        const typingEl = document.getElementById('chat-typing');
        typingEl.style.display = 'flex';
        scrollToBottom();

        try {
            const res = await fetch(PROXY_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    webhook_url: currentWebhook,
                    telefono: phone,
                    nombre: name,
                    mensaje: text
                })
            });

            typingEl.style.display = 'none';

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                addMessage(`❌ Error ${res.status}: ${errData.detail || 'No se pudo conectar con el bot'}`, 'error');
                return;
            }

            // Parse the response body
            const bodyText = await res.text();
            if (!bodyText.trim()) {
                addMessage('⚠️ El bot no devolvió respuesta. El modelo de IA puede estar temporalmente saturado. Intenta de nuevo.', 'error');
                return;
            }

            let data;
            try {
                data = JSON.parse(bodyText);
            } catch {
                addMessage(bodyText, 'bot');
                return;
            }

            // Check if proxy returned an error message
            if (data.error && !data.response) {
                addMessage(`⚠️ ${data.error}`, 'error');
                return;
            }

            // Extract response text
            let response;
            if (typeof data.response === 'string' && data.response.trim()) {
                response = data.response;
            } else if (Array.isArray(data) && data[0]?.response) {
                response = data[0].response;
            } else if (data.error) {
                addMessage(`⚠️ ${data.error}`, 'error');
                return;
            } else if (typeof data.response === 'string') {
                addMessage('⚠️ El bot procesó tu mensaje pero no generó texto. Intenta reformulando tu pregunta.', 'error');
                return;
            } else {
                response = JSON.stringify(data, null, 2);
            }
            addMessage(response, 'bot');

        } catch (err) {
            typingEl.style.display = 'none';
            addMessage(`❌ Error de conexión: ${err.message}`, 'error');
        }
    }

    // ── Agregar mensaje al chat ───────────────────────────────
    function addMessage(text, type) {
        const messagesEl = document.getElementById('chat-messages');

        // Remove empty state if present
        const emptyState = messagesEl.querySelector('.chat-empty-state');
        if (emptyState) emptyState.remove();

        const div = document.createElement('div');

        if (type === 'user') {
            div.className = 'chat-msg chat-msg-user';
            div.innerHTML = `<div class="chat-bubble chat-bubble-user">${escapeHtml(text)}</div>`;
        } else if (type === 'bot') {
            const time = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
            div.className = 'chat-msg chat-msg-bot';
            div.innerHTML = `
                <div class="chat-bubble chat-bubble-bot">${escapeHtml(text).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>')}</div>
                <div class="chat-msg-time">${time}</div>`;
        } else if (type === 'error') {
            div.className = 'chat-msg chat-msg-error';
            div.innerHTML = `<div class="chat-bubble chat-bubble-error">${escapeHtml(text)}</div>`;
        } else {
            // system-info
            div.className = 'chat-msg chat-msg-system';
            div.innerHTML = `<div class="chat-system-msg">${text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')}</div>`;
        }

        messagesEl.appendChild(div);
        scrollToBottom();
    }

    function scrollToBottom() {
        const messagesEl = document.getElementById('chat-messages');
        if (messagesEl) requestAnimationFrame(() => { messagesEl.scrollTop = messagesEl.scrollHeight; });
    }

    function escapeHtml(str) {
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    return { render };
})();
