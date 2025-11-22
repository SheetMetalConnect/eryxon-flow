import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  ZoomIn,
  ZoomOut,
  Download,
  Loader2,
  FileText,
  Maximize2,
  Minimize2
} from 'lucide-react';

interface PDFViewerProps {
  url: string;
  title?: string;
}

export function PDFViewer({ url, title }: PDFViewerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;

    try {
      if (!isFullscreen) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (error) {
      console.error('Fullscreen error:', error);
    }
  };

  if (!url) {
    return (
      <div className="flex flex-col h-full w-full bg-surface-elevated/50 backdrop-blur-sm items-center justify-center text-muted-foreground">
        <div className="glass-card p-8 flex flex-col items-center">
          <FileText className="h-16 w-16 mb-4 opacity-30 text-primary" />
          <p className="font-medium">No drawing available for this job</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex flex-col h-full w-full bg-surface-elevated/50 backdrop-blur-sm">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-3 bg-surface-elevated/80 backdrop-blur-sm border-b border-border/50 shadow-sm">
        <Button
          variant="outline"
          size="sm"
          onClick={handleZoomOut}
          disabled={loading || zoom <= 50}
          className="bg-card/50 backdrop-blur-sm border-border/50 text-foreground hover:bg-primary/10 font-medium transition-all"
        >
          <ZoomOut className="h-4 w-4 mr-1" />
          Zoom Out
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={toggleFullscreen}
          disabled={loading}
          className="bg-card/50 backdrop-blur-sm border-border/50 text-foreground hover:bg-primary/10 font-medium transition-all"
        >
          {isFullscreen ? (
            <>
              <Minimize2 className="h-4 w-4 mr-1" />
              Exit Fullscreen
            </>
          ) : (
            <>
              <Maximize2 className="h-4 w-4 mr-1" />
              Fullscreen
            </>
          )}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleZoomIn}
          disabled={loading || zoom >= 200}
          className="bg-card/50 backdrop-blur-sm border-border/50 text-foreground hover:bg-primary/10 font-medium transition-all"
        >
          <ZoomIn className="h-4 w-4 mr-1" />
          Zoom In
        </Button>

        <span className="text-sm text-foreground font-mono font-semibold ml-2 px-2 py-1 bg-muted/50 rounded">{zoom}%</span>

        <div className="flex-1" />

        <Button
          variant="outline"
          size="sm"
          onClick={handleDownload}
          disabled={loading}
          className="bg-card/50 backdrop-blur-sm border-border/50 text-foreground hover:bg-primary/10 font-medium transition-all"
        >
          <Download className="h-4 w-4 mr-1" />
          Download
        </Button>

        {title && (
          <div className="ml-2 text-sm font-semibold text-foreground px-3 py-1 bg-primary/10 backdrop-blur-sm rounded-md border border-primary/20">
            {title}
          </div>
        )}
      </div>

      {/* PDF Viewer Container */}
      <div className="flex-1 relative overflow-hidden bg-accent/5 flex items-center justify-center">
        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/90 z-10 backdrop-blur-md">
            <div className="glass-card p-8 flex flex-col items-center gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-sm font-medium text-foreground">Loading PDF...</p>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-surface-elevated/90 backdrop-blur-md z-10">
            <div className="glass-card text-center p-8 max-w-md">
              <FileText className="h-12 w-12 mx-auto text-destructive mb-4" />
              <h3 className="text-lg font-bold text-foreground mb-3">
                Failed to Load PDF
              </h3>
              <p className="text-sm text-muted-foreground mb-6">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(url, '_blank')}
                className="bg-card/50 backdrop-blur-sm border-border/50 hover:bg-primary/10 font-medium"
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
