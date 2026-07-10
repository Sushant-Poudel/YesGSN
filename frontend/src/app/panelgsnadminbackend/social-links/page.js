'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminSocialLinks from '@/views/admin/AdminSocialLinks';
export default function Page() { return <ProtectedRoute><AdminSocialLinks /></ProtectedRoute>; }
