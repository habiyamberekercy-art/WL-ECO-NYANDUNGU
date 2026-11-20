# Project memory

## Product intent & audience

- Wetland monitoring & management platform (browser-based)
- Core features: real-time sensor data integration, map visualization, public reporting, role-based backend admin management
- Data entities: park zones, ponds, sensor readings, reports
- Audiences: wetland managers/admins (backend), general public (reporting/viewing)

## Brand personality & voice

- Environmental/scientific domain; tone should feel trustworthy, professional, and data-aware
- Assistant communication is direct and includes practical security and troubleshooting guidance

## Visual design & UX direction

- Stack: Vite + React (JSX), Tailwind CSS, Lucide React icons, `@/` path alias to `src/`
- Production-quality UI expected; avoid cookie-cutter layouts
- App has a public-facing login page and a separate admin/backend area
- Map includes close buttons and GPS features
- Error state UX: connection failure now shows a "Connection problem" message with a Retry button instead of a blank page

## Decisions, constraints & rationale

- Backend/auth provider: Supabase (confirmed)
- Admin account configured:
  - Email: `habiyamberekercy@gmail.com`
  - Password: `123456` (weak; flagged to user as needing change)
- Authentication is live/deployed; credential changes take effect without republishing
- Role-based access control in place; admin account controls full admin area
- Recurring issue: Supabase connection drops intermittently; Bolt loses ability to read DB connection details and DB address stops responding — data has remained intact after reconnecting in past occurrences
- Resolving connection issues requires user action in Bolt's Supabase panel (reconnect/resume if paused)
- Deploying UI fixes to live site requires user to click Publish → Update after reconnecting
- No extra UI/theme/icon packages beyond built-in template defaults unless explicitly requested

## Open questions & assumptions

- Password strengthening still pending user action
- Sensor data source/API format and map provider not yet documented
- Specific user roles and permissions beyond "admin" not yet defined
- Public reporting workflow details (submission form, moderation, display) not yet specified
- Root cause of recurring Supabase connection drops not yet identified