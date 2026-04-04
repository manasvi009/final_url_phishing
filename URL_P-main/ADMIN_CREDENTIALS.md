# Admin Panel Credentials

## Static Admin Account
- **Email**: admin@cybershield.com
- **Password**: Admin123!

## How to Access Admin Panel

1. **Login with Admin Credentials**:
   - Go to the login page
   - Enter email: `admin@cybershield.com`
   - Enter password: `Admin123!`
   - Click "Sign in"

2. **Navigate to Admin Panel**:
   - After logging in, you'll see an "Admin Panel" link in the navigation bar
   - Click on the "Admin Panel" link (highlighted with blue/violet gradient)
   - This will take you to `/admin/overview`

## Admin Panel Features

The admin panel includes:
- **Overview Dashboard** - System metrics and charts
- **Scan Management** - View and manage URL scans
- **Reports** - Detailed analysis of individual scans
- **User Management** - Create and manage user accounts
- **Model Management** - ML model version control
- **Rules Management** - Blacklist/whitelist configuration
- **Alerts** - Configure alert rules and notifications
- **API Keys** - Manage API access keys
- **Settings** - System configuration

## Security Notes

- The admin account has full access to all system features
- Password is hashed using Argon2 for security
- Admin role is checked before accessing admin features
- All admin actions should be logged for audit purposes

## Troubleshooting

If you can't access the admin panel:
1. Make sure you're logged in with the admin credentials
2. Check that the "Admin Panel" link appears in the navigation bar
3. Verify the backend server is running on port 8000
4. Check browser console for any JavaScript errors