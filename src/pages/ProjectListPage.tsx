import React, { useState, useEffect } from 'react';
import { Project, UserProfile } from '../types';
import { projectService } from '../services/projectService';
import { authService } from '../services/authService';
import { charterService } from '../services/charterService';
import { Link } from 'react-router-dom';

export const ProjectListPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [acceptedMap, setAcceptedMap] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState('');

  useEffect(() => {
    authService.getCurrentProfile().then(async u => {
      setUser(u);
      const projs = await projectService.getProjects();
      setProjects(projs);

      if (u) {
        const accMap: Record<string, boolean> = {};
        await Promise.all(
          projs.map(async p => {
            accMap[p.id] = await charterService.hasAcceptedCharter(p.id, u.id);
          })
        );
        setAcceptedMap(accMap);
      }
    });
  }, []);

  const filtered = projects.filter(p =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.public_summary.toLowerCase().includes(search.toLowerCase())
  );

  const isCandidateRole = user?.role === 'STUDENT' || user?.role === 'EXPERT';

  return (
    <div className="space-y-8">
      {/* Header & Search */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-[#E5E5E5]">
        <div>
          <div className="text-xs font-semibold text-[#888888] uppercase tracking-widest mb-1">
            PROJECTS
          </div>
          <h1 className="text-3xl font-medium text-[#000000]">All Research Projects</h1>
          <p className="text-sm text-[#666666] mt-1">
            Browse active research problem statements and open collaborations.
          </p>
        </div>

        <div className="w-full sm:w-64">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search projects..."
            className="w-full bg-[#FFFFFF] border border-[#CCCCCC] text-[#000000] px-3 py-1.5 rounded focus:outline-none focus:border-[#000000] text-xs placeholder:text-[#888888]"
          />
        </div>
      </div>

      {/* Projects Document List */}
      <div className="divide-y divide-[#E5E5E5] border-t border-b border-[#E5E5E5]">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-[#666666]">
            No research projects found. Post a new problem statement or proposal to get started.
          </div>
        ) : (
          filtered.map(p => {
            const hasJoined = acceptedMap[p.id] || false;

            return (
              <div key={p.id} className="py-6 flex flex-col md:flex-row md:items-start justify-between gap-6 hover:bg-[#F5F5F5] px-2 transition-colors">
                <div className="space-y-2 max-w-3xl">
                  <h2 className="text-lg font-medium text-[#000000] leading-snug">{p.title}</h2>
                  <p className="text-sm text-[#666666] leading-relaxed">{p.public_summary}</p>
                  <div className="text-xs text-[#888888] pt-1 flex items-center gap-3">
                    <span>Sponsor: {p.sponsor_profile?.full_name || 'Research Sponsor'}</span>
                    <span>·</span>
                    <span>{p.engagement_model === 'FUNDED' ? 'Funded Research' : 'Knowledge Sharing'}</span>
                  </div>
                </div>

                <div className="flex flex-col items-end justify-between self-stretch shrink-0">
                  <div className="text-right">
                    <div className="text-base font-semibold text-[#000000]">
                      {p.budget > 0 ? `₹${p.budget.toLocaleString()}` : '₹0'}
                    </div>
                    <div className="text-xs text-[#888888]">
                      {p.budget > 0 ? 'Escrow Backed' : 'Non-Monetary'}
                    </div>
                  </div>

                  <div className="mt-4 md:mt-0 flex items-center gap-2">
                    {isCandidateRole && !hasJoined ? (
                      <Link
                        to={`/projects/${p.id}?tab=charter&action=join`}
                        className="px-3 py-1.5 bg-[#000000] hover:bg-[#1A1A1A] text-[#FFFFFF] font-medium text-xs rounded transition-colors inline-flex items-center gap-1 shadow-sm"
                      >
                        Join Project (Accept Charter) →
                      </Link>
                    ) : (
                      <>
                        {hasJoined && (
                          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            ✓ Member
                          </span>
                        )}
                        <Link
                          to={`/projects/${p.id}`}
                          className="text-xs font-medium text-[#000000] hover:underline"
                        >
                          View Project →
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
