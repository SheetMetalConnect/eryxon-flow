import { useState, useCallback, useEffect } from "react";
import { X, Download, Trash2, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface ImageInfo {
  path: string;
  url: string | null;
  size?: number;
  created_at?: string | null;
  name?: string;
}

interface ImageGalleryProps {
  partId: string;
  imagePaths: string[];
  onImageDeleted?: (deletedPath: string) => void;
  editable?: boolean;
  className?: string;
}

export function ImageGallery({
  partId,
  imagePaths,
  onImageDeleted,
  editable = true,
  className,
}: ImageGalleryProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { profile } = useAuth();
  const [images, setImages] = useState<ImageInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [imageToDelete, setImageToDelete] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);

  // Load images with signed URLs
  const loadImages = useCallback(async () => {
    if (!imagePaths || imagePaths.length === 0) {
      setImages([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const imageInfos = await Promise.all(
        imagePaths.map(async (path) => {
          // Generate signed URL
          const { data: signedData } = await supabase.storage
            .from("parts-images")
            .createSignedUrl(path, 3600); // 1 hour expiry

          // Extract filename from path
          const name = path.split("/").pop() || "";

          return {
            path,
            url: signedData?.signedUrl || null,
            name,
          };
        })
      );

      setImages(imageInfos);
    } catch (error) {
      console.error("Error loading images:", error);
      toast({
        title: t("parts.images.loadFailed"),
        description: t("parts.images.loadFailedDescription"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [imagePaths, t, toast]);

  useEffect(() => {
    loadImages();
  }, [loadImages]);

  // Handle image deletion
  const handleDeleteImage = useCallback(async (path: string) => {
    try {
      // Delete from storage
      const { error: deleteError } = await supabase.storage
        .from("parts-images")
        .remove([path]);

      if (deleteError) throw deleteError;

      // Update part's image_paths
      const updatedPaths = imagePaths.filter((p) => p !== path);
      const { error: updateError } = await supabase
        .from("parts")
        .update({ image_paths: updatedPaths })
        .eq("id", partId);

      if (updateError) throw updateError;

      toast({
        title: t("parts.images.deleteSuccess"),
        description: t("parts.images.imageDeleted"),
      });

      // Update local state
      setImages((prev) => prev.filter((img) => img.path !== path));
      onImageDeleted?.(path);
    } catch (error: any) {
      console.error("Error deleting image:", error);
      toast({
        title: t("parts.images.deleteFailed"),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setImageToDelete(null);
    }
  }, [partId, imagePaths, t, toast, onImageDeleted]);

  // Handle download
  const handleDownload = useCallback(async (image: ImageInfo) => {
    if (!image.url) return;

    try {
      const response = await fetch(image.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = image.name || "image";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: t("parts.images.downloadSuccess"),
        description: t("parts.images.imageDownloaded"),
      });
    } catch (error) {
      console.error("Error downloading image:", error);
      toast({
        title: t("parts.images.downloadFailed"),
        description: t("parts.images.downloadFailedDescription"),
        variant: "destructive",
      });
    }
  }, [t, toast]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedImageIndex === null) return;

      if (e.key === "ArrowLeft") {
        setSelectedImageIndex((prev) =>
          prev === null || prev === 0 ? images.length - 1 : prev - 1
        );
      } else if (e.key === "ArrowRight") {
        setSelectedImageIndex((prev) =>
          prev === null ? 0 : (prev + 1) % images.length
        );
      } else if (e.key === "Escape") {
        setSelectedImageIndex(null);
        setZoom(1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedImageIndex, images.length]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <Card className="border-dashed">
        <div className="p-12 text-center space-y-4">
          <div className="flex justify-center">
            <div className="rounded-full bg-muted p-4">
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold">{t("parts.images.noImages")}</h3>
            <p className="text-sm text-muted-foreground">
              {t("parts.images.noImagesDescription")}
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <>
      <div className={cn("grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4", className)}>
        {images.map((image, index) => (
          <Card key={image.path} className="group relative overflow-hidden cursor-pointer">
            <div
              className="aspect-square relative"
              onClick={() => setSelectedImageIndex(index)}
            >
              {image.url ? (
                <img
                  src={image.url}
                  alt={image.name}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <ImageIcon className="h-12 w-12 text-muted-foreground" />
                </div>
              )}

              {/* Overlay on hover */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button
                  size="icon"
                  variant="secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedImageIndex(index);
                  }}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                {editable && (
                  <Button
                    size="icon"
                    variant="destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      setImageToDelete(image.path);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Lightbox Dialog - Full screen on mobile */}
      <Dialog
        open={selectedImageIndex !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedImageIndex(null);
            setZoom(1);
          }
        }}
      >
        <DialogContent className="w-full h-[100dvh] sm:h-[90vh] sm:max-w-screen-lg p-0 rounded-none sm:rounded-lg inset-0 sm:inset-auto sm:left-[50%] sm:top-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%]">
          <DialogHeader className="absolute top-0 left-0 right-0 z-10 bg-background/95 backdrop-blur p-3 sm:p-4 border-b">
            <DialogTitle className="truncate text-sm sm:text-base pr-24 sm:pr-32">
              {selectedImageIndex !== null && images[selectedImageIndex]?.name}
            </DialogTitle>
            <div className="flex gap-1 sm:gap-2 absolute right-3 sm:right-4 top-3 sm:top-4">
              {/* Zoom controls - hidden on mobile for touch gestures */}
              <Button
                size="icon"
                variant="outline"
                onClick={() => setZoom((prev) => Math.max(0.5, prev - 0.25))}
                className="h-8 w-8 sm:h-10 sm:w-10 hidden sm:flex"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="outline"
                onClick={() => setZoom((prev) => Math.min(3, prev + 0.25))}
                className="h-8 w-8 sm:h-10 sm:w-10 hidden sm:flex"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              {/* Download */}
              <Button
                size="icon"
                variant="outline"
                onClick={() =>
                  selectedImageIndex !== null &&
                  handleDownload(images[selectedImageIndex])
                }
                className="h-8 w-8 sm:h-10 sm:w-10"
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          {/* Image viewer */}
          <div className="relative flex-1 overflow-auto flex items-center justify-center bg-black/10 mt-14 sm:mt-16">
            {selectedImageIndex !== null && images[selectedImageIndex]?.url && (
              <img
                src={images[selectedImageIndex].url}
                alt={images[selectedImageIndex].name}
                className="max-w-full max-h-full object-contain transition-transform touch-pinch-zoom"
                style={{ transform: `scale(${zoom})` }}
              />
            )}

            {/* Navigation buttons - larger on mobile for touch */}
            {images.length > 1 && (
              <>
                <Button
                  size="icon"
                  variant="outline"
                  className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 h-10 w-10 sm:h-10 sm:w-10"
                  onClick={() =>
                    setSelectedImageIndex((prev) =>
                      prev === null || prev === 0 ? images.length - 1 : prev - 1
                    )
                  }
                >
                  <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 h-10 w-10 sm:h-10 sm:w-10"
                  onClick={() =>
                    setSelectedImageIndex((prev) =>
                      prev === null ? 0 : (prev + 1) % images.length
                    )
                  }
                >
                  <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
                </Button>
              </>
            )}
          </div>

          {/* Image counter */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-background/95 backdrop-blur px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm">
            {selectedImageIndex !== null && `${selectedImageIndex + 1} / ${images.length}`}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("parts.images.deleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("parts.images.deleteConfirmDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => imageToDelete && handleDeleteImage(imageToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
