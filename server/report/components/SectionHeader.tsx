import React from "react";
import { View, Text } from "@react-pdf/renderer";
import { styles } from "../styles/reportStyles";

/** "§ SECTION NAME" heading in serif with a dark-green rule beneath. */
export function SectionHeader({ title }: { title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{`§ ${title}`}</Text>
      <View style={styles.sectionRule} />
    </View>
  );
}
