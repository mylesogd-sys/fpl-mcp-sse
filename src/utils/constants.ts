// FPL API Configuration
export const FPL_API = {
  BASE_URL: 'https://fantasy.premierleague.com/api',
  ENDPOINTS: {
    BOOTSTRAP: '/bootstrap-static/',
    FIXTURES: '/fixtures/',
    ELEMENT_SUMMARY: '/element-summary/{id}/',
    EVENT_LIVE: '/event/{id}/live/',
    ENTRY_HISTORY: '/entry/{id}/history/',
    DREAM_TEAM: '/dream-team/{id}/',
    LEAGUES_CLASSIC: '/leagues-classic/{id}/standings/',
    LEAGUES_H2H: '/leagues-h2h/{id}/standings/'
  },
  RATE_LIMITS: {
    REQUESTS_PER_MINUTE: 60,
    REQUESTS_PER_HOUR: 3600
  },
  CACHE_TTL: {
    BOOTSTRAP: 3600000, // 1 hour
    FIXTURES: 1800000,  // 30 minutes
    LIVE_DATA: 300000,  // 5 minutes
    PLAYER_DATA: 900000 // 15 minutes
  }
} as const;

// MCP Server Configuration
export const MCP_CONFIG = {
  SERVER_NAME: 'fpl-mcp-server',
  VERSION: '1.0.0',
  DEFAULT_PORT: 8080,
  ENDPOINTS: {
    SSE: '/sse',
    STREAMABLE_HTTP: '/mcp',
    HEALTH: '/health'
  },
  SESSION_TIMEOUT: 1800000, // 30 minutes
  MAX_SESSIONS: 100
} as const;

// Tool Names
export const TOOL_NAMES = {
  GET_GAMEWEEK_CONTEXT: 'get_gameweek_context',
  GET_BOOTSTRAP_DATA: 'get_bootstrap_data',
  ANALYZE_PLAYER_FORM: 'analyze_player_form',
  COMPARE_PLAYERS: 'compare_players',
  GET_PLAYER_FIXTURES: 'get_player_fixtures',
  GET_TRANSFER_TRENDS: 'get_transfer_trends',
  GET_CAPTAIN_PICKS: 'get_captain_picks',
  ANALYZE_TEAM_FIXTURES: 'analyze_team_fixtures',
  GET_DREAM_TEAM: 'get_dream_team',
  GET_SET_PIECE_TAKERS: 'get_set_piece_takers'
} as const;

// Position Mappings
export const POSITIONS = {
  1: { name: 'Goalkeeper', short: 'GK' },
  2: { name: 'Defender', short: 'DEF' },
  3: { name: 'Midfielder', short: 'MID' },
  4: { name: 'Forward', short: 'FWD' }
} as const;

// Difficulty Ratings
export const DIFFICULTY_LABELS = {
  1: 'Very Easy',
  2: 'Easy',
  3: 'Average',
  4: 'Hard',
  5: 'Very Hard'
} as const;

// Form Rating Thresholds
export const FORM_THRESHOLDS = {
  EXCELLENT: 8,
  GOOD: 6,
  AVERAGE: 4,
  POOR: 2
} as const;