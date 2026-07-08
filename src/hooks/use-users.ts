import { useQuery } from "@tanstack/react-query";
import { getUsers } from "@/lib/mock-api";
import { getProfile } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

export function useCurrentUser() {
  return useQuery({ queryKey: queryKeys.me, queryFn: getProfile });
}

export function useUsers() {
  return useQuery({ queryKey: queryKeys.users, queryFn: getUsers });
}
