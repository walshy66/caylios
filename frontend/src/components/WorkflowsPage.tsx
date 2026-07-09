import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Background,
  ConnectionMode,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  type Connection,
  type Node,
  type NodeProps,
  type OnConnect,
  type OnNodeDrag,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { CANVAS_SHAPE_KINDS, CanvasLabelEdge, CanvasShape, type CanvasLabelEdgeType } from './CanvasShapes';
import {
  addWorkflowConnector,
  addWorkflowStep,
  createWorkflowDraft,
  defaultWorkflowTitle,
  loadWorkflowDrafts,
  moveWorkflowStep,
  reconnectWorkflowConnector,
  removeWorkflowConnectors,
  removeWorkflowDraft,
  removeWorkflowSteps,
  renameWorkflow,
  renameWorkflowConnector,
  renameWorkflowStep,
  saveWorkflowDraft,
  setWorkflowConnectorMarker,
  type WorkflowDraft,
} from '../workflowCanvasModel';

type WorkflowNodeData = {
  title: string;
  kind: string;
  onRename: (stepId: string, title: string) => void;
};

function WorkflowShapeNode({ id, data }: NodeProps<Node<WorkflowNodeData>>) {
  return <CanvasShape nodeId={id} kind={data.kind} title={data.title} locked={false} onRename={data.onRename} />;
}

const WORKFLOW_NODE_TYPES = { workflowShape: WorkflowShapeNode };
const WORKFLOW_EDGE_TYPES = { canvasLabel: CanvasLabelEdge };

function nowIso(): string {
  return new Date().toISOString();
}

/** Workflows are designed here and, on approval, will run natively in the Caylios
 * backend: intake → review and approval → distribution to connected
 * destinations. V1 drafts stay in this browser (localStorage) until backend
 * workflow definitions land. */
export default function WorkflowsPage() {
  const [drafts, setDrafts] = useState<WorkflowDraft[]>(() => loadWorkflowDrafts(window.localStorage));
  const [openDraft, setOpenDraft] = useState<WorkflowDraft | null>(null);
  const [editingEdgeId, setEditingEdgeId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const flowInstanceRef = useRef<{ screenToFlowPosition: (point: { x: number; y: number }) => { x: number; y: number } } | null>(null);
  const undoStackRef = useRef<WorkflowDraft[]>([]);
  const redoStackRef = useRef<WorkflowDraft[]>([]);

  useEffect(() => {
    document.body.classList.toggle('process-map-open', openDraft !== null);
    return () => document.body.classList.remove('process-map-open');
  }, [openDraft]);

  useEffect(() => {
    setEditingEdgeId(null);
    undoStackRef.current = [];
    redoStackRef.current = [];
  }, [openDraft?.id]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!(event.ctrlKey || event.metaKey)) return;
      const target = event.target as HTMLElement;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target.isContentEditable) return;
      const key = event.key.toLowerCase();
      if (key === 'z' && !event.shiftKey) {
        event.preventDefault();
        applyHistory(undoStackRef.current, redoStackRef.current);
      } else if (key === 'y' || (key === 'z' && event.shiftKey)) {
        event.preventDefault();
        applyHistory(redoStackRef.current, undoStackRef.current);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  /** Every canvas change persists straight to localStorage: workflows v1 has
   * no server draft state to defer to. */
  function applyDraftChange(next: WorkflowDraft, recordHistory = true) {
    if (recordHistory && openDraft && openDraft.id === next.id) {
      undoStackRef.current.push(openDraft);
      if (undoStackRef.current.length > 50) undoStackRef.current.shift();
      redoStackRef.current = [];
    }
    setOpenDraft(next);
    setDrafts(saveWorkflowDraft(window.localStorage, next));
  }

  function applyHistory(fromStack: WorkflowDraft[], toStack: WorkflowDraft[]) {
    if (!openDraft) return;
    const restored = fromStack.pop();
    if (!restored || restored.id !== openDraft.id) return;
    toStack.push(openDraft);
    setOpenDraft(restored);
    setDrafts(saveWorkflowDraft(window.localStorage, restored));
  }

  function handleCreate() {
    const created = createWorkflowDraft(defaultWorkflowTitle(drafts), nowIso());
    setDrafts(saveWorkflowDraft(window.localStorage, created));
    setOpenDraft(created);
  }

  function handleDelete(draftId: string) {
    if (pendingDeleteId !== draftId) {
      setPendingDeleteId(draftId);
      return;
    }
    setPendingDeleteId(null);
    setDrafts(removeWorkflowDraft(window.localStorage, draftId));
    if (openDraft?.id === draftId) setOpenDraft(null);
  }

  function handleAddStep(kind: string, position?: { x: number; y: number }) {
    if (!openDraft) return;
    const label = CANVAS_SHAPE_KINDS.find((candidate) => candidate.value === kind)?.label ?? 'Step';
    applyDraftChange(addWorkflowStep(openDraft, kind, label, nowIso(), position));
  }

  const handleConnect: OnConnect = (connection: Connection) => {
    if (!openDraft || !connection.source || !connection.target) return;
    applyDraftChange(
      addWorkflowConnector(
        openDraft,
        connection.source,
        connection.target,
        nowIso(),
        '',
        connection.sourceHandle ?? null,
        connection.targetHandle ?? null,
      ),
    );
  };

  const handleNodeDragStop: OnNodeDrag = (_event, node) => {
    if (!openDraft) return;
    applyDraftChange(moveWorkflowStep(openDraft, node.id, node.position, nowIso()));
  };

  function handleDeleteSelection(nodes: Node[], edges: CanvasLabelEdgeType[]) {
    if (!openDraft) return;
    let next = openDraft;
    const stepIds = nodes.map((node) => node.id);
    if (stepIds.length > 0) next = removeWorkflowSteps(next, stepIds, nowIso());
    const connectorIds = new Set(next.connectors.map((connector) => connector.id));
    const edgeIds = edges.map((edge) => edge.id).filter((edgeId) => connectorIds.has(edgeId));
    if (edgeIds.length > 0) next = removeWorkflowConnectors(next, edgeIds, nowIso());
    if (next !== openDraft) applyDraftChange(next);
  }

  const flowNodes = useMemo<Node<WorkflowNodeData>[]>(() => {
    if (!openDraft) return [];
    return openDraft.steps.map((step) => ({
      id: step.id,
      type: 'workflowShape',
      position: step.position,
      data: {
        title: step.title,
        kind: step.kind,
        onRename: (stepId, title) => applyDraftChange(renameWorkflowStep(openDraft, stepId, title, nowIso())),
      },
    }));
  }, [openDraft]);

  const flowEdges = useMemo<CanvasLabelEdgeType[]>(() => {
    if (!openDraft) return [];
    return openDraft.connectors.map((connector) => ({
      id: connector.id,
      source: connector.source_step_id,
      target: connector.target_step_id,
      sourceHandle: connector.source_handle ?? 'right',
      targetHandle: connector.target_handle ?? 'left',
      markerEnd: connector.marker_end === 'none' ? undefined : { type: MarkerType.ArrowClosed },
      type: 'canvasLabel',
      reconnectable: true,
      data: {
        label: connector.label,
        editing: editingEdgeId === connector.id,
        arrowEnd: connector.marker_end !== 'none',
        onStartEdit: (edgeId: string) => setEditingEdgeId(edgeId),
        onCommit: (edgeId: string, label: string) => {
          setEditingEdgeId(null);
          applyDraftChange(renameWorkflowConnector(openDraft, edgeId, label, nowIso()));
        },
        onToggleArrow: (edgeId: string) =>
          applyDraftChange(
            setWorkflowConnectorMarker(openDraft, edgeId, connector.marker_end === 'none' ? 'arrow' : 'none', nowIso()),
          ),
        onDelete: (edgeId: string) => applyDraftChange(removeWorkflowConnectors(openDraft, [edgeId], nowIso())),
      },
    }));
  }, [openDraft, editingEdgeId]);

  return (
    <section className="panel" aria-labelledby="workflows-title">
      <div className="panel-heading-row">
        <div>
          <p className="eyebrow">Future state</p>
          <h2 id="workflows-title">Workflows</h2>
          <p className="muted">
            Design the workflows that move approved client data into your connected apps. Drafts are
            saved in this browser while the workflow engine build-out continues.
          </p>
        </div>
        <button type="button" onClick={handleCreate}>New workflow</button>
      </div>
      {drafts.length === 0 ? <p className="muted">No workflows yet. Create one to open the canvas.</p> : null}
      {drafts.length > 0 ? (
        <ul className="process-map-list" aria-label="Workflows">
          {drafts.map((draft) => (
            <li key={draft.id}>
              <button type="button" onClick={() => setOpenDraft(draft)}>
                <strong>{draft.title}</strong>
                <span>
                  {draft.steps.length} {draft.steps.length === 1 ? 'step' : 'steps'} · updated{' '}
                  {new Date(draft.updated_at).toLocaleDateString()}
                </span>
              </button>
              <button type="button" className="workflow-delete" onClick={() => handleDelete(draft.id)}>
                {pendingDeleteId === draft.id ? 'Confirm delete' : 'Delete'}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {openDraft ? createPortal(
        <article className="process-map-detail process-map-detail-fullscreen" aria-label="Workflow canvas">
          <div className="process-map-flow-canvas" aria-label={`${openDraft.title} workflow canvas`}>
            <div className="process-map-floating-panel process-map-floating-header">
              <button
                className="process-map-home-button"
                type="button"
                onClick={() => setOpenDraft(null)}
                aria-label="Back to workflows"
              >
                ⌂
              </button>
              <div className="process-map-floating-title">
                <p className="eyebrow">Workflow</p>
                <input
                  className="workflow-title-input"
                  aria-label="Workflow name"
                  value={openDraft.title}
                  onChange={(event) => {
                    if (event.target.value.trim()) applyDraftChange(renameWorkflow(openDraft, event.target.value, nowIso()));
                  }}
                />
                <span>Saved in this browser · {openDraft.steps.length} {openDraft.steps.length === 1 ? 'step' : 'steps'}</span>
              </div>
            </div>
            <div className="process-map-floating-panel process-map-floating-palette" aria-label="Workflow shape palette">
              <strong>Shapes</strong>
              {CANVAS_SHAPE_KINDS.map((kind) => (
                <button
                  key={kind.value}
                  type="button"
                  draggable
                  title="Click to add, or drag onto the canvas"
                  onClick={() => handleAddStep(kind.value)}
                  onDragStart={(event) => {
                    event.dataTransfer.setData('application/caylios-shape-kind', kind.value);
                    event.dataTransfer.effectAllowed = 'move';
                  }}
                >
                  {kind.label}
                </button>
              ))}
            </div>
            <ReactFlowProvider>
              <ReactFlow
                nodes={flowNodes}
                edges={flowEdges}
                nodeTypes={WORKFLOW_NODE_TYPES}
                edgeTypes={WORKFLOW_EDGE_TYPES}
                connectionMode={ConnectionMode.Loose}
                onInit={(instance) => {
                  flowInstanceRef.current = instance;
                }}
                onConnect={handleConnect}
                onReconnect={(oldEdge, connection) => {
                  if (!connection.source || !connection.target) return;
                  applyDraftChange(
                    reconnectWorkflowConnector(
                      openDraft,
                      oldEdge.id,
                      connection.source,
                      connection.target,
                      connection.sourceHandle ?? null,
                      connection.targetHandle ?? null,
                      nowIso(),
                    ),
                  );
                }}
                onNodeDragStop={handleNodeDragStop}
                onEdgeDoubleClick={(_event, edge) => setEditingEdgeId(edge.id)}
                onDelete={({ nodes, edges }) => handleDeleteSelection(nodes, edges)}
                deleteKeyCode={['Backspace', 'Delete']}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = 'move';
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  const kind = event.dataTransfer.getData('application/caylios-shape-kind');
                  if (!kind || !flowInstanceRef.current) return;
                  handleAddStep(kind, flowInstanceRef.current.screenToFlowPosition({ x: event.clientX, y: event.clientY }));
                }}
                snapToGrid
                snapGrid={[10, 10]}
                fitView
              >
                <Background />
                <MiniMap />
                <Controls />
              </ReactFlow>
            </ReactFlowProvider>
          </div>
          <p className="sr-only">
            Use the shape palette to add steps, drag shapes anywhere, drag from one handle to another to
            create arrows, double-click shapes or arrows to rename them, and press Delete to remove the
            selection. Changes save automatically in this browser.
          </p>
        </article>,
        document.body,
      ) : null}
    </section>
  );
}
