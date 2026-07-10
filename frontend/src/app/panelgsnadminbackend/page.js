'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminDashboard from '@/views/admin/AdminDashboard';
export default function Page() { return <ProtectedRoute><AdminDashboard /></ProtectedRoute>; }
