const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');

const appDir = path.resolve(__dirname, '../..');
const repoRoot = path.resolve(appDir, '..');
const { build_site_from_listing } = require(path.join(appDir, 'builder/dist/index.js'));

function makeSlug(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function makePayload(slug, artifactFolderPath) {
  return {
    address: '501 Builder Test Lane',
    city: 'Arlington',
    state: 'VA',
    postal_code: '22207',
    price: 1234567,
    bedrooms: 4,
    bathrooms: 3.5,
    square_feet: 4321,
    listing_agent: {
      name: 'Builder Test Agent',
      email: 'agent@example.com',
      phone: '(703) 555-0101',
    },
    brokerage: 'HiveMind Realty',
    description: 'Builder regression test listing.',
    image_urls: [
      path.join(appDir, 'public/images/11940river/exterior-front.jpg'),
      path.join(appDir, 'public/images/11940river/living-1.jpg'),
    ],
    source_url: 'https://example.com/test-listing',
    artifact_folder_path: artifactFolderPath,
    slug,
  };
}

async function cleanupSlug(slug, artifactFolderPath) {
  await Promise.all([
    fs.rm(path.join(appDir, 'src/data/properties', `${slug}.json`), { force: true }),
    fs.rm(path.join(appDir, 'public/images', slug), { recursive: true, force: true }),
    fs.rm(path.join(appDir, 'dist', slug), { recursive: true, force: true }),
    fs.rm(path.join(appDir, 'dist/images', slug), { recursive: true, force: true }),
    artifactFolderPath ? fs.rm(artifactFolderPath, { recursive: true, force: true }) : Promise.resolve(),
  ]);
}

test('builder writes a new property JSON and build includes the slug route', async () => {
  const slug = makeSlug('builder-test');
  const artifactFolderPath = await fs.mkdtemp(path.join(os.tmpdir(), `${slug}-artifact-`));
  const payload = makePayload(slug, artifactFolderPath);

  try {
    const result = await build_site_from_listing(payload, null, true);
    const jsonPath = path.join(appDir, 'src/data/properties', `${slug}.json`);
    const routePath = path.join(appDir, 'dist', slug, 'index.html');

    assert.equal(result.slug, slug);
    assert.equal(result.template_id, 'real-estate-template');
    assert.equal(result.route_path, `/${slug}`);

    const writtenJson = JSON.parse(await fs.readFile(jsonPath, 'utf8'));
    assert.equal(writtenJson.meta.slug, slug);
    assert.equal(writtenJson.address.street, payload.address);

    await fs.access(routePath);
    await fs.access(path.join(artifactFolderPath, 'index.html'));
  } finally {
    await cleanupSlug(slug, artifactFolderPath);
  }
});

test('builder CLI returns success when the built route exists', async () => {
  const slug = makeSlug('builder-cli-test');
  const artifactFolderPath = await fs.mkdtemp(path.join(os.tmpdir(), `${slug}-artifact-`));
  const payload = makePayload(slug, artifactFolderPath);
  const payloadPath = path.join(os.tmpdir(), `${slug}.json`);

  try {
    await fs.writeFile(payloadPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

    const result = spawnSync(
      process.execPath,
      [path.join(appDir, 'builder/dist/cli.js'), '--payload', payloadPath, '--force-rebuild'],
      {
        cwd: appDir,
        encoding: 'utf8',
      }
    );

    assert.equal(result.status, 0, result.stderr || result.stdout);

    const output = JSON.parse(result.stdout);
    assert.equal(output.slug, slug);
    assert.equal(output.template_id, 'real-estate-template');

    await fs.access(path.join(appDir, 'dist', slug, 'index.html'));
  } finally {
    await cleanupSlug(slug, artifactFolderPath);
    await fs.rm(payloadPath, { force: true });
  }
});
