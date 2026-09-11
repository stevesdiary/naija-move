# NaijaMove Driver App — Google Stitch UI Design Prompt

## Project Brief

Design the complete mobile UI for the **NaijaMove Driver App**, the partner-facing app for drivers on the NaijaMove platform — a Nigeria-first ride-hailing service built for Lagos.
The app is built in Flutter. Every screen must be designed for **Android and iOS** at standard mobile dimensions (390×844pt). Export all screens as a connected prototype in Google Stitch.

---

## Brand Identity

**App name:** NaijaMove Driver
**Tagline:** Drive. Earn. Thrive.

### Colour Palette
| Token | Hex | Usage |
|---|---|---|
| Primary Blue | `#1A6FE8` | CTAs, active states, brand moments |
| Primary Dark | `#0A2D6E` | Headers, splash background, heavy text |
| Primary Light | `#EBF2FD` | Selected card backgrounds, chip fills, input focus tint |
| Accent Gold | `#F5A623` | Earnings highlights, bonus badges, incentive tags |
| Surface White | `#FFFFFF` | Card backgrounds, input fields, bottom sheets |
| Background | `#F0F4FA` | Screen backgrounds — cool off-white with blue undertone |
| Text Primary | `#0D1B2A` | Body copy, headings |
| Text Secondary | `#64748B` | Captions, placeholders, labels |
| Danger Red | `#E53935` | Errors, cancellation, SOS |
| Success Teal | `#0EA5A0` | Confirmed states, completed trips, verified badges, online indicator |
| Earnings Green | `#16A34A` | Positive earnings amounts, payout confirmed |
| Map Overlay | `#1A6FE8` at 15% opacity | Demand heatmap zones |
| Border Subtle | `#D1DCF0` | Input borders, dividers, card outlines |

### Typography
Use **Google Fonts** exclusively throughout the app.
- **Display / Headings:** DM Sans Bold, 24–32pt
- **Body:** DM Sans Regular, 14–16pt
- **Labels / Captions:** DM Sans Medium, 11–13pt
- **Earnings / Numbers:** DM Mono SemiBold, tabular figures — used for all fare, balance and earnings displays
- **Sub-headings / Section titles:** DM Sans SemiBold, 17–20pt

### Apple Design Principles Applied
- **Clarity:** Every element serves a purpose. Remove chrome that does not help the driver make a decision.
- **Deference:** The map and the trip request are the content — UI recedes to let them lead.
- **Depth:** Use layered bottom sheets, subtle shadows and spring-physics transitions to communicate hierarchy without heavy colour fills.
- **Continuity:** Transitions between states (offline → online → trip request → active trip) feel like one continuous experience, not separate screens snapping into place.
- **Feedback:** Every driver action — going online, accepting a trip, completing a trip — gets an immediate, satisfying response: haptic-implied animation, colour shift, or confirmation state.
- **Reachability:** All primary actions sit in the bottom 60% of the screen. Drivers operate one-handed while stationary.
- **Legibility at a glance:** Earnings, ETA, and trip status must be readable in 1 second. Use large type, high contrast, and generous spacing.

### Design Principles
- Driver-first: the app must feel like a tool that respects the driver's time and intelligence
- Earnings are the hero — surface them prominently at every opportunity
- Minimal distraction while driving — active trip screens show only what is essential
- Low-bandwidth friendly: no heavy gradients or large image assets
- High contrast: readable in bright Lagos sunlight
- Touch targets minimum 48×48pt
- Bottom-heavy layout — primary actions always reachable with one thumb
- Online/Offline toggle must be impossible to miss and impossible to trigger accidentally

---

## Screen Inventory

Design every screen listed below. Group them into flows.

---

## Flow 1 — Onboarding & Authentication

### Screen 1.1 — Splash Screen
- NaijaMove Driver logo centred on Primary Dark (`#0A2D6E`) background
- Tagline: "Drive. Earn. Thrive."
- Subtle animated pulse on the logo mark
- Auto-advances after 2s

### Screen 1.2 — Onboarding Carousel (3 slides)
**Only shown on first install. Returning drivers skip directly to Screen 1.3.**
- **Slide 1:** Illustration of a driver in a clean car, Lagos bridge in background — headline "Earn on your schedule"
- **Slide 2:** Illustration of a phone showing earnings dashboard — headline "Know exactly what you earn"
- **Slide 3:** Illustration of a shield and a star — headline "Drive safely. Get rewarded."
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
- **Returning driver state:** sub-copy changes to "Welcome back! We'll send you a code to log in."
- **New driver state:** after OTP verified, flow continues to Screen 1.5 (Profile Setup)

### Screen 1.4 — OTP Verification
- Header: "Enter the code"
- Sub-copy: "Sent to +234 XXX XXX XXXX" with edit icon
- 6-box OTP input (auto-advance on each digit)
- Countdown timer: "Resend code in 0:45"
- "Resend Code" link (greyed until timer expires)
- Auto-submits when 6th digit entered
- Error state: boxes turn Danger Red with shake animation + "Incorrect code. Try again."

### Screen 1.5 — Driver Profile Setup (first-time only)
- Header: "Let's set up your profile"
- Sub-copy: "This is what riders will see"
- Full name input
- Profile photo upload (circular avatar, 96pt, with camera icon overlay) — required, not skippable
- "Continue" primary button (disabled until photo uploaded)
- Progress indicator: Step 1 of 3

### Screen 1.6 — Vehicle Details Entry
- Header: "Tell us about your vehicle"
- Progress indicator: Step 2 of 3
- Vehicle make input (e.g. Toyota)
- Vehicle model input (e.g. Corolla)
- Year selector (wheel picker)
- Colour input
- Plate number input (uppercase, alphanumeric)
- Vehicle category selector (single select chips): Economy · Comfort · Premium · XL
- "Continue" primary button

### Screen 1.7 — Document Upload
- Header: "Upload your documents"
- Progress indicator: Step 3 of 3
- Sub-copy: "We'll verify these within 24 hours"
- Document upload rows (each with upload icon · label · status chip):
  - Driver's Licence — upload button · status: Pending / Uploaded / Verified
  - Vehicle Licence — upload button · status
  - Proof of Insurance — upload button · status
  - Vehicle Inspection Certificate — upload button · status
  - Profile Photo (pre-filled from Screen 1.5)
- Each upload row: tap opens camera / photo library picker
- Uploaded state: thumbnail preview · "Change" link · green checkmark
- "Submit for Review" primary button (active only when all documents uploaded)
- "Save and Continue Later" ghost button

### Screen 1.8 — Application Under Review
- Centred layout
- Illustration: document with a clock
- "Application submitted!" heading
- Sub-copy: "We're reviewing your documents. This usually takes up to 24 hours. We'll notify you by SMS when you're approved."
- "Got it" primary button → exits to a locked home screen (Screen 2.1 offline/pending state)
- "Check Status" ghost button → Screen 6.5 (Document Status)


---

## Flow 2 — Home / Driver Dashboard (Online & Offline)

### Screen 2.1 — Home Dashboard (Offline state)
The default state when the driver is not accepting trips.
- Full-screen map (Mapbox style, Lagos centred on driver location)
- Top bar:
  - NaijaMove Driver logo left
  - Notification bell right (with unread badge dot)
- **Online/Offline toggle (hero element):**
  - Large pill toggle, centred, floating above bottom sheet
  - Offline state: dark grey fill · "You're Offline" label · "Go Online" CTA
  - Minimum 64pt height, impossible to miss
  - Requires single deliberate tap (no hold required — going online is intentional)
- Bottom sheet (collapsed, 140pt):
  - Today's earnings row: "Today" label · ₦ 0.00 in DM Mono SemiBold, 28pt, Earnings Green · "View Details" link
  - Trips today: "0 trips" in Text Secondary
  - Demand heatmap toggle: "Show demand zones" chip (toggles map overlay)
- Floating "My Location" button bottom-right above sheet
- Demand heatmap zones visible on map (Primary Blue at 15% opacity) when toggle is on
- **Pending approval state** (shown if documents not yet verified):
  - Online/Offline toggle is disabled (greyed out)
  - Banner below toggle: Primary Light background · "Your account is under review. We'll notify you when approved." · "Check Status" link → Screen 6.5

### Screen 2.2 — Home Dashboard (Online state)
Driver is online and available to receive trip requests.
- Full-screen map, driver location centred
- Top bar: logo left · notification bell right
- **Online toggle (active state):**
  - Pill toggle: Success Teal fill · "You're Online" label · pulsing green dot
  - "Go Offline" tap target (same pill, tap to toggle off)
- Floating status chip (top-centre, below top bar): "Waiting for a ride request…" with subtle shimmer animation
- Bottom sheet (collapsed, 140pt):
  - Today's earnings row: live-updating earnings in DM Mono SemiBold, 28pt, Earnings Green
  - Trips today count
  - Active bonus banner (if applicable): Accent Gold background · "Complete 5 more trips for ₦ 2,000 bonus" · progress bar
- Demand heatmap visible on map
- Floating "My Location" button bottom-right

### Screen 2.3 — Incoming Trip Request
Slides up from bottom as a modal sheet over the online home screen. Driver has 15 seconds to accept.
- **Countdown timer ring** (top of sheet, prominent):
  - Circular progress ring, 64pt diameter, Primary Blue stroke depleting clockwise
  - Seconds remaining in centre: "12" (DM Mono Bold, 28pt)
  - Ring turns Danger Red in final 5 seconds
- Trip summary card:
  - Pickup location: Primary Blue dot · street name · distance from driver: "1.2 km away"
  - Destination: Danger Red dot · area name (not full address — privacy until accepted)
  - Estimated trip distance: "8.4 km"
  - Estimated duration: "22 min"
  - Fare: ₦ 1,850 (DM Mono SemiBold, 32pt, Earnings Green) — prominent, above the fold
  - Surge badge (Accent Gold) if applicable: "1.4× surge"
  - Vehicle category chip: Economy / Comfort / Premium / XL
- Rider info row (minimal — no full name for privacy):
  - Rider rating: ⭐ 4.8
  - Trip count: "42 trips"
- Action row (full width, side by side):
  - "Decline" button (Surface White, Danger Red border, Danger Red text) — left, 48% width
  - "Accept" button (Primary Blue fill, white text) — right, 48% width, subtle pulse animation
- Auto-declines and sheet dismisses when timer reaches 0

### Screen 2.4 — Trip Accepted Confirmation
Brief confirmation state shown for 1.5s before transitioning to Screen 3.1.
- Full-screen map animates to show route from driver to pickup
- Bottom sheet:
  - Success Teal checkmark (small, 32pt)
  - "Trip accepted!" heading
  - "Navigating to pickup…" sub-copy
  - Rider name now revealed: "Pickup: [First name only]"
  - Pickup address (full)
  - ETA chip: "4 min to pickup"


---

## Flow 3 — Active Trip

### Screen 3.1 — Navigating to Pickup
- Full-screen map: turn-by-turn route from driver to pickup pin (Primary Blue polyline)
- Driver marker (Primary Blue car icon with direction arrow)
- Pickup pin (Primary Blue circle with white dot)
- **Minimal top bar (floating, semi-transparent):**
  - Rider first name · star rating chip
  - ETA to pickup: "4 min" (large, DM Mono SemiBold)
- **Bottom sheet (collapsed, 100pt — driving mode, minimal):**
  - Pickup address (single line, truncated)
  - Expand handle
- **Expanded bottom sheet:**
  - Rider card:
    - Circular avatar (48pt)
    - Rider first name (bold) · star rating · trip count
  - Pickup address (full)
  - Action row: 📞 Call Rider · 💬 Message Rider · 🗺 Open in Maps
  - "Cancel Trip" text link (Danger Red) — with confirmation dialog before cancelling
- **Navigation bar (pinned bottom, above sheet):**
  - Turn instruction: arrow icon · "Turn right onto Ozumba Mbadiwe" (DM Sans Medium, 16pt)
  - Distance to next turn: "200 m" (DM Mono SemiBold, 14pt)

### Screen 3.2 — Arrived at Pickup
Shown when driver reaches the pickup location.
- Full-screen map: driver marker at pickup pin
- **Prominent arrival banner (bottom sheet, expanded automatically):**
  - Primary Blue banner strip at top of sheet: "You've arrived at pickup"
  - Rider card (compact: avatar · first name · rating)
  - Pickup address
  - **Trip PIN verification row:**
    - "Ask rider for their PIN" label
    - 4-digit PIN input (large boxes, numeric keyboard)
    - "Confirm PIN" button (Primary Blue, active after 4 digits entered)
    - "What is this?" tooltip link → inline popover: "The rider's PIN confirms you have the right passenger"
    - Error state: boxes turn Danger Red + "Incorrect PIN. Ask the rider to check their app."
  - Action row: 📞 Call Rider · 💬 Message Rider
  - "Rider is a no-show" text link (shown after 5 min wait) → Screen 3.7

### Screen 3.3 — Trip In Progress
Active driving state — maximum map, minimum UI.
- Full-screen map: route from current location to destination (Primary Blue polyline)
- Driver marker moving along route
- Destination pin (Danger Red teardrop)
- **Floating top bar (minimal, semi-transparent dark pill):**
  - Destination area name (truncated) · ETA chip: "18 min"
- **Floating bottom bar (100pt, collapsed):**
  - Fare: ₦ 1,850 (DM Mono SemiBold, 22pt, Earnings Green)
  - Expand handle
- **Expanded bottom sheet:**
  - Rider card (compact)
  - Route progress bar: Pickup → Stops → Destination
  - Stops list if multi-stop trip (each stop with address + "Arrived" button)
  - Action row: 📞 Call · 💬 Message · 🚨 SOS
  - "End Trip Early" text link (Danger Red) — requires confirmation dialog
- **Navigation bar (pinned bottom, above sheet):**
  - Turn instruction + distance (same style as Screen 3.1)
- **SOS button:** floating red button bottom-right, requires 2s press-and-hold to prevent accidental trigger — fill animation during hold

### Screen 3.4 — Trip Completed
Shown when driver taps "End Trip" at destination.
- Full-screen map: completed route greyed out
- Bottom sheet (full height, slides up):
  - Success Teal checkmark animation (Lottie draw)
  - "Trip Complete!" heading
  - Fare earned: ₦ 1,850 (DM Mono Bold, 36pt, Earnings Green) — the hero number
  - Fare breakdown card:
    - Base fare · Per km · Booking fee · Platform commission deducted · **Net to driver** (bold, Earnings Green)
  - Trip summary: distance · duration · route
  - Rider rating prompt (inline, compact — not a full screen):
    - "How was [Rider first name]?" label
    - 5 small stars (tap to rate)
    - Optional: single-tap feedback chips: "Polite" · "Ready on time" · "Respectful" · "Difficult pickup"
    - "Submit" link (active after star tap)
    - "Skip" ghost link
  - "Go Online Again" primary button (Success Teal fill — signals positive action)
  - "Take a Break" ghost button → sets driver offline

### Screen 3.5 — Multi-Stop Trip (Stop Arrival)
Shown when driver arrives at an intermediate stop.
- Full-screen map: driver at stop pin (Text Secondary grey circle with stop number)
- Bottom sheet:
  - "Stop [N] of [Total]" header
  - Stop address
  - "Mark as Arrived" primary button → triggers next leg navigation
  - Rider card (compact)
  - Action row: Call · Message

### Screen 3.6 — SOS / Emergency
Triggered by 2s hold on SOS button.
- Full-screen Danger Red overlay (semi-transparent)
- Large "EMERGENCY" header (white, DM Sans Bold, 32pt)
- Options list (large touch targets, 64pt height each):
  - 🚨 Call Emergency Services (112)
  - 📍 Share My Location with NaijaMove Safety Team
  - 🔔 Alert NaijaMove Safety Team
  - 👥 Notify Emergency Contact
- "I'm Safe — Cancel" button at bottom (white fill, Danger Red border)
- Trip details shown in small text: rider name · current location · trip ID

### Screen 3.7 — Rider No-Show
Shown when driver marks rider as no-show after waiting.
- Map: driver marker at pickup location
- Bottom sheet:
  - "Waiting for rider…" heading
  - Timer: "You've been waiting [X] min" (DM Mono, counts up)
  - Rider card (compact) · Call button prominent
  - "Mark as No-Show" primary button (Danger Red fill) — active after 5 min wait
  - Confirmation dialog on tap:
    - "Are you sure? Marking a no-show will cancel this trip."
    - "Yes, Cancel Trip" (Danger Red) · "Keep Waiting" (Primary Blue)
  - No-show confirmed state:
    - "Trip cancelled — no-show fee applied" in Success Teal note
    - Cancellation fee earned: ₦ 200 (DM Mono, Earnings Green)
    - "Go Online Again" primary button


---

## Flow 4 — Earnings & Payouts

### Screen 4.1 — Earnings Dashboard
Accessed via the Earnings tab in the bottom navigation bar.
- Header: "Earnings"
- **Hero earnings card (Primary Dark background, white text):**
  - "This week" label (Text Secondary, 13pt)
  - Weekly total: ₦ 28,400 (DM Mono Bold, 40pt, white)
  - Sub-row: Trips this week: 34 · Avg per trip: ₦ 835
  - "View Breakdown" link (Primary Light text)
- Period selector tabs: Today · This Week · This Month · Custom
- **Earnings summary card (Surface White):**
  - Gross earnings row: amount
  - Platform commission row: − amount (Danger Red)
  - Bonuses row: + amount (Earnings Green)
  - **Net earnings row: amount (DM Mono SemiBold, 20pt, Earnings Green, bold divider above)**
- **Trips list (grouped by day):**
  - Each row: clock icon · pickup area → destination area · fare (DM Mono, Earnings Green) · trip duration · chevron → Screen 4.3
- Empty state: illustration of a car + "No trips yet today. Go online to start earning."
- **Active bonus card (Accent Gold background, Primary Dark text):**
  - Bonus name: "Peak Hours Bonus"
  - Progress: "3 of 5 trips completed" · progress bar
  - Reward: "+ ₦ 2,000 on completion"
  - Expiry: "Ends at 10:00 PM"

### Screen 4.2 — Payout & Wallet
- Header: "Wallet & Payouts"
- **Balance card (Primary Dark background):**
  - NaijaMove Wallet balance: ₦ 12,600 (DM Mono Bold, 36pt, white)
  - "Withdraw" primary button (Accent Gold fill, Primary Dark text) — prominent
  - "Transaction History" ghost link
- **Bank account section:**
  - Linked bank: bank logo · "GTBank ••• 4821" · "Change" link
  - No bank linked state: "Link a bank account to withdraw earnings" + "Add Bank Account" outlined button
- **Payout history list:**
  - Each row: bank icon · "Payout to GTBank" · date · amount (DM Mono, Earnings Green) · status badge
  - Status badges: Completed (Success Teal) · Processing (Accent Gold) · Failed (Danger Red)
- "Withdraw Earnings" primary button (full width, bottom) → Screen 4.4

### Screen 4.3 — Trip Earnings Detail
Accessed by tapping a trip row in Screen 4.1.
- Header: "Trip Details"
- Map thumbnail showing route
- Trip info: date · time · duration · distance
- Rider: avatar · first name · rating given
- **Fare breakdown card:**
  - Base fare
  - Per km charge
  - Booking fee
  - Surge multiplier (if applied): "1.4× surge applied"
  - Gross fare total
  - Platform commission: − ₦ 370 (Danger Red)
  - Bonus applied (if any): + ₦ 400 (Earnings Green)
  - Tip received (if any): + ₦ 200 (Earnings Green)
  - **Net earned: ₦ 1,480 (DM Mono Bold, 22pt, Earnings Green)**
- "Report an Issue with this Trip" link (bottom)

### Screen 4.4 — Withdraw Earnings
- Header: "Withdraw"
- Available balance: ₦ 12,600 (DM Mono Bold, 28pt, Earnings Green)
- Amount input:
  - "Enter amount" label
  - Large numeric input (DM Mono, 32pt)
  - Quick amount chips: ₦ 2,000 · ₦ 5,000 · ₦ 10,000 · "All" (withdraws full balance)
  - Minimum withdrawal note: "Minimum withdrawal: ₦ 500"
- Destination: bank logo · "GTBank ••• 4821" · "Change" link
- Processing time note: "Arrives within 10 minutes"
- "Withdraw ₦ 5,000" primary button (label updates with entered amount)
- "Cancel" ghost button
- Confirmation state (shown after tap):
  - "Confirm withdrawal of ₦ 5,000 to GTBank ••• 4821?"
  - "Confirm" (Primary Blue) · "Cancel" (ghost)

### Screen 4.5 — Bonuses & Incentives
- Header: "Bonuses"
- **Active bonuses section:**
  - Each bonus card (Accent Gold left border):
    - Bonus name · description
    - Progress bar: "3 of 5 trips" or "₦ 18,400 of ₦ 25,000"
    - Reward amount (DM Mono, Earnings Green)
    - Expiry chip: "Ends tonight at 10 PM"
- **Upcoming bonuses section:**
  - Cards with lock icon — "Starts tomorrow"
- **Completed bonuses section (collapsed accordion):**
  - Each row: bonus name · reward earned · date paid
- Empty state (no active bonuses): illustration + "No active bonuses right now. Check back during peak hours."


---

## Flow 5 — Trip History

### Screen 5.1 — Trip History
Accessed via the Trips tab in the bottom navigation bar.
- Header: "Your Trips"
- Filter tabs: All · Completed · Cancelled · Disputed
- Trip list (grouped by date):
  - Each card:
    - Map thumbnail (static, route shown)
    - Pickup area → Destination area
    - Date · time · duration · distance
    - Net earned: ₦ amount (DM Mono SemiBold, Earnings Green)
    - Status badge: Completed (Success Teal) · Cancelled (Danger Red bg) · Disputed (Accent Gold)
    - Chevron → Screen 4.3 (Trip Earnings Detail)
- Empty state: car illustration + "No trips yet. Go online to start."
- "Download Statement" link (top-right) — exports PDF of current filter period

### Screen 5.2 — Cancelled Trip Detail
Accessed by tapping a cancelled trip in Screen 5.1.
- Header: "Cancelled Trip"
- Map thumbnail (partial route or pickup only)
- Trip info: date · time · pickup address
- Cancellation details:
  - Cancelled by: Driver / Rider / System
  - Reason (if provided)
  - Cancellation fee earned (if applicable): ₦ 200 (Earnings Green) or "No fee applied"
- "Report an Issue" link

---

## Flow 6 — Profile & Settings

### Screen 6.1 — Driver Profile Home
Accessed via the Profile tab in the bottom navigation bar.
- Header: "Profile"
- Profile card (top):
  - Avatar (large, 80pt, circular) with edit overlay
  - Driver name (DM Sans Bold, 20pt)
  - Phone number (Text Secondary)
  - Rating display: ⭐ 4.87 · 1,240 trips
  - Verification badges row: ✓ Identity · ✓ Licence · ✓ Vehicle (Success Teal chips)
  - "View Public Profile" link → Screen 6.6
- Menu list (grouped into sections with section labels in Text Secondary, 12pt):
  - **Vehicle**
    - 🚗 My Vehicle → Screen 6.2
    - 📄 My Documents → Screen 6.5
  - **Earnings**
    - 🏦 Bank Account → Screen 4.2
    - 🎁 Bonuses & Incentives → Screen 4.5
  - **Safety & Support**
    - 🛡 Safety Settings → Screen 6.4
    - 👥 Emergency Contact → Screen 6.3
    - ❓ Help & Support → Screen 9.1
  - **App**
    - 🔔 Notifications → Screen 7.1
    - ⚙️ App Settings → Screen 6.7
    - 🚪 Log Out (Danger Red text)

### Screen 6.2 — My Vehicle
- Header: "My Vehicle"
- Vehicle photo (full width, 180pt height, rounded corners) with "Change Photo" overlay
- Vehicle details card:
  - Make · Model · Year · Colour
  - Plate number (large, DM Mono SemiBold, Primary Dark)
  - Category badge: Economy / Comfort / Premium / XL
  - "Edit Details" link
- Inspection & Insurance status section:
  - Vehicle Inspection row: status chip (Valid / Expiring Soon / Expired) · expiry date · "Update" link
  - Insurance row: status chip · expiry date · "Update" link
  - Expiring Soon state: Accent Gold chip + "Expires in 14 days" warning
  - Expired state: Danger Red chip + "Your vehicle is suspended until renewed" banner

### Screen 6.3 — Emergency Contact
- Header: "Emergency Contact"
- Explanation: "This person will be notified if you trigger an SOS alert"
- Contact card (if set): avatar initial · name · phone · "Edit" link · "Remove" link
- Empty state: "No emergency contact set" + "Add Contact" outlined button
- Add/Edit form:
  - Full name input
  - Phone number input
  - Relationship selector: Spouse · Parent · Sibling · Friend · Other
  - "Save Contact" primary button
- Note: maximum 1 emergency contact for drivers

### Screen 6.4 — Safety Settings
- Header: "Safety"
- Trip recording section:
  - "Audio trip recording" toggle (off by default)
  - Sub-copy: "Recordings are encrypted and only accessed if a safety incident is reported"
- Share location section:
  - "Share live location with emergency contact during trips" toggle
- Fatigue alerts section:
  - "Driving hours reminder" toggle
  - Sub-selector (shown when on): remind me after 4h · 6h · 8h of continuous driving
- SOS settings:
  - "SOS also calls 112 automatically" toggle
  - "SOS notifies emergency contact" toggle

### Screen 6.5 — Document Status
- Header: "My Documents"
- Sub-copy: "Keep your documents up to date to stay active on the platform"
- Document list (each row):
  - Document icon · name · status chip · expiry date (if applicable) · "Update" / "Upload" link
  - Status chips: Verified (Success Teal) · Pending Review (Accent Gold) · Rejected (Danger Red) · Expiring Soon (Accent Gold) · Expired (Danger Red)
- Rejected document state: Danger Red left border on row · rejection reason in Text Secondary below name · "Re-upload" primary link
- "All documents verified" state: Success Teal banner at top: "✓ Your account is fully verified"

### Screen 6.6 — Driver Public Profile Preview
What riders see when they tap the driver name/avatar.
- Header: "Your Public Profile" with "Preview" chip
- Back arrow top-left
- Avatar (large, 96pt) · name · "Member since [year]"
- Verification badges row
- Stats row: ⭐ rating · 🚗 trips · 🏆 Top Driver badge (if earned)
- "About" section: short bio input (max 150 characters) · "Edit" link
- Ratings breakdown card (same bar chart style as rider app)
- Top compliments chips with counts
- Vehicle card: make · model · year · colour · plate · category badge
- "This is what riders see" note at bottom (Text Secondary, italic)

### Screen 6.7 — App Settings
- Header: "Settings"
- Navigation section:
  - Preferred navigation app selector: NaijaMove built-in · Google Maps · Waze · Apple Maps
- Notifications section:
  - Trip requests toggle
  - Earnings updates toggle
  - Bonus alerts toggle
  - Safety alerts toggle (cannot be disabled)
- Language section:
  - Language selector: English · Yoruba · Igbo · Hausa (Pidgin coming soon note)
- Display section:
  - Dark mode selector: System default · Always light · Always dark
- "Delete Account" link (Danger Red, bottom) — with multi-step confirmation

---

## Flow 7 — Notifications

### Screen 7.1 — Notifications Centre
- Header: "Notifications"
- Filter tabs: All · Trips · Earnings · Safety · Account
- Notification list (grouped by date):
  - Each row: icon · title (bold) · body · timestamp · unread dot (Primary Blue)
  - Trip notification: car icon · "Trip completed — ₦ 1,850 earned"
  - Earnings notification: wallet icon · "₦ 5,000 payout sent to GTBank"
  - Bonus notification: star icon (Accent Gold) · "You unlocked the Peak Hours Bonus!"
  - Safety notification: shield icon (Danger Red) · "Document expiring in 7 days"
  - Account notification: person icon · "Your licence has been verified"
- Empty state: bell illustration + "You are all caught up"
- Mark all as read link (top-right)

---

## Flow 8 — Performance & Ratings

### Screen 8.1 — My Performance
Accessed from the Earnings tab or Profile.
- Header: "My Performance"
- Period selector: This Week · This Month · All Time
- Overall rating card (Primary Dark background):
  - ⭐ 4.87 (DM Mono Bold, 48pt, white) — centred
  - "Based on 1,240 ratings" (Text Secondary, white)
  - Top Driver badge (Accent Gold) if applicable
- Stats grid (2×2):
  - Acceptance rate: 94% · Completion rate: 98%
  - Cancellation rate: 2% · On-time arrival: 91%
  - Each stat: label (Text Secondary) · value (DM Sans Bold, 22pt) · trend arrow (up/down)
- Star distribution bar chart:
  - 5★ ████████░░ 81%
  - 4★ ████░░░░░░ 12%
  - 3★ █░░░░░░░░░ 4%
  - 2★ ░░░░░░░░░░ 2%
  - 1★ ░░░░░░░░░░ 1%
- Top compliments section:
  - Chip list with counts: "Safe driving (412)" · "On time (389)" · "Friendly (301)" · "Clean car (278)"
- Tips to improve section (shown if rating < 4.5 or acceptance rate < 80%):
  - Accordion with actionable tips per metric
- Recent feedback from riders (anonymised):
  - Each row: star count · feedback chips · written comment (if any) · date
  - No rider names shown

### Screen 8.2 — Top Driver Programme
- Header: "Top Driver"
- Current tier card:
  - Tier badge (Bronze / Silver / Gold / Platinum) with icon
  - Tier name (DM Sans Bold, 24pt)
  - "Member since [month year]"
- Tier benefits list:
  - ✓ Priority trip matching
  - ✓ Reduced platform commission (Gold+)
  - ✓ Dedicated support line (Platinum)
  - ✓ Monthly bonus multiplier
- Progress to next tier:
  - Progress bar
  - "X more trips and maintain 4.8+ rating to reach [next tier]"
- Tier requirements card (accordion):
  - Each tier: min trips · min rating · max cancellation rate
- "How is my tier calculated?" link → FAQ article

---

## Flow 9 — Support & Help

### Screen 9.1 — Help & Support Home
- Header: "Help & Support"
- Search bar: "Search help topics" — live search across FAQ and case categories
- Active case banner (shown if driver has an open case):
  - Primary Light background · case reference · status badge · "View Case" link
- Quick action grid (2×2):
  - 💳 Payment issue · 🚗 Trip problem
  - 📄 Document help · 👤 Account issue
  - Each tile: icon (Primary Blue) · label · chevron
- "Get help for a recent trip" section:
  - Horizontal scroll of last 3 trip cards (map thumbnail · destination · date · fare)
  - Tapping a trip pre-fills the case with trip context
- Contact options:
  - 💬 "Chat with Support" primary button (full width)
  - 📞 "Call Support" secondary outlined button (full width)
- FAQ section:
  - Accordion list of top 6 driver-specific questions
  - "View all FAQs" link

### Screen 9.2 — Select Issue Category
- Header: "What do you need help with?"
- Trip context card (if trip was selected): map thumbnail · destination · date · fare earned
- Issue category list (full width rows, large touch targets):
  - 💳 I have a payment or earnings issue
  - 🚗 There was a problem with a trip
  - 📄 My document was rejected or expired
  - 🛡 I had a safety concern
  - 🏆 I have a question about my rating
  - 🎁 I have a question about a bonus
  - 🔐 Account or login issue
  - 💬 Other — describe your issue
- Each row: icon · label · chevron
- Back arrow top-left

### Screen 9.3 — Issue Detail Form
- Header matches selected category
- Trip context card (compact, if applicable)
- Dynamic form fields based on category:
  - Payment issue: expected amount · actual amount · trip reference
  - Document rejected: document type selector · re-upload button
  - Rating dispute: trip reference · description
  - Safety: description (required) · severity selector
- Description field (all categories):
  - Label: "Tell us what happened"
  - Placeholder: "The more detail you give, the faster we can help"
  - Character counter: 0/1000
- Attach evidence (optional): "Add photos or screenshots" · thumbnail row (up to 4)
- Preferred resolution selector: Refund · Correction · Explanation · I just want to report this · Other
- "Submit" primary button · "Cancel" ghost button

### Screen 9.4 — Case Submitted Confirmation
- Success Teal animated checkmark
- "We have received your report" heading
- Case reference number (large, copyable, DM Mono): e.g. NMD-2024-00391
- Expected response time by category:
  - Safety: "15 minutes"
  - Payment: "2 hours"
  - Document: "24 hours"
- "Track this case" primary button → Screen 9.5
- "Go Home" ghost button

### Screen 9.5 — My Cases List
- Header: "My Cases"
- Filter tabs: All · Open · Resolved
- Case list:
  - Each card: case reference · category icon + title · last message preview · status badge · timestamp · unread dot
  - Status badges: Open (Primary Blue) · Pending (Accent Gold) · Resolved (Success Teal) · Closed (grey)
- Empty state: clipboard illustration + "No support cases yet"
- "New Case" FAB (Primary Blue, bottom-right)

### Screen 9.6 — Case Detail & Chat Thread
- Header: back arrow · case reference + title · status badge · overflow menu (Close · Escalate · View Trip)
- Case summary card (collapsible): category · submitted date · trip context
- Chat thread (same bubble architecture as rider app):
  - Driver messages: right-aligned, Primary Blue bubble, white text
  - Agent messages: left-aligned, Surface White bubble, Border Subtle border, "NaijaMove Support" label
  - System messages: centred, Text Secondary, italic, 12pt
  - Quick reply chips after agent message
  - Typing indicator: three animated dots
- Input bar: attachment icon · text field · send button
- Case resolved banner: Success Teal · "Was this helpful?" · Yes / No · "Reopen Case" link

### Screen 9.7 — FAQ Article
- Header: "Help" with back arrow
- Article title (DM Sans Bold, 20pt)
- Breadcrumb: Help > Earnings > Payouts
- Article body (rich text: paragraphs, numbered steps, bold highlights)
- "Was this helpful?" row: 👍 Yes · 👎 No
  - If No: "Contact Support" button appears
- Related articles (2–3 links)
- "Still need help? Chat with us" sticky button at bottom

---

## Flow 10 — Offline / Network State

### Screen 10.1 — No Internet Connection
- Full-screen map fades to grey placeholder (`#F0F4FA` background)
- NaijaMove Driver logo centred in Primary Dark
- Persistent top banner: Primary Dark background · white text · "No internet connection" · warning icon · auto-dismisses when connection restores
- If driver was online when connection dropped:
  - Bottom sheet: "You went offline due to a lost connection" · "Go Online Again" primary button (shown once reconnected)
- If driver was mid-trip when connection dropped:
  - Bottom sheet: "Connection lost — your trip is still active" · last known route cached · "Reconnecting..." spinner
  - Trip data preserved locally; syncs when connection restores

---

## Global Components

Design these as reusable components visible across multiple screens.

### Navigation
- **Bottom Navigation Bar:** Home (map icon) · Trips (clock icon) · Earnings (wallet icon) · Profile (person icon)
- Active tab: Primary Blue icon + label (DM Sans Medium, 11pt), Primary Light pill background behind icon
- Inactive tab: Text Secondary grey icon + label — labels always visible on all tabs to prevent layout shift
- Nav bar background: Surface White with top border `#D1DCF0`
- **Online status indicator:** small Success Teal dot on the Home tab icon when driver is online; grey dot when offline

### Map Components
- Driver location marker: Primary Blue car icon with direction arrow, white drop shadow
- Pickup pin: Primary Blue circle with white dot
- Destination pin: Danger Red teardrop
- Stop pin: Text Secondary grey circle with white number
- Route polyline (to pickup): Primary Blue `#1A6FE8`, 4pt weight, dashed
- Route polyline (active trip): Primary Blue `#1A6FE8`, 4pt weight, solid
- Demand heatmap overlay: Primary Blue gradient zones at 15% opacity
- Surge zone overlay: Accent Gold `#F5A623` at 20% opacity with "High demand" label chip

### Cards & Sheets
- Bottom sheet: Surface White, 16pt top radius, drag handle (grey pill, centred top)
- Trip request sheet: slides up with spring physics, 3 snap positions (collapsed / mid / full)
- Driver card: Surface White, 12pt radius, subtle shadow `0 2px 8px rgba(0,0,0,0.08)`
- Earnings card: Primary Dark background, white text, 16pt radius
- Fare card: Surface White, itemised rows with dividers, net earnings row bold Earnings Green

### Buttons
- Primary: full width, 52pt height, 12pt radius, Primary Blue `#1A6FE8` fill, white text, DM Sans SemiBold 16pt, box shadow `0 4px 12px rgba(26,111,232,0.3)`
- Secondary: full width, 52pt height, 12pt radius, Surface White fill, Primary Blue border 1.5pt + Primary Blue text
- Destructive: full width, 52pt height, 12pt radius, Danger Red fill, white text
- Ghost: full width, 52pt height, 12pt radius, transparent fill, Text Secondary text
- Accept trip: full width, 52pt height, 12pt radius, Primary Blue fill, white text, subtle pulse animation while timer counts down
- Go Online: large pill, 64pt height, 20pt radius, Success Teal fill, white text, DM Sans Bold 18pt
- Go Offline: large pill, 64pt height, 20pt radius, `#374151` fill, white text, DM Sans Bold 18pt
- Icon button: 48×48pt, circular, Primary Light fill, Primary Blue icon

### Input Fields
- Height: 52pt, 12pt radius, Border Subtle `#D1DCF0` border 1pt, Background `#F0F4FA` fill
- Focus state: Primary Blue `#1A6FE8` border 2pt, Surface White fill
- Label above field in Text Secondary, DM Sans Medium 13pt
- Error state: Danger Red border + error message below in Danger Red 12pt
- Success state: Success Teal border + checkmark icon inside field right

### Status Badges
- Completed: Success Teal `#0EA5A0` background, white text, DM Sans Medium 12pt
- Cancelled: `#FEE2E2` background, Danger Red text
- In Progress: Primary Blue `#1A6FE8` background, white text
- Disputed: Accent Gold `#F5A623` background, Primary Dark text
- Verified: Success Teal background, white text
- Pending Review: Accent Gold background, Primary Dark text
- Rejected: Danger Red background, white text
- Expiring Soon: `#FEF3C7` background, `#92400E` text

### Earnings Display
- All earnings amounts use DM Mono SemiBold, tabular figures
- Positive amounts (earnings, bonuses, tips): Earnings Green `#16A34A`
- Deductions (commission, fees): Danger Red `#E53935`
- Net totals: DM Mono Bold, 2pt larger than line items, Earnings Green
- Zero state: Text Secondary, not Earnings Green — "₦ 0.00" in grey signals no activity

### Toast / Snackbar
- Bottom of screen, above nav bar
- Dark background `#0A2D6E` (Primary Dark), white text, 8pt radius
- Success variant: left Success Teal `#0EA5A0` border, 4pt — e.g. "Trip completed · ₦ 1,850 earned"
- Error variant: left Danger Red `#E53935` border, 4pt
- Info variant: left Primary Blue `#1A6FE8` border, 4pt
- Earnings variant: left Earnings Green `#16A34A` border, 4pt — e.g. "Bonus unlocked · ₦ 2,000 added"

### Loading States
- Skeleton screens for lists and cards: shimmer from `#EBF2FD` to `#D1DCF0`
- Spinner: Primary Blue `#1A6FE8`, centred
- Map loading: `#F0F4FA` placeholder with NaijaMove Driver logo centred in Primary Dark
- Earnings loading: skeleton rows with DM Mono-width placeholders to prevent layout shift on load

### Empty States
- Illustration (simple, line-art style, consistent across all screens) + heading + sub-copy + optional CTA
- Tone: encouraging, not clinical — e.g. "No trips yet today. Go online to start earning." not "No data found."

---

## Interaction & Animation Notes

- **Online/Offline toggle:** single tap, immediate colour transition (grey → Success Teal), map heatmap fades in/out over 300ms
- **Incoming trip request sheet:** slides up with spring physics (stiffness 300, damping 28), countdown ring depletes smoothly
- **Countdown ring:** SVG stroke-dashoffset animation, turns Danger Red at 5s remaining with subtle shake on the number
- **Accept button pulse:** scale 1.0 → 1.03 → 1.0 loop at 1.2s interval while request is active
- **Trip accepted transition:** sheet dismisses with spring, map camera animates to show full route to pickup
- **Driver marker:** smooth interpolated movement on GPS update — never jumps
- **Earnings number update:** count-up animation when new fare is added to today's total
- **Bonus progress bar:** fills with spring animation when a trip contributes to a bonus
- **Trip complete checkmark:** Lottie-style draw animation in Success Teal
- **SOS button:** 2s press-and-hold with circular fill animation — releases cancel if lifted before 2s
- **Bottom sheet:** spring physics drag, snaps to 3 positions (collapsed / mid / full)
- **Map camera:** zooms to fit full route on trip accept; follows driver marker during active trip at fixed zoom

---

## Accessibility

- All text meets WCAG AA contrast ratio (4.5:1 minimum); earnings amounts on Primary Dark background meet AAA
- Touch targets minimum 48×48pt; Online/Offline toggle minimum 64pt height
- All icons have text labels or accessible semantic descriptions
- Error states use both colour and icon — never colour alone
- DM Mono used for all numbers ensures consistent character width for screen readers and digit-by-digit reading
- Support system font size scaling for body text (DM Sans scales gracefully)
- SOS button accessible via both tap-hold and a dedicated accessibility shortcut
- Colour-blind safe: earnings positive/negative distinguished by both colour and +/− prefix, never colour alone

---

## Screen Connections (Prototype Flow)

Connect screens in this order for the prototype:

```
Splash → Onboarding → Phone Entry → OTP → Profile Setup → Vehicle Details → Document Upload → Under Review
Under Review → Home Dashboard (offline/pending)
Document approved (notification) → Home Dashboard (offline/active)
Home Dashboard (offline) → Go Online → Home Dashboard (online)
Home Dashboard (online) → Incoming Trip Request → Trip Accepted → Navigating to Pickup
Navigating to Pickup → Arrived at Pickup → PIN Verified → Trip In Progress → Trip Completed
Trip In Progress → Multi-Stop Arrival → Trip In Progress (next leg)
Trip In Progress → SOS Screen
Arrived at Pickup → Rider No-Show → Home Dashboard (online)
Trip Completed → Home Dashboard (online)
Home Dashboard → Earnings Dashboard (via Earnings tab)
Earnings Dashboard → Trip Earnings Detail
Earnings Dashboard → Payout & Wallet → Withdraw Earnings
Earnings Dashboard → Bonuses & Incentives
Home Dashboard → Trip History (via Trips tab)
Trip History → Trip Earnings Detail
Trip History → Cancelled Trip Detail
Home Dashboard → Driver Profile (via Profile tab)
Profile → My Vehicle
Profile → Document Status
Profile → Emergency Contact
Profile → Safety Settings
Profile → Driver Public Profile Preview
Profile → App Settings
Profile → Bonuses & Incentives
Profile → Help & Support → Support Home (9.1)
Support Home → Issue Category (9.2) → Issue Form (9.3) → Case Submitted (9.4)
Case Submitted → Case Detail & Chat (9.6)
Support Home → My Cases (9.5) → Case Detail & Chat (9.6)
Support Home → FAQ Article (9.7)
Home Dashboard → Notifications (via bell icon)
Performance → Top Driver Programme
```

---

## Deliverables Expected from Stitch

1. All screens designed at 390×844pt (iPhone 14 / Pixel 7 size) — 55+ screens across 10 flows
2. Component library panel with all global components
3. Interactive prototype with all flow connections above
4. Dark mode variants for: Home Dashboard (online + offline), Active Trip screens (3.1–3.4), Earnings Dashboard
   - Dark mode background: `#0D1B2A` · Surface: `#1A2B40` · Primary Blue stays `#1A6FE8` · text inverted
   - Earnings Green stays `#16A34A` in dark mode — sufficient contrast on `#1A2B40`
   - Online toggle in dark mode: Success Teal fill unchanged — must remain instantly recognisable
5. Annotated specs for spacing, typography and colour tokens
6. Export-ready assets at 1×, 2×, 3× for Flutter integration

---

## Context for the AI Designer

- This is a **driver-first** product. The driver is a professional partner, not a passive user — the UI must respect their intelligence and time.
- **Earnings are the primary motivation.** Surface them at every natural moment: after each trip, on the home dashboard, in notifications. Use DM Mono for all numbers — it signals precision and professionalism.
- **DM Sans + DM Mono** (Google Fonts) are the exclusive type family. DM Sans is warm and approachable without being playful. DM Mono grounds financial data in credibility.
- **Apple design principles** shape every interaction: clarity (no unnecessary chrome), deference (map and earnings lead, UI recedes), depth (layered sheets, spring physics), continuity (state transitions feel seamless), feedback (every action gets an immediate response).
- The **Online/Offline toggle** is the most important UI element in the app. It must be unmissable, satisfying to interact with, and impossible to trigger accidentally. Going online should feel like starting a shift — purposeful and positive.
- The **incoming trip request** is a high-stakes, time-pressured moment. The countdown ring, fare amount, and Accept button must be the only things the driver sees. Remove all other chrome during this state.
- **Active trip screens must be driving-safe.** Minimal UI, large type, high contrast. The driver should never need to look at the phone for more than 1 second while driving.
- Lagos drivers are experienced, pragmatic, and data-aware. They track their earnings closely. Do not hide commission deductions — show them clearly alongside net earnings. Transparency builds trust.
- **Surge pricing is framed as opportunity**, not exploitation — "High demand in your area" with Accent Gold, never alarming red.
- The **Top Driver programme** is a key retention mechanic — make tier badges feel earned and prestigious, not gamified or cheap.
- Many drivers use mid-range Android devices. Keep the UI lightweight — no heavy gradients, no large image assets.
- **Cash is a valid payment method** for riders — drivers need to see payment method on the trip request so they can make informed decisions.
- The app name NaijaMove Driver should feel like a professional tool — proud, local, and built for the realities of Lagos roads.
