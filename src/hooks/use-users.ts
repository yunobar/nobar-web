import { useQuery } from "@tanstack/react-query";
import { getCurrentUser, getUsers } from "@/lib/mock-api";
import { queryKeys } from "@/lib/query-keys";

export function useCurrentUser() {
  return useQuery({ queryKey: queryKeys.me, queryFn: getCurrentUser });
}

export function useUsers() {
  return useQuery({ queryKey: queryKeys.users, queryFn: getUsers });
}
