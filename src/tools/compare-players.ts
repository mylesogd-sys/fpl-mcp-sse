import { z } from 'zod';
import { ComparePlayersInputSchema, type ComparePlayersInput } from '../types/fpl.js';
import { FPLApiService } from '../services/fpl-api.js';
import { FPLAnalysisService } from '../services/analysis.js';
import { createMCPResponse } from '../utils/helpers.js';
import { TOOL_NAMES } from '../utils/constants.js';

export const comparePlayersTool = {
  name: TOOL_NAMES.COMPARE_PLAYERS,
  description: "Compare multiple players side-by-side with detailed metrics and recommendations",
  inputSchema: ComparePlayersInputSchema,

  async handler(input: ComparePlayersInput) {
    try {
      const fplApi = new FPLApiService();
      const bootstrapData = await fplApi.getBootstrapData();
      const analysisService = new FPLAnalysisService(bootstrapData);

      const comparison = analysisService.comparePlayers(input.player_ids, input.metrics);

      const playerNames = comparison.players.map(p => `${p.first_name} ${p.second_name}`);
      const summary = `Comparison of ${playerNames.length} players: ${playerNames.join(', ')}`;

      const insights = [
        `Players compared: ${playerNames.length}`,
        `Positions: ${Object.values(comparison.comparison_matrix).map(p => p.position).join(', ')}`,
        `Price range: ${Math.min(...Object.values(comparison.comparison_matrix).map(p => parseFloat(p.price.replace('£', '').replace('m', ''))))}m - ${Math.max(...Object.values(comparison.comparison_matrix).map(p => parseFloat(p.price.replace('£', '').replace('m', ''))))}m`,
        `Total points range: ${Math.min(...Object.values(comparison.comparison_matrix).map(p => p.total_points))} - ${Math.max(...Object.values(comparison.comparison_matrix).map(p => p.total_points))}`,
        ...comparison.recommendations
      ];

      const metrics = {
        comparison_matrix: comparison.comparison_matrix,
        player_count: comparison.players.length,
        analysis_criteria: input.metrics || ['form', 'price', 'ownership'],
        summary_stats: {
          avg_total_points: Math.round(Object.values(comparison.comparison_matrix).reduce((sum, p) => sum + p.total_points, 0) / comparison.players.length),
          avg_form: (Object.values(comparison.comparison_matrix).reduce((sum, p) => sum + p.form, 0) / comparison.players.length).toFixed(1),
          avg_ppg: (Object.values(comparison.comparison_matrix).reduce((sum, p) => sum + p.points_per_game, 0) / comparison.players.length).toFixed(1),
          avg_price: `£${(Object.values(comparison.comparison_matrix).reduce((sum, p) => sum + parseFloat(p.price.replace('£', '').replace('m', '')), 0) / comparison.players.length).toFixed(1)}m`
        },
        detailed_recommendations: comparison.recommendations
      };

      // Generate strategic recommendations
      let recommendations = 'Player comparison insights: ';

      const bestValuePlayer = comparison.recommendations.find(r => r.includes('Best value:'));
      const bestFormPlayer = comparison.recommendations.find(r => r.includes('Best form:'));
      const topScorer = comparison.recommendations.find(r => r.includes('Highest scorer:'));

      if (bestValuePlayer && bestFormPlayer && topScorer) {
        recommendations += 'Consider the best value option for budget flexibility, best form for current performance, or highest scorer for proven reliability.';
      } else {
        recommendations += 'Review the comparison matrix to identify the player that best fits your strategy and budget.';
      }

      // Add position-specific advice
      const positions = [...new Set(Object.values(comparison.comparison_matrix).map(p => p.position))];
      if (positions.length === 1) {
        recommendations += ` All players are ${positions[0]}s - choose based on your team's specific needs.`;
      } else {
        recommendations += ` Multiple positions compared (${positions.join(', ')}) - consider your team structure.`;
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
        `Failed to compare players: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ['Error occurred while comparing player data'],
        { error: error instanceof Error ? error.message : 'Unknown error', player_ids: input.player_ids }
      );
    }
  }
};