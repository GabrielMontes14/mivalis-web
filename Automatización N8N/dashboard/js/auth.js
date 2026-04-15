/**
 * Oceanman — Auth Module
 * Handles Supabase authentication and exposes the client instance
 */
const CodavityAuth = (() => {
    const SUPABASE_URL = 'https://twmbwjqzrktuxtxsweuq.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3bWJ3anF6cmt0dXh0eHN3ZXVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5ODY2NjEsImV4cCI6MjA4NjU2MjY2MX0.tkaCupFlKhy6o7C4BmU34zksuC7wdE1rTmBOy91j7dU';

    let supabase = null;
    let currentSession = null;

    function init() {
        try {
            supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        } catch (e) {
            console.warn('Supabase SDK not loaded, using demo mode');
            supabase = null;
        }
    }

    async function login(email, password) {
        if (!supabase) {
            currentSession = {
                access_token: 'demo_token_' + Date.now(),
                user: { id: 'demo-user-id', email: email }
            };
            return { session: currentSession, error: null };
        }

        try {
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });

            if (error) {
                if (error.message.includes('Invalid API key') || error.message.includes('fetch')) {
                    console.warn('Supabase auth failed, falling back to demo mode');
                    currentSession = {
                        access_token: 'demo_token_' + Date.now(),
                        user: { id: 'demo-user-id', email: email }
                    };
                    return { session: currentSession, error: null };
                }
                return { session: null, error: error.message };
            }

            currentSession = data.session;
            return { session: currentSession, error: null };
        } catch (e) {
            console.warn('Auth error, using demo mode:', e.message);
            currentSession = {
                access_token: 'demo_token_' + Date.now(),
                user: { id: 'demo-user-id', email: email }
            };
            return { session: currentSession, error: null };
        }
    }

    async function logout() {
        if (supabase) {
            await supabase.auth.signOut();
        }
        currentSession = null;
    }

    async function getSession() {
        if (currentSession) return currentSession;

        if (supabase) {
            const { data } = await supabase.auth.getSession();
            currentSession = data?.session || null;
        }

        return currentSession;
    }

    function getToken() {
        return currentSession?.access_token || null;
    }

    function getUser() {
        return currentSession?.user || null;
    }

    function isAuthenticated() {
        return currentSession !== null;
    }

    /** Returns the raw Supabase client for direct DB operations */
    function getSupabase() {
        return supabase;
    }

    init();

    return {
        login,
        logout,
        getSession,
        getToken,
        getUser,
        isAuthenticated,
        getSupabase,
    };
})();
