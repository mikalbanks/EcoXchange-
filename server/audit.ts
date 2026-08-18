export function audit(event: string, fields: Record<string, unknown> = {}): void {
  console.info(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: "audit",
    event,
    ...fields,
  }));
}
