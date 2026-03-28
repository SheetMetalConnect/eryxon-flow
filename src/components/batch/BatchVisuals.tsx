import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Upload, ExternalLink, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useUpdateBatch } from "@/hooks/useBatches";
import { toast } from "sonner";

interface BatchVisualsProps {
  batch: {
    id: string;
    nesting_image_url?: string | null;
  };
}

export function BatchVisuals({ batch }: BatchVisualsProps) {
  const { t } = useTranslation();
  const updateBatch = useUpdateBatch();
  const [uploadingImage, setUploadingImage] = useState(false);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'nesting' | 'layout') => {
    try {
      setUploadingImage(true);
      if (!event.target.files || event.target.files.length === 0) {
        return;
      }
      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${batch.id}/${type}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('batch-images')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('batch-images')
        .createSignedUrl(filePath, 31536000);

      if (signedUrlError || !signedUrlData) {
        throw signedUrlError || new Error('Failed to generate signed URL');
      }

      await updateBatch.mutateAsync({
        id: batch.id,
        updates: {
          [type === 'nesting' ? 'nesting_image_url' : 'layout_image_url']: signedUrlData.signedUrl
        }
      });

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
        {batch.nesting_image_url ? (
          <div className="relative group">
            <img
              src={batch.nesting_image_url}
              alt="Nesting Layout"
              className="rounded-md w-full h-auto max-h-[300px] object-contain border"
            />
            <a href={batch.nesting_image_url} target="_blank" rel="noopener noreferrer" className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
