import { v4 as uuidv4 } from 'uuid';
import { CreateUserRequest } from '../types/user.types';
import { CreateOrganizationRequest } from '../types/organization.types';

// Demo organizations
export const demoOrganizations: CreateOrganizationRequest[] = [
  {
    name: 'Global Trade Bank',
    type: 'bank',
    registrationNumber: 'GTB-2024-001',
    countryCode: 'USA',
    address: {
      street: '123 Financial District',
      city: 'New York',
      state: 'NY',
      country: 'United States',
      postalCode: '10001'
    },
    contactPerson: {
      name: 'Sarah Johnson',
      email: 'sarah.johnson@globaltrade.com',
      phone: '+1-555-0123',
      designation: 'Head of Trade Finance'
    },
    swiftCode: 'GTBKUS33XXX'
  },
  {
    name: 'Prime Capital NBFC',
    type: 'nbfc',
    registrationNumber: 'PCNBFC-2024-002',
    countryCode: 'IND',
    address: {
      street: '456 Business Park',
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'India',
      postalCode: '400001'
    },
    contactPerson: {
      name: 'Rajesh Kumar',
      email: 'rajesh.kumar@primecapital.com',
      phone: '+91-98765-43210',
      designation: 'Chief Investment Officer'
    },
    licenseNumber: 'NBFC-LC-2024-002'
  },
  {
    name: 'TechCorp Industries',
    type: 'corporate',
    registrationNumber: 'TC-IND-2024-003',
    countryCode: 'USA',
    address: {
      street: '789 Innovation Boulevard',
      city: 'San Francisco',
      state: 'CA',
      country: 'United States',
      postalCode: '94105'
    },
    contactPerson: {
      name: 'Michael Chen',
      email: 'michael.chen@techcorp.com',
      phone: '+1-555-0456',
      designation: 'CFO'
    },
    tradingLicense: 'TL-CA-2024-003'
  },
  {
    name: 'Swift Logistics Ltd',
    type: 'logistics',
    registrationNumber: 'SL-UK-2024-004',
    countryCode: 'GBR',
    address: {
      street: '321 Port Street',
      city: 'London',
      state: 'England',
      country: 'United Kingdom',
      postalCode: 'E1 6AN'
    },
    contactPerson: {
      name: 'Emma Wilson',
      email: 'emma.wilson@swiftlogistics.co.uk',
      phone: '+44-20-7123-4567',
      designation: 'Operations Director'
    }
  },
  {
    name: 'SecureShield Insurance',
    type: 'insurance',
    registrationNumber: 'SSI-SG-2024-005',
    countryCode: 'SGP',
    address: {
      street: '159 Marina Bay Drive',
      city: 'Singapore',
      state: 'Singapore',
      country: 'Singapore',
      postalCode: '018938'
    },
    contactPerson: {
      name: 'David Tan',
      email: 'david.tan@secureshield.sg',
      phone: '+65-6123-4567',
      designation: 'Head of Trade Insurance'
    },
    licenseNumber: 'INS-SG-2024-005'
  }
];

// Generate organization IDs for the demo data
export const organizationIds = {
  globalTradeBank: uuidv4(),
  primeCapitalNBFC: uuidv4(),
  techCorpIndustries: uuidv4(),
  swiftLogistics: uuidv4(),
  secureShieldInsurance: uuidv4()
};

// Demo users for different organizations and roles
export const demoUsers = [
  // Global Trade Bank - Bank Users
  {
    username: 'sarah_admin',
    email: 'sarah.admin@globaltrade.com',
    password: 'SecurePass123!',
    firstName: 'Sarah',
    lastName: 'Johnson',
    role: 'bank_admin',
    organizationId: organizationIds.globalTradeBank,
    organizationName: 'Global Trade Bank',
    organizationType: 'bank',
    phone: '+1-555-0123',
    address: {
      street: '123 Financial District',
      city: 'New York',
      state: 'NY',
      country: 'United States',
      postalCode: '10005'
    }
  },
  {
    username: 'john_officer',
    email: 'john.officer@globaltrade.com',
    password: 'SecurePass123!',
    firstName: 'John',
    lastName: 'Smith',
    role: 'bank_officer',
    organizationId: organizationIds.globalTradeBank,
    organizationName: 'Global Trade Bank',
    organizationType: 'bank',
    phone: '+1-555-0124'
  },
  
  // Prime Capital NBFC - NBFC Users
  {
    username: 'rajesh_admin',
    email: 'rajesh.admin@primecapital.com',
    password: 'SecurePass123!',
    firstName: 'Rajesh',
    lastName: 'Kumar',
    role: 'nbfc_admin',
    organizationId: organizationIds.primeCapitalNBFC,
    organizationName: 'Prime Capital NBFC',
    organizationType: 'nbfc',
    phone: '+91-98765-43210',
    address: {
      street: '456 Business Park',
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'India',
      postalCode: '400001'
    }
  },
  {
    username: 'priya_user',
    email: 'priya.user@primecapital.com',
    password: 'SecurePass123!',
    firstName: 'Priya',
    lastName: 'Sharma',
    role: 'nbfc_user',
    organizationId: organizationIds.primeCapitalNBFC,
    organizationName: 'Prime Capital NBFC',
    organizationType: 'nbfc',
    phone: '+91-98765-43211'
  },

  // TechCorp Industries - Corporate Users
  {
    username: 'michael_admin',
    email: 'michael.admin@techcorp.com',
    password: 'SecurePass123!',
    firstName: 'Michael',
    lastName: 'Chen',
    role: 'corporate_admin',
    organizationId: organizationIds.techCorpIndustries,
    organizationName: 'TechCorp Industries',
    organizationType: 'corporate',
    phone: '+1-555-0456',
    address: {
      street: '789 Innovation Boulevard',
      city: 'San Francisco',
      state: 'CA',
      country: 'United States',
      postalCode: '94105'
    }
  },
  {
    username: 'lisa_user',
    email: 'lisa.user@techcorp.com',
    password: 'SecurePass123!',
    firstName: 'Lisa',
    lastName: 'Wang',
    role: 'corporate_user',
    organizationId: organizationIds.techCorpIndustries,
    organizationName: 'TechCorp Industries',
    organizationType: 'corporate',
    phone: '+1-555-0457'
  },

  // Swift Logistics - Logistics Users
  {
    username: 'emma_admin',
    email: 'emma.admin@swiftlogistics.co.uk',
    password: 'SecurePass123!',
    firstName: 'Emma',
    lastName: 'Wilson',
    role: 'logistics_admin',
    organizationId: organizationIds.swiftLogistics,
    organizationName: 'Swift Logistics Ltd',
    organizationType: 'logistics',
    phone: '+44-20-7123-4567',
    address: {
      street: '321 Port Street',
      city: 'London',
      state: 'England',
      country: 'United Kingdom',
      postalCode: 'E1 6AN'
    }
  },
  {
    username: 'james_user',
    email: 'james.user@swiftlogistics.co.uk',
    password: 'SecurePass123!',
    firstName: 'James',
    lastName: 'Brown',
    role: 'logistics_user',
    organizationId: organizationIds.swiftLogistics,
    organizationName: 'Swift Logistics Ltd',
    organizationType: 'logistics',
    phone: '+44-20-7123-4568'
  },

  // SecureShield Insurance - Insurance Users
  {
    username: 'david_admin',
    email: 'david.admin@secureshield.sg',
    password: 'SecurePass123!',
    firstName: 'David',
    lastName: 'Tan',
    role: 'insurance_admin',
    organizationId: organizationIds.secureShieldInsurance,
    organizationName: 'SecureShield Insurance',
    organizationType: 'insurance',
    phone: '+65-6123-4567',
    address: {
      street: '159 Marina Bay Drive',
      city: 'Singapore',
      state: 'Singapore',
      country: 'Singapore',
      postalCode: '018938'
    }
  },
  {
    username: 'amy_user',
    email: 'amy.user@secureshield.sg',
    password: 'SecurePass123!',
    firstName: 'Amy',
    lastName: 'Lim',
    role: 'insurance_user',
    organizationId: organizationIds.secureShieldInsurance,
    organizationName: 'SecureShield Insurance',
    organizationType: 'insurance',
    phone: '+65-6123-4568'
  }
];

// Helper function to get a user by role for testing
export const getUserByRole = (role: string) => {
  return demoUsers.find(user => user.role === role);
};

// Helper function to get users by organization type
export const getUsersByOrgType = (orgType: string) => {
  return demoUsers.filter(user => user.organizationType === orgType);
};

// Test login credentials for easy testing
export const testCredentials = {
  bankAdmin: {
    username: 'sarah_admin',
    password: 'SecurePass123!',
    role: 'bank_admin',
    organizationType: 'bank'
  },
  bankOfficer: {
    username: 'john_officer',
    password: 'SecurePass123!',
    role: 'bank_officer',
    organizationType: 'bank'
  },
  corporateAdmin: {
    username: 'michael_admin',
    password: 'SecurePass123!',
    role: 'corporate_admin',
    organizationType: 'corporate'
  },
  corporateUser: {
    username: 'lisa_user',
    password: 'SecurePass123!',
    role: 'corporate_user',
    organizationType: 'corporate'
  },
  nbfcAdmin: {
    username: 'rajesh_admin',
    password: 'SecurePass123!',
    role: 'nbfc_admin',
    organizationType: 'nbfc'
  },
  logisticsAdmin: {
    username: 'emma_admin',
    password: 'SecurePass123!',
    role: 'logistics_admin',
    organizationType: 'logistics'
  },
  insuranceAdmin: {
    username: 'david_admin',
    password: 'SecurePass123!',
    role: 'insurance_admin',
    organizationType: 'insurance'
  }
};

export default {
  demoOrganizations,
  demoUsers,
  organizationIds,
  getUserByRole,
  getUsersByOrgType,
  testCredentials
};
