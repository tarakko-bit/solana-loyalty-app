import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useState } from 'react';
import { Loader2 } from 'lucide-react';

export default function WalletConnect() {
  const { connected, publicKey, disconnect } = useWallet();
  const [connecting, setConnecting] = useState(false);

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  return (
    <Card className="w-full max-w-md mx-auto mt-8">
      <CardContent className="pt-6">
        {!connected ? (
          <div className="flex flex-col items-center gap-4">
            <WalletMultiButton className="phantom-button" />
            <p className="text-sm text-muted-foreground text-center">
              {isMobile
                ? "Open this page in Phantom mobile app to connect"
                : "Click to connect your Phantom wallet"}
            </p>
            {isMobile && (
              <a 
                href="https://phantom.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline"
              >
                Don't have Phantom? Download it here
              </a>
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