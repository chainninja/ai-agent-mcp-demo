import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import {
  CallToolResultSchema,
  ListToolsResultSchema,
} from "@modelcontextprotocol/sdk/types.js";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

export interface McpServerConfig {
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

interface McpTool {
  name: string;
  description?: string;
  inputSchema?: object;
}

export interface McpServer {
  name: string;
  status: "connected" | "connecting" | "disconnected";
  tools?: McpTool[];
  client: Client;
  transport: StdioClientTransport;
}

// Connect to MCP server and return the server object
export async function connectToServer(config: McpServerConfig): Promise<McpServer> {
  try {
    console.log(`Connecting to MCP server: ${config.name}`);

    // Create MCP client
    const client = new Client(
      { name: "SimpleMCPClient", version: "1.0.0" },
      { capabilities: {} }
    );

    // Create transport layer
    console.log(
      `Starting transport for ${config.name} with command: ${
        config.command
      } ${config.args?.join(" ") || ""}`
    );
    const transport = new StdioClientTransport({
      command: config.command,
      args: config.args,
      env: {
        ...config.env,
        ...(process.env.PATH ? { PATH: process.env.PATH } : {}),
      },
      stderr: "pipe",
    });

    // Initialize server object
    const server: McpServer = {
      name: config.name,
      status: "connecting",
      client,
      transport,
    };

    // Handle errors
    transport.onerror = (error) => {
      console.error(`Transport error for "${config.name}":`, error);
      console.error(
        `Error details: ${JSON.stringify(
          error,
          Object.getOwnPropertyNames(error),
          2
        )}`
      );
      server.status = "disconnected";
    };

    // Handle connection close
    transport.onclose = () => {
      console.log(`Transport closed for "${config.name}"`);
      server.status = "disconnected";
    };

    // Connect to server
    console.log(`Attempting to connect to ${config.name} server...`);
    try {
      await client.connect(transport);
      server.status = "connected";
      console.log(`Successfully connected to ${config.name} server`);
    } catch (connectError) {
      console.error(
        `Error connecting to ${config.name} server:`,
        connectError
      );
      throw connectError;
    }

    // Get tools list
    try {
      const toolsResponse = await client.request(
        { method: "tools/list" },
        ListToolsResultSchema
      );

      server.tools = toolsResponse?.tools || [];

      console.log(`Connected to MCP server: ${config.name}`);
      console.log(
        `Available tools: ${server.tools.map((t) => t.name).join(", ")}`
      );
    } catch (toolsError) {
      console.error(
        `Error getting tools from ${config.name} server:`,
        toolsError
      );
      throw toolsError;
    }

    return server;
  } catch (error) {
    console.error(`Failed to connect to MCP server ${config.name}:`, error);
    if (error instanceof Error) {
      console.error(`Error stack: ${error.stack}`);
    }
    throw error;
  }
}

// Call MCP tool
export async function callMcpTool(
  servers: McpServer[],
  serverName: string,
  toolName: string,
  args: Record<string, unknown>
): Promise<any> {
  const server = servers.find(
    (s) => s.name === serverName && s.status === "connected"
  );
  if (!server) {
    throw new Error(`No connected server found with name: ${serverName}`);
  }

  console.log(
    `Calling tool '${toolName}' on server '${serverName}' with args:`,
    args
  );

  try {
    const response = await server.client.request(
      {
        method: "tools/call",
        params: {
          name: toolName,
          arguments: args,
        },
      },
      CallToolResultSchema,
      { timeout: 60000 }
    );

    return response;
  } catch (error) {
    console.error(
      `Error calling tool '${toolName}' on server '${serverName}':`,
      error
    );
    throw error;
  }
}

// Disconnect from all MCP servers
export async function disconnectAllServers(servers: McpServer[]): Promise<void> {
  console.log(`Disconnecting from ${servers.length} MCP servers...`);
  
  for (const server of servers) {
    try {
      if (server.status === "connected") {
        console.log(`Disconnecting from MCP server: ${server.name}`);
        await server.transport.close();
        server.status = "disconnected";
        console.log(`Successfully disconnected from ${server.name} server`);
      }
    } catch (error) {
      console.error(`Error disconnecting from ${server.name} server:`, error);
    }
  }
  
  console.log("All MCP servers disconnected");
}
