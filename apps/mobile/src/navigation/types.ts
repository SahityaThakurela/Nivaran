export type RootStackParamList = {
  Landing: undefined;
  Auth: undefined;
  Home: undefined;
  MyReports: undefined;
  Nearby: undefined;
  Notifications: undefined;
  Profile: undefined;
  Capture: { domain?: string } | undefined;
  ReportDetails: {
    photoUri: string;
    latitude: number;
    longitude: number;
    address?: string;
    domain?: string;
  };
  AdjustMap: {
    latitude: number;
    longitude: number;
    photoUri: string;
    domain?: string;
  };
  ReportSubmitted: { issueId: string; domain?: string };
  TrackIssue: { issueId: string; animateTimeline?: boolean };
  VerifyResolution: { issueId: string };
};
