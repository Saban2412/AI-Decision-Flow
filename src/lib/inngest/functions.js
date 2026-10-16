import { inngest } from "./client";
import { llmClient } from "../llm/client";

export const executeWorkflow = inngest.createFunction(
  {
    id: "execute-ai-workflow",
    event: "workflow/execute.requested",
  },
  async ({ event, step }) => {
    const { nodes, edges, initialInput, startNodeId } = event.data;

    let currentNodeId = startNodeId || nodes[0]?.id;
    const executionPath = [];
    const visitedNodeIds = new Set();

    while (currentNodeId) {
      if (visitedNodeIds.has(currentNodeId)) {
        throw new Error(`Workflow contains a cycle at node ${currentNodeId}.`);
      }
      visitedNodeIds.add(currentNodeId);

      const currentNode = nodes.find((n) => n.id === currentNodeId);
      if (!currentNode) break;

      const decision = await step.run(
        `ai-decision-${currentNode.id}`,
        async () => {
          try {
            // Fallback if LLM API Key is missing or invalid in local dev
            if (
              !process.env.LLM_API_KEY ||
              process.env.LLM_API_KEY === "tvoj_openrouter_api_key"
            ) {
              console.warn(
                "LLM_API_KEY is missing or invalid! Mocking response to YES.",
              );
              return "YES";
            }

            const response = await llmClient.chat.completions.create({
              model:
                process.env.LLM_MODEL || "google/gemini-2.0-flash-exp:free",
              messages: [
                {
                  role: "system",
                  content: `You are an AI decision node in a workflow.
Analyze the input text against the provided criteria/prompt.
Your response MUST be strictly one of two words: YES or NO.
No additional text, punctuation, or explanation.`,
                },
                {
                  role: "user",
                  content: `Criteria: ${currentNode.data.prompt}\nInput: ${initialInput}`,
                },
              ],
            });

            const rawText =
              response.choices[0]?.message?.content?.trim()?.toUpperCase() ||
              "NO";
            return rawText.includes("YES") ? "YES" : "NO";
          } catch (err) {
            console.error(
              `LLM Call failed at node ${currentNode.id}:`,
              err.message,
            );
            // Default fallback on API error so workflow execution never blocks indefinitely
            return "YES";
          }
        },
      );

      executionPath.push({
        nodeId: currentNode.id,
        prompt: currentNode.data.prompt,
        decision: decision,
      });

      const outgoingEdge = edges.find(
        (e) => e.source === currentNode.id && e.sourceHandle === decision,
      );

      currentNodeId = outgoingEdge ? outgoingEdge.target : null;
    }

    return {
      status: "completed",
      executionPath,
    };
  },
);
