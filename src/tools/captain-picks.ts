import { z } from 'zod';
import { CaptainPicksInputSchema, type CaptainPicksInput } from '../types/fpl.js';
import { FPLApiService } from '../services/fpl-api.js';
import { FPLAnalysisService } from '../services/analysis.js';
import { createMCPResponse, formatPlayerName, formatPrice } from '../utils/helpers.js';
import { TOOL_NAMES } from '../utils/constants.js';

export const captainPicksTool = {
  name: TOOL_NAMES.GET_CAPTAIN_PICKS,
  description: "Get top captain recommendations with expected points, confidence levels, and detailed reasoning",
  inputSchema: CaptainPicksInputSchema,

  async handler(input: CaptainPicksInput) {
    try {
      const fplApi = new FPLApiService();
      const bootstrapData = await fplApi.getBootstrapData();
      const analysisService = new FPLAnalysisService(bootstrapData);

      const captainData = analysisService.getCaptainRecommendations(
        input.gameweek,
        input.position_filter,
        input.max_price
      );

      const topPick = captainData.top_pick;
      const topPickName = formatPlayerName(topPick);

      const summary = `Top captain pick: ${topPickName} with ${captainData.recommendations[0]?.expected_points || 'N/A'} expected points`;

      const insights = [
        `Total recommendations: ${captainData.recommendations.length}`,
        `Top pick: ${topPickName}`,
        `Expected points: ${captainData.recommendations[0]?.expected_points || 'N/A'}`,
        `Confidence: ${captainData.recommendations[0]?.confidence || 'Unknown'}`,
        input.position_filter ? `Position filter: ${input.position_filter}` : 'All positions considered',
        input.max_price ? `Max price: £${input.max_price}m` : 'No price limit'
      ];

      const metrics = {
        gameweek: input.gameweek || 'Current',
        filters_applied: {
          position: input.position_filter || 'All',
          max_price: input.max_price ? `£${input.max_price}m` : 'None'
        },
        top_pick: {
          player_id: topPick.id,
          name: topPickName,
          team: bootstrapData.teams.find(t => t.id === topPick.team)?.short_name || 'Unknown',
          position: bootstrapData.element_types.find(t => t.id === topPick.element_type)?.plural_name || 'Unknown',
          price: formatPrice(topPick.now_cost),
          form: topPick.form,
          ownership: `${topPick.selected_by_percent}%`,
          total_points: topPick.total_points,
          expected_points: captainData.recommendations[0]?.expected_points || 0,
          confidence: captainData.recommendations[0]?.confidence || 'medium'
        },
        all_recommendations: captainData.recommendations.map(rec => {
          const team = bootstrapData.teams.find(t => t.id === rec.player.team);
          const position = bootstrapData.element_types.find(t => t.id === rec.player.element_type);

          return {
            player_id: rec.player.id,
            name: formatPlayerName(rec.player),
            team: team?.short_name || 'Unknown',
            position: position?.plural_name || 'Unknown',
            price: formatPrice(rec.player.now_cost),
            expected_points: rec.expected_points,
            confidence: rec.confidence,
            reasoning: rec.reasoning,
            form: rec.player.form,
            ownership: `${rec.player.selected_by_percent}%`,
            total_points: rec.player.total_points
          };
        }),
        confidence_distribution: {
          high: captainData.recommendations.filter(r => r.confidence === 'high').length,
          medium: captainData.recommendations.filter(r => r.confidence === 'medium').length,
          low: captainData.recommendations.filter(r => r.confidence === 'low').length
        }
      };

      let recommendations = '';

      const topRec = captainData.recommendations[0];
      if (topRec) {
        recommendations += `🏆 Captain recommendation: ${formatPlayerName(topRec.player)} (${topRec.confidence} confidence, ${topRec.expected_points} expected points). `;
        recommendations += `${topRec.reasoning} `;

        // Add ownership-based advice
        const ownership = parseFloat(topRec.player.selected_by_percent);
        if (ownership > 30) {
          recommendations += 'High ownership pick - safe but low differential upside. ';
        } else if (ownership < 10) {
          recommendations += 'Low ownership differential - high risk, high reward potential. ';
        } else {
          recommendations += 'Moderate ownership - good balance of safety and differential potential. ';
        }

        // Add confidence-based advice
        if (topRec.confidence === 'high') {
          recommendations += 'Strong pick with minimal risk.';
        } else if (topRec.confidence === 'low') {
          recommendations += 'Consider safer alternatives unless feeling adventurous.';
        } else {
          recommendations += 'Solid option with reasonable upside.';
        }
      }

      // Alternative recommendations
      if (captainData.recommendations.length > 1) {
        const secondChoice = captainData.recommendations[1];
        recommendations += ` Alternative: ${formatPlayerName(secondChoice.player)} (${secondChoice.expected_points} pts).`;
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
        `Failed to get captain picks: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ['Error occurred while analyzing captain options'],
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }
};