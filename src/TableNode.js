import React, { useState, useCallback, useEffect } from 'react';
import ReactFlow, { 
  addEdge, Background, Controls, applyNodeChanges, applyEdgeChanges, MarkerType 
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Layers, RefreshCcw, Key, Palette, Share2, Download } from 'lucide-react';
import TableNode from './TableNode';

const nodeTypes = { tableNode: TableNode };

const COLORS = [
  { name: 'Gold', hex: '#fbbf24' },
  { name: 'Silver', hex: '#94a3b8' },
  { name: 'Bronze', hex: '#cd7f32' },
  { name: 'Landing', hex: '#22c55e' },
  { name: 'Neutral', hex: '#1e293b' }
];

export default function App() {
  const [nodes, setNodes] = useState(() => JSON.parse(localStorage.getItem('nodes')) || []);
  const [edges, setEdges] = useState(() => JSON.parse(localStorage.getItem('edges')) || []);
  const [tableName, setTableName] = useState('');
  const [schemaText, setSchemaText] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLORS[4].hex);
  const [editingNodeId, setEditingNodeId] = useState(null);

  // Relationship Selection States
  const [sourceHandle, setSourceHandle] = useState('');
  const [targetHandle, setTargetHandle] = useState('');
  const [relType, setRelType] = useState('oneToOne');

  // Logic to re-bind functions that were lost during LocalStorage serialization
  useEffect(() => {
    if (nodes.length > 0) {
      setNodes((nds) => 
        nds.map((node) => ({
          ...node,
          data: {
            ...node.data,
            onEdit,
            onDelete: (id) => setNodes((prev) => prev.filter((n) => n.id !== id)),
          },
        }))
      );
    }
  }, []); // Re-bind once on mount

  useEffect(() => {
    localStorage.setItem('nodes', JSON.stringify(nodes));
    localStorage.setItem('edges', JSON.stringify(edges));
  }, [nodes, edges]);

  // Parser: Strips datatypes like VARCHAR and handles commas
  const parseSchema = (text) => {
    return text.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => {
        const isPK = /\(pk\)|\(key\)/i.test(line);
        const name = line
          .replace(/\(pk\)|\(key\)/gi, '')
          .replace(/[,;]/g, '')
          .replace(/\s+(VARCHAR|STRING|INT|TIMESTAMP|DATE|NUMBER|DECIMAL|FLOAT|BOOLEAN|BIGINT).*/gi, '')
          .trim();
        return { name, isPK };
      });
  };

  // Full Reset Logic: Clears storage and all UI selection states
  const clearCanvas = () => {
    if (window.confirm("Delete all data and reset entire canvas?")) {
      localStorage.clear();
      setNodes([]);
      setEdges([]);
      setSourceHandle('');
      setTargetHandle('');
      setTableName('');
      setSchemaText('');
      setEditingNodeId(null);
    }
  };

  const onEdit = useCallback((id) => {
    setNodes((nds) => {
      const node = nds.find(n => n.id === id);
      if (node) {
        setEditingNodeId(id);
        setTableName(node.data.label);
        setSelectedColor(node.data.color || COLORS[4].hex);
        const text = node.data.columns
          .map(c => `${c.name}${c.isPK ? ' (pk)' : ''}`)
          .join('\n');
        setSchemaText(text);
      }
      return nds;
    });
  }, []);

  const addTable = () => {
    if (!tableName || !schemaText) return;
    const columns = parseSchema(schemaText);
    const newNodeData = { 
      label: tableName, 
      columns, 
      color: selectedColor, 
      onEdit, 
      onDelete: (id) => setNodes(nds => nds.filter(n => n.id !== id)) 
    };

    if (editingNodeId) {
      setNodes(nds => nds.map(n => n.id === editingNodeId ? { ...n, data: { ...newNodeData, id: n.id } } : n));
      setEditingNodeId(null);
    } else {
      const id = `node_${Date.now()}`;
      setNodes(nds => nds.concat({ 
        id, type: 'tableNode', 
        position: { x: 350, y: 150 }, 
        data: { ...newNodeData, id } 
      }));
    }
    setTableName(''); setSchemaText('');
  };

  const linkTables = () => {
    if (!sourceHandle || !targetHandle) return;
    const [sId, sCol] = sourceHandle.split('|');
    const [tId, tCol] = targetHandle.split('|');
    const isOneToMany = relType === 'oneToMany';

    const newEdge = {
      id: `e-${sId}${sCol}-${tId}${tCol}`,
      source: sId, sourceHandle: sCol,
      target: tId, targetHandle: tCol,
      animated: true,
      // Relationship arrow style logic
      markerEnd: { 
        type: isOneToMany ? MarkerType.Arrow : MarkerType.ArrowClosed, 
        color: '#3b82f6', width: 25, height: 25 
      },
      style: { strokeWidth: 2, stroke: '#3b82f6' },
    };
    setEdges((eds) => addEdge(newEdge, eds));
  };

  return (
    <div className="flex h-screen w-screen bg-slate-100 overflow-hidden font-sans text-slate-900">
      <aside className="w-80 h-full bg-[#0f172a] text-white p-6 flex flex-col z-50 shadow-2xl overflow-y-auto border-r border-slate-800">
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Layers className="text-blue-500" />
            <span className="text-xl font-bold tracking-tight">LineagePro</span>
          </div>
          <button onClick={clearCanvas} className="text-slate-500 hover:text-red-400 p-2 transition-colors">
            <RefreshCcw size={18} />
          </button>
        </div>

        <div className="space-y-6">
          <section>
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2">1. Table Identity</label>
            <input className="w-full bg-[#1e293b] border border-slate-700 p-2.5 rounded text-sm mb-4 outline-none focus:border-blue-500" value={tableName} onChange={e => setTableName(e.target.value)} placeholder="DB.SCHEMA.TABLE" />
            
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2">Header Color</label>
            <div className="flex gap-3 mb-4">
              {COLORS.map(c => (
                <button key={c.hex} onClick={() => setSelectedColor(c.hex)} className={`w-6 h-6 rounded-full border-2 transition-transform ${selectedColor === c.hex ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-40 hover:opacity-100'}`} style={{ backgroundColor: c.hex }} />
              ))}
            </div>

            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2">Columns</label>
            <textarea className="w-full bg-[#1e293b] border border-slate-700 p-2.5 rounded h-32 text-xs font-mono mb-4 outline-none focus:border-blue-500" value={schemaText} onChange={e => setSchemaText(e.target.value)} placeholder="ID (pk)&#10;NAME VARCHAR" />
            
            <button onClick={addTable} className={`w-full py-3 rounded font-bold text-sm shadow-xl transition-all ${editingNodeId ? 'bg-orange-600 hover:bg-orange-500' : 'bg-blue-600 hover:bg-blue-500'}`}>
              {editingNodeId ? 'Update Table' : 'Add Table'}
            </button>
          </section>

          <section className="pt-6 border-t border-slate-800">
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-3">2. Relationships</label>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <select className="bg-[#1e293b] text-[10px] p-2 rounded border border-slate-700 outline-none" value={sourceHandle} onChange={e => setSourceHandle(e.target.value)}>
                <option value="">Source</option>
                {nodes.flatMap(n => n.data.columns.map(c => <option key={`s-${n.id}-${c.name}`} value={`${n.id}|${c.name}`}>{n.data.label}.{c.name}</option>))}
              </select>
              <select className="bg-[#1e293b] text-[10px] p-2 rounded border border-slate-700 outline-none" value={targetHandle} onChange={e => setTargetHandle(e.target.value)}>
                <option value="">Target</option>
                {nodes.flatMap(n => n.data.columns.map(c => <option key={`t-${n.id}-${c.name}`} value={`${n.id}|${c.name}`}>{n.data.label}.{c.name}</option>))}
              </select>
            </div>
            <select className="w-full bg-[#1e293b] text-[10px] p-2 rounded border border-slate-700 mb-3" value={relType} onChange={e => setRelType(e.target.value)}>
              <option value="oneToOne">1:1 (Direct Arrow)</option>
              <option value="oneToMany">1:N (Crow's Foot Style)</option>
            </select>
            <button onClick={linkTables} className="w-full py-2 bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded flex items-center justify-center gap-2 text-[11px] font-bold hover:bg-blue-600 hover:text-white transition-all">
              <Share2 size={14} /> Link Tables
            </button>
          </section>

          <section className="pt-6 border-t border-slate-800">
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-3 flex items-center gap-2">
              <Download size={12} /> 3. Export Options
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button className="bg-slate-800 p-2 rounded text-[10px] font-bold hover:bg-slate-700 transition-colors">JSON</button>
              <button className="bg-slate-800 p-2 rounded text-[10px] font-bold hover:bg-slate-700 transition-colors">SVG</button>
              <button className="bg-blue-600/20 text-blue-400 p-2 rounded text-[10px] font-bold border border-blue-500/20 hover:bg-blue-600 hover:text-white transition-colors">PDF</button>
            </div>
          </section>
        </div>
      </aside>

      <main className="flex-1 bg-slate-200">
        <ReactFlow 
          nodes={nodes} edges={edges} 
          onNodesChange={(c) => setNodes(n => applyNodeChanges(c, n))}
          onEdgesChange={(c) => setEdges(e => applyEdgeChanges(c, e))}
          nodeTypes={nodeTypes}
          fitView
        >
          <Background color="#94a3b8" variant="dots" />
          <Controls />
        </ReactFlow>
      </main>
    </div>
  );
}