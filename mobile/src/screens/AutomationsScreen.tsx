import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { runAutomationTask } from "../services/api";

export default function AutomationsScreen() {
  const [taskPrompt, setTaskPrompt] = useState(
    "Convert XML dataset into JSON, check travel books catalogue, and classify sentiment."
  );
  const [budget, setBudget] = useState("0.50");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<any | null>(null);

  const handleLaunch = async () => {
    if (!taskPrompt.trim()) {
      Alert.alert("Input Required", "Please enter an agent prompt.");
      return;
    }
    const b = parseFloat(budget);
    if (isNaN(b) || b <= 0) {
      Alert.alert("Invalid Budget", "Please enter a valid budget in USDC.");
      return;
    }

    setRunning(true);
    setResult(null);

    try {
      const res = await runAutomationTask(taskPrompt, b);
      setResult(res);
      Alert.alert("Automation Completed! 🚀", `Executed ${res.purchases?.length || 0} API services with EIP-3009 gasless settlements.`);
    } catch (err: any) {
      Alert.alert("Execution Error", err.message || "Failed to run autonomous pipeline.");
    } finally {
      setRunning(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Autonomous Agent Automation</Text>
        <Text style={styles.subtitle}>
          Launch self-paying autonomous AI pipelines directly from your mobile device.
        </Text>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.label}>Task Goal / Objective</Text>
        <TextInput
          style={styles.textArea}
          multiline
          numberOfLines={4}
          value={taskPrompt}
          onChangeText={setTaskPrompt}
          placeholder="Describe what your autonomous agent should execute..."
        />

        <Text style={styles.label}>Maximum Budget Lock (USDC)</Text>
        <View style={styles.budgetRow}>
          {["0.25", "0.50", "1.00", "2.00"].map((amt) => (
            <TouchableOpacity
              key={amt}
              style={[styles.budgetPill, budget === amt && styles.budgetPillActive]}
              onPress={() => setBudget(amt)}
            >
              <Text style={[styles.budgetPillText, budget === amt && styles.budgetPillTextActive]}>
                ${amt}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.launchBtn, running && styles.launchBtnDisabled]}
          onPress={handleLaunch}
          disabled={running}
        >
          {running ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={styles.launchBtnText}>Executing Pipeline (402 Handshake)...</Text>
            </View>
          ) : (
            <Text style={styles.launchBtnText}>⚡ Launch Agent Automation</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Execution Results View */}
      {result && (
        <View style={styles.resultsCard}>
          <View style={styles.resultHeader}>
            <Text style={styles.resultTitle}>Execution Receipt</Text>
            <View style={styles.successPill}>
              <Text style={styles.successText}>100% Completed</Text>
            </View>
          </View>

          <View style={styles.summaryStats}>
            <View style={styles.statBox}>
              <Text style={styles.statNum}>{result.purchases?.length || 0}</Text>
              <Text style={styles.statLabel}>Services Called</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statNum, { color: "#10b981" }]}>
                ${((result.totalSpent || 0) / 1e6).toFixed(4)}
              </Text>
              <Text style={styles.statLabel}>Settled USDC</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statNum, { color: "#735c00" }]}>$0.00</Text>
              <Text style={styles.statLabel}>User Gas Paid</Text>
            </View>
          </View>

          {result.purchases && result.purchases.map((p: any, idx: number) => (
            <View key={idx} style={styles.purchaseRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.purchaseService}>0{idx + 1}. {p.service}</Text>
                <Text style={styles.purchaseMeta}>{p.category} • EIP-3009 Signed</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.purchaseAmount}>${((p.cost || 50000) / 1e6).toFixed(4)} USDC</Text>
                <Text style={styles.purchaseRating}>★ {p.userRating || 5.0} SLA Rating</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f7f4", padding: 16 },
  header: { marginBottom: 14 },
  title: { fontSize: 18, fontWeight: "800", color: "#1b1c1a" },
  subtitle: { fontSize: 12, color: "#5b5e66", marginTop: 4, lineHeight: 18 },
  formCard: { backgroundColor: "#ffffff", padding: 16, borderRadius: 16, borderWidth: 1, borderColor: "#efeeeb", marginBottom: 14 },
  label: { fontSize: 11, fontWeight: "700", color: "#5b5e66", textTransform: "uppercase", marginBottom: 6 },
  textArea: { borderWidth: 1, borderColor: "#d0c5af", borderRadius: 12, padding: 12, fontSize: 13, backgroundColor: "#fbf9f6", height: 80, textAlignVertical: "top", marginBottom: 14 },
  budgetRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  budgetPill: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 10, backgroundColor: "#f5f3f0", borderWidth: 1, borderColor: "#e4e2df" },
  budgetPillActive: { backgroundColor: "#1b1c1a", borderColor: "#1b1c1a" },
  budgetPillText: { fontSize: 12, fontWeight: "700", color: "#1b1c1a" },
  budgetPillTextActive: { color: "#ffffff" },
  launchBtn: { backgroundColor: "#d4af37", paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  launchBtnDisabled: { opacity: 0.6 },
  launchBtnText: { color: "#1b1c1a", fontSize: 14, fontWeight: "800" },
  resultsCard: { backgroundColor: "#ffffff", padding: 16, borderRadius: 16, borderWidth: 1, borderColor: "#10b981", marginBottom: 20 },
  resultHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  resultTitle: { fontSize: 15, fontWeight: "800", color: "#1b1c1a" },
  successPill: { backgroundColor: "#ecfdf5", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  successText: { color: "#047857", fontSize: 10, fontWeight: "700" },
  summaryStats: { flexDirection: "row", justifyContent: "space-around", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#f4f4f2", marginBottom: 12 },
  statBox: { alignItems: "center" },
  statNum: { fontSize: 18, fontWeight: "800", fontFamily: "monospace" },
  statLabel: { fontSize: 10, color: "#8c8f94", marginTop: 2 },
  purchaseRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#f4f4f2" },
  purchaseService: { fontSize: 12, fontWeight: "700", color: "#1b1c1a" },
  purchaseMeta: { fontSize: 10, color: "#8c8f94", marginTop: 2 },
  purchaseAmount: { fontSize: 12, fontWeight: "700", fontFamily: "monospace", color: "#10b981" },
  purchaseRating: { fontSize: 10, color: "#735c00", fontWeight: "600", marginTop: 2 },
});
