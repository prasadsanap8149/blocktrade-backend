# Frontend Integration Guide for BlockTrade APIs

## 🎯 Overview

This guide helps frontend developers understand and integrate with BlockTrade's authentication and Letter of Credit APIs using the provided Postman collection.

## 🚀 Getting Started

### 1. Import Postman Collection

1. **Download**: `blocktrade-auth-lc-api.postman_collection.json`
2. **Import**: Open Postman → Import → Upload the file
3. **Environment**: Set up environment variables:
   ```json
   {
     "base_url": "http://localhost:3000/api",
     "access_token": "",
     "refresh_token": "",
     "user_id": "",
     "organization_id": ""
   }
   ```

### 2. Test Authentication Flow

1. **Run**: "Login - Bank Admin" request
2. **Verify**: Check that tokens are automatically saved
3. **Test**: Run "Get Current User Profile" to verify authentication

## 🔐 Authentication Integration

### Login Flow

```typescript
// Frontend Login Implementation
interface LoginRequest {
  username: string;
  password: string;
  mfaCode?: string;
  rememberMe?: boolean;
}

interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    tokens: {
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
    };
  };
}

// Example implementation
async function login(credentials: LoginRequest): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(credentials),
  });

  const data = await response.json();

  if (data.success) {
    // Store tokens securely
    localStorage.setItem("access_token", data.data.tokens.accessToken);
    localStorage.setItem("refresh_token", data.data.tokens.refreshToken);
    localStorage.setItem("user", JSON.stringify(data.data.user));
  }

  return data;
}
```

### Registration Flow

```typescript
interface RegistrationRequest {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  organizationId: string;
  organizationName: string;
  organizationType: OrganizationType;
  permissions?: string[];
  phone?: string;
  acceptTerms: boolean;
  address?: Address;
}

async function register(userData: RegistrationRequest): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(userData),
  });

  return response.json();
}
```

### Token Management

```typescript
// Automatic token refresh
class AuthService {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor() {
    this.loadTokensFromStorage();
  }

  private loadTokensFromStorage() {
    this.accessToken = localStorage.getItem("access_token");
    this.refreshToken = localStorage.getItem("refresh_token");
  }

  async makeAuthenticatedRequest(url: string, options: RequestInit = {}) {
    const headers = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    if (this.accessToken) {
      headers["Authorization"] = `Bearer ${this.accessToken}`;
    }

    let response = await fetch(url, { ...options, headers });

    // Handle token expiry
    if (response.status === 401 && this.refreshToken) {
      const newToken = await this.refreshAccessToken();
      if (newToken) {
        headers["Authorization"] = `Bearer ${newToken}`;
        response = await fetch(url, { ...options, headers });
      }
    }

    return response;
  }

  private async refreshAccessToken(): Promise<string | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });

      const data = await response.json();

      if (data.success) {
        this.accessToken = data.data.tokens.accessToken;
        this.refreshToken = data.data.tokens.refreshToken;
        localStorage.setItem("access_token", this.accessToken);
        localStorage.setItem("refresh_token", this.refreshToken);
        return this.accessToken;
      }
    } catch (error) {
      console.error("Token refresh failed:", error);
      this.logout();
    }

    return null;
  }

  logout() {
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
  }
}
```

## 📄 Letter of Credit Integration

### Create LC

```typescript
interface CreateLCRequest {
  type: "commercial" | "standby";
  applicant: {
    name: string;
    address: Address;
    contact: Contact;
  };
  beneficiary: {
    name: string;
    address: Address;
    contact: Contact;
  };
  issuingBank: BankDetails;
  advisingBank?: BankDetails;
  amount: {
    value: number;
    currency: string;
  };
  goodsDescription: string;
  paymentTerms: string;
  shipmentTerms: ShipmentTerms;
  documents: {
    required: DocumentRequirement[];
  };
  dateIssued: string;
  expiryDate: string;
  shipmentDate: string;
  presentationPeriod: number;
  confirmationRequired: boolean;
  transferable: boolean;
  notes?: string;
}

async function createLC(lcData: CreateLCRequest) {
  const authService = new AuthService();

  const response = await authService.makeAuthenticatedRequest(
    `${API_BASE_URL}/lc`,
    {
      method: "POST",
      body: JSON.stringify(lcData),
    }
  );

  return response.json();
}
```

### Search LCs

```typescript
interface SearchLCParams {
  page?: number;
  limit?: number;
  status?: LCStatus;
  type?: LCType;
  minAmount?: number;
  maxAmount?: number;
  currency?: string;
  applicant?: string;
  beneficiary?: string;
  fromDate?: string;
  toDate?: string;
  sort?: string;
  order?: "asc" | "desc";
}

async function searchLCs(params: SearchLCParams) {
  const authService = new AuthService();
  const queryString = new URLSearchParams(
    Object.entries(params)
      .filter(([_, value]) => value !== undefined)
      .map(([key, value]) => [key, String(value)])
  ).toString();

  const response = await authService.makeAuthenticatedRequest(
    `${API_BASE_URL}/lc?${queryString}`
  );

  return response.json();
}
```

### Update LC Status

```typescript
interface UpdateLCStatusRequest {
  status: LCStatus;
  reason: string;
  metadata?: Record<string, any>;
}

async function updateLCStatus(
  lcId: string,
  statusUpdate: UpdateLCStatusRequest
) {
  const authService = new AuthService();

  const response = await authService.makeAuthenticatedRequest(
    `${API_BASE_URL}/lc/${lcId}/status`,
    {
      method: "PATCH",
      body: JSON.stringify(statusUpdate),
    }
  );

  return response.json();
}
```

## 🛠️ Frontend Components Examples

### React Authentication Hook

```typescript
import { useState, useEffect, useContext, createContext } from "react";

interface AuthContextType {
  user: User | null;
  login: (credentials: LoginRequest) => Promise<boolean>;
  register: (userData: RegistrationRequest) => Promise<boolean>;
  logout: () => void;
  updateProfile: (updates: UpdateProfileRequest) => Promise<boolean>;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const authService = new AuthService();

  useEffect(() => {
    // Check for existing authentication on app load
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = async (credentials: LoginRequest): Promise<boolean> => {
    try {
      const response = await authService.login(credentials);
      if (response.success) {
        setUser(response.data.user);
        return true;
      }
    } catch (error) {
      console.error("Login failed:", error);
    }
    return false;
  };

  const register = async (userData: RegistrationRequest): Promise<boolean> => {
    try {
      const response = await authService.register(userData);
      if (response.success) {
        setUser(response.data.user);
        return true;
      }
    } catch (error) {
      console.error("Registration failed:", error);
    }
    return false;
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  const updateProfile = async (
    updates: UpdateProfileRequest
  ): Promise<boolean> => {
    try {
      const response = await authService.updateProfile(updates);
      if (response.success) {
        setUser(response.data.user);
        return true;
      }
    } catch (error) {
      console.error("Profile update failed:", error);
    }
    return false;
  };

  const value = {
    user,
    login,
    register,
    logout,
    updateProfile,
    isAuthenticated: !!user,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
```

### LC Management Hook

```typescript
import { useState, useCallback } from "react";

interface UseLCManagement {
  lcs: LC[];
  loading: boolean;
  error: string | null;
  createLC: (lcData: CreateLCRequest) => Promise<LC | null>;
  searchLCs: (params: SearchLCParams) => Promise<void>;
  updateLCStatus: (
    lcId: string,
    statusUpdate: UpdateLCStatusRequest
  ) => Promise<boolean>;
  getLCById: (lcId: string) => Promise<LC | null>;
}

export const useLCManagement = (): UseLCManagement => {
  const [lcs, setLcs] = useState<LC[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const authService = new AuthService();

  const createLC = useCallback(
    async (lcData: CreateLCRequest): Promise<LC | null> => {
      setLoading(true);
      setError(null);

      try {
        const response = await authService.makeAuthenticatedRequest(
          `${API_BASE_URL}/lc`,
          {
            method: "POST",
            body: JSON.stringify(lcData),
          }
        );

        const result = await response.json();

        if (result.success) {
          // Refresh LC list
          await searchLCs({});
          return result.data;
        } else {
          setError(result.message || "Failed to create LC");
        }
      } catch (err) {
        setError("Network error occurred");
      } finally {
        setLoading(false);
      }

      return null;
    },
    [authService]
  );

  const searchLCs = useCallback(
    async (params: SearchLCParams): Promise<void> => {
      setLoading(true);
      setError(null);

      try {
        const queryString = new URLSearchParams(
          Object.entries(params)
            .filter(([_, value]) => value !== undefined)
            .map(([key, value]) => [key, String(value)])
        ).toString();

        const response = await authService.makeAuthenticatedRequest(
          `${API_BASE_URL}/lc?${queryString}`
        );

        const result = await response.json();

        if (result.success) {
          setLcs(result.data.lcs || []);
        } else {
          setError(result.message || "Failed to fetch LCs");
        }
      } catch (err) {
        setError("Network error occurred");
      } finally {
        setLoading(false);
      }
    },
    [authService]
  );

  const updateLCStatus = useCallback(
    async (
      lcId: string,
      statusUpdate: UpdateLCStatusRequest
    ): Promise<boolean> => {
      setLoading(true);
      setError(null);

      try {
        const response = await authService.makeAuthenticatedRequest(
          `${API_BASE_URL}/lc/${lcId}/status`,
          {
            method: "PATCH",
            body: JSON.stringify(statusUpdate),
          }
        );

        const result = await response.json();

        if (result.success) {
          // Refresh LC list
          await searchLCs({});
          return true;
        } else {
          setError(result.message || "Failed to update LC status");
        }
      } catch (err) {
        setError("Network error occurred");
      } finally {
        setLoading(false);
      }

      return false;
    },
    [authService, searchLCs]
  );

  const getLCById = useCallback(
    async (lcId: string): Promise<LC | null> => {
      setLoading(true);
      setError(null);

      try {
        const response = await authService.makeAuthenticatedRequest(
          `${API_BASE_URL}/lc/${lcId}`
        );

        const result = await response.json();

        if (result.success) {
          return result.data;
        } else {
          setError(result.message || "Failed to fetch LC");
        }
      } catch (err) {
        setError("Network error occurred");
      } finally {
        setLoading(false);
      }

      return null;
    },
    [authService]
  );

  return {
    lcs,
    loading,
    error,
    createLC,
    searchLCs,
    updateLCStatus,
    getLCById,
  };
};
```

## 🔧 Testing with Postman

### 1. Authentication Testing

1. **Register User**: Use "Register - Bank Admin" request
2. **Login**: Use "Login - Bank Admin" request
3. **Profile Management**: Test "Get Current User Profile" and "Update User Profile"
4. **Password Operations**: Test change password, forgot password flows

### 2. LC Testing

1. **Create LC**: Use "Create Letter of Credit" request
2. **Status Updates**: Test various status transitions
3. **Search**: Test filtering and pagination
4. **Error Handling**: Test invalid data scenarios

### 3. Integration Testing

Run the complete collection using Postman's Collection Runner:

1. Set up environment variables
2. Run "Authentication" folder first
3. Run "Letter of Credit" folder second
4. Review test results and response times

## 📱 Frontend UI Implementation Tips

### Authentication Forms

```typescript
// Login Form Component
const LoginForm = () => {
  const { login } = useAuth();
  const [credentials, setCredentials] = useState<LoginRequest>({
    username: "",
    password: "",
    rememberMe: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await login(credentials);
    if (success) {
      // Redirect to dashboard
      navigate("/dashboard");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Username"
        value={credentials.username}
        onChange={(e) =>
          setCredentials({ ...credentials, username: e.target.value })
        }
        required
      />
      <input
        type="password"
        placeholder="Password"
        value={credentials.password}
        onChange={(e) =>
          setCredentials({ ...credentials, password: e.target.value })
        }
        required
      />
      <label>
        <input
          type="checkbox"
          checked={credentials.rememberMe}
          onChange={(e) =>
            setCredentials({ ...credentials, rememberMe: e.target.checked })
          }
        />
        Remember me
      </label>
      <button type="submit">Login</button>
    </form>
  );
};
```

### LC Management Dashboard

```typescript
const LCDashboard = () => {
  const { lcs, loading, searchLCs, updateLCStatus } = useLCManagement();
  const [filters, setFilters] = useState<SearchLCParams>({
    page: 1,
    limit: 10,
  });

  useEffect(() => {
    searchLCs(filters);
  }, [filters, searchLCs]);

  const handleStatusUpdate = async (
    lcId: string,
    status: LCStatus,
    reason: string
  ) => {
    const success = await updateLCStatus(lcId, { status, reason });
    if (success) {
      // Show success message
    }
  };

  return (
    <div>
      <h1>Letter of Credit Management</h1>

      {/* Filters */}
      <div className="filters">
        <select
          value={filters.status || ""}
          onChange={(e) =>
            setFilters({ ...filters, status: e.target.value as LCStatus })
          }
        >
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="issued">Issued</option>
          <option value="advised">Advised</option>
          <option value="confirmed">Confirmed</option>
        </select>
      </div>

      {/* LC List */}
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="lc-list">
          {lcs.map((lc) => (
            <div key={lc.id} className="lc-card">
              <h3>{lc.lcNumber}</h3>
              <p>
                Amount: {lc.amount.value} {lc.amount.currency}
              </p>
              <p>Status: {lc.status}</p>
              <p>Applicant: {lc.applicant.name}</p>
              <p>Beneficiary: {lc.beneficiary.name}</p>

              {/* Status Update Buttons */}
              <div className="actions">
                {lc.status === "draft" && (
                  <button
                    onClick={() =>
                      handleStatusUpdate(lc.id, "issued", "LC approved by bank")
                    }
                  >
                    Issue LC
                  </button>
                )}
                {lc.status === "issued" && (
                  <button
                    onClick={() =>
                      handleStatusUpdate(
                        lc.id,
                        "advised",
                        "LC advised to beneficiary"
                      )
                    }
                  >
                    Advise LC
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
```

## 🔍 Error Handling

### Global Error Handler

```typescript
class APIError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: any[]
  ) {
    super(message);
    this.name = "APIError";
  }
}

const handleAPIResponse = async (response: Response) => {
  const data = await response.json();

  if (!response.ok) {
    throw new APIError(
      data.error?.message || "An error occurred",
      response.status,
      data.error?.code,
      data.error?.details
    );
  }

  return data;
};

// Usage in components
const MyComponent = () => {
  const [error, setError] = useState<string | null>(null);

  const handleAPICall = async () => {
    try {
      setError(null);
      const result = await someAPIFunction();
      // Handle success
    } catch (err) {
      if (err instanceof APIError) {
        setError(err.message);

        // Handle specific error codes
        switch (err.code) {
          case "AUTH_001":
            // Invalid credentials
            break;
          case "VAL_001":
            // Validation error
            break;
          default:
          // Generic error handling
        }
      } else {
        setError("An unexpected error occurred");
      }
    }
  };

  return (
    <div>
      {error && <div className="error">{error}</div>}
      {/* Component content */}
    </div>
  );
};
```

## 📚 Additional Resources

1. **API Documentation**: `/docs/API_Documentation.md`
2. **Postman Collection**: `blocktrade-auth-lc-api.postman_collection.json`
3. **Type Definitions**: See TypeScript interfaces in the codebase
4. **Error Codes Reference**: Check API documentation for complete error code list

## 🎯 Next Steps

1. **Import Postman Collection**: Test all endpoints manually
2. **Implement Authentication**: Start with login/register flows
3. **Build LC Management**: Implement LC CRUD operations
4. **Add Error Handling**: Implement comprehensive error management
5. **Test Integration**: Validate all API interactions
6. **Performance Optimization**: Add caching and request optimization

This guide provides everything needed to integrate with BlockTrade's APIs effectively. Use the Postman collection for testing and reference the code examples for implementation.
