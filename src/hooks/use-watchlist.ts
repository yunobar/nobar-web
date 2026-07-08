import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ME_ID,
  addWatchlistItem,
  getWatchlist,
  removeWatchlistItem,
  updateWatchlistItemPriority,
} from "@/lib/mock-api";
import { queryKeys } from "@/lib/query-keys";
import type { Priority } from "@/types/domain";

export function useWatchlist(userId: string = ME_ID) {
  return useQuery({ queryKey: queryKeys.watchlist(userId), queryFn: () => getWatchlist(userId) });
}

function useInvalidateWatchlistDependents() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.watchlist(ME_ID) });
    queryClient.invalidateQueries({ queryKey: queryKeys.groups });
    queryClient.invalidateQueries({ queryKey: ["merged"] });
  };
}

export function useAddWatchlistItem() {
  const invalidate = useInvalidateWatchlistDependents();
  return useMutation({
    mutationFn: (params: {
      entry: { title: string; type: "movie" | "series"; year: number };
      priority: Priority;
      notes: string;
    }) => addWatchlistItem(ME_ID, params.entry, params.priority, params.notes),
    onSuccess: invalidate,
  });
}

export function useRemoveWatchlistItem() {
  const invalidate = useInvalidateWatchlistDependents();
  return useMutation({
    mutationFn: (tid: string) => removeWatchlistItem(ME_ID, tid),
    onSuccess: invalidate,
  });
}

export function useUpdateWatchlistPriority() {
  const invalidate = useInvalidateWatchlistDependents();
  return useMutation({
    mutationFn: (params: { tid: string; priority: Priority }) =>
      updateWatchlistItemPriority(ME_ID, params.tid, params.priority),
    onSuccess: invalidate,
  });
}
