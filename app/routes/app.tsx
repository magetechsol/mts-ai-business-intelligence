import {
  Navigation,
  TopBar,
  Frame,
  Toast,
  Button,
  Card,
  Text,
  Banner,
  Layout,
} from "@shopify/polaris";
import {
  HomeIcon,
  OrderIcon,
  ProductIcon,
  PersonIcon,
  InventoryIcon,
  ChatIcon,
  SettingsIcon,
  RefreshIcon,
} from "@shopify/polaris-icons";
import { useState, useCallback } from "react";
import {
  Outlet,
  useLocation,
  useLoaderData,
  useRouteError,
  isRouteErrorResponse,
} from "react-router";
import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";

import { authenticate } from "~/shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const diagnostics: string[] = [];

  try {
    const { session } = await authenticate.admin(request);
    return { apiKey: process.env.SHOPIFY_API_KEY || "", shop: session.shop, authError: null };
  } catch (error) {
    if (error instanceof Response) {
      if (error.status === 200) {
        throw error;
      }
      if (error.status === 302 || error.status === 301) {
        throw error;
      }
    }

    diagnostics.push(`Error type: ${error?.constructor?.name || typeof error}`);
    diagnostics.push(`Is Response: ${error instanceof Response}`);

    if (error instanceof Response) {
      const body = await error.clone().text().catch(() => "");
      diagnostics.push(`Status: ${error.status} ${error.statusText}`);

      if (error.status === 500) {
        diagnostics.push("===> 500 from Shopify library. Testing JWT decode...");

        const idToken = url.searchParams.get("id_token");
        if (idToken) {
          try {
            const { shopifyApi, ApiVersion } = await import("@shopify/shopify-api");
            const testApi = shopifyApi({
              apiKey: process.env.SHOPIFY_API_KEY || "",
              apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
              scopes: (process.env.SCOPES || "").split(","),
              hostName: new URL(process.env.SHOPIFY_APP_URL || "http://localhost:3000").host,
              hostScheme: "https",
              isEmbeddedApp: true,
              apiVersion: ApiVersion.July26,
            });
            try {
              const decoded = await testApi.session.decodeSessionToken(idToken);
              diagnostics.push("JWT decode SUCCESS - API secret matches Shopify Partners!");
              diagnostics.push(`JWT dest (shop): ${decoded.dest}`);
              diagnostics.push(`JWT aud (client_id): ${decoded.aud}`);
              diagnostics.push(`JWT sub (user_id): ${decoded.sub}`);
              diagnostics.push(`JWT exp: ${new Date(decoded.exp * 1000).toISOString()}`);
              diagnostics.push(`JWT expired: ${decoded.exp * 1000 < Date.now()}`);
              diagnostics.push(`Current time: ${new Date().toISOString()}`);
            } catch (jwtErr: any) {
              diagnostics.push(`JWT decode FAILED: ${jwtErr.message}`);
              diagnostics.push("*** API SECRET MISMATCH ***");
              diagnostics.push("");
              diagnostics.push("TO FIX:");
              diagnostics.push("1. Go to Shopify Partners > Your App > API credentials");
              diagnostics.push("2. Click 'Reveal API secret key'");
              diagnostics.push("3. Copy the EXACT secret key");
              diagnostics.push("4. Go to Render > Environment > Edit SHOPIFY_API_SECRET");
              diagnostics.push("5. Paste the exact secret key from step 2");
              diagnostics.push("6. Save - Render will auto-redeploy");
            }
          } catch (modErr: any) {
            diagnostics.push(`Module error: ${modErr.message}`);
          }
        } else {
          diagnostics.push("No id_token in URL");
        }
      }
    } else if (error instanceof Error) {
      diagnostics.push(`Message: ${error.message}`);
      diagnostics.push(`Stack: ${error.stack?.substring(0, 500)}`);
    } else {
      diagnostics.push(`Raw value: ${String(error)}`);
    }

    return {
      apiKey: process.env.SHOPIFY_API_KEY || "",
      shop: url.searchParams.get("shop") || "",
      authError: diagnostics.join("\n"),
    };
  }
};

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};

const navItems = [
  { label: "Dashboard", href: "/app", icon: HomeIcon },
  { label: "Sales", href: "/app/sales", icon: OrderIcon },
  { label: "Products", href: "/app/products", icon: ProductIcon },
  { label: "Customers", href: "/app/customers", icon: PersonIcon },
  { label: "Inventory", href: "/app/inventory", icon: InventoryIcon },
  { label: "AI Insights", href: "/app/insights", icon: ChatIcon },
  { label: "Settings", href: "/app/settings", icon: SettingsIcon },
];

const i18n = {
  Polaris: {
    Avatar: { label: "Avatar", details: "Details" },
    ActionMenu: { Actions: "Actions" },
    Autocomplete: { loading: "Loading" },
    Badge: { info: "Info", success: "Success", warning: "Warning", critical: "Critical" },
    Button: { loading: "Loading" },
    Calendar: { previous: "Previous", next: "Next" },
    Checkbox: { error: "Error" },
    ChoiceList: { title: "Title" },
    Column: { header: "Header", filter: "Filter" },
    Combobox: { loading: "Loading" },
    DatePicker: { previous: "Previous", next: "Next" },
    DescriptionList: { term: "Term", description: "Description" },
    DropZone: { upload: "Upload", overlayText: "Drop file to upload", errorOverlayText: "File type not accepted" },
    EmptyState: { content: "Content" },
    FooterHelp: { LearnMore: "Learn more" },
    Form: { submit: "Submit" },
    FormLayout: { group: "Group" },
    IndexFilters: { search: "Search", filter: "Filter", edit: "Edit", done: "Done", cancel: "Cancel" },
    IndexTable: { navigation: "Navigation", selectable: "Selectable", bulkActions: "Bulk Actions", itemCount: "{selectedItems} items selected", onInteractWithBulkActions: "Bulk actions" },
    KeyboardKey: { key: "Key", command: "Command" },
    KeypressListener: { keyEvent: "Key event" },
    Link: { newWindow: "Opens in a new window" },
    List: { bullet: "Bullet" },
    Modal: { loading: "Loading" },
    Navigation: { section: "Section" },
    OptionList: { title: "Title", singleSelected: "Selected" },
    Pagination: { previous: "Previous", next: "Next" },
    Popover: { close: "Close" },
    ProgressBar: { complete: "Complete" },
    Radio: { error: "Error" },
    RangeSlider: { minLabel: "Min", maxLabel: "Max" },
    Select: { placeholder: "Select" },
    SettingToggle: { disabledAction: "Disabled", enabledAction: "Enabled" },
    SkeletonBodyText: { label: "Loading" },
    SkeletonDisplayText: { label: "Loading" },
    SkeletonThumbnail: { label: "Loading" },
    Spinner: { loading: "Loading" },
    Tabs: { toggleTabsLabel: "Toggle tabs" },
    Tag: { tagLabel: "Tag" },
    TextContainer: { loading: "Loading" },
    TextField: { characterCount: "{count} characters", fileUpload: "Upload file" },
    Toast: { success: "Success", error: "Error", warning: "Warning" },
    Tooltip: { accessibilityContent: "Content" },
    TopBar: { search: "Search" },
    Truncate: { tooltip: "Show content" },
    ResourceList: { loading: "Loading", sortedAscending: "Sorted ascending", sortedDescending: "Sorted descending", emptyState: "No items" },
  },
};

export default function AppLayout() {
  const location = useLocation();
  const loaderData = useLoaderData<typeof loader>();
  const { apiKey, authError } = loaderData;

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [toastActive, setToastActive] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [mobileNavActive, setMobileNavActive] = useState(false);

  const toggleUserMenu = useCallback(() => setUserMenuOpen((o) => !o), []);
  const toggleMobileNav = useCallback(() => setMobileNavActive((o) => !o), []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setToastActive(true);
  };

  const handleSync = async () => {
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        showToast(`Synced ${data.orders} orders, ${data.products} products, ${data.customers} customers`);
      } else {
        showToast("Sync failed. Please try again.");
      }
    } catch {
      showToast("Sync failed. Please try again.");
    }
  };

  const currentPath = location.pathname;

  if (authError) {
    return (
      <div style={{ padding: "20px", fontFamily: "monospace", maxWidth: "800px", margin: "0 auto" }}>
        <Banner title="Authentication Debug Info" tone="critical">
          <pre style={{
            whiteSpace: "pre-wrap",
            fontSize: "12px",
            background: "#f6f6f7",
            padding: "15px",
            borderRadius: "8px",
            lineHeight: "1.6",
            overflow: "auto",
            maxHeight: "600px",
          }}>
            {authError}
          </pre>
        </Banner>
        <div style={{ marginTop: "15px" }}>
          <Text variant="headingMd" as="h2">What to check:</Text>
          <ol style={{ fontSize: "14px", lineHeight: "1.8" }}>
            <li>Go to <strong>Shopify Partners</strong> → Your App → <strong>API credentials</strong></li>
            <li>Copy the <strong>API secret key</strong></li>
            <li>Go to <strong>Render</strong> → your service → <strong>Environment</strong></li>
            <li>Update <code>SHOPIFY_API_SECRET</code> to match the Partners dashboard value</li>
            <li>Save and redeploy</li>
          </ol>
        </div>
      </div>
    );
  }

  const navigationMarkup = (
    <Navigation location={currentPath}>
      <Navigation.Section
        items={navItems.map((item) => ({
          label: item.label,
          url: item.href,
          icon: item.icon,
          selected: item.href === "/app" ? currentPath === "/app" : currentPath.startsWith(item.href),
        }))}
      />
    </Navigation>
  );

  const topBarMarkup = (
    <TopBar
      showNavigationToggle
      onNavigationToggle={toggleMobileNav}
      userMenu={{
        actions: [{ items: [{ content: "Settings", url: "/app/settings" }] }],
        details: { name: "" },
        open: userMenuOpen,
        onToggle: toggleUserMenu,
      }}
      secondaryMenu={
        <Button onClick={handleSync} icon={RefreshIcon}>Sync Data</Button>
      }
    />
  );

  return (
    <AppProvider embedded apiKey={apiKey} i18n={i18n}>
      <Frame
        topBar={topBarMarkup}
        navigation={navigationMarkup}
        showMobileNavigation={mobileNavActive}
        onNavigationDismiss={toggleMobileNav}
        logo={{
          width: 120,
          topBarSource: "/favicon.ico",
          accessibilityLabel: "MTS AI Business Intelligence",
          url: "/app",
        }}
      >
        {toastActive && <Toast content={toastMessage} onDismiss={() => setToastActive(false)} />}
        <Outlet />
      </Frame>
    </AppProvider>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    if (error.status === 200 && typeof error.data === "string") {
      return <div dangerouslySetInnerHTML={{ __html: error.data }} />;
    }

    return (
      <div style={{ padding: 20, fontFamily: "monospace" }}>
        <h1 style={{ color: "#d72c0d" }}>Error {error.status}</h1>
        <p>{error.statusText || "Unknown"}</p>
        <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, background: "#f6f6f7", padding: 10 }}>
          {typeof error.data === "string" && error.data
            ? error.data
            : JSON.stringify(error.data || null)}
        </pre>
      </div>
    );
  }

  if (error instanceof Error) {
    return (
      <div style={{ padding: 20, fontFamily: "monospace" }}>
        <h1 style={{ color: "#d72c0d" }}>Error</h1>
        <p>{error.message}</p>
        <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, background: "#f6f6f7", padding: 10 }}>
          {error.stack}
        </pre>
      </div>
    );
  }

  return (
    <div style={{ padding: 20, fontFamily: "monospace" }}>
      <h1 style={{ color: "#d72c0d" }}>Something went wrong</h1>
      <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, background: "#f6f6f7", padding: 10 }}>
        {JSON.stringify(error)}
      </pre>
    </div>
  );
}
