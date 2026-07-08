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
import { CanvasLabelEdge, CanvasShape, type CanvasLabelEdgeType } from './CanvasShapes';
import {
  acceptCurrentStateMap,
  addCurrentStateMapComment,
  createCurrentStateMap,
  duplicateCurrentStateMap,
  getCurrentStateMap,
  listCurrentStateMapVersions,
  listCurrentStateMaps,
  listCurrentStateImports,
  dismissCurrentStateImport,
  retryCurrentStateImport,
  updateCurrentStateMap,
  uploadCurrentStateImport,
  type CurrentStateImportJob,
  type CurrentStateMap,
} from '../api';
import {
  CURRENT_STATE_LANE_TYPES,
  CURRENT_STATE_NODE_TYPES,
  addCurrentStateConnector,
  addCurrentStateLane,
  addCurrentStateNode,
  reconnectCurrentStateConnector,
  removeCurrentStateConnectors,
  removeCurrentStateNodes,
  setCurrentStateConnectorMarker,
  buildCurrentStateMapExportMetadata,
  changeCurrentStateLaneType,
  currentStateMapExportFilename,
  currentStateMapPath,
  currentStateMapSummary,
  currentStateMapVersionLabel,
  currentStateNodePosition,
  defaultCurrentStateMapTitle,
  moveCurrentStateNode,
  parseCurrentStateMapRoute,
  renameCurrentStateConnector,
  renameCurrentStateLane,
  renameCurrentStateNode,
  type CurrentStateNodeType,
} from '../currentStateMapModel';

type Props = {
  onNavigate: (path: string) => void;
};

const PROCESS_MAP_IMPORT_ACCEPT = 'application/pdf,image/png,image/jpeg,image/svg+xml,.drawio,.xml,.vsdx,.bpmn,.mmd,.mermaid,.puml,.plantuml,.dot,.graphml';
const PROCESS_MAP_IMPORT_MAX_BYTES = 25 * 1024 * 1024;

type NodeCommentSummary = { id: string; body: string; author: string | null; resolved: boolean };

type ProcessFlowNodeData = {
  title: string;
  nodeType: string;
  locked: boolean;
  comments: NodeCommentSummary[];
  commentsOpen: boolean;
  onRename: (nodeId: string, title: string) => void;
  onToggleComments: (nodeId: string) => void;
  onAddComment: (nodeId: string, body: string) => void;
};

type VisualLaneNodeData = {
  title: string;
  laneType: typeof CURRENT_STATE_LANE_TYPES[number]['value'];
  locked: boolean;
  onRename: (laneId: string, title: string) => void;
  onTypeChange: (laneId: string, laneType: typeof CURRENT_STATE_LANE_TYPES[number]['value']) => void;
};

function NodeCommentsPopover({ nodeId, title, comments, onAddComment, onClose }: {
  nodeId: string;
  title: string;
  comments: NodeCommentSummary[];
  onAddComment: (nodeId: string, body: string) => void;
  onClose: () => void;
}) {
  const [body, setBody] = useState('');
  return (
    <aside className="canvas-comment-popover nodrag nowheel" aria-label={`Comments for ${title}`}>
      <div className="canvas-comment-popover-header">
        <strong>Comments</strong>
        <button type="button" onClick={onClose} aria-label="Close comments">×</button>
      </div>
      {comments.length === 0 ? <p className="muted">No comments yet.</p> : null}
      {comments.map((comment) => (
        <article key={comment.id} className="canvas-comment">
          <p>{comment.body}</p>
          <small>{comment.author ?? 'Unknown author'} · {comment.resolved ? 'Resolved' : 'Open'}</small>
        </article>
      ))}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!body.trim()) return;
          onAddComment(nodeId, body.trim());
          setBody('');
        }}
      >
        <textarea
          aria-label={`Add a comment for ${title}`}
          value={body}
          rows={2}
          placeholder="Add a comment"
          onChange={(event) => setBody(event.target.value)}
        />
        <button type="submit" disabled={!body.trim()}>Add</button>
      </form>
    </aside>
  );
}

function ProcessFlowNode({ id, data }: NodeProps<Node<ProcessFlowNodeData>>) {
  return (
    <CanvasShape
      nodeId={id}
      kind={data.nodeType}
      title={data.title}
      locked={data.locked}
      onRename={data.onRename}
      corner={
        <>
          <button
            type="button"
            className={`canvas-shape-corner ${data.comments.length > 0 || data.commentsOpen ? 'canvas-shape-corner-active' : ''}`}
            aria-label={`Comments on ${data.title} (${data.comments.length})`}
            aria-expanded={data.commentsOpen}
            onClick={() => data.onToggleComments(id)}
          >
            {data.comments.length > 0 ? (
              <span className="canvas-comment-count">{data.comments.length}</span>
            ) : (
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M4 5h16v11H10l-6 5z" />
              </svg>
            )}
          </button>
          {data.commentsOpen ? (
            <NodeCommentsPopover
              nodeId={id}
              title={data.title}
              comments={data.comments}
              onAddComment={data.onAddComment}
              onClose={() => data.onToggleComments(id)}
            />
          ) : null}
        </>
      }
    />
  );
}

function VisualLaneNode({ id, data }: NodeProps<Node<VisualLaneNodeData>>) {
  const laneId = id.replace(/^lane-/, '');
  return (
    <label className="process-map-visual-lane-node nodrag">
      <span className="sr-only">Visual lane title</span>
      <input
        value={data.title}
        disabled={data.locked}
        onChange={(event) => data.onRename(laneId, event.target.value)}
      />
      <select
        aria-label={`${data.title} lane type`}
        value={data.laneType}
        disabled={data.locked}
        onChange={(event) => data.onTypeChange(laneId, event.target.value as typeof CURRENT_STATE_LANE_TYPES[number]['value'])}
      >
        {CURRENT_STATE_LANE_TYPES.map((laneType) => <option key={laneType.value} value={laneType.value}>{laneType.label}</option>)}
      </select>
    </label>
  );
}

const PROCESS_FLOW_NODE_TYPES = { processShape: ProcessFlowNode, visualLane: VisualLaneNode };
const PROCESS_FLOW_EDGE_TYPES = { canvasLabel: CanvasLabelEdge };

export default function CurrentStateMapsPage({ onNavigate }: Props) {
  const [maps, setMaps] = useState<CurrentStateMap[]>([]);
  const [selectedMap, setSelectedMap] = useState<CurrentStateMap | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [versions, setVersions] = useState<CurrentStateMap[]>([]);
  const [importJobs, setImportJobs] = useState<CurrentStateImportJob[]>([]);
  const [importStatus, setImportStatus] = useState<'idle' | 'uploading'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState(() => window.location.pathname);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const [saveTitle, setSaveTitle] = useState('');
  const [commentsNodeId, setCommentsNodeId] = useState<string | null>(null);
  const [commentsPanelOpen, setCommentsPanelOpen] = useState(false);
  const [editingEdgeId, setEditingEdgeId] = useState<string | null>(null);
  const selectedRoute = parseCurrentStateMapRoute(currentPath);
  const exportFrameRef = useRef<HTMLDivElement | null>(null);
  const flowInstanceRef = useRef<{
    screenToFlowPosition: (point: { x: number; y: number }) => { x: number; y: number };
    setCenter: (x: number, y: number, options?: { zoom?: number; duration?: number }) => void;
  } | null>(null);
  const undoStackRef = useRef<CurrentStateMap[]>([]);
  const redoStackRef = useRef<CurrentStateMap[]>([]);

  useEffect(() => {
    document.body.classList.toggle('process-map-open', selectedMap !== null);
    return () => document.body.classList.remove('process-map-open');
  }, [selectedMap]);

  useEffect(() => {
    setCommentsNodeId(null);
    setEditingEdgeId(null);
    undoStackRef.current = [];
    redoStackRef.current = [];
  }, [selectedMap?.id]);

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

  useEffect(() => {
    const syncPath = () => setCurrentPath(window.location.pathname);
    window.addEventListener('popstate', syncPath);
    return () => window.removeEventListener('popstate', syncPath);
  }, []);

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    setError(null);
    listCurrentStateMaps()
      .then(async (loadedMaps) => {
        if (cancelled) return;
        setMaps(loadedMaps);
        setImportJobs(await listCurrentStateImports());
        if (selectedRoute?.kind === 'detail') {
          const loadedMap = await getCurrentStateMap(selectedRoute.mapId);
          setSelectedMap(loadedMap);
          setSaveTitle(loadedMap.title);
          setHasUnsavedChanges(false);
          setVersions(await listCurrentStateMapVersions(selectedRoute.mapId));
        } else {
          setSelectedMap(null);
          setSaveTitle('');
          setHasUnsavedChanges(false);
          setVersions([]);
        }
        setStatus('ready');
      })
      .catch(() => {
        if (cancelled) return;
        setStatus('error');
        setError('Process maps are only available to workspace staff.');
      });
    return () => {
      cancelled = true;
    };
  }, [selectedRoute?.kind, selectedRoute?.kind === 'detail' ? selectedRoute.mapId : '']);

  async function handleCreate() {
    setStatus('loading');
    setError(null);
    try {
      const created = await createCurrentStateMap({ title: defaultCurrentStateMapTitle(maps) });
      setMaps((currentMaps) => [...currentMaps, created]);
      setSelectedMap(created);
      setSaveTitle(created.title);
      setHasUnsavedChanges(false);
      navigateToMapPath(currentStateMapPath({ kind: 'detail', mapId: created.id }));
      setStatus('ready');
    } catch {
      setStatus('error');
      setError('Unable to create a process map for this workspace.');
    }
  }

  function navigateToMapPath(path: string) {
    onNavigate(path);
    setCurrentPath(path);
  }

  function requestNavigate(path: string) {
    const activeMap = selectedMap;
    if (hasUnsavedChanges && activeMap && activeMap.status === 'draft') {
      setSaveTitle(activeMap.title);
      setPendingPath(path);
      return;
    }
    navigateToMapPath(path);
  }

  function replaceSelectedMap(nextMap: CurrentStateMap, dirty = true) {
    if (dirty && selectedMap && selectedMap.id === nextMap.id) {
      undoStackRef.current.push(selectedMap);
      if (undoStackRef.current.length > 50) undoStackRef.current.shift();
      redoStackRef.current = [];
    }
    setSelectedMap(nextMap);
    setSaveTitle(nextMap.title);
    setHasUnsavedChanges(dirty);
    setMaps((currentMaps) => (currentMaps.some((map) => map.id === nextMap.id) ? currentMaps.map((map) => (map.id === nextMap.id ? nextMap : map)) : [...currentMaps, nextMap]));
  }

  function applyHistory(fromStack: CurrentStateMap[], toStack: CurrentStateMap[]) {
    if (!selectedMap || selectedMap.status !== 'draft') return;
    const restored = fromStack.pop();
    if (!restored || restored.id !== selectedMap.id) return;
    toStack.push(selectedMap);
    setSelectedMap(restored);
    setSaveTitle(restored.title);
    setHasUnsavedChanges(true);
    setMaps((currentMaps) => currentMaps.map((map) => (map.id === restored.id ? restored : map)));
  }

  function handleDeleteSelection(nodes: Node[], edges: CanvasLabelEdgeType[]) {
    if (!selectedMap || selectedMap.status !== 'draft') return;
    let next = selectedMap;
    const nodeIds = nodes.filter((node) => node.type === 'processShape').map((node) => node.id);
    if (nodeIds.length > 0) next = removeCurrentStateNodes(next, nodeIds);
    const connectorIds = new Set(next.connectors.map((connector) => connector.id));
    const edgeIds = edges.map((edge) => edge.id).filter((edgeId) => connectorIds.has(edgeId));
    if (edgeIds.length > 0) next = removeCurrentStateConnectors(next, edgeIds);
    if (next !== selectedMap) replaceSelectedMap(next);
  }

  async function saveMap(map: CurrentStateMap): Promise<CurrentStateMap> {
    const saved = await updateCurrentStateMap(map.id, {
      title: map.title,
      version_ref: map.version_ref,
      status: map.status,
      source_version_id: map.source_version_id,
      lanes: map.lanes,
      phases: map.phases,
      nodes: map.nodes,
      connectors: map.connectors,
      comments: map.comments,
    });
    replaceSelectedMap(saved, false);
    if (saved.id !== map.id) navigateToMapPath(currentStateMapPath({ kind: 'detail', mapId: saved.id }));
    setVersions(await listCurrentStateMapVersions(saved.id));
    return saved;
  }

  async function handleSave() {
    if (!selectedMap || selectedMap.status !== 'draft') return;
    setError(null);
    try {
      await saveMap(selectedMap);
    } catch {
      setError('Unable to save this process map version. Only drafts can be edited.');
    }
  }

  async function handleDuplicateLockedVersion() {
    if (!selectedMap) return;
    setError(null);
    try {
      const duplicated = await duplicateCurrentStateMap(selectedMap.id);
      setMaps((currentMaps) => [...currentMaps, duplicated]);
      setSelectedMap(duplicated);
      setSaveTitle(duplicated.title);
      setHasUnsavedChanges(false);
      setVersions(await listCurrentStateMapVersions(duplicated.id));
      navigateToMapPath(currentStateMapPath({ kind: 'detail', mapId: duplicated.id }));
    } catch {
      setError('Unable to duplicate this process map version.');
    }
  }

  function handleAddNode(nodeType: CurrentStateNodeType, position?: { x: number; y: number }) {
    if (!selectedMap) return;
    replaceSelectedMap(
      addCurrentStateNode(
        selectedMap,
        nodeType,
        null,
        null,
        CURRENT_STATE_NODE_TYPES.find((candidate) => candidate.value === nodeType)?.label ?? 'Process',
        position,
      ),
    );
  }

  function handleAddLane() {
    if (!selectedMap) return;
    replaceSelectedMap(addCurrentStateLane(selectedMap));
  }

  const handleConnect: OnConnect = (connection: Connection) => {
    if (!selectedMap || !connection.source || !connection.target) return;
    replaceSelectedMap(
      addCurrentStateConnector(
        selectedMap,
        connection.source,
        connection.target,
        '',
        connection.sourceHandle ?? null,
        connection.targetHandle ?? null,
      ),
    );
  };

  const handleNodeDragStop: OnNodeDrag = (_event, node) => {
    if (!selectedMap || selectedMap.status !== 'draft') return;
    replaceSelectedMap(moveCurrentStateNode(selectedMap, node.id, node.position));
  };

  async function handleAccept() {
    if (!selectedMap) return;
    setError(null);
    try {
      const approved = await acceptCurrentStateMap(selectedMap.id);
      replaceSelectedMap(approved, false);
      setMaps(await listCurrentStateMaps());
      setVersions(await listCurrentStateMapVersions(approved.id));
    } catch {
      setError('Unable to approve this process map version.');
    }
  }

  async function handleAddComment(nodeId: string | null, body: string) {
    if (!selectedMap || !body.trim()) return;
    setError(null);
    try {
      // The comment endpoint returns the backend's stored map, so any unsaved
      // canvas changes must be saved first or they would be overwritten (and
      // comments on unsaved shapes would be rejected).
      let mapForComment = selectedMap;
      if (hasUnsavedChanges && selectedMap.status === 'draft') {
        mapForComment = await saveMap(selectedMap);
      }
      replaceSelectedMap(await addCurrentStateMapComment(mapForComment.id, { node_id: nodeId, body: body.trim(), resolved: false }), false);
    } catch {
      setError('Unable to add this process map comment.');
    }
  }

  function focusComment(nodeId: string | null) {
    if (!selectedMap || !nodeId) return;
    const index = selectedMap.nodes.findIndex((node) => node.id === nodeId);
    if (index < 0) return;
    const position = currentStateNodePosition(selectedMap.nodes[index], index);
    flowInstanceRef.current?.setCenter(position.x + 85, position.y + 40, { zoom: 1.15, duration: 400 });
    setCommentsNodeId(nodeId);
  }

  async function handleUploadImport(file: File | null) {
    if (!file) return;
    setError(null);
    if (file.size > PROCESS_MAP_IMPORT_MAX_BYTES) {
      setError('Process map imports must be 25 MB or smaller.');
      return;
    }
    setImportStatus('uploading');
    try {
      const uploaded = await uploadCurrentStateImport(file);
      setImportJobs((jobs) => [uploaded, ...jobs]);
      if (uploaded.result_map_id) {
        const refreshedMaps = await listCurrentStateMaps();
        setMaps(refreshedMaps);
        const importedMap = refreshedMaps.find((map) => map.id === uploaded.result_map_id);
        if (importedMap) {
          setSelectedMap(importedMap);
          setSaveTitle(importedMap.title);
          setHasUnsavedChanges(false);
        }
      }
    } catch {
      setError('Unable to upload this process map.');
    } finally {
      setImportStatus('idle');
    }
  }

  async function handleRetryImport(jobId: string) {
    setError(null);
    try {
      const retried = await retryCurrentStateImport(jobId);
      setImportJobs((jobs) => jobs.map((job) => (job.id === retried.id ? retried : job)));
    } catch {
      setError('Unable to retry this conversion job.');
    }
  }

  async function handleDismissImport(jobId: string) {
    setError(null);
    try {
      await dismissCurrentStateImport(jobId);
      setImportJobs((jobs) => jobs.filter((job) => job.id !== jobId));
    } catch {
      setError('Unable to dismiss this failed import.');
    }
  }

  async function handleExportPng() {
    if (!selectedMap || !exportFrameRef.current) return;
    setError(null);
    try {
      const source = exportFrameRef.current;
      const width = Math.max(source.scrollWidth, source.clientWidth, 800);
      const height = Math.max(source.scrollHeight, source.clientHeight, 600);
      const cloned = source.cloneNode(true) as HTMLElement;
      cloned.querySelectorAll('input, select').forEach((control) => {
        const replacement = document.createElement('span');
        replacement.textContent = control instanceof HTMLSelectElement ? control.selectedOptions[0]?.textContent ?? control.value : (control as HTMLInputElement).value;
        replacement.className = control.className;
        control.replaceWith(replacement);
      });
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml">${cloned.outerHTML}</div></foreignObject></svg>`;
      const imageUrl = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
      const image = new Image();
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error('Unable to render export image'));
        image.src = imageUrl;
      });
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Unable to create export canvas');
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, width, height);
      context.drawImage(image, 0, 0);
      URL.revokeObjectURL(imageUrl);
      const link = document.createElement('a');
      link.download = currentStateMapExportFilename(selectedMap, 'png');
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch {
      setError('Unable to export this process map as PNG.');
    }
  }

  async function handleSaveBeforeNavigate() {
    if (!selectedMap || !pendingPath) return;
    const title = saveTitle.trim();
    if (!title) {
      setError('Workflow name is required before saving.');
      return;
    }
    setError(null);
    try {
      await saveMap({ ...selectedMap, title });
      const nextPath = pendingPath;
      setPendingPath(null);
      navigateToMapPath(nextPath);
    } catch {
      setError('Unable to save this process map before leaving.');
    }
  }

  function handleDiscardBeforeNavigate() {
    if (!pendingPath) return;
    const nextPath = pendingPath;
    setPendingPath(null);
    setHasUnsavedChanges(false);
    navigateToMapPath(nextPath);
  }

  function handleExportPdf() {
    if (!selectedMap || !exportFrameRef.current) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      setError('Unable to open the PDF export window.');
      return;
    }
    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]')).map((element) => element.outerHTML).join('\n');
    printWindow.document.write(`<!doctype html><html><head><title>${currentStateMapExportFilename(selectedMap, 'pdf')}</title>${styles}</head><body>${exportFrameRef.current.outerHTML}</body></html>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  const flowNodes = useMemo<Node[]>(() => {
    if (!selectedMap) return [];
    const laneNodes: Node<VisualLaneNodeData>[] = selectedMap.lanes.map((lane, index) => ({
      id: `lane-${lane.id}`,
      type: 'visualLane',
      position: { x: 20, y: 92 + index * 190 },
      data: {
        title: lane.title,
        laneType: lane.lane_type ?? 'other',
        locked: selectedMap.status !== 'draft',
        onRename: (laneId, title) => replaceSelectedMap(renameCurrentStateLane(selectedMap, laneId, title)),
        onTypeChange: (laneId, laneType) => replaceSelectedMap(changeCurrentStateLaneType(selectedMap, laneId, laneType)),
      },
      draggable: false,
      selectable: false,
      connectable: false,
      zIndex: -1,
    }));
    const processNodes: Node<ProcessFlowNodeData>[] = selectedMap.nodes.map((node, index) => ({
      id: node.id,
      type: 'processShape',
      position: currentStateNodePosition(node, index),
      data: {
        title: node.title,
        nodeType: node.node_type,
        locked: selectedMap.status !== 'draft',
        comments: selectedMap.comments
          .filter((comment) => comment.node_id === node.id)
          .map((comment) => ({ id: comment.id, body: comment.body, author: comment.author ?? null, resolved: comment.resolved })),
        commentsOpen: commentsNodeId === node.id,
        onRename: (nodeId, title) => replaceSelectedMap(renameCurrentStateNode(selectedMap, nodeId, title)),
        onToggleComments: (nodeId) => setCommentsNodeId((current) => (current === nodeId ? null : nodeId)),
        onAddComment: (nodeId, body) => handleAddComment(nodeId, body),
      },
    }));
    return [...laneNodes, ...processNodes];
  }, [selectedMap, commentsNodeId]);
  const flowEdges = useMemo<CanvasLabelEdgeType[]>(() => {
    if (!selectedMap) return [];
    const locked = selectedMap.status !== 'draft';
    return selectedMap.connectors.map((connector) => ({
      id: connector.id,
      source: connector.source_node_id,
      target: connector.target_node_id,
      sourceHandle: connector.source_handle ?? 'right',
      targetHandle: connector.target_handle ?? 'left',
      markerEnd: connector.marker_end === 'none' ? undefined : { type: MarkerType.ArrowClosed },
      type: 'canvasLabel',
      reconnectable: !locked,
      data: {
        label: connector.label ?? '',
        editing: editingEdgeId === connector.id,
        arrowEnd: connector.marker_end !== 'none',
        onStartEdit: locked ? undefined : (edgeId: string) => setEditingEdgeId(edgeId),
        onCommit: (edgeId: string, label: string) => {
          setEditingEdgeId(null);
          if (locked) return;
          replaceSelectedMap(renameCurrentStateConnector(selectedMap, edgeId, label));
        },
        onToggleArrow: locked
          ? undefined
          : (edgeId: string) =>
              replaceSelectedMap(
                setCurrentStateConnectorMarker(selectedMap, edgeId, connector.marker_end === 'none' ? 'arrow' : 'none'),
              ),
        onDelete: locked ? undefined : (edgeId: string) => replaceSelectedMap(removeCurrentStateConnectors(selectedMap, [edgeId])),
      },
    }));
  }, [selectedMap, editingEdgeId]);
  const exportMetadata = selectedMap ? buildCurrentStateMapExportMetadata(selectedMap, selectedMap.workspace_id) : null;

  return (
    <section className="panel process-map-shell" aria-labelledby="process-maps-heading">
      <div className="panel-heading-row">
        <div>
          <p className="eyebrow">Current state</p>
          <h2 id="process-maps-heading">Process maps</h2>
          <p className="muted">Create and open workspace-scoped current-state process maps.</p>
        </div>
        <button type="button" onClick={handleCreate} disabled={status === 'loading'}>
          New map
        </button>
      </div>
      {error ? <p role="alert" className="error-text">{error}</p> : null}
      {status === 'loading' ? <p>Loading process maps…</p> : null}
      <section className="process-map-imports" aria-label="Process map import conversion jobs">
        <div className="panel-heading-row">
          <div>
            <h3>Import process map</h3>
            <p className="muted">Upload a process map to create an AI-assisted Current State draft. You can edit the result before approving it. Source files are temporary and deleted after conversion.</p>
          </div>
          <label className="button-like">
            {importStatus === 'uploading' ? 'Uploading…' : 'Upload process map'}
            <input
              type="file"
              accept={PROCESS_MAP_IMPORT_ACCEPT}
              disabled={importStatus === 'uploading'}
              onChange={(event) => handleUploadImport(event.target.files?.[0] ?? null)}
            />
          </label>
        </div>
        {importJobs.length === 0 ? <p className="muted">No conversion jobs yet.</p> : null}
        {importJobs.map((job) => (
          <article key={job.id} className={`import-job import-job-${job.status}`}>
            <strong>{job.filename_display ?? job.filename_redacted}</strong>
            <span>{job.file_type} · uploaded by {job.uploader}</span>
            <span>Status: {job.status}</span>
            {job.result_map_id ? <span>Draft map created — review and clean up before use.</span> : null}
            {job.error_message ? <span role="alert">{job.error_message}</span> : null}
            {job.status === 'failed' ? (
              <span className="import-job-actions">
                <button type="button" onClick={() => handleRetryImport(job.id)}>Retry</button>
                <button type="button" onClick={() => handleDismissImport(job.id)}>Dismiss</button>
              </span>
            ) : null}
          </article>
        ))}
      </section>
      {status !== 'loading' && maps.length === 0 ? <p>No process maps yet. Start with a default Process phase.</p> : null}
      {maps.length > 0 ? (
        <div className="process-map-grid">
          <ul className="process-map-list" aria-label="Process maps">
            {maps.map((map) => (
              <li key={map.id}>
                <button type="button" onClick={() => requestNavigate(currentStateMapPath({ kind: 'detail', mapId: map.id }))}>
                  <strong>{map.title}</strong>
                  <span>{currentStateMapSummary(map)}</span>
                </button>
              </li>
            ))}
          </ul>
          {selectedMap ? createPortal(
            <article className="process-map-detail process-map-detail-fullscreen" aria-label="Process map detail">
              <>
                <div className="process-map-export-frame" ref={exportFrameRef} aria-label="Process map export preview">
                  <div className="process-map-flow-canvas" aria-label={`${selectedMap.title} freeform process canvas`}>
                    <div className="process-map-floating-panel process-map-floating-header">
                      <button className="process-map-home-button" type="button" onClick={() => requestNavigate(currentStateMapPath({ kind: 'list' }))} aria-label="Back to process maps">⌂</button>
                      <div className="process-map-floating-title">
                        <p className="eyebrow">Current-state process map</p>
                        <strong>{selectedMap.title}</strong>
                        <span>{currentStateMapSummary(selectedMap)} · {currentStateMapVersionLabel(selectedMap)}</span>
                      </div>
                      <div className="process-map-floating-actions" aria-label="Process map actions">
                        <button type="button" onClick={handleSave} disabled={selectedMap.status !== 'draft'}>Save</button>
                        <button type="button" onClick={handleAccept} disabled={selectedMap.status !== 'draft'}>Approve</button>
                        <button type="button" onClick={handleDuplicateLockedVersion}>Duplicate</button>
                        <button type="button" onClick={handleExportPng}>PNG</button>
                        <button type="button" onClick={handleExportPdf}>PDF</button>
                        {versions.length > 0 ? (
                          <select
                            aria-label="Version history"
                            value={selectedMap.id}
                            onChange={async (event) => {
                              const loaded = await getCurrentStateMap(event.target.value);
                              setSelectedMap(loaded);
                              setSaveTitle(loaded.title);
                              setHasUnsavedChanges(false);
                              navigateToMapPath(currentStateMapPath({ kind: 'detail', mapId: loaded.id }));
                            }}
                          >
                            {versions.map((version) => <option key={version.id} value={version.id}>{currentStateMapVersionLabel(version)}</option>)}
                          </select>
                        ) : null}
                      </div>
                    </div>
                    <div className="process-map-floating-panel process-map-floating-palette" aria-label="Process map shape palette">
                      <strong>Shapes</strong>
                      {CURRENT_STATE_NODE_TYPES.map((nodeType) => (
                        <button
                          key={nodeType.value}
                          type="button"
                          disabled={selectedMap.status !== 'draft'}
                          draggable={selectedMap.status === 'draft'}
                          title="Click to add, or drag onto the canvas"
                          onClick={() => handleAddNode(nodeType.value)}
                          onDragStart={(event) => {
                            event.dataTransfer.setData('application/sts-shape-kind', nodeType.value);
                            event.dataTransfer.effectAllowed = 'move';
                          }}
                        >
                          {nodeType.label}
                        </button>
                      ))}
                      <button type="button" disabled={selectedMap.status !== 'draft'} onClick={handleAddLane}>Add visual lane</button>
                    </div>
                    <button
                      type="button"
                      className="process-map-floating-panel process-map-comments-toggle"
                      aria-expanded={commentsPanelOpen}
                      aria-label={`All comments (${selectedMap.comments.length})`}
                      onClick={() => setCommentsPanelOpen((open) => !open)}
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                        <path d="M4 5h16v11H10l-6 5z" />
                      </svg>
                      {selectedMap.comments.length}
                    </button>
                    {commentsPanelOpen ? (
                      <div className="process-map-floating-panel process-map-floating-comments" aria-label="All canvas comments">
                        <div className="panel-heading-row">
                          <h4>Comments</h4>
                          <button type="button" onClick={() => setCommentsPanelOpen(false)} aria-label="Close comments panel">×</button>
                        </div>
                        {selectedMap.comments.length === 0 ? <p className="muted">No comments yet. Select a shape and use its comment bubble.</p> : null}
                        {selectedMap.comments.map((comment) => {
                          const node = selectedMap.nodes.find((candidate) => candidate.id === comment.node_id);
                          return (
                            <button
                              key={comment.id}
                              type="button"
                              className="process-map-comment-link"
                              disabled={!node}
                              title={node ? 'Go to this comment on the canvas' : undefined}
                              onClick={() => focusComment(comment.node_id)}
                            >
                              <strong>{node?.title ?? 'Workflow'}</strong>
                              <p>{comment.body}</p>
                              <small>{comment.author ?? 'Unknown author'} · {comment.resolved ? 'Resolved' : 'Open'}</small>
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                    {error ? <p role="alert" className="canvas-error">{error}</p> : null}
                    <ReactFlowProvider>
                      <ReactFlow
                        nodes={flowNodes}
                        edges={flowEdges}
                        nodeTypes={PROCESS_FLOW_NODE_TYPES}
                        edgeTypes={PROCESS_FLOW_EDGE_TYPES}
                        connectionMode={ConnectionMode.Loose}
                        onInit={(instance) => {
                          flowInstanceRef.current = instance;
                        }}
                        onConnect={handleConnect}
                        onReconnect={(oldEdge, connection) => {
                          if (selectedMap.status !== 'draft' || !connection.source || !connection.target) return;
                          replaceSelectedMap(
                            reconnectCurrentStateConnector(
                              selectedMap,
                              oldEdge.id,
                              connection.source,
                              connection.target,
                              connection.sourceHandle ?? null,
                              connection.targetHandle ?? null,
                            ),
                          );
                        }}
                        onNodeDragStop={handleNodeDragStop}
                        onEdgeDoubleClick={(_event, edge) => {
                          if (selectedMap.status === 'draft') setEditingEdgeId(edge.id);
                        }}
                        onDelete={({ nodes, edges }) => handleDeleteSelection(nodes, edges)}
                        deleteKeyCode={selectedMap.status === 'draft' ? ['Backspace', 'Delete'] : null}
                        onDragOver={(event) => {
                          event.preventDefault();
                          event.dataTransfer.dropEffect = 'move';
                        }}
                        onDrop={(event) => {
                          event.preventDefault();
                          const kind = event.dataTransfer.getData('application/sts-shape-kind');
                          if (!kind || !flowInstanceRef.current || selectedMap.status !== 'draft') return;
                          const position = flowInstanceRef.current.screenToFlowPosition({ x: event.clientX, y: event.clientY });
                          handleAddNode(kind as CurrentStateNodeType, position);
                        }}
                        snapToGrid
                        snapGrid={[10, 10]}
                        nodesDraggable={selectedMap.status === 'draft'}
                        nodesConnectable={selectedMap.status === 'draft'}
                        fitView
                      >
                        <Background />
                        <MiniMap />
                        <Controls />
                      </ReactFlow>
                    </ReactFlowProvider>
                  </div>
                </div>
                <p className="sr-only">Use the shape palette to add steps, drag shapes anywhere, and drag from one handle to another to create visible arrows. Visual lanes are for human readability only.</p>
              </>
            </article>,
            document.body,
          ) : (
            <article className="process-map-detail" aria-label="Process map detail">
              <p>Select a process map to open its detail shell.</p>
            </article>
          )}
        </div>
      ) : null}
      {pendingPath && selectedMap ? createPortal(
        <div className="process-map-save-modal-backdrop" role="presentation">
          <section className="process-map-save-modal" role="dialog" aria-modal="true" aria-labelledby="save-map-title">
            <h3 id="save-map-title">Save this workflow before leaving?</h3>
            <p className="muted">Name and save the current process map, or discard unsaved canvas changes.</p>
            <label>
              Workflow name
              <input value={saveTitle} onChange={(event) => setSaveTitle(event.target.value)} autoFocus />
            </label>
            <div className="process-map-save-modal-actions">
              <button type="button" onClick={handleSaveBeforeNavigate}>Save and leave</button>
              <button type="button" onClick={handleDiscardBeforeNavigate}>Discard changes</button>
              <button type="button" onClick={() => setPendingPath(null)}>Stay here</button>
            </div>
          </section>
        </div>,
        document.body,
      ) : null}
    </section>
  );
}
