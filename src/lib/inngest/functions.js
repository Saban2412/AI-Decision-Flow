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

    while (currentNodeId) {
      const currentNode = nodes.find((n) => n.id === currentNodeId);
      if (!currentNode) break;

      const decision = await step.run(
        `ai-decision-${currentNode.id}`,
        async () => {
          const response = await llmClient.chat.completions.create({
            model: process.env.LLM_MODEL,
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

          const rawText = response.choices[0].message.content
            .trim()
            .toUpperCase();
          return rawText.includes("YES") ? "YES" : "NO";
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
