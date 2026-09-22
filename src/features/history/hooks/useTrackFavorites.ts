import { useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addTrackFavorite,
  fetchTrackFavorites,
  removeTrackFavorite,
  type TrackFavorite,
} from "../api";
import type { TrackSummary } from "../types";
import { trackKey } from "./useTrackPlayback";

const FAVORITES_KEY = ["history-favorites"] as const;

function favoriteKey(f: { track_id: string; tipo_radar: string }): string {
  return `${(f.tipo_radar || "unknown").toLowerCase()}:${f.track_id.toUpperCase()}`;
}

export function useTrackFavorites() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: FAVORITES_KEY,
    queryFn: () => fetchTrackFavorites().then((res) => res.data ?? []),
    staleTime: 60_000,
    retry: false,
  });

  const favorites = useMemo(() => {
    const set = new Set<string>();
    for (const f of query.data ?? []) set.add(favoriteKey(f));
    return set;
  }, [query.data]);

  const mutation = useMutation({
    mutationFn: async ({
      track,
      add,
    }: {
      track: TrackSummary;
      add: boolean;
    }) => {
      if (add) {
        await addTrackFavorite(track.track_id, track.tipo_radar);
      } else {
        await removeTrackFavorite(track.track_id, track.tipo_radar);
      }
    },
    onMutate: async ({ track, add }) => {
      await queryClient.cancelQueries({ queryKey: FAVORITES_KEY });
      const prev = queryClient.getQueryData<TrackFavorite[]>(FAVORITES_KEY) ?? [];
      const key = trackKey(track);
      queryClient.setQueryData<TrackFavorite[]>(FAVORITES_KEY, (old = []) => {
        if (add) {
          if (old.some((f) => favoriteKey(f) === key)) return old;
          return [
            ...old,
            {
              track_id: track.track_id,
              tipo_radar: track.tipo_radar,
              created_at: new Date().toISOString(),
            },
          ];
        }
        return old.filter((f) => favoriteKey(f) !== key);
      });
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) {
        queryClient.setQueryData(FAVORITES_KEY, ctx.prev);
      }
      queryClient.invalidateQueries({ queryKey: FAVORITES_KEY });
    },
  });

  const hasFavorite = useCallback(
    (t: TrackSummary) => favorites.has(trackKey(t)),
    [favorites],
  );

  const toggle = useCallback(
    (t: TrackSummary) => {
      const isFav = favorites.has(trackKey(t));
      mutation.mutate({ track: t, add: !isFav });
    },
    [favorites, mutation],
  );

  const toggleAsync = useCallback(
    async (t: TrackSummary) => {
      const isFav = favorites.has(trackKey(t));
      return mutation.mutateAsync({ track: t, add: !isFav });
    },
    [favorites, mutation],
  );

  return {
    favorites,
    isLoading: query.isLoading,
    isError: query.isError,
    hasFavorite,
    toggle,
    toggleAsync,
  };
}