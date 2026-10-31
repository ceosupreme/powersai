import { lazy, Suspense } from "react";
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
import { useAuth } from "@/context/AuthContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { queryClient } from "@/lib/queryClient";
const Login = lazy(() => import("./pages/Login"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const WeeklyReview = lazy(() => import("./pages/WeeklyReview"));
const Sales = lazy(() => import("./pages/Sales"));
const Labor = lazy(() => import("./pages/Labor"));
const Operations = lazy(() => import("./pages/Operations"));
const GuestExperience = lazy(() => import("./pages/GuestExperience"));
const Insights = lazy(() => import("./pages/Insights"));
const Admin = lazy(() => import("./pages/Admin"));
const AdminSyncHealth = lazy(() => import("./pages/AdminSyncHealth"));
const GrowthAudit = lazy(() => import("./pages/GrowthAudit"));
const LeakStack = lazy(() => import("./pages/LeakStack"));
const ProspectDock = lazy(() => import("./pages/ProspectDock"));
import FreeAudit from "./pages/FreeAudit";
const Templates = lazy(() => import("./pages/Templates"));
const MarketingHub = lazy(() => import("./pages/MarketingHub"));
const Tasks = lazy(() => import("./pages/Tasks"));
const Logs = lazy(() => import("./pages/Logs"));
const LogNew = lazy(() => import("./pages/LogNew"));
const LogDetail = lazy(() => import("./pages/LogDetail"));
const LogInterview = lazy(() => import("./pages/LogInterview"));
import { useIntegrationDisabled } from "@/hooks/useIntegrationDisabled";
const Chat = lazy(() => import("./pages/Chat"));
const LeadShiftDashboard = lazy(() => import("./pages/LeadShiftDashboard"));
const StaffTasksPage = lazy(() => import("./pages/StaffTasksPage"));
const StaffChatPage = lazy(() => import("./pages/StaffChatPage"));
const StaffLogsPage = lazy(() => import("./pages/StaffLogsPage"));
const StaffMyShift = lazy(() => import("./pages/StaffMyShift"));
const PortfolioOverview = lazy(() => import("./pages/PortfolioOverview"));
const Employees = lazy(() => import("./pages/Employees"));
const EmployeeDetail = lazy(() => import("./pages/EmployeeDetail"));
const InsightsAudit = lazy(() => import("./pages/InsightsAudit"));
import NotFound from "./pages/NotFound";
const RolePreview = lazy(() => import("./pages/RolePreview"));
const Workspace = lazy(() => import("./pages/Workspace"));
const BrandKit = lazy(() => import("./pages/BrandKit"));
const ContentPipeline = lazy(() => import("./pages/ContentPipeline"));
const ProductionBoard = lazy(() => import("./pages/ProductionBoard"));
const AnswerBank = lazy(() => import("./pages/AnswerBank"));
const ChannelRevenue = lazy(() => import("./pages/ChannelRevenue"));
const AffiliatePrograms = lazy(() => import("./pages/AffiliatePrograms"));
const Products = lazy(() => import("./pages/Products"));
const Offers = lazy(() => import("./pages/Offers"));
const Crm = lazy(() => import("./pages/Crm"));
const Inbox = lazy(() => import("./pages/Inbox"));
import MarketingSite from "./pages/MarketingSite";
import Work from "./pages/Work";
import WorkCaseStudy from "./pages/WorkCaseStudy";
import Hire from "./pages/Hire";
import PublishingServices from "./pages/PublishingServices";
import WebsiteServices from "./pages/WebsiteServices";
import BrandServices from "./pages/BrandServices";
import MarketingServices from "./pages/MarketingServices";
import SystemsServices from "./pages/SystemsServices";
const HelpCenter = lazy(() => import("./pages/HelpCenter"));
const LaunchChecklist = lazy(() => import("./pages/LaunchChecklist"));
const QualifyLanding = lazy(() => import("./pages/QualifyLanding"));
const QualifyForVenue = lazy(() => import("./pages/QualifyForVenue"));
import VerticalLanding from "./pages/VerticalLanding";
import VerticalResolver from "./pages/VerticalResolver";
import Industries from "./pages/Industries";
const AutomationInbox = lazy(() => import("./pages/AutomationInbox"));
const ClientApprovals = lazy(() => import("./pages/ClientApprovals"));
const ReactivationCampaigns = lazy(() => import("./pages/ReactivationCampaigns"));
const RecoveryReports = lazy(() => import("./pages/RecoveryReports"));
const PublicRecoveryReport = lazy(() => import("./pages/PublicRecoveryReport"));
const FoundationAudit = lazy(() => import("./pages/FoundationAudit"));
const ProjectHome = lazy(() => import("./pages/ProjectHome"));
import { ThemeSync } from "@/components/layout/ThemeSync";
import { PublicSiteAnalytics } from "@/components/marketing/PublicSiteAnalytics";
import { ScrollToTopOnNavigate } from "@/components/ScrollToTopOnNavigate";
import ThankYou from "./pages/ThankYou";
import About from "./pages/About";
import LegalPage from "./pages/LegalPage";
import Pricing from "./pages/Pricing";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import ServicesHub from "./pages/ServicesHub";
import ServiceDetail from "./pages/ServiceDetail";
import AreasHub from "./pages/AreasHub";
import AreaDetail from "./pages/AreaDetail";
import Startups from "./pages/Startups";
const HomeHeroReview = lazy(() => import("./pages/review/HomeHeroReview"));
// Unlisted client proposals (content in src/content/proposals.ts); never prerendered or indexed.
const Proposal = lazy(() => import("./pages/Proposal"));
// The HQ app loads in its own pieces, so visitors to the public site only download the public pages.
const LazyAppLayout = lazy(() => import("@/components/layout/AppLayout").then((m) => ({ default: m.AppLayout })));
const SetupWizard = lazy(() => import("@/components/help/SetupWizard").then((m) => ({ default: m.SetupWizard })));

/** The setup wizard is for signed-in users only, so public visitors never fetch it. */
function SignedInSetupWizard() {
  const { user } = useAuth();
  return user ? <Suspense fallback={null}><SetupWizard /></Suspense> : null;
}

/** Shown for a moment while an HQ screen's code arrives. */
function ScreenLoading() {
  return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">One moment…</div>;
}

/** Each HQ screen waits for its code inside its own boundary. Public pages have none, so their saved copies match on the first draw. */
function AppLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<ScreenLoading />}><LazyAppLayout>{children}</LazyAppLayout></Suspense>;
}
const Waiting = ({ children }: { children: React.ReactNode }) => <Suspense fallback={<ScreenLoading />}>{children}</Suspense>;

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
              <SignedInSetupWizard />
              <ThemeSync />
              <PublicSiteAnalytics />
              <ScrollToTopOnNavigate />
              <Routes>
                <Route path="/auth" element={<Waiting><Login /></Waiting>} />
                <Route path="/login" element={<Waiting><Login /></Waiting>} />
                <Route path="/reset-password" element={<Waiting><ResetPassword /></Waiting>} />
                {/* Public landing page — signed-out visitors see marketing,
                    signed-in users get redirected into the app (handled inside Marketing). */}
                <Route path="/" element={<MarketingSite />} />
                <Route path="/free-audit" element={<FreeAudit />} />
                <Route path="/thank-you" element={<ThankYou />} />
                <Route path="/about" element={<About />} />
                <Route path="/privacy" element={<LegalPage kind="privacy" />} />
                <Route path="/terms" element={<LegalPage kind="terms" />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/blog" element={<Blog />} />
                <Route path="/blog/:slug" element={<BlogPost />} />
                <Route path="/startups" element={<Startups />} />
                <Route path="/_review/home-hero" element={<Suspense fallback={null}><HomeHeroReview /></Suspense>} />
                {/* Public Work / Portfolio showcase (does NOT collide with internal /portfolio). */}
                <Route path="/work" element={<Work />} />
                <Route path="/work/:slug" element={<WorkCaseStudy />} />
                {/* Public hiring / individual-professional introduction page. */}
                <Route path="/hire" element={<Hire />} />
                {/* Public Publishing & Launch packaged-service page. */}
                <Route path="/publishing" element={<PublishingServices />} />
                <Route path="/services/websites" element={<WebsiteServices />} />
                <Route path="/services/brand" element={<BrandServices />} />
                <Route path="/services/marketing" element={<MarketingServices />} />
                <Route path="/services/ai-systems" element={<SystemsServices />} />
                {/* Every service and every place we serve: one page each, read from service_pages and city_pages rows. */}
                <Route path="/services" element={<ServicesHub />} />
                <Route path="/services/:slug" element={<ServiceDetail />} />
                <Route path="/areas" element={<AreasHub />} />
                <Route path="/areas/:slug" element={<AreaDetail />} />
                <Route path="/industries" element={<Industries />} />
                {/* Public lead qualifier landing pages — one per vertical slug. */}
                <Route path="/qualify/:slug" element={<Waiting><QualifyLanding /></Waiting>} />
                {/* Flagship acquisition pages bypass the legacy database-driven renderer. */}
                {/* All other public vertical pages retain the legacy config-driven renderer. */}
                <Route path="/for/:slug" element={<VerticalResolver />} />
                {/* Public per-client qualifier — resolves a venue by slug and
                    stamps inbound leads with captured_for_project_id so the
                    client's follow-up enrollment fires automatically. */}
                <Route path="/q/:venueSlug" element={<Waiting><QualifyForVenue /></Waiting>} />
                {/* Public shared Recovery Report — no auth, integrity-gated by the edge function. */}
                <Route path="/r/:token" element={<Waiting><PublicRecoveryReport /></Waiting>} />
                {/* Unlisted client proposal pages — no auth; the link is the access. */}
                <Route path="/proposal/:slug" element={<Waiting><Proposal /></Waiting>} />
                <Route path="/portfolio" element={
                  <ProtectedRoute allowedRoles={['owner']}>
                    <AppLayout><PortfolioOverview /></AppLayout>
                  </ProtectedRoute>
                } />
                <Route path="/project/:venueId" element={
                  <ProtectedRoute allowedRoles={['owner']} pageKey="project_home">
                    <AppLayout><ProjectHome /></AppLayout>
                  </ProtectedRoute>
                } />
                <Route path="/dashboard" element={
                  <ProtectedRoute allowedRoles={['owner', 'gm', 'lead', 'foh', 'boh']}>
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
                <Route path="/leak-stack" element={
                  <ProtectedRoute allowedRoles={['owner']} pageKey="leak_stack">
                    <AppLayout><LeakStack /></AppLayout>
                  </ProtectedRoute>
                } />
                <Route path="/prospects" element={
                  <ProtectedRoute allowedRoles={['owner']} pageKey="prospect_dock">
                    <AppLayout><ProspectDock /></AppLayout>
                  </ProtectedRoute>
                } />
                <Route path="/templates" element={
                  <ProtectedRoute pageKey="outreach_templates">
                    <AppLayout><Templates /></AppLayout>
                  </ProtectedRoute>
                } />
                <Route path="/foundation-audit" element={
                  <ProtectedRoute allowedRoles={['owner']} pageKey="foundation_audit">
                    <AppLayout><FoundationAudit /></AppLayout>
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
                <Route path="/production-board" element={
                  <ProtectedRoute pageKey="content_pipeline">
                    <AppLayout><ProductionBoard /></AppLayout>
                  </ProtectedRoute>
                } />
                <Route path="/answer-bank" element={
                  <ProtectedRoute pageKey="content_pipeline">
                    <AppLayout><AnswerBank /></AppLayout>
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
                <Route path="/offers" element={
                  <ProtectedRoute pageKey="offers">
                    <AppLayout><Offers /></AppLayout>
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
                <Route path="/automations/inbox" element={
                  <ProtectedRoute>
                    <AppLayout><AutomationInbox /></AppLayout>
                  </ProtectedRoute>
                } />
                <Route path="/approvals" element={
                  <ProtectedRoute allowedRoles={['client']} pageKey="client_approvals">
                    <AppLayout><ClientApprovals /></AppLayout>
                  </ProtectedRoute>
                } />
                <Route path="/automations/reactivation" element={
                  <ProtectedRoute>
                    <AppLayout><ReactivationCampaigns /></AppLayout>
                  </ProtectedRoute>
                } />
                <Route path="/automations/recovery-reports" element={
                  <ProtectedRoute>
                    <AppLayout><RecoveryReports /></AppLayout>
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
                    <Waiting><RolePreview /></Waiting>
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
