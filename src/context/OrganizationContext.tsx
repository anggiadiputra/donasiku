import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

type Organization = {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
    role: 'owner' | 'admin' | 'member';
    description?: string | null;
    location?: string | null;
    whatsapp_no?: string | null;
    verification_status?: 'unverified' | 'pending' | 'verified' | 'rejected';
};

type OrganizationContextType = {
    organizations: Organization[];
    selectedOrganization: Organization | null; // null means "Personal"
    isLoading: boolean;
    canAccessPersonal: boolean;
    switchOrganization: (orgId: string | null) => void;
    isPlatformAdmin: boolean;
    refreshOrganizations: () => Promise<void>;
};

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null);
    const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Load selected org from local storage on mount
    useEffect(() => {
        const savedOrgId = localStorage.getItem('donasiku_selected_org_id');
        if (!savedOrgId) {
            // Default to personal
            setSelectedOrganization(null);
        }
        // We will validate this ID after fetching orgs
    }, []);

    const fetchOrganizations = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setOrganizations([]);
                setIsLoading(false);
                return;
            }

            // 1. Get user profile to check for platform-level admin role
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single();

            const isPlatformAdmin = profile?.role === 'admin';
            setIsPlatformAdmin(isPlatformAdmin);

            // 2. Fetch memberships
            const { data: memberships, error: memError } = await supabase
                .from('organization_members')
                .select(`
                    role,
                    organizations (
                        id,
                        name,
                        slug,
                        logo_url,
                        description,
                        location,
                        whatsapp_no,
                        verification_status
                    )
                `)
                .eq('user_id', user.id);

            if (memError) throw memError;

            // Transform memberships
            const memberOrgs: Organization[] = (memberships || []).map((item: any) => ({
                id: item.organizations.id,
                name: item.organizations.name,
                slug: item.organizations.slug,
                logo_url: item.organizations.logo_url,
                role: item.role,
                description: item.organizations.description,
                location: item.organizations.location,
                whatsapp_no: item.organizations.whatsapp_no,
                verification_status: item.organizations.verification_status,
            }));

            let finalOrgs = memberOrgs;

            // 3. If platform admin, fetch ALL other organizations they aren't already a member of
            if (isPlatformAdmin) {
                const memberOrgIds = memberOrgs.map(o => o.id);
                const { data: allOrgs, error: orgsError } = await supabase
                    .from('organizations')
                    .select('*')
                    .order('name');

                if (orgsError) throw orgsError;

                const otherOrgs: Organization[] = (allOrgs || [])
                    .filter((org: any) => !memberOrgIds.includes(org.id))
                    .map((org: any) => ({
                        id: org.id,
                        name: org.name,
                        slug: org.slug,
                        logo_url: org.logo_url,
                        role: 'owner', // Grant virtual owner access to platform admins
                        description: org.description,
                        location: org.location,
                        whatsapp_no: org.whatsapp_no,
                        verification_status: org.verification_status,
                    }));

                finalOrgs = [...memberOrgs, ...otherOrgs];
            }

            setOrganizations(finalOrgs);

            // Validate selected organization
            const savedOrgId = localStorage.getItem('donasiku_selected_org_id');
            if (savedOrgId) {
                const found = finalOrgs.find(o => o.id === savedOrgId);
                if (found) {
                    setSelectedOrganization(found);
                } else {
                    setSelectedOrganization(null);
                    localStorage.removeItem('donasiku_selected_org_id');
                }
            }

        } catch (err) {
            console.error('Error in fetchOrganizations:', err);
        } finally {
            setIsLoading(false);
        }
    };

    // Logic: 
    // - If user has NO organizations -> access personal (to create one or use independent features)
    // - If user is Platform Admin (Super Admin) -> always access personal (Global View)
    const hasOrgs = organizations.length > 0;
    const canAccessPersonal = !hasOrgs || isPlatformAdmin;

    // Auto-switch if personal access is revoked
    useEffect(() => {
        if (!isLoading && !canAccessPersonal && selectedOrganization === null && organizations.length > 0) {
            // Force switch to first organization
            switchOrganization(organizations[0].id);
        }
    }, [isLoading, canAccessPersonal, selectedOrganization, organizations]);

    useEffect(() => {
        fetchOrganizations();

        // Subscribe to auth changes to refetch
        const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'SIGNED_IN') {
                fetchOrganizations();
            } else if (event === 'SIGNED_OUT') {
                setOrganizations([]);
                setSelectedOrganization(null);
            }
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, []);

    const switchOrganization = (orgId: string | null) => {
        if (orgId === null) {
            setSelectedOrganization(null);
            localStorage.removeItem('donasiku_selected_org_id');
        } else {
            const org = organizations.find(o => o.id === orgId);
            if (org) {
                setSelectedOrganization(org);
                localStorage.setItem('donasiku_selected_org_id', orgId);
            }
        }
    };

    return (
        <OrganizationContext.Provider value={{
            organizations,
            selectedOrganization,
            isLoading,
            canAccessPersonal,
            switchOrganization,
            isPlatformAdmin,
            refreshOrganizations: fetchOrganizations
        }}>
            {children}
        </OrganizationContext.Provider>
    );
}

export function useOrganization() {
    const context = useContext(OrganizationContext);
    if (context === undefined) {
        throw new Error('useOrganization must be used within an OrganizationProvider');
    }
    return context;
}
