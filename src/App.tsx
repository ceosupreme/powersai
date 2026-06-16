import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/context/AuthContext";
import { RoleProvider } from "@/context/RoleContext";
import { AppProvider } from "@/context/AppContext";
import { PreviewProvider } from "@/context/PreviewContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { queryClient } from "@/lib/queryClient";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import WeeklyReview from "./pages/WeeklyReview";
import Sales from "./pages/Sales";
import Labor from "./pages/Labor";
import Operations from "./pages/Operations";
import GuestExperience from "./pages/GuestExperience";
import Insights from "./pages/Insights";
import Admin from "./pages/Admin";
import AdminSyncHealth from "./pages/AdminSyncHealth";
import GrowthAudit from "./pages/GrowthAudit";
import MarketingHub from "./pages/MarketingHub";
import Tasks from "./pages/Tasks";
import Logs from "./pages/Logs";
import LogNew from "./pages/LogNew";
import LogDetail from "./pages/LogDetail";
import LogInterview from "./pages/LogInterview";
import { useIntegrationDisabled } from "@/hooks/useIntegrationDisabled";
import Chat from "./pages/Chat";
import LeadShiftDashboard from "./pages/LeadShiftDashboard";
import StaffTasksPage from "./pages/StaffTasksPage";
import StaffChatPage from "./pages/StaffChatPage";
import StaffLogsPage from "./pages/StaffLogsPage";
import StaffMyShift from "./pages/StaffMyShift";
import PortfolioOverview from "./pages/PortfolioOverview";
import Employees from "./pages/Employees";
import EmployeeDetail from "./pages/EmployeeDetail";
import InsightsAudit from "./pages/InsightsAudit";
import NotFound from "./pages/NotFound";
import RolePreview from "./pages/RolePreview";
import Workspace from "./pages/Workspace";
import BrandKit from "./pages/BrandKit";
import ContentPipeline from "./pages/ContentPipeline";
import ChannelRevenue from "./pages/ChannelRevenue";
import AffiliatePrograms from "./pages/AffiliatePrograms";
import Products from "./pages/Products";
import Crm from "./pages/Crm";
import Inbox from "./pages/Inbox";
import MarketingSite from "./pages/MarketingSite";
import HelpCenter from "./pages/HelpCenter";
import LaunchChecklist from "./pages/LaunchChecklist";
import { SetupWizard } from "@/components/help/SetupWizard";

// Re-export for any remaining imports from App
export { queryClient };

const App = () => {
  return (
    <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <AuthProvider>
          <RoleProvider>
          <PreviewProvider>
          <AppProvider>
            <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <SetupWizard />
              <Routes>
                <Route path="/auth" element={<Login />} />
                <Route path="/login" element={<Login />} />
                {/* Public landing page — signed-out visitors see marketing,
                    signed-in users get redirected into the app (handled inside Marketing). */}
                <Route path="/" element={<MarketingSite />} />
                <Route path="/portfolio" element={
                  <ProtectedRoute allowedRoles={['owner']}>
                    <AppLayout><PortfolioOverview /></AppLayout>
                  </ProtectedRoute>
                } />
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <AppLayout><Dashboard /></AppLayout>
                  </ProtectedRoute>
                } />
                <Route path="/workspace" element={
                  <ProtectedRoute>
                    <AppLayout><Workspace /></AppLayout>
                  </ProtectedRoute>
                } />
                <Route path="/weekly-review" element={
                  <ProtectedRoute>
                    <AppLayout><WeeklyReview /></AppLayout>
                  </ProtectedRoute>
                } />
                <Route path="/sales" element={
                  <ProtectedRoute>
                    <AppLayout><Sales /></AppLayout>
                  </ProtectedRoute>
                } />
                <Route path="/labor" element={
                  <ProtectedRoute>
                    <AppLayout><Labor /></AppLayout>
                  </ProtectedRoute>
                } />
                <Route path="/operations" element={
                  <ProtectedRoute>
                    <AppLayout><Operations /></AppLayout>
                  </ProtectedRoute>
                } />
                <Route path="/guest-experience" element={
                  <ProtectedRoute>
                    <AppLayout><GuestExperience /></AppLayout>
                  </ProtectedRoute>
                } />
                <Route path="/insights" element={
                  <ProtectedRoute>
                    <AppLayout><Insights /></AppLayout>
                  </ProtectedRoute>
                } />
                <Route path="/insights/audit" element={
                  <ProtectedRoute>
                    <AppLayout><InsightsAudit /></AppLayout>
                  </ProtectedRoute>
                } />
                <Route path="/social-media" element={<Navigate to="/marketing-hub" replace />} />
                <Route path="/marketing" element={<Navigate to="/marketing-hub" replace />} />
                <Route path="/admin" element={
                  <ProtectedRoute allowedRoles={['owner']}>
                    <AppLayout><Admin /></AppLayout>
                  </ProtectedRoute>
                } />
                <Route path="/admin/sync-health" element={
                  <ProtectedRoute allowedRoles={['owner']}>
                    <AppLayout><AdminSyncHealth /></AppLayout>
                  </ProtectedRoute>
                } />
                <Route path="/growth-audit" element={
                  <ProtectedRoute allowedRoles={['owner']} pageKey="growth_audit">
                    <AppLayout><GrowthAudit /></AppLayout>
                  </ProtectedRoute>
                } />
                <Route path="/marketing-hub" element={
                  <ProtectedRoute allowedRoles={['owner']} pageKey="marketing_hub">
                    <AppLayout><MarketingHub /></AppLayout>
                  </ProtectedRoute>
                } />
                <Route path="/brand-kit" element={
                  <ProtectedRoute pageKey="brand_kit">
                    <AppLayout><BrandKit /></AppLayout>
                  </ProtectedRoute>
                } />
                <Route path="/content" element={
                  <ProtectedRoute pageKey="content_pipeline">
                    <AppLayout><ContentPipeline /></AppLayout>
                  </ProtectedRoute>
                } />
                <Route path="/revenue" element={
                  <ProtectedRoute pageKey="revenue">
                    <AppLayout><ChannelRevenue /></AppLayout>
                  </ProtectedRoute>
                } />
                <Route path="/affiliate-programs" element={
                  <ProtectedRoute pageKey="affiliate_programs">
                    <AppLayout><AffiliatePrograms /></AppLayout>
                  </ProtectedRoute>
                } />
                <Route path="/products" element={
                  <ProtectedRoute pageKey="products">
                    <AppLayout><Products /></AppLayout>
                  </ProtectedRoute>
                } />
                <Route path="/crm" element={
                  <ProtectedRoute pageKey="crm">
                    <AppLayout><Crm /></AppLayout>
                  </ProtectedRoute>
                } />
                <Route path="/inbox" element={
                  <ProtectedRoute pageKey="capture_inbox">
                    <AppLayout><Inbox /></AppLayout>
                  </ProtectedRoute>
                } />
                <Route path="/help" element={
                  <ProtectedRoute>
                    <AppLayout><HelpCenter /></AppLayout>
                  </ProtectedRoute>
                } />
                <Route path="/launch" element={
                  <ProtectedRoute>
                    <AppLayout><LaunchChecklist /></AppLayout>
                  </ProtectedRoute>
                } />
                <Route path="/employees" element={
                  <ProtectedRoute>
                    <AppLayout><Employees /></AppLayout>
                  </ProtectedRoute>
                } />
                <Route path="/employees/:id" element={
                  <ProtectedRoute>
                    <AppLayout><EmployeeDetail /></AppLayout>
                  </ProtectedRoute>
                } />
                <Route path="/tasks" element={
                  <ProtectedRoute>
                    <AppLayout><Tasks /></AppLayout>
                  </ProtectedRoute>
                } />
                <Route path="/logs" element={
                  <ProtectedRoute>
                    <AppLayout><Logs /></AppLayout>
                  </ProtectedRoute>
                } />
                <Route path="/logs/new" element={
                  <ProtectedRoute>
                    <AppLayout><LogNew /></AppLayout>
                  </ProtectedRoute>
                } />
                <Route path="/logs/:id" element={
                  <ProtectedRoute>
                    <AppLayout><LogDetail /></AppLayout>
                  </ProtectedRoute>
                } />
                <Route path="/logs/:id/edit" element={
                  <ProtectedRoute>
                    <AppLayout><LogNew /></AppLayout>
                  </ProtectedRoute>
                } />
                <Route path="/logs/interview/:id" element={
                  <ProtectedRoute>
                    <AppLayout><VoiceGatedInterview /></AppLayout>
                  </ProtectedRoute>
                } />
                <Route path="/chat" element={
                  <ProtectedRoute>
                    <AppLayout><Chat /></AppLayout>
                  </ProtectedRoute>
                } />
                {/* Staff/Shift routes */}
                <Route path="/staff/my-shift" element={
                  <ProtectedRoute allowedRoles={['foh', 'boh']}>
                    <AppLayout><StaffMyShift /></AppLayout>
                  </ProtectedRoute>
                } />
                <Route path="/staff/shift" element={
                  <ProtectedRoute allowedRoles={['lead']}>
                    <AppLayout><LeadShiftDashboard /></AppLayout>
                  </ProtectedRoute>
                } />
                <Route path="/staff/tasks" element={
                  <ProtectedRoute allowedRoles={['lead', 'foh', 'boh']}>
                    <AppLayout><StaffTasksPage /></AppLayout>
                  </ProtectedRoute>
                } />
                <Route path="/staff/chat" element={
                  <ProtectedRoute allowedRoles={['lead', 'foh', 'boh']}>
                    <AppLayout><StaffChatPage /></AppLayout>
                  </ProtectedRoute>
                } />
                <Route path="/staff/logs" element={
                  <ProtectedRoute allowedRoles={['lead', 'foh', 'boh']}>
                    <AppLayout><StaffLogsPage /></AppLayout>
                  </ProtectedRoute>
                } />
                <Route path="/staff" element={<Navigate to="/staff/tasks" replace />} />
                <Route path="/preview/:role" element={
                  <ProtectedRoute allowedRoles={['owner']}>
                    <RolePreview />
                  </ProtectedRoute>
                } />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
            </TooltipProvider>
          </AppProvider>
          </PreviewProvider>
          </RoleProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;

function VoiceGatedInterview() {
  const disabled = useIntegrationDisabled('openai_voice');
  if (disabled) return <Navigate to="/logs" replace />;
  return <LogInterview />;
}
