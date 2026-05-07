import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "@/components/SafeLinearGradient";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useLanguage } from "@/contexts/LanguageContext";
import { useLocation } from "@/contexts/LocationContext";
import { useServicesData } from "@/contexts/ServicesContext";
import { CATEGORY_LABELS, type Category, type Service } from "@/data/services";
import { useColors } from "@/hooks/useColors";
import { getFavorites, toggleFavorite } from "@/lib/favorites";

type CatFilter = Category | "all";
type SortMode = "distance" | "name" | "urgent";

const CAT_ICONS: Record<Category, keyof typeof Feather.glyphMap> = {
  health: "activity",
  mentalHealth: "heart",
  food: "shopping-bag",
  housing: "home",
  social: "users",
  family: "users",
  immigration: "globe",
  employment: "briefcase",
  childcare: "smile",
  realestate: "key",
  administrative: "file-text",
  legal: "shield",
  banking: "credit-card",
  transport: "navigation",
  tourism: "camera",
  moving: "truck",
  hypermarche: "shopping-cart",
  pharmacie: "plus-square",
};

const CAT_LABELS_EN: Record<Category, string> = {
  housing: "Housing", food: "Food", mentalHealth: "Mental health", health: "Health",
  immigration: "Immigration", employment: "Employment", family: "Family",
  social: "Social", childcare: "Childcare", realestate: "Real estate",
  administrative: "Admin", legal: "Legal",
  banking: "Banking", transport: "Transport", tourism: "Tourism",
  moving: "Moving",
  hypermarche: "Hypermarkets",
  pharmacie: "Pharmacies",
};

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
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

type Tab = "nearby" | "favorites";

export default function MapScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { language } = useLanguage();
  const { userLocation, locationStatus, requestLocation } = useLocation();
  const { services } = useServicesData();
  const isFr = language !== "en";

  const [tab, setTab] = useState<Tab>("nearby");
  const [favIds, setFavIds] = useState<string[]>([]);
  const [locTried, setLocTried] = useState(false);
  const [catFilter, setCatFilter] = useState<CatFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("distance");

  // Auto-request location once
  useEffect(() => {
    if (locationStatus === "idle" && !locTried) {
      setLocTried(true);
      requestLocation();
    }
  }, [locationStatus, locTried, requestLocation]);

  // Reload favorites when screen gains focus
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      getFavorites().then((ids) => { if (alive) setFavIds(ids); });
      return () => { alive = false; };
    }, [])
  );

  // v1.1.9 — Memoize favorites as a Set for O(1) lookup throughout the
  // render tree (was O(N) .includes per card across 60+ rendered cards).
  const favSet = useMemo(() => new Set(favIds), [favIds]);

  // Pool of services for the active tab (before category/sort).
  // PERF: For "nearby" with a known user location, pre-filter by a coarse
  // bounding box (~75km) BEFORE running haversine on 5000+ services. Reduces
  // per-keystroke compute by 10-50× on a typical urban Quebec location.
  const tabPool = useMemo(() => {
    if (tab === "favorites") {
      // Favoris : on n'enlève rien (l'usager a explicitement épinglé), même
      // les lignes téléphoniques s'il les a sauvegardées.
      return services.filter((s) => favSet.has(s.id));
    }
    // v1.1.9 — Phase 1 : on cache les services 'phone' (lignes 211/811/911,
    // hotlines 1-800) de la carte car ils n'ont pas de localisation réelle.
    // Ils restent accessibles via Recherche et Urgences.
    const withCoords = services.filter(
      (s) => s.coordinates && s.serviceType !== "phone",
    );
    if (!userLocation) return withCoords;
    // 1° lat ≈ 111 km. Lng compresses by cos(lat). Use a generous 75km box
    // so urban users still get ~60 results even when in the suburbs.
    const KM = 75;
    const dLat = KM / 111;
    const cosLat = Math.cos((userLocation.lat * Math.PI) / 180) || 1;
    const dLng = KM / (111 * Math.max(0.1, Math.abs(cosLat)));
    const minLat = userLocation.lat - dLat;
    const maxLat = userLocation.lat + dLat;
    const minLng = userLocation.lng - dLng;
    const maxLng = userLocation.lng + dLng;
    const inBox = withCoords.filter((s) => {
      const c = s.coordinates!;
      return c.lat >= minLat && c.lat <= maxLat && c.lng >= minLng && c.lng <= maxLng;
    });
    // Fallback: if the box is empty (rural user), keep the full pool so the
    // user still sees something rather than an empty list.
    return inBox.length >= 10 ? inBox : withCoords;
  }, [tab, services, favSet, userLocation]);

  // Per-category counts for chips (within current tab pool)
  const catCounts = useMemo(() => {
    const counts: Record<string, number> = { all: tabPool.length };
    for (const s of tabPool) counts[s.category] = (counts[s.category] || 0) + 1;
    return counts;
  }, [tabPool]);

  // Categories that actually appear, ordered by count desc
  const availableCats = useMemo(() => {
    return (Object.keys(catCounts).filter((k) => k !== "all") as Category[])
      .sort((a, b) => (catCounts[b] || 0) - (catCounts[a] || 0));
  }, [catCounts]);

  // Reset category filter if it's no longer present when tab changes
  useEffect(() => {
    if (catFilter !== "all" && !catCounts[catFilter]) setCatFilter("all");
  }, [catCounts, catFilter]);

  // Compute distances + apply category + sort
  const list = useMemo(() => {
    let arr = tabPool.map((s) => {
      const distKm = s.coordinates && userLocation
        ? haversineKm(userLocation.lat, userLocation.lng, s.coordinates.lat, s.coordinates.lng)
        : undefined;
      return { ...s, distKm } as Service & { distKm?: number };
    });

    if (catFilter !== "all") arr = arr.filter((s) => s.category === catFilter);

    // Comparator helpers — distance is rounded to ~10 m so that services
    // sharing the same building (banks in a tower, organisms in a community
    // center) get a stable ALPHABETICAL tiebreaker by name instead of a
    // random order. City is the second-level tiebreaker.
    const byNameThenCity = (a: Service, b: Service) =>
      a.name.localeCompare(b.name, "fr", { sensitivity: "base" }) ||
      (a.city ?? "").localeCompare(b.city ?? "", "fr", { sensitivity: "base" });

    if (sortMode === "name") {
      arr.sort(byNameThenCity);
    } else if (sortMode === "urgent") {
      arr.sort((a, b) => {
        const ua = a.isUrgent ? 0 : 1;
        const ub = b.isUrgent ? 0 : 1;
        if (ua !== ub) return ua - ub;
        const da = Math.round((a.distKm ?? 1e9) * 100);
        const db = Math.round((b.distKm ?? 1e9) * 100);
        if (da !== db) return da - db;
        return byNameThenCity(a, b);
      });
    } else {
      arr.sort((a, b) => {
        const da = Math.round((a.distKm ?? 1e9) * 100);
        const db = Math.round((b.distKm ?? 1e9) * 100);
        if (da !== db) return da - db;
        return byNameThenCity(a, b);
      });
    }

    return arr.slice(0, tab === "nearby" ? 60 : arr.length);
  }, [tabPool, userLocation, catFilter, sortMode, tab]);

  const nearbyForMap = useMemo(
    () => list.filter((s) => s.coordinates).slice(0, 12),
    [list]
  );

  async function onPin(id: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = await toggleFavorite(id);
    setFavIds(next);
  }

  function openService(s: Service) {
    Haptics.selectionAsync();
    router.push(`/service/${s.id}` as any);
  }

  function callService(phone: string) {
    if (!phone) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Linking.openURL(`tel:${phone.replace(/\s/g, "")}`);
  }

  function openInMaps(s: Service) {
    if (!s.coordinates) return;
    Haptics.selectionAsync();
    const { lat, lng } = s.coordinates;
    // Compose a "name + address" query so the routing app picks the EXACT
    // branch when several services share the same coordinates (e.g. multiple
    // banks in the same tower) — falls back gracefully on lat/lng if needed.
    const fullName = [s.name, s.address, s.city].filter(Boolean).join(", ");
    const q = encodeURIComponent(fullName);
    const url = Platform.select({
      // Apple Maps: daddr triggers turn-by-turn directions from current location
      ios: `http://maps.apple.com/?daddr=${q}&ll=${lat},${lng}&q=${encodeURIComponent(s.name)}`,
      // Google Maps universal directions URL — uses name+address for accuracy,
      // with lat/lng as an unambiguous fallback target.
      android: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=&travelmode=driving&dir_action=navigate&query=${q}`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${q}`,
    })!;
    Linking.openURL(url).catch(() => {
      // Fallback to a plain pin view if the directions URL fails
      const fallback = Platform.select({
        ios: `http://maps.apple.com/?q=${encodeURIComponent(s.name)}&ll=${lat},${lng}`,
        android: `geo:${lat},${lng}?q=${lat},${lng}(${encodeURIComponent(s.name)})`,
        default: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`,
      })!;
      Linking.openURL(fallback).catch(() => {});
    });
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={["#0e7e6e", "#0a5e52"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: (Platform.OS === "web" ? 16 : insets.top) + 14 }]}
      >
        <View style={styles.headerTitleRow}>
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              if (router.canGoBack()) router.back();
              else router.replace("/(tabs)" as any);
            }}
            style={styles.backBtn}
            hitSlop={12}
            accessibilityLabel={isFr ? "Retour" : "Back"}
          >
            <Feather name="chevron-left" size={24} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1} adjustsFontSizeToFit>
            {isFr ? "Carte & Favoris" : "Map & Favorites"}
          </Text>
        </View>
        <Text style={styles.headerSub} numberOfLines={2}>
          {isFr
            ? "Services proches de vous · épinglez vos préférés"
            : "Services near you · pin your favorites"}
        </Text>

        {/* Location status row */}
        <View style={styles.locRow}>
          {locationStatus === "requesting" ? (
            <>
              <ActivityIndicator size="small" color="rgba(255,255,255,0.85)" />
              <Text style={styles.locText}>{isFr ? "Localisation…" : "Locating…"}</Text>
            </>
          ) : locationStatus === "granted" && userLocation ? (
            <>
              <Feather name="map-pin" size={13} color="rgba(255,255,255,0.85)" />
              <Text style={styles.locText}>
                {isFr ? "Position détectée — triés par distance" : "Located — sorted by distance"}
              </Text>
            </>
          ) : (
            <>
              <Feather name="alert-circle" size={13} color="rgba(255,255,255,0.85)" />
              <Text style={styles.locText} numberOfLines={1}>
                {isFr ? "Position non disponible" : "Location unavailable"}
              </Text>
              <TouchableOpacity onPress={() => requestLocation({ force: true })} style={styles.retryBtn}>
                <Text style={styles.retryTxt}>{isFr ? "Réessayer" : "Retry"}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Tab segmented control */}
        <View style={styles.segment}>
          {(["nearby", "favorites"] as Tab[]).map((t) => {
            const active = tab === t;
            return (
              <Pressable
                key={t}
                onPress={() => { Haptics.selectionAsync(); setTab(t); }}
                style={[styles.segBtn, active && styles.segBtnActive]}
              >
                <Feather
                  name={t === "nearby" ? "map" : "heart"}
                  size={14}
                  color={active ? "#0e7e6e" : "#fff"}
                />
                <Text style={[styles.segTxt, active && styles.segTxtActive]}>
                  {t === "nearby"
                    ? (isFr ? "À proximité" : "Nearby")
                    : (isFr ? `Favoris${favIds.length ? ` (${favIds.length})` : ""}` : `Favorites${favIds.length ? ` (${favIds.length})` : ""}`)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </LinearGradient>

      {/* Category filter chips */}
      <View style={[styles.filterBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {(["all", ...availableCats] as CatFilter[]).map((c) => {
            const active = catFilter === c;
            const label =
              c === "all"
                ? (isFr ? "Tous" : "All")
                : (isFr ? CATEGORY_LABELS[c as Category] ?? c : CAT_LABELS_EN[c as Category] ?? c);
            const iconName = c === "all" ? "grid" : (CAT_ICONS[c as Category] ?? "circle");
            const count = catCounts[c] || 0;
            return (
              <Pressable
                key={c}
                onPress={() => { Haptics.selectionAsync(); setCatFilter(c); }}
                style={[
                  styles.chip,
                  { borderColor: colors.border, backgroundColor: colors.background },
                  active && { backgroundColor: "#0e7e6e", borderColor: "#0e7e6e" },
                ]}
              >
                <Feather
                  name={iconName as any}
                  size={12}
                  color={active ? "#fff" : "#0e7e6e"}
                />
                <Text style={[styles.chipTxt, { color: active ? "#fff" : colors.foreground }]} numberOfLines={1}>
                  {label}
                </Text>
                <View style={[styles.chipCount, { backgroundColor: active ? "rgba(255,255,255,0.22)" : "#0e7e6e15" }]}>
                  <Text style={[styles.chipCountTxt, { color: active ? "#fff" : "#0e7e6e" }]}>
                    {count}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Sort row */}
        <View style={styles.sortRow}>
          <Feather name="sliders" size={12} color={colors.mutedForeground} />
          <Text style={[styles.sortLabel, { color: colors.mutedForeground }]}>
            {isFr ? "Trier :" : "Sort:"}
          </Text>
          {(["distance", "name", "urgent"] as SortMode[]).map((m) => {
            const active = sortMode === m;
            const label =
              m === "distance" ? (isFr ? "Distance" : "Distance")
              : m === "name" ? (isFr ? "Nom" : "Name")
              : (isFr ? "Urgent" : "Urgent");
            return (
              <Pressable
                key={m}
                onPress={() => { Haptics.selectionAsync(); setSortMode(m); }}
                style={[
                  styles.sortBtn,
                  { borderColor: colors.border },
                  active && { backgroundColor: "#0e7e6e15", borderColor: "#0e7e6e" },
                ]}
              >
                <Text
                  style={[
                    styles.sortTxt,
                    { color: active ? "#0e7e6e" : colors.mutedForeground },
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 100 }]}
      >
        {/* Result summary */}
        <Text style={[styles.resultCount, { color: colors.mutedForeground }]}>
          {isFr
            ? `${list.length} service${list.length > 1 ? "s" : ""}${catFilter !== "all" ? ` · ${CATEGORY_LABELS[catFilter as Category] ?? catFilter}` : ""}`
            : `${list.length} service${list.length > 1 ? "s" : ""}${catFilter !== "all" ? ` · ${CAT_LABELS_EN[catFilter as Category] ?? catFilter}` : ""}`}
        </Text>

        {/* Mini visual map (lightweight: pins on a styled canvas) */}
        {tab === "nearby" && nearbyForMap.length > 0 && (
          <MiniMap
            services={nearbyForMap}
            userLocation={userLocation}
            colors={colors}
          />
        )}

        {list.length === 0 ? (
          <View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather
              name={tab === "favorites" ? "heart" : "map-pin"}
              size={32}
              color={colors.mutedForeground}
            />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              {tab === "favorites"
                ? (isFr ? "Aucun favori" : "No favorites yet")
                : (isFr ? "Aucun service géolocalisé" : "No geolocated services")}
            </Text>
            <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
              {tab === "favorites"
                ? (isFr
                    ? "Appuyez sur le cœur d'un service pour l'épingler ici."
                    : "Tap the heart on any service to pin it here.")
                : (isFr
                    ? "Activez la localisation pour découvrir les services proches."
                    : "Enable location to discover nearby services.")}
            </Text>
          </View>
        ) : (
          list.map((s) => {
            const isFav = favSet.has(s.id);
            const dist = (s as any).distKm as number | undefined;
            return (
              <Pressable
                key={s.id}
                onPress={() => openService(s)}
                style={({ pressed }) => [
                  styles.card,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
              >
                <View style={styles.cardHead}>
                  <View style={styles.pinWrap}>
                    <Feather name="map-pin" size={16} color="#0e7e6e" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardName, { color: colors.foreground }]} numberOfLines={2}>
                      {s.name}
                    </Text>
                    <Text style={[styles.cardCity, { color: colors.mutedForeground }]} numberOfLines={1}>
                      {s.city}{s.address ? ` · ${s.address}` : ""}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => onPin(s.id)} hitSlop={10} style={styles.heartBtn}>
                    <Feather
                      name="heart"
                      size={20}
                      color={isFav ? "#e11d48" : colors.mutedForeground}
                    />
                  </TouchableOpacity>
                </View>

                <View style={styles.cardActions}>
                  {typeof dist === "number" && (
                    <View style={styles.distBadge}>
                      <Feather name="navigation" size={11} color="#0e7e6e" />
                      <Text style={styles.distTxt}>
                        {dist < 1 ? `${Math.round(dist * 1000)} m` : `${dist.toFixed(1)} km`}
                      </Text>
                    </View>
                  )}
                  {s.coordinates && (
                    <TouchableOpacity onPress={() => openInMaps(s)} style={styles.actionBtn}>
                      <Feather name="map" size={13} color="#0e7e6e" />
                      <Text style={styles.actionTxt}>{isFr ? "Itinéraire" : "Directions"}</Text>
                    </TouchableOpacity>
                  )}
                  {s.phone ? (
                    <TouchableOpacity onPress={() => callService(s.phone)} style={[styles.actionBtn, styles.actionBtnPrimary]}>
                      <Feather name="phone" size={13} color="#fff" />
                      <Text style={[styles.actionTxt, { color: "#fff" }]}>
                        {isFr ? "Appeler" : "Call"}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

// ── Mini visual map: simple SVG-like dots laid out by relative coords ────
function MiniMap({
  services,
  userLocation,
  colors,
}: {
  services: (Service & { distKm?: number })[];
  userLocation: { lat: number; lng: number } | null;
  colors: any;
}) {
  // Measure container size so we can place dots in PIXELS (Android-safe).
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);

  const projected = useMemo(() => {
    const coords = services.map((s) => s.coordinates!).filter(Boolean);
    if (userLocation) coords.push(userLocation);
    if (coords.length < 2 || !size) return null;
    const lats = coords.map((c) => c.lat);
    const lngs = coords.map((c) => c.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const dLat = (maxLat - minLat) || 1e-4;
    const dLng = (maxLng - minLng) || 1e-4;
    const padX = 14, padY = 14;
    const innerW = Math.max(1, size.w - padX * 2);
    const innerH = Math.max(1, size.h - padY * 2);

    function project(lat: number, lng: number) {
      const x = padX + ((lng - minLng) / dLng) * innerW;
      const y = padY + (1 - (lat - minLat) / dLat) * innerH;
      return { x, y };
    }

    return {
      services: services.slice(0, 12).map((s) => ({ s, ...project(s.coordinates!.lat, s.coordinates!.lng) })),
      user: userLocation ? project(userLocation.lat, userLocation.lng) : null,
    };
  }, [services, userLocation, size]);

  return (
    <View
      style={[styles.miniMap, { backgroundColor: colors.card, borderColor: colors.border }]}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        setSize((prev) =>
          prev && Math.abs(prev.w - width) < 1 && Math.abs(prev.h - height) < 1
            ? prev
            : { w: width, h: height }
        );
      }}
    >
      {size && (
        <View style={styles.miniGrid} pointerEvents="none">
          {[0, 0.25, 0.5, 0.75, 1].map((p) => (
            <React.Fragment key={p}>
              <View style={[styles.gridLineH, { top: p * size.h, backgroundColor: colors.border }]} />
              <View style={[styles.gridLineV, { left: p * size.w, backgroundColor: colors.border }]} />
            </React.Fragment>
          ))}
        </View>
      )}

      {projected?.services.map(({ s, x, y }) => (
        <View
          key={s.id}
          style={[styles.dot, { left: x, top: y }]}
        >
          <View style={styles.dotPing} />
          <View style={styles.dotCore} />
        </View>
      ))}

      {projected?.user && (
        <View
          style={[styles.userDot, { left: projected.user.x, top: projected.user.y }]}
        >
          <View style={styles.userPing} />
          <View style={styles.userCore} />
        </View>
      )}

      <View style={styles.legend}>
        <View style={styles.legendRow}>
          <View style={styles.legendDotUser} />
          <Text style={[styles.legendTxt, { color: colors.foreground }]}>Vous</Text>
        </View>
        <View style={styles.legendRow}>
          <View style={styles.legendDotSvc} />
          <Text style={[styles.legendTxt, { color: colors.foreground }]}>Services</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 18,
    paddingBottom: 14,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  backBtn: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: -10,
  },
  headerTitle: { color: "#fff", fontSize: 22, fontFamily: "Inter_700Bold" },
  headerSub: { color: "rgba(255,255,255,0.85)", fontSize: 12, marginTop: 2, fontFamily: "Inter_400Regular" },
  locRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.18)",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
  },
  locText: { color: "rgba(255,255,255,0.95)", fontSize: 11, fontFamily: "Inter_500Medium", flex: 1 },
  retryBtn: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  retryTxt: { color: "#fff", fontSize: 11, fontFamily: "Inter_600SemiBold" },

  segment: {
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.18)",
    borderRadius: 12,
    padding: 4,
    marginTop: 10,
    gap: 4,
  },
  segBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 9,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  segBtnActive: { backgroundColor: "#fff" },
  segTxt: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 12 },
  segTxtActive: { color: "#0e7e6e" },

  body: { padding: 14, paddingTop: 14 },

  filterBar: { borderBottomWidth: 1, paddingTop: 10, paddingBottom: 8 },
  chipsRow: { paddingHorizontal: 12, gap: 6 },
  chip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 14, borderWidth: 1,
  },
  chipTxt: { fontSize: 12, fontFamily: "Inter_600SemiBold", maxWidth: 110 },
  chipCount: {
    paddingHorizontal: 6, paddingVertical: 1,
    borderRadius: 8, marginLeft: 2,
  },
  chipCountTxt: { fontSize: 10, fontFamily: "Inter_700Bold" },

  sortRow: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, marginTop: 8,
  },
  sortLabel: { fontSize: 11, fontFamily: "Inter_500Medium", marginRight: 2 },
  sortBtn: {
    paddingHorizontal: 9, paddingVertical: 4,
    borderRadius: 10, borderWidth: 1,
  },
  sortTxt: { fontSize: 11, fontFamily: "Inter_600SemiBold" },

  resultCount: { fontSize: 11, fontFamily: "Inter_500Medium", marginBottom: 10, marginLeft: 2 },

  miniMap: {
    height: 180,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 14,
    position: "relative",
  },
  miniGrid: { ...StyleSheet.absoluteFillObject, opacity: 0.5 },
  gridLineH: { position: "absolute", left: 0, right: 0, height: 1 },
  gridLineV: { position: "absolute", top: 0, bottom: 0, width: 1 },

  dot: { position: "absolute", width: 14, height: 14, marginLeft: -7, marginTop: -7, alignItems: "center", justifyContent: "center" },
  dotPing: { position: "absolute", width: 18, height: 18, borderRadius: 9, backgroundColor: "#0e7e6e", opacity: 0.25 },
  dotCore: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#0e7e6e", borderWidth: 1.5, borderColor: "#fff" },

  userDot: { position: "absolute", width: 18, height: 18, marginLeft: -9, marginTop: -9, alignItems: "center", justifyContent: "center" },
  userPing: { position: "absolute", width: 26, height: 26, borderRadius: 13, backgroundColor: "#3b82f6", opacity: 0.3 },
  userCore: { width: 12, height: 12, borderRadius: 6, backgroundColor: "#3b82f6", borderWidth: 2, borderColor: "#fff" },

  legend: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    flexDirection: "row",
    gap: 12,
  },
  legendRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendDotUser: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#3b82f6" },
  legendDotSvc: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#0e7e6e" },
  legendTxt: { fontSize: 10, fontFamily: "Inter_500Medium" },

  empty: { padding: 28, borderRadius: 16, borderWidth: 1, alignItems: "center", gap: 10 },
  emptyTitle: { fontSize: 15, fontFamily: "Inter_700Bold", textAlign: "center" },
  emptyDesc: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 18 },

  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    gap: 10,
  },
  cardHead: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  pinWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: "#0e7e6e15", alignItems: "center", justifyContent: "center",
  },
  cardName: { fontSize: 14, fontFamily: "Inter_700Bold", marginBottom: 2 },
  cardCity: { fontSize: 11, fontFamily: "Inter_400Regular" },
  heartBtn: { padding: 4 },

  cardActions: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  distBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#0e7e6e15", paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8,
  },
  distTxt: { color: "#0e7e6e", fontSize: 11, fontFamily: "Inter_600SemiBold" },
  actionBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "#0e7e6e10", borderWidth: 1, borderColor: "#0e7e6e30",
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
  },
  actionBtnPrimary: { backgroundColor: "#0e7e6e", borderColor: "#0e7e6e" },
  actionTxt: { color: "#0e7e6e", fontSize: 11, fontFamily: "Inter_600SemiBold" },
});
