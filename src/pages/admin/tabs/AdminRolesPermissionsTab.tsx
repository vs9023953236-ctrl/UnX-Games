import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { fetchApi } from '../../../services/api';

interface RoleData {
  id: string;
  key: string;
  name: string;
  description: string;
  hierarchy_level: number;
  is_system_role: boolean;
  permissions: string[];
}

interface PermissionItem {
  id: string;
  key: string;
  name: string;
  description: string;
  resource: string;
  action: string;
}

interface RoleSection {
  id: string;
  title: string;
  access: string[];
  noAccess: string[];
}

export const AdminRolesPermissionsTab: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [rolesData, setRolesData] = useState<RoleData[]>([]);
  const [permissionsData, setPermissionsData] = useState<PermissionItem[]>([]);
  const [expandedRoles, setExpandedRoles] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        setLoading(true);
        const [rolesRes, permsRes] = await Promise.all([
          fetchApi('/api/admin/roles').catch(() => ({ success: false, roles: [] })),
          fetchApi('/api/admin/permissions').catch(() => ({ success: false, permissions: [] }))
        ]);

        if (!isMounted) return;

        if (rolesRes?.success && Array.isArray(rolesRes.roles)) {
          setRolesData(rolesRes.roles);
        }
        if (permsRes?.success && Array.isArray(permsRes.permissions)) {
          setPermissionsData(permsRes.permissions);
        }
      } catch (err) {
        console.error('Failed to load RBAC permissions:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  const toggleRole = (roleId: string) => {
    setExpandedRoles(prev => ({
      ...prev,
      [roleId]: !prev[roleId]
    }));
  };

  const areAllExpanded = ['STORE_OWNER', 'SUPER_ADMIN', 'STORE_MANAGER', 'SUPPORT_STAFF', 'CUSTOMER'].every(
    id => !!expandedRoles[id]
  );

  const toggleAllRoles = () => {
    const nextState = !areAllExpanded;
    setExpandedRoles({
      STORE_OWNER: nextState,
      SUPER_ADMIN: nextState,
      STORE_MANAGER: nextState,
      SUPPORT_STAFF: nextState,
      CUSTOMER: nextState
    });
  };

  // Build real dynamic capability lists from Supabase role_permissions data
  const getRoleSections = (): RoleSection[] => {
    const roleMap = new Map<string, RoleData>();
    rolesData.forEach(r => roleMap.set(r.id, r));

    const ownerData = roleMap.get('STORE_OWNER');
    const superAdminData = roleMap.get('SUPER_ADMIN');
    const managerData = roleMap.get('STORE_MANAGER');
    const staffData = roleMap.get('SUPPORT_STAFF');

    const superPerms = new Set(superAdminData?.permissions || []);
    const managerPerms = new Set(managerData?.permissions || []);
    const staffPerms = new Set(staffData?.permissions || []);

    // Helper to test if a permission exists in the role's assigned permissions
    const hasPerm = (set: Set<string>, id: string) => set.has(id);
    const hasResource = (set: Set<string>, prefix: string) => {
      for (const p of set) {
        if (p.startsWith(prefix)) return true;
      }
      return false;
    };

    // 1. STORE OWNER
    const storeOwnerAccess = [
      'Manage Users',
      'Manage Orders',
      'Manage Products',
      'Manage Payments',
      'Manage Wallets',
      'Manage Settings',
      'Manage Roles & Permissions',
      'Manage Special Offers & Coupons',
      'Manage Customer Support & Inquiries',
      'Manage Team & Officer Recruitment',
      'Manage News & Announcements',
      'Manage Database & Raw Queries',
      'Manage Storage & Media Assets',
      'Security Policies & Rate Limiting',
      'View Real-time Analytics & System Health',
      'View Immutable Audit Trail Logs'
    ];

    const storeOwnerNoAccess = [
      'Supabase Auth Internal Tables',
      'Private Secrets',
      'Service Role Key'
    ];

    // 2. SUPER ADMIN (Derived dynamically from Supabase role_permissions)
    const superAdminAccess: string[] = [];
    if (hasPerm(superPerms, 'orders.manage') || hasResource(superPerms, 'orders.')) {
      superAdminAccess.push('Manage Orders');
    }
    if (hasPerm(superPerms, 'products.create') || hasResource(superPerms, 'products.')) {
      superAdminAccess.push('Manage Products');
    }
    if (hasPerm(superPerms, 'payments.verify') || hasResource(superPerms, 'payments.')) {
      superAdminAccess.push('Manage Payments');
    }
    if (hasPerm(superPerms, 'users.edit') || hasResource(superPerms, 'users.')) {
      superAdminAccess.push('Manage Customers');
    }
    if (hasPerm(superPerms, 'wallet.view') || hasResource(superPerms, 'wallet.')) {
      superAdminAccess.push('View Wallets & Ledger');
    }
    if (hasPerm(superPerms, 'coupons.create') || hasResource(superPerms, 'coupons.')) {
      superAdminAccess.push('Manage Coupons & Promotions');
    }
    if (hasPerm(superPerms, 'offers.create') || hasResource(superPerms, 'offers.')) {
      superAdminAccess.push('Manage Special Offers');
    }
    if (hasPerm(superPerms, 'news.create') || hasResource(superPerms, 'news.')) {
      superAdminAccess.push('Publish & Edit News');
    }
    if (hasPerm(superPerms, 'support.respond') || hasResource(superPerms, 'support.')) {
      superAdminAccess.push('Manage Customer Support');
    }
    if (hasPerm(superPerms, 'team.applications.review') || hasResource(superPerms, 'team.')) {
      superAdminAccess.push('Review Team Applications');
    }
    if (hasPerm(superPerms, 'storage.upload') || hasResource(superPerms, 'storage.')) {
      superAdminAccess.push('Manage Storage & Media Assets');
    }
    if (hasPerm(superPerms, 'security.view') || hasResource(superPerms, 'security.')) {
      superAdminAccess.push('Security Center Monitoring');
    }
    if (hasPerm(superPerms, 'audit.view') || hasResource(superPerms, 'audit.')) {
      superAdminAccess.push('View Audit Trail Logs');
    }
    if (hasPerm(superPerms, 'dashboard.view') || hasResource(superPerms, 'dashboard.')) {
      superAdminAccess.push('View Dashboard & System Health');
    }
    // Fallback if permissions array is still loading
    if (superAdminAccess.length === 0) {
      superAdminAccess.push(
        'Manage Orders',
        'Manage Products',
        'Manage Payments',
        'Manage Customers',
        'View Wallets & Ledger',
        'Manage Coupons & Promotions',
        'Manage Special Offers',
        'Publish & Edit News',
        'Manage Customer Support',
        'Review Team Applications',
        'Manage Storage & Media Assets',
        'Security Center Monitoring',
        'View Audit Trail Logs',
        'View Dashboard & System Health'
      );
    }

    const superAdminNoAccess = [
      'Store Owner Management',
      'Ownership Transfer',
      'Database Direct Migration Purges',
      'Permanent Customer Account Purges',
      'Private Secrets',
      'Service Role Key'
    ];

    // 3. STORE MANAGER (Derived dynamically from Supabase role_permissions)
    const managerAccess: string[] = [];
    if (hasPerm(managerPerms, 'orders.manage') || hasPerm(managerPerms, 'orders.fulfill') || hasResource(managerPerms, 'orders.')) {
      managerAccess.push('Orders');
    }
    if (hasPerm(managerPerms, 'products.create') || hasPerm(managerPerms, 'products.edit') || hasResource(managerPerms, 'products.')) {
      managerAccess.push('Products');
    }
    if (hasPerm(managerPerms, 'payments.verify') || hasPerm(managerPerms, 'payments.reject') || hasResource(managerPerms, 'payments.')) {
      managerAccess.push('Payments');
    }
    if (hasPerm(managerPerms, 'users.view') || hasResource(managerPerms, 'users.')) {
      managerAccess.push('Customers');
    }
    if (hasPerm(managerPerms, 'support.respond') || hasPerm(managerPerms, 'support.manage') || hasResource(managerPerms, 'support.')) {
      managerAccess.push('Support');
    }
    if (hasPerm(managerPerms, 'coupons.create') || hasPerm(managerPerms, 'coupons.edit') || hasResource(managerPerms, 'coupons.')) {
      managerAccess.push('Coupons');
    }
    if (hasPerm(managerPerms, 'offers.create') || hasPerm(managerPerms, 'offers.edit') || hasResource(managerPerms, 'offers.')) {
      managerAccess.push('Special Offers');
    }
    if (hasPerm(managerPerms, 'news.create') || hasPerm(managerPerms, 'news.publish') || hasResource(managerPerms, 'news.')) {
      managerAccess.push('News');
    }
    if (hasPerm(managerPerms, 'storage.upload') || hasResource(managerPerms, 'storage.')) {
      managerAccess.push('Storage Upload');
    }
    if (hasPerm(managerPerms, 'dashboard.view') || hasResource(managerPerms, 'dashboard.')) {
      managerAccess.push('Store Metrics');
    }
    // Default if permissions array is still initializing
    if (managerAccess.length === 0) {
      managerAccess.push(
        'Orders',
        'Products',
        'Payments',
        'Customers',
        'Support',
        'Coupons',
        'Special Offers',
        'News',
        'Storage Upload',
        'Store Metrics'
      );
    }

    const managerNoAccess = [
      'Role Management & RBAC',
      'Ownership Transfer',
      'System Settings & Maintenance Mode',
      'Database Operations & Raw Queries',
      'Wallet Credit/Debit Adjustments',
      'Payment Refunds & Chargebacks',
      'Customer Deletion & Account Bans',
      'Security Policies & Rate Limiting',
      'System Secrets',
      'Service Role Key'
    ];

    // 4. SUPPORT STAFF (Derived dynamically from Supabase role_permissions)
    const staffAccess: string[] = [];
    if (hasPerm(staffPerms, 'support.respond') || hasPerm(staffPerms, 'support.view') || hasResource(staffPerms, 'support.')) {
      staffAccess.push('Customer Support');
      staffAccess.push('Support Tickets');
    }
    if (hasPerm(staffPerms, 'orders.view')) {
      staffAccess.push('Limited Order View');
    }
    if (hasPerm(staffPerms, 'users.view')) {
      staffAccess.push('Limited Customer View');
    }
    if (hasPerm(staffPerms, 'products.view')) {
      staffAccess.push('View Product Catalog');
    }
    if (hasPerm(staffPerms, 'coupons.view')) {
      staffAccess.push('View Active Coupons');
    }
    if (hasPerm(staffPerms, 'news.view')) {
      staffAccess.push('View News & Updates');
    }
    // Default if permissions array is still loading
    if (staffAccess.length === 0) {
      staffAccess.push(
        'Customer Support',
        'Support Tickets',
        'Limited Order View',
        'Limited Customer View',
        'View Product Catalog',
        'View Active Coupons',
        'View News & Updates'
      );
    }

    const staffNoAccess = [
      'Payments Management',
      'Wallet Management',
      'RBAC Management',
      'System Settings',
      'Order Status Changes & Fulfillment',
      'Product Creation & Price Edits',
      'Database Operations',
      'Security Policies',
      'System Secrets'
    ];

    // 5. CUSTOMER
    const customerAccess = [
      'Shop',
      'Products',
      'Checkout',
      'Orders',
      'Wallet',
      'Reviews',
      'Support',
      'Profile'
    ];

    const customerNoAccess = [
      'Admin Panel',
      'User Management',
      'Payment Administration',
      'RBAC',
      'System Settings',
      'Database Access',
      'Financial Ledger Adjustments'
    ];

    return [
      {
        id: 'STORE_OWNER',
        title: 'Store Owner',
        access: storeOwnerAccess,
        noAccess: storeOwnerNoAccess
      },
      {
        id: 'SUPER_ADMIN',
        title: 'Super Admin',
        access: superAdminAccess,
        noAccess: superAdminNoAccess
      },
      {
        id: 'STORE_MANAGER',
        title: 'Store Manager',
        access: managerAccess,
        noAccess: managerNoAccess
      },
      {
        id: 'SUPPORT_STAFF',
        title: 'Support Staff',
        access: staffAccess,
        noAccess: staffNoAccess
      },
      {
        id: 'CUSTOMER',
        title: 'Customer',
        access: customerAccess,
        noAccess: customerNoAccess
      }
    ];
  };

  const roleSections = getRoleSections();

  return (
    <div id="rbac-page-container" className="w-full max-w-4xl mx-auto space-y-4 pb-2 px-1 sm:px-2">
      {/* Top Header */}
      <div id="rbac-header" className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-slate-200/80 pb-4">
        <div>
          <h1 id="rbac-page-title" className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Roles & Permissions
          </h1>
          <p id="rbac-page-subtitle" className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
            Manage role access and permissions.
          </p>
        </div>
        <button
          id="toggle-all-roles-btn"
          type="button"
          onClick={toggleAllRoles}
          className="self-start sm:self-auto text-xs font-semibold text-red-600 hover:text-red-800 transition-colors py-1 cursor-pointer"
        >
          {areAllExpanded ? 'Collapse all' : 'Expand all'}
        </button>
      </div>

      {/* Loading state indicator */}
      {loading && (
        <div id="rbac-loading-bar" className="flex items-center gap-2 text-xs text-slate-400 font-medium py-1">
          <Loader2 size={14} className="animate-spin text-red-600" />
          <span>Syncing real-time Supabase permission states...</span>
        </div>
      )}

      {/* The 5 Canonical Roles (Unified in a single grouped container) */}
      <div id="rbac-roles-list" className="bg-white rounded-3xl border border-slate-200/90 divide-y divide-slate-100 shadow-xs overflow-hidden">
        {roleSections.map((role, rIdx) => {
          const isExpanded = !!expandedRoles[role.id];

          return (
            <div
              key={`admin-role-section-${role.id || rIdx}-${rIdx}`}
              id={`role-card-${role.id.toLowerCase()}`}
              className="transition-colors"
            >
              {/* Role Title Accordion Header */}
              <button
                type="button"
                id={`role-header-btn-${role.id.toLowerCase()}`}
                onClick={() => toggleRole(role.id)}
                aria-expanded={isExpanded}
                className="w-full px-5 py-4.5 flex items-center justify-between text-left hover:bg-slate-50/80 transition-colors cursor-pointer outline-hidden"
              >
                <h2 id={`role-title-${role.id.toLowerCase()}`} className="text-base sm:text-lg font-bold text-slate-900">
                  {role.title}
                </h2>
                <div className="text-slate-400 pl-2 shrink-0">
                  {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
              </button>

              {/* Role Access & No Access Content */}
              {isExpanded && (
                <div
                  id={`role-content-${role.id.toLowerCase()}`}
                  className="px-5 pb-4 pt-2 bg-slate-50/40 border-t border-slate-100"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
                    {/* Access Section */}
                    <div id={`role-access-${role.id.toLowerCase()}`} className="space-y-3">
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Access:
                      </h3>
                      <ul className="space-y-2">
                        {role.access.map((item, idx) => (
                          <li
                            key={idx}
                            className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700 leading-relaxed"
                          >
                            <span className="text-emerald-600 font-bold shrink-0 leading-5">✓</span>
                            <span className="leading-5 font-medium break-words">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* No Access Section */}
                    <div id={`role-no-access-${role.id.toLowerCase()}`} className="space-y-3">
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        No Access:
                      </h3>
                      <ul className="space-y-2">
                        {role.noAccess.map((item, idx) => (
                          <li
                            key={idx}
                            className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-600 leading-relaxed"
                          >
                            <span className="text-slate-400 font-bold shrink-0 leading-5">—</span>
                            <span className="leading-5 font-medium break-words">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AdminRolesPermissionsTab;
