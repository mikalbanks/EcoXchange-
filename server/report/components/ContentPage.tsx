import React from "react";
import { Page } from "@react-pdf/renderer";
import { styles } from "../styles/reportStyles";
import { PageHeader } from "./PageHeader";
import { PageFooter } from "./PageFooter";

/** Standard content page: fixed banner header + footer, children in the body. */
export function ContentPage({ children }: { children: React.ReactNode }) {
  return (
    <Page size="LETTER" style={styles.page}>
      <PageHeader />
      {children}
      <PageFooter />
    </Page>
  );
}
