import React from "react";
import { View, Text } from "@react-pdf/renderer";
import { styles } from "../styles/reportStyles";

/**
 * Fixed dark-green banner repeated on each content page. Renders the
 * EcoXchange wordmark (white, lime accent) in place of the heavy raster logo
 * for crisp, lightweight output.
 */
export function PageHeader() {
  return (
    <View style={styles.banner} fixed>
      <Text style={styles.bannerWordmark}>
        Eco<Text style={styles.bannerWordmarkAccent}>Xchange</Text>
      </Text>
      <Text style={styles.bannerTag}>PRODUCTION VERIFICATION REPORT</Text>
    </View>
  );
}
