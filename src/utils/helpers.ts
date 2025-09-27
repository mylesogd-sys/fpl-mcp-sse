import { MCPToolResponse, Element, Team, Event } from '../types/fpl.js';
import { POSITIONS, DIFFICULTY_LABELS, FORM_THRESHOLDS } from './constants.js';

// Create standardized MCP response
export function createMCPResponse(
  success: boolean,
  summary: string,
  insights: string[],
  metrics: Record<string, any>,
  recommendations?: string,
  gameweek?: number
): MCPToolResponse {
  return {
    success,
    data: {
      summary,
      insights,
      metrics,
      recommendations
    },
    metadata: {
      gameweek: gameweek || getCurrentGameweek(),
      timestamp: new Date().toISOString(),
      data_freshness: getDataFreshness()
    }
  };
}

// Get current gameweek (mock implementation)
export function getCurrentGameweek(): number {
  // This would be determined from bootstrap data in real implementation
  return 1;
}

// Get data freshness indicator
export function getDataFreshness(): string {
  const now = new Date();
  const minutes = now.getMinutes();

  if (minutes < 15) return 'Very Fresh (0-15 min)';
  if (minutes < 30) return 'Fresh (15-30 min)';
  if (minutes < 60) return 'Moderately Fresh (30-60 min)';
  return 'Stale (60+ min)';
}

// Format player name
export function formatPlayerName(element: Element): string {
  return `${element.first_name} ${element.second_name}`;
}

// Get position name
export function getPositionName(positionId: number): string {
  return POSITIONS[positionId as keyof typeof POSITIONS]?.name || 'Unknown';
}

// Get position short name
export function getPositionShort(positionId: number): string {
  return POSITIONS[positionId as keyof typeof POSITIONS]?.short || '?';
}

// Format price
export function formatPrice(price: number): string {
  return `£${(price / 10).toFixed(1)}m`;
}

// Get difficulty label
export function getDifficultyLabel(difficulty: number): string {
  return DIFFICULTY_LABELS[difficulty as keyof typeof DIFFICULTY_LABELS] || 'Unknown';
}

// Calculate form rating
export function getFormRating(form: string | number): string {
  const formValue = typeof form === 'string' ? parseFloat(form) : form;

  if (formValue >= FORM_THRESHOLDS.EXCELLENT) return 'Excellent';
  if (formValue >= FORM_THRESHOLDS.GOOD) return 'Good';
  if (formValue >= FORM_THRESHOLDS.AVERAGE) return 'Average';
  if (formValue >= FORM_THRESHOLDS.POOR) return 'Poor';
  return 'Very Poor';
}

// Calculate value rating
export function calculateValueRating(element: Element): string {
  const ppg = parseFloat(element.points_per_game);
  const price = element.now_cost / 10;
  const valueScore = ppg / price;

  if (valueScore > 0.8) return 'Excellent Value';
  if (valueScore > 0.6) return 'Good Value';
  if (valueScore > 0.4) return 'Fair Value';
  if (valueScore > 0.2) return 'Poor Value';
  return 'Overpriced';
}

// Find team by ID
export function findTeamById(teams: Team[], teamId: number): Team | undefined {
  return teams.find(team => team.id === teamId);
}

// Find current event
export function findCurrentEvent(events: Event[]): Event | undefined {
  return events.find(event => event.is_current);
}

// Find next event
export function findNextEvent(events: Event[]): Event | undefined {
  return events.find(event => event.is_next);
}

// Calculate ownership category
export function getOwnershipCategory(ownership: string): string {
  const ownershipPercent = parseFloat(ownership);

  if (ownershipPercent > 50) return 'Highly Owned (50%+)';
  if (ownershipPercent > 20) return 'Popular (20-50%)';
  if (ownershipPercent > 5) return 'Moderately Owned (5-20%)';
  if (ownershipPercent > 1) return 'Low Owned (1-5%)';
  return 'Rarely Owned (<1%)';
}

// Truncate text with ellipsis
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

// Parse numeric string safely
export function parseNumericString(value: string, defaultValue: number = 0): number {
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

// Format percentage
export function formatPercentage(value: string | number): string {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  return `${numValue.toFixed(1)}%`;
}

// Sort players by criteria
export function sortPlayersByCriteria(
  players: Element[],
  criteria: 'form' | 'points' | 'price' | 'ownership',
  ascending: boolean = false
): Element[] {
  return [...players].sort((a, b) => {
    let aValue: number, bValue: number;

    switch (criteria) {
      case 'form':
        aValue = parseFloat(a.form);
        bValue = parseFloat(b.form);
        break;
      case 'points':
        aValue = a.total_points;
        bValue = b.total_points;
        break;
      case 'price':
        aValue = a.now_cost;
        bValue = b.now_cost;
        break;
      case 'ownership':
        aValue = parseFloat(a.selected_by_percent);
        bValue = parseFloat(b.selected_by_percent);
        break;
      default:
        return 0;
    }

    return ascending ? aValue - bValue : bValue - aValue;
  });
}