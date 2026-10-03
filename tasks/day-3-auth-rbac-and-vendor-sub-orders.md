# Day 3: Multi-Vendor RBAC & Transparent Order Splitting

> **Focus**: Vendor Authentication, Scoped APIs & Zero-Downtime Order Splitting  
> **Key Deliverable**: NextAuth & Express RBAC for vendors + automatic sub-order generation (`Vendor_order`) without altering client checkout code.

---

## 1. Objectives & Scope

1. **Vendor Identity & RBAC**: Configure NextAuth and Express middleware so nursery vendors can log in, receive a secure session with `role: "vendor"` and their `merchantId`, and be strictly scoped to their own store.
2. **Transparent Order Splitting**: Implement the background hook in [`server/controllers/customer_order_product.js`](file:///c:/Users/lokes/Desktop/Electronics-eCommerce-Shop-With-Admin-Dashboard-NextJS-NodeJS/server/controllers/customer_order_product.js) that splits customer checkout carts into independent `Vendor_order` (sub-order) records grouped by nursery merchant.
3. **Vendor Management APIs**: Build the `/api/vendor/*` endpoints for listing nursery-specific products, tracking orders, and updating shipment tracking numbers.

---

## 2. Implementation Specifications

### 2.1 NextAuth Updates ([`app/api/auth/[...nextauth]/route.ts`](file:///c:/Users/lokes/Desktop/Electronics-eCommerce-Shop-With-Admin-Dashboard-NextJS-NodeJS/app/api/auth/%5B...nextauth%5D/route.ts))
Ensure `merchantId` flows through the token and session:
```typescript
// Inside authorize():
if (isPasswordCorrect) {
  return {
    id: user.id,
    email: user.email,
    role: user.role || "user",
    merchantId: user.merchantId || null,
  };
}

// Inside jwt() callback:
if (user) {
  token.role = user.role;
  token.id = user.id;
  token.merchantId = (user as any).merchantId;
}

// Inside session() callback:
if (token) {
  session.user.role = token.role as string;
  session.user.id = token.id as string;
  session.user.merchantId = token.merchantId as string | undefined;
}
```

### 2.2 Next.js Route Guard ([`middleware.ts`](file:///c:/Users/lokes/Desktop/Electronics-eCommerce-Shop-With-Admin-Dashboard-NextJS-NodeJS/middleware.ts))
```typescript
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const role = req.nextauth.token?.role;

    if (req.nextUrl.pathname.startsWith("/admin") && role !== "admin") {
      return NextResponse.redirect(new URL("/", req.url));
    }

    if (req.nextUrl.pathname.startsWith("/vendor")) {
      if (role !== "vendor" && role !== "admin") {
        return NextResponse.redirect(new URL("/login", req.url));
      }
    }
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        if (req.nextUrl.pathname.startsWith("/admin")) return !!token && token.role === "admin";
        if (req.nextUrl.pathname.startsWith("/vendor")) {
          return !!token && (token.role === "vendor" || token.role === "admin");
        }
        return true;
      },
    },
  }
);

export const config = {
  matcher: ["/admin/:path*", "/vendor/:path*"],
};
```

### 2.3 Transparent Order Splitting Hook
In [`server/controllers/customer_order_product.js`](file:///c:/Users/lokes/Desktop/Electronics-eCommerce-Shop-With-Admin-Dashboard-NextJS-NodeJS/server/controllers/customer_order_product.js), append the background sync execution inside `createOrderProduct`:

```javascript
// At the end of createOrderProduct handler:
const orderProduct = await prisma.customer_order_product.create({
  data: {
    customerOrderId: customerOrderId,
    productId: productId,
    quantity: parseInt(quantity),
  },
});

// NON-BLOCKING VENDOR ORDER SYNC
syncVendorSubOrder(customerOrderId, productId, parseInt(quantity)).catch((err) =>
  console.error("Non-blocking error during vendor sub-order sync:", err)
);

return response.status(201).json(orderProduct);

// Helper function:
async function syncVendorSubOrder(customerOrderId, productId, quantity) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { merchant: true },
  });

  if (!product || !product.merchantId) return;

  const itemTotal = product.price * quantity;
  const commissionRate = product.merchant.commissionRate || 0.10;

  let subOrder = await prisma.vendor_order.findFirst({
    where: {
      customerOrderId: customerOrderId,
      merchantId: product.merchantId,
    },
  });

  if (!subOrder) {
    await prisma.vendor_order.create({
      data: {
        customerOrderId: customerOrderId,
        merchantId: product.merchantId,
        status: "pending",
        subtotal: itemTotal,
        commissionRate: commissionRate,
        payoutAmount: Math.round(itemTotal * (1 - commissionRate)),
        payoutStatus: "unpaid",
      },
    });
  } else {
    const updatedSubtotal = subOrder.subtotal + itemTotal;
    await prisma.vendor_order.update({
      where: { id: subOrder.id },
      data: {
        subtotal: updatedSubtotal,
        payoutAmount: Math.round(updatedSubtotal * (1 - subOrder.commissionRate)),
      },
    });
  }
}
```

### 2.4 Vendor Controller & Scoped Routes
Create [`server/controllers/vendorController.js`](file:///c:/Users/lokes/Desktop/Electronics-eCommerce-Shop-With-Admin-Dashboard-NextJS-NodeJS/server/controllers/vendorController.js):
```javascript
const prisma = require("../utills/db");
const { asyncHandler, AppError } = require("../utills/errorHandler");

const getVendorOrders = asyncHandler(async (req, res) => {
  const merchantId = req.merchantId;
  const orders = await prisma.vendor_order.findMany({
    where: { merchantId },
    include: {
      customerOrder: true,
      items: {
        include: { product: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  res.json(orders);
});

const updateShipmentStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { trackingNumber, carrier, status } = req.body;
  const merchantId = req.merchantId;

  const subOrder = await prisma.vendor_order.findFirst({
    where: { id, merchantId },
  });

  if (!subOrder) throw new AppError("Sub-order not found or unauthorized", 404);

  const updated = await prisma.vendor_order.update({
    where: { id },
    data: {
      trackingNumber,
      carrier,
      status: status || "shipped",
      shippedAt: new Date(),
    },
  });

  res.json(updated);
});

module.exports = { getVendorOrders, updateShipmentStatus };
```

---

## 3. Test Cases for Day 3

Create `tests/day3-vendor-orders.test.js`:

```javascript
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

describe("Day 3: Multi-Vendor Order Splitting Verification", () => {
  let merchantA, merchantB, productA, productB, customerOrder;

  beforeAll(async () => {
    // Fetch two different nurseries
    const merchants = await prisma.merchant.findMany({ take: 2 });
    merchantA = merchants[0];
    merchantB = merchants[1];

    const category = await prisma.category.findFirst();

    productA = await prisma.product.create({
      data: {
        slug: "vendor-test-plant-a-" + Date.now(),
        title: "Fiddle Leaf Fig",
        price: 5000,
        mainImage: "/test.jpg",
        description: "Test plant A",
        manufacturer: merchantA.name,
        merchantId: merchantA.id,
        categoryId: category.id,
      },
    });

    productB = await prisma.product.create({
      data: {
        slug: "vendor-test-plant-b-" + Date.now(),
        title: "Terracotta Pot 10 inch",
        price: 3000,
        mainImage: "/test.jpg",
        description: "Test pot B",
        manufacturer: merchantB.name,
        merchantId: merchantB.id,
        categoryId: category.id,
      },
    });
  });

  afterAll(async () => {
    if (customerOrder) {
      await prisma.customer_order_product.deleteMany({ where: { customerOrderId: customerOrder.id } });
      await prisma.vendor_order.deleteMany({ where: { customerOrderId: customerOrder.id } });
      await prisma.customer_order.delete({ where: { id: customerOrder.id } });
    }
    await prisma.product.delete({ where: { id: productA.id } });
    await prisma.product.delete({ where: { id: productB.id } });
    await prisma.$disconnect();
  });

  test("TC-D3-01: Multi-vendor cart splits into separate Vendor_order records", async () => {
    // 1. Create parent customer order
    customerOrder = await prisma.customer_order.create({
      data: {
        name: "Test",
        lastname: "Customer",
        email: "buyer@nursery.com",
        phone: "555-0100",
        company: "Home",
        adress: "123 Garden St",
        apartment: "1A",
        postalCode: "90210",
        status: "pending",
        total: 8000,
        city: "Seattle",
        country: "USA",
      },
    });

    // 2. Add product A (Merchant A)
    const { syncVendorSubOrder } = require("../server/controllers/customer_order_product");
    await prisma.customer_order_product.create({
      data: { customerOrderId: customerOrder.id, productId: productA.id, quantity: 1 },
    });
    await syncVendorSubOrder(customerOrder.id, productA.id, 1);

    // 3. Add product B (Merchant B)
    await prisma.customer_order_product.create({
      data: { customerOrderId: customerOrder.id, productId: productB.id, quantity: 1 },
    });
    await syncVendorSubOrder(customerOrder.id, productB.id, 1);

    // 4. Assert exactly 2 vendor orders created
    const subOrders = await prisma.vendor_order.findMany({
      where: { customerOrderId: customerOrder.id },
    });

    expect(subOrders.length).toBe(2);

    const subOrderA = subOrders.find((s) => s.merchantId === merchantA.id);
    const subOrderB = subOrders.find((s) => s.merchantId === merchantB.id);

    expect(subOrderA.subtotal).toBe(5000);
    expect(subOrderA.payoutAmount).toBe(Math.round(5000 * 0.90)); // 10% commission

    expect(subOrderB.subtotal).toBe(3000);
  });

  test("TC-D3-02: Vendor isolation prevents accessing another nursery's sub-orders", async () => {
    const subOrders = await prisma.vendor_order.findMany({
      where: { customerOrderId: customerOrder.id, merchantId: merchantA.id },
    });
    expect(subOrders.every((s) => s.merchantId === merchantA.id)).toBe(true);
  });
});
```

---

## 4. Human Review Gate 3

| Check # | Verification Task | Expected Output | Reviewer Sign-Off |
| :--- | :--- | :--- | :--- |
| **G3-1** | Log in as `vendor@evergreenhaven.com` | User logs in and session token contains `role: "vendor"` and `merchantId`. | [ ] Verified |
| **G3-2** | Attempt to visit `/admin` as vendor | Redirected to `/` or access denied (Superadmin guard works). | [ ] Verified |
| **G3-3** | Complete a checkout with products from 2 nurseries | Parent order is created; Prisma studio shows 2 corresponding `Vendor_order` records. | [ ] Verified |
| **G3-4** | Test sub-order shipment update | Call `PUT /api/vendor/orders/:id/ship`, verify tracking number and `shipped` status are saved. | [ ] Verified |
| **G3-5** | Execute `npx jest tests/day3-vendor-orders.test.js` | All tests pass with 0 failures. | [ ] Verified |
