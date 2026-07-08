import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addWatchlistItem, getWatchlist, removeWatchlistItem, updateWatchlistItem } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { Priority } from "@/types/domain";

export function useWatchlist() {
  return useQuery({ queryKey: queryKeys.watchlist, queryFn: getWatchlist });
}

function useInvalidateWatchlistDependents() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.watchlist });
    queryClient.invalidateQueries({ queryKey: queryKeys.groups });
    queryClient.invalidateQueries({ queryKey: ["merged"] });
  };
}

export function useAddWatchlistItem() {
  const invalidate = useInvalidateWatchlistDependents();
  return useMutation({
    mutationFn: (params: { contentId: string; priority: Priority; notes: string }) =>
      addWatchlistItem(params),
    onSuccess: invalidate,
  });
}

export function useRemoveWatchlistItem() {
  const invalidate = useInvalidateWatchlistDependents();
  return useMutation({
    mutationFn: (contentId: string) => removeWatchlistItem(contentId),
    onSuccess: invalidate,
  });
}

export function useUpdateWatchlistItem() {
  const invalidate = useInvalidateWatchlistDependents();
  return useMutation({
    mutationFn: (params: { contentId: string; priority?: Priority; notes?: string }) =>
      updateWatchlistItem(params.contentId, { priority: params.priority, notes: params.notes }),
    onSuccess: invalidate,
  });
}
