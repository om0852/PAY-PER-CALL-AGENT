import React from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Text, View, StyleSheet } from "react-native";

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
                tabBarIcon: ({ focused }) => <TabIcon label="Nodes" focused={focused} icon="🌐" />,
              }}
            />
            <Tab.Screen
              name="Alerts"
              component={AlertsScreen}
              options={{
                title: "Alerts & Status",
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
  tabLabelActive: { color: "#1b1c1a", fontWeight: "800" },
});
