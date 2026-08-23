import { useState } from "react";
import {
  Image,
  type ImageProps,
  type ImageSourcePropType,
  type ImageStyle,
  type StyleProp,
} from "react-native";
import { pickRemotePhotoUrl } from "../utils/photoUrl";

type Props = {
  urls?: string[] | null;
  fallback: ImageSourcePropType;
  style?: StyleProp<ImageStyle>;
  resizeMode?: ImageProps["resizeMode"];
};

/** Renders the first remote issue photo, or fallback if missing/unloadable. */
export function ReportPhoto({
  urls,
  fallback,
  style,
  resizeMode = "cover",
}: Props) {
  const remote = pickRemotePhotoUrl(urls);
  const [failed, setFailed] = useState(false);
  const source = !remote || failed ? fallback : { uri: remote };

  return (
    <Image
      source={source}
      style={style}
      resizeMode={resizeMode}
      onError={() => setFailed(true)}
    />
  );
}
