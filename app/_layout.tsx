import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, router, usePathname } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { Platform } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ProfileProvider } from "@/context/ProfileContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

// ─── Background task + notification setup (native only) ───────────────────────
let _notifResponseSub: { remove(): void } | null = null;

function setupNativeServices() {
  if (Platform.OS === "web") return;

  (async () => {
    try {
      const TaskManager = await import("expo-task-manager");
      const BackgroundFetch = await import("expo-background-fetch");
      const { AUTOMATION_BG_TASK } = await import("@/utils/backgroundService");
      const { loadAutomationState } = await import("@/utils/automationStore");

      if (!TaskManager.isTaskDefined(AUTOMATION_BG_TASK)) {
        TaskManager.defineTask(AUTOMATION_BG_TASK, async () => {
          try {
            const state = await loadAutomationState();
            if (state.status === "running" || state.status === "paused") {
              return BackgroundFetch.BackgroundFetchResult.NewData;
            }
            return BackgroundFetch.BackgroundFetchResult.NoData;
          } catch {
            return BackgroundFetch.BackgroundFetchResult.Failed;
          }
        });
      }
    } catch (e) {}

    try {
      const Notifications = await import("expo-notifications");

      Notifications.setNotificationHandler({
        handleNotification: async (notification) => {
          const data = notification.request.content.data as any;
          if (data?.type === "automation_progress") {
            return { shouldShowAlert: false, shouldPlaySound: false, shouldSetBadge: false, shouldShowBanner: false, shouldShowList: false };
          }
          return { shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: true, shouldShowBanner: true, shouldShowList: true };
        },
      });

      if (_notifResponseSub) _notifResponseSub.remove();
      _notifResponseSub = Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data as any;
        if (!data) return;
        if (data.type === "automation_complete") {
          router.push({
            pathname: "/results" as any,
            params: {
              taskId: data.taskId ?? "",
              count: String(data.count ?? 0),
              folderName: data.folderName ?? "",
              completedAt: data.completedAt ?? "",
            },
          });
        } else if (data.type === "automation_error" && data.screen === "automation") {
          router.push("/automation");
        }
      });
    } catch (e) {}
  })();
}

// ─── Auth guard — redirect to login if not logged in ─────────────────────────
function AuthGuard({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    const isLoginPage = pathname === "/login";
    const isAdminPage = pathname === "/admin";

    if (!session && !isLoginPage) {
      router.replace("/login");
      return;
    }
    if (session?.role === "admin" && !isAdminPage) {
      router.replace("/admin");
      return;
    }
    if (session?.role === "user" && isLoginPage) {
      router.replace("/");
    }
  }, [session, loading, pathname]);

  return <>{children}</>;
}

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="admin" />
      <Stack.Screen name="index" />
      <Stack.Screen name="chat" />
      <Stack.Screen name="automation" />
      <Stack.Screen name="results" />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    setupNativeServices();
    return () => {
      _notifResponseSub?.remove();
      _notifResponseSub = null;
    };
  }, []);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <AuthProvider>
                <ProfileProvider>
                  <AuthGuard>
                    <RootLayoutNav />
                  </AuthGuard>
                </ProfileProvider>
              </AuthProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
