import { z } from 'zod';
import { TeamFixturesInputSchema, type TeamFixturesInput } from '../types/fpl.js';
import { FPLApiService } from '../services/fpl-api.js';
import { FPLAnalysisService } from '../services/analysis.js';
import { createMCPResponse, getDifficultyLabel } from '../utils/helpers.js';
import { TOOL_NAMES } from '../utils/constants.js';

export const teamFixturesTool = {
  name: TOOL_NAMES.ANALYZE_TEAM_FIXTURES,
  description: "Analyze team fixture difficulty, home/away balance, and rotation potential",
  inputSchema: TeamFixturesInputSchema,

  async handler(input: TeamFixturesInput) {
    try {
      const fplApi = new FPLApiService();
      const bootstrapData = await fplApi.getBootstrapData();
      const analysisService = new FPLAnalysisService(bootstrapData);

      let targetTeam;
      let fixturesAnalysis;

      if (input.team_id) {
        targetTeam = bootstrapData.teams.find(t => t.id === input.team_id);
        if (!targetTeam) {
          throw new Error(`Team with ID ${input.team_id} not found`);
        }
        fixturesAnalysis = analysisService.analyzeTeamFixtures(input.team_id, input.gameweeks_ahead);
      } else {
        // Analyze all teams and find best/worst fixture runs
        const allTeamAnalyses = bootstrapData.teams.slice(0, 5).map(team => ({
          team,
          analysis: analysisService.analyzeTeamFixtures(team.id, input.gameweeks_ahead)
        }));

        // Sort by difficulty (easiest first)
        allTeamAnalyses.sort((a, b) =>
          a.analysis.difficulty_analysis.average_difficulty - b.analysis.difficulty_analysis.average_difficulty
        );

        const summary = `Fixture analysis for ${input.gameweeks_ahead} gameweeks: Best run ${allTeamAnalyses[0].team.short_name} (${allTeamAnalyses[0].analysis.difficulty_analysis.average_difficulty.toFixed(1)}), Worst ${allTeamAnalyses[allTeamAnalyses.length - 1].team.short_name} (${allTeamAnalyses[allTeamAnalyses.length - 1].analysis.difficulty_analysis.average_difficulty.toFixed(1)})`;

        const insights = [
          `Teams analyzed: ${allTeamAnalyses.length}`,
          `Gameweeks ahead: ${input.gameweeks_ahead}`,
          `Best fixture run: ${allTeamAnalyses[0].team.name} (${allTeamAnalyses[0].analysis.difficulty_analysis.average_difficulty.toFixed(1)} avg)`,
          `Worst fixture run: ${allTeamAnalyses[allTeamAnalyses.length - 1].team.name} (${allTeamAnalyses[allTeamAnalyses.length - 1].analysis.difficulty_analysis.average_difficulty.toFixed(1)} avg)`,
          `Difficulty range: ${allTeamAnalyses[0].analysis.difficulty_analysis.average_difficulty.toFixed(1)} - ${allTeamAnalyses[allTeamAnalyses.length - 1].analysis.difficulty_analysis.average_difficulty.toFixed(1)}`
        ];

        const metrics = {
          analysis_period: `${input.gameweeks_ahead} gameweeks`,
          teams_analyzed: allTeamAnalyses.length,
          team_rankings: allTeamAnalyses.map((teamAnalysis, index) => ({
            rank: index + 1,
            team_id: teamAnalysis.team.id,
            team_name: teamAnalysis.team.name,
            short_name: teamAnalysis.team.short_name,
            average_difficulty: teamAnalysis.analysis.difficulty_analysis.average_difficulty,
            difficulty_rating: getDifficultyLabel(Math.round(teamAnalysis.analysis.difficulty_analysis.average_difficulty)),
            home_games: teamAnalysis.analysis.difficulty_analysis.home_games,
            away_games: teamAnalysis.analysis.difficulty_analysis.away_games,
            team_strength: teamAnalysis.team.strength
          })),
          best_fixtures: allTeamAnalyses.slice(0, 3).map(t => ({
            team: t.team.short_name,
            difficulty: t.analysis.difficulty_analysis.average_difficulty
          })),
          worst_fixtures: allTeamAnalyses.slice(-3).map(t => ({
            team: t.team.short_name,
            difficulty: t.analysis.difficulty_analysis.average_difficulty
          }))
        };

        const bestTeams = allTeamAnalyses.slice(0, 3).map(t => t.team.short_name).join(', ');
        const worstTeams = allTeamAnalyses.slice(-3).map(t => t.team.short_name).join(', ');

        const recommendations = `🟢 Target players from: ${bestTeams} (easiest fixtures). 🔴 Avoid or bench players from: ${worstTeams} (toughest fixtures). Consider double/triple ups from teams with excellent fixture runs.`;

        return createMCPResponse(
          true,
          summary,
          insights,
          metrics,
          recommendations
        );
      }

      // Single team analysis
      const summary = `${targetTeam.name}: ${input.gameweeks_ahead} fixtures, avg difficulty ${fixturesAnalysis.difficulty_analysis.average_difficulty.toFixed(1)} (${getDifficultyLabel(Math.round(fixturesAnalysis.difficulty_analysis.average_difficulty))})`;

      const insights = [
        `Team: ${targetTeam.name}`,
        `Fixtures analyzed: ${input.gameweeks_ahead}`,
        `Average difficulty: ${fixturesAnalysis.difficulty_analysis.average_difficulty.toFixed(1)} (${getDifficultyLabel(Math.round(fixturesAnalysis.difficulty_analysis.average_difficulty))})`,
        `Home games: ${fixturesAnalysis.difficulty_analysis.home_games}`,
        `Away games: ${fixturesAnalysis.difficulty_analysis.away_games}`,
        `Team strength: ${targetTeam.strength}/5`
      ];

      const metrics = {
        team_info: {
          id: targetTeam.id,
          name: targetTeam.name,
          short_name: targetTeam.short_name,
          strength: targetTeam.strength,
          attack_strength: {
            home: targetTeam.strength_attack_home,
            away: targetTeam.strength_attack_away
          },
          defence_strength: {
            home: targetTeam.strength_defence_home,
            away: targetTeam.strength_defence_away
          }
        },
        fixtures_analysis: {
          gameweeks_analyzed: input.gameweeks_ahead,
          average_difficulty: fixturesAnalysis.difficulty_analysis.average_difficulty,
          difficulty_rating: fixturesAnalysis.difficulty_analysis.difficulty_rating,
          home_games: fixturesAnalysis.difficulty_analysis.home_games,
          away_games: fixturesAnalysis.difficulty_analysis.away_games,
          home_advantage: fixturesAnalysis.difficulty_analysis.home_games >= fixturesAnalysis.difficulty_analysis.away_games
        },
        upcoming_fixtures: fixturesAnalysis.upcoming_fixtures
      };

      let recommendations = '';
      const avgDiff = fixturesAnalysis.difficulty_analysis.average_difficulty;

      if (avgDiff <= 2.5) {
        recommendations = `🟢 Excellent fixture run! Strong target for multiple players, captaincy options, and potential triple-up consideration.`;
      } else if (avgDiff <= 3.5) {
        recommendations = `🟡 Moderate fixtures. Good for consistent performers, selective captaincy in easier games.`;
      } else {
        recommendations = `🔴 Tough fixture period. Consider avoiding new signings, bench key players in hardest games.`;
      }

      if (fixturesAnalysis.difficulty_analysis.home_games > fixturesAnalysis.difficulty_analysis.away_games) {
        recommendations += ` Home advantage with ${fixturesAnalysis.difficulty_analysis.home_games} home games.`;
      }

      // Add team strength context
      if (targetTeam.strength >= 4) {
        recommendations += ` Strong team (${targetTeam.strength}/5) can handle tough fixtures better.`;
      } else if (targetTeam.strength <= 2) {
        recommendations += ` Weaker team (${targetTeam.strength}/5) may struggle in difficult fixtures.`;
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
        `Failed to analyze team fixtures: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ['Error occurred while analyzing fixture data'],
        { error: error instanceof Error ? error.message : 'Unknown error', team_id: input.team_id }
      );
    }
  }
};