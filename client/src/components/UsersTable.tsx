import { useQuery } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User } from "@shared/schema";
import { formatDistance } from "date-fns";
import { Users } from "lucide-react";

export function UsersTable() {
  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Users className="h-5 w-5 mr-2" />
          Registered Users
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Wallet Address</TableHead>
                <TableHead>Telegram ID</TableHead>
                <TableHead>Referral Code</TableHead>
                <TableHead>Referred By</TableHead>
                <TableHead>Last Verification</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-mono">{user.walletAddress}</TableCell>
                  <TableCell>{user.telegramId || "-"}</TableCell>
                  <TableCell>{user.referralCode}</TableCell>
                  <TableCell>{user.referredBy || "-"}</TableCell>
                  <TableCell>
                    {user.lastVerification
                      ? formatDistance(new Date(user.lastVerification), new Date(), {
                          addSuffix: true,
                        })
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {formatDistance(new Date(user.createdAt), new Date(), {
                      addSuffix: true,
                    })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
