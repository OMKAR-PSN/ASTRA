import { CryptoDigestAlgorithm, digestStringAsync } from 'expo-crypto';

import { canonicalJson } from '@/lib/reportProtocol';
import type { ReceiverReceipt, ReportRecord } from '@/types/astra';

export const receiverUrl = process.env.EXPO_PUBLIC_RECEIVER_URL?.trim().replace(/\/+$/, '');

export async function submitReport(report: ReportRecord): Promise<ReceiverReceipt> {
  const snapshot = {
    version: 1,
    synthetic: true,
    localReportId: report.id,
    confirmedAt: report.createdAt,
    snapshot: report.snapshot,
  };
  // Namespace readable local IDs by the original immutable snapshot.
  const reportId = await digestStringAsync(CryptoDigestAlgorithm.SHA256, canonicalJson(snapshot));
  const payload = { ...snapshot, reportId };
  const payloadHash = await digestStringAsync(CryptoDigestAlgorithm.SHA256, canonicalJson(payload));
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(`${receiverUrl}/api/v1/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload, payloadHash }),
      signal: controller.signal,
    });
    if (response.status !== 200 && response.status !== 201) {
      throw new Error(response.status === 409 ? 'Receiver reported an ID conflict.' : 'Receiver did not accept the report.');
    }
    const receipt = await response.json();
    if (receipt?.reportId !== reportId || receipt.payloadHash !== payloadHash
      || typeof receipt.receiverReference !== 'string' || !receipt.receiverReference
      || typeof receipt.receivedAt !== 'string' || !Number.isFinite(Date.parse(receipt.receivedAt))) {
      throw new Error('Receiver returned a receipt that could not be verified.');
    }
    return { receiverReference: receipt.receiverReference, receivedAt: receipt.receivedAt };
  } finally {
    clearTimeout(timeout);
  }
}
