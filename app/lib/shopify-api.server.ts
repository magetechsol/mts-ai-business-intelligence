import { authenticate } from "~/shopify.server";

const ORDERS_QUERY = `
  query GetOrders($first: Int!, $after: String, $query: String) {
    orders(first: $first, after: $after, query: $query, sortKey: PROCESSED_AT, reverse: true) {
      edges {
        cursor
        node {
          id
          name
          email
          createdAt
          processedAt
          displayFinancialStatus
          displayFulfillmentStatus
          totalPriceSet {
            shopMoney { amount currencyCode }
          }
          subtotalPriceSet {
            shopMoney { amount currencyCode }
          }
          totalTaxSet {
            shopMoney { amount currencyCode }
          }
          totalDiscountsSet {
            shopMoney { amount currencyCode }
          }
          lineItems(first: 50) {
            edges {
              node {
                name
                quantity
                sku
                variant {
                  id
                  title
                  product {
                    id
                    title
                  }
                }
                originalUnitPriceSet {
                  shopMoney { amount currencyCode }
                }
              }
            }
          }
          customer {
            id
            email
            firstName
            lastName
          }
          tags
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

const PRODUCTS_QUERY = `
  query GetProducts($first: Int!, $after: String) {
    products(first: $first, after: $after, sortKey: UPDATED_AT, reverse: true) {
      edges {
        cursor
        node {
          id
          title
          vendor
          productType
          status
          createdAt
          updatedAt
          tags
          variants(first: 50) {
            edges {
              node {
                id
                title
                sku
                price
                inventoryQuantity
              }
            }
          }
          images(first: 5) {
            edges {
              node {
                id
                url
              }
            }
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

const CUSTOMERS_QUERY = `
  query GetCustomers($first: Int!, $after: String) {
    customers(first: $first, after: $after, sortKey: CREATED_AT, reverse: true) {
      edges {
        cursor
        node {
          id
          firstName
          lastName
          email
          ordersCount
          amountSpent { amount currencyCode }
          createdAt
          updatedAt
          tags
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

async function fetchAllPages(admin: any, query: string, variables: Record<string, any>, maxPages = 10) {
  const allEdges: any[] = [];
  let hasNextPage = true;
  let cursor: string | null = null;
  let pageCount = 0;

  while (hasNextPage && pageCount < maxPages) {
    const vars = { ...variables, after: cursor };
    const response = await admin.graphql(query, { variables: vars });
    const json = await response.json();

    const rootKey = Object.keys(json.data)[0];
    const connection = json.data[rootKey];

    allEdges.push(...connection.edges);
    hasNextPage = connection.pageInfo.hasNextPage;
    cursor = connection.pageInfo.endCursor;
    pageCount++;
  }

  return allEdges;
}

export async function fetchOrders(httpRequest: any, startDate: Date, endDate: Date, shopId: string) {
  const { admin } = await authenticate.admin(httpRequest);
  const query = `processed_at:>=${startDate.toISOString()} processed_at:<${endDate.toISOString()}`;
  const edges = await fetchAllPages(admin, ORDERS_QUERY, { first: 250, query }, 20);

  return edges.map((edge: any) => {
    const node = edge.node;
    return {
      id: node.id.replace("gid://shopify/Order/", ""),
      shopId,
      name: node.name,
      email: node.email || node.customer?.email || null,
      createdAt: new Date(node.createdAt),
      processedAt: node.processedAt ? new Date(node.processedAt) : null,
      financialStatus: node.displayFinancialStatus,
      fulfillmentStatus: node.displayFulfillmentStatus,
      totalPrice: parseFloat(node.totalPriceSet?.shopMoney?.amount || "0"),
      subtotalPrice: parseFloat(node.subtotalPriceSet?.shopMoney?.amount || "0"),
      totalTax: parseFloat(node.totalTaxSet?.shopMoney?.amount || "0"),
      totalDiscounts: parseFloat(node.totalDiscountsSet?.shopMoney?.amount || "0"),
      currency: node.totalPriceSet?.shopMoney?.currencyCode || "USD",
      lineItemCount: node.lineItems?.edges?.length || 0,
      customerEmail: node.customer?.email || null,
      tags: node.tags?.join(",") || null,
      lineItems: (node.lineItems?.edges || []).map((li: any) => ({
        productId: li.node.variant?.product?.id?.replace("gid://shopify/Product/", "") || null,
        productTitle: li.node.variant?.product?.title || null,
        variantId: li.node.variant?.id?.replace("gid://shopify/ProductVariant/", "") || null,
        variantTitle: li.node.variant?.title || null,
        sku: li.node.sku || null,
        quantity: li.node.quantity || 0,
        price: parseFloat(li.node.originalUnitPriceSet?.shopMoney?.amount || "0"),
      })),
    };
  });
}

export async function fetchProducts(request: any, shopId: string) {
  const { admin } = await authenticate.admin(request);
  const edges = await fetchAllPages(admin, PRODUCTS_QUERY, { first: 250 }, 10);

  return edges.map((edge: any) => {
    const node = edge.node;
    return {
      id: node.id.replace("gid://shopify/Product/", ""),
      shopId,
      title: node.title,
      vendor: node.vendor,
      productType: node.productType,
      status: node.status,
      createdAt: new Date(node.createdAt),
      updatedAt: new Date(node.updatedAt),
      tags: node.tags?.join(",") || null,
      totalVariants: node.variants?.edges?.length || 0,
      imageCount: node.images?.edges?.length || 0,
      variants: node.variants?.edges?.map((ve: any) => ({
        id: ve.node.id.replace("gid://shopify/ProductVariant/", ""),
        title: ve.node.title,
        sku: ve.node.sku,
        price: parseFloat(ve.node.price || "0"),
        inventory: ve.node.inventoryQuantity || 0,
      })) || [],
    };
  });
}

export async function fetchCustomers(request: any, shopId: string) {
  const { admin } = await authenticate.admin(request);
  const edges = await fetchAllPages(admin, CUSTOMERS_QUERY, { first: 250 }, 10);

  return edges.map((edge: any) => {
    const node = edge.node;
    return {
      id: node.id.replace("gid://shopify/Customer/", ""),
      shopId,
      email: node.email,
      firstName: node.firstName,
      lastName: node.lastName,
      ordersCount: node.ordersCount || 0,
      totalSpent: parseFloat(node.amountSpent?.amount || "0"),
      createdAt: new Date(node.createdAt),
      updatedAt: new Date(node.updatedAt),
      tags: node.tags?.join(",") || null,
    };
  });
}
