'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminPages from '@/views/admin/AdminPages';
export default function Page() { return <ProtectedRoute><AdminPages /></ProtectedRoute>; }
