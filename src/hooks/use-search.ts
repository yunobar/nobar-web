import { useQuery } from "@tanstack/react-query";
import { searchTitles } from "@/lib/mock-api";
import { queryKeys } from "@/lib/query-keys";

export function useSearchTitles(query: string) {
  return useQuery({
    queryKey: queryKeys.search(query),
    queryFn: () => searchTitles(query),
    enabled: query.trim().length > 0,
    placeholderData: (prev) => prev,
  });
}
