import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { EdgeProps, EdgeLabelRenderer, useReactFlow, useStore } from '@xyflow/react';
import styles from './DraggableEdge.module.css';
import { getPillEdgeParams } from './edgeUtils';

type Waypoint = { x: number; y: number };

const COLOURS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899',
  '#64748b', '#1e293b', '#94a3b8', '#f8fafc',
];

function defaultWaypoint(sx: number, sy: number, tx: number, ty: number): Waypoint {
  const dx = tx - sx;
  const dy = ty - sy;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  // Horizontal-exit: control point at (mid.x + exit*L, mid.y) → waypoint at (mid.x + exit*L/2, mid.y)
  const exit = dx >= 0 ? 1 : -1;
  return {
    x: (sx + tx) / 2 + exit * len * 0.2,
    y: (sy + ty) / 2,
  };
}

function quadPath(sx: number, sy: number, tx: number, ty: number, wp: Waypoint): string {
  const cpx = 2 * wp.x - 0.5 * sx - 0.5 * tx;
  const cpy = 2 * wp.y - 0.5 * sy - 0.5 * ty;
  return `M ${sx} ${sy} Q ${cpx} ${cpy} ${tx} ${ty}`;
}

const ShapeIcon = () => (
  <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
    <path d="M2 10 C5 2, 11 2, 14 10" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="8" cy="3" r="2" fill="white" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

const SingleWaypointEdge = ({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  selected,
  style,
  markerEnd,
  data,
}: EdgeProps) => {
  const { setEdges, screenToFlowPosition } = useReactFlow();
  const dragging = useRef(false);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [colourOpen, setColourOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Floating edge: connect from whichever side of each node is closest
  const { sourceNode, targetNode } = useStore((s) => ({
    sourceNode: s.nodeLookup.get(source),
    targetNode: s.nodeLookup.get(target),
  }));
  const float = sourceNode && targetNode ? getPillEdgeParams(sourceNode, targetNode) : null;
  const sx = float?.sx ?? sourceX;
  const sy = float?.sy ?? sourceY;
  const tx = float?.tx ?? targetX;
  const ty = float?.ty ?? targetY;

  const waypoint: Waypoint =
    (data?.waypoint as Waypoint) ?? defaultWaypoint(sx, sy, tx, ty);
  const handlesVisible = !!(data?.handlesVisible);
  const edgePath = quadPath(sx, sy, tx, ty, waypoint);

  useEffect(() => {
    if (!selected && handlesVisible) {
      setEdges((edges) =>
        edges.map((edge) =>
          edge.id === id ? { ...edge, data: { ...edge.data, handlesVisible: false } } : edge,
        ),
      );
    }
  }, [selected]);

  const closeMenu = useCallback(() => {
    setMenuPos(null);
    setColourOpen(false);
  }, []);

  const onContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuPos({ x: e.clientX, y: e.clientY });
    setColourOpen(false);
  }, []);

  useEffect(() => {
    if (!menuPos) return;
    const onDown = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) closeMenu();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeMenu(); };
    document.addEventListener('pointerdown', onDown, true);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown, true);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuPos, closeMenu]);

  const handleColour = useCallback((colour: string) => {
    setEdges((edges) =>
      edges.map((edge) =>
        edge.id === id ? { ...edge, style: { ...edge.style, stroke: colour } } : edge,
      ),
    );
    closeMenu();
  }, [id, setEdges, closeMenu]);

  const handleShape = useCallback(() => {
    setEdges((edges) =>
      edges.map((edge) =>
        edge.id === id ? { ...edge, data: { ...edge.data, handlesVisible: true } } : edge,
      ),
    );
    closeMenu();
  }, [id, setEdges, closeMenu]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    dragging.current = true;
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current) return;
      e.preventDefault();
      const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      setEdges((edges) =>
        edges.map((edge) =>
          edge.id !== id ? edge : { ...edge, data: { ...edge.data, waypoint: pos } },
        ),
      );
    },
    [id, setEdges, screenToFlowPosition],
  );

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    dragging.current = false;
    (e.target as Element).releasePointerCapture(e.pointerId);
  }, []);

  const applyStyle = useCallback((el: SVGPathElement | null) => {
    if (!el) return;
    const s = style as React.CSSProperties | undefined;
    el.style.stroke = (s?.stroke as string) ?? '';
    el.style.strokeWidth = s?.strokeWidth != null ? String(s.strokeWidth) : '';
    el.style.strokeDasharray = (s?.strokeDasharray as string) ?? '';
  }, [style]);

  return (
    <>
      <path
        ref={applyStyle}
        d={edgePath}
        fill="none"
        className="react-flow__edge-path"
        markerEnd={markerEnd}
        onContextMenu={onContextMenu}
      />
      {handlesVisible && (
        <EdgeLabelRenderer>
          <div
            className={`nodrag nopan ${styles.handle}`}
            ref={(el) => {
              if (el) {
                el.style.setProperty('--wp-x', `${waypoint.x}px`);
                el.style.setProperty('--wp-y', `${waypoint.y}px`);
              }
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          />
        </EdgeLabelRenderer>
      )}
      {menuPos && createPortal(
        <div
          ref={(el) => {
            if (el) {
              el.style.setProperty('--menu-x', `${menuPos.x}px`);
              el.style.setProperty('--menu-y', `${menuPos.y}px`);
            }
            (menuRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
          }}
          className={styles.menu}
        >
          <div className={styles['menu-item']} onClick={() => setColourOpen((o) => !o)}>
            <span className={styles['menu-icon']}>🎨</span>
            Colour
          </div>
          {colourOpen && (
            <div className={styles['colour-grid']}>
              {COLOURS.map((c) => (
                <button
                  key={c}
                  type="button"
                  title={c}
                  className={styles['colour-swatch']}
                  ref={(el) => { if (el) el.style.setProperty('--swatch-color', c); }}
                  onClick={(e) => { e.stopPropagation(); handleColour(c); }}
                />
              ))}
            </div>
          )}
          <div className={styles['menu-item']} onClick={handleShape}>
            <span className={styles['menu-icon']}><ShapeIcon /></span>
            Shape
          </div>
          <div className={styles['menu-divider']} />
          <div className={`${styles['menu-item']} ${styles['menu-item-disabled']}`}>
            Send to Back
          </div>
          <div className={`${styles['menu-item']} ${styles['menu-item-disabled']}`}>
            Bring to Front
          </div>
        </div>,
        document.body,
      )}
    </>
  );
};

export default SingleWaypointEdge;
