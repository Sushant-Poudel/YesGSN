'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminReferral from '@/views/admin/AdminReferral';
export default function Page() { return <ProtectedRoute><AdminReferral /></ProtectedRoute>; }
