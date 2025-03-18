import { connectToServer, McpServer, disconnectAllServers } from './mcpclient.js';
import { processUserQuery } from './aiagent.js';
import { createAIModel } from './ai-provider.js';
import { LanguageModelV1 } from 'ai';
import readline from 'readline';
import { 
  DEEPSEEK_API_KEY, 
  SERVER_CONFIGS,
  APP_SETTINGS
} from './config.js';

// Server management functions
async function initMCPServers(): Promise<McpServer[]> {
  const servers: McpServer[] = [];
  console.log("Connecting to servers...");

  try {

    await Promise.all(SERVER_CONFIGS.map(async (config) => {
      try {
        const server = await connectToServer(config);
        servers.push(server);
      } catch (error) {
        console.error(`Error connecting to ${config.name} server:`, error);
      }
    }));
  } catch (error) {
    console.error("Error connecting to servers:", error);
  }

  return servers;
}

async function cleanupServers(servers: McpServer[]): Promise<void> {
  await disconnectAllServers(servers);
}

// Interactive prompt handling
interface PromptHandler {
  askForQuery: (callback: (query: string) => Promise<void>) => void;
  askForContinuation: (callback: (answer: string) => Promise<void>) => void;
}

function createPromptHandler(rl: readline.Interface): PromptHandler {
  return {
    askForQuery: (callback: (query: string) => Promise<void>) => {
      rl.question(APP_SETTINGS.promptMessages.queryPrompt, callback);
    },
    askForContinuation: (callback: (answer: string) => Promise<void>) => {
      rl.question(APP_SETTINGS.promptMessages.finishedPrompt, callback);
    }
  };
}

// Command handling
async function handleExitCommand(
  servers: McpServer[],
  rl: readline.Interface
): Promise<void> {
  console.log(APP_SETTINGS.promptMessages.exiting);
  await cleanupServers(servers);
  rl.close();
}

async function handleQueryResponse(
  response: string,
  promptHandler: PromptHandler,
  servers: McpServer[],
  rl: readline.Interface,
  aiModel: LanguageModelV1
): Promise<void> {
  console.log(`\nResponse: ${response}`);
  promptHandler.askForContinuation(async (answer) => {
    if (answer.toLowerCase() === 'exit') {
      await handleExitCommand(servers, rl);
    } else {
      startInteractiveLoop(servers, aiModel, promptHandler, rl);
    }
  });
}

async function handleError(
  error: any,
  servers: McpServer[],
  aiModel: LanguageModelV1,
  promptHandler: PromptHandler,
  rl: readline.Interface
): Promise<void> {
  console.error("Error processing query:", error);
  startInteractiveLoop(servers, aiModel, promptHandler, rl);
}

// Main interactive loop
async function startInteractiveLoop(
  servers: McpServer[],
  aiModel: LanguageModelV1,
  promptHandler: PromptHandler,
  rl: readline.Interface
): Promise<void> {
  promptHandler.askForQuery(async (query) => {
    if (query.toLowerCase() === 'exit') {
      await handleExitCommand(servers, rl);
      return;
    }
    
    try {
      const response = await processUserQuery(servers, aiModel, query);
      await handleQueryResponse(response, promptHandler, servers, rl, aiModel);
    } catch (error) {
      await handleError(error, servers, aiModel, promptHandler, rl);
    }
  });
}

// Main application function
async function runMcpClient(): Promise<void> {
  try {
    console.log("Starting MCP client demo...");
    
    const aiModel = createAIModel(DEEPSEEK_API_KEY);
    const servers = await initMCPServers();
    
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const promptHandler = createPromptHandler(rl);
    startInteractiveLoop(servers, aiModel, promptHandler, rl);
    
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

// Run the client
runMcpClient().catch(error => {
  console.error("Fatal error:", error);
  process.exit(1);
});