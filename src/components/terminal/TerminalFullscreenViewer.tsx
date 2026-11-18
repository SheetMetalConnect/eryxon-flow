import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PDFViewer } from "@/components/PDFViewerLazy";
import { STEPViewer } from "@/components/STEPViewerLazy";
import type { GeometryData, PMIData } from "@/hooks/useCADProcessing";

interface TerminalFullscreenViewerProps {
  geometry: GeometryData | null | undefined;
  jobCode: string;
  mode: "3d" | "pdf" | null;
  onClose: () => void;
  pdfUrl: string | null | undefined;
  pmiData: PMIData | null | undefined;
  stepUrl: string | null | undefined;
}

export function TerminalFullscreenViewer({
  geometry,
  jobCode,
  mode,
  onClose,
  pdfUrl,
  pmiData,
  stepUrl,
}: TerminalFullscreenViewerProps) {
  if (!mode) return null;
  return createPortal(
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md" onClick={onClose}>
      <div className="relative flex h-full flex-col overflow-hidden" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-2 text-white">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-white/60">{jobCode}</div>
            <div className="text-sm font-semibold">{mode === "3d" ? "3D" : "PDF"}</div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 rounded-full p-0 text-white hover:bg-white/10">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-hidden bg-background">
          {mode === "3d" && stepUrl ? (
            <STEPViewer url={stepUrl} title={jobCode} pmiData={pmiData} serverGeometry={geometry} preferServerGeometry />
          ) : null}
          {mode === "pdf" && pdfUrl ? <PDFViewer url={pdfUrl} title={jobCode} /> : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
