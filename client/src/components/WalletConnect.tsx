import { useWallet } from '@solana/wallet-adapter-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function WalletConnect() {
  const { connect, connected, publicKey, disconnect } = useWallet();

  return (
    <Card className="w-full max-w-md mx-auto mt-8">
      <CardContent className="pt-6">
        {!connected ? (
          <Button 
            onClick={() => connect()} 
            className="w-full"
          >
            Connect Phantom Wallet
          </Button>
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