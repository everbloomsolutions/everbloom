# Backend Scripts

## User Management Script

### List All Users

```bash
cd backend
npm run manage-users
```

This will:
- Connect to the database
- List all users with their details (email, name, role, status, OAuth provider)
- Show statistics (total users, admins, regular users, active/inactive)

### Add Admin User (Interactive)

```bash
cd backend
npm run manage-users -- --add-admin
```

This will prompt you for:
- Email
- Password (min 6 characters)
- Name (optional)

### Add Admin User (Command Line)

```bash
cd backend
npm run manage-users -- --add-admin --email=admin@example.com --password=admin123 --name="Admin User"
```

### Examples

**List users:**
```bash
npm run manage-users
```

**Add admin interactively:**
```bash
npm run manage-users -- --add-admin
```

**Add admin with all details:**
```bash
npm run manage-users -- --add-admin --email=admin@test.com --password=secure123 --name="Super Admin"
```

**Add admin with email and password only:**
```bash
npm run manage-users -- --add-admin --email=admin@test.com --password=secure123
```

### Super Admin: Check, Create, and List

**Check and create super_admin (default: superadmin@everbloom.com):**
```bash
pnpm check-and-create-super-admin
```
Optional env: `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD`, `SUPER_ADMIN_NAME`.

**List admin and super_admin users with role usage:**
```bash
pnpm list-admin-users
```
Shows super_admin users first, then admin users, then role counts (user, agent, admin, super_admin).

### Notes

- If a user with the email already exists, the script will:
  - Update them to admin role if they're not already an admin
  - Skip if they're already an admin
- Passwords are automatically hashed using bcrypt
- All users are created with `isActive: true` by default
- The script connects to the database using `MONGODB_URI` from `.env`

## Seed Script

### Seed Database with Sample Users

```bash
cd backend
npm run seed
```

This creates:
- Admin user: `admin@example.com` / `admin123`
- Regular user: `user@example.com` / `user123`

**Warning**: This script deletes all existing users before seeding.

## Migration Script

### Run Database Migrations

```bash
cd backend
npm run migrate
```

