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

### Prerequisites

1. **Enable Community Nodes as Tools**:
   ```bash
   # Environment variable required for AI Agent integration
   export N8N_COMMUNITY_PACKAGES_ALLOW_TOOL_USAGE=true
   ```

2. **Install MCP Client Node** in n8n Community Nodes

### MCP Server Tool Node Configuration

- **Server URL**: `https://fpl-mcp-sse-production.up.railway.app/sse`
- **Transport Type**: `SSE` (Server-Sent Events)
- **Authentication**: `None`
- **Auto-Discovery**: All 10 FPL tools automatically available

### AI Agent Configuration

**System Message:**
```
You are an expert Fantasy Premier League (FPL) analyst with access to real-time FPL data through specialized tools.

ANALYSIS APPROACH:
1. Start with get_gameweek_context for current status
2. Use appropriate tools based on the question type:
   - Player stats/form → analyze_player_form
   - Player comparisons → compare_players
   - Team fixtures → analyze_team_fixtures
   - Captain recommendations → get_captain_picks
   - Transfer targets → get_transfer_trends
   - General player data → get_bootstrap_data

RESPONSE STRUCTURE:
- Provide current gameweek context when relevant
- Present key metrics and data points
- Give clear, actionable recommendations
- Include confidence levels for decisions

Always use the available tools to get current data before making any recommendations.
```

**User Message:**
```
{{ $json.chatInput }}
```

### Example Workflow Setup

1. **Chat Trigger** → captures user FPL questions
2. **MCP Server Tool** → connects to FPL MCP server
3. **AI Agent** → uses MCP tools for data-driven analysis
4. **Chat Response** → returns expert FPL advice

### Validated Use Cases

✅ **Player Analysis**: "How many points does Semenyo have?"
✅ **Comparisons**: "Should I bring in Semenyo for Sarr?"
✅ **Fixtures**: "How are Arsenal fixtures for next 3 gameweeks?"
✅ **Captaincy**: "Should I captain Salah or Palmer?"
✅ **Transfers**: "Which keeper should I bring in?"

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
curl -X POST https://fpl-mcp-sse-production.up.railway.app/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {"tools": {}},
      "clientInfo": {"name": "test-client", "version": "1.0.0"}
    },
    "id": 1
  }'

# Then use returned session ID for tool calls
curl -X POST https://fpl-mcp-sse-production.up.railway.app/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: YOUR_SESSION_ID" \
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
    "id": 2
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

## 📈 Performance & Production Status

✅ **Production Ready** - Deployed on railway
✅ **Session Management Fixed** - Synchronized session IDs across transports
✅ **Validated with n8n** - Working AI Agent integration confirmed

### Features
- **Intelligent Caching**: FPL API responses cached with appropriate TTL
- **Session Management**: Automatic cleanup of expired connections
- **Error Handling**: Comprehensive error responses with context
- **Health Monitoring**: Built-in health checks and session tracking
- **Dual Transport**: SSE for n8n Cloud, HTTP for testing

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
