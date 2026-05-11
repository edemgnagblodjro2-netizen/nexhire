import React, { useEffect, useRef, useState } from "react";
import { Animated, Image, StyleSheet, Text, View } from "react-native";

interface AppSplashScreenProps {
  visible: boolean;
  onDone?: () => void;
}

const SERVICES_COUNT_LABEL = "7 957";

const RING_SIZES = [180, 360, 540, 720, 900];

export function AppSplashScreen({ visible, onDone }: AppSplashScreenProps) {
  const containerOpacity = useRef(new Animated.Value(1)).current;
  const logoScale = useRef(new Animated.Value(0.6)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const badgeOpacity = useRef(new Animated.Value(0)).current;
  const badgeTranslate = useRef(new Animated.Value(12)).current;
  const ringsOpacity = useRef(new Animated.Value(0)).current;
  const footerOpacity = useRef(new Animated.Value(0)).current;

  const [mounted, setMounted] = useState(true);

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(ringsOpacity, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 60,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(badgeOpacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(badgeTranslate, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(footerOpacity, {
          toValue: 1,
          duration: 280,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  useEffect(() => {
    if (!visible) {
      Animated.timing(containerOpacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => {
        setMounted(false);
        onDone?.();
      });
    }
  }, [visible]);

  if (!mounted) return null;

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        styles.overlay,
        { opacity: containerOpacity, pointerEvents: visible ? "auto" : "none" },
      ]}
    >
      <View style={styles.container}>
        {/* Cercles concentriques décoratifs */}
        <Animated.View
          style={[StyleSheet.absoluteFill, styles.ringsLayer, { opacity: ringsOpacity }]}
          pointerEvents="none"
        >
          {RING_SIZES.map((size, i) => (
            <View
              key={size}
              style={[
                styles.ring,
                {
                  width: size,
                  height: size,
                  borderRadius: size / 2,
                  borderWidth: i === 2 ? 1.5 : 1,
                  borderColor: `rgba(255,255,255,${0.18 - i * 0.025})`,
                },
              ]}
            />
          ))}
        </Animated.View>

        {/* Petits points lumineux */}
        <View style={[StyleSheet.absoluteFill, { opacity: 0.5 }]} pointerEvents="none">
          <View style={[styles.sparkle, { top: "12%", left: "18%", width: 4, height: 4 }]} />
          <View style={[styles.sparkle, { top: "22%", right: "14%", width: 6, height: 6 }]} />
          <View style={[styles.sparkle, { bottom: "28%", left: "10%", width: 4, height: 4 }]} />
          <View style={[styles.sparkle, { bottom: "18%", right: "22%", width: 4, height: 4 }]} />
          <View style={[styles.sparkle, { top: "40%", left: "8%", width: 3, height: 3, opacity: 0.7 }]} />
        </View>

        {/* Bloc central */}
        <View style={styles.centerBlock}>
          <Animated.View
            style={[
              styles.logoOuterGlow,
              { transform: [{ scale: logoScale }], opacity: logoOpacity },
            ]}
          >
            <View style={styles.logoCircle}>
              <Image
                source={require("@/assets/images/icon.png")}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
          </Animated.View>

          <Animated.View style={{ opacity: textOpacity, alignItems: "center", paddingHorizontal: 24 }}>
            <Text
              style={styles.appName}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              AttenteZéro
            </Text>
            <Text style={styles.tagline} numberOfLines={1} adjustsFontSizeToFit>
              Services communautaires du Québec
            </Text>
          </Animated.View>

          <Animated.View
            style={[
              styles.badge,
              { opacity: badgeOpacity, transform: [{ translateY: badgeTranslate }] },
            ]}
          >
            <View style={styles.badgeDot} />
            <Text style={styles.badgeNumber}>{SERVICES_COUNT_LABEL}</Text>
            <Text style={styles.badgeLabel}>services actifs</Text>
          </Animated.View>
        </View>

        {/* Footer CivicAI */}
        <Animated.View style={[styles.footer, { opacity: footerOpacity }]}>
          <Text style={styles.footerKicker}>PROPULSÉ PAR</Text>
          <Text style={styles.footerBrand}>CivicAI</Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    zIndex: 999,
  },
  container: {
    flex: 1,
    backgroundColor: "#0d9488",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  ringsLayer: {
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    position: "absolute",
    backgroundColor: "transparent",
  },
  sparkle: {
    position: "absolute",
    backgroundColor: "rgba(255,255,255,0.85)",
    borderRadius: 999,
  },
  centerBlock: {
    alignItems: "center",
    gap: 22,
  },
  logoOuterGlow: {
    width: 128,
    height: 128,
    borderRadius: 30,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.25,
    shadowRadius: 28,
    elevation: 12,
  },
  logoCircle: {
    width: 112,
    height: 112,
    borderRadius: 26,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  logoImage: {
    width: 96,
    height: 96,
  },
  appName: {
    fontSize: 34,
    fontFamily: "Inter_700Bold",
    color: "#ffffff",
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "rgba(220,252,231,0.92)",
    marginTop: 6,
    letterSpacing: 0.2,
  },
  badge: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#6ee7b7",
  },
  badgeNumber: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: "#ffffff",
    letterSpacing: 0.3,
  },
  badgeLabel: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.85)",
  },
  footer: {
    position: "absolute",
    bottom: 44,
    alignItems: "center",
    gap: 2,
  },
  footerKicker: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.45)",
    letterSpacing: 2.5,
  },
  footerBrand: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: "rgba(255,255,255,0.9)",
    letterSpacing: 1.2,
  },
});
