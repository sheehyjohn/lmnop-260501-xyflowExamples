import React, { useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useReactFlow } from '@xyflow/react';
import styles from './DraggableEdge.module.css';

type Props = {
  menuPos: { x: number; y: number } | null;
  onClose: () => void;
  stylusMode: boolean;
  onToggleStylus: () => void;
};

const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const StylusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M11 2 L14 5 L5 14 L2 14 L2 11 Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M9 4 L12 7" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

const CanvasMenu = ({ menuPos, onClose, stylusMode, onToggleStylus }: Props) => {
  const { screenToFlowPosition, setNodes } = useReactFlow();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuPos) return;
    const onDown = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('pointerdown', onDown, true);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown, true);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuPos, onClose]);

  const handleCreateNode = useCallback(() => {
    if (!menuPos) return;
    const pos = screenToFlowPosition({ x: menuPos.x, y: menuPos.y });
    setNodes((nodes) => [
      ...nodes,
      {
        id: `node-${Date.now()}`,
        type: 'mindmap',
        position: pos,
        data: { label: 'New node', color: '#34d399', fontSize: 12 },
      },
    ]);
    onClose();
  }, [menuPos, screenToFlowPosition, setNodes, onClose]);

  if (!menuPos) return null;

  return createPortal(
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
      <div className={styles['menu-item']} onClick={handleCreateNode}>
        <span className={styles['menu-icon']}><PlusIcon /></span>
        Create node
      </div>
      <div className={styles['menu-divider']} />
      <div
        className={`${styles['menu-item']} ${stylusMode ? styles['menu-item-active'] : ''}`}
        onClick={() => { onToggleStylus(); onClose(); }}
      >
        <span className={styles['menu-icon']}><StylusIcon /></span>
        {stylusMode ? 'Stylus on' : 'Stylus off'}
      </div>
    </div>,
    document.body,
  );
};

export default CanvasMenu;
