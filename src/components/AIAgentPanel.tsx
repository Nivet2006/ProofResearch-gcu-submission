import React, { useState } from 'react';
import { aiService } from '../services/aiService';

interface AIAgentPanelProps {
  projectId: string;
  humanOwnerId: string;
  humanOwnerName: string;
  onActionApplied?: (suggestion: string) => void;
}

export const AIAgentPanel: React.FC<AIAgentPanelProps> = ({
  projectId,
  humanOwnerId,
  humanOwnerName,
  onActionApplied
}) => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<
    Array<{ sender: 'user' | 'agent'; text: string; suggestion?: string; aiActionId?: string; approved?: boolean }>
  >([
    {
      sender: 'agent',
      text: `Hello ${humanOwnerName}. Project-scoped AI Assistant initialized. How can I assist with CLAHE pre-processing or MobileNetV3 quantization scripts?`
    }
  ]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || loading) return;

    const userMsg = prompt.trim();
    setPrompt('');
    setMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
    setLoading(true);

    try {
      const res = await aiService.queryScopedAgent(projectId, humanOwnerId, userMsg);
      setMessages(prev => [
        ...prev,
        {
          sender: 'agent',
          text: res.response,
          suggestion: res.suggestion,
          aiActionId: res.aiActionId,
          approved: false
        }
      ]);
    } catch (err) {
      console.error('AI agent query error', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveAction = (index: number, suggestion: string) => {
    setMessages(prev =>
      prev.map((msg, idx) => (idx === index ? { ...msg, approved: true } : msg))
    );
    if (onActionApplied) {
      onActionApplied(suggestion);
    }
  };

  return (
    <div className="border border-[#E5E5E5] bg-[#FFFFFF] rounded flex flex-col h-[520px] text-xs">
      {/* Agent Header */}
      <div className="p-4 border-b border-[#E5E5E5] bg-[#F5F5F5] flex items-center justify-between">
        <div>
          <div className="font-semibold text-[#000000]">
            AI Assistant (Scoped)
          </div>
          <div className="text-[11px] text-[#666666] mt-0.5">
            Human Owner: {humanOwnerName}
          </div>
        </div>

        <div className="text-right text-[11px] text-[#888888] hidden sm:block">
          <div>Policy: Mandatory Approval</div>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] p-3.5 rounded text-xs leading-relaxed ${
                m.sender === 'user'
                  ? 'bg-[#000000] text-[#FFFFFF]'
                  : 'bg-[#F5F5F5] text-[#000000] border border-[#E5E5E5] space-y-2'
              }`}
            >
              <p>{m.text}</p>

              {/* Action Suggestion & Approval Gate */}
              {m.suggestion && (
                <div className="mt-3 pt-2 border-t border-[#E5E5E5] bg-[#FFFFFF] p-3 rounded border border-[#E5E5E5] space-y-2">
                  <div className="text-[11px] font-semibold text-[#000000]">
                    PROPOSED ACTION:
                  </div>
                  <div className="text-[#666666] text-[11px]">{m.suggestion}</div>

                  {m.approved ? (
                    <div className="text-[#000000] font-semibold text-[11px]">
                      ✓ Approved by {humanOwnerName} (ai_assisted = true)
                    </div>
                  ) : (
                    <button
                      onClick={() => handleApproveAction(idx, m.suggestion!)}
                      className="w-full py-1.5 bg-[#000000] hover:bg-[#1A1A1A] text-[#FFFFFF] font-medium text-[11px] rounded transition-colors"
                    >
                      APPROVE & APPLY ACTION
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="text-[#888888] text-xs">
            Analyzing project context...
          </div>
        )}
      </div>

      {/* Input Bar */}
      <form onSubmit={handleSend} className="p-3 border-t border-[#E5E5E5] bg-[#F5F5F5] flex gap-2">
        <input
          type="text"
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder="Ask AI assistant for CLAHE preprocessing or quantization scripts..."
          className="flex-1 bg-[#FFFFFF] border border-[#CCCCCC] text-[#000000] px-3 py-1.5 rounded focus:outline-none focus:border-[#000000] text-xs placeholder:text-[#888888]"
        />
        <button
          type="submit"
          disabled={loading || !prompt.trim()}
          className="px-4 py-1.5 bg-[#000000] hover:bg-[#1A1A1A] text-[#FFFFFF] font-medium rounded transition-colors text-xs disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
};
