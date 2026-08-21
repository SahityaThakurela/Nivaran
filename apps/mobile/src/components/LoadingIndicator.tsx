import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { colors, spacing } from "../theme/tokens";

type LoadingIndicatorProps = {
  /** 0–1 progress; when omitted, runs an indeterminate sweep. */
  progress?: number;
};

/**
 * Loading bar from Figma nodes 53:7091–53:7093 (48×4, track #D9E2FC, fill #004AC6).
 */
export function LoadingIndicator({ progress }: LoadingIndicatorProps) {
  const width = useRef(new Animated.Value(progress ?? 0.15)).current;

  useEffect(() => {
    if (typeof progress === "number") {
      Animated.timing(width, {
        toValue: Math.min(1, Math.max(0, progress)),
        duration: 280,
        useNativeDriver: false,
      }).start();
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(width, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: false,
        }),
        Animated.timing(width, {
          toValue: 0.15,
          duration: 0,
          useNativeDriver: false,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [progress, width]);

  return (
    <View style={styles.track} accessibilityRole="progressbar">
      <Animated.View
        style={[
          styles.fill,
          {
            width: width.interpolate({
              inputRange: [0, 1],
              outputRange: ["0%", "100%"],
            }),
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: spacing.loadingWidth,
    height: spacing.loadingHeight,
    borderRadius: 9999,
    backgroundColor: colors.loadingTrack,
    overflow: "hidden",
    justifyContent: "center",
  },
  fill: {
    height: "100%",
    borderRadius: 9999,
    backgroundColor: colors.loadingFill,
  },
});
