import { z } from 'zod';
import { GameweekContextInputSchema, type GameweekContextInput } from '../types/fpl.js';
import { FPLApiService } from '../services/fpl-api.js';
import { FPLAnalysisService } from '../services/analysis.js';
import { createMCPResponse } from '../utils/helpers.js';
import { TOOL_NAMES } from '../utils/constants.js';

export const gameweekContextTool = {
  name: TOOL_NAMES.GET_GAMEWEEK_CONTEXT,
  description: "Get current gameweek status, deadlines, and phase information",
  inputSchema: GameweekContextInputSchema,

  async handler(input: GameweekContextInput) {
    try {
      const fplApi = new FPLApiService();
      const bootstrapData = await fplApi.getBootstrapData();
      const analysisService = new FPLAnalysisService(bootstrapData);

      const context = analysisService.getGameweekContext();

      const summary = `Current status: ${context.phase}. ${context.deadline_info}`;

      const insights = [
        `Phase: ${context.phase}`,
        `Deadline: ${context.deadline_info}`,
        context.current_gameweek ? `Current GW: ${context.current_gameweek.name}` : 'No active gameweek',
        context.next_gameweek ? `Next GW: ${context.next_gameweek.name}` : 'No upcoming gameweek'
      ];

      const metrics = {
        current_gameweek: context.current_gameweek ? {
          id: context.current_gameweek.id,
          name: context.current_gameweek.name,
          finished: context.current_gameweek.finished,
          average_score: context.current_gameweek.average_entry_score,
          highest_score: context.current_gameweek.highest_score
        } : null,
        next_gameweek: context.next_gameweek ? {
          id: context.next_gameweek.id,
          name: context.next_gameweek.name,
          deadline: context.next_gameweek.deadline_time
        } : null,
        phase: context.phase,
        deadline_status: context.deadline_info
      };

      let recommendations = '';
      if (context.phase === 'Deadline Approaching') {
        recommendations = 'Time to finalize your team! Check captain picks and last-minute transfers.';
      } else if (context.phase === 'Planning Phase') {
        recommendations = 'Good time for analysis. Review player form, fixtures, and potential transfers.';
      } else if (context.phase === 'Gameweek Active') {
        recommendations = 'Gameweek is live! Monitor player performances and plan for next week.';
      }

      return createMCPResponse(
        true,
        summary,
        insights,
        metrics,
        recommendations,
        context.current_gameweek?.id || context.next_gameweek?.id
      );

    } catch (error) {
      return createMCPResponse(
        false,
        `Failed to get gameweek context: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ['Error occurred while fetching gameweek data'],
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }
};