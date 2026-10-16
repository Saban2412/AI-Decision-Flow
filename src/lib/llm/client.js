import OpenAI from "openai";

export const llmClient = new OpenAI({
  baseURL: process.env.LLM_BASE_URL || "https://openrouter.ai/api/v1",
  apiKey: process.env.LLM_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": "http://localhost:3000", // Opciono ali preporučeno za OpenRouter
    "X-Title": "Visual AI Workflow Builder",
  },
});
