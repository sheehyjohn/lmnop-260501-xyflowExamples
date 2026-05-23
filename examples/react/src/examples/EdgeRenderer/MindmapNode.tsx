import { Handle, Position } from '@xyflow/react';
import styles from './MindmapNode.module.css';

type Props = { data: { label: string; color: string; fontWeight?: number; fontSize?: number; paddingV?: number; paddingH?: number; lineHeight?: number } };

const MindmapNode = ({ data }: Props) => (
  <>
    <Handle type="target" position={Position.Left}  className={styles.handle} />
    <Handle type="source" position={Position.Right} className={styles.handle} />
    <div
      className={styles.pill}
      ref={(el) => {
        if (!el) return;
        el.style.setProperty('--pill-color', data.color);
        el.style.setProperty('--pill-weight', String(data.fontWeight ?? 600));
        el.style.setProperty('--pill-size', `${data.fontSize ?? 13}px`);
        el.style.setProperty('--pill-pv', `${data.paddingV ?? 6}px`);
        el.style.setProperty('--pill-ph', `${data.paddingH ?? 18}px`);
        el.style.setProperty('--pill-lh', `${data.lineHeight ?? 20}px`);
      }}
    >
      {data.label}
    </div>
  </>
);

export default MindmapNode;
