import { z } from 'zod';
import { TransferTrendsInputSchema, type TransferTrendsInput } from '../types/fpl.js';
import { FPLApiService } from '../services/fpl-api.js';
import { FPLAnalysisService } from '../services/analysis.js';
import { createMCPResponse, formatPlayerName, formatPrice } from '../utils/helpers.js';
import { TOOL_NAMES } from '../utils/constants.js';

export const transferTrendsTool = {
  name: TOOL_NAMES.GET_TRANSFER_TRENDS,
  description: "Get popular transfer trends, players being bought/sold, and price change predictions",
  inputSchema: TransferTrendsInputSchema,

  async handler(input: TransferTrendsInput) {
    try {
      const fplApi = new FPLApiService();
      const bootstrapData = await fplApi.getBootstrapData();
      const analysisService = new FPLAnalysisService(bootstrapData);

      const trends = analysisService.getTransferTrends(input.time_period, input.min_transfers);

      const summary = `Transfer trends (${input.time_period}): ${trends.most_transferred_in.length} popular buys, ${trends.most_transferred_out.length} frequent sells`;

      const insights = [
        `Time period: ${input.time_period}`,
        `Minimum transfers threshold: ${input.min_transfers.toLocaleString()}`,
        `Top transfer in: ${trends.most_transferred_in[0] ? formatPlayerName(trends.most_transferred_in[0].player) : 'None'}`,
        `Top transfer out: ${trends.most_transferred_out[0] ? formatPlayerName(trends.most_transferred_out[0].player) : 'None'}`,
        `Popular buys identified: ${trends.most_transferred_in.length}`,
        `Frequent sells identified: ${trends.most_transferred_out.length}`
      ];

      const metrics = {
        analysis_period: input.time_period,
        transfer_threshold: input.min_transfers,
        most_transferred_in: trends.most_transferred_in.map(transfer => {
          const team = bootstrapData.teams.find(t => t.id === transfer.player.team);
          const position = bootstrapData.element_types.find(t => t.id === transfer.player.element_type);

          return {
            player_id: transfer.player.id,
            player_name: formatPlayerName(transfer.player),
            team: team?.short_name || 'Unknown',
            position: position?.plural_name || 'Unknown',
            price: formatPrice(transfer.player.now_cost),
            transfers_in: transfer.transfers_in,
            price_change: transfer.price_change,
            form: transfer.player.form,
            ownership: `${transfer.player.selected_by_percent}%`,
            reasoning: transfer.reasoning
          };
        }),
        most_transferred_out: trends.most_transferred_out.map(transfer => {
          const team = bootstrapData.teams.find(t => t.id === transfer.player.team);
          const position = bootstrapData.element_types.find(t => t.id === transfer.player.element_type);

          return {
            player_id: transfer.player.id,
            player_name: formatPlayerName(transfer.player),
            team: team?.short_name || 'Unknown',
            position: position?.plural_name || 'Unknown',
            price: formatPrice(transfer.player.now_cost),
            transfers_out: transfer.transfers_out,
            price_change: transfer.price_change,
            form: transfer.player.form,
            ownership: `${transfer.player.selected_by_percent}%`,
            reasoning: transfer.reasoning
          };
        }),
        summary_stats: {
          total_transfers_in: trends.most_transferred_in.reduce((sum, t) => sum + t.transfers_in, 0),
          total_transfers_out: trends.most_transferred_out.reduce((sum, t) => sum + t.transfers_out, 0),
          avg_price_transfers_in: trends.most_transferred_in.length > 0
            ? `£${(trends.most_transferred_in.reduce((sum, t) => sum + t.player.now_cost, 0) / trends.most_transferred_in.length / 10).toFixed(1)}m`
            : '£0.0m',
          avg_price_transfers_out: trends.most_transferred_out.length > 0
            ? `£${(trends.most_transferred_out.reduce((sum, t) => sum + t.player.now_cost, 0) / trends.most_transferred_out.length / 10).toFixed(1)}m`
            : '£0.0m'
        }
      };

      let recommendations = '';

      if (trends.most_transferred_in.length > 0) {
        const topBuy = trends.most_transferred_in[0];
        recommendations += `🔥 Trending: ${formatPlayerName(topBuy.player)} is the most popular transfer target. `;

        if (topBuy.price_change > 0) {
          recommendations += 'Price likely to rise - act quickly if interested. ';
        }
      }

      if (trends.most_transferred_out.length > 0) {
        const topSell = trends.most_transferred_out[0];
        recommendations += `📉 Avoid: ${formatPlayerName(topSell.player)} is being heavily sold. `;

        if (topSell.price_change < 0) {
          recommendations += 'Price likely to fall - sell before further drops. ';
        }
      }

      // Position-based insights
      const transferInPositions = trends.most_transferred_in.map(t =>
        bootstrapData.element_types.find(pos => pos.id === t.player.element_type)?.plural_name
      );
      const popularPosition = transferInPositions.reduce((count: any, pos) => {
        count[pos!] = (count[pos!] || 0) + 1;
        return count;
      }, {});

      const mostPopularPos = Object.keys(popularPosition).reduce((a, b) =>
        popularPosition[a] > popularPosition[b] ? a : b
      );

      if (mostPopularPos) {
        recommendations += `${mostPopularPos} are the most popular transfer targets this period.`;
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
        `Failed to get transfer trends: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ['Error occurred while analyzing transfer data'],
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }
};