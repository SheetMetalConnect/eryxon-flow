import { useState, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Upload,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowRight,
  RefreshCw,
  FileUp,
  Table2,
  Eye,
  HelpCircle,
  Code,
  ExternalLink
} from "lucide-react";
import Papa from "papaparse";
import { useTranslation } from "react-i18next";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Entity configurations for import
const IMPORTABLE_ENTITIES = [
  {
    id: 'jobs',
    label: 'Jobs (Sales Orders)',
    description: 'Manufacturing jobs/orders',
    requiredFields: ['job_number'],
    optionalFields: ['customer', 'due_date', 'priority', 'notes', 'external_id', 'external_source'],
    endpoint: '/api-jobs/bulk-sync',
    arrayKey: 'jobs'
  },
  {
    id: 'parts',
    label: 'Parts (Work Orders)',
    description: 'Parts/work items within jobs',
    requiredFields: ['part_number', 'job_external_id'],
    optionalFields: ['material', 'quantity', 'notes', 'external_id', 'external_source'],
    endpoint: '/api-parts/bulk-sync',
    arrayKey: 'parts'
  },
  {
    id: 'operations',
    label: 'Operations',
    description: 'Manufacturing operations/steps',
    requiredFields: ['operation_name', 'part_external_id', 'cell_name'],
    optionalFields: ['sequence', 'estimated_time_minutes', 'notes', 'external_id', 'external_source'],
    endpoint: '/api-operations/bulk-sync',
    arrayKey: 'operations'
  },
  {
    id: 'cells',
    label: 'Cells (Work Centers)',
    description: 'Production cells/workstations',
    requiredFields: ['name'],
    optionalFields: ['color', 'sequence', 'active', 'external_id', 'external_source'],
    endpoint: '/api-cells/bulk-sync',
    arrayKey: 'cells'
  },
  {
    id: 'resources',
    label: 'Resources',
    description: 'Tools, fixtures, molds, materials',
    requiredFields: ['name', 'type'],
    optionalFields: ['description', 'identifier', 'location', 'status', 'external_id', 'external_source'],
    endpoint: '/api-resources/bulk-sync',
    arrayKey: 'resources'
  },
];

type ImportStep = 'select' | 'upload' | 'map' | 'preview' | 'import' | 'complete';

interface ParsedData {
  headers: string[];
  rows: Record<string, any>[];
  errors: Papa.ParseError[];
}

interface FieldMapping {
  csvField: string;
  entityField: string;
}

interface ImportResult {
  total: number;
  created: number;
  updated: number;
  errors: number;
  results: Array<{
    external_id?: string;
    id?: string;
    action: 'created' | 'updated' | 'error';
    error?: string;
  }>;
}

export default function DataImport() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [currentStep, setCurrentStep] = useState<ImportStep>('select');
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [fileName, setFileName] = useState<string>('');

  const entityConfig = IMPORTABLE_ENTITIES.find(e => e.id === selectedEntity);

  // Download template CSV
  const downloadTemplate = (entityId: string) => {
    const entity = IMPORTABLE_ENTITIES.find(e => e.id === entityId);
    if (!entity) return;

    const allFields = [...entity.requiredFields, ...entity.optionalFields];
    const csv = Papa.unparse({
      fields: allFields,
      data: []
    });

    // Add example row with comments
    const exampleRow = allFields.map(field => {
      if (field === 'external_id') return 'ERP-001';
      if (field === 'external_source') return 'SAP';
      if (field === 'job_number') return 'JOB-2024-001';
      if (field === 'job_external_id') return 'SO-12345';
      if (field === 'part_number') return 'PART-001';
      if (field === 'part_external_id') return 'SO-12345-10';
      if (field === 'operation_name') return 'Cutting';
      if (field === 'cell_name') return 'CNC-01';
      if (field === 'name') return entity.id === 'cells' ? 'CNC-01' : 'Resource-001';
      if (field === 'type') return 'tooling';
      if (field === 'customer') return 'Acme Corp';
      if (field === 'material') return 'Steel 304';
      if (field === 'quantity') return '10';
      if (field === 'sequence') return '1';
      if (field === 'estimated_time_minutes') return '30';
      if (field === 'due_date') return '2024-12-31';
      if (field === 'priority') return '1';
      if (field === 'color') return '#3B82F6';
      if (field === 'active') return 'true';
      return '';
    });

    const csvWithExample = csv + '\n' + exampleRow.join(',');

    const blob = new Blob([csvWithExample], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${entity.id}-import-template.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: t('dataImport.templateDownloaded'),
      description: `${entity.label} template downloaded`,
    });
  };

  // Handle file selection
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setParsedData({
          headers: results.meta.fields || [],
          rows: results.data as Record<string, any>[],
          errors: results.errors
        });

        // Auto-map fields with matching names
        if (entityConfig) {
          const allEntityFields = [...entityConfig.requiredFields, ...entityConfig.optionalFields];
          const autoMappings: FieldMapping[] = [];

          for (const csvField of results.meta.fields || []) {
            const normalizedCsv = csvField.toLowerCase().replace(/[_\s-]/g, '');
            const matchingEntityField = allEntityFields.find(ef =>
              ef.toLowerCase().replace(/[_\s-]/g, '') === normalizedCsv
            );
            if (matchingEntityField) {
              autoMappings.push({ csvField, entityField: matchingEntityField });
            }
          }
          setFieldMappings(autoMappings);
        }

        setCurrentStep('map');
      },
      error: (error) => {
        toast({
          title: t('dataImport.parseError'),
          description: error.message,
          variant: "destructive",
        });
      }
    });
  }, [entityConfig, toast, t]);

  // Update field mapping
  const updateMapping = (csvField: string, entityField: string) => {
    setFieldMappings(prev => {
      const existing = prev.findIndex(m => m.csvField === csvField);
      if (entityField === '__ignore__') {
        // Remove mapping
        return prev.filter(m => m.csvField !== csvField);
      }
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = { csvField, entityField };
        return updated;
      }
      return [...prev, { csvField, entityField }];
    });
  };

  // Get mapped entity field for CSV field
  const getMappedField = (csvField: string) => {
    return fieldMappings.find(m => m.csvField === csvField)?.entityField || '__ignore__';
  };

  // Transform data according to mappings
  const transformData = () => {
    if (!parsedData) return [];

    return parsedData.rows.map(row => {
      const transformed: Record<string, any> = {};
      for (const mapping of fieldMappings) {
        let value = row[mapping.csvField];
        // Type conversions
        if (mapping.entityField === 'quantity' || mapping.entityField === 'sequence' ||
            mapping.entityField === 'estimated_time_minutes' || mapping.entityField === 'priority') {
          value = value ? parseInt(value, 10) : undefined;
        }
        if (mapping.entityField === 'active') {
          value = value?.toLowerCase() === 'true' || value === '1';
        }
        if (value !== undefined && value !== '') {
          transformed[mapping.entityField] = value;
        }
      }
      return transformed;
    });
  };

  // Check if required fields are mapped
  const getMissingRequiredFields = () => {
    if (!entityConfig) return [];
    const mappedEntityFields = fieldMappings.map(m => m.entityField);
    return entityConfig.requiredFields.filter(rf => !mappedEntityFields.includes(rf));
  };

  // Preview data
  const previewData = transformData().slice(0, 5);

  // Execute import
  const executeImport = async () => {
    if (!entityConfig || !parsedData) return;

    setIsImporting(true);
    setImportProgress(0);
    setCurrentStep('import');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const transformedData = transformData();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://vatgianzotsurljznsry.supabase.co';

      // Chunk data into batches of 100
      const BATCH_SIZE = 100;
      const batches: any[][] = [];
      for (let i = 0; i < transformedData.length; i += BATCH_SIZE) {
        batches.push(transformedData.slice(i, i + BATCH_SIZE));
      }

      let totalCreated = 0;
      let totalUpdated = 0;
      let totalErrors = 0;
      const allResults: any[] = [];

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];

        const response = await fetch(
          `${supabaseUrl}/functions/v1${entityConfig.endpoint}`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              [entityConfig.arrayKey]: batch
            }),
          }
        );

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error?.message || 'Import failed');
        }

        const result = await response.json();
        if (result.data) {
          totalCreated += result.data.created || 0;
          totalUpdated += result.data.updated || 0;
          totalErrors += result.data.errors || 0;
          allResults.push(...(result.data.results || []));
        }

        setImportProgress(Math.round(((i + 1) / batches.length) * 100));
      }

      setImportResult({
        total: transformedData.length,
        created: totalCreated,
        updated: totalUpdated,
        errors: totalErrors,
        results: allResults
      });

      setCurrentStep('complete');

      toast({
        title: t('dataImport.importComplete'),
        description: `Created: ${totalCreated}, Updated: ${totalUpdated}, Errors: ${totalErrors}`,
      });

    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: t('dataImport.importFailed'),
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive",
      });
      setCurrentStep('preview');
    } finally {
      setIsImporting(false);
    }
  };

  // Reset import
  const resetImport = () => {
    setCurrentStep('select');
    setSelectedEntity(null);
    setParsedData(null);
    setFieldMappings([]);
    setImportResult(null);
    setFileName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-5xl space-y-6">
      <div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent mb-2">
          {t('dataImport.title')}
        </h1>
        <p className="text-muted-foreground text-lg">{t('dataImport.description')}</p>
      </div>

      <hr className="title-divider" />

      {/* Quick Links Banner */}
      <Alert className="bg-primary/5 border-primary/20">
        <HelpCircle className="h-4 w-4" />
        <AlertTitle>Need Help?</AlertTitle>
        <AlertDescription className="flex flex-wrap items-center gap-3 mt-2">
          <span className="text-sm">Learn more about data sync options:</span>
          <a href="https://flow.eryxon.io/features/erp-integration/" target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="h-7 gap-1.5">
              <HelpCircle className="h-3.5 w-3.5" />
              ERP Integration Guide
            </Button>
          </a>
          <Link to="/admin/api-docs">
            <Button variant="outline" size="sm" className="h-7 gap-1.5">
              <Code className="h-3.5 w-3.5" />
              API Documentation
            </Button>
          </Link>
        </AlertDescription>
      </Alert>

      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-6">
        {['select', 'upload', 'map', 'preview', 'import', 'complete'].map((step, index) => (
          <div key={step} className="flex items-center">
            <div className={`
              w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
              ${currentStep === step
                ? 'bg-primary text-primary-foreground'
                : index < ['select', 'upload', 'map', 'preview', 'import', 'complete'].indexOf(currentStep)
                  ? 'bg-green-500 text-white'
                  : 'bg-muted text-muted-foreground'
              }
            `}>
              {index < ['select', 'upload', 'map', 'preview', 'import', 'complete'].indexOf(currentStep)
                ? <CheckCircle2 className="h-4 w-4" />
                : index + 1
              }
            </div>
            {index < 5 && (
              <div className={`w-12 h-0.5 mx-2 ${
                index < ['select', 'upload', 'map', 'preview', 'import', 'complete'].indexOf(currentStep)
                  ? 'bg-green-500'
                  : 'bg-muted'
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Select Entity */}
      {currentStep === 'select' && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Table2 className="h-5 w-5" />
              {t('dataImport.selectEntity')}
            </CardTitle>
            <CardDescription>
              {t('dataImport.selectEntityDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {IMPORTABLE_ENTITIES.map((entity) => (
                <div
                  key={entity.id}
                  onClick={() => setSelectedEntity(entity.id)}
                  className={`
                    p-4 rounded-lg border cursor-pointer transition-all
                    ${selectedEntity === entity.id
                      ? 'border-primary bg-primary/10 ring-2 ring-primary/20'
                      : 'hover:bg-accent/50 hover:border-accent'
                    }
                  `}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium cursor-pointer">
                        {entity.label}
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        {entity.description}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadTemplate(entity.id);
                      }}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {entity.requiredFields.map(field => (
                      <Badge key={field} variant="secondary" className="text-xs">
                        {field}*
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end">
              <Button
                onClick={() => setCurrentStep('upload')}
                disabled={!selectedEntity}
                className="cta-button"
              >
                {t('dataImport.continue')}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Upload CSV */}
      {currentStep === 'upload' && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileUp className="h-5 w-5" />
              {t('dataImport.uploadFile')}
            </CardTitle>
            <CardDescription>
              {t('dataImport.uploadDescription', { entity: entityConfig?.label })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground mb-2">
                {t('dataImport.dragDrop')}
              </p>
              <p className="text-xs text-muted-foreground">
                {t('dataImport.csvOnly')}
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>

            {entityConfig && (
              <Alert>
                <FileSpreadsheet className="h-4 w-4" />
                <AlertTitle>{t('dataImport.requiredFields')}</AlertTitle>
                <AlertDescription>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {entityConfig.requiredFields.map(field => (
                      <Badge key={field} variant="destructive" className="text-xs">
                        {field}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs mt-2">
                    {t('dataImport.downloadTemplateHint')}
                    <Button
                      variant="link"
                      size="sm"
                      className="px-1 h-auto"
                      onClick={() => downloadTemplate(selectedEntity!)}
                    >
                      {t('dataImport.downloadTemplate')}
                    </Button>
                  </p>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep('select')}>
                {t('dataImport.back')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Map Fields */}
      {currentStep === 'map' && parsedData && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Table2 className="h-5 w-5" />
              {t('dataImport.mapFields')}
            </CardTitle>
            <CardDescription>
              {t('dataImport.mapFieldsDescription')}
              <span className="ml-2 text-sm">
                ({parsedData.rows.length} {t('dataImport.rowsDetected')})
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {parsedData.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{t('dataImport.parseWarnings')}</AlertTitle>
                <AlertDescription>
                  {parsedData.errors.slice(0, 3).map((err, i) => (
                    <p key={i} className="text-xs">Row {err.row}: {err.message}</p>
                  ))}
                </AlertDescription>
              </Alert>
            )}

            <ScrollArea className="h-[300px] rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-1/3">{t('dataImport.csvColumn')}</TableHead>
                    <TableHead className="w-1/3">{t('dataImport.mapsTo')}</TableHead>
                    <TableHead className="w-1/3">{t('dataImport.sampleValue')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedData.headers.map((header) => (
                    <TableRow key={header}>
                      <TableCell className="font-mono text-sm">{header}</TableCell>
                      <TableCell>
                        <Select
                          value={getMappedField(header)}
                          onValueChange={(value) => updateMapping(header, value)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder={t('dataImport.selectField')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__ignore__">{t('dataImport.ignore')}</SelectItem>
                            {entityConfig && [...entityConfig.requiredFields, ...entityConfig.optionalFields].map(field => (
                              <SelectItem key={field} value={field}>
                                {field}
                                {entityConfig.requiredFields.includes(field) && ' *'}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground truncate max-w-[150px]">
                        {parsedData.rows[0]?.[header] || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>

            {getMissingRequiredFields().length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{t('dataImport.missingRequired')}</AlertTitle>
                <AlertDescription>
                  <div className="flex gap-1 flex-wrap mt-1">
                    {getMissingRequiredFields().map(field => (
                      <Badge key={field} variant="destructive">{field}</Badge>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep('upload')}>
                {t('dataImport.back')}
              </Button>
              <Button
                onClick={() => setCurrentStep('preview')}
                disabled={getMissingRequiredFields().length > 0 || fieldMappings.length === 0}
                className="cta-button"
              >
                {t('dataImport.preview')}
                <Eye className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Preview */}
      {currentStep === 'preview' && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              {t('dataImport.previewImport')}
            </CardTitle>
            <CardDescription>
              {t('dataImport.previewDescription', { count: parsedData?.rows.length })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ScrollArea className="h-[300px] rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    {fieldMappings.map(m => (
                      <TableHead key={m.entityField}>{m.entityField}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                      {fieldMappings.map(m => (
                        <TableCell key={m.entityField} className="truncate max-w-[150px]">
                          {String(row[m.entityField] ?? '-')}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{t('dataImport.importInfo')}</AlertTitle>
              <AlertDescription className="text-sm">
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>{t('dataImport.willProcessRows', { count: parsedData?.rows.length })}</li>
                  <li>{t('dataImport.existingUpdated')}</li>
                  <li>{t('dataImport.newCreated')}</li>
                </ul>
              </AlertDescription>
            </Alert>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep('map')}>
                {t('dataImport.back')}
              </Button>
              <Button
                onClick={executeImport}
                disabled={isImporting}
                className="cta-button"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('dataImport.importing')}
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    {t('dataImport.startImport')}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 5: Importing */}
      {currentStep === 'import' && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              {t('dataImport.importInProgress')}
            </CardTitle>
            <CardDescription>
              {t('dataImport.pleaseWait')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={importProgress} className="h-2" />
            <p className="text-center text-sm text-muted-foreground">
              {importProgress}% {t('dataImport.complete')}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Step 6: Complete */}
      {currentStep === 'complete' && importResult && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              {t('dataImport.importComplete')}
            </CardTitle>
            <CardDescription>
              {t('dataImport.importSummary')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <p className="text-3xl font-bold">{importResult.total}</p>
                <p className="text-sm text-muted-foreground">{t('dataImport.totalProcessed')}</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-green-500/10">
                <p className="text-3xl font-bold text-green-500">{importResult.created}</p>
                <p className="text-sm text-muted-foreground">{t('dataImport.created')}</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-blue-500/10">
                <p className="text-3xl font-bold text-blue-500">{importResult.updated}</p>
                <p className="text-sm text-muted-foreground">{t('dataImport.updated')}</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-red-500/10">
                <p className="text-3xl font-bold text-red-500">{importResult.errors}</p>
                <p className="text-sm text-muted-foreground">{t('dataImport.errors')}</p>
              </div>
            </div>

            {importResult.errors > 0 && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertTitle>{t('dataImport.errorDetails')}</AlertTitle>
                <AlertDescription>
                  <ScrollArea className="h-[100px] mt-2">
                    {importResult.results
                      .filter(r => r.action === 'error')
                      .slice(0, 10)
                      .map((r, i) => (
                        <p key={i} className="text-xs">
                          {r.external_id || `Row ${i + 1}`}: {r.error}
                        </p>
                      ))
                    }
                  </ScrollArea>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex justify-center">
              <Button onClick={resetImport} className="cta-button">
                <RefreshCw className="mr-2 h-4 w-4" />
                {t('dataImport.importAnother')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
