import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut, UserCog, Shield, Wallet } from "lucide-react";
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';

export default function AdminDashboard() {
  const { admin, logoutMutation, setup2FAMutation } = useAuth();
  const { connected, publicKey } = useWallet();

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <div className="flex items-center gap-4">
            <WalletMultiButton className="phantom-button" />
            <Button
              variant="destructive"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <UserCog className="h-5 w-5 mr-2" />
                Account Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p>Username: {admin?.username}</p>
              <p>Last Login: {admin?.lastLogin?.toString()}</p>
              <p>2FA Enabled: {admin?.twoFactorEnabled ? "Yes" : "No"}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Wallet className="h-5 w-5 mr-2" />
                Wallet Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              {connected ? (
                <>
                  <p className="text-sm mb-2">Connected Address:</p>
                  <p className="font-mono text-xs break-all">{publicKey?.toString()}</p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Connect your Phantom wallet to perform bulk transactions
                </p>
              )}
            </CardContent>
          </Card>

          {!admin?.twoFactorEnabled && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="h-5 w-5 mr-2" />
                  Security
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => setup2FAMutation.mutate()}
                  disabled={setup2FAMutation.isPending}
                >
                  Enable 2FA
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}