import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { BacktestCompletePayload } from "@shared/developer-backtest";

interface ReportDownloadButtonProps {
  result: BacktestCompletePayload;
}

/** Parse the download filename from a Content-Disposition header. */
function filenameFromDisposition(header: string | null, fallback: string): string {
  if (!header) return fallback;
  const match = /filename="?([^"]+)"?/.exec(header);
  return match?.[1] ?? fallback;
}

/**
 * Generates the branded Production Verification Report (PDF) server-side and
 * triggers a browser download. Posts the full backtest payload so generation
 * does not depend on the server-side result cache.
 */
export function ReportDownloadButton({ result }: ReportDownloadButtonProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    setLoading(true);
    try {
      const res = await fetch("/api/developer/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ payload: result }),
      });

      if (!res.ok) {
        let message = "Could not generate the report. Please try again.";
        try {
          const body = await res.json();
          if (body?.message) message = body.message;
        } catch {
          /* non-JSON error response */
        }
        throw new Error(message);
      }

      const blob = await res.blob();
      const filename = filenameFromDisposition(
        res.headers.get("Content-Disposition"),
        "EcoXchange_Production_Verification_Report.pdf",
      );

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        title: "Report download failed",
        description:
          error instanceof Error ? error.message : "Could not generate the report.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="outline"
      className="gap-2"
      data-testid="button-download-report"
      disabled={loading}
      onClick={handleDownload}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Download className="h-4 w-4" />
      )}
      {loading ? "Generating…" : "Download Report PDF"}
    </Button>
  );
}
