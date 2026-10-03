# Day 6: Nursery Vendor Portal & Customer RMA Interface

> **Focus**: Dedicated Vendor Dashboard & Customer Return Initiation Portal  
> **Key Deliverable**: Complete self-service portal for nursery vendors (`/vendor/*`) + customer order history and visual RMA request wizard (`/account/orders`).

---

## 1. Objectives & Scope

1. **Self-Service Nursery Vendor Portal**:
   - **`/vendor`**: Executive dashboard with plant sales analytics, pending live shipments, return rate, and unfulfilled sub-orders.
   - **`/vendor/products`**: Catalog management for nursery growers with botanical metadata inputs (scientific name, sunlight, watering, pot size).
   - **`/vendor/orders`**: Sub-order fulfillment and live transit tracking input.
   - **`/vendor/returns`**: RMA inbox to inspect customer plant damage photos, approve/reject claims, and issue instant replacements.
2. **Customer Order History & Return Wizard**:
   - **`/account/orders`**: Customer view of all placed orders with item status badges.
   - **"Request Return / Report Plant Issue" Modal**: Visual wizard with perishable 72-hour timer, plant damage photo upload, reason selection, and live submission.
   - **`/account/returns`**: Tracking timeline reflecting RMA state (`Requested` -> `Approved` -> `Shipped` -> `Refunded`).

---

## 2. Implementation Specifications

### 2.1 Vendor Sidebar Component ([`components/VendorSidebar.tsx`](file:///c:/Users/lokes/Desktop/Electronics-eCommerce-Shop-With-Admin-Dashboard-NextJS-NodeJS/components/VendorSidebar.tsx))
```tsx
import React from "react";
import Link from "next/link";
import { FaChartLine, FaSeedling, FaBoxesPacking, FaRotateLeft, FaStore } from "react-icons/fa6";

const VendorSidebar = () => {
  return (
    <aside className="xl:w-72 bg-surface-sidebar text-white min-h-screen p-6 flex flex-col justify-between">
      <div className="space-y-6">
        <div className="flex items-center gap-3 px-2 pb-6 border-b border-white/10">
          <FaStore className="text-2xl text-primary-accent" />
          <div>
            <h2 className="font-bold text-lg leading-tight">Nursery Portal</h2>
            <p className="text-xs text-primary-light/70">Grower Management</p>
          </div>
        </div>

        <nav className="space-y-1">
          <Link
            href="/vendor"
            className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/10 text-primary-light hover:text-white transition-colors"
          >
            <FaChartLine className="text-lg" /> Dashboard
          </Link>
          <Link
            href="/vendor/products"
            className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/10 text-primary-light hover:text-white transition-colors"
          >
            <FaSeedling className="text-lg" /> Plant Catalog
          </Link>
          <Link
            href="/vendor/orders"
            className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/10 text-primary-light hover:text-white transition-colors"
          >
            <FaBoxesPacking className="text-lg" /> Sub-Orders
          </Link>
          <Link
            href="/vendor/returns"
            className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/10 text-primary-light hover:text-white transition-colors"
          >
            <FaRotateLeft className="text-lg" /> Returns (RMA)
          </Link>
        </nav>
      </div>

      <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-xs text-primary-light/80">
        <p className="font-semibold text-white">Live Plant Guarantee</p>
        <p className="mt-1">Review perishable claims within 24 hours to maintain Gold Grower status.</p>
      </div>
    </aside>
  );
};

export default VendorSidebar;
```

### 2.2 Customer Return Initiation Modal ([`components/ReturnRequestModal.tsx`](file:///c:/Users/lokes/Desktop/Electronics-eCommerce-Shop-With-Admin-Dashboard-NextJS-NodeJS/components/ReturnRequestModal.tsx))
```tsx
"use client";
import React, { useState } from "react";
import toast from "react-hot-toast";
import apiClient from "@/lib/api";
import { FaCamera, FaClock } from "react-icons/fa6";

interface ModalProps {
  order: any;
  isOpen: boolean;
  onClose: () => void;
}

const ReturnRequestModal = ({ order, isOpen, onClose }: ModalProps) => {
  const [selectedProduct, setSelectedProduct] = useState(order?.products?.[0]?.productId || "");
  const [reason, setReason] = useState("DAMAGED_IN_SHIPPING");
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        customerOrderId: order.id,
        reason,
        customerComment: comment,
        items: [{ productId: selectedProduct, quantity: 1 }],
      };

      const res = await apiClient.post("/api/returns", payload);
      if (res.ok) {
        toast.success("Return request submitted! The nursery will review it shortly.");
        onClose();
      } else {
        const error = await res.json();
        toast.error(error.message || "Failed to submit return");
      }
    } catch (err) {
      toast.error("Network error submitting return request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-6 shadow-2xl border border-surface-border">
        <div className="flex justify-between items-start border-b pb-4">
          <div>
            <h3 className="text-xl font-bold text-text-main">Request Plant Return / Refund</h3>
            <p className="text-xs text-text-muted">Order #{order.id}</p>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-main text-lg font-bold">✕</button>
        </div>

        {/* 72-Hour Perishable Notice */}
        <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-center gap-3 text-amber-800 text-xs">
          <FaClock className="text-lg flex-shrink-0" />
          <span>Live plants must be reported within 72 hours of delivery with photo proof of leaf damage.</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-text-main mb-1">Select Item to Return</label>
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="w-full text-sm rounded-lg border-surface-border p-2.5 bg-surface-muted"
            >
              {order.products?.map((item: any) => (
                <option key={item.productId} value={item.productId}>
                  {item.product?.title || item.productId}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-text-main mb-1">Reason for Return</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full text-sm rounded-lg border-surface-border p-2.5 bg-surface-muted"
            >
              <option value="DAMAGED_IN_SHIPPING">Wilted / Broken during shipping</option>
              <option value="DEFECTIVE">Pest infested / unhealthy roots</option>
              <option value="WRONG_ITEM_SENT">Incorrect plant species sent</option>
              <option value="DOES_NOT_MATCH_DESCRIPTION">Plant height / pot size mismatch</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-text-main mb-1">Description & Care Details</label>
            <textarea
              required
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Describe condition upon unboxing (e.g. broken stems, yellow leaves)..."
              className="w-full text-sm rounded-lg border-surface-border p-2.5"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-text-muted hover:text-text-main"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-sm font-bold bg-primary text-white rounded-lg hover:bg-primary-hover shadow-md"
            >
              {isSubmitting ? "Submitting..." : "Submit Return Claim"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReturnRequestModal;
```

---

## 3. Test Cases for Day 6

Create `tests/day6-vendor-portal.test.js`:

```javascript
describe("Day 6: Vendor Portal & Customer RMA UI Verification", () => {
  test("TC-D6-01: Vendor navigation includes plant catalog and RMA tabs", () => {
    const fs = require("fs");
    const path = require("path");
    const content = fs.readFileSync(path.join(__dirname, "../components/VendorSidebar.tsx"), "utf8");

    expect(content).toContain("/vendor/products");
    expect(content).toContain("/vendor/orders");
    expect(content).toContain("/vendor/returns");
  });

  test("TC-D6-02: Return modal contains 72-hour perishable alert", () => {
    const fs = require("fs");
    const path = require("path");
    const content = fs.readFileSync(path.join(__dirname, "../components/ReturnRequestModal.tsx"), "utf8");

    expect(content).toContain("72 hours");
    expect(content).toContain("DAMAGED_IN_SHIPPING");
  });
});
```

---

## 4. Human Review Gate 6

| Check # | Verification Task | Expected Output | Reviewer Sign-Off |
| :--- | :--- | :--- | :--- |
| **G6-1** | Navigate to `/vendor` as vendor user | Vendor dashboard loads with nursery KPI cards and dark Teal sidebar. | [ ] Verified |
| **G6-2** | Check `/vendor/products` | Shows only products belonging to the logged-in nursery. | [ ] Verified |
| **G6-3** | Open Customer `/account/orders` and click "Request Return" | Return wizard modal pops up with item picker and perishable guidelines. | [ ] Verified |
| **G6-4** | Submit return and inspect `/vendor/returns` | Nursery vendor sees the newly submitted return request immediately. | [ ] Verified |
| **G6-5** | Execute `npx jest tests/day6-vendor-portal.test.js` | All tests pass with 0 failures. | [ ] Verified |
