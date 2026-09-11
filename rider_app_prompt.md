# NaijaMove Rider App — Google Stitch UI Design Prompt

## Project Brief

Design the complete mobile UI for **NaijaMove**, a Nigeria-first ride-hailing app built for Lagos.
The app is built in Flutter. Every screen must be designed for **Android and iOS** at standard mobile
dimensions (390×844pt). Export all screens as a connected prototype in Google Stitch.

---

## Brand Identity

**App name:** NaijaMove
**Tagline:** Built for how Nigeria moves

### Colour Palette
| Token | Hex | Usage |
|---|---|---|
| Primary Blue | `#1A6FE8` | CTAs, active states, brand moments |
| Primary Dark | `#0A2D6E` | Headers, splash background, heavy text |
| Primary Light | `#EBF2FD` | Selected card backgrounds, chip fills, input focus tint |
| Accent Gold | `#F5A623` | Surge pricing badge, earnings highlights, promo tags |
| Surface White | `#FFFFFF` | Card backgrounds, input fields, bottom sheets |
| Background | `#F0F4FA` | Screen backgrounds — cool off-white with blue undertone |
| Text Primary | `#0D1B2A` | Body copy, headings |
| Text Secondary | `#64748B` | Captions, placeholders, labels |
| Danger Red | `#E53935` | SOS button, errors, cancellation |
| Success Teal | `#0EA5A0` | Confirmed states, completed trips, verified badges |
| Map Overlay | `#1A6FE8` at 15% opacity | Demand heatmap zones |
| Border Subtle | `#D1DCF0` | Input borders, dividers, card outlines |

### Typography
- **Display / Headings:** Inter Bold, 24–32pt
- **Body:** Inter Regular, 14–16pt
- **Labels / Captions:** Inter Medium, 11–13pt
- **Fare / Numbers:** Inter SemiBold, tabular figures

### Design Principles
- Nigeria-first: confident and professional, not sterile or cold
- Blue conveys trust, reliability and safety — the right signal for a mobility product
- Low-bandwidth friendly: no heavy gradients or large image assets
- High contrast: readable in bright Lagos sunlight (Primary Dark on white passes AAA)
- Touch targets minimum 48×48pt
- Bottom-heavy navigation — thumbs reach everything
- Map is always the hero on trip screens
- Use depth through subtle shadows and layering, not heavy colour fills

---

## Screen Inventory

Design every screen listed below. Group them into flows.

---

## Flow 1 — Onboarding & Authentication

### Screen 1.1 — Splash Screen
- NaijaMove logo centred on Primary Dark (`#0A2D6E`) background
- Tagline: "Built for how Nigeria moves"
- Subtle animated pulse on the logo mark
- Auto-advances to onboarding after 2s

### Screen 1.2 — Onboarding Carousel (3 slides)
**Only shown on first install. Returning users skip directly to Screen 1.3.**
**Slide 1:** Illustration of Lagos skyline with a car — headline "Rides that work for Lagos"
**Slide 2:** Illustration of a driver smiling — headline "Drivers who earn fairly"
**Slide 3:** Illustration of a phone with wallet — headline "Pay your way — card, wallet or cash"
- Progress dots at bottom
- Skip button top-right
- Next / Get Started CTA at bottom

### Screen 1.3 — Phone Number Entry
- Header: "Enter your phone number"
- Sub-copy: "We'll send you a 6-digit code"
- Nigerian flag + +234 country prefix (non-editable)
- Phone number input field (numeric keyboard)
- "Send Code" primary button (full width, Primary Blue)
- "By continuing you agree to our Terms & Privacy Policy" footer link
- Keyboard-aware layout — button stays above keyboard
- **Returning user state:** if number is already registered, sub-copy changes to "Welcome back! We'll send you a code to log in." — no other UI change
- **New user state:** after OTP verified, flow continues to Screen 1.5 (Profile Setup)

### Screen 1.4 — OTP Verification
- Header: "Enter the code"
- Sub-copy: "Sent to +234 XXX XXX XXXX" with edit icon
- 6-box OTP input (auto-advance on each digit)
- Countdown timer: "Resend code in 0:45"
- "Resend Code" link (greyed until timer expires)
- Auto-submits when 6th digit entered
- Error state: boxes turn red with shake animation + "Incorrect code. Try again."

### Screen 1.5 — Profile Setup (first-time only)
- Header: "What should we call you?"
- Full name input
- Optional: profile photo upload (circular avatar with camera icon)
- "Continue" primary button
- Skip option for photo

---

## Flow 2 — Home / Ride Request

### Screen 2.1 — Home Map (idle state)
- Full-screen map (Mapbox style, Lagos centred)
- Top bar: NaijaMove logo left, notification bell right (with badge dot)
- Floating search bar at bottom: "Where to?" with search icon
  - Left of search bar: current location dot icon
  - Right of search bar: saved places icon (star)
- Bottom sheet (collapsed, 120pt height):
  - Wallet balance row: wallet icon · "₦ 2,400" (Text Primary, SemiBold) · "Top Up" ghost link (right-aligned) — sits at top of collapsed sheet
  - Row of quick-action chips: 🏠 Home · 💼 Work · ⭐ Saved · 📦 Send Package
  - Horizontal scroll of recent destinations
  - **First-ride empty state** (shown when rider has zero trip history): replace recent destinations scroll with a single full-width card — car illustration · "Where are you headed?" heading · "Book your first NaijaMove ride" sub-copy · "Book a Ride" primary button
- Floating "My Location" button bottom-right above sheet
- Nearby driver markers on map (Primary Blue car icons)

### Screen 2.2 — Destination Search
- Full-screen search overlay (slides up from bottom)
- Back arrow top-left
- "From" field (pre-filled with current location, editable)
- "To" field (focused, blinking cursor)
- Swap icon between the two fields
- Search results list below:
  - Each result: place icon · place name (bold) · address (secondary) · distance chip
  - Section headers: "Recent" / "Saved Places" / "Suggestions"
- Saved places row: Home chip · Work chip (tappable shortcuts)
- "Add stop" link at bottom of results (maximum 3 stops; link is hidden once limit is reached, replaced by "Max stops reached" note in Text Secondary)

### Screen 2.3 — Ride Options (vehicle selection)
- Map visible top half showing pickup → destination route (Primary Blue polyline)
- Pickup pin (Primary Blue) and destination pin (Danger Red) on map
- Bottom sheet (expanded):
  - "Choose a ride" header with estimated arrival time
  - Vehicle category cards (vertical list, full width):
    - **Economy** — car icon · "4 seats" · ETA chip · ₦ 1,200–1,500 fare range
    - **Comfort** — car icon · "4 seats" · ETA chip · ₦ 2,000–2,400 fare range
    - **Premium** — car icon · "4 seats" · ETA chip · ₦ 3,500–4,200 fare range
    - **XL** — SUV icon · "6 seats" · ETA chip · ₦ 2,800–3,200 fare range
  - **Default (no surge) card state:** clean white card, Border Subtle outline, fare range in Text Primary — no badge shown
  - Selected card has Primary Blue left border + Primary Light (`#EBF2FD`) background
  - Surge badge (Accent Gold) on category if surge active: "1.4× surge" — tapping badge shows tooltip: "High demand in your area"
  - Fare floor note in small text: "Fare supports fair driver earnings"
- Payment method selector row: card icon · "Visa ••4242" · chevron
- Promo code link
- "Request Economy" primary button (updates label with selected category)

### Screen 2.4 — Confirm Ride
- Map top half, route visible
- Bottom sheet:
  - Pickup address row (Primary Blue dot · address · edit icon)
  - Destination address row (red dot · address · edit icon)
  - Divider
  - Selected vehicle: icon · category name · seats
  - Fare estimate: "₦ 1,350" (large, bold) with "Estimated" label
  - Breakdown accordion (**open by default on first booking, collapsed on repeat bookings**):
    - Base fare · Per km · Booking fee · Promo discount
  - Payment method: card icon · last 4 digits
  - Cancellation policy note: "Free cancellation for 2 min"
  - "Confirm Ride" primary button (full width, Primary Blue)
  - "Cancel" text link below button

---

## Flow 3 — Active Trip

### Screen 3.1 — Searching for Driver
- Full-screen map
- Animated pulsing ring around pickup pin
- Bottom sheet:
  - "Finding your driver…" heading with spinner
  - Vehicle category + fare estimate
  - "Cancel Search" text link
- Nearby driver markers animate toward pickup point
- **No drivers available state** (shown after 60s timeout with no match):
  - Spinner stops, heading changes to "No drivers nearby right now"
  - Sub-copy: "Try again in a few minutes or schedule a ride"
  - "Try Again" primary button
  - "Schedule a Ride" secondary outlined button → Screen 8.1
  - "Cancel" ghost button

### Screen 3.2 — Driver Matched
- Full-screen map showing driver location + route to pickup
- Bottom sheet (expanded):
  - Driver card:
    - Circular avatar (left)
    - Driver name (bold) · Star rating · Trip count
    - Vehicle: make/model · plate number (large, readable)
    - Verification badge (Success Teal tick)
  - ETA chip: "Arriving in 4 min"
  - Action row: 📞 Call · 💬 Chat (opens Screen 11.8) · 🛡 Safety
  - Trip PIN row:
    - Hidden state: "Show PIN to driver" label · •••• masked digits · "Reveal" tap target
    - Revealed state: **4821** (large monospace, Primary Dark) · auto-hides after 10s
    - "What is this?" tooltip link → inline popover: "Share this PIN with your driver to confirm it's the right trip"
  - Slide-up handle for full driver details

### Screen 3.3 — Driver Arriving
- Map: driver marker moving toward pickup, route highlighted
- Bottom sheet:
  - "Your driver is arriving" header
  - Driver card (compact: avatar · name · plate)
  - ETA countdown: "2 min away"
  - Action row: Call · Chat (opens Screen 11.8) · Safety
  - "Share Trip" button (secondary, outlined)

### Screen 3.4 — Driver Arrived
- Map: driver marker at pickup location
- Bottom sheet (prominent):
  - Primary Blue banner: "Your driver has arrived"
  - Driver card (compact)
  - Vehicle description: "Look for a white Toyota Corolla"
  - Plate number large and bold
  - PIN reminder: "Share PIN **4821** with driver"
  - Action row: Call · Chat (opens Screen 11.8) · Safety

### Screen 3.5 — Trip In Progress
- Full-screen map: route from current location to destination, driver marker moving
- Compact top bar (floating): destination address · ETA chip
- Bottom sheet (collapsed, 80pt):
  - Driver name · plate · star rating
  - Expand handle
- Expanded bottom sheet:
  - Route progress bar (pickup → stops → destination)
  - Stops list if multi-stop trip
  - "Add Stop" link
  - "Change Destination" link
  - Action row: Call · Chat (opens Screen 11.8) · Safety
- SOS button always visible as floating red button bottom-right (requires 2s press-and-hold to trigger — prevents accidental activation)

### Screen 3.6 — SOS / Emergency
- Full-screen red overlay (semi-transparent)
- Large "EMERGENCY" header
- Options list (large touch targets):
  - 🚨 Call Emergency Services (112)
  - 📍 Share My Location
  - 🔔 Alert NaijaMove Safety Team
  - 👥 Notify Trusted Contacts
- "I'm Safe — Cancel" button at bottom (white, outlined)
- Trip details (driver name, plate, current location) shown in small text

### Screen 3.7 — Trip Completed
- Map showing completed route (greyed out)
- Bottom sheet (full height):
  - Success Teal checkmark animation
  - "Trip Complete!" heading
  - Fare breakdown card:
    - Total paid: ₦ 1,350 (large, bold)
    - Payment method used
    - Itemised: base fare · per km · booking fee · promo applied
  - Trip summary: distance · duration · route
  - "Rate Your Trip" primary button → navigates to Screen 10.1 (all rating UI lives in Flow 10)
  - "Skip" ghost button below

### Screen 3.8 — Driver Cancelled
Shown when a matched driver cancels before pickup.
- Full-screen map (driver marker disappears with fade)
- Bottom sheet:
  - Danger Red icon (not SOS red — use `#FEE2E2` background with Danger Red icon to keep it informational, not alarming)
  - "Your driver cancelled" heading
  - Sub-copy: "This happens sometimes. We'll find you another driver."
  - No cancellation fee note: "You won't be charged for this cancellation"
  - "Find Another Driver" primary button (re-enters Screen 3.1 search with same trip details)
  - "Change Ride Options" secondary button → Screen 2.3
  - "Cancel Trip" ghost button

---

## Flow 4 — Payments & Wallet

### Screen 4.1 — Payment Methods
- Header: "Payment Methods"
- List of saved methods:
  - Card row: card brand icon · "Visa ending in 4242" · default badge · delete icon
  - Bank transfer row: bank icon · "GTBank" · delete icon
  - Cash row: cash icon · "Cash" · (always present, cannot delete)
- "Add Card" button (outlined, full width) → Screen 4.4
- "Add Bank Account" button (outlined, full width)
- NaijaMove Wallet section:
  - Balance: ₦ 2,400 (large)
  - "Top Up" button · "Withdraw" button (side by side)

### Screen 4.2 — Wallet Top Up
- Header: "Top Up Wallet"
- Amount selector: quick chips ₦ 500 · ₦ 1,000 · ₦ 2,000 · ₦ 5,000 · Custom
- Custom amount input field
- Payment method selector (card / bank transfer)
- "Top Up ₦ 1,000" primary button
- Paystack secure badge at bottom

### Screen 4.3 — Transaction History
- Header: "Transactions"
- Filter tabs: All · Trips · Top-ups · Refunds
- Transaction list (grouped by date):
  - Each row: icon (trip/wallet/refund) · description · date · amount (Success Teal credit / Danger Red debit)
- Empty state: wallet illustration + "No transactions yet"
- "Download Statement" link (top-right) — exports PDF of current filter period

### Screen 4.4 — Add Card
- Header: "Add a Card"
- Paystack inline card form (webview or native fields):
  - Card number field (auto-formats with spaces, detects Visa/Mastercard/Verve brand icon)
  - Expiry field (MM/YY)
  - CVV field (masked, info icon → tooltip showing card back illustration)
- "Save Card" primary button
- Paystack secure badge + "Your card details are encrypted" note
- "Cancel" ghost button

---

## Flow 5 — Trip History & Receipts

### Screen 5.1 — Trip History
- Header: "Your Trips"
- Filter tabs: All · Completed · Cancelled · Scheduled
- Trip list (grouped by month):
  - Each card: map thumbnail (static) · destination · date · fare · status badge
  - Scheduled tab: shows upcoming bookings with date/time chip and "Cancel Booking" swipe action
- Empty state: car illustration + "No trips yet. Book your first ride!"

### Screen 5.2 — Trip Receipt
- Header: "Trip Receipt"
- Map thumbnail showing route
- Trip details:
  - Date & time
  - Pickup → Destination (with stop indicators if multi-stop)
  - Driver: avatar · name · rating
  - Vehicle: make/model · plate
- Fare breakdown card (full itemisation)
- Payment method used
- Transaction reference number
- "Report an Issue" link (bottom)
- Share / Download receipt icon (top-right) — downloads as PDF receipt (not screenshot)

---

## Flow 6 — Profile & Settings

### Screen 6.1 — Profile Home
- Header: "Profile"
- Avatar (large, circular) with edit overlay
- Name · Phone number
- Rating display: ⭐ 4.9 · 42 trips
- Menu list (grouped into sections with section labels in Text Secondary, 12pt):
  - **Account**
    - 📍 Saved Places
    - 👥 Emergency Contacts
    - 💳 Payment Methods
  - **Rewards**
    - 🎁 Promotions & Referrals
    - ⭐ My Rating
  - **Safety & Support**
    - 🛡 Safety Settings
    - ❓ Help & Support → Screen 11.1
  - **App**
    - 🔔 Notifications
    - ⚙️ App Settings
    - 🚪 Log Out (Danger Red text)

### Screen 6.2 — Saved Places
- Header: "Saved Places"
- Home row: house icon · address (or "Set home address") · edit icon
- Work row: briefcase icon · address (or "Set work address") · edit icon
- Custom places list (each with star icon · name · address · delete)
- "Add New Place" button (outlined, full width)

### Screen 6.3 — Emergency Contacts
- Header: "Emergency Contacts"
- Explanation text: "These contacts can be notified during your trips"
- Contact list: avatar initial · name · phone · "Shares trips" toggle · delete icon
- "Add Contact" button (outlined, full width)
- Max 3 contacts note

### Screen 6.4 — Promotions & Referrals
- Header: "Promotions"
- Active promos section:
  - Promo card: gold background · code · discount description · expiry date
- Referral section:
  - "Invite friends, earn ₦ 500 each"
  - Referral code display (large, copyable)
  - Share button (WhatsApp · Copy Link)
- "Enter Promo Code" input + Apply button
- Past promos (collapsed accordion)

### Screen 6.5 — Help & Support
Entry point only — see full Flow 11 for all support and chat screens.
- Tapping "Help & Support" from Profile navigates to Screen 11.1.

---

## Flow 7 — Notifications

### Screen 7.1 — Notifications Centre
- Header: "Notifications"
- Filter tabs: All · Trips · Payments · Promotions
- Notification list (grouped by date):
  - Each row: icon · title (bold) · body · timestamp · unread dot
- Empty state: bell illustration + "You're all caught up"
- Mark all as read link (top-right)

---

## Flow 8 — Scheduled & Negotiated Rides

### Screen 8.1 — Schedule a Ride
- Accessed from ride options screen via "Schedule" tab
- Date picker (calendar wheel)
- Time picker (hour/minute wheel)
- Pickup and destination (pre-filled from previous screen)
- Vehicle category selector
- "Schedule Ride" primary button
- Upcoming scheduled rides are shown in a dedicated "Scheduled" tab in Screen 5.1 (Trip History), not on this screen

### Screen 8.2 — Negotiated Ride
- Accessed from ride options screen via "Negotiate" tab
- Suggested fare range displayed: "₦ 1,200 – ₦ 1,500"
- Fare floor note: "Minimum fair fare: ₦ 1,100"
- Offer input: "Your offer" numeric field
- "Send Offer" primary button
- Waiting state: "Waiting for a driver to accept…" with spinner
- Counter-offer state: driver name · counter amount · Accept / Decline buttons

---

## Flow 10 — Rating & Reviews

### Screen 10.1 — Post-Trip Rating (full screen)
Triggered immediately after trip completion, replaces the collapsed rating section in Screen 3.7.
- Progress indicator at top: Step 1 of 2
- Driver card (prominent):
  - Large circular avatar (80pt)
  - Driver name (bold, 20pt)
  - Vehicle: make/model · plate
  - Trip route summary: pickup → destination in one line
- "How was your ride with [Driver Name]?" heading
- 5-star row (large stars, 48pt each, tap to select):
  - Empty: Border Subtle outline stars
  - Filled: Accent Gold `#F5A623` stars with scale-up animation on tap
  - Selected rating label below stars: "Terrible" · "Bad" · "Okay" · "Good" · "Excellent"
- Quick feedback chips (appear after star selection, contextual per rating):
  - 5 stars: "Great driver" · "Clean car" · "On time" · "Safe driving" · "Friendly"
  - 3–4 stars: "Late arrival" · "Route issue" · "Car condition" · "Communication"
  - 1–2 stars: "Unsafe driving" · "Wrong route" · "Rude behaviour" · "Car condition" · "No show"
  - Chips are multi-select, Primary Light background when selected, Primary Blue border
- Optional written comment field:
  - Placeholder: "Tell us more (optional)"
  - Character counter: 0/200
- "Next" primary button (active only after star selection)
- "Skip" ghost button below

### Screen 10.2 — Tip Your Driver
Step 2 of 2 — shown after star rating submitted.
- Progress indicator: Step 2 of 2
- Driver card (compact: avatar · name)
- "Leave a tip for [Driver Name]?" heading
- Sub-copy: "100% goes directly to your driver"
- Tip amount grid (2×2 + custom):
  - ₦ 100 chip · ₦ 200 chip · ₦ 500 chip · ₦ 1,000 chip
  - "Custom" chip → opens numeric input field
  - Selected chip: Primary Blue fill, white text
  - Unselected: Surface White, Border Subtle border
- Payment method note: "Charged to Visa ••4242"
- "Send ₦ 200 Tip" primary button (label updates with selected amount)
- "No thanks" ghost button below
- Tip confirmation micro-animation: coin icon flies toward driver avatar

### Screen 10.3 — Rating Submitted Confirmation
- Centred layout, no bottom sheet
- Success Teal animated checkmark (Lottie draw animation)
- "Thanks for your feedback!" heading
- Sub-copy: "Your rating helps keep NaijaMove safe and reliable"
- If tip was sent: "₦ 200 tip sent to [Driver Name] ✓" in Success Teal
- "Book Another Ride" primary button
- "Go Home" ghost button
- Auto-dismisses to Home Map after 4s if no interaction

### Screen 10.4 — Pending Rating Reminder
Shown on Home Map if rider has an unrated trip from a previous session.
- Floating card above bottom sheet (dismissible):
  - Driver avatar (small, 36pt) · "Rate your trip with [Name]"
  - 5 small star outlines (tappable inline)
  - "Rate Now" link · dismiss ✕ icon
- Tapping card or "Rate Now" opens Screen 10.1 full screen
- Dismissed reminder reappears for up to 3 app sessions or 7 days (whichever comes first), then suppressed permanently

### Screen 10.5 — Driver Public Profile
Accessed by tapping driver name/avatar on Screen 3.2, 3.3, 3.4 or from trip receipt.
- Back arrow top-left
- Driver avatar (large, 96pt, circular)
- Driver name · Member since year
- Verification badges row: ✓ Identity · ✓ Licence · ✓ Vehicle
- Stats row (3 columns):
  - ⭐ 4.87 rating · 🚗 1,240 trips · 🏆 Top Driver badge (if applicable)
- "About" section: short bio (driver-written, optional, max 150 characters — truncated with "Read more" if at limit)
- Ratings breakdown card:
  - Overall score: large (4.87 / 5)
  - Star distribution bar chart:
    - 5★ ████████░░ 78%
    - 4★ ████░░░░░░ 15%
    - 3★ █░░░░░░░░░ 4%
    - 2★ ░░░░░░░░░░ 2%
    - 1★ ░░░░░░░░░░ 1%
- Top compliments section:
  - Chip list of most-given feedback tags with count: "Safe driving (312)" · "On time (287)" · "Friendly (201)"
- Recent reviews list (last 5, anonymised — "Rider" not name):
  - Each row: star count · feedback chips · written comment (if any) · date
  - "Show all reviews" link
- Vehicle card: make/model · year · colour · plate · category badge
- If trip is active: "Call" and "Chat" action buttons at bottom

### Screen 10.6 — My Rider Rating
Accessed from Profile → "My Rating".
- Header: "Your Rider Rating"
- Large rating display: ⭐ 4.9 (centred, 48pt)
- Sub-copy: "Based on [42] driver ratings"
- What affects your rating section (accordion):
  - Cancellation rate
  - Punctuality at pickup
  - Respectful behaviour
  - Payment reliability
- Star distribution bar chart (same style as Screen 10.5)
- Tips to improve section (shown if rating < 4.5):
  - Bullet list of actionable tips
- Recent feedback from drivers (anonymised):
  - Each row: star count · feedback chips · date
  - No written comments shown (driver comments are private)
- "Learn More" link → support article

### Screen 10.7 — Report a Driver
Accessed from Screen 10.1 when 1–2 stars selected, or from trip receipt via "Report an Issue".
- Header: "Report an Issue"
- Trip context card (compact): driver name · plate · date · route
- "What happened?" heading
- Issue category list (single select, large touch targets with icons):
  - 🚗 Unsafe or reckless driving
  - 🗺 Took wrong route intentionally
  - 💬 Rude or threatening behaviour
  - 💳 Payment dispute
  - 🚫 Driver did not show up
  - 📍 Trip PIN not used
  - 🛡 Safety concern or harassment
  - ❓ Other
- Description field (required for Safety concern / Other):
  - Placeholder: "Describe what happened"
  - Character counter: 0/500
- "Attach Evidence" optional section:
  - Photo upload button (up to 3 photos)
  - Thumbnail previews with remove ✕
- "Submit Report" primary button (Danger Red fill)
- "Cancel" ghost button
- Confirmation state:
  - Checkmark + "Report submitted"
  - "Our safety team will review this within 24 hours"
  - Case reference number displayed

---

## Flow 11 — Support & Chat

### Screen 11.1 — Help & Support Home
Replaces the single Screen 6.5 with a full entry point.
- Header: "Help & Support"
- Search bar: "Search help topics" — live search across FAQ and case categories
- Active case banner (shown if rider has an open case):
  - Primary Light background · case reference · status badge · "View Case" link
- Quick action grid (2×2):
  - 🚗 Trip issue · 💳 Payment problem
  - 🛡 Safety concern · 👤 Account issue
  - Each tile: icon (Primary Blue) · label · chevron
- "Get help for a recent trip" section:
  - Horizontal scroll of last 3 trip cards (map thumbnail · destination · date)
  - Tapping a trip pre-fills the case with trip context
- Contact options row:
  - 💬 "Chat with Support" (primary button, full width)
  - 📞 "Call Support" (secondary outlined button, full width)
- FAQ section:
  - Accordion list of top 6 questions
  - "View all FAQs" link

### Screen 11.2 — Select Issue Category
Shown after tapping a quick action tile or a recent trip card.
- Header: "What do you need help with?"
- Trip context card (if trip was selected): map thumbnail · destination · date · fare
- Issue category list (full width rows, large touch targets):
  - 🚗 My driver didn't show up
  - 🗺 Driver took the wrong route
  - 💳 I was charged incorrectly
  - 💰 I didn't receive my refund
  - 🛡 I felt unsafe during my trip
  - 📦 Lost item in vehicle
  - 🔐 Account or login issue
  - 💬 Other — describe your issue
- Each row: icon · label · chevron
- Back arrow top-left

### Screen 11.3 — Issue Detail Form
Shown after selecting a category.
- Header matches selected category (e.g. "Incorrect Charge")
- Trip context card (compact, if applicable)
- Dynamic form fields based on category:
  - Incorrect charge: expected amount field · actual amount field
  - Lost item: item description · where left · contact preference
  - Wrong route: description field
  - Safety: description field (required) · severity selector
- Description field (all categories):
  - Label: "Tell us what happened"
  - Placeholder: "The more detail you give, the faster we can help"
  - Character counter: 0/1000
- Attach evidence (optional):
  - "Add photos or screenshots" button
  - Thumbnail row (up to 4, with remove ✕)
- Preferred resolution selector (where applicable):
  - Refund · Credit to wallet · I just want to understand what happened · Other
- "Submit" primary button
- "Cancel" ghost button

### Screen 11.4 — Case Submitted Confirmation
- Success Teal animated checkmark
- "We've received your report" heading
- Case reference number (large, copyable, monospace): e.g. NM-2024-00847
- Expected response time: "We'll respond within 2 hours for payment issues · 15 min for safety concerns"
- "Track this case" primary button → goes to Screen 11.5
- "Go Home" ghost button

### Screen 11.5 — My Cases (Case List)
Accessed from Help & Support Home or notification.
- Header: "My Cases"
- Filter tabs: All · Open · Resolved
- Case list (grouped by status):
  - Each card:
    - Case reference (small, Text Secondary)
    - Category icon + title (bold)
    - Last message preview (1 line, truncated)
    - Status badge: Open (Primary Blue) · Pending (Accent Gold) · Resolved (Success Teal) · Closed (grey)
    - Timestamp (relative: "2 hours ago")
    - Unread dot (Primary Blue) if new agent message
- Empty state: clipboard illustration + "No support cases yet"
- "New Case" FAB button (Primary Blue, bottom-right)

### Screen 11.6 — Case Detail & Chat Thread
The core support chat screen.
- Header:
  - Back arrow
  - Case reference + category title
  - Status badge
  - "·· " overflow menu (top-right): Close Case · Escalate · View Trip
- Case summary card (collapsible, top of thread):
  - Category · submitted date · trip context (if applicable)
  - Tap to expand full issue description and attachments
- Chat thread (scrollable, newest at bottom):
  - **Rider messages** (right-aligned):
    - Primary Blue bubble, white text, 16pt radius (flat bottom-right)
    - Timestamp below bubble (Text Secondary, 11pt)
    - Delivery status: Sent ✓ · Delivered ✓✓ · Read ✓✓ (blue ticks)
  - **Agent messages** (left-aligned):
    - Surface White bubble, Text Primary, Border Subtle border, 16pt radius (flat bottom-left)
    - Agent avatar (small, 28pt) + "NaijaMove Support" label above first message in sequence
    - Timestamp below bubble
  - **System messages** (centred):
    - Text Secondary, italic, small (12pt)
    - Examples: "Case opened" · "Agent assigned" · "Status changed to Resolved"
  - **Attachment messages**:
    - Image thumbnail (full width bubble, 200pt height, rounded corners)
    - Tap to open full-screen image viewer
  - **Quick reply suggestions** (shown after agent message):
    - Horizontal scroll of suggestion chips: "Yes, that's correct" · "No, still an issue" · "Thank you"
    - Primary Light background, Primary Blue text
- Typing indicator: three animated dots in agent bubble
- Input bar (pinned to bottom, above keyboard):
  - Attachment icon (left) → opens: Camera · Photo Library · File
  - Text input field: "Type a message…" placeholder, auto-expand up to 4 lines
  - Send button (Primary Blue, active only when text entered or attachment selected)
- Case resolved banner (shown when agent marks resolved):
  - Success Teal background
  - "Your issue has been resolved. Was this helpful?"
  - 👍 Yes · 👎 No buttons
  - "Reopen Case" link

### Screen 11.7 — Case Resolved / Closed
Shown after rider confirms resolution or case auto-closes.
- Success Teal checkmark
- "Case Resolved" heading
- Case reference · resolution summary
- CSAT rating: "How satisfied are you with our support?"
  - 5-star row (same style as trip rating)
  - Quick chips: "Fast response" · "Helpful agent" · "Issue fixed" · "Clear explanation"
- "Submit Feedback" primary button
- "Reopen Case" text link (available for 7 days after resolution)

### Screen 11.8 — In-Trip Driver Chat
Accessed via the 💬 Chat button on Screens 3.2, 3.3, 3.4, 3.5.
- Header:
  - Back arrow
  - Driver avatar (small, 32pt) + driver name
  - "Active Trip" status chip (Primary Blue)
  - 📞 Call icon (top-right)
- Safety notice banner (top, dismissible):
  - "Chats are monitored for safety. Do not share personal details."
  - Primary Light background, Primary Blue text, dismiss ✕
- Chat thread:
  - Same bubble style as Screen 11.6
  - **Rider messages**: Primary Blue bubble, right-aligned
  - **Driver messages**: Surface White bubble, left-aligned, driver avatar beside first in sequence
  - System message: "Chat ends when trip is completed"
- Quick message chips (always visible above input, horizontal scroll):
  - "I'm at the pickup point" · "Running 2 min late" · "Which gate/entrance?" · "Please call me" · "I'll be right out"
  - Tapping a chip sends immediately without typing
- Input bar:
  - Text input: "Message [Driver Name]…"
  - Send button (Primary Blue)
  - No attachment option (trip chat is text-only for safety)
- Post-trip: thread becomes read-only with banner "This trip has ended. Chat is now closed."

### Screen 11.9 — FAQ Article
Accessed from search results or FAQ accordion in Screen 11.1.
- Header: "Help" with back arrow
- Article title (bold, 20pt)
- Breadcrumb: Help > Payments > Refunds
- Article body (rich text: paragraphs, numbered steps, bold highlights)
- "Was this helpful?" row at bottom:
  - 👍 Yes · 👎 No
  - If No: "Contact Support" button appears
- Related articles section (2–3 links)
- "Still need help? Chat with us" sticky button at bottom

---

## Flow 9 — WhatsApp Booking Entry Point
**Note: This is an optional alternative entry point, not a core booking flow. It sits outside the main flow sequence.**

### Screen 9.1 — WhatsApp Handoff
- Shown when user taps "Book via WhatsApp" from home
- Illustration of WhatsApp chat bubble
- Explanation: "Book rides, get status updates and receipts directly in WhatsApp"
- "Open WhatsApp" button (WhatsApp green)
- "Use the App Instead" text link

---

## Global Components

Design these as reusable components visible across multiple screens:

### Navigation
- **Bottom Navigation Bar:** Home (map icon) · Trips (clock icon) · Wallet (wallet icon) · Profile (person icon)
- Active tab: Primary Blue icon + label, Primary Light pill background behind icon
- Inactive tab: Text Secondary grey icon + label (labels always visible — consistent width prevents layout shift on tab switch)
- Nav bar background: Surface White with top border `#D1DCF0`

### Map Components
- Pickup pin: Primary Blue circle with white dot
- Destination pin: Danger Red teardrop
- Stop pin: Text Secondary grey circle with white number
- Driver marker: Primary Blue car icon with direction arrow, white drop shadow
- Route polyline: Primary Blue `#1A6FE8`, 4pt weight
- Demand heatmap overlay: Primary Blue gradient zones at 15% opacity

### Cards & Sheets
- Bottom sheet: white, 16pt top radius, drag handle (grey pill, centred top)
- Driver card: white card, 12pt radius, subtle shadow
- Fare card: white card, itemised rows with dividers, total row bold

### Buttons
- Primary: full width, 52pt height, 12pt radius, Primary Blue `#1A6FE8` fill, white text, Inter SemiBold 16pt, subtle box shadow `0 4px 12px rgba(26,111,232,0.3)`
- Secondary: full width, 52pt height, 12pt radius, Surface White fill, Primary Blue border 1.5pt + Primary Blue text
- Destructive: full width, 52pt height, 12pt radius, Danger Red fill, white text
- Ghost: full width, 52pt height, 12pt radius, transparent fill, Text Secondary text — used for Skip / Cancel links styled as buttons
- Icon button: 48×48pt, circular, Primary Light fill, Primary Blue icon

### Input Fields
- Height: 52pt, 12pt radius, Border Subtle `#D1DCF0` border 1pt, Background `#F0F4FA` fill
- Focus state: Primary Blue `#1A6FE8` border 2pt, Surface White fill
- Label above field in Text Secondary, Inter Medium 13pt
- Error state: Danger Red border + error message below in Danger Red
- Success state: Success Teal border + checkmark icon inside field right

### Status Badges
- Completed: Success Teal `#0EA5A0` background, white text
- Cancelled: `#FEE2E2` background, Danger Red text
- In Progress: Primary Blue `#1A6FE8` background, white text
- Scheduled: Primary Light `#EBF2FD` background, Primary Dark text
- Surge Active: Accent Gold `#F5A623` background, `#0A2D6E` dark text

### Toast / Snackbar
- Bottom of screen, above nav bar
- Dark background `#0A2D6E` (Primary Dark), white text, 8pt radius
- Success variant: left Success Teal `#0EA5A0` border, 4pt
- Error variant: left Danger Red `#E53935` border, 4pt
- Info variant: left Primary Blue `#1A6FE8` border, 4pt

### Loading States
- Skeleton screens for lists and cards: shimmer from `#EBF2FD` to `#D1DCF0` (blue-tinted shimmer)
- Spinner: Primary Blue `#1A6FE8`, centred
- Map loading: `#F0F4FA` placeholder with NaijaMove logo centred in Primary Dark

### Empty States
- Illustration (simple, line-art style) + heading + sub-copy + optional CTA button
- Consistent illustration style across all empty states

### Offline / Network State
- **Connection lost banner:** persistent top bar (below status bar), Primary Dark `#0A2D6E` background, white text: "No internet connection" · left warning icon · auto-dismisses when connection restores
- **Map degraded state:** when map tiles fail to load, show `#F0F4FA` background with last known driver/route positions retained from cache · "Map unavailable — reconnecting…" overlay text in Text Secondary
- **Action blocked state:** if rider taps a CTA while offline, show error toast: "You're offline. Check your connection and try again." — do not navigate away

---

## Interaction & Animation Notes

- **Bottom sheet:** spring physics drag, snap to 3 positions (collapsed / mid / full)
- **Map camera:** smooth animate to driver location on match, zoom out to show full route on trip start
- **OTP boxes:** auto-advance with subtle scale-up animation on fill
- **SOS button:** requires 2-second press-and-hold to prevent accidental trigger — show fill animation during hold
- **Driver marker:** smooth interpolated movement on GPS update (not jump)
- **Fare counter:** animate number change when surge multiplier updates
- **Rating stars:** tap fills with gold, satisfying haptic feedback implied
- **Trip complete checkmark:** Lottie-style draw animation in Success Teal `#0EA5A0`

---

## Accessibility

- All text meets WCAG AA contrast ratio (4.5:1 minimum)
- Touch targets minimum 48×48pt
- All icons have text labels or accessible descriptions
- Error states use both colour and icon (not colour alone)
- Support system font size scaling for body text

---

## Screen Connections (Prototype Flow)

Connect screens in this order for the prototype:

```
Splash → Onboarding → Phone Entry → OTP → Profile Setup → Home Map
Home Map → Destination Search → Ride Options → Confirm Ride
Confirm Ride → Searching → Driver Matched → Driver Arriving → Driver Arrived → In Progress → Completed
Completed → Post-Trip Rating → Tip Driver → Rating Confirmed → Home Map
Post-Trip Rating (1–2 stars) → Report a Driver → Home Map
Home Map → Pending Rating Reminder → Post-Trip Rating
Driver Matched → Driver Public Profile
Completed → Trip Receipt → Report a Driver
Completed → Trip History (via Trips tab)
Home Map → Wallet (via Wallet tab)
Home Map → Profile (via Profile tab)
Profile → My Rider Rating
Profile → Saved Places
Profile → Emergency Contacts
Profile → Promotions
Profile → Help & Support → Support Home (11.1)
Support Home → Issue Category (11.2) → Issue Form (11.3) → Case Submitted (11.4)
Case Submitted → Case Detail & Chat (11.6)
Support Home → My Cases (11.5) → Case Detail & Chat (11.6)
Case Detail & Chat → Case Resolved (11.7)
In Progress → Driver Chat (11.8)
Driver Matched → Driver Chat (11.8)
Support Home → FAQ Article (11.9)
Trip Receipt → Support Home (11.1)
In Progress → SOS Screen
Driver Matched → Searching (on driver cancel → Screen 3.8)
Screen 3.8 → Searching (retry) | Ride Options (change) | Home Map (cancel)
Payment Methods → Add Card (4.4) → Payment Methods
```

---

## Deliverables Expected from Stitch

1. All screens designed at 390×844pt (iPhone 14 / Pixel 7 size) — 60+ screens across 11 flows
2. Component library panel with all global components
3. Interactive prototype with all flow connections above
4. Dark mode variants for: Home Map, Active Trip screens (including Screen 11.8 In-Trip Driver Chat), Notifications
   - Dark mode background: `#0D1B2A` · Surface: `#1A2B40` · Primary Blue stays `#1A6FE8` · text inverted
   - Chat bubbles in dark mode: rider bubble stays Primary Blue `#1A6FE8` · driver/agent bubble uses Surface `#1A2B40` with Border Subtle `#2A3F5F` border
5. Annotated specs for spacing, typography and colour tokens
6. Export-ready assets at 1×, 2×, 3× for Flutter integration

---

## Context for the AI Designer

- This is a **Nigeria-first** product. Avoid generic Western ride-hailing UI clones.
- The blue theme must feel **professional and trustworthy**, not cold or corporate — use warmth through typography weight, rounded corners and friendly copy.
- Blue `#1A6FE8` is the trust signal: it communicates safety, reliability and financial credibility — important for a payments-integrated mobility app.
- Primary Dark `#0A2D6E` is used sparingly for maximum authority — splash screen, headers, key data labels.
- Primary Light `#EBF2FD` is the workhorse tint — selected states, chip backgrounds, input focus — keeps the UI airy without going flat.
- Lagos riders are used to WhatsApp-first interactions — the UI should feel familiar and approachable, not clinical.
- Many users are on mid-range Android devices with variable data. Keep the UI lightweight — no heavy gradients.
- The fare floor concept is a key differentiator — surface it subtly ("Fare supports fair driver earnings") without making it feel like a lecture.
- Surge pricing uses a gold badge, not alarming red — it is framed as "high demand" not a penalty.
- The SOS button stays Danger Red regardless of theme — it must be instantly recognisable.
- Cash is a valid payment method — do not hide or deprioritise it.
- The app name NaijaMove should feel proud and local, not like a startup trying to sound global.
