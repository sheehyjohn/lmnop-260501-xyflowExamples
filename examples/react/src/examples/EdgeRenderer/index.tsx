import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  addEdge,
  Connection,
  Edge,
  EdgeTypes,
  Node,
  NodeTypes,
  useEdgesState,
  useNodesState,
} from '@xyflow/react';

import DraggableEdge from './DraggableEdge';
import SingleWaypointEdge from './SingleWaypointEdge';
import MindmapNode from './MindmapNode';
import CanvasMenu from './CanvasMenu';
import styles from './index.module.css';

const EDGE_COLOR = '#ffffff';
const NODE_WRAP = { background: 'transparent', border: 'none', padding: 0 };

const h1Node = (id: string, label: string, x: number, y: number): Node => ({
  id, type: 'mindmap',
  data: { label, color: '#60a5fa', fontWeight: 700, fontSize: 23, paddingV: 9, paddingH: 27, lineHeight: 30 },
  position: { x, y }, style: NODE_WRAP,
});

const h2Node = (id: string, label: string, x: number, y: number): Node => ({
  id, type: 'mindmap',
  data: { label, color: '#f472b6', fontSize: 16, paddingV: 8, paddingH: 23, lineHeight: 25 },
  position: { x, y }, style: NODE_WRAP,
});

const h3Node = (id: string, label: string, x: number, y: number): Node => ({
  id, type: 'mindmap',
  data: { label, color: '#34d399', fontSize: 12 },
  position: { x, y }, style: NODE_WRAP,
});

const h1Edge = (id: string, source: string, target: string): Edge => ({
  id, source, target, type: 'draggable',
  style: { strokeWidth: 5, stroke: EDGE_COLOR },
});

const h2Edge = (id: string, source: string, target: string): Edge => ({
  id, source, target, type: 'single',
  style: { strokeWidth: 3, stroke: EDGE_COLOR },
});

const initialNodes: Node[] = [
  // h1 - central root
  h1Node('h1', 'lmnop', 460, 270),

  // h2 - four branches in quadrants
  h2Node('writing',     'Writing',     130,  60),
  h2Node('research',    'Research',    810,  60),
  h2Node('design',      'Design',      810, 460),
  h2Node('engineering', 'Engineering', 130, 460),

  // h3 - Writing
  h3Node('morning-pages', 'Morning Pages', -80,  -80),
  h3Node('weekly-review', 'Weekly Review', 130, -140),

  // h3 - Research
  h3Node('reading-list', 'Reading List', 1050,  -80),
  h3Node('bookmarks',    'Bookmarks',    1060,  120),

  // h3 - Design
  h3Node('ui-concepts', 'UI Concepts', 1060, 400),
  h3Node('typography',  'Typography',  1060, 540),

  // h3 - Engineering
  h3Node('react-flow', 'React Flow', -80, 400),
  h3Node('tauri',      'Tauri',      -80, 540),
];

const initialEdges: Edge[] = [
  // h1 -> h2 (2-point cubic bezier - floating, connects from nearest boundary)
  h1Edge('h1-writing',     'h1', 'writing'),
  h1Edge('h1-research',    'h1', 'research'),
  h1Edge('h1-design',      'h1', 'design'),
  h1Edge('h1-engineering', 'h1', 'engineering'),

  // Writing -> h3
  h2Edge('writing-morning', 'writing', 'morning-pages'),
  h2Edge('writing-weekly',  'writing', 'weekly-review'),

  // Research -> h3
  h2Edge('research-reading',    'research', 'reading-list'),
  h2Edge('research-bookmarks',  'research', 'bookmarks'),

  // Design -> h3
  h2Edge('design-ui',         'design', 'ui-concepts'),
  h2Edge('design-typography', 'design', 'typography'),

  // Engineering -> h3
  h2Edge('engineering-reactflow', 'engineering', 'react-flow'),
  h2Edge('engineering-tauri',     'engineering', 'tauri'),
];

const edgeTypes: EdgeTypes = {
  draggable: DraggableEdge,
  single: SingleWaypointEdge,
};

const nodeTypes: NodeTypes = {
  mindmap: MindmapNode,
};

const EdgesFlow = () => {
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [canvasMenuPos, setCanvasMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [stylusMode, setStylusMode] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const stylusModeRef = useRef(stylusMode);

  useEffect(() => { stylusModeRef.current = stylusMode; }, [stylusMode]);

  // Keep canvas pixel dimensions matching its CSS display size
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(() => {
      const ctx = canvas.getContext('2d');
      // Preserve drawn content across resize by saving/restoring image data
      const img = ctx?.getImageData(0, 0, canvas.width, canvas.height);
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      if (img) ctx?.putImageData(img, 0, 0);
    });
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  // Intercept pen pointer events in capture phase so React Flow never sees them
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    const onDown = (e: PointerEvent) => {
      if (!stylusModeRef.current || e.pointerType !== 'pen') return;
      e.preventDefault();
      e.stopPropagation();
      el.setPointerCapture(e.pointerId);
      isDrawing.current = true;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!ctx || !canvas) return;
      const rect = canvas.getBoundingClientRect();
      ctx.beginPath();
      ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    };

    const onMove = (e: PointerEvent) => {
      if (!stylusModeRef.current || e.pointerType !== 'pen' || !isDrawing.current) return;
      e.preventDefault();
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!ctx || !canvas) return;
      const rect = canvas.getBoundingClientRect();
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
      ctx.stroke();
    };

    const onUp = (e: PointerEvent) => {
      if (!stylusModeRef.current || e.pointerType !== 'pen') return;
      isDrawing.current = false;
    };

    el.addEventListener('pointerdown', onDown, true);
    el.addEventListener('pointermove', onMove, true);
    el.addEventListener('pointerup', onUp, true);
    return () => {
      el.removeEventListener('pointerdown', onDown, true);
      el.removeEventListener('pointermove', onMove, true);
      el.removeEventListener('pointerup', onUp, true);
    };
  }, []);

  const onConnect = useCallback(
    (params: Connection | Edge) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  const onPaneContextMenu = useCallback((e: React.MouseEvent | MouseEvent) => {
    e.preventDefault();
    const ce = e as React.MouseEvent;
    setCanvasMenuPos({ x: ce.clientX, y: ce.clientY });
  }, []);

  const closeCanvasMenu = useCallback(() => setCanvasMenuPos(null), []);

  return (
    <div ref={wrapperRef} className={styles.wrapper}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        edgeTypes={edgeTypes}
        nodeTypes={nodeTypes}
        onPaneContextMenu={onPaneContextMenu}
        panOnDrag={[0]}
        snapToGrid={true}
        fitView
        colorMode="dark"
      >
        <Controls />
        <Background color="#27272a" variant={BackgroundVariant.Dots} gap={20} size={1} />
        <CanvasMenu
          menuPos={canvasMenuPos}
          onClose={closeCanvasMenu}
          stylusMode={stylusMode}
          onToggleStylus={() => setStylusMode((m) => !m)}
        />
      </ReactFlow>
      <canvas ref={canvasRef} className={styles['stylus-canvas']} />
    </div>
  );
};

export default EdgesFlow;
