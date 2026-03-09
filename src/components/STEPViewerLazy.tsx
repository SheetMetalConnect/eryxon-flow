import { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';

const STEPViewerInternal = lazy(() =>
  import('@/components/STEPViewer').then(m => ({ default: m.STEPViewer }))
);

type STEPViewerProps = React.ComponentProps<typeof STEPViewerInternal>;

function STEPViewerFallback() {
  return (
    <div className="flex items-center justify-center h-full min-h-[200px]">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

export function STEPViewer(props: STEPViewerProps) {
  return (
    <Suspense fallback={<STEPViewerFallback />}>
      <STEPViewerInternal {...props} />
    </Suspense>
  );
}
