# MCP Agent Demo

This repository demonstrates how to use the Model Context Protocol (MCP) SDK to create client and server applications that work with Claude.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file based on the provided `.env.example`:

```bash
cp .env.example .env
```

3. Edit the `.env` file with your API keys and paths:

```
# API Keys
DEEPSEEK_API_KEY=your_deepseek_api_key
TAVILY_API_KEY=your_tavily_api_key
GITHUB_PERSONAL_ACCESS_TOKEN=your_github_token

```

4. Build the TypeScript code:

```bash
npm run build
```

## Running the MCP Client

Start the interactive MCP client:

```bash
npm start
```

This will:
1. Connect to all configured MCP servers
2. Start an interactive prompt where you can enter queries
3. Process your queries using the MCP servers
4. Allow you to exit and automatically disconnect from all servers

## Troubleshooting

If you encounter issues:

1. Make sure to build the TypeScript files first: `npm run build`
2. Check the logs for detailed error messages
3. Verify the paths to the server JS files are correct
4. Ensure that the correct arguments are passed to the Server constructor
5. Use proper error handling to catch and log any issues

## Credits

This demo uses the [@modelcontextprotocol/sdk](https://www.npmjs.com/package/@modelcontextprotocol/sdk).