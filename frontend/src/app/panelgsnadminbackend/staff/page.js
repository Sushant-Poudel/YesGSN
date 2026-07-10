'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminStaff from '@/views/admin/AdminStaff';
export default function Page() { return <ProtectedRoute><AdminStaff /></ProtectedRoute>; }
