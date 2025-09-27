import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { FPL_TOOLS, TOOL_COUNT } from '../tools/index.js';
import { MCP_CONFIG } from '../utils/constants.js';

export function createMCPServer(): McpServer {
  console.log(`Creating MCP server with ${TOOL_COUNT} FPL tools...`);

  const server = new McpServer({
    name: MCP_CONFIG.SERVER_NAME,
    version: MCP_CONFIG.VERSION
  });

  // Register all FPL tools
  FPL_TOOLS.forEach((tool) => {
    console.log(`Registering tool: ${tool.name}`);

    server.registerTool(
      tool.name,
      {
        description: tool.description,
        inputSchema: tool.inputSchema
      },
      async (input: any) => {
        try {
          console.log(`Executing tool: ${tool.name}`, { input });

          const result = await tool.handler(input);

          console.log(`Tool completed: ${tool.name}`, {
            success: result.success,
            summary: result.data.summary
          });

          // Return MCP-compatible response
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2)
              }
            ]
          };
        } catch (error) {
          console.error(`Tool error: ${tool.name}`, error);

          const errorResponse = {
            success: false,
            data: {
              summary: `Error executing ${tool.name}`,
              insights: [`Tool failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
              metrics: { error: error instanceof Error ? error.message : 'Unknown error' }
            },
            metadata: {
              gameweek: 0,
              timestamp: new Date().toISOString(),
              data_freshness: 'Error'
            }
          };

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(errorResponse, null, 2)
              }
            ]
          };
        }
      }
    );
  });

  console.log(`MCP server created successfully with ${TOOL_COUNT} tools registered`);
  return server;
}