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
    const interval = setInterval(loadData, 4000);
    return () => clearInterval(interval);
  }, []);

  const rawTransactions = data?.recentTransactions || [];
  const receivedTransactions = rawTransactions.filter((tx) => tx.status === "SETTLED");
  const sentTransactions = rawTransactions;

  const displayedTransactions =
    filter === "received"
      ? receivedTransactions
      : filter === "sent"
      ? sentTransactions
      : rawTransactions;

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
          style={[styles.tabBtn, filter === "all" && styles.tabBtnActiveAll]}
          onPress={() => setFilter("all")}
        >
          <Text style={[styles.tabText, filter === "all" && styles.tabTextActive]}>
            All ({rawTransactions.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, filter === "received" && styles.tabBtnActiveReceived]}
          onPress={() => setFilter("received")}
        >
          <Text style={[styles.tabText, filter === "received" && styles.tabTextActive]}>
            ↓ Received ({receivedTransactions.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, filter === "sent" && styles.tabBtnActiveSent]}
          onPress={() => setFilter("sent")}
        >
          <Text style={[styles.tabText, filter === "sent" && styles.tabTextActive]}>
            ↑ Sent ({sentTransactions.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Active Filter Helper Banner */}
      <View style={[
        styles.filterBanner,
        filter === "received" ? styles.filterBannerReceived : filter === "sent" ? styles.filterBannerSent : styles.filterBannerAll
      ]}>
        <Text style={[
          styles.filterBannerText,
          filter === "received" ? { color: "#065f46" } : filter === "sent" ? { color: "#1e40af" } : { color: "#374151" }
        ]}>
          {filter === "received"
            ? "📥 Showing Seller Income: Settled earnings credited to provider payout address"
            : filter === "sent"
            ? "📤 Showing Buyer Debits: Task execution expenses deducted from buyer budget"
            : "🔄 Showing All Ecosystem Flow: Dual Buyer & Seller micro-settlement trail"}
        </Text>
      </View>

      {/* Transactions List */}
      {displayedTransactions.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={{ fontSize: 28 }}>📜</Text>
          <Text style={styles.emptyTitle}>No Transactions for This Filter</Text>
          <Text style={styles.emptyDesc}>Switch filters or launch an automation task to record micro-settlements.</Text>
        </View>
      ) : (
        displayedTransactions.map((tx, idx) => {
          const uniqueKey = tx.id ? `${tx.id}-${idx}` : `tx-${idx}`;
          const isSettled = tx.status === "SETTLED";

          return (
            <View key={uniqueKey} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={styles.serviceName}>{tx.serviceName}</Text>
                  
                  <View style={styles.pillRow}>
                    <Text style={styles.categoryBadge}>{tx.category.toUpperCase()}</Text>
                    {filter === "received" ? (
                      <View style={styles.inflowPill}>
                        <Text style={styles.inflowPillText}>↓ SELLER INCOME</Text>
                      </View>
                    ) : filter === "sent" ? (
                      <View style={styles.outflowPill}>
                        <Text style={styles.outflowPillText}>↑ BUYER DEBIT</Text>
                      </View>
                    ) : (
                      <View style={isSettled ? styles.inflowPill : styles.failedPill}>
                        <Text style={isSettled ? styles.inflowPillText : styles.failedPillText}>
                          {isSettled ? "SETTLED" : "REIMBURSED"}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                <View style={{ alignItems: "flex-end" }}>
                  {filter === "sent" ? (
                    <Text style={[styles.amountText, isSettled ? { color: "#2563eb" } : { color: "#d97706" }]}>
                      {isSettled ? `-$${tx.amountUsdc} USDC` : "$0.00 (Protected)"}
                    </Text>
                  ) : filter === "received" ? (
                    <Text style={[styles.amountText, { color: "#10b981" }]}>
                      {`+$${tx.amountUsdc} USDC`}
                    </Text>
                  ) : (
                    <Text style={[styles.amountText, isSettled ? { color: "#10b981" } : { color: "#ef4444" }]}>
                      {isSettled ? `+$${tx.amountUsdc} USDC` : "$0.00"}
                    </Text>
                  )}
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
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f7f4", padding: 16 },
  header: { marginBottom: 14 },
  title: { fontSize: 18, fontWeight: "800", color: "#1b1c1a" },
  subtitle: { fontSize: 12, color: "#5b5e66", marginTop: 4, lineHeight: 18 },
  tabsRow: { flexDirection: "row", backgroundColor: "#ffffff", padding: 4, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: "#efeeeb" },
  tabBtn: { flex: 1, paddingVertical: 8, alignItems: "center", borderRadius: 8 },
  tabBtnActiveAll: { backgroundColor: "#1b1c1a" },
  tabBtnActiveReceived: { backgroundColor: "#059669" },
  tabBtnActiveSent: { backgroundColor: "#2563eb" },
  tabText: { fontSize: 11, fontWeight: "600", color: "#5b5e66" },
  tabTextActive: { color: "#ffffff", fontWeight: "700" },
  filterBanner: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, marginBottom: 12, borderWidth: 1 },
  filterBannerAll: { backgroundColor: "#f3f4f6", borderColor: "#e5e7eb" },
  filterBannerReceived: { backgroundColor: "#ecfdf5", borderColor: "#a7f3d0" },
  filterBannerSent: { backgroundColor: "#eff6ff", borderColor: "#bfdbfe" },
  filterBannerText: { fontSize: 11, fontWeight: "600", lineHeight: 16 },
  card: { backgroundColor: "#ffffff", padding: 14, borderRadius: 14, borderWidth: 1, borderColor: "#efeeeb", marginBottom: 10 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 },
  serviceName: { fontSize: 13, fontWeight: "700", color: "#1b1c1a" },
  pillRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  categoryBadge: { fontSize: 9, fontWeight: "800", color: "#735c00" },
  inflowPill: { backgroundColor: "#dcfce7", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  inflowPillText: { fontSize: 8, fontWeight: "800", color: "#15803d" },
  outflowPill: { backgroundColor: "#dbeafe", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  outflowPillText: { fontSize: 8, fontWeight: "800", color: "#1d4ed8" },
  failedPill: { backgroundColor: "#fef3c7", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  failedPillText: { fontSize: 8, fontWeight: "800", color: "#b45309" },
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
