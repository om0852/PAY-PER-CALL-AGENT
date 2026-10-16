import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { fetchDashboardData, topupBalance, MobileDashboardData } from "../services/api";

export default function DashboardScreen({ navigation }: any) {
  const [data, setData] = useState<MobileDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [topupModalVisible, setTopupModalVisible] = useState(false);
  const [topupAmount, setTopupAmount] = useState("5.00");
  const [isSubmittingTopup, setIsSubmittingTopup] = useState(false);

  const loadData = async () => {
    try {
      const res = await fetchDashboardData();
      setData(res);
    } catch (err: any) {
      console.warn("Error fetching dashboard:", err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000); // 5s auto-refresh
    return () => clearInterval(interval);
  }, []);

  const handleTopup = async () => {
    const val = parseFloat(topupAmount);
    if (isNaN(val) || val <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid USDC deposit amount.");
      return;
    }
    setIsSubmittingTopup(true);
    try {
      const res = await topupBalance(val);
      Alert.alert("Deposit Confirmed! 🎉", res.message);
      setTopupModalVisible(false);
      loadData();
    } catch (err: any) {
      Alert.alert("Top-Up Error", err.message || "Failed to add balance");
    } finally {
      setIsSubmittingTopup(false);
    }
  };

  if (loading && !data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#d4af37" />
        <Text style={styles.loadingText}>Connecting to AgentBucket Node...</Text>
      </View>
    );
  }

  const isLowBalance = data?.buyer?.isLowBalance ?? false;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
    >
      {/* Network Header Pill */}
      <View style={styles.networkHeader}>
        <View style={styles.liveDot} />
        <Text style={styles.networkText}>Base Sepolia L2 • Chain 84532</Text>
        <Text style={styles.gaslessPill}>0.00 Gas Relayer</Text>
      </View>

      {/* Critical Alert Banner (Low Balance / Down Service) */}
      {isLowBalance && (
        <TouchableOpacity
          style={styles.lowBalanceBanner}
          onPress={() => setTopupModalVisible(true)}
        >
          <Text style={styles.alertIcon}>⚠️</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.alertTitle}>Low Balance Warning</Text>
            <Text style={styles.alertDesc}>
              Buyer balance is below $2.00 USDC. Tap here to top up immediately.
            </Text>
          </View>
          <Text style={styles.topupButtonSmall}>+ Add</Text>
        </TouchableOpacity>
      )}

      {/* Wallet Balance Cards (Dual Wallet Perspective) */}
      <View style={styles.cardsRow}>
        {/* Buyer Wallet Card */}
        <View style={[styles.balanceCard, styles.buyerCard]}>
          <Text style={styles.cardRole}>BUYER AGENT WALLET</Text>
          <Text style={styles.balanceAmount}>${data?.buyer?.balanceUsdc || "0.0000"}</Text>
          <Text style={styles.currencyLabel}>USDC (Circle Base L2)</Text>
          <Text style={styles.addressText} numberOfLines={1}>
            {data?.buyer?.address ? `${data.buyer.address.slice(0, 6)}...${data.buyer.address.slice(-4)}` : "0xf39F...2266"}
          </Text>
          <TouchableOpacity
            style={styles.addFundsBtn}
            onPress={() => setTopupModalVisible(true)}
          >
            <Text style={styles.addFundsText}>+ Top Up Balance</Text>
          </TouchableOpacity>
        </View>

        {/* Seller Wallet Card */}
        <View style={[styles.balanceCard, styles.sellerCard]}>
          <Text style={styles.cardRole}>SELLER EARNED REVENUE</Text>
          <Text style={[styles.balanceAmount, { color: "#10b981" }]}>
            +${data?.seller?.balanceUsdc || "0.0000"}
          </Text>
          <Text style={styles.currencyLabel}>USDC Settled Income</Text>
          <Text style={styles.addressText} numberOfLines={1}>
            {data?.seller?.address ? `${data.seller.address.slice(0, 6)}...${data.seller.address.slice(-4)}` : "0x7099...79C8"}
          </Text>
          <View style={styles.settledBadge}>
            <Text style={styles.settledText}>{data?.totalSettledCount || 0} Inbound Settled</Text>
          </View>
        </View>
      </View>

      {/* Services Health Snapshot */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Services & Nodes Status</Text>
          <TouchableOpacity onPress={() => navigation.navigate("Services")}>
            <Text style={styles.viewAllText}>View All ({data?.servicesSummary?.total || 0})</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.healthStatsRow}>
          <View style={styles.healthStat}>
            <Text style={[styles.healthNum, { color: "#10b981" }]}>{data?.servicesSummary?.healthy || 0}</Text>
            <Text style={styles.healthLabel}>Healthy</Text>
          </View>
          <View style={styles.healthStat}>
            <Text style={[styles.healthNum, { color: "#d4af37" }]}>{data?.servicesSummary?.degraded || 0}</Text>
            <Text style={styles.healthLabel}>Degraded</Text>
          </View>
          <View style={styles.healthStat}>
            <Text style={[styles.healthNum, { color: "#ef4444" }]}>{data?.servicesSummary?.down || 0}</Text>
            <Text style={styles.healthLabel}>Down</Text>
          </View>
        </View>
      </View>

      {/* Recent Micro-Transactions */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Micro-Settlements</Text>
          <TouchableOpacity onPress={() => navigation.navigate("Transactions")}>
            <Text style={styles.viewAllText}>See History</Text>
          </TouchableOpacity>
        </View>
        {data?.recentTransactions && data.recentTransactions.length > 0 ? (
          data.recentTransactions.slice(0, 5).map((tx, idx) => (
            <View key={tx.id ? `${tx.id}-${idx}` : `tx-${idx}`} style={styles.txRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.txService}>{tx.serviceName}</Text>
                <Text style={styles.txMeta}>{tx.category} • {tx.time} • {tx.latencyMs}ms</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={[styles.txAmount, tx.status === "SETTLED" ? { color: "#10b981" } : { color: "#ef4444" }]}>
                  {tx.status === "SETTLED" ? `+$${tx.amountUsdc}` : "$0.00 (Refunded)"}
                </Text>
                <Text style={styles.txStatus}>{tx.status === "SETTLED" ? "✓ 402 Settled" : "✕ Disputed"}</Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No recent transactions recorded yet.</Text>
        )}
      </View>

      {/* Top-Up Balance Modal */}
      <Modal visible={topupModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Deposit USDC Balance</Text>
            <Text style={styles.modalDesc}>
              Top up your autonomous buyer agent test wallet on Base Sepolia.
            </Text>

            <View style={styles.quickPills}>
              {["5.00", "10.00", "25.00", "50.00"].map((amt) => (
                <TouchableOpacity
                  key={amt}
                  style={[styles.quickPill, topupAmount === amt && styles.quickPillActive]}
                  onPress={() => setTopupAmount(amt)}
                >
                  <Text style={[styles.quickPillText, topupAmount === amt && styles.quickPillTextActive]}>
                    +${amt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.amountInput}
              value={topupAmount}
              onChangeText={setTopupAmount}
              keyboardType="numeric"
              placeholder="Enter amount in USDC"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setTopupModalVisible(false)}
                disabled={isSubmittingTopup}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirm}
                onPress={handleTopup}
                disabled={isSubmittingTopup}
              >
                {isSubmittingTopup ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalConfirmText}>Confirm Deposit</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f7f4", padding: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f8f7f4" },
  loadingText: { marginTop: 12, fontSize: 13, color: "#5b5e66" },
  networkHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#efeeeb",
  },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#10b981", marginRight: 8 },
  networkText: { fontSize: 12, fontWeight: "600", color: "#1b1c1a", flex: 1 },
  gaslessPill: { fontSize: 10, fontWeight: "700", color: "#735c00", backgroundColor: "#fef3c7", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  lowBalanceBanner: {
    backgroundColor: "#fffbeb",
    borderWidth: 1,
    borderColor: "#fde68a",
    padding: 12,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  alertIcon: { fontSize: 20, marginRight: 10 },
  alertTitle: { fontSize: 13, fontWeight: "700", color: "#92400e" },
  alertDesc: { fontSize: 11, color: "#b45309", marginTop: 2 },
  topupButtonSmall: { fontSize: 11, fontWeight: "700", color: "#ffffff", backgroundColor: "#d97706", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, marginLeft: 8 },
  cardsRow: { marginBottom: 14 },
  balanceCard: { backgroundColor: "#ffffff", padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 12, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  buyerCard: { borderColor: "#d4af37" },
  sellerCard: { borderColor: "#10b981" },
  cardRole: { fontSize: 10, fontWeight: "800", color: "#5b5e66", letterSpacing: 0.5 },
  balanceAmount: { fontSize: 28, fontWeight: "800", color: "#1b1c1a", marginVertical: 4, fontFamily: "monospace" },
  currencyLabel: { fontSize: 11, color: "#5b5e66", fontWeight: "500" },
  addressText: { fontSize: 10, fontFamily: "monospace", color: "#8c8f94", marginTop: 6 },
  addFundsBtn: { marginTop: 12, backgroundColor: "#1b1c1a", paddingVertical: 8, borderRadius: 10, alignItems: "center" },
  addFundsText: { color: "#ffffff", fontWeight: "700", fontSize: 12 },
  settledBadge: { marginTop: 10, alignSelf: "flex-start", backgroundColor: "#ecfdf5", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  settledText: { color: "#047857", fontSize: 11, fontWeight: "700" },
  sectionCard: { backgroundColor: "#ffffff", padding: 14, borderRadius: 14, borderWidth: 1, borderColor: "#efeeeb", marginBottom: 14 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: "#1b1c1a" },
  viewAllText: { fontSize: 11, color: "#735c00", fontWeight: "600" },
  healthStatsRow: { flexDirection: "row", justifyContent: "space-around", paddingVertical: 6 },
  healthStat: { alignItems: "center" },
  healthNum: { fontSize: 22, fontWeight: "800", fontFamily: "monospace" },
  healthLabel: { fontSize: 11, color: "#5b5e66", marginTop: 2 },
  txRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#f4f4f2" },
  txService: { fontSize: 12, fontWeight: "700", color: "#1b1c1a" },
  txMeta: { fontSize: 10, color: "#8c8f94", marginTop: 2 },
  txAmount: { fontSize: 12, fontWeight: "700", fontFamily: "monospace" },
  txStatus: { fontSize: 10, color: "#5b5e66", marginTop: 2 },
  emptyText: { textAlign: "center", color: "#8c8f94", paddingVertical: 12, fontSize: 12 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 20 },
  modalBox: { backgroundColor: "#ffffff", width: "100%", borderRadius: 20, padding: 20, borderWidth: 1, borderColor: "#d4af37" },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#1b1c1a" },
  modalDesc: { fontSize: 12, color: "#5b5e66", marginTop: 4, marginBottom: 16 },
  quickPills: { flexDirection: "row", justifyContent: "space-between", marginBottom: 14 },
  quickPill: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: "#f5f3f0", borderWidth: 1, borderColor: "#e4e2df" },
  quickPillActive: { backgroundColor: "#1b1c1a", borderColor: "#1b1c1a" },
  quickPillText: { fontSize: 12, fontWeight: "700", color: "#1b1c1a" },
  quickPillTextActive: { color: "#ffffff" },
  amountInput: { borderWidth: 1, borderColor: "#d4af37", borderRadius: 12, padding: 12, fontSize: 16, fontFamily: "monospace", marginBottom: 16, backgroundColor: "#fbf9f6" },
  modalActions: { flexDirection: "row", gap: 10 },
  modalCancel: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: "#f5f3f0", alignItems: "center" },
  modalCancelText: { fontSize: 13, fontWeight: "600", color: "#1b1c1a" },
  modalConfirm: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: "#d4af37", alignItems: "center" },
  modalConfirmText: { fontSize: 13, fontWeight: "700", color: "#1b1c1a" },
});
