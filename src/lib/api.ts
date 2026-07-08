import { z } from "zod";
import { apiFetch, setCsrfToken } from "@/lib/api-client";

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
