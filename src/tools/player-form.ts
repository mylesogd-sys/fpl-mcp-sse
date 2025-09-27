import { z } from 'zod';
import { PlayerFormInputSchema, type PlayerFormInput } from '../types/fpl.js';
import { FPLApiService } from '../services/fpl-api.js';
import { FPLAnalysisService } from '../services/analysis.js';
import { createMCPResponse, formatPlayerName, formatPrice } from '../utils/helpers.js';
import { TOOL_NAMES } from '../utils/constants.js';

export const playerFormTool = {
  name: TOOL_NAMES.ANALYZE_PLAYER_FORM,
  description: "Analyze player form, performance trends, and value rating",
  inputSchema: PlayerFormInputSchema,

  async handler(input: PlayerFormInput) {
    try {
      const fplApi = new FPLApiService();
      const bootstrapData = await fplApi.getBootstrapData();
      const analysisService = new FPLAnalysisService(bootstrapData);

      const analysis = analysisService.analyzePlayerForm(input.player_id, input.gameweeks);
      const playerName = formatPlayerName(analysis.player);

      const summary = `${playerName}: ${analysis.analysis.form_rating} form, ${analysis.analysis.value_rating}, ${analysis.analysis.injury_status}`;

      const insights = [
        `Form rating: ${analysis.analysis.form_rating}`,
        `Value assessment: ${analysis.analysis.value_rating}`,
        `Ownership: ${analysis.analysis.ownership_category}`,
        `Injury status: ${analysis.analysis.injury_status}`,
        `Performance trend: ${analysis.analysis.performance_trend}`
      ];

      const metrics = {
        player_info: {
          id: analysis.player.id,
          name: playerName,
          team: bootstrapData.teams.find(t => t.id === analysis.player.team)?.short_name || 'Unknown',
          position: bootstrapData.element_types.find(t => t.id === analysis.player.element_type)?.plural_name || 'Unknown',
          price: formatPrice(analysis.player.now_cost),
          status: analysis.player.status
        },
        performance_metrics: analysis.analysis.key_stats,
        ratings: {
          form_rating: analysis.analysis.form_rating,
          value_rating: analysis.analysis.value_rating,
          ownership_category: analysis.analysis.ownership_category,
          performance_trend: analysis.analysis.performance_trend
        },
        injury_status: analysis.analysis.injury_status
      };

      let recommendations = '';
      if (analysis.analysis.injury_status !== 'Available') {
        recommendations = `⚠️ ${analysis.analysis.injury_status} - Monitor injury updates before selecting. `;
      }

      if (analysis.analysis.form_rating === 'Excellent' && analysis.analysis.value_rating.includes('Value')) {
        recommendations += 'Strong pick with excellent form and good value.';
      } else if (analysis.analysis.form_rating === 'Poor' || analysis.analysis.form_rating === 'Very Poor') {
        recommendations += 'Consider alternatives due to poor recent form.';
      } else if (analysis.analysis.performance_trend === 'Improving') {
        recommendations += 'Trending upward - could be a good differential pick.';
      } else if (analysis.analysis.performance_trend === 'Declining') {
        recommendations += 'Form declining - monitor closely or consider selling.';
      } else {
        recommendations += 'Solid option with consistent performance.';
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
        `Failed to analyze player form: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ['Error occurred while analyzing player data'],
        { error: error instanceof Error ? error.message : 'Unknown error', player_id: input.player_id }
      );
    }
  }
};