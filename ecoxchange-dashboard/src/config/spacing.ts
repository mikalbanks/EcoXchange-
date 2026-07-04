// Spacing & layout tokens (Spec 03). Values consumed via Tailwind utilities;
// this module documents the intended system in one place.
export const spacing = {
  pagePadding: { mobile: "16px", tablet: "24px", desktop: "0" },
  maxContentWidth: "1200px",
  sectionGap: "64px",
  cardGap: "16px",
  cardPadding: { compact: "16px", standard: "20px", spacious: "28px" },
  inputHeight: "44px",
  buttonHeight: { sm: "36px", md: "44px", lg: "52px" },
  // Border radius — BRAND: rectangular/minimal (mirrors tailwind borderRadius).
  radius: {
    none: "0px",
    subtle: "2px",
    soft: "4px",
    pill: "999px",
  },
} as const;
