import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Upload, ExternalLink, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useUpdateBatch } from "@/hooks/useBatches";
import { getStorageUrlOrNull, STORAGE_BUCKETS } from '@/lib/storage-url';
import { toast } from "sonner";

interface BatchVisualsProps {
  batch: {
    id: string;
    nesting_image_url?: string | null;
    nesting_image_path?: string | null;
  };
  tenantId: string;
}

export function BatchVisuals({ batch, tenantId }: BatchVisualsProps) {
  const { t } = useTranslation();
  const updateBatch = useUpdateBatch();
  const [uploadingImage, setUploadingImage] = useState(false);
  const [nestingUrl, setNestingUrl] = useState<string | null>(null);
  const [loadingUrl, setLoadingUrl] = useState(false);

  // Load signed URL from stored path
  useState(() => {
    if (batch.nesting_image_path) {
      setLoadingUrl(true);
      getStorageUrlOrNull(STORAGE_BUCKETS.BATCH_IMAGES, batch.nesting_image_path, 3600)
        .then(setNestingUrl)
        .finally(() => setLoadingUrl(false));
    }
  });

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'nesting' | 'layout') => {
    try {
      setUploadingImage(true);
      if (!event.target.files || event.target.files.length === 0) {
        return;
      }
      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${batch.id}/${type}-${Math.random()}.${fileExt}`;
      const filePath = `${tenantId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('batch-images')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      // Store path instead of long-lived signed URL
      await updateBatch.mutateAsync({
        id: batch.id,
        updates: {
          [type === 'nesting' ? 'nesting_image_path' : 'layout_image_path']: filePath,
        }
      });

      // Refresh the displayed URL
      const url = await getStorageUrlOrNull(STORAGE_BUCKETS.BATCH_IMAGES, filePath, 3600);
      if (url) setNestingUrl(url);

      toast.success(t("batches.imageUploadSuccess"));
    } catch (error: unknown) {
      toast.error(t("batches.imageUploadError"), { description: error instanceof Error ? error.message : String(error) });
    } finally {
      setUploadingImage(false);
    }
  };

  return (
    <Card className="glass-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5" />
          {t("batches.visuals")}
        </CardTitle>
        <div className="flex gap-1">
          <Label htmlFor="image-upload" className="cursor-pointer">
            <Button variant="ghost" size="sm" asChild disabled={uploadingImage}>
              <span>
                <Upload className="h-4 w-4 mr-1" />
                {uploadingImage ? "..." : t("Add")}
              </span>
            </Button>
          </Label>
          <Input
            id="image-upload"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleImageUpload(e, 'nesting')}
          />
        </div>
      </CardHeader>
      <CardContent>
        {loadingUrl ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin h-6 w-6 border-2 border-muted-foreground border-t-transparent rounded-full" />
          </div>
        ) : (nestingUrl || batch.nesting_image_url) ? (
          <div className="relative group">
            <img
              src={nestingUrl || batch.nesting_image_url || ''}
              alt="Nesting Layout"
              className="rounded-md w-full h-auto max-h-[300px] object-contain border"
            />
            <a href={nestingUrl || batch.nesting_image_url || '#'} target="_blank" rel="noopener noreferrer" className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button size="icon" variant="secondary">
                <ExternalLink className="h-4 w-4" />
              </Button>
            </a>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-8 border rounded-md border-dashed text-muted-foreground gap-2">
            <ImageIcon className="h-8 w-8 opacity-50" />
            <p className="text-sm">{t("No nesting image available")}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
