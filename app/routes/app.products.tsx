import { Box, Layout, Text, Card, Grid, Badge, TextField, BlockStack, Modal } from "@shopify/polaris";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useState, useMemo } from "react";
import { useLoaderData } from "react-router";
import type { LoaderFunctionArgs } from "react-router";

export async function loader({ request }: LoaderFunctionArgs) {
  const { authenticate } = await import("~/shopify.server");
  const { default: prisma } = await import("~/db.server");

  const { session } = await authenticate.admin(request);
  const shopId = session.shop;

  const products = await prisma.syncedProduct.findMany({
    where: { shopId },
    include: { variants: true },
    orderBy: { title: "asc" },
  });

  const productTypeData = await prisma.syncedProduct.groupBy({
    by: ["productType"],
    where: { shopId, status: "ACTIVE" },
    _count: { id: true },
  });

  const vendorData = await prisma.syncedProduct.groupBy({
    by: ["vendor"],
    where: { shopId, status: "ACTIVE" },
    _count: { id: true },
  });

  const totalInventory = products.reduce(
    (sum, p) => sum + p.variants.reduce((vSum, v) => vSum + v.inventory, 0), 0
  );
  const lowStockProducts = products.filter((p) => p.variants.some((v) => v.inventory > 0 && v.inventory <= 5)).length;
  const outOfStock = products.filter((p) => p.variants.every((v) => v.inventory <= 0)).length;

  return {
    products: products.map((p) => ({
      id: p.id, title: p.title, vendor: p.vendor, productType: p.productType,
      status: p.status, totalVariants: p.totalVariants, imageCount: p.imageCount,
      createdAt: p.createdAt.toISOString(),
      totalInventory: p.variants.reduce((sum, v) => sum + v.inventory, 0),
      totalValue: p.variants.reduce((sum, v) => sum + v.price * v.inventory, 0),
      variants: p.variants.map((v) => ({
        id: v.id, title: v.title, sku: v.sku, price: v.price, inventory: v.inventory,
      })),
    })),
    typeData: productTypeData.map((d) => ({ name: d.productType || "Uncategorized", value: d._count.id })),
    vendorData: vendorData.slice(0, 10).map((d) => ({ name: d.vendor || "Unknown", value: d._count.id })),
    summary: { total: products.length, active: products.filter((p) => p.status === "ACTIVE").length, totalInventory, lowStockProducts, outOfStock },
  };
}

export default function ProductsPage() {
  const { products, typeData, vendorData, summary } = useLoaderData<typeof loader>();
  const [searchValue, setSearchValue] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<typeof products[0] | null>(null);

  const filteredProducts = useMemo(() => {
    if (!searchValue) return products;
    const q = searchValue.toLowerCase();
    return products.filter((p) => p.title.toLowerCase().includes(q) || p.vendor?.toLowerCase().includes(q) || p.productType?.toLowerCase().includes(q));
  }, [products, searchValue]);

  return (
    <Box padding="400">
      <Layout>
        <Layout.Section>
          <BlockStack spacing="400">
            <div>
              <Text variant="headingXl" as="h1">Product Performance</Text>
              <Text variant="bodyMd" as="p" color="subdued">Analyze your product catalog and inventory levels</Text>
            </div>

            <Grid>
              {[
                { label: "Total Products", value: summary.total, tone: undefined },
                { label: "Active Products", value: summary.active, tone: undefined },
                { label: "Total Inventory", value: summary.totalInventory.toLocaleString(), tone: undefined },
                { label: "Low Stock Items", value: summary.lowStockProducts, tone: summary.lowStockProducts > 0 ? "warning" : "success" },
                { label: "Out of Stock", value: summary.outOfStock, tone: summary.outOfStock > 0 ? "critical" : "success" },
              ].map((stat) => (
                <Grid.Cell key={stat.label} columnSpan={{ xs: 6, sm: 4, md: 4 }}>
                  <Card><Box padding="400"><BlockStack spacing="200">
                    <Text variant="bodyMd" as="p" color="subdued">{stat.label}</Text>
                    <Text variant="heading2xl" as="h2">
                      {stat.tone ? <Badge tone={stat.tone}>{stat.value}</Badge> : stat.value}
                    </Text>
                  </BlockStack></Box></Card>
                </Grid.Cell>
              ))}
            </Grid>

            <Grid>
              <Grid.Cell columnSpan={{ xs: 12, md: 6 }}>
                <Card>
                  <Box padding="400">
                    <BlockStack spacing="300">
                      <Text variant="headingLg" as="h2">Products by Category</Text>
                      <div style={{ width: "100%", height: 250 }}>
                        {typeData.length > 0 ? (
                          <ResponsiveContainer>
                            <BarChart data={typeData.slice(0, 8)} layout="vertical">
                              <CartesianGrid strokeDasharray="3 3" stroke="#E1E3E5" />
                              <XAxis type="number" tick={{ fontSize: 12 }} />
                              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                              <Tooltip />
                              <Bar dataKey="value" fill="#503ceb" radius={[0, 4, 4, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        ) : <div style={{ textAlign: "center", color: "#6D7175", padding: "20px" }}>No product categories found</div>}
                      </div>
                    </BlockStack>
                  </Box>
                </Card>
              </Grid.Cell>

              <Grid.Cell columnSpan={{ xs: 12, md: 6 }}>
                <Card>
                  <Box padding="400">
                    <BlockStack spacing="300">
                      <Text variant="headingLg" as="h2">Products by Vendor</Text>
                      <div style={{ width: "100%", height: 250 }}>
                        {vendorData.length > 0 ? (
                          <ResponsiveContainer>
                            <BarChart data={vendorData}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#E1E3E5" />
                              <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" height={60} />
                              <YAxis tick={{ fontSize: 12 }} />
                              <Tooltip />
                              <Bar dataKey="value" fill="#4bb550" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        ) : <div style={{ textAlign: "center", color: "#6D7175", padding: "20px" }}>No vendor data found</div>}
                      </div>
                    </BlockStack>
                  </Box>
                </Card>
              </Grid.Cell>
            </Grid>

            <Card>
              <Box padding="400">
                <BlockStack spacing="300">
                  <BlockStack distribution="spaceBetween" alignment="center">
                    <Text variant="headingLg" as="h2">All Products</Text>
                    <TextField value={searchValue} onChange={setSearchValue} placeholder="Search products..." clearButton onClearClick={() => setSearchValue("")} />
                  </BlockStack>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid #E1E3E5" }}>
                          {["Product", "Type", "Vendor", "Status", "Inventory", "Value"].map((h) => (
                            <th key={h} style={{ padding: "8px", textAlign: h === "Inventory" || h === "Value" ? "right" : "left", fontSize: "13px", fontWeight: 600 }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredProducts.length === 0 ? (
                          <tr><td colSpan={6} style={{ padding: "20px", textAlign: "center", color: "#6D7175" }}>No products found. Sync your store data from Settings.</td></tr>
                        ) : filteredProducts.map((p) => (
                          <tr key={p.id} onClick={() => setSelectedProduct(p)} style={{ borderBottom: "1px solid #F4F6F8", cursor: "pointer" }}>
                            <td style={{ padding: "8px", fontSize: "13px", fontWeight: 500 }}>{p.title}</td>
                            <td style={{ padding: "8px", fontSize: "13px" }}>{p.productType || "-"}</td>
                            <td style={{ padding: "8px", fontSize: "13px" }}>{p.vendor || "-"}</td>
                            <td style={{ padding: "8px", textAlign: "center" }}><Badge tone={p.status === "ACTIVE" ? "success" : "info"}>{p.status}</Badge></td>
                            <td style={{ padding: "8px", textAlign: "right", fontSize: "13px" }}>{p.totalInventory}</td>
                            <td style={{ padding: "8px", textAlign: "right", fontSize: "13px" }}>${p.totalValue.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </BlockStack>
              </Box>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>

      {selectedProduct && (
        <Modal
          open
          onClose={() => setSelectedProduct(null)}
          title={selectedProduct.title}
          secondaryActions={[{ content: "Close", onAction: () => setSelectedProduct(null) }]}
        >
          <Modal.Section>
            <BlockStack spacing="400">
              <Grid>
                <Grid.Cell columnSpan={{ xs: 6 }}>
                  <Text variant="bodyMd" as="p" color="subdued">Type</Text>
                  <Text variant="bodyLg" as="p">{selectedProduct.productType || "Uncategorized"}</Text>
                </Grid.Cell>
                <Grid.Cell columnSpan={{ xs: 6 }}>
                  <Text variant="bodyMd" as="p" color="subdued">Vendor</Text>
                  <Text variant="bodyLg" as="p">{selectedProduct.vendor || "Unknown"}</Text>
                </Grid.Cell>
                <Grid.Cell columnSpan={{ xs: 6 }}>
                  <Text variant="bodyMd" as="p" color="subdued">Status</Text>
                  <Badge tone={selectedProduct.status === "ACTIVE" ? "success" : "info"}>{selectedProduct.status}</Badge>
                </Grid.Cell>
                <Grid.Cell columnSpan={{ xs: 6 }}>
                  <Text variant="bodyMd" as="p" color="subdued">Created</Text>
                  <Text variant="bodyLg" as="p">{new Date(selectedProduct.createdAt).toLocaleDateString()}</Text>
                </Grid.Cell>
                <Grid.Cell columnSpan={{ xs: 6 }}>
                  <Text variant="bodyMd" as="p" color="subdued">Total Inventory</Text>
                  <Text variant="headingLg" as="h3">{selectedProduct.totalInventory}</Text>
                </Grid.Cell>
                <Grid.Cell columnSpan={{ xs: 6 }}>
                  <Text variant="bodyMd" as="p" color="subdued">Total Value</Text>
                  <Text variant="headingLg" as="h3">${selectedProduct.totalValue.toFixed(2)}</Text>
                </Grid.Cell>
              </Grid>

              <BlockStack spacing="200">
                <Text variant="headingLg" as="h2">Variants ({selectedProduct.variants.length})</Text>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid #E1E3E5" }}>
                        {["Variant", "SKU", "Price", "Inventory"].map((h) => (
                          <th key={h} style={{ padding: "8px", textAlign: h === "Price" || h === "Inventory" ? "right" : "left", fontSize: "13px", fontWeight: 600 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {selectedProduct.variants.map((v) => (
                        <tr key={v.id} style={{ borderBottom: "1px solid #F4F6F8" }}>
                          <td style={{ padding: "8px", fontSize: "13px" }}>{v.title}</td>
                          <td style={{ padding: "8px", fontSize: "13px", color: "#6D7175" }}>{v.sku || "-"}</td>
                          <td style={{ padding: "8px", textAlign: "right", fontSize: "13px" }}>${v.price.toFixed(2)}</td>
                          <td style={{ padding: "8px", textAlign: "right", fontSize: "13px" }}>
                            <Badge tone={v.inventory <= 0 ? "critical" : v.inventory <= 5 ? "warning" : "success"}>{v.inventory}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </BlockStack>
            </BlockStack>
          </Modal.Section>
        </Modal>
      )}
    </Box>
  );
}
