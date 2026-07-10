'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminMultiplier from '@/views/admin/AdminMultiplier';
export default function Page() { return <ProtectedRoute><AdminMultiplier /></ProtectedRoute>; }
