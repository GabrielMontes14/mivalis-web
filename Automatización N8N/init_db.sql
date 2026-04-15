-- ============================================================
-- Oceanman — Motor de Agentes de Agencia
-- Base de Datos: init_db.sql
-- Modelo de Agencia (dueño único, múltiples clientes)
-- ============================================================

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABLA: clientes
-- Empresas cliente de la agencia (a quienes les vendes agentes)
-- ============================================================
DROP TABLE IF EXISTS logs_conversacion CASCADE;
DROP TABLE IF EXISTS leads CASCADE;
DROP TABLE IF EXISTS agentes_desplegados CASCADE;
DROP TABLE IF EXISTS plantillas CASCADE;
DROP TABLE IF EXISTS actividad CASCADE;
DROP TABLE IF EXISTS clientes CASCADE;

CREATE TABLE clientes (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre_empresa      TEXT NOT NULL,
    contacto_nombre     TEXT,
    email               TEXT,
    telefono            TEXT,
    industria           TEXT,
    notas               TEXT,
    estado              TEXT NOT NULL DEFAULT 'activo'
                        CHECK (estado IN ('activo', 'inactivo')),
    owner_user_id       UUID,          -- Tu Supabase Auth user ID
    creado_en           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_clientes_estado ON clientes(estado);
CREATE INDEX idx_clientes_owner ON clientes(owner_user_id);

-- ============================================================
-- TABLA: plantillas
-- Catálogo de workflows maestros disponibles para clonar
-- ============================================================
CREATE TABLE plantillas (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ref_nombre      TEXT UNIQUE NOT NULL,
    descripcion     TEXT NOT NULL,
    version         INTEGER NOT NULL DEFAULT 1,
    archivo_json    TEXT NOT NULL,
    variables_requeridas JSONB NOT NULL DEFAULT '[]'::JSONB,
    activa          BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed: plantilla de ventas
INSERT INTO plantillas (ref_nombre, descripcion, archivo_json, variables_requeridas)
VALUES (
    'sales_v1',
    'Agente de Ventas y Agendamiento',
    'sales_v1.json',
    '["empresa_nombre", "prompt_sistema", "nombre_bot", "descripcion_negocio", "lista_productos", "objetivo_conversion"]'::JSONB
);

-- ============================================================
-- TABLA: agentes_desplegados
-- Cada agente IA desplegado para un cliente
-- ============================================================
CREATE TABLE agentes_desplegados (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cliente_id      UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    plantilla_id    UUID REFERENCES plantillas(id) ON DELETE SET NULL,
    n8n_workflow_id TEXT,
    webhook_url     TEXT,
    estado          TEXT NOT NULL DEFAULT 'activo'
                    CHECK (estado IN ('activo', 'pausado', 'error', 'eliminado')),
    config_inyectada JSONB NOT NULL DEFAULT '{}'::JSONB,
    system_prompt   TEXT,
    owner_user_id   UUID,
    creado_en       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_agentes_cliente ON agentes_desplegados(cliente_id);
CREATE INDEX idx_agentes_estado ON agentes_desplegados(estado);
CREATE INDEX idx_agentes_owner ON agentes_desplegados(owner_user_id);

-- ============================================================
-- TABLA: leads
-- Prospectos capturados por los agentes
-- ============================================================
CREATE TABLE leads (
    id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agente_id             UUID NOT NULL REFERENCES agentes_desplegados(id) ON DELETE CASCADE,
    cliente_id            UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    nombre                TEXT,
    telefono              TEXT NOT NULL,
    score_interes         INTEGER NOT NULL DEFAULT 0
                          CHECK (score_interes >= 0 AND score_interes <= 100),
    estado                TEXT NOT NULL DEFAULT 'nuevo'
                          CHECK (estado IN ('nuevo', 'calificado', 'convertido', 'descartado')),
    resumen_necesidad     TEXT,
    contexto_conversacion JSONB DEFAULT '{}'::JSONB,
    metadata              JSONB DEFAULT '{}'::JSONB,
    primer_contacto       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ultimo_contacto       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_leads_agente ON leads(agente_id);
CREATE INDEX idx_leads_cliente ON leads(cliente_id);
CREATE INDEX idx_leads_telefono ON leads(telefono);
CREATE UNIQUE INDEX idx_leads_telefono_agente ON leads(agente_id, telefono);

-- ============================================================
-- TABLA: logs_conversacion
-- Historial de mensajes procesados
-- ============================================================
CREATE TABLE logs_conversacion (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id         UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    agente_id       UUID NOT NULL REFERENCES agentes_desplegados(id) ON DELETE CASCADE,
    cliente_id      UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    direccion       TEXT NOT NULL CHECK (direccion IN ('entrante', 'saliente')),
    contenido       TEXT NOT NULL,
    tipo_mensaje    TEXT NOT NULL DEFAULT 'texto',
    metadata        JSONB DEFAULT '{}'::JSONB,
    creado_en       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_logs_lead ON logs_conversacion(lead_id);
CREATE INDEX idx_logs_creado ON logs_conversacion(creado_en DESC);

-- ============================================================
-- TABLA: actividad
-- Feed de eventos recientes del dashboard
-- ============================================================
CREATE TABLE actividad (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tipo        TEXT NOT NULL,
    mensaje     TEXT NOT NULL,
    owner_user_id UUID,
    creado_en   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_actividad_creado ON actividad(creado_en DESC);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- El dueño de la agencia ve todo lo suyo
-- ============================================================
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE agentes_desplegados ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs_conversacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE actividad ENABLE ROW LEVEL SECURITY;

-- Políticas: el usuario autenticado ve los registros que le pertenecen
CREATE POLICY "owner_clientes" ON clientes FOR ALL USING (owner_user_id = auth.uid());
CREATE POLICY "owner_agentes" ON agentes_desplegados FOR ALL USING (owner_user_id = auth.uid());
CREATE POLICY "owner_leads" ON leads FOR ALL USING (cliente_id IN (SELECT id FROM clientes WHERE owner_user_id = auth.uid()));
CREATE POLICY "owner_logs" ON logs_conversacion FOR ALL USING (cliente_id IN (SELECT id FROM clientes WHERE owner_user_id = auth.uid()));
CREATE POLICY "owner_actividad" ON actividad FOR ALL USING (owner_user_id = auth.uid());

-- Plantillas son públicas (lectura)
ALTER TABLE plantillas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plantillas_lectura" ON plantillas FOR SELECT USING (true);

-- ============================================================
-- TRIGGERS
-- ============================================================
CREATE OR REPLACE FUNCTION actualizar_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.actualizado_en = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_clientes_timestamp
    BEFORE UPDATE ON clientes
    FOR EACH ROW EXECUTE FUNCTION actualizar_timestamp();

CREATE TRIGGER trg_agentes_timestamp
    BEFORE UPDATE ON agentes_desplegados
    FOR EACH ROW EXECUTE FUNCTION actualizar_timestamp();

CREATE OR REPLACE FUNCTION actualizar_ultimo_contacto()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE leads
    SET ultimo_contacto = NOW(),
        score_interes = LEAST(100, GREATEST(0, score_interes + COALESCE(NEW.score_cambio, 0)))
    WHERE id = NEW.lead_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
