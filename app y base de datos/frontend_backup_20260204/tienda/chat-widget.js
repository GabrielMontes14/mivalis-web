/* Chat Widget Logic */
document.addEventListener('DOMContentLoaded', () => {
    injectChatWidget();
});

function injectChatWidget() {
    const container = document.createElement('div');
    container.className = 'chat-widget-container';
    container.innerHTML = `
        <button class="chat-toggle-btn" id="chatToggle">
            <svg viewBox="0 0 24 24">
                <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
            </svg>
        </button>
        
        <div class="chat-window" id="chatWindow">
            <div class="chat-header">
                <div class="bot-info">
                    <div class="bot-avatar">🤖</div>
                    <div class="bot-name">
                        <h4>Asistente Bodega</h4>
                        <span>En línea</span>
                    </div>
                </div>
                <button class="close-chat-btn" id="closeChat">&times;</button>
            </div>
            
            <div class="chat-messages" id="chatMessages">
                <!-- Welcome Message -->
                <div class="message bot">
                    Hola 👋 Soy tu asistente virtual. ¿En qué puedo ayudarte hoy?
                    <div class="message-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
            </div>
            
            <div class="typing-indicator" id="typingIndicator">
                <div class="typing-dots">
                    <span></span><span></span><span></span>
                </div>
            </div>
            
            <div class="chat-input-area">
                <input type="text" class="chat-input" id="chatInput" placeholder="Escribe un mensaje..." autocomplete="off">
                <button class="send-btn" id="sendBtn">
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                    </svg>
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(container);

    // Event Listeners
    const toggleBtn = document.getElementById('chatToggle');
    const closeBtn = document.getElementById('closeChat');
    const window = document.getElementById('chatWindow');
    const input = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendBtn');
    const messagesContainer = document.getElementById('chatMessages');

    toggleBtn.addEventListener('click', () => {
        window.classList.toggle('open');
        if (window.classList.contains('open')) input.focus();
    });

    closeBtn.addEventListener('click', () => {
        window.classList.remove('open');
    });

    sendBtn.addEventListener('click', sendMessage);
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    async function sendMessage() {
        const text = input.value.trim();
        if (!text) return;

        // User Message
        appendMessage(text, 'user');
        input.value = '';

        // Show Typing
        showTyping(true);

        try {
            // Send to Backend
            // Determine Guest ID (store in localStorage)
            let guestId = localStorage.getItem('chat_guest_id');
            if (!guestId) {
                guestId = 'guest_' + Math.random().toString(36).substr(2, 9);
                localStorage.setItem('chat_guest_id', guestId);
            }

            const response = await fetch('/api/webhook/chat/web', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: text,
                    sender_id: guestId,
                    platform: "web"
                })
            });

            const data = await response.json();

            showTyping(false);
            appendMessage(data.message, 'bot');

        } catch (error) {
            console.error('Error sending message:', error);
            showTyping(false);
            appendMessage('Lo siento, tuve un problema de conexión. Intenta de nuevo.', 'bot');
        }
    }

    function appendMessage(text, type) {
        const div = document.createElement('div');
        div.className = `message ${type}`;

        // Convert simple links to anchors if needed, for now just text
        // Safety: textContent prevents XSS
        div.textContent = text;

        const time = document.createElement('div');
        time.className = 'message-time';
        time.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        div.appendChild(time);
        messagesContainer.appendChild(div);

        scrollToBottom();
    }

    function showTyping(show) {
        const indicator = document.getElementById('typingIndicator');
        indicator.style.display = show ? 'block' : 'none';
        scrollToBottom();
    }

    function scrollToBottom() {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
}
