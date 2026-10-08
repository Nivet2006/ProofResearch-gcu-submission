import React, { useState, useEffect } from 'react';
import { LedgerEntry, VerificationResult, BlockchainVerificationResult, BlockchainAnchor } from '../types';
import { ledgerService } from '../services/ledgerService';

interface LedgerVerificationProps {
  projectId: string;
  userRole: string;
}

export const LedgerVerificationView: React.FC<LedgerVerificationProps> = ({ projectId, userRole }) => {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [verification, setVerification] = useState<VerificationResult | null>(null);
  const [blockchainAnchor, setBlockchainAnchor] = useState<BlockchainAnchor | null>(null);
  const [anchorVerification, setAnchorVerification] = useState<BlockchainVerificationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [anchoring, setAnchoring] = useState(false);
  const [tampering, setTampering] = useState(false);

  const loadLedgerAndAnchor = async () => {
    setLoading(true);
    try {
      const data = await ledgerService.getLedgerEntries(projectId);
      setEntries(data);

      const localResult = await ledgerService.verifyLedger(projectId);
      setVerification(localResult);

      const anchorData = await ledgerService.getBlockchainAnchor(projectId);
      setBlockchainAnchor(anchorData);

      const bcResult = await ledgerService.verifyBlockchainAnchor(projectId);
      setAnchorVerification(bcResult);
    } catch (err) {
      console.error('Error loading live ledger or anchor data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLedgerAndAnchor();
  }, [projectId]);

  const handleVerify = async () => {
    setLoading(true);
    try {
      const data = await ledgerService.getLedgerEntries(projectId);
      setEntries(data);

      const localResult = await ledgerService.verifyLedger(projectId);
      setVerification(localResult);

      const bcResult = await ledgerService.verifyBlockchainAnchor(projectId);
      setAnchorVerification(bcResult);
    } finally {
      setLoading(false);
    }
  };

  const handleAnchorToBlockchain = async () => {
    setAnchoring(true);
    try {
      const anchorRecord = await ledgerService.anchorLedgerToBlockchain(projectId);
      setBlockchainAnchor(anchorRecord);
      await handleVerify();
    } catch (err: any) {
      alert(`Blockchain Anchoring Error: ${err.message || 'Transaction failed.'}`);
    } finally {
      setAnchoring(false);
    }
  };

  const handleSimulateTamper = async () => {
    setTampering(true);
    try {
      const target = entries.find(e => e.sequence_number === 2) || entries[1] || entries[0];
      if (target) {
        await ledgerService.triggerDemoTamper(target.id, {
          version: 'v1.0-TAMPERED-BY-ATTACKER',
          acceptance_hash: 'ILLEGAL_TAMPERED_HASH',
          tampered_at: new Date().toISOString()
        });
      }
      await handleVerify();
    } catch (err) {
      console.error('Tamper simulation error', err);
    } finally {
      setTampering(false);
    }
  };

  const handleResetLedger = async () => {
    ledgerService.resetDemoLedger();
    await loadLedgerAndAnchor();
  };

  return (
    <div className="space-y-8 text-xs font-sans text-[#111111]">
      {/* Header & Main Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E5E5]">
        <div>
          <div className="text-[11px] font-semibold text-[#888888] uppercase tracking-wider">
            AUTHORITATIVE POSTGRESQL LEDGER & EXTERNAL PROOF
          </div>
          <h3 className="text-lg font-bold text-[#000000] mt-0.5">
            Tamper-Evident SHA-256 Ledger ({entries.length} sequence entries)
          </h3>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleVerify}
            disabled={loading}
            className="px-4 py-2 bg-[#000000] hover:bg-[#222222] text-[#FFFFFF] font-medium text-xs tracking-wider uppercase transition-colors disabled:opacity-50"
          >
            {loading ? 'VERIFYING...' : 'VERIFY LIVE LEDGER'}
          </button>

          {userRole === 'ADMIN' && (
            <>
              <button
                onClick={handleAnchorToBlockchain}
                disabled={anchoring || verification?.isValid === false}
                className="px-4 py-2 bg-[#FFFFFF] hover:bg-[#F5F5F5] text-[#000000] border border-[#000000] font-medium text-xs tracking-wider uppercase transition-colors disabled:opacity-40"
                title="Submit current SHA-256 head checkpoint hash to EVM Testnet"
              >
                {anchoring ? 'ANCHORING...' : 'ANCHOR TO BLOCKCHAIN'}
              </button>

              <button
                onClick={handleSimulateTamper}
                disabled={tampering}
                className="px-4 py-2 bg-[#F5F5F5] hover:bg-[#E5E5E5] text-[#000000] border border-[#CCCCCC] font-medium text-xs tracking-wider uppercase transition-colors disabled:opacity-50"
                title="Admin tamper demonstration (RPC demo_tamper_ledger_entry)"
              >
                {tampering ? 'MUTATING...' : 'SIMULATE TAMPER'}
              </button>
            </>
          )}

          <button
            onClick={handleResetLedger}
            className="px-3 py-2 bg-[#FFFFFF] hover:bg-[#F5F5F5] text-[#666666] border border-[#E5E5E5] text-xs font-medium uppercase transition-colors"
            title="Reset Ledger State"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Primary PostgreSQL Verification Banner */}
      {verification && (
        <div
          className={`p-5 border ${
            verification.isValid
              ? 'bg-[#F5F5F5] border-[#E5E5E5] text-[#000000]'
              : 'bg-[#000000] border-[#000000] text-[#FFFFFF]'
          } flex flex-col sm:flex-row sm:items-center justify-between gap-4`}
        >
          <div className="space-y-1">
            <div className="font-bold text-sm uppercase tracking-wider">
              {verification.isValid ? 'INTEGRITY VERIFIED' : 'INTEGRITY FAILURE'}
            </div>
            <div className="text-xs opacity-90">
              {verification.isValid
                ? `All ${verification.totalEntries} PostgreSQL entries verified with unbroken SHA-256 hash pointers.`
                : `HASH CHAIN BROKEN AT ENTRY #${verification.brokenSequenceNumber} (${verification.reason})`}
            </div>
          </div>

          <div className="shrink-0 font-bold font-mono text-xs uppercase tracking-wider">
            {verification.isValid ? 'STATUS: VALID ✓' : `BROKEN AT ENTRY #${verification.brokenSequenceNumber}`}
          </div>
        </div>
      )}

      {/* EXTERNAL PROOF UI SECTION */}
      <div className="bg-[#FFFFFF] border border-[#E5E5E5] p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-3">
          <div>
            <h4 className="text-sm font-bold text-[#000000] uppercase tracking-wider">
              EXTERNAL PROOF (BLOCKCHAIN ANCHOR)
            </h4>
            <p className="text-xs text-[#666666] mt-0.5">
              Cryptographic ledger anchor checkpoint on EVM Testnet (Zero private data stored on-chain).
            </p>
          </div>

          <div>
            {anchorVerification?.status === 'VALID' && (
              <span className="px-3 py-1 bg-[#000000] text-[#FFFFFF] font-bold text-xs uppercase tracking-wider">
                BLOCKCHAIN ANCHOR: VALID ✓
              </span>
            )}

            {anchorVerification?.status === 'TAMPER_DETECTED' && (
              <span className="px-3 py-1 bg-[#000000] text-[#FFFFFF] border border-[#000000] font-bold text-xs uppercase tracking-wider">
                BLOCKCHAIN ANCHOR: TAMPER DETECTED ❌
              </span>
            )}

            {anchorVerification?.status === 'UNANCHORED' && (
              <span className="px-3 py-1 bg-[#F5F5F5] text-[#666666] border border-[#E5E5E5] font-semibold text-xs uppercase tracking-wider">
                STATUS: UNANCHORED
              </span>
            )}

            {anchorVerification?.status === 'PENDING' && (
              <span className="px-3 py-1 bg-[#F5F5F5] text-[#111111] border border-[#CCCCCC] font-semibold text-xs uppercase tracking-wider">
                STATUS: PENDING ⏳
              </span>
            )}

            {anchorVerification?.status === 'TRANSACTION_FAILED' && (
              <span className="px-3 py-1 bg-[#000000] text-[#FFFFFF] font-bold text-xs uppercase tracking-wider">
                TRANSACTION FAILED ❌
              </span>
            )}
          </div>
        </div>

        {blockchainAnchor ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-[#F5F5F5] border border-[#E5E5E5] space-y-1">
              <div className="text-[10px] font-semibold text-[#666666] uppercase tracking-wider">
                Anchored Network
              </div>
              <div className="font-semibold text-[#111111]">
                {blockchainAnchor.network}
              </div>
            </div>

            <div className="p-3 bg-[#F5F5F5] border border-[#E5E5E5] space-y-1">
              <div className="text-[10px] font-semibold text-[#666666] uppercase tracking-wider">
                On-Chain Transaction Hash
              </div>
              <div className="font-mono text-[#000000] truncate">
                <a
                  href={blockchainAnchor.explorer_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-[#444444]"
                  title={blockchainAnchor.tx_hash}
                >
                  {blockchainAnchor.tx_hash}
                </a>
              </div>
            </div>

            <div className="p-3 bg-[#F5F5F5] border border-[#E5E5E5] space-y-1">
              <div className="text-[10px] font-semibold text-[#666666] uppercase tracking-wider">
                Anchored SHA-256 Checkpoint Hash
              </div>
              <div className="font-mono text-[11px] text-[#000000] truncate" title={blockchainAnchor.anchored_checkpoint}>
                {blockchainAnchor.anchored_checkpoint}
              </div>
            </div>

            <div className="p-3 bg-[#F5F5F5] border border-[#E5E5E5] space-y-1">
              <div className="text-[10px] font-semibold text-[#666666] uppercase tracking-wider">
                Block Number & Timestamp
              </div>
              <div className="font-mono text-[#111111]">
                Block #{blockchainAnchor.block_number} — {new Date(blockchainAnchor.anchored_at).toLocaleString()}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-[#F5F5F5] border border-[#E5E5E5] text-[#666666] text-xs text-center">
            No on-chain checkpoint anchor has been submitted for this project ledger yet. Click <strong>ANCHOR TO BLOCKCHAIN</strong> to broadcast a real testnet transaction.
          </div>
        )}

        {anchorVerification && anchorVerification.reason && (
          <div className="mt-3 p-3 bg-[#F5F5F5] border-l-2 border-[#000000] text-xs text-[#111111]">
            <span className="font-semibold">Anchor Verification Note:</span> {anchorVerification.reason}
          </div>
        )}
      </div>

      {/* Ledger Table */}
      <div className="overflow-x-auto border border-[#E5E5E5] bg-[#FFFFFF]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#F5F5F5] border-b border-[#E5E5E5] text-[#666666] text-[11px] font-semibold uppercase tracking-wider">
              <th className="p-3">Seq</th>
              <th className="p-3">Timestamp</th>
              <th className="p-3">Actor</th>
              <th className="p-3">Action</th>
              <th className="p-3">Entity</th>
              <th className="p-3">Previous Hash</th>
              <th className="p-3">Current Hash</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E5E5] text-xs">
            {entries.map((e) => {
              const isCorrupted = verification && !verification.isValid && verification.brokenSequenceNumber === e.sequence_number;

              return (
                <tr
                  key={e.id}
                  className={isCorrupted ? 'bg-[#000000] text-[#FFFFFF] font-medium' : 'hover:bg-[#F5F5F5]'}
                >
                  <td className="p-3 font-mono text-[#666666]">
                    {e.sequence_number < 10 ? `0${e.sequence_number}` : e.sequence_number}
                  </td>
                  <td className="p-3 text-[#666666]">
                    {new Date(e.created_at).toLocaleTimeString()}
                  </td>
                  <td className="p-3 font-medium">
                    {e.actor_profile?.full_name || e.actor_id.substring(0, 8)}
                  </td>
                  <td className="p-3 font-semibold">{e.action}</td>
                  <td className="p-3 text-[#666666]">{e.entity_type}</td>
                  <td className="p-3 font-mono text-[11px] opacity-75" title={e.previous_hash}>
                    {e.previous_hash.substring(0, 10)}...
                  </td>
                  <td className="p-3 font-mono text-[11px] opacity-75" title={e.current_hash}>
                    {e.current_hash.substring(0, 10)}...
                  </td>
                  <td className="p-3">
                    {isCorrupted ? (
                      <span className="px-2 py-0.5 bg-[#FFFFFF] text-[#000000] font-bold text-[10px] uppercase tracking-wider">
                        CORRUPTED ❌
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-[#F5F5F5] text-[#000000] border border-[#CCCCCC] text-[10px] font-semibold">
                        VALID ✓
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LedgerVerificationView;
