'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminWebhooks from '@/views/admin/AdminWebhooks';
export default function Page() { return <ProtectedRoute><AdminWebhooks /></ProtectedRoute>; }
