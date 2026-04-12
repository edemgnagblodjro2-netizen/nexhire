import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useMemo, useState } from "react";
import {
  FlatList,
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

import { useColors } from "@/hooks/useColors";
import {
  RESTAURANTS,
  QUEBEC_CITIES,
  CUISINE_LABELS,
  type Restaurant,
  type CuisineType,
  type QuebecCity,
} from "@/data/restaurants";

const ALL_CUISINES: CuisineType[] = [
  "québécois",
  "français",
  "italien",
  "bistro",
  "américain",
  "japonais",
  "steakhouse",
  "fruits de mer",
  "méditerranéen",
  "brasserie",
];

function StarRating({ rating }: { rating: number }) {
  const colors = useColors();
  const full = Math.floor(rating);
  const hasHalf = rating - full >= 0.5;
  return (
    <View style={styles.starsRow}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Feather
          key={i}
          name={i <= full ? "star" : hasHalf && i === full + 1 ? "star" : "star"}
          size={11}
          color={i <= full || (hasHalf && i === full + 1) ? "#F59E0B" : colors.border}
          style={{ marginRight: 1 }}
        />
      ))}
      <Text style={[styles.ratingText, { color: colors.mutedForeground }]}>
        {rating.toFixed(1)}
      </Text>
    </View>
  );
}

const CUISINE_COLORS: Record<CuisineType, string> = {
  québécois: "#0e7e6e",
  français: "#2563eb",
  italien: "#dc2626",
  japonais: "#7c3aed",
  méditerranéen: "#0891b2",
  américain: "#d97706",
  asiatique: "#db2777",
  steakhouse: "#b45309",
  "fruits de mer": "#0369a1",
  bistro: "#4b5563",
  végétarien: "#15803d",
  brasserie: "#92400e",
};

function RestaurantCard({ restaurant }: { restaurant: Restaurant }) {
  const colors = useColors();
  const cuisineColor = CUISINE_COLORS[restaurant.cuisine] || colors.primary;

  function handleCall() {
    Haptics.selectionAsync();
    Linking.openURL(`tel:${restaurant.phone}`);
  }

  function handleWeb() {
    Haptics.selectionAsync();
    Linking.openURL(restaurant.website);
  }

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={[styles.cardAccent, { backgroundColor: cuisineColor }]} />
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Text
              style={[styles.cardName, { color: colors.foreground }]}
              numberOfLines={1}
            >
              {restaurant.name}
            </Text>
          </View>
          <View style={styles.cardMetaRow}>
            <View
              style={[
                styles.cuisineBadge,
                { backgroundColor: cuisineColor + "18" },
              ]}
            >
              <Text style={[styles.cuisineText, { color: cuisineColor }]}>
                {CUISINE_LABELS[restaurant.cuisine]}
              </Text>
            </View>
            <View style={styles.cityRow}>
              <Feather
                name="map-pin"
                size={11}
                color={colors.mutedForeground}
              />
              <Text
                style={[styles.cityText, { color: colors.mutedForeground }]}
              >
                {restaurant.city}
              </Text>
            </View>
          </View>
        </View>

        <StarRating rating={restaurant.rating} />

        <Text
          style={[styles.description, { color: colors.mutedForeground }]}
          numberOfLines={3}
        >
          {restaurant.description}
        </Text>

        {restaurant.mustTry && (
          <View
            style={[
              styles.mustTryRow,
              { backgroundColor: "#F59E0B18", borderColor: "#F59E0B40" },
            ]}
          >
            <Feather name="award" size={12} color="#F59E0B" />
            <Text style={[styles.mustTryText, { color: "#B45309" }]}>
              À essayer : {restaurant.mustTry}
            </Text>
          </View>
        )}

        {restaurant.openHours && (
          <View style={styles.hoursRow}>
            <Feather name="clock" size={12} color={colors.mutedForeground} />
            <Text
              style={[styles.hoursText, { color: colors.mutedForeground }]}
            >
              {restaurant.openHours}
            </Text>
          </View>
        )}

        <View style={styles.actionRow}>
          <TouchableOpacity
            onPress={handleCall}
            style={[styles.actionBtn, { backgroundColor: colors.primary }]}
            activeOpacity={0.8}
          >
            <Feather name="phone" size={14} color="#fff" />
            <Text style={styles.actionBtnText}>Appeler</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleWeb}
            style={[
              styles.actionBtn,
              styles.actionBtnOutline,
              {
                borderColor: colors.primary,
                backgroundColor: colors.secondary,
              },
            ]}
            activeOpacity={0.8}
          >
            <Feather name="globe" size={14} color={colors.primary} />
            <Text style={[styles.actionBtnText, { color: colors.primary }]}>
              Site web
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export default function RestaurantsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");
  const [selectedCity, setSelectedCity] = useState<QuebecCity | null>(null);
  const [selectedCuisine, setSelectedCuisine] = useState<CuisineType | null>(
    null
  );

  const topPadding = Platform.OS === "web" ? 16 : 0;
  const bottomPadding = Platform.OS === "web" ? 34 : 0;

  const filtered = useMemo(() => {
    return RESTAURANTS.filter((r) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        r.name.toLowerCase().includes(q) ||
        r.city.toLowerCase().includes(q) ||
        r.cuisine.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q);
      const matchCity = !selectedCity || r.city === selectedCity;
      const matchCuisine = !selectedCuisine || r.cuisine === selectedCuisine;
      return matchSearch && matchCity && matchCuisine;
    }).sort((a, b) => b.rating - a.rating);
  }, [search, selectedCity, selectedCuisine]);

  const cityCount = useMemo(() => {
    const counts: Record<string, number> = {};
    RESTAURANTS.forEach((r) => {
      counts[r.city] = (counts[r.city] || 0) + 1;
    });
    return counts;
  }, []);

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top + topPadding,
          paddingBottom: insets.bottom + bottomPadding,
        },
      ]}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>
            Restaurants
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            {filtered.length} établissement
            {filtered.length !== 1 ? "s" : ""} au Québec
          </Text>
        </View>
        <View
          style={[
            styles.ratingBadge,
            { backgroundColor: "#F59E0B18", borderColor: "#F59E0B50" },
          ]}
        >
          <Feather name="award" size={14} color="#F59E0B" />
          <Text style={styles.ratingBadgeText}>Top sélection</Text>
        </View>
      </View>

      {/* Search */}
      <View
        style={[
          styles.searchContainer,
          {
            backgroundColor: colors.muted,
            borderColor: colors.border,
          },
        ]}
      >
        <Feather name="search" size={18} color={colors.mutedForeground} />
        <TextInput
          style={[styles.searchInput, { color: colors.foreground }]}
          placeholder="Rechercher un restaurant…"
          placeholderTextColor={colors.mutedForeground}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        {search.length > 0 && Platform.OS !== "ios" && (
          <Pressable onPress={() => setSearch("")}>
            <Feather name="x" size={16} color={colors.mutedForeground} />
          </Pressable>
        )}
      </View>

      {/* City Filter */}
      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          <TouchableOpacity
            onPress={() => {
              Haptics.selectionAsync();
              setSelectedCity(null);
            }}
            style={[
              styles.filterChip,
              {
                backgroundColor: !selectedCity
                  ? colors.primary
                  : colors.muted,
                borderColor: !selectedCity ? colors.primary : colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.filterChipText,
                { color: !selectedCity ? "#fff" : colors.foreground },
              ]}
            >
              Toutes les villes
            </Text>
          </TouchableOpacity>
          {QUEBEC_CITIES.filter((c) => cityCount[c] > 0).map((city) => (
            <TouchableOpacity
              key={city}
              onPress={() => {
                Haptics.selectionAsync();
                setSelectedCity(city === selectedCity ? null : city);
              }}
              style={[
                styles.filterChip,
                {
                  backgroundColor:
                    selectedCity === city ? colors.primary : colors.muted,
                  borderColor:
                    selectedCity === city ? colors.primary : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.filterChipText,
                  {
                    color:
                      selectedCity === city ? "#fff" : colors.foreground,
                  },
                ]}
              >
                {city}
                <Text
                  style={{
                    color:
                      selectedCity === city
                        ? "rgba(255,255,255,0.7)"
                        : colors.mutedForeground,
                    fontSize: 11,
                  }}
                >
                  {" "}
                  {cityCount[city]}
                </Text>
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Cuisine Filter */}
      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[
            styles.filterScroll,
            { paddingTop: 0, paddingBottom: 8 },
          ]}
        >
          <TouchableOpacity
            onPress={() => {
              Haptics.selectionAsync();
              setSelectedCuisine(null);
            }}
            style={[
              styles.cuisineChip,
              {
                backgroundColor: !selectedCuisine
                  ? colors.foreground
                  : colors.muted,
                borderColor: !selectedCuisine
                  ? colors.foreground
                  : colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.cuisineChipText,
                {
                  color: !selectedCuisine ? colors.background : colors.foreground,
                },
              ]}
            >
              Toutes cuisines
            </Text>
          </TouchableOpacity>
          {ALL_CUISINES.map((cuisine) => {
            const count = RESTAURANTS.filter(
              (r) =>
                r.cuisine === cuisine &&
                (!selectedCity || r.city === selectedCity)
            ).length;
            if (count === 0) return null;
            const active = selectedCuisine === cuisine;
            const c = CUISINE_COLORS[cuisine];
            return (
              <TouchableOpacity
                key={cuisine}
                onPress={() => {
                  Haptics.selectionAsync();
                  setSelectedCuisine(active ? null : cuisine);
                }}
                style={[
                  styles.cuisineChip,
                  {
                    backgroundColor: active ? c : c + "15",
                    borderColor: active ? c : c + "40",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.cuisineChipText,
                    { color: active ? "#fff" : c },
                  ]}
                >
                  {CUISINE_LABELS[cuisine]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* List */}
      {filtered.length === 0 ? (
        <View style={styles.emptyState}>
          <Feather name="coffee" size={40} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            Aucun restaurant trouvé
          </Text>
          <Text
            style={[styles.emptySubtitle, { color: colors.mutedForeground }]}
          >
            Essayez d'autres filtres ou une autre recherche.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(r) => r.id}
          renderItem={({ item }) => <RestaurantCard restaurant={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  ratingBadgeText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "#B45309",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 12 : 8,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  filterScroll: {
    paddingHorizontal: 16,
    paddingBottom: 4,
    paddingTop: 4,
    gap: 8,
    flexDirection: "row",
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  cuisineChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  cuisineChipText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 100,
    gap: 12,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    flexDirection: "row",
  },
  cardAccent: {
    width: 4,
    minHeight: 60,
  },
  cardContent: {
    flex: 1,
    padding: 14,
    gap: 8,
  },
  cardHeader: {
    gap: 6,
  },
  cardTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardName: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    flex: 1,
    marginRight: 8,
  },
  cardMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  cuisineBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  cuisineText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  cityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  cityText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  starsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    marginLeft: 4,
  },
  description: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
  },
  mustTryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  mustTryText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    flex: 1,
  },
  hoursRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  hoursText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    flex: 1,
    justifyContent: "center",
  },
  actionBtnOutline: {
    borderWidth: 1,
  },
  actionBtnText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
});
