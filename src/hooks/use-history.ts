import { useQuery } from "@tanstack/react-query";
import { ME_ID, getHistory, getTitle } from "@/lib/mock-api";
import { queryKeys } from "@/lib/query-keys";

export function useHistory(userId: string = ME_ID) {
  return useQuery({ queryKey: queryKeys.history(userId), queryFn: () => getHistory(userId) });
}

export function useTitle(tid: string | undefined) {
  return useQuery({
    queryKey: queryKeys.title(tid ?? ""),
    queryFn: () => getTitle(tid!),
    enabled: !!tid,
  });
}
