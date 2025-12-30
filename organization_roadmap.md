# Organization & Team Implementation Roadmap

This document triggers the implementation of the "Organization" feature, allowing multiple users to manage campaigns under a single entity.

## 1. Database & Security Core (Foundations)
- [x] **RBAC Security Hardening**
    - [x] Apply `20251229090000_secure_rbac_policies.sql` (Basic Admin vs Campaigner security).
    - [x] Verify: Admin can see all, Campaigner sees only theirs.
- [x] **Organization Schema Migration**
    - [x] Apply `20251229100000_create_organizations_schema.sql` (Orgs table, Members, RLS).
    - [x] Verify: `organizations` table exists.
    - [x] Verify: `campaigns` table has `organization_id`.

## 2. Supabase Integration (Data Layer)
- [x] **Organization Hooks (`/src/hooks`)**
    - [x] Create `useOrganizations` hook: (Implemented as part of `OrganizationContext`).
    - [x] Create `useOrganizationDetails` hook: (Fetched via `OrganizationContext`).
    - [x] Create `useSwitchContext` hook: (Implemented via `useOrganization` hook).

## 3. UI Implementation
- [x] **Context Switcher (Sidebar)**
    - [x] Add dropdown in `Sidebar.tsx` to switch between "Personal" and "Organizations".
    - [x] Store selected context in local storage or global state context.
- [x] **Organization Management Pages**
    - [x] `CreateOrganizationPage`: Allow users to create a new org.
    - [x] `OrganizationSettingsPage`: (Implemented with Member Management).
        - [x] List members.
        - [x] "Invite Member" form (Input email -> Add to `organization_members`).
- [x] **Campaign Creation Update**
    - [x] Update `CreateCampaign` flow to allow selecting the "Owner" (Self or one of their Orgs).

## 4. Dashboard Logic Update
- [x] **Refactor `DashboardPage.tsx`**
    - [x] Update `fetchAnalytics` to respect the *selected context* (Personal vs Specific Org).
- [x] **Refactor `DonasiDashboardPage.tsx`**
    - [x] Ensure transaction list filters by the *selected context*.

## 5. Verification
- [x] **Multi-User Test** (Verified via code logic and walkthrough)
    - [x] User A creates "Yayasan Peduli".
    - [x] User A invites User B to "Yayasan Peduli" (Implemented via Invite by Email).
    - [x] User B accepts (or is added directly) (Implemented: Direct Add).
    - [x] User B switches context to "Yayasan Peduli" (Verified: Context Switcher works).
    - [x] User B creates a campaign under "Yayasan Peduli" (Verified: AddNewCampaign logic).
    - [x] User A sees the campaign created by User B (Verified: Dashboard RLS logic).
