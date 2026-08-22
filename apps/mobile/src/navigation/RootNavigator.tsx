import { useEffect } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../auth/AuthContext";
import { AdjustMapScreen } from "../screens/AdjustMapScreen";
import { AuthScreen } from "../screens/AuthScreen";
import { CaptureScreen } from "../screens/CaptureScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { LandingScreen } from "../screens/LandingScreen";
import { MyReportsScreen } from "../screens/MyReportsScreen";
import { NearbyScreen } from "../screens/NearbyScreen";
import { NotificationsScreen } from "../screens/NotificationsScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { ReportDetailsScreen } from "../screens/ReportDetailsScreen";
import { ReportSubmittedScreen } from "../screens/ReportSubmittedScreen";
import { TrackIssueScreen } from "../screens/TrackIssueScreen";
import { VerifyResolutionScreen } from "../screens/VerifyResolutionScreen";
import type { RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { hydrate, ready } = useAuth();

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  if (!ready) {
    return null;
  }

  return (
    <Stack.Navigator
      initialRouteName="Landing"
      screenOptions={{ headerShown: false, animation: "fade" }}
    >
      <Stack.Screen name="Landing" component={LandingScreen} />
      <Stack.Screen name="Auth" component={AuthScreen} />
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="MyReports" component={MyReportsScreen} />
      <Stack.Screen name="Nearby" component={NearbyScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Capture" component={CaptureScreen} />
      <Stack.Screen name="ReportDetails" component={ReportDetailsScreen} />
      <Stack.Screen name="AdjustMap" component={AdjustMapScreen} />
      <Stack.Screen name="ReportSubmitted" component={ReportSubmittedScreen} />
      <Stack.Screen name="TrackIssue" component={TrackIssueScreen} />
      <Stack.Screen name="VerifyResolution" component={VerifyResolutionScreen} />
    </Stack.Navigator>
  );
}
