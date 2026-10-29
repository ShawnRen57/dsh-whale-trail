import {build} from 'esbuild';import {resolve} from 'node:path';
await build({entryPoints:['tests/ui-entry.ts'],outfile:'qa/ui-test.mjs',bundle:true,platform:'node',format:'esm',packages:'external',loader:{'.png':'dataurl','.webp':'dataurl'},alias:{'@deepseek-ai/dsh-client-ui-primitives':resolve('tests/modal-runtime.ts')}});
