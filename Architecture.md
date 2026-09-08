# Connect: product decisions and frontend architecture

> Find Your People.

**Current implementation:** a React SPA based on the supplied
`Connect - Find Your People.html`, with production-facing product copy.
Backend authentication, verification, payment processing, notification delivery,
and database-backed multi-user persistence still require integration. Changing
the presentation does not establish those service capabilities.

## Approved specification changes

The user explicitly resolved the conflicts with the earlier architecture:

| Area | Current decision |
| --- | --- |
| Product and visual identity | Connect; preserve the HTML's screens, copy, flow, Archivo typography, lime/ink theme, category colors, outlined cards, and light/dark variants. |
| Catalog | Follow all nine HTML categories and their subcategories, replacing the earlier 3-parent/12-subcategory catalog. |
| Registration | Implement the HTML's custom client signup and login screens. Hosted Entra redirects are not the current preview flow. |
| Birth date and demographics | Follow the HTML: optional birth date, age derived from it, gender choices including "Prefer not to say", independent off-by-default gender and age sharing. This supersedes required self-reported age and always-public age/gender. |
| Maps | Use Azure Maps, not the prototype's Leaflet integration. |
| Other prototype features | Follow the HTML, including multiple subcategories, group chat, waitlists, ratings, reliability/verification presentation, demographic/skill/cost filters, unlimited capacity, invitations, and cost modes. These are no longer excluded from the frontend scope. |
| Implementation scope | Build the complete interactive frontend preview using fictional local demo data, rather than connect to or build a backend in this delivery. |

The earlier backend architecture remains a **future production plan**, not a
description of a working backend. Where it conflicts with the decisions above,
this section takes precedence. Any new unresolved contradictions require user
confirmation.

## 1. Product and screens

The core loop is:

**Browse or sign up -> choose interests -> find or host a Connect -> join/request
attendance -> coordinate -> meet.**

The preview includes Welcome/login and recovery/provider entry points; seven-step
signup; Discover with category/search/location/time/availability filters and
list/map layouts; Connect details; eight-step hosting plus publication
confirmation; host management; categories; My Connects; group chat; own/member
profiles; alerts/preferences; and the prototype's UI kit.

The preview navigation is hidden by default and toggles with **Alt+Shift+O**
throughout the application. It provides access to screen families and layout,
card, palette, and theme variants. There is no bottom navigation/footer.
Guest browsing is supported; protected actions offer signup/login. Signup
returns to the requested in-app destination. Sign-in, recovery, and provider
entry points show normal availability errors until their services are connected,
rather than pretending that authentication or email delivery succeeded.

## 2. Client stack

| Concern | Implementation |
| --- | --- |
| App | React, TypeScript, Vite |
| Styling | CSS Modules with a small global token/reset stylesheet; no Tailwind or CSS-in-JS |
| Forms | React Hook Form with Zod and `@hookform/resolvers` |
| Product copy | `src/copies/index.ts` exports feature/usage-specific copy modules, formatting messages, validation, document metadata, and authored content |
| Navigation | React Router, justified by independently addressable screens and browser history |
| Shared client state | Zustand, justified by attendance, profile, hosting, chat, alerts, and preferences shared across independent screen families |
| Persistence | Session-scoped browser storage for the local preview; never a replacement for a server database |
| Server integration | Small typed `fetch` module with Zod response validation for optional Maps endpoints; no TanStack Query caching layer is needed yet |
| Maps | Lazy-loaded `azure-maps-control`; create/dispose through React lifecycle |
| Assets | The supplied HTML's bundled Archivo/Archivo Narrow fonts are served locally. Source photo slots remain clearly recognizable placeholders, not invented photographs. |

The dotted notice board, thick category side/top accents, rounded outlined
cards, and offset shadows deliberately reproduce the supplied visual reference;
they are not unsolicited changes to its design language.

Theme tokens use descriptive names: `--background`, `--text-color`,
`--secondary-text`, `--border-color`, `--subtle-border-color`,
`--hover-background`, `--shadow-color`, `--skeleton-background`, `--alert-color`,
`--success-color`, and `--category-color`. Hue tokens such as `--lime` and
`--pink` retain their names.

Forms validate each wizard step and the complete final submission. Domain state
changes are centralized outside presentation components. Passwords remain only in
transient form state and are not persisted or sent to a service.

UI copy describes the product without development disclaimers. Authored
Connect/member content remains client-side until a data API is integrated.
Session storage is readable by same-origin JavaScript and
browser developer tools; **it is not an authorization boundary**. A production
API must filter private profile and location values before returning them.

### Domain naming and browser state

`Connect` is the domain model, and `connects` is the list-state property.
Use full, descriptive words and include units in numeric property names.
Ordinary readable identifiers such as `name`, `email`, and `id` remain concise.
Standard React, browser, and SDK fields retain their required names; translate
external values at integration boundaries rather than renaming provider contracts.
Application action and time-calculation results use `success`; the native
browser `Response.ok` property remains unchanged.

| Domain | Descriptive properties |
| --- | --- |
| Connect classification and content | `categoryKey`, `subcategoryNames`, `whatToBring`, `timeZone`, `skillLevel`, `ageRestriction`, `costType`, `costAmount` |
| Connect location | `publicAreaLabel`, `latitude`, `longitude`, `distanceKilometers`, `locationType`, `meetingNotes`, `venueName`, `meetingInstructions` |
| Connect participation and host | `joinRequests`, `hostedConnectCount`, `hostAttendanceRate`, `isHostVerified`, `isGuestListPrivate` |
| Profile | `biography`, `phoneNumber`, `avatarDataUrl`, `isVerified`, `hostedConnectCount`, `attendanceRate` |
| Message and alert | Both use `connectId`; messages use `isPinned`, and alerts use `isRead` |
| Category colors | `primaryColor`, `alternateColor` |
| Discovery radius and preferences | `radiusKilometers`, `defaultRadiusKilometers` |
| Community state | `blockedUserIds`, `ratingsByConnectId` |

`locationType` accepts `physical`, `online`, or `undecided`.

Connect initialization and state operations use `createConnects`, `joinConnect`,
`leaveConnect`, `publishConnect`, `updateConnect`, `cancelConnect`, and
`rateConnect`. Authored fixture data lives in `src/copies/data/connects.json`;
discovery ordering lives in `src/features/discovery/sortConnects.ts`.

The rename starts fresh browser-state, host-draft, and community-feedback formats:

| Stored data | Namespace |
| --- | --- |
| Application state | `connect-state-v2`, with persistence version `2` |
| Host drafts | `connect-host-draft-v2:...` |
| Community feedback | `connect-community-feedback-v2` |

Previously saved data is not loaded, migrated, or copied into the new formats.
Earlier storage namespaces remain physically untouched: they are neither read
nor deleted. Earlier host-draft migrations have been removed, and no compatibility
aliases are retained for earlier field names. This local format change does not
connect or change production integrations.

## 3. Catalog

Categories and subcategories are configured, not user-created taxonomy.

| Category | Subcategories from the HTML |
| --- | --- |
| Sports | Football/Soccer, Basketball, Volleyball, Tennis/Padel, Running, Cycling, Swimming, Climbing, Other |
| Gaming | PC, Console, Board games, Tabletop RPG, Card games, Arcade/LAN, Other |
| Social | Movie night, Bar crawl, House party, Karaoke, Dinner/Potluck, Coffee meetup, Other |
| Outdoors | Hiking, Beach, Picnic, Camping, Dog walk, Other |
| Arts & Culture | Live music, Museums, Theater, Photography walk, Crafts, Other |
| Learn & Make | Language exchange, Study group, Coding/Hack night, Workshops, Book club, Other |
| Wellness | Yoga, Gym session, Meditation, Group walk, Other |
| Family & Kids | Playground meetup, Kids' sports, Family outing, Other |
| Other | Anything else |

A host selects one parent and one or more of its subcategories. Category
selection controls the color and symbol used across cards, map markers, and
details. Describing an Other activity belongs to the Connect; it does not
create a new taxonomy entry.

The future database design therefore needs a `connect_subcategories` join table
with a `connect_id` foreign key, not a single subcategory field on `connects`.
Database migrations and API contracts must enforce that selected subcategories
belong to the selected parent.

## 4. Profiles, signup, and privacy

Signup follows the HTML sequence: name/username; email/password; personal
details; optional photo; interests; location; completion. Birth date and photo
can be skipped. Entering a phone number does not authorize sharing it.

Signup uses a centered single-column form without a Connect-promotion
sidebar. Privacy controls retain their safe initial values without repeating
"off by default" in their labels or helper text.

Email, phone, gender, and age each have independent off-by-default sharing
controls. Changing a contact value resets that contact's sharing consent;
removing a phone disables its sharing. Age is derived from birth date rather
than stored as a separate aging integer. Choosing "Prefer not to say" disables
the date field without clearing its value. `birthDateWithheld` excludes that
retained date from eligibility and public age display until the choice is
reversed. Other members see age, never a full birth date, when sharing permits it.

As described by the HTML, hosts of gender- or age-restricted Connects may need
the relevant eligibility detail even when profile-wide sharing is off. This
exception must be explicitly explained and narrowly scoped to the host of the
relevant participation request in a future server projection. It does not
permit arbitrary demographic disclosure.

The preview checks age/gender restrictions before joining. A missing birth date
blocks age-restricted attendance but does not prevent ordinary browsing or
signup. Launch-region eligibility and legally restricted activities still need
a production policy; fixture ages and badges are not verified identity.

## 5. Hosting and participation

Hosting covers category, subcategories, optional descriptive content, timing, location,
capacity/visibility/joining, skill/age/cost, and review. It supports starting now
or planning ahead. Every Connect ends, and its time zone is explicit. Start/end
offsets are determined automatically from the IANA time zone, with no normal
UTC-offset inputs. Nonexistent local times are rejected; repeated local times
show a first/second-occurrence choice only when disambiguation is necessary.

Location modes include a physical place with a confirmed pin, Online, and
To be decided. Nonphysical Connects have no coordinates or distance and never
receive a fabricated map marker. Meeting links/details can remain private.

Capacity includes the host and can be unlimited, as in the HTML. Pending
requests do not consume confirmed spots. Full Connects expose waitlist
behavior. Only hosts can approve/decline requests, offer waitlist spots, edit,
or cancel. Capacity cannot be reduced below confirmed attendance.

The meeting-details privacy switch is grouped with joining controls. Enabling
privacy requires approval and disables instant joining. Disabling privacy
unlocks the instant option but preserves the host's ability to require approval.

Private meeting details stay out of the rendered public view. Private-address
hosting requires approval; the public point and radius/distance calculations
must use an approximate location. Public and exact location data remain
separate concepts. In production, never ship hidden exact addresses to an
unauthorized browser at all.

Cost modes are Free, Split cost, Pay your own, and Ticketed. This preview
displays and edits the information only; it never collects a payment.
Group chats require confirmed attendance to send; ended/cancelled chats are
read-only. Ratings are limited to attended past Connects. Report/block flows
provide local feedback and remove relevant shared access in preview state.

Joining, leaving, approval, cancellation, and capacity changes must serialize
on the same Connect row in PostgreSQL in production. Use `SELECT ... FOR
UPDATE` on one acquired connection and write outbox work in the same
transaction. A local Zustand mutation does not establish concurrency safety
between accounts or browsers.

## 6. Discovery and Azure Maps

The local fixture dataset is filtered in the frontend because this delivery has
no server or pagination. That is a **client-side implementation boundary**: the production
API must combine category, text, location, time, availability, and permitted
demographic/skill/cost filters before stable cursor pagination.

List and map use the same filtered result. Category/time/search filters can be
encoded in URL parameters. Device/search coordinates remain in memory, not
browser history or share links. Manual location selection remains available;
denying geolocation must not break browsing.

Descriptive discovery filter properties and query keys include `timeFilter`,
`skillLevelFilter`, `ageFilter`, `costFilter`, and `radiusKilometers`.

Discover fills the viewport at every result count; lists, maps, and filters
scroll within their panels rather than resizing the page. Sorting uses radio
controls for Distance, Relevance, and Popularity. Relevance prioritizes search
matches and selected interests, with start time as a tie-breaker. Popularity
orders by confirmed attendance; sorting does not mutate stored Connects.
Sort keys remain `distance`, `relevance`, and `popularity`.

Client radii use `radiusKilometers`, with `defaultRadiusKilometers` for the
saved preference. The future server discovery contract uses `radiusMeters`;
convert units explicitly at the API boundary.

To enable live Azure Maps, copy `.env.example` to `.env.local` and configure:

```text
VITE_API_BASE_URL=https://<standalone-function-app-origin>
VITE_AZURE_MAPS_CLIENT_ID=<public-Azure-Maps-account-client-id>
```

The frontend integration contract is:

| Route | Response |
| --- | --- |
| `GET /api/v1/maps/token` | `{ "token": "<short-lived Maps token>" }` |
| `GET /api/v1/locations/search?q=...` | `{ "results": [{ "label": "...", "latitude": 32.1, "longitude": 34.8 }] }` |

The SDK uses anonymous token-callback authentication with the public Maps
account client ID. Never provide a subscription key or client secret in the
bundle. The future token endpoint must be rate-limited, narrowly authorized,
and return `Cache-Control: no-store`. API origin/CORS are explicit; there is no
implicit Static Web Apps `/api` proxy.

Without configuration, the map shows a normal unavailable state, not a
counterfeit basemap or a duplicate event list. The hosting picker
offers known venues; arbitrary text is not converted into fabricated
coordinates. After selecting a result, the host confirms the pin. Provider
failures offer retry states while leaving list discovery usable.

In production use Azure Maps Search for addresses/POIs and PostgreSQL/PostGIS
for Connect discovery. Respect Azure Maps attribution and applicable
provider-result licensing/retention; keep host-authored instructions distinct
from provider-derived labels.

## 7. Future production backend

Retain the original Azure-first deployment direction: React static assets on
Azure Static Web Apps; native Node.js/TypeScript v4 HTTP and timer functions in
one standalone Azure Functions Flex Consumption app; Azure PostgreSQL
Flexible Server with PostGIS; `pg` repositories and versioned migrations.

Use private database networking with Functions VNet integration, managed
identities, narrow least-privileged database/Maps roles, Key Vault for remaining
secrets, private Blob Storage for validated media, and Application Insights with
sensitive-data redaction. Customer identities must never receive Azure
resource/database roles.

The custom signup frontend supersedes the earlier mandatory hosted-only
Entra/MSAL client flow. The production credential/verification/recovery
integration must be designed and approved before replacing demo login; do not
invent a password API, persist credentials in Zustand, or deploy the demo
profile switch as real authentication. Entra External ID remains a possible
provider, not a completed integration.

Keep authenticated identity validation, ownership, blocking/suspension, member
profile projection, exact-location access, and moderation authoritative on the
API. Ignore caller-supplied actor IDs. Use shared Zod schemas, stable JSON
errors/request IDs, idempotency, optimistic versions, and conflict responses.

Future Connect resources use `/api/v1/connects` and
`/api/v1/connects/{connectId}`. PostgreSQL stores Connects in the `connects`
table, and related tables refer to them through `connect_id` foreign keys.
Client models and JSON relationships use `connectId`. These are planned naming
contracts, not implemented routes or database changes.

Use a transactional database outbox with a leased timer worker and Azure
Communication Services Email for application notifications. Retry transient
failures, deduplicate jobs, invalidate stale versions, and do not promise
exactly-once delivery. Browser timers are not reminder infrastructure.

Use Bicep and Azure DevOps Pipelines for future infrastructure and two release
artifacts (SPA and Functions). Migration jobs require their own privileged
identity and private-network access. Bound Functions concurrency and database
pooling; refresh Entra connection tokens and retain TLS validation. Specify
backup, restoration, retention, account deletion, abuse handling, age policy,
and release rollback before public launch.

Express on App Service remains an alternative only if a conventional server is
actually needed, not a second backend to build now. No monorepo framework,
service bus, distributed cache, gateway, or AI matching system is introduced.

## 8. Repository and local development

```text
src/
  components/          Shared accessible UI, shell, Maps and location picker
  copies/              All application-authored user-facing strings and content
  features/
    welcome/           Landing, custom login and recovery/provider previews
    identity/          Signup and profiles
    discovery/         Search/list/map and Connect detail
    hosting/           Hosting wizard and organizer management
    community/         Categories, plans, chat, alerts, design kit
  lib/                 Typed domain models, catalog, demo fixtures, state, API
  styles/              Global design tokens, font faces and reset
public/
  fonts/               Bundled source fonts
  staticwebapp.config.json
```

Run `npm install`, then `npm run dev`. `npm run build` runs the existing
TypeScript/Vite production build. `npm run preview` serves the built artifact.
Run `npm run check:copies` to detect inline JSX, accessibility, validation,
notification, or other authored copy that belongs in the centralized modules.
The static-host fallback supports direct frontend routes without rewriting
asset or API paths to HTML.

This phase is complete only as a frontend preview. Multi-user persistence,
secure authentication, protected server projections, atomic capacity,
real geocoding/token services, notification delivery, payment integrations,
moderation operations, and Azure provisioning are separate implementation work.
