import { useState, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { Button } from '@/components/ui/button';
import {
  ZoomIn,
  ZoomOut,
  Download,
  Loader2,
  FileText,
  RotateCcw,
  ExternalLink,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { cn, sanitizeUrl, safeOpenUrl } from '@/lib/utils';

// Configure PDF.js worker from CDN
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFViewerProps {
  url: string;
  title?: string;
  compact?: boolean;
}

export function PDFViewer({ url, title, compact = false }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState(1.0);

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
    setError(null);
  }, []);

  const onDocumentLoadError = useCallback((error: Error) => {
    console.error('PDF load error:', error);
    setLoading(false);
    setError('Failed to load PDF file. The file may be corrupted or unavailable.');
  }, []);

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.25, 3.0));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.25, 0.5));
  };

  const handleReset = () => {
    setScale(1.0);
  };

  const handlePrevPage = () => {
    setPageNumber((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setPageNumber((prev) => Math.min(prev + 1, numPages));
  };

  const handleDownload = () => {
    const safeUrl = sanitizeUrl(url);
    if (!safeUrl) return;
    const link = document.createElement('a');
    link.href = safeUrl;
    link.download = title || 'drawing.pdf';
    link.click();
  };

  const handleOpenExternal = () => {
    safeOpenUrl(url);
  };

  // Validate URL to prevent XSS
  const safeFileUrl = sanitizeUrl(url);

  if (!url || !safeFileUrl) {
    return (
      <div className="flex flex-col h-full w-full bg-background items-center justify-center text-muted-foreground">
        <FileText className="h-12 w-12 mb-2 opacity-20" />
        <p className="text-xs">No drawing available</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-background">
      {/* Toolbar */}
      <div className={cn(
        "flex items-center gap-1 bg-card/80 backdrop-blur-sm border-b border-border",
        compact ? "p-1" : "p-1.5"
      )}>
        {/* Page Navigation */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handlePrevPage}
          disabled={pageNumber <= 1 || loading}
          className="h-7 w-7 p-0"
          title="Previous page"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>

        <span className="text-xs text-muted-foreground min-w-[48px] text-center tabular-nums">
          {loading ? '-' : `${pageNumber}/${numPages}`}
        </span>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleNextPage}
          disabled={pageNumber >= numPages || loading}
          className="h-7 w-7 p-0"
          title="Next page"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>

        <div className="w-px h-4 bg-border mx-1" />

        {/* Zoom Controls */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleZoomOut}
          disabled={scale <= 0.5}
          className="h-7 w-7 p-0"
          title="Zoom out"
        >
          <ZoomOut className="h-3.5 w-3.5" />
        </Button>

        <span className="text-xs text-muted-foreground min-w-[36px] text-center tabular-nums">
          {Math.round(scale * 100)}%
        </span>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleZoomIn}
          disabled={scale >= 3.0}
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
          disabled={scale === 1.0}
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
      <div className="flex-1 relative overflow-auto bg-[#525659]">
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

        {/* PDF Document */}
        {!error && (
          <div className="min-h-full flex justify-center p-4">
            <Document
              file={safeFileUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={null}
              className="flex flex-col items-center"
            >
              <Page
                pageNumber={pageNumber}
                scale={scale}
                renderTextLayer={true}
                renderAnnotationLayer={true}
                className="shadow-lg"
                loading={
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                }
              />
            </Document>
          </div>
        )}
      </div>
    </div>
  );
}
