import { promises as fs } from 'node:fs';
import path from 'node:path';
import { build_site_from_listing, type HiveMindListingPayload } from './index';

function parseArgs(argv: string[]): {
  payloadPath?: string;
  template?: string;
  forceRebuild: boolean;
} {
  const args = {
    forceRebuild: false,
  } as {
    payloadPath?: string;
    template?: string;
    forceRebuild: boolean;
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--payload') {
      args.payloadPath = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === '--template') {
      args.template = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === '--force-rebuild') {
      args.forceRebuild = true;
      continue;
    }
  }

  return args;
}

async function main(): Promise<void> {
  const { payloadPath, template, forceRebuild } = parseArgs(process.argv.slice(2));

  if (!payloadPath) {
    throw new Error('Usage: npm run builder -- --payload /absolute/or/relative/path/to/listing.json [--force-rebuild]');
  }

  const resolvedPayloadPath = path.resolve(payloadPath);
  const raw = await fs.readFile(resolvedPayloadPath, 'utf8');
  const payload = JSON.parse(raw) as HiveMindListingPayload;

  const result = await build_site_from_listing(payload, template ?? null, forceRebuild);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
