import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { UserProfile } from './types';
import { seedService } from './services/seedService';
import { AppShell } from './components/AppShell';
import { AuthGuard } from './components/AuthGuard';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProjectListPage } from './pages/ProjectListPage';
import { ProjectDetailPage } from './pages/ProjectDetailPage';
import { ProjectNewPage } from './pages/ProjectNewPage';
import { MatchingPage } from './pages/MatchingPage';
import { WorkspacePage } from './pages/WorkspacePage';
import { ContributionsPage } from './pages/ContributionsPage';
import { RewardsPage } from './pages/RewardsPage';
import { LedgerPage } from './pages/LedgerPage';
import { AdminPage } from './pages/AdminPage';
import { ProfilePage } from './pages/ProfilePage';
import { ExpertApplicationPage } from './pages/ExpertApplicationPage';
import { SemanticSimilarityAnalysis } from './components/SemanticSimilarityAnalysis';

export const App: React.FC = () => {
  const [, setCurrentUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    seedService.ensureDatabaseSeeded();
  }, []);

  return (
    <Router>
      <AppShell onUserChange={setCurrentUser}>
        <Routes>
          {/* Public / Unauthenticated Route */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Routes wrapped in AuthGuard */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          
          <Route
            path="/dashboard"
            element={
              <AuthGuard>
                <DashboardPage />
              </AuthGuard>
            }
          />
          
          <Route
            path="/projects"
            element={
              <AuthGuard>
                <ProjectListPage />
              </AuthGuard>
            }
          />
          
          <Route
            path="/projects/:id"
            element={
              <AuthGuard>
                <ProjectDetailPage />
              </AuthGuard>
            }
          />
          
          <Route
            path="/projects/:id/matching"
            element={
              <AuthGuard>
                <MatchingPage />
              </AuthGuard>
            }
          />
          
          <Route
            path="/projects/:id/workspace"
            element={
              <AuthGuard>
                <WorkspacePage />
              </AuthGuard>
            }
          />
          
          <Route
            path="/projects/:id/contributions"
            element={
              <AuthGuard>
                <ContributionsPage />
              </AuthGuard>
            }
          />
          
          <Route
            path="/projects/:id/rewards"
            element={
              <AuthGuard>
                <RewardsPage />
              </AuthGuard>
            }
          />
          
          <Route
            path="/projects/:id/ledger"
            element={
              <AuthGuard>
                <LedgerPage />
              </AuthGuard>
            }
          />

          {/* Role-Specific Protected Routes */}
          <Route
            path="/sponsor/projects/new"
            element={
              <AuthGuard allowedRoles={['SPONSOR', 'ADMIN']}>
                <ProjectNewPage />
              </AuthGuard>
            }
          />
          
          <Route
            path="/admin/ledger"
            element={
              <AuthGuard allowedRoles={['ADMIN']}>
                <AdminPage />
              </AuthGuard>
            }
          />

          <Route
            path="/profile"
            element={
              <AuthGuard>
                <ProfilePage />
              </AuthGuard>
            }
          />

          <Route
            path="/expert-apply"
            element={
              <AuthGuard allowedRoles={['STUDENT', 'EXPERT', 'ADMIN']}>
                <ExpertApplicationPage />
              </AuthGuard>
            }
          />

          <Route
            path="/similarity"
            element={
              <AuthGuard>
                <div className="space-y-4">
                  <div className="pb-4 border-b border-neutral-200">
                    <h1 className="text-2xl font-semibold text-neutral-900">ML Semantic Similarity Engine</h1>
                    <p className="text-sm text-neutral-500 mt-1">384-dimensional vector embeddings · sentence-transformers/all-MiniLM-L6-v2 · Rule-based concept fallback</p>
                  </div>
                  <SemanticSimilarityAnalysis />
                </div>
              </AuthGuard>
            }
          />

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AppShell>
    </Router>
  );
};

export default App;
