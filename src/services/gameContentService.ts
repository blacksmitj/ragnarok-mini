import { api } from '../lib/api'

export interface GameContentConfig {
  characters: any[]
  items: any[]
  monsters: any[]
  publishedMap: any | null
}

class GameContentService {
  private cachedConfig: GameContentConfig | null = null

  /**
   * Mengambil semua aset & metadata yang telah dipublikasikan dari Admin API
   */
  async loadPublishedContent(): Promise<GameContentConfig> {
    try {
      const [charRes, itemRes, mobRes, mapRes] = await Promise.all([
        api.get<any[]>('/api/admin/characters').catch(() => ({ data: [] })),
        api.get<any[]>('/api/admin/items').catch(() => ({ data: [] })),
        api.get<any[]>('/api/admin/monsters').catch(() => ({ data: [] })),
        api.get<any[]>('/api/admin/maps').catch(() => ({ data: [] })),
      ])

      const publishedMaps = (mapRes.data || []).filter((m: any) => m.status === 'published')
      const activeMap = publishedMaps.length > 0 ? publishedMaps[publishedMaps.length - 1] : null

      this.cachedConfig = {
        characters: charRes.data || [],
        items: itemRes.data || [],
        monsters: mobRes.data || [],
        publishedMap: activeMap,
      }

      console.log('🎮 [GameContentService] Content loaded from Admin CMS:', {
        characters: this.cachedConfig.characters.length,
        items: this.cachedConfig.items.length,
        monsters: this.cachedConfig.monsters.length,
        publishedMap: activeMap?.name || 'Default Static Arena',
      })

      return this.cachedConfig
    } catch (err) {
      console.warn('⚠️ [GameContentService] Gagal memuat content dari CMS backend, menggunakan aset default:', err)
      return {
        characters: [],
        items: [],
        monsters: [],
        publishedMap: null,
      }
    }
  }

  getContent(): GameContentConfig | null {
    return this.cachedConfig
  }
}

export const gameContentService = new GameContentService()

