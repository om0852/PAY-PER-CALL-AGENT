import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { fetchAlerts } from "../services/api";

export default function AlertsScreen({ navigation }: any) {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAlerts = async () => {
    try {
      const res = await fetchAlerts();
      setAlerts(res.alerts || []);
    } catch (err: any) {
      console.warn("Error fetching alerts:", err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAlerts();
    const interval = setInterval(loadAlerts, 5000);
    return () => clearInterval(interval);
  }, []);

  const getAlertStyle = (type: string, severity: string) => {
    if (type === "LOW_BALANCE") return { borderColor: "#fde68a", bg: "#fffbeb", icon: "⚠️", tagColor: "#b45309" };
    if (type === "FAILED_TASK") return { borderColor: "#fed7aa", bg: "#fff7ed", icon: "❌", tagColor: "#c2410c" };
    return { borderColor: "#fecaca", bg: "#fef2f2", icon: "🔴", tagColor: "#b91c1c" };
  };

  if (loading && alerts.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#d4af37" />
        <Text style={styles.loadingText}>Fetching system alerts...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadAlerts(); }} />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>System Alerts & Notifications</Text>
        <Text style={styles.subtitle}>
          Real-time push alerts for wallet balances, SLA schema disputes, and node uptime.
        </Text>
      </View>

      {alerts.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={{ fontSize: 32 }}>🛡️</Text>
          <Text style={styles.emptyTitle}>All Systems Optimal</Text>
          <Text style={styles.emptySubtitle}>
            Wallet balance healthy, all service nodes online, and 0 unresolved schema disputes.
          </Text>
        </View>
      ) : (
        alerts.map((alert) => {
          const style = getAlertStyle(alert.type, alert.severity);
          return (
            <View key={alert.id} style={[styles.alertCard, { backgroundColor: style.bg, borderColor: style.borderColor }]}>
              <View style={styles.alertTop}>
                <Text style={styles.alertIcon}>{style.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.alertTitle}>{alert.title}</Text>
                  <Text style={styles.alertTime}>
                    {new Date(alert.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </Text>
                </View>
                <View style={[styles.tag, { backgroundColor: style.borderColor }]}>
                  <Text style={[styles.tagText, { color: style.tagColor }]}>{alert.type}</Text>
                </View>
              </View>

              <Text style={styles.alertMsg}>{alert.message}</Text>

              {alert.type === "LOW_BALANCE" && (
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => navigation.navigate("Dashboard")}
                >
                  <Text style={styles.actionBtnText}>+ Top Up Balance Now</Text>
                </TouchableOpacity>
              )}

              {alert.type === "SERVICE_DOWN" && (
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: "#b91c1c" }]}
                  onPress={() => navigation.navigate("Services")}
                >
                  <Text style={[styles.actionBtnText, { color: "#ffffff" }]}>Inspect Node Health</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f7f4", padding: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f8f7f4" },
  loadingText: { marginTop: 12, fontSize: 13, color: "#5b5e66" },
  header: { marginBottom: 16 },
  title: { fontSize: 18, fontWeight: "800", color: "#1b1c1a" },
  subtitle: { fontSize: 12, color: "#5b5e66", marginTop: 4, lineHeight: 18 },
  emptyCard: { backgroundColor: "#ffffff", padding: 24, borderRadius: 16, alignItems: "center", borderWidth: 1, borderColor: "#efeeeb", marginTop: 20 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#1b1c1a", marginTop: 8 },
  emptySubtitle: { fontSize: 12, color: "#5b5e66", textAlign: "center", marginTop: 4 },
  alertCard: { padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 12, shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 6, elevation: 1 },
  alertTop: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  alertIcon: { fontSize: 20, marginRight: 10 },
  alertTitle: { fontSize: 14, fontWeight: "700", color: "#1b1c1a" },
  alertTime: { fontSize: 10, color: "#8c8f94", marginTop: 2 },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  tagText: { fontSize: 9, fontWeight: "800", letterSpacing: 0.5 },
  alertMsg: { fontSize: 12, color: "#4b5563", lineHeight: 18 },
  actionBtn: { marginTop: 12, backgroundColor: "#d97706", paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, alignSelf: "flex-start" },
  actionBtnText: { color: "#ffffff", fontWeight: "700", fontSize: 11 },
});
