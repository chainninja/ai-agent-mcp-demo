import { generateText, LanguageModelV1 } from "ai";
import { callMcpTool, McpServer } from "./mcpclient.js";
import { genSystemPrompt } from "./default-prompt.js";

// Types
interface ToolResult {
  serverName: string;
  toolName: string;
  result?: string;
  error?: string;
}

interface ToolCall {
  toolName: string;
  serverName: string;
  args: any;
}

// Tool parsing functions
function extractToolCallMatches(message: string): RegExpMatchArray[] {
  const regex =
    /<use_mcp_tool>([\s\S]*?)<server_name>([\s\S]*?)<\/server_name>[\s\S]*?<tool_name>([\s\S]*?)<\/tool_name>[\s\S]*?<arguments>([\s\S]*?)<\/arguments>[\s\S]*?<\/use_mcp_tool>/g;
  return [...message.matchAll(regex)];
}

function parseToolCallMatch(match: RegExpMatchArray): ToolCall | null {
  try {
    const serverName = match[2].trim();
    const toolName = match[3].trim();
    const argsStr = match[4].trim();
    
    return {
      serverName,
      toolName,
      args: JSON.parse(argsStr)
    };
  } catch (error) {
    console.error("Error parsing tool call:", error);
    return null;
  }
}

function parseToolCalls(message: string): ToolCall[] {
  const matches = extractToolCallMatches(message);
  return matches
    .map(parseToolCallMatch)
    .filter(Boolean) as ToolCall[];
}

// Tool execution functions
async function executeToolCall(
  servers: McpServer[],
  call: ToolCall
): Promise<ToolResult> {
  try {
    const result = await callMcpTool(
      servers,
      call.serverName,
      call.toolName,
      call.args
    );
    return formatToolResult(call, result);
  } catch (error) {
    return formatToolError(call, error);
  }
}

function formatToolResult(call: ToolCall, result: any): ToolResult {
  const formattedResult = formatResultContent(result.content);
  return {
    serverName: call.serverName,
    toolName: call.toolName,
    result: formattedResult,
  };
}

function formatToolError(call: ToolCall, error: any): ToolResult {
  return {
    serverName: call.serverName,
    toolName: call.toolName,
    error: error instanceof Error ? error.message : String(error),
  };
}

function formatResultContent(content: any[]): string {
  return content
    .map((item: any) => {
      if (item.type === "text") {
        return item.text;
      }
      if (item.type === "resource") {
        const { blob, ...rest } = item.resource;
        return JSON.stringify(rest, null, 2);
      }
      return "";
    })
    .filter(Boolean)
    .join("\n\n");
}

// Response generation
async function generateInitialResponse(
  aiModel: LanguageModelV1,
  systemPrompt: string,
  userQuery: string
): Promise<string> {
  const { text } = await generateText({
    model: aiModel,
    system: systemPrompt,
    messages: [{ role: "user", content: userQuery }],
  });
  return text;
}

async function generateFinalResponse(
  aiModel: LanguageModelV1,
  systemPrompt: string,
  userQuery: string,
  assistantMessage: string,
  toolResults: ToolResult[]
): Promise<string> {
  const messages = [
    { role: "user" as const, content: userQuery },
    { role: "assistant" as const, content: assistantMessage },
    {
      role: "user" as const,
      content: `Here are the results of the tool calls:\n\n${JSON.stringify(
        toolResults,
        null,
        2
      )}`,
    },
  ];

  const response = await generateText({
    model: aiModel,
    system: systemPrompt,
    messages,
  });
  
  return response.text;
}

// Main process function
export async function processUserQuery(
  servers: McpServer[],
  aiModel: LanguageModelV1, 
  userQuery: string
): Promise<string> {
  console.log("Processing user query:", userQuery);
  
  const systemPrompt = genSystemPrompt(servers);
  const assistantMessage = await generateInitialResponse(aiModel, systemPrompt, userQuery);
  console.log("AI response:", assistantMessage);

  const toolCalls = parseToolCalls(assistantMessage);
  if (toolCalls.length === 0) {
    return assistantMessage;
  }

  console.log(`Found ${toolCalls.length} tool calls in the response`);

  const toolResults = await Promise.all(
    toolCalls.map(call => executeToolCall(servers, call))
  );

  return generateFinalResponse(
    aiModel,
    systemPrompt,
    userQuery,
    assistantMessage,
    toolResults
  );
} 