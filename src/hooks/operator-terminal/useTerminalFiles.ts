import { useEffect, useState } from "react";
import type { TFunction } from "i18next";
import {
  isCADServiceEnabled,
  useCADProcessing,
  type GeometryData,
  type PMIData,
} from "@/hooks/useCADProcessing";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import type { TerminalJob } from "@/types/terminal";
import { toast } from "sonner";

interface TerminalFilesOptions {
  processCAD: ReturnType<typeof useCADProcessing>["processCAD"];
  selectedJob: TerminalJob | null;
  t: TFunction;
}

export function useTerminalFiles({ processCAD, selectedJob, t }: TerminalFilesOptions) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [stepUrl, setStepUrl] = useState<string | null>(null);
  const [pmiData, setPmiData] = useState<PMIData | null>(null);
  const [geometryData, setGeometryData] = useState<GeometryData | null>(null);

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;
    const clearModel = () => {
      setPmiData(null);
      setGeometryData(null);
    };

    const loadFiles = async () => {
      if (!selectedJob?.filePaths.length) {
        setPdfUrl(null);
        setStepUrl(null);
        clearModel();
        return;
      }

      try {
        const pdfPath = selectedJob.filePaths.find((path) => path.toLowerCase().endsWith(".pdf"));
        const stepPath = selectedJob.filePaths.find((path) => /\.(step|stp)$/i.test(path));
        const [pdfResult, stepResult] = await Promise.all([
          pdfPath ? supabase.storage.from("parts-cad").createSignedUrl(pdfPath, 3600) : null,
          stepPath ? supabase.storage.from("parts-cad").createSignedUrl(stepPath, 3600) : null,
        ]);
        if (!active) return;
        setPdfUrl(pdfResult?.data?.signedUrl ?? null);

        if (stepPath && stepResult?.data?.signedUrl) {
          const response = await fetch(stepResult.data.signedUrl);
          objectUrl = URL.createObjectURL(await response.blob());
          if (!active) return;
          setStepUrl(objectUrl);

          if (isCADServiceEnabled()) {
            try {
              const result = await processCAD(
                { bucket: "parts-cad", path: stepPath, recordId: selectedJob.partId },
                stepPath.split("/").pop() || "model.step",
                { includeGeometry: true, includePMI: true, generateThumbnail: false },
              );
              if (!active) return;
              setPmiData(result.success ? result.pmi ?? null : null);
              setGeometryData(result.success ? result.geometry ?? null : null);
            } catch (error) {
              logger.error("OperatorView", "Error during CAD processing", error);
              toast.error(t("production.cadProcessingFailed"));
              if (active) clearModel();
            }
          } else clearModel();
        } else {
          setStepUrl(null);
          clearModel();
        }
      } catch (error) {
        logger.error("OperatorView", "Error loading file URLs", error);
      }
    };

    void loadFiles();
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [processCAD, selectedJob, t]);

  return { geometryData, pdfUrl, pmiData, stepUrl };
}
