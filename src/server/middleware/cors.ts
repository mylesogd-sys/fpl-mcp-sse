import cors from 'cors';
import { MCPServerConfig } from '../../types/mcp.js';

export function createCorsMiddleware(config: MCPServerConfig) {
  return cors({
    origin: config.cors.origin === '*' ? true : config.cors.origin,
    credentials: config.cors.credentials,
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Session-ID',
      'Cache-Control',
      'Accept',
      'Accept-Encoding'
    ],
    exposedHeaders: ['X-Session-ID', 'Content-Type'],
    maxAge: 86400 // 24 hours
  });
}