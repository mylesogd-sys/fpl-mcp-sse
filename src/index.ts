import express from 'express';
import { createMCPServer } from './server/mcp-server.js';
import { SSETransportHandler } from './server/transports/sse.js';
import { StreamableHTTPTransportHandler } from './server/transports/streamable-http.js';
import { createAuthMiddleware } from './server/middleware/auth.js';
import { createCorsMiddleware } from './server/middleware/cors.js';
import { createErrorHandler, createNotFoundHandler } from './server/middleware/error.js';
import { MCPServerConfig, HealthCheckResponse } from './types/mcp.js';
import { MCP_CONFIG } from './utils/constants.js';

// Server configuration
const config: MCPServerConfig = {
  name: MCP_CONFIG.SERVER_NAME,
  version: MCP_CONFIG.VERSION,
  port: parseInt(process.env.PORT || MCP_CONFIG.DEFAULT_PORT.toString()),
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true
  },
  auth: {
    required: !!process.env.AUTH_TOKEN,
    token: process.env.AUTH_TOKEN
  }
};

class FPLMCPServer {
  private app: express.Application;
  private mcpServer: any;
  private sseHandler: SSETransportHandler;
  private httpHandler: StreamableHTTPTransportHandler;
  private cleanupInterval?: NodeJS.Timeout;

  constructor() {
    this.app = express();
    this.mcpServer = createMCPServer();
    this.sseHandler = new SSETransportHandler(this.mcpServer);
    this.httpHandler = new StreamableHTTPTransportHandler(this.mcpServer);

    this.setupMiddleware();
    this.setupRoutes();
    this.setupCleanupInterval();
  }

  private setupMiddleware() {
    // Basic middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // CORS
    this.app.use(createCorsMiddleware(config));

    // Auth (applied to MCP endpoints only)
    const authMiddleware = createAuthMiddleware(config.auth.token);

    // Apply auth to MCP endpoints
    this.app.use(['/sse', '/mcp', '/messages'], authMiddleware);

    // Request logging
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
      next();
    });
  }

  private setupRoutes() {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      const health: HealthCheckResponse = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: config.version,
        services: {
          fpl_api: 'available', // Could check FPL API availability
          mcp_server: 'running'
        }
      };

      res.json(health);
    });

    // SSE Transport endpoints (for n8n Cloud and legacy clients)
    this.app.get('/sse', this.sseHandler.handleSSEConnection);
    this.app.post('/messages', this.sseHandler.handleSSEMessage);

    // Streamable HTTP Transport endpoint (for modern clients and testing)
    this.app.all('/mcp', this.httpHandler.handleHTTPRequest);

    // Server info endpoint
    this.app.get('/', (req, res) => {
      res.json({
        name: config.name,
        version: config.version,
        description: 'FPL MCP Server for n8n with dual SSE/HTTP transports',
        endpoints: {
          health: '/health',
          sse: '/sse',
          messages: '/messages',
          mcp: '/mcp'
        },
        tools_available: 10,
        authentication_required: config.auth.required,
        cors_enabled: true
      });
    });

    // Session management endpoint
    this.app.get('/sessions', (req, res) => {
      const sseSessions = this.sseHandler.getActiveSessions();
      const httpSessions = this.httpHandler.getActiveSessions();

      res.json({
        total_sessions: sseSessions.length + httpSessions.length,
        sse_sessions: sseSessions.length,
        http_sessions: httpSessions.length,
        sessions: {
          sse: sseSessions,
          http: httpSessions
        }
      });
    });

    // 404 handler
    this.app.use(createNotFoundHandler());

    // Error handler (must be last)
    this.app.use(createErrorHandler());
  }

  private setupCleanupInterval() {
    // Clean up expired sessions every 5 minutes
    this.cleanupInterval = setInterval(() => {
      const sseCleanedCount = this.sseHandler.cleanupExpiredSessions(MCP_CONFIG.SESSION_TIMEOUT);
      const httpCleanedCount = this.httpHandler.cleanupExpiredSessions(MCP_CONFIG.SESSION_TIMEOUT);

      if (sseCleanedCount > 0 || httpCleanedCount > 0) {
        console.log(`Cleaned up ${sseCleanedCount + httpCleanedCount} expired sessions (SSE: ${sseCleanedCount}, HTTP: ${httpCleanedCount})`);
      }
    }, 5 * 60 * 1000); // 5 minutes
  }

  async start() {
    return new Promise<void>((resolve, reject) => {
      try {
        const server = this.app.listen(config.port, () => {
          console.log('🚀 FPL MCP Server started successfully!');
          console.log(`📡 Server: ${config.name} v${config.version}`);
          console.log(`🌐 Port: ${config.port}`);
          console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
          console.log(`🔐 Authentication: ${config.auth.required ? 'Required' : 'Disabled'}`);
          console.log(`🌍 CORS: ${config.cors.origin}`);
          console.log('');
          console.log('📋 Available endpoints:');
          console.log(`   Health: http://localhost:${config.port}/health`);
          console.log(`   SSE: http://localhost:${config.port}/sse`);
          console.log(`   HTTP: http://localhost:${config.port}/mcp`);
          console.log(`   Sessions: http://localhost:${config.port}/sessions`);
          console.log('');
          console.log('🛠️  FPL Tools available: 10');
          console.log('   • get_gameweek_context');
          console.log('   • get_bootstrap_data');
          console.log('   • analyze_player_form');
          console.log('   • compare_players');
          console.log('   • get_player_fixtures');
          console.log('   • get_transfer_trends');
          console.log('   • get_captain_picks');
          console.log('   • analyze_team_fixtures');
          console.log('   • get_dream_team');
          console.log('   • get_set_piece_takers');
          console.log('');
          console.log('✅ Ready for n8n MCP Client connections!');

          resolve();
        });

        // Graceful shutdown
        const shutdown = async (signal: string) => {
          console.log(`\n${signal} received, shutting down gracefully...`);

          if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
          }

          await Promise.all([
            this.sseHandler.shutdown(),
            this.httpHandler.shutdown()
          ]);

          server.close(() => {
            console.log('✅ FPL MCP Server shutdown complete');
            process.exit(0);
          });
        };

        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));

      } catch (error) {
        reject(error);
      }
    });
  }
}

// Start the server
const server = new FPLMCPServer();
server.start().catch((error) => {
  console.error('❌ Failed to start FPL MCP Server:', error);
  process.exit(1);
});

export default FPLMCPServer;