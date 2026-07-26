import {
  Navigation,
  TopBar,
  Frame,
  Toast,
  AppProvider as PolarisAppProvider,
  Popover,
  ActionList,
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
import { useState, useCallback, useEffect } from "react";
import {
  Outlet,
  useLocation,
  isRouteErrorResponse,
  useRouteError,
} from "react-router";
import { AppProvider as ShopifyAppProvider } from "@shopify/shopify-app-react-router/react";

const navItems = [
  { label: "Dashboard", href: "/app", icon: HomeIcon },
  { label: "Sales", href: "/app/sales", icon: OrderIcon },
  { label: "Products", href: "/app/products", icon: ProductIcon, pro: true },
  { label: "Customers", href: "/app/customers", icon: PersonIcon, pro: true },
  { label: "Inventory", href: "/app/inventory", icon: InventoryIcon, pro: true },
  { label: "AI Insights", href: "/app/insights", icon: ChatIcon, pro: true },
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

  const [toastActive, setToastActive] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [mobileNavActive, setMobileNavActive] = useState(false);
  const [userMenuActive, setUserMenuActive] = useState(false);

  const toggleMobileNav = useCallback(() => setMobileNavActive((o) => !o), []);
  const toggleUserMenu = useCallback(() => setUserMenuActive((o) => !o), []);

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

  const navigationMarkup = (
    <Navigation location={currentPath}>
      <Navigation.Section
        items={navItems.map((item) => ({
          label: item.pro ? `${item.label}` : item.label,
          url: item.href,
          icon: item.icon,
          selected: item.href === "/app" ? currentPath === "/app" : currentPath.startsWith(item.href),
          badge: item.pro ? "PRO" : undefined,
        }))}
      />
    </Navigation>
  );

  const currentPage = navItems.find((item) =>
    item.href === "/app" ? currentPath === "/app" : currentPath.startsWith(item.href)
  );

  const userMenuActivator = (
    <button
      type="button"
      onClick={toggleUserMenu}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 12px",
        borderRadius: 8,
        border: "1px solid rgba(255,255,255,0.15)",
        background: userMenuActive ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.08)",
        color: "#fff",
        cursor: "pointer",
        transition: "background 0.15s ease",
        fontSize: 13,
        fontWeight: 500,
        lineHeight: 1,
      }}
    >
      <span
        style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #3b82f6, #7c3aed)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 10,
          fontWeight: 700,
          color: "#fff",
          letterSpacing: "0.03em",
          flexShrink: 0,
        }}
      >
        MTS
      </span>
      <span style={{ maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        MTS AI BI
      </span>
      <svg width="12" height="12" viewBox="0 0 20 20" fill="none" style={{ opacity: 0.7, flexShrink: 0 }}>
        <path fillRule="evenodd" d="M5.72 8.47a.75.75 0 0 1 1.06 0l3.47 3.47 3.47-3.47a.75.75 0 1 1 1.06 1.06l-4 4a.75.75 0 0 1-1.06 0l-4-4a.75.75 0 0 1 0-1.06Z" fill="currentColor" />
      </svg>
    </button>
  );

  const topBarMarkup = (
    <TopBar
      showNavigationToggle
      onNavigationToggle={toggleMobileNav}
      additionalMetadata={currentPage?.label || "Dashboard"}
      secondaryMenu={
        <Popover
          active={userMenuActive}
          activator={userMenuActivator}
          onClose={toggleUserMenu}
          preferredAlignment="right"
        >
          <ActionList
            items={[
              {
                content: "Upgrade to Pro",
                icon: SettingsIcon,
                onAction: () => { window.location.href = "/app/pricing"; },
              },
              {
                content: "Settings",
                icon: SettingsIcon,
                onAction: () => { window.location.href = "/app/settings"; },
              },
              {
                content: "Sync Data",
                icon: RefreshIcon,
                onAction: handleSync,
              },
              {
                content: "Reload Page",
                onAction: () => { window.location.reload(); },
              },
            ]}
          />
        </Popover>
      }
    />
  );

  return (
    <ShopifyAppProvider embedded apiKey={process.env.SHOPIFY_API_KEY || ""}>
      <PolarisAppProvider i18n={i18n}>
        <Frame
          topBar={topBarMarkup}
          navigation={navigationMarkup}
          showMobileNavigation={mobileNavActive}
          onNavigationDismiss={toggleMobileNav}
          logo={{
            width: 40,
            height: 40,
            topBarSource: "/MTS-logo.png",
            accessibilityLabel: "MTS AI Business Intelligence",
            url: "/app",
          }}
        >
          {toastActive && <Toast content={toastMessage} onDismiss={() => setToastActive(false)} />}
          <Outlet />
        </Frame>
      </PolarisAppProvider>
    </ShopifyAppProvider>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();

  let message = "Something went wrong";
  let detail = "An unexpected error occurred. Please try refreshing the page.";

  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      message = "Page Not Found";
      detail = "The page you're looking for doesn't exist.";
    } else if (error.status === 401 || error.status === 403) {
      message = "Authentication Required";
      detail = "Please open this app from your Shopify Admin.";
    } else {
      message = `Error ${error.status}`;
      detail = typeof error.data === "string" ? error.data : (error.statusText || "An error occurred while loading this page.");
    }
  }

  return (
    <div style={{ padding: 60, textAlign: "center", fontFamily: "system-ui, -apple-system, sans-serif", maxWidth: 480, margin: "0 auto" }}>
      <div style={{ width: 56, height: 56, borderRadius: 16, background: "linear-gradient(135deg, #3b82f6, #7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: 24, color: "#fff", fontWeight: 700 }}>MTS</div>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, color: "#1e293b" }}>{message}</h1>
      <p style={{ color: "#64748b", marginBottom: 24, fontSize: 14, lineHeight: 1.6 }}>{detail}</p>
      <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
        <button
          onClick={() => window.location.reload()}
          style={{ padding: "10px 24px", borderRadius: 8, background: "linear-gradient(135deg, #3b82f6, #7c3aed)", color: "#fff", border: "none", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
        >
          Retry
        </button>
        <a
          href="https://admin.shopify.com/store/mts-ai-bi-test/apps"
          target="_top"
          style={{ padding: "10px 24px", borderRadius: 8, background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0", fontSize: 14, fontWeight: 600, textDecoration: "none", display: "inline-block" }}
        >
          Open in Shopify Admin
        </a>
      </div>
    </div>
  );
}
