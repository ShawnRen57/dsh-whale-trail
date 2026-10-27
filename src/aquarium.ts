/** Original Whale Trail ASCII art. Reference research and notices: THIRD_PARTY_NOTICES.md. */
export interface AquariumPreferences {
  enabled: boolean;
  selected: string[];
  density: number;
  speed: number;
  color: string;
  reducedMotion: boolean;
}
export type AquariumMode = 'full' | 'composer' | 'preview';
export interface AquariumDecor {
  id: string;
  name: string;
  chapterId: string;
  kind: 'creature' | 'school' | 'scenery';
  frames: string[];
  color: string;
}
export interface AquariumOptions extends Partial<AquariumPreferences> { mode?: AquariumMode; opacity?: number; }
export interface AquariumSprite {
  id: string; x: number; y: number; width: number; height: number;
  fontSize: number; opacity: number; color: string; lines: string[]; direction: number;
}
const art = (id: string, name: string, kind: AquariumDecor['kind'], picture: string, color = '#8ab8d6'): AquariumDecor => ({
  id, name, chapterId: id.split('-')[0]!, kind,
  frames: [picture, picture.replaceAll('~', '-').replaceAll('^', '~')], color,
});
export const DECOR: AquariumDecor[] = [
  art('c1-whale', '小蓝鲸', 'creature', String.raw`         .--.       _
   .----'    '---.__/ \
  /  o               <
  \____     ___..--'\_/
       '---'  ~`),
  art('c1-clownfish', '小丑鱼', 'creature', String.raw`   .-^---.
  ( o | | )><
   '---v-' `, '#e6b87a'),
  art('c1-kelp', '摇曳海带', 'scenery', String.raw`   ~       ~
  ( )     ( )
   ) (   ( (
  (   )   ) )
   ) (   ( (
  _\_|___|/._`, '#84bba6'),
  art('c1-shell', '珍珠贝', 'scenery', String.raw`    .-^-^-.
  .' / | \ '.
 (  /  o  \  )
  '.___|___. '`),
  art('c2-ray', '鳐鱼', 'creature', String.raw`       __
   _.-'oo'-._
 .'  .----.  '.
  '-/      \-'
     \    /
      \~~/---~`),
  art('c2-tang', '蓝倒吊', 'creature', String.raw`    .-^^-.
   / o /  \__
   \__\___/--<
      v`, '#82afe1'),
  art('c2-coral', '鹿角珊瑚', 'scenery', String.raw`   Y    Y   Y
  \|/ Y |  \|/
   | \|/|   |
    \ | |  /
     \| | /
   ___\|/___`, '#dba3ad'),
  art('c2-anemone', '海葵花园', 'scenery', String.raw`  ~ ( ~ ) ~
 ( \ | | / )
  \ \| |/ /
   \_\o/_/
    (___)
  .__|_|__.`, '#d3a5c3'),
  art('c3-turtle', '远行海龟', 'creature', String.raw`    __      __
 __/  '.--.'  \__
( o  / /\/\ \    )
 '--.\_\__/_.--'
     /_/  \_\ `, '#86b99b'),
  art('c3-sardines', '银色沙丁鱼群', 'school', String.raw`  .-^--.
 (o____)><
  ' v`),
  art('c3-seahorse', '海马', 'creature', String.raw`    .-^.
   / o  )==
   \  _/
    )(
   /  )
   \_(@`, '#d9be8c'),
  art('c3-starfish', '海星', 'scenery', String.raw`       /\
  ____/..\____
  \   .  .   /
   /  .  .  \
  /.-'    '-.\ `, '#d7ad96'),
  art('c4-dolphin', '跃浪海豚', 'creature', String.raw`         __/\
  __..--'    '--.__
 <__ o      /     '-._
    '---.__/    .--' >
         /_____/  \_/`),
  art('c4-moonfish', '翻车鱼', 'creature', String.raw`      /\
    .'  '.
 __/ o    |
<__       |
   '\    /
     '\ /\
       \/`),
  art('c4-jellyfish', '月光水母', 'creature', String.raw`     .-~~~-.
   .' . . . '.
  (___________)
    )  (  ) (
   (  )  (   )
    ~  ~  ~ ~`, '#bba9de'),
  art('c4-lighthouse', '海岸灯塔', 'scenery', String.raw`       /\
   ---[**]---
      |==|
      |  |
      |==|
     _|__|_
  ~~'______'~~`, '#c2b9a4'),
  art('c5-humpback', '座头鲸', 'creature', String.raw`              __/\__
   ___...----''      '--._      _
 .' o                     '---/ \
(____        __                <
     '--.___/  \____....----.  _/
           /___/             \/`),
  art('c5-manta', '蝠鲼', 'creature', String.raw`           /\
    ____.-'oo'-.____
 .-'    /      \    '-.
  '-.  /  /\    \ .-'
     '\__/  \__/'
           |~~~`),
  art('c5-nautilus', '鹦鹉螺', 'creature', String.raw`     .-~~-.
   .' .--. '.
  /  ( @  )  )
  \   '--'  /
   '.___.--'==~~
          ==~~`, '#c8b2a0'),
  art('c5-reef', '珊瑚礁', 'scenery', String.raw`    Y    .--.   Y
  \ | / / :: \ \|/
   \|/ /: :: :\ |
  __|_/___:____\|__
 /_o___o___o___o___\ `, '#93bcb3'),
  art('c6-orca', '虎鲸', 'creature', String.raw`            /\
   __...---'  '---.__        _
 .' o   .--.        '------/ \
(____  (____)    ___         <
     '--.______.'   '----.__\_/
            \__\ `),
  art('c6-lanternfish', '灯笼鱼', 'creature', String.raw`    .---o
   / .-^--.
  / (o : : )><
     '-----'
       v`, '#a5c9bc'),
  art('c6-squid', '深海鱿鱼', 'creature', String.raw`       /\
      /  \
     / .. \
     \ oo /
      |  |
    ~/|  |\~
    ( /~~\ )`, '#b9a9d2'),
  art('c6-seafan', '紫色海扇', 'scenery', String.raw`  \ \ \ | / / /
   \ \\|// /
  --\ \|/ /--
    '\ | /'
      \|/
      _|_`, '#b9a1c9'),
  art('c7-spermwhale', '抹香鲸', 'creature', String.raw`    ___________________
  .'                    '--.__    _
 / o                          '--/ \
|     ______                __     <
 \___/______'----.________.-'  '--\_/
               \____/`),
  art('c7-hammerhead', '双髻鲨', 'creature', String.raw`             /\
  .---._____/  '---.__       _
 (o   o)  ||          '----< \
  '---'---.____     __...---. >
              \___/         V`),
  art('c7-flyingfish', '飞鱼', 'school', String.raw`    \  |  /
  ___\_|_/__
 (o_________)><
    /  |  \ `),
  art('c7-shipwreck', '沉船遗迹', 'scenery', String.raw`        |    /|
        |   /_|
    ____|_____|___
   /__o___o___o__/\
   \_____/\_____/ /
  ~~\__________/~~`, '#a8b1b7'),
  art('c8-bluewhale', '蓝鲸', 'creature', String.raw`               .---.    __/\
   _____...---'     '---'    '--.__        __
 .' o                              '-----/  \
(_________      ______                       <
          '----/      '-------.....______  __/
               \_____\                  \/`),
  art('c8-whaleshark', '鲸鲨', 'creature', String.raw`               /\
   ___....----'  '----.__         __
 .' o : : : : : : : : : '-------/  \
(_____:_:_:_:_:_:_:_:___          <
      \____/             '-----.  _/
                                \/`),
  art('c8-oarfish', '皇带鱼', 'creature', String.raw`   /^^^^^^^^^^^^^^^^^^^^\
 <o======================\___
   \_~_~_~_~_~_~_~_~_~_~_~__/`, '#baa8c8'),
  art('c8-vent', '深海热泉', 'scenery', String.raw`    o      .
  .   o   o
    ( ~ )
     | |
   __| |__
  /::| |::\
 /___|_|___\ `, '#9caebd'),
  art('c9-beluga', '白鲸', 'creature', String.raw`     .-~~-.__
  __/ o      '---.__      __
 <__                '---/  \
    '--.__     __         <
          '---/  \__..--\__/
              \__\ `, '#b4cfe0'),
  art('c9-coelacanth', '腔棘鱼', 'creature', String.raw`        /\    /\
  __.--'  '--'  '--.__
 <o  : : : : : : :   )>=={
  '--.___  __  __..--'
         \/  \/`),
  art('c9-tuna', '蓝鳍金枪鱼', 'school', String.raw`          /\
   __..--'  '--..__
 <o  ========     )>=={
   '--..____..--'
         \/`),
  art('c9-observatory', '海底观测站', 'scenery', String.raw`       .-^^-.
     .' _  _ '.
    /  |_| |_| \
   |  o  _  o  |
   |____|_|____|
  _/|________|\_
 /__|__|__|__|__\ `, '#a8bacb'),
];

/** Keep all runtime dependencies inside this factory so exported HTML is self-contained. */
function createAquariumRuntime(decor: readonly AquariumDecor[]) {
  const finite = (value: number | undefined, fallback: number) => Number.isFinite(value) ? value! : fallback;
  const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
  const hash = (value: string) => { let h = 2166136261; for (let i=0;i<value.length;i++) h = Math.imul(h ^ value.charCodeAt(i), 16777619); return h >>> 0; };
  const mirror = (line: string) => line.split('').reverse().map(c => ({'/':'\\','\\':'/','(' : ')',')':'(','<':'>','>':'<','[':']',']':'[','{':'}','}':'{'} as Record<string,string>)[c] ?? c).join('');
  function getAquariumScene(width: number, height: number, time: number, items: readonly (string | AquariumDecor)[], options: AquariumOptions = {}): AquariumSprite[] {
    if (!Number.isFinite(width) || !Number.isFinite(height) || width < 4 || height < 4 || options.enabled === false) return [];
    const selected = new Set(items.map(item => typeof item === 'string' ? item : item.id));
    const active = decor.filter(item => selected.has(item.id));
    const swimmers = active.filter(item => item.kind !== 'scenery');
    const density = clamp(finite(options.density,40),1,100);
    const seconds = options.reducedMotion ? 0 : finite(time,0) / 1000 * clamp(finite(options.speed,1),0.1,3);
    const override = /^#[\da-f]{6}$/i.test(options.color ?? '') ? options.color : undefined;
    const output: AquariumSprite[] = [];
    for (const item of active) {
      const seed = hash(item.id), phase = (seed % 997) / 997 * Math.PI * 2;
      const count = item.kind === 'school' ? 4 + Math.round(density / 20) : item.kind === 'scenery' ? 1 : 1 + Math.floor(density / 70);
      for (let n = 0; n < count && output.length < 64; n++) {
        const frame = item.frames[Math.floor((seconds + phase) / 0.9) % item.frames.length] ?? item.frames[0]!;
        const originalLines = frame.split('\n'), columns = Math.max(...originalLines.map(line=>line.length));
        const baseSize = item.kind === 'school' ? 8.5 : item.kind === 'scenery' ? 10 : columns > 30 ? 10.5 : 11.5;
        const scale = n > 0 && item.kind !== 'school' ? 0.76 : 1;
        const school = item.kind === 'school';
        const groupColumns = school ? Math.min(3,count) : 1, groupRows = school ? Math.ceil(count/3) : 1;
        const fontSize = Math.min(baseSize*scale, width / ((columns*0.62+1.2)*groupColumns+2), height / ((originalLines.length*1.2+0.5)*groupRows+2));
        if (fontSize < 1) continue;
        const spriteWidth = columns * fontSize * 0.62, spriteHeight = originalLines.length * fontSize * 1.2;
        const roomX = Math.max(0,width-spriteWidth), roomY = Math.max(0,height-spriteHeight);
        const scenery = item.kind === 'scenery';
        const swimPhase = seconds * (item.kind === 'school' ? 0.047 : 0.024) + phase + (item.kind === 'school' ? 0 : n*2.7);
        const groupX = (Math.cos(swimPhase)+1)*0.5;
        const groupWidth = school ? groupColumns*(spriteWidth+fontSize*1.2)-fontSize*1.2 : spriteWidth;
        const groupHeight = school ? groupRows*(spriteHeight+fontSize*0.5)-fontSize*0.5 : spriteHeight;
        const x = scenery ? roomX*((seed%81+10)/100) : clamp((width-groupWidth)*groupX+(school ? n%3*(spriteWidth+fontSize*1.2) : 0),0,roomX);
        const swimmerIndex = swimmers.findIndex(candidate=>candidate.id===item.id);
        const lane = scenery ? 0.94 : 0.1+((swimmerIndex*0.618+n*(school?0:0.37))%1)*0.66;
        const drift = scenery ? Math.sin(seconds*0.3+phase)*1.5 : Math.sin(seconds*0.25+phase+(school?n*0.15:n*0.7))*Math.min(8,roomY*0.04);
        const y = clamp((height-groupHeight)*lane+drift+(school?Math.floor(n/3)*(spriteHeight+fontSize*0.5):0),0,roomY);
        const direction = Math.sin(swimPhase) >= 0 ? -1 : 1;
        output.push({id:item.id,x,y,width:spriteWidth,height:spriteHeight,fontSize,opacity:clamp(finite(options.opacity,1),0,1)*(scenery?0.4:n?0.46:0.64),color:override ?? item.color,lines:direction>0&&!scenery?originalLines.map(mirror):originalLines,direction});
      }
    }
    return output;
  }
  function drawAquarium(ctx: CanvasRenderingContext2D, width: number, height: number, time: number, items: readonly (string | AquariumDecor)[], options: AquariumOptions = {}): void {
    if (!Number.isFinite(width) || !Number.isFinite(height) || width<=0 || height<=0) return;
    ctx.save();
    ctx.clearRect(0,0,width,height);
    ctx.beginPath();ctx.rect(0,0,width,height);ctx.clip();
    ctx.textAlign='left';ctx.textBaseline='top';
    for (const sprite of getAquariumScene(width,height,time,items,options)) {
      ctx.fillStyle=sprite.color;ctx.globalAlpha=sprite.opacity;
      ctx.font=`${sprite.fontSize}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
      // Fixed cells keep every silhouette aligned even when a fallback font has wider glyphs.
      for(let row=0;row<sprite.lines.length;row++) for(let col=0;col<sprite.lines[row]!.length;col++) {
        const char=sprite.lines[row]![col]!;
        if(char!==' ')ctx.fillText(char,sprite.x+col*sprite.fontSize*0.62,sprite.y+row*sprite.fontSize*1.2,sprite.fontSize*0.62);
      }
    }
    if(options.mode==='composer') {
      ctx.globalAlpha=1;ctx.globalCompositeOperation='destination-in';
      const fade=ctx.createLinearGradient(0,0,0,height);
      fade.addColorStop(0,'rgba(0,0,0,0)');fade.addColorStop(0.35,'rgba(0,0,0,0.12)');fade.addColorStop(1,'rgba(0,0,0,0.85)');
      ctx.fillStyle=fade;ctx.fillRect(0,0,width,height);
    }
    ctx.restore();
  }
  return {getAquariumScene,drawAquarium};
}
const runtime = createAquariumRuntime(DECOR);
export const getAquariumScene = runtime.getAquariumScene;
/** time is elapsed milliseconds; no random state, DOM, timers, or browser globals are read. */
export const drawAquarium = runtime.drawAquarium;
/** Evaluate as an expression to obtain {drawAquarium,getAquariumScene} with embedded original art. */
export function aquariumRuntimeSource(): string {
  return `(${createAquariumRuntime.toString()})(${JSON.stringify(DECOR)})`;
}
