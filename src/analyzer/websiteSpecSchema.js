import { z } from 'zod';

export const NavLinkSchema = z.union([
  z.string(),
  z.object({
    label: z.string(),
    href: z.string().optional()
  })
]);

export const SectionItemSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  icon: z.string().optional(),
  price: z.string().optional(),
  badge: z.string().optional(),
  image: z.string().optional()
});

export const SectionButtonSchema = z.object({
  text: z.string(),
  primary: z.boolean().optional(),
  variant: z.string().optional()
});

export const SectionSchema = z.object({
  id: z.string(),
  type: z.string(), // "hero", "features", "about", "pricing", "cards", "cta", "footer", "content", "custom"
  heading: z.string().optional(),
  subheading: z.string().optional(),
  content: z.string().optional(),
  items: z.array(SectionItemSchema).optional(),
  buttons: z.array(SectionButtonSchema).optional(),
  copyright: z.string().optional(),
  links: z.array(z.string()).optional()
});

export const AssetSchema = z.object({
  url: z.string().optional(),
  src: z.string().optional(),
  alt: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional()
});

export const WebsiteSpecSchema = z.object({
  metadata: z.object({
    title: z.string().catch('Website Clone'),
    description: z.string().optional().catch(''),
    originalUrl: z.string().optional().catch(''),
    viewport: z.string().optional().catch('width=device-width, initial-scale=1.0')
  }),
  theme: z.object({
    primaryColor: z.string().catch('#6366f1'),
    secondaryColor: z.string().optional().catch('#a855f7'),
    backgroundColor: z.string().catch('#0f172a'),
    textColor: z.string().catch('#f8fafc'),
    fontFamily: z.string().catch('Inter, sans-serif'),
    borderRadius: z.string().catch('8px')
  }),
  navigation: z.object({
    brandName: z.string().catch('Brand'),
    brandLogoUrl: z.string().optional(),
    links: z.array(NavLinkSchema).catch([]),
    ctaButton: z.object({
      text: z.string(),
      variant: z.string().optional()
    }).optional()
  }),
  sections: z.array(SectionSchema).min(1, "At least one section is required"),
  assets: z.array(AssetSchema).optional().catch([]),
  responsive: z.object({
    mobileNavType: z.string().optional().catch('hamburger'),
    gridColumnsDesktop: z.number().optional().catch(3),
    gridColumnsMobile: z.number().optional().catch(1)
  }).optional()
});
