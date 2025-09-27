import express, { Request, Response } from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { TransportType, SessionInfo } from '../../types/mcp.js';

export class StreamableHTTPTransportHandler {
  private transports = new Map<string, StreamableHTTPServerTransport>();
  private sessions = new Map<string, SessionInfo>();
  private serverInstances = new Map<string, McpServer>();

  constructor(private mcpServer: McpServer) {}

  // Main HTTP endpoint for streamable requests
  handleHTTPRequest = async (req: Request, res: Response) => {
    let transport: StreamableHTTPServerTransport | undefined;
    let server: McpServer | undefined;

    try {
      console.log(`HTTP ${req.method} request to MCP endpoint`);

      if (req.method === 'POST') {
        // Handle POST requests (main MCP communication)
        await this.handlePOSTRequest(req, res);
      } else if (req.method === 'GET') {
        // Handle GET requests (SSE for notifications)
        await this.handleGETRequest(req, res);
      } else if (req.method === 'DELETE') {
        // Handle DELETE requests (session termination)
        await this.handleDELETERequest(req, res);
      } else {
        // Method not allowed
        res.status(405).json({
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: `Method ${req.method} not allowed`
          },
          id: null
        });
      }

    } catch (error) {
      console.error('Streamable HTTP request error:', error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Internal server error'
          },
          id: null
        });
      }
    }
  };

  private async handlePOSTRequest(req: Request, res: Response) {
    const sessionId = req.headers['x-session-id'] as string;

    if (sessionId) {
      // Use existing session
      const transport = this.transports.get(sessionId);
      const sessionServer = this.serverInstances.get(sessionId);

      if (!transport || !sessionServer) {
        return res.status(404).json({
          jsonrpc: '2.0',
          error: {
            code: -32002,
            message: `Session ${sessionId} not found`
          },
          id: null
        });
      }

      // Update session activity
      const session = this.sessions.get(sessionId);
      if (session) {
        session.lastActivity = new Date();
      }

      // Set session ID in response header only if valid
      if (sessionId) {
        res.setHeader('X-Session-ID', sessionId);
      }

      await transport.handleRequest(req, res, req.body);
    } else {
      // Create new session-based transport
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => this.generateSessionId()
      });

      const newSessionId = transport.sessionId || this.generateSessionId();

      // Create a new MCP server instance for this session
      const { createMCPServer } = await import('../mcp-server.js');
      const sessionServer = createMCPServer();

      this.transports.set(newSessionId, transport);
      this.serverInstances.set(newSessionId, sessionServer);
      this.sessions.set(newSessionId, {
        id: newSessionId,
        type: TransportType.STREAMABLE_HTTP,
        createdAt: new Date(),
        lastActivity: new Date()
      });

      console.log(`New HTTP session created: ${newSessionId}`);

      // Set session ID in response header only if valid
      if (newSessionId) {
        res.setHeader('X-Session-ID', newSessionId);
      }

      // Setup cleanup on response close
      res.on('close', () => {
        console.log(`HTTP connection closed: ${newSessionId}`);
        // Note: Keep session alive for potential reuse
      });

      // Connect server and handle request
      await sessionServer.connect(transport);
      await transport.handleRequest(req, res, req.body);
    }
  }

  private async handleGETRequest(req: Request, res: Response) {
    const sessionId = req.headers['x-session-id'] as string;

    if (!sessionId) {
      return res.status(400).json({
        jsonrpc: '2.0',
        error: {
          code: -32602,
          message: 'Session ID required for GET requests'
        },
        id: null
      });
    }

    const transport = this.transports.get(sessionId);
    if (!transport) {
      return res.status(404).json({
        jsonrpc: '2.0',
        error: {
          code: -32002,
          message: `Session ${sessionId} not found`
        },
        id: null
      });
    }

    // Handle SSE for notifications
    await transport.handleRequest(req, res, {});
  }

  private async handleDELETERequest(req: Request, res: Response) {
    const sessionId = req.headers['x-session-id'] as string;

    if (!sessionId) {
      return res.status(400).json({
        jsonrpc: '2.0',
        error: {
          code: -32602,
          message: 'Session ID required for DELETE requests'
        },
        id: null
      });
    }

    const transport = this.transports.get(sessionId);
    if (!transport) {
      return res.status(404).json({
        jsonrpc: '2.0',
        error: {
          code: -32002,
          message: `Session ${sessionId} not found`
        },
        id: null
      });
    }

    // Terminate session
    console.log(`Terminating HTTP session: ${sessionId}`);

    try {
      await transport.close();
    } catch (error) {
      console.error(`Error closing transport ${sessionId}:`, error);
    }

    const sessionServer = this.serverInstances.get(sessionId);
    if (sessionServer) {
      try {
        await sessionServer.close();
      } catch (error) {
        console.error(`Error closing server ${sessionId}:`, error);
      }
    }

    this.transports.delete(sessionId);
    this.serverInstances.delete(sessionId);
    this.sessions.delete(sessionId);

    res.status(200).json({
      jsonrpc: '2.0',
      result: {
        message: `Session ${sessionId} terminated`
      },
      id: null
    });
  }

  private generateSessionId(): string {
    return `http_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Get active HTTP sessions
  getActiveSessions(): SessionInfo[] {
    return Array.from(this.sessions.values());
  }

  // Cleanup expired sessions
  cleanupExpiredSessions(timeoutMs: number = 1800000): number { // 30 minutes default
    const now = new Date();
    let cleanedCount = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      const timeSinceActivity = now.getTime() - session.lastActivity.getTime();

      if (timeSinceActivity > timeoutMs) {
        console.log(`Cleaning up expired HTTP session: ${sessionId}`);

        const transport = this.transports.get(sessionId);
        if (transport) {
          transport.close();
        }

        const sessionServer = this.serverInstances.get(sessionId);
        if (sessionServer) {
          sessionServer.close();
        }

        this.transports.delete(sessionId);
        this.serverInstances.delete(sessionId);
        this.sessions.delete(sessionId);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }

  // Graceful shutdown
  async shutdown(): Promise<void> {
    console.log('Shutting down Streamable HTTP transport handler...');

    for (const [sessionId, transport] of this.transports.entries()) {
      try {
        await transport.close();
      } catch (error) {
        console.error(`Error closing HTTP transport ${sessionId}:`, error);
      }
    }

    for (const [sessionId, sessionServer] of this.serverInstances.entries()) {
      try {
        await sessionServer.close();
      } catch (error) {
        console.error(`Error closing HTTP server ${sessionId}:`, error);
      }
    }

    this.transports.clear();
    this.serverInstances.clear();
    this.sessions.clear();
    console.log('Streamable HTTP transport handler shutdown complete');
  }
}