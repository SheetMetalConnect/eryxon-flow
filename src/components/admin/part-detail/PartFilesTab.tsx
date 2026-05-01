import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Box, FileText, Upload, Eye, Trash2, Image as ImageIcon } from "lucide-react";
import { UploadProgress } from "@/components/UploadProgress";
import { ImageUpload } from "@/components/parts/ImageUpload";
import { ImageGallery } from "@/components/parts/ImageGallery";
import { useTranslation } from "react-i18next";
import type { UploadProgress as UploadProgressType } from "@/hooks/useFileUpload";

interface PartFilesTabProps {
  partId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  part: any;
  cadFiles: FileList | null;
  setCadFiles: (files: FileList | null) => void;
  handleCADUpload: () => void;
  handleViewCADFile: (filePath: string) => void;
  handleDeleteCADFile: (filePath: string) => void;
  isUploading: boolean;
  uploadProgress: UploadProgressType[];
  onInvalidateAndUpdate: () => Promise<void>;
}

export function PartFilesTab({
  partId,
  part,
  cadFiles,
  setCadFiles,
  handleCADUpload,
  handleViewCADFile,
  handleDeleteCADFile,
  isUploading,
  uploadProgress,
  onInvalidateAndUpdate,
}: PartFilesTabProps) {
  const { t } = useTranslation();

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {/* CAD Files */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <Label className="text-lg flex items-center gap-2">
            <Box className="h-5 w-5" />
            {t("parts.files")} ({part?.file_paths?.length || 0})
          </Label>
        </div>

        <div className="border rounded-lg p-4 mb-3 bg-muted">
          <div className="flex items-center gap-3">
            <label
              htmlFor="cad-upload"
              className="flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed rounded-lg cursor-pointer hover:bg-card transition flex-1"
            >
              <Upload className="h-4 w-4" />
              <span className="text-sm">
                {cadFiles && cadFiles.length > 0
                  ? t("parts.filesSelected", { count: cadFiles.length })
                  : t("parts.chooseStepOrPdf")}
              </span>
            </label>
            <input
              id="cad-upload"
              type="file"
              accept=".step,.stp,.pdf"
              multiple
              onChange={(e) => setCadFiles(e.target.files)}
              className="hidden"
            />
            <Button
              onClick={handleCADUpload}
              disabled={!cadFiles || cadFiles.length === 0 || isUploading}
              size="sm"
            >
              <Upload className="h-4 w-4 mr-2" />
              {isUploading ? t("parts.uploading") : t("parts.upload")}
            </Button>
          </div>
        </div>

        {uploadProgress.length > 0 && (
          <UploadProgress progress={uploadProgress} className="mb-4" />
        )}

        <div className="space-y-2">
          {part?.file_paths?.map((filePath: string, index: number) => {
            const fileName = filePath.split("/").pop() || "Unknown";
            const fileExt = filePath.split(".").pop()?.toLowerCase();
            const isSTEP = fileExt === "step" || fileExt === "stp";
            const isPDF = fileExt === "pdf";

            if (!isSTEP && !isPDF) return null;

            return (
              <div
                key={index}
                className="flex items-center justify-between border rounded-md p-3 bg-card"
              >
                <div className="flex items-center gap-3">
                  {isSTEP ? (
                    <Box className="h-5 w-5 text-brand-primary" />
                  ) : (
                    <FileText className="h-5 w-5 text-destructive" />
                  )}
                  <div>
                    <p className="font-medium text-sm">{fileName}</p>
                    <p className="text-xs text-muted-foreground">
                      {isSTEP ? t("parts.3dModel") : t("parts.drawing")}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleViewCADFile(filePath)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    {t("parts.view")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteCADFile(filePath)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            );
          })}
          {(!part?.file_paths || part.file_paths.length === 0) && (
            <p className="text-sm text-muted-foreground text-center py-4">
              {t("parts.noFilesYet")}
            </p>
          )}
        </div>
      </div>

      {/* Images */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <Label className="text-lg flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            {t("parts.images.title")} ({part?.image_paths?.length || 0})
          </Label>
        </div>

        {part?.image_paths && part.image_paths.length > 0 && (
          <div className="mb-4">
            <ImageGallery
              partId={partId}
              imagePaths={part.image_paths}
              onImageDeleted={onInvalidateAndUpdate}
              editable={true}
            />
          </div>
        )}

        <ImageUpload
          partId={partId}
          onUploadComplete={onInvalidateAndUpdate}
        />
      </div>
    </div>
  );
}
