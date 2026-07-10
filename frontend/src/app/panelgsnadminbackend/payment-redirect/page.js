'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminPaymentRedirect from '@/views/admin/AdminPaymentRedirect';
export default function Page() { return <ProtectedRoute><AdminPaymentRedirect /></ProtectedRoute>; }
