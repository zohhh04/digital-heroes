import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';
import { AuthProvider } from './context/AuthContext.jsx';
import Layout from './components/Layout.jsx';
import { RequireAuth, DashOutlet, AdminOutlet } from './components/Guards.jsx';
import Home from './pages/Home.jsx';
import HowItWorks from './pages/HowItWorks.jsx';
import Charities from './pages/Charities.jsx';
import CharityDetail from './pages/CharityDetail.jsx';
import Signup from './pages/Signup.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Scores from './pages/Scores.jsx';
import Draws from './pages/Draws.jsx';
import Winnings from './pages/Winnings.jsx';
import ProofUpload from './pages/ProofUpload.jsx';
import CharityPref from './pages/CharityPref.jsx';
import SubscriptionPage from './pages/SubscriptionPage.jsx';
import Settings from './pages/Settings.jsx';
import AdminOverview from './pages/admin/Overview.jsx';
import Users from './pages/admin/Users.jsx';
import Subscriptions from './pages/admin/Subscriptions.jsx';
import DrawsAdmin from './pages/admin/Draws.jsx';
import DrawSim from './pages/admin/DrawSim.jsx';
import CharitiesAdmin from './pages/admin/CharitiesAdmin.jsx';
import WinnersAdmin from './pages/admin/Winners.jsx';
import Reports from './pages/admin/Reports.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/charities" element={<Charities />} />
            <Route path="/charities/:id" element={<CharityDetail />} />
            <Route path="/pricing" element={<Navigate to="/signup" />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<RequireAuth><DashOutlet /></RequireAuth>}>
              <Route index element={<Dashboard />} />
              <Route path="scores" element={<Scores />} />
              <Route path="draws" element={<Draws />} />
              <Route path="winnings" element={<Winnings />} />
              <Route path="winnings/:id/proof" element={<ProofUpload />} />
              <Route path="charity" element={<CharityPref />} />
              <Route path="subscription" element={<SubscriptionPage />} />
              <Route path="settings" element={<Settings />} />
            </Route>
            <Route path="/admin" element={<RequireAuth admin><AdminOutlet /></RequireAuth>}>
              <Route index element={<AdminOverview />} />
              <Route path="users" element={<Users />} />
              <Route path="subscriptions" element={<Subscriptions />} />
              <Route path="draws" element={<DrawsAdmin />} />
              <Route path="draws/:id/simulation" element={<DrawSim />} />
              <Route path="charities" element={<CharitiesAdmin />} />
              <Route path="winners" element={<WinnersAdmin />} />
              <Route path="reports" element={<Reports />} />
            </Route>
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>,
);
