import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  ZoomIn,
  ZoomOut,
  Download,
  Loader2,
  FileText,
  Maximize2
} from 'lucide-react';

interface PDFViewerProps {
  url: string;
  title?: string;
}

export function PDFViewer({ url, title }: PDFViewerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);

  const handleLoad = () => {
    setLoading(false);
    setError(null);
  };

  const handleError = () => {
    setLoading(false);
    setError('Failed to load PDF file. The file may be corrupted or unavailable.');
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 25, 200));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 25, 50));
  };

  const handleFitToView = () => {
    setZoom(100);
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = url;
    link.download = title || 'drawing.pdf';
    link.click();
  };

  if (!url) {
    return (
      <div className="flex flex-col h-full w-full bg-background items-center justify-center text-muted-foreground">
        <FileText className="h-16 w-16 mb-4 opacity-20" />
        <p>No drawing available for this job</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-background">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-2 bg-card border-b border-border">
        <Button
          variant="outline"
          size="sm"
          onClick={handleZoomOut}
          disabled={loading || zoom <= 50}
          className="bg-card text-foreground hover:bg-accent"
        >
          <ZoomOut className="h-4 w-4 mr-1" />
          Zoom Out
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleFitToView}
          disabled={loading}
          className="bg-card text-foreground hover:bg-accent"
        >
          <Maximize2 className="h-4 w-4 mr-1" />
          Fit to View
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleZoomIn}
          disabled={loading || zoom >= 200}
          className="bg-card text-foreground hover:bg-accent"
        >
          <ZoomIn className="h-4 w-4 mr-1" />
          Zoom In
        </Button>

        <span className="text-sm text-muted-foreground ml-2">{zoom}%</span>

        <div className="flex-1" />

        <Button
          variant="outline"
          size="sm"
          onClick={handleDownload}
          disabled={loading}
          className="bg-card text-foreground hover:bg-accent"
        >
          <Download className="h-4 w-4 mr-1" />
          Download
        </Button>

        {title && (
          <div className="ml-2 text-sm font-medium text-muted-foreground">
            {title}
          </div>
        )}
      </div>

      {/* PDF Viewer Container */}
      <div className="flex-1 relative overflow-hidden bg-accent/5 flex items-center justify-center">
        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading PDF...</p>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
            <div className="text-center p-6 max-w-md">
              <FileText className="h-12 w-12 mx-auto text-destructive mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Failed to Load PDF
              </h3>
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(url, '_blank')}
                className="mt-4"
              >
                Open in New Tab
              </Button>
            </div>
          </div>
        )}

        {/* PDF Embed */}
        {!error && (
          <div
            className="shadow-lg transition-all duration-200"
            style={{
              width: `${zoom}%`,
              height: '100%',
              maxWidth: '100%',
              overflow: 'auto'
            }}
          >
            <object
              data={`${url}#toolbar=1&navpanes=0&scrollbar=1&view=FitH`}
              type="application/pdf"
              className="w-full h-full block"
              onLoad={handleLoad}
              onError={handleError}
            >
              <div className="flex flex-col items-center justify-center h-full bg-background text-muted-foreground p-4">
                <p className="mb-4">Unable to display PDF directly.</p>
                <Button onClick={() => window.open(url, '_blank')}>
                  Download / Open PDF
                </Button>
              </div>
            </object>
          </div>
        )}
      </div>
    </div>
  );
}
