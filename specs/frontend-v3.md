# Frontend V3 Spec - RevCenter

## Overview
Comprehensive frontend overhaul for RevCenter, porting GTM Dialer's admin panel, sidebar, dashboard, and pipeline patterns into RevCenter's light theme. Admin panel becomes the highest permission tier with global platform management capabilities.

---

## 1. Admin Panel (Highest Permission Tier)

### Permission Model
- **Admin** > Owner > Member
- Admin can see and manage ALL live accounts and workspaces globally
- Admin check: `session?.user?.isAdmin === true` (existing pattern)

### Admin Page (`/dashboard/admin`)
Port GTM Dialer's admin panel with 3 tabs: **Users**, **Organizations**, **Error Logs**

#### 1.1 Stats Cards (top)
- Total Users (blue icon bg `bg-blue-100 text-blue-600`)
- Organizations (green icon bg `bg-green-100 text-green-600`)
- Clean white card backgrounds, border-border

#### 1.2 Tabs
Three tabs using underline-style tab pattern (not pill tabs):
```
Users | Organizations | Error Logs
```
Active tab: `border-b-2 border-primary text-primary`
Inactive: `text-muted-foreground hover:text-foreground`

#### 1.3 Users Tab
- Search bar: "Search by email, name, or organization..."
- Table columns: Email, Name, Organizations, Verified, Role, Created, Actions
- Verified badge: green "Yes" / yellow "No"
- Role badge: purple "Admin" / gray "User"
- Actions (per user, not self):
  - **Impersonate** (text link)
  - **Reset Password** (KeyRound icon, amber)
  - **Reassign** (UserPlus icon, blue)
  - **Delete** (Trash2 icon, red - not for admins)
- Pagination: Previous/Next with "Showing X to Y of Z"

#### 1.4 Organizations Tab
- Search bar + "Create Organization" button
- Table columns: Name, Slug, Members, Credits, Created, Actions
- Credits badge: green if > 0, gray if 0
- Actions:
  - **+ Credits** (add credits modal)
  - **View Members** (Eye icon, view members modal)
  - **Delete** (Trash2 icon, red)
- Create Organization modal: name + auto-slug
- View Members modal: list with roles, remove action
- Add Credits modal: amount + reason

#### 1.5 Error Logs Tab
- Error trend chart (last 14 days)
- Filter bar: All/Errors/Warnings toggle + Status dropdown + Search
- Table columns: Event (severity icon + code + message), HTTP status badge, Product, Organization, Status, Timestamp
- Severity icons: critical (red octagon), error (red octagon), warning (yellow triangle)
- Status badges: open (red), acknowledged (yellow), resolved (green)
- Click row to open detail modal
- Pagination with page numbers

#### 1.6 Modals (all use existing Modal component)
- Delete User confirmation
- Delete Organization confirmation
- Reassign User (org selector + role selector)
- Create Organization (name + slug)
- View Members (member list with remove)
- Reset Password confirmation
- Add Credits (amount + reason)
- Error Log Detail

### New API Hooks Required (`/hooks/api/useAdmin.ts` - extend existing)
- `useAdminStats()` - already exists, keep
- `useAdminUsers({ page, limit, search })` - add pagination + search params
- `useAdminOrganizations({ page, limit, search })` - add pagination + search params
- `useImpersonateUser()` - new, uses better-auth admin.impersonateUser
- `useDeleteUser()` - new
- `useDeleteOrganization()` - update existing
- `useReassignUser()` - new
- `useCreateOrganization()` - update existing to use slug instead of ownerEmail
- `useRemoveUserFromOrganization()` - new
- `useOrganizationMembers(orgId)` - new
- `useAdminResetPassword()` - new
- `useAddOrganizationCredits()` - new

### New API Hooks (`/hooks/api/useErrorLogs.ts`)
- `useAdminErrorLogs({ page, limit, severity, status, search })`
- `useAdminErrorLogStats({ startDate, endDate, groupBy })`
- `useAdminErrorLogDetail(id)`

### New Components
- `/components/admin/ErrorLogsTab.tsx` - Error logs tab component
- `/components/admin/ErrorTrendChart.tsx` - Error trend chart
- `/components/admin/ErrorLogDetailModal.tsx` - Error detail modal

### Backend API Endpoints Required
These need to exist on the backend (or be created):
- `GET /admin/stats` (existing)
- `GET /admin/users?page=&limit=&search=` (update existing)
- `GET /admin/organizations?page=&limit=&search=` (update existing)
- `POST /admin/users/:id/impersonate` (new)
- `DELETE /admin/users/:id` (new)
- `POST /admin/users/:id/reassign` (new)
- `POST /admin/users/:id/reset-password` (new)
- `POST /admin/organizations` (update to support slug)
- `DELETE /admin/organizations/:id` (existing)
- `GET /admin/organizations/:id/members` (new)
- `DELETE /admin/organizations/:id/members/:userId` (new)
- `POST /admin/organizations/:id/credits` (new)
- `GET /admin/error-logs?page=&limit=&severity=&status=&search=` (new)
- `GET /admin/error-logs/stats?startDate=&endDate=&groupBy=` (new)
- `GET /admin/error-logs/:id` (new)

---

## 2. Sidebar Fixes

### Requirements
Match GTM Dialer sidebar structure in light theme:
- **No top navbar** - remove the separate topbar card entirely
- **Sidebar toggle** - different icon (use `PanelLeft`/`PanelLeftClose` instead of `Menu`)
- **No extra modal separation** - no grey background, all white
- **Settings button higher** - Settings goes directly after the admin nav (with divider), not pushed to absolute bottom
- **All white background** - background changes from `bg-[#f0eeee]` to `bg-white`

### Layout Changes (`/app/dashboard/layout.tsx`)
- Remove topbar card entirely
- Move page name + sidebar toggle + user menu into the main content area header (inline, like GTM Dialer's SidebarLayout)
- Background: `bg-white` (not `bg-[#f0eeee]`)
- Content card: remove separate border/shadow, content flows directly
- Sidebar toggle: `PanelLeft`/`PanelLeftClose` icons
- User dropdown remains in top-right corner

### Sidebar Changes (`/components/dashboard/Sidebar.tsx`)
- Settings button positioned higher (after admin nav, with divider, not pushed to mt-auto bottom)
- Match GTM Dialer nav item styling: `bg-primary/10 text-primary` for active state
- Keep existing nav items

---

## 3. Pipeline Tab

### Copy GTM Dialer Pipeline Design
The current RevCenter pipeline is already a kanban board - it's close to the GTM Dialer pattern. Minor adjustments:
- Keep existing drag-and-drop pipeline kanban
- The pipeline is already well-implemented with stages, colors, card layout
- No major changes needed - current implementation already matches the pattern

---

## 4. Home/Dashboard Tab

### Copy GTM Dialer Dashboard Pattern for RevCenter Analytics
Keep RevCenter's existing analytics data (book rate, real calls, bookings, upcoming) but use GTM Dialer's layout structure:

#### Header
```
Dashboard
Analytics, activity, and insights at a glance     [Filters]
```
- Large serif heading
- Subtitle text
- Filters on the right (date range pills: Today, This Week, This Month)

#### Metric Cards Row
Keep RevCenter's 4 existing metrics:
1. **Book Rate** - primary black card (existing)
2. **Real Calls** - white card with icon (existing)
3. **Bookings** - white card with icon (existing)
4. **Upcoming** - white card with icon (existing)

#### Charts Row (2-column grid)
- Left: Calls vs Bookings over time (existing bar chart)
- Right: Could add a call status/quality breakdown chart (new)

#### Activity Row
- Recent Bookings + Recent Calls (existing 2-column layout, keep as-is)

### Changes
- Update date range filter to use GTM Dialer's pill-style filter component (Today/Week/Month)
- Keep all existing RevCenter-specific metrics and data hooks
- Layout structure is already very similar

---

## 5. Theme & Styling

### All White Background
- Layout background: `bg-white` instead of `bg-[#f0eeee]`
- No grey card separation in content area
- Content area: no separate rounded card wrapper, or make it `bg-white border-0 shadow-none`
- Sidebar: keep `bg-card` (white) with border

### Light Theme Consistency
- All existing CSS variables are already light theme
- No changes needed to globals.css color definitions

---

## Files to Modify

### Core Layout
1. `/frontend/app/dashboard/layout.tsx` - Remove topbar, integrate sidebar toggle + user menu into content header, white background
2. `/frontend/components/dashboard/Sidebar.tsx` - Settings position, active state styling, toggle icon

### Admin Panel
3. `/frontend/app/dashboard/admin/page.tsx` - Complete rewrite with Users/Organizations/Error Logs tabs
4. `/frontend/hooks/api/useAdmin.ts` - Extend with pagination, search, impersonate, delete, reassign, reset password, credits
5. `/frontend/hooks/api/useErrorLogs.ts` - New file for error log hooks
6. `/frontend/components/admin/ErrorLogsTab.tsx` - New error logs tab
7. `/frontend/components/admin/ErrorTrendChart.tsx` - New error trend chart
8. `/frontend/components/admin/ErrorLogDetailModal.tsx` - New error detail modal

### Dashboard
9. `/frontend/app/dashboard/page.tsx` - Adjust filter style to match GTM Dialer pattern

### Shared Types
10. `/frontend/lib/shared-types.ts` - Add admin types (AdminUser, AdminOrganization, ErrorLogItem, etc.)

---

## Implementation Order
1. Layout & Sidebar changes (foundation)
2. Shared types
3. Admin hooks (useAdmin.ts updates + useErrorLogs.ts)
4. Admin page rewrite
5. Error logs components
6. Dashboard adjustments
7. Testing & polish
