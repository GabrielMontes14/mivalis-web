/**
 * Oceanman — API Module
 * Connects to Supabase for persistent CRUD operations
 * Falls back to localStorage when Supabase is unavailable
 */
const CodavityAPI = (() => {

    // ── FastAPI base URL (local dev) ─────────────────────────
    const FASTAPI_BASE = 'http://localhost:8000';

    function db() {
        return CodavityAuth.getSupabase();
    }

    function userId() {
        return CodavityAuth.getUser()?.id || null;
    }

    // ── localStorage fallback ────────────────────────────────
    function localGet(key, def) {
        try {
            const raw = localStorage.getItem('oceanman_' + key);
            return raw ? JSON.parse(raw) : def;
        } catch { return def; }
    }
    function localSet(key, val) {
        try { localStorage.setItem('oceanman_' + key, JSON.stringify(val)); } catch { }
    }

    function isSupabaseReady() {
        return db() !== null && userId() && !userId().startsWith('demo');
    }

    // ═══════════════════════════════════════════════════════
    //  CLIENTES
    // ═══════════════════════════════════════════════════════
    async function getClientes() {
        if (isSupabaseReady()) {
            const { data, error } = await db().from('clientes').select('*').order('creado_en', { ascending: false });
            if (error) throw new Error(error.message);
            return { status: 'success', data };
        }
        return { status: 'success', data: localGet('clientes', []) };
    }

    async function createCliente(body) {
        if (isSupabaseReady()) {
            const insert = {
                nombre_empresa: body.nombre_empresa,
                contacto_nombre: body.contacto_nombre || null,
                email: body.email || null,
                telefono: body.telefono || null,
                industria: body.industria || null,
                notas: body.notas || null,
                estado: 'activo',
                owner_user_id: userId(),
            };
            const { data, error } = await db().from('clientes').insert(insert).select().single();
            if (error) throw new Error(error.message);
            // Log activity
            logActivity('cliente_nuevo', `Nuevo cliente: ${data.nombre_empresa}`);
            return { status: 'success', data };
        }
        // Fallback: localStorage
        const newClient = { id: 'cli_' + Date.now(), ...body, estado: 'activo', creado_en: new Date().toISOString() };
        const list = localGet('clientes', []);
        list.unshift(newClient);
        localSet('clientes', list);
        return { status: 'success', data: newClient };
    }

    async function deleteCliente(id) {
        if (isSupabaseReady()) {
            const { error } = await db().from('clientes').delete().eq('id', id);
            if (error) throw new Error(error.message);
            return { status: 'success' };
        }
        const list = localGet('clientes', []).filter(c => c.id !== id);
        localSet('clientes', list);
        return { status: 'success' };
    }

    // ═══════════════════════════════════════════════════════
    //  AGENTES
    // ═══════════════════════════════════════════════════════
    async function getAgents() {
        const token = CodavityAuth.getToken();
        if (token) {
            const resp = await fetch(`${FASTAPI_BASE}/api/v1/agents`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!resp.ok) throw new Error(`Error ${resp.status}: ${resp.statusText}`);
            return await resp.json();
        }
        return { status: 'success', data: localGet('agents', []) };
    }

    async function updateAgent(id, estado) {
        const token = CodavityAuth.getToken();
        if (token) {
            const resp = await fetch(`${FASTAPI_BASE}/api/v1/agents/${id}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json' // Fastapi expects simple query param or body? Let's check agent.py. It uses query param for estado in signature. But better to pass as query param based on python signature `estado: str = "pausado"`. Let's check python code again. it is query param.
                }
            });
            // Python: update_agent_status(agente_id, user_id, estado)
            // Wait, looking at python code:
            // @router.patch("/agents/{agente_id}")
            // async def update_agent_status(..., estado: str = "pausado")
            // So it expects ?estado=pausado query param.

            const url = new URL(`${FASTAPI_BASE}/api/v1/agents/${id}`);
            url.searchParams.append('estado', estado);

            const resp2 = await fetch(url, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!resp2.ok) throw new Error(`Error ${resp2.status}: ${resp2.statusText}`);
            return await resp2.json();
        }
        const list = localGet('agents', []);
        const agent = list.find(a => a.id === id);
        if (agent) agent.estado = estado;
        localSet('agents', list);
        return { status: 'success', data: agent };
    }

    async function deleteAgent(id) {
        const token = CodavityAuth.getToken();
        if (token) {
            const resp = await fetch(`${FASTAPI_BASE}/api/v1/agents/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!resp.ok) throw new Error(`Error ${resp.status}: ${resp.statusText}`);
            return await resp.json();
        }
        const list = localGet('agents', []).filter(a => a.id !== id);
        localSet('agents', list);
        return { status: 'success' };
    }



    // ═══════════════════════════════════════════════════════
    //  LEADS
    // ═══════════════════════════════════════════════════════
    async function getLeads() {
        if (isSupabaseReady()) {
            const { data, error } = await db()
                .from('leads')
                .select('*, agentes_desplegados(id, config_inyectada, cliente_id)')
                .order('ultimo_contacto', { ascending: false });
            if (error) throw new Error(error.message);
            return { status: 'success', data };
        }
        return { status: 'success', data: localGet('leads', []) };
    }

    // ═══════════════════════════════════════════════════════
    //  CONVERSACIONES
    // ═══════════════════════════════════════════════════════
    async function getConversations(leadId) {
        if (isSupabaseReady()) {
            const { data, error } = await db()
                .from('logs_conversacion')
                .select('*')
                .eq('lead_id', leadId)
                .order('creado_en', { ascending: true });
            if (error) throw new Error(error.message);
            return { status: 'success', data };
        }
        return { status: 'success', data: [] };
    }

    // ═══════════════════════════════════════════════════════
    //  PLANTILLAS
    // ═══════════════════════════════════════════════════════
    async function getPlantillas() {
        if (isSupabaseReady()) {
            const { data, error } = await db().from('plantillas').select('*').eq('activa', true);
            if (error) throw new Error(error.message);
            return { status: 'success', data };
        }
        return {
            status: 'success',
            data: [{
                id: 'p1', ref_nombre: 'sales_v1',
                descripcion: 'Agente de Ventas y Agendamiento',
                version: 1,
                variables_requeridas: ['empresa_nombre', 'prompt_sistema', 'nombre_bot', 'descripcion_negocio', 'lista_productos', 'objetivo_conversion'],
            }],
        };
    }

    // ═══════════════════════════════════════════════════════
    //  DEPLOY
    // ═══════════════════════════════════════════════════════
    async function deploy(formData) {
        const token = CodavityAuth.getToken();
        if (!token) throw new Error('No autenticado. Inicia sesión primero.');

        const body = {
            plantilla_ref: formData.plantilla_ref || 'sales_v1',
            config_personalizada: {
                ...formData.config_personalizada,
                cliente_id: formData.cliente_id,
            },
        };

        const resp = await fetch(`${FASTAPI_BASE}/api/v1/deploy`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (!resp.ok) {
            const err = await resp.json().catch(() => ({ detail: resp.statusText }));
            throw new Error(err.detail || `Error ${resp.status}: ${resp.statusText}`);
        }

        const result = await resp.json();

        // Log activity
        logActivity('agente_desplegado', `Agente desplegado: ${formData.config_personalizada?.empresa_nombre || 'nuevo agente'}`);

        return {
            status: result.status || 'success',
            workflow_id: result.workflow_id,
            webhook_url: result.webhook_url,
            agente_id: result.agente_id,
            activated_at: result.activated_at,
        };
    }

    // ═══════════════════════════════════════════════════════
    //  DASHBOARD STATS
    // ═══════════════════════════════════════════════════════
    async function getStats() {
        if (isSupabaseReady()) {
            const [clientsRes, agentsRes, leadsRes, msgsRes] = await Promise.all([
                db().from('clientes').select('id', { count: 'exact', head: true }).eq('estado', 'activo'),
                db().from('agentes_desplegados').select('id, estado', { count: 'exact' }).neq('estado', 'eliminado'),
                db().from('leads').select('id', { count: 'exact', head: true }),
                db().from('logs_conversacion').select('id', { count: 'exact', head: true }),
            ]);

            const agentsActive = (agentsRes.data || []).filter(a => a.estado === 'activo').length;

            return {
                status: 'success',
                data: {
                    clientes_activos: clientsRes.count || 0,
                    agentes_desplegados: agentsRes.count || 0,
                    agentes_activos: agentsActive,
                    leads_total: leadsRes.count || 0,
                    mensajes_24h: 0,
                    mensajes_total: msgsRes.count || 0,
                },
            };
        }

        // localStorage fallback
        const clients = localGet('clientes', []);
        const agents = localGet('agents', []);
        const leads = localGet('leads', []);
        return {
            status: 'success',
            data: {
                clientes_activos: clients.filter(c => c.estado === 'activo').length,
                agentes_desplegados: agents.length,
                agentes_activos: agents.filter(a => a.estado === 'activo').length,
                leads_total: leads.length,
                mensajes_24h: 0,
                mensajes_total: 0,
            },
        };
    }

    // ═══════════════════════════════════════════════════════
    //  ACTIVITY FEED
    // ═══════════════════════════════════════════════════════
    async function getActivity() {
        if (isSupabaseReady()) {
            const { data, error } = await db().from('actividad').select('*').order('creado_en', { ascending: false }).limit(20);
            if (error) throw new Error(error.message);
            return { status: 'success', data };
        }
        return { status: 'success', data: localGet('actividad', []) };
    }

    async function logActivity(tipo, mensaje) {
        if (isSupabaseReady()) {
            await db().from('actividad').insert({ tipo, mensaje, owner_user_id: userId() });
        } else {
            const list = localGet('actividad', []);
            list.unshift({ id: 'act_' + Date.now(), tipo, mensaje, creado_en: new Date().toISOString() });
            if (list.length > 50) list.length = 50;
            localSet('actividad', list);
        }
    }

    // ═══════════════════════════════════════════════════════
    //  INFRASTRUCTURE STATUS
    // ═══════════════════════════════════════════════════════
    async function getInfraStatus() {
        const supaOk = isSupabaseReady();
        return {
            status: 'success',
            data: {
                n8n: { status: 'conectado', url: '' },
                supabase: { status: supaOk ? 'conectado' : 'desconectado', url: '' },
                gemini: { status: 'conectado', model: 'gemini-1.5-flash' },
            },
        };
    }

    return {
        getStats,
        getActivity,
        getInfraStatus,
        getClientes,
        createCliente,
        deleteCliente,
        getAgents,
        getAgent: (id) => getAgents().then(r => ({ ...r, data: (r.data || []).find(a => a.id === id) })),
        updateAgent,
        deleteAgent,
        getLeads,
        getConversations,
        getPlantillas,
        deploy,
        isLocalMode: () => !isSupabaseReady(),
    };
})();
