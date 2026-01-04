'use client';
import { useState, useEffect } from 'react';
import supabase from '@/lib/supabase';

interface PermissionHook {
    permissions: string[];
    hasPermission: (permission: string) => boolean;
    hasAnyPermission: (permissions: string[]) => boolean;
    hasAllPermissions: (permissions: string[]) => boolean;
    isAdmin: boolean;
    loading: boolean;
}

export const usePermissions = (): PermissionHook => {
    const [permissions, setPermissions] = useState<string[]>([]);
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPermissions = async () => {
            try {
                const {
                    data: { user },
                } = await supabase.auth.getUser();

                if (!user) {
                    setLoading(false);
                    return;
                }

                // Get user role
                const { data: userRoleData } = await supabase.from('user_roles').select('roles(name)').eq('user_id', user.id).single();

                if (Array.isArray(userRoleData?.roles) && userRoleData.roles[0]?.name === 'Admin') {
                    setIsAdmin(true);
                    // Admin has all permissions - we can set a flag or all permission keys
                    // For simplicity, we'll just use the isAdmin flag
                    setPermissions(['*']); // Wildcard for all permissions
                    setLoading(false);
                    return;
                }

                // If no role found, default to no permissions (security first)
                if (!userRoleData) {
                    console.warn('User has no role assigned. Please contact administrator.');
                    setPermissions([]);
                    setLoading(false);
                    return;
                }

                // For non-admin users, get their specific permissions
                const { data: userPermissions } = await supabase.from('user_permissions').select('permissions(key)').eq('user_id', user.id).eq('granted', true);

                if (userPermissions) {
                    const permKeys = userPermissions.map((p: any) => p.permissions?.key).filter(Boolean);
                    setPermissions(permKeys);
                }

                setLoading(false);
            } catch (error) {
                console.error('Error fetching permissions:', error);
                setLoading(false);
            }
        };

        fetchPermissions();

        // Listen for auth changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(() => {
            fetchPermissions();
        });

        return () => {
            subscription?.unsubscribe();
        };
    }, []);

    const hasPermission = (permission: string): boolean => {
        if (isAdmin || permissions.includes('*')) return true;
        return permissions.includes(permission);
    };

    const hasAnyPermission = (perms: string[]): boolean => {
        if (isAdmin || permissions.includes('*')) return true;
        return perms.some((p) => permissions.includes(p));
    };

    const hasAllPermissions = (perms: string[]): boolean => {
        if (isAdmin || permissions.includes('*')) return true;
        return perms.every((p) => permissions.includes(p));
    };

    return {
        permissions,
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
        isAdmin,
        loading,
    };
};
