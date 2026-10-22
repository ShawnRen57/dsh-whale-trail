/** Deterministic catalog and generation briefs for the 0.3 achievement ladder. */
import {readFileSync,writeFileSync} from 'node:fs';
const old=JSON.parse(readFileSync('assets/legacy-catalog-v2.json','utf8'));
const rows=[
 ['days.3','三日探潮','days',3,'3 D','TOTAL DAYS','A young smiling blue whale with a small shell charm, three wave crests and a distant island; no human yet'],
 ['days.14','双周寻岛','days',14,'14 D','TOTAL DAYS','A scarf-wearing explorer whale and a young blue-haired whale-girl apprentice discovering a tiny island with a simple compass'],
 ['days.60','六十日风帆','days',60,'60 D','TOTAL DAYS','The whale-girl as a junior captain hoisting two crisp sails while her whale companion scouts the waves'],
 ['days.180','半岁环洋','days',180,'180 D','TOTAL DAYS','The whale-girl fleet commander tracing a half-world circumnavigation around a nautical globe, two tiny sailboats and a whale escort'],
 ['days.365','一岁鲸航','days',365,'365 D','TOTAL DAYS','The whale-girl as legendary ocean admiral with an ornate sailor cap and year-wheel star chart, her whale circling a complete ocean globe; grand yet readable'],
 ['streak.14','双周灯语','streak',14,'14 D','STREAK DAYS','An apprentice whale-girl and scarf whale lighting a pair of island beacons; a lantern and two linked light signals'],
 ['streak.60','六十夜守望','streak',60,'60 D','STREAK DAYS','The whale-girl senior lighthouse keeper on a balcony linking an archipelago of three beacons with sweeping warm light'],
 ['tokens.1000000','深海回响','tokens',1e6,'1M','TOTAL TOKENS','Entry tier: a baby blue whale listening to one sea-green echo pearl and a few sonar rings; no human character, simple blue and sea-green scene'],
 ['tokens.10000000','万里鲸歌','tokens',1e7,'10M','TOTAL TOKENS','Second tier: scarf-wearing explorer whale with notebook following several sea-green echo pearls; a tiny young whale-girl apprentice beside it, still an explorer not chief archivist'],
 ['tokens.100000000','亿浪回声','tokens',1e8,'100M','TOTAL TOKENS','The whale-girl as an ocean archivist opening a luminous sonar book, sea-green circular records and a whale behind her'],
 ['tokens.1000000000','十亿潮汐','tokens',1e9,'1B','TOTAL TOKENS','The whale-girl chief archivist conducting a grand circular underwater library, one whale and flowing sea-green whale-song ribbons'],
 ['tokens.10000000000','百亿海藏','tokens',1e10,'10B','TOTAL TOKENS','The whale-girl curator of a magnificent ocean observatory, an armillary sonar sphere, stacked archive scrolls and a whale constellation'],
 ['tokens.100000000000','千亿鲸宇','tokens',1e11,'100B','TOTAL TOKENS','Top tier: the whale-girl ocean sage holds a miniature spiral galaxy of whale-song records, a great blue whale orbiting the cosmic sea archive; cream/navy/cobalt/sea-green, grand flat seal composition'],
 ['dialogues.20','二十轮畅游','dialogues',20,'20','DIALOGUE ROUNDS','Whale-girl apprentice with small orange radio and scarf whale exchanging linked speech bubbles between two islands'],
 ['dialogues.100','百轮知音','dialogues',100,'100','DIALOGUE ROUNDS','The whale-girl senior radio navigator with a shoulder cape at a ship radio desk, a whale companion and a semicircle of interlinked speech bubbles'],
 ['dialogues.500','五百轮共航','dialogues',500,'500','DIALOGUE ROUNDS','The whale-girl ocean ambassador at a round nautical table connecting several island radios and speech-bubble constellations, her whale companion beside the chart'],
 ['dialogues.1000','千轮鲸鸣','dialogues',1000,'1000','DIALOGUE ROUNDS','The whale-girl as a legendary conversation conductor in an elegant sailor coat and cap, a great whale and an entire starry ocean network of speech-bubble constellations; copper-orange signal accents']
];
const festivals=[
 ['laba','腊八暖鲸','LABA FESTIVAL','Whale-girl serving a steaming bowl of eight-treasure porridge to a small whale, plum blossoms and warm mittens'],
 ['valentine','心海来信','VALENTINE DAY','Whale-girl and small whale exchanging a heart-shaped sealed letter and one rose, wholesome friendship'],
 ['new-year-eve','辞岁守潮','NEW YEAR EVE','Whale-girl and whale enjoying reunion dumplings beside a paper-cut window and small celebratory sparkles'],
 ['lantern','灯海寻鲸','LANTERN FESTIVAL','Whale-girl carrying a round red lantern with a whale-shaped lantern over the waves, bowl of tangyuan'],
 ['womens-day','她与星海','WOMENS DAY','Confident whale-girl navigator raising a compass beside mimosa flowers and a brave little whale, dignified joyful composition'],
 ['qingming','清风寄鲸','QINGMING','Whale-girl releasing a small swallow kite under a willow branch with her whale companion, quiet spring remembrance, no graves'],
 ['earth-day','蔚蓝家园','EARTH DAY','Whale-girl gently holding a small Earth globe with a whale curled around it, two green leaves and clean ocean waves'],
 ['book-day','书海拾光','WORLD BOOK DAY','Whale-girl and whale reading a wide open book whose pages become ocean waves, one small bookmark star'],
 ['labour-day','匠心筑港','LABOUR DAY','Whale-girl craftsperson in sailor workwear using a small wooden mallet to build a little harbor with an industrious whale helper'],
 ['childrens-day','童心逐浪','CHILDRENS DAY','Whale-girl flying a tiny whale-shaped balloon with a baby whale, paper windmill and playful waves'],
 ['oceans-day','守护鲸蓝','WORLD OCEANS DAY','Whale-girl ocean ranger and whale protecting a coral reef and a circle of small fish, sea-green and blue'],
 ['qixi','鹊桥鲸遇','QIXI FESTIVAL','Whale-girl and whale meeting across a graceful bridge of magpies beneath two bright stars, ribbon over a starry sea'],
 ['ghost-festival','河灯寄远','ZHONGYUAN','Whale-girl and little whale gently placing one lotus river lantern on calm water under a soft moon, respectful remembrance, peaceful not frightening'],
 ['double-ninth','登高望海','DOUBLE NINTH','Whale-girl hiking a stylized coastal mountain with a whale-shaped kite, chrysanthemum blossoms and distant ocean'],
 ['halloween','南瓜鲸夜','HALLOWEEN','Playful whale-girl in a modest sailor witch cape holding a smiling pumpkin lantern, tiny whale wearing a star hat, no horror'],
 ['thanksgiving','丰潮有你','THANKSGIVING','Whale-girl offering a harvest basket with a pumpkin and wheat to her whale companion, autumn leaves, grateful friendly scene'],
 ['winter-solstice','冬至暖航','WINTER SOLSTICE','Whale-girl in a cozy sailor scarf sharing steaming dumplings with a whale beside a snow-tipped lantern and winter waves'],
 ['christmas','鲸铃叮当','CHRISTMAS','Whale-girl in sailor coat and festive scarf beside a tiny decorated evergreen, whale carrying a neatly wrapped present and one bell']
];
const extra=rows.map(([id,name,family,threshold,value,label,scene])=>({id,name,family,threshold,value,label,scene,asset:id+'.png'}));
for(const [key,name,label,scene] of festivals)extra.push({id:'festival.'+key+'.2026',name,family:'festival',threshold:2026,value:'2026',label,scene,asset:'festival.'+key+'.2026.png'});
const removed=old.filter(a=>a.family==='tokens'&&a.threshold<1e6);
const replacements=new Map(extra.map(a=>[a.id,a]));
const catalog=old.filter(a=>!removed.some(r=>r.id===a.id)).map(a=>replacements.get(a.id)??a);
for(const a of extra)if(!catalog.some(b=>b.id===a.id))catalog.push(a);
const festivalDates=JSON.parse(readFileSync('assets/calendar-2026.json','utf8')).dates;
const families=['days','streak','tokens','dialogues','festival','hidden'];catalog.sort((a,b)=>families.indexOf(a.family)-families.indexOf(b.family)||a.threshold-b.threshold||(a.family==='festival'?festivalDates[a.id.split('.')[1]].localeCompare(festivalDates[b.id.split('.')[1]]):a.id.localeCompare(b.id)));
if(catalog.length!==59||extra.length!==35)throw Error('catalog count mismatch');
writeFileSync('assets/catalog.json',JSON.stringify(catalog,null,2)+'\n');
const base="Use case: logo-brand. ONE production circular seal sticker, truly transparent outside. The references guide style and identity. Exact cream-paper face, thick navy outer circle plus thin inner circle, bold condensed curved text, flat screenprinted illustration, lower rounded metric plate and two small navy stars. Top arc text EXACT 'DSH WHALE TRAIL'. Fully clothed original chibi whale-girl when humanized: cobalt blue bob haircut, whale-tail hair clip, navy sailor coat, same face as references. Flat clean colored shapes, no gradients, no 3D, no photorealism, very restrained ink texture. Complete circular silhouette, comfortable transparent outer margin. No added text or watermarks. Central narrative readable at 100px. Palette cream #FFF7E8, navy #182B47, cobalt blue plus theme accent. ";
writeFileSync('assets/prompts-v030.json',JSON.stringify(extra.map(a=>({id:a.id,prompt:base+`Theme ${a.family}. Accent ${a.family==='tokens'?'sea green':a.family==='dialogues'?'copper orange':a.family==='streak'?'golden amber':'vermilion'}. Central scene: ${a.scene}. Bottom arc EXACT '${a.label}'. Large metric plate EXACT '${a.value}'.`})),null,2)+'\n');
console.log('59 active badges, 35 new/revised art briefs');
