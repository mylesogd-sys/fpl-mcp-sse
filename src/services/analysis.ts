import { Element, Team, Event, Fixture, BootstrapData } from '../types/fpl.js';
import {
  formatPlayerName,
  getPositionName,
  formatPrice,
  getFormRating,
  calculateValueRating,
  getDifficultyLabel,
  getOwnershipCategory,
  parseNumericString,
  findTeamById,
  findCurrentEvent,
  findNextEvent,
  sortPlayersByCriteria
} from '../utils/helpers.js';

export class FPLAnalysisService {
  constructor(private bootstrapData: BootstrapData) {}

  // Analyze player form and performance
  analyzePlayerForm(playerId: number, gameweeks: number = 5): {
    player: Element;
    analysis: {
      form_rating: string;
      value_rating: string;
      ownership_category: string;
      injury_status: string;
      key_stats: Record<string, any>;
      performance_trend: string;
    };
  } {
    const player = this.bootstrapData.elements.find(p => p.id === playerId);
    if (!player) {
      throw new Error(`Player with ID ${playerId} not found`);
    }

    const team = findTeamById(this.bootstrapData.teams, player.team);
    const position = this.bootstrapData.element_types.find(t => t.id === player.element_type);

    const formRating = getFormRating(player.form);
    const valueRating = calculateValueRating(player);
    const ownershipCategory = getOwnershipCategory(player.selected_by_percent);

    let injuryStatus = 'Available';
    if (player.status === 'i') injuryStatus = 'Injured';
    else if (player.status === 'd') injuryStatus = 'Doubtful';
    else if (player.status === 's') injuryStatus = 'Suspended';
    else if (player.status === 'u') injuryStatus = 'Unavailable';

    const keyStats = {
      total_points: player.total_points,
      points_per_game: parseNumericString(player.points_per_game),
      goals_scored: player.goals_scored,
      assists: player.assists,
      clean_sheets: player.clean_sheets,
      saves: player.saves,
      bonus_points: player.bonus,
      minutes_played: player.minutes,
      price: formatPrice(player.now_cost),
      ownership: `${player.selected_by_percent}%`
    };

    let performanceTrend = 'Stable';
    const form = parseNumericString(player.form);
    const ppg = parseNumericString(player.points_per_game);

    if (form > ppg + 1) performanceTrend = 'Improving';
    else if (form < ppg - 1) performanceTrend = 'Declining';

    return {
      player,
      analysis: {
        form_rating: formRating,
        value_rating: valueRating,
        ownership_category: ownershipCategory,
        injury_status: injuryStatus,
        key_stats: keyStats,
        performance_trend: performanceTrend
      }
    };
  }

  // Compare multiple players
  comparePlayers(playerIds: number[], metrics: string[] = ['form', 'price', 'ownership']): {
    players: Element[];
    comparison_matrix: Record<string, Record<string, any>>;
    recommendations: string[];
  } {
    const players = playerIds.map(id => {
      const player = this.bootstrapData.elements.find(p => p.id === id);
      if (!player) throw new Error(`Player with ID ${id} not found`);
      return player;
    });

    const comparisonMatrix: Record<string, Record<string, any>> = {};

    players.forEach(player => {
      const playerName = formatPlayerName(player);
      comparisonMatrix[playerName] = {
        id: player.id,
        position: getPositionName(player.element_type),
        team: findTeamById(this.bootstrapData.teams, player.team)?.short_name || 'Unknown',
        price: formatPrice(player.now_cost),
        total_points: player.total_points,
        form: parseNumericString(player.form),
        points_per_game: parseNumericString(player.points_per_game),
        ownership: `${player.selected_by_percent}%`,
        minutes: player.minutes,
        goals_assists: player.goals_scored + player.assists,
        value_rating: calculateValueRating(player)
      };
    });

    // Generate recommendations
    const recommendations: string[] = [];

    // Best value
    const bestValue = players.reduce((best, current) => {
      const bestScore = parseNumericString(best.points_per_game) / (best.now_cost / 10);
      const currentScore = parseNumericString(current.points_per_game) / (current.now_cost / 10);
      return currentScore > bestScore ? current : best;
    });
    recommendations.push(`Best value: ${formatPlayerName(bestValue)} (${calculateValueRating(bestValue)})`);

    // Best form
    const bestForm = players.reduce((best, current) =>
      parseNumericString(current.form) > parseNumericString(best.form) ? current : best
    );
    recommendations.push(`Best form: ${formatPlayerName(bestForm)} (${getFormRating(bestForm.form)})`);

    // Highest scorer
    const topScorer = players.reduce((best, current) =>
      current.total_points > best.total_points ? current : best
    );
    recommendations.push(`Highest scorer: ${formatPlayerName(topScorer)} (${topScorer.total_points} pts)`);

    return {
      players,
      comparison_matrix: comparisonMatrix,
      recommendations
    };
  }

  // Analyze team fixtures difficulty
  analyzeTeamFixtures(teamId: number, gameweeksAhead: number = 5): {
    team: Team;
    upcoming_fixtures: any[];
    difficulty_analysis: {
      average_difficulty: number;
      home_games: number;
      away_games: number;
      difficulty_rating: string;
    };
  } {
    const team = findTeamById(this.bootstrapData.teams, teamId);
    if (!team) {
      throw new Error(`Team with ID ${teamId} not found`);
    }

    // This would require fixtures data - simplified for now
    const upcomingFixtures: any[] = []; // Would be populated with actual fixture data

    const difficultyAnalysis = {
      average_difficulty: 3.0, // Mock data
      home_games: 2,
      away_games: 3,
      difficulty_rating: 'Average'
    };

    return {
      team,
      upcoming_fixtures: upcomingFixtures,
      difficulty_analysis: difficultyAnalysis
    };
  }

  // Get captain recommendations
  getCaptainRecommendations(gameweek?: number, positionFilter?: string, maxPrice?: number): {
    recommendations: Array<{
      player: Element;
      expected_points: number;
      confidence: 'high' | 'medium' | 'low';
      reasoning: string;
    }>;
    top_pick: Element;
  } {
    let candidates = this.bootstrapData.elements.filter(player => {
      if (maxPrice && player.now_cost > maxPrice * 10) return false;
      if (positionFilter) {
        const position = this.bootstrapData.element_types.find(t => t.id === player.element_type);
        if (position?.plural_name.toUpperCase() !== positionFilter.toUpperCase()) return false;
      }
      return player.minutes > 300 && parseNumericString(player.form) > 3; // Basic filter
    });

    // Sort by form and points
    candidates = sortPlayersByCriteria(candidates, 'form');
    candidates = candidates.slice(0, 10); // Top 10 candidates

    const recommendations = candidates.slice(0, 5).map(player => {
      const form = parseNumericString(player.form);
      const ppg = parseNumericString(player.points_per_game);
      const expectedPoints = Math.round((form + ppg) / 2 * 1.2); // Simple calculation

      let confidence: 'high' | 'medium' | 'low' = 'medium';
      if (form > 7 && ppg > 6) confidence = 'high';
      else if (form < 4 || ppg < 3) confidence = 'low';

      const reasoning = `Strong form (${form.toFixed(1)}) and ${ppg.toFixed(1)} PPG average. ${getFormRating(form)} recent performance.`;

      return {
        player,
        expected_points: expectedPoints,
        confidence,
        reasoning
      };
    });

    return {
      recommendations,
      top_pick: recommendations[0]?.player || candidates[0]
    };
  }

  // Get transfer trends (simplified)
  getTransferTrends(timePeriod: '24h' | '7d' | '30d' = '7d', minTransfers: number = 10000): {
    most_transferred_in: Array<{
      player: Element;
      transfers_in: number;
      price_change: number;
      reasoning: string;
    }>;
    most_transferred_out: Array<{
      player: Element;
      transfers_out: number;
      price_change: number;
      reasoning: string;
    }>;
  } {
    // This would require transfer data from FPL API - using mock data
    const topTransfersIn = this.bootstrapData.elements
      .filter(p => p.transfers_in_event > minTransfers)
      .sort((a, b) => b.transfers_in_event - a.transfers_in_event)
      .slice(0, 5)
      .map(player => ({
        player,
        transfers_in: player.transfers_in_event,
        price_change: 0.1, // Mock price change
        reasoning: `High form (${player.form}) and strong recent performances attracting managers.`
      }));

    const topTransfersOut = this.bootstrapData.elements
      .filter(p => p.transfers_out_event > minTransfers)
      .sort((a, b) => b.transfers_out_event - a.transfers_out_event)
      .slice(0, 5)
      .map(player => ({
        player,
        transfers_out: player.transfers_out_event,
        price_change: -0.1, // Mock price change
        reasoning: `Poor form (${player.form}) or injury concerns causing managers to sell.`
      }));

    return {
      most_transferred_in: topTransfersIn,
      most_transferred_out: topTransfersOut
    };
  }

  // Get gameweek context
  getGameweekContext(): {
    current_gameweek: Event | null;
    next_gameweek: Event | null;
    deadline_info: string;
    phase: string;
  } {
    const currentGW = findCurrentEvent(this.bootstrapData.events);
    const nextGW = findNextEvent(this.bootstrapData.events);

    let deadlineInfo = 'No upcoming deadline';
    let phase = 'Unknown';

    if (nextGW) {
      const deadline = new Date(nextGW.deadline_time);
      const now = new Date();
      const hoursUntilDeadline = Math.max(0, (deadline.getTime() - now.getTime()) / (1000 * 60 * 60));

      if (hoursUntilDeadline < 1) {
        deadlineInfo = 'Deadline passed or imminent';
        phase = 'Gameweek Active';
      } else if (hoursUntilDeadline < 24) {
        deadlineInfo = `${Math.round(hoursUntilDeadline)} hours until deadline`;
        phase = 'Deadline Approaching';
      } else {
        deadlineInfo = `${Math.round(hoursUntilDeadline / 24)} days until deadline`;
        phase = 'Planning Phase';
      }
    }

    return {
      current_gameweek: currentGW || null,
      next_gameweek: nextGW || null,
      deadline_info: deadlineInfo,
      phase
    };
  }
}