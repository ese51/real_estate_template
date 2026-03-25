import path from 'node:path';
import { realEstateTemplateDefinition } from './templates/real-estate-template';
import type { TemplateDefinition, TemplatePaths } from './types';

const APP_DIR = path.resolve(__dirname, '../..');
const DIST_DIR = path.join(APP_DIR, 'dist');

export const templateRegistry: TemplateDefinition[] = [
  realEstateTemplateDefinition,
];

export const defaultTemplate =
  templateRegistry.find((template) => template.is_default) ?? templateRegistry[0];

export function getTemplateDefinition(templateId?: string | null): TemplateDefinition {
  if (!templateId) {
    return defaultTemplate;
  }

  const template = templateRegistry.find((candidate) => candidate.id === templateId);
  if (!template) {
    throw new Error(`Unknown template "${templateId}". Registered templates: ${templateRegistry.map((candidate) => candidate.id).join(', ')}`);
  }

  return template;
}

export function getTemplatePaths(): TemplatePaths {
  return {
    app_dir: APP_DIR,
    properties_dir: path.join(APP_DIR, 'src/data/properties'),
    listing_images_dir: path.join(APP_DIR, 'public/images'),
    agent_images_dir: path.join(APP_DIR, 'public/images/agents'),
    dist_dir: DIST_DIR,
  };
}
