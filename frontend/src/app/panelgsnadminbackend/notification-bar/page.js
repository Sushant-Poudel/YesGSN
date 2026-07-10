'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminNotificationBar from '@/views/admin/AdminNotificationBar';
export default function Page() { return <ProtectedRoute><AdminNotificationBar /></ProtectedRoute>; }
