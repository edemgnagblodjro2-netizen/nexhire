import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useLanguage } from "@/contexts/LanguageContext";
import { useColors } from "@/hooks/useColors";

const REALESTATE_COLOR = "#0e5c99";

interface Step {
  number: number;
  icon: keyof typeof Feather.glyphMap;
  titleFr: string;
  titleEn: string;
  descFr: string;
  descEn: string;
  tipFr?: string;
  tipEn?: string;
  cost?: string;
  serviceId?: string;
}

const STEPS: Step[] = [
  {
    number: 1,
    icon: "bar-chart-2",
    titleFr: "Préqualification hypothécaire",
    titleEn: "Mortgage Pre-qualification",
    descFr:
      "Contactez une banque, Desjardins ou un courtier hypothécaire pour connaître votre capacité maximale d'emprunt. Vous recevrez une lettre de préqualification, essentielle pour faire des offres sérieuses.",
    descEn:
      "Contact a bank, Desjardins, or a mortgage broker to find out your maximum borrowing capacity. You will receive a pre-qualification letter, essential for making serious offers.",
    tipFr: "Astuce : Comparez au moins 2–3 institutions pour obtenir le meilleur taux.",
    tipEn: "Tip: Compare at least 2–3 institutions to get the best rate.",
    serviceId: "re-bank1",
  },
  {
    number: 2,
    icon: "dollar-sign",
    titleFr: "Épargner la mise de fonds",
    titleEn: "Save Your Down Payment",
    descFr:
      "Minimum 5 % si le prix est sous 500 000 $. Pour la tranche entre 500 000 $ et 999 999 $, comptez 10 %. Utilisez le RAP (jusqu'à 35 000 $ de votre REER) ou le CELIAPP (jusqu'à 40 000 $ exonéré d'impôt).",
    descEn:
      "Minimum 5% if the price is under $500,000. For the $500,000–$999,999 range, expect 10%. Use the HBP (up to $35,000 from your RRSP) or FHSA (up to $40,000 tax-free).",
    tipFr: "Astuce : Si mise de fonds < 20 %, l'assurance SCHL est obligatoire (0,6–4 % du prêt).",
    tipEn: "Tip: If down payment < 20%, CMHC insurance is mandatory (0.6–4% of loan).",
    cost: "5 %–20 % du prix d'achat",
    serviceId: "re-pw2",
  },
  {
    number: 3,
    icon: "search",
    titleFr: "Rechercher une propriété",
    titleEn: "Search for a Property",
    descFr:
      "Consultez Centris.ca (toutes les inscriptions de courtiers) ou DuProprio (vente directe, souvent moins cher). Filtrez par région, type de propriété et fourchette de prix. Visitez plusieurs propriétés avant de décider.",
    descEn:
      "Browse Centris.ca (all broker listings) or DuProprio (direct sales, often cheaper). Filter by region, property type, and price range. Visit several properties before deciding.",
    tipFr: "Astuce : Quartiers abordables à Montréal — RDP, Montréal-Nord, Pointe-aux-Trembles.",
    tipEn: "Tip: Affordable Montreal neighbourhoods — RDP, Montréal-Nord, Pointe-aux-Trembles.",
    serviceId: "re-pw4",
  },
  {
    number: 4,
    icon: "file-text",
    titleFr: "Rédiger une offre d'achat",
    titleEn: "Submit a Purchase Offer",
    descFr:
      "Votre courtier immobilier (ou vous-même via DuProprio) rédige une promesse d'achat avec le prix offert, les conditions (financement, inspection) et la date de prise de possession souhaitée.",
    descEn:
      "Your real estate broker (or yourself via DuProprio) drafts a purchase offer with the offered price, conditions (financing, inspection), and desired possession date.",
    tipFr: "Astuce : Toujours inclure une condition d'inspection — protège contre les vices cachés.",
    tipEn: "Tip: Always include an inspection condition — protects against hidden defects.",
    serviceId: "re-assist1",
  },
  {
    number: 5,
    icon: "home",
    titleFr: "Inspection préachat",
    titleEn: "Pre-Purchase Inspection",
    descFr:
      "Mandatez un inspecteur en bâtiment certifié (AIBQ ou OIQ) pour examiner la propriété : fondations, toiture, plomberie, électricité, isolation. Le rapport détermine si vous maintenez votre offre ou renégociez.",
    descEn:
      "Hire a certified building inspector (AIBQ or OIQ) to examine the property: foundations, roof, plumbing, electrical, insulation. The report determines whether you maintain your offer or renegotiate.",
    tipFr: "Astuce : Soyez présent lors de l'inspection pour poser des questions directement.",
    tipEn: "Tip: Be present during the inspection to ask questions directly.",
    cost: "500 $–800 $",
  },
  {
    number: 6,
    icon: "credit-card",
    titleFr: "Finaliser le financement",
    titleEn: "Finalize Financing",
    descFr:
      "La banque confirme l'hypothèque après vérification du rapport d'inspection et de l'évaluation de la propriété. Si votre mise de fonds est < 20 %, l'assurance SCHL s'applique automatiquement.",
    descEn:
      "The bank confirms the mortgage after reviewing the inspection report and property appraisal. If your down payment is < 20%, CMHC insurance applies automatically.",
    tipFr: "Astuce : Bloquez votre taux hypothécaire si vous craignez une hausse avant la clôture.",
    tipEn: "Tip: Lock in your mortgage rate if you fear an increase before closing.",
    cost: "Frais d'évaluation : 300 $–500 $",
    serviceId: "re-pw1",
  },
  {
    number: 7,
    icon: "briefcase",
    titleFr: "Signature chez le notaire",
    titleEn: "Notary Signing",
    descFr:
      "Le notaire est obligatoire au Québec pour finaliser la transaction. Il rédige l'acte de vente, vérifie les titres de propriété, libère les fonds à la banque et enregistre votre propriété au registre foncier.",
    descEn:
      "A notary is mandatory in Quebec to finalize the transaction. They draft the deed of sale, verify property titles, release funds to the bank, and register your property in the land registry.",
    tipFr: "Astuce : Prévoyez les frais de notaire dans votre budget — souvent oubliés !",
    tipEn: "Tip: Include notary fees in your budget — often forgotten!",
    cost: "1 000 $–1 800 $",
    serviceId: "re-assist2",
  },
  {
    number: 8,
    icon: "key",
    titleFr: "Remise des clés !",
    titleEn: "Keys Handover!",
    descFr:
      "À la date de prise de possession convenue, le vendeur vous remet les clés. Faites une dernière inspection de la propriété avant la signature finale. Bienvenue chez vous !",
    descEn:
      "On the agreed possession date, the seller hands over the keys. Do a final walkthrough of the property before the final signing. Welcome home!",
    tipFr: "Astuce : Prenez des photos de l'état des lieux dès la remise des clés.",
    tipEn: "Tip: Take photos of the property's condition as soon as you get the keys.",
  },
];

export default function BuyingGuideScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { language } = useLanguage();

  const [expanded, setExpanded] = useState<number | null>(null);

  const topPadding = Platform.OS === "web" ? 16 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  const isFr = language === "fr";

  function handleStepPress(num: number) {
    Haptics.selectionAsync();
    setExpanded((prev) => (prev === num ? null : num));
  }

  function handleServiceLink(serviceId: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: "/service/[id]", params: { id: serviceId } });
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.card,
            paddingTop: topPadding + 8,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>
              {isFr ? "Guide d'achat immobilier" : "Home Buying Guide"}
            </Text>
            <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
              {isFr ? "8 étapes pour devenir propriétaire au Québec" : "8 steps to become a homeowner in Quebec"}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: bottomPadding + 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Intro banner */}
        <View style={[styles.introBanner, { backgroundColor: REALESTATE_COLOR + "12", borderColor: REALESTATE_COLOR + "30" }]}>
          <View style={[styles.introIcon, { backgroundColor: REALESTATE_COLOR }]}>
            <Feather name="key" size={18} color="#fff" />
          </View>
          <Text style={[styles.introText, { color: colors.foreground }]}>
            {isFr
              ? "Appuyez sur chaque étape pour voir les détails, conseils et services associés."
              : "Tap each step to see details, tips, and associated services."}
          </Text>
        </View>

        {/* Steps */}
        {STEPS.map((step, index) => {
          const isExpanded = expanded === step.number;
          const isLast = index === STEPS.length - 1;

          return (
            <View key={step.number} style={styles.stepRow}>
              {/* Timeline line + circle */}
              <View style={styles.timelineCol}>
                <View
                  style={[
                    styles.stepCircle,
                    {
                      backgroundColor: isExpanded ? REALESTATE_COLOR : colors.card,
                      borderColor: isExpanded ? REALESTATE_COLOR : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.stepNumber,
                      { color: isExpanded ? "#fff" : REALESTATE_COLOR },
                    ]}
                  >
                    {step.number}
                  </Text>
                </View>
                {!isLast && (
                  <View style={[styles.timelineLine, { backgroundColor: colors.border }]} />
                )}
              </View>

              {/* Card */}
              <Pressable
                style={[
                  styles.stepCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: isExpanded ? REALESTATE_COLOR : colors.border,
                    shadowColor: isExpanded ? REALESTATE_COLOR : "#000",
                  },
                ]}
                onPress={() => handleStepPress(step.number)}
              >
                {/* Card header */}
                <View style={styles.cardHeader}>
                  <View
                    style={[
                      styles.iconWrap,
                      {
                        backgroundColor: isExpanded
                          ? REALESTATE_COLOR + "18"
                          : colors.muted,
                      },
                    ]}
                  >
                    <Feather
                      name={step.icon}
                      size={16}
                      color={isExpanded ? REALESTATE_COLOR : colors.mutedForeground}
                    />
                  </View>
                  <Text style={[styles.stepTitle, { color: colors.foreground }]}>
                    {isFr ? step.titleFr : step.titleEn}
                  </Text>
                  <Feather
                    name={isExpanded ? "chevron-up" : "chevron-down"}
                    size={16}
                    color={colors.mutedForeground}
                  />
                </View>

                {/* Expanded content */}
                {isExpanded && (
                  <View style={styles.cardBody}>
                    <Text style={[styles.stepDesc, { color: colors.foreground }]}>
                      {isFr ? step.descFr : step.descEn}
                    </Text>

                    {step.cost && (
                      <View style={[styles.costBadge, { backgroundColor: REALESTATE_COLOR + "10", borderColor: REALESTATE_COLOR + "25" }]}>
                        <Feather name="tag" size={12} color={REALESTATE_COLOR} />
                        <Text style={[styles.costText, { color: REALESTATE_COLOR }]}>
                          {step.cost}
                        </Text>
                      </View>
                    )}

                    {(isFr ? step.tipFr : step.tipEn) && (
                      <View style={[styles.tipBox, { backgroundColor: colors.surfaceSecondary ?? colors.muted }]}>
                        <Feather name="info" size={13} color={colors.mutedForeground} style={{ marginTop: 1 }} />
                        <Text style={[styles.tipText, { color: colors.mutedForeground }]}>
                          {isFr ? step.tipFr : step.tipEn}
                        </Text>
                      </View>
                    )}

                    {step.serviceId && (
                      <Pressable
                        style={({ pressed }) => [
                          styles.serviceLink,
                          {
                            backgroundColor: pressed ? REALESTATE_COLOR + "18" : REALESTATE_COLOR + "0d",
                            borderColor: REALESTATE_COLOR + "30",
                          },
                        ]}
                        onPress={() => handleServiceLink(step.serviceId!)}
                      >
                        <Feather name="external-link" size={13} color={REALESTATE_COLOR} />
                        <Text style={[styles.serviceLinkText, { color: REALESTATE_COLOR }]}>
                          {isFr ? "Voir le service associé" : "View associated service"}
                        </Text>
                      </Pressable>
                    )}
                  </View>
                )}
              </Pressable>
            </View>
          );
        })}

        {/* Footer */}
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <Feather name="shield" size={14} color={colors.mutedForeground} />
          <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
            {isFr
              ? "Information à titre indicatif. Consultez un courtier hypothécaire ou un notaire pour votre situation personnelle."
              : "Information provided for guidance only. Consult a mortgage broker or notary for your personal situation."}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    borderBottomWidth: 1,
    paddingBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: { flex: 1 },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  headerSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
  content: {
    padding: 16,
    gap: 0,
  },
  introBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 24,
  },
  introIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  introText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  stepRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  timelineCol: {
    alignItems: "center",
    width: 36,
    flexShrink: 0,
  },
  stepCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    zIndex: 1,
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  timelineLine: {
    width: 2,
    flex: 1,
    minHeight: 12,
    marginTop: 4,
  },
  stepCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1.5,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  stepTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  cardBody: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 10,
  },
  stepDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
  costBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  costText: {
    fontSize: 12,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  tipBox: {
    flexDirection: "row",
    gap: 8,
    padding: 10,
    borderRadius: 10,
  },
  tipText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
  },
  serviceLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  serviceLinkText: {
    fontSize: 12,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  footer: {
    flexDirection: "row",
    gap: 8,
    paddingTop: 20,
    marginTop: 8,
    borderTopWidth: 1,
  },
  footerText: {
    flex: 1,
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    lineHeight: 16,
  },
});
