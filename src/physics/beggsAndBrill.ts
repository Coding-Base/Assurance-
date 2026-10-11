/**
 * Beggs & Brill (1973) Multiphase Flow & Subsea Heat Transfer Physics Engine
 * Implements rigorous two-phase pressure drop, overall heat transfer coefficient U,
 * Hammerschmidt thermodynamic hydrate depression, and wax deposition kinetics.
 */

import {
  PipeParams,
  WellheadParams,
  InsulationParams,
  ChemicalParams,
  PigParams,
  SimulationSpatialCell,
  SimulationSummary,
} from '../types/subsea';

export interface PhysicsInput {
  wellhead: WellheadParams;
  pipe: PipeParams;
  insulation?: InsulationParams;
  chemical?: ChemicalParams;
  pig?: PigParams;
  deltaX_m?: number;
}

export interface BeggsBrillCellResult {
  pressure_bar: number;
  dP_bar: number;
  liquid_holdup: number;
  flow_regime: 'Segregated' | 'Intermittent (Slug)' | 'Distributed' | 'Transition';
  mixture_velocity: number;
}

/**
 * Calculates Beggs and Brill multiphase hydraulic parameters for a single spatial cell
 */
export function calculateBeggsAndBrillCell(
  currentP_bar: number,
  liquidFlow_m3_s: number,
  gor_sm3_sm3: number,
  waterCut: number,
  dia_m: number,
  angle_rad: number,
  roughness_m: number,
  cellLength_m: number,
  temp_c: number
): BeggsBrillCellResult {
  const g = 9.80665;
  const area = (Math.PI * Math.pow(dia_m, 2)) / 4;

  // Fluid densities (pressure and temperature dependent estimates)
  const p_pa = currentP_bar * 1e5;
  const temp_k = temp_c + 273.15;

  // Gas density from real gas law (Z ~ 0.85 - 0.90 for high pressure natural gas)
  const z_factor = Math.max(0.75, Math.min(1.0, 1.0 - 0.0012 * currentP_bar + 0.0003 * temp_c));
  const r_gas = 287.058 / 0.68; // specific gas constant for SG=0.68
  const rho_g = Math.max(1.2, p_pa / (z_factor * r_gas * temp_k));

  // Liquid density: weighted blend of oil (~850 kg/m3) and produced water (~1025 kg/m3)
  const rho_oil = 850;
  const rho_water = 1025;
  const rho_l = (1 - waterCut) * rho_oil + waterCut * rho_water;

  // Viscosities (Pa.s)
  const mu_l = (1 - waterCut) * 0.0035 + waterCut * 0.0009; // ~3.5 cP oil, 0.9 cP water
  const mu_g = 0.000015; // ~0.015 cP gas

  // Gas flow rate at local in-situ conditions
  // gor_sm3_sm3: standard m3 gas / standard m3 liquid
  const standard_p = 101325;
  const standard_t = 288.15;
  const gasStandardRate_m3_s = liquidFlow_m3_s * gor_sm3_sm3;
  const b_g = (standard_p / p_pa) * (temp_k / standard_t) * z_factor;
  const gasInSituRate_m3_s = Math.max(0.0001, gasStandardRate_m3_s * b_g);

  // Superficial velocities
  const v_sl = liquidFlow_m3_s / area;
  const v_sg = gasInSituRate_m3_s / area;
  const v_m = v_sl + v_sg;

  // No-slip liquid holdup (lambda_l)
  const lambda_l = Math.max(0.0001, Math.min(0.9999, v_sl / Math.max(0.0001, v_m)));

  // Beggs & Brill Froude number
  const n_fr = Math.pow(v_m, 2) / (g * dia_m);

  // Flow pattern boundary variables
  const l1 = 316 * Math.pow(lambda_l, 0.302);
  const l2 = 0.0009252 * Math.pow(lambda_l, -2.4684);
  const l3 = 0.10 * Math.pow(lambda_l, -1.4516);
  const l4 = 0.5 * Math.pow(lambda_l, -6.738);

  let regime: 'Segregated' | 'Intermittent (Slug)' | 'Distributed' | 'Transition' = 'Segregated';
  let a = 0.98;
  let b = 0.4846;
  let c = 0.0868;

  if ((lambda_l < 0.01 && n_fr < l1) || (lambda_l >= 0.01 && n_fr < l1)) {
    regime = 'Segregated';
    a = 0.98;
    b = 0.4846;
    c = 0.0868;
  } else if (lambda_l >= 0.01 && n_fr >= l1 && n_fr <= l2) {
    regime = 'Transition';
    // Interpolation handled below
  } else if (
    (lambda_l >= 0.01 && lambda_l < 0.4 && n_fr > l3 && n_fr <= l1) ||
    (lambda_l >= 0.4 && n_fr > l3 && n_fr <= l4)
  ) {
    regime = 'Intermittent (Slug)';
    a = 0.845;
    b = 0.5351;
    c = 0.0173;
  } else if ((lambda_l < 0.4 && n_fr >= l1) || (lambda_l >= 0.4 && n_fr > l4)) {
    regime = 'Distributed';
    a = 1.065;
    b = 0.5824;
    c = 0.0609;
  } else {
    regime = 'Intermittent (Slug)';
    a = 0.845;
    b = 0.5351;
    c = 0.0173;
  }

  // Horizontal holdup H_L(0)
  let hl_0 = (a * Math.pow(lambda_l, b)) / Math.pow(Math.max(0.0001, n_fr), c);
  hl_0 = Math.max(lambda_l, Math.min(1.0, hl_0));

  // Inclination correction factor C & psi
  let c_param = 0;
  if (angle_rad >= 0) {
    // Upward inclination (e.g. subsea tieback rising to platform or undulating)
    const d = 0.011;
    const e = -3.768;
    const f = 3.539;
    const g_exp = -1.614;
    const n_lv = 1.938 * v_sl * Math.pow(rho_l / 0.03, 0.25); // surface tension ~0.03 N/m
    c_param = (1 - lambda_l) * Math.log(Math.max(1e-4, d * Math.pow(lambda_l, e) * Math.pow(n_lv, f) * Math.pow(n_fr, g_exp)));
    c_param = Math.max(0, c_param);
  } else {
    // Downward inclination
    c_param = (1 - lambda_l) * Math.log(Math.max(1e-4, 4.7 * Math.pow(lambda_l, -0.3692) * Math.pow(n_fr, 0.1244)));
  }

  const sin_term = Math.sin(1.8 * angle_rad) - 0.333 * Math.pow(Math.sin(1.8 * angle_rad), 3);
  const psi = 1 + c_param * sin_term;
  let hl_theta = Math.max(lambda_l, Math.min(1.0, hl_0 * Math.max(0.5, psi)));

  // For transition flow, blend between segregated and intermittent
  if (regime === 'Transition') {
    const hl_seg = (0.98 * Math.pow(lambda_l, 0.4846)) / Math.pow(Math.max(0.0001, n_fr), 0.0868);
    const hl_int = (0.845 * Math.pow(lambda_l, 0.5351)) / Math.pow(Math.max(0.0001, n_fr), 0.0173);
    const alpha_blend = (l2 - n_fr) / Math.max(0.0001, l2 - l1);
    hl_theta = alpha_blend * hl_seg + (1 - alpha_blend) * hl_int;
    hl_theta = Math.max(lambda_l, Math.min(1.0, hl_theta));
  }

  // Two-phase mixture density
  const rho_m = rho_l * hl_theta + rho_g * (1 - hl_theta);
  const rho_no_slip = rho_l * lambda_l + rho_g * (1 - lambda_l);
  const mu_no_slip = mu_l * lambda_l + mu_g * (1 - lambda_l);

  // Reynolds number
  const re_no_slip = Math.max(100, (rho_no_slip * v_m * dia_m) / mu_no_slip);

  // Churchill friction factor for no-slip
  const rel_roughness = roughness_m / dia_m;
  const a_churchill = Math.pow(2.457 * Math.log(1 / Math.pow(7 / re_no_slip, 0.9) + 0.27 * rel_roughness), 16);
  const b_churchill = Math.pow(37530 / re_no_slip, 16);
  const f_n = 8 * Math.pow(Math.pow(8 / re_no_slip, 12) + 1 / Math.pow(a_churchill + b_churchill, 1.5), 1 / 12);

  // Beggs & Brill two-phase friction factor multiplier
  const y = lambda_l / Math.pow(hl_theta, 2);
  let s_factor = 0;
  if (y > 1 && y < 1.2) {
    s_factor = Math.log(2.2 * y - 1.2);
  } else if (y >= 1.2) {
    const lny = Math.log(y);
    s_factor = lny / (-0.0523 + 3.182 * lny - 0.8725 * Math.pow(lny, 2) + 0.01853 * Math.pow(lny, 4));
  } else {
    s_factor = 0;
  }

  const f_tp = f_n * Math.exp(s_factor);

  // Pressure gradient: Elevation + Friction
  const dp_dz_elev = rho_m * g * Math.sin(angle_rad);
  const dp_dz_fric = (f_tp * rho_no_slip * Math.pow(v_m, 2)) / (2 * dia_m);
  const dp_dz_total = dp_dz_elev + dp_dz_fric; // Pa / m

  const delta_p_pa = dp_dz_total * cellLength_m;
  const delta_p_bar = delta_p_pa / 1e5;
  const new_p_bar = Math.max(1.013, currentP_bar - delta_p_bar);

  return {
    pressure_bar: new_p_bar,
    dP_bar: delta_p_bar,
    liquid_holdup: hl_theta,
    flow_regime: regime,
    mixture_velocity: v_m,
  };
}

/**
 * Calculates Overall Heat Transfer Coefficient U (W/m²·K)
 * based on pipe diameter, steel wall, internal convective film, outer seawater convection,
 * and thermal insulation jacket (if present).
 */
export function calculateOverallHeatTransferU(
  innerDia_m: number,
  outerDia_m: number,
  insulation?: InsulationParams
): number {
  const r_i = innerDia_m / 2;
  const r_o = outerDia_m / 2;

  // Thermal conductivities (W/m·K)
  const k_steel = 45.0; // Carbon steel
  const h_inside = 450.0; // Internal multiphase convective heat transfer coefficient (W/m²·K)
  const h_seawater = 520.0; // Deepwater subsea seawater cross-flow convection (W/m²·K)

  // Internal film resistance (referenced to outer surface r_o)
  const r_film_in = r_o / (r_i * h_inside);

  // Steel pipe wall conduction resistance
  const r_pipe_steel = (r_o * Math.log(r_o / r_i)) / k_steel;

  let r_insulation = 0;
  let r_ext_surf = r_o;

  if (insulation && insulation.thickness_mm > 0) {
    const t_ins_m = insulation.thickness_mm / 1000;
    r_ext_surf = r_o + t_ins_m;
    const k_ins = insulation.thermal_k > 0 ? insulation.thermal_k : 0.038; // e.g. Polyurethane 0.038 W/m·K
    r_insulation = (r_o * Math.log(r_ext_surf / r_o)) / k_ins;
  }

  // External seawater convection resistance
  const r_film_out = r_o / (r_ext_surf * h_seawater);

  const total_r = r_film_in + r_pipe_steel + r_insulation + r_film_out;
  const u_overall = 1 / Math.max(0.0001, total_r);

  return u_overall;
}

/**
 * Hydrate equilibrium curve based on Sloan natural gas correlation:
 * T_hyd_base(P) = 8.9 * ln(P) - 16.5 (°C) for natural gas hydrates
 */
export function calculateHydrateEquilibriumTemp(pressure_bar: number): number {
  if (pressure_bar <= 1.0) return 0;
  return 8.9 * Math.log(Math.max(1.1, pressure_bar)) - 16.5;
}

/**
 * Hammerschmidt equation for thermodynamic hydrate depression:
 * ΔT_dep = (K * W) / (M * (100 - W))
 * where:
 *   K = 1297 (empirical Hammerschmidt constant)
 *   W = inhibitor concentration in aqueous phase (wt %)
 *   M = molecular weight of chemical (MEG: 62.07 g/mol, MeOH: 32.04 g/mol)
 */
export function calculateHammerschmidtDepression(chemical?: ChemicalParams): number {
  if (!chemical || chemical.rate_kg_h <= 0 || chemical.concentration_wt <= 0) {
    return 0;
  }

  if (chemical.chemical === 'ldhi') {
    // Low Dosage Hydrate Inhibitor (kinetic inhibitor provides ~4.5 °C subcooling delay window)
    return Math.min(6.0, 4.5 * (Math.min(100, chemical.concentration_wt) / 50));
  }

  const k_hamm = 1297;
  const mol_wt = chemical.chemical === 'methanol' ? 32.04 : 62.07; // MEG default
  const w = Math.min(95, Math.max(0.1, chemical.concentration_wt));

  const delta_t = (k_hamm * w) / (mol_wt * (100 - w));
  return Math.max(0, delta_t);
}

/**
 * Simulates wax (paraffin) thickness buildup along the pipeline segment:
 * WAT (Wax Appearance Temperature) is typically 32°C.
 * Paraffin deposits when fluid bulk/wall temperature < WAT.
 * Pigging frequency reduces accumulated wax cake thickness.
 */
export function calculateWaxDeposition(
  temp_c: number,
  wat_c: number = 32.0,
  u_val: number = 25.0,
  cycle_days: number = 7,
  bypass_fraction: number = 0.0
): number {
  if (temp_c >= wat_c) return 0.0;

  // Radial driving temperature difference for paraffin crystallization
  const subcooling = wat_c - temp_c;

  // Base accumulation rate: ~0.08 mm per day under uninsulated cold wall
  const insulationDampener = Math.min(1.0, u_val / 20.0);
  const days_factor = Math.min(30, cycle_days);
  const raw_buildup_mm = 0.075 * subcooling * (days_factor / 7) * (0.3 + 0.7 * insulationDampener);

  // Pig scraping recovery: if pigging is active with low bypass, recovers 85-95%
  const pigScrapingEfficiency = Math.max(0.0, 1.0 - bypass_fraction * 1.5);
  const remaining_wax_mm = Math.max(0, raw_buildup_mm * (1.0 - 0.75 * pigScrapingEfficiency));

  return Math.min(25.0, Number(remaining_wax_mm.toFixed(2)));
}

/**
 * Full 1D Discretization and Multiphase Flow Assurance Simulation Runner
 */
export function runSubseaSimulation(input: PhysicsInput): {
  summary: SimulationSummary;
  spatial_profile: SimulationSpatialCell[];
  unmitigated_baseline: {
    arrival_temp_c: number;
    hydrate_plug_detected_at_km: number | null;
    min_margin_c: number;
    spatial_profile: SimulationSpatialCell[];
  };
} {
  const { wellhead, pipe, insulation, chemical, pig } = input;
  const totalLength_m = pipe.length_m || 12500;
  const deltaX_m = input.deltaX_m || 100; // 100m discretization cells
  const cellCount = Math.max(10, Math.ceil(totalLength_m / deltaX_m));

  // Convert wellhead barrels/day to m3/s: 1 bbl = 0.158987 m3
  const liquidRate_m3_s = (wellhead.flow_rate_bpd * 0.158987) / 86400;
  // Convert GOR scf/bbl to sm3/sm3: 1 scf/bbl = 0.1781076 sm3/sm3
  const gor_sm3_sm3 = wellhead.gor * 0.1781076;

  // Fluid mass flow rate & heat capacity
  const oil_density = 850;
  const water_density = 1025;
  const rho_liq_mix = (1 - wellhead.water_cut) * oil_density + wellhead.water_cut * water_density;
  const massFlow_kg_s = liquidRate_m3_s * rho_liq_mix + liquidRate_m3_s * gor_sm3_sm3 * 0.85;
  const cp_fluid = 2400; // Average multiphase fluid specific heat J/(kg·K)

  // Overall U value for mitigated run
  const u_mitigated = calculateOverallHeatTransferU(pipe.inner_dia_m, pipe.outer_dia_m, insulation);
  // Bare pipe U value for baseline unmitigated run
  const u_unmitigated = calculateOverallHeatTransferU(pipe.inner_dia_m, pipe.outer_dia_m, undefined);

  // Hammerschmidt chemical depression
  const meg_depression_delta_t = calculateHammerschmidtDepression(chemical);

  // Inclination angle in radians
  const angle_rad = ((pipe.bathymetric_angle_deg || 0) * Math.PI) / 180;

  // 1. Run Mitigated Puzzle Stream
  const cells: SimulationSpatialCell[] = [];
  let currP_bar = wellhead.inlet_pres_bar;
  let currT_c = wellhead.inlet_temp_c;
  const seabedT = pipe.seabed_temp_c;
  const outerDia = pipe.outer_dia_m;

  let minMargin = 999;
  let worstHydrateKm = 0;
  let isHydratePlug = false;
  let maxWax = 0;
  let hasSlug = false;

  for (let i = 0; i <= cellCount; i++) {
    const dist_m = i * deltaX_m;
    const dist_km = dist_m / 1000;

    // Thermal analytical decay across cell
    if (i > 0) {
      // dT/dx = - (U * pi * D_o) * (T - T_seabed) / (m_dot * Cp)
      const thermal_exponent = -(u_mitigated * Math.PI * outerDia * deltaX_m) / (massFlow_kg_s * cp_fluid);
      currT_c = seabedT + (currT_c - seabedT) * Math.exp(thermal_exponent);
    }

    // Beggs & Brill hydraulic solver
    const bbRes = calculateBeggsAndBrillCell(
      currP_bar,
      liquidRate_m3_s,
      gor_sm3_sm3,
      wellhead.water_cut,
      pipe.inner_dia_m,
      angle_rad,
      pipe.roughness_m,
      deltaX_m,
      currT_c
    );

    currP_bar = bbRes.pressure_bar;
    if (bbRes.flow_regime === 'Intermittent (Slug)') hasSlug = true;

    // Hydrate calculation
    const t_hyd_base = calculateHydrateEquilibriumTemp(currP_bar);
    const t_hyd_dep = Math.max(-10, t_hyd_base - meg_depression_delta_t);
    const margin = currT_c - t_hyd_dep;
    const isHydrateRisk = margin <= 0;

    if (isHydrateRisk) {
      isHydratePlug = true;
    }

    if (margin < minMargin) {
      minMargin = margin;
      worstHydrateKm = dist_km;
    }

    // Wax deposition
    const waxMm = calculateWaxDeposition(
      currT_c,
      32.0,
      u_mitigated,
      pig?.cycle_days || 7,
      pig?.bypass_fraction || 0
    );
    if (waxMm > maxWax) maxWax = waxMm;

    cells.push({
      cell_index: i,
      distance_m: dist_m,
      distance_km: Number(dist_km.toFixed(2)),
      pressure_bar: Number(currP_bar.toFixed(1)),
      pressure_drop_bar: Number((wellhead.inlet_pres_bar - currP_bar).toFixed(1)),
      temp_c: Number(currT_c.toFixed(1)),
      ambient_temp_c: seabedT,
      hydrate_equilibrium_temp_c: Number(t_hyd_base.toFixed(1)),
      hydrate_depressed_temp_c: Number(t_hyd_dep.toFixed(1)),
      hydrate_margin_c: Number(margin.toFixed(1)),
      is_hydrate_risk: isHydrateRisk,
      liquid_holdup: Number(bbRes.liquid_holdup.toFixed(3)),
      mixture_velocity_ms: Number(bbRes.mixture_velocity.toFixed(2)),
      flow_regime: bbRes.flow_regime,
      wax_thickness_mm: waxMm,
      is_wax_risk: currT_c < 32.0,
      overall_u_w_m2k: Number(u_mitigated.toFixed(2)),
    });
  }

  // 2. Run Unmitigated Baseline (Bare pipe, No MEG) for direct benchmark comparison
  const baselineCells: SimulationSpatialCell[] = [];
  let baseP_bar = wellhead.inlet_pres_bar;
  let baseT_c = wellhead.inlet_temp_c;
  let basePlugKm: number | null = null;
  let baseMinMargin = 999;

  for (let i = 0; i <= cellCount; i++) {
    const dist_m = i * deltaX_m;
    const dist_km = dist_m / 1000;

    if (i > 0) {
      const thermal_exp_base = -(u_unmitigated * Math.PI * outerDia * deltaX_m) / (massFlow_kg_s * cp_fluid);
      baseT_c = seabedT + (baseT_c - seabedT) * Math.exp(thermal_exp_base);
    }

    const bbBase = calculateBeggsAndBrillCell(
      baseP_bar,
      liquidRate_m3_s,
      gor_sm3_sm3,
      wellhead.water_cut,
      pipe.inner_dia_m,
      angle_rad,
      pipe.roughness_m,
      deltaX_m,
      baseT_c
    );
    baseP_bar = bbBase.pressure_bar;

    const baseHydBase = calculateHydrateEquilibriumTemp(baseP_bar);
    const baseMargin = baseT_c - baseHydBase;

    if (baseMargin <= 0 && basePlugKm === null) {
      basePlugKm = Number(dist_km.toFixed(1));
    }
    if (baseMargin < baseMinMargin) {
      baseMinMargin = baseMargin;
    }

    baselineCells.push({
      cell_index: i,
      distance_m: dist_m,
      distance_km: Number(dist_km.toFixed(2)),
      pressure_bar: Number(baseP_bar.toFixed(1)),
      pressure_drop_bar: Number((wellhead.inlet_pres_bar - baseP_bar).toFixed(1)),
      temp_c: Number(baseT_c.toFixed(1)),
      ambient_temp_c: seabedT,
      hydrate_equilibrium_temp_c: Number(baseHydBase.toFixed(1)),
      hydrate_depressed_temp_c: Number(baseHydBase.toFixed(1)),
      hydrate_margin_c: Number(baseMargin.toFixed(1)),
      is_hydrate_risk: baseMargin <= 0,
      liquid_holdup: Number(bbBase.liquid_holdup.toFixed(3)),
      mixture_velocity_ms: Number(bbBase.mixture_velocity.toFixed(2)),
      flow_regime: bbBase.flow_regime,
      wax_thickness_mm: calculateWaxDeposition(baseT_c, 32.0, u_unmitigated, 30, 0),
      is_wax_risk: baseT_c < 32.0,
      overall_u_w_m2k: Number(u_unmitigated.toFixed(2)),
    });
  }

  const arrivalCell = cells[cells.length - 1];
  const baseArrivalCell = baselineCells[baselineCells.length - 1];

  const summary: SimulationSummary = {
    wellhead_pressure_bar: wellhead.inlet_pres_bar,
    wellhead_temp_c: wellhead.inlet_temp_c,
    arrival_pressure_bar: arrivalCell.pressure_bar,
    arrival_temp_c: arrivalCell.temp_c,
    total_length_km: Number((totalLength_m / 1000).toFixed(1)),
    total_pressure_drop_bar: Number((wellhead.inlet_pres_bar - arrivalCell.pressure_bar).toFixed(1)),
    min_hydrate_margin_c: Number(minMargin.toFixed(1)),
    worst_hydrate_distance_km: Number(worstHydrateKm.toFixed(1)),
    is_hydrate_plug_predicted: isHydratePlug,
    max_wax_thickness_mm: Number(maxWax.toFixed(2)),
    slug_risk_detected: hasSlug,
    beggs_brill_regime_dominant: hasSlug ? 'Intermittent (Slug)' : 'Segregated',
    overall_insulation_effective_u: Number(u_mitigated.toFixed(2)),
    meg_depression_delta_t_c: Number(meg_depression_delta_t.toFixed(1)),
    arrival_temperature_status:
      arrivalCell.temp_c < 10.0 ? 'CRITICAL_COLD' : arrivalCell.temp_c < 15.0 ? 'MARGINAL' : 'SAFE',
  };

  return {
    summary,
    spatial_profile: cells,
    unmitigated_baseline: {
      arrival_temp_c: baseArrivalCell.temp_c,
      hydrate_plug_detected_at_km: basePlugKm,
      min_margin_c: Number(baseMinMargin.toFixed(1)),
      spatial_profile: baselineCells,
    },
  };
}
