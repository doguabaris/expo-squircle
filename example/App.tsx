import Squircle, { RoundedSurfaceOptions } from "expo-squircle";
import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function App() {
  const demoSquircle = useMemo<RoundedSurfaceOptions>(
    () => ({
      smoothFactor: 1,
      baseRadius: 50,
      surfaceColor: "#E3ECF4",
      borderColor: "#c4e0e9",
      borderWidth: 1,
    }),
    [],
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.wrapper}>
        <Text style={styles.title}>expo-squircle</Text>
        <Text style={styles.subtitle}>200px × 200px sample squircle</Text>
        <Squircle squircleParams={demoSquircle} style={styles.squircle}>
          <View style={styles.center}>
            <Text style={styles.tagline}>Smooth corners</Text>
          </View>
        </Squircle>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
    alignItems: "center",
    justifyContent: "center",
  },
  wrapper: {
    alignItems: "center",
    gap: 12,
  },
  title: {
    fontSize: 20,
    color: "#F8FAFC",
    fontWeight: "600",
  },
  subtitle: {
    color: "#CBD5F5",
  },
  squircle: {
    width: 200,
    height: 200,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  tagline: {
    color: "#E4E7EC",
    fontWeight: "600",
  },
});
