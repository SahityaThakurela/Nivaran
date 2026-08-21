import { StyleSheet, View } from "react-native";
import { SvgXml } from "react-native-svg";
import { iconXml, type IconName } from "./iconAssets";

type IconProps = {
  name: IconName;
  width: number;
  height: number;
  /** Optional color override via fill on root paths — leave undefined to keep Figma fills. */
  color?: string;
};

/**
 * Renders a Figma-exported SVG by exact asset XML (see iconAssets.ts).
 */
export function Icon({ name, width, height, color }: IconProps) {
  let xml: string = iconXml[name];
  if (color) {
    xml = xml.replace(/fill="[^"]*"/g, `fill="${color}"`);
  }
  return (
    <View style={[styles.box, { width, height }]}>
      <SvgXml xml={xml} width={width} height={height} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
});
