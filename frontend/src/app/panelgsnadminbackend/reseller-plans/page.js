'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminResellerPlans from '@/views/admin/AdminResellerPlans';
export default function Page() { return <ProtectedRoute><AdminResellerPlans /></ProtectedRoute>; }
