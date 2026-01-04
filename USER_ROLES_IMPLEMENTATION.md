# User Roles & Permissions System - Implementation Summary

## Overview

A comprehensive user role and permissions system has been implemented with two roles: **Admin** and **Sales**. Admins have full system access, while Sales users have customizable page-level permissions.

## Database Changes

### New Tables Created

1. **roles** - Stores role definitions

    - `id` (uuid, primary key)
    - `name` (varchar, unique) - "Admin" or "Sales"
    - `description` (text)
    - `created_at`, `updated_at` (timestamps)

2. **permissions** - Defines available permissions

    - `id` (uuid, primary key)
    - `key` (varchar, unique) - Permission identifier
    - `name` (varchar) - Display name
    - `description` (text)
    - `category` (varchar) - Groups permissions (main, users, accounting, settings)
    - `created_at` (timestamp)

3. **user_roles** - Assigns roles to users

    - `id` (uuid, primary key)
    - `user_id` (uuid, foreign key to users)
    - `role_id` (uuid, foreign key to roles)
    - `created_at` (timestamp)
    - Unique constraint on `user_id`

4. **role_permissions** - Default permissions for each role

    - `id` (uuid, primary key)
    - `role_id` (uuid, foreign key to roles)
    - `permission_id` (uuid, foreign key to permissions)
    - `created_at` (timestamp)
    - Unique constraint on (role_id, permission_id)

5. **user_permissions** - Custom per-user permission overrides
    - `id` (uuid, primary key)
    - `user_id` (uuid, foreign key to users)
    - `permission_id` (uuid, foreign key to permissions)
    - `granted` (boolean)
    - `created_at` (timestamp)
    - Unique constraint on (user_id, permission_id)

### Predefined Permissions

#### Main Section

- `view_dashboard` - View Dashboard/Home page
- `view_cars` - View Cars listing and management
- `view_providers` - View Providers management
- `view_customers` - View Customers management

#### Users Section

- `view_users` - View Users management
- `manage_users` - Create, edit, and delete users

#### Accounting Section

- `view_sales_deals` - View Sales Deals
- `manage_sales_deals` - Create and edit Sales Deals
- `view_purchases_deals` - View Purchase Deals
- `manage_purchases_deals` - Create and edit Purchase Deals
- `view_bills` - View Bills and invoices
- `manage_bills` - Create and edit Bills
- `view_logs` - View Activity Logs

#### Settings Section

- `view_home_settings` - View Home page settings
- `manage_home_settings` - Edit Home page settings
- `view_company_settings` - View Company settings
- `manage_company_settings` - Edit Company settings

### Database Function

- `get_user_permissions(user_uuid)` - Returns all permission keys for a user (combines role permissions and user-specific overrides)

## Application Changes

### 1. User Creation Form (`app/(defaults)/users/add/page.tsx`)

**New Features:**

- **Role Dropdown**: Custom dropdown component (like country select) to select between "Admin" and "Sales" roles
- **Dynamic Permissions UI**: When "Sales" role is selected, a permission selection interface appears
- **Permission Categories**: Permissions are grouped by category (Main, Users, Accounting, Settings)
- **Checkbox Interface**: Each permission has a checkbox with name and description

**New Components:**

- **RoleSelect Component** (`components/role-select/role-select.tsx`): Custom dropdown matching the CountrySelect style

**New State Variables:**

```typescript
role: 'Admin' | 'Sales'  // Default: Admin
permissions: string[]     // Selected permission keys for Sales users
availablePermissions: Array<{key, name, description, category}>
```

### 2. User Creation API (`pages/api/users/create.js`)

**Enhanced Functionality:**

- Validates role selection (Admin or Sales)
- Creates user in auth system
- Creates user profile in users table
- Assigns selected role via `user_roles` table
- For Sales users: saves custom permissions to `user_permissions` table
- Implements rollback on failure (deletes user if role/permission assignment fails)

**Request Body Changes:**

```javascript
{
  email: string,
  password: string,
  userData: object,
  profileData: object,
  role: 'Admin' | 'Sales',        // NEW
  permissions: string[]            // NEW - array of permission keys
}
```

### 3. Translations Added

**English (en.json):**

- `user_role`: "User Role"
- `admin`: "Admin"
- `select_role`: "Select Role"
- `select_user_role_description`: "Select the role for this user..."
- `page_access_permissions`: "Page Access Permissions"
- `select_pages_sales_user_can_access`: "Select the pages and features..."

**Hebrew (he.json):**

- Corresponding Hebrew translations added

**Arabic (ae.json):**

- Corresponding Arabic translations added

### 4. Database Schema (`current_db.sql`)

- Updated to include all new role and permission tables

## Migration File

Location: `migrations/add_user_roles_and_permissions.sql`

**What it does:**

1. Creates all 5 new tables with proper constraints and indexes
2. Inserts default roles (Admin, Sales)
3. Inserts all predefined permissions
4. Grants all permissions to Admin role automatically
5. Creates indexes for performance optimization
6. Creates helper function `get_user_permissions()`

## How to Deploy

### Step 1: Run the Migration

Execute the migration SQL file in your Supabase database:

```bash
# Option 1: Via Supabase Dashboard
# Go to SQL Editor → New Query → Paste migration content → Run

# Option 2: Via psql
psql -h your-db-host -U postgres -d postgres -f migrations/add_user_roles_and_permissions.sql
```

### Step 2: Test the Feature

1. Navigate to `/users/add` in your application
2. Fill in user details
3. Select "Sales" role from dropdown
4. Check/uncheck desired permissions
5. Submit the form
6. Verify user creation and role assignment

## Usage Flow

### Creating an Admin User

1. Admin goes to Users → Add New User
2. Fills in user details (name, email, password, etc.)
3. Selects "Admin" from Role dropdown
4. Submits form
5. User is created with full system access

### Creating a Sales User

1. Admin goes to Users → Add New User
2. Fills in user details
3. Selects "Sales" from Role dropdown
4. Permission checkboxes appear, grouped by category
5. Admin checks desired permissions (e.g., view_cars, view_sales_deals, manage_sales_deals)
6. Submits form
7. User is created with only selected permissions

## Future Enhancements

### Recommended Next Steps:

1. **Permission Enforcement**: Add middleware to check user permissions on page routes
2. **Edit User Roles**: Extend the edit user page to modify roles and permissions
3. **Role Display**: Show user role in users list table
4. **Permission-Based UI**: Hide/show menu items based on user permissions
5. **Audit Logging**: Track role and permission changes
6. **Additional Roles**: Add more roles as needed (e.g., Manager, Accountant)

### Example Permission Check (for future implementation):

```typescript
// In a protected page/component
const { data: userPermissions } = await supabase.rpc('get_user_permissions', { user_uuid: currentUserId });

const hasPermission = userPermissions?.includes('view_sales_deals');

if (!hasPermission) {
    // Redirect or show access denied
}
```

- `components/role-select/role-select.tsx`

### Modified:

- `app/(defaults)/users/add/page.tsx`
- `pages/api/users/create.js`
- `public/locales/en.json`
- `public/locales/he.json`
- `public/locales/a
- `app/(defaults)/users/add/page.tsx`
- `pages/api/users/create.js`
- `public/locales/en.json`
- `public/locales/he.json`
- `current_db.sql`

## Notes

- Admin role automatically has ALL permissions
- Sales role starts with NO permissions - admin must select them
- User can only have ONE role at a time
- Custom user permissions override role permissions
- All foreign keys have CASCADE DELETE for data consistency
- Proper indexes added for query performance
