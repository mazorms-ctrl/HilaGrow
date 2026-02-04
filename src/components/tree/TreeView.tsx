import { useMemo, useCallback } from 'react';
import {
  ReactFlow,
  type Node,
  type Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useTasksWithRelations, useProject, useGroups } from '@/hooks/useData';
import { useUIStore } from '@/store/uiStore';
import { Loader2 } from 'lucide-react';
import dagre from 'dagre';

// Custom node component for tasks
function TaskNode({ data }: { data: any }) {
  const progress = data.progress || 0;
  
  return (
    <div
      className="cursor-pointer rounded-lg border-2 bg-white p-3 shadow-soft transition-all hover:shadow-soft-lg"
      style={{
        borderColor: data.color || '#e5e5e5',
        minWidth: '200px',
      }}
    >
      <div className="mb-2 text-sm font-semibold text-neutral-900">
        {data.label}
      </div>
      {data.owner && (
        <div className="mb-1 text-xs text-neutral-600">{data.owner}</div>
      )}
      {/* Progress bar */}
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-neutral-200">
        <div
          className="h-full transition-all"
          style={{
            width: `${progress}%`,
            backgroundColor:
              progress >= 80
                ? '#22c55e'
                : progress >= 50
                ? '#0ea5e9'
                : progress >= 25
                ? '#f59e0b'
                : '#ef4444',
          }}
        />
      </div>
      <div className="mt-1 text-right text-xs text-neutral-500">
        {progress}%
      </div>
    </div>
  );
}

// Custom node component for groups
function GroupNode({ data }: { data: any }) {
  return (
    <div
      className="rounded-lg border-2 bg-white p-4 shadow-soft"
      style={{
        borderColor: data.color || '#e5e5e5',
        minWidth: '180px',
      }}
    >
      <div
        className="mb-2 h-1 w-full rounded"
        style={{ backgroundColor: data.color || '#e5e5e5' }}
      />
      <div className="text-center text-base font-bold text-neutral-900">
        {data.label}
      </div>
      <div className="mt-1 text-center text-xs text-neutral-600">
        {data.taskCount} משימות
      </div>
    </div>
  );
}

// Custom node component for project
function ProjectNode({ data }: { data: any }) {
  return (
    <div className="rounded-lg border-2 border-primary-500 bg-gradient-to-br from-primary-50 to-primary-100 p-5 shadow-soft-lg">
      <div className="text-center text-lg font-bold text-primary-900">
        {data.label}
      </div>
      <div className="mt-1 text-center text-xs text-primary-700">
        פרויקט
      </div>
    </div>
  );
}

const nodeTypes = {
  project: ProjectNode,
  group: GroupNode,
  task: TaskNode,
};

// Layout function using dagre
function getLayoutedElements(nodes: Node[], edges: Edge[]) {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: 'TB', ranksep: 100, nodesep: 80 });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 250, height: 100 });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - 125,
        y: nodeWithPosition.y - 50,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}

export function TreeView() {
  const { data: project, isLoading: projectLoading } = useProject();
  const { data: groups = [], isLoading: groupsLoading } = useGroups();
  const { data: tasks = [], isLoading: tasksLoading } = useTasksWithRelations();
  const { openTaskDrawer } = useUIStore();

  // Create nodes and edges
  const { initialNodes, initialEdges } = useMemo(() => {
    if (!project || groups.length === 0 || tasks.length === 0) {
      return { initialNodes: [], initialEdges: [] };
    }

    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // Project node
    nodes.push({
      id: project.id,
      type: 'project',
      data: { label: project.name },
      position: { x: 0, y: 0 },
    });

    // Group nodes
    groups.forEach((group) => {
      const groupTasks = tasks.filter((t) => t.groupId === group.id);
      nodes.push({
        id: group.id,
        type: 'group',
        data: {
          label: group.name,
          color: group.color,
          taskCount: groupTasks.length,
        },
        position: { x: 0, y: 0 },
      });

      // Edge from project to group
      edges.push({
        id: `${project.id}-${group.id}`,
        source: project.id,
        target: group.id,
        type: 'smoothstep',
        animated: false,
        style: { stroke: group.color || '#e5e5e5', strokeWidth: 2 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: group.color || '#e5e5e5',
        },
      });
    });

    // Task nodes
    tasks.forEach((task) => {
      nodes.push({
        id: task.id,
        type: 'task',
        data: {
          label: task.title,
          owner: task.ownerName,
          color: task.group?.color,
          progress: task.progress.progress,
        },
        position: { x: 0, y: 0 },
      });

      // Edge from group to task
      edges.push({
        id: `${task.groupId}-${task.id}`,
        source: task.groupId,
        target: task.id,
        type: 'smoothstep',
        animated: false,
        style: { stroke: task.group?.color || '#e5e5e5', strokeWidth: 1.5 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: task.group?.color || '#e5e5e5',
        },
      });
    });

    // Apply layout
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(nodes, edges);
    return { initialNodes: layoutedNodes, initialEdges: layoutedEdges };
  }, [project, groups, tasks]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes/edges when data changes
  useMemo(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  // Handle node click
  const onNodeClick = useCallback(
    (_event: any, node: Node) => {
      if (node.type === 'task') {
        openTaskDrawer(node.id);
      }
    },
    [openTaskDrawer]
  );

  const isLoading = projectLoading || groupsLoading || tasksLoading;

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (!project || groups.length === 0 || tasks.length === 0) {
    return (
      <div className="flex h-96 items-center justify-center text-neutral-500">
        אין נתונים להצגה
      </div>
    );
  }

  return (
    <div className="h-[400px] md:h-[600px] lg:h-[800px] w-full rounded-lg border border-neutral-200 bg-neutral-50">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.1}
        defaultViewport={{ zoom: 0.5, x: 0, y: 0 }}
        attributionPosition="bottom-left"
      >
        <Controls className="[&_button]:!min-w-[44px] [&_button]:!min-h-[44px] md:[&_button]:!min-w-[32px] md:[&_button]:!min-h-[32px]" />
        <Background />
      </ReactFlow>
    </div>
  );
}
