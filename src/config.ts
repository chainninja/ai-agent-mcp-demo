import dotenv from 'dotenv';
import { McpServerConfig } from './mcpclient.js';

// Load environment variables from .env file
dotenv.config();

// API keys
export const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || "";
export const TAVILY_API_KEY = process.env.TAVILY_API_KEY || "";
export const GITHUB_PERSONAL_ACCESS_TOKEN = process.env.GITHUB_PERSONAL_ACCESS_TOKEN || "";

// Server configurations
export const SERVER_CONFIGS: McpServerConfig[] =[
  {
    name: "tavily-server",
    command: "npx",
    args: ["-y", "tavily-mcp@0.1.3"],
    env: {
      "TAVILY_API_KEY": TAVILY_API_KEY || ""
    }
  },
  {
    name: "github-server",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-github"],
    env: {
      GITHUB_PERSONAL_ACCESS_TOKEN: GITHUB_PERSONAL_ACCESS_TOKEN || ""
    }
  }
]

// App settings
export const APP_SETTINGS = {
  promptMessages: {
    queryPrompt: '\nEnter your query (or type "exit" to quit): ',
    finishedPrompt: '\nQuery finished. Type "exit" to quit or press Enter to continue: ',
    exiting: 'Exiting...'
  }
}; 