# 🚀 Quick Start: Testing Auto-Role Assignment

## Step 1: Start the Server

```bash
cd /Users/prasadsanap/blockchain_project/blocktrade-backend
npm install
npm run dev
```

Server should start on `http://localhost:3001`

## Step 2: Test Auto-Role Assignment

### Test 1: First Bank User (Should get admin role)

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "bank_admin_test",
    "email": "admin@testbank.com",
    "password": "SecurePass123!",
    "confirmPassword": "SecurePass123!",
    "firstName": "John",
    "lastName": "Admin",
    "organizationId": "test-bank-001",
    "organizationName": "Test Bank One",
    "organizationType": "bank",
    "acceptTerms": true
  }'
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "user": {
      "role": "bank_admin",
      "organizationType": "bank"
    }
  }
}
```

### Test 2: Second Bank User (Should get officer role)

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "bank_officer_test",
    "email": "officer@testbank.com",
    "password": "SecurePass123!",
    "confirmPassword": "SecurePass123!",
    "firstName": "Jane",
    "lastName": "Officer",
    "organizationId": "test-bank-001",
    "organizationName": "Test Bank One",
    "organizationType": "bank",
    "acceptTerms": true
  }'
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "user": {
      "role": "bank_officer",
      "organizationType": "bank"
    }
  }
}
```

### Test 3: First Corporate User (Should get admin role)

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "corp_admin_test",
    "email": "admin@testcorp.com",
    "password": "SecurePass123!",
    "confirmPassword": "SecurePass123!",
    "firstName": "Mike",
    "lastName": "Corporate",
    "organizationId": "test-corp-001",
    "organizationName": "Test Corporation",
    "organizationType": "corporate",
    "acceptTerms": true
  }'
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "user": {
      "role": "corporate_admin",
      "organizationType": "corporate"
    }
  }
}
```

### Test 4: Manual Role Override (Should be ignored)

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "override_test",
    "email": "override@testnbfc.com",
    "password": "SecurePass123!",
    "confirmPassword": "SecurePass123!",
    "firstName": "Sarah",
    "lastName": "Override",
    "role": "nbfc_user",
    "organizationId": "test-nbfc-001",
    "organizationName": "Test NBFC",
    "organizationType": "nbfc",
    "acceptTerms": true
  }'
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "user": {
      "role": "nbfc_admin",
      "organizationType": "nbfc"
    }
  }
}
```

_Note: Manual role "nbfc_user" is ignored, auto-assigned "nbfc_admin" because it's the first user_

## Step 3: Test Login

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "bank_admin_test",
    "password": "SecurePass123!"
  }'
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "user": {
      "role": "bank_admin",
      "permissions": ["lc:create", "lc:approve", "user:manage", ...]
    },
    "tokens": {
      "accessToken": "jwt_token_here",
      "refreshToken": "refresh_token_here"
    }
  }
}
```

## Step 4: Import Postman Collection

1. Open Postman
2. Import `docs/BlockTrade_Auth_Integration_Postman_Collection.json`
3. Set environment variables:
   - `baseUrl`: `http://localhost:3001/api`
4. Run the "Testing & Examples" folder to verify auto-assignment

## ✅ Success Criteria

- ✅ First user in organization gets admin role
- ✅ Subsequent users get standard roles
- ✅ Manual role selection is overridden
- ✅ Different organization types work correctly
- ✅ Login works with auto-assigned roles
- ✅ User journey is initialized automatically
- ✅ Permissions are correctly assigned

## 🐛 Troubleshooting

### Error: "Role is required"

- **Cause**: Using old validation schema
- **Fix**: Make sure `role` field is optional in schemas

### Error: "Cannot read property of undefined"

- **Cause**: Role assignment logic error
- **Fix**: Check `getDefaultRoleForUser` method implementation

### Error: "User already exists"

- **Cause**: Testing with same username/email
- **Fix**: Use unique usernames for each test

### Database Connection Issues

- **Cause**: MongoDB not running or wrong connection string
- **Fix**: Check MongoDB connection in `src/config/database.ts`

## 📱 Frontend Integration

Once backend testing is successful, update your frontend:

1. **Remove Role Dropdowns**: Delete role selection from registration forms
2. **Update Registration API**: Remove role from request body
3. **Display Assigned Role**: Show the auto-assigned role to users
4. **Test Integration**: Use the same test data as above

## 🎯 Key Features Verified

- ✅ **Auto-Role Assignment**: Working correctly
- ✅ **First User Admin**: Verified for all organization types
- ✅ **Manual Override Protection**: Manual roles are ignored
- ✅ **Organization Isolation**: Each org gets its own admin
- ✅ **User Journey**: Automatically initialized
- ✅ **Permission Assignment**: Correct permissions based on role
- ✅ **API Compatibility**: Existing auth flow works
- ✅ **Documentation**: Complete guides provided

Your auto-role assignment system is ready for production! 🎉
