import React from 'react';
import { Handle, Position } from 'reactflow';
import { Trash2, Edit3, Key, Table } from 'lucide-react';

const TableNode = ({ id, data }) => {
  return (
    <div className="bg-white border-2 border-slate-800 rounded shadow-2xl min-w-[260px] font-sans overflow-hidden group relative">
      
      {/* MULTIDIRECTIONAL HANDLES */}
      <Handle type="target" position={Position.Top} id="t-top" className="opacity-0 group-hover:opacity-100 !w-3 !h-3 !-top-1.5 !bg-blue-500 border-2 border-white z-10 transition-opacity cursor-crosshair" />
      <Handle type="source" position={Position.Top} id="s-top" className="opacity-0 group-hover:opacity-100 !w-3 !h-3 !-top-1.5 !bg-blue-500 border-2 border-white z-10 transition-opacity cursor-crosshair" />

      <Handle type="target" position={Position.Bottom} id="t-btm" className="opacity-0 group-hover:opacity-100 !w-3 !h-3 !-bottom-1.5 !bg-blue-500 border-2 border-white z-10 transition-opacity cursor-crosshair" />
      <Handle type="source" position={Position.Bottom} id="s-btm" className="opacity-0 group-hover:opacity-100 !w-3 !h-3 !-bottom-1.5 !bg-blue-500 border-2 border-white z-10 transition-opacity cursor-crosshair" />

      <Handle type="target" position={Position.Left} id="t-left" className="opacity-0 group-hover:opacity-100 !w-3 !h-3 !-left-1.5 !bg-blue-500 border-2 border-white z-10 transition-opacity cursor-crosshair" />
      <Handle type="source" position={Position.Left} id="s-left" className="opacity-0 group-hover:opacity-100 !w-3 !h-3 !-left-1.5 !bg-blue-500 border-2 border-white z-10 transition-opacity cursor-crosshair" />

      <Handle type="target" position={Position.Right} id="t-right" className="opacity-0 group-hover:opacity-100 !w-3 !h-3 !-right-1.5 !bg-blue-500 border-2 border-white z-10 transition-opacity cursor-crosshair" />
      <Handle type="source" position={Position.Right} id="s-right" className="opacity-0 group-hover:opacity-100 !w-3 !h-3 !-right-1.5 !bg-blue-500 border-2 border-white z-10 transition-opacity cursor-crosshair" />

      {/* Table Header */}
      <div 
        className="text-white px-3 py-2 text-[11px] font-bold flex items-center justify-between"
        style={{ backgroundColor: data.color || '#334155' }}
      >
        <div className="flex items-center gap-2 cursor-pointer flex-1 min-w-0" onClick={() => data.onEdit?.(id)}>
          <Table size={14} className="opacity-70 shrink-0" />
          <span className="truncate uppercase tracking-tight">{data.label}</span>
          <Edit3 size={10} className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
        </div>
        <button onClick={(e) => { e.stopPropagation(); data.onDelete?.(id); }} className="text-white/60 hover:text-white transition-colors ml-2">
          <Trash2 size={14} />
        </button>
      </div>

      {/* Column List */}
      <div className="bg-white">
        {data.columns?.map((col, index) => (
          <div key={`${col.name}-${index}`} className="flex items-center px-3 py-2 border-b border-slate-50 last:border-0 text-[11px]">
            <div className="w-5 flex justify-center shrink-0">
              {col.isPK && <Key size={12} className="text-yellow-500 fill-yellow-500 transform -rotate-45" />}
            </div>
            <span className={`truncate text-slate-700 ${col.isPK ? 'font-bold' : 'font-medium'}`}>
              {col.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default React.memo(TableNode);