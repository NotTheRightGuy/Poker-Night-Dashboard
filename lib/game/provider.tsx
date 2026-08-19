"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type {
  Achievement,
  ChaosCard,
  ChaosEvent,
  ChipTransaction,
  CommunityCard,
  Game,
  GameEvent,
  Hand,
  Player,
  PlayerAchievement,
  PlayerClaim,
  PlayerHoleCard,
  PlayerPowerup,
  Powerup,
  XpTransaction,
} from "./types";

export type ConnectionStatus = "connecting" | "live" | "offline";

interface GameState {
  game: Game | null;
  players: Player[];
  hands: Hand[];
  communityCards: CommunityCard[];
  holeCards: PlayerHoleCard[]; // whatever this session's RLS grants — the host sees all, a claimed player sees only their own
  chipTransactions: ChipTransaction[];
  xpTransactions: XpTransaction[];
  playerPowerups: PlayerPowerup[];
  chaosEvents: ChaosEvent[];
  playerAchievements: PlayerAchievement[];
  gameEvents: GameEvent[];
  playerClaims: PlayerClaim[];
  powerups: Powerup[];
  chaosCards: ChaosCard[];
  achievements: Achievement[];
}

interface GameContextValue extends GameState {
  loading: boolean;
  connectionStatus: ConnectionStatus;
  userId: string | null;
  myClaim: PlayerClaim | null;
  refresh: () => Promise<void>;
}

const EMPTY_STATE: GameState = {
  game: null,
  players: [],
  hands: [],
  communityCards: [],
  holeCards: [],
  chipTransactions: [],
  xpTransactions: [],
  playerPowerups: [],
  chaosEvents: [],
  playerAchievements: [],
  gameEvents: [],
  playerClaims: [],
  powerups: [],
  chaosCards: [],
  achievements: [],
};

const GameContext = createContext<GameContextValue | null>(null);

function upsertByKey<T extends Record<string, unknown>>(list: T[], row: T, key: string): T[] {
  const idx = list.findIndex((r) => r[key] === row[key]);
  if (idx === -1) return [row, ...list];
  const copy = [...list];
  copy[idx] = row;
  return copy;
}

function removeByKey<T extends Record<string, unknown>>(list: T[], row: T, key: string): T[] {
  return list.filter((r) => r[key] !== row[key]);
}

// Lists keyed by `id` except achievements, whose primary key is `code`.
const LIST_KEYS: Record<Exclude<keyof GameState, "game">, string> = {
  players: "id",
  hands: "id",
  communityCards: "id",
  holeCards: "id",
  chipTransactions: "id",
  xpTransactions: "id",
  playerPowerups: "id",
  chaosEvents: "id",
  playerAchievements: "id",
  gameEvents: "id",
  playerClaims: "id",
  powerups: "code",
  chaosCards: "code",
  achievements: "code",
};

export function GameProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [state, setState] = useState<GameState>(EMPTY_STATE);
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("connecting");
  const [userId, setUserId] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const retryRef = useRef(0);

  const fetchSnapshot = useCallback(async (): Promise<string | null> => {
    const { data: gameRow } = await supabase
      .from("games")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!gameRow) {
      setState(EMPTY_STATE);
      setLoading(false);
      return null;
    }

    const gameId = gameRow.id;

    const [
      players,
      hands,
      communityCards,
      holeCards,
      chipTransactions,
      xpTransactions,
      playerPowerups,
      chaosEvents,
      playerAchievements,
      gameEvents,
      playerClaims,
      powerups,
      chaosCards,
      achievements,
    ] = await Promise.all([
      supabase.from("players").select("*").eq("game_id", gameId).order("created_at"),
      supabase.from("hands").select("*").eq("game_id", gameId).order("hand_number"),
      supabase.from("community_cards").select("*").eq("game_id", gameId).order("card_index"),
      supabase.from("player_hole_cards").select("*").eq("game_id", gameId),
      supabase.from("chip_transactions").select("*").eq("game_id", gameId).order("created_at"),
      supabase.from("xp_transactions").select("*").eq("game_id", gameId).order("created_at"),
      supabase.from("player_powerups").select("*").eq("game_id", gameId),
      supabase.from("chaos_events").select("*").eq("game_id", gameId).order("triggered_at"),
      supabase.from("player_achievements").select("*").eq("game_id", gameId).order("earned_at"),
      supabase.from("game_events").select("*").eq("game_id", gameId).order("created_at"),
      supabase.from("player_claims").select("*").eq("game_id", gameId),
      supabase.from("powerups").select("*").order("sort_order"),
      supabase.from("chaos_cards").select("*").order("sort_order"),
      supabase.from("achievements").select("*").order("name"),
    ]);

    setState({
      game: gameRow,
      players: players.data ?? [],
      hands: hands.data ?? [],
      communityCards: communityCards.data ?? [],
      holeCards: holeCards.data ?? [],
      chipTransactions: chipTransactions.data ?? [],
      xpTransactions: xpTransactions.data ?? [],
      playerPowerups: playerPowerups.data ?? [],
      chaosEvents: chaosEvents.data ?? [],
      playerAchievements: playerAchievements.data ?? [],
      gameEvents: gameEvents.data ?? [],
      playerClaims: playerClaims.data ?? [],
      powerups: powerups.data ?? [],
      chaosCards: chaosCards.data ?? [],
      achievements: achievements.data ?? [],
    });
    setLoading(false);
    return gameId;
  }, [supabase]);

  useEffect(() => {
    let cancelled = false;
    let backoffTimer: ReturnType<typeof setTimeout> | null = null;
    let offlineDisplayTimer: ReturnType<typeof setTimeout> | null = null;

    // Websockets drop for lots of ordinary reasons — a backgrounded browser
    // tab gets throttled, a phone screen locks, wifi blips for a second —
    // and the client reconnects automatically within a second or two almost
    // every time. Flashing "Connection lost" for each of those looks like a
    // real problem when nothing was actually lost. Only show it if a drop
    // hasn't resolved within a couple of seconds; cancel the timer the
    // moment we're back, so brief blips never reach the screen at all.
    function handleChannelStatus(status: string, onDrop: () => void) {
      if (cancelled) return;
      if (status === "SUBSCRIBED") {
        retryRef.current = 0;
        if (offlineDisplayTimer) {
          clearTimeout(offlineDisplayTimer);
          offlineDisplayTimer = null;
        }
        setConnectionStatus("live");
      } else if (status === "CLOSED" || status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        if (!offlineDisplayTimer) {
          offlineDisplayTimer = setTimeout(() => {
            offlineDisplayTimer = null;
            if (!cancelled) setConnectionStatus("offline");
          }, 2000);
        }
        onDrop();
      }
    }

    function applyChange(key: keyof GameState, payload: RealtimePostgresChangesPayload<Record<string, unknown>>) {
      setState((prev) => {
        if (key === "game") {
          if (payload.eventType === "DELETE") return prev;
          return { ...prev, game: payload.new as Game };
        }
        const listKey = LIST_KEYS[key as Exclude<keyof GameState, "game">];
        const list = prev[key] as unknown as Record<string, unknown>[];
        const nextList =
          payload.eventType === "DELETE"
            ? removeByKey(list, payload.old as Record<string, unknown>, listKey)
            : upsertByKey(list, payload.new as Record<string, unknown>, listKey);
        return { ...prev, [key]: nextList } as GameState;
      });
    }

    function subscribe(gameId: string) {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }

      const channel = supabase.channel(`game:${gameId}`);
      const scoped = { schema: "public" as const, filter: `game_id=eq.${gameId}` };

      channel
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "games", filter: `id=eq.${gameId}` },
          (payload) => applyChange("game", payload),
        )
        .on("postgres_changes", { event: "*", ...scoped, table: "players" }, (payload) => applyChange("players", payload))
        .on("postgres_changes", { event: "*", ...scoped, table: "hands" }, (payload) => applyChange("hands", payload))
        .on("postgres_changes", { event: "*", ...scoped, table: "community_cards" }, (payload) =>
          applyChange("communityCards", payload),
        )
        .on("postgres_changes", { event: "*", ...scoped, table: "player_hole_cards" }, (payload) =>
          applyChange("holeCards", payload),
        )
        .on("postgres_changes", { event: "*", ...scoped, table: "chip_transactions" }, (payload) =>
          applyChange("chipTransactions", payload),
        )
        .on("postgres_changes", { event: "*", ...scoped, table: "xp_transactions" }, (payload) =>
          applyChange("xpTransactions", payload),
        )
        .on("postgres_changes", { event: "*", ...scoped, table: "player_powerups" }, (payload) =>
          applyChange("playerPowerups", payload),
        )
        .on("postgres_changes", { event: "*", ...scoped, table: "chaos_events" }, (payload) =>
          applyChange("chaosEvents", payload),
        )
        .on("postgres_changes", { event: "*", ...scoped, table: "player_achievements" }, (payload) =>
          applyChange("playerAchievements", payload),
        )
        .on("postgres_changes", { event: "*", ...scoped, table: "game_events" }, (payload) =>
          applyChange("gameEvents", payload),
        )
        .on("postgres_changes", { event: "*", ...scoped, table: "player_claims" }, (payload) =>
          applyChange("playerClaims", payload),
        )
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "achievements" }, (payload) =>
          applyChange("achievements", payload),
        )
        .subscribe((status) => {
          handleChannelStatus(status, () => scheduleReconnect(gameId));
        });

      channelRef.current = channel;
    }

    function scheduleReconnect(gameId: string) {
      if (cancelled) return;
      const attempt = retryRef.current++;
      const delay = Math.min(1000 * 2 ** attempt, 15000);
      backoffTimer = setTimeout(async () => {
        if (cancelled) return;
        // Re-sync the full snapshot on reconnect rather than trying to replay
        // missed events — simplest correctness guarantee at this data scale.
        await fetchSnapshot();
        if (!cancelled) subscribe(gameId);
      }, delay);
    }

    // Used only while no game exists yet (e.g. the host hasn't created one).
    // Without this, the very first game ever created would never appear
    // without a manual refresh — there was nothing subscribed to notice it.
    function watchForNewGame() {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }

      const channel = supabase.channel("games:watch-for-new-game").on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "games" },
        async () => {
          if (cancelled) return;
          const newGameId = await fetchSnapshot();
          if (!cancelled && newGameId) subscribe(newGameId);
        },
      );

      channel.subscribe((status) => {
        handleChannelStatus(status, () => scheduleReconnectWatch());
      });

      channelRef.current = channel;
    }

    function scheduleReconnectWatch() {
      if (cancelled) return;
      const attempt = retryRef.current++;
      const delay = Math.min(1000 * 2 ** attempt, 15000);
      backoffTimer = setTimeout(async () => {
        if (cancelled) return;
        const gameId = await fetchSnapshot();
        if (cancelled) return;
        if (gameId) subscribe(gameId);
        else watchForNewGame();
      }, delay);
    }

    async function bootstrap() {
      setLoading(true);
      const gameId = await fetchSnapshot();
      if (cancelled) return;

      if (gameId) {
        subscribe(gameId);
      } else {
        watchForNewGame();
      }
    }

    bootstrap();

    // A one-time getUser() at bootstrap isn't enough: claimPlayer() may call
    // signInAnonymously() well after this provider already mounted (the very
    // first time someone selects their name), which creates a brand-new
    // session out from under a stale `userId`. Without reacting to that,
    // `myClaim` never matches the just-created claim and the private hand
    // panel silently never appears until a full page reload. Subscribing
    // here fires immediately with whatever session already exists, and again
    // on every subsequent sign-in/sign-out, so `userId` — and therefore
    // `myClaim` — stays correct without any manual refresh.
    const {
      data: { subscription: authSubscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!cancelled) setUserId(session?.user?.id ?? null);
    });

    return () => {
      cancelled = true;
      if (backoffTimer) clearTimeout(backoffTimer);
      if (offlineDisplayTimer) clearTimeout(offlineDisplayTimer);
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      authSubscription.unsubscribe();
    };
  }, [supabase, fetchSnapshot]);

  const myClaim = state.playerClaims.find((c) => c.user_id === userId && !c.released_at) ?? null;

  const value: GameContextValue = {
    ...state,
    loading,
    connectionStatus,
    userId,
    myClaim,
    refresh: async () => {
      await fetchSnapshot();
    },
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame() must be used within a <GameProvider>");
  return ctx;
}
