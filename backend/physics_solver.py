"""
Beggs & Brill (1973) Multiphase Flow & Subsea Heat Transfer Physics Engine
Python 3 / Django Implementation for Subsea Tieback Simulation Platform (v2)
"""

import math
from typing import Dict, Any, List, Tuple, Optional


def calculate_beggs_and_brill_cell(
    current_p_bar: float,
    liquid_flow_m3_s: float,
    gor_sm3_sm3: float,
    water_cut: float,
    dia_m: float,
    angle_rad: float,
    roughness_m: float,
    cell_length_m: float,
    temp_c: float
) -> Dict[str, Any]:
    """
    Beggs and Brill (1973) two-phase pressure drop and liquid holdup calculation
    for a single 1D spatial cell.
    """
    g = 9.80665
    area = (math.pi * (dia_m ** 2)) / 4.0

    p_pa = current_p_bar * 1e5
    temp_k = temp_c + 273.15

    # Gas density using real gas law estimate
    z_factor = max(0.75, min(1.0, 1.0 - 0.0012 * current_p_bar + 0.0003 * temp_c))
    r_gas = 287.058 / 0.68  # SG = 0.68
    rho_g = max(1.2, p_pa / (z_factor * r_gas * temp_k))

    # Liquid density: oil (850 kg/m3) + water (1025 kg/m3)
    rho_oil = 850.0
    rho_water = 1025.0
    rho_l = (1.0 - water_cut) * rho_oil + water_cut * rho_water

    # Viscosities (Pa.s)
    mu_l = (1.0 - water_cut) * 0.0035 + water_cut * 0.0009
    mu_g = 0.000015

    # Gas rate in-situ
    standard_p = 101325.0
    standard_t = 288.15
    gas_standard_rate_m3_s = liquid_flow_m3_s * gor_sm3_sm3
    b_g = (standard_p / p_pa) * (temp_k / standard_t) * z_factor
    gas_in_situ_rate_m3_s = max(0.0001, gas_standard_rate_m3_s * b_g)

    # Superficial velocities
    v_sl = liquid_flow_m3_s / area
    v_sg = gas_in_situ_rate_m3_s / area
    v_m = v_sl + v_sg

    # No-slip liquid holdup
    lambda_l = max(0.0001, min(0.9999, v_sl / max(0.0001, v_m)))

    # Froude number
    n_fr = (v_m ** 2) / (g * dia_m)

    # Beggs & Brill regime boundary curves
    l1 = 316.0 * (lambda_l ** 0.302)
    l2 = 0.0009252 * (lambda_l ** -2.4684)
    l3 = 0.10 * (lambda_l ** -1.4516)
    l4 = 0.5 * (lambda_l ** -6.738)

    regime = "Segregated"
    a, b, c = 0.98, 0.4846, 0.0868

    if (lambda_l < 0.01 and n_fr < l1) or (lambda_l >= 0.01 and n_fr < l1):
        regime = "Segregated"
        a, b, c = 0.98, 0.4846, 0.0868
    elif lambda_l >= 0.01 and l1 <= n_fr <= l2:
        regime = "Transition"
    elif (0.01 <= lambda_l < 0.4 and l3 < n_fr <= l1) or (lambda_l >= 0.4 and l3 < n_fr <= l4):
        regime = "Intermittent (Slug)"
        a, b, c = 0.845, 0.5351, 0.0173
    elif (lambda_l < 0.4 and n_fr >= l1) or (lambda_l >= 0.4 and n_fr > l4):
        regime = "Distributed"
        a, b, c = 1.065, 0.5824, 0.0609
    else:
        regime = "Intermittent (Slug)"
        a, b, c = 0.845, 0.5351, 0.0173

    # Horizontal holdup
    hl_0 = (a * (lambda_l ** b)) / (max(0.0001, n_fr) ** c)
    hl_0 = max(lambda_l, min(1.0, hl_0))

    # Inclination correction
    if angle_rad >= 0:
        d, e, f, g_exp = 0.011, -3.768, 3.539, -1.614
        n_lv = 1.938 * v_sl * ((rho_l / 0.03) ** 0.25)
        c_param = (1.0 - lambda_l) * math.log(max(1e-4, d * (lambda_l ** e) * (n_lv ** f) * (n_fr ** g_exp)))
        c_param = max(0.0, c_param)
    else:
        c_param = (1.0 - lambda_l) * math.log(max(1e-4, 4.7 * (lambda_l ** -0.3692) * (n_fr ** 0.1244)))

    sin_term = math.sin(1.8 * angle_rad) - 0.333 * (math.sin(1.8 * angle_rad) ** 3)
    psi = 1.0 + c_param * sin_term
    hl_theta = max(lambda_l, min(1.0, hl_0 * max(0.5, psi)))

    if regime == "Transition":
        hl_seg = (0.98 * (lambda_l ** 0.4846)) / (max(0.0001, n_fr) ** 0.0868)
        hl_int = (0.845 * (lambda_l ** 0.5351)) / (max(0.0001, n_fr) ** 0.0173)
        alpha_blend = (l2 - n_fr) / max(0.0001, l2 - l1)
        hl_theta = max(lambda_l, min(1.0, alpha_blend * hl_seg + (1.0 - alpha_blend) * hl_int))

    # Mixture density & no-slip viscosity
    rho_m = rho_l * hl_theta + rho_g * (1.0 - hl_theta)
    rho_no_slip = rho_l * lambda_l + rho_g * (1.0 - lambda_l)
    mu_no_slip = mu_l * lambda_l + mu_g * (1.0 - lambda_l)

    re_no_slip = max(100.0, (rho_no_slip * v_m * dia_m) / mu_no_slip)

    # Churchill friction factor
    rel_roughness = roughness_m / dia_m
    a_ch = (2.457 * math.log(1.0 / ((7.0 / re_no_slip) ** 0.9 + 0.27 * rel_roughness))) ** 16
    b_ch = (37530.0 / re_no_slip) ** 16
    f_n = 8.0 * (((8.0 / re_no_slip) ** 12 + 1.0 / ((a_ch + b_ch) ** 1.5)) ** (1.0 / 12.0))

    # Two-phase friction factor ratio
    y = lambda_l / (hl_theta ** 2)
    if 1.0 < y < 1.2:
        s_factor = math.log(2.2 * y - 1.2)
    elif y >= 1.2:
        lny = math.log(y)
        s_factor = lny / (-0.0523 + 3.182 * lny - 0.8725 * (lny ** 2) + 0.01853 * (lny ** 4))
    else:
        s_factor = 0.0

    f_tp = f_n * math.exp(s_factor)

    # Pressure gradients
    dp_dz_elev = rho_m * g * math.sin(angle_rad)
    dp_dz_fric = (f_tp * rho_no_slip * (v_m ** 2)) / (2.0 * dia_m)
    dp_dz_total = dp_dz_elev + dp_dz_fric

    delta_p_pa = dp_dz_total * cell_length_m
    delta_p_bar = delta_p_pa / 1e5
    new_p_bar = max(1.013, current_p_bar - delta_p_bar)

    return {
        "pressure_bar": round(new_p_bar, 2),
        "dP_bar": round(delta_p_bar, 3),
        "liquid_holdup": round(hl_theta, 3),
        "flow_regime": regime,
        "mixture_velocity": round(v_m, 2),
    }


def calculate_overall_heat_transfer_u(
    inner_dia_m: float,
    outer_dia_m: float,
    insulation: Optional[Dict[str, Any]] = None
) -> float:
    """
    Computes overall heat transfer coefficient U (W/m²·K)
    for bare vs insulated pipe.
    """
    r_i = inner_dia_m / 2.0
    r_o = outer_dia_m / 2.0

    k_steel = 45.0
    h_inside = 450.0
    h_seawater = 520.0

    r_film_in = r_o / (r_i * h_inside)
    r_pipe_steel = (r_o * math.log(r_o / r_i)) / k_steel

    r_insulation = 0.0
    r_ext_surf = r_o

    if insulation and insulation.get("thickness_mm", 0) > 0:
        t_ins_m = insulation["thickness_mm"] / 1000.0
        r_ext_surf = r_o + t_ins_m
        k_ins = insulation.get("thermal_k", 0.038)
        r_insulation = (r_o * math.log(r_ext_surf / r_o)) / k_ins

    r_film_out = r_o / (r_ext_surf * h_seawater)
    total_r = r_film_in + r_pipe_steel + r_insulation + r_film_out
    return round(1.0 / max(0.0001, total_r), 2)


def calculate_hydrate_equilibrium_temp(pressure_bar: float) -> float:
    """Sloan natural gas hydrate curve."""
    if pressure_bar <= 1.0:
        return 0.0
    return round(8.9 * math.log(max(1.1, pressure_bar)) - 16.5, 2)


def calculate_hammerschmidt_depression(chemical: Optional[Dict[str, Any]] = None) -> float:
    """Hammerschmidt thermodynamic hydrate depression."""
    if not chemical or chemical.get("rate_kg_h", 0) <= 0 or chemical.get("concentration_wt", 0) <= 0:
        return 0.0

    chem_type = chemical.get("chemical", "monoethylene_glycol")
    if chem_type == "ldhi":
        return min(6.0, 4.5 * (min(100.0, chemical["concentration_wt"]) / 50.0))

    k_hamm = 1297.0
    mol_wt = 32.04 if chem_type == "methanol" else 62.07
    w = min(95.0, max(0.1, float(chemical["concentration_wt"])))

    delta_t = (k_hamm * w) / (mol_wt * (100.0 - w))
    return round(max(0.0, delta_t), 2)


def calculate_wax_deposition(
    temp_c: float,
    wat_c: float = 32.0,
    u_val: float = 25.0,
    cycle_days: int = 7,
    bypass_fraction: float = 0.0
) -> float:
    """Wax thickness buildup kinetics."""
    if temp_c >= wat_c:
        return 0.0

    subcooling = wat_c - temp_c
    insulation_dampener = min(1.0, u_val / 20.0)
    days_factor = min(30, cycle_days)
    raw_buildup = 0.075 * subcooling * (days_factor / 7.0) * (0.3 + 0.7 * insulation_dampener)

    scraping_eff = max(0.0, 1.0 - bypass_fraction * 1.5)
    remaining_wax = max(0.0, raw_buildup * (1.0 - 0.75 * scraping_eff))
    return round(min(25.0, remaining_wax), 2)


def solve_subsea_chain(network_chain: List[Dict[str, Any]], delta_x_m: float = 100.0) -> Dict[str, Any]:
    """
    Executes 1D spatial meshing across the chronological serialized network chain.
    """
    wellhead = None
    pipe = None
    pig = None
    topside = None

    for item in network_chain:
        t = item.get("type")
        if t == "wellhead":
            wellhead = item
        elif t == "pipeline_segment":
            pipe = item
        elif t == "pig_station":
            pig = item
        elif t == "topside_arrival":
            topside = item

    if not wellhead or not pipe:
        raise ValueError("Missing wellhead or pipeline segment in network chain.")

    wh_params = wellhead.get("params", {})
    pipe_params = pipe.get("params", {})
    attachments = pipe.get("attachments", [])

    ins_params = None
    chem_params = None
    for att in attachments:
        if att.get("type") == "thermal_insulation":
            ins_params = att
        elif att.get("type") == "chemical_injection":
            chem_params = att

    # Boundary properties
    flow_rate_bpd = float(wh_params.get("flow_rate_bpd", 15000))
    inlet_pres_bar = float(wh_params.get("inlet_pres_bar", 210.0))
    inlet_temp_c = float(wh_params.get("inlet_temp_c", 65.0))
    gor = float(wh_params.get("gor", 600))
    water_cut = float(wh_params.get("water_cut", 0.25))

    length_m = float(pipe_params.get("length_m", 12500))
    inner_dia_m = float(pipe_params.get("inner_dia_m", 0.254))
    outer_dia_m = float(pipe_params.get("outer_dia_m", 0.273))
    bathymetric_angle_deg = float(pipe_params.get("bathymetric_angle_deg", 0.8))
    roughness_m = float(pipe_params.get("roughness_m", 0.000045))
    seabed_temp_c = float(pipe_params.get("seabed_temp_c", 4.0))

    cell_count = max(10, math.ceil(length_m / delta_x_m))

    liquid_rate_m3_s = (flow_rate_bpd * 0.158987) / 86400.0
    gor_sm3_sm3 = gor * 0.1781076
    rho_liq = (1.0 - water_cut) * 850.0 + water_cut * 1025.0
    mass_flow = liquid_rate_m3_s * rho_liq + liquid_rate_m3_s * gor_sm3_sm3 * 0.85
    cp_fluid = 2400.0

    u_val = calculate_overall_heat_transfer_u(inner_dia_m, outer_dia_m, ins_params)
    u_bare = calculate_overall_heat_transfer_u(inner_dia_m, outer_dia_m, None)
    meg_dep = calculate_hammerschmidt_depression(chem_params)
    angle_rad = (bathymetric_angle_deg * math.pi) / 180.0

    # 1. Run Mitigated Tieback
    cells = []
    curr_p = inlet_pres_bar
    curr_t = inlet_temp_c
    min_margin = 999.0
    worst_km = 0.0
    is_plug = False
    max_wax = 0.0
    has_slug = False

    for i in range(cell_count + 1):
        dist_m = i * delta_x_m
        dist_km = round(dist_m / 1000.0, 2)

        if i > 0:
            thermal_exp = -(u_val * math.pi * outer_dia_m * delta_x_m) / (mass_flow * cp_fluid)
            curr_t = seabed_temp_c + (curr_t - seabed_temp_c) * math.exp(thermal_exp)

        bb = calculate_beggs_and_brill_cell(
            curr_p, liquid_rate_m3_s, gor_sm3_sm3, water_cut,
            inner_dia_m, angle_rad, roughness_m, delta_x_m, curr_t
        )
        curr_p = bb["pressure_bar"]
        if bb["flow_regime"] == "Intermittent (Slug)":
            has_slug = True

        t_hyd_base = calculate_hydrate_equilibrium_temp(curr_p)
        t_hyd_dep = round(max(-10.0, t_hyd_base - meg_dep), 2)
        margin = round(curr_t - t_hyd_dep, 2)

        if margin <= 0.0:
            is_plug = True
        if margin < min_margin:
            min_margin = margin
            worst_km = dist_km

        wax_mm = calculate_wax_deposition(curr_t, 32.0, u_val)
        if wax_mm > max_wax:
            max_wax = wax_mm

        cells.append({
            "cell_index": i,
            "distance_m": dist_m,
            "distance_km": dist_km,
            "pressure_bar": round(curr_p, 1),
            "pressure_drop_bar": round(inlet_pres_bar - curr_p, 1),
            "temp_c": round(curr_t, 1),
            "ambient_temp_c": seabed_temp_c,
            "hydrate_equilibrium_temp_c": round(t_hyd_base, 1),
            "hydrate_depressed_temp_c": round(t_hyd_dep, 1),
            "hydrate_margin_c": margin,
            "is_hydrate_risk": margin <= 0.0,
            "liquid_holdup": bb["liquid_holdup"],
            "mixture_velocity_ms": bb["mixture_velocity"],
            "flow_regime": bb["flow_regime"],
            "wax_thickness_mm": wax_mm,
            "is_wax_risk": curr_t < 32.0,
            "overall_u_w_m2k": u_val
        })

    # 2. Run Unmitigated Baseline
    baseline_cells = []
    base_p = inlet_pres_bar
    base_t = inlet_temp_c
    base_plug_km = None
    base_min_margin = 999.0

    for i in range(cell_count + 1):
        dist_m = i * delta_x_m
        dist_km = round(dist_m / 1000.0, 2)

        if i > 0:
            thermal_exp_b = -(u_bare * math.pi * outer_dia_m * delta_x_m) / (mass_flow * cp_fluid)
            base_t = seabed_temp_c + (base_t - seabed_temp_c) * math.exp(thermal_exp_b)

        bb_base = calculate_beggs_and_brill_cell(
            base_p, liquid_rate_m3_s, gor_sm3_sm3, water_cut,
            inner_dia_m, angle_rad, roughness_m, delta_x_m, base_t
        )
        base_p = bb_base["pressure_bar"]

        base_hyd = calculate_hydrate_equilibrium_temp(base_p)
        base_margin = round(base_t - base_hyd, 2)
        if base_margin <= 0.0 and base_plug_km is None:
            base_plug_km = dist_km
        if base_margin < base_min_margin:
            base_min_margin = base_margin

        baseline_cells.append({
            "cell_index": i,
            "distance_m": dist_m,
            "distance_km": dist_km,
            "pressure_bar": round(base_p, 1),
            "temp_c": round(base_t, 1),
            "hydrate_margin_c": base_margin,
            "is_hydrate_risk": base_margin <= 0.0
        })

    arrival_cell = cells[-1]
    base_arrival = baseline_cells[-1]

    summary = {
        "wellhead_pressure_bar": inlet_pres_bar,
        "wellhead_temp_c": inlet_temp_c,
        "arrival_pressure_bar": arrival_cell["pressure_bar"],
        "arrival_temp_c": arrival_cell["temp_c"],
        "total_length_km": round(length_m / 1000.0, 1),
        "total_pressure_drop_bar": round(inlet_pres_bar - arrival_cell["pressure_bar"], 1),
        "min_hydrate_margin_c": round(min_margin, 1),
        "worst_hydrate_distance_km": round(worst_km, 1),
        "is_hydrate_plug_predicted": is_plug,
        "max_wax_thickness_mm": round(max_wax, 2),
        "slug_risk_detected": has_slug,
        "beggs_brill_regime_dominant": "Intermittent (Slug)" if has_slug else "Segregated",
        "overall_insulation_effective_u": u_val,
        "meg_depression_delta_t_c": round(meg_dep, 1),
        "arrival_temperature_status": "CRITICAL_COLD" if arrival_cell["temp_c"] < 10.0 else ("MARGINAL" if arrival_cell["temp_c"] < 15.0 else "SAFE")
    }

    return {
        "summary": summary,
        "spatial_profile": cells,
        "unmitigated_baseline": {
            "arrival_temp_c": base_arrival["temp_c"],
            "hydrate_plug_detected_at_km": base_plug_km,
            "min_margin_c": round(base_min_margin, 1),
            "spatial_profile": baseline_cells
        }
    }
