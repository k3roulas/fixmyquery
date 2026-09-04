type Block = {
  type: string;
  [block: string]: unknown;
};

type SlackMessage = {
  text: string;
  blocks?: unknown[];
};

/**
 * Send a message to Slack via Incoming Webhook.
 * Gracefully no-ops if SLACK_WEBHOOK_URL is not configured.
 * Fire-and-forget: catches errors, never throws.
 */
export async function sendSlackMessage(payload: SlackMessage): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) return;

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    // Silently ignore Slack notification failures
  }
}

/**
 * Convenience: build and send in one call (fire-and-forget).
 */
export function notifySlack(builder: () => SlackMessage): void {
  void sendSlackMessage(builder());
}

function section(text: string): Block {
  return { type: 'section', text: { type: 'mrkdwn', text } };
}

function timestamp(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}/${pad(now.getMonth() + 1)}/${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

function headerLine(action: string, email: string): string {
  return `*${action} - ${email} - ${timestamp()}*`;
}

function detail(label: string, value: string): string {
  return `${label}: ${value}`;
}

function buildEvent(action: string, email: string, details: Array<[string, string]>): SlackMessage {
  const lines = [headerLine(action, email), ...details.map(([l, v]) => detail(l, v))];
  return {
    text: `${action}: ${email}`,
    blocks: [section(lines.join('\n'))],
  };
}

export function buildLoginAttemptMessage(email: string): SlackMessage {
  return buildEvent('Login Attempt', email, []);
}

export function buildLoginFailedMessage(email: string, reason: string): SlackMessage {
  return buildEvent('Login Failed', email, [['Reason', reason]]);
}

export function buildLoginSuccessMessage(email: string): SlackMessage {
  return buildEvent('Login Success', email, []);
}

export function buildLogoutMessage(email: string): SlackMessage {
  return buildEvent('Logout', email, []);
}

export function buildRegistrationSubmittedMessage(email: string): SlackMessage {
  return buildEvent('Registration Submitted', email, []);
}

export function buildVerificationEmailSentMessage(email: string): SlackMessage {
  return buildEvent('Verification Email Sent', email, []);
}

export function buildRegistrationSuccessMessage(email: string): SlackMessage {
  return buildEvent('Registration Successful', email, []);
}

export function buildEmailVerifiedMessage(email: string): SlackMessage {
  return buildEvent('Email Verified', email, []);
}

export function buildAnalysisLaunchedMessage(
  email: string,
  input: { title: string | undefined; sql: string }
): SlackMessage {
  const collapsed = input.sql.replace(/\s+/g, ' ').trim();
  const preview = collapsed.length > 120 ? `${collapsed.slice(0, 120)}...` : collapsed;
  const details: Array<[string, string]> = [];
  if (input.title) details.push(['Title', input.title]);
  details.push(['Query', preview]);
  return buildEvent('Analysis Launched', email, details);
}

export function buildHistoryViewedMessage(email: string, count: number): SlackMessage {
  return buildEvent('History Viewed', email, [['Saved analyses', String(count)]]);
}

export function buildHistoryDetailViewedMessage(
  email: string,
  entry: { id: string; title: string }
): SlackMessage {
  return buildEvent('History Detail Viewed', email, [
    ['Title', entry.title],
    ['ID', entry.id],
  ]);
}

export function buildErrorMessage(
  error: unknown,
  opts: { source: string; path?: string }
): SlackMessage {
  const message = error instanceof Error ? error.message : String(error);
  const stack =
    error instanceof Error ? error.stack?.split('\n').slice(0, 3).join('\n') : undefined;
  const digest =
    typeof error === 'object' && error !== null && 'digest' in error
      ? String((error as { digest: unknown }).digest)
      : undefined;

  const lines = [`*Error - ${opts.source} - ${timestamp()}*`, detail('Message', message)];
  if (opts.path) lines.push(detail('Path', opts.path));
  if (digest) lines.push(detail('Digest', digest));
  if (stack) lines.push(`\`\`\`${stack}\`\`\``);

  return {
    text: `Error (${opts.source}): ${message}`,
    blocks: [section(lines.join('\n'))],
  };
}
