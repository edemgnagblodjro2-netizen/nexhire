import { Feather } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import React from "react";
import {
  Linking,
  Platform,
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

type Theme = {
  key: string;
  emoji: string;
  titleFr: string;
  titleEn: string;
  items: {
    name: string;
    location: string;
    descFr: string;
    descEn: string;
  }[];
};

const THEMES: Theme[] = [
  {
    key: "urbain",
    emoji: "🏙️",
    titleFr: "Incontournables urbains et historiques",
    titleEn: "Urban & Historical Must-Sees",
    items: [
      {
        name: "Le Vieux-Québec",
        location: "Ville de Québec",
        descFr: "Seule ville fortifiée au nord du Mexique. Site UNESCO célèbre pour ses rues pavées, le quartier Petit Champlain et l'emblématique Fairmont Le Château Frontenac.",
        descEn: "Only fortified city north of Mexico. UNESCO site famous for its cobbled streets, Petit Champlain district and the iconic Fairmont Le Château Frontenac.",
      },
      {
        name: "Le Vieux-Montréal",
        location: "Montréal",
        descFr: "Mélange de charme européen et de modernité, avec la Basilique Notre-Dame et le Vieux-Port.",
        descEn: "Blend of European charm and modernity, with the Notre-Dame Basilica and the Old Port.",
      },
      {
        name: "Le Mont-Royal",
        location: "Montréal",
        descFr: "Offre la plus belle vue panoramique sur la métropole.",
        descEn: "Offers the most beautiful panoramic view of the metropolis.",
      },
      {
        name: "La Citadelle de Québec",
        location: "Québec",
        descFr: "Une forteresse active riche en histoire militaire, située sur les Plaines d'Abraham.",
        descEn: "An active fortress rich in military history, located on the Plains of Abraham.",
      },
    ],
  },
  {
    key: "nature",
    emoji: "🌊",
    titleFr: "Merveilles naturelles et parcs",
    titleEn: "Natural Wonders & Parks",
    items: [
      {
        name: "Parc de la Chute-Montmorency",
        location: "Près de Québec",
        descFr: "Chute située à 15 minutes de Québec, 83 mètres plus haute que celles du Niagara.",
        descEn: "Waterfall 15 minutes from Quebec City, 83 meters higher than Niagara Falls.",
      },
      {
        name: "Rocher Percé et Île Bonaventure",
        location: "Gaspésie",
        descFr: "Symbole emblématique de la Gaspésie, accueillant l'une des plus grandes colonies de fous de Bassan au monde.",
        descEn: "Iconic symbol of Gaspésie, home to one of the world's largest gannet colonies.",
      },
      {
        name: "Fjord du Saguenay",
        location: "Saguenay",
        descFr: "Paysage spectaculaire de falaises plongeant dans l'eau, idéal pour le kayak et la randonnée.",
        descEn: "Spectacular landscape of cliffs plunging into the water, ideal for kayaking and hiking.",
      },
      {
        name: "Parc national de la Mauricie",
        location: "Mauricie",
        descFr: "Paradis de forêts et de lacs (plus de 150 !) parfait pour le canoë-camping.",
        descEn: "Paradise of forests and lakes (over 150!) perfect for canoe-camping.",
      },
    ],
  },
  {
    key: "experiences",
    emoji: "🐋",
    titleFr: "Expériences uniques",
    titleEn: "Unique Experiences",
    items: [
      {
        name: "Tadoussac",
        location: "Estuaire du Saint-Laurent",
        descFr: "Réputé mondialement pour l'observation des baleines dans l'estuaire du Saint-Laurent.",
        descEn: "World-renowned for whale watching in the St. Lawrence estuary.",
      },
      {
        name: "Village Vacances Valcartier",
        location: "Près de Québec",
        descFr: "Immense complexe de jeux aquatiques (été) et glissades sur neige (hiver), abritant aussi l'Hôtel de Glace.",
        descEn: "Huge water park (summer) and snow slides (winter), also home to the Ice Hotel.",
      },
      {
        name: "Zoo Sauvage de Saint-Félicien",
        location: "Saguenay—Lac-Saint-Jean",
        descFr: "Pour observer la faune canadienne en quasi-liberté (ours, orignaux, loups).",
        descEn: "Observe Canadian wildlife in near-freedom (bears, moose, wolves).",
      },
      {
        name: "Wendake",
        location: "Près de Québec",
        descFr: "Pour découvrir la culture et l'histoire de la nation Huronne-Wendat.",
        descEn: "Discover the culture and history of the Huron-Wendat Nation.",
      },
    ],
  },
  {
    key: "culture",
    emoji: "🎨",
    titleFr: "Culture et patrimoine",
    titleEn: "Culture & Heritage",
    items: [
      {
        name: "Musée de la civilisation",
        location: "Québec",
        descFr: "Expositions interactives sur l'histoire humaine et québécoise.",
        descEn: "Interactive exhibitions on human and Québec history.",
      },
      {
        name: "Sanctuaire de Sainte-Anne-de-Beaupré",
        location: "Près de Québec",
        descFr: "Lieu de pèlerinage historique impressionnant par son architecture.",
        descEn: "Historic pilgrimage site, architecturally impressive.",
      },
      {
        name: "Jardin botanique de Montréal",
        location: "Montréal",
        descFr: "L'un des plus importants au monde, situé à côté du Biodôme et du Stade Olympique.",
        descEn: "One of the largest in the world, next to the Biodôme and Olympic Stadium.",
      },
    ],
  },
];

const RESOURCES: { label: string; url: string }[] = [
  { label: "Parcours Canada — Top 10 incontournables", url: "https://www.parcourscanada.com/blogue/a-voir-et-a-faire-au-quebec-top-10-des-incontournables" },
  { label: "Québec Cité — Site officiel", url: "https://quebec-cite.com/en" },
  { label: "GetYourGuide — Sites et monuments", url: "https://getyourguide.com/quebec-l281/sites-et-monuments-tc1146/" },
  { label: "Déménagement Alex — 15 meilleures attractions", url: "https://demenagement-alex.ca/15-meilleures-attractions-touristiques-du-quebec/" },
  { label: "Petit Futé — 17 plus beaux endroits", url: "https://www.petitfute.com/r146-quebec/actualite/m17-top-10-insolites-voyage/a40333-que-faire-que-voir-au-quebec-les-17-plus-beaux-endroits-a-visiter.html" },
  { label: "Québec le Mag — Visiter Québec", url: "https://www.quebeclemag.com/visiter-quebec/" },
  { label: "Canada en Liberté — Top 10", url: "https://www.canada-en-liberte.com/conseils-voyage/que-faire/top-10-incontournables-quebec" },
];

export default function TourismeScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { language } = useLanguage();
  const isFr = language === "fr";

  const openLink = (url: string) => {
    Linking.openURL(url).catch(() => {});
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <LinearGradient
        colors={["#db2777", "#9d174d"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={styles.backBtn}
          >
            <Feather name="arrow-left" size={22} color="#fff" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>
              {isFr ? "Tourisme au Québec" : "Tourism in Quebec"}
            </Text>
            <Text style={styles.headerSubtitle}>
              {isFr
                ? "Lieux incontournables à visiter"
                : "Must-see destinations"}
            </Text>
          </View>
          <View style={styles.headerEmoji}>
            <Text style={{ fontSize: 24 }}>📷</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.intro, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.introText, { color: colors.foreground }]}>
            {isFr
              ? "Le Québec regorge de trésors, qu'ils soient historiques, urbains ou sauvages. Voici une sélection des sites incontournables classés par thématique pour vous aider à planifier votre visite."
              : "Quebec is full of treasures — historical, urban or wild. Here is a selection of must-see sites organized by theme to help you plan your visit."}
          </Text>
        </View>

        {THEMES.map((theme) => (
          <View key={theme.key} style={styles.themeBlock}>
            <View style={styles.themeHead}>
              <Text style={styles.themeEmoji}>{theme.emoji}</Text>
              <Text style={[styles.themeTitle, { color: colors.foreground }]}>
                {isFr ? theme.titleFr : theme.titleEn}
              </Text>
            </View>

            {theme.items.map((it, idx) => (
              <View
                key={idx}
                style={[
                  styles.card,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <View style={styles.cardTitleRow}>
                  <View style={[styles.dot, { backgroundColor: "#db2777" }]} />
                  <Text style={[styles.cardTitle, { color: colors.foreground }]}>
                    {it.name}
                  </Text>
                </View>
                <View style={styles.cardLocation}>
                  <Feather name="map-pin" size={12} color={colors.mutedForeground} />
                  <Text style={[styles.cardLocationText, { color: colors.mutedForeground }]}>
                    {it.location}
                  </Text>
                </View>
                <Text style={[styles.cardDesc, { color: colors.foreground }]}>
                  {isFr ? it.descFr : it.descEn}
                </Text>
              </View>
            ))}
          </View>
        ))}

        <View style={[styles.tip, { backgroundColor: "#fce7f3", borderColor: "#f9a8d4" }]}>
          <Text style={{ fontSize: 18 }}>🍁</Text>
          <Text style={[styles.tipText, { color: "#831843" }]}>
            {isFr
              ? "Conseil d'ami : si vous visitez en automne, ne manquez pas Charlevoix ou les Cantons-de-l'Est pour admirer les couleurs flamboyantes des érables."
              : "Friendly tip: if visiting in autumn, don't miss Charlevoix or the Eastern Townships to admire the flaming colors of the maple trees."}
          </Text>
        </View>

        <View style={styles.resourcesBlock}>
          <Text style={[styles.resourcesTitle, { color: colors.foreground }]}>
            {isFr ? "Ressources externes" : "External resources"}
          </Text>
          <Text style={[styles.resourcesSubtitle, { color: colors.mutedForeground }]}>
            {isFr ? "Pour aller plus loin et planifier votre voyage" : "To go further and plan your trip"}
          </Text>
          {RESOURCES.map((r, i) => (
            <Pressable
              key={i}
              onPress={() => openLink(r.url)}
              style={({ pressed }) => [
                styles.resource,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <View style={[styles.resourceIcon, { backgroundColor: "#fce7f3" }]}>
                <Feather name="external-link" size={16} color="#db2777" />
              </View>
              <Text
                style={[styles.resourceText, { color: colors.foreground }]}
                numberOfLines={2}
              >
                {r.label}
              </Text>
              <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingBottom: 18,
    paddingHorizontal: 16,
  },
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
  intro: {
    padding: 14,
    borderWidth: 1,
    borderRadius: 14,
    marginBottom: 18,
  },
  introText: { fontSize: 14, lineHeight: 20 },
  themeBlock: { marginBottom: 18 },
  themeHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  themeEmoji: { fontSize: 22 },
  themeTitle: { fontSize: 17, fontWeight: "800", flex: 1 },
  card: {
    padding: 14,
    borderWidth: 1,
    borderRadius: 14,
    marginBottom: 10,
  },
  cardTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  cardTitle: { fontSize: 15, fontWeight: "700", flex: 1 },
  cardLocation: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 8 },
  cardLocationText: { fontSize: 12 },
  cardDesc: { fontSize: 13, lineHeight: 19 },
  tip: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
    marginBottom: 18,
  },
  tipText: { flex: 1, fontSize: 13, lineHeight: 19, fontStyle: "italic" },
  resourcesBlock: { marginTop: 4 },
  resourcesTitle: { fontSize: 17, fontWeight: "800", marginBottom: 4 },
  resourcesSubtitle: { fontSize: 12, marginBottom: 12 },
  resource: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 8,
  },
  resourceIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  resourceText: { flex: 1, fontSize: 13, fontWeight: "600" },
});
