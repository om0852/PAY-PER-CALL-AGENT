import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { fetchServices } from "../services/api";

export default function ServicesScreen() {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadServices = async () => {
    try {
      const res = await fetchServices();
      setServices(res);
    } catch (err: any) {
      console.warn("Error fetching services:", err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadServices();
    const interval = setInterval(loadServices, 5000);
    return () => clearInterval(interval);
  }, []);

  const getHealthPill = (status?: string) => {
    if (status === "HEALTHY") return { text: "Online", bg: "#ecfdf5", color: "#047857" };
    if (status === "DEGRADED" || status === "SCHEMA_MISMATCH") return { text: "Degraded SLA", bg: "#fef3c7", color: "#b45309" };
    return { text: "Offline", bg: "#fef2f2", color: "#b91c1c" };
  };

  if (loading && services.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#d4af37" />
        <Text style={styles.loadingText}>Fetching registered service nodes...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadServices(); }} />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Provider Registry & Nodes</Text>
        <Text style={styles.subtitle}>
          Real-time uptime monitors, response latencies, and price per API invocation.
        </Text>
      </View>

      {services.map((svc) => {
        const health = getHealthPill(svc.health?.status);
        const priceUsdc = ((svc.price || 50000) / 1e6).toFixed(4);
        const latency = svc.health?.latencyMs || 42;

        return (
          <View key={svc._id || svc.name} style={styles.card}>
            <View style={styles.topRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{svc.name}</Text>
                <Text style={styles.endpoint}>{svc.endpoint}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: health.bg }]}>
                <Text style={[styles.statusText, { color: health.color }]}>{health.text}</Text>
              </View>
            </View>

            <View style={styles.bottomRow}>
              <View style={styles.categoryPill}>
                <Text style={styles.categoryText}>{svc.category?.toUpperCase()}</Text>
              </View>
              <View style={styles.metricGroup}>
                <Text style={styles.latency}>⚡ {latency}ms</Text>
                <Text style={styles.price}>${priceUsdc} USDC / call</Text>
              </View>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f7f4", padding: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f8f7f4" },
  loadingText: { marginTop: 12, fontSize: 13, color: "#5b5e66" },
  header: { marginBottom: 14 },
  title: { fontSize: 18, fontWeight: "800", color: "#1b1c1a" },
  subtitle: { fontSize: 12, color: "#5b5e66", marginTop: 4, lineHeight: 18 },
  card: { backgroundColor: "#ffffff", padding: 14, borderRadius: 14, borderWidth: 1, borderColor: "#efeeeb", marginBottom: 10 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 },
  name: { fontSize: 14, fontWeight: "700", color: "#1b1c1a" },
  endpoint: { fontSize: 10, fontFamily: "monospace", color: "#8c8f94", marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: "700" },
  bottomRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 8, borderTopWidth: 1, borderTopColor: "#f4f4f2" },
  categoryPill: { backgroundColor: "#f5f3f0", paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4, borderWidth: 1, borderColor: "#e4e2df" },
  categoryText: { fontSize: 9, fontWeight: "700", color: "#5b5e66" },
  metricGroup: { flexDirection: "row", alignItems: "center", gap: 10 },
  latency: { fontSize: 11, color: "#10b981", fontWeight: "600", fontFamily: "monospace" },
  price: { fontSize: 12, fontWeight: "700", color: "#1b1c1a", fontFamily: "monospace" },
});
