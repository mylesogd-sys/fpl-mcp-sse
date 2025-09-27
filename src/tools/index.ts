// Export all tools for easy importing
export { gameweekContextTool } from './gameweek-context.js';
export { bootstrapDataTool } from './bootstrap-data.js';
export { playerFormTool } from './player-form.js';
export { comparePlayersTool } from './compare-players.js';
export { playerFixturesTool } from './player-fixtures.js';
export { transferTrendsTool } from './transfer-trends.js';
export { captainPicksTool } from './captain-picks.js';
export { teamFixturesTool } from './team-fixtures.js';
export { dreamTeamTool } from './dream-team.js';
export { setPieceTakersTool } from './set-piece-takers.js';

// Tool registry for easy access
import { gameweekContextTool } from './gameweek-context.js';
import { bootstrapDataTool } from './bootstrap-data.js';
import { playerFormTool } from './player-form.js';
import { comparePlayersTool } from './compare-players.js';
import { playerFixturesTool } from './player-fixtures.js';
import { transferTrendsTool } from './transfer-trends.js';
import { captainPicksTool } from './captain-picks.js';
import { teamFixturesTool } from './team-fixtures.js';
import { dreamTeamTool } from './dream-team.js';
import { setPieceTakersTool } from './set-piece-takers.js';

export const FPL_TOOLS = [
  gameweekContextTool,
  bootstrapDataTool,
  playerFormTool,
  comparePlayersTool,
  playerFixturesTool,
  transferTrendsTool,
  captainPicksTool,
  teamFixturesTool,
  dreamTeamTool,
  setPieceTakersTool
] as const;

export const TOOL_COUNT = FPL_TOOLS.length;