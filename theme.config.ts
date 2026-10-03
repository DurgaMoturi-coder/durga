// ******************************************************************************
// THEME CONFIGURATION (SINGLE FILE OF TRUTH)
// Project: Multi-Vendor Nursery Marketplace
// 
// To change the color palette across the entire application, edit this file only.
// All components reference semantic tokens that map directly to these values.
// ******************************************************************************

export interface ThemePalette {
  name: string;
  colors: {
    primary: {
      DEFAULT: string; // Main brand color (Buttons, Navbar highlights, CTA)
      hover: string;   // Hover state
      light: string;   // Badges, light backgrounds, tint
      dark: string;    // Deep tone, active states
      accent: string;  // Vibrant accents, glow, icons
    };
    botanical: {
      sage: string;        // Soft leaf green
      terracotta: string;  // Plant pot / clay earthy accent
      sunlight: string;    // Warm golden accent for plant care badges
      leaf: string;        // Vibrant growth green
    };
    surface: {
      page: string;    // Body background
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

// ==============================================================================
// 1. ACTIVE THEME: Modern Botanical Teal (Primary Palette)
// ==============================================================================
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
      terracotta: "#D97706", // Clay pot warm amber
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

// ==============================================================================
// 2. ALTERNATIVE PRESETS (Swap by setting activeTheme to any preset below)
// ==============================================================================
export const presets: Record<string, ThemePalette> = {
  botanicalTeal: activeTheme,
  
  deepForest: {
    name: "Deep Forest",
    colors: {
      primary: {
        DEFAULT: "#15803D", // Green 700
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

  terracottaClay: {
    name: "Terracotta Clay",
    colors: {
      primary: {
        DEFAULT: "#C2410C", // Orange/Rust 700
        hover: "#9A3412",
        light: "#FFEDD5",
        dark: "#7C2D12",
        accent: "#FB923C",
      },
      botanical: {
        sage: "#CBD5E1",
        terracotta: "#EA580C",
        sunlight: "#F59E0B",
        leaf: "#15803D",
      },
      surface: {
        page: "#FFFBEB",
        card: "#FFFFFF",
        sidebar: "#431407",
        muted: "#FEF3C7",
        border: "#FED7AA",
      },
      text: {
        main: "#292524",
        muted: "#78716C",
        inverse: "#FFFFFF",
      },
    },
  },
};

export default activeTheme;
