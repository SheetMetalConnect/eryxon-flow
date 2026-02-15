import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface ImageInfo {
  path: string;
  url: string | null;
  size?: number;
  name?: string;
}

export function usePartImages(partId: string) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  // Get part's image paths
  const getImagePaths = useCallback(async (): Promise<string[]> => {
    try {
      const { data, error } = await supabase
        .from("parts")
        .select("image_paths")
        .eq("id", partId)
        .single();

      if (error) throw error;

      return data?.image_paths || [];
    } catch (error: any) {
      console.error("Error fetching image paths:", error);
      toast.error(t("parts.images.loadFailed"), { description: error.message });
      return [];
    }
  }, [partId, t]);

  // Load images with signed URLs
  const loadImages = useCallback(async (imagePaths: string[]): Promise<ImageInfo[]> => {
    if (!imagePaths || imagePaths.length === 0) {
      return [];
    }

    setLoading(true);

    try {
      const imageInfos = await Promise.all(
        imagePaths.map(async (path) => {
          const { data: signedData } = await supabase.storage
            .from("parts-images")
            .createSignedUrl(path, 3600);

          const name = path.split("/").pop() || "";

          return {
            path,
            url: signedData?.signedUrl || null,
            name,
          };
        })
      );

      return imageInfos;
    } catch (error: any) {
      console.error("Error loading images:", error);
      toast.error(t("parts.images.loadFailed"), { description: error.message });
      return [];
    } finally {
      setLoading(false);
    }
  }, [t]);

  // Add images to part
  const addImages = useCallback(async (newPaths: string[]): Promise<boolean> => {
    try {
      const currentPaths = await getImagePaths();
      const updatedPaths = [...currentPaths, ...newPaths];

      const { error } = await supabase
        .from("parts")
        .update({ image_paths: updatedPaths })
        .eq("id", partId);

      if (error) throw error;

      return true;
    } catch (error: any) {
      console.error("Error adding images:", error);
      toast.error(t("parts.images.addFailed"), { description: error.message });
      return false;
    }
  }, [partId, getImagePaths, t]);

  // Remove image from part
  const removeImage = useCallback(async (pathToRemove: string): Promise<boolean> => {
    try {
      const currentPaths = await getImagePaths();
      const updatedPaths = currentPaths.filter((p) => p !== pathToRemove);

      // Delete from storage
      const { error: deleteError } = await supabase.storage
        .from("parts-images")
        .remove([pathToRemove]);

      if (deleteError) throw deleteError;

      // Update part
      const { error: updateError } = await supabase
        .from("parts")
        .update({ image_paths: updatedPaths })
        .eq("id", partId);

      if (updateError) throw updateError;

      toast.success(t("parts.images.deleteSuccess"), { description: t("parts.images.imageDeleted") });

      return true;
    } catch (error: any) {
      console.error("Error removing image:", error);
      toast.error(t("parts.images.deleteFailed"), { description: error.message });
      return false;
    }
  }, [partId, getImagePaths, t]);

  // Get first image URL for thumbnail
  const getFirstImageUrl = useCallback(async (): Promise<string | null> => {
    try {
      const paths = await getImagePaths();
      if (paths.length === 0) return null;

      const { data } = await supabase.storage
        .from("parts-images")
        .createSignedUrl(paths[0], 3600);

      return data?.signedUrl || null;
    } catch (error) {
      console.error("Error getting first image:", error);
      return null;
    }
  }, [getImagePaths]);

  return {
    loading,
    getImagePaths,
    loadImages,
    addImages,
    removeImage,
    getFirstImageUrl,
  };
}
