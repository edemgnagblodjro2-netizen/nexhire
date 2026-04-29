import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Image,
  ImageSourcePropType,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";

const BANNERS: ImageSourcePropType[] = [
  require("@/assets/images/banner-community.png"),
  require("@/assets/images/banner-help.png"),
  require("@/assets/images/banner-terrain.png"),
  require("@/assets/images/banner-canada.png"),
];

const AUTO_ROTATE_MS = 4000;
const HORIZONTAL_PADDING = 16;

export function HomeBannerSlider() {
  const colors = useColors();
  const [width, setWidth] = useState(
    Dimensions.get("window").width - HORIZONTAL_PADDING * 2,
  );
  const [index, setIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const userInteracting = useRef(false);

  useEffect(() => {
    if (BANNERS.length <= 1) return;
    const id = setInterval(() => {
      if (userInteracting.current) return;
      const next = (index + 1) % BANNERS.length;
      scrollRef.current?.scrollTo({ x: next * width, animated: true });
      setIndex(next);
    }, AUTO_ROTATE_MS);
    return () => clearInterval(id);
  }, [index, width]);

  function handleScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const x = e.nativeEvent.contentOffset.x;
    const i = Math.round(x / width);
    if (i !== index) setIndex(i);
  }

  return (
    <View
      style={styles.wrap}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onTouchStart={() => {
          userInteracting.current = true;
        }}
        onTouchEnd={() => {
          setTimeout(() => {
            userInteracting.current = false;
          }, 2000);
        }}
        style={{ borderRadius: 16 }}
      >
        {BANNERS.map((src, i) => (
          <View key={i} style={[styles.slide, { width }]}>
            <Image
              source={src}
              style={styles.image}
              resizeMode="cover"
              accessibilityIgnoresInvertColors
            />
          </View>
        ))}
      </ScrollView>

      {BANNERS.length > 1 && (
        <View style={styles.dotsRow}>
          {BANNERS.map((_, i) => {
            const active = i === index;
            return (
              <View
                key={i}
                style={[
                  styles.dot,
                  {
                    width: active ? 18 : 6,
                    backgroundColor: active
                      ? colors.primary
                      : colors.mutedForeground + "55",
                  },
                ]}
              />
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 14,
  },
  slide: {
    aspectRatio: 16 / 9,
    borderRadius: 16,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
    borderRadius: 16,
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
});
