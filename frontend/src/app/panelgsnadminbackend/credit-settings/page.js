'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminCreditSettings from '@/views/admin/AdminCreditSettings';
export default function Page() { return <ProtectedRoute><AdminCreditSettings /></ProtectedRoute>; }
