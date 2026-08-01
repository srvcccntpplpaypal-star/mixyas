import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import Home from './pages/Home';
import Register from './pages/Register';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Admin from './pages/Admin';
import Kyc from './pages/Kyc';
import Taches from './pages/Taches';
import Depot from './pages/Depot';
import RefTracking from './pages/RefTracking';
import AffilierAdmin from './pages/AffilierAdmin';
import TableauAffilier from './pages/TableauAffilier';

const queryClient = new QueryClient();

function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#123274]">
      <div className="text-center text-white">
        <div className="w-20 h-20 bg-[#FFD700] rounded-full flex items-center justify-center mx-auto mb-6">
          <img src="/images/yas-logo.svg" alt="YAS" className="w-12 h-12 object-contain" />
        </div>
        <h1 className="text-6xl font-black text-[#FFD700] mb-4 uppercase tracking-widest">404</h1>
        <p className="text-white/60 uppercase tracking-widest mb-8">Page introuvable</p>
        <a href="/" className="inline-block bg-[#FFD700] text-[#123274] font-bold uppercase tracking-widest px-8 py-3 hover:bg-[#FFD700]/90 transition-colors">
          Retour à l'accueil
        </a>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/inscription" component={Register} />
      <Route path="/connexion" component={Login} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/kyc" component={Kyc} />
      <Route path="/taches" component={Taches} />
      <Route path="/depot" component={Depot} />
      <Route path="/admin" component={Admin} />
      {/* Tracking affilié — /ref/:code */}
      <Route path="/ref/:code" component={RefTracking} />
      {/* Gestion affiliés — 3 clics logo */}
      <Route path="/affilier-admin" component={AffilierAdmin} />
      {/* Dashboard affilié — /tableau-affilier/:code */}
      <Route path="/tableau-affilier/:code" component={TableauAffilier} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <Router />
      </WouterRouter>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
