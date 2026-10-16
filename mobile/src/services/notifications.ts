import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// Configure how notifications appear when app is active, background, or suspended
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    priority: Notifications.AndroidNotificationPriority.MAX,
  }),
});

let isInitialized = false;

export async function initNotifications(): Promise<boolean> {
  try {
    // 1. Request permissions (Android 13+ & iOS)
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          allowAnnouncements: true,
        },
      });
      finalStatus = status;
    }

    // 2. Setup Android high-priority channel with MAX importance
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("agentbucket-alerts", {
        name: "AgentBucket Critical Alerts",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#d4af37",
        sound: "default",
        enableLights: true,
        enableVibrate: true,
        showBadge: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: true,
      });
    }

    isInitialized = true;
    return finalStatus === "granted";
  } catch (err) {
    console.warn("Failed to initialize notifications:", err);
    return false;
  }
}

// Trigger a native notification directly into the phone's status/notification bar immediately
export async function triggerSystemNotification(
  title: string,
  body: string,
  data: Record<string, any> = {}
) {
  try {
    await initNotifications();

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: "default",
        channelId: "agentbucket-alerts",
        priority: Notifications.AndroidNotificationPriority.MAX,
        vibrate: [0, 250, 250, 250],
        data,
      },
      trigger: null, // null means trigger immediately in OS status tray!
    });
    return id;
  } catch (err) {
    console.error("Error triggering system notification:", err);
  }
}

// Schedule a native OS notification delayed by delaySeconds (e.g. 5 or 10s)
// Allows user to press button, swipe home / close the app, and see the OS notification bar pop up!
export async function scheduleDelayedSystemNotification(
  title: string,
  body: string,
  delaySeconds: number = 5,
  data: Record<string, any> = {}
) {
  try {
    await initNotifications();

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: "default",
        channelId: "agentbucket-alerts",
        priority: Notifications.AndroidNotificationPriority.MAX,
        vibrate: [0, 250, 250, 250],
        data,
      },
      trigger: {
        seconds: delaySeconds,
        channelId: "agentbucket-alerts",
      } as any,
    });
    return id;
  } catch (err) {
    console.error("Error scheduling delayed notification:", err);
  }
}
