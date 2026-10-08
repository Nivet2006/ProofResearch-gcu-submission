import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { UserRole, Project } from '../types';
import { projectService } from '../services/projectService';

interface SidebarProps {
  role: UserRole;
  activeProjectId?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ role, activeProjectId }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Extract project ID from URL if present (e.g. /projects/p1111111-1111-1111-1111-111111111111/...)
  const match = location.pathname.match(/\/projects\/([^\/]+)/);
  const currentUrlProjectId = match && match[1] !== 'new' ? match[1] : undefined;
  const activeProjId = activeProjectId || currentUrlProjectId;

  useEffect(() => {
    projectService.getProjects().then(setProjects);
  }, []);

  useEffect(() => {
    if (activeProjId) {
      projectService.getProjectById(activeProjId).then(proj => {
        if (proj) setActiveProject(proj);
      });
    } else {
      setActiveProject(null);
    }
  }, [activeProjId]);

  const selectedProject = projects.find(p => p.id === activeProjId) || activeProject || (projects.length > 0 ? projects[0] : null);

  const getNavItemClass = (isActive: boolean) =>
    `flex items-center justify-between px-3 py-1.5 font-medium text-xs transition-colors duration-150 border-l-2 ${
      isActive
        ? 'border-neutral-900 bg-neutral-100/80 text-neutral-900 font-medium'
        : 'border-transparent text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50'
    }`;

  return (
    <aside className="w-60 bg-[#FAFAFA] border-r border-[#E5E5E5] flex flex-col justify-between text-xs select-none shrink-0">
      <div className="py-5 space-y-4">
        {/* Global Navigation */}
        <div className="space-y-1">
          <div className="px-4 text-[10px] font-semibold text-[#888888] uppercase tracking-widest mb-1.5">
            GLOBAL
          </div>
          <nav className="space-y-0.5">
            <NavLink to="/dashboard" className={({ isActive }) => getNavItemClass(isActive)}>
              <span>OVERVIEW</span>
            </NavLink>

            <NavLink to="/projects" end className={({ isActive }) => getNavItemClass(isActive)}>
              <span>PROJECTS</span>
            </NavLink>

            {(role === 'SPONSOR' || role === 'ADMIN') && (
              <NavLink to="/sponsor/projects/new" className={({ isActive }) => getNavItemClass(isActive)}>
                <span>+ New Project</span>
              </NavLink>
            )}

            {(role === 'STUDENT' || role === 'EXPERT') && (
              <NavLink to="/profile" className={({ isActive }) => getNavItemClass(isActive)}>
                <span>MY PROFILE</span>
              </NavLink>
            )}

            {(role === 'STUDENT' || role === 'EXPERT') && (
              <NavLink to="/expert-apply" className={({ isActive }) => getNavItemClass(isActive)}>
                <span>EXPERT VERIFICATION</span>
                <span className="text-[9px] font-semibold text-purple-600 uppercase">Apply</span>
              </NavLink>
            )}
          </nav>
        </div>

        {/* Compact Project Context & Switcher */}
        {activeProjId && (
          <div className="relative mx-3 my-3 p-3 bg-[#FFFFFF] border border-[#E5E5E5]">
            <div className="text-[10px] font-semibold text-[#888888] uppercase tracking-widest mb-1 flex items-center justify-between">
              <span>PROJECT</span>
              <span className="font-mono text-[9px] text-[#888888]">
                {selectedProject?.id ? selectedProject.id.substring(0, 8).toUpperCase() : 'PROJECT'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="w-full flex items-center justify-between text-left group cursor-pointer"
            >
              <div className="truncate pr-1">
                <div className="font-bold text-xs text-[#000000] truncate">
                  {selectedProject?.title || (activeProjId ? `Project ${activeProjId.substring(0, 8)}` : 'Research Project')}
                </div>
                <div className="text-[10px] text-[#666666] truncate mt-0.5 font-mono">
                  {selectedProject?.engagement_model === 'FUNDED' ? 'Funded Research' : 'Knowledge Sharing'}
                </div>
              </div>
              <span className="text-xs text-[#666666] group-hover:text-[#000000] shrink-0 font-bold">
                {dropdownOpen ? '▴' : '▾'}
              </span>
            </button>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-[#FFFFFF] border border-[#E5E5E5] shadow-md z-50 py-1 text-xs">
                <div className="px-3 py-1 text-[10px] font-semibold text-[#888888] uppercase tracking-widest border-b border-[#E5E5E5]">
                  Your Projects
                </div>
                {projects.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setDropdownOpen(false);
                      navigate(`/projects/${p.id}`);
                    }}
                    className={`w-full text-left px-3 py-2 hover:bg-[#F5F5F5] flex flex-col ${
                      p.id === activeProjId ? 'bg-[#F5F5F5] font-semibold border-l-2 border-[#000000]' : ''
                    }`}
                  >
                    <span className="text-xs text-[#000000] truncate">{p.title}</span>
                    <span className="text-[10px] font-mono text-[#888888]">{p.id.substring(0, 8).toUpperCase()}</span>
                  </button>
                ))}
                {(role === 'SPONSOR' || role === 'ADMIN') && (
                  <button
                    type="button"
                    onClick={() => {
                      setDropdownOpen(false);
                      navigate('/sponsor/projects/new');
                    }}
                    className="w-full text-left px-3 py-2 border-t border-[#E5E5E5] hover:bg-[#F5F5F5] text-[#000000] font-medium text-xs"
                  >
                    + New Project
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Project-Specific Navigation (Shown when project selected) */}
        {activeProjId && (
          <div className="space-y-4">
            {/* SECTION 1: RESEARCH */}
            <div className="space-y-1">
              <div className="px-4 text-[10px] font-semibold text-[#888888] uppercase tracking-widest mb-1.5">
                RESEARCH
              </div>
              <nav className="space-y-0.5">
                <NavLink to={`/projects/${activeProjId}`} end className={({ isActive }) => getNavItemClass(isActive)}>
                  <span>Project & Charter</span>
                </NavLink>

                <NavLink to={`/projects/${activeProjId}/workspace`} className={({ isActive }) => getNavItemClass(isActive && location.pathname.includes('/workspace'))}>
                  <span>Scope</span>
                </NavLink>

                <NavLink to={`/projects/${activeProjId}/matching`} className={({ isActive }) => getNavItemClass(isActive)}>
                  <span>Matching</span>
                  <span className="text-[10px] text-[#888888] font-normal">2 ranked</span>
                </NavLink>

                <NavLink to={`/projects/${activeProjId}/workspace`} className={({ isActive }) => getNavItemClass(isActive && location.pathname.endsWith('/workspace'))}>
                  <span>Workspace</span>
                </NavLink>
              </nav>
            </div>

            {/* SECTION 2: DELIVERY */}
            <div className="space-y-1">
              <div className="px-4 text-[10px] font-semibold text-[#888888] uppercase tracking-widest mb-1.5">
                DELIVERY
              </div>
              <nav className="space-y-0.5">
                <NavLink to={`/projects/${activeProjId}/contributions`} className={({ isActive }) => getNavItemClass(isActive && location.pathname.endsWith('/contributions'))}>
                  <span>Contributions</span>
                </NavLink>

                <NavLink to={`/projects/${activeProjId}/contributions`} className={({ isActive }) => getNavItemClass(isActive && location.pathname.includes('/contributions'))}>
                  <span>Review & Integrity</span>
                  <span className="text-[10px] text-[#888888] font-normal">1 flagged</span>
                </NavLink>

                <NavLink to={`/projects/${activeProjId}/rewards`} className={({ isActive }) => getNavItemClass(isActive)}>
                  <span>Escrow & Rewards</span>
                  <span className="text-[10px] text-[#888888] font-mono font-normal">₹25k</span>
                </NavLink>
              </nav>
            </div>

            {/* SECTION 3: PROVENANCE */}
            <div className="space-y-1">
              <div className="px-4 text-[10px] font-semibold text-[#888888] uppercase tracking-widest mb-1.5">
                PROVENANCE
              </div>
              <nav className="space-y-0.5">
                <NavLink to={`/projects/${activeProjId}/ledger`} className={({ isActive }) => getNavItemClass(isActive)}>
                  <span>Audit Ledger</span>
                  <span className="text-[10px] text-[#000000] font-mono font-semibold">VALID ✓</span>
                </NavLink>
              </nav>
            </div>
          </div>
        )}

        {/* Administration (Admin-only) */}
        {role === 'ADMIN' && (
          <div className="space-y-1 pt-2">
            <div className="px-4 text-[10px] font-semibold text-[#888888] uppercase tracking-widest mb-1.5">
              ADMINISTRATION
            </div>
            <nav className="space-y-0.5">
              <NavLink to="/admin/ledger" className={({ isActive }) => getNavItemClass(isActive)}>
                <span>Integrity Verification</span>
              </NavLink>
              <NavLink to="/admin/ledger" className={({ isActive }) => getNavItemClass(location.pathname === '/admin/ledger' && isActive)}>
                <span>Expert Review</span>
                <span className="text-[9px] font-semibold text-purple-600">Panel</span>
              </NavLink>
            </nav>
          </div>
        )}
      </div>

      {/* Footer tagline */}
      <div className="p-4 border-t border-[#E5E5E5] bg-[#F5F5F5] text-[10px] text-[#666666] leading-relaxed">
        <span className="font-semibold text-[#000000]">System:</span> AI proposes. Humans approve. The ledger records.
      </div>
    </aside>
  );
};

export default Sidebar;
