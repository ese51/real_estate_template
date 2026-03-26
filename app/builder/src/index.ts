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
const WINDOWS_DRIVE_PATH_PATTERN = /^[a-zA-Z]:[\\/]/;
const WINDOWS_ASTRO_BUILD_HEAP_MB = 4096;
const STREET_SUFFIX_TOKENS = new Set([
  'aly',
  'allee',
  'ave',
  'avenue',
  'blvd',
  'boulevard',
  'cir',
  'circle',
  'court',
  'ct',
  'dr',
  'drive',
  'hwy',
  'highway',
  'lane',
  'ln',
  'pkwy',
  'parkway',
  'pl',
  'place',
  'rd',
  'road',
  'st',
  'street',
  'ter',
  'terrace',
  'trl',
  'trail',
  'way',
]);
const UNIT_TOKENS = new Set(['apt', 'apartment', 'bldg', 'building', 'floor', 'fl', 'lot', 'ph', 'ste', 'suite', 'unit']);

function isNonEmptyString(value: Nullable<string>): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function normalizeAscii(raw: string): string {
  return raw
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '');
}

function toAlphanumericTokens(raw: string): string[] {
  const normalized = normalizeAscii(raw).replace(/[^a-z0-9]+/g, ' ').trim();
  return normalized ? normalized.split(/\s+/) : [];
}

function canonicalizeSlugValue(raw: string): string {
  return normalizeAscii(raw).replace(/[^a-z0-9]/g, '');
}

export function deriveBaseSlugFromAddress(address: string): string {
  const streetLine = address.split(',')[0] ?? address;
  const streetTokens = toAlphanumericTokens(streetLine);

  if (streetTokens.length === 0) {
    throw new Error('Unable to derive a valid slug from payload address');
  }

  const [houseNumber, ...remainingTokens] = streetTokens;
  if (!/^\d+[a-z0-9]*$/.test(houseNumber)) {
    throw new Error(`Unable to derive a valid slug from payload address: ${address}`);
  }

  let slugTokens = [...remainingTokens];
  const unitIndex = slugTokens.findIndex((token) => UNIT_TOKENS.has(token));
  if (unitIndex >= 0) {
    slugTokens = slugTokens.slice(0, unitIndex);
  }

  while (slugTokens.length > 1 && STREET_SUFFIX_TOKENS.has(slugTokens[slugTokens.length - 1])) {
    slugTokens.pop();
  }

  const slug = canonicalizeSlugValue(`${houseNumber}${slugTokens.join('')}`);

  if (!slug) {
    throw new Error('Unable to derive a valid slug from payload');
  }

  return slug;
}

function createAddressIdentity(payload: HiveMindListingPayload): string {
  return [
    payload.address,
    payload.city,
    payload.state,
    payload.postal_code,
  ].flatMap((part) => toAlphanumericTokens(String(part))).join('');
}

function createDeterministicSlugSuffix(input: string): string {
  let hash = 2166136261;

  for (const char of input) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(36);
}

async function listExistingPropertyEntries(
  propertiesDir: string
): Promise<Array<{ slug: string; canonicalSlug: string; addressIdentity: string }>> {
  const fileEntries = await fs.readdir(propertiesDir, { withFileTypes: true });
  const jsonFileNames = fileEntries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => entry.name);
  const entries = await Promise.all(
    jsonFileNames.map(async (fileName) => {
      const filePath = path.join(propertiesDir, fileName);
      const raw = await fs.readFile(filePath, 'utf8');
      const parsed = JSON.parse(raw) as {
        meta?: { slug?: string };
        address?: { street?: string; city?: string; state?: string; zip?: string };
      };

      if (!isNonEmptyString(parsed.meta?.slug) || !parsed.address) {
        return null;
      }

      return {
        slug: parsed.meta.slug,
        canonicalSlug: canonicalizeSlugValue(parsed.meta.slug),
        addressIdentity: [
          parsed.address.street,
          parsed.address.city,
          parsed.address.state,
          parsed.address.zip,
        ].flatMap((part) => toAlphanumericTokens(String(part ?? ''))).join(''),
      };
    })
  );

  return entries.filter((entry): entry is { slug: string; canonicalSlug: string; addressIdentity: string } => entry !== null);
}

async function ensureSlug(
  payload: HiveMindListingPayload,
  propertiesDir: string
): Promise<string> {
  const baseSlug = deriveBaseSlugFromAddress(payload.address);
  const addressIdentity = createAddressIdentity(payload);
  const existingEntries = await listExistingPropertyEntries(propertiesDir);
  const conflictingEntries = existingEntries.filter(
    (entry) => entry.canonicalSlug === baseSlug && entry.addressIdentity !== addressIdentity
  );

  if (conflictingEntries.length === 0) {
    return baseSlug;
  }

  const hash = createDeterministicSlugSuffix(addressIdentity);
  const takenSlugs = new Set(
    existingEntries
      .filter((entry) => entry.addressIdentity !== addressIdentity)
      .map((entry) => entry.canonicalSlug)
  );

  for (let suffixLength = 4; suffixLength <= hash.length; suffixLength += 1) {
    const candidate = `${baseSlug}${hash.slice(0, suffixLength)}`;
    if (!takenSlugs.has(candidate)) {
      return candidate;
    }
  }

  throw new Error(`Unable to derive a unique slug for payload address: ${payload.address}`);
}

function detectExtension(source: string, fallback = '.jpg'): string {
  const cleanSource = source.split('?')[0]?.split('#')[0] ?? source;
  const ext = path.extname(cleanSource).toLowerCase();
  if (ext && ext.length <= 5) {
    return ext;
  }
  return fallback;
}

function resolveArtifactFolderPath(artifactFolderPath: string): string {
  const trimmedPath = artifactFolderPath.trim();

  if (process.platform !== 'win32' && WINDOWS_DRIVE_PATH_PATTERN.test(trimmedPath)) {
    throw new Error(`Invalid Windows artifact path on non-Windows host: ${trimmedPath}`);
  }

  return path.resolve(trimmedPath);
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function resetDirectory(dirPath: string): Promise<void> {
  await fs.rm(dirPath, { recursive: true, force: true });
  await fs.mkdir(dirPath, { recursive: true });
}

async function preparePropertyJsonPath(filePath: string, force: boolean): Promise<void> {
  const exists = await pathExists(filePath);
  if (!exists) {
    return;
  }

  if (!force) {
    throw new Error(
      `Property JSON conflict: existing file already exists for this slug. Re-run with force_rebuild=true to replace it: ${filePath}`
    );
  }

  await fs.rm(filePath, { force: true });
}

async function prepareListingImagesDirectory(dirPath: string, force: boolean): Promise<void> {
  const exists = await pathExists(dirPath);
  if (!exists) {
    await fs.mkdir(dirPath, { recursive: true });
    return;
  }

  if (!force) {
    throw new Error(
      `Listing image directory conflict: existing image directory already exists for this slug. Re-run with force_rebuild=true to replace it: ${dirPath}`
    );
  }

  await resetDirectory(dirPath);
}

async function prepareArtifactDirectory(dirPath: string, force: boolean): Promise<void> {
  const exists = await pathExists(dirPath);
  if (!exists) {
    await fs.mkdir(dirPath, { recursive: true });
    return;
  }

  if (!force) {
    throw new Error(
      `Artifact directory conflict: existing artifact output directory already exists. Re-run with force_rebuild=true to replace it: ${dirPath}`
    );
  }

  await resetDirectory(dirPath);
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
  await prepareArtifactDirectory(artifactFolderPath, force);

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

type BuildDiagnosticInput = {
  slug: string;
  propertyJsonPath: string;
  listingImages: ResolvedImage[];
};

function applyBuildNodeOptions(existingNodeOptions: string | undefined): string | undefined {
  const trimmed = existingNodeOptions?.trim();

  if (process.platform !== 'win32') {
    return trimmed || undefined;
  }

  if (trimmed?.includes('--max-old-space-size=')) {
    return trimmed;
  }

  return trimmed
    ? `${trimmed} --max-old-space-size=${WINDOWS_ASTRO_BUILD_HEAP_MB}`
    : `--max-old-space-size=${WINDOWS_ASTRO_BUILD_HEAP_MB}`;
}

async function summarizeResolvedImages(images: ResolvedImage[]): Promise<{
  count: number;
  totalBytes: number;
  largestImages: Array<{ path: string; bytes: number }>;
}> {
  const fileSizes = await Promise.all(
    images.map(async (image) => {
      const stats = await fs.stat(image.diskPath);
      return {
        path: image.diskPath,
        bytes: stats.size,
      };
    })
  );

  const largestImages = [...fileSizes]
    .sort((left, right) => right.bytes - left.bytes)
    .slice(0, 3);

  return {
    count: fileSizes.length,
    totalBytes: fileSizes.reduce((sum, entry) => sum + entry.bytes, 0),
    largestImages,
  };
}

async function runAppBuild(appDir: string, input: BuildDiagnosticInput): Promise<void> {
  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const commandArgs = ['run', 'build'];
  const nodeOptions = applyBuildNodeOptions(process.env.NODE_OPTIONS);
  const propertyJsonStats = await fs.stat(input.propertyJsonPath);
  const imageSummary = await summarizeResolvedImages(input.listingImages);

  process.stderr.write(
    `[builder] Astro build diagnostics: ${JSON.stringify({
      cwd: appDir,
      command: [npmCommand, ...commandArgs].join(' '),
      node_options: nodeOptions ?? null,
      slug: input.slug,
      property_json_path: input.propertyJsonPath,
      property_json_bytes: propertyJsonStats.size,
      listing_image_count: imageSummary.count,
      listing_image_total_bytes: imageSummary.totalBytes,
      largest_listing_images: imageSummary.largestImages,
    })}\n`
  );

  const result = spawnSync(npmCommand, ['run', 'build'], {
    cwd: appDir,
    encoding: 'utf8',
    env: {
      ...process.env,
      ...(nodeOptions ? { NODE_OPTIONS: nodeOptions } : {}),
    },
    shell: process.platform === 'win32',
    windowsHide: true,
  });

  if (typeof result.stdout === 'string' && result.stdout.length > 0) {
    process.stderr.write(result.stdout);
  }

  if (typeof result.stderr === 'string' && result.stderr.length > 0) {
    process.stderr.write(result.stderr);
  }

  if (result.error) {
    throw new Error(`Astro process launch failure: ${result.error.message}`);
  }

  if (result.status !== 0) {
    const signalSuffix = result.signal ? ` (signal: ${result.signal})` : '';
    throw new Error(
      `Astro process exited non-zero: exit code ${result.status ?? 'unknown'}${signalSuffix}`
    );
  }
}

export async function build_site_from_listing(
  payload: HiveMindListingPayload,
  template: string | null = null,
  force_rebuild = false
): Promise<BuildSiteResult> {
  const selectedTemplate = getTemplateDefinition(template);
  validatePayloadForTemplate(payload, selectedTemplate);
  const resolvedArtifactFolderPath = isNonEmptyString(payload.artifact_folder_path)
    ? resolveArtifactFolderPath(payload.artifact_folder_path)
    : null;

  const paths = getTemplatePaths();
  const slug = await ensureSlug(payload, paths.properties_dir);
  const propertyJsonPath = path.join(paths.properties_dir, `${slug}.json`);
  const listingImagesDir = path.join(paths.listing_images_dir, slug);
  const listingImages = buildListingImages(slug, payload.image_urls, paths.listing_images_dir);

  await preparePropertyJsonPath(propertyJsonPath, force_rebuild);
  await prepareListingImagesDirectory(listingImagesDir, force_rebuild);
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

  await runAppBuild(paths.app_dir, {
    slug,
    propertyJsonPath,
    listingImages,
  });

  const builtRoutePath = path.join(
    paths.dist_dir,
    selectedTemplate.output_behavior.route_path(slug).replace(/^\/+/, ''),
    'index.html'
  );

  if (!await pathExists(builtRoutePath)) {
    throw new Error(
      `Post-build route missing: Astro build completed but expected route was not generated: ${builtRoutePath}`
    );
  }

  if (resolvedArtifactFolderPath) {
    const artifactFiles = await stageArtifact(
      slug,
      resolvedArtifactFolderPath,
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
