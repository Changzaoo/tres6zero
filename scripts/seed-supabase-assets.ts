import { Buffer } from 'node:buffer';
import { GENERATED_ANIMATED_TEMPLATE_CATALOG_SIZE, buildGeneratedAnimatedTemplates, renderAnimatedTemplateWebm } from '../apps/server/src/services/generatedAnimatedTemplates';
import { buildGeneratedMusic, buildPublicLibraryMusic, renderMusicWav } from '../apps/server/src/services/generatedMusic';
import { GENERATED_TEMPLATE_CATALOG_SIZE, buildGeneratedTemplates, renderTemplatePng } from '../apps/server/src/services/generatedTemplates';
import { ensurePublicBucket, getSupabase, publicUrl, SUPABASE_BUCKETS, uploadBufferToSupabase } from '../apps/server/src/services/supabaseStorage';

const DEFAULT_ANIMATED_TOTAL = GENERATED_ANIMATED_TEMPLATE_CATALOG_SIZE;

type Args = {
  mode: 'static' | 'animated' | 'music' | 'verify';
  offset: number;
  count: number;
  animatedTotal: number;
  musicCount: number;
  concurrency: number;
};

function argValue(name: string) {
  const prefix = `--${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function numberArg(name: string, fallback: number) {
  const raw = argValue(name);
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`INVALID_${name.toUpperCase()}`);
  }
  return Math.floor(value);
}

function args(): Args {
  const rawMode = argValue('mode') || 'verify';
  if (!['static', 'animated', 'music', 'verify'].includes(rawMode)) {
    throw new Error('INVALID_MODE');
  }

  return {
    mode: rawMode as Args['mode'],
    offset: numberArg('offset', 0),
    count: numberArg('count', rawMode === 'animated' ? DEFAULT_ANIMATED_TOTAL : GENERATED_TEMPLATE_CATALOG_SIZE),
    animatedTotal: numberArg('animated-total', DEFAULT_ANIMATED_TOTAL),
    musicCount: numberArg('music-count', 72),
    concurrency: Math.max(1, Math.min(8, numberArg('concurrency', rawMode === 'static' ? 4 : 1))),
  };
}

function assertNoSvgText(svg?: string) {
  if (svg && /<text\b/i.test(svg)) {
    throw new Error('TEXT_FOUND_IN_TEMPLATE_SVG');
  }
}

async function ensureBuckets() {
  await ensurePublicBucket(SUPABASE_BUCKETS.projectTemplates);
  await ensurePublicBucket(SUPABASE_BUCKETS.projectMusic);
  await ensurePublicBucket(SUPABASE_BUCKETS.userTemplates);
  await ensurePublicBucket(SUPABASE_BUCKETS.userMusic);
}

async function mapConcurrent<T>(items: T[], concurrency: number, handler: (item: T, index: number) => Promise<void>) {
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      await handler(items[index], index);
    }
  }));
}

async function seedStatic(offset: number, count: number, concurrency: number) {
  await ensureBuckets();
  const templates = buildGeneratedTemplates(count, offset, { includeSvg: true, includeDataUrl: false });
  let uploaded = 0;

  await mapConcurrent(templates, concurrency, async (template) => {
    assertNoSvgText(template.svg);
    await uploadBufferToSupabase({
      bucket: SUPABASE_BUCKETS.projectTemplates,
      prefix: `generated/${template.category}`,
      fileName: `${template.id}.png`,
      fallbackExt: '.png',
      buffer: await renderTemplatePng(template.svg),
      contentType: 'image/png',
      objectPath: template.storagePath,
      upsert: true,
    });
    uploaded += 1;
    if (uploaded % 25 === 0 || uploaded === templates.length) {
      console.log(`static ${uploaded}/${templates.length}`);
    }
  });

  console.log(JSON.stringify({ ok: true, mode: 'static', offset, count: templates.length, concurrency }));
}

async function seedAnimated(offset: number, count: number, animatedTotal: number) {
  await ensureBuckets();
  const templates = buildGeneratedAnimatedTemplates(animatedTotal, 0, { includeSvg: true, includeDataUrl: false })
    .slice(offset, offset + count);
  let uploaded = 0;

  await mapConcurrent(templates, 2, async (template) => {
    assertNoSvgText(template.svg);
    await uploadBufferToSupabase({
      bucket: SUPABASE_BUCKETS.projectTemplates,
      prefix: `animated/${template.category}`,
      fileName: `${template.id}.webm`,
      fallbackExt: '.webm',
      buffer: await renderAnimatedTemplateWebm(template),
      contentType: 'video/webm',
      objectPath: template.animationStoragePath,
      upsert: true,
    });
    uploaded += 1;
    console.log(`animated ${uploaded}/${templates.length}`);
  });

  console.log(JSON.stringify({ ok: true, mode: 'animated', offset, count: templates.length, animatedTotal }));
}

async function seedMusic(count: number) {
  await ensureBuckets();
  const uploaded = [];

  for (const track of buildGeneratedMusic(count)) {
    const result = await uploadBufferToSupabase({
      bucket: SUPABASE_BUCKETS.projectMusic,
      prefix: `generated/${track.category}`,
      fileName: `${track.id}.wav`,
      fallbackExt: '.wav',
      buffer: renderMusicWav(track),
      contentType: 'audio/wav',
      objectPath: track.storagePath,
      upsert: true,
    });
    uploaded.push(result.path);
    if (uploaded.length % 12 === 0 || uploaded.length === count) {
      console.log(`music generated ${uploaded.length}/${count}`);
    }
  }

  let publicUploaded = 0;
  for (const track of buildPublicLibraryMusic()) {
    try {
      const response = await fetch(track.sourceUrl);
      if (!response.ok) throw new Error(`PUBLIC_MUSIC_DOWNLOAD_FAILED_${response.status}`);
      await uploadBufferToSupabase({
        bucket: SUPABASE_BUCKETS.projectMusic,
        prefix: `public-library/${track.theme}`,
        fileName: `${track.id}.mp3`,
        fallbackExt: '.mp3',
        buffer: Buffer.from(await response.arrayBuffer()),
        contentType: 'audio/mpeg',
        objectPath: track.storagePath,
        upsert: true,
      });
      publicUploaded += 1;
      console.log(`music public ${publicUploaded}`);
    } catch (error) {
      console.warn(`music public skipped ${track.id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  console.log(JSON.stringify({ ok: true, mode: 'music', generated: uploaded.length, publicLibrary: publicUploaded }));
}

async function countPrefix(bucket: string, prefix: string): Promise<number> {
  const supabase = getSupabase();
  let total = 0;
  let offset = 0;
  const limit = 1000;

  while (true) {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, {
      limit,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    });
    if (error) throw new Error(`SUPABASE_LIST_FAILED: ${prefix}: ${error.message}`);
    for (const item of data || []) {
      const itemPath = `${prefix.replace(/\/+$/, '')}/${item.name}`;
      if (item.id) {
        total += 1;
      } else {
        total += await countPrefix(bucket, itemPath);
      }
    }
    if (!data || data.length < limit) return total;
    offset += limit;
  }
}

async function verify() {
  await ensureBuckets();
  const templates = buildGeneratedTemplates(1, 0, { includeSvg: true, includeDataUrl: false });
  assertNoSvgText(templates[0]?.svg);
  const url = publicUrl(SUPABASE_BUCKETS.projectTemplates, templates[0].storagePath);
  const counts = {
    staticGeneratedV2: await countPrefix(SUPABASE_BUCKETS.projectTemplates, 'generated-v2'),
    animatedV1: await countPrefix(SUPABASE_BUCKETS.projectTemplates, 'animated-v1'),
    musicGenerated: await countPrefix(SUPABASE_BUCKETS.projectMusic, 'generated'),
    musicPublicLibrary: await countPrefix(SUPABASE_BUCKETS.projectMusic, 'public-library'),
  };
  console.log(JSON.stringify({ ok: true, mode: 'verify', expectedStatic: GENERATED_TEMPLATE_CATALOG_SIZE, expectedAnimated: DEFAULT_ANIMATED_TOTAL, counts, sampleUrl: url }, null, 2));
}

async function main() {
  const parsed = args();
  if (parsed.mode === 'static') await seedStatic(parsed.offset, parsed.count, parsed.concurrency);
  if (parsed.mode === 'animated') await seedAnimated(parsed.offset, parsed.count, parsed.animatedTotal);
  if (parsed.mode === 'music') await seedMusic(parsed.musicCount);
  if (parsed.mode === 'verify') await verify();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
