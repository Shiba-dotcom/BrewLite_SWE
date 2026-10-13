# ☕ BrewLite — Artisanal Warmth Design System Specification

> Extracted directly from **Google Stitch** project: `BrewLite Coffee Ordering App` (`projects/13737451096006061402`).  
> Theme: **Artisanal Warmth** | Aesthetic: **Tactile Organic Minimalism**

---

## 1. Complete Color Tokens & Palette

The BrewLite color palette reflects the tactile sensory experience of craft coffee brewing: deep roasted espresso, velvety steamed foam, rich caramelized notes, and aromatic spices.

### 1.1 Core Brand Colors

| Token Name | Hex Code | Role & Description |
| :--- | :--- | :--- |
| **Primary** | `#2C1810` | Deep, bittersweet roasted espresso brown. High-contrast foundational anchor for structural navigation, primary CTAs, headings, and active borders. |
| **Secondary** | `#C68B59` / `#845326` | Buttery, warm amber caramel. Used for active badges, selection chips, rating stars, and interactive focus states. |
| **Tertiary** | `#D97736` / `#351300` | Roasted cinnamon zest. Reserved for expressive accents, loyalty points badges (`⭐ 120 điểm`), promotional alerts, and price tags. |
| **Neutral / Background** | `#F5EFEB` / `#FEF8F4` | Steamed latte foam. Soft, warm paper-like canvas that prevents eye fatigue and establishes an analog cafe ambiance. |

### 1.2 Surface Hierarchy & Tiers

| Tier Name | Hex Code | UI Usage |
| :--- | :--- | :--- |
| **Canvas Base** | `#FDFBF7` | Unbleached parchment page background. |
| **Surface Level 1** | `#F5EFEB` / `#F8F2EE` | Grouped containers, hero scrims, banner backgrounds. |
| **Surface Level 2** | `#EFE6DD` / `#F3EDE9` | Drink cards, dialogs, bottom sheets, bento boxes. |
| **Surface Level 3** | `#E8DCC4` / `#EDE7E3` | Chip borders, input field borders, subtle selection states. |
| **Container Lowest** | `#FFFFFF` | Crisp white cards, inputs, and search containers. |

### 1.3 Text & Content Tokens

| Token Name | Hex Code | Role |
| :--- | :--- | :--- |
| **On Surface (Primary Text)** | `#1D1B19` | Main headings, drink names, prices. |
| **On Surface Variant (Secondary Text)** | `#504440` | Descriptions, subtitles, card meta info. |
| **Outline / Muted** | `#827470` | Timestamps, placeholder text, inactive icons. |
| **Outline Variant** | `#D3C3BE` | Hairline dividers, modal strokes, chip borders. |
| **Inverse Primary** | `#E3BFB2` | Light accents and subtle pill backgrounds. |

---

## 2. Typography Specs & Vietnamese Language Support

The typographic system pairs the structural, editorial weight of **Epilogue** with the rounded, friendly precision of **Plus Jakarta Sans**.

### 2.1 Font Families & Strict Subsets

```typescript
// Next.js App Router (next/font/google) Configuration
import { Epilogue, Playfair_Display, Plus_Jakarta_Sans } from "next/font/google";

// Headline & Editorial Serif (Supports Latin & Vietnamese)
export const playfair = Playfair_Display({
  variable: "--font-serif",
  subsets: ["vietnamese", "latin"],
  weight: ["500", "600", "700", "800"],
  display: "swap",
});

// Epilogue Headline (Google Stitch Primary Display)
export const epilogue = Epilogue({
  variable: "--font-epilogue",
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600", "700", "800"],
  display: "swap",
});

// Primary Body & UI Labels (High efficiency transactional flows)
export const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["vietnamese", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});
```

### 2.2 Strict Vietnamese Typography Rules
1. **Unicode NFC Standard (Canonical Composition)**:
   - All Vietnamese copy across database entities, UI copy, and mock data **MUST** be normalized with `.normalize("NFC")`.
   - Never use decomposed (NFD) combining accents (e.g., `M + u + o + ^ + ' + i`), which causes glyph separation and dropped tone marks in modern browsers.
   - Example correct precomposed forms: `Cà Phê Muối`, `Cà Phê Sữa Đá`, `Đắk Lắk`, `Thực đơn`.
2. **Vietnamese Subset Declaration**:
   - Every font configuration in `layout.tsx` or Google Fonts links must explicitly include `subsets: ['vietnamese', 'latin']`.
   - Headlines fallback stack: `var(--font-epilogue), var(--font-serif), "Playfair Display", "Noto Serif", Georgia, serif`.

### 2.3 Typography Scale & Styles

| Token | Family | Size | Line Height | Weight | Tracking | Usage |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `display` | Epilogue / Serif | 48px | 56px | 700 (Bold) | -0.02em | Hero headline ("Skip the line...") |
| `display-mobile` | Epilogue / Serif | 36px | 44px | 700 (Bold) | -0.02em | Mobile hero headline |
| `headline-lg` | Epilogue / Serif | 32px | 40px | 600 (Semibold) | -0.01em | Screen titles, section headers |
| `headline-md` | Epilogue / Serif | 22px | 30px | 600 (Semibold) | -0.01em | Modal headers, spotlight titles |
| `headline-sm` | Epilogue / Serif | 18px | 26px | 600 (Semibold) | 0 | Drink card titles, bento titles |
| `body-lg` | Plus Jakarta Sans | 18px | 28px | 400 (Regular) | 0 | Hero descriptions, lead paragraphs |
| `body-md` | Plus Jakarta Sans | 15px | 24px | 400 (Regular) | 0 | Search inputs, main descriptions |
| `body-sm` | Plus Jakarta Sans | 13px | 20px | 400 (Regular) | 0 | Drink item descriptions, footer info |
| `label-lg` | Plus Jakarta Sans | 15px | 20px | 600 (Semibold) | +0.01em | Cart subtotal, button labels |
| `label-md` | Plus Jakarta Sans | 13px | 18px | 600 (Semibold) | +0.01em | Category navigation pills, add buttons |
| `label-sm` | Plus Jakarta Sans | 11px | 16px | 700 (Bold) | +0.04em | Badges, temperature chips, meta tags |

---

## 3. UI Component Guidelines & Layout Grid

### 3.1 Container & Layout Grid
- **Max Width**: `1280px` (`max-w-[1280px]` / `max-w-7xl`).
- **Responsive Layout**:
  - **Mobile (< 768px)**: 4 columns, `1rem` (16px) margins, `1rem` (16px) gutters. Fixed bottom tray. Minimum touch targets `48px`.
  - **Tablet (768px – 1024px)**: 8 columns, `2rem` (32px) margins, `1.25rem` (20px) gutters.
  - **Desktop (> 1024px)**: 12 columns, `3rem` (48px) margins, `1.5rem` (24px) gutters.

### 3.2 Component Guidelines

#### 1. Header (Navigation & Branding)
- **Position**: `sticky top-0 z-50` with `bg-[#FEF8F4]/90 backdrop-blur-md` and `border-b border-[#2C1810]/10`.
- **Branding**: Official BrewLite vector SVG logo with aspect ratio `160:48` (`h-9 md:h-10 w-auto`), linking to `/menu`.
- **Navigation**: Rounded pill links (`Thực đơn` active with `#2C1810`, `Đơn hàng` hoverable).
- **Search & Quick Actions**: Search input with keyboard shortcut pill (`⌘K`), Roastery Bar location selector with pulsating indicator (`animate-pulse`), loyalty points badge (`⭐ 120 điểm`), cart button, and user profile avatar.

#### 2. Hero & Barista Spotlight
- **Roastery Live Strip**: Live status indicator with ripple ping (`animate-ping`), bar address (`124 Le Loi, D1`), wait time badge (`Wait ~4 mins`), and `Change Bar` button.
- **Hero Vignette**: Asymmetrical split (`7 cols` headline & search, `5 cols` spotlight).
- **Barista Spotlight Card**: Aspect ratio `4/3`, `rounded-3xl`, gradient scrim (`from-[#2C1810]/85 via-[#2C1810]/25 to-transparent`), spotlight badge (`Barista Spotlight`), item title `Cà Phê Muối & Salted Sweet Cloud`.
- **Express Filters**: Pill filter row with `All`, `🧊 Iced`, `☕ Hot`, `🌾 Oat`.

#### 3. Food & Drink Cards (Product Grid)
- **Geometry**: `rounded-2xl`, background `#F8F2EE` (Surface Level 1), hover elevation with soft amber shadow (`rgba(44, 24, 16, 0.08)`).
- **Image Container**: `aspect-square`, `rounded-xl`, `overflow-hidden`, zoom effect on hover (`group-hover:scale-105 transition-transform duration-500`).
- **Card Badges**: Top-left tag pill (`Best Seller`, `House Special`, `Dairy-Free`), bottom-right rating pill with star (`★ 4.9`).
- **Temperature Selector**: Tactile toggle pills (`Hot` / `Iced`) with active state `#2C1810` and Oat modifier notes.
- **Price & CTA**: Bold currency in Vietnamese format (`55.000đ`), tactile `Add` button with active scale feedback (`active:scale-95`).

#### 4. Sticky Express Cart Tray (Floating Widget)
- **Position**: `sticky bottom-4 z-40`, constrained to max width `1280px`.
- **Background**: Solid Espresso `#2C1810` with subtle border `#351300` and `backdrop-blur-lg`.
- **Cart Counter**: Tactile badge bouncing on item addition (`id="cartCountBadge"`).
- **CTA**: High-contrast caramel amber button (`bg-[#FEBC85] hover:bg-[#FFDCC2] text-[#78491d]`) with arrow icon (`arrow_forward`).

#### 5. Footer (Roastery Hub & Legal)
- **Background**: `#F8F2EE` with top border `border-[#2C1810]/5` and soft elevation.
- **4-Column Responsive Grid**:
  1. **Brand & Mission**: BrewLite Logo, tactile artisanal coffee mission, `Fresh Micro-Batches Daily` badge.
  2. **Roastery Hours**: Opening hours for Weekdays, Saturday, and Sunday; order ahead policy.
  3. **Cashless Payments**: Cashless notice with badges for Apple Pay, Google Pay, QR MoMo, and Tap Cards.
  4. **The Secret Roast Club**: Newsletter email form with inline `Join` button.
- **Sub-footer**: Copyright statement and links (`Privacy Policy`, `Terms of Pour`, `Barista Portal`).

---

## 4. Image Asset Rules & Canonical Stitch URLs

To ensure pixel-perfect rendering across high-DPI and Retina screens, maintain fixed aspect ratios, `object-fit: cover`, and use high-resolution assets.

### 4.1 Asset Rules
1. **Aspect Ratios**:
   - Drink Cards: Strict `1:1` (`aspect-square`).
   - Hero Spotlight: Strict `4:3` (`aspect-[4/3]`).
   - Logo: Strict `160:48` (`10:3` ratio).
   - User Avatar: `1:1` circular (`rounded-full`).
2. **Retina & High-DPI Resolution**:
   - Image resolution must be at least **2x** the container display size (minimum `w=1200` for grid cards, `w=1600` for Hero Spotlight).
   - Quality parameter must be set to `quality={85}` or `quality={90}`.
   - Use Next.js `<Image />` with `sizes` responsive breakpoints.

### 4.2 Canonical Google Stitch Image Assets

| Component / Item | Canonical Stitch Asset URL | Aspect Ratio | Dimensions |
| :--- | :--- | :--- | :--- |
| **BrewLite Official Logo** | `https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sXzAwMDY1YzVkODE4OWJmNDAwOTM0ZDk0YmE2M2EyYWNjEgsSBxDi9-Oj8gsYAZIBJAoKcHJvamVjdF9pZBIWQhQxMzczNzQ1MTA5NjAwNjA2MTQwMg&filename=&opi=89354086` | 160:48 (SVG) | Scalable |
| **Hero Spotlight** *(Cà Phê Muối & Salted Sweet Cloud)* | `https://lh3.googleusercontent.com/aida-public/AB6AXuAYAWNv7xan_IBhkVnDwTw9ytyeJzEWqGL2xrdQkStMsLr84eJr6AYLJMbTWrqZyFYH3bSYACwcwaM5V8yPF-X64NNkPJWgjZn7qd4UvLYlxz6EmM78WzjqR6R4a-hUXrw-n6SmQ68flgxEqJ3IEME8TTurzNVLddbbUtLO3uTbX859LBRKKkH3y6b3BtoIBFyGKkaxsEGKtncc48Ap-tUAoQnzI4gJzJnuB-KDy0q_9uIEIHQyxT5XQw` | 4:3 | 1600×1200 |
| **1. Caramel Macchiato Reserve** | `https://lh3.googleusercontent.com/aida-public/AB6AXuA_8EBLwt4L_ogs45tFoeX2AschBMIQ_8zY6opY-Eo1aVwHvjo92b6GCbAsFksc6fIQ4iISU3QZEA523zpFBnW20VnhXfqht9V1r6uKbV-Wgo4u45SMg-e59aYqC-6hJT1NPkhN2yznsKQxa-0L2fr56Cpi5lbcNIm_PZiEc_HE9tk-7cjMoEfSd3Ec-wx--HraiLRApcSq3-J9nTz8mOKcZWc6OYrZfdI6lAZWFZ8Xh4C8DzLPdnqgvw` | 1:1 | 1200×1200 |
| **2. Cà Phê Muối (Salt Cream)** | `https://lh3.googleusercontent.com/aida-public/AB6AXuD2JHwtuaag4QucnWVi7Y7MUa97Oa25ednCYpE9HesjYisLJPn52FXu4y9UmqEkp6pj9v-hz_NkYrBcaUDUqZutKdNeQfz44YJudhYnGwN2F2QbQJ4Ew4V6ius1rRiBS2jRq4FcC-eo33ZyRyzgz6qNp5c2b__fcruyRFBrDwysBzRjAXAdBBxq5UqYD6ZYpv2mGBba9Vqto-2K5Co7yBLzDx1WJPfJxGR2T0n0Ywh77dzXjUxPPxdmgw` | 1:1 | 1200×1200 |
| **3. Classic Cà Phê Sữa Đá** | `https://lh3.googleusercontent.com/aida-public/AB6AXuCIZbB44qRVY1pyms6hOvSr9FoI6TNLvTSLrvKivyLo8k7gdRn4qJsmBBo3bGbGlKCEsB8JKZE2_I8ZxbmMjYuk0grsZYxa2ar_y6VY3RRtljQ06oax3w2G9JFc-kSGXM286bXbhzANA_ouqa7FyF3I5WmEOPMSODzvZBS_XK26iw0LuRqi4n9wLTA0rNm7ptRKlDNkhR5nxtCM6nx9o7aPSXMpDjWV22IeQNOOre4wh_HE0i6NzoD_Ig` | 1:1 | 1200×1200 |
| **4. Oat Vanilla Flat White** | `https://lh3.googleusercontent.com/aida-public/AB6AXuCtdVLAuVwn3W30RG7ADA9LppEh84asRJjxxbS8ExVvJ9ePRFhi0xDMPqGcCNR0Xgt4JKw3aqbExtxBy1XnkQIWw9L5cI1T1zMSXxt107TxP2gqhaZ4CdQ9UcHMYTwJl95SKNSII0Khv8LRlqI5MV247TzN6AGA1xwKWT1L_lsra3jdIQvJvp5S3OVk3Fm1dcb4YF8_7WeBmqYWZ-lKdqyrreGxELCBYH9oVVmTUnsXWJrcfjA1k8naHw` | 1:1 | 1200×1200 |
| **5. Uji Ceremonial Matcha** | `https://lh3.googleusercontent.com/aida-public/AB6AXuAiE5Lnsoqr00TOxeH6JbCtiLIMXU53k3x_8dVFtt4DLQoZXZiJt2xGNoH0GatOy9jsGUDKGlrQ5Mgc5FVlK3vnvBUECMo4iv8TNhHguSKQeYkieX3T5CZX31qPygR9_vIPbFPSQRuwO-2ZLbuG1NCPEUot3O9UH8BA9-KUSqcgX6R_OUzMQT5Q76jC6QpGYSLjCdglVawFlWj7_DT_7zFtMHNVAZH094b--RuESwBWmkMEaXRa80wZhA` | 1:1 | 1200×1200 |
| **6. Slow Steep Cold Brew Tonic** | `https://lh3.googleusercontent.com/aida-public/AB6AXuBvi7mwkGjo8B2m4ZEOPwf_W1V5kQW9RKL2IAzXEv-SovTKDzVK0OD3esYCJwXSchv_Auh1G6RvQTVeKrCkQY6bRd-fDxl12w3FI6dvckC4PZkQ0E3Gq38alWt9ALwObNXSoFBNdlwZADsNzJR5PAj2uH3QjCkEIBre66qoBJxTD3aoIM4IZ_FqajrFQ6Ul6fQCmW6cvf86krzVrHWzIW6pge0erDsCSdtHCZ7asAbiQ_33atiaWm1LFQ` | 1:1 | 1200×1200 |
| **7. Pain au Chocolat Artisanal** | `https://lh3.googleusercontent.com/aida-public/AB6AXuBg1Snf5xKAHwsFb3AqGzFsIyAaA6rVyxccMAj32IMZM49P-x3J3U8c5UUydATlynLAV8KkSaPJ0F9UWXYbLTsTgTz8sl8-VBFc_PbXeTgFHeEUGp5i2D_lRhjw7KllS9UmddcRjvmLkRFEsQjjQLqQ2oh-m3miKrt9TZ5t5P5EKq5blQv0spatX_IaiO00YQ6NsYgBn75zcJcigcXh6jiIGtWCAwN5xquUofdDjW2xRW8woBkfpJPbpg` | 1:1 | 1200×1200 |
| **8. Cinnamon Honey Cruffin** | `https://lh3.googleusercontent.com/aida-public/AB6AXuCMz8IYuZoecp2xaPKI20CiinmOzxoESWdFVpAYHSscIdmg0tH_JPyYS5qcemcSUQfY982Pb_3fEc3Bqw3dZwtfhfne_AlsG6wJm0l4aZaxTu0yCpk9hQ_gkqEfWY_mDl63LJM5hTfq8ev3oHht07uMu2gIKcQ2hsoMHCgmqAOGmLrnwqP37rWNrzd6JYQrHPOLCtjL-Ee5NzysLlJ2bcf4TZ8ajcc9tdFm4bKCfrm0po0PFoQE5dAOMQ` | 1:1 | 1200×1200 |
| **Customer Avatar** | `https://lh3.googleusercontent.com/aida/AEtjO1VeNmJ7fNrlOsKRDCp-paWPp28u_ONFRs411sz930XjQrQBNjra7iOYMYqp9QNdUOzQEI29k_s1q2kKn_wZ0WgjjAyP4mxkpxkgDI5Py7jJZYmWHYYkRUyS_U9hoFMK3NpNPt7glbxb2KUa8t-9ECy8_ehEASrNhWWvgJMfTkViWYPA0IwF99vCWCiYJsDIsKPn-wP75woSuq6WiWKsGVB6WNaH7pK7uZvVAq7NzE9VU3TpdCipzqc2kk9t` | 1:1 (Circle) | 400×400 |

### 4.3 High-Resolution Unsplash Retina Fallback CDN Assets

| Component / Item | Unsplash Ultra-HD Asset URL (Retina 2x/3x) | Aspect Ratio |
| :--- | :--- | :--- |
| **Hero Spotlight** | `https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=1600&q=90` | 4:3 |
| **1. Caramel Macchiato** | `https://images.unsplash.com/photo-1485808191679-5f86510681a2?auto=format&fit=crop&w=1200&q=85` | 1:1 |
| **2. Cà Phê Muối** | `https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=1200&q=85` | 1:1 |
| **3. Cà Phê Sữa Đá** | `https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=1200&q=85` | 1:1 |
| **4. Oat Flat White** | `https://images.unsplash.com/photo-1577968897966-3d4325b36b61?auto=format&fit=crop&w=1200&q=85` | 1:1 |
| **5. Uji Matcha** | `https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=1200&q=85` | 1:1 |
| **6. Cold Brew Tonic** | `https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=1200&q=85` | 1:1 |
| **7. Pain au Chocolat** | `https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=1200&q=85` | 1:1 |
| **8. Honey Cruffin** | `https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1200&q=85` | 1:1 |
| **Profile Avatar** | `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=85` | 1:1 |
