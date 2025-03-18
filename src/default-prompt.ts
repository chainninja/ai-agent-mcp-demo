import { McpServer } from "./mcpclient.js";

const toolsInfo = `
## use_mcp_tool
Description: Request to use a tool provided by a connected MCP server.
Parameters:
- server_name: (required) The name of the MCP server providing the tool
- tool_name: (required) The name of the tool to execute
- arguments: (required) A JSON object containing the tool's input parameters

Usage:
<use_mcp_tool>
<server_name>server name here</server_name>
<tool_name>tool name here</tool_name>
<arguments>
{
  "param1": "value1",
  "param2": "value2"
}
</arguments>
</use_mcp_tool>

Example:
<use_mcp_tool>
<server_name>weather-server</server_name>
<tool_name>get_forecast</tool_name>
<arguments>
{
  "city": "Gold Coast",
  "days": 5
}
</arguments>
</use_mcp_tool>
`;

const genMcpServersInfo = (servers: McpServer[]) => `
====

MCP SERVERS

The Model Context Protocol (MCP) enables communication between the system and locally running MCP servers that provide additional tools and resources to extend your capabilities.

# Connected MCP Servers

When a server is connected, you can use the server's tools via the \`use_mcp_tool\` tool.

${getConnectedServersInfo(servers)}
`;

function getConnectedServersInfo(servers: McpServer[]): string {
  const connectedServers = servers.filter((s) => s.status === "connected");

  if (connectedServers.length === 0) {
    return "(No MCP servers currently connected)";
  }

  return connectedServers.map(formatServerTools).join("\n\n");
}

// System prompt generation
function formatServerTools(server: McpServer): string {
  const tools = server.tools
    ?.map((tool) => {
      const schemaStr = tool.inputSchema
        ? `    Input Schema:\n    ${JSON.stringify(tool.inputSchema, null, 2)
            .split("\n")
            .join("\n    ")}`
        : "";

      return `- ${tool.name}: ${
        tool.description || "No description"
      }\n${schemaStr}`;
    })
    .join("\n\n");

  return `## ${server.name}\n\n### Available Tools\n${tools}`;
}
export function genSystemPrompt(servers: McpServer[]): string {
  return `You are a helpful AI assistant with access to MCP servers.
  
  When you need to access external data or functionality, use the appropriate MCP tool.
  
  ${toolsInfo}
  
  ${genMcpServersInfo(servers)}`;
}
