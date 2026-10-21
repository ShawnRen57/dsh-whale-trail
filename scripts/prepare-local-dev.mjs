/** Reproduce development peers from the installed desktop distribution, without changing it. */
import {spawnSync} from 'node:child_process';import {existsSync,mkdirSync,readdirSync,symlinkSync} from 'node:fs';import {resolve} from 'node:path';
const binary='/Applications/DeepSeek Harness.app/Contents/MacOS/DeepSeek Harness';
if(!existsSync('vendor/node_modules/@deepseek-ai/cordis')){
 const code=`const fs=require('fs');const base='/Applications/DeepSeek Harness.app/Contents/Resources/app.asar/dsh/node_modules';function copy(a,b){if(fs.statSync(a).isDirectory()){fs.mkdirSync(b,{recursive:true});for(const n of fs.readdirSync(a))copy(a+'/'+n,b+'/'+n);}else fs.writeFileSync(b,fs.readFileSync(a));}fs.mkdirSync('vendor',{recursive:true});copy(base,'vendor/node_modules');console.log('Copied version-matched development dependencies');`;
 const result=spawnSync(binary,['-e',code],{env:{...process.env,ELECTRON_RUN_AS_NODE:'1'},stdio:'inherit'});if(result.status!==0)process.exit(result.status??1);
}
mkdirSync('node_modules/@deepseek-ai',{recursive:true});for(const name of readdirSync('vendor/node_modules/@deepseek-ai')){const target='node_modules/@deepseek-ai/'+name;if(!existsSync(target))symlinkSync(resolve('vendor/node_modules/@deepseek-ai/'+name),target);}
console.log('Development peers ready; run npm test and npm run typecheck.');
