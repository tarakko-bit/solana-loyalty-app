import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect } from 'react';
import { Loader2, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';

export default function WalletConnect() {
  const { connected, publicKey, disconnect, wallet } = useWallet();
  const [connecting, setConnecting] = useState(false);
  const { toast } = useToast();
  const { isMobile, isInPhantomApp } = useIsMobile();

  useEffect(() => {
    if (wallet?.adapter.connected) {
      console.log('Wallet connected:', wallet.adapter.publicKey?.toString());
      setConnecting(false);
    }
  }, [wallet?.adapter.connected]);

  // Handle connection errors
  useEffect(() => {
    const handleError = (error: Error) => {
      console.error('Wallet connection error:', error);
      toast({
        title: "Connection Error",
        description: error.message,
        variant: "destructive"
      });
      setConnecting(false);
    };

    if (wallet?.adapter) {
      wallet.adapter.on('error', handleError);
      return () => {
        wallet.adapter.off('error', handleError);
      };
    }
  }, [wallet?.adapter, toast]);

  return (
    <Card className="w-full max-w-md mx-auto mt-8">
      <CardHeader>
        <CardTitle className="text-center">Connect Wallet</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        {!connected ? (
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
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Connected: {publicKey?.toString()}
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
      </CardContent>
    </Card>
  );
}