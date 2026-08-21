export type RootStackParamList = {
  Landing: undefined;
  Auth: undefined;
  Home: undefined;
  MyReports: undefined;
  Nearby: undefined;
  Notifications: undefined;
  Profile: undefined;
  Capture: { category?: string } | undefined;
  ReportDetails: {
    photoUri: string;
    latitude: number;
    longitude: number;
    address?: string;
    category?: string;
  };
  TrackIssue: { issueId: string };
  VerifyResolution: { issueId: string };
};
