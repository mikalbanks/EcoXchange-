import React from "react";
import { View, Text } from "@react-pdf/renderer";
import { styles, colors } from "../styles/reportStyles";

export interface TableColumn<Row> {
  header: string;
  /** Flex grow for this column (default 1). */
  flex?: number;
  align?: "left" | "right" | "center";
  mono?: boolean;
  cell: (row: Row) => string;
}

interface DataTableProps<Row> {
  columns: TableColumn<Row>[];
  rows: Row[];
  /** Optional bold total row rendered with pale-green fill. */
  totalRow?: string[];
}

function alignStyle(align?: "left" | "right" | "center") {
  return { textAlign: align ?? "left" } as const;
}

export function DataTable<Row>({ columns, rows, totalRow }: DataTableProps<Row>) {
  return (
    <View style={styles.table}>
      {/* Header */}
      <View style={styles.tableHeaderRow}>
        {columns.map((col, i) => (
          <Text
            key={i}
            style={[styles.tableHeaderCell, { flex: col.flex ?? 1 }, alignStyle(col.align)]}
          >
            {col.header}
          </Text>
        ))}
      </View>

      {/* Body */}
      {rows.map((row, r) => (
        <View key={r} style={r % 2 === 1 ? styles.tableRowAlt : styles.tableRow}>
          {columns.map((col, c) => (
            <Text
              key={c}
              style={[
                col.mono ? styles.tableCellMono : styles.tableCell,
                { flex: col.flex ?? 1 },
                alignStyle(col.align),
              ]}
            >
              {col.cell(row)}
            </Text>
          ))}
        </View>
      ))}

      {/* Total */}
      {totalRow && (
        <View style={styles.tableTotalRow}>
          {totalRow.map((value, i) => (
            <Text
              key={i}
              style={[
                columns[i]?.mono ? styles.tableCellMono : styles.tableCell,
                styles.tableCellBold,
                { flex: columns[i]?.flex ?? 1, color: colors.darkGreen },
                alignStyle(columns[i]?.align),
              ]}
            >
              {value}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}
