import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { colors, fonts } from "../theme/tokens";
import { Icon } from "./Icon";

export type TimelineStepState = "upcoming" | "current" | "done" | "rejected";

export type TimelineStep = {
  key: string;
  label: string;
  at?: string;
  description: string;
  state: TimelineStepState;
};

const CHECK_GREEN = "#006D30";
const CURRENT_BLUE = "#00288E";
const RAIL_GRAY = "#DAD9E3";
const CURRENT_BG = "rgba(221, 225, 255, 0.45)";
const REJECT_BG = "rgba(255, 218, 214, 0.7)";
const REJECT_DOT = "#93000A";

type Props = {
  title: string;
  steps: TimelineStep[];
  /** Play check-and-advance from the start up to the real current step. */
  animate?: boolean;
};

function targetIndex(steps: TimelineStep[]): number {
  const current = steps.findIndex(
    (s) => s.state === "current" || s.state === "rejected",
  );
  if (current >= 0) return current;
  const lastDone = steps.reduce(
    (acc, s, i) => (s.state === "done" ? i : acc),
    -1,
  );
  return Math.max(0, lastDone);
}

export function ActivityTimeline({ title, steps, animate = false }: Props) {
  const finalIndex = useMemo(() => targetIndex(steps), [steps]);
  const [playIndex, setPlayIndex] = useState(animate ? -1 : finalIndex);

  useEffect(() => {
    if (!animate) {
      setPlayIndex(finalIndex);
      return;
    }

    setPlayIndex(-1);
    const timers: ReturnType<typeof setTimeout>[] = [];
    let hop = 0;

    const run = () => {
      setPlayIndex(hop);
      if (hop >= finalIndex) return;
      const delay = hop === finalIndex - 1 ? 780 : 900;
      hop += 1;
      timers.push(setTimeout(run, delay));
    };

    timers.push(setTimeout(run, 320));
    return () => {
      timers.forEach(clearTimeout);
    };
  }, [animate, finalIndex]);

  const displayed = steps.map((step, index) => {
    let state: TimelineStepState = step.state;
    if (animate) {
      if (playIndex < 0) {
        state = "upcoming";
      } else if (index < playIndex) {
        state = step.state === "rejected" ? "rejected" : "done";
      } else if (index === playIndex) {
        state =
          index === finalIndex
            ? step.state
            : step.state === "rejected"
              ? "rejected"
              : "current";
        if (index === finalIndex && step.state === "done") state = "done";
        if (index === finalIndex && step.state === "upcoming") state = "current";
      } else {
        state = "upcoming";
      }
    }
    return { ...step, state };
  });

  return (
    <View style={styles.card}>
      <Text style={styles.heading}>{title}</Text>
      <View style={styles.list}>
        <View style={styles.railTrack} />
        {displayed.map((step, index) => (
          <TimelineRow
            key={step.key}
            step={step}
            isLast={index === displayed.length - 1}
          />
        ))}
      </View>
    </View>
  );
}

function TimelineRow({
  step,
  isLast,
}: {
  step: TimelineStep;
  isLast: boolean;
}) {
  const scale = useRef(new Animated.Value(step.state === "upcoming" ? 0.86 : 1)).current;
  const check = useRef(new Animated.Value(step.state === "done" ? 1 : 0)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const highlight = useRef(
    new Animated.Value(step.state === "current" || step.state === "rejected" ? 1 : 0),
  ).current;

  useEffect(() => {
    const done = step.state === "done";
    const current = step.state === "current" || step.state === "rejected";

    Animated.timing(highlight, {
      toValue: current ? 1 : 0,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    if (done) {
      pulse.stopAnimation();
      pulse.setValue(1);
      Animated.parallel([
        Animated.sequence([
          Animated.spring(scale, {
            toValue: 1.18,
            friction: 5,
            tension: 140,
            useNativeDriver: true,
          }),
          Animated.spring(scale, {
            toValue: 1,
            friction: 6,
            tension: 120,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(check, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    check.setValue(0);

    if (current) {
      Animated.spring(scale, {
        toValue: 1,
        friction: 6,
        useNativeDriver: true,
      }).start();
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, {
            toValue: 1.12,
            duration: 700,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(pulse, {
            toValue: 1,
            duration: 700,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    }

    pulse.stopAnimation();
    pulse.setValue(1);
    Animated.spring(scale, {
      toValue: 0.9,
      friction: 7,
      useNativeDriver: true,
    }).start();
  }, [step.state, scale, check, pulse, highlight]);

  const isUpcoming = step.state === "upcoming";
  const isCurrent = step.state === "current";
  const isRejected = step.state === "rejected";
  const isDone = step.state === "done";

  const titleColor = isRejected
    ? colors.unresolvedText
    : isCurrent
      ? CURRENT_BLUE
      : isUpcoming
        ? "rgba(26, 27, 34, 0.45)"
        : "#1A1B22";
  const stampColor = isCurrent
    ? "rgba(0, 40, 142, 0.7)"
    : isUpcoming
      ? "rgba(117, 118, 132, 0.5)"
      : "#757684";
  const descColor = isUpcoming ? "rgba(68, 70, 83, 0.55)" : "#444653";

  return (
    <View style={[styles.row, isLast && styles.rowLast]}>
      <View style={styles.railCol}>
        <Animated.View
          style={[
            styles.dot,
            isDone && styles.dotDone,
            isCurrent && styles.dotCurrent,
            isRejected && styles.dotRejected,
            isUpcoming && styles.dotUpcoming,
            { transform: [{ scale: Animated.multiply(scale, pulse) }] },
          ]}
        >
          {isDone ? (
            <Animated.View style={{ opacity: check, transform: [{ scale: check }] }}>
              <Icon name="check" width={10} height={8} color={colors.white} />
            </Animated.View>
          ) : null}
          {isCurrent ? <View style={styles.currentCore} /> : null}
          {isRejected ? (
            <Icon name="close_x" width={10} height={10} color={colors.white} />
          ) : null}
        </Animated.View>
        {isLast ? null : (
          <View
            style={[
              styles.connector,
              (isDone || isCurrent || isRejected) && styles.connectorActive,
              isRejected && styles.connectorRejected,
            ]}
          />
        )}
      </View>

      <Animated.View
        style={[
          styles.body,
          {
            backgroundColor: highlight.interpolate({
              inputRange: [0, 1],
              outputRange: [
                "transparent",
                isRejected ? REJECT_BG : CURRENT_BG,
              ],
            }),
          },
        ]}
      >
        <Text style={[styles.label, { color: titleColor }]}>{step.label}</Text>
        {step.at ? (
          <Text style={[styles.stamp, { color: stampColor }]}>{step.at}</Text>
        ) : null}
        <Text style={[styles.desc, { color: descColor }]}>{step.description}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#EEEDF7",
    borderRadius: 16,
    padding: 24,
    gap: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  heading: {
    fontFamily: fonts.PlusJakartaSans_600SemiBold,
    fontSize: 16,
    lineHeight: 24,
    color: "#1A1B22",
  },
  list: {
    position: "relative",
    gap: 4,
  },
  railTrack: {
    position: "absolute",
    left: 11,
    top: 10,
    bottom: 18,
    width: 2,
    backgroundColor: RAIL_GRAY,
    borderRadius: 1,
  },
  row: {
    flexDirection: "row",
    gap: 12,
    minHeight: 64,
  },
  rowLast: {
    minHeight: 48,
  },
  railCol: {
    width: 24,
    alignItems: "center",
  },
  dot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  dotDone: {
    backgroundColor: CHECK_GREEN,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  dotCurrent: {
    backgroundColor: CURRENT_BLUE,
  },
  dotRejected: {
    backgroundColor: REJECT_DOT,
  },
  dotUpcoming: {
    backgroundColor: RAIL_GRAY,
  },
  currentCore: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.white,
  },
  connector: {
    width: 2,
    flex: 1,
    marginVertical: 2,
    backgroundColor: "transparent",
  },
  connectorActive: {
    backgroundColor: CHECK_GREEN,
  },
  connectorRejected: {
    backgroundColor: REJECT_DOT,
  },
  body: {
    flex: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 8,
    marginBottom: 8,
  },
  label: {
    fontFamily: fonts.Inter_500Medium,
    fontSize: 16,
    lineHeight: 24,
  },
  stamp: {
    fontFamily: fonts.Inter_400Regular,
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 2,
  },
  desc: {
    fontFamily: fonts.Inter_400Regular,
    fontSize: 14,
    lineHeight: 21,
  },
});
