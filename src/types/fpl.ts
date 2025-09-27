import { z } from 'zod';

// MCP Tool Response Schema for n8n AI Agent
export const MCPToolResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    summary: z.string(),
    insights: z.array(z.string()),
    metrics: z.record(z.any()),
    recommendations: z.string().optional()
  }),
  metadata: z.object({
    gameweek: z.number(),
    timestamp: z.string(),
    data_freshness: z.string()
  })
});

export type MCPToolResponse = z.infer<typeof MCPToolResponseSchema>;

// Tool Input Schemas
export const GameweekContextInputSchema = z.object({});

export const BootstrapDataInputSchema = z.object({
  include_player_stats: z.boolean().optional().default(false)
});

export const PlayerFormInputSchema = z.object({
  player_id: z.number(),
  gameweeks: z.number().optional().default(5)
});

export const ComparePlayersInputSchema = z.object({
  player_ids: z.array(z.number()).min(2).max(4),
  metrics: z.array(z.enum(['form', 'price', 'ownership', 'fixtures'])).optional()
});

export const PlayerFixturesInputSchema = z.object({
  player_id: z.number(),
  gameweeks_ahead: z.number().optional().default(5)
});

export const TransferTrendsInputSchema = z.object({
  time_period: z.enum(['24h', '7d', '30d']).optional().default('7d'),
  min_transfers: z.number().optional().default(10000)
});

export const CaptainPicksInputSchema = z.object({
  gameweek: z.number().optional(),
  position_filter: z.enum(['GK', 'DEF', 'MID', 'FWD']).optional(),
  max_price: z.number().optional()
});

export const TeamFixturesInputSchema = z.object({
  team_id: z.number().optional(),
  gameweeks_ahead: z.number().optional().default(5)
});

export const DreamTeamInputSchema = z.object({
  gameweek: z.number().optional(),
  formation: z.enum(['3-4-3', '3-5-2', '4-3-3', '4-4-2', '4-5-1', '5-3-2', '5-4-1']).optional()
});

export const SetPieceTakersInputSchema = z.object({
  team_id: z.number().optional(),
  piece_type: z.enum(['penalties', 'free_kicks', 'corners']).optional()
});

// FPL API Response Schemas
export const EventSchema = z.object({
  id: z.number(),
  name: z.string(),
  deadline_time: z.string(),
  average_entry_score: z.number().nullable(),
  highest_score: z.number().nullable(),
  finished: z.boolean(),
  is_current: z.boolean(),
  is_next: z.boolean()
});

export const TeamSchema = z.object({
  id: z.number(),
  name: z.string(),
  short_name: z.string(),
  strength: z.number(),
  strength_overall_home: z.number(),
  strength_overall_away: z.number(),
  strength_attack_home: z.number(),
  strength_attack_away: z.number(),
  strength_defence_home: z.number(),
  strength_defence_away: z.number()
});

export const ElementSchema = z.object({
  id: z.number(),
  web_name: z.string(),
  first_name: z.string(),
  second_name: z.string(),
  team: z.number(),
  element_type: z.number(),
  now_cost: z.number(),
  total_points: z.number(),
  points_per_game: z.string(),
  selected_by_percent: z.string(),
  transfers_in_event: z.number(),
  transfers_out_event: z.number(),
  form: z.string(),
  minutes: z.number(),
  goals_scored: z.number(),
  assists: z.number(),
  clean_sheets: z.number(),
  saves: z.number(),
  bonus: z.number(),
  influence: z.string(),
  creativity: z.string(),
  threat: z.string(),
  ict_index: z.string(),
  status: z.string(),
  chance_of_playing_this_round: z.number().nullable(),
  chance_of_playing_next_round: z.number().nullable()
});

export const ElementTypeSchema = z.object({
  id: z.number(),
  plural_name: z.string(),
  singular_name: z.string(),
  squad_select: z.number(),
  squad_min_play: z.number(),
  squad_max_play: z.number()
});

export const BootstrapDataSchema = z.object({
  events: z.array(EventSchema),
  teams: z.array(TeamSchema),
  elements: z.array(ElementSchema),
  element_types: z.array(ElementTypeSchema),
  total_players: z.number()
});

export const FixtureSchema = z.object({
  id: z.number(),
  event: z.number().nullable(),
  team_h: z.number(),
  team_a: z.number(),
  team_h_difficulty: z.number(),
  team_a_difficulty: z.number(),
  kickoff_time: z.string(),
  finished: z.boolean(),
  started: z.boolean()
});

// Export types
export type Event = z.infer<typeof EventSchema>;
export type Team = z.infer<typeof TeamSchema>;
export type Element = z.infer<typeof ElementSchema>;
export type ElementType = z.infer<typeof ElementTypeSchema>;
export type BootstrapData = z.infer<typeof BootstrapDataSchema>;
export type Fixture = z.infer<typeof FixtureSchema>;

// Tool input types
export type GameweekContextInput = z.infer<typeof GameweekContextInputSchema>;
export type BootstrapDataInput = z.infer<typeof BootstrapDataInputSchema>;
export type PlayerFormInput = z.infer<typeof PlayerFormInputSchema>;
export type ComparePlayersInput = z.infer<typeof ComparePlayersInputSchema>;
export type PlayerFixturesInput = z.infer<typeof PlayerFixturesInputSchema>;
export type TransferTrendsInput = z.infer<typeof TransferTrendsInputSchema>;
export type CaptainPicksInput = z.infer<typeof CaptainPicksInputSchema>;
export type TeamFixturesInput = z.infer<typeof TeamFixturesInputSchema>;
export type DreamTeamInput = z.infer<typeof DreamTeamInputSchema>;
export type SetPieceTakersInput = z.infer<typeof SetPieceTakersInputSchema>;