import { z } from 'zod';
import { BootstrapDataInputSchema, type BootstrapDataInput } from '../types/fpl.js';
import { FPLApiService } from '../services/fpl-api.js';
import { createMCPResponse } from '../utils/helpers.js';
import { TOOL_NAMES } from '../utils/constants.js';

export const bootstrapDataTool = {
  name: TOOL_NAMES.GET_BOOTSTRAP_DATA,
  description: "Get core FPL data including players, teams, positions, and events",
  inputSchema: BootstrapDataInputSchema,

  async handler(input: BootstrapDataInput) {
    try {
      const fplApi = new FPLApiService();
      const bootstrapData = await fplApi.getBootstrapData();

      const currentGW = bootstrapData.events.find(e => e.is_current);
      const nextGW = bootstrapData.events.find(e => e.is_next);

      const summary = `FPL database contains ${bootstrapData.elements.length} players across ${bootstrapData.teams.length} teams`;

      const insights = [
        `Total players: ${bootstrapData.elements.length}`,
        `Active teams: ${bootstrapData.teams.length}`,
        `Position types: ${bootstrapData.element_types.length}`,
        `Total gameweeks: ${bootstrapData.events.length}`,
        currentGW ? `Current gameweek: ${currentGW.name}` : 'No current gameweek',
        nextGW ? `Next gameweek: ${nextGW.name}` : 'No upcoming gameweek'
      ];

      const metrics: Record<string, any> = {
        players_by_position: {},
        teams_summary: bootstrapData.teams.map(team => ({
          id: team.id,
          name: team.name,
          short_name: team.short_name,
          strength: team.strength,
          attack_strength: {
            home: team.strength_attack_home,
            away: team.strength_attack_away
          },
          defence_strength: {
            home: team.strength_defence_home,
            away: team.strength_defence_away
          }
        })),
        positions: bootstrapData.element_types.map(pos => ({
          id: pos.id,
          name: pos.plural_name,
          squad_select: pos.squad_select,
          min_play: pos.squad_min_play,
          max_play: pos.squad_max_play
        })),
        current_gameweek: currentGW || null,
        next_gameweek: nextGW || null
      };

      // Count players by position
      bootstrapData.element_types.forEach(position => {
        const playerCount = bootstrapData.elements.filter(p => p.element_type === position.id).length;
        metrics.players_by_position[position.plural_name] = playerCount;
      });

      if (input.include_player_stats) {
        // Add top performers summary
        const topScorers = bootstrapData.elements
          .sort((a, b) => b.total_points - a.total_points)
          .slice(0, 10)
          .map(p => ({
            id: p.id,
            name: `${p.first_name} ${p.second_name}`,
            team_id: p.team,
            position_id: p.element_type,
            total_points: p.total_points,
            price: p.now_cost,
            ownership: p.selected_by_percent
          }));

        metrics.top_scorers = topScorers;
        insights.push(`Top scorer: ${topScorers[0].name} (${topScorers[0].total_points} pts)`);
      }

      const recommendations = 'Use this core data to understand player positions, team strengths, and current season structure for detailed analysis.';

      return createMCPResponse(
        true,
        summary,
        insights,
        metrics,
        recommendations,
        currentGW?.id || nextGW?.id
      );

    } catch (error) {
      return createMCPResponse(
        false,
        `Failed to get bootstrap data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ['Error occurred while fetching FPL core data'],
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }
};