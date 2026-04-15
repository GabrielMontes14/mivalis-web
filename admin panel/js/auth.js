// Authentication Service
const Auth = {
    USERS: {
        admin: { password: 'admin123', name: 'Administrador', role: 'admin' }
    },

    login(username, password) {
        const user = this.USERS[username];
        if (user && user.password === password) {
            const session = { username, name: user.name, role: user.role, loginTime: Date.now() };
            localStorage.setItem('bodega_session', JSON.stringify(session));
            return true;
        }
        return false;
    },

    logout() {
        localStorage.removeItem('bodega_session');
        window.location.href = 'index.html';
    },

    isLoggedIn() {
        return localStorage.getItem('bodega_session') !== null;
    },

    getSession() {
        const session = localStorage.getItem('bodega_session');
        return session ? JSON.parse(session) : null;
    },

    requireAuth() {
        if (!this.isLoggedIn()) {
            window.location.href = 'index.html';
            return false;
        }
        return true;
    }
};
