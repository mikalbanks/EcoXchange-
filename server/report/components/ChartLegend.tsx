import React from "react";
import { View, Text } from "@react-pdf/renderer";
import { colors, MONO } from "../styles/reportStyles";

export interface LegendItem {
  label: string;
  color: string;
  outline?: boolean;
}

/** Inline legend swatches rendered above/below a chart. */
export function ChartLegend({ items }: { items: LegendItem[] }) {
  return (
    <View style={{ flexDirection: "row", gap: 14, marginBottom: 4 }}>
      {items.map((item, i) => (
        <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <View
            style={{
              width: 8,
              height: 8,
              backgroundColor: item.outline ? colors.paleGreen : item.color,
              borderWidth: item.outline ? 0.75 : 0,
              borderColor: item.color,
            }}
          />
          <Text style={{ fontFamily: MONO, fontSize: 7, color: colors.muted }}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}
