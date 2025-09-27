import express, { Request, Response } from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { TransportType, SessionInfo } from '../../types/mcp.js';

export class SSETransportHandler {
  private transports = new Map<string, SSEServerTransport>();
  private sessions = new Map<string, SessionInfo>();
  private serverInstances = new Map<string, McpServer>();

  constructor(private mcpServer: McpServer) {}

  // SSE endpoint for streaming events
  handleSSEConnection = async (req: Request, res: Response) => {
    try {
      console.log('New SSE connection request');

      // Create SSE transport
      const transport = new SSEServerTransport('/messages', res);
      const sessionId = transport.sessionId;

      // Create a new MCP server instance for this session
      const { createMCPServer } = await import('../mcp-server.js');
      const sessionServer = createMCPServer();

      // Store transport and session info
      this.transports.set(sessionId, transport);
      this.serverInstances.set(sessionId, sessionServer);
      this.sessions.set(sessionId, {
        id: sessionId,
        type: TransportType.SSE,
        createdAt: new Date(),
        lastActivity: new Date()
      });

      console.log(`SSE session created: ${sessionId}`);

      // Handle connection cleanup
      res.on('close', () => {
        console.log(`SSE connection closed: ${sessionId}`);
        this.transports.delete(sessionId);
        this.serverInstances.delete(sessionId);
        this.sessions.delete(sessionId);
      });

      res.on('error', (error) => {
        console.error(`SSE connection error for ${sessionId}:`, error);
        this.transports.delete(sessionId);
        this.serverInstances.delete(sessionId);
        this.sessions.delete(sessionId);
      });

      // Connect MCP server to transport
      await sessionServer.connect(transport);

    } catch (error) {
      console.error('SSE connection error:', error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Failed to establish SSE connection'
          },
          id: null
        });
      }
    }
  };

  // Handle POST messages for SSE transport
  handleSSEMessage = async (req: Request, res: Response) => {
    try {
      const sessionId = req.query.sessionId as string;

      if (!sessionId) {
        return res.status(400).json({
          jsonrpc: '2.0',
          error: {
            code: -32602,
            message: 'Missing sessionId parameter'
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
            message: `No transport found for sessionId: ${sessionId}`
          },
          id: null
        });
      }

      // Update session activity
      const session = this.sessions.get(sessionId);
      if (session) {
        session.lastActivity = new Date();
      }

      // Handle the message through the transport
      await transport.handlePostMessage(req, res, req.body);

    } catch (error) {
      console.error('SSE message handling error:', error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Failed to handle SSE message'
          },
          id: null
        });
      }
    }
  };

  // Get active SSE sessions
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
        console.log(`Cleaning up expired SSE session: ${sessionId}`);

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
    console.log('Shutting down SSE transport handler...');

    for (const [sessionId, transport] of this.transports.entries()) {
      try {
        await transport.close();
      } catch (error) {
        console.error(`Error closing SSE transport ${sessionId}:`, error);
      }
    }

    for (const [sessionId, sessionServer] of this.serverInstances.entries()) {
      try {
        await sessionServer.close();
      } catch (error) {
        console.error(`Error closing SSE server ${sessionId}:`, error);
      }
    }

    this.transports.clear();
    this.serverInstances.clear();
    this.sessions.clear();
    console.log('SSE transport handler shutdown complete');
  }
}