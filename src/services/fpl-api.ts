import fetch from 'node-fetch';
import { BootstrapData, BootstrapDataSchema, Fixture, FixtureSchema } from '../types/fpl.js';
import { FPL_API } from '../utils/constants.js';

export class FPLApiService {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

  private async fetchWithCache<T>(
    url: string,
    schema: any,
    ttl: number = FPL_API.CACHE_TTL.BOOTSTRAP
  ): Promise<T> {
    const cacheKey = url;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data as T;
    }

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`FPL API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const validated = schema.parse(data);

      this.cache.set(cacheKey, {
        data: validated,
        timestamp: Date.now(),
        ttl
      });

      return validated as T;
    } catch (error) {
      console.error(`Failed to fetch ${url}:`, error);
      throw new Error(`Failed to fetch FPL data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getBootstrapData(): Promise<BootstrapData> {
    const url = `${FPL_API.BASE_URL}${FPL_API.ENDPOINTS.BOOTSTRAP}`;
    return this.fetchWithCache<BootstrapData>(
      url,
      BootstrapDataSchema,
      FPL_API.CACHE_TTL.BOOTSTRAP
    );
  }

  async getFixtures(eventId?: number, future?: boolean): Promise<Fixture[]> {
    let url = `${FPL_API.BASE_URL}${FPL_API.ENDPOINTS.FIXTURES}`;
    const params = new URLSearchParams();

    if (eventId) params.append('event', eventId.toString());
    if (future !== undefined) params.append('future', future.toString());

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    return this.fetchWithCache<Fixture[]>(
      url,
      BootstrapDataSchema.shape.elements, // Using elements schema as placeholder
      FPL_API.CACHE_TTL.FIXTURES
    );
  }

  async getElementSummary(playerId: number): Promise<any> {
    const url = `${FPL_API.BASE_URL}${FPL_API.ENDPOINTS.ELEMENT_SUMMARY.replace('{id}', playerId.toString())}`;
    return this.fetchWithCache(
      url,
      BootstrapDataSchema.shape.elements.element(), // Schema for single element
      FPL_API.CACHE_TTL.PLAYER_DATA
    );
  }

  async getEventLive(eventId: number): Promise<any> {
    const url = `${FPL_API.BASE_URL}${FPL_API.ENDPOINTS.EVENT_LIVE.replace('{id}', eventId.toString())}`;
    return this.fetchWithCache(
      url,
      BootstrapDataSchema.shape.elements, // Using elements schema as placeholder
      FPL_API.CACHE_TTL.LIVE_DATA
    );
  }

  async getDreamTeam(eventId: number): Promise<any> {
    const url = `${FPL_API.BASE_URL}${FPL_API.ENDPOINTS.DREAM_TEAM.replace('{id}', eventId.toString())}`;
    return this.fetchWithCache(
      url,
      BootstrapDataSchema.shape.elements, // Using elements schema as placeholder
      FPL_API.CACHE_TTL.LIVE_DATA
    );
  }

  clearCache(): void {
    this.cache.clear();
  }

  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}