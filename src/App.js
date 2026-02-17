import React, { useState, useCallback, useEffect } from 'react';
import ReactFlow, { 
  addEdge, Background, Controls, applyNodeChanges, applyEdgeChanges, MarkerType 
} from 'reactflow';
import { toSvg, toPng, toJpeg } from 'html-to-image';
import { jsPDF } from 'jspdf';
import 'reactflow/dist/style.css';
import { Layers, RefreshCcw, Trash2, Download, Settings2, FileJson, FileText } from 'lucide-react';
import TableNode from './TableNode';

const nodeTypes = { tableNode: TableNode };

export default function App() {
  const [nodes, setNodes] = useState(() => JSON.parse(localStorage.getItem('nodes')) || []);
  const [edges, setEdges] = useState(() => JSON.parse(localStorage.getItem('edges')) || []);
  const [tableName, setTableName] = useState('');
  const [schemaText, setSchemaText] = useState(''); 
  const [selectedColor, setSelectedColor] = useState('#fbbf24');
  const [relType, setRelType] = useState('oneToOne');
  const [edgeToDelete, setEdgeToDelete] = useState('');
  const [editingNodeId, setEditingNodeId] = useState(null);

  const [legend, setLegend] = useState(() => JSON.parse(localStorage.getItem('legend')) || [
    { id: 'gold', name: 'Reporting Layer', hex: '#fbbf24', desc: 'Aggregated Data' },
    { id: 'silver', name: 'Warehouse Layer', hex: '#94a3b8', desc: 'Cleaned Data' },
    { id: 'bronze', name: 'Staging Layer', hex: '#cd7f32', desc: 'Raw Data' },
  ]);

  // --- STABLE HANDLERS ---
  const onDeleteNode = useCallback((id) => {
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
  }, []);

  const onStartEdit = useCallback((id, data) => {
    setEditingNodeId(id);
    setTableName(data.label);
    setSchemaText(data.columns.map(c => `${c.name}${c.isPK ? ' (pk)' : ''}`).join(', '));
    setSelectedColor(data.color);
  }, []);

  // Sync node data whenever handlers change to prevent "dead" buttons
  useEffect(() => {
    setNodes((nds) => nds.map(node => ({
      ...node,
      data: { ...node.data, onDelete: onDeleteNode, onEdit: onStartEdit }
    })));
  }, [onDeleteNode, onStartEdit]);

  useEffect(() => {
    localStorage.setItem('nodes', JSON.stringify(nodes));
    localStorage.setItem('edges', JSON.stringify(edges));
    localStorage.setItem('legend', JSON.stringify(legend));
  }, [nodes, edges, legend]);

  // --- UPDATED ADD/UPDATE TABLE LOGIC ---
const addTable = () => {
  if (!tableName || !schemaText) return;

  const columns = schemaText.split(',')
    .map(item => item.trim())
    .filter(item => item !== "")
    .map(item => ({
      name: item.replace(/\(pk\)/gi, '').replace(/,/g, '').trim(),
      isPK: /\(pk\)/i.test(item)
    }));
  
  const newNodeData = { 
    label: tableName, 
    columns, 
    color: selectedColor, 
    onDelete: onDeleteNode, 
    onEdit: onStartEdit 
  };

  if (editingNodeId) {
    // FIX: Create a completely new object reference for the node
    setNodes(nds => nds.map(n => 
      n.id === editingNodeId 
        ? { ...n, data: { ...newNodeData } } 
        : n
    ));
    setEditingNodeId(null);
  } else {
    const newNode = { 
      id: `node_${Date.now()}`, 
      type: 'tableNode', 
      position: { x: 400, y: 150 }, 
      data: newNodeData 
    };
    setNodes(nds => nds.concat(newNode));
  }
  
  // Clear inputs
  setTableName(''); 
  setSchemaText('');
};

// --- UPDATED EXPORT LOGIC ---
const exportDiagram = async (format) => {
  // Select the viewport specifically to avoid exporting the sidebar/UI
  const flowElement = document.querySelector('.react-flow__viewport');
  const entireFlow = document.querySelector('.react-flow');
  const fileName = `lineage_export_${Date.now()}`;

  if (!flowElement) return;

  try {
    if (format === 'json') {
      // Create a blob to ensure large diagrams don't break the URL limit
      const jsonString = JSON.stringify({ nodes, edges, legend }, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${fileName}.json`;
      link.click();
      URL.revokeObjectURL(url);
      return;
    }

    // For PDF/Images, we use the container but ensure background is set
    const options = { 
      backgroundColor: '#f1f5f9',
      style: {
        transform: 'scale(1)', // Ensure it captures at 1:1 scale
      }
    };

    if (format === 'pdf') {
      const dataUrl = await toJpeg(entireFlow, { ...options, quality: 0.95 });
      const pdf = new jsPDF('l', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(dataUrl);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(dataUrl, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${fileName}.pdf`);
      return;
    }

    const action = format === 'svg' ? toSvg : toPng;
    const url = await action(entireFlow, options);
    const link = document.createElement('a');
    link.download = `${fileName}.${format}`;
    link.href = url;
    link.click();
  } catch (err) {
    console.error("Export failed:", err);
  }
};

  const onConnect = useCallback((params) => {
    const edge = {
      ...params,
      id: `e-${Date.now()}`,
      type: 'straight',
      style: { strokeWidth: 2, stroke: '#3b82f6' },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' }
    };
    setEdges((eds) => addEdge(edge, eds));
  }, []);

  // --- EXPORT OPERATIONS ---
  const exportDiagram = async (format) => {
    const flowElement = document.querySelector('.react-flow');
    const fileName = `lineage_export_${Date.now()}`;

    try {
      if (format === 'json') {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ nodes, edges }));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `${fileName}.json`);
        downloadAnchorNode.click();
        return;
      }

      if (format === 'pdf') {
        const dataUrl = await toJpeg(flowElement, { backgroundColor: '#f1f5f9', quality: 0.95 });
        const pdf = new jsPDF('l', 'mm', 'a4');
        const imgProps = pdf.getImageProperties(dataUrl);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        pdf.addImage(dataUrl, 'JPEG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`${fileName}.pdf`);
        return;
      }

      const action = format === 'svg' ? toSvg : toPng;
      const url = await action(flowElement, { backgroundColor: '#f1f5f9' });
      const link = document.createElement('a');
      link.download = `${fileName}.${format}`;
      link.href = url;
      link.click();
    } catch (err) {
      console.error("Export failed", err);
    }
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
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2">1. Table Configuration</label>
            <input className="w-full bg-[#1e293b] border border-slate-700 p-2.5 rounded text-sm mb-4 outline-none focus:border-blue-500" 
              value={tableName} onChange={e => setTableName(e.target.value)} placeholder="TABLE_NAME" />
            
            <div className="flex gap-2 mb-4">
              {legend.map(c => (
                <button key={c.id} onClick={() => setSelectedColor(c.hex)} 
                  className={`w-6 h-6 rounded-full border-2 ${selectedColor === c.hex ? 'border-white' : 'border-transparent'}`} 
                  style={{ backgroundColor: c.hex }} 
                />
              ))}
            </div>
            
            <textarea className="w-full bg-[#1e293b] border border-slate-700 p-2.5 rounded h-32 text-xs font-mono mb-4 outline-none focus:border-blue-500" 
              value={schemaText} onChange={e => setSchemaText(e.target.value)} placeholder="id (pk), name, date" />
            
            <button onClick={addTable} className="w-full py-3 rounded font-bold text-sm bg-blue-600 hover:bg-blue-500 transition-colors">
              {editingNodeId ? 'Update Table' : 'Add Table'}
            </button>
          </section>

          <section className="pt-6 border-t border-slate-800">
            <label className="text-[10px] font-bold text-blue-400 uppercase block mb-3">2. Export Options</label>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => exportDiagram('png')} className="bg-slate-800 p-2 rounded text-[10px] font-bold hover:bg-slate-700 flex items-center justify-center gap-1"><Download size={12}/> PNG</button>
              <button onClick={() => exportDiagram('svg')} className="bg-slate-800 p-2 rounded text-[10px] font-bold hover:bg-slate-700 flex items-center justify-center gap-1"><Download size={12}/> SVG</button>
              <button onClick={() => exportDiagram('json')} className="bg-blue-600/20 text-blue-400 p-2 rounded text-[10px] font-bold hover:bg-blue-600/40 border border-blue-500/20 flex items-center justify-center gap-1"><FileJson size={12}/> JSON</button>
              <button onClick={() => exportDiagram('pdf')} className="bg-red-600/20 text-red-400 p-2 rounded text-[10px] font-bold hover:bg-red-600/40 border border-red-500/20 flex items-center justify-center gap-1"><FileText size={12}/> PDF</button>
            </div>
          </section>

          <section className="pt-6 border-t border-slate-800">
            <label className="text-[10px] font-bold text-red-400 uppercase block mb-3">3. Connections</label>
            <select className="w-full bg-[#1e293b] text-[10px] p-2 rounded border border-slate-700 mb-2 outline-none" 
              value={edgeToDelete} onChange={e => setEdgeToDelete(e.target.value)}>
              <option value="">Select to Delete</option>
              {edges.map(e => <option key={e.id} value={e.id}>{e.id}</option>)}
            </select>
            <button onClick={() => {setEdges(eds => eds.filter(e => e.id !== edgeToDelete)); setEdgeToDelete('');}} 
              className="w-full py-2 bg-red-600/20 text-red-500 border border-red-500/30 rounded font-bold text-[11px]">
              <Trash2 size={12} className="inline mr-1" /> Delete Link
            </button>
          </section>
        </div>
      </aside>

      <main className="flex-1">
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