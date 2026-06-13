import React from "react";
import { View, Text } from "@react-pdf/renderer";
import { styles } from "../styles/reportStyles";
import type { ReportConfigItem } from "../reportDataModel";

/** Two-column key/value table used for system configuration. */
export function ConfigTable({ items }: { items: ReportConfigItem[] }) {
  return (
    <View style={styles.table}>
      {items.map((item, i) => (
        <View key={i} style={styles.configRow}>
          <Text style={styles.configKey}>{item.label}</Text>
          <Text style={styles.configVal}>{item.value}</Text>
        </View>
      ))}
    </View>
  );
}
