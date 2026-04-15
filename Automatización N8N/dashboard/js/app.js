/**
 * Oceanman — App Router & Main Controller
 * Handles SPA routing, sidebar, toasts, and modals
 */
const CodavityApp = (() => {
    const pages = {
        dashboard: { title: 'Centro de Mando', view: DashboardView },
        clients: { title: 'Clientes', view: ClientsView },
        agents: { title: 'Agentes', view: AgentsView },
        deploy: { title: 'Desplegar Agente', view: DeployView },
        leads: { title: 'Leads', view: LeadsView },
        conversations: { title: 'Conversaciones', view: ConversationsView },
        chat: { title: 'Chat de Prueba', view: ChatView },
        settings: { title: 'Configuración', view: SettingsView },
    };

    let currentPage = 'dashboard';

    // ── Initialization ──────────────────────────────────────
    function init() {
        setupLogin();
        setupSidebar();
        setupRouting();

        // Check existing session
        CodavityAuth.getSession().then(session => {
            if (session) {
                showApp(session);
            }
        });
    }

    // ── Login ────────────────────────────────────────────────
    function setupLogin() {
        const form = document.getElementById('login-form');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            const errorEl = document.getElementById('login-error');
            const btn = document.getElementById('login-btn');

            btn.disabled = true;
            btn.innerHTML = '<div class="spinner" style="width:16px;height:16px;border-width:2px"></div> Ingresando...';
            errorEl.style.display = 'none';

            const { session, error } = await CodavityAuth.login(email, password);

            if (error) {
                errorEl.textContent = error;
                errorEl.style.display = 'block';
                btn.disabled = false;
                btn.innerHTML = '<span>Iniciar Sesión</span><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';
                return;
            }

            showApp(session);
        });
    }

    function showApp(session) {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('app-shell').style.display = 'flex';

        // Set user info in sidebar
        const user = CodavityAuth.getUser();
        if (user) {
            const nameEl = document.getElementById('user-name');
            const avatarEl = document.getElementById('user-avatar');
            const planEl = document.getElementById('user-plan');
            const email = user.email || 'Admin';
            if (nameEl) nameEl.textContent = 'Oceanman';
            if (avatarEl) avatarEl.textContent = 'O';
            if (planEl) planEl.textContent = 'Administrador';
        }

        // Navigate to current hash or default
        navigate(getPageFromHash() || 'dashboard');
    }

    // ── Sidebar ──────────────────────────────────────────────
    function setupSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        const mobileBtn = document.getElementById('mobile-menu-btn');
        const logoutBtn = document.getElementById('logout-btn');

        mobileBtn?.addEventListener('click', () => {
            sidebar.classList.add('open');
            overlay.classList.add('active');
        });

        overlay?.addEventListener('click', () => {
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
        });

        logoutBtn?.addEventListener('click', async () => {
            await CodavityAuth.logout();
            document.getElementById('app-shell').style.display = 'none';
            document.getElementById('login-screen').style.display = 'flex';
            document.getElementById('login-form').reset();
            window.location.hash = '';
        });

        // Nav item clicks
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.dataset.page;
                if (page) {
                    window.location.hash = page;
                    sidebar.classList.remove('open');
                    overlay.classList.remove('active');
                }
            });
        });
    }

    // ── Routing ──────────────────────────────────────────────
    function setupRouting() {
        window.addEventListener('hashchange', () => {
            if (!CodavityAuth.isAuthenticated()) return;
            const { page, params } = parseHash();
            navigate(page, params);
        });
    }

    function parseHash() {
        const hash = window.location.hash.slice(1);
        const [pagePart, queryString] = hash.split('?');
        const params = {};
        if (queryString) {
            queryString.split('&').forEach(pair => {
                const [key, val] = pair.split('=');
                params[key] = decodeURIComponent(val);
            });
        }
        return { page: pagePart || 'dashboard', params };
    }

    function getPageFromHash() {
        return parseHash().page;
    }

    function navigate(page, params = {}) {
        const config = pages[page];
        if (!config) {
            page = 'dashboard';
        }

        currentPage = page;

        // Update active nav
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.page === page);
        });

        // Update title
        const titleEl = document.getElementById('page-title');
        if (titleEl) titleEl.textContent = pages[page]?.title || 'Centro de Mando';

        // Render page
        const container = document.getElementById('page-container');
        if (container && pages[page]?.view) {
            container.innerHTML = '';
            pages[page].view.render(container, params);
        }
    }

    // ── Toast Notifications ──────────────────────────────────
    function showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ',
        };

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `<span>${icons[type] || 'ℹ'}</span><span>${message}</span>`;
        container.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('toast-exit');
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    // ── Modal ────────────────────────────────────────────────
    function showModal(title, message, onConfirm) {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal-card">
                <h3>${title}</h3>
                <p>${message}</p>
                <div class="modal-actions">
                    <button class="btn btn-secondary" id="modal-cancel">Cancelar</button>
                    <button class="btn btn-danger" id="modal-confirm">Confirmar</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        overlay.querySelector('#modal-cancel').addEventListener('click', () => overlay.remove());
        overlay.querySelector('#modal-confirm').addEventListener('click', () => {
            overlay.remove();
            if (onConfirm) onConfirm();
        });
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.remove();
        });
    }

    // Init on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    return {
        showToast,
        showModal,
        navigate,
    };
})();
