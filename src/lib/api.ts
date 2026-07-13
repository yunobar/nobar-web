import { z } from "zod";
import { apiFetch, setCsrfToken } from "@/lib/api-client";
import type { Priority } from "@/types/domain";

// --- Request schemas (validated before hitting the network) --------------------

export const loginRequestSchema = z.object({
  email: z.email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});
export type LoginRequest = z.infer<typeof loginRequestSchema>;

export const registerRequestSchema = z
  .object({
    email: z.email("Enter a valid email"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    passwordConfirmation: z.string(),
  })
  .refine((d) => d.password === d.passwordConfirmation, {
    message: "Passwords do not match",
    path: ["passwordConfirmation"],
  });
export type RegisterRequest = z.infer<typeof registerRequestSchema>;

// --- Response schemas (parsed at the trust boundary) ---------------------------

const authResponseSchema = z.object({ message: z.string(), csrfToken: z.string() });
const messageResponseSchema = z.object({ message: z.string() });

const profileSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  avatar: z.string(),
  email: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Profile = z.infer<typeof profileSchema>;

const contentSchema = z.object({
  id: z.string(),
  contentType: z.enum(["movie", "tv"]),
  title: z.string(),
  releaseYear: z.number().nullish(),
  posterUrl: z.string().nullish(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Content = z.infer<typeof contentSchema>;

// --- Endpoints -----------------------------------------------------------------

export async function login(body: LoginRequest) {
  const data = loginRequestSchema.parse(body);
  const res = authResponseSchema.parse(await apiFetch("POST", "/auth/login", { body: data }));
  setCsrfToken(res.csrfToken);
  return res;
}

export async function register(body: RegisterRequest) {
  const data = registerRequestSchema.parse(body);
  return messageResponseSchema.parse(await apiFetch("POST", "/auth/register", { body: data }));
}

export async function logout() {
  await apiFetch("DELETE", "/auth/logout");
}

export async function getProfile(): Promise<Profile> {
  return profileSchema.parse(await apiFetch("GET", "/profile"));
}

export async function searchContent(q: string): Promise<Content[]> {
  return z.array(contentSchema).parse(await apiFetch("GET", "/content/search", { params: { q } }));
}

// --- Watchlist -------------------------------------------------------------------

const priorityEnum = z.enum(["must", "high", "medium", "low"]) satisfies z.ZodType<Priority>;

// `id` is the content id — watchlist rows are addressed by /watchlist/:contentId (1 row per content).
const watchlistEntrySchema = z.object({
  id: z.string(),
  priority: priorityEnum,
  notes: z.string(),
  createdAt: z.string(),
  content: contentSchema,
});
export type WatchlistEntry = z.infer<typeof watchlistEntrySchema>;

const addWatchlistRequestSchema = z.object({
  contentId: z.string(),
  priority: priorityEnum,
  notes: z.string().optional(),
});
export type AddWatchlistRequest = z.infer<typeof addWatchlistRequestSchema>;

const updateWatchlistRequestSchema = z.object({
  priority: priorityEnum.optional(),
  notes: z.string().optional(),
});
export type UpdateWatchlistRequest = z.infer<typeof updateWatchlistRequestSchema>;

export async function getWatchlist(): Promise<WatchlistEntry[]> {
  return z.array(watchlistEntrySchema).parse(await apiFetch("GET", "/watchlist"));
}

export async function addWatchlistItem(body: AddWatchlistRequest): Promise<void> {
  const data = addWatchlistRequestSchema.parse(body);
  await apiFetch("POST", "/watchlist", { body: data });
}

export async function updateWatchlistItem(contentId: string, body: UpdateWatchlistRequest): Promise<void> {
  const data = updateWatchlistRequestSchema.parse(body);
  await apiFetch("PATCH", `/watchlist/${contentId}`, { body: data });
}

export async function removeWatchlistItem(contentId: string): Promise<void> {
  await apiFetch("DELETE", `/watchlist/${contentId}`);
}

// --- Groups ------------------------------------------------------------------

const groupMemberSchema = z.object({
  id: z.string(),
  name: z.string(),
  avatar: z.string().nullish(),
});
export type GroupMember = z.infer<typeof groupMemberSchema>;

const groupSchema = z.object({
  id: z.string(),
  name: z.string(),
  inviteToken: z.string(),
  members: z.array(groupMemberSchema),
});
export type Group = z.infer<typeof groupSchema>;

const groupSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  memberCount: z.number(),
});
export type GroupSummary = z.infer<typeof groupSummarySchema>;

// Same catalog entry shape as search, minus the audit fields the merge response omits.
const mergedContentSchema = contentSchema.pick({
  id: true,
  contentType: true,
  title: true,
  releaseYear: true,
  posterUrl: true,
});

const mergedItemSchema = z.object({
  content: mergedContentSchema,
  interestedCount: z.number(),
  members: z.array(z.string()),
  priorities: z.record(z.string(), priorityEnum),
});
export type MergedItem = z.infer<typeof mergedItemSchema>;

export const mergedFilterSchema = z.enum(["all", "movie", "tv"]);
export type MergedFilter = z.infer<typeof mergedFilterSchema>;

const createGroupRequestSchema = z.object({ name: z.string().trim().min(1).optional() });

export async function createGroup(name?: string): Promise<Group> {
  const data = createGroupRequestSchema.parse({ name });
  return groupSchema.parse(await apiFetch("POST", "/groups", { body: data }));
}

export async function getGroups(): Promise<GroupSummary[]> {
  const res = z
    .object({ groups: z.array(groupSummarySchema) })
    .parse(await apiFetch("GET", "/groups"));
  return res.groups;
}

export async function getGroup(id: string): Promise<Group> {
  return groupSchema.parse(await apiFetch("GET", `/groups/${id}`));
}

export async function joinGroup(token: string): Promise<Group> {
  return groupSchema.parse(await apiFetch("POST", `/groups/join/${token}`));
}

export async function getMergedWatchlist(id: string, filter: MergedFilter = "all"): Promise<MergedItem[]> {
  const res = z
    .object({ filter: z.string(), items: z.array(mergedItemSchema) })
    .parse(await apiFetch("GET", `/groups/${id}/watchlist`, { params: { filter } }));
  return res.items;
}
