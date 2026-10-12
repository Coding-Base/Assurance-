#!/usr/bin/env python3
"""
Unit and Integration Test Suite for SubseaFlow Python Physics Engine
Validates Beggs & Brill (1973), Overall U, Hammerschmidt Hydrate Depression,
and Benchmark Handover Criteria.
"""

import unittest
from physics_solver import (
    calculate_beggs_and_brill_cell,
    calculate_overall_heat_transfer_u,
    calculate_hydrate_equilibrium_temp,
    calculate_hammerschmidt_depression,
    solve_subsea_chain,
)


class TestSubseaPhysicsEngine(unittest.TestCase):

    def test_beggs_and_brill_cell(self):
        """Test Beggs and Brill multiphase pressure drop and holdup calculation."""
        res = calculate_beggs_and_brill_cell(
            current_p_bar=210.0,
            liquid_flow_m3_s=0.0276,
            gor_sm3_sm3=106.8,
            water_cut=0.25,
            dia_m=0.254,
            angle_rad=0.014,
            roughness_m=0.000045,
            cell_length_m=100.0,
            temp_c=65.0,
        )
        self.assertLess(res["pressure_bar"], 210.0)
        self.assertGreater(res["liquid_holdup"], 0.0)
        self.assertLessEqual(res["liquid_holdup"], 1.0)
        self.assertGreater(res["mixture_velocity"], 0.0)
        self.assertIn(res["flow_regime"], ["Segregated", "Intermittent (Slug)", "Distributed", "Transition"])

    def test_overall_heat_transfer_u(self):
        """Test Overall U reduction with 50mm Polyurethane sleeve."""
        u_bare = calculate_overall_heat_transfer_u(0.254, 0.273, None)
        u_insulated = calculate_overall_heat_transfer_u(0.254, 0.273, {
            "material": "polyurethane",
            "thickness_mm": 50.0,
            "thermal_k": 0.038,
        })
        self.assertGreater(u_bare, 20.0)
        self.assertLess(u_insulated, 4.0)
        # Thermal dissipation reduction > 85%
        self.assertGreater(u_bare / u_insulated, 5.0)

    def test_hammerschmidt_depression(self):
        """Test Hammerschmidt hydrate envelope depression for MEG and MeOH."""
        meg_dep = calculate_hammerschmidt_depression({
            "chemical": "monoethylene_glycol",
            "rate_kg_h": 450.0,
            "concentration_wt": 25.0,
        })
        meoh_dep = calculate_hammerschmidt_depression({
            "chemical": "methanol",
            "rate_kg_h": 300.0,
            "concentration_wt": 25.0,
        })
        self.assertGreater(meg_dep, 6.0)
        # Methanol (MW=32.04) depresses more than MEG (MW=62.07) at same wt%
        self.assertGreater(meoh_dep, meg_dep)

    def test_benchmark_handover_simulation(self):
        """Test complete 12.5 km tieback benchmark: Unmitigated vs Mitigated."""
        chain = [
            {
                "node_id": "wh_01",
                "type": "wellhead",
                "params": {
                    "flow_rate_bpd": 15000,
                    "inlet_temp_c": 65.0,
                    "inlet_pres_bar": 210.0,
                    "gor": 600,
                    "water_cut": 0.25,
                }
            },
            {
                "node_id": "pipe_01",
                "type": "pipeline_segment",
                "params": {
                    "length_m": 12500,
                    "inner_dia_m": 0.254,
                    "outer_dia_m": 0.273,
                    "bathymetric_angle_deg": 0.8,
                    "roughness_m": 0.000045,
                    "seabed_temp_c": 4.0,
                },
                "attachments": [
                    {
                        "type": "thermal_insulation",
                        "material": "polyurethane",
                        "thickness_mm": 50.0,
                        "thermal_k": 0.038,
                    },
                    {
                        "type": "chemical_injection",
                        "chemical": "monoethylene_glycol",
                        "rate_kg_h": 450.0,
                        "concentration_wt": 25.0,
                    }
                ]
            },
            {
                "node_id": "topside_01",
                "type": "topside_arrival",
                "params": {
                    "target_separator_p_bar": 28.0,
                    "min_temp_c": 15.0,
                }
            }
        ]

        res = solve_subsea_chain(chain)
        summary = res["summary"]
        baseline = res["unmitigated_baseline"]

        # Assert unmitigated baseline drops cold and predicts hydrate plug
        self.assertLess(baseline["arrival_temp_c"], 10.0)
        self.assertIsNotNone(baseline["hydrate_plug_detected_at_km"])

        # Assert puzzle-mitigated maintains warm temperature and positive margin
        self.assertGreater(summary["arrival_temp_c"], 14.0)
        self.assertFalse(summary["is_hydrate_plug_predicted"])
        self.assertGreater(summary["min_hydrate_margin_c"], 0.0)


if __name__ == "__main__":
    unittest.main()
