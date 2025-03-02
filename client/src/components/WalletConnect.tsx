import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLocation } from 'wouter';
import { Input } from "@/components/ui/input";

export default function WalletConnect() {
  const [referralLink, setReferralLink] = useState<string>('');
  const [, params] = useLocation();
  const { connect, connected, publicKey, disconnect } = useWallet();

  useEffect(() => {
    if (publicKey) {
      // Generate referral link using the user's wallet address
      const baseUrl = window.location.origin;
      setReferralLink(`${baseUrl}/connect?ref=${publicKey.toString()}`);

      // If user came from a referral, store the relationship
      const urlParams = new URLSearchParams(window.location.search);
      const referredBy = urlParams.get('ref');

      if (referredBy) {
        // Store referral relationship
        fetch('/api/store-referral', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            walletAddress: publicKey.toString(),
            referredBy
          })
        });
      }
    }
  }, [publicKey]);

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
            <div className="space-y-2">
              <label className="text-sm font-medium">Your Referral Link:</label>
              <Input 
                readOnly 
                value={referralLink}
                onClick={(e) => {
                  (e.target as HTMLInputElement).select();
                  navigator.clipboard.writeText(referralLink);
                }}
              />
              <p className="text-xs text-muted-foreground">
                Click to copy your referral link
              </p>
            </div>
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