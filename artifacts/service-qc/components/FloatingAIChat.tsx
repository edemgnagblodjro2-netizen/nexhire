import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { usePathname, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useLanguage } from "@/contexts/LanguageContext";
import { useColors } from "@/hooks/useColors";
import { getApiBaseUrl } from "@/lib/apiBase";
import { getAuthToken } from "@/lib/apiClient";
import { subscribeOpenAIChat } from "@/lib/aiChatBus";

type Msg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
  isQuotaExceeded?: boolean;
};

const SUGGESTIONS_FR = [
  "J'ai perdu mon emploi, que faire ?",
  "Comment trouver un logement à Montréal ?",
  "Où demander une aide alimentaire ?",
  "Numéro pour santé mentale 24h ?",
];

const SUGGESTIONS_EN = [
  "I just lost my job, what now?",
  "How do I find housing in Montreal?",
  "Where can I get food assistance?",
  "24/7 mental health hotline?",
];

// Routes where the floating bot should be hidden
const HIDDEN_ROUTES = [
  "/login",
  "/register",
  "/onboarding",
  "/forgot-password",
  "/reset-password",
  "/(tabs)/chat",
  "/chat",
];

export default function FloatingAIChat() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { language } = useLanguage();
  const isFr = language === "fr";

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<ScrollView | null>(null);

  // Permet aux autres écrans (ex: bouton CTA accueil) d'ouvrir le chat.
  useEffect(() => {
    return subscribeOpenAIChat(() => setOpen(true));
  }, []);

  // Hide button on certain screens
  const isHidden = HIDDEN_ROUTES.some(
    (r) => pathname === r || pathname.startsWith(r + "/"),
  );

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });
  }, []);

  useEffect(() => {
    if (open) scrollToBottom();
  }, [open, messages, scrollToBottom]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) return;

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      setInput("");

      const userMsg: Msg = {
        id: `u-${Date.now()}`,
        role: "user",
        content: trimmed,
      };
      const aiMsgId = `a-${Date.now()}`;
      const aiMsg: Msg = {
        id: aiMsgId,
        role: "assistant",
        content: "",
        isStreaming: true,
      };

      const history = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      setMessages((prev) => [...prev, userMsg, aiMsg]);
      setIsLoading(true);

      try {
        const authToken = await getAuthToken().catch(() => null);
        const response = await fetch(`${getApiBaseUrl()}/api/ai/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          },
          body: JSON.stringify({
            message: trimmed,
            language: isFr ? "fr" : "en",
            history,
            source: "floating",
          }),
        });

        if (!response.ok) {
          const errData = (await response.json().catch(() => ({}))) as {
            error?: string;
            quotaExceeded?: boolean;
            limit?: number;
          };
          // Quota exceeded → show a Premium upsell card instead of a generic error
          if (response.status === 429 && errData.quotaExceeded) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === aiMsgId
                  ? {
                      ...m,
                      content:
                        errData.error ||
                        (isFr
                          ? `Vous avez utilisé vos ${errData.limit ?? 15} questions gratuites. Passez à Premium pour continuer à discuter.`
                          : `You've reached your ${errData.limit ?? 15} free questions. Upgrade to Premium to continue chatting.`),
                      isStreaming: false,
                      isQuotaExceeded: true,
                    }
                  : m,
              ),
            );
            return;
          }
          throw new Error(errData.error || `HTTP ${response.status}`);
        }

        let accumulated = "";

        const supportsStreaming =
          !!response.body &&
          typeof (response.body as ReadableStream).getReader === "function";

        const consumeChunk = (chunk: string) => {
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
                      : m,
                  ),
                );
                scrollToBottom();
              }
              if (json.error) accumulated += `\n\n⚠️ ${json.error}`;
            } catch {
              /* skip malformed */
            }
          }
        };

        if (supportsStreaming) {
          const reader = (response.body as ReadableStream<Uint8Array>).getReader();
          const decoder = new TextDecoder();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            consumeChunk(decoder.decode(value, { stream: true }));
          }
        } else {
          consumeChunk(await response.text());
        }

        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMsgId
              ? {
                  ...m,
                  content:
                    accumulated ||
                    (isFr
                      ? "Désolé, je n'ai pas pu répondre. Réessayez."
                      : "Sorry, I couldn't respond. Please try again."),
                  isStreaming: false,
                }
              : m,
          ),
        );
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMsgId
              ? {
                  ...m,
                  content:
                    (isFr
                      ? "Désolé, une erreur est survenue."
                      : "Sorry, something went wrong.") +
                    (errMsg ? `\n\n(${errMsg})` : ""),
                  isStreaming: false,
                }
              : m,
          ),
        );
      } finally {
        setIsLoading(false);
        scrollToBottom();
      }
    },
    [isLoading, messages, isFr, scrollToBottom],
  );

  const openFullChat = () => {
    setOpen(false);
    setTimeout(() => router.push("/(tabs)/chat" as never), 80);
  };

  const handleOpen = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setOpen(true);
  };

  if (isHidden) return null;

  // Tab bar height varies by platform; lift the FAB above it.
  const tabBarBuffer = Platform.OS === "ios" ? 78 + insets.bottom : 70;
  const isDark = colors.background !== "#ffffff" && colors.background !== "#fff";
  const suggestions = isFr ? SUGGESTIONS_FR : SUGGESTIONS_EN;

  return (
    <>
      {/* ── Bouton flottant ── */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          isFr ? "Ouvrir l'assistant IA" : "Open AI assistant"
        }
        onPress={handleOpen}
        style={({ pressed }) => [
          styles.fab,
          {
            bottom: tabBarBuffer,
            transform: [{ scale: pressed ? 0.94 : 1 }],
          },
        ]}
        hitSlop={8}
      >
        <View style={styles.fabPulse} pointerEvents="none" />
        <Feather name="message-circle" size={24} color="#fff" />
        <View style={styles.fabBadge}>
          <Text style={styles.fabBadgeText}>IA</Text>
        </View>
      </Pressable>

      {/* ── Modal de chat compact ── */}
      <Modal
        visible={open}
        animationType="slide"
        transparent
        onRequestClose={() => setOpen(false)}
        statusBarTranslucent
      >
        <Pressable
          style={styles.backdrop}
          onPress={() => setOpen(false)}
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.sheetWrap}
          pointerEvents="box-none"
        >
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: colors.background,
                paddingBottom: Math.max(insets.bottom, 12),
              },
            ]}
          >
            {/* Handle */}
            <View
              style={[
                styles.handle,
                { backgroundColor: isDark ? "#444" : "#ddd" },
              ]}
            />

            {/* Header */}
            <View
              style={[
                styles.header,
                { borderBottomColor: colors.border },
              ]}
            >
              <View style={styles.headerLeft}>
                <View style={styles.headerIcon}>
                  <Feather name="cpu" size={16} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[styles.headerTitle, { color: colors.foreground }]}
                    numberOfLines={1}
                  >
                    {isFr ? "Assistant AttenteZéro" : "AttenteZéro Assistant"}
                  </Text>
                  <Text
                    style={[
                      styles.headerSub,
                      { color: colors.mutedForeground },
                    ]}
                    numberOfLines={1}
                  >
                    {isFr ? "Réponse immédiate · IA" : "Instant answer · AI"}
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={openFullChat}
                hitSlop={10}
                style={({ pressed }) => [
                  styles.expandBtn,
                  {
                    borderColor: colors.border,
                    opacity: pressed ? 0.6 : 1,
                  },
                ]}
                accessibilityLabel={
                  isFr ? "Ouvrir le chat complet" : "Open full chat"
                }
              >
                <Feather name="maximize-2" size={14} color={colors.foreground} />
              </Pressable>
              <Pressable
                onPress={() => setOpen(false)}
                hitSlop={10}
                style={({ pressed }) => [
                  styles.closeBtn,
                  {
                    backgroundColor: isDark ? "#222" : "#f3f4f6",
                    opacity: pressed ? 0.6 : 1,
                  },
                ]}
                accessibilityLabel={isFr ? "Fermer" : "Close"}
              >
                <Feather name="x" size={16} color={colors.foreground} />
              </Pressable>
            </View>

            {/* Messages */}
            <ScrollView
              ref={scrollRef}
              style={styles.messages}
              contentContainerStyle={styles.messagesContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {messages.length === 0 ? (
                <View style={styles.empty}>
                  <Text style={styles.emptyEmoji}>👋</Text>
                  <Text
                    style={[
                      styles.emptyTitle,
                      { color: colors.foreground },
                    ]}
                  >
                    {isFr
                      ? "Bonjour, comment puis-je vous aider ?"
                      : "Hi! How can I help you?"}
                  </Text>
                  <Text
                    style={[
                      styles.emptySub,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    {isFr
                      ? "Posez votre question — je trouve les bons services et numéros pour vous."
                      : "Ask anything — I'll find the right services and phone numbers for you."}
                  </Text>
                  <View style={styles.suggestions}>
                    {suggestions.map((s) => (
                      <Pressable
                        key={s}
                        onPress={() => sendMessage(s)}
                        style={({ pressed }) => [
                          styles.sugChip,
                          {
                            backgroundColor: colors.card,
                            borderColor: colors.border,
                            opacity: pressed ? 0.7 : 1,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.sugText,
                            { color: colors.foreground },
                          ]}
                          numberOfLines={2}
                        >
                          {s}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ) : (
                messages.map((m) => (
                  <View
                    key={m.id}
                    style={[
                      styles.bubble,
                      m.role === "user"
                        ? [styles.bubbleUser, { backgroundColor: colors.primary }]
                        : [
                            styles.bubbleAi,
                            {
                              backgroundColor: isDark ? "#1c1c1e" : "#f3f4f6",
                            },
                          ],
                    ]}
                  >
                    <Text
                      style={[
                        styles.bubbleText,
                        {
                          color:
                            m.role === "user" ? "#fff" : colors.foreground,
                        },
                      ]}
                    >
                      {m.content || (m.isStreaming ? "…" : "")}
                    </Text>
                    {m.isStreaming && m.role === "assistant" && (
                      <ActivityIndicator
                        size="small"
                        color={colors.mutedForeground}
                        style={{ marginTop: 6, alignSelf: "flex-start" }}
                      />
                    )}
                    {m.isQuotaExceeded && (
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => {
                          setOpen(false);
                          setTimeout(
                            () => router.push("/premium" as never),
                            80,
                          );
                        }}
                        style={({ pressed }) => [
                          styles.premiumCta,
                          { opacity: pressed ? 0.85 : 1 },
                        ]}
                      >
                        <Feather name="star" size={15} color="#fff" />
                        <Text style={styles.premiumCtaText}>
                          {isFr
                            ? "Passer à Premium"
                            : "Upgrade to Premium"}
                        </Text>
                      </Pressable>
                    )}
                  </View>
                ))
              )}
            </ScrollView>

            {/* Input bar */}
            <View
              style={[
                styles.inputBar,
                {
                  borderTopColor: colors.border,
                  backgroundColor: colors.background,
                },
              ]}
            >
              <TextInput
                value={input}
                onChangeText={setInput}
                placeholder={
                  isFr ? "Posez votre question…" : "Ask your question…"
                }
                placeholderTextColor={colors.mutedForeground}
                style={[
                  styles.input,
                  {
                    color: colors.foreground,
                    backgroundColor: isDark ? "#1c1c1e" : "#f3f4f6",
                    borderColor: colors.border,
                  },
                ]}
                multiline
                maxLength={500}
                returnKeyType="send"
                blurOnSubmit
                onSubmitEditing={() => sendMessage(input)}
                editable={!isLoading}
              />
              <Pressable
                onPress={() => sendMessage(input)}
                disabled={!input.trim() || isLoading}
                style={({ pressed }) => [
                  styles.sendBtn,
                  {
                    backgroundColor:
                      !input.trim() || isLoading
                        ? isDark
                          ? "#333"
                          : "#e5e7eb"
                        : colors.primary,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
                accessibilityLabel={isFr ? "Envoyer" : "Send"}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Feather
                    name="send"
                    size={16}
                    color={!input.trim() ? colors.mutedForeground : "#fff"}
                  />
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  /* ── Floating button ── */
  fab: {
    position: "absolute",
    right: 16,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#0e7e6e",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
  },
  fabPulse: {
    position: "absolute",
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#0e7e6e",
    opacity: 0.35,
    transform: [{ scale: 1.15 }],
  },
  fabBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: "#dc2626",
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
    minWidth: 18,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#fff",
  },
  fabBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "800",
  },

  /* ── Modal sheet ── */
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheetWrap: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    height: "78%",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 8,
    marginBottom: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#0e7e6e",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: "800",
  },
  headerSub: {
    fontSize: 11,
    marginTop: 1,
  },
  expandBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  /* Messages */
  messages: { flex: 1 },
  messagesContent: { padding: 14, gap: 8 },
  empty: { alignItems: "center", paddingHorizontal: 12, paddingTop: 18 },
  emptyEmoji: { fontSize: 38, marginBottom: 8 },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 18,
    maxWidth: 320,
  },
  suggestions: {
    flexDirection: "column",
    width: "100%",
    gap: 8,
  },
  sugChip: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  sugText: { fontSize: 13, fontWeight: "600" },

  bubble: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
    maxWidth: "86%",
  },
  bubbleUser: {
    alignSelf: "flex-end",
    borderBottomRightRadius: 4,
  },
  bubbleAi: {
    alignSelf: "flex-start",
    borderBottomLeftRadius: 4,
  },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  premiumCta: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#0e7e6e",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    alignSelf: "stretch",
  },
  premiumCtaText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },

  /* Input */
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 110,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 14,
    lineHeight: 18,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});
