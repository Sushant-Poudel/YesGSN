'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminNewsletter from '@/views/admin/AdminNewsletter';
export default function Page() { return <ProtectedRoute><AdminNewsletter /></ProtectedRoute>; }
