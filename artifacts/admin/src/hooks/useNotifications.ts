import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "az_admin_notifications";

interface NotifPrefs {
  sound: boolean;
  browser: boolean;
}

function loadPrefs(): NotifPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { sound: true, browser: true, ...JSON.parse(raw) };
  } catch {}
  return { sound: true, browser: true };
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

function showBrowserNotification(count: number) {
  if (!notificationsSupported() || Notification.permission !== "granted") return;
  new Notification("AttenteZéro — Admin", {
    body: count === 1
      ? "1 nouveau message reçu"
      : `${count} nouveaux messages reçus`,
    tag: "az-contact-msg",
  });
}

export function useNotifications(unreadCount: number) {
  const [prefs, setPrefsState] = useState<NotifPrefs>(loadPrefs);
  const prevCount = useRef<number | null>(null);

  const setPrefs = (next: Partial<NotifPrefs>) => {
    setPrefsState((cur) => {
      const updated = { ...cur, ...next };
      savePrefs(updated);
      return updated;
    });
  };

  useEffect(() => {
    requestNotifPermission();
  }, []);

  useEffect(() => {
    if (prevCount.current === null) {
      prevCount.current = unreadCount;
      return;
    }
    const prev = prevCount.current;
    prevCount.current = unreadCount;

    if (unreadCount <= prev) return;

    const delta = unreadCount - prev;

    if (prefs.sound) {
      playNotificationSound();
    }

    if (prefs.browser) {
      if (!notificationsSupported()) return;
      if (Notification.permission !== "granted") {
        requestNotifPermission().then((perm) => {
          if (perm === "granted") showBrowserNotification(delta);
        });
      } else {
        showBrowserNotification(delta);
      }
    }
  }, [unreadCount, prefs.sound, prefs.browser]);

  return { prefs, setPrefs };
}
