import { z } from "zod";
import { BASE } from "@/lib/api-client";
import { tallySchema } from "@/lib/api";

const WS_BASE = BASE.replace(/^http/, "ws");

const liveMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("tally"), tally: tallySchema }),
  z.object({ type: z.literal("winner"), winnerContentId: z.string(), finalizedAt: z.string() }),
]);
export type SessionLiveMessage = z.infer<typeof liveMessageSchema>;

/**
 * Subscribes to a session's live tally/winner feed. No server-side replay on
 * reconnect (see API contract) — callers should re-fetch session state on
 * (re)connect to catch up on anything missed while disconnected.
 * Returns an unsubscribe function.
 */
export function subscribeSessionLive(
  sessionId: string,
  onMessage: (msg: SessionLiveMessage) => void,
  onReconnect?: () => void
): () => void {
  let socket: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let closed = false;
  let everConnected = false;

  function connect() {
    socket = new WebSocket(`${WS_BASE}/sessions/${sessionId}/live`);
    socket.onopen = () => {
      if (everConnected) onReconnect?.();
      everConnected = true;
    };
    socket.onmessage = (ev) => {
      const parsed = liveMessageSchema.safeParse(JSON.parse(ev.data));
      if (parsed.success) onMessage(parsed.data);
    };
    socket.onclose = () => {
      if (closed) return;
      // ponytail: fixed 1s backoff, single connection — add jitter/backoff if reconnect storms show up under load
      reconnectTimer = setTimeout(connect, 1000);
    };
  }

  connect();

  return () => {
    closed = true;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    socket?.close();
  };
}
