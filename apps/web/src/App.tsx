import React from 'react';
import { BrowserRouter, HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { TaskProvider } from './context/TaskContext';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';

// Core Converted Screens
import { DashboardPage } from './pages/DashboardPage';
import { CreateTaskPage } from './pages/CreateTaskPage';
import { StepSequencerPage } from './pages/StepSequencerPage';
import { AdaptiveStepPage } from './pages/AdaptiveStepPage';

// Public Marketing & Legal
import { LandingPage } from './pages/LandingPage';
import { FeaturesPage } from './pages/FeaturesPage';
import { HowItWorksPage } from './pages/HowItWorksPage';
import { AboutPage } from './pages/AboutPage';
import { FaqPage } from './pages/FaqPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { TermsPage } from './pages/TermsPage';

// Authentication screens
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { ConfirmationPage } from './pages/ConfirmationPage';

// Onboarding
import { OnboardingPage } from './pages/OnboardingPage';

// Task Management
import { TaskListPage } from './pages/TaskListPage';
import { TaskDetailPage } from './pages/TaskDetailPage';
import { TaskEditPage } from './pages/TaskEditPage';

// Execution, Rest & Transparency
import { CompletionPage } from './pages/CompletionPage';
import { RestResumePage } from './pages/RestResumePage';
import { ProgressPage } from './pages/ProgressPage';
import { TaskHistoryPage } from './pages/TaskHistoryPage';
import { ExplainabilityPage } from './pages/ExplainabilityPage';
import { AiTransparencyPage } from './pages/AiTransparencyPage';

// Account & System
import { ProfilePage } from './pages/ProfilePage';
import { SettingsPage } from './pages/SettingsPage';
import { HelpPage } from './pages/HelpPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { OfflinePage } from './pages/OfflinePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { DailyPlannerPage, GoalsPage } from './pages/GoalsPage';

// Electron loads from file:// in production, requiring HashRouter; web browser uses standard BrowserRouter
const isElectronOrFile =
  typeof window !== 'undefined' &&
  (window.location.protocol === 'file:' || 'electronAPI' in window);

const RouterComponent: React.ComponentType<{ children: React.ReactNode }> = isElectronOrFile
  ? HashRouter
  : BrowserRouter;

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <TaskProvider>
        <RouterComponent>
          <Routes>
            <Route path="/" element={<Layout />}>
              {/* Main Dashboard */}
              <Route index element={<DashboardPage />} />
              <Route path="dashboard" element={<Navigate to="/" replace />} />
              <Route path="goals" element={<ProtectedRoute><GoalsPage /></ProtectedRoute>} />
              <Route path="goals/:id" element={<ProtectedRoute><GoalsPage /></ProtectedRoute>} />
              <Route path="planner" element={<ProtectedRoute><DailyPlannerPage /></ProtectedRoute>} />

              {/* Public Marketing & Informational */}
              <Route path="welcome" element={<LandingPage />} />
              <Route path="landing" element={<Navigate to="/welcome" replace />} />
              <Route path="features" element={<FeaturesPage />} />
              <Route path="how-it-works" element={<HowItWorksPage />} />
              <Route path="about" element={<AboutPage />} />
              <Route path="faq" element={<FaqPage />} />
              <Route path="privacy" element={<PrivacyPage />} />
              <Route path="terms" element={<TermsPage />} />

              {/* Authentication */}
              <Route path="login" element={<LoginPage />} />
              <Route path="signup" element={<SignupPage />} />
              <Route path="forgot-password" element={<ForgotPasswordPage />} />
              <Route path="reset-password" element={<ResetPasswordPage />} />
              <Route path="confirmation" element={<ConfirmationPage />} />

              {/* Onboarding */}
              <Route path="onboarding" element={<OnboardingPage />} />

              {/* Task Management */}
              <Route path="tasks" element={<CreateTaskPage />} />
              <Route path="tasks/all" element={<ProtectedRoute><TaskListPage /></ProtectedRoute>} />
              <Route path="tasks/:id" element={<ProtectedRoute><TaskDetailPage /></ProtectedRoute>} />
              <Route path="tasks/:id/edit" element={<ProtectedRoute><TaskEditPage /></ProtectedRoute>} />

              {/* Execution & Adaptive Sequencing */}
              <Route path="step-sequencer" element={<StepSequencerPage />} />
              <Route path="adaptive-step" element={<AdaptiveStepPage />} />
              <Route path="completed" element={<CompletionPage />} />
              <Route path="rest" element={<RestResumePage />} />

              {/* Progress & Transparency */}
              <Route path="progress" element={<ProgressPage />} />
              <Route path="history" element={<TaskHistoryPage />} />
              <Route path="explainability" element={<ExplainabilityPage />} />
              <Route path="ai-transparency" element={<AiTransparencyPage />} />

              {/* User Account & System Preferences */}
              <Route path="profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="help" element={<HelpPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="offline" element={<OfflinePage />} />

              {/* 404 Catch-All */}
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </RouterComponent>
        </TaskProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
