import React, { useCallback, useRef } from 'react';
import { EdgeProps, EdgeLabelRenderer, useReactFlow } from '@xyflow/react';
import styles from './DraggableEdge.module.css';

type Waypoint = { x: number; y: number };
type Waypoints = [Waypoint, Waypoint];

function defaultWaypoints(sx: number, sy: number, tx: number, ty: number): Waypoints {
  return [
    { x: sx + (tx - sx) / 3, y: sy + (ty - sy) / 3 },
    { x: sx + (tx - sx) * (2 / 3), y: sy + (ty - sy) * (2 / 3) },
  ];
}

// Cubic bezier control points so the curve passes through wp1 at t=1/3 and wp2 at t=2/3
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

  const waypoints: Waypoints =
    (data?.waypoints as Waypoints) ?? defaultWaypoints(sourceX, sourceY, targetX, targetY);

  const edgePath = cubicPath(sourceX, sourceY, targetX, targetY, waypoints);

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
      <path
        d={edgePath}
        fill="none"
        className="react-flow__edge-path"
        style={style}
        markerEnd={markerEnd}
      />
      {selected && (
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
    </>
  );
};

export default DraggableEdge;
