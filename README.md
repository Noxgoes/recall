# Recall 🧠
> **Turn what you save into knowledge you’ll actually remember.**

Recall is a mobile app (iOS & Android) that solves the "digital hoarding" graveyard. Instead of bookmarking videos, tweets, and articles that you never open again, Recall automatically extracts clean, actionable insights using **Groq AI (Llama 3.3 70B)** and cements them in your brain using **smart spaced repetition** and daily digests.

---

## 🏆 Hackathon Judges & Evaluator Access

You can test Recall immediately without creating any accounts or entering credit cards. We have prepared two test accounts tailored for your review:

| Testing Route | Credentials | What You’ll Experience |
| :--- | :--- | :--- |
| **Option 1: Pre-loaded Demo** *(Recommended — 60s Review)* | **Email**: `test@recall.app`<br>**Password**: `recall123` | • **Instant Wow Factor**: Lands directly on the dashboard.<br>• **Full Library**: Pre-populated with insights from YouTube, Twitter/X, and Instagram.<br>• **Spaced Repetition**: Review cards and daily recaps ready to test.<br>• **Active Pro**: Full membership pre-activated. |
| **Option 2: Fresh Onboarding** *(First-Time User Journey)* | **Email**: `judge@recall.app`<br>**Password**: `recall123` | • **Onboarding**: Interactive 5-step onboarding walkthrough.<br>• **Personalization**: Topic interest selection and habit goal setting.<br>• **Sandbox Paywall**: Tap *"Start 3-Day Free Trial"* for instant free access.<br>• **First Save**: Seeds the onboarding example memory into the library. |

> *Tip: You can also tap **"Continue with Google"** on the login screen to sign in with your personal Google account.*

---

## ⚡ Quick Start (Clone & Run in 2 Minutes)

The app is pre-configured with safe public client fallbacks. **You do not need to configure any `.env` file to run the project.**

```bash
# 1. Clone the repository
git clone https://github.com/Noxgoes/recall.git
cd recall

# 2. Install dependencies
npm install

# 3. Start Expo development server
npx expo start
```

Press **`a`** to open on an Android emulator/device, **`i`** for iOS simulator, or scan the QR code with **Expo Go**.

---

## ✨ Core Features

1. **🔗 Universal Link Capture**:
   - Supports **YouTube videos & Shorts**, **X/Twitter threads**, **Instagram Reels**, web articles, and personal notes.
2. **🤖 High-Speed Groq AI Extraction**:
   - Powered by `llama-3.3-70b-versatile` running on Supabase Cloud Edge Functions.
   - Extracts verb-first, high-signal principles (e.g., *"Build systems instead of goals"*, *"Environment beats motivation"*) instead of generic summaries.
3. **🔁 Spaced Repetition (Active Recall)**:
   - Uses an SM-2 algorithmic schedule (Day 1 → Day 3 → 1 Week → 1 Month → 3 Months).
   - Rate cards (*Again, Hard, Good, Easy*) to dynamically adjust memory retention scores.
4. **🏷️ Intelligent Topic Categorization**:
   - Auto-categorizes saves into controlled tags: `Productivity`, `Mindset`, `Coding`, `Business`, `Design`, `Fitness`, `Finance`, and `Philosophy`.
5. **💳 In-App Subscriptions & Paywall (RevenueCat)**:
   - Clean native paywall with 3-day free trial sandbox.
   - Dedicated subscription management with billing switches, store links, and cancellation controls.
   - Secret promo codes supported (try **`HACKATHON`** or **`VIP2026`**).

---

## 🛠️ Architecture & Tech Stack

```
[ Mobile App (Expo / React Native) ]
               │
               ▼  HTTPS (JWT Auth)
[ Supabase Backend & Edge Functions ]
       │                      │
       ├─► SupaData API       └─► Groq AI (Llama 3.3 70B)
       │   (Transcripts &          (Distills high-signal 
       │    Tweet Scrapers)         actionable insights)
       ▼
[ PostgreSQL Database (RLS Enforced) ]
       │
       └─► Spaced Repetition Engine (SM-2 review intervals)
```

- **Frontend**: React Native, Expo Router (file-based navigation), NativeWind v4 (Tailwind CSS), React Native Reanimated.
- **Backend & Auth**: Supabase (PostgreSQL, Row Level Security, Deno Edge Functions).
- **AI Engine**: Groq Cloud API (`llama-3.3-70b-versatile`).
- **Scraping / Transcripts**: SupaData API.
- **Subscriptions**: RevenueCat SDK & Webhook Integration.

---

## 📱 Screen Directory

- `app/(auth)/login.tsx` — Clean Supabase email & Google OAuth authentication.
- `app/onboarding/index.tsx` — Interactive 5-step visual onboarding walkthrough.
- `app/paywall.tsx` — Recall Pro subscription & trial activation screen.
- `app/(tabs)/index.tsx` — Home screen: Daily Digest, memory streak, and quick capture FAB.
- `app/(tabs)/review.tsx` — Interactive Spaced Repetition card swiping flow.
- `app/(tabs)/library.tsx` — Insight library with search, date grouping, and topic taxonomy pills.
- `app/(tabs)/settings.tsx` — Account settings, notification scheduler, and subscription manager.
- `app/insight/[id].tsx` — Detailed breakdown of extracted insights, source metadata, and quotes.

---

## 📄 License
Built for the Hackathon. Distributed under the MIT License.
