/**
 * Subsea Tieback Benchmark Scenarios from Engineering Handover & Blueprint
 */

import { SubseaNode, SubseaEdge } from '../types/subsea';

export interface PresetScenario {
  id: string;
  name: string;
  tagline: string;
  badge: string;
  badgeColor: string;
  description: string;
  nodes: SubseaNode[];
  edges: SubseaEdge[];
}

export const PRESET_SCENARIOS: PresetScenario[] = [
  {
    id: 'scenario_puzzle_mitigated',
    name: 'Puzzle-Mitigated Subsea Tieback (Blueprint Benchmark)',
    tagline: '50mm Polyurethane Sleeve + 25 wt% MEG Dosing Quill',
    badge: 'Standard Mitigated',
    badgeColor: 'emerald',
    description:
      'Snapping a 50 mm Polyurethane jacket (k = 0.038 W/m·K) and 25 wt% MEG injection quill onto the 12.5 km flowline maintains arrival temp at 14.8°C and depresses the hydrate envelope by 8.4°C, securing positive safety margin.',
    nodes: [
      {
        id: 'node_wh_01',
        type: 'wellhead',
        name: 'Subsea Wellhead WH-01',
        position: { x: 80, y: 180 },
        ports: [
          {
            id: 'p_wh_out',
            type: 'out:flange',
            label: 'Flange Out (API 10K)',
            direction: 'source',
            acceptedTypes: ['in:flange'],
            isConnected: true,
          },
        ],
        params: {
          flow_rate_bpd: 15000,
          inlet_temp_c: 65.0,
          inlet_pres_bar: 210.0,
          gor: 600,
          water_cut: 0.25,
          oil_api: 34,
          gas_sg: 0.68,
        },
      },
      {
        id: 'node_pipe_01',
        type: 'pipeline_segment',
        name: 'Deepwater Flowline PL-101',
        position: { x: 380, y: 180 },
        ports: [
          {
            id: 'p_pipe_in',
            type: 'in:flange',
            label: 'Flange In',
            direction: 'target',
            acceptedTypes: ['out:flange'],
            isConnected: true,
          },
          {
            id: 'p_pipe_out',
            type: 'out:flange',
            label: 'Flange Out',
            direction: 'source',
            acceptedTypes: ['in:flange'],
            isConnected: true,
          },
          {
            id: 'p_pipe_slot_ins',
            type: 'slot:insulation',
            label: 'Jacket Slot',
            direction: 'auxiliary',
            acceptedTypes: ['snap:jacket'],
            isConnected: true,
          },
          {
            id: 'p_pipe_slot_chem',
            type: 'slot:chemical',
            label: 'Quill Slot',
            direction: 'auxiliary',
            acceptedTypes: ['snap:injection'],
            isConnected: true,
          },
        ],
        params: {
          length_m: 12500,
          outer_dia_m: 0.273,
          inner_dia_m: 0.254,
          wall_thickness_m: 0.018,
          bathymetric_angle_deg: 0.8,
          roughness_m: 0.000045,
          seabed_temp_c: 4.0,
        },
        attachments: [
          {
            id: 'att_ins_01',
            type: 'thermal_insulation',
            params: {
              material: 'polyurethane',
              thickness_mm: 50.0,
              thermal_k: 0.038,
            },
          },
          {
            id: 'att_chem_01',
            type: 'chemical_injection',
            params: {
              chemical: 'monoethylene_glycol',
              rate_kg_h: 450.0,
              concentration_wt: 25.0,
            },
          },
        ],
      },
      {
        id: 'node_pig_01',
        type: 'pig_station',
        name: 'Inline Pig Launcher / Trap PT-01',
        position: { x: 740, y: 180 },
        ports: [
          {
            id: 'p_pig_in',
            type: 'in:flange',
            label: 'Flange In',
            direction: 'target',
            acceptedTypes: ['out:flange'],
            isConnected: true,
          },
          {
            id: 'p_pig_out',
            type: 'out:flange',
            label: 'Flange Out',
            direction: 'source',
            acceptedTypes: ['in:flange'],
            isConnected: true,
          },
        ],
        params: {
          pig_type: 'disc_scraper',
          cycle_days: 7,
          bypass_fraction: 0.0,
        },
      },
      {
        id: 'node_topside_01',
        type: 'topside_arrival',
        name: 'Topside Riser Platform HP-01',
        position: { x: 1040, y: 180 },
        ports: [
          {
            id: 'p_topside_in',
            type: 'in:flange',
            label: 'Arrival Flange In',
            direction: 'target',
            acceptedTypes: ['out:flange'],
            isConnected: true,
          },
        ],
        params: {
          target_separator_p_bar: 28.0,
          min_temp_c: 15.0,
        },
      },
    ],
    edges: [
      {
        id: 'e_wh_to_pipe',
        sourceNodeId: 'node_wh_01',
        sourcePortId: 'p_wh_out',
        targetNodeId: 'node_pipe_01',
        targetPortId: 'p_pipe_in',
        connectionType: 'flange_pipe',
      },
      {
        id: 'e_pipe_to_pig',
        sourceNodeId: 'node_pipe_01',
        sourcePortId: 'p_pipe_out',
        targetNodeId: 'node_pig_01',
        targetPortId: 'p_pig_in',
        connectionType: 'flange_pipe',
      },
      {
        id: 'e_pig_to_topside',
        sourceNodeId: 'node_pig_01',
        sourcePortId: 'p_pig_out',
        targetNodeId: 'node_topside_01',
        targetPortId: 'p_topside_in',
        connectionType: 'flange_pipe',
      },
    ],
  },
  {
    id: 'scenario_unmitigated_baseline',
    name: 'Unmitigated Baseline (Cold Seawater Hazard)',
    tagline: 'Bare Carbon Steel Pipe without Insulation or Inhibitor',
    badge: 'Hydrate Hazard',
    badgeColor: 'rose',
    description:
      'Unmitigated bare flowline in 4.0°C seabed ambient water. Fluid temperature collapses to 3.8°C within 8.5 km, crossing into the severe natural gas hydrate plugging envelope.',
    nodes: [
      {
        id: 'node_wh_01',
        type: 'wellhead',
        name: 'Subsea Wellhead WH-01',
        position: { x: 80, y: 180 },
        ports: [
          {
            id: 'p_wh_out',
            type: 'out:flange',
            label: 'Flange Out (API 10K)',
            direction: 'source',
            acceptedTypes: ['in:flange'],
            isConnected: true,
          },
        ],
        params: {
          flow_rate_bpd: 15000,
          inlet_temp_c: 65.0,
          inlet_pres_bar: 210.0,
          gor: 600,
          water_cut: 0.25,
          oil_api: 34,
          gas_sg: 0.68,
        },
      },
      {
        id: 'node_pipe_01',
        type: 'pipeline_segment',
        name: 'Bare Flowline PL-101 (No Jacket)',
        position: { x: 440, y: 180 },
        ports: [
          {
            id: 'p_pipe_in',
            type: 'in:flange',
            label: 'Flange In',
            direction: 'target',
            acceptedTypes: ['out:flange'],
            isConnected: true,
          },
          {
            id: 'p_pipe_out',
            type: 'out:flange',
            label: 'Flange Out',
            direction: 'source',
            acceptedTypes: ['in:flange'],
            isConnected: true,
          },
          {
            id: 'p_pipe_slot_ins',
            type: 'slot:insulation',
            label: 'Jacket Slot',
            direction: 'auxiliary',
            acceptedTypes: ['snap:jacket'],
            isConnected: false,
          },
          {
            id: 'p_pipe_slot_chem',
            type: 'slot:chemical',
            label: 'Quill Slot',
            direction: 'auxiliary',
            acceptedTypes: ['snap:injection'],
            isConnected: false,
          },
        ],
        params: {
          length_m: 12500,
          outer_dia_m: 0.273,
          inner_dia_m: 0.254,
          wall_thickness_m: 0.018,
          bathymetric_angle_deg: 0.8,
          roughness_m: 0.000045,
          seabed_temp_c: 4.0,
        },
        attachments: [],
      },
      {
        id: 'node_topside_01',
        type: 'topside_arrival',
        name: 'Topside Riser Platform HP-01',
        position: { x: 880, y: 180 },
        ports: [
          {
            id: 'p_topside_in',
            type: 'in:flange',
            label: 'Arrival Flange In',
            direction: 'target',
            acceptedTypes: ['out:flange'],
            isConnected: true,
          },
        ],
        params: {
          target_separator_p_bar: 28.0,
          min_temp_c: 15.0,
        },
      },
    ],
    edges: [
      {
        id: 'e_wh_to_pipe',
        sourceNodeId: 'node_wh_01',
        sourcePortId: 'p_wh_out',
        targetNodeId: 'node_pipe_01',
        targetPortId: 'p_pipe_in',
        connectionType: 'flange_pipe',
      },
      {
        id: 'e_pipe_to_topside',
        sourceNodeId: 'node_pipe_01',
        sourcePortId: 'p_pipe_out',
        targetNodeId: 'node_topside_01',
        targetPortId: 'p_topside_in',
        connectionType: 'flange_pipe',
      },
    ],
  },
  {
    id: 'scenario_aerogel_long_stepout',
    name: 'Ultra-Deepwater 28 km Long Step-Out',
    tagline: 'High Performance Aerogel Insulation + MeOH Dosing',
    badge: 'Aerogel + MeOH',
    badgeColor: 'sky',
    description:
      'Long-distance 28,000 meter subsea tieback with 40mm Aerogel sleeve (k = 0.020 W/m·K) and Methanol inhibitor quill for ultra-low seabed 3.0°C conditions.',
    nodes: [
      {
        id: 'node_wh_01',
        type: 'wellhead',
        name: 'Subsea Wellhead Cluster WH-North',
        position: { x: 80, y: 180 },
        ports: [
          {
            id: 'p_wh_out',
            type: 'out:flange',
            label: 'Flange Out (API 10K)',
            direction: 'source',
            acceptedTypes: ['in:flange'],
            isConnected: true,
          },
        ],
        params: {
          flow_rate_bpd: 24000,
          inlet_temp_c: 78.0,
          inlet_pres_bar: 245.0,
          gor: 950,
          water_cut: 0.15,
          oil_api: 38,
          gas_sg: 0.65,
        },
      },
      {
        id: 'node_pipe_01',
        type: 'pipeline_segment',
        name: 'Extended Subsea Tieback Trunk (28 km)',
        position: { x: 380, y: 180 },
        ports: [
          {
            id: 'p_pipe_in',
            type: 'in:flange',
            label: 'Flange In',
            direction: 'target',
            acceptedTypes: ['out:flange'],
            isConnected: true,
          },
          {
            id: 'p_pipe_out',
            type: 'out:flange',
            label: 'Flange Out',
            direction: 'source',
            acceptedTypes: ['in:flange'],
            isConnected: true,
          },
          {
            id: 'p_pipe_slot_ins',
            type: 'slot:insulation',
            label: 'Jacket Slot',
            direction: 'auxiliary',
            acceptedTypes: ['snap:jacket'],
            isConnected: true,
          },
          {
            id: 'p_pipe_slot_chem',
            type: 'slot:chemical',
            label: 'Quill Slot',
            direction: 'auxiliary',
            acceptedTypes: ['snap:injection'],
            isConnected: true,
          },
        ],
        params: {
          length_m: 28000,
          outer_dia_m: 0.323,
          inner_dia_m: 0.298,
          wall_thickness_m: 0.022,
          bathymetric_angle_deg: 0.4,
          roughness_m: 0.000045,
          seabed_temp_c: 3.2,
        },
        attachments: [
          {
            id: 'att_ins_02',
            type: 'thermal_insulation',
            params: {
              material: 'aerogel',
              thickness_mm: 40.0,
              thermal_k: 0.02,
            },
          },
          {
            id: 'att_chem_02',
            type: 'chemical_injection',
            params: {
              chemical: 'methanol',
              rate_kg_h: 380.0,
              concentration_wt: 32.0,
            },
          },
        ],
      },
      {
        id: 'node_pig_01',
        type: 'pig_station',
        name: 'Subsea Intelligent Caliper Pig Loop',
        position: { x: 740, y: 180 },
        ports: [
          {
            id: 'p_pig_in',
            type: 'in:flange',
            label: 'Flange In',
            direction: 'target',
            acceptedTypes: ['out:flange'],
            isConnected: true,
          },
          {
            id: 'p_pig_out',
            type: 'out:flange',
            label: 'Flange Out',
            direction: 'source',
            acceptedTypes: ['in:flange'],
            isConnected: true,
          },
        ],
        params: {
          pig_type: 'caliper_smart',
          cycle_days: 14,
          bypass_fraction: 0.05,
        },
      },
      {
        id: 'node_topside_01',
        type: 'topside_arrival',
        name: 'FPSO Host Facility Separator Train',
        position: { x: 1040, y: 180 },
        ports: [
          {
            id: 'p_topside_in',
            type: 'in:flange',
            label: 'Arrival Flange In',
            direction: 'target',
            acceptedTypes: ['out:flange'],
            isConnected: true,
          },
        ],
        params: {
          target_separator_p_bar: 32.0,
          min_temp_c: 18.0,
        },
      },
    ],
    edges: [
      {
        id: 'e_wh_to_pipe_2',
        sourceNodeId: 'node_wh_01',
        sourcePortId: 'p_wh_out',
        targetNodeId: 'node_pipe_01',
        targetPortId: 'p_pipe_in',
        connectionType: 'flange_pipe',
      },
      {
        id: 'e_pipe_to_pig_2',
        sourceNodeId: 'node_pipe_01',
        sourcePortId: 'p_pipe_out',
        targetNodeId: 'node_pig_01',
        targetPortId: 'p_pig_in',
        connectionType: 'flange_pipe',
      },
      {
        id: 'e_pig_to_topside_2',
        sourceNodeId: 'node_pig_01',
        sourcePortId: 'p_pig_out',
        targetNodeId: 'node_topside_01',
        targetPortId: 'p_topside_in',
        connectionType: 'flange_pipe',
      },
    ],
  },
];
