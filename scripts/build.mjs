import {build} from 'esbuild';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
await mkdir('lib',{recursive:true});
await build({entryPoints:['src/index.ts','src/remote.ts','src/typert.ts'],bundle:true,platform:'node',format:'esm',outdir:'lib',target:'node24',packages:'external',sourcemap:true});
const externals=['react','react/jsx-runtime','react-dom','@deepseek-ai/cordis','zod'];
await build({entryPoints:['src/client/index.tsx'],bundle:true,platform:'browser',format:'cjs',outfile:'lib/client.js',target:'es2022',external:externals,minify:true,define:{'process.env.NODE_ENV':'"production"'},loader:{'.css':'text','.png':'dataurl','.webp':'dataurl'},banner:{js:'window.__ModuleLoader__.load({id:"dsh-whale-trail",factory:(require)=>{var module={exports:{}};var exports=module.exports;'},footer:{js:'return module.exports;}});'}});
const j=JSON.parse(await readFile('assets/catalog.json','utf8'));await writeFile('lib/build-info.json',JSON.stringify({compatibility:{strategy:'capability-based',sdkContracts:['0.2.1-rc.2','0.2.1-rc.3']},catalogCount:j.length,date:new Date().toISOString()},null,2)+'\n');
