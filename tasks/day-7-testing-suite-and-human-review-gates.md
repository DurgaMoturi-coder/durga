# Day 7: Comprehensive Test Suite & Final Human Review Gate

> **Focus**: End-to-End Automated Testing, Regression Assurance & Production Release Sign-Off  
> **Key Deliverable**: Complete multi-tier test suite (Unit, Integration, E2E) + Final Release Human Review Gate verifying multi-vendor isolation, perishable returns, and single-file color theming.

---

## 1. Objectives & Scope

1. **Full-Spectrum Test Automation**:
   - **Unit Tests**: Botanical care logic, perishable 72-hour window calculations, commission math, token resolution.
   - **Integration Tests**: Express route security, NextAuth session claims, vendor data isolation, RMA state machine.
   - **End-to-End (E2E) Flow**: Complete lifecycle from browsing a plant -> multi-vendor checkout -> order split -> vendor shipping -> customer RMA submission -> vendor approval -> inventory restock.
2. **Backward-Compatibility Smoke Test**: Verify that legacy products, existing single-vendor checkout, and standard `/admin` routes operate with zero regressions.
3. **Master Human Review Sign-Off**: Comprehensive interactive audit checklist for stakeholder sign-off.

---

## 2. Comprehensive E2E Test Suite (`tests/e2e-nursery-flow.test.js`)

Create [`tests/e2e-nursery-flow.test.js`](file:///c:/Users/lokes/Desktop/Electronics-eCommerce-Shop-With-Admin-Dashboard-NextJS-NodeJS/tests/e2e-nursery-flow.test.js):

```javascript
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

describe("Day 7: Full E2E Nursery Marketplace & RMA Flow", () => {
  let customerUser, vendorUser, nurseryA, nurseryB, plantItem, potItem, orderRecord;

  beforeAll(async () => {
    // 1. Seed or retrieve test environment
    customerUser = await prisma.user.findFirst({ where: { role: "user" } });
    vendorUser = await prisma.user.findFirst({ where: { role: "vendor" } });
    nurseryA = await prisma.merchant.findUnique({ where: { id: vendorUser.merchantId } });
    nurseryB = await prisma.merchant.findFirst({ where: { id: { not: nurseryA.id } } });

    const category = await prisma.category.findFirst();

    // Create a live perishable plant under Nursery A
    plantItem = await prisma.product.create({
      data: {
        slug: "e2e-plant-" + Date.now(),
        title: "Rare Variegated Monstera",
        price: 7500, // $75.00
        mainImage: "/monstera.webp",
        description: "Healthy live rooted cutting",
        manufacturer: nurseryA.name,
        merchantId: nurseryA.id,
        categoryId: category.id,
        isPerishable: true,
        inStock: 5,
      },
    });

    // Create a ceramic pot under Nursery B
    potItem = await prisma.product.create({
      data: {
        slug: "e2e-pot-" + Date.now(),
        title: "Matte Terracotta Cylinder Pot",
        price: 2500, // $25.00
        mainImage: "/pot.webp",
        description: "8-inch drainage pot",
        manufacturer: nurseryB.name,
        merchantId: nurseryB.id,
        categoryId: category.id,
        isPerishable: false,
        inStock: 10,
      },
    });
  });

  afterAll(async () => {
    if (orderRecord) {
      await prisma.return_item.deleteMany({ where: { productId: plantItem.id } });
      await prisma.return_request.deleteMany({ where: { customerOrderId: orderRecord.id } });
      await prisma.customer_order_product.deleteMany({ where: { customerOrderId: orderRecord.id } });
      await prisma.vendor_order.deleteMany({ where: { customerOrderId: orderRecord.id } });
      await prisma.customer_order.delete({ where: { id: orderRecord.id } });
    }
    await prisma.product.deleteMany({ where: { id: { in: [plantItem.id, potItem.id] } } });
    await prisma.$disconnect();
  });

  // STEP 1: Multi-Vendor Checkout & Order Splitting
  test("E2E Step 1: Customer checkout splits order across both nurseries", async () => {
    const { syncVendorSubOrder } = require("../server/controllers/customer_order_product");

    orderRecord = await prisma.customer_order.create({
      data: {
        name: "Test",
        lastname: "Gardener",
        email: customerUser.email,
        phone: "+1-555-0188",
        company: "Greenhouse",
        adress: "77 Orchid St",
        apartment: "Penthouse",
        postalCode: "97201",
        status: "pending",
        total: 10000, // $100.00 total
        city: "Portland",
        country: "USA",
      },
    });

    // Add Plant (Nursery A)
    await prisma.customer_order_product.create({
      data: { customerOrderId: orderRecord.id, productId: plantItem.id, quantity: 1 },
    });
    await syncVendorSubOrder(orderRecord.id, plantItem.id, 1);

    // Add Pot (Nursery B)
    await prisma.customer_order_product.create({
      data: { customerOrderId: orderRecord.id, productId: potItem.id, quantity: 1 },
    });
    await syncVendorSubOrder(orderRecord.id, potItem.id, 1);

    const subOrders = await prisma.vendor_order.findMany({
      where: { customerOrderId: orderRecord.id },
    });

    expect(subOrders.length).toBe(2);

    const subOrderA = subOrders.find((s) => s.merchantId === nurseryA.id);
    expect(subOrderA.subtotal).toBe(7500);
    expect(subOrderA.status).toBe("pending");
  });

  // STEP 2: Vendor Dispatches Sub-Order
  test("E2E Step 2: Nursery A dispatches plant with live courier tracking", async () => {
    const subOrderA = await prisma.vendor_order.findFirst({
      where: { customerOrderId: orderRecord.id, merchantId: nurseryA.id },
    });

    const updated = await prisma.vendor_order.update({
      where: { id: subOrderA.id },
      data: {
        status: "shipped",
        carrier: "FedEx Live Plant Express",
        trackingNumber: "FX-99881122",
        shippedAt: new Date(),
      },
    });

    expect(updated.status).toBe("shipped");
    expect(updated.trackingNumber).toBe("FX-99881122");
  });

  // STEP 3: Customer Reports Transit Damage (RMA Request)
  test("E2E Step 3: Customer initiates return within 72h window for plant", async () => {
    const { createReturnRequest } = require("../server/controllers/returnsController");

    const req = {
      body: {
        customerOrderId: orderRecord.id,
        userId: customerUser.id,
        reason: "DAMAGED_IN_SHIPPING",
        customerComment: "Main stem snapped during courier handling",
        items: [{ productId: plantItem.id, quantity: 1 }],
      },
    };

    let responseData;
    const res = {
      status: (code) => ({
        json: (data) => {
          responseData = data;
        },
      }),
    };

    await createReturnRequest(req, res);

    expect(responseData).toBeDefined();
    expect(responseData[0].merchantId).toBe(nurseryA.id);
    expect(responseData[0].status).toBe("REQUESTED");
    expect(responseData[0].refundAmount).toBe(7500);
  });

  // STEP 4: Nursery Reviews & Approves Refund with Restock
  test("E2E Step 4: Nursery A approves refund and inventory restocks", async () => {
    const { processRefund } = require("../server/controllers/returnsController");

    const rma = await prisma.return_request.findFirst({
      where: { customerOrderId: orderRecord.id, merchantId: nurseryA.id },
    });

    const initialStock = (await prisma.product.findUnique({ where: { id: plantItem.id } })).inStock;

    const req = {
      params: { id: rma.id },
      body: { shouldRestock: true },
    };
    const res = { json: (d) => d };

    await processRefund(req, res);

    const completedRMA = await prisma.return_request.findUnique({ where: { id: rma.id } });
    expect(completedRMA.status).toBe("REFUNDED");

    const currentStock = (await prisma.product.findUnique({ where: { id: plantItem.id } })).inStock;
    expect(currentStock).toBe(initialStock + 1);
  });

  // STEP 5: Superadmin Master Visibility
  test("E2E Step 5: Superadmin can view master orders and completed RMAs", async () => {
    const allOrders = await prisma.customer_order.findMany({
      where: { id: orderRecord.id },
      include: { vendorOrders: true, returnRequests: true },
    });

    expect(allOrders[0].vendorOrders.length).toBe(2);
    expect(allOrders[0].returnRequests.length).toBe(1);
    expect(allOrders[0].returnRequests[0].status).toBe("REFUNDED");
  });
});
```

---

## 3. Master Human Review Sign-Off Checklist (Release Gate 7)

Before promoting this build to staging or production, the designated human reviewer must verify and check off each section:

### A. Containerized Database & Infrastructure
- [ ] MySQL 8.0 Docker container runs cleanly via `docker-compose up -d`.
- [ ] Database credentials and connection string match `.env` and `server/.env`.
- [ ] Health checks pass and volume persistence persists data across container restarts.

### B. Single-File Theming & Botanical Aesthetics
- [ ] Modern Botanical Teal (`#0D9488` / `#0F766E`) is active.
- [ ] Editing `theme.config.ts` (e.g. changing primary color) alters buttons, badges, navigation, and highlights across the entire app.
- [ ] Plant cards display clear care tags (Sunlight, Watering, Pet Safe, Nursery Vendor).
- [ ] Mobile drawer, desktop navbar, and filter sidebars adapt without horizontal scrollbars.

### C. Multi-Vendor Isolation & Security
- [ ] Vendor user cannot access `/admin/*` (Superadmin guard active).
- [ ] Vendor user can access `/vendor/*` and view only their assigned products and sub-orders.
- [ ] Checkout automatically partitions multi-vendor carts into separate `Vendor_order` records.
- [ ] Payout math correctly deducts nursery marketplace commission (e.g., 10%).

### D. Perishable Returns & RMA Workflow
- [ ] Perishable plants strictly enforce the 72-hour delivery reporting window.
- [ ] Non-perishable garden tools/planters permit standard 30-day returns.
- [ ] Vendor receives RMA claims in `/vendor/returns`, can review customer comments, and approve/reject.
- [ ] Restock transaction correctly increments `inStock` count and updates sub-order payout amounts.
- [ ] Superadmin retains master dispute mediation oversight in `/admin/returns`.

### E. Zero-Disruption & Legacy Smoke Test
- [ ] Existing product catalog queries continue without breaking.
- [ ] Legacy single-vendor order checkout completes seamlessly without frontend errors.
- [ ] All automated tests pass: `npm run test` executes 0 failures.

---

### Sign-Off Signature

| Role | Name | Signature / Status | Date |
| :--- | :--- | :--- | :--- |
| **Lead Engineer** | ____________________ | [ ] APPROVED | ____ / ____ / 2026 |
| **QA / Reviewer** | ____________________ | [ ] APPROVED | ____ / ____ / 2026 |
