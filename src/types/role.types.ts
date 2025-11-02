// Enhanced Role Management System for BlockTrade Platform
// Supports multi-level hierarchy with platform provider and organization-specific roles

export type PlatformRole = 'platform_super_admin' | 'platform_admin' | 'platform_support';

export type OrganizationRole = 
  | 'organization_super_admin'
  | 'organization_admin'
  | 'organization_manager'
  | 'organization_user'
  | 'organization_viewer';

export type EntitySpecificRole = 
  | 'bank_admin' 
  | 'bank_officer' 
  | 'bank_specialist'
  | 'corporate_admin' 
  | 'corporate_manager'
  | 'corporate_user' 
  | 'nbfc_admin' 
  | 'nbfc_manager'
  | 'nbfc_user' 
  | 'logistics_admin' 
  | 'logistics_manager'
  | 'logistics_user' 
  | 'insurance_admin' 
  | 'insurance_manager'
  | 'insurance_user';

export type UserRole = PlatformRole | OrganizationRole | EntitySpecificRole;

export interface IRoleDefinition {
  id: string;
  name: string;
  displayName: string;
  description: string;
  level: RoleLevel;
  category: RoleCategory;
  permissions: string[];
  isDefault: boolean;
  isSystemRole: boolean;
  organizationId?: string; // null for platform roles, specific org ID for org roles
  entityType?: OrganizationType;
  parentRoleId?: string; // For hierarchical roles
  childRoles?: string[]; // Roles that this role can manage
  restrictions?: RoleRestriction[];
  metadata?: RoleMetadata;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
}

export interface IRoleHierarchy {
  organizationId: string;
  hierarchyTree: RoleHierarchyNode[];
  defaultRoles: string[]; // Role IDs that are default for this organization
  allowedRoles: string[]; // Role IDs that can be assigned in this organization
  customRoles: string[]; // Role IDs that are custom created for this organization
  createdAt: Date;
  updatedAt: Date;
}

export interface RoleHierarchyNode {
  roleId: string;
  level: number;
  children: RoleHierarchyNode[];
  permissions: string[];
  canManage: string[]; // Role IDs this role can manage
  canAssign: string[]; // Role IDs this role can assign to others
}

export interface IUserRole {
  userId: string;
  roleId: string;
  organizationId: string;
  assignedBy: string;
  assignedAt: Date;
  expiresAt?: Date;
  isTemporary: boolean;
  isActive: boolean;
  restrictions?: UserRoleRestriction[];
  metadata?: UserRoleMetadata;
}

export type RoleLevel = 
  | 'platform' 
  | 'organization_super' 
  | 'organization_admin' 
  | 'organization_standard' 
  | 'entity_specific';

export type RoleCategory = 
  | 'system' 
  | 'admin' 
  | 'manager' 
  | 'user' 
  | 'viewer' 
  | 'specialist';

export type OrganizationType = 'bank' | 'nbfc' | 'corporate' | 'logistics' | 'insurance';

export interface RoleRestriction {
  type: 'time_based' | 'ip_based' | 'feature_based' | 'data_based';
  value: any;
  description: string;
}

export interface UserRoleRestriction extends RoleRestriction {
  appliedBy: string;
  appliedAt: Date;
}

export interface RoleMetadata {
  departmentId?: string;
  regionId?: string;
  branchId?: string;
  costCenter?: string;
  reportingTo?: string;
  customFields?: Record<string, any>;
}

export interface UserRoleMetadata extends RoleMetadata {
  assignmentReason?: string;
  notes?: string;
}

// Enhanced permission system
export const PLATFORM_PERMISSIONS = {
  // Platform Management
  PLATFORM_FULL_ACCESS: 'platform:full_access',
  PLATFORM_USER_MANAGE: 'platform:user_manage',
  PLATFORM_ORG_MANAGE: 'platform:org_manage',
  PLATFORM_ROLE_MANAGE: 'platform:role_manage',
  PLATFORM_SYSTEM_CONFIG: 'platform:system_config',
  PLATFORM_MONITORING: 'platform:monitoring',
  PLATFORM_AUDIT: 'platform:audit',
  PLATFORM_BILLING: 'platform:billing',
  PLATFORM_SUPPORT: 'platform:support',
  
  // Multi-tenant Management
  PLATFORM_TENANT_CREATE: 'platform:tenant_create',
  PLATFORM_TENANT_DELETE: 'platform:tenant_delete',
  PLATFORM_TENANT_CONFIGURE: 'platform:tenant_configure',
  PLATFORM_DATA_ISOLATION: 'platform:data_isolation',
  
  // System Operations
  PLATFORM_MAINTENANCE: 'platform:maintenance',
  PLATFORM_BACKUP: 'platform:backup',
  PLATFORM_SECURITY: 'platform:security',
  PLATFORM_REPORTS: 'platform:reports'
} as const;

export const ORGANIZATION_PERMISSIONS = {
  // Organization Management
  ORG_FULL_ACCESS: 'org:full_access',
  ORG_SETTINGS: 'org:settings',
  ORG_BRANDING: 'org:branding',
  ORG_BILLING: 'org:billing',
  ORG_AUDIT: 'org:audit',
  
  // User Management within Organization
  ORG_USER_CREATE: 'org:user_create',
  ORG_USER_DELETE: 'org:user_delete',
  ORG_USER_MANAGE: 'org:user_manage',
  ORG_USER_VIEW: 'org:user_view',
  
  // Role Management within Organization
  ORG_ROLE_CREATE: 'org:role_create',
  ORG_ROLE_DELETE: 'org:role_delete',
  ORG_ROLE_ASSIGN: 'org:role_assign',
  ORG_ROLE_MANAGE: 'org:role_manage',
  
  // Department/Structure Management
  ORG_DEPT_MANAGE: 'org:dept_manage',
  ORG_STRUCTURE_MANAGE: 'org:structure_manage',
  ORG_WORKFLOW_MANAGE: 'org:workflow_manage',
  
  // Reporting and Analytics
  ORG_REPORTS_VIEW: 'org:reports_view',
  ORG_ANALYTICS_VIEW: 'org:analytics_view',
  ORG_EXPORT_DATA: 'org:export_data'
} as const;

export const BUSINESS_PERMISSIONS = {
  // Letter of Credit permissions
  LC_CREATE: 'lc:create',
  LC_VIEW: 'lc:view',
  LC_VIEW_ALL: 'lc:view_all',
  LC_EDIT: 'lc:edit',
  LC_APPROVE: 'lc:approve',
  LC_REJECT: 'lc:reject',
  LC_AMEND: 'lc:amend',
  LC_CANCEL: 'lc:cancel',
  LC_CLOSE: 'lc:close',
  LC_REOPEN: 'lc:reopen',
  
  // Document permissions
  DOCUMENT_UPLOAD: 'document:upload',
  DOCUMENT_VIEW: 'document:view',
  DOCUMENT_VERIFY: 'document:verify',
  DOCUMENT_REJECT: 'document:reject',
  DOCUMENT_DOWNLOAD: 'document:download',
  DOCUMENT_DELETE: 'document:delete',
  DOCUMENT_MANAGE: 'document:manage',
  
  // Payment permissions
  PAYMENT_INITIATE: 'payment:initiate',
  PAYMENT_APPROVE: 'payment:approve',
  PAYMENT_VIEW: 'payment:view',
  PAYMENT_PROCESS: 'payment:process',
  PAYMENT_RECONCILE: 'payment:reconcile',
  
  // Trade Finance Operations
  TRADE_FINANCE_VIEW: 'trade_finance:view',
  TRADE_FINANCE_MANAGE: 'trade_finance:manage',
  TRADE_FINANCE_APPROVE: 'trade_finance:approve',
  
  // KYC permissions
  KYC_VIEW: 'kyc:view',
  KYC_VERIFY: 'kyc:verify',
  KYC_MANAGE: 'kyc:manage',
  KYC_APPROVE: 'kyc:approve',
  
  // Compliance permissions
  COMPLIANCE_VIEW: 'compliance:view',
  COMPLIANCE_MANAGE: 'compliance:manage',
  COMPLIANCE_AUDIT: 'compliance:audit',
  
  // Reporting permissions
  REPORT_VIEW: 'report:view',
  REPORT_CREATE: 'report:create',
  REPORT_EXPORT: 'report:export',
  REPORT_ADMIN: 'report:admin'
} as const;

// Default role definitions
export const DEFAULT_PLATFORM_ROLES: Partial<IRoleDefinition>[] = [
  {
    id: 'platform_super_admin',
    name: 'platform_super_admin',
    displayName: 'Platform Super Administrator',
    description: 'Full platform access with all administrative privileges',
    level: 'platform',
    category: 'system',
    isDefault: true,
    isSystemRole: true,
    permissions: Object.values(PLATFORM_PERMISSIONS),
    isActive: true
  },
  {
    id: 'platform_admin',
    name: 'platform_admin',
    displayName: 'Platform Administrator',
    description: 'Platform administration with limited system access',
    level: 'platform',
    category: 'admin',
    isDefault: true,
    isSystemRole: true,
    permissions: [
      PLATFORM_PERMISSIONS.PLATFORM_USER_MANAGE,
      PLATFORM_PERMISSIONS.PLATFORM_ORG_MANAGE,
      PLATFORM_PERMISSIONS.PLATFORM_ROLE_MANAGE,
      PLATFORM_PERMISSIONS.PLATFORM_MONITORING,
      PLATFORM_PERMISSIONS.PLATFORM_AUDIT,
      PLATFORM_PERMISSIONS.PLATFORM_SUPPORT,
      PLATFORM_PERMISSIONS.PLATFORM_TENANT_CONFIGURE,
      PLATFORM_PERMISSIONS.PLATFORM_REPORTS
    ],
    isActive: true
  },
  {
    id: 'platform_support',
    name: 'platform_support',
    displayName: 'Platform Support',
    description: 'Platform support with read-only access and user assistance',
    level: 'platform',
    category: 'user',
    isDefault: true,
    isSystemRole: true,
    permissions: [
      PLATFORM_PERMISSIONS.PLATFORM_SUPPORT,
      PLATFORM_PERMISSIONS.PLATFORM_MONITORING
    ],
    isActive: true
  }
];

export const DEFAULT_ORGANIZATION_ROLES: Partial<IRoleDefinition>[] = [
  {
    id: 'organization_super_admin',
    name: 'organization_super_admin',
    displayName: 'Organization Super Administrator',
    description: 'Complete organization management with all privileges',
    level: 'organization_super',
    category: 'admin',
    isDefault: true,
    isSystemRole: true,
    permissions: [...Object.values(ORGANIZATION_PERMISSIONS), ...Object.values(BUSINESS_PERMISSIONS)] as any[],
    isActive: true
  },
  {
    id: 'organization_admin',
    name: 'organization_admin',
    displayName: 'Organization Administrator',
    description: 'Organization administration with user and role management',
    level: 'organization_admin',
    category: 'admin',
    isDefault: true,
    isSystemRole: true,
    permissions: [
      ORGANIZATION_PERMISSIONS.ORG_SETTINGS,
      ORGANIZATION_PERMISSIONS.ORG_USER_CREATE,
      ORGANIZATION_PERMISSIONS.ORG_USER_MANAGE,
      ORGANIZATION_PERMISSIONS.ORG_USER_VIEW,
      ORGANIZATION_PERMISSIONS.ORG_ROLE_ASSIGN,
      ORGANIZATION_PERMISSIONS.ORG_ROLE_MANAGE,
      ORGANIZATION_PERMISSIONS.ORG_REPORTS_VIEW,
      ORGANIZATION_PERMISSIONS.ORG_ANALYTICS_VIEW,
      ...Object.values(BUSINESS_PERMISSIONS).filter(p => 
        p.includes(':view') || p.includes(':manage') || p.includes(':create')
      )
    ],
    isActive: true
  },
  {
    id: 'organization_manager',
    name: 'organization_manager',
    displayName: 'Organization Manager',
    description: 'Department or team management with limited admin access',
    level: 'organization_standard',
    category: 'manager',
    isDefault: true,
    isSystemRole: true,
    permissions: [
      ORGANIZATION_PERMISSIONS.ORG_USER_VIEW,
      ORGANIZATION_PERMISSIONS.ORG_REPORTS_VIEW,
      BUSINESS_PERMISSIONS.LC_CREATE,
      BUSINESS_PERMISSIONS.LC_VIEW,
      BUSINESS_PERMISSIONS.LC_EDIT,
      BUSINESS_PERMISSIONS.LC_APPROVE,
      BUSINESS_PERMISSIONS.DOCUMENT_VIEW,
      BUSINESS_PERMISSIONS.DOCUMENT_VERIFY,
      BUSINESS_PERMISSIONS.PAYMENT_VIEW,
      BUSINESS_PERMISSIONS.PAYMENT_APPROVE,
      BUSINESS_PERMISSIONS.REPORT_VIEW,
      BUSINESS_PERMISSIONS.REPORT_CREATE
    ],
    isActive: true
  },
  {
    id: 'organization_user',
    name: 'organization_user',
    displayName: 'Organization User',
    description: 'Standard user with basic operational permissions',
    level: 'organization_standard',
    category: 'user',
    isDefault: true,
    isSystemRole: true,
    permissions: [
      BUSINESS_PERMISSIONS.LC_VIEW,
      BUSINESS_PERMISSIONS.LC_CREATE,
      BUSINESS_PERMISSIONS.DOCUMENT_UPLOAD,
      BUSINESS_PERMISSIONS.DOCUMENT_VIEW,
      BUSINESS_PERMISSIONS.DOCUMENT_DOWNLOAD,
      BUSINESS_PERMISSIONS.PAYMENT_VIEW,
      BUSINESS_PERMISSIONS.REPORT_VIEW
    ],
    isActive: true
  },
  {
    id: 'organization_viewer',
    name: 'organization_viewer',
    displayName: 'Organization Viewer',
    description: 'Read-only access for viewing and reporting',
    level: 'organization_standard',
    category: 'viewer',
    isDefault: true,
    isSystemRole: true,
    permissions: [
      BUSINESS_PERMISSIONS.LC_VIEW,
      BUSINESS_PERMISSIONS.DOCUMENT_VIEW,
      BUSINESS_PERMISSIONS.PAYMENT_VIEW,
      BUSINESS_PERMISSIONS.REPORT_VIEW
    ],
    isActive: true
  }
];

// Entity-specific role templates (will be customized per organization type)
export const ENTITY_ROLE_TEMPLATES: Record<OrganizationType, Partial<IRoleDefinition>[]> = {
  bank: [
    {
      id: 'bank_admin',
      name: 'bank_admin',
      displayName: 'Bank Administrator',
      description: 'Bank-specific administrative operations and compliance',
      level: 'entity_specific',
      category: 'admin',
      isDefault: true,
      permissions: [
        BUSINESS_PERMISSIONS.LC_CREATE,
        BUSINESS_PERMISSIONS.LC_VIEW_ALL,
        BUSINESS_PERMISSIONS.LC_APPROVE,
        BUSINESS_PERMISSIONS.LC_REJECT,
        BUSINESS_PERMISSIONS.PAYMENT_PROCESS,
        BUSINESS_PERMISSIONS.PAYMENT_RECONCILE,
        BUSINESS_PERMISSIONS.KYC_VERIFY,
        BUSINESS_PERMISSIONS.COMPLIANCE_MANAGE,
        BUSINESS_PERMISSIONS.REPORT_ADMIN
      ]
    },
    {
      id: 'bank_officer',
      name: 'bank_officer',
      displayName: 'Bank Officer',
      description: 'Bank operations and customer service',
      level: 'entity_specific',
      category: 'user',
      isDefault: true,
      permissions: [
        BUSINESS_PERMISSIONS.LC_CREATE,
        BUSINESS_PERMISSIONS.LC_VIEW,
        BUSINESS_PERMISSIONS.LC_EDIT,
        BUSINESS_PERMISSIONS.DOCUMENT_VERIFY,
        BUSINESS_PERMISSIONS.PAYMENT_VIEW,
        BUSINESS_PERMISSIONS.KYC_VIEW,
        BUSINESS_PERMISSIONS.REPORT_VIEW
      ]
    }
  ],
  corporate: [
    {
      id: 'corporate_admin',
      name: 'corporate_admin',
      displayName: 'Corporate Administrator',
      description: 'Corporate trade finance operations management',
      level: 'entity_specific',
      category: 'admin',
      isDefault: true,
      permissions: [
        BUSINESS_PERMISSIONS.LC_VIEW,
        BUSINESS_PERMISSIONS.LC_CREATE,
        BUSINESS_PERMISSIONS.DOCUMENT_MANAGE,
        BUSINESS_PERMISSIONS.PAYMENT_VIEW,
        BUSINESS_PERMISSIONS.TRADE_FINANCE_MANAGE,
        BUSINESS_PERMISSIONS.REPORT_CREATE
      ]
    },
    {
      id: 'corporate_manager',
      name: 'corporate_manager',
      displayName: 'Corporate Manager',
      description: 'Corporate department management and approvals',
      level: 'entity_specific',
      category: 'manager',
      isDefault: true,
      permissions: [
        BUSINESS_PERMISSIONS.LC_VIEW,
        BUSINESS_PERMISSIONS.LC_APPROVE,
        BUSINESS_PERMISSIONS.DOCUMENT_VIEW,
        BUSINESS_PERMISSIONS.PAYMENT_APPROVE,
        BUSINESS_PERMISSIONS.REPORT_VIEW
      ]
    }
  ],
  nbfc: [
    {
      id: 'nbfc_admin',
      name: 'nbfc_admin',
      displayName: 'NBFC Administrator',
      description: 'Non-banking financial company operations',
      level: 'entity_specific',
      category: 'admin',
      isDefault: true,
      permissions: [
        BUSINESS_PERMISSIONS.LC_VIEW,
        BUSINESS_PERMISSIONS.PAYMENT_INITIATE,
        BUSINESS_PERMISSIONS.PAYMENT_APPROVE,
        BUSINESS_PERMISSIONS.KYC_MANAGE,
        BUSINESS_PERMISSIONS.COMPLIANCE_VIEW,
        BUSINESS_PERMISSIONS.REPORT_EXPORT
      ]
    }
  ],
  logistics: [
    {
      id: 'logistics_admin',
      name: 'logistics_admin',
      displayName: 'Logistics Administrator',
      description: 'Logistics and shipping operations management',
      level: 'entity_specific',
      category: 'admin',
      isDefault: true,
      permissions: [
        BUSINESS_PERMISSIONS.LC_VIEW,
        BUSINESS_PERMISSIONS.DOCUMENT_UPLOAD,
        BUSINESS_PERMISSIONS.DOCUMENT_MANAGE,
        BUSINESS_PERMISSIONS.TRADE_FINANCE_VIEW
      ]
    }
  ],
  insurance: [
    {
      id: 'insurance_admin',
      name: 'insurance_admin',
      displayName: 'Insurance Administrator',
      description: 'Insurance and risk management operations',
      level: 'entity_specific',
      category: 'admin',
      isDefault: true,
      permissions: [
        BUSINESS_PERMISSIONS.LC_VIEW,
        BUSINESS_PERMISSIONS.DOCUMENT_VIEW,
        BUSINESS_PERMISSIONS.PAYMENT_VIEW,
        BUSINESS_PERMISSIONS.COMPLIANCE_VIEW,
        BUSINESS_PERMISSIONS.REPORT_VIEW
      ]
    }
  ]
};

// Role assignment rules and validation
export interface RoleAssignmentRule {
  sourceRoleId: string;
  canAssignRoles: string[];
  canManageUsers: boolean;
  canCreateCustomRoles: boolean;
  maxUsersManageable?: number;
  requiresApproval: boolean;
  approverRoles: string[];
}

export const ROLE_ASSIGNMENT_RULES: RoleAssignmentRule[] = [
  {
    sourceRoleId: 'platform_super_admin',
    canAssignRoles: ['*'], // Can assign any role
    canManageUsers: true,
    canCreateCustomRoles: true,
    requiresApproval: false,
    approverRoles: []
  },
  {
    sourceRoleId: 'organization_super_admin',
    canAssignRoles: [
      'organization_admin',
      'organization_manager', 
      'organization_user',
      'organization_viewer'
    ],
    canManageUsers: true,
    canCreateCustomRoles: true,
    requiresApproval: false,
    approverRoles: []
  },
  {
    sourceRoleId: 'organization_admin',
    canAssignRoles: [
      'organization_manager',
      'organization_user',
      'organization_viewer'
    ],
    canManageUsers: true,
    canCreateCustomRoles: false,
    maxUsersManageable: 100,
    requiresApproval: false,
    approverRoles: []
  },
  {
    sourceRoleId: 'organization_manager',
    canAssignRoles: [
      'organization_user',
      'organization_viewer'
    ],
    canManageUsers: true,
    canCreateCustomRoles: false,
    maxUsersManageable: 25,
    requiresApproval: true,
    approverRoles: ['organization_admin', 'organization_super_admin']
  }
];

export interface CreateRoleRequest {
  name: string;
  displayName: string;
  description: string;
  level: RoleLevel;
  category: RoleCategory;
  permissions: string[];
  organizationId?: string;
  entityType?: OrganizationType;
  parentRoleId?: string;
  restrictions?: RoleRestriction[];
  metadata?: RoleMetadata;
}

export interface AssignRoleRequest {
  userId: string;
  roleId: string;
  organizationId: string;
  expiresAt?: Date;
  isTemporary?: boolean;
  restrictions?: UserRoleRestriction[];
  metadata?: UserRoleMetadata;
}

export interface UpdateRoleRequest {
  displayName?: string;
  description?: string;
  permissions?: string[];
  restrictions?: RoleRestriction[];
  metadata?: RoleMetadata;
  isActive?: boolean;
}

// User journey and onboarding types
export interface UserJourneyStep {
  step: number;
  name: string;
  description: string;
  requiredFields: string[];
  optionalFields: string[];
  validations: JourneyValidation[];
  nextSteps: string[];
  permissions: string[];
  roleAssignments?: string[];
}

export interface JourneyValidation {
  field: string;
  type: 'required' | 'format' | 'custom';
  rule: string;
  message: string;
}

export interface UserOnboardingState {
  userId: string;
  organizationId: string;
  currentStep: number;
  completedSteps: number[];
  stepData: Record<string, any>;
  startedAt: Date;
  completedAt?: Date;
  isComplete: boolean;
  assignedRoles: string[];
  temporaryPermissions: string[];
}
