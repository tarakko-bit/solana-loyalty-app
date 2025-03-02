import { Switch, Route, Redirect } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import AdminDashboard from "@/pages/admin-dashboard";
import WalletConnect from "@/components/WalletConnect";
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';

// Import Solana wallet adapter styles
import '@solana/wallet-adapter-react-ui/styles.css';

const endpoint = clusterApiUrl('devnet');
const wallets = [
  new PhantomWalletAdapter({ 
    network: 'devnet',
    appIdentity: {
      name: "Solana Loyalty App",
      icon: "https://phantom.app/favicon.ico", // Using Phantom's icon as a fallback
      url: window.location.origin // This helps with deep linking
    },
    deepLinkingOptions: {
      mobile: {
        nativeRedirect: true,
        handleRedirectUrl: true,
        universalLink: window.location.origin
      }
    }
  })
];

function Router() {
  return (
    <Switch>
      <Route path="/">
        {/* Keep /connect as default but add admin link */}
        <div className="min-h-screen bg-gray-50 p-4">
          <div className="max-w-7xl mx-auto">
            <nav className="mb-8 flex justify-end">
              <a href="/admin/login" className="text-sm text-primary hover:underline">
                Admin Login →
              </a>
            </nav>
            <WalletConnect />
          </div>
        </div>
      </Route>
      <Route path="/admin">
        <Redirect to="/admin/login" />
      </Route>
      <Route path="/admin/login" component={AuthPage} />
      <ProtectedRoute path="/admin/dashboard" component={AdminDashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect={false}>
        <WalletModalProvider>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <Router />
              <Toaster />
            </AuthProvider>
          </QueryClientProvider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export default App;