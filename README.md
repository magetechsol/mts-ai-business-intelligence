# MTS AI Business Intelligence

A Shopify embedded app that provides intelligent business analytics, AI-powered insights, and actionable recommendations for Shopify merchants.

## Features

- **Dashboard** — KPIs (revenue, orders, AOV, customers, repeat rate), revenue trend charts, top products, recent orders
- **Sales Analytics** — Revenue over time, orders by day of week, payment status distribution
- **Product Performance** — Product catalog analytics, category/vendor breakdowns, click-to-view variant details
- **Customer Analytics** — Acquisition trends, customer segments, spend distribution, click-to-view order history
- **Inventory Health** — Stock status overview, low-stock alerts, inventory value by product
- **AI Insights** — Natural-language Q&A about your business data, revenue forecasting (OpenAI GPT-4 optional, rule-based fallback included)
- **Settings** — Data sync controls, OpenAI API key configuration

## Tech Stack

- React Router v7 (SSR)
- Shopify Polaris UI
- Recharts (charts)
- Prisma + PostgreSQL
- OpenAI GPT-4 (optional)
- TypeScript

## Prerequisites

- Node.js 18+
- A Shopify Partner account and development store
- A Shopify custom app with the required API scopes

## Setup

### 1. Create a Shopify Custom App

In your Shopify Partner dashboard:

1. Go to **Apps** > **Create app** > **Custom app**
2. Set the app name to "MTS AI Business Intelligence"
3. Under **Configuration** > **Admin API integration**, add these scopes:
   - `read_orders`
   - `read_products`
   - `read_customers`
   - `read_inventory`
   - `read_analytics`
   - `read_content`
4. Under **App URL**, set it to your deployment URL (e.g., `https://your-app.herokuapp.com`)
5. Under **Allowed redirection URL(s)**, add:
   - `https://your-app.herokuapp.com/auth/callback`
   - `https://your-app.herokuapp.com/auth/shopify/callback`
   - `https://your-app.herokuapp.com/api/auth/callback`
6. Save and note your **API key** and **API secret**

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` with your values:

| Variable | Description |
|----------|-------------|
| `SHOPIFY_API_KEY` | Your Shopify app API key |
| `SHOPIFY_API_SECRET` | Your Shopify app API secret |
| `SCOPES` | Comma-separated Shopify API scopes |
| `SHOPIFY_APP_URL` | Your app's public URL (include `https://`) |
| `OPENAI_API_KEY` | OpenAI API key (optional, for AI insights) |
| `DATABASE_URL` | SQLite database path (default: `file:./dev.db`) |
| `HOST` | Dev server host (default: `localhost`) |
| `PORT` | Dev server port (default: `3000`) |

### 4. Initialize the Database

```bash
npx prisma db push
npx prisma generate
```

### 5. Update `shopify.app.toml`

Replace all `REPLACE_WITH_*` placeholders with your actual values:
- `client_id` — Your Shopify app API key
- `application_url` — Your app's public URL
- `redirect_urls` — Your app's callback URLs
- `app_proxy.url` — Your app's proxy URL

### 6. Start the Dev Server

```bash
npm run dev
```

The app will be available at `http://localhost:3000`.

### 7. Install on Your Development Store

1. In your Shopify Partner dashboard, go to your app
2. Under **Test your app**, click **Install app** on your development store
3. Authorize the app in the Shopify admin

## Usage

1. **Sync Data** — Go to Settings and click "Sync Now" to pull orders, products, and customers from the last 30 days
2. **View Dashboard** — See your KPIs, revenue trends, and top products
3. **Explore Analytics** — Navigate to Sales, Products, Customers, or Inventory for detailed breakdowns
4. **Ask AI** — Go to AI Insights and ask questions like "Which products are my best sellers?" or "What should I do to increase repeat purchases?"
5. **Click to Drill Down** — Click any product row or customer row to see detailed breakdowns

## AI Insights

The app works with or without an OpenAI API key:

- **With OpenAI key**: Full AI-powered natural language responses using GPT-4
- **Without OpenAI key**: Rule-based analytics with pre-built insights and recommendations

To enable AI insights, add your OpenAI API key in Settings or set the `OPENAI_API_KEY` environment variable.

## Testing Instructions (for App Store Review)

### Test Credentials

Provide the Shopify development store credentials that grant full access to the app's feature set. Keep these credentials up to date.

> Fill in the actual credentials below before submitting for review:

| Store | URL |
|-------|-----|
| Development store | `https://REPLACE_WITH_YOUR_STORE.myshopify.com` |
| Store owner email | `REPLACE_WITH_REVIEWER_EMAIL` |
| Store owner password | `REPLACE_WITH_REVIEWER_PASSWORD` |

> Note: For security, rotate these credentials immediately after review completes.

### How to test

1. **Install the app**
   - Go to `https://admin.shopify.com/store/REPLACE_WITH_YOUR_STORE/apps`
   - Click **MTS AI Business Intelligence** and **Install**
   - Approve the requested permissions (`read_orders`, `read_products`, `read_customers`, `read_inventory`, `read_analytics`, `read_content`)

2. **Sync store data** (core review requirement 2.1.4)
   - Open **Settings → Data Sync** and click **Sync Now**
   - Wait for the confirmation: "Synced N orders, N products, N customers"
   - Verify a green **Sync Complete** message appears and "Last Sync" updates

3. **Verify data accuracy**
   - Open **Dashboard** — KPIs, revenue trend, and recent orders should match your store's data
   - Open **Sales**, **Products**, **Customers**, and **Inventory** — data should be consistent with the Shopify admin
   - If any dataset fails, a yellow **Partial Sync** panel lists the exact records that failed

4. **AI Insights (Pro)**
   - Go to the **Pricing** page and subscribe to the **Pro** plan ($29/mo)
   - Open **AI Insights**, type a question (e.g. "Which products generated the most revenue this month?"), and confirm a response is returned

## Project Structure

```
app/
├── routes/
│   ├── app.tsx              # App shell (navigation, top bar)
│   ├── app._index.tsx       # Dashboard
│   ├── app.sales.tsx        # Sales analytics
│   ├── app.products.tsx     # Product performance
│   ├── app.customers.tsx    # Customer analytics
│   ├── app.inventory.tsx    # Inventory health
│   ├── app.insights.tsx     # AI insights/chat
│   ├── app.settings.tsx     # Settings
│   ├── api.sync.tsx         # Sync API endpoint
│   ├── api.ai.tsx           # AI API endpoint
│   └── webhooks.tsx         # Shopify webhooks
├── lib/
│   ├── shopify-api.server.ts  # Shopify GraphQL API queries
│   ├── sync.server.ts         # Data sync engine
│   ├── analytics.server.ts    # Analytics calculations
│   ├── ai.server.ts           # OpenAI integration
│   └── forecast.server.ts     # Revenue forecasting
├── types/
│   └── analytics.ts          # TypeScript interfaces
├── shopify.server.ts         # Shopify auth config
└── db.server.ts              # Prisma client
prisma/
└── schema.prisma             # Database schema
```

## Database

The app uses PostgreSQL via Prisma (Neon Postgres in production). The schema includes:

- **Session** — Shopify session storage
- **SyncedOrder** — Synced order data with line items
- **SyncedOrderItem** — Individual line items per order
- **SyncedProduct** — Synced product catalog
- **SyncedProductVariant** — Product variants with inventory
- **SyncedCustomer** — Synced customer data
- **AnalyticsSnapshot** — Cached analytics data
- **AiInsight** — AI conversation history
- **AppSettings** — Per-store settings

## License

Private — MTS AI Business Intelligence
