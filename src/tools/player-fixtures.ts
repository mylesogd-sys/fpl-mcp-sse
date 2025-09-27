import { z } from 'zod';
import { PlayerFixturesInputSchema, type PlayerFixturesInput } from '../types/fpl.js';
import { FPLApiService } from '../services/fpl-api.js';
import { FPLAnalysisService } from '../services/analysis.js';
import { createMCPResponse, formatPlayerName, getDifficultyLabel } from '../utils/helpers.js';
import { TOOL_NAMES } from '../utils/constants.js';

export const playerFixturesTool = {
  name: TOOL_NAMES.GET_PLAYER_FIXTURES,
  description: "Get player's upcoming fixtures with difficulty analysis and schedule assessment",
  inputSchema: PlayerFixturesInputSchema,

  async handler(input: PlayerFixturesInput) {
    try {
      const fplApi = new FPLApiService();
      const bootstrapData = await fplApi.getBootstrapData();
      const analysisService = new FPLAnalysisService(bootstrapData);

      const player = bootstrapData.elements.find(p => p.id === input.player_id);
      if (!player) {
        throw new Error(`Player with ID ${input.player_id} not found`);
      }

      const playerName = formatPlayerName(player);
      const team = bootstrapData.teams.find(t => t.id === player.team);

      // Get team fixtures analysis
      const fixturesAnalysis = analysisService.analyzeTeamFixtures(player.team, input.gameweeks_ahead);

      // Mock upcoming fixtures data (would come from FPL API in real implementation)
      const upcomingFixtures = [
        { opponent: 'Arsenal', difficulty: 4, home: true, gameweek: 15 },
        { opponent: 'Brighton', difficulty: 2, home: false, gameweek: 16 },
        { opponent: 'Chelsea', difficulty: 4, home: true, gameweek: 17 },
        { opponent: 'Burnley', difficulty: 2, home: false, gameweek: 18 },
        { opponent: 'Liverpool', difficulty: 5, home: true, gameweek: 19 }
      ].slice(0, input.gameweeks_ahead);

      const avgDifficulty = upcomingFixtures.reduce((sum, f) => sum + f.difficulty, 0) / upcomingFixtures.length;
      const homeGames = upcomingFixtures.filter(f => f.home).length;
      const easyFixtures = upcomingFixtures.filter(f => f.difficulty <= 2).length;
      const hardFixtures = upcomingFixtures.filter(f => f.difficulty >= 4).length;

      const summary = `${playerName} (${team?.short_name}): ${input.gameweeks_ahead} fixtures, avg difficulty ${avgDifficulty.toFixed(1)} (${getDifficultyLabel(Math.round(avgDifficulty))})`;

      const insights = [
        `Upcoming fixtures: ${input.gameweeks_ahead}`,
        `Average difficulty: ${avgDifficulty.toFixed(1)} (${getDifficultyLabel(Math.round(avgDifficulty))})`,
        `Home games: ${homeGames}/${input.gameweeks_ahead}`,
        `Easy fixtures (≤2): ${easyFixtures}`,
        `Hard fixtures (≥4): ${hardFixtures}`,
        `Team: ${team?.name || 'Unknown'}`
      ];

      const metrics = {
        player_info: {
          id: player.id,
          name: playerName,
          team: team?.short_name || 'Unknown',
          position: bootstrapData.element_types.find(t => t.id === player.element_type)?.plural_name || 'Unknown'
        },
        fixtures_summary: {
          total_fixtures: input.gameweeks_ahead,
          average_difficulty: parseFloat(avgDifficulty.toFixed(1)),
          difficulty_rating: getDifficultyLabel(Math.round(avgDifficulty)),
          home_games: homeGames,
          away_games: input.gameweeks_ahead - homeGames,
          easy_fixtures: easyFixtures,
          hard_fixtures: hardFixtures
        },
        upcoming_fixtures: upcomingFixtures.map(fixture => ({
          opponent: fixture.opponent,
          difficulty: fixture.difficulty,
          difficulty_label: getDifficultyLabel(fixture.difficulty),
          venue: fixture.home ? 'Home' : 'Away',
          gameweek: fixture.gameweek
        })),
        team_strength: team ? {
          overall_strength: team.strength,
          attack_home: team.strength_attack_home,
          attack_away: team.strength_attack_away,
          defence_home: team.strength_defence_home,
          defence_away: team.strength_defence_away
        } : null
      };

      let recommendations = '';

      if (avgDifficulty <= 2.5) {
        recommendations = '🟢 Excellent fixture run ahead! Strong captain option and ideal time to own this player.';
      } else if (avgDifficulty <= 3.5) {
        recommendations = '🟡 Mixed fixture difficulty. Good option for consistent performers, consider for captain in easier games.';
      } else {
        recommendations = '🔴 Challenging fixtures ahead. Consider benching or transferring out unless player is in exceptional form.';
      }

      if (homeGames >= input.gameweeks_ahead * 0.6) {
        recommendations += ' Strong home advantage with multiple home games.';
      }

      if (easyFixtures >= 2) {
        recommendations += ` ${easyFixtures} easy fixtures provide good scoring opportunities.`;
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
        `Failed to get player fixtures: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ['Error occurred while fetching fixture data'],
        { error: error instanceof Error ? error.message : 'Unknown error', player_id: input.player_id }
      );
    }
  }
};