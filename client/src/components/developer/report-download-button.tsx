import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

/**
 * Triggers Production Verification Report (PDF) generation. The full branded
 * report is specified separately (Spec 04); this is the entry point.
 */
export function ReportDownloadButton() {
  const { toast } = useToast();
  return (
    <Button
      variant="outline"
      className="gap-2"
      data-testid="button-download-report"
      onClick={() =>
        toast({
          title: "Report generation coming soon",
          description:
            "The branded Production Verification Report (PDF) is being finalized.",
        })
      }
    >
      <Download className="h-4 w-4" />
      Download Report PDF
    </Button>
  );
}
