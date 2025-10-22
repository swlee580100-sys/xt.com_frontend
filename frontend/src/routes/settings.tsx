import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const SettingsPage = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Configure integrations such as exchange connections, email providers, and system limits.
          Extend this page with forms backed by react-hook-form and zod schemas.
        </p>
      </CardContent>
    </Card>
  );
};
