import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, SystemProgram, Transaction, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send } from "lucide-react";

const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

export function BulkSolanaTransfer() {
  const { publicKey, sendTransaction } = useWallet();
  const { toast } = useToast();
  const [recipients, setRecipients] = useState('');
  const [processing, setProcessing] = useState(false);

  async function handleBulkTransfer() {
    if (!publicKey || !sendTransaction) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet first",
        variant: "destructive"
      });
      return;
    }

    try {
      setProcessing(true);

      // Parse recipients list (format: address,amount\n)
      const transfers = recipients.split('\n')
        .map(line => line.trim())
        .filter(line => line)
        .map(line => {
          const [address, amount] = line.split(',');
          if (!address || !amount) throw new Error(`Invalid format: ${line}`);
          return {
            recipient: new PublicKey(address.trim()),
            amount: parseFloat(amount.trim())
          };
        });

      // Create transaction
      const transaction = new Transaction();
      
      transfers.forEach(({ recipient, amount }) => {
        transaction.add(
          SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: recipient,
            lamports: amount * LAMPORTS_PER_SOL
          })
        );
      });

      // Get latest blockhash
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      // Send transaction
      const signature = await sendTransaction(transaction, connection);
      
      // Wait for confirmation
      const confirmation = await connection.confirmTransaction(signature);
      
      if (confirmation.value.err) throw new Error('Transaction failed');

      toast({
        title: "Transfers completed",
        description: `Successfully sent SOL to ${transfers.length} recipients`,
      });

      // Clear form
      setRecipients('');
      
    } catch (error: any) {
      console.error('Bulk transfer error:', error);
      toast({
        title: "Transfer failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Send className="h-5 w-5 mr-2" />
          Bulk SOL Transfer
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-2">
              Enter recipient addresses and amounts (format: address,amount)
              One transfer per line
            </p>
            <Textarea
              value={recipients}
              onChange={(e) => setRecipients(e.target.value)}
              placeholder="Address1,0.1&#10;Address2,0.2"
              rows={5}
              className="font-mono"
            />
          </div>
          <Button
            onClick={handleBulkTransfer}
            disabled={processing || !publicKey || !recipients.trim()}
            className="w-full"
          >
            {processing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Send SOL
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
