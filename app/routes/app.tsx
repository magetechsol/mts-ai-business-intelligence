import { Navigation, TopBar, AppProvider, Frame, Toast, Button } from "@shopify/polaris";
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
import { Outlet, useLocation, useLoaderData } from "react-router";
import type { LoaderFunctionArgs } from "react-router";

export async function loader({ request }: LoaderFunctionArgs) {
  const { authenticate } = await import("~/shopify.server");
  const { default: prisma } = await import("~/db.server");

  const { session } = await authenticate.admin(request);
  const shopId = session.shop;

  const settings = await prisma.appSettings.findUnique({ where: { shopId } });

  return {
    shopId,
    shopName: session.shop,
    lastSyncAt: settings?.lastSyncAt?.toISOString() || null,
  };
}

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
  const { shopName } = useLoaderData<typeof loader>();

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
        details: { name: shopName },
        open: userMenuOpen,
        onToggle: toggleUserMenu,
      }}
      secondaryMenu={
        <Button onClick={handleSync} icon={RefreshIcon}>Sync Data</Button>
      }
    />
  );

  return (
    <AppProvider i18n={i18n}>
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
