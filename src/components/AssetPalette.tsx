/**
 * AssetPalette Component - Draggable engineering equipment library with puzzle socket indicators
 */

import React from 'react';
import {
  CircleDot,
  GitCommit,
  ShieldAlert,
  Droplet,
  Compass,
  Building,
  HelpCircle,
  Plus,
  Info,
} from 'lucide-react';
import { NodeType } from '../types/subsea';

export interface PaletteItem {
  type: NodeType;
  name: string;
  category: 'Source' | 'Hydraulic' | 'Auxiliary' | 'Sink';
  icon: React.ElementType;
  color: string;
  borderClass: string;
  bgClass: string;
  tagline: string;
  portsDescription: string;
  ruleConstraint: string;
}

export const PALETTE_ITEMS: PaletteItem[] = [
  {
    type: 'wellhead',
    name: 'Subsea Wellhead',
    category: 'Source',
    icon: CircleDot,
    color: 'text-amber-400',
    borderClass: 'border-amber-500/40 hover:border-amber-400',
    bgClass: 'bg-amber-950/20 hover:bg-amber-950/40',
    tagline: 'Christmas Tree Source Manifold',
    portsDescription: 'out:flange (API 10K / 15K)',
    ruleConstraint: 'Root node only; no upstream inlet allowed.',
  },
  {
    type: 'pipeline_segment',
    name: 'Pipeline Segment',
    category: 'Hydraulic',
    icon: GitCommit,
    color: 'text-cyan-400',
    borderClass: 'border-cyan-500/40 hover:border-cyan-400',
    bgClass: 'bg-cyan-950/20 hover:bg-cyan-950/40',
    tagline: 'Subsea Flowline Carrier Pipe',
    portsDescription: 'in:flange, out:flange, slot:insulation, slot:chemical',
    ruleConstraint: 'Main flow conduit; accepts snap-on jackets & quills.',
  },
  {
    type: 'thermal_insulation',
    name: 'Thermal Insulation Sleeve',
    category: 'Auxiliary',
    icon: ShieldAlert,
    color: 'text-orange-400',
    borderClass: 'border-orange-500/40 hover:border-orange-400',
    bgClass: 'bg-orange-950/20 hover:bg-orange-950/40',
    tagline: 'PU / Aerogel Jacket Layer',
    portsDescription: 'snap:jacket (Auxiliary)',
    ruleConstraint: 'Snaps directly into Pipeline Segment jacket slot.',
  },
  {
    type: 'chemical_injection',
    name: 'Chemical Injection Quill',
    category: 'Auxiliary',
    icon: Droplet,
    color: 'text-emerald-400',
    borderClass: 'border-emerald-500/40 hover:border-emerald-400',
    bgClass: 'bg-emerald-950/20 hover:bg-emerald-950/40',
    tagline: 'MEG / MeOH / LDHI Dosing',
    portsDescription: 'snap:injection (Auxiliary)',
    ruleConstraint: 'Snaps to Pipeline Segment inlet quill port.',
  },
  {
    type: 'pig_station',
    name: 'Pig Launcher / Trap',
    category: 'Hydraulic',
    icon: Compass,
    color: 'text-purple-400',
    borderClass: 'border-purple-500/40 hover:border-purple-400',
    bgClass: 'bg-purple-950/20 hover:bg-purple-950/40',
    tagline: 'Inline Scraper & Inspection',
    portsDescription: 'in:flange, out:flange',
    ruleConstraint: 'Must sit inline between segment boundaries.',
  },
  {
    type: 'topside_arrival',
    name: 'Topside / Riser Arrival',
    category: 'Sink',
    icon: Building,
    color: 'text-blue-400',
    borderClass: 'border-blue-500/40 hover:border-blue-400',
    bgClass: 'bg-blue-950/20 hover:bg-blue-950/40',
    tagline: '1st Stage Separator Train',
    portsDescription: 'in:flange (Sink)',
    ruleConstraint: 'Sink node; terminates the hydraulic stream.',
  },
];

interface AssetPaletteProps {
  onAddNode: (type: NodeType) => void;
}

export const AssetPalette: React.FC<AssetPaletteProps> = ({ onAddNode }) => {
  const handleDragStart = (e: React.DragEvent, type: NodeType) => {
    e.dataTransfer.setData('application/subsea-node-type', type);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <aside className="w-72 bg-slate-900/95 border-r border-slate-800 flex flex-col h-full z-20 select-none shadow-xl">
      {/* Header */}
      <div className="p-3.5 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold tracking-wider uppercase text-slate-300 flex items-center gap-1.5">
            <span>Component Palette</span>
          </h2>
          <span className="text-[10px] font-mono bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">
            Puzzle Blocks
          </span>
        </div>
        <p className="text-[11px] text-slate-400 mt-1 leading-snug">
          Drag puzzle blocks onto the CAD canvas or click <kbd className="font-mono text-cyan-400">+</kbd> to add.
        </p>
      </div>

      {/* Item List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar">
        {PALETTE_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.type}
              draggable
              onDragStart={(e) => handleDragStart(e, item.type)}
              className={`group relative rounded-xl border p-3 cursor-grab active:cursor-grabbing transition shadow-sm ${item.bgClass} ${item.borderClass}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className={`p-2 rounded-lg bg-slate-900 border border-slate-800 ${item.color} shadow-inner`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-100 group-hover:text-white flex items-center gap-1.5">
                      <span>{item.name}</span>
                    </h3>
                    <span className="text-[10px] text-slate-400 font-mono block leading-tight">
                      {item.tagline}
                    </span>
                  </div>
                </div>

                {/* Quick Add Button */}
                <button
                  onClick={() => onAddNode(item.type)}
                  title={`Add ${item.name} to canvas`}
                  className="p-1 rounded-md bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-cyan-300 border border-slate-700 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Socket Ports Indicator */}
              <div className="mt-2.5 pt-2 border-t border-slate-800/70 flex flex-col gap-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-400 font-medium">Sockets:</span>
                  <span className="font-mono text-cyan-300/90 text-[10px] truncate max-w-[170px]">
                    {item.portsDescription}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 leading-tight italic">
                  {item.ruleConstraint}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Socket Rules Footer Guide */}
      <div className="p-3 bg-slate-950/70 border-t border-slate-800 text-[11px] text-slate-400 space-y-1">
        <div className="flex items-center gap-1 text-slate-300 font-semibold text-[11px]">
          <Info className="w-3.5 h-3.5 text-cyan-400" />
          <span>Magnetic Puzzle Rules</span>
        </div>
        <div className="text-[10px] text-slate-400 space-y-0.5 font-mono">
          <div>• <span className="text-cyan-300">out:flange</span> ➔ <span className="text-cyan-300">in:flange</span></div>
          <div>• <span className="text-orange-300">slot:insulation</span> ➔ <span className="text-orange-300">snap:jacket</span></div>
          <div>• <span className="text-emerald-300">slot:chemical</span> ➔ <span className="text-emerald-300">snap:injection</span></div>
        </div>
      </div>
    </aside>
  );
};
