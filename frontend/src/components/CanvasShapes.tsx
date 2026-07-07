import type { ReactNode } from 'react';
import { Handle, Position } from '@xyflow/react';

/** Shared flowchart shape vocabulary for the Current State and Workflows
 * canvases, drawn from docs/basic_icons.drawio. */
export type CanvasShapeKind =
  | 'start'
  | 'end'
  | 'process'
  | 'decision'
  | 'data'
  | 'document'
  | 'multi-document'
  | 'manual-input'
  | 'manual-operation'
  | 'internal-storage'
  | 'predefined-process';

export const CANVAS_SHAPE_KINDS: { value: CanvasShapeKind; label: string }[] = [
  { value: 'start', label: 'Start' },
  { value: 'end', label: 'End' },
  { value: 'process', label: 'Process' },
  { value: 'decision', label: 'Decision' },
  { value: 'data', label: 'Data' },
  { value: 'document', label: 'Document' },
  { value: 'multi-document', label: 'Multi document' },
  { value: 'manual-input', label: 'Manual input' },
  { value: 'manual-operation', label: 'Manual operation' },
  { value: 'internal-storage', label: 'Internal storage' },
  { value: 'predefined-process', label: 'Predefined process' },
];

const SHAPE_SIZES: Record<CanvasShapeKind, { width: number; height: number }> = {
  start: { width: 150, height: 64 },
  end: { width: 150, height: 64 },
  process: { width: 170, height: 72 },
  decision: { width: 170, height: 108 },
  data: { width: 174, height: 72 },
  document: { width: 170, height: 84 },
  'multi-document': { width: 176, height: 88 },
  'manual-input': { width: 170, height: 76 },
  'manual-operation': { width: 170, height: 72 },
  'internal-storage': { width: 154, height: 84 },
  'predefined-process': { width: 176, height: 72 },
};

export function normalizeShapeKind(kind: string): CanvasShapeKind {
  return CANVAS_SHAPE_KINDS.some((candidate) => candidate.value === kind) ? (kind as CanvasShapeKind) : 'process';
}

export function canvasShapeSize(kind: CanvasShapeKind): { width: number; height: number } {
  return SHAPE_SIZES[kind];
}

function documentPath(x0: number, y0: number, x1: number, y1: number): string {
  const span = x1 - x0;
  return `M ${x0} ${y0} H ${x1} V ${y1 - 10} C ${x0 + span * 0.72} ${y1 - 22}, ${x0 + span * 0.28} ${y1 + 5}, ${x0} ${y1 - 8} Z`;
}

function ShapeOutline({ kind, width: w, height: h }: { kind: CanvasShapeKind; width: number; height: number }) {
  const m = 3;
  switch (kind) {
    case 'start':
    case 'end':
      return <rect className="canvas-shape-outline" x={m} y={m} width={w - 2 * m} height={h - 2 * m} rx={(h - 2 * m) / 2} />;
    case 'process':
      return <rect className="canvas-shape-outline" x={m} y={m} width={w - 2 * m} height={h - 2 * m} rx={10} />;
    case 'decision':
      return <polygon className="canvas-shape-outline" points={`${w / 2},${m} ${w - m},${h / 2} ${w / 2},${h - m} ${m},${h / 2}`} />;
    case 'data': {
      const o = w * 0.16;
      return <polygon className="canvas-shape-outline" points={`${m + o},${m} ${w - m},${m} ${w - m - o},${h - m} ${m},${h - m}`} />;
    }
    case 'document':
      return <path className="canvas-shape-outline" d={documentPath(m, m, w - m, h - m)} />;
    case 'multi-document': {
      const sheet = documentPath(m, m + 8, w - m - 8, h - m);
      return (
        <>
          <path className="canvas-shape-outline" d={sheet} transform="translate(8, -8)" />
          <path className="canvas-shape-outline" d={sheet} transform="translate(4, -4)" />
          <path className="canvas-shape-outline" d={sheet} />
        </>
      );
    }
    case 'manual-input':
      return <polygon className="canvas-shape-outline" points={`${m},${m + 12} ${w - m},${m} ${w - m},${h - m} ${m},${h - m}`} />;
    case 'manual-operation': {
      const o = w * 0.14;
      return <polygon className="canvas-shape-outline" points={`${m},${m} ${w - m},${m} ${w - m - o},${h - m} ${m + o},${h - m}`} />;
    }
    case 'internal-storage':
      return (
        <>
          <rect className="canvas-shape-outline" x={m} y={m} width={w - 2 * m} height={h - 2 * m} rx={8} />
          <line className="canvas-shape-detail" x1={m} y1={m + 16} x2={w - m} y2={m + 16} />
          <line className="canvas-shape-detail" x1={m + 16} y1={m} x2={m + 16} y2={h - m} />
        </>
      );
    case 'predefined-process':
      return (
        <>
          <rect className="canvas-shape-outline" x={m} y={m} width={w - 2 * m} height={h - 2 * m} rx={8} />
          <line className="canvas-shape-detail" x1={m + 12} y1={m} x2={m + 12} y2={h - m} />
          <line className="canvas-shape-detail" x1={w - m - 12} y1={m} x2={w - m - 12} y2={h - m} />
        </>
      );
  }
}

export type CanvasShapeProps = {
  nodeId: string;
  kind: string;
  title: string;
  locked: boolean;
  onRename: (nodeId: string, title: string) => void;
  corner?: ReactNode;
};

/** Presentational flowchart node: SVG geometry, centred editable label, and an
 * optional corner affordance (e.g. comments). Rendered inside a React Flow
 * custom node so it owns the connection handles. */
export function CanvasShape({ nodeId, kind, title, locked, onRename, corner }: CanvasShapeProps) {
  const shapeKind = normalizeShapeKind(kind);
  const { width, height } = canvasShapeSize(shapeKind);
  return (
    <div className={`canvas-shape-node canvas-shape-${shapeKind}`} style={{ width, height }}>
      <Handle type="target" position={Position.Left} isConnectable={!locked} />
      <svg className="canvas-shape-svg" viewBox={`0 0 ${width} ${height}`} width={width} height={height} aria-hidden="true" focusable="false">
        <ShapeOutline kind={shapeKind} width={width} height={height} />
      </svg>
      <input
        className="canvas-shape-label"
        aria-label={`${shapeKind} shape label`}
        value={title}
        disabled={locked}
        onChange={(event) => onRename(nodeId, event.target.value)}
      />
      {corner}
      <Handle type="source" position={Position.Right} isConnectable={!locked} />
    </div>
  );
}
