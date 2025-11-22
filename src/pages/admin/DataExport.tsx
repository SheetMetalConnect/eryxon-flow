import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Download, Archive, FileJson, FileSpreadsheet, Loader2 } from "lucide-react";
import Papa from "papaparse";
import JSZip from "jszip";
import { useTranslation } from "react-i18next";

const EXPORTABLE_ENTITIES = [
  { id: 'jobs', label: 'Jobs', description: 'All manufacturing jobs' },
  { id: 'parts', label: 'Parts', description: 'All parts across jobs' },
  { id: 'operations', label: 'Operations', description: 'All operations/tasks' },
  { id: 'cells', label: 'Cells', description: 'Production workflow stages' },
  { id: 'time_entries', label: 'Time Entries', description: 'Time tracking records' },
  { id: 'time_entry_pauses', label: 'Time Entry Pauses', description: 'Pause records' },
  { id: 'assignments', label: 'Assignments', description: 'Work assignments' },
  { id: 'issues', label: 'Issues', description: 'Production issues/defects' },
  { id: 'substeps', label: 'Substeps', description: 'Operation substeps' },
  { id: 'resources', label: 'Resources', description: 'Tools, fixtures, molds' },
  { id: 'operation_resources', label: 'Operation Resources', description: 'Resource assignments' },
  { id: 'materials', label: 'Materials', description: 'Material catalog' },
  { id: 'profiles', label: 'User Profiles', description: 'User profiles within tenant' },
  { id: 'api_keys', label: 'API Keys', description: 'API key configurations (hashed)' },
  { id: 'webhooks', label: 'Webhooks', description: 'Webhook configurations' },
  { id: 'webhook_logs', label: 'Webhook Logs', description: 'Webhook delivery logs' },
];

export default function DataExport() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const { toast } = useToast();
  const [selectedEntities, setSelectedEntities] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('csv');

  const toggleEntity = (entityId: string) => {
    setSelectedEntities(prev =>
      prev.includes(entityId)
        ? prev.filter(id => id !== entityId)
        : [...prev, entityId]
    );
  };

  const selectAll = () => {
    setSelectedEntities(EXPORTABLE_ENTITIES.map(e => e.id));
  };

  const deselectAll = () => {
    setSelectedEntities([]);
  };

  const exportData = async () => {
    if (selectedEntities.length === 0) {
      toast({
        title: t('dataExport.noEntitiesSelected'),
        description: t('dataExport.selectAtLeastOne'),
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // Call export API
      const entities = selectedEntities.join(',');
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://vatgianzotsurljznsry.supabase.co';
      const response = await fetch(
        `${supabaseUrl}/functions/v1/api-export?entities=${entities}&format=${exportFormat}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Export failed');
      }

      const exportData = await response.json();

      // Handle JSON export
      if (exportFormat === 'json') {
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tenant-export-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
      // Handle CSV export (multiple files in a ZIP)
      else if (exportFormat === 'csv') {
        const zip = new JSZip();

        // Add metadata as JSON
        if (exportData._metadata) {
          zip.file('_metadata.json', JSON.stringify(exportData._metadata, null, 2));
        }

        // Add tenant info as JSON
        if (exportData._tenant_info) {
          zip.file('_tenant_info.json', JSON.stringify(exportData._tenant_info, null, 2));
        }

        // Convert each entity to CSV
        for (const entity of selectedEntities) {
          const data = exportData[entity];
          if (data && Array.isArray(data) && data.length > 0) {
            const csv = Papa.unparse(data);
            zip.file(`${entity}.csv`, csv);
          } else if (data && Array.isArray(data) && data.length === 0) {
            // Empty file for empty arrays
            zip.file(`${entity}.csv`, 'No data available\n');
          }
        }

        // Generate ZIP and download
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tenant-export-${Date.now()}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }

      toast({
        title: t('dataExport.exportSuccessful'),
        description: t('dataExport.exportedEntities', { count: selectedEntities.length }),
      });

    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: t('dataExport.exportFailed'),
        description: error.message || t('dataExport.failedToExport'),
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-5xl space-y-8">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent mb-2">
            {t('dataExport.title')}
          </h1>
          <p className="text-muted-foreground text-lg">{t('dataExport.description')}</p>
        </div>

        <hr className="title-divider" />

        <div className="grid gap-6">
          {/* Export Format Selection */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>{t('dataExport.exportFormat')}</CardTitle>
              <CardDescription>{t('dataExport.chooseFormat')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Button
                  variant={exportFormat === 'csv' ? 'default' : 'outline'}
                  onClick={() => setExportFormat('csv')}
                  className="flex-1"
                >
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  {t('dataExport.formats.csv')}
                </Button>
                <Button
                  variant={exportFormat === 'json' ? 'default' : 'outline'}
                  onClick={() => setExportFormat('json')}
                  className="flex-1"
                >
                  <FileJson className="mr-2 h-4 w-4" />
                  {t('dataExport.formats.json')}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-3">
                {exportFormat === 'csv'
                  ? t('dataExport.csvDescription')
                  : t('dataExport.jsonDescription')}
              </p>
            </CardContent>
          </Card>

          {/* Entity Selection */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>{t('dataExport.selectData')}</CardTitle>
              <CardDescription>
                {t('dataExport.chooseEntities')}
              </CardDescription>
              <div className="flex gap-2 mt-2">
                <Button variant="outline" size="sm" onClick={selectAll}>
                  {t('dataExport.selectAll')}
                </Button>
                <Button variant="outline" size="sm" onClick={deselectAll}>
                  {t('dataExport.deselectAll')}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {EXPORTABLE_ENTITIES.map((entity) => (
                  <div key={entity.id} className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors">
                    <Checkbox
                      id={entity.id}
                      checked={selectedEntities.includes(entity.id)}
                      onCheckedChange={() => toggleEntity(entity.id)}
                    />
                    <div className="flex-1">
                      <Label
                        htmlFor={entity.id}
                        className="text-sm font-medium leading-none cursor-pointer"
                      >
                        {entity.label}
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        {entity.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Export Action */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>{t('dataExport.exportYourData')}</CardTitle>
              <CardDescription>
                {t('dataExport.downloadSelected')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-muted/50 p-4 rounded-lg mb-4">
                <h4 className="font-semibold mb-2">{t('dataExport.whatsIncluded')}</h4>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>{t('dataExport.includedItems.tenantFiltered')}</li>
                  <li>{t('dataExport.includedItems.metadata')}</li>
                  <li>{t('dataExport.includedItems.apiKeys')}</li>
                  <li>{t('dataExport.includedItems.fileReferences')}</li>
                </ul>
              </div>

              <Button
                onClick={exportData}
                disabled={isExporting || selectedEntities.length === 0}
                size="lg"
                className="w-full cta-button"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    {t('dataExport.exporting')}
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-5 w-5" />
                    {t('dataExport.exportButton', {
                      count: selectedEntities.length,
                      entity: selectedEntities.length === 1 ? t('dataExport.entity') : t('dataExport.entities')
                    })}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Important Notes */}
          <Card className="glass-card border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20">
            <CardHeader>
              <CardTitle className="text-amber-900 dark:text-amber-100">{t('dataExport.importantNotes')}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-amber-800 dark:text-amber-200 space-y-2">
              <p>• {t('dataExport.notes.purpose')}</p>
              <p>• {t('dataExport.notes.filesNotIncluded')}</p>
              <p>• {t('dataExport.notes.contactSupport')}</p>
              <p>• {t('dataExport.notes.notLogged')}</p>
              <p>• {t('dataExport.notes.keepSecure')}</p>
            </CardContent>
          </Card>
        </div>
      </div>
  );
}
