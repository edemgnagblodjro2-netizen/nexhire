import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "az_admin_notifications";

export interface NotifEventPrefs {
  messages: boolean;
  verifications: boolean;
  bugReports: boolean;
}

export interface NotifPrefs {
  sound: boolean;
  browser: boolean;
  events: NotifEventPrefs;
}

const DEFAULT_PREFS: NotifPrefs = {
  sound: true,
  browser: true,
  events: { messages: true, verifications: true, bugReports: true },
};

function loadPrefs(): NotifPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_PREFS,
        ...parsed,
        events: { ...DEFAULT_PREFS.events, ...(parsed.events ?? {}) },
      };
    }
  } catch {}
  return DEFAULT_PREFS;
}

function savePrefs(prefs: NotifPrefs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = "sine";
    osc1.frequency.setValueAtTime(880, now);
    osc1.frequency.exponentialRampToValueAtTime(1100, now + 0.12);

    osc2.type = "sine";
    osc2.frequency.setValueAtTime(1320, now + 0.13);
    osc2.frequency.exponentialRampToValueAtTime(1100, now + 0.25);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.04);
    gain.gain.setValueAtTime(0.18, now + 0.12);
    gain.gain.linearRampToValueAtTime(0, now + 0.28);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.14);
    osc2.start(now + 0.13);
    osc2.stop(now + 0.30);

    setTimeout(() => ctx.close(), 500);
  } catch {}
}

function notificationsSupported(): boolean {
  return "Notification" in window;
}

async function requestNotifPermission(): Promise<NotificationPermission> {
  if (!notificationsSupported()) return "denied";
  if (Notification.permission === "granted" || Notification.permission === "denied") {
    return Notification.permission;
  }
  return Notification.requestPermission();
}

function showBrowserNotification(body: string, tag: string) {
  if (!notificationsSupported() || Notification.permission !== "granted") return;
  new Notification("AttenteZéro — Admin", { body, tag });
}

export interface EventCounts {
  messages: number;
  verifications: number;
  bugReports: number;
}

const EVENT_LABELS: Record<keyof EventCounts, (delta: number) => string> = {
  messages: (n) => n === 1 ? "1 nouveau message reçu" : `${n} nouveaux messages reçus`,
  verifications: (n) => n === 1 ? "1 nouvelle demande de vérification" : `${n} nouvelles demandes de vérification`,
  bugReports: (n) => n === 1 ? "1 nouveau signalement reçu" : `${n} nouveaux signalements reçus`,
};

const EVENT_TAGS: Record<keyof EventCounts, string> = {
  messages: "az-contact-msg",
  verifications: "az-verification",
  bugReports: "az-bug-report",
};

export function useNotifications(counts: EventCounts) {
  const [prefs, setPrefsState] = useState<NotifPrefs>(loadPrefs);
  const prevCounts = useRef<EventCounts | null>(null);

  const setPrefs = (next: Partial<Omit<NotifPrefs, "events">>) => {
    setPrefsState((cur) => {
      const updated = { ...cur, ...next };
      savePrefs(updated);
      return updated;
    });
  };

  const setEventPref = (event: keyof NotifEventPrefs, value: boolean) => {
    setPrefsState((cur) => {
      const updated = { ...cur, events: { ...cur.events, [event]: value } };
      savePrefs(updated);
      return updated;
    });
  };

  useEffect(() => {
    requestNotifPermission();
  }, []);

  useEffect(() => {
    if (prevCounts.current === null) {
      prevCounts.current = counts;
      return;
    }

    const prev = prevCounts.current;
    prevCounts.current = counts;

    const eventKeys = Object.keys(counts) as (keyof EventCounts)[];
    let fired = false;

    for (const key of eventKeys) {
      if (!prefs.events[key]) continue;
      if (counts[key] <= prev[key]) continue;

      const delta = counts[key] - prev[key];

      if (!fired && prefs.sound) {
        playNotificationSound();
        fired = true;
      }

      if (prefs.browser) {
        const body = EVENT_LABELS[key](delta);
        const tag = EVENT_TAGS[key];
        if (!notificationsSupported()) continue;
        if (Notification.permission !== "granted") {
          requestNotifPermission().then((perm) => {
            if (perm === "granted") showBrowserNotification(body, tag);
          });
        } else {
          showBrowserNotification(body, tag);
        }
      }
    }
  }, [counts.messages, counts.verifications, counts.bugReports, prefs.sound, prefs.browser, prefs.events]);

  return { prefs, setPrefs, setEventPref };
}
