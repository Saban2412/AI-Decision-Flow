"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import {
  ReactFlow,
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import DecisionNode from "@/components/DecisionNode";

const nodeTypes = { decisionNode: DecisionNode };

const initialNodes = [
  {
    id: "node_1",
    type: "decisionNode",
    position: { x: 250, y: 100 },
    data: { prompt: "Is this a billing or payment issue?" },
  },
  {
    id: "node_2",
    type: "decisionNode",
    position: { x: 100, y: 300 },
    data: { prompt: "Is the customer asking for a refund?" },
  },
  {
    id: "node_3",
    type: "decisionNode",
    position: { x: 400, y: 300 },
    data: { prompt: "Is this a bug report?" },
  },
];

const initialEdges = [
  {
    id: "e1-2",
    source: "node_1",
    target: "node_2",
    sourceHandle: "YES",
    label: "YES",
  },
  {
    id: "e1-3",
    source: "node_1",
    target: "node_3",
    sourceHandle: "NO",
    label: "NO",
  },
];

export default function WorkflowEditor() {
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);
  const [initialInput, setInitialInput] = useState(
    "I was charged twice for my subscription this month.",
  );
  const [eventId, setEventId] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [executionLogs, setExecutionLogs] = useState([]);

  const handlePromptChange = useCallback((id, newPrompt) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          return { ...node, data: { ...node.data, prompt: newPrompt } };
        }
        return node;
      }),
    );
  }, []);

  const nodesWithHandlers = useMemo(() => {
    return nodes.map((node) => ({
      ...node,
      data: { ...node.data, onChangePrompt: handlePromptChange },
    }));
  }, [nodes, handlePromptChange]);

  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [],
  );

  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [],
  );

  const onConnect = useCallback(
    (params) =>
      setEdges((eds) =>
        addEdge({ ...params, label: params.sourceHandle }, eds),
      ),
    [],
  );

  const addNode = () => {
    const newNodeId = `node_${nodes.length + 1}`;
    setNodes((nds) => [
      ...nds,
      {
        id: newNodeId,
        type: "decisionNode",
        position: { x: 250, y: nds.length * 100 + 50 },
        data: { prompt: "" },
      },
    ]);
  };

  const handleRunWorkflow = async () => {
    setLoading(true);
    setStatus("Triggering workflow...");
    setExecutionLogs([]);

    try {
      const res = await fetch("/api/workflow/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodes, edges, initialInput }),
      });

      const data = await res.json();

      if (res.ok) {
        setEventId(data.eventId);
        setStatus("Workflow running on Inngest...");
      } else {
        setStatus(`Error: ${data.error}`);
        setLoading(false);
      }
    } catch (err) {
      setStatus(`Failed: ${err.message}`);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!eventId) return;

    let pollCount = 0;
    const maxPolls = 40; // Maksimalno 40 pokušaja (60 sekundi)

    const interval = setInterval(async () => {
      pollCount++;

      try {
        const res = await fetch(`/api/workflow/status?eventId=${eventId}`);
        const data = await res.json();

        if (!res.ok) {
          setStatus(`Error: ${data.error || "Could not read workflow status."}`);
          setLoading(false);
          clearInterval(interval);
          return;
        }

        if (data.logs && data.logs.length > 0) {
          setExecutionLogs(data.logs);
        }

        const normalizedStatus = (data.status || "").toLowerCase();
        const isFinished =
          normalizedStatus.includes("completed") ||
          normalizedStatus.includes("succeeded") ||
          normalizedStatus.includes("failed") ||
          normalizedStatus.includes("cancelled") ||
          normalizedStatus.includes("errored");

        // Zaustavi polling ako je status završen ili ako je prešao max broj pokušaja
        if (isFinished || pollCount >= maxPolls) {
          setStatus(
            pollCount >= maxPolls
              ? "Workflow polling finished."
              : `Workflow finished with status: ${data.status}${data.error ? `: ${data.error}` : ""}`,
          );
          setLoading(false);
          clearInterval(interval);
        }
      } catch (e) {
        console.error("Polling error:", e);
        setStatus(`Error: ${e.message}`);
        setLoading(false);
        clearInterval(interval);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [eventId]);

  return (
    <div className="w-screen h-screen flex flex-col font-sans">
      <header className="p-4 bg-slate-900 text-white flex flex-col sm:flex-row gap-4 justify-between items-center z-10 shadow">
        <h1 className="font-bold text-lg tracking-tight">
          AI Decision Workflow Builder
        </h1>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <input
            type="text"
            className="p-2 text-sm rounded bg-slate-800 text-white border border-slate-700 w-80 focus:outline-none focus:border-blue-500"
            placeholder="Test input message..."
            value={initialInput}
            onChange={(e) => setInitialInput(e.target.value)}
          />
          <button
            onClick={handleRunWorkflow}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 disabled:bg-slate-600 px-4 py-2 rounded text-sm font-semibold transition"
          >
            {loading ? "Processing..." : "Run Workflow"}
          </button>
          <button
            onClick={addNode}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm font-semibold transition"
          >
            + Add Node
          </button>
        </div>
      </header>

      <div className="flex-1 flex relative bg-slate-50 overflow-hidden">
        {/* Canvas Area */}
        <div className="flex-1 h-full">
          <ReactFlow
            nodes={nodesWithHandlers}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            fitView
          >
            <Background color="#cbd5e1" gap={16} />
            <Controls />
          </ReactFlow>
        </div>

        {/* Execution Logs Sidebar Panel */}
        <div className="w-80 border-l border-slate-200 bg-white p-4 overflow-y-auto flex flex-col shadow-lg">
          <h2 className="font-bold text-slate-800 text-md mb-2 border-b pb-2">
            Execution Logs Panel
          </h2>

          {status && (
            <div className="text-xs mb-4 p-2 bg-slate-100 rounded border text-slate-600">
              {status}
            </div>
          )}

          {executionLogs.length === 0 ? (
            <div className="text-xs text-slate-400 italic">
              No execution history yet. Click &quot;Run Workflow&quot; to observe dynamic
              decision traversal.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {executionLogs.map((log, index) => (
                <div
                  key={index}
                  className="p-3 border rounded-lg bg-slate-50 text-xs flex flex-col gap-1 border-slate-200"
                >
                  <div className="font-bold text-slate-700">
                    Step {index + 1}: Node `{log.nodeId}`
                  </div>
                  <div className="text-slate-500 italic">
                    &quot;{log.prompt}&quot;
                  </div>
                  <div className="mt-1 flex items-center gap-1 font-semibold">
                    <span>Decision:</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                        log.decision === "YES"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {log.decision}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
