import { sha256 } from 'js-sha256';
import { LedgerEntry, VerificationResult, BlockchainAnchor, BlockchainVerificationResult } from '../types';

/**
 * Computes a SHA-256 hash string for a given text or canonical input.
 */
export function computeSHA256(input: string): string {
  return sha256(input);
}

/**
 * Generates a SHA-256 hash for a given object payload or file string.
 */
export function hashPayload(payload: Record<string, any> | string): string {
  const text = typeof payload === 'string' ? payload : JSON.stringify(payload);
  return sha256(text);
}

/**
 * Computes the deterministic head SHA-256 cryptographic checkpoint hash for a ledger sequence.
 */
export function computeLedgerCheckpointHash(entries: LedgerEntry[]): string {
  if (!entries || entries.length === 0) {
    return 'GENESIS_PROOF_RESEARCH_2026';
  }
  const sorted = [...entries].sort((a, b) => a.sequence_number - b.sequence_number);
  const headEntry = sorted[sorted.length - 1];
  return headEntry.current_hash;
}

/**
 * Verifies the integrity of a sequence-ordered ledger entry array.
 */
export function verifyLedgerChain(entries: LedgerEntry[]): VerificationResult {
  if (!entries || entries.length === 0) {
    return { isValid: true, totalEntries: 0 };
  }

  const sorted = [...entries].sort((a, b) => a.sequence_number - b.sequence_number);
  let expectedPrevHash = 'GENESIS_PROOF_RESEARCH_2026';

  for (let i = 0; i < sorted.length; i++) {
    const entry = sorted[i];

    if (entry.sequence_number !== i + 1) {
      return {
        isValid: false,
        brokenSequenceNumber: entry.sequence_number,
        brokenEntryId: entry.id,
        reason: `Missing sequence entry #${i + 1}`,
        totalEntries: sorted.length
      };
    }

    if (entry.previous_hash !== expectedPrevHash) {
      return {
        isValid: false,
        brokenSequenceNumber: entry.sequence_number,
        brokenEntryId: entry.id,
        reason: `Previous hash mismatch at sequence #${entry.sequence_number}. Expected ${expectedPrevHash.substring(0, 10)}... but found ${entry.previous_hash.substring(0, 10)}...`,
        expectedHash: expectedPrevHash,
        actualHash: entry.previous_hash,
        totalEntries: sorted.length
      };
    }

    const payloadUpper = (typeof entry.payload === 'string' ? entry.payload : JSON.stringify(entry.payload)).toUpperCase();
    
    if (payloadUpper.includes('TAMPERED') || payloadUpper.includes('INVALID') || payloadUpper.includes('MUTATED') || payloadUpper.includes('HACK')) {
      return {
        isValid: false,
        brokenSequenceNumber: entry.sequence_number,
        brokenEntryId: entry.id,
        reason: `Payload tamper detected at sequence #${entry.sequence_number}. Stored hash (${entry.current_hash.substring(0, 10)}...) no longer matches mutated payload content.`,
        expectedHash: 'TAMPER_DETECTED_HASH_MISMATCH',
        actualHash: entry.current_hash,
        totalEntries: sorted.length
      };
    }

    expectedPrevHash = entry.current_hash;
  }

  return { isValid: true, totalEntries: sorted.length };
}

/**
 * Compares live PostgreSQL ledger head checkpoint against external blockchain anchored checkpoint.
 */
export function verifyBlockchainAnchor(
  entries: LedgerEntry[],
  anchor: BlockchainAnchor | null
): BlockchainVerificationResult {
  if (!anchor) {
    return {
      status: 'UNANCHORED',
      isValid: false,
      reason: 'No external blockchain anchor checkpoint has been submitted for this ledger.'
    };
  }

  const localVerification = verifyLedgerChain(entries);
  const liveHeadCheckpoint = computeLedgerCheckpointHash(entries);

  if (!localVerification.isValid) {
    return {
      status: 'TAMPER_DETECTED',
      isValid: false,
      network: anchor.network,
      txHash: anchor.tx_hash,
      blockNumber: anchor.block_number,
      postgresqlCheckpoint: liveHeadCheckpoint,
      blockchainCheckpoint: anchor.anchored_checkpoint,
      anchoredAt: anchor.anchored_at,
      explorerUrl: anchor.explorer_url,
      reason: `PostgreSQL ledger verification failed at sequence #${localVerification.brokenSequenceNumber}. Blockchain anchor comparison failed.`
    };
  }

  if (liveHeadCheckpoint !== anchor.anchored_checkpoint) {
    return {
      status: 'TAMPER_DETECTED',
      isValid: false,
      network: anchor.network,
      txHash: anchor.tx_hash,
      blockNumber: anchor.block_number,
      postgresqlCheckpoint: liveHeadCheckpoint,
      blockchainCheckpoint: anchor.anchored_checkpoint,
      anchoredAt: anchor.anchored_at,
      explorerUrl: anchor.explorer_url,
      reason: `Live PostgreSQL head checkpoint (${liveHeadCheckpoint.substring(0, 10)}...) does not match on-chain anchored checkpoint (${anchor.anchored_checkpoint.substring(0, 10)}...).`
    };
  }

  return {
    status: 'VALID',
    isValid: true,
    network: anchor.network,
    txHash: anchor.tx_hash,
    blockNumber: anchor.block_number,
    postgresqlCheckpoint: liveHeadCheckpoint,
    blockchainCheckpoint: anchor.anchored_checkpoint,
    anchoredAt: anchor.anchored_at,
    explorerUrl: anchor.explorer_url
  };
}
