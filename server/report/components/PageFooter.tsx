import React from "react";
import { View, Text } from "@react-pdf/renderer";
import { styles } from "../styles/reportStyles";

/** Fixed footer: confidential notice + live page number. */
export function PageFooter() {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>Confidential — EcoXchange, Inc.</Text>
      <Text
        style={styles.footerText}
        render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
      />
    </View>
  );
}
