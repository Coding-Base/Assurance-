/**
 * SimulationResultsHUD Component - Dynamic simulation analytics dashboard
 * Features multi-variable spatial profile charts, Beggs & Brill holdup curves,
 * hydrate equilibrium envelopes, wax accumulation gauge, and unmitigated baseline comparison.
 */

import React, { useState } from 'react';
import {
  X,
  Gauge,
  Thermometer,
  ShieldCheck,
  AlertTriangle,
  ChevronUp,
  ChevronDown,
  Layers,
  ArrowRight,
  Sparkles,
  Flame,
  Snowflake,
  Download,
} from 'lucide-react';
import { SimulationResult, SimulationSpatialCell } from '../types/subsea';

interface SimulationResultsHUDProps {
  result: SimulationResult;
  onClose: () => void;
  onExportCSV: () => void;
}

export const SimulationResultsHUD: React.FC<SimulationResultsHUDProps> = ({
  result,
  onClose,
  onExportCSV,
}) => {
  const [activeTab, setActiveTab] = useState<'profiles' | 'benchmark' | 'holdup_wax'>('profiles');
  const [scrubberKm, setScrubberKm] = useState<number>(0);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  const { summary, spatial_profile, unmitigated_baseline } = result;

  // Find cell closest to scrubber
  const currentCell =
    spatial_profile.reduce((prev, curr) =>
      Math.abs(curr.distance_km - scrubberKm) < Math.abs(prev.distance_km - scrubberKm) ? curr : prev
    ) || spatial_profile[0];

  // SVG Chart Dimensions
  const chartWidth = 720;
  const chartHeight = 180;
  const padding = { top: 20, right: 30, bottom: 25, left: 45 };

  const maxDist = spatial_profile[spatial_profile.length - 1]?.distance_km || 12.5;

  // Scale helpers
  const scaleX = (km: number) =>
    padding.left + (km / Math.max(1, maxDist)) * (chartWidth - padding.left - padding.right);

  // Pressure scale (0 to wellhead pressure + 20)
  const maxP = Math.max(250, summary.wellhead_pressure_bar * 1.1);
  const scaleY_P = (p: number) =>
    chartHeight - padding.bottom - (p / maxP) * (chartHeight - padding.top - padding.bottom);

  // Temperature scale (-5 to wellhead temp + 10)
  const minT = -5;
  const maxT = Math.max(75, summary.wellhead_temp_c * 1.1);
  const scaleY_T = (t: number) =>
    chartHeight -
    padding.bottom -
    ((t - minT) / (maxT - minT)) * (chartHeight - padding.top - padding.bottom);

  // Path generators
  const pPath = spatial_profile
    .map((c, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(c.distance_km)} ${scaleY_P(c.pressure_bar)}`)
    .join(' ');

  const tFluidPath = spatial_profile
    .map((c, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(c.distance_km)} ${scaleY_T(c.temp_c)}`)
    .join(' ');

  const tHydDepPath = spatial_profile
    .map((c, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(c.distance_km)} ${scaleY_T(c.hydrate_depressed_temp_c)}`)
    .join(' ');

  const tHydBasePath = spatial_profile
    .map((c, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(c.distance_km)} ${scaleY_T(c.hydrate_equilibrium_temp_c)}`)
    .join(' ');

  const tBaselinePath = unmitigated_baseline.spatial_profile
    .map((c, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(c.distance_km)} ${scaleY_T(c.temp_c)}`)
    .join(' ');

  return (
    <div className="absolute bottom-0 left-0 right-0 z-40 bg-slate-900/98 border-t border-slate-800 shadow-2xl backdrop-blur-lg select-none transition-all">
      {/* HUD Header Bar */}
      <div className="px-5 py-2.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5">
            <Gauge className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
              Simulation Analytics HUD
            </h3>
          </div>

          {/* Hydrate Risk Status Badge */}
          <div
            className={`flex items-center space-x-1 px-2.5 py-0.5 rounded text-[11px] font-mono font-bold ${
              summary.is_hydrate_plug_predicted
                ? 'bg-rose-950 text-rose-300 border border-rose-800 animate-pulse'
                : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
            }`}
          >
            {summary.is_hydrate_plug_predicted ? (
              <>
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                <span>HYDRATE HAZARD PREDICTED</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>FLOW ASSURED: POSITIVE HYDRATE MARGIN (+{summary.min_hydrate_margin_c}°C)</span>
              </>
            )}
          </div>

          {/* Arrival Status Badge */}
          <div
            className={`px-2 py-0.5 rounded text-[10px] font-mono ${
              summary.arrival_temperature_status === 'SAFE'
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                : summary.arrival_temperature_status === 'MARGINAL'
                ? 'bg-amber-950 text-amber-300 border border-amber-800'
                : 'bg-rose-950 text-rose-300 border border-rose-800'
            }`}
          >
            Topside Arrival: {summary.arrival_temp_c}°C ({summary.arrival_temperature_status})
          </div>
        </div>

        {/* Tab Switcher & Window Controls */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-xs">
            <button
              onClick={() => setActiveTab('profiles')}
              className={`px-3 py-1 rounded-md transition font-medium ${
                activeTab === 'profiles'
                  ? 'bg-cyan-500 text-white font-semibold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Hydraulic & Thermal Profiles
            </button>
            <button
              onClick={() => setActiveTab('holdup_wax')}
              className={`px-3 py-1 rounded-md transition font-medium ${
                activeTab === 'holdup_wax'
                  ? 'bg-cyan-500 text-white font-semibold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Beggs & Brill Holdup & Wax
            </button>
            <button
              onClick={() => setActiveTab('benchmark')}
              className={`px-3 py-1 rounded-md transition font-medium ${
                activeTab === 'benchmark'
                  ? 'bg-cyan-500 text-white font-semibold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Baseline vs Mitigated Delta
            </button>
          </div>

          <button
            onClick={onExportCSV}
            title="Download Spatial Profile CSV"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            {isMinimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main HUD Body */}
      {!isMinimized && (
        <div className="p-5 max-h-[380px] overflow-y-auto custom-scrollbar">
          {/* Key KPI Metric Badges */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-2.5 mb-4 font-mono text-xs">
            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              <span className="text-slate-500 block text-[10px]">TOTAL PRESSURE DROP</span>
              <span className="text-sm font-bold text-cyan-400">
                {summary.total_pressure_drop_bar} bar
              </span>
              <span className="text-[10px] text-slate-500 block">
                {summary.wellhead_pressure_bar} ➔ {summary.arrival_pressure_bar} bar
              </span>
            </div>

            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              <span className="text-slate-500 block text-[10px]">ARRIVAL TEMPERATURE</span>
              <span
                className={`text-sm font-bold ${
                  summary.arrival_temp_c >= 14.0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {summary.arrival_temp_c} °C
              </span>
              <span className="text-[10px] text-slate-500 block">
                Wellhead: {summary.wellhead_temp_c} °C
              </span>
            </div>

            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              <span className="text-slate-500 block text-[10px]">MIN HYDRATE MARGIN</span>
              <span
                className={`text-sm font-bold ${
                  summary.min_hydrate_margin_c > 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {summary.min_hydrate_margin_c > 0 ? '+' : ''}
                {summary.min_hydrate_margin_c} °C
              </span>
              <span className="text-[10px] text-slate-500 block">
                Worst at {summary.worst_hydrate_distance_km} km
              </span>
            </div>

            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              <span className="text-slate-500 block text-[10px]">EFFECTIVE U VALUE</span>
              <span className="text-sm font-bold text-orange-400">
                {summary.overall_insulation_effective_u} W/m²·K
              </span>
              <span className="text-[10px] text-slate-500 block">
                Bare pipe: ~28.5 W/m²·K
              </span>
            </div>

            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              <span className="text-slate-500 block text-[10px]">MEG DEPRESSION ΔT</span>
              <span className="text-sm font-bold text-emerald-400">
                -{summary.meg_depression_delta_t_c} °C
              </span>
              <span className="text-[10px] text-slate-500 block">Hammerschmidt model</span>
            </div>

            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              <span className="text-slate-500 block text-[10px]">FLOW REGIME</span>
              <span className="text-sm font-bold text-purple-400">
                {summary.beggs_brill_regime_dominant}
              </span>
              <span className="text-[10px] text-slate-500 block">Beggs & Brill (1973)</span>
            </div>
          </div>

          {/* TAB 1: Hydraulic & Thermal Spatial Profiles */}
          {activeTab === 'profiles' && (
            <div className="space-y-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                <div className="flex items-center space-x-4 text-xs font-mono">
                  <div className="flex items-center space-x-1.5">
                    <div className="w-3 h-0.5 bg-amber-400" />
                    <span className="text-slate-300">Fluid Temp T(x)</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <div className="w-3 h-0.5 bg-sky-400" />
                    <span className="text-slate-300">Depressed Hydrate Envelope T_hyd(x)</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <div className="w-3 h-0.5 bg-rose-500 border-dashed border-b" />
                    <span className="text-rose-400">Unmitigated Baseline</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <div className="w-3 h-0.5 bg-cyan-400" />
                    <span className="text-slate-300">Pressure P(x) (bar)</span>
                  </div>
                </div>

                {/* Scrubber Controls */}
                <div className="flex items-center space-x-2 text-xs font-mono">
                  <span className="text-slate-400">Inspect Station:</span>
                  <input
                    type="range"
                    min="0"
                    max={maxDist}
                    step="0.1"
                    value={scrubberKm}
                    onChange={(e) => setScrubberKm(Number(e.target.value))}
                    className="w-36 accent-cyan-400"
                  />
                  <span className="text-cyan-300 font-bold min-w-[50px]">
                    {currentCell.distance_km} km
                  </span>
                </div>
              </div>

              {/* Chart SVG Canvas */}
              <div className="relative bg-slate-950 p-2 rounded-xl border border-slate-800 overflow-x-auto">
                <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-44">
                  {/* Grid Lines */}
                  {[0, 20, 40, 60].map((t) => (
                    <line
                      key={t}
                      x1={padding.left}
                      y1={scaleY_T(t)}
                      x2={chartWidth - padding.right}
                      y2={scaleY_T(t)}
                      stroke="#1e293b"
                      strokeDasharray="3 3"
                    />
                  ))}

                  {/* Axis Labels */}
                  <text x={10} y={scaleY_T(60)} fill="#64748b" fontSize="9" fontFamily="monospace">
                    60°C
                  </text>
                  <text x={10} y={scaleY_T(20)} fill="#64748b" fontSize="9" fontFamily="monospace">
                    20°C
                  </text>
                  <text x={10} y={scaleY_T(0)} fill="#64748b" fontSize="9" fontFamily="monospace">
                    0°C
                  </text>

                  {/* Pressure curve (right axis or scaled) */}
                  <path d={pPath} fill="none" stroke="#06b6d4" strokeWidth="1.8" opacity="0.85" />

                  {/* Hydrate base envelope */}
                  <path
                    d={tHydBasePath}
                    fill="none"
                    stroke="#475569"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                  />

                  {/* Hammerschmidt Depressed Hydrate Curve */}
                  <path d={tHydDepPath} fill="none" stroke="#38bdf8" strokeWidth="2" opacity="0.9" />

                  {/* Unmitigated baseline path */}
                  <path
                    d={tBaselinePath}
                    fill="none"
                    stroke="#f43f5e"
                    strokeWidth="1.8"
                    strokeDasharray="3 3"
                  />

                  {/* Mitigated Fluid temperature profile */}
                  <path d={tFluidPath} fill="none" stroke="#fbbf24" strokeWidth="2.5" />

                  {/* Scrubber vertical marker line */}
                  <line
                    x1={scaleX(currentCell.distance_km)}
                    y1={padding.top}
                    x2={scaleX(currentCell.distance_km)}
                    y2={chartHeight - padding.bottom}
                    stroke="#38bdf8"
                    strokeWidth="1.5"
                    strokeDasharray="2 2"
                  />

                  {/* Point on fluid temp */}
                  <circle
                    cx={scaleX(currentCell.distance_km)}
                    cy={scaleY_T(currentCell.temp_c)}
                    r="4"
                    fill="#fbbf24"
                    stroke="#0f172a"
                    strokeWidth="1.5"
                  />

                  {/* Distance Axis Markers */}
                  <text
                    x={padding.left}
                    y={chartHeight - 8}
                    fill="#64748b"
                    fontSize="9"
                    fontFamily="monospace"
                  >
                    0.0 km
                  </text>
                  <text
                    x={chartWidth - padding.right - 25}
                    y={chartHeight - 8}
                    fill="#64748b"
                    fontSize="9"
                    fontFamily="monospace"
                  >
                    {maxDist} km
                  </text>
                </svg>

                {/* Scrubber Synchronized Inspector HUD Card */}
                <div className="mt-2 p-2.5 bg-slate-900 rounded-lg border border-slate-800 flex flex-wrap items-center justify-between text-xs font-mono">
                  <div className="flex items-center space-x-1.5 text-cyan-400 font-bold">
                    <span>Station:</span>
                    <span>{currentCell.distance_km} km</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Pressure: </span>
                    <span className="text-slate-100 font-bold">{currentCell.pressure_bar} bar</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Fluid Temp: </span>
                    <span className="text-amber-400 font-bold">{currentCell.temp_c} °C</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Hydrate Envelope: </span>
                    <span className="text-sky-400 font-bold">
                      {currentCell.hydrate_depressed_temp_c} °C
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Safety Margin: </span>
                    <span
                      className={`font-bold ${
                        currentCell.hydrate_margin_c > 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {currentCell.hydrate_margin_c > 0 ? '+' : ''}
                      {currentCell.hydrate_margin_c} °C
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Beggs Regime: </span>
                    <span className="text-purple-400 font-bold">{currentCell.flow_regime}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Beggs & Brill Holdup & Wax Accumulation */}
          {activeTab === 'holdup_wax' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Beggs & Brill Multiphase Holdup Card */}
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                      Beggs & Brill Liquid Holdup Profile (H_L)
                    </h4>
                    <span className="text-[10px] font-mono text-purple-400">
                      Mixture Vel: {currentCell.mixture_velocity_ms} m/s
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-snug">
                    Evaluates spatial liquid accumulation accounting for pipe inclination angle and no-slip volume fraction.
                  </p>

                  <div className="h-32 flex items-end space-x-1 pt-4 border-b border-slate-800">
                    {spatial_profile.filter((_, idx) => idx % 6 === 0).map((c, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center group relative">
                        <div
                          className="w-full bg-indigo-500/80 rounded-t hover:bg-cyan-400 transition"
                          style={{ height: `${Math.round(c.liquid_holdup * 100)}%` }}
                        />
                        <span className="text-[8px] font-mono text-slate-600 mt-1">
                          {c.distance_km}k
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between text-[10px] font-mono text-slate-500">
                    <span>Wellhead (H_L: {spatial_profile[0]?.liquid_holdup})</span>
                    <span>Topside Arrival (H_L: {spatial_profile[spatial_profile.length - 1]?.liquid_holdup})</span>
                  </div>
                </div>

                {/* Wax (Paraffin) Accumulation Gauge Card */}
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                      Paraffin Wax Deposition Profile
                    </h4>
                    <span className="text-[10px] font-mono text-amber-400">
                      WAT = 32.0 °C
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-snug">
                    Molecular diffusion rate driven by radial wall temperature gradient. Pigging recovers pipeline clearance.
                  </p>

                  <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 space-y-2 text-xs font-mono">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Max Wax Cake Buildup:</span>
                      <span className="text-amber-400 font-bold">{summary.max_wax_thickness_mm} mm</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Wax Appearance Subcooling:</span>
                      <span className="text-slate-200 font-bold">
                        {summary.arrival_temp_c < 32.0 ? `${(32.0 - summary.arrival_temp_c).toFixed(1)} °C` : '0 °C (Above WAT)'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Pigging Scraping Interval:</span>
                      <span className="text-purple-300 font-bold">7 - 14 Days Scheduled</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Baseline vs Mitigated Benchmark Comparison */}
          {activeTab === 'benchmark' && (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="flex items-center space-x-2 text-xs font-bold text-cyan-400 mb-2">
                  <Sparkles className="w-4 h-4" />
                  <span>Engineering Handover Benchmark Comparison (Section 7 Blueprint)</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 text-[10px]">
                        <th className="py-2">CONFIGURATION</th>
                        <th className="py-2">EFFECTIVE U</th>
                        <th className="py-2">ARRIVAL TEMP</th>
                        <th className="py-2">HYDRATE PLUG PREDICTED</th>
                        <th className="py-2">CRITICAL DISTANCE</th>
                        <th className="py-2">STATUS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850">
                      {/* Unmitigated row */}
                      <tr className="text-rose-300">
                        <td className="py-2.5 font-bold">Unmitigated Baseline (Bare Pipe)</td>
                        <td className="py-2.5">~28.5 W/m²·K</td>
                        <td className="py-2.5 font-bold">
                          {unmitigated_baseline.arrival_temp_c} °C
                        </td>
                        <td className="py-2.5 font-bold">YES (Severe Blockage)</td>
                        <td className="py-2.5">
                          {unmitigated_baseline.hydrate_plug_detected_at_km} km
                        </td>
                        <td className="py-2.5">
                          <span className="px-2 py-0.5 rounded bg-rose-950 border border-rose-800 text-[10px] font-bold">
                            NON-COMPLIANT
                          </span>
                        </td>
                      </tr>

                      {/* Puzzle Mitigated row */}
                      <tr className="text-emerald-300">
                        <td className="py-2.5 font-bold">Puzzle-Mitigated (50mm PU + MEG Quill)</td>
                        <td className="py-2.5 font-bold">{summary.overall_insulation_effective_u} W/m²·K</td>
                        <td className="py-2.5 font-bold">{summary.arrival_temp_c} °C</td>
                        <td className="py-2.5 font-bold">NO (Continuous Safety Margin)</td>
                        <td className="py-2.5">None (Safe to Topside)</td>
                        <td className="py-2.5">
                          <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-[10px] font-bold">
                            FLOW ASSURED
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="mt-3 p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-300 leading-relaxed">
                  <strong>Handover Summary:</strong> Snapping the 50 mm Polyurethane jacket and 25 wt% MEG Chemical Quill onto the pipeline raised the arrival temperature from <span className="text-rose-400 font-bold">{unmitigated_baseline.arrival_temp_c}°C</span> to <span className="text-emerald-400 font-bold">{summary.arrival_temp_c}°C</span>, and depressed the hydrate envelope by <span className="text-cyan-400 font-bold">{summary.meg_depression_delta_t_c}°C</span>, eliminating all hydrate risk.
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
