import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Audio } from "expo-av";
import * as Speech from "expo-speech";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useLanguage } from "@/contexts/LanguageContext";
import { useServicesData } from "@/contexts/ServicesContext";
import { useColors } from "@/hooks/useColors";
import { getCategoryColor } from "@/utils/categoryColors";
import { detectCriticalSituation, type CriticalAlert } from "@/utils/detectCritical";
import { getApiBaseUrl } from "@/lib/apiBase";
import { authedFetch } from "@/lib/apiClient";
import { useAuth } from "@/lib/auth";
import { LinearGradient } from "expo-linear-gradient";

type ChatLang = "fr" | "en" | "es" | "ar" | "ht";
const CHAT_LANGS: { code: ChatLang; label: string; flag: string }[] = [
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "ar", label: "العربية", flag: "🇲🇦" },
  { code: "ht", label: "Kreyòl", flag: "🇭🇹" },
];

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system" | "alert";
  content: string;
  serviceIds?: string[];
  isStreaming?: boolean;
  alert?: CriticalAlert;
}

function ServiceChip({ serviceId }: { serviceId: string }) {
  const colors = useColors();
  const router = useRouter();
  const { services } = useServicesData();
  const service = services.find((s) => s.id === serviceId);
  if (!service) return null;
  const color = getCategoryColor(service.category, colors);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.serviceChip,
        {
          backgroundColor: color + "12",
          borderColor: color + "30",
          opacity: pressed ? 0.85 : 1,
        },
      ]}
      onPress={() => {
        Haptics.selectionAsync();
        router.push({ pathname: "/service/[id]", params: { id: service.id } });
      }}
    >
      <View style={[styles.chipDot, { backgroundColor: color }]} />
      <View style={styles.chipText}>
        <Text style={[styles.chipName, { color: colors.foreground }]} numberOfLines={1}>
          {service.name}
        </Text>
        <Text style={[styles.chipCity, { color: colors.mutedForeground }]} numberOfLines={1}>
          {service.city} · {service.phone}
        </Text>
      </View>
      <Feather name="chevron-right" size={14} color={color} />
    </Pressable>
  );
}

function CriticalAlertBubble({
  alert,
  language,
  router,
}: {
  alert: CriticalAlert;
  language: string;
  router: ReturnType<typeof useRouter>;
}) {
  const isFr = language !== "en";
  const isCrisis = alert.level === "crisis";
  const isViolence = alert.level === "violence";
  const accent = isCrisis ? "#dc2626" : isViolence ? "#7c2d12" : "#d97706";

  const title = isCrisis
    ? (isFr ? "Vous n'êtes pas seul(e)" : "You are not alone")
    : isViolence
    ? (isFr ? "Vous méritez d'être en sécurité" : "You deserve to be safe")
    : (isFr ? "Votre sécurité compte" : "Your safety matters");

  const body = isCrisis
    ? (isFr
      ? "Des professionnels sont disponibles maintenant, 24h/24, pour vous aider."
      : "Professionals are available now, 24/7, to help you.")
    : isViolence
    ? (isFr
      ? "Vous pouvez quitter cette page rapidement. Personne ne le verra."
      : "You can leave this page quickly. No one will see.")
    : (isFr
      ? "Si vous êtes en danger, contactez immédiatement les services d'urgence."
      : "If you are in danger, contact emergency services immediately.");

  return (
    <View style={styles.alertWrap}>
      <View style={[styles.alertCard, isCrisis ? styles.alertCardCrisis : styles.alertCardWarning, isViolence && { borderColor: accent }]}>
        <View style={styles.alertHeader}>
          <View style={[styles.alertIcon, { backgroundColor: accent }]}>
            <Feather name={isCrisis ? "heart" : isViolence ? "shield" : "alert-triangle"} size={16} color="#fff" />
          </View>
          <Text style={styles.alertTitle}>{title}</Text>
        </View>
        <Text style={styles.alertBody}>{body}</Text>
        <View style={styles.alertNumbers}>
          {alert.numbers.map((n) => (
            <Pressable
              key={n.number}
              style={({ pressed }) => [
                styles.alertNumberBtn,
                { backgroundColor: accent, opacity: pressed ? 0.8 : 1 },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                Linking.openURL(`tel:${n.number.replace(/[^0-9+]/g, "")}`);
              }}
            >
              <Feather name="phone" size={13} color="#fff" />
              <View>
                <Text style={styles.alertNumberLabel}>{n.label}</Text>
                <Text style={styles.alertNumberVal}>{n.number}</Text>
              </View>
            </Pressable>
          ))}
        </View>
        {alert.showQuickExit && (
          <Pressable
            style={({ pressed }) => [
              {
                marginTop: 12,
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderRadius: 10,
                backgroundColor: "#1f2937",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              router.replace("/");
            }}
          >
            <Feather name="x-circle" size={16} color="#fff" />
            <Text style={{ color: "#fff", fontWeight: "700" }}>
              {isFr ? "🚪 Quitter rapidement" : "🚪 Quick exit"}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function MessageBubble({
  message,
  language,
  onSpeak,
  isSpeakingThis,
}: {
  message: ChatMessage;
  language: string;
  onSpeak?: (messageId: string, text: string) => void;
  isSpeakingThis?: boolean;
}) {
  const colors = useColors();
  const router = useRouter();
  const isUser = message.role === "user";
  const isSystem = message.role === "system";
  const isAlert = message.role === "alert";

  const cleanContent = message.content
    .replace(/\[SERVICES:[^\]]*\]/g, "")
    .trim();

  if (isAlert && message.alert) {
    return <CriticalAlertBubble alert={message.alert} language={language} router={router} />;
  }

  if (isSystem) {
    return (
      <View style={styles.systemMessage}>
        <View
          style={[
            styles.systemBubble,
            { backgroundColor: colors.primary + "12", borderColor: colors.primary + "25" },
          ]}
        >
          <Feather name="cpu" size={13} color={colors.primary} />
          <Text style={[styles.systemText, { color: colors.primary }]}>
            {cleanContent}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.messageRow,
        isUser ? styles.messageRowRight : styles.messageRowLeft,
      ]}
    >
      {!isUser && (
        <View style={[styles.aiAvatar, { backgroundColor: colors.primary }]}>
          <Feather name="cpu" size={13} color="#fff" />
        </View>
      )}
      <View style={[styles.messageBubbleWrap, isUser && { alignItems: "flex-end" }]}>
        <View
          style={[
            styles.bubble,
            isUser
              ? [styles.bubbleUser, { backgroundColor: colors.primary }]
              : [
                  styles.bubbleAI,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ],
          ]}
        >
          <Text
            style={[
              styles.bubbleText,
              { color: isUser ? "#fff" : colors.foreground },
            ]}
          >
            {cleanContent}
            {message.isStreaming && (
              <Text style={{ color: colors.primary }}> ▋</Text>
            )}
          </Text>
        </View>
        {!isUser && !message.isStreaming && cleanContent.length > 0 && onSpeak && (
          <Pressable
            onPress={() => onSpeak(message.id, cleanContent)}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              marginTop: 4,
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 12,
              backgroundColor: isSpeakingThis ? colors.primary + "20" : "transparent",
              opacity: pressed ? 0.6 : 1,
              alignSelf: "flex-start",
            })}
          >
            <Feather
              name={isSpeakingThis ? "volume-2" : "volume-1"}
              size={12}
              color={isSpeakingThis ? colors.primary : colors.mutedForeground}
            />
            <Text style={{ fontSize: 11, color: isSpeakingThis ? colors.primary : colors.mutedForeground }}>
              {isSpeakingThis ? "Lecture..." : "Écouter"}
            </Text>
          </Pressable>
        )}
        {!isUser && message.serviceIds && message.serviceIds.length > 0 && !message.isStreaming && (
          <View style={styles.serviceChips}>
            {message.serviceIds.map((id) => (
              <ServiceChip key={id} serviceId={id} />
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

const QUICK_PROMPTS_FR = [
  "Je n'ai nulle part où dormir",
  "J'ai besoin de nourriture",
  "Je me sens en danger",
  "Je suis un immigrant",
  "J'ai besoin d'aide psychologique",
  "Je cherche du travail",
  "Je cherche une garderie",
  "Aide pour ma famille",
  "Je suis en Ontario, je cherche les services administratifs",
  "Je suis en Alberta, démarches gouvernementales",
  "Je suis en Colombie-Britannique, j'ai besoin d'aide",
  "Je suis au Manitoba, démarches administratives",
];

const QUICK_PROMPTS_EN = [
  "I have nowhere to sleep",
  "I need food assistance",
  "I feel unsafe at home",
  "I am an immigrant",
  "I need mental health support",
  "I'm looking for work",
  "I need childcare",
  "Help for my family",
  "I'm in Ontario, I need administrative services",
  "I'm in Alberta, I need government services",
  "I'm in British Columbia, I need help",
  "I'm in Nova Scotia, I need administrative help",
];

const QUICK_PROMPTS_ES = [
  "No tengo dónde dormir",
  "Necesito comida",
  "Me siento en peligro",
  "Soy inmigrante",
  "Necesito apoyo emocional",
  "Busco trabajo",
  "Busco guardería para mis hijos",
  "Necesito ayuda para mi familia",
  "Estoy en Ontario, necesito servicios administrativos",
  "Estoy en Alberta, trámites gubernamentales",
  "Estoy en Columbia Británica, necesito ayuda",
];

const QUICK_PROMPTS_AR = [
  "ليس لدي مكان للنوم",
  "أحتاج مساعدة غذائية",
  "أشعر بالخطر",
  "أنا مهاجر",
  "أحتاج دعماً نفسياً",
  "أبحث عن عمل",
  "أحتاج رعاية أطفال",
  "أحتاج مساعدة لعائلتي",
  "أنا في أونتاريو، أبحث عن الخدمات الإدارية",
  "أنا في ألبرتا، إجراءات حكومية",
  "أنا في كولومبيا البريطانية، أحتاج إلى مساعدة",
];

const QUICK_PROMPTS_HT = [
  "Mwen pa gen kote pou dòmi",
  "Mwen bezwen manje",
  "Mwen santi mwen an danje",
  "Mwen se yon imigran",
  "Mwen bezwen sipò sikolojik",
  "Mwen ap chèche travay",
  "Mwen bezwen gadri pou timoun mwen",
  "Mwen bezwen èd pou fanmi mwen",
  "Mwen nan Ontario, mwen bezwen sèvis administratif",
  "Mwen nan Alberta, demach gouvènmantal",
  "Mwen nan Kolonbi Britanik, mwen bezwen èd",
];

export default function ChatScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t, language } = useLanguage();
  const { isAuthenticated, isLoading: authLoading, getToken } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ autoPrompt?: string }>();
  const autoSentRef = useRef<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [chatLang, setChatLang] = useState<ChatLang>(language as ChatLang);
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [quotaRemaining, setQuotaRemaining] = useState<number | null>(null);
  const [quotaLimit, setQuotaLimit] = useState<number | null>(null);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const sendMessageRef = useRef<((text: string) => void) | null>(null);
  const listRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  const topPadding = Platform.OS === "web" ? 16 : insets.top;
  const bottomPadding = Math.max(insets.bottom, 8);

  const quickPrompts =
    chatLang === "en"
      ? QUICK_PROMPTS_EN
      : chatLang === "es"
      ? QUICK_PROMPTS_ES
      : chatLang === "ar"
      ? QUICK_PROMPTS_AR
      : chatLang === "ht"
      ? QUICK_PROMPTS_HT
      : QUICK_PROMPTS_FR;

  useEffect(() => {
    setMessages([
      {
        id: "welcome",
        role: "system",
        content: t.aiWelcome,
      },
    ]);
  }, [language, t.aiWelcome]);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, 80);
  }, []);

  const speakResponse = useCallback(
    (messageId: string, text: string) => {
      // Always stop any current speech first
      Speech.stop();
      // If user tapped the same message that was speaking, treat as toggle off
      if (speakingMessageId === messageId) {
        setSpeakingMessageId(null);
        return;
      }
      const clean = text
        .replace(/\[SERVICES:[^\]]*\]/gi, "")
        .replace(/\*\*/g, "")
        .replace(/\*/g, "")
        .trim();
      if (!clean) return;
      const langCode =
        chatLang === "en" ? "en-US"
        : chatLang === "es" ? "es-ES"
        : chatLang === "ar" ? "ar-SA"
        : "fr-CA";
      Haptics.selectionAsync();
      setSpeakingMessageId(messageId);
      Speech.speak(clean, {
        language: langCode,
        rate: 0.95,
        onDone: () =>
          setSpeakingMessageId((cur) => (cur === messageId ? null : cur)),
        onStopped: () =>
          setSpeakingMessageId((cur) => (cur === messageId ? null : cur)),
        onError: () =>
          setSpeakingMessageId((cur) => (cur === messageId ? null : cur)),
      });
    },
    [chatLang, speakingMessageId],
  );

  const startRecording = useCallback(async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") {
        return;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );
      recordingRef.current = recording;
      setIsRecording(true);
    } catch (err) {
      console.error("Recording error:", err);
      setIsRecording(false);
    }
  }, []);

  const stopRecordingAndSend = useCallback(async () => {
    const recording = recordingRef.current;
    if (!recording) return;
    setIsRecording(false);
    setIsTranscribing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      recordingRef.current = null;
      if (!uri) {
        setIsTranscribing(false);
        return;
      }
      const formData = new FormData();
      formData.append("audio", {
        uri,
        name: "recording.m4a",
        type: "audio/m4a",
      } as unknown as Blob);
      formData.append("language", chatLang);
      // The /api/ai/transcribe endpoint requires authentication and is
      // rate-limited per user. authedFetch attaches the bearer token; if
      // none is available the server replies 401 and we show a localized
      // fallback below.
      const response = await authedFetch(`/api/ai/transcribe`, {
        method: "POST",
        body: formData,
      });
      setIsTranscribing(false);
      if (response.status === 429) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        setInput(data.error ?? (chatLang === "en"
          ? "(Voice quota reached, try again later)"
          : "(Quota vocal atteint, réessayez plus tard)"));
        return;
      }
      if (response.status === 401) {
        setInput(
          chatLang === "en"
            ? "(Sign in to use voice input)"
            : "(Connectez-vous pour la saisie vocale)",
        );
        return;
      }
      if (!response.ok) {
        console.error("Transcribe HTTP error:", response.status);
        setInput(
          chatLang === "en"
            ? "(Voice unavailable - please type)"
            : "(Voix indisponible - veuillez écrire)",
        );
        return;
      }
      const data = (await response.json()) as { text?: string; error?: string };
      if (data.text && data.text.trim()) {
        sendMessageRef.current?.(data.text.trim());
      } else if (data.error) {
        console.error("Transcribe API error:", data.error);
      }
    } catch (err) {
      console.error("Transcription error:", err);
      setIsTranscribing(false);
    }
  }, [chatLang]);

  useEffect(() => {
    return () => {
      Speech.stop();
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
      }
    };
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) return;

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setInput("");

      const userMsg: ChatMessage = {
        id: `u-${Date.now()}`,
        role: "user",
        content: trimmed,
      };

      const criticalAlert = detectCriticalSituation(trimmed);
      const alertMsg: ChatMessage | null = criticalAlert
        ? {
            id: `alert-${Date.now()}`,
            role: "alert",
            content: "",
            alert: criticalAlert,
          }
        : null;

      const aiMsgId = `a-${Date.now()}`;
      const aiMsg: ChatMessage = {
        id: aiMsgId,
        role: "assistant",
        content: "",
        isStreaming: true,
      };

      setMessages((prev) => [
        ...prev,
        userMsg,
        ...(alertMsg ? [alertMsg] : []),
        aiMsg,
      ]);
      setIsLoading(true);
      scrollToBottom();

      const history = messages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

      try {
        const authToken = await getToken().catch(() => null);
        const response = await fetch(`${getApiBaseUrl()}/api/ai/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          },
          body: JSON.stringify({ message: trimmed, language: chatLang, history }),
        });

        // Read quota headers (free tier only)
        const limitHeader = response.headers.get("X-AI-Quota-Limit");
        const remainHeader = response.headers.get("X-AI-Quota-Remaining");
        if (limitHeader) setQuotaLimit(parseInt(limitHeader, 10));
        if (remainHeader) {
          const remain = parseInt(remainHeader, 10);
          setQuotaRemaining(remain);
          // Reset blocked state if server says we have quota left (e.g., new day)
          if (remain > 0) setQuotaExceeded(false);
        }

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          if ((errData as { quotaExceeded?: boolean }).quotaExceeded) {
            setQuotaExceeded(true);
            setQuotaRemaining(0);
          }
          throw new Error((errData as { error?: string }).error || `HTTP ${response.status}`);
        }
        if (remainHeader && parseInt(remainHeader, 10) === 0) setQuotaExceeded(true);

        let accumulated = "";
        let finalServiceIds: string[] = [];

        function parseSseText(text: string) {
          const lines = text.split("\n");
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const json = JSON.parse(line.slice(6));
              if (json.content) accumulated += json.content;
              if (json.done) finalServiceIds = json.serviceIds ?? [];
              if (json.error) accumulated += `\n\n⚠️ ${json.error}`;
            } catch { /* skip malformed line */ }
          }
        }

        const supportsStreaming =
          !!response.body &&
          typeof (response.body as ReadableStream).getReader === "function";

        if (supportsStreaming) {
          const reader = (response.body as ReadableStream<Uint8Array>).getReader();
          const decoder = new TextDecoder();

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split("\n");
            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              try {
                const json = JSON.parse(line.slice(6));
                if (json.content) {
                  accumulated += json.content;
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === aiMsgId
                        ? { ...m, content: accumulated, isStreaming: true }
                        : m
                    )
                  );
                  scrollToBottom();
                }
                if (json.done) finalServiceIds = json.serviceIds ?? [];
                if (json.error) accumulated += `\n\n⚠️ ${json.error}`;
              } catch { /* skip malformed line */ }
            }
          }
        } else {
          // Fallback for environments without ReadableStream (some Expo WebView / proxies)
          const text = await response.text();
          parseSseText(text);
        }

        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMsgId
              ? {
                  ...m,
                  content: accumulated || t.aiError,
                  isStreaming: false,
                  serviceIds: finalServiceIds,
                }
              : m
          )
        );
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMsgId
              ? {
                  ...m,
                  content: t.aiError + (errMsg ? `\n\n(${errMsg})` : ""),
                  isStreaming: false,
                }
              : m
          )
        );
      } finally {
        setIsLoading(false);
        scrollToBottom();
      }
    },
    [isLoading, messages, language, chatLang, scrollToBottom, t.aiError]
  );

  // Keep ref to latest sendMessage so voice transcribe callback can call it without stale closure
  useEffect(() => {
    sendMessageRef.current = sendMessage;
  }, [sendMessage]);

  // Auto-send prompt from URL params (e.g. coming from home screen quick prompts)
  useEffect(() => {
    const prompt = params.autoPrompt;
    if (!prompt || typeof prompt !== "string") return;
    if (!isAuthenticated) return;
    if (autoSentRef.current === prompt) return;
    autoSentRef.current = prompt;
    const t = setTimeout(() => {
      sendMessage(prompt);
      router.setParams({ autoPrompt: undefined });
    }, 250);
    return () => clearTimeout(t);
  }, [params.autoPrompt, isAuthenticated, sendMessage, router]);

  const handleReset = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setMessages([
      {
        id: "welcome",
        role: "system",
        content: t.aiWelcome,
      },
    ]);
  }, [t.aiWelcome]);

  const handleRefresh = useCallback(() => {
    if (isLoading) return;
    setIsRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimeout(() => {
      setMessages([{ id: "welcome", role: "system", content: t.aiWelcome }]);
      setInput("");
      setIsRefreshing(false);
    }, 600);
  }, [isLoading, t.aiWelcome]);

  if (!authLoading && !isAuthenticated) {
    const topInset = Platform.OS === "web" ? 16 : insets.top;
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <LinearGradient
          colors={[colors.primary, "#0a5e52"]}
          style={[styles.gateHero, { paddingTop: topInset + 24 }]}
        >
          <View style={styles.gateIconWrap}>
            <Feather name="cpu" size={32} color="#fff" />
          </View>
          <Text style={styles.gateTitle}>Chat IA</Text>
          <Text style={styles.gateSub}>
            Trouvez de l'aide en quelques secondes grâce à notre assistant intelligent.
          </Text>
        </LinearGradient>

        <View style={styles.gateBody}>
          <Text style={[styles.gateBodyTitle, { color: colors.foreground }]}>
            Connectez-vous pour discuter
          </Text>
          <Text style={[styles.gateBodyText, { color: colors.mutedForeground }]}>
            Le chat IA est réservé aux membres. La consultation des services reste libre et gratuite.
          </Text>

          <Pressable
            style={({ pressed }) => [
              styles.gatePrimary,
              { backgroundColor: colors.primary, opacity: pressed ? 0.9 : 1 },
            ]}
            onPress={() => router.push("/login" as any)}
          >
            <Feather name="log-in" size={16} color="#fff" />
            <Text style={styles.gatePrimaryText}>Se connecter</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.gateSecondary,
              { borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
            ]}
            onPress={() => router.push("/register" as any)}
          >
            <Text style={[styles.gateSecondaryText, { color: colors.foreground }]}>
              Créer un compte gratuit
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
            paddingTop: topPadding + 8,
            paddingRight: 16 + insets.right,
          },
        ]}
      >
        <View style={styles.headerLeft}>
          <View style={[styles.aiBadge, { backgroundColor: colors.primary }]}>
            <Feather name="cpu" size={14} color="#fff" />
          </View>
          <View style={{ flex: 1, flexShrink: 1 }}>
            <Text numberOfLines={1} style={[styles.headerTitle, { color: colors.foreground }]}>
              {t.aiTitle}
            </Text>
            <Text numberOfLines={1} style={[styles.headerSub, { color: colors.mutedForeground }]}>
              {t.aiSubtitle}
            </Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[
              styles.langBtn,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
            onPress={() => {
              Haptics.selectionAsync();
              setShowLangPicker((v) => !v);
            }}
          >
            <Text style={styles.langFlag}>
              {CHAT_LANGS.find((l) => l.code === chatLang)?.flag ?? "🇫🇷"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.resetBtn, { borderColor: colors.border }]}
            onPress={handleReset}
            hitSlop={8}
          >
            <Feather name="rotate-ccw" size={15} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>
      </View>

      {showLangPicker && (
        <View
          style={[
            styles.langPicker,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          {CHAT_LANGS.map((l) => (
            <TouchableOpacity
              key={l.code}
              style={[
                styles.langOption,
                chatLang === l.code && { backgroundColor: colors.primary + "18" },
              ]}
              onPress={() => {
                Haptics.selectionAsync();
                setChatLang(l.code);
                setShowLangPicker(false);
              }}
            >
              <Text style={styles.langFlag}>{l.flag}</Text>
              <Text
                style={[
                  styles.langLabel,
                  {
                    color:
                      chatLang === l.code ? colors.primary : colors.foreground,
                    fontWeight: chatLang === l.code ? "700" : "400",
                  },
                ]}
              >
                {l.label}
              </Text>
              {chatLang === l.code && (
                <Feather name="check" size={14} color={colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Quota banner — shown to free users when ≤2 messages remain */}
      {quotaRemaining !== null && quotaLimit !== null && quotaRemaining <= 2 && (
        <Pressable
          onPress={() => router.push("/premium" as any)}
          style={[
            styles.quotaBanner,
            quotaExceeded || quotaRemaining === 0
              ? styles.quotaBannerBlocked
              : styles.quotaBannerWarn,
          ]}
        >
          <Feather
            name={quotaExceeded || quotaRemaining === 0 ? "lock" : "alert-circle"}
            size={16}
            color="#fff"
          />
          <Text style={styles.quotaBannerText}>
            {(() => {
              const blocked = quotaExceeded || quotaRemaining === 0;
              const n = quotaRemaining ?? 0;
              const s = n > 1 ? "s" : "";
              if (blocked) {
                switch (chatLang) {
                  case "en": return `Daily free limit reached (${quotaLimit}/day). Tap to upgrade for unlimited.`;
                  case "es": return `Límite diario alcanzado (${quotaLimit}/día). Toca para pasar a Premium.`;
                  case "ar": return `تم بلوغ الحد اليومي (${quotaLimit}/يوم). اضغط للترقية إلى Premium.`;
                  case "ht": return `Limit jounalye atenn (${quotaLimit}/jou). Peze pou ale Premium.`;
                  default: return `Limite quotidienne atteinte (${quotaLimit}/jour). Touchez pour passer Premium.`;
                }
              }
              switch (chatLang) {
                case "en": return `${n} message${s} left today. Upgrade for unlimited.`;
                case "es": return `Te queda${n > 1 ? "n" : ""} ${n} mensaje${s} hoy. Pasa a Premium para uso ilimitado.`;
                case "ar": return `تبقى لك ${n} رسالة اليوم. قم بالترقية للاستخدام غير المحدود.`;
                case "ht": return `Ou genyen ${n} mesaj ki rete jodi a. Ale Premium pou san limit.`;
                default: return `Il vous reste ${n} message${s} aujourd'hui. Passez Premium pour un usage illimité.`;
              }
            })()}
          </Text>
          <Feather name="chevron-right" size={16} color="#fff" />
        </Pressable>
      )}

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={scrollToBottom}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
            progressBackgroundColor={colors.card}
          />
        }
        ListFooterComponent={
          messages.length <= 1 ? (
            <View style={styles.quickPromptsWrap}>
              <Text style={[styles.quickLabel, { color: colors.mutedForeground }]}>
                {t.aiSuggestions}
              </Text>
              <View style={styles.quickPrompts}>
                {quickPrompts.map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[
                      styles.promptChip,
                      { backgroundColor: colors.card, borderColor: colors.border },
                    ]}
                    onPress={() => sendMessage(p)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.promptText, { color: colors.foreground }]}>
                      {p}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <MessageBubble
            message={item}
            language={chatLang}
            onSpeak={speakResponse}
            isSpeakingThis={speakingMessageId === item.id}
          />
        )}
      />

      <View
        style={[
          styles.inputBar,
          {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
            paddingBottom: Math.max(bottomPadding, 8),
          },
        ]}
      >
        {isLoading && (
          <View style={[styles.thinkingBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.thinkingText, { color: colors.mutedForeground }]}>
              {t.aiThinking}
            </Text>
          </View>
        )}
        <View
          style={[
            styles.inputRow,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <TextInput
            ref={inputRef}
            style={[styles.textInput, { color: colors.foreground }]}
            placeholder={isRecording ? "🎙️ Enregistrement..." : isTranscribing ? "✍️ Transcription..." : t.aiPlaceholder}
            placeholderTextColor={colors.mutedForeground}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={500}
            returnKeyType="send"
            blurOnSubmit={false}
            editable={!isRecording && !isTranscribing}
            onSubmitEditing={() => sendMessage(input)}
          />
          <Pressable
            style={({ pressed }) => [
              styles.sendBtn,
              {
                backgroundColor: isRecording
                  ? "#ef4444"
                  : isTranscribing
                  ? colors.border
                  : input.trim()
                  ? colors.border
                  : colors.primary,
                opacity: pressed ? 0.85 : 1,
                marginRight: 6,
              },
            ]}
            onPress={isRecording ? stopRecordingAndSend : startRecording}
            disabled={isLoading || isTranscribing || !!input.trim()}
          >
            {isTranscribing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Feather name={isRecording ? "square" : "mic"} size={16} color="#fff" />
            )}
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.sendBtn,
              {
                backgroundColor:
                  input.trim() && !isLoading ? colors.primary : colors.border,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
            onPress={() => sendMessage(input)}
            disabled={!input.trim() || isLoading}
          >
            <Feather name="send" size={16} color="#fff" />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  quotaBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 12,
  },
  quotaBannerWarn: { backgroundColor: "#7c3aed" },
  quotaBannerBlocked: { backgroundColor: "#dc2626" },
  quotaBannerText: {
    flex: 1,
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  container: { flex: 1 },
  list: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    flexShrink: 1,
    marginRight: 8,
  },
  aiBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  gateHero: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    alignItems: "center",
    gap: 10,
  },
  gateIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  gateTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  gateSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
    lineHeight: 19,
    paddingHorizontal: 12,
  },
  gateBody: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 28,
    gap: 14,
  },
  gateBodyTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  gateBodyText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
    textAlign: "center",
    marginBottom: 8,
  },
  gatePrimary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  gatePrimaryText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  gateSecondary: {
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
  },
  gateSecondaryText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  headerSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  resetBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    padding: 16,
    paddingBottom: 24,
    gap: 12,
  },
  systemMessage: {
    alignItems: "center",
    marginBottom: 8,
  },
  systemBubble: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    maxWidth: "85%",
  },
  systemText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
    flexShrink: 1,
  },
  messageRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginBottom: 4,
  },
  messageRowLeft: { justifyContent: "flex-start" },
  messageRowRight: { justifyContent: "flex-end" },
  aiAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginBottom: 2,
  },
  alertWrap: {
    marginVertical: 4,
  },
  alertCard: {
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  alertCardCrisis: {
    backgroundColor: "#fef2f2",
    borderWidth: 1.5,
    borderColor: "#fca5a5",
  },
  alertCardWarning: {
    backgroundColor: "#fffbeb",
    borderWidth: 1.5,
    borderColor: "#fcd34d",
  },
  alertHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  alertIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  alertTitle: {
    fontSize: 15,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    color: "#1a1a1a",
    flex: 1,
  },
  alertBody: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#374151",
    lineHeight: 19,
  },
  alertNumbers: {
    gap: 8,
    marginTop: 2,
  },
  alertNumberBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  alertNumberLabel: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  alertNumberVal: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  messageBubbleWrap: {
    flex: 1,
    gap: 6,
    maxWidth: "85%",
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    borderWidth: 1,
  },
  bubbleUser: {
    borderRadius: 18,
    borderBottomRightRadius: 4,
    borderColor: "transparent",
    alignSelf: "flex-end",
  },
  bubbleAI: {
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    alignSelf: "flex-start",
  },
  bubbleText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
  },
  serviceChips: {
    gap: 6,
    marginTop: 4,
  },
  serviceChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  chipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  chipText: { flex: 1, gap: 2 },
  chipName: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  chipCity: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  quickPromptsWrap: {
    marginTop: 8,
    gap: 12,
  },
  quickLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
  },
  quickPrompts: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
  },
  promptChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
  },
  promptText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  inputBar: {
    borderTopWidth: 1,
    paddingTop: 8,
    paddingHorizontal: 12,
    gap: 6,
  },
  thinkingBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 2,
  },
  thinkingText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    maxHeight: 100,
    padding: 0,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
  },
  langBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  langFlag: {
    fontSize: 18,
    lineHeight: 22,
  },
  langPicker: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  langOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  langLabel: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
});
