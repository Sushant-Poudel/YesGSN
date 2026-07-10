'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminAuditLogs from '@/views/admin/AdminAuditLogs';
export default function Page() { return <ProtectedRoute><AdminAuditLogs /></ProtectedRoute>; }
