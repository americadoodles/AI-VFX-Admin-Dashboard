import { AdminShell } from "@/components/admin-shell";
import { ProtectedRoute } from "@/lib/auth-context";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <AdminShell>{children}</AdminShell>
    </ProtectedRoute>
  );
}
