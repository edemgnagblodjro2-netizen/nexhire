import { AppState, type AppStateStatus, Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";
import { authedFetch } from "./apiClient";

// ─────────────────────────────────────────────────────────────────────────────
// AttenteZéro — Tracker analytics côté mobile.
//
// - Génère un sessionId stable par installation (stocké dans SecureStore).
// - Envoie heartbeat toutes les 60 s tant que l'app est au premier plan.
// - Permet d'envoyer un événement (vue d'écran, recherche, appel, itinéraire).
// - Joint la position seulement si l'app a déjà obtenu la permission GPS via
//   `LocationProvider` (passée explicitement via setLocation).
// - 100 % best-effort : tout échec réseau est silencieux, jamais bloquant.
// ─────────────────────────────────────────────────────────────────────────────

const SESSION_KEY = "attentezero_session_id_v1";

let _sessionId: string | null = null;
let _platform: string = Platform.OS;
let _appVersion: string =
  (Constants.expoConfig as { version?: string } | null)?.version ?? "unknown";
let _deviceModel: string =
  (Constants.deviceName as string | undefined) ?? "unknown";

let _currentScreen: string | null = null;
let _province: string | null = null;
let _city: string | null = null;
let _lat: number | null = null;
let _lng: number | null = null;

let _heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let _started = false;
let _appStateSub: { remove: () => void } | null = null;
let _isForeground = true;

function uuid(): string {
  // Pas de crypto.randomUUID partout — fallback simple compatible RN.
  const rnd = () =>
    Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  return `${rnd()}${rnd()}-${rnd()}-${rnd()}-${rnd()}-${rnd()}${rnd()}${rnd()}`;
}

export async function getOrCreateSessionId(): Promise<string> {
  if (_sessionId) return _sessionId;
  try {
    const existing = await SecureStore.getItemAsync(SESSION_KEY);
    if (existing && existing.length >= 8) {
      _sessionId = existing;
      return existing;
    }
  } catch {
    // ignore
  }
  const sid = uuid();
  try {
    await SecureStore.setItemAsync(SESSION_KEY, sid);
  } catch {
    // ignore
  }
  _sessionId = sid;
  return sid;
}

export function setCurrentScreen(screen: string | null): void {
  _currentScreen = screen;
}

export function setLocation(loc: {
  province?: string | null;
  city?: string | null;
  lat?: number | null;
  lng?: number | null;
}): void {
  if (loc.province !== undefined) _province = loc.province;
  if (loc.city !== undefined) _city = loc.city;
  if (loc.lat !== undefined) _lat = loc.lat;
  if (loc.lng !== undefined) _lng = loc.lng;
}

async function postEvent(payload: Record<string, unknown>): Promise<void> {
  try {
    await authedFetch("/api/analytics/event", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  } catch {
    // Best-effort
  }
}

export async function trackEvent(
  eventType: string,
  extra?: {
    serviceId?: string;
    screen?: string;
    meta?: Record<string, unknown>;
    province?: string;
  },
): Promise<void> {
  const sessionId = await getOrCreateSessionId();
  await postEvent({
    eventType,
    sessionId,
    serviceId: extra?.serviceId,
    screen: extra?.screen ?? _currentScreen ?? undefined,
    province: extra?.province ?? _province ?? undefined,
    city: _city ?? undefined,
    lat: _lat ?? undefined,
    lng: _lng ?? undefined,
    appVersion: _appVersion,
    platform: _platform,
    meta: extra?.meta,
  });
}

export async function trackScreenView(screen: string): Promise<void> {
  setCurrentScreen(screen);
  await trackEvent("screen_view", { screen });
}

export async function trackSearch(
  category: string | undefined,
  queryLen: number,
  province?: string,
): Promise<void> {
  await trackEvent("search", {
    province: province ?? _province ?? undefined,
    meta: { category: (category ?? "all").toLowerCase().slice(0, 32), queryLen },
  });
}

export async function trackServiceView(serviceId: string): Promise<void> {
  await trackEvent("service_view", { serviceId });
}

export async function trackServiceCall(serviceId: string): Promise<void> {
  await trackEvent("service_call", { serviceId });
}

export async function trackServiceDirections(serviceId: string): Promise<void> {
  await trackEvent("service_directions", { serviceId });
}

export async function trackServiceWebsite(serviceId: string): Promise<void> {
  await trackEvent("service_website", { serviceId });
}

async function sendHeartbeat(): Promise<void> {
  const sessionId = await getOrCreateSessionId();
  try {
    await authedFetch("/api/analytics/heartbeat", {
      method: "POST",
      body: JSON.stringify({
        sessionId,
        currentScreen: _currentScreen ?? undefined,
        province: _province ?? undefined,
        city: _city ?? undefined,
        lat: _lat ?? undefined,
        lng: _lng ?? undefined,
        appVersion: _appVersion,
        platform: _platform,
        deviceModel: _deviceModel,
      }),
    });
  } catch {
    // ignore
  }
}

function startHeartbeatTimer() {
  if (_heartbeatTimer) clearInterval(_heartbeatTimer);
  _heartbeatTimer = setInterval(() => {
    if (_isForeground) void sendHeartbeat();
  }, 60 * 1000);
}

function stopHeartbeatTimer() {
  if (_heartbeatTimer) {
    clearInterval(_heartbeatTimer);
    _heartbeatTimer = null;
  }
}

function handleAppStateChange(state: AppStateStatus) {
  const nowForeground = state === "active";
  if (nowForeground === _isForeground) return;
  _isForeground = nowForeground;
  if (nowForeground) {
    // Reprise : ping immédiat + redémarre l'intervalle.
    void sendHeartbeat();
    startHeartbeatTimer();
  } else {
    // Arrière-plan : on signale la fin de session pour sortir des "actifs".
    stopHeartbeatTimer();
    void (async () => {
      try {
        const sessionId = await getOrCreateSessionId();
        await authedFetch("/api/analytics/session-end", {
          method: "POST",
          body: JSON.stringify({ sessionId }),
        });
      } catch {
        // ignore
      }
    })();
  }
}

export async function startAnalytics(): Promise<void> {
  if (_started) return;
  _started = true;
  _isForeground = AppState.currentState === "active";
  await getOrCreateSessionId();
  // Premier heartbeat immédiat puis toutes les 60 s (pause si background).
  if (_isForeground) void sendHeartbeat();
  startHeartbeatTimer();
  if (!_appStateSub) {
    _appStateSub = AppState.addEventListener(
      "change",
      handleAppStateChange,
    );
  }
}

export function stopAnalytics(): void {
  stopHeartbeatTimer();
  if (_appStateSub) {
    _appStateSub.remove();
    _appStateSub = null;
  }
  _started = false;
  void (async () => {
    const sessionId = await getOrCreateSessionId();
    try {
      await authedFetch("/api/analytics/session-end", {
        method: "POST",
        body: JSON.stringify({ sessionId }),
      });
    } catch {
      // ignore
    }
  })();
}

export async function uploadPushToken(token: string): Promise<void> {
  try {
    const sessionId = await getOrCreateSessionId();
    await authedFetch("/api/analytics/push-token", {
      method: "POST",
      body: JSON.stringify({
        token,
        sessionId,
        platform: _platform,
        appVersion: _appVersion,
      }),
    });
  } catch {
    // ignore
  }
}
