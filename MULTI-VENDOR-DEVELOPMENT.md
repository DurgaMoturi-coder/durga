# Multi-Vendor Development Guide

This document outlines the roadmap and technical strategy for evolving the current **Electronics eCommerce Shop** into a full-scale multi-vendor platform. The goal is to allow independent merchants to register, list products, and manage their orders, while ensuring existing functionality remains stable.

## 1. Architecture Overview

The application currently uses a decoupled architecture:
- **Frontend**: Next.js (App Router)
- **Backend**: Node.js/Express
- **Database**: MySQL with Prisma ORM

### Current State
- `Merchant` model exists but is mostly managed by the Super Admin.
- `Product` model already has a `merchantId` field.
- `User` model exists but isn't explicitly linked to a `Merchant`.

---

## 2. Phase 1: Identity & Access Management (IAM)

To support multiple vendors, we must link physical users to merchant entities.

### Schema Updates (`prisma/schema.prisma`)
1. **Link User to Merchant**: Add a `merchantId` to the `User` model or a `ownerId` to the `Merchant` model.
   ```prisma
   model User {
     id         String    @id @default(uuid())
     role       String?   @default("user") // "admin", "merchant", "user"
     merchantId String?
     merchant   Merchant? @relation(fields: [merchantId], references: [id])
   }
   ```
2. **Merchant Roles**: If a merchant has multiple employees, consider a `MerchantMember` model.

### Authentication & Authorization
- **RBAC (Role Based Access Control)**: Update the backend middleware (`server/middleware`) to verify roles.
- **Frontend Middleware (`middleware.ts`)**: Extend the current middleware to protect merchant-specific routes.
  ```typescript
  // Example update for middleware.ts
  if (req.nextUrl.pathname.startsWith("/dashboard/merchant")) {
    if (req.nextauth.token?.role !== "merchant" && req.nextauth.token?.role !== "admin") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }
  ```
- **Merchant Middleware (Backend)**: Create a middleware that ensures a user can only access data belonging to their `merchantId`.

---

## 3. Phase 2: Merchant Onboarding & Portal

### Merchant Registration
- Create a public "Become a Seller" page.
- Implement a workflow where a user submits a merchant application, and the Super Admin approves it.

### Dedicated Merchant Dashboard
- **Route**: `/dashboard/merchant` (separate from `/admin`).
- **Features**:
  - **Product Management**: Merchants should only see/edit products where `merchantId == user.merchantId`.
  - **Order Tracking**: Merchants should see orders containing their products.
  - **Analytics**: Sales data specific to the merchant.

---

## 4. Phase 3: Multi-Vendor Order Management

Currently, a `Customer_order` is a single entity. In a multi-vendor setup, an order might contain products from 3 different vendors.

### Strategy: Sub-Orders (Non-Disruptive)
To avoid breaking existing order logic:
1. Keep `Customer_order` as the "Master Order".
2. Add a `Vendor_order` (Sub-order) model.
   ```prisma
   model Vendor_order {
     id              String         @id @default(uuid())
     masterOrderId   String
     masterOrder     Customer_order @relation(fields: [masterOrderId], references: [id])
     merchantId      String
     merchant        Merchant       @relation(fields: [merchantId], references: [id])
     status          String         @default("PENDING") // Specific to this vendor
     subtotal        Int
     products        customer_order_product[] // Link products to this sub-order
   }
   ```
3. **Benefit**: The Customer still sees one order, but each Vendor sees and manages only their `Vendor_order`.

---

## 5. Phase 4: Financials & Commissions

- **Commission Logic**: Add a `commissionRate` to the `Merchant` model.
- **Payouts**: Implement a `Payout` model to track when the platform pays the merchant.
- **Taxation**: Handle tax calculations based on vendor location vs. customer location.

---

## 6. Implementation Guidelines (Non-Disruptive)

### 1. Database Migrations
- Use `prisma migrate dev` to add fields. Always provide defaults (e.g., a default "Platform" merchant) for existing data to prevent `null` constraint errors.

### 2. API Versioning / Scoping
- **Don't change existing endpoints**: Keep `/api/products` for public viewing.
- **Add scoped endpoints**: Create `/api/merchant/products` for management.
- Use query filters in controllers:
  ```javascript
  // server/controllers/products.js
  const where = {};
  if (req.user.role === 'merchant') {
    where.merchantId = req.user.merchantId;
  }
  const products = await prisma.product.findMany({ where });
  ```

### 3. Frontend Extensibility
- **Component Reuse**: Reuse `ProductTable` and `OrderList` components by passing a `filter` or `merchantId` prop.
- **Conditional Navigation**: Update `DashboardSidebar` to show different links based on `user.role`.

### 4. Backward Compatibility
- Ensure that if a `Product` has no `merchantId` (legacy data), it is treated as belonging to the "Main Admin Store".
- The existing `/admin` routes should remain as "Super Admin" tools with oversight over ALL vendors.

---

## 7. Next Steps Recommendation

1. **Update User Model**: Add `role` and `merchantId`.
2. **Create Merchant Middleware**: Protect backend routes.
3. **Build the Merchant Portal UI**: Start with product listing for the logged-in merchant.
4. **Implement Sub-Orders**: Update the checkout logic to create `Vendor_order` records automatically.
