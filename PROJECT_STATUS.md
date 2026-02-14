# Project ICS v3 - Status Checkpoint

Last updated: 2026-02-14
Main file: `ics_v_3_standalone_index.html`

## Newly Implemented (2026-02-14, responsive UX + notifications + dashboard/readability pass)
- Versioning advanced again:
  - app/UI version updated to `3.3` (manifest + runtime fallback)
  - schema/export version updated to `3.3.0` (`ICS_SCHEMA_VERSION`)
  - service worker cache version updated to `ics-v3-pwa-v74`
- Responsive shell/navigation upgrades:
  - mobile and tablet portrait now support bottom-nav treatment with center `New ICS` action
  - topbar/profile/bell placement tuned for compact layouts
  - floating form close behavior improved (`Esc` and outside-click close support)
- Table/mobile UX upgrades:
  - horizontal table scrolling treatment applied across dense table surfaces on mobile/tablet portrait
  - ICS Records status moved out of ICS No. cell into dedicated `Status` column
  - status visuals compacted to dot+label markers for cleaner scan density
  - Total Value cell decluttered by moving depreciation detail into info tooltip action
- Archive Details/ICS Details visual alignment:
  - Archive Details modal refactored to ICS-style card structure (`icsd-*` patterns)
  - responsive archive details layout improved for narrow screens
- Notification Center overhaul:
  - new header actions (`Mark all read`, `Clear read`)
  - filter tabs (`All`, `Unread`, `Alerts`, `System`)
  - grouped feed buckets (`Now`, `Today`, `Earlier`)
  - iconized rows with per-item actions (toggle read/unread, delete)
  - notification deduping with count badges and expanded retention limit
  - mobile notification placement and panel behavior refined
- Dashboard KPI readability fix:
  - `Total Asset Value` now clips safely in-card and supports horizontal ticker animation on overflow

## Newly Implemented (2026-02-14, follow-up polish + fixes in this session)
- Versioning advanced:
  - app/UI version updated to `3.2` (manifest + runtime fallback)
  - schema/export version updated to `3.2.0` (`ICS_SCHEMA_VERSION`)
- Lucide icon migration completed app-wide:
  - replaced remaining inline SVG usage in shell, dashboard, action tables, details/history views, form row actions, Data Hub cards, and profile/avatar icon templates
  - local Lucide runtime integrated from repo-local vendor asset (`vendor/lucide.min.js`) with no runtime CDN dependency
  - automatic icon hydration added (`window.refreshIcons` + mutation observer) so dynamically rendered content resolves icons reliably
  - click-hit reliability patch added (`.lucide { pointer-events:none; }`) to avoid center-click dead zones on icon buttons
  - icon optical alignment pass applied (consistent stroke caps/joins and container baseline normalization)
- Data Hub modal visual redesign completed:
  - updated to card-based layout matching current design direction (icon/title header, close pill, 2+1 action card grid, helper footer row with version chip)
- Action Center modal reliability fixes:
  - resolved `Inspection History` opening failures by adding robust overlay/body fallback injection when missing from live DOM
  - added icon refresh after history content render to ensure print/history icons appear immediately
  - hardened `Unserviceable` inspection flow with fallback modal injection and explicit error path if modal nodes are unavailable
- Dashboard dark-theme readability updates:
  - improved `Recent ICS Activity` contrast in `dracula` and `crimson-black` (widget surface, header/body text, link color, neutral badges, borders, empty-state text)
  - adjusted table surface to inherit widget background consistently in dark themes
- Sidebar collapse feature added:
  - desktop collapsible sidebar with brand toggle control, icon mode, and persisted state (`icsSidebarCollapsed`)
  - collapse state survives reload and re-applies on resize with desktop/mobile guard behavior
  - collapsed sidebar keeps quick profile access (avatar click opens profile)
- Service worker/prefetch updates:
  - cache version advanced iteratively through this session; current cache version now `ics-v3-pwa-v73`

## Newly Implemented (2026-02-14, ICS Details + Dashboard + Sidebar UI overhaul)
- ICS Details modal redesign and simplification:
  - rebuilt into a cleaner two-column + full-width items layout with improved visual hierarchy
  - removed non-essential technical noise for non-admin users (advanced lineage visibility is role-aware)
  - removed footer action cluster and retained top-right close control
  - moved record history into a dedicated modal (`Record history - <ICS No.>`) with keyboard and outside-click close support
  - removed inline `Add inspection` / `Archive item` controls from ICS Details per workflow simplification
  - removed in-modal tip copy for cleaner presentation
- Dashboard top-level redesign:
  - replaced previous top-level dashboard shell with card-based executive layout:
    - KPI strip (`Total ICS Records`, `Within EUL`, `Outside EUL`, `Total Asset Value`)
    - action cards (`Import Center`, `Export Center`, `Action Center`, `Archives`)
    - right-side `Compliance Health` card with dynamic badge and progress bars
  - restored shared/original header banner (`renderWelcomeBanner('Dashboard')`) for consistency with other views
  - removed temporary extra custom top-nav block after alignment pass
- Dashboard bottom intelligence sections added:
  - `Recent ICS Activity` table (latest records + status + EUL + value + last action)
  - `Today's Notes` with live cards:
    - `Last sync` now shows backup/import history (`icsLastFullBackupAt`, `icsLastImportAt`)
    - `Integrity` summarizes lineage readiness vs mismatches
    - `Reminders` highlights outside-EUL action demand
- Sidebar facelift:
  - refreshed nav spacing, icon containers, hover/active states, and typography for stronger coherence
  - `Action Center` menu item updated to shield-style logo treatment and full label text (`Action Center`)
  - dark-theme sidebar nav/icon styling patched for consistency
- Service worker cache updated iteratively during UI rollout; current cache version now `ics-v3-pwa-v73`.

## Newly Implemented (2026-02-13, access control + lineage hardening + modularization)
- Role/access controls are now enforced centrally:
  - centralized `ACCESS_RULES` + `requireAccess(...)` guard model
  - major data mutation/export/archive paths now route through unified permission/session/school checks
  - bypass-resistant enforcement added for direct function entry points (not only UI disabled states)
- Data lineage hardening baseline is now active:
  - immutable per-record `_lineage` timeline with append-only version events (`version`, `action`, `at`, `actor`, `deviceId`, `sessionId`, `hash`, `parentHash`)
  - record hash verification added (`verifyRecordLineage`) with mismatch detection
  - lineage summary + recent timeline added in ICS Details modal
  - status marker now surfaces lineage integrity warning marker when mismatched
  - baseline lineage migration runs on boot for legacy records missing `_lineage`
- Audit/session attribution strengthened:
  - persistent device ID (`icsDeviceId`) and runtime session IDs added
  - audit logs now include actor role + device/session attribution
  - Profile Security `Recent Data Activity` now shows actor + device + session context
- Trace integrity summary expanded:
  - now includes attribution/tamper signals (audit device/session gaps + tamper alert counts)
- Codebase modularization started (behavior-preserving extraction):
  - `core-storage-security.js` (storage keys, role/capability/access guards, runtime id helpers)
  - `core-lineage-audit.js` (audit logging + lineage/hash/verification core)
  - `core-data-manager.js` (Import/Validation/Export workflow core)
  - `core-records-workflow.js` (import/finalize/auto-populate record workflow)
  - `core-actions-workflow.js` (inspection/archive/unarchive/WMR action workflows)
  - `core-profile-session.js` (profile normalization/avatar rendering + school profile/session/login identity persistence flows)
  - `core-theme-preferences.js` (theme token application + table density + profile preference tab/validation helpers)
  - `core-school-setup-ui.js` (school logo preview/upload + setup/sign-up/session guard flows)
  - `core-profile-modal.js` (profile modal open/close orchestration + profile save/apply pipeline)
  - `core-shell-init.js` (shell startup wiring: FAB/sheet setup, initial UI refresh, resize + field-error cleanup listeners)
  - `core-dashboard-view.js` (shared welcome/subtitle/banner helpers used across Dashboard, Inventory, Action Center, Archives views)
  - `core-dashboard-render.js` (full Dashboard markup renderer extracted from main HTML script)
  - `core-inventory-view-render.js` (Manage Inventory view renderer extracted from main HTML script)
  - `core-actions-view-render.js` (Action Center and WMR modal renderers extracted from main HTML script)
  - `core-archives-view-render.js` (Archives view renderer extracted from main HTML script)
  - `core-dashboard-actions.js` (dashboard navigation/shortcut/filter utility actions extracted from main HTML script)
  - `core-dashboard-metrics.js` (dashboard KPI/data-quality/risk metric computation + render hydration extracted from main HTML script)
  - `core-app-bootstrap.js` (boot/session startup + PWA install/service-worker workflow)
  - `core-keyboard-routing.js` (global keymap, overlay keyboard routing, form/navigation shortcuts)
  - `core-notifications.js` (notification store/render/read handling + modal toast helper + bell/panel wiring)
  - `core-ui-event-wiring.js` (shared UI listener wiring for overlays/profile/data-manager/theme controls)
  - `core-modal-system.js` (global confirm/info modal helpers and pending confirm action runner)
  - `ics_v_3_standalone_index.html` now loads the above modules and removed duplicated inline blocks
  - PWA precache updated to include all modular JS files (`sw.js` cache version advanced to `ics-v3-pwa-v23`)

## Newly Implemented (2026-02-13, UX + theming pass)
- PWA install UX:
  - in-app `Install App` sidebar button added with install prompt handling
  - fallback `Install Guide` flow when browser prompt is unavailable
  - installed-state detection (`App Installed`) added
- Data action cleanup:
  - removed duplicate `Import JSON` and `Auto-Populate x3` controls from Manage Inventory toolbar
  - moved `Auto-Populate x3` into Data Hub as a dedicated action
- WMR modal redesign:
  - compact/modern layout pass (tighter spacing, denser fields, stronger hierarchy)
  - top-right close control added in modal header
  - mobile-only card layout for item disposition rows (table transforms into labeled stacked cards)
- Dark theme UI improvements (`dracula`, `crimson-black`):
  - contrast fixes for WMR and Inspection History modals
  - clearer surfaces, text colors, input states, table headers/rows
  - distinct accent differentiation per dark theme (violet vs crimson focus/hover cues)

## Newly Implemented (2026-02-13, ongoing modular extraction in current chat)
- Additional behavior-preserving module extraction completed:
  - `core-shared-utils.js`
  - `core-school-profile-normalization.js`
  - `core-record-normalization.js`
  - `core-records-search-details.js`
  - `core-inventory-table-render.js`
  - `core-printing.js`
  - `core-form-staging.js`
  - `core-import-autosuggest.js`
  - `core-shell-view-state.js`
  - `core-main-entry.js`
- `ics_v_3_standalone_index.html` now loads the above modules and removed corresponding inline function bodies.
- Service worker precache updated for these modules and cache version advanced to `ics-v3-pwa-v33`.
- Remaining inline bootstrap/state/event wiring extracted from `ics_v_3_standalone_index.html` into `core-main-entry.js` (no inline runtime script block remains).

## Known Issue Resolved (2026-02-13, modal layering)
- Fixed `Migration Details` dialog layering behind Data Manager overlays.
- Applied patch:
  - raised global `.modal-overlay` stacking from `z-index:100` to `z-index:200` so `showModal(...)` dialogs render above `.actions-modal-overlay` (`z-index:145`).

## Newly Implemented (2026-02-12, stabilization + traceability follow-up)
- Runtime stabilization hotfixes:
  - removed stray trailing JS fragment after `</html>` that was breaking boot
  - restored missing `avatar` normalization in `normalizeUser()` that caused startup `ReferenceError`
  - dashboard/views now load normally again
- Profile settings UX:
  - Profile modal side menubar is active and wired (`Identity`, `School Lock`, `Preferences`, `Security`)
- Role and designation updates:
  - role separated from school/job designation in profile model
  - school-wide designation list is admin-managed from Profile Security
- Identity visuals:
  - school logo upload/remove (admin-controlled) updates sidebar app logo
  - vector avatar picker added for personnel profile; remains theme-aware
- Traceability hardening:
  - import preview now auto-migrates legacy records with missing `profile-key` trace fields
  - validation preview shows migration count (`Trace Migrated`) and flags warnings
  - export paths consistently include profile-key trace metadata, including:
    - records in schema exports
    - full package notifications/audit/archive normalization
    - single-record `Export ICS` payload (`exportedByProfileKey`, `exportedAt`, schema tag)
  - Profile Security now includes `Data Integrity Check` summary panel
  - one-step undo support added for major data mutations:
    - snapshot captured before `Repair Missing Profile Keys`
    - snapshot captured before Data Manager `Apply Import`
    - `Undo Last Data Change` action added in Profile Security (Admin)
  - pre-import trace checker added:
    - `Validate JSON Trace` in Import Center
    - reports missing profile-key trace fields without modifying local data
  - Profile Security now includes `Recent Data Activity` panel:
    - shows latest maintenance/import/export audit events with actor profile key
  - PWA/GitHub Pages readiness:
    - app manifest added (`manifest.webmanifest`)
    - service worker added (`sw.js`) with precache + offline fallback
    - app icons generated (`icons/icon-192.png`, `icons/icon-512.png`)
    - PWA metadata + service worker registration added in main app HTML
    - root `index.html` redirect entrypoint added for GitHub Pages

## Completed UI/Foundation Work
- SaaS shell structure completed:
  - left sidebar
  - top command bar
  - vector icon usage
  - tokenized theme system
- Action Center and table polish completed:
  - sticky first column behavior
  - density toggle
  - compact row action controls
- Modal/form system unification completed:
  - modal size classes
  - sticky modal footers
  - inline field error states
- Final polish completed:
  - spacing/hover/motion consistency
  - staggered entrance animations

## Post-Polish Functional Adjustments Completed
- Encoding artifacts cleaned.
- Small-screen spacing tightened (`<=640px`) for shell/topbar/sidebar.
- FAB restyled/reduced; floating form recolored and kept bottom-centered.
- `placeSheetNearAddItemButton` currently resets to default placement.
- Keyboard mapping includes `Alt+N` + `Ctrl/Cmd+A` for new form flow.
- Row/action text buttons converted to icon-only buttons in key tables (with `title` + `aria-label`).

## Dashboard Work Completed
- SaaS-style dashboard redesign implemented with:
  - visual hero section
  - KPI cards with vector icons
  - status distribution bars and richer analytics sections
- Later removed per request:
  - Lifecycle Trend section
  - Portfolio by Entity section
- Internal table scrollbars hidden while preserving scroll behavior.

## Profile + Theme System Completed
- Profile modal added and improved:
  - identity and preference sections
  - last login display
  - theme preview button grid
- Topbar user identity wiring added.
- Profile persistence added using localStorage key:
  - `icsCurrentUser`
- Preference persistence:
  - default view
  - table density
  - theme selection
- Theme picker behavior:
  - button-only theme selection (dropdown hidden)
  - live preview on click
  - cancel/escape/outside-click restores prior theme
  - save persists selected theme

## Available Themes (Current)
- Playful
- Elegant White
- Elegant Green (custom palette applied)
- Velvet Red
- Crimson Black
- Nord (custom palette applied)
- Dracula (custom palette applied)

## Theming Refactor Progress
- Global theme tokens now cover:
  - shell
  - buttons
  - modals
  - notification panel
  - dashboard chips
  - sidebar active state
  - logo gradient
  - FAB gradient
- Floating form moved to theme tokens (`--sheet-*`) and now adapts per theme.
- FAB focus ring moved to token (`--fab-focus-ring`) and adapts dark/light.
- Dark theme consistency patches added for Dracula/Crimson Black in:
  - profile sections
  - action tables
  - sticky table columns
  - density controls
  - staged/draft card and related table controls

## Product Direction Notes
- App works offline (single standalone HTML + localStorage + inline SVG/CSS).
- For selling to many schools:
  - free backend tiers are prototype only
  - if cloud sync is needed, use paid multi-tenant architecture
  - offline commercial path should include packaging + licensing strategy

## Missing / Next Priority Work (Recommended Order)
1. Packaging/licensing
   - installable build (Tauri/Electron)
   - license activation/update path
2. Continue modular refactor
   - move remaining UI/bootstrap/event wiring out of `ics_v_3_standalone_index.html`
   - finalize module boundaries and load order checks
3. Schema migration map
   - formal historical schema migration definitions (currently compatibility parsing + normalization)

## Newly Implemented (2026-02-12, this session)
- Data integrity layer baseline is now active:
  - strict `validateAndNormalizeICSRecord` on manual finalize and JSON import
  - import payload normalization supports:
    - single ICS object
    - records array
    - schema package (`data.records`)
- Data Manager module added:
  - split workflow architecture:
    - `Data Hub` chooser modal
    - `Import Center` modal
    - `Validation Preview` modal
    - `Export Center` modal
  - dry-run analysis of incoming data
  - merge mode (skip duplicate ICS) and replace mode (overwrite duplicate ICS)
  - conflict/invalid report export (`ics-import-conflict-report.json`)
  - preview/conflict review moved to dedicated validation modal before apply
  - import history panel added in Import Center (from `icsAuditLogs`)
- Schema-versioned export now available:
  - records package export
  - full package export
  - schema version tag: `3.1.0`
  - records export supports Year/Month filters
  - filter controls display per-year/per-month record counts
- Dashboard full backup now uses schema-versioned full export.
- Data Manager access and UX updates:
  - topbar entry (`Data`) with `Alt+D`
  - inline import status banners (success/error/info)
  - modal close controls moved to top-right headers
- ICS Records footprint markers:
  - per-record status metadata stored in `_statusMeta`:
    - `type` (`new` / `imported` / `updated`)
    - `at` timestamp
    - `by` username (current profile)
  - compact color-coded info marker beside ICS number with tooltip:
    - status + actor + timestamp
  - ICS/Entity table readability updates:
    - wider ICS column
    - one-line ICS with ellipsis + tooltip
    - explicit Entity text wrapping

## Newly Implemented (2026-02-12, security hardening)
- Backup/export packages now include integrity metadata:
  - SHA-256 checksum
  - canonicalization tag (`sorted-json-v1`)
  - integrity target (`package-without-integrity`)
- Import/restore verification gate added in Data Manager:
  - checksum verification status panel in Validation Preview
  - full-backup restore is blocked if checksum is missing/invalid
  - schema package restore is blocked on checksum mismatch/unsupported algorithm
  - Apply Import stays disabled until verification passes
- Backup audit entry now includes checksum fingerprint prefix.

## Newly Implemented (2026-02-12, school identity lock)
- School identity configuration added in Profile:
  - School Name
  - School ID (`4-12` digit lock value, e.g. `114656`)
- Active school identity now appears in top bar as context (`School Name [ID: ...]`).
- Export packages now include `schoolIdentity` metadata.
- Import verification now checks school lock compatibility:
  - blocks restore on School ID mismatch
  - blocks full-backup restore when School ID metadata is missing
  - allows non-full legacy imports with warning when School ID metadata is missing
- Validation Preview now shows package School ID when available.
- First-run/setup enforcement:
  - app now prompts a dedicated Setup/Sign-up modal on boot when School ID is missing
  - data actions are blocked until School Name + School ID are configured
  - setup modal includes school + first personnel creation flow
- Shared-computer login flow:
  - required login modal on boot (School ID + profile selection)
  - profile list is nested per School ID (`icsSchoolProfiles`)
  - data actions require active session login in addition to school lock
  - login modal includes `New Personnel` path for creating additional profiles under the same school
  - optional `Remember this device` session restore across refresh
  - explicit `Sign Out` actions in sidebar widget and Profile modal
  - dedicated Setup/Sign-up modal used for first-time school + personnel onboarding (instead of Profile modal)
  - sidebar profile widget added and compacted:
    - avatar + username + role
    - username area opens Profile settings
    - vector Sign Out icon beside identity block
- Setup modal UX refresh:
  - solid-color backdrop (no blur)
  - animated gradient border treatment

## Remaining Gaps After This Session
- Add formal migration map per historical schema version (currently normalized through compatibility parsing).
- Add automated regression checks for module loading order and critical workflows.

## Smoke Test Checklist (Quick Regression Pass)
1. Boot + Navigation
   - Open app and confirm Dashboard renders.
   - Switch views: Dashboard, Manage Inventory, Action Center, Archives.
2. Profile + Security
   - Open Profile side menu tabs and save without errors.
   - In Security tab, confirm `Data Integrity Check` summary renders.
   - Run `Repair Missing Profile Keys` (Admin) and confirm completion summary.
3. Import Preview
   - Load legacy JSON in Import Center.
   - Run `Validate JSON Trace` and confirm report appears.
   - Confirm Validation Preview shows `Trace Migrated` KPI when applicable.
   - Open `Migration Details` and verify row/field list appears.
4. Export Paths
   - Export Records package and Full package from Export Center.
   - Export single ICS from records table.
   - Verify payloads include `exportedByProfileKey` and trace profile-key fields.
5. Role Guardrails
   - Login as non-Admin profile and verify restricted actions are blocked with clear message.
6. Undo Snapshot
   - Run a trace repair or apply import, then use `Undo Last Data Change` in Profile Security (Admin).
   - Confirm records/activity are restored to previous state.

## Changelog (Recent)
- 2026-02-14:
  - Bumped app/UI baseline to `3.3`, schema/export baseline to `3.3.0`, and service worker cache to `ics-v3-pwa-v74`.
  - Added bottom-nav responsive pattern for mobile + tablet portrait, including center `New ICS` action and adjusted shell spacing.
  - Added global mobile/tablet horizontal-scroll behavior for dense tables.
  - Refactored Archive Details modal into ICS-style card layout (`icsd-*`) with improved responsive behavior.
  - Upgraded Notification Center with filters, bulk actions, grouping, dedupe counts, row actions, and iconized entries.
  - Improved Dashboard `Total Asset Value` overflow behavior via clipping + horizontal ticker animation.
  - Updated ICS Records table structure with dedicated status column and compact status indicators.
  - Moved depreciation display detail into tooltip-driven info action to reduce table clutter.
  - Updated app/UI version to `3.2` and schema/export baseline to `3.2.0`.
  - Added app-wide Lucide icon standardization with local vendor runtime, dynamic icon hydration, and icon click-hit alignment fixes.
  - Redesigned Data Hub modal to updated card layout (header icon block, action cards, helper/footer row).
  - Fixed Action Center `Inspection History` modal open reliability and hardened inspection modal fallback creation path.
  - Improved `Recent ICS Activity` readability in dark themes and aligned table background inheritance with widget surfaces.
  - Added desktop collapsible sidebar with persisted state and compact-icon mode.
  - Advanced service worker cache versions throughout changes up to `ics-v3-pwa-v73`.
  - Reworked ICS Details modal into a cleaner operator-focused layout and moved deep record history into a dedicated modal.
  - Simplified ICS Details actions/visibility (retained top-right close, removed non-essential controls/noise for standard users).
  - Redesigned Dashboard top-level UI into KPI + actions + compliance architecture and restored shared welcome banner consistency.
  - Added `Recent ICS Activity` and `Today's Notes` bottom sections with dynamic sync/integrity/reminder messaging.
  - Updated `Last sync` semantics to show last full backup/import history instead of plain render timestamp.
  - Applied sidebar visual facelift and updated `Action Center` nav branding (shield icon + title treatment).
  - Advanced service worker cache versions throughout changes up to `ics-v3-pwa-v62`.
- 2026-02-13:
  - Completed centralized role/access guard model (`ACCESS_RULES` + `requireAccess`) and enforced across major paths.
  - Added immutable record lineage timeline (`_lineage`) with version/hash chain and integrity verification.
  - Added persistent device ID + runtime session IDs and expanded audit attribution metadata.
  - Added lineage visibility and integrity signal in ICS Details and record status indicators.
  - Added boot-time baseline lineage migration for legacy records without `_lineage`.
  - Started modular refactor with new modules:
    - `core-storage-security.js`
    - `core-lineage-audit.js`
    - `core-data-manager.js`
    - `core-records-workflow.js`
    - `core-actions-workflow.js`
    - `core-profile-session.js`
    - `core-theme-preferences.js`
    - `core-school-setup-ui.js`
    - `core-profile-modal.js`
    - `core-shell-init.js`
    - `core-dashboard-view.js`
    - `core-dashboard-render.js`
    - `core-inventory-view-render.js`
    - `core-actions-view-render.js`
    - `core-archives-view-render.js`
    - `core-dashboard-actions.js`
    - `core-dashboard-metrics.js`
    - `core-app-bootstrap.js`
    - `core-keyboard-routing.js`
    - `core-notifications.js`
    - `core-ui-event-wiring.js`
    - `core-modal-system.js`
  - Updated service worker precache and cache version (`ics-v3-pwa-v23`) for modular JS assets.
  - Continued modular extraction with added modules:
    - `core-shared-utils.js`
    - `core-school-profile-normalization.js`
    - `core-record-normalization.js`
    - `core-records-search-details.js`
    - `core-inventory-table-render.js`
    - `core-printing.js`
    - `core-form-staging.js`
    - `core-import-autosuggest.js`
    - `core-shell-view-state.js`
    - `core-main-entry.js`
  - Completed extraction of remaining inline bootstrap/state/event wiring from `ics_v_3_standalone_index.html` into `core-main-entry.js` (no inline runtime script block remains).
  - Updated service worker precache and cache version to `ics-v3-pwa-v33`.
  - Resolved known UI issue: `Migration Details` dialog layering behind Data Manager overlays by increasing `.modal-overlay` z-index above `.actions-modal-overlay`.
- 2026-02-12:
  - Added dedicated Setup/Sign-up modal for first-time school + first personnel onboarding.
  - Added remember-device login session restore and explicit sign-out flow.
  - Added/compacted sidebar profile widget and moved primary quick sign-out there.
  - Removed top-nav duplicate identity/profile controls for cleaner header.
  - Added school identity lock (School ID in Profile), package school metadata on export, and cross-school import guardrails.
  - Added backup/restore hardening with package-level SHA-256 checksum metadata and restore verification gating before apply import.
  - Added strict import/save validation (`validateAndNormalizeICSRecord`) and schema-versioned exports (`3.1.0`).
  - Introduced Data Hub workflow split into Import Center, Validation Preview, and Export Center.
  - Added merge/replace import preview pipeline with conflict report export.
  - Added records export Year/Month filters with per-option counts.
  - Added Import Center recent activity panel from `icsAuditLogs`.
  - Added ICS row status footprints (`new`/`imported`/`updated`) with actor + timestamp tooltip.
  - Improved ICS Records readability (ICS ellipsis+tooltip, wider ICS column, wrapped Entity text).

## Resume Prompt (Copy for New Chat)
Use `PROJECT_STATUS.md` as baseline and continue from current fully modularized multi-file runtime. Current baseline includes centralized access control guards, immutable per-record lineage timeline with hash checks, device/session-attributed audits, and extracted modules (`core-storage-security.js`, `core-lineage-audit.js`, `core-data-manager.js`, `core-records-workflow.js`, `core-actions-workflow.js`, `core-profile-session.js`, `core-theme-preferences.js`, `core-school-setup-ui.js`, `core-profile-modal.js`, `core-shell-init.js`, `core-dashboard-view.js`, `core-dashboard-render.js`, `core-inventory-view-render.js`, `core-actions-view-render.js`, `core-archives-view-render.js`, `core-dashboard-actions.js`, `core-dashboard-metrics.js`, `core-app-bootstrap.js`, `core-keyboard-routing.js`, `core-notifications.js`, `core-ui-event-wiring.js`, `core-modal-system.js`, `core-shell-view-state.js`, `core-main-entry.js`). Next priority: packaging/licensing, then formal schema migration map and regression checks.
