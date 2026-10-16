"use client";

import { useState, useCallback } from "react";
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
    data: { prompt: "Is this a support request?" },
  },
  {
    id: "node_2",
    type: "decisionNode",
    position: { x: 100, y: 300 },
    data: { prompt: "Is it related to billing?" },
  },
  {
    id: "node_3",
    type: "decisionNode",
    position: { x: 400, y: 300 },
    data: { prompt: "Is it a feature request?" },
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

  const nodesWithHandlers = nodes.map((node) => ({
    ...node,
    data: { ...node.data, onChangePrompt: handlePromptChange },
  }));

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

  return (
    <div className="w-screen h-screen flex flex-col">
      <header className="p-4 bg-slate-900 text-white flex justify-between items-center">
        <h1 className="font-bold text-lg">AI Decision Workflow Builder</h1>
        <button
          onClick={addNode}
          className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm font-semibold"
        >
          + Add Decision Node
        </button>
      </header>

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
