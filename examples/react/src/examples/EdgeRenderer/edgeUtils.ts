import { InternalNode } from '@xyflow/react';

export type PillEdgeParams = { sx: number; sy: number; tx: number; ty: number };

// Finds where the line from node center toward (targetX, targetY) crosses the
// ellipse fitted to the node bounding box. This matches pill/rounded-rect nodes
// far better than rectangular intersection for diagonal edges.
function ellipsePoint(node: InternalNode, targetX: number, targetY: number): { x: number; y: number } {
  const a = (node.measured?.width ?? 0) / 2;
  const b = (node.measured?.height ?? 0) / 2;
  const cx = node.internals.positionAbsolute.x + a;
  const cy = node.internals.positionAbsolute.y + b;
  const dx = targetX - cx;
  const dy = targetY - cy;
  const norm = Math.sqrt((dx / (a || 1)) ** 2 + (dy / (b || 1)) ** 2) || 1;
  return { x: cx + dx / norm, y: cy + dy / norm };
}

export function getPillEdgeParams(source: InternalNode, target: InternalNode): PillEdgeParams {
  const sa = (source.measured?.width ?? 0) / 2;
  const sb = (source.measured?.height ?? 0) / 2;
  const scx = source.internals.positionAbsolute.x + sa;
  const scy = source.internals.positionAbsolute.y + sb;

  const ta = (target.measured?.width ?? 0) / 2;
  const tb = (target.measured?.height ?? 0) / 2;
  const tcx = target.internals.positionAbsolute.x + ta;
  const tcy = target.internals.positionAbsolute.y + tb;

  const sp = ellipsePoint(source, tcx, tcy);
  const tp = ellipsePoint(target, scx, scy);

  return { sx: sp.x, sy: sp.y, tx: tp.x, ty: tp.y };
}
