import { Handle, Position } from "@xyflow/react";

export default function DecisionNode({ id, data }) {
  return (
    <div className="bg-white border-2 border-slate-300 rounded-lg p-4 shadow-md w-64">
      <div className="font-bold text-xs text-slate-500 uppercase mb-1">
        AI Decision Node ({id})
      </div>

      <textarea
        className="w-full text-sm p-2 border rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
        rows={2}
        placeholder="Enter AI criteria (e.g. Is this a billing issue?)"
        value={data.prompt || ""}
        onChange={(e) => data.onChangePrompt?.(id, e.target.value)}
      />

      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-slate-500!"
      />

      <div className="flex justify-between items-center mt-3 pt-2 border-t text-xs font-semibold">
        <div className="relative flex items-center gap-1 text-green-600">
          <span>YES</span>
          <Handle
            type="source"
            position={Position.Bottom}
            id="YES"
            style={{ left: "25%" }}
            className="w-3 h-3 bg-green-500!"
          />
        </div>

        <div className="relative flex items-center gap-1 text-red-600">
          <span>NO</span>
          <Handle
            type="source"
            position={Position.Bottom}
            id="NO"
            style={{ left: "75%" }}
            className="w-3 h-3 bg-red-500!"
          />
        </div>
      </div>
    </div>
  );
}
