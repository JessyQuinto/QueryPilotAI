import { useState, useEffect } from "react";
import { Organization } from "../types";
import { toast } from "sonner";

const SKIP_AUTH = process.env.NEXT_PUBLIC_SKIP_AUTH === 'true';

const getOrganizationsStorageKey = (userId?: string) =>
  userId ? `qp_organizations:${userId}` : "qp_organizations";

const DEV_ORG: Organization = {
  id: 'dev-org-001',
  name: 'Dev Workspace',
  industry: 'Technology',
};

export function useWorkspace(userId: string | undefined, fetchWithAuth: (url: string, options?: any) => Promise<Response>) {
  const [organizations, setOrganizations] = useState<Organization[]>(SKIP_AUTH ? [DEV_ORG] : []);
  const [organization, setOrganization] = useState<Organization | null>(SKIP_AUTH ? DEV_ORG : null);
  const [isLoadingOrg, setIsLoadingOrg] = useState(!SKIP_AUTH);
  const [isAddingWorkspace, setIsAddingWorkspace] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const savedOrganizations =
      localStorage.getItem(getOrganizationsStorageKey(userId)) ??
      (userId ? localStorage.getItem('qp_organizations') : null);

    if (!savedOrganizations) {
      return;
    }

    try {
      const parsed = JSON.parse(savedOrganizations) as Organization[];
      setOrganizations(parsed);
      setOrganization(parsed[0] || null);
    } catch {
      // Ignore malformed local cache.
    }
  }, [userId]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    localStorage.setItem(getOrganizationsStorageKey(userId), JSON.stringify(organizations));
  }, [organizations, userId]);

  useEffect(() => {
    if (userId) {
      fetchWithAuth('/api/organizations/me', { allowInteractiveAuth: true })
        .then(async (res) => {
          if (!res.ok) {
            return null;
          }

          return res.json();
        })
        .then(data => {
           if (data === null) {
             setIsLoadingOrg(false);
             return;
           }

           const orgs = Array.isArray(data) ? data : (data ? [data] : []);
           setOrganizations(orgs);
           setOrganization(orgs[0] || null);
           setIsLoadingOrg(false);
        })
        .catch(() => setIsLoadingOrg(false));
    } else {
        setIsLoadingOrg(false);
    }
  }, [fetchWithAuth, userId]);

  const handleOnboardingComplete = async (orgData: { name: string; industry: string }) => {
    try {
      const res = await fetchWithAuth('/api/organizations', {
        allowInteractiveAuth: true,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(orgData)
      });
      if (res.ok) {
        const data = await res.json();
        const newOrg = { id: data.id, ...orgData };
        setOrganizations(prev => [...prev, newOrg]);
        setOrganization(newOrg);
        setIsAddingWorkspace(false);
        toast.success("Workspace created successfully!");
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to create workspace.");
      }
    } catch (err) {
      toast.error("Error creating workspace.");
    }
  };
  
  const handleDeleteWorkspace = async () => {
    if (!organization) return;
    if (!confirm("Are you sure you want to delete this workspace? This cannot be undone.")) return;
    try {
      const res = await fetchWithAuth(`/api/organizations/${organization.id}`, {
        allowInteractiveAuth: true,
        method: 'DELETE'
      });
      if (res.ok) {
        toast.success("Workspace deleted successfully.");
        setOrganizations(prev => {
            const nextOrgs = prev.filter(o => o.id !== organization.id);
            setOrganization(nextOrgs[0] || null);
            return nextOrgs;
        });
      } else {
        toast.error("Failed to delete workspace.");
      }
    } catch {
      toast.error("Error deleting workspace.");
    }
  };

  return {
    organizations,
    setOrganizations,
    organization,
    setOrganization,
    isLoadingOrg,
    setIsLoadingOrg,
    isAddingWorkspace,
    setIsAddingWorkspace,
    handleOnboardingComplete,
    handleDeleteWorkspace
  };
}
