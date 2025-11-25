import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  ZoomIn,
  ZoomOut,
  Download,
  Loader2,
  FileText,
  RotateCcw,
  ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PDFViewerProps {
  url: string;
  title?: string;
  compact?: boolean;
}

export function PDFViewer({ url, title, compact = false }: PDFViewerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const loadTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Reset loading state when URL changes
  useEffect(() => {
    if (url) {
      setLoading(true);
      setError(null);

      // Fallback: Consider loaded after 3 seconds if no event fires
      // This handles cases where iframe load event doesn't fire for PDFs
      loadTimeoutRef.current = setTimeout(() => {
        setLoading(false);
      }, 3000);
    }

    return () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
    };
  }, [url]);

  const handleLoad = () => {
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
    }
    setLoading(false);
    setError(null);
  };

  const handleError = () => {
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
    }
    setLoading(false);
    setError('Failed to load PDF file. The file may be corrupted or unavailable.');
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 25, 200));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 25, 50));
  };

  const handleReset = () => {
    setZoom(100);
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = url;
    link.download = title || 'drawing.pdf';
    link.click();
  };

  const handleOpenExternal = () => {
    window.open(url, '_blank');
  };

  if (!url) {
    return (
      <div className="flex flex-col h-full w-full bg-background items-center justify-center text-muted-foreground">
        <FileText className="h-12 w-12 mb-2 opacity-20" />
        <p className="text-xs">No drawing available</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-background">
      {/* Compact Toolbar */}
      <div className={cn(
        "flex items-center gap-1 bg-card/80 backdrop-blur-sm border-b border-border",
        compact ? "p-1" : "p-1.5"
      )}>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleZoomOut}
          disabled={zoom <= 50}
          className="h-7 w-7 p-0"
          title="Zoom out"
        >
          <ZoomOut className="h-3.5 w-3.5" />
        </Button>

        <span className="text-xs text-muted-foreground min-w-[32px] text-center tabular-nums">
          {zoom}%
        </span>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleZoomIn}
          disabled={zoom >= 200}
          className="h-7 w-7 p-0"
          title="Zoom in"
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </Button>

        <div className="w-px h-4 bg-border mx-1" />

        <Button
          variant="ghost"
          size="sm"
          onClick={handleReset}
          disabled={zoom === 100}
          className="h-7 w-7 p-0"
          title="Reset zoom"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>

        <div className="flex-1" />

        <Button
          variant="ghost"
          size="sm"
          onClick={handleOpenExternal}
          className="h-7 w-7 p-0"
          title="Open in new tab"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleDownload}
          className="h-7 w-7 p-0"
          title="Download PDF"
        >
          <Download className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* PDF Viewer Container */}
      <div className="flex-1 relative overflow-hidden bg-[#1a1a2e]">
        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/90 z-10 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">Loading PDF...</p>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
            <div className="text-center p-4 max-w-xs">
              <FileText className="h-10 w-10 mx-auto text-destructive mb-2 opacity-50" />
              <p className="text-xs text-muted-foreground mb-3">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenExternal}
                className="text-xs h-7"
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Open in Browser
              </Button>
            </div>
          </div>
        )}

        {/* PDF iframe - more reliable than object tag */}
        {!error && (
          <div
            className="h-full w-full overflow-auto"
            style={{
              transform: `scale(${zoom / 100})`,
              transformOrigin: 'top left',
              width: `${10000 / zoom}%`,
              height: `${10000 / zoom}%`,
            }}
          >
            <iframe
              ref={iframeRef}
              src={`${url}#toolbar=1&navpanes=0&scrollbar=1&view=FitH`}
              className="w-full h-full border-0"
              onLoad={handleLoad}
              onError={handleError}
              title={title || 'PDF Viewer'}
              sandbox="allow-same-origin allow-scripts allow-popups"
            />
          </div>
        )}
      </div>
    </div>
  );
}
