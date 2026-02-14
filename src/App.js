import React, { useState, useCallback, useEffect } from 'react';
import ReactFlow, { 
  addEdge, Background, Controls, applyNodeChanges, applyEdgeChanges, MarkerType 
} from 'reactflow';
import { toPng, toJpeg, toSvg } from 'html-to-image';
import { jsPDF } from 'jspdf';
import download from 'downloadjs';
import 'reactflow/dist/style.css';
import { Layers, Link, Download, FileJson, Image as ImageIcon, FileText, X, Trash2 } from 'lucide-react';
import TableNode from './TableNode';

const nodeTypes = { tableNode: TableNode };

 const REL_OPTIONS = [
  { value: 'oneToOne', label: '1:1 (One to One)', short: '1:1', color: '#10b981' }, // Emerald
  { value: 'oneToMany', label: '1:N (One to Many)', short: '1:N', color: '#3b82f6' }, // Blue
  { value: 'manyToMany', label: 'N:M (Many to Many)', short: 'N:M', color: '#8b5cf6' }, // Violet
  { value: 'identifying', label: 'Identifying', short: 'ID', color: '#ef4444' }, // Red
  { value: 'nonIdentifying', label: 'Non-Identifying', short: 'NI', color: '#f59e0b' }, // Amber
  { value: 'optional', label: 'Optional', short: '0:N', color: '#64748b' }, // Slate
];

export default function App() {
  // --- State Initialization ---
  const [nodes, setNodes] = useState(() => JSON.parse(localStorage.getItem('nodes')) || []);
  const [edges, setEdges] = useState(() => JSON.parse(localStorage.getItem('edges')) || []);
  const [tableName, setTableName] = useState('');
  const [schemaText, setSchemaText] = useState('');
  const [editingNodeId, setEditingNodeId] = useState(null);
  
  const [sourceTable, setSourceTable] = useState('');
  const [targetTable, setTargetTable] = useState('');
  const [relType, setRelType] = useState('oneToMany');
  const [relColor, setRelColor] = useState('#3b82f6');
  const [editingEdgeId, setEditingEdgeId] = useState(null);

  // --- Persistence ---
  useEffect(() => {
    localStorage.setItem('nodes', JSON.stringify(nodes));
    localStorage.setItem('edges', JSON.stringify(edges));
  }, [nodes, edges]);

  // --- Node Handlers (Defined early to prevent initialization errors) ---
  const onDelete = useCallback((id) => {
    setNodes(nds => nds.filter(n => n.id !== id));
    setEdges(eds => eds.filter(e => e.source !== id && e.target !== id));
  }, []);

  const onEdit = useCallback((id) => {
    setNodes((nds) => {
      const nodeToEdit = nds.find(n => n.id === id);
      if (nodeToEdit) {
        setEditingNodeId(id);
        setTableName(nodeToEdit.id);
        const text = nodeToEdit.data.columns
          .map(c => `${c.name} ${c.type}${c.isPK ? ' pk' : ''}`)
          .join('\n');
        setSchemaText(text);
      }
      return nds;
    });
  }, []);

  // Sync actions to nodes
  useEffect(() => {
    setNodes(nds => nds.map(node => ({
      ...node,
      data: { ...node.data, onEdit, onDelete, id: node.id }
    })));
  }, [onEdit, onDelete]);

  const addTable = () => {
    if (!tableName || !schemaText) return;
    const columns = schemaText.split('\n').filter(line => line.trim()).map(line => {
     const parts = line.trim().split(/[,\s]+/).filter(Boolean);
      return { 
        name: parts[0], 
        type: parts[1] || 'VARCHAR', 
        isPK: parts.some(p => p.toLowerCase() === 'pk') 
      };
    });

    if (editingNodeId) {
      setNodes(nds => nds.map(node => 
        node.id === editingNodeId 
          ? { ...node, id: tableName, data: { ...node.data, id: tableName, label: tableName, columns } } 
          : node
      ));
      if (editingNodeId !== tableName) {
        setEdges(eds => eds.map(edge => ({
          ...edge,
          source: edge.source === editingNodeId ? tableName : edge.source,
          target: edge.target === editingNodeId ? tableName : edge.target
        })));
      }
      setEditingNodeId(null);
    } else {
      setNodes(nds => nds.concat({
        id: tableName,
        type: 'tableNode',
        position: { x: Math.random() * 300, y: Math.random() * 300 },
        data: { id: tableName, label: tableName, columns, onEdit, onDelete }
      }));
    }
    setTableName(''); setSchemaText('');
  };

  // --- Relationship Actions ---
  const onEdgeClick = useCallback((event, edge) => {
    setEditingEdgeId(edge.id);
    setSourceTable(edge.source);
    setTargetTable(edge.target);
    setRelColor(edge.style.stroke);
    const opt = REL_OPTIONS.find(o => o.short === edge.label);
    if(opt) setRelType(opt.value);
  }, []);

  const saveRelationship = () => {
    if (!sourceTable || !targetTable) return;
    const selectedOpt = REL_OPTIONS.find(o => o.value === relType);
    const edgeConfig = {
      label: selectedOpt?.short || '1:N',
      markerEnd: { type: MarkerType.ArrowClosed, color: relColor },
      style: { stroke: relColor, strokeWidth: 2 },
      labelBgStyle: { fill: relColor, fillOpacity: 1 },
      labelStyle: { fill: '#fff', fontWeight: 800, fontSize: 10 },
    };

    if (editingEdgeId) {
      setEdges(eds => eds.map(e => e.id === editingEdgeId ? { ...e, source: sourceTable, target: targetTable, ...edgeConfig } : e));
    } else {
      const newEdge = {
        id: `e-${Date.now()}`,
        source: sourceTable,
        target: targetTable,
        type: 'smoothstep',
        ...edgeConfig
      };
      setEdges((eds) => addEdge(newEdge, eds));
    }
    setEditingEdgeId(null); setSourceTable(''); setTargetTable('');
  };

  // --- Export Function ---
  const onExport = async (type) => {
    const element = document.querySelector('.react-flow__viewport');
    if (!element) return;
    const options = { backgroundColor: '#ffffff', quality: 1 };
    try {
      if (type === 'png') download(await toPng(element, options), `schema-${Date.now()}.png`);
      if (type === 'pdf') {
        const img = await toPng(element, options);
        const pdf = new jsPDF('l', 'px', [element.offsetWidth, element.offsetHeight]);
        pdf.addImage(img, 'PNG', 0, 0, element.offsetWidth, element.offsetHeight);
        pdf.save(`schema-${Date.now()}.pdf`);
      }
      if (type === 'json') {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ nodes, edges }));
        download(dataStr, "lineage-backup.json");
      }
    } catch (err) { console.error(err); }
  };

  const onNodesChange = useCallback((changes) => setNodes((nds) => applyNodeChanges(changes, nds)), []);
  const onEdgesChange = useCallback((changes) => setEdges((eds) => applyEdgeChanges(changes, eds)), []);

  return (
    <div className="flex h-screen w-screen bg-slate-50 font-sans text-slate-900">
      <aside className="w-80 h-full bg-slate-900 text-white p-6 shadow-2xl z-20 flex flex-col overflow-y-auto">
        <div className="flex items-center gap-3 mb-8">
          <Layers size={24} className="text-blue-500" />
          <h1 className="text-xl font-bold tracking-tight text-white">LineagePro</h1>
        </div>

        <div className="flex-1 space-y-6">
          {/* Section 1: Schema Input */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{editingNodeId ? 'Edit Table' : '1. Schema Input'}</label>
              {editingNodeId && <button onClick={() => {setEditingNodeId(null); setTableName(''); setSchemaText('');}}><X size={14}/></button>}
            </div>
            <input className="w-full bg-slate-800 border border-slate-700 p-2 rounded text-sm outline-none focus:border-blue-500" placeholder="Table Name" value={tableName} onChange={e => setTableName(e.target.value)} />
            <textarea className="w-full bg-slate-800 border border-slate-700 p-2 rounded h-40 text-xs font-mono outline-none focus:border-blue-500" placeholder="id, INT, pk&#10;name, VARCHAR" value={schemaText}  onChange={e => setSchemaText(e.target.value)} />
            <button onClick={addTable} className={`w-full py-2 rounded font-bold transition ${editingNodeId ? 'bg-amber-600' : 'bg-blue-600'}`}>
              {editingNodeId ? 'Update Table' : 'Add Table'}
            </button>
          </div>

          {/* Section 2: Relationships */}
         {/* Section 2: Relationships */}
<div className="pt-6 border-t border-slate-800 space-y-4">
  <div className="flex justify-between items-center">
    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">2. Relationships</label>
    {editingEdgeId && (
      <button onClick={() => {setEditingEdgeId(null); setSourceTable(''); setTargetTable('');}} className="text-red-400 hover:text-red-300">
        <X size={14}/>
      </button>
    )}
  </div>

  <div className="grid grid-cols-2 gap-2">
    <select className="bg-slate-800 p-2 rounded text-[10px] border border-slate-700 outline-none" value={sourceTable} onChange={e => setSourceTable(e.target.value)}>
      <option value="">Source</option>
      {nodes.map(n => <option key={n.id} value={n.id}>{n.id}</option>)}
    </select>
    <select className="bg-slate-800 p-2 rounded text-[10px] border border-slate-700 outline-none" value={targetTable} onChange={e => setTargetTable(e.target.value)}>
      <option value="">Target</option>
      {nodes.map(n => <option key={n.id} value={n.id}>{n.id}</option>)}
    </select>
  </div>

  <select 
    className="w-full bg-slate-800 p-2 rounded text-[10px] border border-slate-700 outline-none" 
    value={relType} 
    onChange={e => {
      const opt = REL_OPTIONS.find(o => o.value === e.target.value);
      setRelType(e.target.value);
      if (opt) setRelColor(opt.color);
    }}
  >
    {REL_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
  </select>

  {/* Color Presets Picker */}
  <div className="flex flex-wrap gap-2 py-1">
    {['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#64748b', '#ffffff'].map(color => (
      <button
        key={color}
        onClick={() => setRelColor(color)}
        className={`w-5 h-5 rounded-full border-2 transition-transform hover:scale-110 ${relColor === color ? 'border-white' : 'border-transparent'}`}
        style={{ backgroundColor: color }}
      />
    ))}
    <input 
      type="color" 
      value={relColor} 
      onChange={(e) => setRelColor(e.target.value)}
      className="w-5 h-5 bg-transparent cursor-pointer"
    />
  </div>

  <button 
    onClick={saveRelationship} 
    style={{ backgroundColor: relColor }} 
    className="w-full py-2 rounded font-bold flex items-center justify-center gap-2 text-white shadow-lg filter brightness-90 hover:brightness-110 transition-all"
  >
    <Link size={14}/> {editingEdgeId ? 'Update Link' : 'Link Tables'}
  </button>
</div>

          {/* Section 3: Export */}
          <div className="pt-6 border-t border-slate-800 space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">3. Export</label>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => onExport('png')} className="bg-slate-800 p-2 rounded text-[10px] font-bold flex items-center justify-center gap-2"><ImageIcon size={12}/> PNG</button>
              <button onClick={() => onExport('pdf')} className="bg-slate-800 p-2 rounded text-[10px] font-bold flex items-center justify-center gap-2"><FileText size={12}/> PDF</button>
              <button onClick={() => onExport('json')} className="col-span-2 bg-slate-800 p-2 rounded text-[10px] font-bold flex items-center justify-center gap-2"><FileJson size={12}/> Backup JSON</button>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 h-full relative">
        <ReactFlow 
          nodes={nodes} 
          edges={edges} 
          onNodesChange={onNodesChange} 
          onEdgesChange={onEdgesChange} 
          onEdgeClick={onEdgeClick}
          nodeTypes={nodeTypes} 
          fitView
        >
          <Background color="#cbd5e1" variant="dots" gap={20} /> 
          <Controls />
        </ReactFlow>
      </main>
    </div>
  );
}