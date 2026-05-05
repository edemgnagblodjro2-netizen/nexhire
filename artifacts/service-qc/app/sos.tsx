import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "@/components/SafeLinearGradient";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useLocation } from "@/contexts/LocationContext";
import { type Service } from "@/data/services";
import { useServicesData } from "@/contexts/ServicesContext";
import { useColors } from "@/hooks/useColors";
import { useLanguage } from "@/contexts/LanguageContext";

function haversineKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function withDistance(services: Service[], lat: number, lng: number) {
  return services
    .filter((s) => s.coordinates)
    .map((s) => ({
      ...s,
      distKm: haversineKm(lat, lng, s.coordinates!.lat, s.coordinates!.lng),
    }))
    .sort((a, b) => a.distKm - b.distKm);
}

interface EmergencySection {
  subcategory: string;
  icon: keyof typeof Feather.glyphMap;
  color: string;
  label: string;
  labelEn: string;
  note: string;
  noteEn: string;
}

// ── Lignes d'écoute / hotlines provinciales 24/7 ─────────────────────────
interface Hotline {
  name: string;
  nameEn: string;
  phone: string;
  text?: string; // SMS support
  hours?: string;
  hoursEn?: string;
  desc: string;
  descEn: string;
}

interface HotlineCategory {
  key: string;
  icon: keyof typeof Feather.glyphMap;
  color: string;
  label: string;
  labelEn: string;
  hotlines: Hotline[];
}

const HOTLINE_CATEGORIES: HotlineCategory[] = [
  {
    key: "mental-health",
    icon: "heart",
    color: "#8b5cf6",
    label: "Santé mentale & détresse psychologique",
    labelEn: "Mental Health & Crisis Support",
    hotlines: [
      {
        name: "Suicide Action — 1 866 APPELLE",
        nameEn: "Suicide Action — 1-866-APPELLE",
        phone: "1-866-277-3553",
        hours: "24h/24, 7j/7",
        hoursEn: "24/7",
        desc: "Aide aux personnes en détresse suicidaire et à leurs proches",
        descEn: "Help for people in suicidal distress and their loved ones",
      },
      {
        name: "Info-Social 811 (option 2)",
        nameEn: "Info-Social 811 (option 2)",
        phone: "811",
        hours: "24h/24, 7j/7",
        hoursEn: "24/7",
        desc: "Intervention psychosociale par un travailleur social",
        descEn: "Psychosocial intervention by a social worker",
      },
    ],
  },
  {
    key: "domestic-violence",
    icon: "shield",
    color: "#db2777",
    label: "Violence conjugale & familiale",
    labelEn: "Domestic & Family Violence",
    hotlines: [
      {
        name: "SOS violence conjugale",
        nameEn: "SOS Domestic Violence",
        phone: "1-800-363-9010",
        text: "438-601-1211",
        hours: "24h/24, 7j/7 · Confidentiel & gratuit",
        hoursEn: "24/7 · Confidential & free",
        desc: "Hébergement d'urgence, sécurité, accompagnement",
        descEn: "Emergency shelter, safety, support",
      },
      {
        name: "Info-aide violence sexuelle",
        nameEn: "Sexual Violence Info-Help",
        phone: "1-888-933-9007",
        hours: "24h/24, 7j/7",
        hoursEn: "24/7",
        desc: "Soutien aux victimes d'agression sexuelle",
        descEn: "Support for victims of sexual assault",
      },
    ],
  },
  {
    key: "youth",
    icon: "smile",
    color: "#0891b2",
    label: "Jeunesse (5–20 ans)",
    labelEn: "Youth (5–20 years)",
    hotlines: [
      {
        name: "Tel-jeunes",
        nameEn: "Tel-jeunes",
        phone: "1-800-263-2266",
        text: "514-600-1002",
        hours: "24h/24, 7j/7 · Anonyme & gratuit",
        hoursEn: "24/7 · Anonymous & free",
        desc: "Écoute et intervention pour jeunes — appel, texto, clavardage",
        descEn: "Support and intervention for youth — call, text, chat",
      },
      {
        name: "Jeunesse, J'écoute",
        nameEn: "Kids Help Phone",
        phone: "1-800-668-6868",
        text: "686868",
        hours: "24h/24, 7j/7",
        hoursEn: "24/7",
        desc: "Service pancanadien bilingue pour enfants et adolescents",
        descEn: "Pan-Canadian bilingual service for children and teens",
      },
    ],
  },
  {
    key: "seniors",
    icon: "user-check",
    color: "#ea580c",
    label: "Aînés maltraités",
    labelEn: "Elder Abuse",
    hotlines: [
      {
        name: "Ligne Aide Abus Aînés",
        nameEn: "Elder Abuse Helpline",
        phone: "1-888-489-2287",
        hours: "8h à 20h, 7j/7 · Gratuit & confidentiel",
        hoursEn: "8 AM–8 PM, 7 days · Free & confidential",
        desc: "Écoute, information et référence pour aînés maltraités",
        descEn: "Listening, info and referrals for mistreated seniors",
      },
    ],
  },
  {
    key: "addiction",
    icon: "alert-octagon",
    color: "#16a34a",
    label: "Dépendance · drogue, alcool, jeu",
    labelEn: "Addiction · drugs, alcohol, gambling",
    hotlines: [
      {
        name: "Drogue : Aide et Référence",
        nameEn: "Drug Help & Referral",
        phone: "1-800-265-2626",
        hours: "24h/24, 7j/7 · Anonyme",
        hoursEn: "24/7 · Anonymous",
        desc: "Information, aide et référence (toxicomanie, alcool, jeu)",
        descEn: "Information, help and referral (substance abuse, alcohol, gambling)",
      },
      {
        name: "Jeu : Aide et Référence",
        nameEn: "Gambling Help & Referral",
        phone: "1-800-461-0140",
        hours: "24h/24, 7j/7 · Anonyme & gratuit",
        hoursEn: "24/7 · Anonymous & free",
        desc: "Soutien aux joueurs compulsifs et à leurs proches",
        descEn: "Support for compulsive gamblers and their loved ones",
      },
    ],
  },
  // v1.1.9 — Ajout du Centre antipoison + Info-Santé : numéros essentiels
  // qui manquaient et qui sauvent du temps en urgence non-vitale.
  {
    key: "poison-health",
    icon: "thermometer",
    color: "#0d9488",
    label: "Empoisonnement & santé non urgente",
    labelEn: "Poisoning & non-urgent health",
    hotlines: [
      {
        name: "Centre antipoison du Québec",
        nameEn: "Quebec Poison Control Centre",
        phone: "1-800-463-5060",
        hours: "24h/24, 7j/7 · Gratuit",
        hoursEn: "24/7 · Free",
        desc: "Avant d'aller à l'urgence : ingestion, médicaments, produits chimiques",
        descEn: "Before going to ER: ingestion, medications, chemicals",
      },
      {
        name: "Info-Santé 811 (option 1)",
        nameEn: "Info-Santé 811 (option 1)",
        phone: "811",
        hours: "24h/24, 7j/7",
        hoursEn: "24/7",
        desc: "Conseils d'une infirmière pour une situation non urgente",
        descEn: "Nurse advice for non-urgent situations",
      },
    ],
  },
];

const SECTIONS: EmergencySection[] = [
  {
    subcategory: "Centre 911",
    icon: "phone-call",
    color: "#ef4444",
    label: "Centre de dispatch 911",
    labelEn: "911 Dispatch Center",
    note: "Dispatch temps réel — police, pompiers, ambulance",
    noteEn: "Real-time dispatch — police, fire, ambulance",
  },
  {
    subcategory: "Urgence hospitalière",
    icon: "plus-square",
    color: "#7c3aed",
    label: "Hôpital d'urgence le plus proche",
    labelEn: "Nearest Emergency Hospital",
    note: "Urgences 24h/24 — trauma, chirurgie, soins intensifs",
    noteEn: "24/7 ER — trauma, surgery, intensive care",
  },
  {
    subcategory: "Service ambulancier",
    icon: "activity",
    color: "#10b981",
    label: "Service ambulancier",
    labelEn: "Ambulance Service",
    note: "Soins préhospitaliers — TAP, défibrillation, transport",
    noteEn: "Pre-hospital care — paramedics, defibrillation, transport",
  },
  {
    subcategory: "Service de police",
    icon: "shield",
    color: "#3b82f6",
    label: "Police",
    labelEn: "Police",
    note: "Urgences, crimes, sécurité publique",
    noteEn: "Emergencies, crime, public safety",
  },
  {
    subcategory: "Service des incendies",
    icon: "zap",
    color: "#f97316",
    label: "Service des incendies",
    labelEn: "Fire Department",
    note: "Incendie, sauvetage, matières dangereuses",
    noteEn: "Fire, rescue, hazardous materials",
  },
];

export default function SOSScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userLocation, locationStatus, requestLocation } = useLocation();
  const { language } = useLanguage();
  const isFr = language !== "en";

  const [locRequested, setLocRequested] = useState(false);
  const [cityFilter, setCityFilter] = useState<string>("");
  const [cityQuery, setCityQuery] = useState<string>("");

  useEffect(() => {
    if (locationStatus === "idle" && !locRequested) {
      setLocRequested(true);
      requestLocation();
    }
  }, [locationStatus, locRequested, requestLocation]);

  const { services } = useServicesData();

  const cityOptions = useMemo(() => {
    const set = new Set<string>();
    for (const s of services) {
      const sub = SECTIONS.find((sec) => sec.subcategory === s.subcategory);
      if (sub && s.city) set.add(s.city.trim());
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "fr"));
  }, [services]);

  const filteredCityOptions = useMemo(() => {
    const q = cityQuery.trim().toLowerCase();
    if (!q) return cityOptions.slice(0, 50);
    return cityOptions.filter((c) => c.toLowerCase().includes(q)).slice(0, 50);
  }, [cityOptions, cityQuery]);

  const servicesBySection = useMemo(() => {
    return SECTIONS.map((sec) => {
      let candidates = services.filter(
        (s) => s.subcategory === sec.subcategory
      );
      if (cityFilter) {
        const cf = cityFilter.toLowerCase();
        candidates = candidates.filter((s) => s.city?.toLowerCase() === cf);
      }
      if (userLocation) {
        return withDistance(candidates, userLocation.lat, userLocation.lng).slice(0, 3);
      }
      return candidates.slice(0, 3);
    });
  }, [services, userLocation, cityFilter]);

  function call911() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Linking.openURL("tel:911");
  }

  function callService(phone: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Linking.openURL(`tel:${phone.replace(/\s/g, "")}`);
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={["#b91c1c", "#ef4444"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: (Platform.OS === "web" ? 16 : insets.top) + 12 }]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => { Haptics.selectionAsync(); router.back(); }}
            activeOpacity={0.7}
          >
            <Feather name="arrow-left" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>
              {isFr ? "🚨 SOS Urgences" : "🚨 SOS Emergency"}
            </Text>
            <Text style={styles.headerSub}>
              {isFr
                ? "Services d'urgence les plus proches"
                : "Nearest emergency services"}
            </Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <TouchableOpacity
          style={styles.call911Btn}
          onPress={call911}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={isFr ? "Appeler le 911" : "Call 911"}
        >
          <View style={styles.call911IconWrap}>
            <Feather name="phone-call" size={26} color="#fff" />
          </View>
          <View style={styles.call911TextWrap}>
            <Text style={styles.call911Number} numberOfLines={1} adjustsFontSizeToFit>
              911
            </Text>
            <Text style={styles.call911Sub} numberOfLines={2}>
              {isFr ? "Urgence vitale · appeler" : "Life-threatening · call now"}
            </Text>
          </View>
          <Feather name="chevron-right" size={22} color="#ef4444" />
        </TouchableOpacity>

        {locationStatus === "requesting" && (
          <View style={styles.locRow}>
            <ActivityIndicator size="small" color="rgba(255,255,255,0.8)" />
            <Text style={styles.locText}>
              {isFr ? "Localisation en cours…" : "Finding your location…"}
            </Text>
          </View>
        )}
        {locationStatus === "granted" && userLocation && (
          <View style={styles.locRow}>
            <Feather name="map-pin" size={13} color="rgba(255,255,255,0.85)" />
            <Text style={styles.locText}>
              {isFr ? "Services triés par distance réelle" : "Services sorted by real distance"}
            </Text>
          </View>
        )}
        {locationStatus === "denied" && (
          <View style={styles.locRow}>
            <Feather name="alert-circle" size={13} color="rgba(255,255,255,0.75)" />
            <Text style={[styles.locText, { flex: 1 }]} numberOfLines={1}>
              {isFr ? "Localisation refusée" : "Location denied"}
            </Text>
            <TouchableOpacity
              onPress={() => {
                Haptics.selectionAsync();
                requestLocation({ force: true });
              }}
              style={{
                backgroundColor: "rgba(255,255,255,0.22)",
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 8,
              }}
            >
              <Text style={{ color: "#fff", fontSize: 11, fontFamily: "Inter_600SemiBold" }}>
                {isFr ? "Réessayer" : "Retry"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.body,
          { paddingBottom: insets.bottom + 24 },
        ]}
      >
        {/* ── Lignes d'écoute & d'aide 24/7 ── */}
        <View style={styles.hotlinesIntro}>
          <Text style={[styles.hotlinesTitle, { color: colors.foreground }]}>
            {isFr ? "📞 Lignes d'écoute & d'aide" : "📞 Helplines & Crisis Lines"}
          </Text>
          <Text style={[styles.hotlinesSub, { color: colors.mutedForeground }]}>
            {isFr
              ? "Confidentiel · gratuit · partout au Québec"
              : "Confidential · free · across Quebec"}
          </Text>
        </View>

        {HOTLINE_CATEGORIES.map((cat) => (
          <View key={cat.key} style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIconWrap, { backgroundColor: cat.color + "18" }]}>
                <Feather name={cat.icon} size={18} color={cat.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                  {isFr ? cat.label : cat.labelEn}
                </Text>
              </View>
            </View>

            <View style={styles.cards}>
              {cat.hotlines.map((h) => (
                <Pressable
                  key={h.phone}
                  style={({ pressed }) => [
                    styles.hotlineCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      opacity: pressed ? 0.88 : 1,
                    },
                  ]}
                  onPress={() => callService(h.phone)}
                >
                  <View style={[styles.cardAccent, { backgroundColor: cat.color }]} />
                  <View style={styles.cardContent}>
                    <Text
                      style={[styles.cardName, { color: colors.foreground }]}
                      numberOfLines={2}
                    >
                      {isFr ? h.name : h.nameEn}
                    </Text>
                    <Text style={[styles.cardCity, { color: colors.mutedForeground }]} numberOfLines={2}>
                      {isFr ? h.desc : h.descEn}
                    </Text>
                    {h.hours && (
                      <View style={styles.hotlineMeta}>
                        <Feather name="clock" size={11} color={cat.color} />
                        <Text style={[styles.hotlineMetaText, { color: cat.color }]}>
                          {isFr ? h.hours : h.hoursEn}
                        </Text>
                      </View>
                    )}
                    {h.text && (
                      <View style={styles.hotlineMeta}>
                        <Feather name="message-circle" size={11} color={colors.mutedForeground} />
                        <Text style={[styles.hotlineMetaText, { color: colors.mutedForeground }]}>
                          {isFr ? "Texto " : "Text "}{h.text}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={[styles.callBadge, { backgroundColor: cat.color }]}>
                    <Feather name="phone" size={14} color="#fff" />
                    <Text style={styles.callBadgeText}>{h.phone}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        ))}

        {/* ── Services géolocalisés (911, hôpital, police, etc.) ── */}
        <View style={styles.hotlinesIntro}>
          <Text style={[styles.hotlinesTitle, { color: colors.foreground }]}>
            {isFr ? "🚑 Services d'urgence à proximité" : "🚑 Nearby Emergency Services"}
          </Text>
        </View>

        {/* ── Filtre par ville ── */}
        <View style={[styles.cityFilterBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cityFilterHeader}>
            <Feather name="map-pin" size={14} color={colors.mutedForeground} />
            <Text style={[styles.cityFilterLabel, { color: colors.mutedForeground }]}>
              {isFr ? "Filtrer par ville" : "Filter by city"}
            </Text>
            {cityFilter ? (
              <TouchableOpacity
                onPress={() => {
                  Haptics.selectionAsync();
                  setCityFilter("");
                  setCityQuery("");
                }}
                style={styles.cityClearBtn}
              >
                <Text style={[styles.cityClearText, { color: colors.primary }]}>
                  {isFr ? "Effacer" : "Clear"}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <TextInput
            value={cityQuery}
            onChangeText={setCityQuery}
            placeholder={isFr ? "Rechercher une ville…" : "Search a city…"}
            placeholderTextColor={colors.mutedForeground}
            style={[
              styles.cityInput,
              {
                backgroundColor: colors.background,
                color: colors.foreground,
                borderColor: colors.border,
              },
            ]}
            autoCorrect={false}
            autoCapitalize="words"
          />

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.cityChipsRow}
          >
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                setCityFilter("");
              }}
              style={({ pressed }) => [
                styles.cityChip,
                {
                  backgroundColor: !cityFilter ? colors.primary : colors.background,
                  borderColor: !cityFilter ? colors.primary : colors.border,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.cityChipText,
                  { color: !cityFilter ? "#fff" : colors.foreground },
                ]}
              >
                {isFr ? "Toutes" : "All"}
              </Text>
            </Pressable>
            {filteredCityOptions.map((city) => {
              const active = cityFilter === city;
              return (
                <Pressable
                  key={city}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setCityFilter(active ? "" : city);
                  }}
                  style={({ pressed }) => [
                    styles.cityChip,
                    {
                      backgroundColor: active ? colors.primary : colors.background,
                      borderColor: active ? colors.primary : colors.border,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.cityChipText,
                      { color: active ? "#fff" : colors.foreground },
                    ]}
                  >
                    {city}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {SECTIONS.map((sec, si) => {
          const items = servicesBySection[si];
          return (
            <View key={sec.subcategory} style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIconWrap, { backgroundColor: sec.color + "18" }]}>
                  <Feather name={sec.icon} size={18} color={sec.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                    {isFr ? sec.label : sec.labelEn}
                  </Text>
                  <Text style={[styles.sectionNote, { color: colors.mutedForeground }]}>
                    {isFr ? sec.note : sec.noteEn}
                  </Text>
                </View>
              </View>

              <View style={styles.cards}>
                {items.length === 0 ? (
                  <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                    {isFr ? "Aucun service disponible" : "No services available"}
                  </Text>
                ) : (
                  items.map((svc) => {
                    const dist = (svc as any).distKm as number | undefined;
                    return (
                      <Pressable
                        key={svc.id}
                        style={({ pressed }) => [
                          styles.card,
                          {
                            backgroundColor: colors.card,
                            borderColor: colors.border,
                            opacity: pressed ? 0.88 : 1,
                          },
                        ]}
                        onPress={() => callService(svc.phone)}
                      >
                        <View style={[styles.cardAccent, { backgroundColor: sec.color }]} />

                        <View style={styles.cardContent}>
                          <Text
                            style={[styles.cardName, { color: colors.foreground }]}
                            numberOfLines={2}
                          >
                            {svc.name}
                          </Text>
                          <Text style={[styles.cardCity, { color: colors.mutedForeground }]}>
                            {svc.city}
                            {dist !== undefined
                              ? `  ·  ${dist < 1 ? `${Math.round(dist * 1000)} m` : `${dist.toFixed(1)} km`}`
                              : ""}
                          </Text>
                        </View>

                        <View style={[styles.callBadge, { backgroundColor: sec.color }]}>
                          <Feather name="phone" size={14} color="#fff" />
                          <Text style={styles.callBadgeText}>{svc.phone}</Text>
                        </View>
                      </Pressable>
                    );
                  })
                )}
              </View>
            </View>
          );
        })}

        <View style={[styles.infoBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="info" size={16} color={colors.mutedForeground} />
          <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
            {isFr
              ? "⚠️ 773 des 1 112 municipalités du Québec n'ont pas de premiers répondants. En zone rurale éloignée, les délais peuvent être plus longs. Le 911 coordonne toujours la meilleure réponse disponible."
              : "⚠️ 773 of Quebec's 1,112 municipalities have no first responders. In remote rural areas, response times may be longer. 911 always coordinates the best available response."}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 14,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  headerSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.78)",
  },

  call911Btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#fff",
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
  },
  call911IconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#ef4444",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  call911TextWrap: {
    flex: 1,
    minWidth: 0, // permet au texte de se contracter et déborder proprement
  },
  call911Number: {
    fontSize: 28,
    fontWeight: "800",
    fontFamily: "Inter_700Bold",
    color: "#ef4444",
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  call911Sub: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: "#6b7280",
    marginTop: 2,
    lineHeight: 16,
  },

  locRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  locText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.82)",
  },

  body: {
    padding: 16,
    gap: 24,
  },

  section: {
    gap: 10,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  sectionIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  sectionNote: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },

  cards: {
    gap: 8,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardAccent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  cardContent: {
    flex: 1,
    gap: 3,
    paddingLeft: 6,
  },
  cardName: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
    lineHeight: 18,
  },
  cardCity: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  callBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    flexShrink: 0,
  },
  callBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },

  hotlinesIntro: {
    marginBottom: 8,
    paddingHorizontal: 4,
    gap: 2,
  },
  cityFilterBox: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    gap: 10,
  },
  cityFilterHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  cityFilterLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    flex: 1,
  },
  cityClearBtn: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  cityClearText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  cityInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  cityChipsRow: {
    gap: 6,
    paddingVertical: 2,
    paddingRight: 8,
  },
  cityChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  cityChipText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  hotlinesTitle: {
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  hotlinesSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  hotlineCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  hotlineMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  hotlineMetaText: {
    fontSize: 11,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },

  emptyText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    fontStyle: "italic",
  },

  infoBox: {
    flexDirection: "row",
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "flex-start",
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
});
