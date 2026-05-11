import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useLanguage } from "@/contexts/LanguageContext";
import { getApiBaseUrl } from "@/lib/apiBase";
import { useAuth } from "@/lib/auth";

interface ReferralResponse {
  code: string;
  claimedCount: number;
  createdAt: string;
}

export default function AmbassadorScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { language } = useLanguage();
  const { user, getToken } = useAuth();
  const isFr = language !== "en";

  const [data, setData] = useState<ReferralResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!user?.id) {
        setError(isFr ? "Connectez-vous pour obtenir votre code." : "Sign in to get your code.");
        setLoading(false);
        return;
      }
      try {
        const token = await getToken();
        if (!token) {
          setError(isFr ? "Connectez-vous pour obtenir votre code." : "Sign in to get your code.");
          setLoading(false);
          return;
        }
        const res = await fetch(`${getApiBaseUrl()}/api/referrals/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as ReferralResponse;
        if (!cancelled) setData(json);
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [user?.id, isFr, getToken]);

  const shareUrl = data ? `https://attentezero.ca/r/${data.code}` : "";

  async function copyCode() {
    if (!data) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Clipboard.setStringAsync(data.code);
    Alert.alert(
      isFr ? "Code copié" : "Code copied",
      isFr ? `« ${data.code} » est maintenant dans votre presse-papier.` : `"${data.code}" is now in your clipboard.`,
    );
  }

  async function shareLink() {
    if (!data) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({
        message: isFr
          ? `Découvrez AttenteZéro — un répertoire des services communautaires partout au Canada. Utilisez mon code « ${data.code} » : ${shareUrl}`
          : `Check out AttenteZéro — a directory of community services across Canada. Use my code "${data.code}": ${shareUrl}`,
      });
    } catch {
      // user cancelled
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={({ pressed }) => [styles.back, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Feather name="chevron-left" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>
          {isFr ? "Programme ambassadeur" : "Ambassador program"}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.heroIconWrap, { backgroundColor: "#0284c7" + "15" }]}>
          <Feather name="users" size={32} color="#0284c7" />
        </View>
        <Text style={[styles.heroTitle, { color: colors.foreground }]}>
          {isFr ? "Faites grandir AttenteZéro" : "Help AttenteZéro grow"}
        </Text>
        <Text style={[styles.heroDesc, { color: colors.mutedForeground }]}>
          {isFr
            ? "Partagez votre code avec vos proches. Chaque nouvelle personne aidée compte vers vos récompenses futures."
            : "Share your code with people around you. Every new person helped counts toward future rewards."}
        </Text>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : error ? (
          <View style={[styles.errorBox, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Feather name="alert-circle" size={18} color="#dc2626" />
            <Text style={[styles.errorText, { color: colors.foreground }]}>{error}</Text>
          </View>
        ) : data ? (
          <>
            <View
              style={[
                styles.codeBox,
                { borderColor: "#0284c7" + "40", backgroundColor: "#0284c7" + "08" },
              ]}
            >
              <Text style={[styles.codeLabel, { color: colors.mutedForeground }]}>
                {isFr ? "Votre code" : "Your code"}
              </Text>
              <Text style={[styles.codeText, { color: "#0284c7" }]}>{data.code}</Text>
              <Pressable
                onPress={copyCode}
                style={({ pressed }) => [styles.copyBtn, { opacity: pressed ? 0.7 : 1 }]}
              >
                <Feather name="copy" size={14} color="#0284c7" />
                <Text style={styles.copyText}>{isFr ? "Copier" : "Copy"}</Text>
              </Pressable>
            </View>

            <Pressable
              onPress={shareLink}
              style={({ pressed }) => [
                styles.shareBtn,
                { backgroundColor: "#0284c7", opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Feather name="share-2" size={18} color="#fff" />
              <Text style={styles.shareText}>
                {isFr ? "Partager mon lien" : "Share my link"}
              </Text>
            </Pressable>

            <View
              style={[
                styles.statBox,
                { borderColor: colors.border, backgroundColor: colors.card },
              ]}
            >
              <Text style={[styles.statValue, { color: colors.foreground }]}>
                {data.claimedCount}
              </Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
                {isFr
                  ? data.claimedCount === 1
                    ? "personne aidée grâce à vous"
                    : "personnes aidées grâce à vous"
                  : data.claimedCount === 1
                    ? "person helped thanks to you"
                    : "people helped thanks to you"}
              </Text>
            </View>

            <View style={[styles.benefits, { borderColor: colors.border, backgroundColor: colors.card }]}>
              <Text style={[styles.benefitsTitle, { color: colors.foreground }]}>
                {isFr ? "Comment ça marche" : "How it works"}
              </Text>
              {[
                isFr ? "Partagez votre code par message ou les réseaux sociaux." : "Share your code by message or social media.",
                isFr ? "Vos proches l'utilisent à l'inscription." : "People you invite use it when signing up.",
                isFr ? "Des récompenses (mois Premium offerts) s'activeront bientôt." : "Rewards (free Premium months) will activate soon.",
              ].map((line, i) => (
                <View key={i} style={styles.benefitRow}>
                  <View style={[styles.benefitNum, { backgroundColor: "#0284c7" }]}>
                    <Text style={styles.benefitNumText}>{i + 1}</Text>
                  </View>
                  <Text style={[styles.benefitText, { color: colors.foreground }]}>{line}</Text>
                </View>
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  back: { width: 24, alignItems: "flex-start" },
  title: { fontSize: 17, fontWeight: "700" },
  scroll: { paddingHorizontal: 16, paddingTop: 24, alignItems: "center" },
  heroIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  heroTitle: { fontSize: 22, fontWeight: "700", textAlign: "center", marginBottom: 8 },
  heroDesc: { fontSize: 14, lineHeight: 20, textAlign: "center", marginBottom: 24 },
  loadingBox: { paddingVertical: 32 },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    width: "100%",
  },
  errorText: { flex: 1, fontSize: 14 },
  codeBox: {
    width: "100%",
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    marginBottom: 12,
  },
  codeLabel: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1 },
  codeText: { fontSize: 38, fontWeight: "800", letterSpacing: 4, marginVertical: 8 },
  copyBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 6 },
  copyText: { color: "#0284c7", fontSize: 13, fontWeight: "600" },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 16,
  },
  shareText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  statBox: {
    width: "100%",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  statValue: { fontSize: 32, fontWeight: "800" },
  statLabel: { fontSize: 13, marginTop: 4, textAlign: "center" },
  benefits: {
    width: "100%",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    padding: 16,
  },
  benefitsTitle: { fontSize: 15, fontWeight: "700", marginBottom: 12 },
  benefitRow: { flexDirection: "row", gap: 12, marginBottom: 10 },
  benefitNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  benefitNumText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  benefitText: { flex: 1, fontSize: 14, lineHeight: 20 },
});
