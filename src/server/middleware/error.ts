import { Request, Response, NextFunction } from 'express';
import { MCPErrorCode } from '../../types/mcp.js';

export interface MCPErrorResponse {
  jsonrpc: '2.0';
  error: {
    code: MCPErrorCode;
    message: string;
    data?: any;
  };
  id: any;
}

export function createErrorHandler() {
  return (error: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('MCP Server Error:', error);

    // Determine error type and code
    let errorCode = MCPErrorCode.INTERNAL_ERROR;
    let message = error.message || 'Internal server error';

    if (error.name === 'ValidationError') {
      errorCode = MCPErrorCode.INVALID_PARAMS;
      message = 'Invalid request parameters';
    } else if (error.name === 'SyntaxError') {
      errorCode = MCPErrorCode.PARSE_ERROR;
      message = 'Invalid JSON in request';
    } else if (error.message.includes('not found')) {
      errorCode = MCPErrorCode.NOT_FOUND;
    } else if (error.message.includes('unauthorized')) {
      errorCode = MCPErrorCode.UNAUTHORIZED;
    }

    const errorResponse: MCPErrorResponse = {
      jsonrpc: '2.0',
      error: {
        code: errorCode,
        message,
        data: process.env.NODE_ENV === 'development' ? {
          stack: error.stack,
          name: error.name
        } : undefined
      },
      id: (req.body && req.body.id) || null
    };

    // Determine status code
    let statusCode = 500;
    switch (errorCode) {
      case MCPErrorCode.UNAUTHORIZED:
        statusCode = 401;
        break;
      case MCPErrorCode.FORBIDDEN:
        statusCode = 403;
        break;
      case MCPErrorCode.NOT_FOUND:
        statusCode = 404;
        break;
      case MCPErrorCode.INVALID_PARAMS:
      case MCPErrorCode.PARSE_ERROR:
        statusCode = 400;
        break;
      case MCPErrorCode.RATE_LIMITED:
        statusCode = 429;
        break;
    }

    res.status(statusCode).json(errorResponse);
  };
}

export function createNotFoundHandler() {
  return (req: Request, res: Response) => {
    const errorResponse: MCPErrorResponse = {
      jsonrpc: '2.0',
      error: {
        code: MCPErrorCode.NOT_FOUND,
        message: `Endpoint ${req.path} not found`
      },
      id: null
    };

    res.status(404).json(errorResponse);
  };
}