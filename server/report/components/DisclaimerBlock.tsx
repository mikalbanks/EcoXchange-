import React from "react";
import { View, Text } from "@react-pdf/renderer";
import { styles } from "../styles/reportStyles";

/** Bulleted disclaimer / limitation list in IBM Plex Mono 8pt muted. */
export function DisclaimerBlock({ lines }: { lines: string[] }) {
  return (
    <View>
      {lines.map((line, i) => (
        <View key={i} style={styles.disclaimerRow}>
          <Text style={styles.disclaimerDot}>•</Text>
          <Text style={styles.disclaimerText}>{line}</Text>
        </View>
      ))}
    </View>
  );
}
