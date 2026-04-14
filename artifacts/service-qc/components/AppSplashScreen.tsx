import React, { useEffect, useRef, useState } from "react";
import { Animated, Image, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

interface AppSplashScreenProps {
  visible: boolean;
  onDone?: () => void;
}

export function AppSplashScreen({ visible, onDone }: AppSplashScreenProps) {
  const containerOpacity = useRef(new Animated.Value(1)).current;
  const logoScale = useRef(new Animated.Value(0.5)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const dotsOpacity = useRef(new Animated.Value(0)).current;

  const [mounted, setMounted] = useState(true);

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 50,
          friction: 6,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.timing(dotsOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
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
      <LinearGradient
        colors={["#0a6558", "#0e7e6e", "#1a9f8c"]}
        style={styles.container}
      >
        <Animated.View
          style={[
            styles.logoContainer,
            {
              transform: [{ scale: logoScale }],
              opacity: logoOpacity,
            },
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

        <Animated.View style={{ opacity: textOpacity, alignItems: "center" }}>
          <Text style={styles.appName}>AttenteZéro</Text>
          <Text style={styles.tagline}>Services communautaires du Québec</Text>
        </Animated.View>

        <Animated.View style={[styles.loadingDots, { opacity: dotsOpacity }]}>
          <PulsingDot delay={0} />
          <PulsingDot delay={200} />
          <PulsingDot delay={400} />
        </Animated.View>
      </LinearGradient>
    </Animated.View>
  );
}

function PulsingDot({ delay }: { delay: number }) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 500,
          delay,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  return (
    <Animated.View style={[styles.dot, { opacity }]} />
  );
}

const styles = StyleSheet.create({
  overlay: {
    zIndex: 999,
  },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
  },
  logoContainer: {
    marginBottom: 8,
  },
  logoCircle: {
    width: 140,
    height: 140,
    borderRadius: 36,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 10,
    overflow: "hidden",
  },
  logoImage: {
    width: 130,
    height: 130,
  },
  appName: {
    fontSize: 38,
    fontFamily: "Inter_700Bold",
    color: "#ffffff",
    letterSpacing: 3,
  },
  tagline: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.75)",
    marginTop: 4,
  },
  loadingDots: {
    flexDirection: "row",
    gap: 8,
    marginTop: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.9)",
  },
});
