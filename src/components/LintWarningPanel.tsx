/**
 * LintWarningPanel Component - Real-time Pre-Flight Topological Linting HUD
 */

import React from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ShieldCheck,
  Droplet,
  Info,
} from 'lucide-react';
import { ValidationReport } from '../engine/dagLinter';

interface LintWarningPanelProps {
  report: ValidationReport;
  onApplyFix: (action: string, nodeId?: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const LintWarningPanel: React.FC<LintWarningPanelProps> = ({
  report,
  onApplyFix,
  isCollapsed,
  onToggleCollapse,
}) => {
  const { isValid, errors, warnings, infos } = report;

  return (
    <div className="absolute top-3 right-4 z-20 w-80 max-w-[calc(100vw-32px)] select-none">
      <div className="bg-slate-900/95 border border-slate-800 rounded-xl shadow-2xl backdrop-blur-md overflow-hidden transition-all">
        {/* Header Bar */}
        <div
          onClick={onToggleCollapse}
          className="p-3 flex items-center justify-between cursor-pointer hover:bg-slate-850 transition"
        >
          <div className="flex items-center space-x-2">
            {isValid ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 animate-pulse" />
            )}
            <div>
              <h4 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                <span>Topological Linter</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold ${
                    isValid
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      : 'bg-rose-950 text-rose-400 border border-rose-800'
                  }`}
                >
                  {isValid ? 'DAG VALID' : `${errors.length} ERROR${errors.length > 1 ? 'S' : ''}`}
                </span>
              </h4>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {warnings.length > 0 && (
              <span className="text-[10px] font-mono bg-amber-950 text-amber-400 px-1.5 py-0.5 rounded border border-amber-800">
                {warnings.length} WARN
              </span>
            )}
            <button className="text-slate-400 hover:text-white">
              {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Expandable Details List */}
        {!isCollapsed && (
          <div className="p-3 pt-0 max-h-72 overflow-y-auto space-y-2 border-t border-slate-800/80 custom-scrollbar text-xs">
            {/* Blocking Errors */}
            {errors.map((err) => (
              <div
                key={err.id}
                className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-500/50 space-y-1 text-slate-200"
              >
                <div className="flex items-center space-x-1.5 text-rose-300 font-bold text-xs">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                  <span>{err.title}</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-tight">{err.message}</p>
                {err.actionableHint && (
                  <div className="text-[10px] text-rose-400/90 font-mono mt-1">
                    Fix: {err.actionableHint}
                  </div>
                )}
              </div>
            ))}

            {/* Warnings (Yellow Linters) with 1-click Auto-Fix */}
            {warnings.map((warn) => (
              <div
                key={warn.id}
                className="p-2.5 rounded-lg bg-amber-950/30 border border-amber-500/40 space-y-1.5 text-slate-200"
              >
                <div className="flex items-center space-x-1.5 text-amber-300 font-bold text-xs">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                  <span>{warn.title}</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-tight">{warn.message}</p>

                {warn.fixAction && (
                  <button
                    onClick={() => onApplyFix(warn.fixAction!, warn.nodeId)}
                    className="mt-1 w-full flex items-center justify-center space-x-1 py-1 px-2 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[10px] font-semibold transition"
                  >
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>
                      {warn.fixAction === 'snap_insulation'
                        ? 'Auto-Snap 50mm PU Jacket'
                        : 'Auto-Snap 25 wt% MEG Quill'}
                    </span>
                  </button>
                )}
              </div>
            ))}

            {/* Valid DAG Message */}
            {isValid && warnings.length === 0 && (
              <div className="p-2 rounded-lg bg-emerald-950/30 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>
                  Hydraulic continuity confirmed from Wellhead to Topside. Ready to run Beggs & Brill physics engine.
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
