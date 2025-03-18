import { createDeepSeek } from "@ai-sdk/deepseek";
import { LanguageModelV1 } from "ai";

// Initialize and export the AI Agent provider
export function createAIModel(apiKey: string): LanguageModelV1 {
const deepseek = createDeepSeek({
    apiKey: apiKey,
  });
  return deepseek("deepseek-chat");
}
