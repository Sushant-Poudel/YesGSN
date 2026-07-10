'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminPaymentMethods from '@/views/admin/AdminPaymentMethods';
export default function Page() { return <ProtectedRoute><AdminPaymentMethods /></ProtectedRoute>; }
