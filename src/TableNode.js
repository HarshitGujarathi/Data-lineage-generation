import React from 'react';
import { Handle, Position } from 'reactflow';
import { Trash2, Folder, Edit3 } from 'lucide-react';

const TableNode = ({ data }) => {
  return (
    <div className="bg-white border-2 border-slate-800 rounded shadow-xl min-w-[260px] font-sans overflow-hidden group">
      {/* Header: Table Name & Actions */}
      <div className="bg-slate-800 text-white px-3 py-2 text-xs font-bold flex items-center justify-between">
        <div 
          className="flex items-center gap-2 cursor-pointer hover:text-blue-400 flex-1 min-w-0" 
          onClick={() => data.onEdit?.(data.id)}
        >
          <Folder size={14} className="text-blue-400 shrink-0" />
          <span className="truncate uppercase tracking-wider">{data.label}</span>
          <Edit3 size={10} className="opacity-0 group-hover:opacity-100 ml-1 transition-opacity shrink-0" />
        </div>
        
        <button 
          onClick={(e) => { 
            e.stopPropagation(); 
            data.onDelete?.(data.id); 
          }} 
          className="text-slate-400 hover:text-red-400 p-1 transition-colors shrink-0"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Body: Columns List */}
      <div className="bg-white">
        {data.columns?.map((col, index) => (
          <div 
            key={`${col.name}-${index}`} 
            className="relative flex items-center justify-between px-3 py-2 border-b border-slate-50 last:border-0 text-[11px] hover:bg-slate-50 transition-colors"
          >
            {/* Input Port */}
            <Handle 
              type="target" 
              position={Position.Left} 
              id={col.name} 
              style={{ left: -4, background: '#94a3b8', width: '8px', height: '8px' }} 
            />
            
            <div className="flex items-center gap-2 flex-1">
              {col.isPK && <span className="text-yellow-500 font-bold text-[10px]">🔑</span>}
              <span className="text-slate-700 font-semibold">{col.name}</span>
              
            </div>

            {/* Output Port */}
            <Handle 
              type="source" 
              position={Position.Right} 
              id={col.name} 
              style={{ right: -4, background: '#94a3b8', width: '8px', height: '8px' }} 
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default React.memo(TableNode);