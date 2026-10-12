/**
 * Navbar Component with Multi-Tenant Workspace Selector,
 * Quota Balance Indicator, Preset Scenarios, and Primary Simulation Controls.
 */

import React, { useState } from 'react';
import {
  Waves,
  Play,
  CheckCircle2,
  AlertTriangle,
  Code2,
  Database,
  FlaskConical,
  Github,
  Download,
  Building2,
  ChevronDown,
  Layers,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { WorkspaceTenant } from '../types/subsea';
import { PRESET_SCENARIOS, PresetScenario } from '../data/presetScenarios';

interface NavbarProps {
  currentWorkspace: WorkspaceTenant;
  workspaces: WorkspaceTenant[];
  onSelectWorkspace: (ws: WorkspaceTenant) => void;
  onRunSimulation: () => void;
  isSimulating: boolean;
  isValidDag: boolean;
  onOpenDagModal: () => void;
  onOpenDbModal: () => void;
  onOpenDjangoAdminModal: () => void;
  onOpenTestModal: () => void;
  onOpenGithubModal: () => void;
  onExportReport: () => void;
  onLoadScenario: (scenario: PresetScenario) => void;
  onResetCanvas: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentWorkspace,
  workspaces,
  onSelectWorkspace,
  onRunSimulation,
  isSimulating,
  isValidDag,
  onOpenDagModal,
  onOpenDbModal,
  onOpenDjangoAdminModal,
  onOpenTestModal,
  onOpenGithubModal,
  onExportReport,
  onLoadScenario,
  onResetCanvas,
}) => {
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false);
  const [showPresetMenu, setShowPresetMenu] = useState(false);

  return (
    <header className="h-16 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between text-slate-100 z-30 select-none shadow-md">
      {/* Brand & Project Identity */}
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-500 p-0.5 shadow-lg shadow-cyan-950/40 flex items-center justify-center">
          <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
            <Waves className="w-5 h-5 text-cyan-400 animate-pulse" />
          </div>
        </div>

        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
              <span>SubseaFlow CAD</span>
              <span className="text-[10px] font-mono uppercase bg-cyan-950 text-cyan-400 px-1.5 py-0.5 rounded border border-cyan-800">
                v2.1
              </span>
            </h1>
            <span className="text-slate-600">/</span>
            <span className="text-xs text-slate-400 font-medium hidden sm:inline">
              Tieback Flow Assurance
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-mono flex items-center gap-2">
            <span>Beggs & Brill Solver</span>
            <span className="inline-block w-1 h-1 rounded-full bg-slate-600" />
            <span>Hammerschmidt Hydrate Model</span>
          </p>
        </div>
      </div>

      {/* Preset Scenarios & Workspace Tenant Dropdown */}
      <div className="flex items-center space-x-2">
        {/* Scenario Presets Selector */}
        <div className="relative">
          <button
            onClick={() => setShowPresetMenu(!showPresetMenu)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-xs font-medium text-slate-200 transition"
          >
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden md:inline">Presets:</span>
            <span className="text-cyan-300 font-semibold max-w-[140px] truncate">
              {PRESET_SCENARIOS[0].badge}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {showPresetMenu && (
            <div className="absolute left-0 mt-1.5 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2 z-50">
              <div className="px-2 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Benchmark Tieback Scenarios
              </div>
              <div className="space-y-1 mt-1">
                {PRESET_SCENARIOS.map((scenario) => (
                  <button
                    key={scenario.id}
                    onClick={() => {
                      onLoadScenario(scenario);
                      setShowPresetMenu(false);
                    }}
                    className="w-full text-left p-2 rounded-lg hover:bg-slate-800 transition flex flex-col group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-200 group-hover:text-cyan-400">
                        {scenario.badge}
                      </span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                          scenario.badgeColor === 'emerald'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : scenario.badgeColor === 'rose'
                            ? 'bg-rose-950 text-rose-400 border border-rose-800'
                            : 'bg-sky-950 text-sky-400 border border-sky-800'
                        }`}
                      >
                        {scenario.id === 'scenario_puzzle_mitigated' ? 'Blueprint Rec.' : 'Case Study'}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                      {scenario.tagline}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Multi-Tenant Workspace Selector */}
        <div className="relative">
          <button
            onClick={() => setShowWorkspaceMenu(!showWorkspaceMenu)}
            className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-xs font-medium text-slate-200 transition"
          >
            <Building2 className="w-3.5 h-3.5 text-indigo-400" />
            <div className="text-left hidden lg:block">
              <span className="text-slate-300 font-semibold">{currentWorkspace.name}</span>
            </div>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                currentWorkspace.tier === 'ENTERPRISE'
                  ? 'bg-amber-950/80 text-amber-300 border border-amber-800'
                  : 'bg-indigo-950/80 text-indigo-300 border border-indigo-800'
              }`}
            >
              {currentWorkspace.tier}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {showWorkspaceMenu && (
            <div className="absolute right-0 mt-1.5 w-80 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2 z-50">
              <div className="px-2 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Select Tenant Workspace</span>
                <span className="text-[10px] text-slate-500 font-mono">Row-Level RLS</span>
              </div>
              <div className="space-y-1.5 mt-1">
                {workspaces.map((ws) => (
                  <button
                    key={ws.id}
                    onClick={() => {
                      onSelectWorkspace(ws);
                      setShowWorkspaceMenu(false);
                    }}
                    className={`w-full text-left p-2.5 rounded-lg border transition flex flex-col ${
                      currentWorkspace.id === ws.id
                        ? 'bg-slate-800 border-indigo-500/50 text-white'
                        : 'border-transparent hover:bg-slate-800/60 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold">{ws.name}</span>
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                          ws.tier === 'ENTERPRISE'
                            ? 'bg-amber-950 text-amber-300 border border-amber-800'
                            : 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                        }`}
                      >
                        {ws.tier}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1 text-[11px] text-slate-400 font-mono">
                      <span>Quota Balance:</span>
                      <span className={ws.trial_runs_left > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                        {ws.tier === 'ENTERPRISE' ? 'Unlimited HMAC' : `${ws.trial_runs_left} / ${ws.max_runs} runs`}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Quota Runs Remaining Pill */}
        <div className="hidden xl:flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-slate-950/70 border border-slate-800 text-[11px] font-mono">
          <span className="text-slate-400">Quota:</span>
          <span
            className={
              currentWorkspace.trial_runs_left > 3
                ? 'text-cyan-300 font-semibold'
                : 'text-amber-400 font-semibold'
            }
          >
            {currentWorkspace.tier === 'ENTERPRISE'
              ? 'HMAC Valid'
              : `${currentWorkspace.trial_runs_left} Runs Left`}
          </span>
        </div>
      </div>

      {/* Main Execution & Modal Triggers */}
      <div className="flex items-center space-x-2">
        {/* Reset Canvas Button */}
        <button
          onClick={onResetCanvas}
          title="Reset canvas components"
          className="p-2 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 text-slate-400 hover:text-slate-200 border border-slate-700 transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>

        {/* Serialized DAG JSON Viewer */}
        <button
          onClick={onOpenDagModal}
          className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-xs font-mono text-slate-300 hover:text-cyan-300 transition"
        >
          <Code2 className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline">DAG JSON</span>
        </button>

        {/* Test Suite Runner Button */}
        <button
          onClick={onOpenTestModal}
          className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-xs font-mono text-slate-300 hover:text-emerald-300 transition"
        >
          <FlaskConical className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden sm:inline">Tests</span>
        </button>

        {/* Database Schema & Models Button */}
        <button
          onClick={onOpenDbModal}
          className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-xs font-mono text-slate-300 hover:text-indigo-300 transition"
        >
          <Database className="w-3.5 h-3.5 text-indigo-400" />
          <span className="hidden sm:inline">DB Schema</span>
        </button>

        {/* Django Admin Portal Button */}
        <button
          onClick={onOpenDjangoAdminModal}
          className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-[#0c4b33]/80 hover:bg-[#0c4b33] border border-[#14533a] text-xs font-mono text-emerald-300 hover:text-white transition shadow-sm"
        >
          <span className="w-3.5 h-3.5 rounded bg-[#417690] text-white text-[9px] font-bold flex items-center justify-center font-mono">
            dj
          </span>
          <span className="hidden md:inline font-bold">Django Admin</span>
        </button>

        {/* GitHub & Deploy Modal */}
        <button
          onClick={onOpenGithubModal}
          className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-xs font-mono text-slate-300 hover:text-slate-100 transition"
        >
          <Github className="w-3.5 h-3.5 text-slate-200" />
          <span className="hidden md:inline">GitHub Repo</span>
        </button>

        {/* Export Report */}
        <button
          onClick={onExportReport}
          title="Export Flow Assurance Report (JSON/CSV)"
          className="p-2 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 text-slate-400 hover:text-slate-200 border border-slate-700 transition"
        >
          <Download className="w-3.5 h-3.5" />
        </button>

        {/* PRIMARY ACTION: Execute Beggs & Brill Simulation */}
        <button
          onClick={onRunSimulation}
          disabled={isSimulating || !isValidDag}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold shadow-lg transition ${
            !isValidDag
              ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60'
              : isSimulating
              ? 'bg-cyan-700 text-white animate-pulse'
              : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-cyan-950/60 hover:shadow-cyan-900/80 active:scale-[0.98]'
          }`}
        >
          {isSimulating ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-white" />
              <span>Solving 1D Cells...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-white text-white" />
              <span>Simulate Flow</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};
