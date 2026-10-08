import { describe, it, expect } from 'vitest';
import { computeSHA256, verifyLedgerChain, computeLedgerCheckpointHash, verifyBlockchainAnchor } from './hash';
import { LedgerEntry, BlockchainAnchor } from '../types';

describe('Hash Chain Ledger Verification Suite', () => {
  it('computes correct deterministic SHA256 hashes', () => {
    const hash = computeSHA256('GENESIS_PROOF_RESEARCH_2026');
    expect(hash).toBeDefined();
    expect(hash.length).toBe(64);
  });

  it('validates an unbroken sequence ledger chain as VALID', () => {
    const timestamp = '2026-10-06T10:00:00.000Z';
    const prevHash = 'GENESIS_PROOF_RESEARCH_2026';
    const payload1 = { title: 'Project Created' };
    const hashInput1 = prevHash + 'u1111111-1111-1111-1111-111111111111' + 'CREATE_PROJECT' + 'PROJECT' + 'p1111111-1111-1111-1111-111111111111' + JSON.stringify(payload1) + timestamp;
    const currentHash1 = computeSHA256(hashInput1);

    const entry1: LedgerEntry = {
      id: 'e1',
      project_id: 'p1111111-1111-1111-1111-111111111111',
      sequence_number: 1,
      actor_id: 'u1111111-1111-1111-1111-111111111111',
      action: 'CREATE_PROJECT',
      entity_type: 'PROJECT',
      entity_id: 'p1111111-1111-1111-1111-111111111111',
      payload: payload1,
      previous_hash: prevHash,
      current_hash: currentHash1,
      created_at: timestamp
    };

    const result = verifyLedgerChain([entry1]);
    expect(result.isValid).toBe(true);
    expect(result.totalEntries).toBe(1);
  });

  it('detects payload tampering on sequence #2 and marks HASH CHAIN BROKEN', () => {
    const timestamp1 = '2026-10-06T10:00:00.000Z';
    const prevHash1 = 'GENESIS_PROOF_RESEARCH_2026';
    const payload1 = { title: 'Project Created' };
    const hashInput1 = prevHash1 + 'u1111111-1111-1111-1111-111111111111' + 'CREATE_PROJECT' + 'PROJECT' + 'p1111111-1111-1111-1111-111111111111' + JSON.stringify(payload1) + timestamp1;
    const currentHash1 = computeSHA256(hashInput1);

    const entry1: LedgerEntry = {
      id: 'e1',
      project_id: 'p1111111-1111-1111-1111-111111111111',
      sequence_number: 1,
      actor_id: 'u1111111-1111-1111-1111-111111111111',
      action: 'CREATE_PROJECT',
      entity_type: 'PROJECT',
      entity_id: 'p1111111-1111-1111-1111-111111111111',
      payload: payload1,
      previous_hash: prevHash1,
      current_hash: currentHash1,
      created_at: timestamp1
    };

    const timestamp2 = '2026-10-06T10:05:00.000Z';
    const payload2 = { version: 'v1.0', action: 'CHARTER_ACCEPTED' };
    const hashInput2 = currentHash1 + 'u3333333-3333-3333-3333-333333333333' + 'ACCEPT_CHARTER' + 'CHARTER' + 'ch1' + JSON.stringify(payload2) + timestamp2;
    const currentHash2 = computeSHA256(hashInput2);

    const tamperedEntry2: LedgerEntry = {
      id: 'e2',
      project_id: 'p1111111-1111-1111-1111-111111111111',
      sequence_number: 2,
      actor_id: 'u3333333-3333-3333-3333-333333333333',
      action: 'ACCEPT_CHARTER',
      entity_type: 'CHARTER',
      entity_id: 'ch1',
      payload: { version: 'v1.0', action: 'CHARTER_REVOKED_TAMPERED' },
      previous_hash: currentHash1,
      current_hash: currentHash2,
      created_at: timestamp2
    };

    const result = verifyLedgerChain([entry1, tamperedEntry2]);
    expect(result.isValid).toBe(false);
    expect(result.brokenSequenceNumber).toBe(2);
    expect(result.reason).toContain('Payload tamper detected');
  });

  it('generates deterministic checkpoint hash from ledger head', () => {
    const entry1: LedgerEntry = {
      id: 'e1',
      project_id: 'p1',
      sequence_number: 1,
      actor_id: 'u1',
      action: 'CREATE',
      entity_type: 'PROJECT',
      entity_id: 'p1',
      payload: {},
      previous_hash: 'GENESIS',
      current_hash: 'hash_head_checkpoint_1234567890',
      created_at: '2026-10-06T10:00:00.000Z'
    };

    const checkpoint = computeLedgerCheckpointHash([entry1]);
    expect(checkpoint).toBe('hash_head_checkpoint_1234567890');
  });

  it('handles UNANCHORED state when no blockchain anchor exists', () => {
    const result = verifyBlockchainAnchor([], null);
    expect(result.status).toBe('UNANCHORED');
    expect(result.isValid).toBe(false);
  });

  it('verifies VALID blockchain anchor matching PostgreSQL head checkpoint', () => {
    const headHash = 'head_hash_ef656b3ee8f5757edb73407883256ef8';
    const entry1: LedgerEntry = {
      id: 'e1',
      project_id: 'p1',
      sequence_number: 1,
      actor_id: 'u1',
      action: 'CREATE',
      entity_type: 'PROJECT',
      entity_id: 'p1',
      payload: {},
      previous_hash: 'GENESIS_PROOF_RESEARCH_2026',
      current_hash: headHash,
      created_at: '2026-10-06T10:00:00.000Z'
    };

    const anchor: BlockchainAnchor = {
      id: 'anc-1',
      project_id: 'p1',
      network: 'EVM Testnet (Chain ID 31337)',
      tx_hash: '0x34468f84e452f7ee88f551605cbd6f0c86ca2e614e612a8ae6b5f1f447ab5c5e',
      block_number: 1,
      anchored_checkpoint: headHash,
      anchored_sequence: 1,
      anchored_at: '2026-10-06T10:05:00.000Z',
      explorer_url: 'https://sepolia.arbiscan.io/tx/0x34468f84e452f7ee88f551605cbd6f0c86ca2e614e612a8ae6b5f1f447ab5c5e'
    };

    const result = verifyBlockchainAnchor([entry1], anchor);
    expect(result.status).toBe('VALID');
    expect(result.isValid).toBe(true);
    expect(result.blockchainCheckpoint).toBe(headHash);
  });

  it('detects TAMPER_DETECTED when local PostgreSQL entry is tampered post-anchoring', () => {
    const headHash = 'head_hash_ef656b3ee8f5757edb73407883256ef8';
    const tamperedEntry: LedgerEntry = {
      id: 'e1',
      project_id: 'p1',
      sequence_number: 1,
      actor_id: 'u1',
      action: 'CREATE',
      entity_type: 'PROJECT',
      entity_id: 'p1',
      payload: { tampered: true },
      previous_hash: 'GENESIS_PROOF_RESEARCH_2026',
      current_hash: headHash,
      created_at: '2026-10-06T10:00:00.000Z'
    };

    const anchor: BlockchainAnchor = {
      id: 'anc-1',
      project_id: 'p1',
      network: 'EVM Testnet (Chain ID 31337)',
      tx_hash: '0x34468f84e452f7ee88f551605cbd6f0c86ca2e614e612a8ae6b5f1f447ab5c5e',
      block_number: 1,
      anchored_checkpoint: headHash,
      anchored_sequence: 1,
      anchored_at: '2026-10-06T10:05:00.000Z',
      explorer_url: 'https://sepolia.arbiscan.io/tx/0x34468f84e452f7ee88f551605cbd6f0c86ca2e614e612a8ae6b5f1f447ab5c5e'
    };

    const result = verifyBlockchainAnchor([tamperedEntry], anchor);
    expect(result.status).toBe('TAMPER_DETECTED');
    expect(result.isValid).toBe(false);
  });
});
