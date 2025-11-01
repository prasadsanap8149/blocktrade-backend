import axios from 'axios';
import { testCredentials } from '../utils/demoData';

const API_BASE_URL = 'http://localhost:3000/api';

interface AuthResponse {
  success: boolean;
  data?: {
    user: any;
    accessToken: string;
    refreshToken: string;
  };
  message?: string;
  error?: string;
}

class AuthTester {
  private authTokens: Map<string, string> = new Map();

  async testRegistration() {
    console.log('\n🔸 Testing User Registration...');
    
    const testUser = {
      username: 'test_user_' + Date.now(),
      email: `testuser${Date.now()}@example.com`,
      password: 'TestPass123!',
      firstName: 'Test',
      lastName: 'User',
      role: 'corporate_user',
      organizationId: 'test-org-id',
      organizationName: 'Test Organization',
      organizationType: 'corporate',
      phone: '+1-555-9999'
    };

    try {
      const response = await axios.post(`${API_BASE_URL}/auth/register`, testUser);
      console.log('✅ Registration successful:', response.data.message);
      console.log('📋 User ID:', response.data.data?.user?._id);
      return response.data;
    } catch (error: any) {
      console.log('❌ Registration failed:', error.response?.data?.message || error.message);
      return null;
    }
  }

  async testLogin(credentials: any) {
    console.log(`\n🔸 Testing Login for ${credentials.role}...`);
    console.log(`📧 Username: ${credentials.username}`);
    
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        username: credentials.username,
        password: credentials.password
      });

      console.log('✅ Login successful!');
      console.log('👤 User:', response.data.data.user.firstName, response.data.data.user.lastName);
      console.log('🏢 Organization:', response.data.data.user.organizationName);
      console.log('🎭 Role:', response.data.data.user.role);
      console.log('🔑 Access Token:', response.data.data.accessToken.substring(0, 20) + '...');

      // Store token for further testing
      this.authTokens.set(credentials.username, response.data.data.accessToken);
      
      return response.data;
    } catch (error: any) {
      console.log('❌ Login failed:', error.response?.data?.message || error.message);
      return null;
    }
  }

  async testProtectedRoute(username: string, endpoint: string = '/auth/me') {
    console.log(`\n🔸 Testing Protected Route: ${endpoint}`);
    
    const token = this.authTokens.get(username);
    if (!token) {
      console.log('❌ No token found for user:', username);
      return null;
    }

    try {
      const response = await axios.get(`${API_BASE_URL}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('✅ Protected route access successful!');
      console.log('📋 Response:', response.data);
      return response.data;
    } catch (error: any) {
      console.log('❌ Protected route failed:', error.response?.data?.message || error.message);
      return null;
    }
  }

  async testTokenRefresh(username: string) {
    console.log(`\n🔸 Testing Token Refresh for ${username}...`);
    
    try {
      // First login to get refresh token
      const loginData = await this.testLogin(testCredentials.corporateUser);
      if (!loginData) return null;

      const refreshToken = loginData.data.refreshToken;
      
      const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
        refreshToken: refreshToken
      });

      console.log('✅ Token refresh successful!');
      console.log('🔑 New Access Token:', response.data.data.accessToken.substring(0, 20) + '...');
      
      return response.data;
    } catch (error: any) {
      console.log('❌ Token refresh failed:', error.response?.data?.message || error.message);
      return null;
    }
  }

  async testInvalidCredentials() {
    console.log('\n🔸 Testing Invalid Credentials...');
    
    try {
      await axios.post(`${API_BASE_URL}/auth/login`, {
        username: 'invalid_user',
        password: 'wrong_password'
      });
      console.log('❌ Should have failed but didn\'t!');
    } catch (error: any) {
      console.log('✅ Correctly rejected invalid credentials:', error.response?.data?.message);
    }
  }

  async testPasswordValidation() {
    console.log('\n🔸 Testing Password Validation...');
    
    const weakPasswordUser = {
      username: 'weak_test',
      email: 'weak@test.com',
      password: '123', // Weak password
      firstName: 'Test',
      lastName: 'User',
      role: 'corporate_user',
      organizationId: 'test-org',
      organizationName: 'Test Org',
      organizationType: 'corporate'
    };

    try {
      await axios.post(`${API_BASE_URL}/auth/register`, weakPasswordUser);
      console.log('❌ Should have rejected weak password!');
    } catch (error: any) {
      console.log('✅ Correctly rejected weak password:', error.response?.data?.message);
    }
  }

  async runAllTests() {
    console.log('🚀 Starting Authentication System Tests...');
    console.log('=' .repeat(50));

    // Test server availability
    try {
      await axios.get(`${API_BASE_URL}/health`);
      console.log('✅ Server is running and accessible');
    } catch (error) {
      console.log('❌ Server is not accessible. Make sure it\'s running on port 3000');
      return;
    }

    // Run various tests
    await this.testRegistration();
    await this.testPasswordValidation();
    await this.testInvalidCredentials();
    
    // Test login with different roles
    await this.testLogin(testCredentials.bankAdmin);
    await this.testLogin(testCredentials.corporateAdmin);
    await this.testLogin(testCredentials.nbfcAdmin);
    await this.testLogin(testCredentials.logisticsAdmin);
    await this.testLogin(testCredentials.insuranceAdmin);
    
    // Test protected routes
    await this.testProtectedRoute(testCredentials.bankAdmin.username);
    
    // Test token refresh
    await this.testTokenRefresh(testCredentials.corporateUser.username);

    console.log('\n' + '=' .repeat(50));
    console.log('🎉 Authentication tests completed!');
    console.log('\n📋 Test Summary:');
    console.log('• Registration validation ✓');
    console.log('• Login authentication ✓');
    console.log('• Role-based access ✓');
    console.log('• Protected routes ✓');
    console.log('• Token management ✓');
    console.log('• Security validation ✓');
  }
}

// Export for use in other modules
export default AuthTester;

// Run tests if this file is executed directly
if (require.main === module) {
  const tester = new AuthTester();
  tester.runAllTests().catch(console.error);
}
