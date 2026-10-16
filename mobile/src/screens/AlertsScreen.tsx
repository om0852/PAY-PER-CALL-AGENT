import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from "react-native";
import { fetchAlerts, runMobileHealthCheck, markAllAlertsRead } from "../services/api";
import {
  triggerSystemNotification,
  scheduleDelayedSystemNotification,
  initNotifications,
} from "../services/notifications";

export default function AlertsScreen({ navigation }: any) {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [runningAudit, setRunningAudit] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // Set of alert IDs already pushed to phone OS status bar
  const notifiedIdsRef = useRef<Set<string>>(new Set());
  const isFirstLoadRef = useRef(true);

  const loadAlerts = async (silent: boolean = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await fetchAlerts();
      const list = res.alerts || [];
      setAlerts(list);
      setUnreadCount(res.unreadCount || list.filter((a: any) => !a.read).length);

      // On first load, record existing alerts so we don't spam 15 notifications from past hours
      if (isFirstLoadRef.current) {
        list.forEach((a: any) => notifiedIdsRef.current.add(a.id));
        isFirstLoadRef.current = false;
        return;
      }

      // On subsequent polls, trigger native phone OS notification bar for ANY new alerts!
      for (const alert of list) {
        if (!notifiedIdsRef.current.has(alert.id)) {
          notifiedIdsRef.current.add(alert.id);
          // Trigger real native OS notification bar!
          await triggerSystemNotification(alert.title, alert.message);
        }
      }
    } catch (err: any) {
      console.warn("Error fetching alerts:", err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    initNotifications();
    loadAlerts();

    // Auto-poll every 4 seconds so Web health checks reflect on phone within seconds!
    const interval = setInterval(() => {
      loadAlerts(true);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  // Run live SLA Health Check directly from phone
  const handleRunHealthCheck = async () => {
    setRunningAudit(true);
    setStatusMessage("Auditing registered services for SLA compliance...");
    try {
      const res = await runMobileHealthCheck();
      setStatusMessage("Health audit completed. Fetching fresh alerts...");

      // Reload alerts
      const updated = await fetchAlerts();
      const list = updated.alerts || [];
      setAlerts(list);
      setUnreadCount(updated.unreadCount || 0);

      // Trigger immediate native notification bar alert for the freshest alert!
      if (list.length > 0) {
        const topAlert = list[0];
        notifiedIdsRef.current.add(topAlert.id);
        await triggerSystemNotification(topAlert.title, topAlert.message);
      }

      setStatusMessage("✓ Audit complete! Real notification pushed to phone status bar.");
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      Alert.alert("Health Check Error", err.message || "Failed to audit services");
      setStatusMessage(null);
    } finally {
      setRunningAudit(false);
    }
  };

  // Schedule delayed notification so user can close/minimize the app and watch it pop up
  const handleTestDelayedNotification = async () => {
    setCountdown(5);
    await scheduleDelayedSystemNotification(
      "⚡ AgentBucket SLA Alert (Background)",
      "Service 'Budget Scraper (Cheap)' output schema rejected. Autonomous refund executed.",
      5
    );

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    Alert.alert(
      "Notification Scheduled (5s)",
      "Now swipe home or minimize Expo Go right now! Your phone's top notification bar will ring and display this alert in 5 seconds."
    );
  };

  // Mark all alerts as read
  const handleMarkAllRead = async () => {
    try {
      await markAllAlertsRead();
      setAlerts((prev) => prev.map((a) => ({ ...a, read: true })));
      setUnreadCount(0);
    } catch (err: any) {
      console.warn("Failed to mark all read:", err.message);
    }
  };

  const getAlertStyle = (type: string, severity: string) => {
    if (type === "LOW_BALANCE") {
      return {
        borderColor: "#fde68a",
        bg: "#fffbeb",
        icon: "⚠️",
        tagColor: "#b45309",
        tagBg: "#fef3c7",
        tagLabel: "LOW BALANCE",
      };
    }
    if (type === "FAILED_TASK" || severity === "warning") {
      return {
        borderColor: "#fed7aa",
        bg: "#fff7ed",
        icon: "❌",
        tagColor: "#c2410c",
        tagBg: "#ffedd5",
        tagLabel: "SCHEMA DISPUTE",
      };
    }
    return {
      borderColor: "#fecaca",
      bg: "#fef2f2",
      icon: "🔴",
      tagColor: "#b91c1c",
      tagBg: "#fee2e2",
      tagLabel: "SERVICE DOWN",
    };
  };

  const formatTime = (ts: number) => {
    if (!ts) return "Just now";
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  if (loading && alerts.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#d4af37" />
        <Text style={styles.loadingText}>Connecting to AgentBucket Alert Feed...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            loadAlerts();
          }}
        />
      }
    >
      {/* Live Polling Status Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>System Alerts & Notifications</Text>
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE (4s)</Text>
          </View>
        </View>
        <Text style={styles.subtitle}>
          Real-time push alerts for wallet balances, SLA schema disputes, and node health.
        </Text>
        <View style={styles.statsPillRow}>
          <View style={styles.statPill}>
            <Text style={styles.statPillLabel}>Total Alerts:</Text>
            <Text style={styles.statPillValue}>{alerts.length}</Text>
          </View>
          <View style={[styles.statPill, unreadCount > 0 ? styles.statPillUnread : null]}>
            <Text style={styles.statPillLabel}>Unread:</Text>
            <Text style={[styles.statPillValue, unreadCount > 0 ? { color: "#b91c1c" } : null]}>
              {unreadCount}
            </Text>
          </View>
          {unreadCount > 0 && (
            <TouchableOpacity onPress={handleMarkAllRead} style={styles.markReadBtn}>
              <Text style={styles.markReadText}>✓ Mark Read</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Status banner */}
      {statusMessage && (
        <View style={styles.statusBanner}>
          <Text style={styles.statusBannerText}>{statusMessage}</Text>
        </View>
      )}

      {/* Interactive Action Bar */}
      <View style={styles.actionGrid}>
        {/* Run Health Check button */}
        <TouchableOpacity
          style={[styles.primaryActionBtn, runningAudit ? styles.btnDisabled : null]}
          onPress={handleRunHealthCheck}
          disabled={runningAudit}
        >
          {runningAudit ? (
            <ActivityIndicator size="small" color="#ffffff" style={{ marginRight: 8 }} />
          ) : (
            <Text style={{ fontSize: 16, marginRight: 6 }}>🔄</Text>
          )}
          <Text style={styles.primaryActionText}>
            {runningAudit ? "Auditing Nodes..." : "Run Live SLA Health Check"}
          </Text>
        </TouchableOpacity>

        {/* Test Delayed Background Notification */}
        <TouchableOpacity
          style={styles.secondaryActionBtn}
          onPress={handleTestDelayedNotification}
        >
          <Text style={{ fontSize: 16, marginRight: 6 }}>⏱️</Text>
          <Text style={styles.secondaryActionText}>
            {countdown !== null ? `Rings in ${countdown}s (Swipe home!)` : "Test Notification (App Closed)"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Alerts Feed */}
      {alerts.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={{ fontSize: 36 }}>🛡️</Text>
          <Text style={styles.emptyTitle}>All Systems Optimal</Text>
          <Text style={styles.emptySubtitle}>
            Wallet balance healthy, all service nodes responsive, and 0 active schema disputes.
          </Text>
        </View>
      ) : (
        alerts.map((alert, idx) => {
          const style = getAlertStyle(alert.type, alert.severity);
          const uniqueKey = alert.id ? `${alert.id}-${idx}` : `alert-${idx}`;

          return (
            <View
              key={uniqueKey}
              style={[
                styles.alertCard,
                { backgroundColor: style.bg, borderColor: style.borderColor },
              ]}
            >
              <View style={styles.alertTop}>
                <Text style={styles.alertIcon}>{style.icon}</Text>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Text style={styles.alertTitle} numberOfLines={1}>
                      {alert.title}
                    </Text>
                    {!alert.read && <View style={styles.unreadDot} />}
                  </View>
                  <Text style={styles.alertTime}>
                    {formatTime(alert.timestamp)} • {new Date(alert.timestamp).toLocaleTimeString()}
                  </Text>
                </View>
                <View style={[styles.tag, { backgroundColor: style.tagBg }]}>
                  <Text style={[styles.tagText, { color: style.tagColor }]}>
                    {style.tagLabel}
                  </Text>
                </View>
              </View>

              <Text style={styles.alertMsg}>{alert.message}</Text>

              {/* Dynamic Action Buttons */}
              <View style={styles.cardFooter}>
                {alert.serviceName && (
                  <Text style={styles.serviceTag}>Node: {alert.serviceName}</Text>
                )}

                {alert.type === "LOW_BALANCE" && (
                  <TouchableOpacity
                    style={[styles.cardBtn, { backgroundColor: "#d97706" }]}
                    onPress={() => navigation.navigate("Dashboard")}
                  >
                    <Text style={styles.cardBtnText}>+ Top Up Wallet</Text>
                  </TouchableOpacity>
                )}

                {alert.type === "SERVICE_DOWN" && (
                  <TouchableOpacity
                    style={[styles.cardBtn, { backgroundColor: "#b91c1c" }]}
                    onPress={() => navigation.navigate("Services")}
                  >
                    <Text style={styles.cardBtnText}>Inspect Node Status</Text>
                  </TouchableOpacity>
                )}

                {alert.type === "FAILED_TASK" && (
                  <TouchableOpacity
                    style={[styles.cardBtn, { backgroundColor: "#c2410c" }]}
                    onPress={() => navigation.navigate("Transactions")}
                  >
                    <Text style={styles.cardBtnText}>View Dispute Ledger</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f7f4", padding: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f8f7f4" },
  loadingText: { marginTop: 12, fontSize: 13, color: "#5b5e66" },

  header: { marginBottom: 16 },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 18, fontWeight: "800", color: "#1b1c1a", flex: 1 },
  subtitle: { fontSize: 12, color: "#5b5e66", marginTop: 4, lineHeight: 18 },

  liveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ecfdf5",
    borderWidth: 1,
    borderColor: "#a7f3d0",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#10b981", marginRight: 5 },
  liveText: { fontSize: 9, fontWeight: "800", color: "#059669" },

  statsPillRow: { flexDirection: "row", alignItems: "center", marginTop: 10, gap: 8 },
  statPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statPillUnread: { borderColor: "#fca5a5", backgroundColor: "#fef2f2" },
  statPillLabel: { fontSize: 11, color: "#6b7280", marginRight: 4 },
  statPillValue: { fontSize: 11, fontWeight: "800", color: "#111827" },
  markReadBtn: { marginLeft: "auto", paddingVertical: 4, paddingHorizontal: 8 },
  markReadText: { fontSize: 11, fontWeight: "700", color: "#4f46e5" },

  statusBanner: {
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
  },
  statusBannerText: { fontSize: 11, color: "#1e40af", fontWeight: "600" },

  actionGrid: { marginBottom: 16, gap: 10 },
  primaryActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1b1c1a",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  primaryActionText: { color: "#ffffff", fontSize: 13, fontWeight: "700" },
  btnDisabled: { opacity: 0.6 },

  secondaryActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: "#d4af37",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  secondaryActionText: { color: "#1b1c1a", fontSize: 12, fontWeight: "700" },

  emptyCard: {
    backgroundColor: "#ffffff",
    padding: 32,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#efeeeb",
    marginTop: 20,
  },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#1b1c1a", marginTop: 12 },
  emptySubtitle: { fontSize: 12, color: "#5b5e66", textAlign: "center", marginTop: 6, lineHeight: 18 },

  alertCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  alertTop: { flexDirection: "row", alignItems: "flex-start", marginBottom: 6 },
  alertIcon: { fontSize: 20, marginRight: 8, marginTop: 2 },
  alertTitle: { fontSize: 13, fontWeight: "800", color: "#1b1c1a", flex: 1 },
  unreadDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: "#ef4444", marginLeft: 6 },
  alertTime: { fontSize: 10, color: "#8c8f94", marginTop: 2 },
  tag: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, marginLeft: 6 },
  tagText: { fontSize: 9, fontWeight: "800", letterSpacing: 0.5 },
  alertMsg: { fontSize: 12, color: "#374151", lineHeight: 17, marginTop: 4 },

  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  serviceTag: { fontSize: 10, color: "#6b7280", fontWeight: "600" },
  cardBtn: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginLeft: "auto",
  },
  cardBtnText: { color: "#ffffff", fontSize: 10, fontWeight: "800" },
});
