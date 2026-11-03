import type { MediaItem, Movie, TVShow, TMDBResponse } from '@/src/types';

/**
 * Key-free catalog adapter for Stremio's public Cinemeta addon.
 * IMDb and TMDB identifiers are kept distinct. Entries without a verified
 * TMDB mapping are excluded from TMDB-only playback paths.
 */
const BASE = 'https://v3-cinemeta.strem.io';
const TIMEOUT = 12000;
type Kind = 'movie' | 'series';
interface CinemetaVideo { id?: string; title?: string; season?: number; episode?: number; released?: string; }
interface CinemetaMeta {
  id: string;
  name: string;
  description?: string;
  poster?: string;
  background?: string;
  releaseInfo?: string;
  released?: string;
  imdbRating?: string;
  moviedb_id?: number | string;
  genres?: string[];
  videos?: CinemetaVideo[];
}
const mapped = new Map<string, CinemetaMeta>();
const numericTmdb = (meta: CinemetaMeta): number | null => {
  const n = Number(meta.moviedb_id);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
};
const key = (kind: Kind, id: string) => kind + ':' + id;
const fetchJson = async <T>(path: string): Promise<T> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);
  try {
    const response = await fetch(BASE + path, { signal: controller.signal });
    if (!response.ok) throw new Error('Cinemeta request failed (' + response.status + ')');
    return await response.json() as T;
  } finally { clearTimeout(timer); }
};
const convert = (kind: Kind, meta: CinemetaMeta): MediaItem | null => {
  const id = numericTmdb(meta);
  if (!id || !/^tt\d+$/.test(meta.id)) return null;
  mapped.set(key(kind, String(id)), meta);
  const shared = {
    id,
    overview: meta.description ?? '',
    poster_path: meta.poster ?? null,
    backdrop_path: meta.background ?? null,
    vote_average: Number(meta.imdbRating) || 0,
    imdb_id: meta.id,
  };
  return kind === 'movie'
    ? { ...shared, title: meta.name, release_date: meta.released ?? '', media_type: 'movie' } as Movie
    : { ...shared, name: meta.name, first_air_date: meta.released ?? '', media_type: 'tv' } as TVShow;
};
const response = (results: MediaItem[], page: number): TMDBResponse<MediaItem> => ({
  page, results, total_pages: results.length ? page + 1 : page, total_results: results.length,
});
export const CinemetaService = {
  async catalog(kind: Kind, page = 1, search?: string): Promise<TMDBResponse<MediaItem>> {
    const extra = search
      ? '/search=' + encodeURIComponent(search) + '.json'
      : page > 1 ? '/skip=' + ((page - 1) * 100) + '.json' : '.json';
    const path = '/catalog/' + kind + '/top' + extra;
    const data = await fetchJson<{ metas?: CinemetaMeta[] }>(path);
    return response((data.metas ?? []).map(m => convert(kind, m)).filter((m): m is MediaItem => !!m), page);
  },
  async search(query: string): Promise<TMDBResponse<MediaItem>> {
    const [movies, shows] = await Promise.all([
      this.catalog('movie', 1, query), this.catalog('series', 1, query),
    ]);
    return response([...movies.results, ...shows.results], 1);
  },
  async meta(kind: Kind, tmdbId: number): Promise<CinemetaMeta | null> {
    const cached = mapped.get(key(kind, String(tmdbId)));
    if (!cached) return null;
    const data = await fetchJson<{ meta?: CinemetaMeta }>('/meta/' + kind + '/' + cached.id + '.json');
    if (data.meta) mapped.set(key(kind, String(tmdbId)), data.meta);
    return data.meta ?? null;
  },
  imdbId(kind: Kind, tmdbId: number): string | null {
    return mapped.get(key(kind, String(tmdbId)))?.id ?? null;
  },
};
