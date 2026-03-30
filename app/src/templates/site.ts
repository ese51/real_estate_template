export const SITE_TEMPLATE_IDS = ['classic', 'modern', 'bold', 'lifestyle'] as const;

export type SiteTemplateId = (typeof SITE_TEMPLATE_IDS)[number];

export interface SiteTemplateDefinition {
  id: SiteTemplateId;
  label: string;
}

export const siteTemplates: SiteTemplateDefinition[] = [
  { id: 'classic', label: 'Template 1 / Classic' },
  { id: 'modern', label: 'Template 2 / Modern' },
  { id: 'bold', label: 'Template 3 / Bold' },
  { id: 'lifestyle', label: 'Template 4 / Lifestyle' },
];

export const defaultSiteTemplateId: SiteTemplateId = 'classic';

export function isSiteTemplateId(value: string | null | undefined): value is SiteTemplateId {
  return SITE_TEMPLATE_IDS.includes(value as SiteTemplateId);
}

export function resolveSiteTemplateId(property: { meta?: { template?: string | null } }): SiteTemplateId {
  return isSiteTemplateId(property.meta.template)
    ? property.meta.template
    : defaultSiteTemplateId;
}
