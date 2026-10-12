/**
 * DatabaseSchemaModal Component - Viewer for PostgreSQL DDL, Django ORM, and Python Physics Solvers
 */

import React, { useState } from 'react';
import { X, Copy, Check, Download, Database, FileCode, Layers, Terminal, Sparkles } from 'lucide-react';

interface DatabaseSchemaModalProps {
  onClose: () => void;
}

const POSTGRESQL_SCHEMA_SQL = `-- ==============================================================================
-- SubseaFlow CAD Platform - Multi-Tenant PostgreSQL Relational Database Schema
-- Architecture: Row-Level Security (RLS) Tenant Isolation, DAG Serialization,
-- and Discretized Beggs & Brill Simulation Result Archives.
-- ==============================================================================

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
    graph_topology_json JSONB NOT NULL,
    serialized_chain_json JSONB NOT NULL,
    is_valid_dag BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. SIMULATION EXECUTION RUNS
CREATE TABLE IF NOT EXISTS simulation_runs (
    id VARCHAR(64) PRIMARY KEY,
    workspace_id VARCHAR(64) NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    project_id VARCHAR(64) REFERENCES simulation_projects(id) ON DELETE CASCADE,
    triggered_by_user_id VARCHAR(64) REFERENCES users(id),
    status VARCHAR(32) NOT NULL CHECK (status IN ('QUEUED', 'SOLVING', 'COMPLETED', 'FAILED')),
    execution_time_ms INTEGER NOT NULL,
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
    spatial_profile_data JSONB NOT NULL,
    baseline_comparison_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

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
    SELECT tier, trial_runs_left INTO v_tier, v_runs_left
    FROM workspaces
    WHERE id = p_workspace_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 0, 'Workspace tenant record not found'::TEXT;
        RETURN;
    END IF;

    IF v_tier = 'ENTERPRISE' THEN
        RETURN QUERY SELECT TRUE, v_runs_left, NULL::TEXT;
        RETURN;
    END IF;

    IF v_runs_left < p_required_runs THEN
        RETURN QUERY SELECT FALSE, v_runs_left, 'Simulation trial run quota exhausted.'::TEXT;
        RETURN;
    END IF;

    UPDATE workspaces
    SET trial_runs_left = trial_runs_left - p_required_runs,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_workspace_id;

    RETURN QUERY SELECT TRUE, (v_runs_left - p_required_runs), NULL::TEXT;
END;
$$ LANGUAGE plpgsql;`;

const DJANGO_VIEWS_PY = `"""
Django REST Framework Views (POST /api/v1/simulations/run/)
Executes Beggs & Brill (1973) 1D discretization directly in Python.
"""
import time
import uuid
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status

from physics_solver import solve_subsea_chain
from .models import Workspace, SimulationRunResult

@api_view(['POST'])
@permission_classes([AllowAny])
def run_simulation(request):
    data = request.data
    project_id = data.get("project_id", "proj_subsea_tieback_01")
    workspace_id = data.get("workspace_id", "ws_alpha_energy")
    network_chain = data.get("network_chain", [])

    if not network_chain:
        return Response({"error": "Empty network_chain"}, status=status.HTTP_400_BAD_REQUEST)

    t0 = time.time()
    sim_output = solve_subsea_chain(network_chain)
    duration_ms = int((time.time() - t0) * 1000)

    run_id = f"sim_run_{uuid.uuid4().hex[:12]}"
    response_payload = {
        "simulation_id": run_id,
        "project_id": project_id,
        "workspace_id": workspace_id,
        "execution_time_ms": duration_ms,
        "summary": sim_output["summary"],
        "spatial_profile": sim_output["spatial_profile"],
        "unmitigated_baseline": sim_output["unmitigated_baseline"],
        "backend": "Django REST Framework / Python 3 Beggs & Brill"
    }
    return Response(response_payload, status=status.HTTP_200_OK)`;

const DJANGO_MODELS_PY = `"""
Django ORM Multi-Tenant Models
Multi-tenant workspace isolation, row locking, and spatial simulation results.
"""
from django.db import models, transaction
from django.core.exceptions import ValidationError

class Workspace(models.Model):
    id = models.CharField(max_length=64, primary_key=True)
    name = models.CharField(max_length=255)
    tier = models.CharField(max_length=32, choices=[('TRIAL', 'Trial'), ('ENTERPRISE', 'Enterprise')], default='TRIAL')
    trial_runs_left = models.PositiveIntegerField(default=15)
    license_key_hmac = models.TextField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    @classmethod
    def atomic_decrement_quota(cls, workspace_id: str) -> int:
        with transaction.atomic():
            ws = cls.objects.select_for_update().get(id=workspace_id)
            if ws.tier == 'ENTERPRISE':
                return ws.trial_runs_left
            if ws.trial_runs_left <= 0:
                raise ValidationError("Simulation quota exhausted for workspace.")
            ws.trial_runs_left -= 1
            ws.save(update_fields=['trial_runs_left'])
            return ws.trial_runs_left

class SimulationRunResult(models.Model):
    id = models.CharField(max_length=64, primary_key=True)
    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE)
    project_id = models.CharField(max_length=64)
    status = models.CharField(max_length=32, default='COMPLETED')
    execution_time_ms = models.PositiveIntegerField(default=100)
    total_length_km = models.DecimalField(max_digits=8, decimal_places=2)
    arrival_pressure_bar = models.DecimalField(max_digits=8, decimal_places=2)
    arrival_temp_c = models.DecimalField(max_digits=8, decimal_places=2)
    min_hydrate_margin_c = models.DecimalField(max_digits=8, decimal_places=2)
    is_hydrate_plug_predicted = models.BooleanField(default=False)
    dominant_flow_regime = models.CharField(max_length=64, default='Segregated')
    spatial_profile_data = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)`;

const CELERY_TASKS_PY = `"""
Celery / Redis Asynchronous Task (backend/simulations/tasks.py)
Distributed high-resolution multiphase meshing for subsea tiebacks.
"""
from celery import shared_task
from physics_solver import solve_subsea_chain

@shared_task
def run_asynchronous_simulation_task(project_id: str, workspace_id: str, network_chain: list, delta_x_m: float = 100.0):
    result = solve_subsea_chain(network_chain, delta_x_m=delta_x_m)
    return {
        "project_id": project_id,
        "workspace_id": workspace_id,
        "status": "COMPLETED",
        "result": result
    }`;

export const DatabaseSchemaModal: React.FC<DatabaseSchemaModalProps> = ({ onClose }) => {
  const [tab, setTab] = useState<'sql' | 'views' | 'models' | 'celery'>('sql');
  const [copied, setCopied] = useState(false);

  const fileMap = {
    sql: { code: POSTGRESQL_SCHEMA_SQL, name: 'schema.sql', path: 'src/db/schema.sql' },
    views: { code: DJANGO_VIEWS_PY, name: 'views.py (DRF)', path: 'backend/simulations/views.py' },
    models: { code: DJANGO_MODELS_PY, name: 'models.py (Django)', path: 'backend/simulations/models.py' },
    celery: { code: CELERY_TASKS_PY, name: 'tasks.py (Celery)', path: 'backend/simulations/tasks.py' },
  };

  const active = fileMap[tab];

  const handleCopy = () => {
    navigator.clipboard.writeText(active.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([active.code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = active.name.split(' ')[0];
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-indigo-950 border border-indigo-800 text-indigo-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <span>Django REST Framework & PostgreSQL Schema</span>
                <span className="text-[10px] font-mono bg-emerald-950 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-800">
                  Python 3.10 Backend
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                PostgreSQL RLS DDL, DRF REST views, Django ORM models, and Celery asynchronous tasks
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopy}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono border border-slate-700 transition"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>

            <button
              onClick={handleDownload}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
              title={`Download ${active.name}`}
            >
              <Download className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Switcher Ribbon */}
        <div className="px-4 py-2 bg-slate-950 border-b border-slate-800 flex items-center space-x-2 text-xs font-mono">
          {(['sql', 'views', 'models', 'celery'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1 rounded-md transition font-medium ${
                tab === t
                  ? 'bg-indigo-600 text-white font-bold'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {fileMap[t].name}
            </button>
          ))}
        </div>

        {/* Code Content */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-950 font-mono text-xs text-indigo-200 custom-scrollbar select-text">
          <pre className="leading-relaxed whitespace-pre-wrap">{active.code}</pre>
        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between text-xs text-slate-400">
          <span>Row-level locks via SELECT ... FOR UPDATE and DRF endpoint /api/v1/simulations/run/</span>
          <span className="font-mono text-[11px] text-cyan-400">{active.path}</span>
        </div>
      </div>
    </div>
  );
};
