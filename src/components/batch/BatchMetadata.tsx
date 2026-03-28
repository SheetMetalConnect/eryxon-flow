import { useTranslation } from "react-i18next";
import { FileCode } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface BatchMetadataProps {
  metadata: Record<string, unknown> | null | undefined;
}

export function BatchMetadata({ metadata }: BatchMetadataProps) {
  const { t } = useTranslation();

  if (!metadata || Object.keys(metadata).length === 0) {
    return null;
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileCode className="h-4 w-4" />
          {t("Additional Metadata")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="bg-muted/30 p-3 rounded-md border font-mono text-sm overflow-x-auto">
          <pre>{JSON.stringify(metadata, null, 2)}</pre>
        </div>
      </CardContent>
    </Card>
  );
}
