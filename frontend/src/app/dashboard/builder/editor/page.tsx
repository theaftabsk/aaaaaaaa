'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ReactFlow, {
  MiniMap,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  MarkerType,
  Handle,
  Position,
  ReactFlowInstance,
  BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
  GitBranch, Plus, Trash2, Save, AlertCircle, CheckCircle2,
  ToggleLeft, ToggleRight, Play, X, Key, MessageSquare,
  List, GitFork, Cpu, Clock, Tag, Globe, Shield, ChevronLeft, ChevronRight,
  MousePointer, Phone, Send, RefreshCw, Eye, Zap, ArrowRight
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Edge colour palette — keyed on source node type
// ─────────────────────────────────────────────────────────────────────────────
const EDGE_COLORS: Record<string, string> = {
  trigger:   '#10b981', // emerald
  reply:     '#3b82f6', // blue
  buttons:   '#f59e0b', // amber
  condition: '#a855f7', // purple
  aiReply:   '#d946ef', // fuchsia
  delay:     '#f97316', // orange
  tag:       '#10b981', // emerald
  api:       '#06b6d4', // cyan
  agent:     '#f43f5e', // rose
  start:     '#16a34a', // green
  end:       '#dc2626', // red
  default:   '#64748b', // slate
};

const getEdgeColor = (nodeType?: string) =>
  EDGE_COLORS[nodeType || 'default'] ?? EDGE_COLORS.default;

// ─────────────────────────────────────────────────────────────────────────────
// Shared handle style factory
// ─────────────────────────────────────────────────────────────────────────────
const handleStyle = (color: string, offset?: React.CSSProperties): React.CSSProperties => ({
  width: 14,
  height: 14,
  background: color,
  border: '3px solid #ffffff',
  boxShadow: `0 0 0 2px ${color}40`,
  zIndex: 100,
  ...offset,
});

// ─────────────────────────────────────────────────────────────────────────────
// Node Components — defined OUTSIDE the page component so React Flow
// never recreates the nodeTypes object across renders.
// ─────────────────────────────────────────────────────────────────────────────

const TriggerNode = ({ data, selected }: { data: any; selected: boolean }) => (
  <div className={`relative p-4 rounded-2xl border-2 bg-white shadow-lg min-w-[220px] transition-all ${selected ? 'border-emerald-500 ring-4 ring-emerald-100' : 'border-emerald-400'}`}>
    <div className="flex items-center gap-2 border-b border-emerald-100 pb-2 mb-2">
      <div className="w-7 h-7 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
        <Key className="w-3.5 h-3.5" />
      </div>
      <span className="text-xs font-extrabold text-slate-800">Trigger Keyword</span>
      <div className="w-2 h-2 rounded-full bg-emerald-500 ml-auto animate-ping" />
    </div>
    <div className="flex flex-wrap gap-1">
      {(data.keywords ?? []).map((kw: string, i: number) => (
        <span key={i} className="text-[10px] bg-emerald-50 border border-emerald-200 text-emerald-700 px-2 py-0.5 rounded-lg font-bold">{kw}</span>
      ))}
      {(!data.keywords || data.keywords.length === 0) && (
        <span className="text-[10px] text-slate-400 italic">No keywords set</span>
      )}
    </div>
    <Handle type="source" position={Position.Bottom} style={handleStyle('#10b981', { bottom: -7 })} />
  </div>
);

const MessageNode = ({ data, selected }: { data: any; selected: boolean }) => (
  <div className={`relative p-4 rounded-2xl border-2 bg-white shadow-lg min-w-[220px] transition-all ${selected ? 'border-blue-500 ring-4 ring-blue-100' : 'border-blue-400'}`}>
    <Handle type="target" position={Position.Top} style={handleStyle('#3b82f6', { top: -7 })} />
    <div className="flex items-center gap-2 border-b border-blue-100 pb-2 mb-2">
      <div className="w-7 h-7 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center">
        <MessageSquare className="w-3.5 h-3.5" />
      </div>
      <span className="text-xs font-extrabold text-slate-800">Send Message</span>
    </div>
    <p className="text-xs text-slate-600 font-medium line-clamp-3 bg-blue-50/50 p-2 rounded-xl border border-blue-100">
      {data.message || 'No message text set.'}
    </p>
    <Handle type="source" position={Position.Bottom} style={handleStyle('#3b82f6', { bottom: -7 })} />
  </div>
);

const ButtonsNode = ({ data, selected }: { data: any; selected: boolean }) => (
  <div className={`relative p-4 rounded-2xl border-2 bg-white shadow-lg min-w-[240px] transition-all ${selected ? 'border-amber-500 ring-4 ring-amber-100' : 'border-amber-400'}`}>
    <Handle type="target" position={Position.Top} style={handleStyle('#f59e0b', { top: -7 })} />
    <div className="flex items-center gap-2 border-b border-amber-100 pb-2 mb-2">
      <div className="w-7 h-7 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center">
        <List className="w-3.5 h-3.5" />
      </div>
      <span className="text-xs font-extrabold text-slate-800">Buttons Menu</span>
    </div>
    <p className="text-[10px] text-slate-500 font-bold mb-2">Choose an option:</p>
    <div className="space-y-2">
      {(data.options ?? []).map((opt: string, index: number) => (
        <div key={index} className="relative flex items-center justify-between bg-amber-50/60 border border-amber-100 px-3 py-2 rounded-xl text-xs font-bold text-slate-700">
          <ArrowRight className="w-3 h-3 text-amber-500 mr-1.5 shrink-0" />
          <span className="flex-1 truncate">{opt}</span>
          <Handle
            type="source"
            position={Position.Right}
            id={`option-${index}`}
            style={{ ...handleStyle('#f59e0b'), top: '50%', right: -7, transform: 'translateY(-50%)', position: 'absolute' }}
          />
        </div>
      ))}
      {(!data.options || data.options.length === 0) && (
        <p className="text-[10px] text-slate-400 italic text-center py-2">No options added</p>
      )}
    </div>
  </div>
);

const ConditionNode = ({ data, selected }: { data: any; selected: boolean }) => (
  <div className={`relative p-4 rounded-2xl border-2 bg-white shadow-lg min-w-[200px] transition-all ${selected ? 'border-purple-500 ring-4 ring-purple-100' : 'border-purple-400'}`}>
    <Handle type="target" position={Position.Left} style={handleStyle('#a855f7', { left: -7 })} />
    <div className="flex items-center gap-2 border-b border-purple-100 pb-2 mb-2">
      <div className="w-7 h-7 rounded-xl bg-purple-50 border border-purple-200 text-purple-600 flex items-center justify-center">
        <GitFork className="w-3.5 h-3.5" />
      </div>
      <span className="text-xs font-extrabold text-slate-800">Condition</span>
    </div>
    <div className="bg-purple-50 border border-purple-100 p-2.5 rounded-xl text-center">
      <span className="text-[9px] text-purple-500 font-bold uppercase tracking-wider block mb-0.5">If user reply is</span>
      <span className="text-xs text-slate-800 font-extrabold">"{data.conditionKey || '?'}"</span>
    </div>
    <Handle type="source" position={Position.Right} style={handleStyle('#a855f7', { right: -7 })} />
  </div>
);

const AIReplyNode = ({ selected }: { selected: boolean }) => (
  <div className={`relative p-4 rounded-2xl border-2 bg-white shadow-lg min-w-[200px] transition-all ${selected ? 'border-fuchsia-500 ring-4 ring-fuchsia-100' : 'border-fuchsia-400'}`}>
    <Handle type="target" position={Position.Top} style={handleStyle('#d946ef', { top: -7 })} />
    <div className="flex items-center gap-2 pb-2 mb-1">
      <div className="w-7 h-7 rounded-xl bg-fuchsia-50 border border-fuchsia-200 text-fuchsia-600 flex items-center justify-center">
        <Cpu className="w-3.5 h-3.5" />
      </div>
      <span className="text-xs font-extrabold text-slate-800">AI Reply (GPT)</span>
      <Zap className="w-3 h-3 text-fuchsia-400 ml-auto animate-pulse" />
    </div>
    <p className="text-[10px] text-slate-400">AI-powered dynamic response to customer query.</p>
    <Handle type="source" position={Position.Bottom} style={handleStyle('#d946ef', { bottom: -7 })} />
  </div>
);

const DelayNode = ({ data, selected }: { data: any; selected: boolean }) => (
  <div className={`relative p-4 rounded-2xl border-2 bg-white shadow-lg min-w-[180px] transition-all ${selected ? 'border-orange-500 ring-4 ring-orange-100' : 'border-orange-400'}`}>
    <Handle type="target" position={Position.Top} style={handleStyle('#f97316', { top: -7 })} />
    <div className="flex items-center gap-2 border-b border-orange-100 pb-2 mb-2">
      <div className="w-7 h-7 rounded-xl bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center">
        <Clock className="w-3.5 h-3.5" />
      </div>
      <span className="text-xs font-extrabold text-slate-800">Delay</span>
    </div>
    <p className="text-sm font-extrabold text-slate-700 text-center py-1">⏳ {data.delayMinutes || '5'} min wait</p>
    <Handle type="source" position={Position.Bottom} style={handleStyle('#f97316', { bottom: -7 })} />
  </div>
);

const TagNode = ({ data, selected }: { data: any; selected: boolean }) => (
  <div className={`relative p-4 rounded-2xl border-2 bg-white shadow-lg min-w-[180px] transition-all ${selected ? 'border-emerald-500 ring-4 ring-emerald-100' : 'border-emerald-400'}`}>
    <Handle type="target" position={Position.Top} style={handleStyle('#10b981', { top: -7 })} />
    <div className="flex items-center gap-2 border-b border-emerald-100 pb-2 mb-2">
      <div className="w-7 h-7 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
        <Tag className="w-3.5 h-3.5" />
      </div>
      <span className="text-xs font-extrabold text-slate-800">CRM Tag</span>
    </div>
    <span className="text-[10px] bg-emerald-50 border border-emerald-100 text-emerald-700 px-3 py-1 rounded-full font-extrabold block text-center">
      🏷️ {data.tag || 'select_tag'}
    </span>
    <Handle type="source" position={Position.Bottom} style={handleStyle('#10b981', { bottom: -7 })} />
  </div>
);

const APINode = ({ data, selected }: { data: any; selected: boolean }) => (
  <div className={`relative p-4 rounded-2xl border-2 bg-white shadow-lg min-w-[220px] transition-all ${selected ? 'border-cyan-500 ring-4 ring-cyan-100' : 'border-cyan-400'}`}>
    <Handle type="target" position={Position.Top} style={handleStyle('#06b6d4', { top: -7 })} />
    <div className="flex items-center gap-2 border-b border-cyan-100 pb-2 mb-2">
      <div className="w-7 h-7 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-600 flex items-center justify-center">
        <Globe className="w-3.5 h-3.5" />
      </div>
      <span className="text-xs font-extrabold text-slate-800">API Request</span>
    </div>
    <p className="text-[10px] font-mono text-cyan-700 font-bold bg-cyan-50/50 p-1.5 rounded-lg border border-cyan-100 truncate">
      {data.method || 'GET'} {data.url || 'https://api.example.com'}
    </p>
    <Handle type="source" position={Position.Bottom} style={handleStyle('#06b6d4', { bottom: -7 })} />
  </div>
);

const AgentNode = ({ data, selected }: { data: any; selected: boolean }) => (
  <div className={`relative p-4 rounded-2xl border-2 bg-white shadow-lg min-w-[200px] transition-all ${selected ? 'border-rose-500 ring-4 ring-rose-100' : 'border-rose-400'}`}>
    <Handle type="target" position={Position.Top} style={handleStyle('#f43f5e', { top: -7 })} />
    <div className="flex items-center gap-2 border-b border-rose-100 pb-2 mb-2">
      <div className="w-7 h-7 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center">
        <Shield className="w-3.5 h-3.5" />
      </div>
      <span className="text-xs font-extrabold text-slate-800">Human Agent</span>
    </div>
    <p className="text-xs text-rose-600 font-extrabold text-center py-1">📞 → {data.agentTeam || 'Admin Team'}</p>
    <Handle type="source" position={Position.Bottom} style={handleStyle('#f43f5e', { bottom: -7 })} />
  </div>
);

const StartNode = () => (
  <div className="relative px-5 py-2.5 rounded-full border-2 border-green-500 bg-green-50 text-green-700 shadow-md font-extrabold text-xs tracking-wider uppercase flex items-center gap-1.5">
    <div className="w-2 h-2 rounded-full bg-green-500 animate-ping" />
    Start Flow
    <Handle type="source" position={Position.Bottom} style={handleStyle('#16a34a', { bottom: -7 })} />
  </div>
);

const EndNode = () => (
  <div className="relative px-5 py-2.5 rounded-full border-2 border-rose-500 bg-rose-50 text-rose-700 shadow-md font-extrabold text-xs tracking-wider uppercase flex items-center gap-1.5">
    <div className="w-2 h-2 rounded-full bg-rose-500" />
    End Flow
    <Handle type="target" position={Position.Top} style={handleStyle('#dc2626', { top: -7 })} />
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// nodeTypes MUST be defined outside component to avoid React Flow warning #002
// ─────────────────────────────────────────────────────────────────────────────
const NODE_TYPES = {
  trigger:   TriggerNode,
  reply:     MessageNode,
  buttons:   ButtonsNode,
  condition: ConditionNode,
  aiReply:   AIReplyNode,
  delay:     DelayNode,
  tag:       TagNode,
  api:       APINode,
  agent:     AgentNode,
  start:     StartNode,
  end:       EndNode,
};

// Default edge options applied to ALL edges
const DEFAULT_EDGE_OPTIONS = {
  type: 'smoothstep',
  animated: true,
  style: { strokeWidth: 3, stroke: '#64748b' },
  markerEnd: { type: MarkerType.ArrowClosed, color: '#64748b', width: 18, height: 18 },
};

// ─────────────────────────────────────────────────────────────────────────────
// Interfaces
// ─────────────────────────────────────────────────────────────────────────────
interface ChatbotFlow {
  id: string;
  name: string;
  triggerKeywords: string[];
  flowJson: { nodes?: any[]; edges?: any[] };
  isActive: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Build a styled edge object from raw edge + source node type
// ─────────────────────────────────────────────────────────────────────────────
function buildStyledEdge(edge: any, nodes: any[]): Edge {
  const srcNode = nodes.find((n: any) => n.id === edge.source);
  const color = getEdgeColor(srcNode?.type);
  return {
    ...edge,
    type: 'smoothstep',
    animated: true,
    style: { stroke: color, strokeWidth: 3 },
    markerEnd: { type: MarkerType.ArrowClosed, color, width: 18, height: 18 },
    labelStyle: edge.label ? { fill: '#1e293b', fontWeight: 800, fontSize: 10 } : undefined,
    labelBgPadding: edge.label ? ([6, 3] as [number, number]) : undefined,
    labelBgBorderRadius: edge.label ? 6 : undefined,
    labelBgStyle: edge.label ? { fill: '#f8fafc', stroke: '#cbd5e1', strokeWidth: 1 } : undefined,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Node library items for the sidebar
// ─────────────────────────────────────────────────────────────────────────────
const NODE_PALETTE = [
  {
    category: 'Basic',
    items: [
      { type: 'trigger',   label: 'Trigger Keyword', color: 'emerald', icon: Key },
      { type: 'reply',     label: 'Send Message',    color: 'blue',    icon: MessageSquare },
      { type: 'buttons',   label: 'Buttons Menu',    color: 'amber',   icon: List },
      { type: 'condition', label: 'Condition',       color: 'purple',  icon: GitFork },
    ],
  },
  {
    category: 'Advanced',
    items: [
      { type: 'aiReply', label: 'AI Reply',        color: 'fuchsia', icon: Cpu },
      { type: 'delay',   label: 'Delay Timer',     color: 'orange',  icon: Clock },
      { type: 'tag',     label: 'CRM Tag',         color: 'emerald', icon: Tag },
      { type: 'api',     label: 'API Webhook',     color: 'cyan',    icon: Globe },
      { type: 'agent',   label: 'Human Handover',  color: 'rose',    icon: Shield },
    ],
  },
  {
    category: 'Flow Control',
    items: [
      { type: 'start', label: 'Start Flow', color: 'green', icon: Play },
      { type: 'end',   label: 'End Flow',   color: 'red',   icon: X },
    ],
  },
];

const colorClasses: Record<string, string> = {
  emerald: 'bg-emerald-100 text-emerald-600 group-hover:bg-emerald-200',
  blue:    'bg-blue-100 text-blue-600 group-hover:bg-blue-200',
  amber:   'bg-amber-100 text-amber-600 group-hover:bg-amber-200',
  purple:  'bg-purple-100 text-purple-600 group-hover:bg-purple-200',
  fuchsia: 'bg-fuchsia-100 text-fuchsia-600 group-hover:bg-fuchsia-200',
  orange:  'bg-orange-100 text-orange-600 group-hover:bg-orange-200',
  cyan:    'bg-cyan-100 text-cyan-600 group-hover:bg-cyan-200',
  rose:    'bg-rose-100 text-rose-600 group-hover:bg-rose-200',
  green:   'bg-green-100 text-green-600 group-hover:bg-green-200',
  red:     'bg-red-100 text-red-600 group-hover:bg-red-200',
};

// ─────────────────────────────────────────────────────────────────────────────
// Default node data per type
// ─────────────────────────────────────────────────────────────────────────────
function defaultNodeData(type: string): any {
  switch (type) {
    case 'trigger':   return { keywords: ['hi', 'hello'] };
    case 'reply':     return { message: 'Type your message here...' };
    case 'buttons':   return { options: ['1. Option One', '2. Option Two'] };
    case 'condition': return { conditionKey: '1' };
    case 'delay':     return { delayMinutes: '5' };
    case 'tag':       return { tag: 'lead_tag' };
    case 'api':       return { method: 'GET', url: 'https://api.example.com' };
    case 'agent':     return { agentTeam: 'Support Team' };
    default:          return {};
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Inner Editor — reads searchParams
// ─────────────────────────────────────────────────────────────────────────────
function FlowEditorInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const flowId = searchParams.get('id');

  const [selectedFlow, setSelectedFlow] = useState<ChatbotFlow | null>(null);
  const [flowName, setFlowName]         = useState('');
  const [isActive, setIsActive]         = useState(true);
  const [loading, setLoading]           = useState(false);
  const [errorMsg, setErrorMsg]         = useState('');
  const [successMsg, setSuccessMsg]     = useState('');

  const [isLeftOpen, setIsLeftOpen]     = useState(true);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode]  = useState<Node | null>(null);
  const [selectedEdge, setSelectedEdge]  = useState<Edge | null>(null);
  const [rfInstance, setRfInstance]      = useState<ReactFlowInstance | null>(null);

  // Chat simulator
  const [simOpen, setSimOpen]           = useState(false);
  const [simMessages, setSimMessages]   = useState<{ sender: 'user' | 'bot'; text: string; time: string }[]>([]);
  const [simInput, setSimInput]         = useState('');
  const [simState, setSimState]         = useState<string | null>(null);
  const simBottom                       = useRef<HTMLDivElement | null>(null);

  // Collapse left panel on small screens automatically
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsLeftOpen(false);
    }
  }, []);

  // ── Load flow on mount ────────────────────────────────────────────────────
  useEffect(() => {
    if (!flowId) {
      setSelectedFlow(null);
      setFlowName('');
      setIsActive(true);
      setNodes([]);
      setEdges([]);
      return;
    }

    const load = async () => {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) { router.push('/dashboard/builder'); return; }

      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/flow/${flowId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const flow: ChatbotFlow = await res.json();
          setSelectedFlow(flow);
          setFlowName(flow.name);
          setIsActive(flow.isActive);

          const json = flow.flowJson;
          const rawNodes = Array.isArray(json?.nodes) ? json.nodes : [];
          const rawEdges = Array.isArray(json?.edges) ? json.edges : [];

          setNodes(rawNodes);
          setEdges(rawEdges.map((e: any) => buildStyledEdge(e, rawNodes)));
        } else {
          router.push('/dashboard/builder');
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [flowId, router, setNodes, setEdges]);

  // ── Selection tracking ────────────────────────────────────────────────────
  const onSelectionChange = useCallback(
    ({ nodes: ns, edges: es }: { nodes: Node[]; edges: Edge[] }) => {
      setSelectedNode(ns[0] ?? null);
      setSelectedEdge(es[0] ?? null);
    },
    []
  );

  // ── Connect handler: color-code + auto-label button options ──────────────
  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => {
        const { source, target, sourceHandle, targetHandle } = params;
        if (!source || !target) return eds;

        const srcNode = nodes.find((n) => n.id === source);
        const color   = getEdgeColor(srcNode?.type);

        let label = '';
        if (sourceHandle?.startsWith('option-')) {
          const idx = parseInt(sourceHandle.split('-')[1]);
          label = srcNode?.data?.options?.[idx] ?? '';
        }

        const newEdge: Edge = {
          id: `edge-${source}-${sourceHandle ?? ''}-${target}-${Date.now()}`,
          source,
          target,
          sourceHandle,
          targetHandle,
          type: 'smoothstep',
          animated: true,
          label,
          labelStyle: { fill: '#1e293b', fontWeight: 800, fontSize: 10 },
          labelBgPadding: [6, 3] as [number, number],
          labelBgBorderRadius: 6,
          labelBgStyle: { fill: '#f8fafc', stroke: '#cbd5e1', strokeWidth: 1 },
          style: { stroke: color, strokeWidth: 3 },
          markerEnd: { type: MarkerType.ArrowClosed, color, width: 18, height: 18 },
        };
        return addEdge(newEdge, eds);
      });
    },
    [nodes, setEdges]
  );

  // ── Add node by click or drag ─────────────────────────────────────────────
  const addNode = useCallback(
    (type: string) => {
      const pos = rfInstance
        ? rfInstance.project({ x: window.innerWidth / 2 - 110, y: window.innerHeight / 2 - 80 })
        : { x: 250, y: 200 };

      setNodes((nds) =>
        nds.concat({
          id:       `${type}_${Date.now()}`,
          type,
          position: pos,
          data:     defaultNodeData(type),
        })
      );
    },
    [rfInstance, setNodes]
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!rfInstance) return;
      const type = e.dataTransfer.getData('application/reactflow');
      if (!type) return;
      const position = rfInstance.project({ x: e.clientX - 240, y: e.clientY - 80 });
      setNodes((nds) =>
        nds.concat({ id: `${type}_${Date.now()}`, type, position, data: defaultNodeData(type) })
      );
    },
    [rfInstance, setNodes]
  );

  const onDragStart = (e: React.DragEvent, type: string) => {
    e.dataTransfer.setData('application/reactflow', type);
    e.dataTransfer.effectAllowed = 'move';
  };

  // ── Node / Edge property updates ──────────────────────────────────────────
  const updateNodeProp = (field: string, value: any) => {
    if (!selectedNode) return;
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id !== selectedNode.id) return n;
        const updated = { ...n, data: { ...n.data, [field]: value } };
        setSelectedNode(updated);
        return updated;
      })
    );
  };

  const updateEdgeLabel = (label: string) => {
    if (!selectedEdge) return;
    setEdges((eds) =>
      eds.map((e) => {
        if (e.id !== selectedEdge.id) return e;
        const updated = {
          ...e,
          label,
          labelStyle: { fill: '#1e293b', fontWeight: 800, fontSize: 10 },
          labelBgPadding: [6, 3] as [number, number],
          labelBgBorderRadius: 6,
          labelBgStyle: { fill: '#f8fafc', stroke: '#cbd5e1', strokeWidth: 1 },
        };
        setSelectedEdge(updated);
        return updated;
      })
    );
  };

  const deleteNode = () => {
    if (!selectedNode) return;
    setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
    setEdges((eds) => eds.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id));
    setSelectedNode(null);
  };

  const deleteEdge = () => {
    if (!selectedEdge) return;
    setEdges((eds) => eds.filter((e) => e.id !== selectedEdge.id));
    setSelectedEdge(null);
  };

  // ── Save flow ─────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    if (!flowName.trim()) { setErrorMsg('Please enter a flow name.'); return; }

    const keywords: string[] = [];
    nodes
      .filter((n) => n.type === 'trigger')
      .forEach((n) => n.data?.keywords?.forEach((k: string) => keywords.push(k.trim().toLowerCase())));

    const token = localStorage.getItem('token');
    if (!token) return;

    const payload = { name: flowName, triggerKeywords: keywords, isActive, flowJson: { nodes, edges } };

    try {
      const url    = selectedFlow ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/flow/${selectedFlow.id}` : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/flow`;
      const method = selectedFlow ? 'PUT' : 'POST';
      const res    = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg('Flow saved successfully!');
        if (!selectedFlow) {
          setSelectedFlow(data);
          router.replace(`/dashboard/builder/editor?id=${data.id}`);
        }
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        setErrorMsg(data.error || 'Failed to save.');
      }
    } catch {
      setErrorMsg('Server connection error.');
    }
  };

  // ── Chat Simulator ────────────────────────────────────────────────────────
  const openSimulator = () => {
    setSimMessages([{ sender: 'bot', text: 'Simulator ready. Type a trigger keyword to test your flow.', time: now() }]);
    setSimState(null);
    setSimInput('');
    setSimOpen(true);
  };

  const now = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const triggerNodeActions = useCallback(
    (node: Node) => {
      setSimState(node.id);
      const t = now();
      if (node.type === 'reply') {
        setSimMessages((p) => [...p, { sender: 'bot', text: node.data?.message || '(empty message)', time: t }]);
      } else if (node.type === 'buttons') {
        const opts = (node.data?.options ?? []).map((o: string, i: number) => {
          // If option already has "N." prefix, use as-is; otherwise add index
          const hasNum = /^\d+[.)]\s/.test(o);
          return hasNum ? `\n👉 ${o}` : `\n👉 ${i + 1}. ${o}`;
        }).join('');
        setSimMessages((p) => [...p, {
          sender: 'bot',
          text: `Choose an option:${opts}\n\n💡 Type the number (e.g. 1) or the option name to select.`,
          time: t
        }]);
      } else if (node.type === 'tag') {
        setSimMessages((p) => [...p, { sender: 'bot', text: `[SYSTEM] Tagged: "${node.data?.tag}"`, time: t }]);
        const next = edges.find((e) => e.source === node.id);
        if (next) { const n = nodes.find((nd) => nd.id === next.target); if (n) setTimeout(() => triggerNodeActions(n), 900); }
      } else if (node.type === 'agent') {
        setSimMessages((p) => [...p, { sender: 'bot', text: `[SYSTEM] Routing to: "${node.data?.agentTeam}"`, time: t }]);
      }
    },
    [edges, nodes]
  );

  const execSim = useCallback(
    (input: string) => {
      const clean = input.trim().toLowerCase();
      const t     = now();

      if (clean === 'reset' || clean === 'exit') {
        setSimState(null);
        setSimMessages((p) => [...p, { sender: 'bot', text: 'Reset. Type a trigger keyword.', time: t }]);
        return;
      }

      const tryFollowEdge = (nodeId: string, userInput: string): boolean => {
        const outEdges = edges.filter((e) => e.source === nodeId);

        // Smart match: supports "1", "A", "a", "Option A", "1. A" etc.
        const match = outEdges.find((e) => {
          if (typeof e.label !== 'string') return false;
          const label = e.label.trim();
          const labelLow = label.toLowerCase();

          // 1. Exact match
          if (labelLow === userInput) return true;

          // 2. Parse "N. Text" format (e.g. "1. A")
          const numTextMatch = label.match(/^(\d+)[.)]\s*(.+)$/);
          if (numTextMatch) {
            const num  = numTextMatch[1];           // "1"
            const text = numTextMatch[2].trim().toLowerCase(); // "a"
            if (userInput === num) return true;             // user typed "1"
            if (userInput === text) return true;            // user typed "a"
            if (userInput === `${num}. ${text}`) return true;
            if (text.includes(userInput)) return true;      // partial text match
          }

          // 3. Fallback: label contains user input or vice versa
          if (labelLow.includes(userInput) || userInput.includes(labelLow)) return true;

          return false;
        });

        if (match) {
          const next = nodes.find((n) => n.id === match.target);
          if (next) { triggerNodeActions(next); return true; }
        }
        return false;
      };

      if (simState) {
        if (tryFollowEdge(simState, clean)) return;
      }

      // Try trigger match
      const trigger = nodes.find((n) => n.type === 'trigger' && n.data?.keywords?.some((k: string) => clean.includes(k.trim().toLowerCase())));
      if (trigger) {
        const edge = edges.find((e) => e.source === trigger.id);
        if (edge) {
          const next = nodes.find((n) => n.id === edge.target);
          if (next) { triggerNodeActions(next); return; }
        }
      }

      setSimMessages((p) => [...p, { sender: 'bot', text: "No match found. Try a trigger keyword or type 'reset'.", time: t }]);
    },
    [simState, nodes, edges, triggerNodeActions]
  );

  const handleSimSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!simInput.trim()) return;
    const text = simInput;
    setSimMessages((p) => [...p, { sender: 'user', text, time: now() }]);
    setSimInput('');
    setTimeout(() => execSim(text), 700);
  };

  useEffect(() => {
    simBottom.current?.scrollIntoView({ behavior: 'smooth' });
  }, [simMessages]);

  // ── Loading screen ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex h-[calc(100vh-14rem)] bg-white border border-slate-200 shadow-sm rounded-3xl items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-500 text-xs font-bold">Loading flow...</span>
        </div>
      </div>
    );
  }

  // ── Main UI ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-[calc(100vh-14rem)] bg-white border border-slate-200 shadow-sm rounded-3xl overflow-hidden relative">

      {/* ── Top Header Bar ── */}
      <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/80 backdrop-blur flex flex-wrap items-center justify-between gap-3 z-10 shrink-0">

        {/* Left: back + name + toggle */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button
            onClick={() => router.push('/dashboard/builder')}
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-all shadow-sm active:scale-95 shrink-0"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Workflows</span>
          </button>

          <div className="w-px h-5 bg-slate-200 shrink-0" />

          <input
            type="text"
            value={flowName}
            onChange={(e) => setFlowName(e.target.value)}
            placeholder="Flow name…"
            className="flex-1 min-w-0 max-w-xs bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 text-xs font-semibold focus:outline-none focus:border-emerald-500 transition-colors shadow-sm"
          />

          <button
            onClick={() => setIsActive((v) => !v)}
            className="flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-800 transition-all shrink-0"
            title={isActive ? 'Click to set Draft' : 'Click to set Active'}
          >
            {isActive
              ? <><ToggleRight className="w-8 h-8 text-emerald-500" /><span className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-wide hidden sm:inline">Active</span></>
              : <><ToggleLeft className="w-8 h-8 text-slate-400" /><span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide hidden sm:inline">Draft</span></>
            }
          </button>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={openSimulator}
            className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
          >
            <Eye className="w-4 h-4 text-slate-500" />
            <span className="hidden sm:inline">Test</span>
          </button>
          <button
            onClick={handleSave}
            className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-extrabold px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
          >
            <Save className="w-4 h-4" />
            Save
          </button>
        </div>
      </div>

      {/* ── Main Canvas Area ── */}
      <div className="flex flex-1 overflow-hidden relative">
        <div className="flex-1 bg-slate-50 relative overflow-hidden">

          {/* Alert toasts */}
          {errorMsg && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-2xl flex items-center gap-2 shadow-lg max-w-sm animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {errorMsg}
              <button onClick={() => setErrorMsg('')} className="ml-auto p-0.5 hover:bg-rose-100 rounded-lg"><X className="w-3 h-3" /></button>
            </div>
          )}
          {successMsg && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold rounded-2xl flex items-center gap-2 shadow-lg max-w-sm animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              {successMsg}
            </div>
          )}

          {/* ── React Flow Canvas ── */}
          <div className="w-full h-full" onDragOver={onDragOver} onDrop={onDrop}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onSelectionChange={onSelectionChange}
              nodeTypes={NODE_TYPES}
              defaultEdgeOptions={DEFAULT_EDGE_OPTIONS}
              onInit={setRfInstance}
              snapToGrid
              snapGrid={[20, 20]}
              fitView
              fitViewOptions={{ padding: 0.2 }}
              className="w-full h-full"
              connectionLineStyle={{ stroke: '#94a3b8', strokeWidth: 2 }}
              connectionLineType={'smoothstep' as any}
            >
              <Background variant={BackgroundVariant.Dots} color="#cbd5e1" gap={20} size={1.5} />
              <Controls
                className="!bg-white !border !border-slate-200 !rounded-2xl !shadow-md !overflow-hidden"
                showInteractive={false}
              />
              <MiniMap
                style={{ borderRadius: '1rem', border: '1px solid #e2e8f0', overflow: 'hidden' }}
                nodeColor={(n) => getEdgeColor(n.type ?? '')}
                maskColor="rgba(248,250,252,0.85)"
              />
            </ReactFlow>
          </div>

          {/* ── LEFT: Collapsible Node Library ── */}
          {isLeftOpen ? (
            <div className="absolute top-4 left-4 z-20 w-52 max-h-[calc(100%-2rem)] bg-white/95 backdrop-blur-sm border border-slate-200 shadow-xl rounded-3xl p-4 overflow-y-auto space-y-4 animate-in slide-in-from-left duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-slate-900 text-xs">Add Node</h4>
                  <p className="text-[9px] text-slate-400 mt-0.5">Drag or click to place</p>
                </div>
                <button onClick={() => setIsLeftOpen(false)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>

              {NODE_PALETTE.map((section) => (
                <div key={section.category} className="space-y-1.5">
                  <span className="text-[8px] font-extrabold text-slate-400 uppercase tracking-widest block">{section.category}</span>
                  {section.items.map(({ type, label, color, icon: Icon }) => (
                    <div
                      key={type}
                      className="group bg-slate-50 hover:bg-white border border-slate-200 hover:border-slate-300 hover:shadow-sm px-2.5 py-2 rounded-xl flex items-center gap-2 cursor-grab text-slate-700 transition-all active:scale-95"
                      draggable
                      onDragStart={(e) => onDragStart(e, type)}
                      onClick={() => addNode(type)}
                    >
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors ${colorClasses[color]}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[10px] font-extrabold truncate">{label}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <button
              onClick={() => setIsLeftOpen(true)}
              className="absolute top-4 left-4 z-20 w-11 h-11 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30 active:scale-95 transition-all animate-in zoom-in duration-200"
              title="Open node library"
            >
              <Plus className="w-5 h-5" />
            </button>
          )}

          {/* ── RIGHT: Node / Edge Settings Panel ── */}
          {(selectedNode || selectedEdge) && (
            <div className="absolute top-4 right-4 z-20 w-72 max-h-[calc(100%-2rem)] bg-white/95 backdrop-blur-sm border border-slate-200 shadow-xl rounded-3xl p-5 overflow-y-auto space-y-4 animate-in slide-in-from-right duration-200">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <div>
                  <h4 className="font-extrabold text-slate-900 text-xs">
                    {selectedNode ? 'Node Settings' : 'Connection Settings'}
                  </h4>
                  <p className="text-[9px] text-slate-400 mt-0.5">Edit properties below</p>
                </div>
                <button
                  onClick={() => { setSelectedNode(null); setSelectedEdge(null); }}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {selectedNode && (
                <div className="space-y-4">
                  {/* Node header badge */}
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-700">
                      {selectedNode.type === 'trigger'   && <Key className="w-3.5 h-3.5 text-emerald-500" />}
                      {selectedNode.type === 'reply'     && <MessageSquare className="w-3.5 h-3.5 text-blue-500" />}
                      {selectedNode.type === 'buttons'   && <List className="w-3.5 h-3.5 text-amber-500" />}
                      {selectedNode.type === 'condition' && <GitFork className="w-3.5 h-3.5 text-purple-500" />}
                      {selectedNode.type === 'aiReply'   && <Cpu className="w-3.5 h-3.5 text-fuchsia-500" />}
                      {selectedNode.type === 'delay'     && <Clock className="w-3.5 h-3.5 text-orange-500" />}
                      {selectedNode.type === 'tag'       && <Tag className="w-3.5 h-3.5 text-emerald-500" />}
                      {selectedNode.type === 'api'       && <Globe className="w-3.5 h-3.5 text-cyan-500" />}
                      {selectedNode.type === 'agent'     && <Shield className="w-3.5 h-3.5 text-rose-500" />}
                    </div>
                    <div>
                      <h5 className="text-[10px] font-extrabold text-slate-900 uppercase tracking-wide">{selectedNode.type} Node</h5>
                      <p className="text-[8px] text-slate-400 font-mono truncate">ID: {selectedNode.id}</p>
                    </div>
                  </div>

                  {/* Trigger */}
                  {selectedNode.type === 'trigger' && (
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest">Trigger Keywords</label>
                      <textarea
                        value={selectedNode.data?.keywords?.join(', ') ?? ''}
                        onChange={(e) => updateNodeProp('keywords', e.target.value.split(',').map((k) => k.trim()).filter(Boolean))}
                        placeholder="hi, hello, admission"
                        rows={3}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 text-xs font-semibold focus:outline-none focus:border-emerald-500 transition-colors shadow-sm resize-none"
                      />
                      <p className="text-[8px] text-slate-400">Comma-separated. Activates this flow when matched.</p>
                    </div>
                  )}

                  {/* Message */}
                  {selectedNode.type === 'reply' && (
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest">Message Body</label>
                      <textarea
                        value={selectedNode.data?.message ?? ''}
                        onChange={(e) => updateNodeProp('message', e.target.value)}
                        placeholder="Welcome! Type 1 for details."
                        rows={5}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 text-xs font-semibold focus:outline-none focus:border-blue-500 transition-colors shadow-sm resize-none"
                      />
                    </div>
                  )}

                  {/* Buttons */}
                  {selectedNode.type === 'buttons' && (
                    <div className="space-y-3">
                      <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest">Options</label>
                      <div className="space-y-2">
                        {(selectedNode.data?.options ?? []).map((opt: string, idx: number) => (
                          <div key={idx} className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-2 rounded-xl">
                            <span className="text-[9px] font-extrabold text-amber-500 w-4">{idx + 1}</span>
                            <input
                              type="text"
                              value={opt}
                              onChange={(e) => {
                                const opts = [...(selectedNode.data.options ?? [])];
                                opts[idx] = e.target.value;
                                updateNodeProp('options', opts);
                              }}
                              className="flex-1 text-xs font-bold text-slate-700 bg-transparent focus:outline-none"
                            />
                            <button
                              onClick={() => {
                                const opts = (selectedNode.data.options ?? []).filter((_: any, i: number) => i !== idx);
                                updateNodeProp('options', opts);
                              }}
                              className="p-0.5 text-slate-300 hover:text-rose-500 transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() => {
                          const opts = [...(selectedNode.data.options ?? []), `${(selectedNode.data.options?.length ?? 0) + 1}. New Option`];
                          updateNodeProp('options', opts);
                        }}
                        className="w-full border border-dashed border-amber-300 hover:border-amber-500 text-amber-600 font-extrabold text-xs py-2 rounded-xl transition-colors"
                      >
                        + Add Option
                      </button>
                      <p className="text-[8px] text-slate-400">Each option creates a separate output handle on the right side of the node. Connect them to different next steps.</p>
                    </div>
                  )}

                  {/* Condition */}
                  {selectedNode.type === 'condition' && (
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest">Match Value</label>
                      <input
                        type="text"
                        value={selectedNode.data?.conditionKey ?? ''}
                        onChange={(e) => updateNodeProp('conditionKey', e.target.value)}
                        placeholder="e.g. 1"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 text-xs font-bold focus:outline-none focus:border-purple-500 transition-colors shadow-sm"
                      />
                    </div>
                  )}

                  {/* Delay */}
                  {selectedNode.type === 'delay' && (
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest">Delay (minutes)</label>
                      <input
                        type="number"
                        min="1"
                        value={selectedNode.data?.delayMinutes ?? '5'}
                        onChange={(e) => updateNodeProp('delayMinutes', e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 text-xs font-bold focus:outline-none focus:border-orange-500 transition-colors shadow-sm"
                      />
                    </div>
                  )}

                  {/* Tag */}
                  {selectedNode.type === 'tag' && (
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest">Tag Name</label>
                      <input
                        type="text"
                        value={selectedNode.data?.tag ?? ''}
                        onChange={(e) => updateNodeProp('tag', e.target.value)}
                        placeholder="e.g. leads_converted"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 text-xs font-bold focus:outline-none focus:border-emerald-500 transition-colors shadow-sm"
                      />
                    </div>
                  )}

                  {/* API */}
                  {selectedNode.type === 'api' && (
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest">Method</label>
                        <select
                          value={selectedNode.data?.method ?? 'GET'}
                          onChange={(e) => updateNodeProp('method', e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-cyan-500 text-slate-700 shadow-sm"
                        >
                          <option>GET</option>
                          <option>POST</option>
                          <option>PUT</option>
                          <option>DELETE</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest">Webhook URL</label>
                        <input
                          type="text"
                          value={selectedNode.data?.url ?? ''}
                          onChange={(e) => updateNodeProp('url', e.target.value)}
                          placeholder="https://api.site.com/endpoint"
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 text-xs font-semibold focus:outline-none focus:border-cyan-500 transition-colors shadow-sm"
                        />
                      </div>
                    </div>
                  )}

                  {/* Agent */}
                  {selectedNode.type === 'agent' && (
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest">Routing Team</label>
                      <input
                        type="text"
                        value={selectedNode.data?.agentTeam ?? ''}
                        onChange={(e) => updateNodeProp('agentTeam', e.target.value)}
                        placeholder="e.g. Sales Team"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 text-xs font-bold focus:outline-none focus:border-rose-500 transition-colors shadow-sm"
                      />
                    </div>
                  )}

                  <button
                    onClick={deleteNode}
                    className="w-full bg-rose-50 border border-rose-100 hover:bg-rose-100 text-rose-600 font-extrabold text-xs py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 active:scale-95"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete Node
                  </button>
                </div>
              )}

              {selectedEdge && (
                <div className="space-y-4">
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl">
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Connection</span>
                    <p className="text-[10px] text-slate-500 font-mono mt-1 truncate">{selectedEdge.source} → {selectedEdge.target}</p>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest">Transition Label</label>
                    <input
                      type="text"
                      value={typeof selectedEdge.label === 'string' ? selectedEdge.label : ''}
                      onChange={(e) => updateEdgeLabel(e.target.value)}
                      placeholder="e.g. 1"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 text-xs font-bold focus:outline-none focus:border-slate-400 transition-colors shadow-sm"
                    />
                    <p className="text-[8px] text-slate-400">The user's reply that triggers this path.</p>
                  </div>
                  <button
                    onClick={deleteEdge}
                    className="w-full bg-rose-50 border border-rose-100 hover:bg-rose-100 text-rose-600 font-extrabold text-xs py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 active:scale-95"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete Connection
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Chat Simulator Overlay ── */}
      {simOpen && (
        <div className="absolute inset-0 z-50 bg-slate-900/40 backdrop-blur-[2px] flex justify-end animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white h-full border-l border-slate-200 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 text-white p-4 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm">Flow Simulator</h4>
                  <span className="text-[10px] text-emerald-100 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-300 animate-pulse inline-block" />
                    Interactive Sandbox
                  </span>
                </div>
              </div>
              <button onClick={() => setSimOpen(false)} className="p-2 hover:bg-emerald-700 rounded-xl transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/50">
              {simMessages.map((m, i) => {
                const isUser = m.sender === 'user';
                return (
                  <div key={i} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[260px] p-3 rounded-2xl text-xs font-semibold shadow-sm ${
                      isUser
                        ? 'bg-emerald-500 text-white rounded-tr-none'
                        : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'
                    }`}>
                      <p className="whitespace-pre-line leading-relaxed">{m.text}</p>
                      <span className={`block text-right text-[9px] mt-1 ${isUser ? 'text-emerald-200' : 'text-slate-400'}`}>{m.time}</span>
                    </div>
                  </div>
                );
              })}
              <div ref={simBottom} />
            </div>

            {/* Input */}
            <form onSubmit={handleSimSubmit} className="p-3 border-t border-slate-200 bg-white flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setSimState(null);
                  setSimMessages([{ sender: 'bot', text: 'Simulator reset. Type a trigger keyword.', time: now() }]);
                }}
                className="w-9 h-9 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl flex items-center justify-center shrink-0 transition-colors"
                title="Reset"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
              <input
                type="text"
                value={simInput}
                onChange={(e) => setSimInput(e.target.value)}
                placeholder="Type trigger or option…"
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 text-xs font-semibold focus:outline-none focus:border-emerald-500 transition-colors"
              />
              <button
                type="submit"
                disabled={!simInput.trim()}
                className="w-9 h-9 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl flex items-center justify-center shrink-0 shadow-md active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page export — wraps inner in Suspense for useSearchParams
// ─────────────────────────────────────────────────────────────────────────────
export default function FlowEditorPage() {
  return (
    <Suspense fallback={
      <div className="flex h-[calc(100vh-14rem)] bg-white border border-slate-200 shadow-sm rounded-3xl items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-500 text-xs font-bold">Initializing editor…</span>
        </div>
      </div>
    }>
      <FlowEditorInner />
    </Suspense>
  );
}
