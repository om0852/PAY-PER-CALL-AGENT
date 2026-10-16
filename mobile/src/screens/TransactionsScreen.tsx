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
import { fetchDashboardData, MobileDashboardData } from "../services/api";

export default function TransactionsScreen() {
  const [data, setData] = useState<MobileDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"all" | "received" | "sent">("all");

  const loadData = async () => {
    try {
      const res = await fetchDashboardData();
      setData(res);
    } catch (err: any) {
      console.warn("Error fetching transactions:", err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const transactions = data?.recentTransactions || [];

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Micro-Settlement Ledger</Text>
        <Text style={styles.subtitle}>
          Base Sepolia L2 on-chain EIP-3009 receipts & cryptographic audit trail.
        </Text>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tabBtn, filter === "all" && styles.tabBtnActive]}
          onPress={() => setFilter("all")}
        >
          <Text style={[styles.tabText, filter === "all" && styles.tabTextActive]}>All Flow ({transactions.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, filter === "received" && styles.tabBtnActive]}
          onPress={() => setFilter("received")}
        >
          <Text style={[styles.tabText, filter === "received" && styles.tabTextActive]}>↓ Received Income</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, filter === "sent" && styles.tabBtnActive]}
          onPress={() => setFilter("sent")}
        >
          <Text style={[styles.tabText, filter === "sent" && styles.tabTextActive]}>↑ Sent Debits</Text>
        </TouchableOpacity>
      </View>

      {/* Transactions List */}
      {transactions.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={{ fontSize: 28 }}>📜</Text>
          <Text style={styles.emptyTitle}>No Transactions Recorded</Text>
          <Text style={styles.emptyDesc}>Launch an agent automation to trigger micro-settlements.</Text>
        </View>
      ) : (
        transactions.map((tx, idx) => (
          <View key={tx.id ? `${tx.id}-${idx}` : `tx-${idx}`} style={styles.card}>
            <View style={styles.cardTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.serviceName}>{tx.serviceName}</Text>
                <Text style={styles.categoryBadge}>{tx.category.toUpperCase()}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={[styles.amountText, tx.status === "SETTLED" ? { color: "#10b981" } : { color: "#ef4444" }]}>
                  {tx.status === "SETTLED" ? `+$${tx.amountUsdc} USDC` : "$0.00 USDC"}
                </Text>
                <Text style={styles.timeText}>{tx.time}</Text>
              </View>
            </View>

            <View style={styles.metaRow}>
              <Text style={styles.latencyText}>⚡ {tx.latencyMs}ms response</Text>
              <Text style={styles.gasSponsoredText}>100% Gas Sponsored</Text>
              <Text style={styles.hashText} numberOfLines={1}>
                {tx.txHash ? `${tx.txHash.slice(0, 10)}...` : "EIP-712 Verified"}
              </Text>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f7f4", padding: 16 },
  header: { marginBottom: 14 },
  title: { fontSize: 18, fontWeight: "800", color: "#1b1c1a" },
  subtitle: { fontSize: 12, color: "#5b5e66", marginTop: 4, lineHeight: 18 },
  tabsRow: { flexDirection: "row", backgroundColor: "#ffffff", padding: 4, borderRadius: 12, marginBottom: 14, borderWidth: 1, borderColor: "#efeeeb" },
  tabBtn: { flex: 1, paddingVertical: 8, alignItems: "center", borderRadius: 8 },
  tabBtnActive: { backgroundColor: "#1b1c1a" },
  tabText: { fontSize: 11, fontWeight: "600", color: "#5b5e66" },
  tabTextActive: { color: "#ffffff", fontWeight: "700" },
  card: { backgroundColor: "#ffffff", padding: 14, borderRadius: 14, borderWidth: 1, borderColor: "#efeeeb", marginBottom: 10 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 },
  serviceName: { fontSize: 13, fontWeight: "700", color: "#1b1c1a" },
  categoryBadge: { fontSize: 9, fontWeight: "800", color: "#735c00", marginTop: 3 },
  amountText: { fontSize: 14, fontWeight: "800", fontFamily: "monospace" },
  timeText: { fontSize: 10, color: "#8c8f94", marginTop: 2 },
  metaRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 8, borderTopWidth: 1, borderTopColor: "#f4f4f2" },
  latencyText: { fontSize: 10, color: "#10b981", fontWeight: "600", fontFamily: "monospace" },
  gasSponsoredText: { fontSize: 9, color: "#735c00", backgroundColor: "#fef3c7", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, fontWeight: "700" },
  hashText: { fontSize: 10, fontFamily: "monospace", color: "#8c8f94" },
  emptyCard: { backgroundColor: "#ffffff", padding: 24, borderRadius: 16, alignItems: "center", borderWidth: 1, borderColor: "#efeeeb", marginTop: 20 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#1b1c1a", marginTop: 8 },
  emptyDesc: { fontSize: 12, color: "#5b5e66", textAlign: "center", marginTop: 4 },
});
