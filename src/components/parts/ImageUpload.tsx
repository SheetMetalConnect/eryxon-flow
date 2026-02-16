import { useState, useRef, useCallback } from "react";
import { Upload, X, Image as ImageIcon, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useFileUpload } from "@/hooks/useFileUpload";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  partId: string;
  onUploadComplete?: (imagePaths: string[]) => void;
  className?: string;
}

export function ImageUpload({ partId, onUploadComplete, className }: ImageUploadProps) {
  const { t } = useTranslation();
  const [isDragging, setIsDragging] = useState(false);
  const [previewImages, setPreviewImages] = useState<Array<{ file: File; preview: string }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    uploadFiles,
    progress,
    isUploading,
  } = useFileUpload();

  // Handle file selection
  const handleFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    const imageFiles = fileArray.filter((file) =>
      file.type.startsWith("image/")
    );

    if (imageFiles.length === 0) {
      toast.error(t("parts.images.invalidFormat"), {
        description: t("parts.images.onlyImagesAllowed"),
      });
      return;
    }

    // Create preview URLs
    const previews = imageFiles.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));

    setPreviewImages(previews);
  }, [t]);

  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  // Handle file input change
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  }, [handleFiles]);

  // Remove preview image
  const removePreviewImage = useCallback((index: number) => {
    setPreviewImages((prev) => {
      const newPreviews = [...prev];
      URL.revokeObjectURL(newPreviews[index].preview);
      newPreviews.splice(index, 1);
      return newPreviews;
    });
  }, []);

  // Upload images
  const handleUpload = useCallback(async () => {
    if (previewImages.length === 0) return;

    const files = previewImages.map((p) => p.file);

    try {
      const result = await uploadFiles(
        files,
        "parts-images",
        (file, index) => {
          const timestamp = Date.now();
          const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
          const filename = `${timestamp}_${index}_${file.name}`;
          return `parts/${partId}/${filename}`;
        },
        {
          allowedExtensions: ["jpg", "jpeg", "png", "webp", "gif"],
          maxFileSizeMB: 10,
          validateQuota: true,
        }
      );

      if (result.success) {
        toast.success(t("parts.images.uploadSuccess"), {
          description: t("parts.images.uploadedCount", { count: result.uploadedPaths.length }),
        });

        // Clear previews
        previewImages.forEach((p) => URL.revokeObjectURL(p.preview));
        setPreviewImages([]);

        // Notify parent
        onUploadComplete?.(result.uploadedPaths);
      }

      // Show errors for failed files
      if (result.failedFiles.length > 0) {
        result.failedFiles.forEach((failed) => {
          toast.error(t("parts.images.uploadFailed"), {
            description: `${failed.fileName}: ${failed.error}`,
          });
        });
      }
    } catch (error: any) {
      toast.error(t("parts.images.uploadFailed"), {
        description: error.message,
      });
    }
  }, [previewImages, uploadFiles, partId, t, onUploadComplete]);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Drag and Drop Zone */}
      <Card
        className={cn(
          "border-2 border-dashed transition-colors cursor-pointer",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50",
          isUploading && "pointer-events-none opacity-50"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="p-8 text-center space-y-4">
          <div className="flex justify-center">
            <div className="rounded-full bg-primary/10 p-4">
              <Upload className="h-8 w-8 text-primary" />
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold text-lg">
              {t("parts.images.dragAndDrop")}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t("parts.images.orClickToSelect")}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("parts.images.supportedFormats")}: JPG, PNG, WEBP, GIF (max 10MB)
            </p>
          </div>
        </div>
      </Card>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* Preview images */}
      {previewImages.length > 0 && (
        <div className="space-y-4">
          <h4 className="font-semibold flex items-center gap-2">
            <ImageIcon className="h-4 w-4" />
            {t("parts.images.selectedImages")} ({previewImages.length})
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {previewImages.map((item, index) => (
              <div key={index} className="relative group">
                <img
                  src={item.preview}
                  alt={item.file.name}
                  className="w-full h-32 object-cover rounded-lg border"
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removePreviewImage(index);
                  }}
                  className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-4 w-4" />
                </button>
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-2 rounded-b-lg truncate">
                  {item.file.name}
                </div>
              </div>
            ))}
          </div>

          {/* Upload button */}
          <Button
            onClick={handleUpload}
            disabled={isUploading}
            className="w-full"
            size="lg"
          >
            {isUploading ? (
              <>
                <Upload className="h-4 w-4 mr-2 animate-spin" />
                {t("parts.images.uploading")}...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                {t("parts.images.uploadImages")} ({previewImages.length})
              </>
            )}
          </Button>
        </div>
      )}

      {/* Upload progress */}
      {isUploading && progress.length > 0 && (
        <div className="space-y-2">
          {progress.map((p) => (
            <div key={p.fileIndex} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="truncate flex-1 mr-2">{p.fileName}</span>
                <span className="text-muted-foreground">
                  {p.uploadedMB.toFixed(2)} / {p.totalMB.toFixed(2)} MB
                </span>
              </div>
              <Progress value={p.percentage} className="h-2" />
              {p.status === "error" && p.error && (
                <Alert variant="destructive" className="mt-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{p.error}</AlertDescription>
                </Alert>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
