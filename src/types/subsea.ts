/**
 * SubseaFlow CAD - Modular Flow Assurance Platform
 * Type Definitions for Puzzle Graph, Physics Engine, and Multi-Tenant Store
 */

export type NodeType =
  | 'wellhead'
  | 'pipeline_segment'
  | 'thermal_insulation'
  | 'chemical_injection'
  | 'pig_station'
  | 'topside_arrival';

export type PortType =
  | 'out:flange'
  | 'in:flange'
  | 'slot:insulation'
  | 'snap:jacket'
  | 'slot:chemical'
  | 'snap:injection';

export interface PortDefinition {
  id: string;
  type: PortType;
  label: string;
  direction: 'source' | 'target' | 'auxiliary';
  acceptedTypes: PortType[];
  isConnected?: boolean;
}

export interface WellheadParams {
  flow_rate_bpd: number;       // Liquid flow rate (barrels per day)
  inlet_temp_c: number;        // Wellhead fluid temperature (°C)
  inlet_pres_bar: number;      // Wellhead flowing pressure (bar)
  gor: number;                 // Gas-Oil Ratio (scf/bbl)
  water_cut: number;           // Water cut fraction (0.0 to 1.0)
  oil_api: number;             // Oil API gravity (°API, default 34)
  gas_sg: number;              // Gas specific gravity (air=1.0, default 0.68)
}

export interface PipeParams {
  length_m: number;            // Total segment length (meters)
  outer_dia_m: number;         // Outer diameter (meters, e.g. 0.273 m = 10.75")
  inner_dia_m: number;         // Inner diameter (meters, e.g. 0.254 m = 10")
  wall_thickness_m: number;    // Pipe steel wall thickness (m)
  bathymetric_angle_deg: number; // Inclination angle relative to horizontal (deg)
  roughness_m: number;         // Commercial steel absolute roughness (m)
  seabed_temp_c: number;       // Ambient deepwater seabed temperature (°C)
}

export type InsulationMaterial = 'polyurethane' | 'aerogel' | 'syntactic_foam' | 'multilayer_mli';

export interface InsulationParams {
  material: InsulationMaterial;
  thickness_mm: number;        // Insulation thickness (mm)
  thermal_k: number;           // Thermal conductivity k (W/m·K)
}

export type ChemicalInhibitor = 'monoethylene_glycol' | 'methanol' | 'ldhi';

export interface ChemicalParams {
  chemical: ChemicalInhibitor;
  rate_kg_h: number;           // Dosing mass rate (kg/h)
  concentration_wt: number;    // Inhibitor concentration in aqueous phase (wt%, 0-100)
}

export type PigType = 'disc_scraper' | 'foam_polly' | 'caliper_smart' | 'magnetic_flux';

export interface PigParams {
  pig_type: PigType;
  cycle_days: number;          // Pigging frequency interval (days)
  bypass_fraction: number;     // Fluid bypass fraction across pig body (0.0 - 0.2)
}

export interface TopsideParams {
  target_separator_p_bar: number; // 1st stage production separator operating pressure (bar)
  min_temp_c: number;             // Minimum contract arrival temperature (°C)
}

export interface SubseaAttachment {
  id: string;
  type: 'thermal_insulation' | 'chemical_injection';
  params: InsulationParams | ChemicalParams;
}

export interface NodePosition {
  x: number;
  y: number;
}

export interface SubseaNode {
  id: string;
  type: NodeType;
  name: string;
  position: NodePosition;
  ports: PortDefinition[];
  params: WellheadParams | PipeParams | InsulationParams | ChemicalParams | PigParams | TopsideParams;
  attachments?: SubseaAttachment[];
  parentSegmentId?: string; // For puzzle snap-ons
}

export interface SubseaEdge {
  id: string;
  sourceNodeId: string;
  sourcePortId: string;
  targetNodeId: string;
  targetPortId: string;
  connectionType: 'flange_pipe' | 'insulation_snap' | 'chemical_snap';
}

export interface ValidationError {
  id: string;
  nodeId?: string;
  severity: 'error' | 'warning' | 'info';
  title: string;
  message: string;
  actionableHint?: string;
  fixAction?: string;
}

export interface SimulationSpatialCell {
  cell_index: number;
  distance_m: number;          // Cumulative distance along tieback (m)
  distance_km: number;
  pressure_bar: number;        // Local hydraulic pressure (bar)
  pressure_drop_bar: number;   // Cumulative pressure drop (bar)
  temp_c: number;              // In-situ fluid bulk temperature (°C)
  ambient_temp_c: number;      // Ambient seabed temperature (°C)
  hydrate_equilibrium_temp_c: number; // Sloan hydrate equilibrium curve T_hyd (°C)
  hydrate_depressed_temp_c: number;   // Depressed hydrate curve with inhibitor T_hyd,dep (°C)
  hydrate_margin_c: number;    // Safety margin = T_fluid - T_hyd,dep (°C)
  is_hydrate_risk: boolean;    // True if margin <= 0 °C (Hydrate plug risk zone)
  liquid_holdup: number;       // Beggs & Brill H_L fraction (0.0 - 1.0)
  mixture_velocity_ms: number; // Fluid mixture velocity (m/s)
  flow_regime: 'Segregated' | 'Intermittent (Slug)' | 'Distributed' | 'Transition';
  wax_thickness_mm: number;    // Accumulated paraffin deposit thickness (mm)
  is_wax_risk: boolean;        // True if fluid temp < WAT (32°C)
  overall_u_w_m2k: number;     // Effective Overall Heat Transfer Coefficient U (W/m²·K)
}

export interface SimulationSummary {
  wellhead_pressure_bar: number;
  wellhead_temp_c: number;
  arrival_pressure_bar: number;
  arrival_temp_c: number;
  total_length_km: number;
  total_pressure_drop_bar: number;
  min_hydrate_margin_c: number;
  worst_hydrate_distance_km: number;
  is_hydrate_plug_predicted: boolean;
  max_wax_thickness_mm: number;
  slug_risk_detected: boolean;
  beggs_brill_regime_dominant: string;
  overall_insulation_effective_u: number;
  meg_depression_delta_t_c: number;
  arrival_temperature_status: 'SAFE' | 'CRITICAL_COLD' | 'MARGINAL';
}

export interface SimulationResult {
  simulation_id: string;
  timestamp: string;
  project_id: string;
  workspace_id: string;
  summary: SimulationSummary;
  spatial_profile: SimulationSpatialCell[];
  unmitigated_baseline: {
    arrival_temp_c: number;
    hydrate_plug_detected_at_km: number | null;
    min_margin_c: number;
    spatial_profile: SimulationSpatialCell[];
  };
  execution_time_ms: number;
  tenant_quota_remaining: number;
}

export interface WorkspaceTenant {
  id: string;
  name: string;
  tier: 'TRIAL' | 'PROFESSIONAL' | 'ENTERPRISE';
  trial_runs_left: number;
  max_runs: number;
  license_key_hmac: string;
  is_license_valid: boolean;
  created_at: string;
}

export interface CommercialLicenseRecord {
  id: string;
  organization_name: string;
  workspace_id?: string;
  tier: 'TRIAL' | 'PROFESSIONAL' | 'ENTERPRISE' | 'ACADEMIC';
  allowed_runs: number;
  license_key_hmac: string;
  features: string[];
  is_revoked: boolean;
  expires_at: string;
  issued_by: string;
  created_at: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'Lead Flow Assurance Engineer' | 'Subsea Systems Specialist' | 'Offshore Operations Admin';
  active_workspace_id: string;
  jwt_token_preview: string;
}

export interface SerializedDAGPayload {
  project_id: string;
  workspace_id: string;
  canvas_version: string;
  network_chain: Array<{
    node_id: string;
    type: string;
    params: Record<string, any>;
    attachments?: Array<{
      type: string;
      [key: string]: any;
    }>;
  }>;
}
