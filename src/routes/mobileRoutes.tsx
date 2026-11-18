import { Navigate, Route, useLocation, useParams } from 'react-router-dom';
import { ROUTES } from './constants';

function LegacyOperatorRedirect({ to, scan = false }: { to: string; scan?: boolean }) {
  const location = useLocation();
  const { operationId } = useParams();
  const search = new URLSearchParams(location.search);
  if (scan) search.set('scan', '1');
  const pathname = operationId ? `/operator/operations/${encodeURIComponent(operationId)}` : to;
  return <Navigate to={{ pathname, search: search.toString(), hash: location.hash }}
    state={location.state} replace />;
}

/** Preserve installed shortcuts and previously shared URLs on the common web UI. */
export function MobileRoutes() {
  return <>
    <Route path="/m" element={<LegacyOperatorRedirect to={ROUTES.OPERATOR.WORK_QUEUE} />} />
    <Route path="/m/login" element={<LegacyOperatorRedirect to={ROUTES.OPERATOR.LOGIN} />} />
    <Route path="/m/queue" element={<LegacyOperatorRedirect to={ROUTES.OPERATOR.WORK_QUEUE} />} />
    <Route path="/m/op/:operationId" element={<LegacyOperatorRedirect to={ROUTES.OPERATOR.WORK_QUEUE} />} />
    <Route path="/m/scan" element={<LegacyOperatorRedirect to={ROUTES.OPERATOR.WORK_QUEUE} scan />} />
    <Route path="/m/activity" element={<LegacyOperatorRedirect to={ROUTES.OPERATOR.MY_ACTIVITY} />} />
    <Route path="/m/issues" element={<LegacyOperatorRedirect to={ROUTES.OPERATOR.MY_ISSUES} />} />
    <Route path="/m/terminal" element={<LegacyOperatorRedirect to={ROUTES.OPERATOR.VIEW} />} />
  </>;
}
