import React from "react";
import { View, Text } from "@react-pdf/renderer";
import { styles } from "../styles/reportStyles";

export interface StatItem {
  label: string;
  value: string;
}

/** Dark-green stat banner with lime numbers and white labels. */
export function StatBar({ items }: { items: StatItem[] }) {
  return (
    <View style={styles.statBar}>
      {items.map((item, i) => (
        <View key={i} style={styles.statCell}>
          <Text style={styles.statValue}>{item.value}</Text>
          <Text style={styles.statLabel}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}
