import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const UsersPage = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>User Management</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Manage platform users and assign RBAC roles here. Hook into the backend user endpoints to
          list, invite, and deactivate accounts.
        </p>
      </CardContent>
    </Card>
  );
};
