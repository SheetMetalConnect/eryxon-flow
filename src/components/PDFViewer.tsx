import { useState, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Button } from '@/components/ui/button';
import {
  ZoomIn,
  ZoomOut,
  Download,
  Loader2,
  FileText,
  Maximize2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFViewerProps {
  url: string;
  title?: string;
}

export function PDFViewer({ url, title }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState(1.0);
  const [pageWidth, setPageWidth] = useState<number | undefined>(undefined);

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
    setError(null);
  }, []);

  const onDocumentLoadError = useCallback((error: Error) => {
    console.error('Error loading PDF:', error);
    setLoading(false);
    setError('Failed to load PDF file. The file may be corrupted or unavailable.');
  }, []);

  const onPageLoadSuccess = useCallback(() => {
    // Page loaded successfully
  }, []);

  const onPageLoadError = useCallback((error: Error) => {
    console.error('Error loading PDF page:', error);
  }, []);

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.25, 3.0));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.25, 0.5));
  };

  const handleFitToView = () => {
    setScale(1.0);
    setPageWidth(undefined);
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = url;
    link.download = title || 'drawing.pdf';
    link.click();
  };

  const goToPrevPage = () => {
    setPageNumber((prev) => Math.max(prev - 1, 1));
  };

  const goToNextPage = () => {
    setPageNumber((prev) => Math.min(prev + 1, numPages || 1));
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
      <div className="flex items-center gap-2 p-2 bg-card border-b border-border flex-wrap">
        <Button
          variant="outline"
          size="sm"
          onClick={handleZoomOut}
          disabled={loading || scale <= 0.5}
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
          disabled={loading || scale >= 3.0}
          className="bg-card text-foreground hover:bg-accent"
        >
          <ZoomIn className="h-4 w-4 mr-1" />
          Zoom In
        </Button>

        <span className="text-sm text-muted-foreground ml-2">
          {Math.round(scale * 100)}%
        </span>

        <div className="flex-1" />

        {/* Page Navigation */}
        {numPages && numPages > 1 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={goToPrevPage}
              disabled={pageNumber <= 1}
              className="bg-card text-foreground hover:bg-accent"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {pageNumber} of {numPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={goToNextPage}
              disabled={pageNumber >= numPages}
              className="bg-card text-foreground hover:bg-accent"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

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
      <div className="flex-1 relative overflow-auto bg-accent/5 flex items-start justify-center p-4">
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

        {/* PDF Document */}
        {!error && (
          <div className="shadow-lg bg-white">
            <Document
              file={url}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              }
              options={{
                cMapUrl: `//unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
                cMapPacked: true,
                standardFontDataUrl: `//unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts/`,
              }}
            >
              <Page
                pageNumber={pageNumber}
                scale={scale}
                width={pageWidth}
                onLoadSuccess={onPageLoadSuccess}
                onLoadError={onPageLoadError}
                loading={
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                }
                renderTextLayer={true}
                renderAnnotationLayer={true}
              />
            </Document>
          </div>
        )}
      </div>
    </div>
  );
}
