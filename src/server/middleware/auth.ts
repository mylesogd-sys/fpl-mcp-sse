import { Request, Response, NextFunction } from 'express';
import { MCPErrorCode } from '../../types/mcp.js';

export interface AuthenticatedRequest extends Request {
  isAuthenticated?: boolean;
}

export function createAuthMiddleware(requiredToken?: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Skip auth if no token configured
    if (!requiredToken) {
      req.isAuthenticated = true;
      return next();
    }

    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        jsonrpc: '2.0',
        error: {
          code: MCPErrorCode.UNAUTHORIZED,
          message: 'Authorization header required'
        },
        id: null
      });
    }

    const token = authHeader.replace('Bearer ', '');

    if (token !== requiredToken) {
      return res.status(401).json({
        jsonrpc: '2.0',
        error: {
          code: MCPErrorCode.UNAUTHORIZED,
          message: 'Invalid authorization token'
        },
        id: null
      });
    }

    req.isAuthenticated = true;
    next();
  };
}