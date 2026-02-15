import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface UserRecord {
  id: string;
  email: string;
  role: string;
  name: string;
  orgName: string | null;
  personaStatus: string;
  personaInquiryId: string | null;
  personaVerifiedAt: string | null;
  createdAt: string;
}

export default function AdminUsers() {
  const { data: users, isLoading } = useQuery<UserRecord[]>({
    queryKey: ["/api/admin/users"],
  });

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      case "DEVELOPER":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "INVESTOR":
        return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getPersonaBadgeClass = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
      case "pending":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      case "failed":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const formatPersonaStatus = (status: string) => {
    switch (status) {
      case "completed": return "Verified";
      case "pending": return "Pending";
      case "failed": return "Failed";
      default: return "Not Started";
    }
  };

  return (
    <DashboardLayout
      title="User Management"
      description="KYC/AML verification and user compliance oversight"
      breadcrumbs={[
        { label: "Admin", href: "/admin" },
        { label: "Users" },
      ]}
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Platform Users
          </CardTitle>
          <CardDescription>
            All registered accounts with KYC/AML verification status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex justify-between p-4 border rounded-lg">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-5 w-32" />
                </div>
              ))}
            </div>
          ) : !users?.length ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>No users found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>KYC Status</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                    <TableCell className="font-medium" data-testid={`text-user-name-${user.id}`}>
                      {user.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground" data-testid={`text-user-email-${user.id}`}>
                      {user.email}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={getRoleBadgeClass(user.role)}
                        data-testid={`badge-user-role-${user.id}`}
                      >
                        {user.role === "DEVELOPER" ? "ISSUER" : user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={getPersonaBadgeClass(user.personaStatus)}
                        data-testid={`badge-persona-status-${user.id}`}
                      >
                        {formatPersonaStatus(user.personaStatus)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {user.orgName || "--"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "--"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
