'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminPricingSettings from '@/views/admin/AdminPricingSettings';
export default function Page() { return <ProtectedRoute><AdminPricingSettings /></ProtectedRoute>; }
