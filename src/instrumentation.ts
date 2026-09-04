import type { Instrumentation } from 'next';

import { buildErrorMessage, sendSlackMessage } from './lib/slack';

const SOURCES: Record<string, string> = {
  route: 'API',
  render: 'Page render',
  action: 'Server action',
  proxy: 'Proxy',
};

// Global safety net for unhandled server errors (route handlers and page
// renders). Errors caught and answered inside a route never reach this hook —
// those notify Slack at their own catch site.
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  const source = SOURCES[context.routeType] ?? context.routeType;
  await sendSlackMessage(
    buildErrorMessage(err, { source, path: `${request.method} ${request.path}` })
  );
};
