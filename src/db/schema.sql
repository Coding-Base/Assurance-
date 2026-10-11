-- ==============================================================================
-- SubseaFlow CAD Platform - Multi-Tenant PostgreSQL Relational Database Schema
-- Architecture: Row-Level Security (RLS) Tenant Isolation, DAG Serialization,
-- and Discretized Beggs & Brill Simulation Result Archives.
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. WORKSPACES & TENANTS
CREATE TABLE IF NOT EXISTS workspaces (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    tier VARCHAR(32) NOT NULL DEFAULT 'TRIAL' CHECK (tier IN ('TRIAL', 'PROFESSIONAL', 'ENTERPRISE')),
    trial_runs_left INTEGER NOT NULL DEFAULT 15 CHECK (trial_runs_left >= 0),
    max_runs INTEGER NOT NULL DEFAULT 15,
    license_key_hmac TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Row-level locking helper index
CREATE INDEX idx_workspaces_tier ON workspaces (tier);

-- 2. USERS & ACCESS CONTROL (RBAC)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(64) NOT NULL CHECK (role IN ('Lead Flow Assurance Engineer', 'Subsea Systems Specialist', 'Offshore Operations Admin', 'Viewer')),
    active_workspace_id VARCHAR(64) REFERENCES workspaces(id) ON DELETE CASCADE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. SIMULATION PROJECTS & CANVAS GRAPHS
CREATE TABLE IF NOT EXISTS simulation_projects (
    id VARCHAR(64) PRIMARY KEY,
    workspace_id VARCHAR(64) NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    created_by_user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    canvas_version VARCHAR(16) NOT NULL DEFAULT '2.1',
    graph_topology_json JSONB NOT NULL, -- Storing full visual node/edge coordinates
    serialized_chain_json JSONB NOT NULL, -- Chronological serialized DAG array for solver
    is_valid_dag BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_projects_workspace ON simulation_projects (workspace_id);
CREATE INDEX idx_projects_topology ON simulation_projects USING GIN (serialized_chain_json);

-- 4. SIMULATION EXECUTION RUNS
CREATE TABLE IF NOT EXISTS simulation_runs (
    id VARCHAR(64) PRIMARY KEY,
    workspace_id VARCHAR(64) NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    project_id VARCHAR(64) REFERENCES simulation_projects(id) ON DELETE CASCADE,
    triggered_by_user_id VARCHAR(64) REFERENCES users(id),
    status VARCHAR(32) NOT NULL CHECK (status IN ('QUEUED', 'SOLVING', 'COMPLETED', 'FAILED')),
    execution_time_ms INTEGER NOT NULL,
    
    -- Summary KPIs
    total_length_km NUMERIC(8, 2) NOT NULL,
    wellhead_pressure_bar NUMERIC(8, 2) NOT NULL,
    wellhead_temp_c NUMERIC(8, 2) NOT NULL,
    arrival_pressure_bar NUMERIC(8, 2) NOT NULL,
    arrival_temp_c NUMERIC(8, 2) NOT NULL,
    pressure_drop_bar NUMERIC(8, 2) NOT NULL,
    min_hydrate_margin_c NUMERIC(8, 2) NOT NULL,
    is_hydrate_plug_predicted BOOLEAN NOT NULL DEFAULT FALSE,
    max_wax_thickness_mm NUMERIC(8, 2) NOT NULL DEFAULT 0.0,
    dominant_flow_regime VARCHAR(64) NOT NULL,
    
    -- Full 1D spatial discretization profile payload (100m cells)
    spatial_profile_data JSONB NOT NULL,
    baseline_comparison_data JSONB,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_runs_workspace ON simulation_runs (workspace_id);
CREATE INDEX idx_runs_created_at ON simulation_runs (created_at DESC);

-- 5. ATOMIC LICENSE QUOTA DECREMENT STORED PROCEDURE
CREATE OR REPLACE FUNCTION decrement_workspace_quota(
    p_workspace_id VARCHAR(64),
    p_required_runs INT DEFAULT 1
) RETURNS TABLE (
    success BOOLEAN,
    remaining_balance INT,
    err_message TEXT
) AS $$
DECLARE
    v_tier VARCHAR(32);
    v_runs_left INT;
BEGIN
    -- Acquire row-level lock on the tenant record
    SELECT tier, trial_runs_left INTO v_tier, v_runs_left
    FROM workspaces
    WHERE id = p_workspace_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 0, 'Workspace tenant record not found'::TEXT;
        RETURN;
    END IF;

    -- Enterprise tier has unlimited execution quota
    IF v_tier = 'ENTERPRISE' THEN
        RETURN QUERY SELECT TRUE, v_runs_left, NULL::TEXT;
        RETURN;
    END IF;

    -- Trial & Professional quota validation
    IF v_runs_left < p_required_runs THEN
        RETURN QUERY SELECT FALSE, v_runs_left, 'Simulation trial run quota exhausted. Please upgrade to Enterprise HMAC license.'::TEXT;
        RETURN;
    END IF;

    -- Atomically decrement remaining balance
    UPDATE workspaces
    SET trial_runs_left = trial_runs_left - p_required_runs,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_workspace_id;

    RETURN QUERY SELECT TRUE, (v_runs_left - p_required_runs), NULL::TEXT;
END;
$$ LANGUAGE plpgsql;

-- 6. AUDIT LOGS FOR LICENSE USAGE
CREATE TABLE IF NOT EXISTS license_audit_logs (
    id SERIAL PRIMARY KEY,
    workspace_id VARCHAR(64) REFERENCES workspaces(id),
    user_id VARCHAR(64) REFERENCES users(id),
    action VARCHAR(64) NOT NULL,
    previous_runs INTEGER,
    new_runs INTEGER,
    ip_address INET,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
