import { useCallback, useEffect, useState } from 'react';
import { pickTrailerKey, TMDBService } from '@/src/services/TMDBService';
import { CinemetaService } from '@/src/services/CinemetaService';
import {
  isMovie,
  type CastMember,
  type CrewMember,
  type Episode,
  type MediaItem,
  type MovieDetails,
  type Season,
  type TVShowDetails,
  type VideoResult,
} from '@/src/types';

interface DetailState {
  loading: boolean;
  error: string | null;
  details: MovieDetails | TVShowDetails | null;
  trailerKey: string | null;
  videos: VideoResult[];
  similar: MediaItem[];
  seasons: Season[];
  cast: CastMember[];
  crew: CrewMember[];
  certification: string | null;
  logoPath: string | null;
}

export const useDetailData = (item: MediaItem) => {
  const movie = isMovie(item);
  const [state, setState] = useState<DetailState>({
    loading: true,
    error: null,
    details: null,
    trailerKey: null,
    videos: [],
    similar: [],
    seasons: [],
    cast: [],
    crew: [],
    certification: null,
    logoPath: null,
  });

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const cm = await CinemetaService.meta(movie ? 'movie' : 'series', item.id);
        if (cm) {
          const shared = { ...item, overview: cm.description ?? item.overview, poster_path: cm.poster ?? item.poster_path, backdrop_path: cm.background ?? item.backdrop_path };
          const seasonNums = [...new Set((cm.videos ?? []).map(v => v.season).filter((n): n is number => typeof n === 'number' && n > 0))].sort((a,b) => a-b);
          const seasons = seasonNums.map(n => ({ id:n, season_number:n, name:'Season '+n, episode_count:(cm.videos ?? []).filter(v=>v.season===n).length, poster_path:cm.poster ?? null }));
          if (!cancelled) setState({loading:false,error:null,details:movie ? shared as MovieDetails : {...shared, seasons, number_of_seasons:seasons.length} as TVShowDetails,trailerKey:null,videos:[],similar:[],seasons:movie ? [] : seasons,cast:[],crew:[],certification:null,logoPath:null});
          return;
        }
        if (movie) {
          const [details, videos, similar, credits, certification, images] =
            await Promise.all([
              TMDBService.getMovieDetails(item.id),
              TMDBService.getMovieVideos(item.id),
              TMDBService.getSimilarMovies(item.id),
              TMDBService.getMovieCredits(item.id),
              TMDBService.getCertification(item.id, 'movie'),
              TMDBService.getMovieImages(item.id),
            ]);
          if (cancelled) return;
          setState({
            loading: false,
            error: null,
            details,
            trailerKey: pickTrailerKey(videos),
            videos: videos.results ?? [],
            similar: similar.results.map((m) => ({
              ...m,
              media_type: 'movie',
            })),
            seasons: [],
            cast: credits.cast ?? [],
            crew: credits.crew ?? [],
            certification,
            logoPath: TMDBService.pickLogoPath(images.logos),
          });
        } else {
          const [details, videos, similar, credits, certification, images] =
            await Promise.all([
              TMDBService.getTVShowDetails(item.id),
              TMDBService.getTVShowVideos(item.id),
              TMDBService.getSimilarTVShows(item.id),
              TMDBService.getTVShowCredits(item.id),
              TMDBService.getCertification(item.id, 'tv'),
              TMDBService.getTVImages(item.id),
            ]);
          if (cancelled) return;
          const seasons = (details.seasons ?? []).filter(
            (s) => s.season_number > 0,
          );
          setState({
            loading: false,
            error: null,
            details,
            trailerKey: pickTrailerKey(videos),
            videos: videos.results ?? [],
            similar: similar.results.map((t) => ({ ...t, media_type: 'tv' })),
            seasons,
            cast: credits.cast ?? [],
            crew: credits.crew ?? [],
            certification,
            logoPath: TMDBService.pickLogoPath(images.logos),
          });
        }
      } catch (err) {
        if (!cancelled)
          setState((s) => ({
            ...s,
            loading: false,
            error: err instanceof Error ? err.message : 'Failed to load.',
          }));
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [item.id, movie]);

  return state;
};

/** Loads episodes for a given TV season on demand. */
export const useSeasonEpisodes = (tvId: number, seasonNumber: number | null) => {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (seasonNumber == null) return;
    setLoading(true);
    try {
      const cm = await CinemetaService.meta('series', tvId);
      if (cm) {
        setEpisodes((cm.videos ?? []).filter(v=>v.season===seasonNumber).map(v=>({id:Number(v.episode)||0,episode_number:Number(v.episode)||0,season_number:seasonNumber,name:v.title ?? 'Episode '+v.episode,overview:'',still_path:null,air_date:v.released?.slice(0,10)})));
      } else {
        const data = await TMDBService.getSeasonDetails(tvId, seasonNumber);
        setEpisodes(data.episodes ?? []);
      }
    } catch {
      setEpisodes([]);
    } finally {
      setLoading(false);
    }
  }, [tvId, seasonNumber]);

  useEffect(() => {
    load();
  }, [load]);

  return { episodes, loading };
};
