const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');

const appDir = path.resolve(__dirname, '../..');
const repoRoot = path.resolve(appDir, '..');
const {
  build_site_from_listing,
  deriveBaseSlugFromAddress,
} = require(path.join(appDir, 'builder/dist/index.js'));

function makePayload(overrides = {}, artifactFolderPath = null) {
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
    slug: null,
    ...overrides,
  };
}

function makeArtifactRoot(label) {
  return fs.mkdtemp(path.join(os.tmpdir(), `${label}-artifact-`));
}

function makeAddressIdentity(payload) {
  return [
    payload.address,
    payload.city,
    payload.state,
    payload.postal_code,
  ]
    .join(' ')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '');
}

function expectedCollisionSlug(payload) {
  const baseSlug = deriveBaseSlugFromAddress(payload.address);
  const addressIdentity = makeAddressIdentity(payload);
  let hash = 2166136261;

  for (const char of addressIdentity) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }

  return `${baseSlug}${(hash >>> 0).toString(36).slice(0, 4)}`;
}

async function listRelativeFiles(dirPath) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      const nestedFiles = await listRelativeFiles(fullPath);
      for (const nestedFile of nestedFiles) {
        files.push(path.join(entry.name, nestedFile));
      }
      continue;
    }

    files.push(entry.name);
  }

  return files.sort();
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
  const payload = makePayload({
    address: '4410 Builder Ridge Rd',
    city: 'Potomac',
    state: 'MD',
    postal_code: '20854',
  });
  const slug = '4410builderridge';
  const artifactRoot = await makeArtifactRoot(slug);
  const artifactFolderPath = path.join(artifactRoot, 'site');
  payload.artifact_folder_path = artifactFolderPath;

  try {
    const result = await build_site_from_listing(payload, null, false);
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
    await fs.rm(artifactRoot, { recursive: true, force: true });
  }
});

test('builder rejects Windows artifact paths on non-Windows hosts before creating repo folders', async () => {
  if (process.platform === 'win32') {
    return;
  }

  const payload = makePayload({
    address: '4410 Builder Regression Ln',
    city: 'Arlington',
    state: 'VA',
    postal_code: '22207',
  });
  const slug = deriveBaseSlugFromAddress(payload.address);
  const windowsArtifactPath = 'D:\\hivebrain\\real_estate_monitoring\\artifacts\\9250-persimmon-tree-rd-potomac-md';
  payload.artifact_folder_path = windowsArtifactPath;
  const accidentalRepoPath = path.join(repoRoot, windowsArtifactPath);

  try {
    await assert.rejects(
      build_site_from_listing(payload, null, false),
      /Invalid Windows artifact path on non-Windows host: D:\\hivebrain\\real_estate_monitoring\\artifacts\\9250-persimmon-tree-rd-potomac-md/
    );

    await assert.rejects(fs.access(accidentalRepoPath));
    await assert.rejects(
      fs.access(path.join(appDir, 'src/data/properties', `${slug}.json`))
    );
  } finally {
    await cleanupSlug(slug, null);
    await fs.rm(accidentalRepoPath, { recursive: true, force: true });
  }
});

test('builder force_rebuild replaces prior slug outputs on repeated builds', async () => {
  const firstPayload = makePayload({
    address: '1617 N Wakefield St',
    city: 'Arlington',
    state: 'VA',
    postal_code: '22207',
  });
  const slug = '1617nwakefield';
  const artifactRoot = await makeArtifactRoot(slug);
  const artifactFolderPath = path.join(artifactRoot, 'site');
  const secondPayload = {
    ...makePayload({
      address: '1617 N Wakefield St',
      city: 'Arlington',
      state: 'VA',
      postal_code: '22207',
    }, artifactFolderPath),
    description: 'Second build payload that should replace prior outputs.',
    image_urls: [
      path.join(appDir, 'public/images/11940river/entry-1.jpg'),
    ],
  };
  firstPayload.artifact_folder_path = artifactFolderPath;

  try {
    await build_site_from_listing(firstPayload, null, false);

    const jsonPath = path.join(appDir, 'src/data/properties', `${slug}.json`);
    const listingImagesDir = path.join(appDir, 'public/images', slug);
    const routePath = path.join(appDir, 'dist', slug, 'index.html');

    await fs.writeFile(jsonPath, '{"stale":true}\n', 'utf8');
    await fs.writeFile(path.join(listingImagesDir, 'stale-file.txt'), 'stale\n', 'utf8');
    await fs.writeFile(path.join(artifactFolderPath, 'stale-artifact.txt'), 'stale\n', 'utf8');

    const result = await build_site_from_listing(secondPayload, null, true);

    assert.equal(result.slug, slug);
    assert.equal(result.template_id, 'real-estate-template');

    const rebuiltJson = JSON.parse(await fs.readFile(jsonPath, 'utf8'));
    assert.equal(rebuiltJson.address.street, secondPayload.address);
    assert.match(rebuiltJson.description, /Second build payload/);

    const imageFiles = await listRelativeFiles(listingImagesDir);
    assert.deepEqual(imageFiles, ['listing-01.jpg']);

    const artifactFiles = await listRelativeFiles(artifactFolderPath);
    assert.ok(artifactFiles.includes('index.html'));
    assert.ok(!artifactFiles.includes('stale-artifact.txt'));

    await assert.rejects(
      fs.access(path.join(listingImagesDir, 'stale-file.txt'))
    );

    await fs.access(routePath);
  } finally {
    await cleanupSlug(slug, artifactFolderPath);
    await fs.rm(artifactRoot, { recursive: true, force: true });
  }
});

test('builder CLI returns success when the built route exists', async () => {
  const payload = makePayload({
    address: '11941 River Rd',
    city: 'Potomac',
    state: 'MD',
    postal_code: '20854',
  });
  const slug = '11941river';
  const artifactRoot = await makeArtifactRoot('builder-cli-test');
  const artifactFolderPath = path.join(artifactRoot, 'site');
  payload.artifact_folder_path = artifactFolderPath;
  const payloadPath = path.join(os.tmpdir(), `${slug}-${Date.now()}.json`);

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
    await fs.rm(artifactRoot, { recursive: true, force: true });
    await fs.rm(payloadPath, { force: true });
  }
});

test('compact slug derivation matches canonical route format examples', () => {
  assert.equal(deriveBaseSlugFromAddress('9250 Persimmon Tree Rd, Potomac, MD'), '9250persimmontree');
  assert.equal(deriveBaseSlugFromAddress('11940 River Rd, Potomac, MD'), '11940river');
  assert.equal(deriveBaseSlugFromAddress('1615 N Wakefield St, Arlington, VA'), '1615nwakefield');
});

test('builder adds deterministic fallback only when compact slug collides', async () => {
  const firstPayload = makePayload({
    address: '500 Main Rd',
    city: 'Arlington',
    state: 'VA',
    postal_code: '22207',
  });
  const secondPayload = makePayload({
    address: '500 Main Ct',
    city: 'Arlington',
    state: 'VA',
    postal_code: '22207',
  });
  const artifactRoot = await makeArtifactRoot('builder-collision-test');
  const firstArtifactFolderPath = path.join(artifactRoot, 'site-a');
  const secondArtifactFolderPath = path.join(artifactRoot, 'site-b');
  firstPayload.artifact_folder_path = firstArtifactFolderPath;
  secondPayload.artifact_folder_path = secondArtifactFolderPath;

  try {
    const firstResult = await build_site_from_listing(firstPayload, null, false);
    const secondResult = await build_site_from_listing(secondPayload, null, false);

    assert.equal(firstResult.slug, '500main');
    assert.equal(secondResult.slug, expectedCollisionSlug(secondPayload));
    assert.match(secondResult.slug, /^500main[0-9a-z]{4}$/);

    const secondRebuild = await build_site_from_listing(secondPayload, null, true);
    assert.equal(secondRebuild.slug, secondResult.slug);
  } finally {
    await cleanupSlug('500main', firstArtifactFolderPath);
    await cleanupSlug(expectedCollisionSlug(secondPayload), secondArtifactFolderPath);
    await fs.rm(artifactRoot, { recursive: true, force: true });
  }
});
