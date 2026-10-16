"use client";

import { useState, useCallback, useMemo } from "react";
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

// ALWAYS define nodeTypes OUTSIDE the component render function
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
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const handlePromptChange = useCallback((id, newPrompt) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          return {
            ...node,
            data: { ...node.data, prompt: newPrompt },
          };
        }
        return node;
      }),
    );
  }, []);

  const nodesWithHandlers = useMemo(() => {
    return nodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        onChangePrompt: handlePromptChange,
      },
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

    try {
      const res = await fetch("/api/workflow/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodes, edges, initialInput }),
      });

      const data = await res.json();

      if (res.ok) {
        setStatus(`Workflow started! Event ID: ${data.eventId}`);
      } else {
        setStatus(`Error: ${data.error}`);
      }
    } catch (err) {
      setStatus(`Failed to send request: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-screen h-screen flex flex-col">
      <header className="p-4 bg-slate-900 text-white flex flex-col sm:flex-row gap-4 justify-between items-center">
        <h1 className="font-bold text-lg">AI Decision Workflow Builder</h1>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <input
            type="text"
            className="p-2 text-sm rounded bg-slate-800 text-white border border-slate-700 w-80 focus:outline-none"
            placeholder="Test input message..."
            value={initialInput}
            onChange={(e) => setInitialInput(e.target.value)}
          />
          <button
            onClick={handleRunWorkflow}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 disabled:bg-slate-600 px-4 py-2 rounded text-sm font-semibold"
          >
            {loading ? "Running..." : "Run Workflow"}
          </button>
          <button
            onClick={addNode}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm font-semibold"
          >
            + Add Node
          </button>
        </div>
      </header>

      {status && (
        <div className="bg-slate-800 text-green-400 text-xs px-4 py-2 border-b border-slate-700">
          {status} —{" "}
          <a
            href="http://localhost:8288"
            target="_blank"
            rel="noreferrer"
            className="underline font-bold"
          >
            Open Inngest Dev Server to view live execution
          </a>
        </div>
      )}

      <div className="flex-1 bg-slate-50">
        <ReactFlow
          nodes={nodesWithHandlers}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
}
