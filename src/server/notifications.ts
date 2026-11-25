import type Database from 'better-sqlite3';
import type { AlertChannel, NotificationDispatchReceipt } from '../shared/types.ts';
import { generateId, maskPhone } from './crypto.ts';

export interface DispatchAlertParams {
  db: Database.Database;
  donorId: string;
  donorFirstName: string;
  donorPhoneNormalized: string;
  channel: AlertChannel;
  kind: 'match_alert' | 'reconfirm_reminder' | 'contact_request';
  messageText: string;
  createdAt?: string;
}

export function formatContactRequestMessage(params: {
  urgency: string;
  requesterName: string;
  units: number;
  bloodGroup: string;
  hospital: string;
  city: string;
}): string {
  const unitLabel = params.units === 1 ? '1 unit' : `${params.units} units`;
  return `[Blood Portal] ${params.urgency.toUpperCase()}: ${params.requesterName} needs ${unitLabel} of ${params.bloodGroup} at ${params.hospital}, ${params.city}. Open Donor Dashboard to Accept & share your number, or Decline.`;
}

export function formatMatchRequestMessage(params: {
  urgency: string;
  units: number;
  bloodGroup: string;
  hospital: string;
  city: string;
}): string {
  const unitLabel = params.units === 1 ? '1 unit' : `${params.units} units`;
  return `[Blood Portal] ${params.urgency.toUpperCase()}: ${unitLabel} of ${params.bloodGroup} needed at ${params.hospital}, ${params.city}. Check Blood Requests Board if you are eligible to donate.`;
}

function triggerExternalGatewayAsync(params: {
  channel: AlertChannel;
  toPhone: string;
  messageText: string;
}): 'twilio' | 'webhook' | 'portal_queue' {
  const webhookUrl = process.env.ALERT_WEBHOOK_URL?.trim();
  const twilioSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const twilioToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const twilioFrom = process.env.TWILIO_FROM_NUMBER?.trim();

  if (twilioSid && twilioToken && twilioFrom && params.toPhone) {
    const to = params.channel === 'whatsapp' ? `whatsapp:${params.toPhone}` : params.toPhone;
    const from =
      params.channel === 'whatsapp' && !twilioFrom.startsWith('whatsapp:')
        ? `whatsapp:${twilioFrom}`
        : twilioFrom;
    const auth = Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64');
    const body = new URLSearchParams({ To: to, From: from, Body: params.messageText });

    void fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    }).catch(() => {
      // Gateway delivery failure is logged silently without interrupting emergency request creation
    });
    return 'twilio';
  }

  if (webhookUrl) {
    void fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel: params.channel,
        to: params.toPhone,
        message: params.messageText,
        sentAt: new Date().toISOString(),
      }),
    }).catch(() => {
      // Ignore transient webhook errors
    });
    return 'webhook';
  }

  return 'portal_queue';
}

export function dispatchDonorAlert(params: DispatchAlertParams): NotificationDispatchReceipt {
  const id = generateId('ntf');
  const sentAt = params.createdAt ?? new Date().toISOString();

  params.db
    .prepare(
      `INSERT INTO notifications_log (id, donor_id, channel, kind, message, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(id, params.donorId, params.channel, params.kind, params.messageText, sentAt);

  const gatewayMode = triggerExternalGatewayAsync({
    channel: params.channel,
    toPhone: params.donorPhoneNormalized,
    messageText: params.messageText,
  });

  return {
    id,
    channel: params.channel,
    recipientFirstName: params.donorFirstName,
    recipientMasked: maskPhone(params.donorPhoneNormalized),
    messageText: params.messageText,
    sentAt,
    gatewayMode,
  };
}
