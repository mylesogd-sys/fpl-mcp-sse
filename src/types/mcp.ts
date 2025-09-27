import { z } from 'zod';

// MCP Server Configuration
export interface MCPServerConfig {
  name: string;
  version: string;
  port: number;
  cors: {
    origin: string;
    credentials: boolean;
  };
  auth: {
    required: boolean;
    token?: string;
  };
}

// Transport Types
export enum TransportType {
  SSE = 'sse',
  STREAMABLE_HTTP = 'streamable_http'
}

// Session Management
export interface SessionInfo {
  id: string;
  type: TransportType;
  createdAt: Date;
  lastActivity: Date;
}

// Error Types
export enum MCPErrorCode {
  INVALID_REQUEST = -32600,
  METHOD_NOT_FOUND = -32601,
  INVALID_PARAMS = -32602,
  INTERNAL_ERROR = -32603,
  PARSE_ERROR = -32700,
  UNAUTHORIZED = -32000,
  FORBIDDEN = -32001,
  NOT_FOUND = -32002,
  RATE_LIMITED = -32003
}

export interface MCPError {
  code: MCPErrorCode;
  message: string;
  data?: any;
}

// Tool Registration Schema
export const ToolRegistrationSchema = z.object({
  name: z.string(),
  description: z.string(),
  inputSchema: z.record(z.any()),
  handler: z.function()
});

export type ToolRegistration = z.infer<typeof ToolRegistrationSchema>;

// Health Check Response
export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  services: {
    fpl_api: 'available' | 'unavailable';
    mcp_server: 'running' | 'stopped';
  };
}