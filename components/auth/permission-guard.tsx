'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePermissions } from '@/hooks/usePermissions';

interface PermissionGuardProps {
    permission: string | string[];
    requireAll?: boolean;
    fallbackUrl?: string;
    children: React.ReactNode;
}

export const PermissionGuard = ({ permission, requireAll = false, fallbackUrl = '/', children }: PermissionGuardProps) => {
    const router = useRouter();
    const { hasPermission, hasAllPermissions, hasAnyPermission, loading } = usePermissions();

    useEffect(() => {
        if (loading) return;

        const permissions = Array.isArray(permission) ? permission : [permission];

        let hasAccess = false;
        if (requireAll) {
            hasAccess = hasAllPermissions(permissions);
        } else {
            hasAccess = hasAnyPermission(permissions);
        }

        if (!hasAccess) {
            router.push(fallbackUrl);
        }
    }, [permission, requireAll, fallbackUrl, loading, hasPermission, hasAllPermissions, hasAnyPermission, router]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    const permissions = Array.isArray(permission) ? permission : [permission];
    const hasAccess = requireAll ? hasAllPermissions(permissions) : hasAnyPermission(permissions);

    if (!hasAccess) {
        return null;
    }

    return <>{children}</>;
};
