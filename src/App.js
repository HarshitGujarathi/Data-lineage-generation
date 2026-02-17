import React, { useState, useCallback, useEffect } from 'react';
import ReactFlow, { 
  addEdge, Background, Controls, applyNodeChanges, applyEdgeChanges, MarkerType 
} from 'reactflow';
import { toSvg, toPng } from 'html-to-image';
import 'reactflow/dist/style.css';
import { Layers, RefreshCcw, Trash2, Download, Settings2, Table as TableIcon } from 'lucide-react';
import TableNode from './TableNode';

const nodeTypes = { tableNode: TableNode };

export default function App() {
  const [nodes, setNodes] = useState(() => JSON.parse(localStorage.getItem('nodes')) || []);
  const [edges, setEdges] = useState(() => JSON.parse(localStorage.getItem('edges')) || []);
  const [tableName, setTableName] = useState('');
  const [schemaText, setSchemaText] = useState(''); // Now expects: col1, col2 (pk), col3
  const [selectedColor, setSelectedColor] = useState('#fbbf24');
  const [relType, setRelType] = useState('oneToOne');
  const [edgeToDelete, setEdgeToDelete] = useState('');
  const [editingNodeId, setEditingNodeId] = useState(null);

  const [legend, setLegend] = useState(() => JSON.parse(localStorage.getItem('legend')) || [
    { id: 'gold', name: 'Reporting Layer', hex: '#fbbf24', desc: 'Aggregated Data' },
    { id: 'silver', name: 'Warehouse Layer', hex: '#94a3b8', desc: 'Cleaned Data' },
    { id: 'bronze', name: 'Staging Layer', hex: '#cd7f32', desc: 'Raw Data' },
    { id: 'landing', name: 'External Source', hex: '#22c55e', desc: 'Inbound API/Files' },
  ]);

  useEffect(() => {
    localStorage.setItem('nodes', JSON.stringify(nodes));
    localStorage.setItem('edges', JSON.stringify(edges));
    localStorage.setItem('legend', JSON.stringify(legend));
  }, [nodes, edges, legend]);

  const updateLegend = (index, field, value) => {
    const updated = [...legend];
    updated[index][field] = value;
    setLegend(updated);
  };
const onDeleteNode = useCallback((id) => {
    setNodes((nds) => nds.filter((node) => node.id !== id));
    setEdges((eds) => eds.filter((edge) => edge.source !== id && edge.target !== id));
  }, []);

  const onStartEdit = useCallback((id, currentData) => {
    setEditingNodeId(id);
    setTableName(currentData.label);
    // Convert array back to comma-separated string for editing
    setSchemaText(currentData.columns.map(c => `${c.name}${c.isPK ? ' (pk)' : ''}`).join(', '));
    setSelectedColor(currentData.color);
  }, []);

  const addTable = () => {
    if (!tableName || !schemaText) return;

    // CHANGE: Split by comma instead of newline
    const columns = schemaText.split(',').filter(l => l.trim()).map(item => ({
      name: item.replace(/\(pk\)/gi, '').trim(),
      isPK: /\(pk\)/i.test(item)
    }));
    
    // We pass the handlers into the data object so the Custom Node can call them
    const nodeData = { 
      label: tableName, 
      columns, 
      color: selectedColor, 
      onDelete: onDeleteNode, 
      onEdit: onStartEdit 
    };

    if (editingNodeId) {
      // UPDATE EXISTING
      setNodes(nds => nds.map(n => n.id === editingNodeId ? { ...n, data: nodeData } : n));
      setEditingNodeId(null);
    } else {
      // ADD NEW
      const newNode = { 
        id: `node_${Date.now()}`, 
        type: 'tableNode', 
        position: { x: 400, y: 100 }, 
        data: nodeData 
      };
      setNodes(nds => nds.concat(newNode));
    }

    // Reset Form
    setTableName('');
    setSchemaText('');
  };
  const onConnect = useCallback((params) => {
    const edge = {
      ...params,
      id: `e-${Date.now()}`,
      type: 'straight',
      style: { strokeWidth: 2, stroke: '#3b82f6' },
    };

    switch (relType) {
      case 'oneToMany': edge.markerEnd = { type: MarkerType.Arrow, color: '#3b82f6' }; break;
      case 'manyToOne': edge.markerStart = { type: MarkerType.Arrow, color: '#3b82f6' }; break;
      case 'manyToMany': 
        edge.markerStart = { type: MarkerType.Arrow, color: '#3b82f6' }; 
        edge.markerEnd = { type: MarkerType.Arrow, color: '#3b82f6' }; break;
      default: edge.markerEnd = { type: MarkerType.ArrowClosed, color: '#3b82f6' };
    }
    setEdges((eds) => addEdge(edge, eds));
  }, [relType]);

  const addTable = () => {
    if (!tableName || !schemaText) return;

    const columns = schemaText.split('\n').filter(l => l.trim()).map(line => ({
      // This regex removes the (pk) tag from the display name
      name: line.replace(/\(pk\)/gi, '').trim(),
      isPK: /\(pk\)/i.test(line)
    }));
    
    // Define the delete/edit handlers to pass into the node
    const onDelete = (id) => setNodes(nds => nds.filter(n => n.id !== id));
    const onEdit = (id) => {
      const node = nodes.find(n => n.id === id);
      if (node) {
        setEditingNodeId(id);
        setTableName(node.data.label);
        setSchemaText(node.data.columns.map(c => `${c.name}${c.isPK ? ' (pk)' : ''}`).join('\n'));
        setSelectedColor(node.data.color);
      }
    };

    const data = { label: tableName, columns, color: selectedColor, onDelete, onEdit };

    if (editingNodeId) {
      setNodes(nds => nds.map(n => n.id === editingNodeId ? { ...n, data } : n));
      setEditingNodeId(null);
    } else {
      setNodes(nds => nds.concat({ 
        id: `node_${Date.now()}`, 
        type: 'tableNode', 
        position: { x: 300, y: 150 }, 
        data 
      }));
    }
    setTableName(''); setSchemaText('');
  };

  const exportDiagram = (format) => {
    const flowElement = document.querySelector('.react-flow');
    const action = format === 'svg' ? toSvg : toPng;
    action(flowElement, { backgroundColor: '#f1f5f9' }).then((url) => {
      const link = document.createElement('a');
      link.download = `lineage_diagram.${format}`;
      link.href = url;
      link.click();
    });
  };

  return (
    <div className="flex h-screen w-screen bg-slate-100 overflow-hidden font-sans text-slate-900">
      <aside className="w-80 h-full bg-[#0f172a] text-white p-6 flex flex-col z-50 shadow-2xl overflow-y-auto border-r border-slate-800">
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Layers className="text-blue-500" />
            <span className="text-xl font-bold">LineagePro</span>
          </div>
          <button onClick={() => {localStorage.clear(); window.location.reload()}} className="text-slate-500 hover:text-red-400">
            <RefreshCcw size={18} />
          </button>
        </div>

        <div className="space-y-6">
          <section>
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2">1. Configure Table</label>
            <input className="w-full bg-[#1e293b] border border-slate-700 p-2.5 rounded text-sm mb-4 outline-none focus:border-blue-500" 
              value={tableName} onChange={e => setTableName(e.target.value)} placeholder="TABLE_NAME" />
            
            <div className="flex gap-2 mb-4">
              {legend.map(c => (
                <button key={c.hex} onClick={() => setSelectedColor(c.hex)} 
                  className={`w-6 h-6 rounded-full border-2 ${selectedColor === c.hex ? 'border-white' : 'border-transparent'}`} 
                  style={{ backgroundColor: c.hex }} 
                />
              ))}
            </div>
            
            <textarea className="w-full bg-[#1e293b] border border-slate-700 p-2.5 rounded h-32 text-xs font-mono mb-4 outline-none focus:border-blue-500" 
              value={schemaText} onChange={e => setSchemaText(e.target.value)} placeholder="column_name (pk)" />
            
            <button onClick={addTable} className="w-full py-3 rounded font-bold text-sm bg-blue-600 hover:bg-blue-500 transition-colors">
              {editingNodeId ? 'Update Table' : 'Add Table'}
            </button>
          </section>

          <section className="pt-6 border-t border-slate-800">
            <div className="flex items-center gap-2 mb-4 text-blue-400">
              <Settings2 size={14} /><label className="text-[10px] font-bold uppercase tracking-wider">Dynamic Legend</label>
            </div>
            <div className="space-y-3">
              {legend.map((item, idx) => (
                <div key={item.id} className="flex flex-col gap-1 p-2 bg-[#1e293b] rounded border border-slate-700">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.hex }} />
                    <input className="bg-transparent border-none text-[10px] font-bold text-slate-200 outline-none w-full" 
                      value={item.name} onChange={(e) => updateLegend(idx, 'name', e.target.value)} />
                  </div>
                  <input className="bg-transparent border-none text-[9px] text-slate-400 outline-none italic w-full" 
                    value={item.desc} onChange={(e) => updateLegend(idx, 'desc', e.target.value)} placeholder="Layer description..." />
                </div>
              ))}
            </div>
          </section>

          <section className="pt-6 border-t border-slate-800">
            <label className="text-[10px] font-bold text-blue-400 uppercase block mb-3">2. Connection Settings</label>
            <select className="w-full bg-[#1e293b] text-[10px] p-2 rounded border border-slate-700 mb-4 outline-none" 
              value={relType} onChange={e => setRelType(e.target.value)}>
              <option value="oneToOne">1:1 (Direct)</option>
              <option value="oneToMany">1:N (Many End)</option>
              <option value="manyToOne">N:1 (Many Start)</option>
              <option value="manyToMany">N:N (Both Ends)</option>
            </select>

            <select className="w-full bg-[#1e293b] text-[10px] p-2 rounded border border-slate-700 mb-2 outline-none" 
              value={edgeToDelete} onChange={e => setEdgeToDelete(e.target.value)}>
              <option value="">Select Connection to Delete</option>
              {edges.map(e => (
                <option key={e.id} value={e.id}>
                  {nodes.find(n => n.id === e.source)?.data.label} → {nodes.find(n => n.id === e.target)?.data.label}
                </option>
              ))}
            </select>
            <button onClick={() => {setEdges(eds => eds.filter(e => e.id !== edgeToDelete)); setEdgeToDelete('');}} 
              className="w-full py-2 bg-red-600/20 text-red-500 border border-red-500/30 rounded font-bold text-[11px]">
              <Trash2 size={14} className="inline mr-1" /> Delete Connection
            </button>
          </section>

          <section className="pt-6 border-t border-slate-800 flex gap-2">
            <button onClick={() => exportDiagram('svg')} className="flex-1 bg-slate-800 p-2 rounded text-[10px] font-bold hover:bg-slate-700">SVG</button>
            <button onClick={() => exportDiagram('png')} className="flex-1 bg-blue-600/20 text-blue-400 p-2 rounded text-[10px] font-bold hover:bg-blue-600 border border-blue-500/20">PNG</button>
          </section>
        </div>
      </aside>

      <main className="flex-1 bg-slate-200">
        <ReactFlow 
          nodes={nodes} edges={edges} 
          onNodesChange={(c) => setNodes(n => applyNodeChanges(c, n))} 
          onEdgesChange={(c) => setEdges(e => applyEdgeChanges(c, e))} 
          onConnect={onConnect} 
          nodeTypes={nodeTypes} 
          fitView
        >
          <Background color="#94a3b8" variant="dots" /><Controls />
        </ReactFlow>
      </main>
    </div>
  );
}