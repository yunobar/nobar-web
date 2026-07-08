import { useQuery } from "@tanstack/react-query";
import { searchContent } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

export function useSearchTitles(query: string) {
  return useQuery({
    queryKey: queryKeys.search(query),
    queryFn: () => searchContent(query),
    enabled: query.trim().length > 0,
    placeholderData: (prev) => prev,
  });
}
