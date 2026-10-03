# Day 2: Nursery Domain Modeling & Non-Breaking Schema Migration

> **Focus**: Botanical Domain Extensions, Safe Prisma Migration & Nursery Seed Data  
> **Key Deliverable**: Extended Prisma schema with plant-care metadata, non-breaking MySQL migration, and seed script populating demo nurseries, plants, and gardening accessories.

---

## 1. Objectives & Scope

1. **Botanical Domain Modeling**: Enrich the catalog schema so products support plant-specific attributes (sunlight requirements, watering intervals, pet friendliness, pot size, perishable flags) while retaining 100% backward compatibility for existing fields.
2. **Safe Database Migration**: Apply the Prisma schema changes against the Docker MySQL container using `prisma db push` without dropping tables or corrupting existing records.
3. **Nursery Marketplace Seeding**: Create a seed script populating botanical categories, 3 independent nursery vendors, admin/vendor/shopper user accounts, and sample nursery products.

---

## 2. Botanical Schema Extensions in [`prisma/schema.prisma`](file:///c:/Users/lokes/Desktop/Electronics-eCommerce-Shop-With-Admin-Dashboard-NextJS-NodeJS/prisma/schema.prisma)

### 2.1 Enums for Plant Care Attributes
```prisma
enum SunlightLevel {
  FULL_SUN
  PARTIAL_SHADE
  LOW_LIGHT
  INDIRECT_LIGHT
}

enum WateringNeed {
  DAILY
  TWICE_A_WEEK
  WEEKLY
  BIWEEKLY
  LOW_DROUGHT_TOLERANT
}

enum CareDifficulty {
  EASY_BEGINNER
  MODERATE
  EXPERT
}

enum ProductType {
  LIVE_PLANT
  SEEDS
  POT_PLANTER
  SOIL_FERTILIZER
  GARDEN_TOOL
}
```

### 2.2 Updating the Existing `Product` Model
Every plant care field is **optional (`?`)** or has a safe default:
```prisma
model Product {
  id             String                   @id @default(uuid())
  slug           String                   @unique
  title          String
  mainImage      String
  price          Int                      @default(0)
  rating         Int                      @default(0)
  description    String                   @db.Text
  manufacturer   String                   // Nursery / Brand Name
  inStock        Int                      @default(1)
  categoryId     String
  category       Category                 @relation(fields: [categoryId], references: [id], onDelete: Cascade)
  customerOrders customer_order_product[]
  Wishlist       Wishlist[]

  merchantId     String
  merchant       Merchant                 @relation(fields: [merchantId], references: [id])
  bulkUploadItems bulk_upload_item[]      @relation("ProductBulkItems")

  // =========================================================================
  // NEW BOTANICAL EXTENSIONS (All optional or with safe defaults)
  // =========================================================================
  productType       ProductType           @default(LIVE_PLANT)
  scientificName    String?
  sunlight          SunlightLevel?        @default(INDIRECT_LIGHT)
  watering          WateringNeed?         @default(WEEKLY)
  difficulty        CareDifficulty?       @default(EASY_BEGINNER)
  petFriendly       Boolean?              @default(true)
  isPerishable      Boolean               @default(true) // Perishable plants have 48-72h return window
  potSizeInches     Int?                  @default(6)
  careInstructions  String?               @db.Text

  // Back-relation for return items
  returnItems       Return_item[]

  createdAt         DateTime              @default(now())
  updatedAt         DateTime              @updatedAt

  @@index([merchantId])
  @@index([categoryId])
  @@index([productType])
}
```

### 2.3 Updating `Merchant` for Nursery Growers
```prisma
model Merchant {
  id                  String         @id @default(uuid())
  name                String
  description         String?        @db.Text
  email               String?
  phone               String?
  address             String?
  status              String         @default("ACTIVE")
  
  // Nursery specific metadata
  nurseryType         String?        @default("Organic Plant Nursery") // Greenhouse, Sapling Farm, Pot Studio
  specialization      String?        @default("Indoor Tropicals & Succulents")
  shipsPerishables    Boolean        @default(true)
  commissionRate      Float          @default(0.10) // 10% marketplace fee

  createdAt           DateTime       @default(now())
  updatedAt           DateTime       @updatedAt

  products            Product[]
  users               User[]         @relation("MerchantUser")
  vendorOrders        Vendor_order[]
  returnRequests      Return_request[]
}
```

---

## 3. Nursery Seed Script (`scripts/seed-nursery.js`)

Create a runnable seed script in [`scripts/seed-nursery.js`](file:///c:/Users/lokes/Desktop/Electronics-eCommerce-Shop-With-Admin-Dashboard-NextJS-NodeJS/scripts/seed-nursery.js):

```javascript
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting Botanical Nursery Seed...");

  // 1. Seed Categories
  const categories = [
    { name: "Indoor Air Purifying Plants" },
    { name: "Flowering Shrubs & Bonsai" },
    { name: "Exotic Succulents & Cacti" },
    { name: "Fruit Saplings & Edibles" },
    { name: "Terracotta & Ceramic Planters" },
    { name: "Organic Soils & Bio-Fertilizers" },
    { name: "Gardening Tools & Sprayers" },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    });
  }

  // 2. Seed Nursery Vendors
  const nurseries = [
    {
      name: "Evergreen Botanical Haven",
      description: "Specializing in exotic indoor foliage, monsteras, and rare aroids.",
      email: "info@evergreenhaven.com",
      phone: "+1-555-0192",
      address: "144 Greenhouse Rd, Portland, OR",
      nurseryType: "Foliage Greenhouse",
      commissionRate: 0.10,
    },
    {
      name: "Sunny Orchard & Saplings",
      description: "Certified organic grower of dwarf fruit trees, citrus, and berry saplings.",
      email: "contact@sunnyorchard.com",
      phone: "+1-555-0193",
      address: "88 Sun Valley Farm, Sacramento, CA",
      nurseryType: "Fruit Tree Farm",
      commissionRate: 0.12,
    },
    {
      name: "Clay & Craft Plant Studio",
      description: "Handcrafted terracotta planters, self-watering pots, and premium organic potting mixes.",
      email: "hello@claycraftstudio.com",
      phone: "+1-555-0194",
      address: "21 Pottery Way, Austin, TX",
      nurseryType: "Pottery & Soil Studio",
      commissionRate: 0.08,
    },
  ];

  const createdNurseries = [];
  for (const nursery of nurseries) {
    const record = await prisma.merchant.create({ data: nursery });
    createdNurseries.push(record);
  }

  // 3. Seed Users with Roles
  const passwordHash = await bcrypt.hash("password123", 10);
  
  // Superadmin
  await prisma.user.upsert({
    where: { email: "admin@nurseryshop.com" },
    update: {},
    create: {
      email: "admin@nurseryshop.com",
      password: passwordHash,
      role: "admin",
    },
  });

  // Vendor User for Evergreen Haven
  await prisma.user.upsert({
    where: { email: "vendor@evergreenhaven.com" },
    update: {},
    create: {
      email: "vendor@evergreenhaven.com",
      password: passwordHash,
      role: "vendor",
      merchantId: createdNurseries[0].id,
    },
  });

  // Sample Customer
  await prisma.user.upsert({
    where: { email: "customer@plantlover.com" },
    update: {},
    create: {
      email: "customer@plantlover.com",
      password: passwordHash,
      role: "user",
    },
  });

  console.log("✅ Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

---

## 4. Test Cases for Day 2

Create `tests/day2-nursery-schema.test.js`:

```javascript
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

describe("Day 2: Botanical Domain & Schema Verification", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  test("TC-D2-01: Product table accepts botanical fields without errors", async () => {
    const merchant = await prisma.merchant.findFirst();
    const category = await prisma.category.findFirst();

    const plant = await prisma.product.create({
      data: {
        slug: "test-monstera-deliciosa-" + Date.now(),
        title: "Swiss Cheese Plant (Monstera Deliciosa)",
        scientificName: "Monstera deliciosa",
        price: 3499, // $34.99
        description: "Classic split-leaf tropical philodendron.",
        mainImage: "/images/monstera.webp",
        manufacturer: merchant.name,
        merchantId: merchant.id,
        categoryId: category.id,
        sunlight: "INDIRECT_LIGHT",
        watering: "WEEKLY",
        difficulty: "EASY_BEGINNER",
        petFriendly: false,
        isPerishable: true,
        potSizeInches: 8,
      },
    });

    expect(plant.id).toBeDefined();
    expect(plant.sunlight).toBe("INDIRECT_LIGHT");
    expect(plant.isPerishable).toBe(true);

    // Cleanup
    await prisma.product.delete({ where: { id: plant.id } });
  });

  test("TC-D2-02: Legacy queries without botanical fields continue to function", async () => {
    const products = await prisma.product.findMany({
      select: {
        id: true,
        title: true,
        price: true,
      },
      take: 5,
    });
    expect(Array.isArray(products)).toBe(true);
  });

  test("TC-D2-03: User table can associate with a Merchant and hold 'vendor' role", async () => {
    const user = await prisma.user.findFirst({
      where: { role: "vendor" },
      include: { merchant: true },
    });
    expect(user).toBeDefined();
    expect(user.role).toBe("vendor");
    expect(user.merchant).toBeDefined();
  });
});
```

---

## 5. Human Review Gate 2

| Check # | Verification Task | Expected Output | Reviewer Sign-Off |
| :--- | :--- | :--- | :--- |
| **G2-1** | Run `npm run db:push` | Prisma reports: `Your database is now in sync with your Prisma schema.` | [ ] Verified |
| **G2-2** | Run `node scripts/seed-nursery.js` | Terminal logs seeded categories, nurseries, and user accounts. | [ ] Verified |
| **G2-3** | Run `npm run db:studio` | Inspect `Product` table: botanical fields (`sunlight`, `watering`, `potSizeInches`) exist with correct enums. | [ ] Verified |
| **G2-4** | Zero Disruption Smoke Test | Run `npm run dev`, browse existing shop: all products load normally. | [ ] Verified |
| **G2-5** | Execute `npx jest tests/day2-nursery-schema.test.js` | All tests pass with 0 failures. | [ ] Verified |
