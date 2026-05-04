import { Feather } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useLanguage } from "@/contexts/LanguageContext";
import { useColors } from "@/hooks/useColors";

type Action = {
  labelFr: string;
  labelEn: string;
  url?: string;
  phone?: string;
  kind: "tel" | "url";
};

type SubItem = { emoji: string; labelFr: string; labelEn: string };

type Destination = {
  city: string;
  emoji: string;
  sitesFr: string[];
  sitesEn: string[];
};

type Tag =
  | "Obligatoire"
  | "Recommandé"
  | "Pratique"
  | "Hébergement"
  | "Transport"
  | "Connectivité"
  | "Tourisme"
  | "Gastronomie"
  | "Nature"
  | "Culture"
  | "Urgences"
  | "Officiel"
  | "Info"
  | "Légal";

type Step = {
  emoji: string;
  titleFr: string;
  titleEn: string;
  bodyFr: string;
  bodyEn: string;
  tag: Tag;
  actions?: Action[];
  subItems?: SubItem[];
  destinations?: Destination[];
};

type Phase = {
  id: string;
  emoji: string;
  labelFr: string;
  labelEn: string;
  color: string;
  steps: Step[];
};

const PHASES: Phase[] = [
  {
    id: "avant",
    emoji: "✈️",
    labelFr: "Avant le départ",
    labelEn: "Before departure",
    color: "#E8572A",
    steps: [
      {
        emoji: "🛂",
        titleFr: "AVE / eTA",
        titleEn: "eTA",
        bodyFr:
          "Autorisation de Voyage Électronique obligatoire pour les Français voyageant par avion. Coût ~7 CAD, valide 5 ans.",
        bodyEn:
          "Electronic Travel Authorization required for French citizens travelling by air. Cost ~7 CAD, valid 5 years.",
        tag: "Obligatoire",
        actions: [
          {
            labelFr: "Faire ma demande (7 CAD)",
            labelEn: "Apply (7 CAD)",
            url: "https://www.canada.ca/fr/immigration-refugies-citoyennete/services/visiter-canada/ave.html",
            kind: "url",
          },
        ],
      },
      {
        emoji: "📘",
        titleFr: "Passeport valide",
        titleEn: "Valid passport",
        bodyFr:
          "Votre passeport doit être valide pour toute la durée du séjour. L'AVE est liée électroniquement à ce passeport — si vous le changez, refaites la demande.",
        bodyEn:
          "Your passport must remain valid for the entire stay. The eTA is electronically linked to this passport — re-apply if you renew it.",
        tag: "Obligatoire",
      },
      {
        emoji: "🏥",
        titleFr: "Assurance voyage",
        titleEn: "Travel insurance",
        bodyFr:
          "Non obligatoire mais vivement recommandée. Les soins médicaux au Canada peuvent coûter très cher sans couverture (urgence > 1 000 $/jour).",
        bodyEn:
          "Not mandatory but strongly recommended. Medical care in Canada can be very expensive without coverage (ER > $1,000/day).",
        tag: "Recommandé",
      },
      {
        emoji: "📱",
        titleFr: "ArriveCAN (si demandé)",
        titleEn: "ArriveCAN (if requested)",
        bodyFr:
          "L'application n'est plus obligatoire pour les voyageurs réguliers depuis 2022, mais elle reste utile pour pré-déclarer vos douanes (gain de temps à l'aéroport).",
        bodyEn:
          "No longer mandatory for regular travellers since 2022, but still useful to pre-declare customs (saves time at the airport).",
        tag: "Pratique",
        actions: [
          {
            labelFr: "Télécharger ArriveCAN",
            labelEn: "Download ArriveCAN",
            url: "https://www.canada.ca/fr/agence-services-frontaliers/services/services-numeriques-frontaliers/declaration-prealable-voyageurs.html",
            kind: "url",
          },
        ],
      },
      {
        emoji: "💰",
        titleFr: "Budget & Devises",
        titleEn: "Budget & Currency",
        bodyFr:
          "Prévoyez ~80–150 $ CAD par jour hors hébergement. 1 EUR ≈ 1,47 CAD (vérifier le taux du jour). Les paiements par carte sont acceptés partout.",
        bodyEn:
          "Plan for ~80–150 CAD per day excluding accommodation. 1 EUR ≈ 1.47 CAD (check current rate). Card payments accepted everywhere.",
        tag: "Pratique",
        actions: [
          {
            labelFr: "Convertisseur de devises",
            labelEn: "Currency converter",
            url: "https://www.xe.com/fr/currencyconverter/convert/?Amount=100&From=EUR&To=CAD",
            kind: "url",
          },
        ],
      },
    ],
  },
  {
    id: "arrivee",
    emoji: "🏨",
    labelFr: "À l'arrivée",
    labelEn: "On arrival",
    color: "#2A7AE8",
    steps: [
      {
        emoji: "🏠",
        titleFr: "Logement",
        titleEn: "Accommodation",
        bodyFr:
          "Trouvez l'hébergement idéal selon votre budget : hôtel (120–250 $/nuit), Airbnb (60–180 $), auberge de jeunesse (35–60 $), B&B (90–150 $).",
        bodyEn:
          "Find the right place to stay for your budget: hotel ($120–250/night), Airbnb ($60–180), hostel ($35–60), B&B ($90–150).",
        tag: "Hébergement",
        subItems: [
          { emoji: "🏙️", labelFr: "Montréal", labelEn: "Montreal" },
          { emoji: "🏰", labelFr: "Québec", labelEn: "Quebec City" },
          { emoji: "🌆", labelFr: "Toronto", labelEn: "Toronto" },
          { emoji: "🏔️", labelFr: "Vancouver", labelEn: "Vancouver" },
        ],
        actions: [
          {
            labelFr: "Booking.com",
            labelEn: "Booking.com",
            url: "https://www.booking.com/country/ca.fr.html",
            kind: "url",
          },
          {
            labelFr: "Airbnb Canada",
            labelEn: "Airbnb Canada",
            url: "https://www.airbnb.fr/canada/stays",
            kind: "url",
          },
        ],
      },
      {
        emoji: "🚇",
        titleFr: "Transport local",
        titleEn: "Local transport",
        bodyFr:
          "Métro/bus dans les grandes villes (3,75 $/trajet à Montréal). Location de voiture dès 50 $/jour. Uber et taxis disponibles partout. Train VIA Rail entre les grandes villes.",
        bodyEn:
          "Metro/bus in major cities ($3.75/ride in Montreal). Car rental from $50/day. Uber and taxis everywhere. VIA Rail train between major cities.",
        tag: "Transport",
        actions: [
          {
            labelFr: "STM (Montréal)",
            labelEn: "STM (Montreal)",
            url: "https://www.stm.info/fr",
            kind: "url",
          },
          {
            labelFr: "VIA Rail Canada",
            labelEn: "VIA Rail Canada",
            url: "https://www.viarail.ca/fr",
            kind: "url",
          },
        ],
      },
      {
        emoji: "📶",
        titleFr: "Carte SIM / Internet",
        titleEn: "SIM card / Internet",
        bodyFr:
          "Forfaits prépayés visiteur disponibles chez Public Mobile, Fido, Lucky Mobile (~30–50 $/mois). eSIM possible (Airalo, Holafly). Le Wi-Fi est gratuit dans la plupart des cafés et bibliothèques.",
        bodyEn:
          "Visitor prepaid plans at Public Mobile, Fido, Lucky Mobile (~$30–50/month). eSIM available (Airalo, Holafly). Free Wi-Fi in most cafés and libraries.",
        tag: "Connectivité",
        actions: [
          {
            labelFr: "Public Mobile",
            labelEn: "Public Mobile",
            url: "https://www.publicmobile.ca/fr",
            kind: "url",
          },
          {
            labelFr: "Airalo (eSIM)",
            labelEn: "Airalo (eSIM)",
            url: "https://www.airalo.com/fr/canada-esim",
            kind: "url",
          },
        ],
      },
    ],
  },
  {
    id: "explorer",
    emoji: "🗺️",
    labelFr: "Explorer",
    labelEn: "Explore",
    color: "#27AE60",
    steps: [
      {
        emoji: "🎡",
        titleFr: "Sites touristiques incontournables",
        titleEn: "Must-see attractions",
        bodyFr:
          "Choisissez une ville pour découvrir ses sites phares.",
        bodyEn: "Pick a city to discover its top sights.",
        tag: "Tourisme",
        destinations: [
          {
            city: "Montréal",
            emoji: "🏙️",
            sitesFr: [
              "Vieux-Montréal",
              "Mont-Royal",
              "Quartier des Spectacles",
              "Musée des Beaux-Arts",
              "Marché Jean-Talon",
            ],
            sitesEn: [
              "Old Montreal",
              "Mount Royal",
              "Quartier des Spectacles",
              "Museum of Fine Arts",
              "Jean-Talon Market",
            ],
          },
          {
            city: "Québec",
            emoji: "🏰",
            sitesFr: [
              "Château Frontenac",
              "Plaines d'Abraham",
              "Vieux-Québec (UNESCO)",
              "Chutes Montmorency",
              "Île d'Orléans",
            ],
            sitesEn: [
              "Château Frontenac",
              "Plains of Abraham",
              "Old Quebec (UNESCO)",
              "Montmorency Falls",
              "Île d'Orléans",
            ],
          },
          {
            city: "Vancouver",
            emoji: "🌊",
            sitesFr: [
              "Stanley Park",
              "Granville Island",
              "Whistler",
              "Pont suspendu Capilano",
              "Grouse Mountain",
            ],
            sitesEn: [
              "Stanley Park",
              "Granville Island",
              "Whistler",
              "Capilano Suspension Bridge",
              "Grouse Mountain",
            ],
          },
          {
            city: "Toronto",
            emoji: "🗼",
            sitesFr: [
              "Tour CN",
              "Distillery District",
              "Kensington Market",
              "Chutes du Niagara",
              "Royal Ontario Museum",
            ],
            sitesEn: [
              "CN Tower",
              "Distillery District",
              "Kensington Market",
              "Niagara Falls",
              "Royal Ontario Museum",
            ],
          },
        ],
      },
      {
        emoji: "🍁",
        titleFr: "Gastronomie",
        titleEn: "Food & Drink",
        bodyFr:
          "Goûtez la cuisine locale : poutine, sirop d'érable, tourtière, bagels montréalais, smoked meat, queue de castor, fromages québécois.",
        bodyEn:
          "Try local food: poutine, maple syrup, tourtière, Montreal bagels, smoked meat, beavertail, Quebec cheeses.",
        tag: "Gastronomie",
      },
      {
        emoji: "🏕️",
        titleFr: "Nature & Plein air",
        titleEn: "Nature & Outdoors",
        bodyFr:
          "Parcs nationaux (Parcs Canada + SÉPAQ au Québec), randonnées, kayak, observation des baleines (Tadoussac), aurores boréales (Yukon, T.N.-O.).",
        bodyEn:
          "National parks (Parks Canada + SÉPAQ in Quebec), hiking, kayaking, whale watching (Tadoussac), northern lights (Yukon, NWT).",
        tag: "Nature",
        actions: [
          {
            labelFr: "Parcs Canada",
            labelEn: "Parks Canada",
            url: "https://parcs.canada.ca/",
            kind: "url",
          },
          {
            labelFr: "SÉPAQ (Québec)",
            labelEn: "SÉPAQ (Quebec)",
            url: "https://www.sepaq.com/",
            kind: "url",
          },
        ],
      },
      {
        emoji: "🎭",
        titleFr: "Culture & Événements",
        titleEn: "Culture & Events",
        bodyFr:
          "Festival de jazz de Montréal (juin–juillet), Just for Laughs, Festival d'été de Québec, Carnaval de Québec (février), matchs de hockey LNH (Canadiens, Maple Leafs).",
        bodyEn:
          "Montreal Jazz Festival (June–July), Just for Laughs, Quebec Summer Festival, Quebec Winter Carnival (February), NHL hockey games (Canadiens, Maple Leafs).",
        tag: "Culture",
      },
    ],
  },
  {
    id: "pratique",
    emoji: "🛠️",
    labelFr: "Infos pratiques",
    labelEn: "Practical info",
    color: "#8E44AD",
    steps: [
      {
        emoji: "🚑",
        titleFr: "Urgences & Santé",
        titleEn: "Emergencies & Health",
        bodyFr:
          "En cas d'urgence vitale : composez le 911 (police, pompiers, ambulance). Sans urgence vitale au Québec : 811 (Info-Santé).",
        bodyEn:
          "Life-threatening emergency: dial 911 (police, fire, ambulance). Non-urgent in Quebec: 811 (Info-Santé).",
        tag: "Urgences",
        actions: [
          {
            labelFr: "911 — Urgences",
            labelEn: "911 — Emergencies",
            phone: "911",
            kind: "tel",
          },
          {
            labelFr: "811 — Info-Santé (QC)",
            labelEn: "811 — Health info (QC)",
            phone: "811",
            kind: "tel",
          },
        ],
      },
      {
        emoji: "🇫🇷",
        titleFr: "Ambassade & Consulats de France",
        titleEn: "French Embassy & Consulates",
        bodyFr:
          "En cas de perte de documents ou problème grave, l'ambassade et les consulats français peuvent vous aider.",
        bodyEn:
          "In case of lost documents or serious problems, the embassy and consulates can help.",
        tag: "Officiel",
        actions: [
          {
            labelFr: "Ambassade de France à Ottawa",
            labelEn: "French Embassy in Ottawa",
            url: "https://ca.ambafrance.org/",
            kind: "url",
          },
          {
            labelFr: "Consulat — Montréal",
            labelEn: "Consulate — Montreal",
            url: "https://montreal.consulfrance.org/",
            kind: "url",
          },
          {
            labelFr: "Consulat — Vancouver",
            labelEn: "Consulate — Vancouver",
            url: "https://vancouver.consulfrance.org/",
            kind: "url",
          },
        ],
      },
      {
        emoji: "🌡️",
        titleFr: "Météo & Fuseaux horaires",
        titleEn: "Weather & Time zones",
        bodyFr:
          "Le Canada couvre 6 fuseaux horaires (Pacifique, Montagnes, Centre, Est, Atlantique, Terre-Neuve). Les hivers sont rigoureux : −20 °C courant à Montréal en janvier — prévoyez vêtements chauds, bottes, gants.",
        bodyEn:
          "Canada spans 6 time zones (Pacific, Mountain, Central, Eastern, Atlantic, Newfoundland). Winters are harsh: −20 °C is common in Montreal in January — bring warm clothes, boots, gloves.",
        tag: "Info",
        actions: [
          {
            labelFr: "Météo Canada",
            labelEn: "Weather Canada",
            url: "https://meteo.gc.ca/",
            kind: "url",
          },
        ],
      },
      {
        emoji: "📅",
        titleFr: "Durée de séjour",
        titleEn: "Length of stay",
        bodyFr:
          "Avec une AVE, vous pouvez généralement rester jusqu'à 6 mois. La durée exacte est inscrite dans votre passeport au point d'entrée. Pour prolonger : demande à faire avant l'expiration.",
        bodyEn:
          "With an eTA, you can usually stay up to 6 months. The exact duration is stamped in your passport at the border. To extend: apply before expiration.",
        tag: "Légal",
        actions: [
          {
            labelFr: "Prolonger mon séjour",
            labelEn: "Extend my stay",
            url: "https://www.canada.ca/fr/immigration-refugies-citoyennete/services/visiter-canada/prolonger-sejour.html",
            kind: "url",
          },
        ],
      },
    ],
  },
];

const TAG_COLORS: Record<Tag, { bg: string; bgDark: string; text: string; textDark: string }> = {
  Obligatoire: { bg: "#FEE8E0", bgDark: "#3a1a14", text: "#C0391B", textDark: "#fca5a5" },
  Recommandé: { bg: "#E0EFFE", bgDark: "#0c2a4a", text: "#1A5CA8", textDark: "#93c5fd" },
  Pratique: { bg: "#E0F5EA", bgDark: "#0d2e1d", text: "#1A7A42", textDark: "#86efac" },
  Hébergement: { bg: "#E0EFFE", bgDark: "#0c2a4a", text: "#1A5CA8", textDark: "#93c5fd" },
  Transport: { bg: "#F0E6FA", bgDark: "#2a1a3a", text: "#6B2FA0", textDark: "#d8b4fe" },
  Connectivité: { bg: "#E0F5EA", bgDark: "#0d2e1d", text: "#1A7A42", textDark: "#86efac" },
  Tourisme: { bg: "#FEE8E0", bgDark: "#3a1a14", text: "#C0391B", textDark: "#fca5a5" },
  Gastronomie: { bg: "#FEE8E0", bgDark: "#3a1a14", text: "#C0391B", textDark: "#fca5a5" },
  Nature: { bg: "#E0F5EA", bgDark: "#0d2e1d", text: "#1A7A42", textDark: "#86efac" },
  Culture: { bg: "#F0E6FA", bgDark: "#2a1a3a", text: "#6B2FA0", textDark: "#d8b4fe" },
  Urgences: { bg: "#FEE8E0", bgDark: "#3a1a14", text: "#C0391B", textDark: "#fca5a5" },
  Officiel: { bg: "#E0EFFE", bgDark: "#0c2a4a", text: "#1A5CA8", textDark: "#93c5fd" },
  Info: { bg: "#E0F5EA", bgDark: "#0d2e1d", text: "#1A7A42", textDark: "#86efac" },
  Légal: { bg: "#FEE8E0", bgDark: "#3a1a14", text: "#C0391B", textDark: "#fca5a5" },
};

const TAG_LABELS: Record<Tag, { fr: string; en: string }> = {
  Obligatoire: { fr: "Obligatoire", en: "Required" },
  Recommandé: { fr: "Recommandé", en: "Recommended" },
  Pratique: { fr: "Pratique", en: "Handy" },
  Hébergement: { fr: "Hébergement", en: "Lodging" },
  Transport: { fr: "Transport", en: "Transport" },
  Connectivité: { fr: "Connectivité", en: "Connectivity" },
  Tourisme: { fr: "Tourisme", en: "Tourism" },
  Gastronomie: { fr: "Gastronomie", en: "Food" },
  Nature: { fr: "Nature", en: "Nature" },
  Culture: { fr: "Culture", en: "Culture" },
  Urgences: { fr: "Urgences", en: "Emergency" },
  Officiel: { fr: "Officiel", en: "Official" },
  Info: { fr: "Info", en: "Info" },
  Légal: { fr: "Légal", en: "Legal" },
};

export default function VisiteurFranceScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { language } = useLanguage();
  const colors = useColors();
  const isFr = language === "fr";
  const isDark = colors.background !== "#ffffff" && colors.background !== "#fff";

  const [activePhaseIdx, setActivePhaseIdx] = useState(0);
  const [activeDest, setActiveDest] = useState<Record<string, number>>({});
  const phase = PHASES[activePhaseIdx];

  const handleAction = (a: Action) => {
    if (a.kind === "tel" && a.phone) {
      Linking.openURL(`tel:${a.phone.replace(/[^0-9+]/g, "")}`);
    } else if (a.kind === "url" && a.url) {
      Linking.openURL(a.url);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* ── Header navy avec feuille d'érable ── */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.mapleLeaf}>🍁</Text>

        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color="#fff" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <View style={styles.flagRow}>
              <Text style={styles.flagEmoji}>🇫🇷</Text>
              <Feather name="arrow-right" size={14} color="#888" />
              <Text style={styles.flagEmoji}>🇨🇦</Text>
            </View>
            <Text
              style={styles.headerTitle}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              {isFr ? "Mon Voyage Canada" : "My Canada Trip"}
            </Text>
            <Text style={styles.headerSubtitle} numberOfLines={2}>
              {isFr
                ? "Votre compagnon de voyage France → Canada"
                : "Your travel companion France → Canada"}
            </Text>
          </View>
        </View>

        {/* Onglets phases */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsRow}
        >
          {PHASES.map((p, i) => {
            const active = i === activePhaseIdx;
            return (
              <Pressable
                key={p.id}
                onPress={() => setActivePhaseIdx(i)}
                style={[
                  styles.tab,
                  active && { backgroundColor: p.color },
                ]}
              >
                <Text style={styles.tabEmoji}>{p.emoji}</Text>
                <Text
                  style={[
                    styles.tabLabel,
                    { color: active ? "#fff" : "rgba(255,255,255,0.6)" },
                  ]}
                  numberOfLines={1}
                >
                  {isFr ? p.labelFr : p.labelEn}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Bandeau couleur de la phase active */}
      <View style={[styles.phaseBar, { backgroundColor: phase.color }]}>
        <Text style={styles.phaseBarEmoji}>{phase.emoji}</Text>
        <Text style={styles.phaseBarLabel} numberOfLines={1}>
          {isFr ? phase.labelFr : phase.labelEn}
        </Text>
        <View style={styles.phaseBarBadge}>
          <Text style={styles.phaseBarBadgeText}>
            {phase.steps.length} {isFr ? "étapes" : "steps"}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Section "Quelques mots…" (intro réservée — éditable) ── */}
        {activePhaseIdx === 0 && (
          <View
            style={[
              styles.introCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.introHeader}>
              <Text style={styles.introEmoji}>💬</Text>
              <Text style={[styles.introTitle, { color: colors.foreground }]}>
                {isFr
                  ? "Quelques mots avant de partir"
                  : "A few words before you leave"}
              </Text>
            </View>
            <Text style={[styles.introBody, { color: colors.mutedForeground }]}>
              {isFr
                ? "Quitter la France pour le Canada, ce n'est pas seulement traverser un océan : c'est découvrir un pays immense, bilingue, accueillant et profondément différent. Au Québec, vous retrouverez votre langue avec un accent et des expressions qui feront sourire ; ailleurs, vous vivrez une autre Amérique, plus douce, plus sûre, plus respectueuse. Préparez-vous au froid, à la générosité des gens, aux distances qui se comptent en heures de route, et à une nature à couper le souffle. Bon voyage."
                : "Leaving France for Canada is not just crossing an ocean — it's discovering a vast, bilingual, welcoming and deeply different country. In Quebec, you'll find your language spoken with a charming accent; elsewhere, you'll experience another America: gentler, safer, more respectful. Prepare for the cold, the kindness of people, distances measured in hours of driving, and breathtaking nature. Have a great trip."}
            </Text>
            <Text style={[styles.introHint, { color: colors.mutedForeground }]}>
              {isFr
                ? "✏️ Ce mot d'introduction sera personnalisé prochainement."
                : "✏️ This intro message will be personalized soon."}
            </Text>
          </View>
        )}

        {/* ── Étapes de la phase active ── */}
        {phase.steps.map((step, idx) => {
          const tagColor = TAG_COLORS[step.tag];
          const tagBg = isDark ? tagColor.bgDark : tagColor.bg;
          const tagText = isDark ? tagColor.textDark : tagColor.text;
          const stepKey = `${phase.id}-${idx}`;
          const destIdx = activeDest[stepKey] ?? 0;

          return (
            <View
              key={stepKey}
              style={[
                styles.stepCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderLeftColor: phase.color,
                },
              ]}
            >
              <View style={styles.stepHeaderRow}>
                <View style={styles.stepHeaderLeft}>
                  <Text style={styles.stepEmoji}>{step.emoji}</Text>
                  <Text
                    style={[styles.stepTitle, { color: colors.foreground }]}
                    numberOfLines={2}
                  >
                    {isFr ? step.titleFr : step.titleEn}
                  </Text>
                </View>
                <View style={[styles.tagPill, { backgroundColor: tagBg }]}>
                  <Text style={[styles.tagText, { color: tagText }]}>
                    {(isFr ? TAG_LABELS[step.tag].fr : TAG_LABELS[step.tag].en).toUpperCase()}
                  </Text>
                </View>
              </View>

              <Text style={[styles.stepBody, { color: colors.mutedForeground }]}>
                {isFr ? step.bodyFr : step.bodyEn}
              </Text>

              {/* Destinations (Explorer → Sites touristiques) */}
              {step.destinations && step.destinations.length > 0 && (
                <View style={{ marginTop: 4 }}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.destRow}
                  >
                    {step.destinations.map((d, i) => {
                      const active = i === destIdx;
                      return (
                        <Pressable
                          key={d.city}
                          onPress={() =>
                            setActiveDest((prev) => ({ ...prev, [stepKey]: i }))
                          }
                          style={[
                            styles.destChip,
                            {
                              backgroundColor: active
                                ? "#1A1A2E"
                                : isDark
                                ? "#222"
                                : "#F5F5F0",
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.destChipText,
                              { color: active ? "#fff" : colors.foreground },
                            ]}
                          >
                            {d.emoji} {d.city}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>

                  <View
                    style={[
                      styles.sitesBox,
                      {
                        backgroundColor: isDark ? "#1a1a1a" : "#F8F8F5",
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    {(isFr
                      ? step.destinations[destIdx].sitesFr
                      : step.destinations[destIdx].sitesEn
                    ).map((site) => (
                      <View
                        key={site}
                        style={[
                          styles.sitePill,
                          {
                            backgroundColor: colors.card,
                            borderColor: colors.border,
                          },
                        ]}
                      >
                        <Text
                          style={[styles.sitePillText, { color: colors.foreground }]}
                        >
                          📍 {site}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Sub-items (cities for accommodation) */}
              {step.subItems && step.subItems.length > 0 && (
                <View style={styles.subItemsRow}>
                  {step.subItems.map((item) => (
                    <View
                      key={item.labelFr}
                      style={[
                        styles.subItemPill,
                        {
                          backgroundColor: isDark ? "#222" : "#F0F0E8",
                        },
                      ]}
                    >
                      <Text
                        style={[styles.subItemText, { color: colors.foreground }]}
                      >
                        {item.emoji} {isFr ? item.labelFr : item.labelEn}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Actions */}
              {step.actions && step.actions.length > 0 && (
                <View style={styles.actionsRow}>
                  {step.actions.map((a, i) => {
                    const isPrimary = i === 0;
                    return (
                      <Pressable
                        key={a.labelFr}
                        onPress={() => handleAction(a)}
                        style={({ pressed }) => [
                          isPrimary ? styles.actionBtnPrimary : styles.actionBtnSecondary,
                          {
                            backgroundColor: isPrimary ? phase.color : "transparent",
                            borderColor: phase.color,
                            opacity: pressed ? 0.75 : 1,
                          },
                        ]}
                      >
                        <Feather
                          name={a.kind === "tel" ? "phone" : "external-link"}
                          size={13}
                          color={isPrimary ? "#fff" : phase.color}
                        />
                        <Text
                          style={[
                            styles.actionBtnText,
                            { color: isPrimary ? "#fff" : phase.color },
                          ]}
                          numberOfLines={1}
                        >
                          {isFr ? a.labelFr : a.labelEn}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}

        {/* ── CTA bas : Assistant IA ── */}
        <Pressable
          onPress={() => router.push("/(tabs)/chat" as any)}
          style={({ pressed }) => [
            styles.aiCta,
            { opacity: pressed ? 0.9 : 1 },
          ]}
        >
          <Text style={styles.aiCtaEmoji}>💬</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.aiCtaTitle} numberOfLines={1}>
              {isFr ? "Besoin d'aide personnalisée ?" : "Need personalized help?"}
            </Text>
            <Text style={styles.aiCtaSub} numberOfLines={2}>
              {isFr
                ? "Posez vos questions à notre assistant IA intégré."
                : "Ask our built-in AI assistant any question."}
            </Text>
          </View>
          <View style={styles.aiCtaBtn}>
            <Text style={styles.aiCtaBtnText}>
              {isFr ? "Demander" : "Ask"}
            </Text>
            <Feather name="arrow-right" size={14} color="#fff" />
          </View>
        </Pressable>

        <Text style={[styles.legal, { color: colors.mutedForeground }]}>
          {isFr
            ? "ℹ️ Informations à jour 2026. Vérifiez toujours les sites officiels (canada.ca, france-diplomatie) pour les dernières exigences."
            : "ℹ️ Information current as of 2026. Always check official sites (canada.ca, france-diplomatie) for the latest requirements."}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  /* Header */
  header: {
    backgroundColor: "#1A1A2E",
    paddingHorizontal: 16,
    paddingBottom: 0,
    overflow: "hidden",
  },
  mapleLeaf: {
    position: "absolute",
    right: -16,
    top: 8,
    fontSize: 140,
    opacity: 0.06,
    lineHeight: 140,
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
  flagRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  flagEmoji: { fontSize: 20 },
  headerTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  headerSubtitle: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    marginTop: 2,
  },

  /* Tabs */
  tabsRow: {
    flexDirection: "row",
    gap: 4,
    paddingTop: 18,
    paddingBottom: 0,
    paddingRight: 16,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  tabEmoji: { fontSize: 14 },
  tabLabel: { fontSize: 12, fontWeight: "700" },

  /* Phase bar */
  phaseBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  phaseBarEmoji: { fontSize: 20 },
  phaseBarLabel: { color: "#fff", fontWeight: "800", fontSize: 15, flex: 1 },
  phaseBarBadge: {
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  phaseBarBadgeText: { color: "#fff", fontWeight: "700", fontSize: 11 },

  /* Intro card */
  introCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  introHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  introEmoji: { fontSize: 20 },
  introTitle: { fontSize: 15, fontWeight: "800", flex: 1 },
  introBody: { fontSize: 13.5, lineHeight: 21 },
  introHint: {
    fontSize: 11,
    fontStyle: "italic",
    marginTop: 10,
    opacity: 0.7,
  },

  /* Step card */
  stepCard: {
    borderWidth: 1,
    borderLeftWidth: 4,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  stepHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 8,
  },
  stepHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  stepEmoji: { fontSize: 20 },
  stepTitle: { flex: 1, fontSize: 14.5, fontWeight: "800" },
  stepBody: { fontSize: 13, lineHeight: 19, marginBottom: 4 },

  /* Tag */
  tagPill: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 99,
  },
  tagText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },

  /* Destinations */
  destRow: { flexDirection: "row", gap: 8, paddingVertical: 4 },
  destChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  destChipText: { fontSize: 12.5, fontWeight: "700" },
  sitesBox: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  sitePill: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  sitePillText: { fontSize: 11.5, fontWeight: "600" },

  /* Sub items */
  subItemsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
  },
  subItemPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  subItemText: { fontSize: 12, fontWeight: "600" },

  /* Actions */
  actionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  actionBtnPrimary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  actionBtnSecondary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  actionBtnText: { fontSize: 12.5, fontWeight: "700" },

  /* AI CTA */
  aiCta: {
    backgroundColor: "#1A1A2E",
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  aiCtaEmoji: { fontSize: 28 },
  aiCtaTitle: { color: "#fff", fontWeight: "800", fontSize: 14 },
  aiCtaSub: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    marginTop: 2,
  },
  aiCtaBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#E8572A",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  aiCtaBtnText: { color: "#fff", fontWeight: "800", fontSize: 12 },

  legal: {
    fontSize: 11,
    lineHeight: 16,
    textAlign: "center",
    marginTop: 16,
    fontStyle: "italic",
  },
});
