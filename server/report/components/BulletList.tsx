import React from "react";
import { View, Text } from "@react-pdf/renderer";
import { styles } from "../styles/reportStyles";

/** Forest-green bulleted list for methodology / observation prose. */
export function BulletList({ items }: { items: string[] }) {
  return (
    <View>
      {items.map((item, i) => (
        <View key={i} style={styles.bullet}>
          <Text style={styles.bulletDot}>•</Text>
          <Text style={styles.bulletText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}
