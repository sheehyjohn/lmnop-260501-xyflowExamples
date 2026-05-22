import React, { useCallback, useState } from 'react';
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

const EDGE_COLOR = '#ffffff';
const NODE_WRAP = { background: 'transparent', border: 'none', padding: 0 };

const h1Node = (id: string, label: string, x: number, y: number): Node => ({
  id, type: 'mindmap',
  data: { label, color: '#60a5fa', fontWeight: 700, fontSize: 15 },
  position: { x, y }, style: NODE_WRAP,
});

const h2Node = (id: string, label: string, x: number, y: number): Node => ({
  id, type: 'mindmap',
  data: { label, color: '#f472b6' },
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
  // h1 -> h2 (2-point cubic bezier — floating, connects from nearest boundary)
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
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      edgeTypes={edgeTypes}
      nodeTypes={nodeTypes}
      onPaneContextMenu={onPaneContextMenu}
      snapToGrid={true}
      fitView
      colorMode="dark"
    >
      <Controls />
      <Background color="#27272a" variant={BackgroundVariant.Dots} gap={20} size={1} />
      <CanvasMenu menuPos={canvasMenuPos} onClose={closeCanvasMenu} />
    </ReactFlow>
  );
};

export default EdgesFlow;
