import { useState } from 'react';
import {
  Package,
  Wrench,
  CheckCircle2,
  Factory,
  FileBox,
  ClipboardList,
  RotateCw,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { generateMockData, clearMockData } from '@/lib/mockDataGenerator';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface MockDataImportProps {
  onComplete: () => void;
  onSkip: () => void;
}

export function MockDataImport({ onComplete, onSkip }: MockDataImportProps) {
  const { profile } = useAuth();
  const [isImporting, setIsImporting] = useState(false);
  const [importComplete, setImportComplete] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const handleImport = async () => {
    if (!profile?.tenant_id) {
      toast.error('Unable to import data: tenant not found');
      return;
    }

    setIsImporting(true);

    try {
      const result = await generateMockData(profile.tenant_id, {
        includeCells: true,
        includeJobs: true,
        includeParts: true,
        includeOperations: true,
      });

      if (result.success) {
        setImportComplete(true);
        toast.success('Sample data imported successfully!');
      } else {
        toast.error(`Failed to import data: ${result.error}`);
      }
    } catch (error) {
      console.error('Error importing mock data:', error);
      toast.error('An unexpected error occurred while importing data');
    } finally {
      setIsImporting(false);
    }
  };

  const handleClearAndReimport = async () => {
    if (!profile?.tenant_id) return;

    setIsClearing(true);

    try {
      const clearResult = await clearMockData(profile.tenant_id);
      if (!clearResult.success) {
        toast.error(`Failed to clear data: ${clearResult.error}`);
        setIsClearing(false);
        return;
      }

      // Wait a moment for database to process deletions
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Now reimport
      await handleImport();
    } catch (error) {
      console.error('Error clearing and reimporting:', error);
      toast.error('Failed to reset data');
    } finally {
      setIsClearing(false);
    }
  };

  const dataItems = [
    {
      icon: Factory,
      title: '6 Manufacturing Cells',
      description: 'Laser cutting, bending, welding, assembly, finishing, and QC',
    },
    {
      icon: FileBox,
      title: '3 Sample Jobs',
      description: 'Real-world examples from different customers with priorities',
    },
    {
      icon: Package,
      title: '5 Parts',
      description: 'Various metal components including enclosures, brackets, and panels',
    },
    {
      icon: ClipboardList,
      title: '30+ Operations',
      description: 'Complete workflow from cutting through quality control',
    },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <Wrench className="h-12 w-12 mx-auto text-primary" />
        <h2 className="text-3xl font-bold tracking-tight">Import Sample Data</h2>
        <p className="text-muted-foreground text-lg">
          Start exploring Eryxon MES with realistic metal fabrication shop data
        </p>
      </div>

      <Alert>
        <AlertDescription>
          We'll create sample jobs, parts, and operations that represent a typical sheet metal
          fabrication workflow. This helps you understand how Eryxon organizes and tracks
          manufacturing work.
        </AlertDescription>
      </Alert>

      <div className="grid sm:grid-cols-2 gap-4">
        {dataItems.map((item, index) => (
          <Card key={index}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg">{item.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>{item.description}</CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>

      {importComplete && (
        <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
          <AlertDescription className="text-green-900 dark:text-green-100">
            Sample data has been imported successfully! You can now explore the app with real-world
            examples.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {!importComplete ? (
          <>
            <Button
              size="lg"
              onClick={handleImport}
              disabled={isImporting}
              className="min-w-[200px]"
            >
              {isImporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                'Import Sample Data'
              )}
            </Button>
            <Button size="lg" variant="outline" onClick={onSkip} disabled={isImporting}>
              Skip for Now
            </Button>
          </>
        ) : (
          <>
            <Button size="lg" onClick={onComplete} className="min-w-[200px]">
              Continue to App
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={handleClearAndReimport}
              disabled={isClearing}
            >
              {isClearing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resetting...
                </>
              ) : (
                <>
                  <RotateCw className="mr-2 h-4 w-4" />
                  Reset & Reimport
                </>
              )}
            </Button>
          </>
        )}
      </div>

      <div className="text-center text-sm text-muted-foreground">
        <p>
          You can clear this sample data later from the admin settings, or reimport it anytime to
          reset your test environment.
        </p>
      </div>
    </div>
  );
}
