# Day 4: Perishable-Aware Returns (RMA) Engine

> **Focus**: Botanical Return Rules, RMA State Machine & Inventory Restocking  
> **Key Deliverable**: Complete Return & Refund management engine with special handling for live plants (perishable 72-hour window + photo proof) versus garden accessories (30-day standard return).

---

## 1. Objectives & Scope

1. **Perishable-Aware Business Logic**:
   - **Live Perishable Plants (`isPerishable: true`)**: Return window is strictly **72 hours post-delivery**. Customer must provide damage evidence (wilted foliage, broken stems, transit damage). Physical return is often skipped if the plant cannot survive return transit (instant replacement or store refund).
   - **Hard Goods (`isPerishable: false` - Pots, Tools, Trellises)**: Standard **30-day return window** with return shipping label and physical warehouse receipt required.
2. **End-to-End RMA State Machine**: Build backend controllers for requesting, vendor reviewing, shipping back, inspecting, and completing refunds.
3. **Automated Restocking & Financial Deductions**: When an RMA is approved and completed, automatically restock `Product.inStock` (if plant is salvageable or hard good is unopened) and adjust the vendor's net payout in `Vendor_order`.

---

## 2. RMA Architecture & Implementation

### 2.1 Return Lifecycle State Transitions

```
[REQUESTED] ──(Vendor Rejects)──> [REJECTED] ──(Escalate)──> [DISPUTED] (Superadmin Mediates)
     │
     └──(Vendor Approves)──> [VENDOR_APPROVED]
                                   │
                                   ├──> [SHIPPED_BACK] ──> [RECEIVED] ──> [INSPECTED] ──> [REFUNDED]
                                   │                                                            │
                                   └──(Perishable Instant Refund without return shipping)───────┘
```

### 2.2 Returns Controller ([`server/controllers/returnsController.js`](file:///c:/Users/lokes/Desktop/Electronics-eCommerce-Shop-With-Admin-Dashboard-NextJS-NodeJS/server/controllers/returnsController.js))

```javascript
const prisma = require("../utills/db");
const { asyncHandler, AppError } = require("../utills/errorHandler");

// 1. Customer initiates return request
const createReturnRequest = asyncHandler(async (req, res) => {
  const { customerOrderId, items, reason, customerComment, photoUrl } = req.body;
  const userId = req.user?.id || req.body.userId;

  if (!customerOrderId || !items || items.length === 0) {
    throw new AppError("Invalid return payload", 400);
  }

  const order = await prisma.customer_order.findUnique({
    where: { id: customerOrderId },
    include: { products: { include: { product: true } } },
  });

  if (!order) throw new AppError("Order not found", 404);

  // Group items by vendor to create separate RMAs if multiple nurseries are involved
  const vendorGroups = {};
  for (const item of items) {
    const orderProduct = order.products.find((op) => op.productId === item.productId);
    if (!orderProduct) throw new AppError(`Product ${item.productId} not part of this order`, 400);

    const product = orderProduct.product;

    // Check perishable policy (72 hour transit window check)
    if (product.isPerishable) {
      const orderDate = new Date(order.dateTime);
      const diffHours = (Date.now() - orderDate.getTime()) / (1000 * 60 * 60);
      if (diffHours > 72) {
        throw new AppError(`Perishable plant returns must be requested within 72 hours of delivery.`, 400);
      }
    }

    const merchantId = product.merchantId;
    if (!vendorGroups[merchantId]) vendorGroups[merchantId] = [];
    vendorGroups[merchantId].push({
      productId: item.productId,
      quantity: item.quantity,
      itemPrice: product.price,
      condition: item.condition || "UNKNOWN",
    });
  }

  // Create Return_request records
  const createdReturns = [];
  for (const [merchantId, groupItems] of Object.entries(vendorGroups)) {
    const returnNumber = `RMA-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;
    const refundTotal = groupItems.reduce((acc, curr) => acc + curr.itemPrice * curr.quantity, 0);

    const rma = await prisma.return_request.create({
      data: {
        returnNumber,
        customerOrderId,
        merchantId,
        userId,
        reason,
        customerComment,
        refundAmount: refundTotal,
        items: {
          create: groupItems,
        },
      },
      include: { items: true },
    });
    createdReturns.push(rma);
  }

  res.status(201).json(createdReturns);
});

// 2. Vendor Reviews & Decides
const vendorReviewReturn = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { action, vendorNotes } = req.body; // action: "APPROVE" | "REJECT"
  const merchantId = req.merchantId;

  const rma = await prisma.return_request.findFirst({
    where: { id, merchantId },
  });

  if (!rma) throw new AppError("Return request not found", 404);

  const newStatus = action === "APPROVE" ? "VENDOR_APPROVED" : "REJECTED";

  const updated = await prisma.return_request.update({
    where: { id },
    data: { status: newStatus, vendorNotes },
  });

  res.json(updated);
});

// 3. Process Refund & Inventory Restock
const processRefund = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { shouldRestock } = req.body;

  const rma = await prisma.return_request.findUnique({
    where: { id },
    include: { items: true },
  });

  if (!rma) throw new AppError("Return not found", 404);

  // Execute database transaction
  const result = await prisma.$transaction(async (tx) => {
    // Restock items if healthy/resellable
    if (shouldRestock) {
      for (const item of rma.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { inStock: { increment: item.quantity } },
        });
      }
    }

    // Deduct from vendor sub-order payout
    await tx.vendor_order.updateMany({
      where: {
        customerOrderId: rma.customerOrderId,
        merchantId: rma.merchantId,
      },
      data: { payoutAmount: { decrement: rma.refundAmount } },
    });

    // Mark RMA completed
    return tx.return_request.update({
      where: { id },
      data: { status: "REFUNDED", isRestocked: shouldRestock },
    });
  });

  res.json(result);
});

module.exports = { createReturnRequest, vendorReviewReturn, processRefund };
```

---

## 3. Test Cases for Day 4

Create `tests/day4-returns.test.js`:

```javascript
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

describe("Day 4: Perishable Returns (RMA) Engine Verification", () => {
  let customerOrder, perishablePlant, gardenPot, customerUser, merchant;

  beforeAll(async () => {
    merchant = await prisma.merchant.findFirst();
    customerUser = await prisma.user.findFirst({ where: { role: "user" } });
    const category = await prisma.category.findFirst();

    perishablePlant = await prisma.product.create({
      data: {
        slug: "rma-test-fern-" + Date.now(),
        title: "Boston Fern",
        price: 2500,
        mainImage: "/fern.jpg",
        description: "Delicate perishable fern",
        manufacturer: merchant.name,
        merchantId: merchant.id,
        categoryId: category.id,
        isPerishable: true,
        inStock: 10,
      },
    });

    gardenPot = await prisma.product.create({
      data: {
        slug: "rma-test-pot-" + Date.now(),
        title: "Ceramic Glazed Pot",
        price: 1500,
        mainImage: "/pot.jpg",
        description: "Sturdy non-perishable pot",
        manufacturer: merchant.name,
        merchantId: merchant.id,
        categoryId: category.id,
        isPerishable: false,
        inStock: 5,
      },
    });

    customerOrder = await prisma.customer_order.create({
      data: {
        name: "Alice",
        lastname: "Green",
        email: customerUser.email,
        phone: "555-0199",
        company: "Gardener",
        adress: "456 Fern Way",
        apartment: "2",
        postalCode: "10001",
        status: "delivered",
        total: 4000,
        city: "New York",
        country: "USA",
        dateTime: new Date(Date.now() - 24 * 60 * 60 * 1000), // Delivered 24 hours ago
        products: {
          create: [
            { productId: perishablePlant.id, quantity: 1 },
            { productId: gardenPot.id, quantity: 1 },
          ],
        },
      },
    });
  });

  afterAll(async () => {
    await prisma.return_item.deleteMany({ where: { productId: { in: [perishablePlant.id, gardenPot.id] } } });
    await prisma.return_request.deleteMany({ where: { customerOrderId: customerOrder.id } });
    await prisma.customer_order_product.deleteMany({ where: { customerOrderId: customerOrder.id } });
    await prisma.customer_order.delete({ where: { id: customerOrder.id } });
    await prisma.product.deleteMany({ where: { id: { in: [perishablePlant.id, gardenPot.id] } } });
    await prisma.$disconnect();
  });

  test("TC-D4-01: Perishable item return within 72 hours succeeds", async () => {
    const { createReturnRequest } = require("../server/controllers/returnsController");

    const req = {
      body: {
        customerOrderId: customerOrder.id,
        userId: customerUser.id,
        reason: "DAMAGED_IN_SHIPPING",
        customerComment: "Foliage wilted during delivery",
        items: [{ productId: perishablePlant.id, quantity: 1 }],
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
    expect(responseData[0].status).toBe("REQUESTED");
    expect(responseData[0].refundAmount).toBe(2500);
  });

  test("TC-D4-02: Restocking hook restores product inventory accurately", async () => {
    const { processRefund } = require("../server/controllers/returnsController");

    const rma = await prisma.return_request.findFirst({
      where: { customerOrderId: customerOrder.id },
    });

    const initialStock = (await prisma.product.findUnique({ where: { id: perishablePlant.id } })).inStock;

    const req = { params: { id: rma.id }, body: { shouldRestock: true } };
    const res = { json: (d) => d };

    await processRefund(req, res);

    const updatedStock = (await prisma.product.findUnique({ where: { id: perishablePlant.id } })).inStock;
    expect(updatedStock).toBe(initialStock + 1);
  });
});
```

---

## 4. Human Review Gate 4

| Check # | Verification Task | Expected Output | Reviewer Sign-Off |
| :--- | :--- | :--- | :--- |
| **G4-1** | Submit return request for an order delivered 24 hours ago | Success: RMA created with status `REQUESTED`. | [ ] Verified |
| **G4-2** | Test perishable cut-off: Submit return for order older than 72 hours | Handled rejection: Error message indicates perishable return window exceeded. | [ ] Verified |
| **G4-3** | Vendor Review action: Vendor accepts return | Return status updates to `VENDOR_APPROVED`. | [ ] Verified |
| **G4-4** | Restock & Refund completion check | Stock increments by returned quantity; vendor payout is credited/debited correctly. | [ ] Verified |
| **G4-5** | Execute `npx jest tests/day4-returns.test.js` | All tests pass with 0 failures. | [ ] Verified |
