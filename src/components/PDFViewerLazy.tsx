import { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';

const PDFViewerInternal = lazy(() =>
  import('@/components/PDFViewer').then(m => ({ default: m.PDFViewer }))
);

type PDFViewerProps = React.ComponentProps<typeof PDFViewerInternal>;

function PDFViewerFallback() {
  return (
    <div className="flex items-center justify-center h-full min-h-[200px]">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

export function PDFViewer(props: PDFViewerProps) {
  return (
    <Suspense fallback={<PDFViewerFallback />}>
      <PDFViewerInternal {...props} />
    </Suspense>
  );
}
