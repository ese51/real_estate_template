import { promises as fs } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { getTemplateDefinition, getTemplatePaths } from './registry';
import type {
  BuildSiteResult,
  HiveMindListingPayload,
  ResolvedImage,
  TemplateDefinition,
} from './types';

type Nullable<T> = T | null | undefined;

function isNonEmptyString(value: Nullable<string>): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function sanitizeSlug(raw: string): string {
  const slug = raw
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

  if (!slug) {
    throw new Error('Unable to derive a valid slug from payload');
  }

  return slug;
}

function ensureSlug(payload: HiveMindListingPayload): string {
  if (isNonEmptyString(payload.slug)) {
    return sanitizeSlug(payload.slug);
  }

  return sanitizeSlug(
    `${payload.address}-${payload.city}-${payload.state}-${payload.postal_code}`
  );
}

function detectExtension(source: string, fallback = '.jpg'): string {
  const cleanSource = source.split('?')[0]?.split('#')[0] ?? source;
  const ext = path.extname(cleanSource).toLowerCase();
  if (ext && ext.length <= 5) {
    return ext;
  }
  return fallback;
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function ensureEmptyDirectory(dirPath: string, force: boolean): Promise<void> {
  const exists = await pathExists(dirPath);
  if (!exists) {
    await fs.mkdir(dirPath, { recursive: true });
    return;
  }

  if (!force) {
    throw new Error(`Refusing to overwrite existing directory without force_rebuild: ${dirPath}`);
  }

  await fs.rm(dirPath, { recursive: true, force: true });
  await fs.mkdir(dirPath, { recursive: true });
}

async function ensureFileWritable(filePath: string, force: boolean): Promise<void> {
  const exists = await pathExists(filePath);
  if (exists && !force) {
    throw new Error(`Refusing to overwrite existing file without force_rebuild: ${filePath}`);
  }

  if (exists && force) {
    await fs.rm(filePath, { force: true });
  }
}

function isRemoteUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function isFileUrl(value: string): boolean {
  return /^file:\/\//i.test(value);
}

async function copyOrDownloadFile(source: string, destination: string): Promise<void> {
  if (isRemoteUrl(source)) {
    const response = await fetch(source);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${source} (${response.status})`);
    }

    const arrayBuffer = await response.arrayBuffer();
    await fs.writeFile(destination, Buffer.from(arrayBuffer));
    return;
  }

  const localPath = isFileUrl(source) ? new URL(source) : path.resolve(source);
  await fs.copyFile(localPath, destination);
}

function buildListingImages(
  slug: string,
  imageUrls: string[],
  publicImagesDir: string
): ResolvedImage[] {
  return imageUrls.map((source, index) => {
    const ext = detectExtension(source);
    const destinationFileName = `listing-${String(index + 1).padStart(2, '0')}${ext}`;
    const diskPath = path.join(publicImagesDir, slug, destinationFileName);

    return {
      source,
      destinationFileName,
      publicPath: `/images/${slug}/${destinationFileName}`,
      diskPath,
    };
  });
}

function validatePayloadForTemplate(
  payload: HiveMindListingPayload,
  template: TemplateDefinition
): void {
  for (const field of template.payload_requirements.required_fields) {
    const value = payload[field];
    if (field === 'image_urls') {
      if (!Array.isArray(value) || value.length < template.payload_requirements.image_expectations.min_listing_images) {
        throw new Error(`Template "${template.id}" requires at least ${template.payload_requirements.image_expectations.min_listing_images} listing image(s)`);
      }
      continue;
    }

    if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
      throw new Error(`Template "${template.id}" requires payload field "${field}"`);
    }
  }
}

async function copyTree(sourcePath: string, destinationPath: string): Promise<string[]> {
  const stats = await fs.stat(sourcePath);
  if (stats.isFile()) {
    await fs.mkdir(path.dirname(destinationPath), { recursive: true });
    await fs.copyFile(sourcePath, destinationPath);
    return [destinationPath];
  }

  await fs.mkdir(destinationPath, { recursive: true });
  const written: string[] = [];
  const entries = await fs.readdir(sourcePath, { withFileTypes: true });

  for (const entry of entries) {
    const from = path.join(sourcePath, entry.name);
    const to = path.join(destinationPath, entry.name);

    if (entry.isDirectory()) {
      written.push(...await copyTree(from, to));
    } else {
      await fs.copyFile(from, to);
      written.push(to);
    }
  }

  return written;
}

async function stageArtifact(
  slug: string,
  artifactFolderPath: string,
  force: boolean,
  template: TemplateDefinition,
  appDir: string,
  distDir: string
): Promise<string[]> {
  await ensureEmptyDirectory(artifactFolderPath, force);

  const written: string[] = [];
  for (const entry of template.output_behavior.artifact_entries) {
    const sourcePath = entry.from(appDir, distDir, slug);
    if (!await pathExists(sourcePath)) {
      continue;
    }

    const destinationPath = entry.to === '.'
      ? artifactFolderPath
      : path.join(artifactFolderPath, entry.to);

    written.push(...await copyTree(sourcePath, destinationPath));
  }

  return written;
}

function runAppBuild(appDir: string): void {
  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const result = spawnSync(npmCommand, ['run', 'build'], {
    cwd: appDir,
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    throw new Error(`Astro build failed with exit code ${result.status ?? 'unknown'}`);
  }
}

export async function build_site_from_listing(
  payload: HiveMindListingPayload,
  template: string | null = null,
  force_rebuild = false
): Promise<BuildSiteResult> {
  const selectedTemplate = getTemplateDefinition(template);
  validatePayloadForTemplate(payload, selectedTemplate);

  const paths = getTemplatePaths();
  const slug = ensureSlug(payload);
  const propertyJsonPath = path.join(paths.properties_dir, `${slug}.json`);
  const listingImagesDir = path.join(paths.listing_images_dir, slug);
  const listingImages = buildListingImages(slug, payload.image_urls, paths.listing_images_dir);

  await ensureFileWritable(propertyJsonPath, force_rebuild);
  await ensureEmptyDirectory(listingImagesDir, force_rebuild);
  await fs.mkdir(paths.agent_images_dir, { recursive: true });

  const writtenFiles: string[] = [];

  for (const image of listingImages) {
    await copyOrDownloadFile(image.source, image.diskPath);
    writtenFiles.push(image.diskPath);
  }

  let agentImagePublicPath: string | undefined;
  const agentImageSource = [
    payload.agent_image_url,
    typeof payload.listing_agent === 'object' && payload.listing_agent
      ? payload.listing_agent.image_url ?? payload.listing_agent.photo_url ?? payload.listing_agent.photo ?? payload.listing_agent.image
      : undefined,
  ].find(isNonEmptyString);

  if (agentImageSource && selectedTemplate.payload_requirements.image_expectations.supports_agent_image) {
    const ext = detectExtension(agentImageSource, '.jpg');
    const destinationFileName = `${slug}-agent${ext}`;
    const destinationPath = path.join(paths.agent_images_dir, destinationFileName);
    await copyOrDownloadFile(agentImageSource, destinationPath);
    writtenFiles.push(destinationPath);
    agentImagePublicPath = `/images/agents/${destinationFileName}`;
  }

  const templateData = selectedTemplate.map_payload_to_template_data({
    payload: {
      ...payload,
      slug,
    },
    slug,
    listingImages,
    agentImagePublicPath,
  });

  await fs.writeFile(propertyJsonPath, `${JSON.stringify(templateData, null, 2)}\n`, 'utf8');
  writtenFiles.push(propertyJsonPath);

  runAppBuild(paths.app_dir);

  if (isNonEmptyString(payload.artifact_folder_path)) {
    const artifactFiles = await stageArtifact(
      slug,
      path.resolve(payload.artifact_folder_path),
      force_rebuild,
      selectedTemplate,
      paths.app_dir,
      paths.dist_dir
    );
    writtenFiles.push(...artifactFiles);
  }

  return {
    slug,
    template_id: selectedTemplate.id,
    dist_dir: paths.dist_dir,
    route_path: selectedTemplate.output_behavior.route_path(slug),
    files_written: writtenFiles,
  };
}

export { templateRegistry, defaultTemplate } from './registry';
export type {
  BuildSiteResult,
  HiveMindListingPayload,
  ListingAgentPayload,
  TemplateDefinition,
} from './types';

export default build_site_from_listing;
