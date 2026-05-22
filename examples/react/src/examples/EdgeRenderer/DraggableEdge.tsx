import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { EdgeProps, EdgeLabelRenderer, useReactFlow } from '@xyflow/react';
import styles from './DraggableEdge.module.css';

type Waypoint = { x: number; y: number };
type Waypoints = [Waypoint, Waypoint];

const COLOURS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899',
  '#64748b', '#1e293b', '#94a3b8', '#f8fafc',
];

function defaultWaypoints(sx: number, sy: number, tx: number, ty: number): Waypoints {
  return [
    { x: sx + (tx - sx) / 3, y: sy + (ty - sy) / 3 },
    { x: sx + (tx - sx) * (2 / 3), y: sy + (ty - sy) * (2 / 3) },
  ];
}

function cubicPath(sx: number, sy: number, tx: number, ty: number, [wp1, wp2]: Waypoints): string {
  const ax = (27 * wp1.x - 8 * sx - tx) / 6;
  const ay = (27 * wp1.y - 8 * sy - ty) / 6;
  const bx = (27 * wp2.x - sx - 8 * tx) / 6;
  const by = (27 * wp2.y - sy - 8 * ty) / 6;
  const cp1x = (2 * ax - bx) / 3;
  const cp1y = (2 * ay - by) / 3;
  const cp2x = (2 * bx - ax) / 3;
  const cp2y = (2 * by - ay) / 3;
  return `M ${sx} ${sy} C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${tx} ${ty}`;
}

const ShapeIcon = () => (
  <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
    <path d="M2 10 C5 2, 11 2, 14 10" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="5" cy="4.5" r="2" fill="white" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="11" cy="4.5" r="2" fill="white" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

const DraggableEdge = ({
  id,
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
  const draggingIndex = useRef<number | null>(null);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [colourOpen, setColourOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const waypoints: Waypoints =
    (data?.waypoints as Waypoints) ?? defaultWaypoints(sourceX, sourceY, targetX, targetY);
  const handlesVisible = !!(data?.handlesVisible);
  const edgePath = cubicPath(sourceX, sourceY, targetX, targetY, waypoints);

  // Clear handles when edge loses selection
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

  const onPointerDown = useCallback(
    (index: number) => (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      (e.target as Element).setPointerCapture(e.pointerId);
      draggingIndex.current = index;
    },
    [],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (draggingIndex.current === null) return;
      e.preventDefault();
      const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      const idx = draggingIndex.current;
      setEdges((edges) =>
        edges.map((edge) => {
          if (edge.id !== id) return edge;
          const prev: Waypoints = (edge.data?.waypoints as Waypoints) ?? waypoints;
          const next: Waypoints = [prev[0], prev[1]];
          next[idx] = pos;
          return { ...edge, data: { ...edge.data, waypoints: next } };
        }),
      );
    },
    [id, setEdges, screenToFlowPosition, waypoints],
  );

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    draggingIndex.current = null;
    (e.target as Element).releasePointerCapture(e.pointerId);
  }, []);

  return (
    <>
      {/* eslint-disable-next-line -- style prop is a required React Flow pass-through */}
      <path
        d={edgePath}
        fill="none"
        className="react-flow__edge-path"
        style={style}
        markerEnd={markerEnd}
        onContextMenu={onContextMenu}
      />
      {handlesVisible && (
        <EdgeLabelRenderer>
          {waypoints.map((wp, i) => (
            <div
              key={i}
              className={`nodrag nopan ${styles.handle}`}
              ref={(el) => {
                if (el) {
                  el.style.setProperty('--wp-x', `${wp.x}px`);
                  el.style.setProperty('--wp-y', `${wp.y}px`);
                }
              }}
              onPointerDown={onPointerDown(i)}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
            />
          ))}
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

export default DraggableEdge;
