'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminFloatingButton from '@/views/admin/AdminFloatingButton';
export default function Page() { return <ProtectedRoute><AdminFloatingButton /></ProtectedRoute>; }
