import { inngest } from "./client";
import { llmClient } from "../llm/client";

export const executeWorkflow = inngest.createFunction(
  {
    id: "execute-ai-workflow",
    triggers: { event: "workflow/execute.requested" },
  },
  async ({ event, step }) => {
    const { nodes, edges, initialInput, startNodeId } = event.data;

    let currentNodeId = startNodeId || nodes[0]?.id;
    const executionPath = [];
    const visitedNodeIds = new Set();
    const mockResponse = process.env.LLM_MOCK_RESPONSE?.trim().toUpperCase();

    while (currentNodeId) {
      if (visitedNodeIds.has(currentNodeId)) {
        throw new Error(`Workflow contains a cycle at node ${currentNodeId}.`);
      }
      visitedNodeIds.add(currentNodeId);

      const currentNode = nodes.find((n) => n.id === currentNodeId);
      if (!currentNode) break;

      const decide = async () => {
        if (mockResponse === "YES" || mockResponse === "NO") {
          console.info(
            `Using mock LLM response "${mockResponse}" for node ${currentNode.id}.`,
          );
          return mockResponse;
        }

        // Fallback if LLM API Key is missing or invalid in local dev
        if (
          !process.env.LLM_API_KEY ||
          process.env.LLM_API_KEY === "tvoj_openrouter_api_key"
        ) {
          throw new Error("LLM_API_KEY is missing or invalid.");
        }

        try {
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
            response.choices[0]?.message?.content?.trim()?.toUpperCase() || "NO";
          return rawText.includes("YES") ? "YES" : "NO";
        } catch (err) {
          console.error(
            `LLM Call failed at node ${currentNode.id}:`,
            err.message,
          );
          throw new Error(
            `LLM call failed at node ${currentNode.id}: ${err.message}`,
          );
        }
      };

      const decision =
        mockResponse === "YES" || mockResponse === "NO"
          ? await decide()
          : await step.run(`ai-decision-${currentNode.id}`, decide);

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
