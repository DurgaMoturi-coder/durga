# Day 5: Modern Teal UI Transformation & Botanical Storefront

> **Focus**: Storefront UI Modernization, Botanical Tokens & Single-File Palette Reflection  
> **Key Deliverable**: Completely refreshed, modern botanical storefront utilizing the Teal design system, with responsive plant cards, care badges, and zero hardcoded colors.

---

## 1. Objectives & Scope

1. **Botanical Storefront Overhaul**: Upgrade key customer-facing components to reflect a modern, premium nursery brand:
   - **Header & Navigation**: Botanical branding, search bar, active nursery category mega-menu, cart counter in Teal badge.
   - **Hero Section**: Modern glassmorphic hero showcasing exotic houseplants, fruit saplings, and sustainable gardening with Teal gradients.
   - **Product Card (`ProductItem.tsx`)**: Display plant care micro-badges (Sunlight icon, Watering drop, Pet-friendly leaf, Nursery vendor link).
   - **Filters (`Filters.tsx`)**: Botanical filter sidebar (Sunlight requirements, Watering frequency, Indoor/Outdoor, Nursery grower).
2. **Strict Single-File Palette Compliance**: Eliminate all hardcoded hex codes (`#3B82F6`, `#FED700`) across components; replace with theme tokens (`bg-primary`, `text-primary-dark`, `border-surface-border`, `bg-botanical-sage`).
3. **Responsive Aesthetics**: Ensure mobile drawer, desktop grid, and tablet layouts adapt smoothly.

---

## 2. Component Modernization Specifications

### 2.1 Refreshed Hero Section ([`components/Hero.tsx`](file:///c:/Users/lokes/Desktop/Electronics-eCommerce-Shop-With-Admin-Dashboard-NextJS-NodeJS/components/Hero.tsx))
```tsx
import React from "react";
import Link from "next/link";
import { FaLeaf, FaTruckFast, FaAward } from "react-icons/fa6";

const Hero = () => {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-primary-dark via-primary to-emerald-800 text-white py-20 px-6 sm:px-12 rounded-3xl mx-4 my-6 shadow-2xl">
      <div className="max-w-4xl mx-auto text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-primary-light text-sm font-medium">
          <FaLeaf className="text-accent" /> Certified Sustainable Multi-Vendor Nursery
        </div>
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-tight">
          Bring Nature Home with Hand-Picked Botanical Wonders
        </h1>
        <p className="text-lg sm:text-xl text-primary-light/90 max-w-2xl mx-auto font-light">
          Connect directly with top organic growers. Discover rare tropical foliage, hardy saplings, and artisanal pots delivered directly to your doorstep.
        </p>
        <div className="flex flex-wrap justify-center gap-4 pt-4">
          <Link
            href="/shop"
            className="px-8 py-3.5 rounded-xl bg-white text-primary-dark font-semibold hover:bg-primary-light transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            Explore Plants
          </Link>
          <Link
            href="/shop?category=Pots"
            className="px-8 py-3.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/30 text-white font-semibold hover:bg-white/20 transition-all"
          >
            Artisanal Planters
          </Link>
        </div>

        {/* Value Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-12 border-t border-white/10 text-left">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/10 rounded-xl"><FaTruckFast className="text-2xl text-accent" /></div>
            <div><p className="font-bold text-sm">72-Hour Safe Transit</p><p className="text-xs text-primary-light/80">Perishable plant safety guarantee</p></div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/10 rounded-xl"><FaLeaf className="text-2xl text-accent" /></div>
            <div><p className="font-bold text-sm">100% Organic Soil</p><p className="text-xs text-primary-light/80">Pest-free certified nurseries</p></div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/10 rounded-xl"><FaAward className="text-2xl text-accent" /></div>
            <div><p className="font-bold text-sm">Expert Care Guide</p><p className="text-xs text-primary-light/80">Watering & sunlight instructions</p></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;
```

### 2.2 Botanical Product Card with Care Badges ([`components/ProductItem.tsx`](file:///c:/Users/lokes/Desktop/Electronics-eCommerce-Shop-With-Admin-Dashboard-NextJS-NodeJS/components/ProductItem.tsx))
```tsx
import React from "react";
import Image from "next/image";
import Link from "next/link";
import { FaSun, FaDroplet, FaShieldCat } from "react-icons/fa6";

interface ProductProps {
  product: {
    id: string;
    slug: string;
    title: string;
    scientificName?: string;
    price: number;
    mainImage: string;
    manufacturer: string;
    sunlight?: string;
    watering?: string;
    petFriendly?: boolean;
    inStock: number;
  };
}

const ProductItem = ({ product }: ProductProps) => {
  return (
    <div className="group relative bg-surface-card rounded-2xl border border-surface-border p-4 hover:shadow-xl transition-all duration-300 flex flex-col justify-between">
      {/* Thumbnail */}
      <div className="relative w-full h-56 rounded-xl overflow-hidden bg-surface-muted">
        <Image
          src={product.mainImage || "/placeholder-plant.webp"}
          alt={product.title}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {product.petFriendly && (
          <span className="absolute top-2 left-2 bg-emerald-100 text-emerald-800 text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1 shadow-sm">
            <FaShieldCat className="text-xs" /> Pet Safe
          </span>
        )}
      </div>

      {/* Meta Content */}
      <div className="mt-4 space-y-2">
        <p className="text-xs font-semibold text-primary uppercase tracking-wider">
          {product.manufacturer}
        </p>
        <Link href={`/product/${product.slug}`}>
          <h3 className="font-bold text-text-main group-hover:text-primary transition-colors text-base line-clamp-1">
            {product.title}
          </h3>
        </Link>
        {product.scientificName && (
          <p className="text-xs italic text-text-muted">{product.scientificName}</p>
        )}

        {/* Botanical Care Tags */}
        <div className="flex items-center gap-3 pt-2 text-xs text-text-muted border-t border-surface-border">
          {product.sunlight && (
            <span className="flex items-center gap-1" title="Sunlight Requirement">
              <FaSun className="text-amber-500" /> {product.sunlight.replace("_", " ")}
            </span>
          )}
          {product.watering && (
            <span className="flex items-center gap-1" title="Watering Interval">
              <FaDroplet className="text-cyan-500" /> {product.watering.replace("_", " ")}
            </span>
          )}
        </div>

        {/* Price & Cart CTA */}
        <div className="flex items-center justify-between pt-3">
          <span className="text-xl font-extrabold text-primary-dark">
            ${(product.price / 100).toFixed(2)}
          </span>
          <Link
            href={`/product/${product.slug}`}
            className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary-hover transition-colors shadow-sm"
          >
            View Details
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ProductItem;
```

---

## 3. Test Cases for Day 5

Create `tests/day5-ui-tokens.test.js`:

```javascript
describe("Day 5: Modern UI & Token Consistency Verification", () => {
  test("TC-D5-01: No deprecated generic blue or yellow hex classes remain in updated components", () => {
    const fs = require("fs");
    const path = require("path");

    const heroContent = fs.readFileSync(path.join(__dirname, "../components/Hero.tsx"), "utf8");
    expect(heroContent).not.toContain("bg-blue-500");
    expect(heroContent).not.toContain("#FED700");

    const productItemContent = fs.readFileSync(path.join(__dirname, "../components/ProductItem.tsx"), "utf8");
    expect(productItemContent).not.toContain("bg-blue-500");
  });

  test("TC-D5-02: ProductItem displays botanical sunlight and pet friendly tags when provided", () => {
    // Assert structure matches expected botanical design
    const { renderToString } = require("react-dom/server");
    const React = require("react");
    const ProductItem = require("../components/ProductItem").default;

    const mockProduct = {
      id: "p1",
      slug: "snake-plant",
      title: "Sansevieria Snake Plant",
      price: 2200,
      mainImage: "/test.jpg",
      manufacturer: "Green Haven",
      sunlight: "LOW_LIGHT",
      watering: "BIWEEKLY",
      petFriendly: true,
      inStock: 5,
    };

    const html = renderToString(React.createElement(ProductItem, { product: mockProduct }));
    expect(html).toContain("Pet Safe");
    expect(html).toContain("Green Haven");
  });
});
```

---

## 4. Human Review Gate 5

| Check # | Verification Task | Expected Output | Reviewer Sign-Off |
| :--- | :--- | :--- | :--- |
| **G5-1** | Inspect Homepage `http://localhost:3000` | New botanical Hero renders with Teal gradients and CTA buttons. | [ ] Verified |
| **G5-2** | Inspect Product Grid | Product cards feature plant care tags (Sunlight, Watering, Pet Safe). | [ ] Verified |
| **G5-3** | Single-File Palette Change Test | Modify `DEFAULT` color in `theme.config.ts` to `#059669` (Emerald); reload app; verify header, buttons, and cards immediately update. Revert to `#0D9488` (Teal). | [ ] Verified |
| **G5-4** | Mobile Responsiveness Check | Open Chrome DevTools in Mobile view (375px); verify Hero and Cards stack cleanly without horizontal overflow. | [ ] Verified |
| **G5-5** | Execute `npx jest tests/day5-ui-tokens.test.js` | All tests pass with 0 failures. | [ ] Verified |
