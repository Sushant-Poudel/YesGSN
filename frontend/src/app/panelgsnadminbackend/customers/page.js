'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminCustomers from '@/views/admin/AdminCustomers';
export default function Page() { return <ProtectedRoute><AdminCustomers /></ProtectedRoute>; }
