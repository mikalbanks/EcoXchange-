import React from "react";
import { Page, View, Text } from "@react-pdf/renderer";
import { styles, colors, SERIF, MONO, SANS_BOLD } from "../styles/reportStyles";
import type { ReportModel } from "../reportDataModel";

export function CoverPage({ model }: { model: ReportModel }) {
  return (
    <Page size="LETTER" style={styles.coverPage}>
      {/* Wordmark */}
      <Text style={{ fontFamily: SERIF, fontSize: 30, color: colors.darkGreen }}>
        Eco<Text style={{ color: colors.medGreen }}>Xchange</Text>
      </Text>

      <View style={{ height: 1.5, backgroundColor: colors.darkGreen, width: 200, marginTop: 90, marginBottom: 28 }} />

      <Text style={{ fontFamily: SERIF, fontSize: 26, color: colors.ink, letterSpacing: 0.5 }}>
        Production Verification Report
      </Text>

      <View style={{ marginTop: 34 }}>
        <Text style={{ fontFamily: SANS_BOLD, fontSize: 16, color: colors.darkGreen }}>
          {model.projectName}
        </Text>
        <Text style={{ fontFamily: MONO, fontSize: 11, color: colors.ink, marginTop: 6 }}>
          {model.locationLabel}
        </Text>
        <Text style={{ fontFamily: MONO, fontSize: 11, color: colors.ink, marginTop: 2 }}>
          {model.capacityKwDc.toLocaleString("en-US")} kW DC
        </Text>
      </View>

      <View style={{ marginTop: 28 }}>
        <Text style={{ fontSize: 10.5, color: colors.muted }}>
          Verification Period:{" "}
          <Text style={{ color: colors.ink, fontFamily: MONO, fontSize: 10 }}>
            {model.verificationPeriod}
          </Text>
        </Text>
        <Text style={{ fontSize: 10.5, color: colors.muted, marginTop: 3 }}>
          Report Generated:{" "}
          <Text style={{ color: colors.ink, fontFamily: MONO, fontSize: 10 }}>
            {model.generatedDate}
          </Text>
        </Text>
      </View>

      {/* Confidentiality block pinned near the bottom */}
      <View style={{ position: "absolute", bottom: 72, left: 54, right: 54 }}>
        <View style={{ height: 1, backgroundColor: colors.border, marginBottom: 10 }} />
        <Text style={{ fontFamily: MONO, fontSize: 9, color: colors.darkGreen, marginBottom: 4 }}>
          CONFIDENTIAL — Prepared by EcoXchange, Inc.
        </Text>
        <Text style={styles.disclaimer}>
          This report contains methodology-documented estimates. It does not constitute a bankable
          resource assessment.
        </Text>
        <View style={{ height: 1, backgroundColor: colors.border, marginTop: 10 }} />
      </View>
    </Page>
  );
}
