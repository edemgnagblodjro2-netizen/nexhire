import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { Stack, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LinearGradient } from "@/components/SafeLinearGradient";
import { useLanguage } from "@/contexts/LanguageContext";
import { useColors } from "@/hooks/useColors";

type Status = "idle" | "loading" | "verified" | "expired" | "notfound" | "error";

type Result = {
  status: Status;
  registrationNumber?: string;
  expiryDate?: string; // YYYY-MM-DD
  hostName?: string;
  errorMessage?: string;
};

// Quebec tourist accommodation registration: 6 to 7 digit number issued by CITQ.
// Airbnb is legally required to display it for QC listings. The number and expiry
// date are usually present in the page HTML (server-rendered or in JSON blocks).
//
// Common patterns we look for in the HTML:
//   "registrationNumber":"309386"
//   "Numéro d'enregistrement : 309386"
//   "CITQ #309386"
//   "Registration: 309386"
// And expiry near it:
//   "expire le 2027-05-31" / "expiration":"2027-05-31"

const REG_PATTERNS: RegExp[] = [
  /"registrationNumber"\s*:\s*"(\d{5,8})"/i,
  /registration[^A-Za-z0-9]{0,5}(?:number|n[°o]|#)?\s*[:=]?\s*["']?(\d{5,8})/i,
  /num[ée]ro\s+d['’]enregistrement[^0-9]{0,15}(\d{5,8})/i,
  /CITQ[^0-9]{0,10}(\d{5,8})/i,
  /\bCPTAQ\b[^0-9]{0,10}(\d{5,8})/i,
];

const EXPIRY_PATTERNS: RegExp[] = [
  /"(?:expir(?:y|ation)Date|expiresOn|expiryDate)"\s*:\s*"(\d{4}-\d{2}-\d{2})"/i,
  /expir(?:e|ation|es)[^0-9]{0,20}(\d{4}-\d{2}-\d{2})/i,
  /expir(?:e|ation|es)[^0-9]{0,20}(\d{2}\/\d{2}\/\d{4})/i,
];

const HOST_PATTERNS: RegExp[] = [
  /"hostName"\s*:\s*"([^"]{1,80})"/i,
  /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']{1,120})["']/i,
];

function normalizeUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  try {
    const u = new URL(trimmed.startsWith("http") ? trimmed : "https://" + trimmed);
    if (!/airbnb\./i.test(u.hostname)) return null;
    // strip tracking
    return u.origin + u.pathname;
  } catch {
    return null;
  }
}

function parseExpiry(raw: string): string | null {
  // Accept YYYY-MM-DD or DD/MM/YYYY
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const m = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return null;
}

async function verifyAirbnbListing(rawUrl: string): Promise<Result> {
  const url = normalizeUrl(rawUrl);
  if (!url) {
    return {
      status: "error",
      errorMessage: "URL invalide. Collez un lien Airbnb (ex. https://www.airbnb.ca/rooms/...).",
    };
  }

  let html = "";
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
        "Accept-Language": "fr-CA,fr;q=0.9,en;q=0.8",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    if (!res.ok) {
      return {
        status: "error",
        errorMessage: `Airbnb a refusé la requête (code ${res.status}). Réessayez plus tard.`,
      };
    }
    html = await res.text();
  } catch (e: any) {
    return {
      status: "error",
      errorMessage:
        "Impossible de joindre Airbnb. Vérifiez votre connexion Internet et réessayez.",
    };
  }

  // Extract host name (best effort)
  let hostName: string | undefined;
  for (const p of HOST_PATTERNS) {
    const m = html.match(p);
    if (m && m[1]) {
      hostName = m[1].replace(/\\u002F/g, "/").trim();
      break;
    }
  }

  // Extract registration number
  let regNumber: string | undefined;
  for (const p of REG_PATTERNS) {
    const m = html.match(p);
    if (m && m[1]) {
      regNumber = m[1];
      break;
    }
  }

  if (!regNumber) {
    return {
      status: "notfound",
      hostName,
    };
  }

  // Extract expiry
  let expiry: string | undefined;
  for (const p of EXPIRY_PATTERNS) {
    const m = html.match(p);
    if (m && m[1]) {
      const norm = parseExpiry(m[1]);
      if (norm) {
        expiry = norm;
        break;
      }
    }
  }

  // Compare with today
  if (expiry) {
    const today = new Date().toISOString().slice(0, 10);
    if (expiry < today) {
      return {
        status: "expired",
        registrationNumber: regNumber,
        expiryDate: expiry,
        hostName,
      };
    }
  }

  return {
    status: "verified",
    registrationNumber: regNumber,
    expiryDate: expiry,
    hostName,
  };
}

export default function AirbnbVerifyScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { language } = useLanguage();
  const isFr = language === "fr";

  const [url, setUrl] = useState("");
  const [result, setResult] = useState<Result>({ status: "idle" });

  const t = {
    title: isFr ? "Vérifier un Airbnb" : "Verify an Airbnb",
    subtitle: isFr ? "Numéro d'enregistrement Québec (CITQ)" : "Quebec registration number (CITQ)",
    intro: isFr
      ? "Au Québec, tout logement Airbnb doit afficher un numéro d'enregistrement valide délivré par la CITQ. Collez le lien d'une annonce pour vérifier qu'il est bien enregistré et non expiré."
      : "In Quebec, every Airbnb listing must display a valid CITQ registration number. Paste a listing URL to verify it is properly registered and not expired.",
    placeholder: isFr ? "Collez le lien Airbnb ici…" : "Paste the Airbnb link here…",
    paste: isFr ? "Coller" : "Paste",
    verify: isFr ? "Vérifier le logement" : "Verify listing",
    checking: isFr ? "Vérification…" : "Checking…",
    verified: isFr ? "LOGEMENT VÉRIFIÉ" : "LISTING VERIFIED",
    expired: isFr ? "ENREGISTREMENT EXPIRÉ" : "REGISTRATION EXPIRED",
    notfound: isFr ? "AUCUN ENREGISTREMENT TROUVÉ" : "NO REGISTRATION FOUND",
    error: isFr ? "Erreur" : "Error",
    regNumber: isFr ? "Numéro d'enregistrement" : "Registration number",
    expires: isFr ? "Expire le" : "Expires on",
    host: isFr ? "Annonce" : "Listing",
    okHelp: isFr
      ? "Ce logement est légalement enregistré au Québec. Vous pouvez réserver en confiance."
      : "This listing is legally registered in Quebec. You can book with confidence.",
    expHelp: isFr
      ? "Le numéro existe mais sa date d'expiration est passée. Le logement n'est pas en règle actuellement."
      : "The number exists but its expiry date has passed. The listing is currently not in compliance.",
    nfHelp: isFr
      ? "Aucun numéro d'enregistrement n'a pu être détecté sur cette annonce. Soyez prudent : au Québec, c'est obligatoire. Vous pouvez signaler l'annonce à Revenu Québec."
      : "No registration number could be detected on this listing. Be careful: it is mandatory in Quebec. You can report the listing to Revenu Québec.",
    openCitq: isFr ? "Vérifier sur le registre CITQ" : "Check on CITQ registry",
    reset: isFr ? "Vérifier un autre lien" : "Check another link",
    legal: isFr
      ? "Cet outil consulte la page Airbnb publique. Les résultats sont fournis à titre indicatif. En cas de doute, consultez le registre officiel de la CITQ."
      : "This tool reads the public Airbnb page. Results are indicative only. When in doubt, check the official CITQ registry.",
  };

  const onPaste = async () => {
    try {
      const text = await Clipboard.getStringAsync();
      if (text) setUrl(text);
    } catch {
      // ignore
    }
  };

  const onVerify = async () => {
    if (!url.trim()) {
      Alert.alert(t.error, isFr ? "Veuillez coller un lien Airbnb." : "Please paste an Airbnb link.");
      return;
    }
    setResult({ status: "loading" });
    const r = await verifyAirbnbListing(url);
    setResult(r);
  };

  const reset = () => {
    setUrl("");
    setResult({ status: "idle" });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <LinearGradient
        colors={["#2563eb", "#1e3a8a"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color="#fff" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>{t.title}</Text>
            <Text style={styles.headerSubtitle}>{t.subtitle}</Text>
          </View>
          <View style={styles.headerEmoji}>
            <Text style={{ fontSize: 22 }}>🛡️</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.intro, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.introText, { color: colors.foreground }]}>{t.intro}</Text>
        </View>

        <View style={styles.inputBlock}>
          <TextInput
            value={url}
            onChangeText={setUrl}
            placeholder={t.placeholder}
            placeholderTextColor={colors.mutedForeground}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            multiline
            style={[
              styles.input,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                color: colors.foreground,
              },
            ]}
          />
          <Pressable
            onPress={onPaste}
            style={({ pressed }) => [
              styles.pasteBtn,
              { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Feather name="clipboard" size={14} color={colors.foreground} />
            <Text style={[styles.pasteText, { color: colors.foreground }]}>{t.paste}</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={onVerify}
          disabled={result.status === "loading"}
          style={({ pressed }) => [
            styles.cta,
            {
              backgroundColor: "#2563eb",
              opacity: pressed || result.status === "loading" ? 0.85 : 1,
            },
          ]}
        >
          {result.status === "loading" ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Feather name="search" size={18} color="#fff" />
          )}
          <Text style={styles.ctaText}>
            {result.status === "loading" ? t.checking : t.verify}
          </Text>
        </Pressable>

        {result.status === "verified" && (
          <ResultBlock
            color="#16a34a"
            bg="#dcfce7"
            border="#86efac"
            icon="check-circle"
            title={t.verified}
            help={t.okHelp}
          >
            <ResultRow label={t.regNumber} value={`#${result.registrationNumber}`} colors={colors} />
            {result.expiryDate && (
              <ResultRow label={t.expires} value={result.expiryDate} colors={colors} />
            )}
            {result.hostName && (
              <ResultRow label={t.host} value={result.hostName} colors={colors} />
            )}
          </ResultBlock>
        )}

        {result.status === "expired" && (
          <ResultBlock
            color="#ea580c"
            bg="#ffedd5"
            border="#fdba74"
            icon="alert-triangle"
            title={t.expired}
            help={t.expHelp}
          >
            <ResultRow label={t.regNumber} value={`#${result.registrationNumber}`} colors={colors} />
            {result.expiryDate && (
              <ResultRow label={t.expires} value={result.expiryDate} colors={colors} />
            )}
          </ResultBlock>
        )}

        {result.status === "notfound" && (
          <ResultBlock
            color="#dc2626"
            bg="#fee2e2"
            border="#fca5a5"
            icon="x-circle"
            title={t.notfound}
            help={t.nfHelp}
          >
            <Pressable
              onPress={() =>
                Linking.openURL(
                  "https://citq.qc.ca/fr/recherche_etablissements_hebergement.php"
                )
              }
              style={({ pressed }) => [
                styles.linkBtn,
                { borderColor: "#dc2626", opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Feather name="external-link" size={14} color="#dc2626" />
              <Text style={[styles.linkBtnText, { color: "#dc2626" }]}>{t.openCitq}</Text>
            </Pressable>
          </ResultBlock>
        )}

        {result.status === "error" && (
          <ResultBlock
            color="#dc2626"
            bg="#fee2e2"
            border="#fca5a5"
            icon="alert-circle"
            title={t.error}
            help={result.errorMessage || ""}
          />
        )}

        {(result.status === "verified" ||
          result.status === "expired" ||
          result.status === "notfound" ||
          result.status === "error") && (
          <Pressable
            onPress={reset}
            style={({ pressed }) => [
              styles.reset,
              { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Feather name="refresh-cw" size={14} color={colors.foreground} />
            <Text style={[styles.resetText, { color: colors.foreground }]}>{t.reset}</Text>
          </Pressable>
        )}

        <Text style={[styles.legal, { color: colors.mutedForeground }]}>{t.legal}</Text>
      </ScrollView>
    </View>
  );
}

function ResultRow({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: colors.foreground }]}>{value}</Text>
    </View>
  );
}

function ResultBlock({
  color,
  bg,
  border,
  icon,
  title,
  help,
  children,
}: {
  color: string;
  bg: string;
  border: string;
  icon: keyof typeof Feather.glyphMap;
  title: string;
  help: string;
  children?: React.ReactNode;
}) {
  return (
    <View style={[styles.resultBlock, { backgroundColor: bg, borderColor: border }]}>
      <View style={styles.resultHead}>
        <Feather name={icon} size={22} color={color} />
        <Text style={[styles.resultTitle, { color }]}>{title}</Text>
      </View>
      {!!help && <Text style={[styles.resultHelp, { color }]}>{help}</Text>}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingBottom: 18, paddingHorizontal: 16 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { color: "#fff", fontSize: 22, fontWeight: "800" },
  headerSubtitle: { color: "rgba(255,255,255,0.85)", fontSize: 13, marginTop: 2 },
  headerEmoji: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  intro: { padding: 14, borderWidth: 1, borderRadius: 14, marginBottom: 14 },
  introText: { fontSize: 13, lineHeight: 19 },
  inputBlock: { marginBottom: 12 },
  input: {
    minHeight: 80,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    textAlignVertical: "top",
  },
  pasteBtn: {
    alignSelf: "flex-end",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
  },
  pasteText: { fontSize: 13, fontWeight: "600" },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  ctaText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  resultBlock: {
    padding: 14,
    borderWidth: 1.5,
    borderRadius: 14,
    marginBottom: 12,
  },
  resultHead: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  resultTitle: { fontSize: 15, fontWeight: "800", letterSpacing: 0.5 },
  resultHelp: { fontSize: 13, lineHeight: 19, marginBottom: 10 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  rowLabel: { fontSize: 12, fontWeight: "600" },
  rowValue: { fontSize: 13, fontWeight: "700" },
  linkBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: "flex-start",
    marginTop: 6,
  },
  linkBtnText: { fontSize: 13, fontWeight: "700" },
  reset: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  resetText: { fontSize: 13, fontWeight: "600" },
  legal: { fontSize: 11, lineHeight: 16, textAlign: "center", marginTop: 8 },
});
