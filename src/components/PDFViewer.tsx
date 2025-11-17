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

  return (
    <div className="flex flex-col h-full w-full bg-gray-100">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-2 bg-white border-b">
        <Button
          variant="outline"
          size="sm"
          onClick={handleZoomOut}
          disabled={loading || zoom <= 50}
        >
          <ZoomOut className="h-4 w-4 mr-1" />
          Zoom Out
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleFitToView}
          disabled={loading}
        >
          <Maximize2 className="h-4 w-4 mr-1" />
          Fit to View
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleZoomIn}
          disabled={loading || zoom >= 200}
        >
          <ZoomIn className="h-4 w-4 mr-1" />
          Zoom In
        </Button>

        <span className="text-sm text-gray-600 ml-2">{zoom}%</span>

        <div className="flex-1" />

        <Button
          variant="outline"
          size="sm"
          onClick={handleDownload}
          disabled={loading}
        >
          <Download className="h-4 w-4 mr-1" />
          Download
        </Button>

        {title && (
          <div className="ml-2 text-sm font-medium text-gray-700">
            {title}
          </div>
        )}
      </div>

      {/* PDF Viewer Container */}
      <div className="flex-1 relative overflow-auto bg-gray-200">
        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="text-sm text-gray-600">Loading PDF...</p>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
            <div className="text-center p-6 max-w-md">
              <FileText className="h-12 w-12 mx-auto text-red-600 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Failed to Load PDF
              </h3>
              <p className="text-sm text-gray-600">{error}</p>
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

        {/* PDF Embed - Using object tag for better compatibility */}
        {!error && (
          <div className="flex items-center justify-center p-4 min-h-full">
            <div
              className="bg-white shadow-lg"
              style={{
                width: `${zoom}%`,
                minWidth: '300px',
                minHeight: '400px'
              }}
            >
              <object
                data={`${url}#toolbar=1&navpanes=0&scrollbar=1`}
                type="application/pdf"
                className="w-full h-full"
                style={{ minHeight: '600px' }}
                onLoad={handleLoad}
                onError={handleError}
              >
                <embed
                  src={`${url}#toolbar=1&navpanes=0&scrollbar=1`}
                  type="application/pdf"
                  className="w-full h-full"
                  style={{ minHeight: '600px' }}
                />
              </object>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
