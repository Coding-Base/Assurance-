/**
 * NodePropertiesDrawer Component - Slide-out Inspector Drawer for engineering parameters
 */

import React from 'react';
import {
  X,
  Sliders,
  CheckCircle,
  AlertTriangle,
  Layers,
  ShieldCheck,
  Droplet,
  Trash2,
  Plus,
} from 'lucide-react';
import {
  SubseaNode,
  WellheadParams,
  PipeParams,
  InsulationParams,
  ChemicalParams,
  PigParams,
  TopsideParams,
} from '../types/subsea';

interface NodePropertiesDrawerProps {
  selectedNode: SubseaNode | null;
  onClose: () => void;
  onUpdateParams: (nodeId: string, params: any) => void;
  onUpdateAttachments: (nodeId: string, attachments: any[]) => void;
  onDeleteNode: (nodeId: string) => void;
}

export const NodePropertiesDrawer: React.FC<NodePropertiesDrawerProps> = ({
  selectedNode,
  onClose,
  onUpdateParams,
  onUpdateAttachments,
  onDeleteNode,
}) => {
  if (!selectedNode) return null;

  const { id, type, name, params, attachments = [] } = selectedNode;

  const handleFieldChange = (key: string, value: any) => {
    onUpdateParams(id, {
      ...params,
      [key]: value,
    });
  };

  // Quick auxiliary snap-on helpers for pipeline segment
  const handleAddDefaultInsulation = () => {
    const newAtt = [
      ...attachments.filter((a) => a.type !== 'thermal_insulation'),
      {
        id: `att_ins_${Date.now()}`,
        type: 'thermal_insulation',
        params: {
          material: 'polyurethane',
          thickness_mm: 50.0,
          thermal_k: 0.038,
        },
      },
    ];
    onUpdateAttachments(id, newAtt);
  };

  const handleAddDefaultChemical = () => {
    const newAtt = [
      ...attachments.filter((a) => a.type !== 'chemical_injection'),
      {
        id: `att_chem_${Date.now()}`,
        type: 'chemical_injection',
        params: {
          chemical: 'monoethylene_glycol',
          rate_kg_h: 450.0,
          concentration_wt: 25.0,
        },
      },
    ];
    onUpdateAttachments(id, newAtt);
  };

  const handleRemoveAttachment = (attId: string) => {
    onUpdateAttachments(
      id,
      attachments.filter((a) => a.id !== attId)
    );
  };

  return (
    <aside className="w-80 bg-slate-900/98 border-l border-slate-800 flex flex-col h-full z-30 select-none shadow-2xl backdrop-blur-md">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Sliders className="w-4 h-4 text-cyan-400" />
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Inspector Drawer
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">{name}</span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body with Configurable Fields */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar text-xs">
        {/* SUBSEA WELLHEAD FORM */}
        {type === 'wellhead' && (
          <div className="space-y-3">
            <div className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">
              Wellhead Hydraulic Boundary
            </div>

            <div>
              <label className="text-[11px] text-slate-400 flex justify-between">
                <span>Production Flow Rate (bpd)</span>
                <span className="font-mono text-cyan-300">
                  {(params as WellheadParams).flow_rate_bpd.toLocaleString()}
                </span>
              </label>
              <input
                type="range"
                min="2000"
                max="50000"
                step="500"
                value={(params as WellheadParams).flow_rate_bpd}
                onChange={(e) => handleFieldChange('flow_rate_bpd', Number(e.target.value))}
                className="w-full mt-1 accent-cyan-500"
              />
            </div>

            <div>
              <label className="text-[11px] text-slate-400 flex justify-between">
                <span>Inlet Temperature (°C)</span>
                <span className="font-mono text-amber-400">
                  {(params as WellheadParams).inlet_temp_c}°C
                </span>
              </label>
              <input
                type="range"
                min="20"
                max="120"
                step="1"
                value={(params as WellheadParams).inlet_temp_c}
                onChange={(e) => handleFieldChange('inlet_temp_c', Number(e.target.value))}
                className="w-full mt-1 accent-amber-500"
              />
            </div>

            <div>
              <label className="text-[11px] text-slate-400 flex justify-between">
                <span>Wellhead Pressure (bar)</span>
                <span className="font-mono text-cyan-300">
                  {(params as WellheadParams).inlet_pres_bar} bar
                </span>
              </label>
              <input
                type="range"
                min="50"
                max="400"
                step="5"
                value={(params as WellheadParams).inlet_pres_bar}
                onChange={(e) => handleFieldChange('inlet_pres_bar', Number(e.target.value))}
                className="w-full mt-1 accent-cyan-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <label className="text-[10px] text-slate-400">GOR (scf/bbl)</label>
                <input
                  type="number"
                  value={(params as WellheadParams).gor}
                  onChange={(e) => handleFieldChange('gor', Number(e.target.value))}
                  className="w-full mt-1 px-2 py-1 bg-slate-950 border border-slate-700 rounded font-mono text-xs text-slate-200"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400">Water Cut (0-1)</label>
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.05"
                  value={(params as WellheadParams).water_cut}
                  onChange={(e) => handleFieldChange('water_cut', Number(e.target.value))}
                  className="w-full mt-1 px-2 py-1 bg-slate-950 border border-slate-700 rounded font-mono text-xs text-slate-200"
                />
              </div>
            </div>
          </div>
        )}

        {/* PIPELINE SEGMENT FORM */}
        {type === 'pipeline_segment' && (
          <div className="space-y-3.5">
            <div className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider">
              Flowline Geometry & Ambient
            </div>

            <div>
              <label className="text-[11px] text-slate-400 flex justify-between">
                <span>Step-Out Length (meters)</span>
                <span className="font-mono text-cyan-300">
                  {((params as PipeParams).length_m / 1000).toFixed(1)} km
                </span>
              </label>
              <input
                type="range"
                min="1000"
                max="40000"
                step="500"
                value={(params as PipeParams).length_m}
                onChange={(e) => handleFieldChange('length_m', Number(e.target.value))}
                className="w-full mt-1 accent-cyan-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-400">Inner Dia (m)</label>
                <input
                  type="number"
                  step="0.01"
                  value={(params as PipeParams).inner_dia_m}
                  onChange={(e) => handleFieldChange('inner_dia_m', Number(e.target.value))}
                  className="w-full mt-1 px-2 py-1 bg-slate-950 border border-slate-700 rounded font-mono text-xs text-slate-200"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400">Outer Dia (m)</label>
                <input
                  type="number"
                  step="0.01"
                  value={(params as PipeParams).outer_dia_m}
                  onChange={(e) => handleFieldChange('outer_dia_m', Number(e.target.value))}
                  className="w-full mt-1 px-2 py-1 bg-slate-950 border border-slate-700 rounded font-mono text-xs text-slate-200"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-400">Bathymetry Angle (°)</label>
                <input
                  type="number"
                  step="0.1"
                  value={(params as PipeParams).bathymetric_angle_deg}
                  onChange={(e) => handleFieldChange('bathymetric_angle_deg', Number(e.target.value))}
                  className="w-full mt-1 px-2 py-1 bg-slate-950 border border-slate-700 rounded font-mono text-xs text-slate-200"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400">Seabed Temp (°C)</label>
                <input
                  type="number"
                  step="0.5"
                  value={(params as PipeParams).seabed_temp_c}
                  onChange={(e) => handleFieldChange('seabed_temp_c', Number(e.target.value))}
                  className="w-full mt-1 px-2 py-1 bg-slate-950 border border-slate-700 rounded font-mono text-xs text-slate-200"
                />
              </div>
            </div>

            {/* Auxiliary Snap-On Layers Management */}
            <div className="pt-3 border-t border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-300 uppercase">
                  Snap-On Auxiliary Layers
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  {attachments.length} Snapped
                </span>
              </div>

              {/* Insulation Attachment Item */}
              {attachments.find((a) => a.type === 'thermal_insulation') ? (
                <div className="p-2.5 rounded-lg bg-orange-950/40 border border-orange-500/50 flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-1.5 text-xs font-bold text-orange-300">
                      <ShieldCheck className="w-3.5 h-3.5 text-orange-400" />
                      <span>Thermal Insulation Sleeve</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {(attachments.find((a) => a.type === 'thermal_insulation')?.params as InsulationParams).thickness_mm} mm{' '}
                      {(attachments.find((a) => a.type === 'thermal_insulation')?.params as InsulationParams).material}
                    </span>
                  </div>
                  <button
                    onClick={() =>
                      handleRemoveAttachment(
                        attachments.find((a) => a.type === 'thermal_insulation')!.id
                      )
                    }
                    className="p-1 text-slate-400 hover:text-rose-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleAddDefaultInsulation}
                  className="w-full py-1.5 px-2 rounded border border-dashed border-orange-500/40 text-orange-400 hover:bg-orange-950/30 text-[11px] flex items-center justify-center gap-1 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Snap 50mm Polyurethane Sleeve</span>
                </button>
              )}

              {/* Chemical Attachment Item */}
              {attachments.find((a) => a.type === 'chemical_injection') ? (
                <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/50 flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-1.5 text-xs font-bold text-emerald-300">
                      <Droplet className="w-3.5 h-3.5 text-emerald-400" />
                      <span>MEG Injection Quill</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {(attachments.find((a) => a.type === 'chemical_injection')?.params as ChemicalParams).rate_kg_h} kg/h @{' '}
                      {(attachments.find((a) => a.type === 'chemical_injection')?.params as ChemicalParams).concentration_wt} wt%
                    </span>
                  </div>
                  <button
                    onClick={() =>
                      handleRemoveAttachment(
                        attachments.find((a) => a.type === 'chemical_injection')!.id
                      )
                    }
                    className="p-1 text-slate-400 hover:text-rose-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleAddDefaultChemical}
                  className="w-full py-1.5 px-2 rounded border border-dashed border-emerald-500/40 text-emerald-400 hover:bg-emerald-950/30 text-[11px] flex items-center justify-center gap-1 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Snap 25 wt% MEG Injection Quill</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* THERMAL INSULATION SLEEVE FORM */}
        {type === 'thermal_insulation' && (
          <div className="space-y-3">
            <div className="text-[11px] font-semibold text-orange-400 uppercase tracking-wider">
              Insulation Jacket Properties
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Material Specification</label>
              <select
                value={(params as InsulationParams).material}
                onChange={(e) => {
                  const mat = e.target.value as any;
                  const kVal = mat === 'aerogel' ? 0.02 : mat === 'syntactic_foam' ? 0.12 : 0.038;
                  onUpdateParams(id, {
                    ...params,
                    material: mat,
                    thermal_k: kVal,
                  });
                }}
                className="w-full px-2 py-1.5 bg-slate-950 border border-slate-700 rounded text-xs text-slate-200"
              >
                <option value="polyurethane">Polyurethane (k = 0.038 W/m·K)</option>
                <option value="aerogel">Aerogel Superinsulation (k = 0.020 W/m·K)</option>
                <option value="syntactic_foam">Syntactic Foam (k = 0.120 W/m·K)</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 flex justify-between">
                <span>Thickness (mm)</span>
                <span className="font-mono text-orange-400">
                  {(params as InsulationParams).thickness_mm} mm
                </span>
              </label>
              <input
                type="range"
                min="10"
                max="100"
                step="5"
                value={(params as InsulationParams).thickness_mm}
                onChange={(e) => handleFieldChange('thickness_mm', Number(e.target.value))}
                className="w-full mt-1 accent-orange-500"
              />
            </div>
          </div>
        )}

        {/* CHEMICAL INJECTION FORM */}
        {type === 'chemical_injection' && (
          <div className="space-y-3">
            <div className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">
              Chemical Inhibitor Dosing
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Inhibitor Chemical</label>
              <select
                value={(params as ChemicalParams).chemical}
                onChange={(e) => handleFieldChange('chemical', e.target.value)}
                className="w-full px-2 py-1.5 bg-slate-950 border border-slate-700 rounded text-xs text-slate-200"
              >
                <option value="monoethylene_glycol">Monoethylene Glycol (MEG)</option>
                <option value="methanol">Methanol (MeOH)</option>
                <option value="ldhi">Low Dosage Hydrate Inhibitor (LDHI)</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 flex justify-between">
                <span>Injection Mass Rate (kg/h)</span>
                <span className="font-mono text-emerald-400">
                  {(params as ChemicalParams).rate_kg_h} kg/h
                </span>
              </label>
              <input
                type="range"
                min="50"
                max="1500"
                step="25"
                value={(params as ChemicalParams).rate_kg_h}
                onChange={(e) => handleFieldChange('rate_kg_h', Number(e.target.value))}
                className="w-full mt-1 accent-emerald-500"
              />
            </div>

            <div>
              <label className="text-[11px] text-slate-400 flex justify-between">
                <span>Concentration (wt%)</span>
                <span className="font-mono text-emerald-400">
                  {(params as ChemicalParams).concentration_wt} wt%
                </span>
              </label>
              <input
                type="range"
                min="5"
                max="80"
                step="1"
                value={(params as ChemicalParams).concentration_wt}
                onChange={(e) => handleFieldChange('concentration_wt', Number(e.target.value))}
                className="w-full mt-1 accent-emerald-500"
              />
            </div>
          </div>
        )}

        {/* PIG STATION FORM */}
        {type === 'pig_station' && (
          <div className="space-y-3">
            <div className="text-[11px] font-semibold text-purple-400 uppercase tracking-wider">
              Pigging & Scraper Parameters
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Pig Type</label>
              <select
                value={(params as PigParams).pig_type}
                onChange={(e) => handleFieldChange('pig_type', e.target.value)}
                className="w-full px-2 py-1.5 bg-slate-950 border border-slate-700 rounded text-xs text-slate-200"
              >
                <option value="disc_scraper">Disc Scraper (Wax Removal)</option>
                <option value="foam_polly">Foam Polly Pig</option>
                <option value="caliper_smart">Smart Intelligent Caliper Tool</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 flex justify-between">
                <span>Pigging Cycle (days)</span>
                <span className="font-mono text-purple-400">
                  {(params as PigParams).cycle_days} Days
                </span>
              </label>
              <input
                type="range"
                min="1"
                max="30"
                step="1"
                value={(params as PigParams).cycle_days}
                onChange={(e) => handleFieldChange('cycle_days', Number(e.target.value))}
                className="w-full mt-1 accent-purple-500"
              />
            </div>
          </div>
        )}

        {/* TOPSIDE ARRIVAL FORM */}
        {type === 'topside_arrival' && (
          <div className="space-y-3">
            <div className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider">
              Platform Separator Train Boundary
            </div>

            <div>
              <label className="text-[11px] text-slate-400 flex justify-between">
                <span>Separator Pressure (bar)</span>
                <span className="font-mono text-blue-400">
                  {(params as TopsideParams).target_separator_p_bar} bar
                </span>
              </label>
              <input
                type="range"
                min="10"
                max="75"
                step="1"
                value={(params as TopsideParams).target_separator_p_bar}
                onChange={(e) => handleFieldChange('target_separator_p_bar', Number(e.target.value))}
                className="w-full mt-1 accent-blue-500"
              />
            </div>

            <div>
              <label className="text-[11px] text-slate-400 flex justify-between">
                <span>Contract Minimum Arrival Temp (°C)</span>
                <span className="font-mono text-blue-400">
                  {(params as TopsideParams).min_temp_c}°C
                </span>
              </label>
              <input
                type="range"
                min="5"
                max="30"
                step="1"
                value={(params as TopsideParams).min_temp_c}
                onChange={(e) => handleFieldChange('min_temp_c', Number(e.target.value))}
                className="w-full mt-1 accent-blue-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Footer Delete Action */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
        <button
          onClick={() => onDeleteNode(id)}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs text-rose-400 hover:bg-rose-950/50 border border-rose-900/60 transition"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Delete Component</span>
        </button>

        <button
          onClick={onClose}
          className="px-3 py-1.5 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
        >
          Done
        </button>
      </div>
    </aside>
  );
};
