# FPL MCP Server

Production-ready Model Context Protocol (MCP) server for Fantasy Premier League data, specifically designed for n8n AI Agent integration with dual transport support.

## 🚀 Features

- **10 Intelligent FPL Tools** - Comprehensive analysis suite for Fantasy Premier League
- **Dual Transport Architecture** - SSE for n8n Cloud + HTTP for testing
- **Smart Data Processing** - Rich analysis layer with form ratings, value assessments, trends
- **Railway Ready** - Optimized for Railway.io deployment
- **Type Safe** - Full TypeScript implementation with Zod validation
- **Session Management** - Automatic cleanup and connection handling

## 🛠️ Available Tools

### Foundation Tools
- `get_gameweek_context` - Current gameweek status, deadlines, phase info
- `get_bootstrap_data` - Core FPL data (players, teams, positions, events)

### Player Intelligence
- `analyze_player_form` - Form ratings, value analysis, injury status
- `compare_players` - Side-by-side player comparison with metrics
- `get_player_fixtures` - Upcoming fixture difficulty analysis

### Market & Strategy
- `get_transfer_trends` - Popular transfers, price changes, reasoning
- `get_captain_picks` - Top captain options with expected points
- `analyze_team_fixtures` - Team fixture runs and difficulty ratings

### Advanced Intelligence
- `get_dream_team` - Highest scoring XI with formation analysis
- `get_set_piece_takers` - Penalty, free kick, corner specialists

## 🌐 API Endpoints

- **Health Check**: `GET /health`
- **SSE Transport**: `GET /sse` (for n8n Cloud)
- **HTTP Transport**: `ALL /mcp` (for testing/modern clients)
- **Session Info**: `GET /sessions`
- **Server Info**: `GET /`

## 🚀 Deployment

### Railway.io (Recommended)

1. **Deploy to Railway**:
   ```bash
   # Connect your GitHub repo to Railway
   # Railway will auto-detect Node.js and use the railway.toml config
   ```

2. **Set Environment Variables** (optional):
   ```bash
   AUTH_TOKEN=your-secret-bearer-token
   CORS_ORIGIN=https://your-domain.com
   ```

3. **Deploy**: Railway will automatically build and deploy

### Local Development

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Environment Setup**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Development Mode**:
   ```bash
   npm run dev
   ```

4. **Production Build**:
   ```bash
   npm run build
   npm start
   ```

## 🔧 n8n Integration

### n8n Cloud Setup

1. **Install MCP Client Node** in n8n
2. **Configure Connection**:
   - **Transport**: SSE
   - **URL**: `https://your-railway-app.railway.app/sse`
   - **Authentication**: Bearer token (if configured)

### Example n8n Workflow

```json
{
  "nodes": [
    {
      "name": "MCP Client",
      "type": "@coleam00/n8n-nodes-mcp",
      "parameters": {
        "tool": "get_captain_picks",
        "arguments": {
          "position_filter": "FWD",
          "max_price": 12
        }
      }
    },
    {
      "name": "AI Agent",
      "type": "n8n-nodes-langchain.agent",
      "parameters": {
        "prompt": "Create a Twitter thread about this week's captain picks: {{ $json }}"
      }
    }
  ]
}
```

## 📊 Response Format

All tools return structured data optimized for n8n AI Agent:

```typescript
{
  "success": boolean,
  "data": {
    "summary": string,           // Human-readable summary
    "insights": string[],        // Key bullet points
    "metrics": object,           // Structured data
    "recommendations": string    // Strategic advice
  },
  "metadata": {
    "gameweek": number,
    "timestamp": string,
    "data_freshness": string
  }
}
```

## 🔐 Authentication

Optional Bearer token authentication:

```bash
# Set in environment
AUTH_TOKEN=your-secret-token

# Use in requests
Authorization: Bearer your-secret-token
```

## 📋 Tool Examples

### Get Captain Recommendations
```bash
curl -X POST https://your-app.railway.app/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "get_captain_picks",
      "arguments": {
        "position_filter": "FWD",
        "max_price": 12
      }
    },
    "id": 1
  }'
```

### Analyze Player Form
```bash
curl -X POST https://your-app.railway.app/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "analyze_player_form",
      "arguments": {
        "player_id": 123,
        "gameweeks": 5
      }
    },
    "id": 1
  }'
```

## 🏗️ Architecture

```
src/
├── index.ts              # Server entry point
├── server/
│   ├── mcp-server.ts     # MCP server setup
│   ├── transports/       # SSE & HTTP handlers
│   └── middleware/       # Auth, CORS, errors
├── tools/                # 10 FPL tool implementations
├── services/             # FPL API & analysis services
├── types/                # TypeScript definitions
└── utils/                # Helpers & constants
```

## 📈 Performance

- **Intelligent Caching**: FPL API responses cached with appropriate TTL
- **Session Management**: Automatic cleanup of expired connections
- **Error Handling**: Comprehensive error responses with context
- **Health Monitoring**: Built-in health checks and session tracking

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

ISC License - see LICENSE file for details

## 🔗 Links

- [Model Context Protocol](https://modelcontextprotocol.io/)
- [n8n Documentation](https://docs.n8n.io/)
- [Railway Deployment](https://railway.app/)
- [Fantasy Premier League API](https://fantasy.premierleague.com/api/)