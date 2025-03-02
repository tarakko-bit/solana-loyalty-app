import { Switch, Route } from "wouter";
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
      {/* Direct admin routes */}
      <Route path="/admin/login" component={AuthPage} />
      <ProtectedRoute path="/admin/dashboard" component={AdminDashboard} />

      {/* Wallet routes */}
      <Route path="/connect">
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

      {/* Default route */}
      <Route path="/">
        <div className="min-h-screen bg-gray-50 p-4">
          <div className="max-w-7xl mx-auto text-center">
            <h1 className="text-4xl font-bold mb-8">Welcome to Solana Loyalty App</h1>
            <div className="flex justify-center gap-4">
              <a 
                href="/admin/login" 
                className="inline-flex items-center px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Admin Login
              </a>
              <a 
                href="/connect" 
                className="inline-flex items-center px-4 py-2 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/90"
              >
                Connect Wallet
              </a>
            </div>
          </div>
        </div>
      </Route>

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