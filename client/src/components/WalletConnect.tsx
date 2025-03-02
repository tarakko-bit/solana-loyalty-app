import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect } from 'react';
import { Loader2, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient';

export default function WalletConnect() {
  const { connected, publicKey, disconnect, wallet } = useWallet();
  const [connecting, setConnecting] = useState(false);
  const { toast } = useToast();
  const { isMobile, isInPhantomApp } = useIsMobile();
  const [location] = useLocation();
  const referralCode = new URLSearchParams(location).get('ref');

  useEffect(() => {
    if (wallet?.adapter.connected && publicKey) {
      handleNewConnection(publicKey.toString());
    }
  }, [wallet?.adapter.connected, publicKey]);

  async function handleNewConnection(walletAddress: string) {
    try {
      // Try to register the user with their wallet address and referral code
      await apiRequest('POST', '/api/users/register', {
        walletAddress,
        referredBy: referralCode
      });

      toast({
        title: "Welcome!",
        description: referralCode 
          ? "Successfully registered with referral" 
          : "Successfully connected",
      });
    } catch (error: any) {
      // If user already exists, that's fine
      if (!error.message.includes('already exists')) {
        toast({
          title: "Connection Error",
          description: error.message,
          variant: "destructive"
        });
      }
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto mt-8">
      <CardHeader>
        <CardTitle className="text-2xl text-center">
          Connect Wallet
          {referralCode && (
            <p className="text-sm text-muted-foreground mt-2">
              Referred by: {referralCode}
            </p>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center gap-4">
          <WalletMultiButton className="phantom-button" />
          <p className="text-sm text-muted-foreground text-center">
            {isMobile
              ? isInPhantomApp 
                ? "Click 'Connect' to approve the connection"
                : "Open this page in Phantom mobile app to connect"
              : "Click to connect your Phantom wallet"}
          </p>
          {isMobile && !isInPhantomApp && (
            <>
              <p className="text-xs text-muted-foreground text-center">
                Once connected, you'll be automatically redirected back to this app
              </p>
              <a 
                href="https://phantom.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs text-primary hover:underline"
              >
                Don't have Phantom? Download it here
                <ExternalLink className="h-3 w-3" />
              </a>
            </>
          )}
          {connected && publicKey && (
            <div className="w-full space-y-4">
              <p className="text-sm text-muted-foreground break-all text-center">
                Connected: {publicKey.toString()}
              </p>
              <Button 
                onClick={() => disconnect()} 
                variant="outline" 
                className="w-full"
              >
                Disconnect
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}