'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminPromoCodes from '@/views/admin/AdminPromoCodes';
export default function Page() { return <ProtectedRoute><AdminPromoCodes /></ProtectedRoute>; }
