import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { Report } from "../api/types";
import { listIssues } from "../api/issues";
import { useAuth } from "../auth/AuthContext";
import { AppHeader } from "../components/AppHeader";
import { Icon } from "../components/Icon";
import type { RootStackParamList } from "../navigation/types";
import { colors, fonts } from "../theme/tokens";
import { formatRelativeTime } from "../utils/format";
import {
  buildNotificationItems,
  NOTIF_READ_KEY,
  verifiedStorageKey,
  type NotificationItem,
} from "../utils/notifications";

type Nav = NativeStackNavigationProp<RootStackParamList, "Notifications">;

export function NotificationsScreen() {
  const navigation = useNavigation<Nav>();
  const { token } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [verifiedIds, setVerifiedIds] = useState<string[]>([]);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      async function load() {
        if (!token) {
          setLoading(false);
          return;
        }
        setLoading(true);
        setError(null);
        try {
          const list = await listIssues(token);
          if (cancelled) return;
          setReports(list);

          const readRaw = await AsyncStorage.getItem(NOTIF_READ_KEY);
          if (cancelled) return;
          const readList: string[] = readRaw ? JSON.parse(readRaw) : [];
          setReadIds(readList);

          const keys = list
            .filter((r) => r.status === "RESOLVED")
            .map((r) => verifiedStorageKey(r.id));
          if (keys.length > 0) {
            const pairs = await AsyncStorage.multiGet(keys);
            if (cancelled) return;
            const verified: string[] = [];
            for (const [key, value] of pairs) {
              if (value) {
                verified.push(key.replace("@nivaran/verified/", ""));
              }
            }
            setVerifiedIds(verified);
          } else {
            setVerifiedIds([]);
          }
        } catch (e) {
          if (!cancelled) {
            setError(
              e instanceof Error ? e.message : "Failed to load notifications",
            );
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      }
      void load();
      return () => {
        cancelled = true;
      };
    }, [token]),
  );

  const items = useMemo(
    () => buildNotificationItems(reports, verifiedIds, readIds),
    [reports, verifiedIds, readIds],
  );

  async function markAllRead() {
    const allIds = items.map((i) => i.id);
    await AsyncStorage.setItem(NOTIF_READ_KEY, JSON.stringify(allIds));
    setReadIds(allIds);
  }

  return (
    <View style={styles.screen}>
      <AppHeader
        variant="back"
        title="Notifications"
        onBack={() => navigation.goBack()}
        showActions={false}
      />

      <View style={styles.toolbar}>
        <Text style={styles.count}>
          {items.filter((i) => i.unread).length} unread
        </Text>
        <Pressable style={styles.readAllBtn} onPress={() => void markAllRead()}>
          <Icon
            name="read_all"
            width={16}
            height={16}
            color={colors.brandBlueDeep}
          />
          <Text style={styles.readAllText}>Read All</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator
          color={colors.brandBlueDeep}
          style={{ marginTop: 32 }}
        />
      ) : error ? (
        <Text style={styles.empty}>{error}</Text>
      ) : items.length === 0 ? (
        <Text style={styles.empty}>No notifications yet.</Text>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {items.map((item) => (
            <NotificationRow
              key={item.id}
              item={item}
              onPress={() =>
                navigation.navigate("TrackIssue", { issueId: item.issueId })
              }
              onVerify={() =>
                navigation.navigate("VerifyResolution", {
                  issueId: item.issueId,
                })
              }
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function NotificationRow({
  item,
  onPress,
  onVerify,
}: {
  item: NotificationItem;
  onPress: () => void;
  onVerify: () => void;
}) {
  const isVerify = item.ctaVerify === true;

  return (
    <Pressable
      style={[
        styles.row,
        item.unread && styles.rowUnread,
        isVerify && styles.rowVerify,
      ]}
      onPress={onPress}
    >
      {item.unread ? <View style={styles.unreadBar} /> : null}
      <View style={styles.iconWrap}>
        <Icon
          name={item.icon}
          width={18}
          height={18}
          color={isVerify ? colors.resolvedDark : colors.brandBlueDeep}
        />
      </View>
      <View style={styles.body}>
        <Text style={styles.rowTitle}>{item.title}</Text>
        <Text style={styles.rowBody}>{item.body}</Text>
        <Text style={styles.rowTime}>{formatRelativeTime(item.at)}</Text>
        {isVerify ? (
          <Pressable style={styles.verifyBtn} onPress={onVerify}>
            <Text style={styles.verifyBtnText}>Verify</Text>
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  count: {
    fontFamily: fonts.Inter_400Regular,
    fontSize: 13,
    color: colors.bodyMuted,
  },
  readAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  readAllText: {
    fontFamily: fonts.Inter_500Medium,
    fontSize: 13,
    color: colors.brandBlueDeep,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 10,
  },
  empty: {
    marginHorizontal: 16,
    marginTop: 24,
    fontFamily: fonts.Inter_400Regular,
    fontSize: 14,
    color: colors.bodyMuted,
  },
  row: {
    flexDirection: "row",
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 14,
    gap: 12,
    overflow: "hidden",
    position: "relative",
  },
  rowUnread: {
    backgroundColor: colors.unreadTint,
  },
  rowVerify: {
    borderWidth: 1,
    borderColor: colors.resolvedDark,
  },
  unreadBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: colors.brandBlueDeep,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.softBlue,
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    flex: 1,
    gap: 4,
  },
  rowTitle: {
    fontFamily: fonts.Inter_600SemiBold,
    fontSize: 14,
    lineHeight: 20,
    color: colors.brandNavy,
  },
  rowBody: {
    fontFamily: fonts.Inter_400Regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.bodyMuted,
  },
  rowTime: {
    fontFamily: fonts.Inter_400Regular,
    fontSize: 12,
    color: colors.textSecondary,
  },
  verifyBtn: {
    alignSelf: "flex-start",
    marginTop: 6,
    backgroundColor: colors.resolvedDark,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  verifyBtnText: {
    fontFamily: fonts.Inter_600SemiBold,
    fontSize: 13,
    color: colors.white,
  },
});
