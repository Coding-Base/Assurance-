/**
 * Topological DAG Linter & Graph-to-Hydraulic Chain Serialization Engine
 * Validates subsea hydraulic continuity, socket compatibility, thermal rules,
 * and compiles normalized chronological DAG payloads for simulation execution.
 */

import {
  SubseaNode,
  SubseaEdge,
  ValidationError,
  SerializedDAGPayload,
  WellheadParams,
  PipeParams,
  TopsideParams,
  PigParams,
  InsulationParams,
  ChemicalParams,
} from '../types/subsea';

export interface ValidationReport {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  infos: ValidationError[];
  chronologicalNodeIds: string[];
}

/**
 * Socket compatibility rule checker
 */
export function isPortConnectionValid(
  sourcePortType: string,
  targetPortType: string
): { allowed: boolean; reason?: string } {
  if (sourcePortType === 'out:flange' && targetPortType === 'in:flange') {
    return { allowed: true };
  }
  if (sourcePortType === 'slot:insulation' && targetPortType === 'snap:jacket') {
    return { allowed: true };
  }
  if (sourcePortType === 'slot:chemical' && targetPortType === 'snap:injection') {
    return { allowed: true };
  }
  // Reverse snap attempts
  if (sourcePortType === 'snap:jacket' && targetPortType === 'slot:insulation') {
    return { allowed: true };
  }
  if (sourcePortType === 'snap:injection' && targetPortType === 'slot:chemical') {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: `Incompatible socket connection: Cannot connect port [${sourcePortType}] to [${targetPortType}]. Mating puzzle teeth must match (e.g. out:flange ➔ in:flange).`,
  };
}

/**
 * Performs deep pre-flight topological linting on the subsea network graph
 */
export function lintSubseaTopology(nodes: SubseaNode[], edges: SubseaEdge[]): ValidationReport {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  const infos: ValidationError[] = [];

  const nodeMap = new Map<string, SubseaNode>(nodes.map((n) => [n.id, n]));

  // 1. Check Root Node (Wellhead)
  const wellheads = nodes.filter((n) => n.type === 'wellhead');
  if (wellheads.length === 0) {
    errors.push({
      id: 'err_no_wellhead',
      severity: 'error',
      title: 'Missing Source Wellhead',
      message: 'The subsea hydraulic network must originate from a Subsea Wellhead root node.',
      actionableHint: 'Drag a Subsea Wellhead from the Asset Palette onto the canvas.',
    });
  } else if (wellheads.length > 1) {
    errors.push({
      id: 'err_multiple_wellheads',
      severity: 'error',
      title: 'Multiple Wellheads Detected',
      message: 'Single tieback pipeline model currently supports one active Wellhead source manifold.',
      actionableHint: 'Remove secondary wellheads or create a dedicated manifold tie-in.',
    });
  }

  // 2. Check Sink Node (Topside Arrival)
  const topsides = nodes.filter((n) => n.type === 'topside_arrival');
  if (topsides.length === 0) {
    errors.push({
      id: 'err_no_topside',
      severity: 'error',
      title: 'Missing Topside Arrival Sink',
      message: 'The network chain must terminate at a Topside Riser Arrival separator node.',
      actionableHint: 'Drag a Topside / Riser Arrival component to terminate the pipeline stream.',
    });
  } else if (topsides.length > 1) {
    errors.push({
      id: 'err_multiple_topsides',
      severity: 'error',
      title: 'Multiple Sinks Detected',
      message: 'Network cannot terminate in multiple Topsides without a subsea diverter valve.',
      actionableHint: 'Keep a single Topside arrival sink for this tieback string.',
    });
  }

  // 3. Check Pipeline Segments
  const pipeSegments = nodes.filter((n) => n.type === 'pipeline_segment');
  if (pipeSegments.length === 0) {
    errors.push({
      id: 'err_no_pipeline',
      severity: 'error',
      title: 'No Flowline Pipeline Segment',
      message: 'At least one subsea pipeline segment is required between the wellhead and topsides.',
      actionableHint: 'Add a Pipeline Segment from the palette to connect Wellhead to Topside.',
    });
  }

  // 4. Edge Validation & Port Compatibility
  edges.forEach((edge) => {
    const srcNode = nodeMap.get(edge.sourceNodeId);
    const tgtNode = nodeMap.get(edge.targetNodeId);

    if (!srcNode || !tgtNode) {
      errors.push({
        id: `err_orphan_edge_${edge.id}`,
        severity: 'error',
        title: 'Broken Connection Edge',
        message: 'A connection edge refers to a missing or deleted component node.',
      });
      return;
    }

    const srcPort = srcNode.ports.find((p) => p.id === edge.sourcePortId);
    const tgtPort = tgtNode.ports.find((p) => p.id === edge.targetPortId);

    if (srcPort && tgtPort) {
      const check = isPortConnectionValid(srcPort.type, tgtPort.type);
      if (!check.allowed) {
        errors.push({
          id: `err_incompat_${edge.id}`,
          nodeId: srcNode.id,
          severity: 'error',
          title: 'Unphysical Socket Snapping',
          message: check.reason || 'Socket types do not match mechanical specs.',
        });
      }
    }
  });

  // 5. Continuity and Path Finding (Graph Traversal)
  const chronologicalNodeIds: string[] = [];
  if (wellheads.length === 1 && topsides.length === 1) {
    const wellheadId = wellheads[0].id;
    const topsideId = topsides[0].id;

    // Build adjacency list for main flange hydraulic stream
    const adjList = new Map<string, string[]>();
    nodes.forEach((n) => adjList.set(n.id, []));

    edges.forEach((edge) => {
      if (edge.connectionType === 'flange_pipe') {
        const list = adjList.get(edge.sourceNodeId) || [];
        list.push(edge.targetNodeId);
        adjList.set(edge.sourceNodeId, list);
      }
    });

    // Detect loops / cycles and trace path from Wellhead to Topside
    const visited = new Set<string>();
    const recStack = new Set<string>();
    let hasCycle = false;

    function dfs(nodeId: string, path: string[]): boolean {
      visited.add(nodeId);
      recStack.add(nodeId);
      path.push(nodeId);

      if (nodeId === topsideId) {
        chronologicalNodeIds.push(...path);
        recStack.delete(nodeId);
        return true;
      }

      const neighbors = adjList.get(nodeId) || [];
      for (const nextId of neighbors) {
        if (!visited.has(nextId)) {
          if (dfs(nextId, [...path])) {
            recStack.delete(nodeId);
            return true;
          }
        } else if (recStack.has(nextId)) {
          hasCycle = true;
        }
      }

      recStack.delete(nodeId);
      return false;
    }

    const reachesTopside = dfs(wellheadId, []);

    if (hasCycle) {
      errors.push({
        id: 'err_cycle_detected',
        severity: 'error',
        title: 'Hydraulic Loop / Cycle Detected',
        message: 'Subsea production flowlines must be strictly acyclic. Recirculation loops without separator bypass are unphysical.',
        actionableHint: 'Remove looping edges to form a linear hydraulic chain.',
      });
    }

    if (!reachesTopside) {
      errors.push({
        id: 'err_broken_path',
        severity: 'error',
        title: 'Broken Hydraulic Stream',
        message: 'No continuous hydraulic connection exists from Subsea Wellhead to Topside Arrival.',
        actionableHint: 'Connect the out:flange of the pipeline to the in:flange of the topside riser.',
      });
    }
  }

  // 6. Parameter Boundary Verification
  nodes.forEach((n) => {
    if (n.type === 'wellhead') {
      const p = n.params as WellheadParams;
      if (p.flow_rate_bpd <= 0) {
        errors.push({
          id: `err_wh_rate_${n.id}`,
          nodeId: n.id,
          severity: 'error',
          title: 'Invalid Wellhead Flow Rate',
          message: 'Flow rate must be greater than 0 bpd.',
        });
      }
      if (p.inlet_pres_bar <= 0) {
        errors.push({
          id: `err_wh_pres_${n.id}`,
          nodeId: n.id,
          severity: 'error',
          title: 'Invalid Wellhead Pressure',
          message: 'Wellhead pressure must exceed 0 bar.',
        });
      }
    }

    if (n.type === 'pipeline_segment') {
      const p = n.params as PipeParams;
      if (p.inner_dia_m <= 0 || p.outer_dia_m <= p.inner_dia_m) {
        errors.push({
          id: `err_pipe_dia_${n.id}`,
          nodeId: n.id,
          severity: 'error',
          title: 'Invalid Pipe Diameters',
          message: 'Outer diameter must strictly exceed inner diameter.',
        });
      }
      if (p.length_m <= 0) {
        errors.push({
          id: `err_pipe_len_${n.id}`,
          nodeId: n.id,
          severity: 'error',
          title: 'Zero Length Flowline',
          message: 'Pipeline length must be greater than 0 meters.',
        });
      }
    }
  });

  // 7. Thermal & Flow Assurance Engineering Warnings (Yellow Linters)
  pipeSegments.forEach((seg, idx) => {
    const pipeParams = seg.params as PipeParams;
    const hasInsulation =
      seg.attachments?.some((a) => a.type === 'thermal_insulation') ||
      edges.some((e) => e.targetNodeId === seg.id && e.connectionType === 'insulation_snap');

    const hasChemical =
      seg.attachments?.some((a) => a.type === 'chemical_injection') ||
      edges.some((e) => e.targetNodeId === seg.id && e.connectionType === 'chemical_snap');

    if (pipeParams.seabed_temp_c <= 6.0 && !hasInsulation) {
      warnings.push({
        id: `warn_cold_seabed_no_insulation_${seg.id}`,
        nodeId: seg.id,
        severity: 'warning',
        title: `Deepwater Cold Zone Alert (#${idx + 1})`,
        message: `Pipeline segment operates at cold seabed temperature (${pipeParams.seabed_temp_c}°C) without thermal insulation. Severe rapid heat loss will occur.`,
        actionableHint: 'Snap a Polyurethane or Aerogel Thermal Insulation Jacket onto this pipe segment.',
        fixAction: 'snap_insulation',
      });
    }

    if (pipeParams.length_m >= 5000 && !hasChemical) {
      warnings.push({
        id: `warn_no_chemical_inhibitor_${seg.id}`,
        nodeId: seg.id,
        severity: 'warning',
        title: `No Hydrate Inhibitor Dosing (${(pipeParams.length_m / 1000).toFixed(1)} km)`,
        message: `Long subsea step-out without thermodynamic hydrate inhibitor (MEG/Methanol) creates high risk of gas hydrate plug formation.`,
        actionableHint: 'Attach a MEG Chemical Injection Quill to depress the hydrate dissociation curve.',
        fixAction: 'snap_chemical',
      });
    }
  });

  // 8. Pigging & Wax Alerts
  const pigStations = nodes.filter((n) => n.type === 'pig_station');
  if (pipeSegments.some((p) => (p.params as PipeParams).length_m > 10000) && pigStations.length === 0) {
    warnings.push({
      id: 'warn_no_pig_trap',
      severity: 'warning',
      title: 'No Pigging Facilities on Long Step-Out',
      message: 'Step-outs exceeding 10 km typically require pig launcher/receiver stations to scrape wax and manage liquid slugs.',
      actionableHint: 'Insert an inline Pig Launcher / Receiver station between segments.',
    });
  }

  // 9. Info suggestions
  if (pipeSegments.length > 0 && errors.length === 0) {
    infos.push({
      id: 'info_topology_sound',
      severity: 'info',
      title: 'Topological Chain Verified',
      message: 'All socket puzzle teeth snap correctly and hydraulic continuity is established.',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    infos,
    chronologicalNodeIds,
  };
}

/**
 * Serializes the interactive React canvas graph into the standardized
 * chronological JSON API payload specified in the Blueprint document (Page 3).
 */
export function serializeDAGToJSON(
  nodes: SubseaNode[],
  edges: SubseaEdge[],
  projectId: string = 'proj_subsea_tieback_01',
  workspaceId: string = 'ws_alpha_energy'
): SerializedDAGPayload {
  const nodeMap = new Map<string, SubseaNode>(nodes.map((n) => [n.id, n]));

  // Find start node (wellhead)
  const wellhead = nodes.find((n) => n.type === 'wellhead');
  const topside = nodes.find((n) => n.type === 'topside_arrival');

  const orderedNodes: SubseaNode[] = [];

  if (wellhead && topside) {
    // Traverse from wellhead along flange edges
    let currentId: string | null = wellhead.id;
    const visited = new Set<string>();

    while (currentId && !visited.has(currentId)) {
      visited.add(currentId);
      const node = nodeMap.get(currentId);
      if (node) {
        orderedNodes.push(node);
      }
      if (currentId === topside.id) break;

      // Find next connected pipe/flange node
      const nextEdge = edges.find(
        (e) => e.sourceNodeId === currentId && e.connectionType === 'flange_pipe'
      );
      currentId = nextEdge ? nextEdge.targetNodeId : null;
    }
  }

  // Fallback to all nodes if graph is partially disconnected
  const finalSequence = orderedNodes.length > 0 ? orderedNodes : nodes;

  const network_chain = finalSequence.map((node) => {
    // Gather attachments snapped to this node
    const attachments: any[] = [];

    // From node attachments property
    if (node.attachments && node.attachments.length > 0) {
      node.attachments.forEach((att) => {
        if (att.type === 'thermal_insulation') {
          const p = att.params as InsulationParams;
          attachments.push({
            type: 'thermal_insulation',
            material: p.material,
            thickness_mm: p.thickness_mm,
            thermal_k: p.thermal_k,
          });
        } else if (att.type === 'chemical_injection') {
          const p = att.params as ChemicalParams;
          attachments.push({
            type: 'chemical_injection',
            chemical: p.chemical,
            rate_kg_h: p.rate_kg_h,
            concentration_wt: p.concentration_wt,
          });
        }
      });
    }

    // Also look for auxiliary snap-on nodes connected via edges
    const snappedEdges = edges.filter(
      (e) => e.targetNodeId === node.id && (e.connectionType === 'insulation_snap' || e.connectionType === 'chemical_snap')
    );
    snappedEdges.forEach((e) => {
      const auxNode = nodeMap.get(e.sourceNodeId);
      if (auxNode?.type === 'thermal_insulation') {
        const p = auxNode.params as InsulationParams;
        if (!attachments.some((a) => a.type === 'thermal_insulation')) {
          attachments.push({
            type: 'thermal_insulation',
            material: p.material,
            thickness_mm: p.thickness_mm,
            thermal_k: p.thermal_k,
          });
        }
      } else if (auxNode?.type === 'chemical_injection') {
        const p = auxNode.params as ChemicalParams;
        if (!attachments.some((a) => a.type === 'chemical_injection')) {
          attachments.push({
            type: 'chemical_injection',
            chemical: p.chemical,
            rate_kg_h: p.rate_kg_h,
            concentration_wt: p.concentration_wt,
          });
        }
      }
    });

    return {
      node_id: node.id,
      type: node.type,
      params: { ...node.params },
      ...(attachments.length > 0 ? { attachments } : {}),
    };
  });

  return {
    project_id: projectId,
    workspace_id: workspaceId,
    canvas_version: '2.1',
    network_chain,
  };
}
