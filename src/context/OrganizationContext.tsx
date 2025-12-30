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
};

type OrganizationContextType = {
    organizations: Organization[];
    selectedOrganization: Organization | null; // null means "Personal"
    isLoading: boolean;
    canAccessPersonal: boolean;
    switchOrganization: (orgId: string | null) => void;
    refreshOrganizations: () => Promise<void>;
};

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null);
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

            // Fetch orgs user is a member of
            // We join organization_members -> organizations
            const { data, error } = await supabase
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
            whatsapp_no
          )
        `)
                .eq('user_id', user.id);

            if (error) {
                console.error('Error fetching organizations:', error);
                return;
            }

            // Transform data
            const orgs: Organization[] = data.map((item: any) => ({
                id: item.organizations.id,
                name: item.organizations.name,
                slug: item.organizations.slug,
                logo_url: item.organizations.logo_url,
                role: item.role,
                description: item.organizations.description,
                location: item.organizations.location,
                whatsapp_no: item.organizations.whatsapp_no,
            }));

            setOrganizations(orgs);

            // Validate selected organization
            const savedOrgId = localStorage.getItem('donasiku_selected_org_id');
            if (savedOrgId) {
                const found = orgs.find(o => o.id === savedOrgId);
                if (found) {
                    setSelectedOrganization(found);
                } else {
                    // If saved ID isn't in fetched list (maybe kicked out), reset to personal
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

    // Determine if user can access "Personal Account"
    // Logic: If user has 0 orgs -> Yes
    // If user has orgs -> Yes ONLY if they are 'owner' of at least one org or 'admin' 
    // Actually, per user request: "member role should not have access to personal account"
    // Let's check if they have any org with role 'owner' or 'admin'
    const isOwnerOrAdmin = organizations.some(o => o.role === 'owner' || o.role === 'admin');
    const hasOrgs = organizations.length > 0;
    const canAccessPersonal = !hasOrgs || isOwnerOrAdmin;

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
