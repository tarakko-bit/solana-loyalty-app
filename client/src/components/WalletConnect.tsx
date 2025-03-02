import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect } from 'react';
import { ExternalLink, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { useQuery } from '@tanstack/react-query';

export default function WalletConnect() {
  const { connected, publicKey, disconnect } = useWallet();
  const { toast } = useToast();
  const { isMobile, isInPhantomApp } = useIsMobile();
  const [location] = useLocation();
  const referralCode = new URLSearchParams(location).get('ref');

  // Fetch user data if wallet is connected
  const { data: userData } = useQuery({
    queryKey: ['/api/users/me', publicKey?.toString()],
    queryFn: async () => {
      if (!publicKey) return null;
      const res = await fetch(`/api/users/me?wallet=${publicKey.toString()}`);
      if (!res.ok) {
        throw new Error('Failed to fetch user data');
      }
      return res.json();
    },
    enabled: connected && !!publicKey,
  });

  useEffect(() => {
    if (connected && publicKey) {
      handleNewConnection(publicKey.toString());
    }
  }, [connected, publicKey]);

  async function handleNewConnection(walletAddress: string) {
    try {
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
      if (!error.message.includes('already exists')) {
        toast({
          title: "Connection Error",
          description: error.message,
          variant: "destructive"
        });
      }
    }
  }

  function copyReferralLink() {
    if (!userData?.referralCode) return;

    const link = `${window.location.origin}/connect?ref=${userData.referralCode}`;
    navigator.clipboard.writeText(link);

    toast({
      title: "Copied!",
      description: "Referral link copied to clipboard",
    });
  }

  function handlePhantomLink() {
    // If already in Phantom app, just use the connect button
    if (isInPhantomApp) {
      return;
    }

    // Use direct deep link for mobile
    const deepLink = `phantom://connect?app=${encodeURIComponent(window.location.origin)}`;
    window.location.href = deepLink;
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
          {isMobile && !isInPhantomApp ? (
            <Button 
              className="w-full"
              onClick={handlePhantomLink}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in Phantom App
            </Button>
          ) : (
            <WalletMultiButton className="phantom-button" />
          )}
          <p className="text-sm text-muted-foreground text-center">
            {isMobile
              ? isInPhantomApp 
                ? "Click 'Connect' to approve"
                : "Opening Phantom App..."
              : "Click to connect your Phantom wallet"}
          </p>

          {connected && publicKey && (
            <div className="w-full space-y-4">
              <p className="text-sm text-muted-foreground break-all text-center">
                Connected: {publicKey.toString()}
              </p>
              {userData?.referralCode && (
                <div className="p-4 border rounded-lg bg-muted/50">
                  <p className="text-sm font-medium mb-2">Your Referral Link:</p>
                  <div className="flex items-center gap-2">
                    <code className="text-xs break-all flex-1">
                      {window.location.origin}/connect?ref={userData.referralCode}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={copyReferralLink}
                      className="shrink-0"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
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