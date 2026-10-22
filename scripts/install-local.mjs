/** Reversible local install through the desktop app's supported profile CLI. */
import {copyFileSync,existsSync,mkdirSync,chmodSync,writeFileSync,readdirSync,renameSync} from 'node:fs';
import {homedir} from 'node:os';import {join,resolve} from 'node:path';import {spawnSync} from 'node:child_process';
const profile=process.argv[2]??'desktop';if(!/^[A-Za-z0-9_-]+$/.test(profile))throw Error('invalid profile');
const root=join(homedir(),'.dsh','profiles',profile);const backup=join(homedir(),'.dsh-whale-trail','install-backups',new Date().toISOString().replaceAll(':','-'),profile);mkdirSync(backup,{recursive:true,mode:0o700});
const modules=join(root,'node_modules');const existing=[];if(existsSync(modules))for(const name of readdirSync(modules)){if(name.startsWith('.'))continue;if(name.startsWith('@'))for(const child of readdirSync(join(modules,name)))existing.push(name+'/'+child);else existing.push(name);}
const files=['package.json','pnpm-lock.yaml','pnpm-workspace.yaml','cordis.patch.yml','cordis.yml','compatibility.json'];const copied=[];
for(const file of files)if(existsSync(join(root,file))){copyFileSync(join(root,file),join(backup,file));chmodSync(join(backup,file),0o600);copied.push(file);}
writeFileSync(join(backup,'manifest.json'),JSON.stringify({profile,files:copied,createdAt:new Date().toISOString()},null,2)+'\n',{mode:0o600});
console.log('Profile configuration backup:',backup);
const cli=process.env.DSH_WHALE_TRAIL_CLI??'/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh';const result=spawnSync(cli,['plugin','--profile',profile,'add','file:'+resolve(process.argv[3]??'dsh-whale-trail-0.3.0.tgz'),'--ignore-scripts'],{stdio:'inherit'});process.exitCode=result.status??1;
for(const name of existing){const ignored=join(modules,'.ignored',name),target=join(modules,name);if(existsSync(ignored)&&!existsSync(target)){mkdirSync(join(target,'..'),{recursive:true});renameSync(ignored,target);console.log('Preserved existing local package:',name);}}
