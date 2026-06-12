import { ensurePublicBucket, getSupabase, SUPABASE_BUCKETS } from '../apps/server/src/services/supabaseStorage';

async function main() {
  const buckets = [...new Set(Object.values(SUPABASE_BUCKETS))];
  for (const bucket of buckets) {
    await ensurePublicBucket(bucket);
    console.log(`bucket ok: ${bucket}`);
  }

  const { data, error } = await getSupabase().storage.listBuckets();
  if (error) throw new Error(`LIST_BUCKETS_FAILED: ${error.message}`);
  console.log(JSON.stringify({ ok: true, buckets: (data || []).map((item) => ({ name: item.name, public: item.public })) }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
