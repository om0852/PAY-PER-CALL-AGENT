import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// Configure how notifications appear when app is active or in background
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

let isInitialized = false;

export async function initNotifications() {
  if (isInitialized) return;

  try {
    // 1. Request permissions (Android 13+ & iOS)
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.warn("Notification permissions not granted by user.");
    }

    // 2. Setup Android high-priority channel
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("agentbucket-alerts", {
        name: "AgentBucket Critical Alerts",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#d4af37",
        sound: "default",
      });
    }

    isInitialized = true;
  } catch (err) {
    console.warn("Failed to initialize notifications:", err);
  }
}

// Trigger a native notification directly into the phone's status/notification bar
export async function triggerSystemNotification(title: string, body: string, data: Record<string, any> = {}) {
  try {
    await initNotifications();

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: "default",
        data,
      },
      trigger: null, // null means show immediately!
    });
  } catch (err) {
    console.error("Error triggering system notification:", err);
  }
}
