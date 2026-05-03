import { Feather } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import React from "react";
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LinearGradient } from "@/components/SafeLinearGradient";
import { useLanguage } from "@/contexts/LanguageContext";
import { useColors } from "@/hooks/useColors";

type Mover = {
  name: string;
  noteFr: string;
  noteEn: string;
  url?: string;
  phone?: string;
};

type Section = {
  titleFr: string;
  titleEn: string;
  emoji: string;
  movers: Mover[];
};

const SECTIONS: Section[] = [
  {
    titleFr: "🏆 Incontournables (provincial)",
    titleEn: "🏆 Top picks (province-wide)",
    emoji: "🏆",
    movers: [
      {
        name: "Le Clan Panneton",
        noteFr: "Institution québécoise — fiable sur les longues distances.",
        noteEn: "Quebec institution — reliable for long distances.",
        url: "https://www.demenagementleclanpanneton.com",
        phone: "1-844-937-0707",
      },
      {
        name: "Déménagement et Entreposage DG — Ville de Québec",
        noteFr: "Leader résidentiel et commercial — 4.9/5 sur Google (1 397 avis).",
        noteEn: "Residential and commercial leader — 4.9/5 on Google (1,397 reviews).",
        url: "https://www.demenagementdg.com",
        phone: "418-809-3190",
      },
      {
        name: "Déménagement La Capitale",
        noteFr: "Spécialiste Québec ↔ Montréal et autres régions.",
        noteEn: "Specialist Quebec City ↔ Montreal and other regions.",
        url: "https://www.demenagementlacapitale.com",
        phone: "1-800-808-7128",
      },
      {
        name: "Déménagement Total",
        noteFr: "Recommandé pour projets complexes et inter-provinces.",
        noteEn: "Recommended for complex and inter-provincial moves.",
        url: "https://demenagement-total.ca",
        phone: "514-652-7955",
      },
    ],
  },
  {
    titleFr: "🏙️ Montréal / Laval",
    titleEn: "🏙️ Montreal / Laval",
    emoji: "🏙️",
    movers: [
      {
        name: "Déménagement Puissance",
        noteFr: "Résidentiel haut de gamme.",
        noteEn: "High-end residential.",
        url: "https://demenagementpuissance.com",
        phone: "438-520-7070",
      },
      {
        name: "Déménagement EBL",
        noteFr: "Résidentiel et commercial — Mirabel / Grand Montréal (4.8/5).",
        noteEn: "Residential and commercial — Mirabel / Greater Montreal (4.8/5).",
        url: "https://www.ebldemenagement.ca",
        phone: "514-817-9127",
      },
      {
        name: "Déménagement Sympathique",
        noteFr: "Service rapide, équipe professionnelle (5.0/5 sur Google).",
        noteEn: "Fast service, professional crew (5.0/5 on Google).",
        phone: "514-728-0421",
      },
      {
        name: "Déménagement Général",
        noteFr: "Île de Montréal, Rive-Nord, Rive-Sud — résidentiel et commercial.",
        noteEn: "Montreal Island, North Shore, South Shore — residential and commercial.",
        url: "https://www.demenagementgeneral.ca",
        phone: "514-581-8884",
      },
      {
        name: "Crown Movers — Montréal",
        noteFr: "Longue distance et international (Allied Van Lines). Ouvert 24h. 5.0/5 sur Google.",
        noteEn: "Long-distance and international (Allied Van Lines). Open 24h. 5.0/5 on Google.",
        url: "https://www.crownmovers.ca",
        phone: "514-606-4030",
      },
    ],
  },
  {
    titleFr: "⚜️ Ville de Québec",
    titleEn: "⚜️ Quebec City",
    emoji: "⚜️",
    movers: [
      {
        name: "Armstrong Déménagement",
        noteFr: "Haut de gamme — résidentiel, commercial, international (4.7/5).",
        noteEn: "High-end — residential, commercial, international (4.7/5).",
        url: "https://www.armstrong.ca",
        phone: "581-629-1535",
      },
      {
        name: "Déménagement Pro-Efficace",
        noteFr: "Reconnu dans la région de Québec (4.4/5).",
        noteEn: "Well known in Quebec City region (4.4/5).",
        phone: "581-397-4737",
      },
    ],
  },
  {
    titleFr: "🌉 Trois-Rivières / Mauricie",
    titleEn: "🌉 Trois-Rivières / Mauricie",
    emoji: "🌉",
    movers: [
      {
        name: "Transport & Déménagement Dany St-Germain",
        noteFr: "Familial bien établi à Trois-Rivières (4.0/5).",
        noteEn: "Family-run, well established in Trois-Rivières (4.0/5).",
        phone: "819-266-9665",
      },
      {
        name: "Déménagement Pro LD",
        noteFr: "Service résidentiel à Trois-Rivières (4.7/5 sur Google, 167 avis).",
        noteEn: "Residential service in Trois-Rivières (4.7/5 on Google, 167 reviews).",
        phone: "819-384-3078",
      },
    ],
  },
  {
    titleFr: "🍁 Sherbrooke / Estrie",
    titleEn: "🍁 Sherbrooke / Eastern Townships",
    emoji: "🍁",
    movers: [
      {
        name: "Déménagement de l'Estrie",
        noteFr: "Local — Sherbrooke et toute l'Estrie.",
        noteEn: "Local — Sherbrooke and all of Estrie.",
        phone: "819-565-9595",
      },
    ],
  },
  {
    titleFr: "🌊 Rive-Sud de Montréal",
    titleEn: "🌊 South Shore of Montreal",
    emoji: "🌊",
    movers: [
      {
        name: "Gustave Déménagement",
        noteFr: "Réputé sur la Rive-Sud (Longueuil, Brossard, Saint-Hubert).",
        noteEn: "Reputable on the South Shore (Longueuil, Brossard, Saint-Hubert).",
        phone: "450-650-1133",
      },
      {
        name: "Déménagement Longueuil",
        noteFr: "Local — résidentiel et petits commerciaux.",
        noteEn: "Local — residential and small commercial.",
        phone: "450-616-8585",
      },
    ],
  },
];

type Link = {
  titleFr: string;
  titleEn: string;
  url: string;
  emoji: string;
};

const VERIFY_LINKS: Link[] = [
  {
    titleFr: "CTQ — Vérifier le permis de transport",
    titleEn: "CTQ — Verify the transport permit",
    url: "https://www.ctq.gouv.qc.ca",
    emoji: "✅",
  },
  {
    titleFr: "OPC — Vérifier les plaintes",
    titleEn: "OPC — Check complaints",
    url: "https://www.opc.gouv.qc.ca",
    emoji: "🛡️",
  },
];

const COMPARE_LINKS: Link[] = [
  {
    titleFr: "411 Déménageur — Annuaire QC",
    titleEn: "411 Déménageur — QC directory",
    url: "https://www.411demenageur.ca",
    emoji: "📞",
  },
  {
    titleFr: "Soumissions Déménageurs — Comparer 3 prix",
    titleEn: "Soumissions Déménageurs — Compare 3 quotes",
    url: "https://soumissionsdemenageurs.ca/meilleurs-demenageurs-quebec/",
    emoji: "💰",
  },
  {
    titleFr: "Sirelo — Avis & comparateur",
    titleEn: "Sirelo — Reviews & comparison",
    url: "https://ca.sirelo.org/fr/demenageur/montreal/",
    emoji: "⭐",
  },
  {
    titleFr: "Mover.net — Déménagement international",
    titleEn: "Mover.net — International moving",
    url: "https://www.mover.net/fr/find-a-mover/international-moving",
    emoji: "🌍",
  },
  {
    titleFr: "Déménagement Myette — Top déménageurs",
    titleEn: "Déménagement Myette — Top movers",
    url: "https://www.demenagementmyette.ca/meilleurs-demenageurs/",
    emoji: "🏅",
  },
  {
    titleFr: "Top 10 Déménageurs Québec — Prix",
    titleEn: "Top 10 Movers Quebec — Prices",
    url: "https://topcompagniesdemenagement.ca/top-10-demenageurs-quebec-prix/",
    emoji: "📊",
  },
];

export default function DemenagementScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { language } = useLanguage();
  const isFr = language === "fr";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <LinearGradient
        colors={["#a16207", "#713f12"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color="#fff" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>
              {isFr ? "Déménagement" : "Moving"}
            </Text>
            <Text style={styles.headerSubtitle}>
              {isFr
                ? "Meilleurs déménageurs du Québec"
                : "Best movers in Quebec"}
            </Text>
          </View>
          <View style={styles.headerEmoji}>
            <Text style={{ fontSize: 24 }}>📦</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Conseil pro 1er juillet */}
        <View
          style={[
            styles.tip,
            { backgroundColor: "#fef3c7", borderColor: "#fcd34d" },
          ]}
        >
          <Text style={{ fontSize: 22 }}>⚠️</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.tipTitle, { color: "#78350f" }]}>
              {isFr ? "Conseil pro — 1er juillet" : "Pro tip — July 1st"}
            </Text>
            <Text style={[styles.tipText, { color: "#78350f" }]}>
              {isFr
                ? "Si vous déménagez durant la fête du déménagement (1er juillet), réservez 4 à 6 mois d'avance. Les tarifs peuvent doubler ou tripler cette semaine-là."
                : "If you move on July 1st (Quebec moving day), book 4-6 months ahead. Prices can double or triple that week."}
            </Text>
          </View>
        </View>

        {/* Sections par région */}
        {SECTIONS.map((section) => (
          <View key={section.titleFr} style={{ marginBottom: 22 }}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              {isFr ? section.titleFr : section.titleEn}
            </Text>
            {section.movers.map((m) => (
              <View
                key={m.name}
                style={[
                  styles.moverCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.moverName, { color: colors.foreground }]}>
                  {m.name}
                </Text>
                <Text style={[styles.moverNote, { color: colors.mutedForeground }]}>
                  {isFr ? m.noteFr : m.noteEn}
                </Text>
                <View style={styles.moverActions}>
                  {m.phone && (
                    <Pressable
                      onPress={() => Linking.openURL(`tel:${m.phone!.replace(/[^0-9+]/g, "")}`)}
                      style={({ pressed }) => [
                        styles.moverBtn,
                        {
                          backgroundColor: "#a16207",
                          opacity: pressed ? 0.8 : 1,
                        },
                      ]}
                    >
                      <Feather name="phone" size={13} color="#fff" />
                      <Text style={styles.moverBtnText}>{m.phone}</Text>
                    </Pressable>
                  )}
                  {m.url && (
                    <Pressable
                      onPress={() => Linking.openURL(m.url!)}
                      style={({ pressed }) => [
                        styles.moverBtnOutline,
                        { borderColor: colors.border, opacity: pressed ? 0.6 : 1 },
                      ]}
                    >
                      <Feather name="external-link" size={13} color={colors.foreground} />
                      <Text style={[styles.moverBtnOutlineText, { color: colors.foreground }]}>
                        {isFr ? "Site web" : "Website"}
                      </Text>
                    </Pressable>
                  )}
                </View>
              </View>
            ))}
          </View>
        ))}

        {/* Vérification */}
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          {isFr ? "🔎 Vérifier la légitimité" : "🔎 Verify legitimacy"}
        </Text>
        <View
          style={[
            styles.intro,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.introText, { color: colors.foreground }]}>
            {isFr
              ? "Avant de signer, assurez-vous que l'entreprise est inscrite à la CTQ (permis obligatoire) et n'a pas de plaintes à l'OPC."
              : "Before signing, make sure the company is registered with CTQ (required permit) and has no complaints at OPC."}
          </Text>
        </View>

        {VERIFY_LINKS.map((l) => (
          <Pressable
            key={l.url}
            onPress={() => Linking.openURL(l.url)}
            style={({ pressed }) => [
              styles.linkRow,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                opacity: pressed ? 0.6 : 1,
              },
            ]}
          >
            <Text style={{ fontSize: 18 }}>{l.emoji}</Text>
            <Text style={[styles.linkText, { color: colors.foreground }]}>
              {isFr ? l.titleFr : l.titleEn}
            </Text>
            <Feather name="external-link" size={16} color={colors.mutedForeground} />
          </Pressable>
        ))}

        {/* Comparateurs / annuaires — section séparée */}
        <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 18 }]}>
          {isFr ? "🔗 Comparateurs & annuaires" : "🔗 Comparators & directories"}
        </Text>
        <View
          style={[
            styles.intro,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.introText, { color: colors.foreground }]}>
            {isFr
              ? "Pour comparer les prix et lire les avis, utilisez ces plateformes spécialisées."
              : "To compare prices and read reviews, use these specialized platforms."}
          </Text>
        </View>

        {COMPARE_LINKS.map((l) => (
          <Pressable
            key={l.url}
            onPress={() => Linking.openURL(l.url)}
            style={({ pressed }) => [
              styles.linkRow,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                opacity: pressed ? 0.6 : 1,
              },
            ]}
          >
            <Text style={{ fontSize: 18 }}>{l.emoji}</Text>
            <Text style={[styles.linkText, { color: colors.foreground }]}>
              {isFr ? l.titleFr : l.titleEn}
            </Text>
            <Feather name="external-link" size={16} color={colors.mutedForeground} />
          </Pressable>
        ))}

        <Text style={[styles.legal, { color: colors.mutedForeground }]}>
          {isFr
            ? "ℹ️ Liste basée sur les données de réputation 2026. AttenteZéro n'a aucun lien commercial avec ces entreprises. Demandez toujours plusieurs soumissions et vérifiez le permis CTQ avant de signer."
            : "ℹ️ List based on 2026 reputation data. AttenteZéro has no commercial ties with these companies. Always get multiple quotes and verify the CTQ permit before signing."}
        </Text>
      </ScrollView>
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
  tip: {
    flexDirection: "row",
    gap: 12,
    padding: 14,
    borderWidth: 1,
    borderRadius: 14,
    marginBottom: 18,
  },
  tipTitle: { fontSize: 14, fontWeight: "800", marginBottom: 4 },
  tipText: { fontSize: 13, lineHeight: 18 },
  sectionTitle: { fontSize: 16, fontWeight: "800", marginBottom: 10, marginTop: 4 },
  moverCard: {
    padding: 12,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 8,
  },
  moverName: { fontSize: 15, fontWeight: "700", marginBottom: 4 },
  moverNote: { fontSize: 13, lineHeight: 18, marginBottom: 8 },
  moverActions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  moverBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  moverBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  moverBtnOutline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  moverBtnOutlineText: { fontSize: 13, fontWeight: "600" },
  intro: { padding: 14, borderWidth: 1, borderRadius: 12, marginBottom: 12 },
  introText: { fontSize: 13, lineHeight: 19 },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 8,
  },
  linkText: { flex: 1, fontSize: 14, fontWeight: "600" },
  legal: { fontSize: 11, lineHeight: 16, textAlign: "center", marginTop: 12, fontStyle: "italic" },
});
