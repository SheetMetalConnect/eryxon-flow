import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface MetadataDisplayProps {
  metadata: Record<string, any> | null | undefined;
  title?: string;
}

export default function MetadataDisplay({ metadata, title = "Custom Fields" }: MetadataDisplayProps) {
  if (!metadata || Object.keys(metadata).length === 0) {
    return null;
  }

  return (
    <div>
      <div className="text-sm text-muted-foreground mb-2">{title}</div>
      <div className="rounded-lg border p-3 bg-muted/30">
        <dl className="grid gap-2">
          {Object.entries(metadata).map(([key, value]) => (
            <div key={key} className="grid grid-cols-3 gap-2">
              <dt className="text-sm font-medium text-muted-foreground">{key}:</dt>
              <dd className="text-sm col-span-2">
                {typeof value === "object" ? JSON.stringify(value) : String(value)}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
