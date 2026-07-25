export default function PrivacyPolicyPage() {
  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "40px 24px", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>Privacy Policy</h1>
      <p style={{ fontSize: 13, color: "#64748b", marginBottom: 32 }}>Last updated: July 25, 2026</p>

      <div style={{ fontSize: 15, lineHeight: 1.8, color: "#1e293b" }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 32, marginBottom: 12 }}>1. Introduction</h2>
        <p style={{ marginBottom: 16 }}>
          MTS AI Business Intelligence ("we", "our", "app") is a Shopify application developed by MageTechSol.
          This Privacy Policy explains how we collect, use, and protect information when you install and use our app
          on your Shopify store.
        </p>

        <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 32, marginBottom: 12 }}>2. Data We Collect</h2>
        <p style={{ marginBottom: 12 }}>When you install MTS AI Business Intelligence, we access the following data from your Shopify store via the Shopify Admin API:</p>
        <ul style={{ marginBottom: 16, paddingLeft: 24 }}>
          <li style={{ marginBottom: 8 }}><strong>Orders:</strong> Order details including customer email, line items, pricing, and fulfillment status (last 30 days)</li>
          <li style={{ marginBottom: 8 }}><strong>Products:</strong> Product catalog including titles, vendors, types, variants, pricing, and inventory levels</li>
          <li style={{ marginBottom: 8 }}><strong>Customers:</strong> Customer profiles including names, email addresses, order counts, and total spend</li>
          <li style={{ marginBottom: 8 }}><strong>Store Information:</strong> Shop domain name and basic store settings</li>
        </ul>

        <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 32, marginBottom: 12 }}>3. How We Use Your Data</h2>
        <p style={{ marginBottom: 12 }}>We use the collected data solely for the following purposes:</p>
        <ul style={{ marginBottom: 16, paddingLeft: 24 }}>
          <li style={{ marginBottom: 8 }}>To generate analytics, reports, and business insights displayed within the app</li>
          <li style={{ marginBottom: 8 }}>To power AI-generated business recommendations (when OpenAI API key is configured)</li>
          <li style={{ marginBottom: 8 }}>To maintain and sync your store data for real-time dashboard display</li>
          <li style={{ marginBottom: 8 }}>To provide revenue forecasting and trend analysis</li>
        </ul>
        <p style={{ marginBottom: 16 }}>
          We do <strong>not</strong> sell, share, or provide your store data to any third parties except as necessary to
          provide the app's functionality (e.g., sending data to OpenAI for AI insights when you configure your own API key).
        </p>

        <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 32, marginBottom: 12 }}>4. Data Storage & Security</h2>
        <p style={{ marginBottom: 16 }}>
          Your store data is stored in a secure PostgreSQL database hosted on Neon (AWS infrastructure).
          All data is transmitted over encrypted connections (TLS/SSL).
          We use industry-standard security practices to protect your information.
        </p>

        <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 32, marginBottom: 12 }}>5. Data Retention</h2>
        <p style={{ marginBottom: 16 }}>
          We retain your store data for as long as the app is installed on your store.
          When you uninstall the app, your data is permanently deleted within 48 hours in accordance with
          Shopify's data protection requirements.
        </p>

        <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 32, marginBottom: 12 }}>6. GDPR Compliance</h2>
        <p style={{ marginBottom: 16 }}>
          We comply with the General Data Protection Regulation (GDPR). We have implemented the following Shopify
          privacy webhooks: customers/data_request, customers/redact, and shop/redact. You may request data export
          or deletion at any time through your Shopify admin.
        </p>

        <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 32, marginBottom: 12 }}>7. OpenAI Integration</h2>
        <p style={{ marginBottom: 16 }}>
          If you configure your own OpenAI API key in the app settings, your store data may be sent to OpenAI's API
          for generating business insights. In this case, your data is subject to OpenAI's privacy policy.
          We do not have access to or store your OpenAI API key on our servers beyond your store's configuration.
        </p>

        <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 32, marginBottom: 12 }}>8. Changes to This Policy</h2>
        <p style={{ marginBottom: 16 }}>
          We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated
          revision date. Continued use of the app after changes constitutes acceptance of the revised policy.
        </p>

        <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 32, marginBottom: 12 }}>9. Contact</h2>
        <p style={{ marginBottom: 16 }}>
          If you have questions about this Privacy Policy, please contact us at: <strong>support@magetechsol.com</strong>
        </p>
      </div>
    </div>
  );
}
