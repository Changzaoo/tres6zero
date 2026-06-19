import { writeFile } from 'node:fs/promises';
import { GENERATED_TEMPLATE_CATALOG_SIZE, buildGeneratedTemplates, renderTemplatePng } from '../apps/server/src/services/generatedTemplates';
import { buildGeneratedAnimatedTemplates, renderAnimatedTemplateWebm } from '../apps/server/src/services/generatedAnimatedTemplates';

async function main() {
  console.log(`catalogo total: ${GENERATED_TEMPLATE_CATALOG_SIZE}`);
  const all = buildGeneratedTemplates(GENERATED_TEMPLATE_CATALOG_SIZE, 0, { includeSvg: false, includeDataUrl: false });
  const byCategory = new Map<string, number>();
  for (const template of all) byCategory.set(template.category, (byCategory.get(template.category) || 0) + 1);
  console.log(JSON.stringify(Object.fromEntries(byCategory), null, 2));

  for (const category of ['fogo', 'gelo', 'oceano', 'galaxia']) {
    const sample = all.find((template) => template.category === category && template.aspectRatio === '9:16');
    if (!sample) throw new Error(`SEM_AMOSTRA_${category}`);
    const withSvg = buildGeneratedTemplates(1, Number(sample.id.replace(/^(?:generated|idea)-/, '')) - 1, { includeSvg: true, includeDataUrl: false })[0];
    await writeFile(`preview-${category}.png`, await renderTemplatePng(withSvg.svg));
    console.log(`ok estatico ${category}: ${sample.id} -> preview-${category}.png`);
  }

  // Uma animada de fogo para conferir as chamas em movimento.
  const fogoStatic = all.find((template) => template.category === 'fogo' && template.aspectRatio === '9:16');
  const fogoIndex = Number(fogoStatic!.id.replace(/^(?:generated|idea)-/, '')) - 1;
  const animated = buildGeneratedAnimatedTemplates(1, fogoIndex, { includeSvg: true, includeDataUrl: false })[0];
  await writeFile('preview-fogo-animado.webm', await renderAnimatedTemplateWebm(animated as any));
  console.log(`ok animado fogo: ${animated.id} -> preview-fogo-animado.webm`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
