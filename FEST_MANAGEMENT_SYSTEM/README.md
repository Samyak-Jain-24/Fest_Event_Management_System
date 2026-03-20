# Felicity Event Management System

A comprehensive event management platform for IIIT Hyderabad's annual fest **Felicity**, built with the **MERN stack** (MongoDB, Express.js, React, Node.js). The system supports three user roles — Participants, Organizers, and Admins — with features ranging from event browsing and registration to merchandise payments, QR-based attendance, real-time discussion forums, and calendar integration.

> **Additional Attribute for Participant Model:** FOLLOWED CLUBS — added because it is important to know which clubs a participant follows in order to find the top 5 recommended events for that particular participant.

> **Additional Attribute for Organizer Model:** CONTACT NUMBER — added because in case of urgency, a participant might need to directly contact the organizer rather than waiting for an email reply.

---

## Table of Contents

1. [Libraries, Frameworks & Modules](#libraries-frameworks--modules)
2. [Advanced Features Implemented](#advanced-features-implemented)
3. [Setup & Installation Instructions](#setup--installation-instructions)
4. [API Endpoints](#api-endpoints)
5. [Database Models](#database-models)
6. [Deployment](#deployment)

---

## Libraries, Frameworks & Modules

### Backend

- **Express.js** (^4.18.2) — Lightweight and minimal Node.js web framework. Chosen for its simplicity, vast middleware ecosystem, and ease of building RESTful APIs. It is the de-facto standard for Node.js backends.
- **Mongoose** (^8.0.3) — MongoDB object-document mapper (ODM). Provides schema-based data modeling, built-in validation, query building, and middleware hooks — essential for enforcing data integrity in a multi-model system (events, registrations, orders, etc.).
- **MongoDB Driver** (^7.1.0) — Official MongoDB Node.js driver, used as the underlying connection layer by Mongoose. Included explicitly for direct aggregation pipelines and connection management.
- **jsonwebtoken / JWT** (^9.0.2) — Industry-standard library for generating and verifying JSON Web Tokens. Used for stateless authentication across all three roles (participant, organizer, admin) with role-based claims.
- **bcryptjs** (^2.4.3) — Pure-JS implementation of bcrypt for password hashing with salt rounds. Chosen over native `bcrypt` to avoid native compilation issues across platforms while maintaining strong security (10 salt rounds).
- **nodemailer** (^6.10.1) — Comprehensive email sending library. Used for sending registration confirmation emails, password reset tokens (participants), and QR ticket delivery. Configured with SMTP (Gmail).
- **Resend** (^6.9.2) — Modern email API service as an alternative/fallback email provider. Provides reliable transactional email delivery with a simple API.
- **qrcode** (^1.5.3) — QR code generation library that outputs base64 data URLs. Used to generate unique QR codes for event tickets (format: `FEL-{timestamp}-{random}`), embedded directly in registration records.
- **express-validator** (^7.0.1) — Middleware-based request validation library built on `validator.js`. Used across all API routes to validate and sanitize input data (emails, string lengths, required fields) before reaching controllers.
- **validator** (^13.11.0) — String validation and sanitization library. Provides granular validation functions (isEmail, isURL, etc.) used both standalone and as the engine behind express-validator.
- **cors** (^2.8.5) — Express middleware for Cross-Origin Resource Sharing. Required to allow the React frontend (running on a different port/domain) to communicate with the backend API.
- **dotenv** (^16.3.1) — Loads environment variables from `.env` files into `process.env`. Keeps sensitive configuration (DB credentials, JWT secrets, email passwords) out of source code.
- **axios** (^1.13.4) — Promise-based HTTP client. Used server-side for Discord webhook integration — posting event announcements to Discord channels when new events are created by organizers.
- **nodemon** (dev, ^3.0.2) — Development utility that auto-restarts the Node.js server on file changes. Improves developer experience during active development.

### Frontend

- **React** (^18.2.0) — Core UI framework. Chosen for its component-based architecture, virtual DOM for efficient rendering, and extensive ecosystem. React 18 provides concurrent features and automatic batching for better performance.
- **React DOM** (^18.2.0) — React's rendering layer for web browsers. Required companion to React for DOM manipulation.
- **React Router DOM** (^6.20.1) — Declarative client-side routing library. Used for navigating between pages (login, dashboard, event details, etc.) and implementing protected routes based on user role with `PrivateRoute` component.
- **React Scripts** (5.0.1) — Create React App's build toolchain. Provides pre-configured Webpack, Babel, ESLint, and development server — enabling zero-config project setup with industry-standard build processes.
- **Axios** (^1.6.2) — Promise-based HTTP client for making API calls to the backend. Chosen over native `fetch` for its interceptor support (used for automatic JWT token injection via request interceptors), response transformation, and cleaner error handling.
- **React Toastify** (^9.1.3) — Toast notification library. Provides non-intrusive success/error/info notifications throughout the app (registration success, payment approval, attendance marking, etc.) with minimal configuration.
- **React Icons** (^4.12.0) — Consolidated icon library providing icons from Font Awesome, Material Design, Heroicons, and more as React components. Eliminates the need for multiple icon font imports while keeping bundle size small via tree-shaking.
- **qrcode.react** (^3.1.0) — React component for rendering QR codes in the browser. Used on the participant side to display event tickets as scannable QR codes in the dashboard and registration confirmation pages.
- **date-fns** (^3.0.6) — Lightweight, modular date utility library. Chosen over Moment.js (deprecated) for its tree-shakeable architecture and functional approach. Used for formatting event dates, computing durations, and calendar export date arithmetic.
- **Recharts** (^2.10.3) — Composable charting library built on D3 and React. Used in the organizer and admin dashboards for analytics visualizations — registration trends, attendance statistics, revenue charts, and event performance metrics.
- **jsQR** (CDN, latest) — JavaScript QR code decoding library. Loaded via CDN in the QR Scanner component to decode QR codes from camera frames and uploaded images in real-time, enabling organizers to scan tickets during events.
- **CSS3** (custom) — All styling is done with custom CSS (no UI framework like Material-UI or Bootstrap). This decision was made to maintain full control over the design, avoid unnecessary bundle bloat, and practice CSS architecture. Responsive layouts use Flexbox and Grid.

---

## Advanced Features Implemented

The following advanced features have been implemented from the required tiers, totaling **30 marks** (Tier A: 16 + Tier B: 12 + Tier C: 2).

### Tier A — Core Advanced Features (2 features selected, 16 marks)

#### 1. Merchandise Payment Approval Workflow [8 Marks]

**Justification for selection:** This feature was chosen because it represents a complex, real-world e-commerce workflow that integrates payment verification, inventory management, and approval pipelines — critical for any event management system selling merchandise. It also naturally ties into the existing QR ticket and registration systems.

**Implementation overview:**

The merchandise payment approval system implements a complete order lifecycle:

1. **Participant places an order** — selects items and quantities from an event's merchandise catalog, uploads a payment proof image (converted to base64), and submits the order. The system validates stock availability, checks for duplicate orders, and creates the order in a *Pending Approval* state.

2. **Organizer reviews orders** — a dedicated Payment Approval dashboard provides a tabbed interface (Pending / Approved / Rejected) showing all orders with payment proof images. Organizers can view the uploaded proof in a modal and approve or reject with a reason.

3. **On approval** — stock is atomically decremented, a unique ticket ID (format: `FEL-{timestamp}-{random}`) and QR code are generated, a corresponding `Registration` record is created (for attendance system compatibility), and a confirmation email is sent to the participant.

4. **On rejection** — the rejection reason is stored and displayed to the participant. No QR is generated while the order is in Pending or Rejected state.

**Design choices & technical decisions:**
- Payment proof images are stored as **base64 strings in MongoDB** rather than using external file storage (S3, Cloudinary). This simplifies deployment and avoids additional service dependencies, though it increases document size — an acceptable trade-off for a fest management tool with bounded scale.
- Approved merchandise orders automatically create a parallel `Registration` record. This ensures consistency with the attendance tracking system — approved merchandise buyers appear in the attendance dashboard and can be checked in via QR scan, just like regular event registrants.
- Stock decrement uses Mongoose's `$inc: { -quantity }` atomic operation to prevent race conditions in concurrent approvals.

**Key files:**
- Backend: `models/MerchandiseOrder.js`, `controllers/merchandiseOrderController.js`, `routes/merchandiseOrderRoutes.js`
- Frontend: `pages/participant/MerchandiseOrderPage.js`, `pages/participant/MerchandiseOrders.js`, `pages/organizer/PaymentApproval.js`

---

#### 2. QR Scanner & Attendance Tracking [8 Marks]

**Justification for selection:** Attendance tracking with QR codes is a core operational need for any event — knowing who showed up is essential for organizers. This feature demonstrates integration of hardware APIs (camera), image processing (QR decoding), real-time dashboards, and data export capabilities.

**Implementation overview:**

The system provides a complete attendance pipeline:

1. **QR Code Generation** — when a participant registers (or a merchandise order is approved), a unique ticket ID (`FEL-{timestamp}-{random}`) and its corresponding QR code (base64 data URL) are generated and stored with the registration.

2. **QR Scanning (3 modes):**
   - **Camera mode** — uses the browser's `getUserMedia` API to access the device camera, captures video frames on a canvas, and decodes QR codes in real-time using the `jsQR` library. Includes a viewfinder overlay and scan animation.
   - **File upload mode** — allows scanning QR codes from uploaded images (useful when camera access is restricted).
   - **Manual entry mode** — organizers can type a ticket ID directly for edge cases.

3. **Attendance marking** — scanned ticket IDs are looked up against registrations. The system detects and rejects duplicate scans with appropriate feedback. Successful scans mark attendance with a timestamp.

4. **Manual override** — organizers can manually mark attendance for exceptional cases (e.g., lost ticket). An audit trail is stored recording the reason, the organizer who performed the override, and the timestamp.

5. **Live attendance dashboard** — shows real-time counts of scanned vs. not-scanned participants, a progress bar, auto-refreshes every 10 seconds, and provides tabbed views (All / Scanned / Not Scanned) with search filtering.

6. **CSV export** — generates a downloadable attendance report with columns: Name, Email, Contact, Type, Ticket ID, Attended, Attendance Time, Manual Override.

**Design choices & technical decisions:**
- The QR code encodes JSON data containing the `ticketId` plus event and participant metadata. The scanner gracefully falls back to plain-text `ticketId` parsing when JSON decoding fails, making it robust against different QR formats.
- `jsQR` is loaded via CDN rather than bundled, reducing the main application bundle size. The scanner handles graceful degradation if the library fails to load.
- Manual overrides store the audit trail in the Registration document's `formData` Map field, reusing an existing flexible schema field rather than adding new fields — keeps the model lean while preserving accountability.
- The attendance dashboard uses 10-second polling for live updates, balancing real-time feel against server load.

**Key files:**
- Backend: `controllers/attendanceController.js`, `routes/attendanceRoutes.js`, `utils/qrcode.js`
- Frontend: `pages/organizer/QRScanner.js`, `pages/organizer/AttendanceDashboard.js`

---

### Tier B — Real-time & Communication Features (2 features selected, 12 marks)

#### 1. Real-Time Discussion Forum [6 Marks]

**Justification for selection:** A discussion forum directly enhances the event experience by enabling participants to ask questions, share information, and interact — turning a passive event listing into an active community. It also demonstrates real-time data synchronization, content moderation, and notification workflows.

**Implementation overview:**

The discussion forum is embedded on each Event Details page and provides:

1. **Messaging** — registered participants and the event organizer can post messages (max 2,000 characters). Only users who have registered for the event (checked against both `Registration` and `MerchandiseOrder` models) or the event organizer can post.

2. **Threading** — messages support nested replies via a `parentMessage` reference. Reply counts are maintained on parent messages.

3. **Announcements & Pinning** — organizers can post announcements (highlighted distinctly) and pin important messages to the top of the forum.

4. **Reactions** — users can react to messages with a predefined emoji set (👍 ❤️ 😂 🎉 🤔 👎). Reactions toggle on/off and display counts.

5. **Moderation** — organizers can delete any message (with cascading deletion of replies), pin/unpin messages, and post announcements. Users can delete their own messages.

6. **Notifications** — the system generates notifications when:
   - An announcement is posted (notifies all registered participants)
   - A reply is made to a message (notifies the parent message author)
   - A new message is posted (notifies the organizer)
   The forum component includes a notification bell with unread count and mark-as-read functionality.

7. **Real-time updates** — the forum auto-refreshes every 10 seconds via polling, displaying new messages without page reload.

**Design choices & technical decisions:**
- **Polling over WebSockets:** The forum uses 10-second polling rather than WebSockets for real-time updates. This was a deliberate trade-off — polling is significantly simpler to implement, deploy, and scale (no sticky sessions or WebSocket server needed), and the 10-second interval provides a sufficiently responsive experience for a discussion forum where instant delivery is not critical (unlike chat).
- **Polymorphic author references:** The `ForumMessage` model uses Mongoose's `refPath` to allow both `Participant` and `Organizer` documents as authors via a single `author` field, with the `authorModel` field specifying which collection to populate from. This keeps the schema clean and avoids duplicate message models.
- **Authorization check spans two models:** Post authorization checks both `Registration` and `MerchandiseOrder` collections to determine if a user is a valid participant for the event — ensuring merchandise buyers also get forum access.
- Pinned messages are always sorted to the top regardless of timestamp, and announcements receive distinct visual styling with badges.

**Key files:**
- Backend: `models/ForumMessage.js`, `controllers/forumController.js`, `routes/forumRoutes.js`, `models/Notification.js`, `controllers/notificationController.js`
- Frontend: `components/DiscussionForum.js` (816 lines — self-contained component with messaging, threading, reactions, notifications, and moderation UI)

---

#### 2. Organizer Password Reset Workflow [6 Marks]

**Justification for selection:** This feature was chosen because it demonstrates an admin-approval workflow that is distinct from the standard token-based reset. Organizer accounts are privileged (they manage events and finances), so their password resets should go through an administrative review process rather than automated email links — this is a realistic security design for organizational tools.

**Implementation overview:**

Two parallel password reset flows exist in the system:

**Flow 1 — Organizer admin-approval reset:**
1. An organizer submits a password reset request with their email, club name, and reason via a public endpoint.
2. The admin views all pending requests in a dedicated dashboard with tabs (Pending / Approved / Rejected / All). Each request shows the organizer's name, category, date, and reason.
3. On **approval**, the system auto-generates a secure 12-character hexadecimal password, hashes it with bcrypt, updates the organizer's record, and stores the generated password in the reset record for the admin to communicate.
4. On **rejection**, the admin provides a comment explaining the rejection.
5. The admin dashboard includes clipboard-copy functionality for the generated password.

**Flow 2 — Participant token-based reset:**
1. Participant requests a reset via email.
2. The system generates a cryptographic token, stores it with an expiry, and emails a reset link.
3. The participant clicks the link and sets a new password. The token is validated and invalidated after use.

**Design choices & technical decisions:**
- The **dual-flow architecture** was a deliberate design decision: participants get self-service resets (convenience), while organizers go through admin approval (security). Organizer accounts can create events, manage payments, and access participant data, so having admin oversight for credential changes is warranted.
- Auto-generated passwords use Node.js `crypto.randomBytes(6).toString('hex')` for 12-character hex strings — providing 48 bits of entropy, sufficient for temporary passwords that organizers should change after login.
- The `PasswordReset` model supports both user types (`participant` / `organizer`) with a flexible schema that includes organizer-specific fields (`organizerName`, `category`) alongside shared fields (`email`, `status`, `reason`).
- Password reset history is fully preserved (not deleted after processing), enabling audit trails.

**Key files:**
- Backend: `models/PasswordReset.js`, `controllers/adminController.js` (approval flow), `controllers/authController.js` (token flow)
- Frontend: `pages/admin/PasswordResets.js`, `pages/common/ForgotPassword.js`, `pages/common/ResetPassword.js`

---

### Tier C — Integration & Enhancement Features (1 feature selected, 2 marks)

#### 1. Add to Calendar Integration [2 Marks]

**Justification for selection:** Calendar integration provides immediate practical value — participants can add events to their personal calendars with one click, reducing the chance of missing events. It demonstrates backend file generation (ICS format), third-party API deep linking, and reusable frontend components.

**Implementation overview:**

1. **ICS file generation** — the backend generates RFC 5545-compliant `.ics` files with:
   - Proper `VTIMEZONE` definitions for Asia/Kolkata (IST)
   - `VALARM` reminder components with user-configurable duration (5 minutes to 1 week before the event)
   - Correct escaping of special characters in event names/descriptions
   - Support for both single-event and batch export (multiple events in one `.ics` file)

2. **Google Calendar deep link** — builds a properly formatted URL that opens Google Calendar's event creation page pre-filled with event details.

3. **Microsoft Outlook deep link** — builds an Outlook Web deep link for direct calendar event creation.

4. **Frontend component** — a reusable `CalendarExport` React component with three rendering modes:
   - **Single mode** — full card with `.ics` download button, Google Calendar button, Outlook button, configurable reminder dropdown, and timezone display
   - **Batch mode** — export multiple selected events into one `.ics` file
   - **Inline mode** — compact button row (📅 G O icons) for embedding in event lists

**Design choices & technical decisions:**
- ICS generation is handled entirely on the backend rather than client-side, ensuring consistent formatting and allowing the server to validate that the requesting participant is actually registered for the event.
- Calendar export requires an active registration — unregistered users cannot generate calendar files. This is enforced via middleware.
- The `VTIMEZONE` component is hardcoded for IST (Asia/Kolkata) since Felicity is an IIIT Hyderabad event. This simplifies implementation while being correct for the target audience.
- The reminder duration is user-configurable (dropdown in the UI), defaulting to 30 minutes — a practical default for on-campus events.

**Key files:**
- Backend: `controllers/calendarController.js` (358 lines — ICS generation, Google/Outlook link builders), `routes/calendarRoutes.js`
- Frontend: `components/CalendarExport.js` (384 lines — reusable 3-mode component)

---

### Feature Summary

- **Merchandise Payment Approval Workflow** — Tier A — 8 Marks — Fully Implemented
- **QR Scanner & Attendance Tracking** — Tier A — 8 Marks — Fully Implemented
- **Real-Time Discussion Forum** — Tier B — 6 Marks — Fully Implemented
- **Organizer Password Reset Workflow** — Tier B — 6 Marks — Fully Implemented
- **Add to Calendar Integration** — Tier C — 2 Marks — Fully Implemented
- **Total: 30 Marks**

---

## Setup & Installation Instructions

### Prerequisites

- **Node.js** v14 or higher
- **MongoDB** (local instance or MongoDB Atlas cloud)
- **Git**

### 1. Clone the Repository

```bash
git clone <repository-url>
cd 2024101062
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the `backend/` directory:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key_min_32_characters
JWT_EXPIRE=7d
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Email configuration (for notifications, password resets, ticket delivery)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
```

Seed the default admin account:

```bash
node seedAdmin.js
```

This creates an admin user with email `admin@felicity.com` and password `admin123`. Change the password after first login.

Start the backend server:

```bash
npm start        # Production
npm run dev      # Development (auto-restart with nodemon)
```

The backend will run on `http://localhost:5000`.

### 3. Frontend Setup

```bash
cd frontend
npm install
```

Create a `.env` file in the `frontend/` directory:

```env
REACT_APP_API_URL=http://localhost:5000/api
```

Start the development server:

```bash
npm start
```

The frontend will run on `http://localhost:3000`.

### 4. Building for Production

```bash
cd frontend
npm run build
```

The optimized production build will be output to `frontend/build/`.

---

## API Endpoints

### Authentication
- `POST /api/auth/register/participant` — Register new participant
- `POST /api/auth/login` — Login (participant/organizer/admin)
- `GET /api/auth/me` — Get current authenticated user
- `POST /api/auth/forgot-password` — Request password reset (participant)
- `POST /api/auth/reset-password` — Reset password with token (participant)

### Participants
- `GET /api/participants/profile` — Get participant profile
- `PUT /api/participants/profile` — Update participant profile
- `PUT /api/participants/preferences` — Update preferences
- `POST /api/participants/follow/:organizerId` — Follow/unfollow a club

### Events
- `GET /api/events` — List all events (with filters)
- `GET /api/events/:id` — Get event by ID
- `POST /api/events` — Create event (organizer)
- `PUT /api/events/:id` — Update event (organizer)
- `DELETE /api/events/:id` — Delete event (organizer)

### Registrations
- `POST /api/registrations/:eventId` — Register for an event
- `GET /api/registrations` — Get my registrations
- `PUT /api/registrations/:id/cancel` — Cancel registration
- `GET /api/registrations/event/:eventId` — Get event registrations (organizer)

### Merchandise Orders
- `POST /api/merchandise-orders/:eventId` — Place merchandise order with payment proof
- `GET /api/merchandise-orders/my-orders` — Get participant's orders
- `GET /api/merchandise-orders/event/:eventId` — Get all event orders (organizer)
- `PUT /api/merchandise-orders/:orderId/approve` — Approve order (organizer)
- `PUT /api/merchandise-orders/:orderId/reject` — Reject order (organizer)

### Attendance
- `POST /api/attendance/scan` — Scan QR and mark attendance
- `POST /api/attendance/manual` — Manually mark attendance with reason
- `GET /api/attendance/dashboard/:eventId` — Get live attendance dashboard
- `GET /api/attendance/export/:eventId` — Export attendance as CSV

### Forum
- `GET /api/forum/:eventId/messages` — Get forum messages (paginated)
- `GET /api/forum/:eventId/thread/:messageId` — Get thread replies
- `POST /api/forum/:eventId/messages` — Post a message or reply
- `DELETE /api/forum/:eventId/messages/:messageId` — Delete message (moderation)
- `PUT /api/forum/:eventId/messages/:messageId/pin` — Pin/unpin message (organizer)
- `PUT /api/forum/:eventId/messages/:messageId/react` — Toggle reaction on message

### Calendar
- `GET /api/calendar/export/:eventId` — Download .ics file for event
- `POST /api/calendar/export/batch` — Download .ics for multiple events
- `GET /api/calendar/google/:eventId` — Get Google Calendar link
- `GET /api/calendar/outlook/:eventId` — Get Outlook Calendar link
- `GET /api/calendar/info/:eventId` — Get all calendar links + event info

### Admin
- `POST /api/admin/organizers` — Create organizer account
- `GET /api/admin/organizers` — List all organizers
- `PUT /api/admin/organizers/:id/toggle-active` — Activate/deactivate organizer
- `DELETE /api/admin/organizers/:id` — Delete organizer
- `GET /api/admin/password-resets` — Get password reset requests
- `PUT /api/admin/password-resets/:id/approve` — Approve reset request
- `PUT /api/admin/password-resets/:id/reject` — Reject reset request

### Organizers
- `GET /api/organizers` — List all organizers/clubs
- `GET /api/organizers/:id` — Get organizer details
- `GET /api/organizers/me/profile` — Get own profile
- `PUT /api/organizers/me/profile` — Update own profile
- `GET /api/organizers/me/analytics` — Get analytics dashboard data

### Notifications
- `GET /api/notifications` — Get user notifications
- `PUT /api/notifications/:id/read` — Mark notification as read

---

## Database Models

- **Participant** — Fields: name, email, contactNumber, participantType (IIIT/Non-IIIT), college, areasOfInterest, followedClubs. Purpose: Participant accounts with preferences and club following.
- **Organizer** — Fields: name, email, category, description, contactNumber, discordWebhookUrl, isActive, createdBy. Purpose: Club/organizer accounts managed by admin.
- **Admin** — Fields: email, password, role. Purpose: System administrator accounts.
- **Event** — Fields: name, description, eventType (normal/merchandise), dates, registrationLimit, fee, customFormFields, itemVariants, status. Purpose: Events with support for both normal and merchandise types.
- **Registration** — Fields: event, participant, ticketId, qrCode, registrationType, formData, attended, attendanceTime. Purpose: Event registrations with QR tickets and attendance tracking.
- **MerchandiseOrder** — Fields: event, participant, items, paymentProof, paymentStatus (Pending Approval/Approved/Rejected), ticketId, qrCode, rejectionReason, approvedBy. Purpose: Merchandise orders with payment approval workflow.
- **ForumMessage** — Fields: event, author (polymorphic), content, parentMessage, isPinned, isAnnouncement, reactions, replyCount. Purpose: Threaded discussion forum messages with moderation.
- **Notification** — Fields: recipient, recipientModel, type, title, message, relatedEvent, isRead. Purpose: In-app notifications for forum activity and system events.
- **PasswordReset** — Fields: email, userType, organizerName, category, reason, status, adminComment, generatedPassword, processedBy. Purpose: Password reset requests with admin approval workflow.

---

## Deployment

The application is deployed at:

- **Frontend:** https://felicity-frontend-inky.vercel.app (Vercel)
- **Backend:** https://felicity-backend-rqat.onrender.com (Render)
- **Database:** MongoDB Atlas

---

## Project Structure

```
2024101062/
├── backend/
│   ├── config/          # Database connection configuration
│   ├── controllers/     # Route handlers (business logic)
│   ├── middleware/       # Auth & error handling middleware
│   ├── models/          # Mongoose schema definitions
│   ├── routes/          # Express route definitions
│   ├── utils/           # Utilities (email, QR, JWT, Discord)
│   ├── server.js        # Express app entry point
│   └── seedAdmin.js     # Admin account seeder script
├── frontend/
│   ├── public/          # Static assets
│   └── src/
│       ├── components/  # Reusable components (Forum, Calendar, PrivateRoute)
│       ├── context/     # React Context (AuthContext)
│       ├── pages/       # Page components organized by role
│       │   ├── admin/       # Admin dashboard, organizer management, password resets
│       │   ├── common/      # Shared pages (login, register, events, clubs)
│       │   ├── organizer/   # Event management, QR scanner, attendance, payments
│       │   └── participant/ # Participant dashboard, profile, merchandise orders
│       └── services/    # API service layer (Axios instance with interceptors)
├── deployment.txt       # Deployment URLs
└── README.md
```
