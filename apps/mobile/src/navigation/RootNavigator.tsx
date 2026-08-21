import { useEffect } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../auth/AuthContext";
import { AuthScreen } from "../screens/AuthScreen";
import { CaptureScreen } from "../screens/CaptureScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { LandingScreen } from "../screens/LandingScreen";
import { ReportDetailsScreen } from "../screens/ReportDetailsScreen";
import { TrackIssueScreen } from "../screens/TrackIssueScreen";
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
      <Stack.Screen name="Capture" component={CaptureScreen} />
      <Stack.Screen name="ReportDetails" component={ReportDetailsScreen} />
      <Stack.Screen name="TrackIssue" component={TrackIssueScreen} />
    </Stack.Navigator>
  );
}
