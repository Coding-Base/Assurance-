/**
 * Interactive CAD Subsea Flow Assurance Canvas Component
 * Manages pan/zoom viewport, subsea coordinate bathymetry grid,
 * puzzle socket magnetic snapping, dynamic thermodynamic pipe heat gradients,
 * hydrate risk hazard overlays, and synchronized profile hover HUDs.
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Trash2,
  RotateCcw,
  CircleDot,
  GitCommit,
  ShieldAlert,
  Droplet,
  Compass,
  Building,
  AlertCircle,
  Thermometer,
  Gauge,
  Flame,
  Snowflake,
  ShieldCheck,
  Move,
} from 'lucide-react';
import {
  SubseaNode,
  SubseaEdge,
  NodeType,
  SimulationResult,
  SimulationSpatialCell,
  WellheadParams,
  PipeParams,
  InsulationParams,
  ChemicalParams,
  PigParams,
  TopsideParams,
} from '../types/subsea';
import { isPortConnectionValid } from '../engine/dagLinter';

interface PipelineFlowCanvasProps {
  nodes: SubseaNode[];
  edges: SubseaEdge[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string | null) => void;
  onUpdateNodes: (nodes: SubseaNode[]) => void;
  onUpdateEdges: (edges: SubseaEdge[]) => void;
  onAddNodeAtPosition: (type: NodeType, pos: { x: number; y: number }) => void;
  simulationResult: SimulationResult | null;
  onTriggerSimulate: () => void;
}

export const PipelineFlowCanvas: React.FC<PipelineFlowCanvasProps> = ({
  nodes,
  edges,
  selectedNodeId,
  onSelectNode,
  onUpdateNodes,
  onUpdateEdges,
  onAddNodeAtPosition,
  simulationResult,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Pan & Zoom Viewport State
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 30, y: 60 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Node Dragging State
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Edge Connection Drawing State
  const [connectingSource, setConnectingSource] = useState<{
    nodeId: string;
    portId: string;
    portType: string;
    x: number;
    y: number;
  } | null>(null);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [connectionRejectMessage, setConnectionRejectMessage] = useState<string | null>(null);

  // Synchronized Profile Hover Scrubber State
  const [hoveredCell, setHoveredCell] = useState<{
    cell: SimulationSpatialCell;
    screenX: number;
    screenY: number;
  } | null>(null);

  // Handle Canvas Zoom
  const handleZoom = (delta: number) => {
    setZoom((prev) => Math.max(0.4, Math.min(2.0, Number((prev + delta).toFixed(2)))));
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 30, y: 60 });
  };

  // Drag over canvas for AssetPalette HTML5 drag & drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('application/subsea-node-type') as NodeType;
    if (!type) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Convert screen coordinates to canvas world coordinates
    const x = (e.clientX - rect.left - pan.x) / zoom;
    const y = (e.clientY - rect.top - pan.y) / zoom;

    onAddNodeAtPosition(type, { x: Math.round(x), y: Math.round(y) });
  };

  // Node drag mouse handlers
  const handleNodeMouseDown = (e: React.MouseEvent, node: SubseaNode) => {
    e.stopPropagation();
    onSelectNode(node.id);
    setDraggingNodeId(node.id);
    setDragOffset({
      x: e.clientX - (node.position.x * zoom + pan.x),
      y: e.clientY - (node.position.y * zoom + pan.y),
    });
  };

  // Canvas pan mouse handlers
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 && !connectingSource) {
      onSelectNode(null);
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      setCursorPos({
        x: (e.clientX - rect.left - pan.x) / zoom,
        y: (e.clientY - rect.top - pan.y) / zoom,
      });
    }

    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    } else if (draggingNodeId) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const newX = (e.clientX - dragOffset.x - pan.x) / zoom;
      const newY = (e.clientY - dragOffset.y - pan.y) / zoom;

      onUpdateNodes(
        nodes.map((n) =>
          n.id === draggingNodeId ? { ...n, position: { x: Math.round(newX), y: Math.round(newY) } } : n
        )
      );
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggingNodeId(null);
    if (connectingSource) {
      setConnectingSource(null);
    }
  };

  // Start connecting an edge from a port
  const handlePortMouseDown = (
    e: React.MouseEvent,
    node: SubseaNode,
    portId: string,
    portType: string,
    portX: number,
    portY: number
  ) => {
    e.stopPropagation();
    setConnectingSource({
      nodeId: node.id,
      portId,
      portType,
      x: portX,
      y: portY,
    });
    setConnectionRejectMessage(null);
  };

  // Complete connection on target port with puzzle compatibility check
  const handlePortMouseUp = (
    e: React.MouseEvent,
    targetNode: SubseaNode,
    targetPortId: string,
    targetPortType: string
  ) => {
    e.stopPropagation();
    if (!connectingSource) return;

    if (connectingSource.nodeId === targetNode.id) {
      setConnectionRejectMessage('Cannot connect port to the same equipment block.');
      setConnectingSource(null);
      return;
    }

    // Verify port socket compatibility
    const validation = isPortConnectionValid(connectingSource.portType, targetPortType);
    if (!validation.allowed) {
      setConnectionRejectMessage(validation.reason || 'Incompatible socket connection.');
      setTimeout(() => setConnectionRejectMessage(null), 4000);
      setConnectingSource(null);
      return;
    }

    // Determine edge type
    let connType: 'flange_pipe' | 'insulation_snap' | 'chemical_snap' = 'flange_pipe';
    if (connectingSource.portType.includes('insulation') || targetPortType.includes('insulation')) {
      connType = 'insulation_snap';
    } else if (connectingSource.portType.includes('chemical') || targetPortType.includes('chemical')) {
      connType = 'chemical_snap';
    }

    // Check if edge already exists
    const exists = edges.some(
      (edge) =>
        (edge.sourceNodeId === connectingSource.nodeId && edge.targetNodeId === targetNode.id) ||
        (edge.sourceNodeId === targetNode.id && edge.targetNodeId === connectingSource.nodeId)
    );

    if (!exists) {
      const newEdge: SubseaEdge = {
        id: `e_${Date.now()}`,
        sourceNodeId: connectingSource.nodeId,
        sourcePortId: connectingSource.portId,
        targetNodeId: targetNode.id,
        targetPortId,
        connectionType: connType,
      };
      onUpdateEdges([...edges, newEdge]);
    }

    setConnectingSource(null);
  };

  // Delete selected node
  const handleDeleteSelected = () => {
    if (!selectedNodeId) return;
    onUpdateNodes(nodes.filter((n) => n.id !== selectedNodeId));
    onUpdateEdges(
      edges.filter((e) => e.sourceNodeId !== selectedNodeId && e.targetNodeId !== selectedNodeId)
    );
    onSelectNode(null);
  };

  // Helper to get absolute center coordinates of ports
  const getPortCoordinates = (node: SubseaNode, portId: string) => {
    const isPipe = node.type === 'pipeline_segment';
    const width = isPipe ? 290 : 200;
    const height = isPipe ? 140 : 120;

    const portIdx = node.ports.findIndex((p) => p.id === portId);
    const port = node.ports[portIdx];

    if (!port) return { x: node.position.x + width / 2, y: node.position.y + height / 2 };

    if (port.type === 'out:flange') {
      return { x: node.position.x + width, y: node.position.y + height / 2 };
    }
    if (port.type === 'in:flange') {
      return { x: node.position.x, y: node.position.y + height / 2 };
    }
    if (port.type === 'slot:insulation') {
      return { x: node.position.x + width * 0.35, y: node.position.y };
    }
    if (port.type === 'slot:chemical') {
      return { x: node.position.x + width * 0.7, y: node.position.y };
    }
    if (port.type === 'snap:jacket' || port.type === 'snap:injection') {
      return { x: node.position.x + width / 2, y: node.position.y + height };
    }

    return { x: node.position.x + width / 2, y: node.position.y + height / 2 };
  };

  // Calculate dynamic thermodynamic pipe gradient colors
  const getTemperatureColor = (tempC: number) => {
    if (tempC >= 45) return '#ef4444'; // Red (hot wellhead)
    if (tempC >= 25) return '#f59e0b'; // Amber
    if (tempC >= 15) return '#10b981'; // Green (safe arrival)
    if (tempC >= 8) return '#06b6d4';  // Cyan
    return '#3b82f6';                  // Freezing Blue (hydrate risk zone)
  };

  return (
    <div
      ref={containerRef}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      className="relative flex-1 h-full bg-slate-950 overflow-hidden select-none cursor-default"
      style={{
        backgroundImage: `
          radial-gradient(circle at 50% 50%, rgba(14, 116, 144, 0.08) 0%, transparent 80%),
          linear-gradient(to right, rgba(51, 65, 85, 0.15) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(51, 65, 85, 0.15) 1px, transparent 1px)
        `,
        backgroundSize: `100% 100%, ${30 * zoom}px ${30 * zoom}px, ${30 * zoom}px ${30 * zoom}px`,
        backgroundPosition: `center, ${pan.x}px ${pan.y}px, ${pan.x}px ${pan.y}px`,
      }}
    >
      {/* Subsea Water Depth Bathymetry Indicator */}
      <div className="absolute top-3 left-4 pointer-events-none z-10 flex items-center space-x-3 text-xs font-mono text-slate-400">
        <div className="flex items-center space-x-1.5 bg-slate-900/80 px-2.5 py-1 rounded-md border border-slate-800">
          <span className="text-cyan-400 font-semibold">Subsea Bathymetry:</span>
          <span>-1,450 m Water Depth (Ultra-Deepwater)</span>
        </div>
        <div className="flex items-center space-x-1.5 bg-slate-900/80 px-2.5 py-1 rounded-md border border-slate-800">
          <span className="text-slate-400">Grid Scale:</span>
          <span>1 grid = 100 m cell</span>
        </div>
      </div>

      {/* Connection Incompatibility Rejection Banner */}
      {connectionRejectMessage && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-40 bg-rose-950/95 border border-rose-500/80 text-rose-200 px-4 py-2.5 rounded-xl shadow-2xl flex items-center space-x-2 text-xs animate-bounce">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{connectionRejectMessage}</span>
        </div>
      )}

      {/* Canvas Viewport Toolbar Controls */}
      <div className="absolute bottom-4 left-4 z-20 flex items-center space-x-1.5 bg-slate-900/90 border border-slate-800 p-1.5 rounded-xl shadow-xl backdrop-blur-sm">
        <button
          onClick={() => handleZoom(0.1)}
          title="Zoom In"
          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => handleZoom(-0.1)}
          title="Zoom Out"
          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={resetView}
          title="Reset View"
          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        <div className="w-[1px] h-4 bg-slate-800" />
        <span className="text-[11px] font-mono text-slate-400 px-1">
          {Math.round(zoom * 100)}%
        </span>
        {selectedNodeId && (
          <>
            <div className="w-[1px] h-4 bg-slate-800" />
            <button
              onClick={handleDeleteSelected}
              title="Delete Selected Component"
              className="p-1.5 rounded-lg hover:bg-rose-950/80 text-rose-400 hover:text-rose-200 transition"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      {/* SVG Canvas for Connection Edges and Thermodynamic Gradient Splines */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
        }}
      >
        <defs>
          <linearGradient id="flowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="40%" stopColor="#f59e0b" />
            <stop offset="70%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>

          <pattern id="hazardStripes" width="20" height="20" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="10" height="20" fill="#e11d48" />
            <rect x="10" width="10" height="20" fill="#0f172a" />
          </pattern>
        </defs>

        {/* Existing Connection Edges */}
        {edges.map((edge) => {
          const srcNode = nodes.find((n) => n.id === edge.sourceNodeId);
          const tgtNode = nodes.find((n) => n.id === edge.targetNodeId);
          if (!srcNode || !tgtNode) return null;

          const p1 = getPortCoordinates(srcNode, edge.sourcePortId);
          const p2 = getPortCoordinates(tgtNode, edge.targetPortId);

          const dx = Math.abs(p2.x - p1.x) * 0.5;
          const pathD = `M ${p1.x} ${p1.y} C ${p1.x + dx} ${p1.y}, ${p2.x - dx} ${p2.y}, ${p2.x} ${p2.y}`;

          const isFlange = edge.connectionType === 'flange_pipe';
          const isInsulation = edge.connectionType === 'insulation_snap';
          const isChemical = edge.connectionType === 'chemical_snap';

          return (
            <g key={edge.id} className="pointer-events-auto cursor-pointer">
              {/* Outer stroke shadow */}
              <path
                d={pathD}
                fill="none"
                stroke={
                  isInsulation
                    ? 'rgba(249, 115, 22, 0.4)'
                    : isChemical
                    ? 'rgba(16, 185, 129, 0.4)'
                    : simulationResult
                    ? 'url(#flowGradient)'
                    : '#0284c7'
                }
                strokeWidth={isFlange ? 7 : 3}
                strokeLinecap="round"
                className="transition-all"
              />

              {/* Inner animated dashed fluid flow */}
              {isFlange && (
                <path
                  d={pathD}
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="2"
                  strokeDasharray="6 8"
                  className="animate-flow-dash opacity-75"
                />
              )}

              {/* Auxiliary attachment dashed indicator */}
              {(isInsulation || isChemical) && (
                <path
                  d={pathD}
                  fill="none"
                  stroke={isInsulation ? '#fb923c' : '#34d399'}
                  strokeWidth="2"
                  strokeDasharray="4 4"
                />
              )}
            </g>
          );
        })}

        {/* Dynamic Edge being drawn */}
        {connectingSource && (
          <path
            d={`M ${connectingSource.x} ${connectingSource.y} C ${
              connectingSource.x + 50
            } ${connectingSource.y}, ${cursorPos.x - 50} ${cursorPos.y}, ${cursorPos.x} ${cursorPos.y}`}
            fill="none"
            stroke="#38bdf8"
            strokeWidth="3"
            strokeDasharray="5 5"
            className="animate-pulse"
          />
        )}
      </svg>

      {/* Rendered Canvas Puzzle Nodes */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
        }}
      >
        {nodes.map((node) => {
          const isSelected = selectedNodeId === node.id;
          const isPipe = node.type === 'pipeline_segment';
          const isWellhead = node.type === 'wellhead';
          const isTopside = node.type === 'topside_arrival';
          const isInsulation = node.type === 'thermal_insulation';
          const isChemical = node.type === 'chemical_injection';
          const isPig = node.type === 'pig_station';

          // Check if pipe has attachments
          const hasInsAttachment =
            isPipe &&
            (node.attachments?.some((a) => a.type === 'thermal_insulation') ||
              edges.some((e) => e.targetNodeId === node.id && e.connectionType === 'insulation_snap'));
          const hasChemAttachment =
            isPipe &&
            (node.attachments?.some((a) => a.type === 'chemical_injection') ||
              edges.some((e) => e.targetNodeId === node.id && e.connectionType === 'chemical_snap'));

          return (
            <div
              key={node.id}
              onMouseDown={(e) => handleNodeMouseDown(e, node)}
              className={`absolute pointer-events-auto transition-shadow rounded-2xl select-none cursor-move ${
                isSelected
                  ? 'ring-2 ring-cyan-400 shadow-2xl shadow-cyan-900/50'
                  : 'hover:ring-1 hover:ring-slate-700 shadow-xl'
              } ${
                isPipe
                  ? 'w-[320px] bg-slate-900/95 border border-cyan-800/80'
                  : isWellhead
                  ? 'w-[230px] bg-slate-900/95 border border-amber-600/70'
                  : isTopside
                  ? 'w-[230px] bg-slate-900/95 border border-blue-600/70'
                  : isPig
                  ? 'w-[220px] bg-slate-900/95 border border-purple-600/70'
                  : isInsulation
                  ? 'w-[220px] bg-orange-950/90 border border-orange-500/70'
                  : 'w-[220px] bg-emerald-950/90 border border-emerald-500/70'
              }`}
              style={{
                left: `${node.position.x}px`,
                top: `${node.position.y}px`,
              }}
            >
              {/* Node Header */}
              <div className="p-3 pb-2 border-b border-slate-800/70 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div
                    className={`p-1.5 rounded-lg ${
                      isWellhead
                        ? 'bg-amber-950 text-amber-400'
                        : isPipe
                        ? 'bg-cyan-950 text-cyan-400'
                        : isTopside
                        ? 'bg-blue-950 text-blue-400'
                        : isPig
                        ? 'bg-purple-950 text-purple-400'
                        : isInsulation
                        ? 'bg-orange-950 text-orange-400'
                        : 'bg-emerald-950 text-emerald-400'
                    }`}
                  >
                    {isWellhead && <CircleDot className="w-4 h-4" />}
                    {isPipe && <GitCommit className="w-4 h-4" />}
                    {isTopside && <Building className="w-4 h-4" />}
                    {isPig && <Compass className="w-4 h-4" />}
                    {isInsulation && <ShieldAlert className="w-4 h-4" />}
                    {isChemical && <Droplet className="w-4 h-4" />}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white leading-tight">{node.name}</h4>
                    <span className="text-[10px] text-slate-400 font-mono">
                      ID: {node.id.split('_').slice(1).join('_')}
                    </span>
                  </div>
                </div>

                {/* Status Indicator */}
                {isPipe && simulationResult && (
                  <span
                    className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold ${
                      simulationResult.summary.is_hydrate_plug_predicted
                        ? 'bg-rose-950 text-rose-300 border border-rose-800 animate-pulse'
                        : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    }`}
                  >
                    {simulationResult.summary.is_hydrate_plug_predicted ? 'HYDRATE HAZARD' : 'THERMAL OK'}
                  </span>
                )}
              </div>

              {/* Node Body Details */}
              <div className="p-3 text-xs space-y-2">
                {/* Wellhead Specific Readouts */}
                {isWellhead && (
                  <div className="grid grid-cols-2 gap-1.5 font-mono text-[11px] text-slate-300">
                    <div className="bg-slate-950/70 p-1.5 rounded border border-slate-800">
                      <span className="text-slate-500 block text-[9px]">FLOW RATE</span>
                      <span>{(node.params as WellheadParams).flow_rate_bpd?.toLocaleString()} bpd</span>
                    </div>
                    <div className="bg-slate-950/70 p-1.5 rounded border border-slate-800">
                      <span className="text-slate-500 block text-[9px]">PRESSURE</span>
                      <span>{(node.params as WellheadParams).inlet_pres_bar} bar</span>
                    </div>
                    <div className="bg-slate-950/70 p-1.5 rounded border border-slate-800">
                      <span className="text-slate-500 block text-[9px]">INLET TEMP</span>
                      <span className="text-amber-400">{(node.params as WellheadParams).inlet_temp_c}°C</span>
                    </div>
                    <div className="bg-slate-950/70 p-1.5 rounded border border-slate-800">
                      <span className="text-slate-500 block text-[9px]">WATER CUT</span>
                      <span>{Math.round(((node.params as WellheadParams).water_cut || 0) * 100)}%</span>
                    </div>
                  </div>
                )}

                {/* Pipeline Segment Body with Thermodynamic Colors & Attachment Badges */}
                {isPipe && (
                  <div className="space-y-2">
                    {/* Visual Pipe Graphic with Heat Gradient & Scrubber */}
                    <div
                      className="relative h-9 rounded-lg bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-between px-2 cursor-crosshair group"
                      style={{
                        background: simulationResult
                          ? 'linear-gradient(to right, #ef4444 0%, #f59e0b 35%, #10b981 70%, #06b6d4 100%)'
                          : 'linear-gradient(to right, #0284c7 0%, #0369a1 100%)',
                      }}
                      onMouseMove={(e) => {
                        if (!simulationResult) return;
                        const rect = e.currentTarget.getBoundingClientRect();
                        const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                        const cellIdx = Math.floor(pct * (simulationResult.spatial_profile.length - 1));
                        const cell = simulationResult.spatial_profile[cellIdx];
                        if (cell) {
                          setHoveredCell({
                            cell,
                            screenX: e.clientX,
                            screenY: e.clientY - 70,
                          });
                        }
                      }}
                      onMouseLeave={() => setHoveredCell(null)}
                    >
                      {/* Hydrate Risk Hazard Stripe Overlay if unmitigated or cold */}
                      {simulationResult?.summary.is_hydrate_plug_predicted && (
                        <div className="absolute right-0 top-0 bottom-0 w-2/5 bg-[repeating-linear-gradient(45deg,#e11d48,#e11d48_10px,#0f172a_10px,#0f172a_20px)] opacity-85 animate-pulse" />
                      )}

                      <span className="text-[10px] font-mono font-bold text-white drop-shadow-md z-10">
                        0.0 km
                      </span>
                      <span className="text-[10px] font-mono font-bold text-white/90 drop-shadow-md z-10">
                        {((node.params as PipeParams).length_m / 1000).toFixed(1)} km Step-Out
                      </span>
                    </div>

                    {/* Pipe Dimensions */}
                    <div className="grid grid-cols-2 gap-1.5 font-mono text-[11px] text-slate-300">
                      <div className="bg-slate-950/70 p-1 rounded border border-slate-800 flex justify-between">
                        <span className="text-slate-500 text-[10px]">ID:</span>
                        <span>{((node.params as PipeParams).inner_dia_m * 1000).toFixed(0)} mm</span>
                      </div>
                      <div className="bg-slate-950/70 p-1 rounded border border-slate-800 flex justify-between">
                        <span className="text-slate-500 text-[10px]">Seabed:</span>
                        <span className="text-cyan-400">{(node.params as PipeParams).seabed_temp_c}°C</span>
                      </div>
                    </div>

                    {/* Attached Snap-On Slots / Badges */}
                    <div className="flex items-center space-x-1.5 pt-1">
                      {hasInsAttachment ? (
                        <div className="flex items-center space-x-1 px-2 py-0.5 rounded bg-orange-950/80 border border-orange-500/60 text-[10px] font-mono text-orange-300">
                          <ShieldCheck className="w-3 h-3 text-orange-400" />
                          <span>50mm PU Jacket Attached</span>
                        </div>
                      ) : (
                        <div className="px-2 py-0.5 rounded bg-slate-950 border border-dashed border-orange-600/40 text-[10px] font-mono text-orange-400/80">
                          Jacket Slot Empty
                        </div>
                      )}

                      {hasChemAttachment ? (
                        <div className="flex items-center space-x-1 px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/60 text-[10px] font-mono text-emerald-300">
                          <Droplet className="w-3 h-3 text-emerald-400" />
                          <span>25 wt% MEG Quill</span>
                        </div>
                      ) : (
                        <div className="px-2 py-0.5 rounded bg-slate-950 border border-dashed border-emerald-600/40 text-[10px] font-mono text-emerald-400/80">
                          Quill Slot Empty
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Topside Arrival Readouts */}
                {isTopside && (
                  <div className="space-y-1.5 font-mono text-[11px] text-slate-300">
                    <div className="bg-slate-950/70 p-1.5 rounded border border-slate-800 flex justify-between">
                      <span className="text-slate-500 text-[10px]">SEPARATOR P:</span>
                      <span>{(node.params as TopsideParams).target_separator_p_bar} bar</span>
                    </div>
                    {simulationResult && (
                      <div className="bg-slate-950/70 p-1.5 rounded border border-slate-800 flex justify-between items-center">
                        <span className="text-slate-500 text-[10px]">ARRIVAL TEMP:</span>
                        <span
                          className={`font-bold ${
                            simulationResult.summary.arrival_temp_c >= 14.0
                              ? 'text-emerald-400'
                              : 'text-rose-400'
                          }`}
                        >
                          {simulationResult.summary.arrival_temp_c}°C
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Thermal Insulation Sleeve Readouts */}
                {isInsulation && (
                  <div className="space-y-1 font-mono text-[11px] text-slate-200">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-orange-300">Material:</span>
                      <span className="uppercase">{(node.params as InsulationParams).material}</span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-orange-300">Thickness:</span>
                      <span>{(node.params as InsulationParams).thickness_mm} mm</span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-orange-300">k factor:</span>
                      <span>{(node.params as InsulationParams).thermal_k} W/m·K</span>
                    </div>
                  </div>
                )}

                {/* Chemical Quill Readouts */}
                {isChemical && (
                  <div className="space-y-1 font-mono text-[11px] text-slate-200">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-emerald-300">Inhibitor:</span>
                      <span className="uppercase">{(node.params as ChemicalParams).chemical}</span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-emerald-300">Dosing Rate:</span>
                      <span>{(node.params as ChemicalParams).rate_kg_h} kg/h</span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-emerald-300">Concentration:</span>
                      <span>{(node.params as ChemicalParams).concentration_wt} wt%</span>
                    </div>
                  </div>
                )}

                {/* Pig Trap Readouts */}
                {isPig && (
                  <div className="space-y-1 font-mono text-[11px] text-slate-200">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-purple-300">Pig Type:</span>
                      <span className="uppercase">{(node.params as PigParams).pig_type}</span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-purple-300">Frequency:</span>
                      <span>{(node.params as PigParams).cycle_days} Days</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Socket Ports with Puzzle Snapping Teeth Visualizers */}
              {node.ports.map((port) => {
                const isOut = port.type === 'out:flange';
                const isIn = port.type === 'in:flange';
                const isSlot = port.type.startsWith('slot:');
                const isSnap = port.type.startsWith('snap:');

                let portColor = '#0284c7'; // Flange blue
                if (port.type.includes('insulation') || port.type.includes('jacket'))
                  portColor = '#ea580c'; // Orange
                if (port.type.includes('chemical') || port.type.includes('injection'))
                  portColor = '#10b981'; // Green

                let portPosStyle: React.CSSProperties = {};
                if (isOut) {
                  portPosStyle = { right: '-10px', top: '50%', transform: 'translateY(-50%)' };
                } else if (isIn) {
                  portPosStyle = { left: '-10px', top: '50%', transform: 'translateY(-50%)' };
                } else if (port.type === 'slot:insulation') {
                  portPosStyle = { left: '35%', top: '-9px' };
                } else if (port.type === 'slot:chemical') {
                  portPosStyle = { left: '70%', top: '-9px' };
                } else if (isSnap) {
                  portPosStyle = { left: '50%', bottom: '-9px', transform: 'translateX(-50%)' };
                }

                return (
                  <div
                    key={port.id}
                    title={`${port.label} (${port.type})`}
                    onMouseDown={(e) => {
                      const coords = getPortCoordinates(node, port.id);
                      handlePortMouseDown(e, node, port.id, port.type, coords.x, coords.y);
                    }}
                    onMouseUp={(e) => handlePortMouseUp(e, node, port.id, port.type)}
                    className="absolute w-5 h-5 rounded-full border-2 border-slate-950 flex items-center justify-center cursor-pointer hover:scale-125 transition-transform z-30 group shadow-md"
                    style={{
                      ...portPosStyle,
                      backgroundColor: portColor,
                    }}
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-white opacity-90" />
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Synchronized Profile Hover Scrubber Tooltip HUD */}
      {hoveredCell && (
        <div
          className="fixed pointer-events-none z-50 bg-slate-900/95 border border-cyan-500/80 rounded-xl px-3.5 py-2 shadow-2xl backdrop-blur-md text-xs font-mono text-slate-100 flex items-center space-x-3 -translate-x-1/2"
          style={{
            left: `${hoveredCell.screenX}px`,
            top: `${hoveredCell.screenY}px`,
          }}
        >
          <div className="flex items-center space-x-1 text-cyan-400 font-bold">
            <span>Distance:</span>
            <span>{hoveredCell.cell.distance_km} km</span>
          </div>
          <span className="text-slate-600">|</span>
          <div className="flex items-center space-x-1 text-slate-300">
            <span>Press:</span>
            <span>{hoveredCell.cell.pressure_bar} bar</span>
          </div>
          <span className="text-slate-600">|</span>
          <div className="flex items-center space-x-1 text-amber-300">
            <span>Fluid Temp:</span>
            <span>{hoveredCell.cell.temp_c} °C</span>
          </div>
          <span className="text-slate-600">|</span>
          <div className="flex items-center space-x-1 text-sky-300">
            <span>Hydrate Temp:</span>
            <span>{hoveredCell.cell.hydrate_depressed_temp_c} °C</span>
          </div>
          <span className="text-slate-600">|</span>
          <div
            className={`flex items-center space-x-1 font-bold ${
              hoveredCell.cell.is_hydrate_risk ? 'text-rose-400' : 'text-emerald-400'
            }`}
          >
            <span>Margin:</span>
            <span>
              {hoveredCell.cell.hydrate_margin_c > 0 ? '+' : ''}
              {hoveredCell.cell.hydrate_margin_c} °C
            </span>
            <span className="text-[10px] uppercase">
              ({hoveredCell.cell.is_hydrate_risk ? 'HAZARD' : 'SAFE'})
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
