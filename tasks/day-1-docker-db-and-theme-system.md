# Day 1: Docker MySQL Setup & Centralized Teal Theme Engine

> **Focus**: Local Containerized Database & Single-File Theming Architecture  
> **Key Deliverable**: Working Docker MySQL 8.0 database + Botanical Teal design token engine where changing a single file instantly re-themes the entire application.

---

## 1. Objectives & Scope

1. **MySQL 8.0 Docker Environment**: Create a reproducible, containerized MySQL database service with persistent volume storage, health checks, and automatic database initialization.
2. **Centralized Theming Architecture**: Build an abstraction where all brand colors (Teal palette, secondary botanical accents, neutral surfaces, text shades) originate from **a single configuration file** ([`theme.config.ts`](file:///c:/Users/lokes/Desktop/Electronics-eCommerce-Shop-With-Admin-Dashboard-NextJS-NodeJS/theme.config.ts)).
3. **Tailwind & DaisyUI Integration**: Wire the theme tokens into CSS variables in [`app/globals.css`](file:///c:/Users/lokes/Desktop/Electronics-eCommerce-Shop-With-Admin-Dashboard-NextJS-NodeJS/app/globals.css) and configure [`tailwind.config.ts`](file:///c:/Users/lokes/Desktop/Electronics-eCommerce-Shop-With-Admin-Dashboard-NextJS-NodeJS/tailwind.config.ts) so classes like `bg-primary`, `text-primary-dark`, `border-primary-light` dynamically adapt across all components.

---

## 2. Docker MySQL Configuration

Create [`docker-compose.yml`](file:///c:/Users/lokes/Desktop/Electronics-eCommerce-Shop-With-Admin-Dashboard-NextJS-NodeJS/docker-compose.yml) in the project root:

```yaml
version: '3.8'

services:
  nursery-mysql:
    image: mysql:8.0
    container_name: nursery_marketplace_db
    restart: always
    environment:
      MYSQL_ROOT_PASSWORD: rootpassword
      MYSQL_DATABASE: nursery_ecommerce
      MYSQL_USER: nursery_admin
      MYSQL_PASSWORD: nursery_secret_pw
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql
      - ./docker/init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-u", "root", "-prootpassword"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - nursery_network

volumes:
  mysql_data:
    driver: local

networks:
  nursery_network:
    driver: bridge
```

### Environment Variable Sync
Update root `.env` and `server/.env`:
```env
DATABASE_URL="mysql://nursery_admin:nursery_secret_pw@localhost:3306/nursery_ecommerce"
PORT=3001
NEXT_PUBLIC_API_BASE_URL="http://localhost:3001"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="nursery_super_secret_session_key_2026"
```

---

## 3. Single-File Theming Architecture

### 3.1 The Master Token Configuration File
Create [`theme.config.ts`](file:///c:/Users/lokes/Desktop/Electronics-eCommerce-Shop-With-Admin-Dashboard-NextJS-NodeJS/theme.config.ts) at the project root:

```typescript
// ******************************************************************************
// THEME CONFIGURATION (SINGLE FILE OF TRUTH)
// To change the color palette across the entire application, edit this file only.
// ******************************************************************************

export interface ThemePalette {
  name: string;
  colors: {
    primary: {
      DEFAULT: string; // Main brand color (e.g. Buttons, Navbar headers, Highlights)
      hover: string;   // Hover state
      light: string;   // Badges, light backgrounds, tint
      dark: string;    // Deep tone, active states
      accent: string;  // Vibrant accents, glow, icons
    };
    botanical: {
      sage: string;    // Soft leaf green
      terracotta: string; // Plant pot / clay earthy accent
      sunlight: string; // Warm golden accent for plant care badges
      leaf: string;    // Vibrant growth green
    };
    surface: {
      page: string;    // Background color of the main body
      card: string;    // Card backgrounds
      sidebar: string; // Admin / Vendor sidebar background
      muted: string;   // Table rows, subtle section dividers
      border: string;  // Universal border color
    };
    text: {
      main: string;    // Headings and high-contrast text
      muted: string;   // Subtitles, descriptions, timestamps
      inverse: string; // Text on primary/dark backgrounds
    };
  };
}

// Default Theme: Modern Botanical Teal
export const activeTheme: ThemePalette = {
  name: "Botanical Teal",
  colors: {
    primary: {
      DEFAULT: "#0D9488", // Teal 600
      hover: "#0F766E",   // Teal 700
      light: "#CCFBF1",   // Teal 100
      dark: "#115E59",    // Teal 800
      accent: "#2DD4BF",  // Teal 400
    },
    botanical: {
      sage: "#84A98C",
      terracotta: "#D97706", // Pot clay warm amber
      sunlight: "#F59E0B",
      leaf: "#16A34A",
    },
    surface: {
      page: "#F8FAFC",    // Slate 50
      card: "#FFFFFF",
      sidebar: "#134E4A", // Teal 900 for dark executive sidebar
      muted: "#F1F5F9",
      border: "#E2E8F0",
    },
    text: {
      main: "#0F172A",    // Slate 900
      muted: "#64748B",   // Slate 500
      inverse: "#FFFFFF",
    },
  },
};

// Alternative Preset (Demonstrates how swapping 1 object changes entire app)
export const presets: Record<string, ThemePalette> = {
  botanicalTeal: activeTheme,
  deepForest: {
    name: "Deep Forest",
    colors: {
      primary: {
        DEFAULT: "#15803D",
        hover: "#166534",
        light: "#DCFCE7",
        dark: "#14532D",
        accent: "#4ADE80",
      },
      botanical: {
        sage: "#A7F3D0",
        terracotta: "#C2410C",
        sunlight: "#EAB308",
        leaf: "#22C55E",
      },
      surface: {
        page: "#F9FAFB",
        card: "#FFFFFF",
        sidebar: "#052E16",
        muted: "#F3F4F6",
        border: "#E5E7EB",
      },
      text: {
        main: "#111827",
        muted: "#6B7280",
        inverse: "#FFFFFF",
      },
    },
  },
};
```

### 3.2 Injecting CSS Variables into [`app/globals.css`](file:///c:/Users/lokes/Desktop/Electronics-eCommerce-Shop-With-Admin-Dashboard-NextJS-NodeJS/app/globals.css)

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  /* Generated from theme.config.ts */
  --color-primary: 13 148 136;         /* #0D9488 */
  --color-primary-hover: 15 118 110;   /* #0F766E */
  --color-primary-light: 204 251 241;  /* #CCFBF1 */
  --color-primary-dark: 17 94 89;      /* #115E59 */
  --color-primary-accent: 45 212 191;  /* #2DD4BF */

  --color-botanical-sage: 132 169 140;
  --color-botanical-clay: 217 119 6;
  --color-botanical-leaf: 22 163 74;

  --color-surface-page: 248 250 252;
  --color-surface-card: 255 255 255;
  --color-surface-sidebar: 19 78 74;
  --color-surface-muted: 241 245 249;
  --color-surface-border: 226 232 240;

  --color-text-main: 15 23 42;
  --color-text-muted: 100 116 139;
  --color-text-inverse: 255 255 255;
}

body {
  background-color: rgb(var(--color-surface-page));
  color: rgb(var(--color-text-main));
}
```

### 3.3 Consuming Variables in [`tailwind.config.ts`](file:///c:/Users/lokes/Desktop/Electronics-eCommerce-Shop-With-Admin-Dashboard-NextJS-NodeJS/tailwind.config.ts)

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "rgb(var(--color-primary) / <alpha-value>)",
          hover: "rgb(var(--color-primary-hover) / <alpha-value>)",
          light: "rgb(var(--color-primary-light) / <alpha-value>)",
          dark: "rgb(var(--color-primary-dark) / <alpha-value>)",
          accent: "rgb(var(--color-primary-accent) / <alpha-value>)",
        },
        botanical: {
          sage: "rgb(var(--color-botanical-sage) / <alpha-value>)",
          clay: "rgb(var(--color-botanical-clay) / <alpha-value>)",
          leaf: "rgb(var(--color-botanical-leaf) / <alpha-value>)",
        },
        surface: {
          page: "rgb(var(--color-surface-page) / <alpha-value>)",
          card: "rgb(var(--color-surface-card) / <alpha-value>)",
          sidebar: "rgb(var(--color-surface-sidebar) / <alpha-value>)",
          muted: "rgb(var(--color-surface-muted) / <alpha-value>)",
          border: "rgb(var(--color-surface-border) / <alpha-value>)",
        },
        text: {
          main: "rgb(var(--color-text-main) / <alpha-value>)",
          muted: "rgb(var(--color-text-muted) / <alpha-value>)",
          inverse: "rgb(var(--color-text-inverse) / <alpha-value>)",
        },
      },
    },
  },
  plugins: [
    require("@tailwindcss/typography"),
    require("@tailwindcss/forms"),
    require("daisyui"),
  ],
  daisyui: {
    themes: [
      {
        nursery: {
          primary: "#0D9488",
          secondary: "#10B981",
          accent: "#D97706",
          neutral: "#134E4A",
          "base-100": "#FFFFFF",
          info: "#0284C7",
          success: "#16A34A",
          warning: "#F59E0B",
          error: "#DC2626",
        },
      },
    ],
  },
};

export default config;
```

---

## 4. Test Cases for Day 1

Create `tests/day1-theme-and-docker.test.js`:

```javascript
describe("Day 1: Docker MySQL & Theming Verification", () => {
  test("TC-D1-01: MySQL Container responds to ping", async () => {
    const { execSync } = require("child_process");
    const output = execSync("docker exec nursery_marketplace_db mysqladmin ping -prootpassword").toString();
    expect(output).toContain("mysqld is alive");
  });

  test("TC-D1-02: Prisma connects successfully to Docker MySQL", async () => {
    const { PrismaClient } = require("@prisma/client");
    const prisma = new PrismaClient();
    const result = await prisma.$queryRaw`SELECT 1 as connected`;
    expect(result[0].connected).toBe(1);
    await prisma.$disconnect();
  });

  test("TC-D1-03: Theme tokens define all required palette variables", () => {
    const { activeTheme } = require("../theme.config.ts");
    expect(activeTheme.colors.primary.DEFAULT).toMatch(/^#[0-9A-F]{6}$/i);
    expect(activeTheme.colors.surface.sidebar).toBeDefined();
    expect(activeTheme.colors.botanical.terracotta).toBeDefined();
  });

  test("TC-D1-04: Changing activeTheme shifts primary hex code", () => {
    const { presets } = require("../theme.config.ts");
    expect(presets.botanicalTeal.colors.primary.DEFAULT).toBe("#0D9488");
    expect(presets.deepForest.colors.primary.DEFAULT).toBe("#15803D");
  });
});
```

---

## 5. Human Review Gate 1

| Check # | Verification Task | Expected Output | Reviewer Sign-Off |
| :--- | :--- | :--- | :--- |
| **G1-1** | Run `docker-compose up -d` | Container `nursery_marketplace_db` is `Up (healthy)` on port `3306`. | [ ] Verified |
| **G1-2** | Run `npm run db:generate && node server/test-db-connection.js` | Console prints `Database connection successful`. | [ ] Verified |
| **G1-3** | Inspect `theme.config.ts` | Verify modern Teal palette is configured as the active primary color. | [ ] Verified |
| **G1-4** | Single-File Palette Change Test | Change primary in `theme.config.ts` to `#15803D`, run dev server, verify buttons and navbar adopt green, then switch back to Teal `#0D9488`. | [ ] Verified |
| **G1-5** | Zero Disruption Smoke Test | Load homepage `http://localhost:3000`, verify existing pages render without runtime errors. | [ ] Verified |
