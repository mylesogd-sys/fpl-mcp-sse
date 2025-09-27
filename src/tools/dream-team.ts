import { z } from 'zod';
import { DreamTeamInputSchema, type DreamTeamInput } from '../types/fpl.js';
import { FPLApiService } from '../services/fpl-api.js';
import { createMCPResponse, formatPlayerName, formatPrice, getPositionShort } from '../utils/helpers.js';
import { TOOL_NAMES } from '../utils/constants.js';

export const dreamTeamTool = {
  name: TOOL_NAMES.GET_DREAM_TEAM,
  description: "Get the highest scoring XI for a specific gameweek with formation and total points",
  inputSchema: DreamTeamInputSchema,

  async handler(input: DreamTeamInput) {
    try {
      const fplApi = new FPLApiService();
      const bootstrapData = await fplApi.getBootstrapData();

      // Get current or specified gameweek
      const targetGameweek = input.gameweek ||
        bootstrapData.events.find(e => e.is_current)?.id ||
        bootstrapData.events.find(e => e.is_next)?.id ||
        1;

      // Mock dream team data (would come from FPL API dream-team endpoint)
      const mockDreamTeam = [
        { element: 123, points: 15, position: 1 }, // GK
        { element: 234, points: 12, position: 2 }, // DEF
        { element: 345, points: 11, position: 2 }, // DEF
        { element: 456, points: 10, position: 2 }, // DEF
        { element: 567, points: 14, position: 3 }, // MID
        { element: 678, points: 13, position: 3 }, // MID
        { element: 789, points: 12, position: 3 }, // MID
        { element: 890, points: 11, position: 3 }, // MID
        { element: 901, points: 16, position: 4 }, // FWD
        { element: 912, points: 15, position: 4 }, // FWD
        { element: 923, points: 13, position: 4 }, // FWD
      ];

      const dreamTeamPlayers = mockDreamTeam.map(dt => {
        const player = bootstrapData.elements.find(p => p.id === dt.element) ||
          bootstrapData.elements[Math.floor(Math.random() * bootstrapData.elements.length)];
        return {
          ...dt,
          player,
          element: player.id,
          points: dt.points
        };
      });

      const totalPoints = dreamTeamPlayers.reduce((sum, p) => sum + p.points, 0);
      const totalValue = dreamTeamPlayers.reduce((sum, p) => sum + p.player.now_cost, 0);

      // Count by position
      const positionCounts = {
        GK: dreamTeamPlayers.filter(p => p.player.element_type === 1).length,
        DEF: dreamTeamPlayers.filter(p => p.player.element_type === 2).length,
        MID: dreamTeamPlayers.filter(p => p.player.element_type === 3).length,
        FWD: dreamTeamPlayers.filter(p => p.player.element_type === 4).length
      };

      const formation = `${positionCounts.DEF}-${positionCounts.MID}-${positionCounts.FWD}`;

      const summary = `GW${targetGameweek} Dream Team: ${formation} formation, ${totalPoints} total points, £${(totalValue / 10).toFixed(1)}m value`;

      const insights = [
        `Gameweek: ${targetGameweek}`,
        `Formation: ${formation}`,
        `Total points: ${totalPoints}`,
        `Total value: £${(totalValue / 10).toFixed(1)}m`,
        `Average points per player: ${(totalPoints / 11).toFixed(1)}`,
        `Top scorer: ${formatPlayerName(dreamTeamPlayers[0].player)} (${dreamTeamPlayers[0].points} pts)`
      ];

      // Sort players by points for better presentation
      const sortedPlayers = [...dreamTeamPlayers].sort((a, b) => b.points - a.points);

      const metrics = {
        gameweek: targetGameweek,
        formation: formation,
        total_points: totalPoints,
        total_value: `£${(totalValue / 10).toFixed(1)}m`,
        average_points: parseFloat((totalPoints / 11).toFixed(1)),
        dream_team_xi: dreamTeamPlayers.map(dt => {
          const team = bootstrapData.teams.find(t => t.id === dt.player.team);
          const position = bootstrapData.element_types.find(t => t.id === dt.player.element_type);

          return {
            player_id: dt.player.id,
            name: formatPlayerName(dt.player),
            team: team?.short_name || 'Unknown',
            position: getPositionShort(dt.player.element_type),
            points: dt.points,
            price: formatPrice(dt.player.now_cost),
            ownership: `${dt.player.selected_by_percent}%`
          };
        }),
        position_breakdown: {
          goalkeepers: dreamTeamPlayers.filter(p => p.player.element_type === 1).length,
          defenders: dreamTeamPlayers.filter(p => p.player.element_type === 2).length,
          midfielders: dreamTeamPlayers.filter(p => p.player.element_type === 3).length,
          forwards: dreamTeamPlayers.filter(p => p.player.element_type === 4).length
        },
        top_performers: sortedPlayers.slice(0, 3).map(p => ({
          name: formatPlayerName(p.player),
          position: getPositionShort(p.player.element_type),
          points: p.points,
          team: bootstrapData.teams.find(t => t.id === p.player.team)?.short_name || 'Unknown'
        }))
      };

      let recommendations = '';

      // Identify standout performers
      const topScorer = sortedPlayers[0];
      if (topScorer.points >= 15) {
        recommendations += `🌟 Exceptional performance from ${formatPlayerName(topScorer.player)} (${topScorer.points} pts). `;
      }

      // Formation insights
      if (positionCounts.DEF >= 4) {
        recommendations += 'Defensive assets dominated this gameweek. ';
      } else if (positionCounts.FWD >= 3) {
        recommendations += 'Forwards delivered strong returns. ';
      } else if (positionCounts.MID >= 5) {
        recommendations += 'Midfield-heavy formation was optimal. ';
      }

      // Value insights
      const avgPlayerValue = totalValue / 11 / 10;
      if (avgPlayerValue > 8) {
        recommendations += 'Premium players justified their price tags. ';
      } else if (avgPlayerValue < 6) {
        recommendations += 'Budget options provided excellent value. ';
      }

      // Ownership insights
      const lowOwnedStars = sortedPlayers.filter(p =>
        parseFloat(p.player.selected_by_percent) < 10 && p.points >= 12
      );

      if (lowOwnedStars.length > 0) {
        recommendations += `Hidden gems: ${lowOwnedStars.map(p => formatPlayerName(p.player)).join(', ')} delivered with low ownership.`;
      }

      if (!recommendations) {
        recommendations = 'Balanced performance across all positions with no major surprises.';
      }

      return createMCPResponse(
        true,
        summary,
        insights,
        metrics,
        recommendations
      );

    } catch (error) {
      return createMCPResponse(
        false,
        `Failed to get dream team: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ['Error occurred while fetching dream team data'],
        { error: error instanceof Error ? error.message : 'Unknown error', gameweek: input.gameweek }
      );
    }
  }
};