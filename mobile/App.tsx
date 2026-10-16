import React, { useEffect, useState, useRef } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Text, View, StyleSheet } from "react-native";
import { initNotifications, triggerSystemNotification } from "./src/services/notifications";
import { fetchAlerts } from "./src/services/api";

import DashboardScreen from "./src/screens/DashboardScreen";
import TransactionsScreen from "./src/screens/TransactionsScreen";
import ServicesScreen from "./src/screens/ServicesScreen";
import AutomationsScreen from "./src/screens/AutomationsScreen";
import AlertsScreen from "./src/screens/AlertsScreen";

const Tab = createBottomTabNavigator();

function TabIcon({ label, focused, icon }: { label: string; focused: boolean; icon: string }) {
  return (
    <View style={styles.tabItem}>
      <Text style={{ fontSize: 18 }}>{icon}</Text>
      <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>{label}</Text>
    </View>
  );
}

export default function App() {
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const knownAlertIdsRef = useRef<Set<string>>(new Set());
  const isFirstCheckRef = useRef<boolean>(true);

  useEffect(() => {
    initNotifications();

    // Global background listener for alerts (e.g. from Web health audits or autonomous tasks)
    const pollAlerts = async () => {
      try {
        const res = await fetchAlerts();
        const alerts = res.alerts || [];
        setUnreadCount(res.unreadCount || alerts.filter((a: any) => !a.read).length);

        // First check: seed known IDs so we don't spam older alerts
        if (isFirstCheckRef.current) {
          alerts.forEach((a: any) => knownAlertIdsRef.current.add(a.id));
          isFirstCheckRef.current = false;
          return;
        }

        // Subsequent polls: trigger native phone OS notification bar for ANY new incoming alert!
        for (const alert of alerts) {
          if (!knownAlertIdsRef.current.has(alert.id)) {
            knownAlertIdsRef.current.add(alert.id);
            await triggerSystemNotification(alert.title, alert.message);
          }
        }
      } catch {
        // network polling silent retry
      }
    };

    pollAlerts();
    const interval = setInterval(pollAlerts, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: "#f8f7f4" }}>
        <StatusBar style="dark" />
        <NavigationContainer>
          <Tab.Navigator
            screenOptions={{
              headerShown: true,
              headerStyle: { backgroundColor: "#ffffff" },
              headerTitleStyle: { fontWeight: "800", color: "#1b1c1a", fontSize: 16 },
              tabBarStyle: {
                backgroundColor: "#ffffff",
                borderTopColor: "#efeeeb",
                height: 60,
                paddingBottom: 8,
                paddingTop: 6,
              },
              tabBarShowLabel: false,
            }}
          >
            <Tab.Screen
              name="Dashboard"
              component={DashboardScreen}
              options={{
                title: "AgentBucket Wallet",
                tabBarIcon: ({ focused }) => <TabIcon label="Wallet" focused={focused} icon="💳" />,
              }}
            />
            <Tab.Screen
              name="Transactions"
              component={TransactionsScreen}
              options={{
                title: "Transactions Ledger",
                tabBarIcon: ({ focused }) => <TabIcon label="Ledger" focused={focused} icon="📜" />,
              }}
            />
            <Tab.Screen
              name="Automations"
              component={AutomationsScreen}
              options={{
                title: "Agent Automation",
                tabBarIcon: ({ focused }) => <TabIcon label="Agents" focused={focused} icon="⚡" />,
              }}
            />
            <Tab.Screen
              name="Services"
              component={ServicesScreen}
              options={{
                title: "Services Registry",
                tabBarIcon: ({ focused }) => <TabIcon label="Services" focused={focused} icon="🌐" />,
              }}
            />
            <Tab.Screen
              name="Alerts"
              component={AlertsScreen}
              options={{
                title: "Alerts & Status",
                tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
                tabBarBadgeStyle: { backgroundColor: "#ef4444", fontSize: 10, fontWeight: "800" },
                tabBarIcon: ({ focused }) => <TabIcon label="Alerts" focused={focused} icon="🔔" />,
              }}
            />
          </Tab.Navigator>
        </NavigationContainer>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  tabItem: { alignItems: "center", justifyContent: "center" },
  tabLabel: { fontSize: 10, fontWeight: "600", color: "#8c8f94", marginTop: 2 },
  tabLabelActive: { color: "#d4af37", fontWeight: "800" },
});
