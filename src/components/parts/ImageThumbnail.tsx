import { useState, useEffect } from "react";
import { Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface ImageThumbnailProps {
  imagePath: string;
  alt?: string;
  className?: string;
  onClick?: () => void;
}

export function ImageThumbnail({
  imagePath,
  alt = "Part image",
  className,
  onClick,
}: ImageThumbnailProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadImage = async () => {
      try {
        const { data } = await supabase.storage
          .from("parts-images")
          .createSignedUrl(imagePath, 3600);

        if (mounted && data?.signedUrl) {
          setImageUrl(data.signedUrl);
          setError(false);
        }
      } catch (err) {
        console.error("Error loading thumbnail:", err);
        if (mounted) {
          setError(true);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadImage();

    return () => {
      mounted = false;
    };
  }, [imagePath]);

  if (loading) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-muted animate-pulse",
          className
        )}
      >
        <ImageIcon className="h-6 w-6 text-muted-foreground" />
      </div>
    );
  }

  if (error || !imageUrl) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-muted",
          className
        )}
      >
        <ImageIcon className="h-6 w-6 text-muted-foreground" />
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={alt}
      className={cn(
        "object-cover cursor-pointer hover:opacity-80 transition-opacity",
        className
      )}
      onClick={onClick}
      loading="lazy"
    />
  );
}
