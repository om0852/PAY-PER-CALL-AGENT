import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from "react-native";
import { runAutomationTask } from "../services/api";

interface PurchaseItem {
  id?: string;
  service: string;
  category: string;
  price?: string;
  cost?: number;
  rawPrice?: number;
  txHash?: string;
  latency?: string;
  latencyMs?: number;
  userRating?: number;
}

interface Message {
  id: string;
  sender: "user" | "agent";
  text?: string;
  budgetUsdc?: number;
  status?: "thinking" | "completed" | "error";
  error?: string;
  result?: {
    taskId: string;
    summary: string;
    purchases: PurchaseItem[];
    totalSpent: number;
    budgetLimit: number;
    remainingBudget: number;
    output?: any;
  };
  timestamp: number;
}

const STARTER_PROMPTS = [
  {
    icon: "⚡",
    title: "Master Pipeline",
    desc: "Scrape books catalogue, convert foreign FX rates, and evaluate sentiment.",
    budget: "0.75",
  },
  {
    icon: "📄",
    title: "XML to JSON Pro",
    desc: "Convert customer reviews XML dataset to structured JSON schema.",
    budget: "0.25",
  },
  {
    icon: "🌐",
    title: "Scrape & FX Rates",
    desc: "Scrape travel catalogue prices and convert GBP to INR rates.",
    budget: "0.50",
  },
  {
    icon: "🛡️",
    title: "AML & Crypto Oracle",
    desc: "Screen vendor for sanctions clearance and fetch Base L2 gas oracle.",
    budget: "0.50",
  },
];

export default function AutomationsScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputPrompt, setInputPrompt] = useState("");
  const [selectedBudget, setSelectedBudget] = useState("0.50");
  const [isGenerating, setIsGenerating] = useState(false);
  const [expandedReasoningIds, setExpandedReasoningIds] = useState<Set<string>>(new Set());
  const [selectedOutput, setSelectedOutput] = useState<{ title: string; json: string } | null>(null);

  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    // Auto-scroll to bottom on new messages
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 150);
  }, [messages, isGenerating]);

  const toggleReasoning = (msgId: string) => {
    setExpandedReasoningIds((prev) => {
      const next = new Set(prev);
      if (next.has(msgId)) {
        next.delete(msgId);
      } else {
        next.add(msgId);
      }
      return next;
    });
  };

  const handleSend = async (promptToSend?: string, budgetOverride?: string) => {
    const text = (promptToSend || inputPrompt).trim();
    if (!text || isGenerating) return;

    const budgetVal = parseFloat(budgetOverride || selectedBudget) || 0.5;
    const userMsgId = "msg-" + Date.now();
    const agentMsgId = "agent-" + (Date.now() + 1);

    const userMessage: Message = {
      id: userMsgId,
      sender: "user",
      text,
      budgetUsdc: budgetVal,
      timestamp: Date.now(),
    };

    const agentThinkingMessage: Message = {
      id: agentMsgId,
      sender: "agent",
      status: "thinking",
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage, agentThinkingMessage]);
    setInputPrompt("");
    setIsGenerating(true);

    try {
      const res = await runAutomationTask(text, budgetVal);

      const purchases: PurchaseItem[] = res.purchases || [];
      const totalSpent = res.totalSpent || 0;
      const summaryText =
        res.summary ||
        `Autonomous execution completed successfully. Dispatched ${purchases.length} API service${
          purchases.length === 1 ? "" : "s"
        } with EIP-3009 gasless settlement on Base Sepolia.`;

      setMessages((prev) =>
        prev.map((m) =>
          m.id === agentMsgId
            ? {
                ...m,
                status: "completed",
                result: {
                  taskId: res.taskId,
                  summary: summaryText,
                  purchases,
                  totalSpent,
                  budgetLimit: res.budgetLimit || Math.round(budgetVal * 1e6),
                  remainingBudget: res.remainingBudget || 0,
                  output: res.output,
                },
              }
            : m
        )
      );

      // Auto expand reasoning to showcase executed services
      setExpandedReasoningIds((prev) => new Set(prev).add(agentMsgId));
    } catch (err: any) {
      const errorMsg = err.message || "Failed to execute agent automation.";
      setMessages((prev) =>
        prev.map((m) =>
          m.id === agentMsgId
            ? {
                ...m,
                status: "error",
                error: errorMsg,
              }
            : m
        )
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleResetChat = () => {
    if (messages.length === 0) return;
    Alert.alert("New Chat", "Start a fresh agent automation conversation?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "New Chat",
        style: "destructive",
        onPress: () => {
          setMessages([]);
          setExpandedReasoningIds(new Set());
        },
      },
    ]);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      {/* ChatGPT Top Model Navigation Bar */}
      <View style={styles.topBar}>
        <View style={styles.modelPill}>
          <View style={styles.sparkleIcon}>
            <Text style={{ fontSize: 13 }}>⚡</Text>
          </View>
          <View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
              <Text style={styles.modelTitle}>Agent Scout v1.4.2</Text>
              <View style={styles.badgeLive}>
                <Text style={styles.badgeLiveText}>EIP-3009</Text>
              </View>
            </View>
            <Text style={styles.modelSubtitle}>Base Sepolia • Gasless Relayer</Text>
          </View>
        </View>

        {messages.length > 0 && (
          <TouchableOpacity style={styles.newChatBtn} onPress={handleResetChat}>
            <Text style={styles.newChatText}>＋ New</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Chat Messages Stream */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.chatStream}
        contentContainerStyle={[
          styles.chatContent,
          messages.length === 0 && { flexGrow: 1, justifyContent: "center" },
        ]}
      >
        {messages.length === 0 ? (
          /* Empty State: ChatGPT Greeting & Suggestion Chips */
          <View style={styles.emptyContainer}>
            <View style={styles.avatarLarge}>
              <Text style={{ fontSize: 32 }}>⚡</Text>
            </View>
            <Text style={styles.emptyTitle}>What should your agent automate?</Text>
            <Text style={styles.emptyDesc}>
              Decomposes natural language goals into multi-agent workflows, settled atomically via HTTP 402 micro-payments.
            </Text>

            <View style={styles.startersGrid}>
              {STARTER_PROMPTS.map((p, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.starterCard}
                  onPress={() => handleSend(p.desc, p.budget)}
                >
                  <View style={styles.starterHeader}>
                    <Text style={{ fontSize: 16 }}>{p.icon}</Text>
                    <Text style={styles.starterBudget}>${p.budget} USDC</Text>
                  </View>
                  <Text style={styles.starterTitle}>{p.title}</Text>
                  <Text style={styles.starterDesc} numberOfLines={2}>
                    {p.desc}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          messages.map((msg) => {
            if (msg.sender === "user") {
              return (
                <View key={msg.id} style={styles.userMsgWrapper}>
                  <View style={styles.userBubble}>
                    <Text style={styles.userText}>{msg.text}</Text>
                  </View>
                  <View style={styles.userMeta}>
                    <Text style={styles.userMetaText}>
                      Budget Lock: ${(msg.budgetUsdc || 0.5).toFixed(2)} USDC • Sponsored Gas
                    </Text>
                  </View>
                </View>
              );
            }

            // Agent Message
            return (
              <View key={msg.id} style={styles.agentMsgWrapper}>
                <View style={styles.agentAvatar}>
                  <Text style={{ fontSize: 14 }}>⚡</Text>
                </View>

                <View style={styles.agentContentWrapper}>
                  {msg.status === "thinking" ? (
                    <View style={styles.thinkingCard}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <ActivityIndicator size="small" color="#d4af37" />
                        <Text style={styles.thinkingTitle}>Orchestrating Autonomous Pipeline...</Text>
                      </View>
                      <View style={styles.thinkingSteps}>
                        <Text style={styles.thinkingStepText}>• Decomposing task DAG & ranking candidates</Text>
                        <Text style={styles.thinkingStepText}>• Performing HTTP 402 EIP-3009 offline nonces</Text>
                        <Text style={styles.thinkingStepText}>• Validating strict Ajv schemas on Base Sepolia</Text>
                      </View>
                    </View>
                  ) : msg.status === "error" ? (
                    <View style={styles.errorCard}>
                      <Text style={styles.errorTitle}>Pipeline Execution Error</Text>
                      <Text style={styles.errorText}>{msg.error}</Text>
                      <TouchableOpacity
                        style={styles.retryBtn}
                        onPress={() => handleSend(inputPrompt || "Retry last autonomous pipeline")}
                      >
                        <Text style={styles.retryBtnText}>↺ Retry Pipeline</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    /* Completed Agent Result */
                    <View style={styles.completedCard}>
                      {/* Synthesized Response */}
                      <Text style={styles.summaryText}>{msg.result?.summary}</Text>

                      {/* Collapsible Reasoning & Tools Box (ChatGPT Style) */}
                      {msg.result && (
                        <View style={styles.reasoningBox}>
                          <TouchableOpacity
                            style={styles.reasoningHeader}
                            onPress={() => toggleReasoning(msg.id)}
                            activeOpacity={0.7}
                          >
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                              <Text style={{ fontSize: 12 }}>⚡</Text>
                              <Text style={styles.reasoningTitle}>
                                {msg.result.purchases.length} Service
                                {msg.result.purchases.length === 1 ? "" : "s"} Called
                              </Text>
                              <Text style={styles.reasoningCost}>
                                • {msg.result.totalSpent === 0 ? "$0.0000 USDC (Prepaid Rental)" : `$${(msg.result.totalSpent / 1e6).toFixed(4)} USDC`}
                              </Text>
                            </View>
                            <Text style={styles.reasoningChevron}>
                              {expandedReasoningIds.has(msg.id) ? "▲ Hide" : "▼ Details"}
                            </Text>
                          </TouchableOpacity>

                          {expandedReasoningIds.has(msg.id) && (
                            <View style={styles.servicesList}>
                              {msg.result.purchases.map((p, pIdx) => (
                                <View key={pIdx} style={styles.serviceRow}>
                                  <View style={{ flex: 1 }}>
                                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                                      <Text style={styles.serviceIndex}>0{pIdx + 1}</Text>
                                      <Text style={styles.serviceName}>{p.service}</Text>
                                    </View>
                                    <Text style={styles.serviceSub}>
                                      {p.category} • {p.latency || "45ms"} • EIP-3009 Nonce
                                    </Text>
                                    {p.txHash && (
                                      <Text style={styles.serviceTx} numberOfLines={1}>
                                        Tx: {p.txHash.slice(0, 16)}...
                                      </Text>
                                    )}
                                  </View>

                                  <View style={{ alignItems: "flex-end" }}>
                                    <Text
                                      style={[
                                        styles.servicePrice,
                                        ((p.cost ?? p.rawPrice ?? 0) === 0 || p.price?.includes("Rental")) && {
                                          color: "#10b981",
                                        },
                                      ]}
                                    >
                                      {((p.cost ?? p.rawPrice ?? 0) === 0 || p.price?.includes("Rental"))
                                        ? "$0.0000 (Rental)"
                                        : `$${((p.cost ?? p.rawPrice ?? 0) / 1e6).toFixed(4)}`}
                                    </Text>
                                    <Text style={styles.serviceRating}>★ {p.userRating || 5.0} SLA</Text>
                                  </View>
                                </View>
                              ))}

                              {/* Task Output Inspection Button */}
                              {msg.result.output && (
                                <TouchableOpacity
                                  style={styles.viewOutputBtn}
                                  onPress={() =>
                                    setSelectedOutput({
                                      title: `Deliverables: ${msg.result?.taskId}`,
                                      json: JSON.stringify(msg.result?.output, null, 2),
                                    })
                                  }
                                >
                                  <Text style={styles.viewOutputText}>🔍 Inspect Parsed JSON Payload</Text>
                                </TouchableOpacity>
                              )}
                            </View>
                          )}
                        </View>
                      )}
                    </View>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* ChatGPT Bottom Floating Input Bar */}
      <View style={styles.inputContainer}>
        {/* Quick Budget Preset Bar */}
        <View style={styles.budgetBar}>
          <Text style={styles.budgetLabel}>Budget Cap:</Text>
          {["0.25", "0.50", "0.75", "1.50"].map((amt) => (
            <TouchableOpacity
              key={amt}
              style={[styles.budgetChip, selectedBudget === amt && styles.budgetChipActive]}
              onPress={() => setSelectedBudget(amt)}
            >
              <Text
                style={[
                  styles.budgetChipText,
                  selectedBudget === amt && styles.budgetChipTextActive,
                ]}
              >
                ${amt}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Input Pill */}
        <View style={styles.inputPill}>
          <TextInput
            style={styles.textInput}
            value={inputPrompt}
            onChangeText={setInputPrompt}
            placeholder="Ask Agent Scout to automate..."
            placeholderTextColor="#8c8f94"
            multiline
            maxLength={1000}
            editable={!isGenerating}
          />

          <TouchableOpacity
            style={[
              styles.sendBtn,
              (!inputPrompt.trim() || isGenerating) && styles.sendBtnDisabled,
            ]}
            onPress={() => handleSend()}
            disabled={!inputPrompt.trim() || isGenerating}
          >
            {isGenerating ? (
              <ActivityIndicator size="small" color="#1b1c1a" />
            ) : (
              <Text style={styles.sendArrow}>↑</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* JSON Payload Inspection Modal */}
      <Modal visible={!!selectedOutput} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} numberOfLines={1}>
                {selectedOutput?.title}
              </Text>
              <TouchableOpacity onPress={() => setSelectedOutput(null)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <Text style={styles.modalJson}>{selectedOutput?.json}</Text>
            </ScrollView>

            <TouchableOpacity
              style={styles.modalDoneBtn}
              onPress={() => setSelectedOutput(null)}
            >
              <Text style={styles.modalDoneText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fbf9f6" },

  // Top Model Bar (ChatGPT Style)
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#efeeeb",
  },
  modelPill: { flexDirection: "row", alignItems: "center", gap: 10 },
  sparkleIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#fee179",
    alignItems: "center",
    justifyContent: "center",
  },
  modelTitle: { fontSize: 13, fontWeight: "800", color: "#1b1c1a" },
  badgeLive: {
    backgroundColor: "#d4af37",
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 8,
  },
  badgeLiveText: { fontSize: 9, fontWeight: "800", color: "#554300" },
  modelSubtitle: { fontSize: 10, color: "#735c00", fontWeight: "600", marginTop: 1 },
  newChatBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "#f5f3f0",
  },
  newChatText: { fontSize: 11, fontWeight: "700", color: "#1b1c1a" },

  // Chat Stream
  chatStream: { flex: 1 },
  chatContent: { padding: 16, paddingBottom: 24 },

  // Empty State
  emptyContainer: { alignItems: "center", justifyContent: "center", paddingVertical: 20 },
  avatarLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#fee179",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: "#1b1c1a", textAlign: "center" },
  emptyDesc: {
    fontSize: 12,
    color: "#5b5e66",
    textAlign: "center",
    marginTop: 6,
    marginBottom: 24,
    paddingHorizontal: 20,
    lineHeight: 18,
  },
  startersGrid: { width: "100%", gap: 10 },
  starterCard: {
    backgroundColor: "#ffffff",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e4e2df",
  },
  starterHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  starterBudget: { fontSize: 10, fontWeight: "700", color: "#735c00", backgroundColor: "#fee179", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  starterTitle: { fontSize: 13, fontWeight: "700", color: "#1b1c1a", marginBottom: 3 },
  starterDesc: { fontSize: 11, color: "#735c00", lineHeight: 16 },

  // User Message
  userMsgWrapper: { alignSelf: "flex-end", maxWidth: "85%", marginBottom: 16 },
  userBubble: {
    backgroundColor: "#1b1c1a",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderBottomRightRadius: 4,
  },
  userText: { color: "#ffffff", fontSize: 14, lineHeight: 20 },
  userMeta: { marginTop: 4, alignSelf: "flex-end" },
  userMetaText: { fontSize: 10, color: "#8c8f94", fontWeight: "600" },

  // Agent Message
  agentMsgWrapper: { flexDirection: "row", gap: 10, marginBottom: 20, maxWidth: "100%" },
  agentAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#fee179",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  agentContentWrapper: { flex: 1 },

  // Thinking State
  thinkingCard: {
    backgroundColor: "#ffffff",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e4e2df",
  },
  thinkingTitle: { fontSize: 12, fontWeight: "700", color: "#735c00" },
  thinkingSteps: { marginTop: 8, paddingLeft: 6, gap: 4 },
  thinkingStepText: { fontSize: 11, color: "#5b5e66" },

  // Completed State
  completedCard: {
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e4e2df",
  },
  summaryText: { fontSize: 13, color: "#1b1c1a", lineHeight: 20, marginBottom: 12 },

  // Collapsible Reasoning Card (ChatGPT Style)
  reasoningBox: {
    backgroundColor: "#fbf9f6",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e4e2df",
    overflow: "hidden",
  },
  reasoningHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 10,
    backgroundColor: "#f5f3f0",
  },
  reasoningTitle: { fontSize: 11, fontWeight: "700", color: "#1b1c1a" },
  reasoningCost: { fontSize: 11, fontWeight: "700", color: "#10b981", fontFamily: "monospace" },
  reasoningChevron: { fontSize: 10, fontWeight: "700", color: "#735c00" },

  servicesList: { padding: 10, gap: 8 },
  serviceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#efeeeb",
  },
  serviceIndex: { fontSize: 11, fontWeight: "800", color: "#d4af37", fontFamily: "monospace" },
  serviceName: { fontSize: 12, fontWeight: "700", color: "#1b1c1a" },
  serviceSub: { fontSize: 10, color: "#8c8f94", marginTop: 1 },
  serviceTx: { fontSize: 9, color: "#735c00", fontFamily: "monospace", marginTop: 1 },
  servicePrice: { fontSize: 11, fontWeight: "700", color: "#10b981", fontFamily: "monospace" },
  serviceRating: { fontSize: 9, fontWeight: "600", color: "#d4af37", marginTop: 1 },

  viewOutputBtn: {
    paddingVertical: 8,
    marginTop: 4,
    alignItems: "center",
    borderRadius: 8,
    backgroundColor: "#efeeeb",
  },
  viewOutputText: { fontSize: 11, fontWeight: "700", color: "#1b1c1a" },

  // Error Card
  errorCard: {
    backgroundColor: "#fff1f2",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#fecdd3",
  },
  errorTitle: { fontSize: 13, fontWeight: "800", color: "#9f1239", marginBottom: 4 },
  errorText: { fontSize: 11, color: "#be123c", lineHeight: 16, marginBottom: 10 },
  retryBtn: {
    backgroundColor: "#be123c",
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  retryBtnText: { color: "#ffffff", fontSize: 11, fontWeight: "700" },

  // Floating Input Container (ChatGPT Style)
  inputContainer: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: Platform.OS === "ios" ? 20 : 12,
    borderTopWidth: 1,
    borderTopColor: "#efeeeb",
  },
  budgetBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  budgetLabel: { fontSize: 10, fontWeight: "700", color: "#8c8f94", textTransform: "uppercase" },
  budgetChip: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: "#f5f3f0",
    borderWidth: 1,
    borderColor: "#e4e2df",
  },
  budgetChipActive: { backgroundColor: "#1b1c1a", borderColor: "#1b1c1a" },
  budgetChipText: { fontSize: 10, fontWeight: "700", color: "#5b5e66" },
  budgetChipTextActive: { color: "#ffffff" },

  inputPill: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: "#f5f3f0",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#e4e2df",
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 6,
    minHeight: 48,
  },
  textInput: {
    flex: 1,
    fontSize: 13,
    color: "#1b1c1a",
    maxHeight: 100,
    paddingTop: Platform.OS === "ios" ? 8 : 4,
    paddingBottom: Platform.OS === "ios" ? 8 : 4,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#d4af37",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6,
    marginBottom: 2,
  },
  sendBtnDisabled: { backgroundColor: "#e4e2df" },
  sendArrow: { fontSize: 18, fontWeight: "900", color: "#554300" },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalBox: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  modalTitle: { fontSize: 14, fontWeight: "800", color: "#1b1c1a", flex: 1 },
  modalClose: { fontSize: 18, fontWeight: "700", color: "#8c8f94", padding: 4 },
  modalScroll: {
    backgroundColor: "#1b1c1a",
    borderRadius: 12,
    padding: 12,
    maxHeight: 400,
  },
  modalJson: { fontFamily: "monospace", fontSize: 11, color: "#34d399" },
  modalDoneBtn: {
    backgroundColor: "#1b1c1a",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 14,
  },
  modalDoneText: { color: "#ffffff", fontSize: 13, fontWeight: "700" },
});
