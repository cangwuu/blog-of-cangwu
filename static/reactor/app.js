'use strict';
const $=id=>document.getElementById(id),canvas=$('core'),g=canvas.getContext('2d'),spec=$('spectrum'),sg=spec.getContext('2d');
let ctx,analyser,bins,dbBuf,wave,master,stream,source,buffer,started=0,offset=0,mode='demo',playing=false,loading=false,session=0,rafTime=0,angle=-.32,tilt=.58,zoom=1,drag=null,demoNodes=[],gain=1.4,smoothing=.75,energy=0;

/* ---------------- 控制棒阵列 ---------------- */

const MAXR=15,HALF=.3,FMIN=45,FMAX=16000,NBANDS=28;
let rods=[],rodStep=1;
const bands=[];for(let i=0;i<NBANDS;i++)bands.push({raw:-120,val:0});

// 对数刻度：半径 r 处的频段中心频率，45Hz → 16kHz 等比分布
const hzAt=r=>FMIN*Math.pow(FMAX/FMIN,r/MAXR);

function buildRods(){
  const width=canvas.clientWidth||1200;
  const nextStep=width<820?2:1;
  if(rods.length&&nextStep===rodStep)return;
  rodStep=nextStep;
  rods=[];
  for(let x=-MAXR;x<=MAXR;x+=rodStep)for(let z=-MAXR;z<=MAXR;z+=rodStep){
    const r=Math.hypot(x,z);
    if(r>MAXR)continue;
    rods.push({x,z,r,h:0,seed:Math.abs(Math.sin(x*127.1+z*311.7)),band:Math.min(NBANDS-1,Math.floor(r/MAXR*NBANDS))});
  }
  $('count').textContent=rods.length;
}

// 以全场最响的频段为参考，向下开 42dB 窗口，再按半径补偿高频滚降
let ref=-100;
function updateBands(dt){
  const binHz=ctx.sampleRate/analyser.fftSize;
  let max=-120;
  for(let i=0;i<NBANDS;i++){
    const hz=hzAt((i+.5)/NBANDS*MAXR);
    const c=Math.max(1,Math.min(dbBuf.length-2,Math.round(hz/binHz)));
    let v=(dbBuf[c-1]+dbBuf[c]+dbBuf[c+1])/3;
    if(!Number.isFinite(v)||v<-120)v=-120;
    bands[i].raw=v;
    if(v>max)max=v;
  }
  ref=Math.max(max,ref-.35*dt);
  for(let i=0;i<NBANDS;i++){
    const b=bands[i];
    const tilt=(i/NBANDS)*.32;
    const rel=Math.max(0,Math.min(1,(b.raw-(ref-42))/42+tilt));
    b.val+=(rel-b.val)*Math.min(1,.4*dt);
  }
}

/* ---------------- 画布几何 ---------------- */

function scale(){return Math.min(canvas.clientWidth/45,canvas.clientHeight/37)*zoom}
function point(x,z,h=0){const w=canvas.clientWidth,H=canvas.clientHeight,s=scale(),rx=x*Math.cos(angle)-z*Math.sin(angle),rz=x*Math.sin(angle)+z*Math.cos(angle);return[w/2+rx*s,H*.55+rz*s*tilt-h*s]}
function poly(points,fill,stroke){g.beginPath();points.forEach((p,i)=>i?g.lineTo(...p):g.moveTo(...p));g.closePath();if(fill){g.fillStyle=fill;g.fill()}if(stroke){g.strokeStyle=stroke;g.lineWidth=.4;g.stroke()}}

function drawFloor(){
  const w=canvas.clientWidth,H=canvas.clientHeight,s=scale(),cx=w/2,cy=H*.55,heat=Math.min(1,energy*7);
  const glow=g.createRadialGradient(cx,cy,0,cx,cy,18*s);
  glow.addColorStop(0,`rgba(188,204,120,${(.08+heat*.16).toFixed(3)})`);
  glow.addColorStop(.55,'rgba(104,122,86,.05)');
  glow.addColorStop(1,'rgba(0,0,0,0)');
  g.beginPath();g.ellipse(cx,cy,18*s,18*s*tilt,0,0,Math.PI*2);g.fillStyle=glow;g.fill();

  // 石墨底盘
  g.beginPath();g.ellipse(cx,cy,16.3*s,16.3*s*tilt,0,0,Math.PI*2);g.fillStyle='#0b0f0b';g.fill();
  g.beginPath();g.ellipse(cx,cy,15.9*s,15.9*s*tilt,0,0,Math.PI*2);g.strokeStyle='#272e25';g.lineWidth=Math.max(1,s*.2);g.stroke();

  // 黄黑警示刻度
  g.save();g.setLineDash([s*.42,s*.4]);
  g.beginPath();g.ellipse(cx,cy,16.05*s,16.05*s*tilt,0,0,Math.PI*2);
  g.strokeStyle='rgba(188,192,104,.65)';g.lineWidth=Math.max(1,s*.15);g.stroke();g.restore();

  g.beginPath();g.ellipse(cx,cy,16.55*s,16.55*s*tilt,0,0,Math.PI*2);g.strokeStyle='#363f31';g.lineWidth=Math.max(1,s*.1);g.stroke();

  for(const rr of [5,10]){
    g.beginPath();g.ellipse(cx,cy,rr*s,rr*s*tilt,0,0,Math.PI*2);
    g.strokeStyle='rgba(112,124,96,.13)';g.lineWidth=1;g.stroke();
  }
}

/* ---------------- 单根控制棒 ---------------- */

const SIDE={back:'#12170f',left:'#191f18',right:'#2b342a',front:'#20281f'};
const TOP=[88,96,80],HOT=[214,228,158];

function drawRod(rod,amp,s){
  const {x,z,h}=rod,half=HALF;
  const b0=point(x-half,z-half,0),b1=point(x+half,z-half,0),b2=point(x+half,z+half,0),b3=point(x-half,z+half,0);
  const t0=point(x-half,z-half,h),t1=point(x+half,z-half,h),t2=point(x+half,z+half,h),t3=point(x-half,z+half,h);

  // 落影
  const cx=(b0[0]+b2[0])/2,cy=(b0[1]+b2[1])/2;
  g.beginPath();g.ellipse(cx+s*.1,cy+s*.05,s*.46,s*.46*tilt,0,0,Math.PI*2);
  g.fillStyle='rgba(3,7,4,.4)';g.fill();

  // 先远后近，保证遮挡关系
  poly([t0,t1,b1,b0],SIDE.back);
  poly([t3,t0,b0,b3],SIDE.left);
  poly([t1,t2,b2,b1],SIDE.right);
  poly([t2,t3,b3,b2],SIDE.front);

  // 顶面：石墨底色，受激时偏向金属高光
  const k=Math.min(1,amp*1.25),bias=(rod.seed-.5)*10;
  const cr=(TOP[0]+(HOT[0]-TOP[0])*k+bias)|0,cg=(TOP[1]+(HOT[1]-TOP[1])*k+bias)|0,cb=(TOP[2]+(HOT[2]-TOP[2])*k+bias)|0;
  poly([t0,t1,t2,t3],`rgb(${cr},${cg},${cb})`,'rgba(8,12,8,.55)');

  if(s>5){
    const mx=(t0[0]+t1[0]+t2[0]+t3[0])/4,my=(t0[1]+t1[1]+t2[1]+t3[1])/4;
    const inset=[t0,t1,t2,t3].map(p=>[p[0]+(mx-p[0])*.52,p[1]+(my-p[1])*.52]);
    g.beginPath();inset.forEach((p,i)=>i?g.lineTo(...p):g.moveTo(...p));g.closePath();
    g.fillStyle=`rgba(240,246,206,${(.03+k*.14).toFixed(3)})`;g.fill();
    if(k>.4){
      g.beginPath();g.ellipse(mx,my,s*.07,s*.07*tilt,0,0,Math.PI*2);
      g.fillStyle=`rgba(222,236,149,${(.16+k*.4).toFixed(3)})`;g.fill();
    }
  }
}

/* ---------------- 主循环 ---------------- */

function frame(t){
  const dt=Math.min((t-rafTime)/16.67,3)||1;rafTime=t;
  const w=canvas.clientWidth,H=canvas.clientHeight;
  g.clearRect(0,0,w,H);
  buildRods();

  if(analyser&&playing){
    analyser.getFloatFrequencyData(dbBuf);
    analyser.getByteFrequencyData(bins);
    updateBands(dt);
    if(wave){analyser.getFloatTimeDomainData(wave);let e=0;for(const v of wave)e+=v*v;energy=Math.sqrt(e/wave.length)}
  }else{
    energy*=.92;
    ref=Math.max(-100,ref-.6*dt);
    for(const b of bands)b.val+=(0-b.val)*Math.min(1,.1*dt);
  }

  drawFloor();

  const sorted=rods.slice().sort((a,b)=>(a.x*Math.sin(angle)+a.z*Math.cos(angle))-(b.x*Math.sin(angle)+b.z*Math.cos(angle)));
  const s=scale();
  for(const rod of sorted){
    let amp;
    if(playing)amp=bands[rod.band].val*gain*.7;
    else amp=.04+.1*(.5+.5*Math.sin(rod.r*.5-t*.0009+rod.x*.13));
    const target=.45+Math.min(1.1,amp)*5.4;
    rod.h+=(target-rod.h)*(1-Math.pow(.45+smoothing*.53,dt));
    drawRod(rod,amp,s);
  }

  const sw=spec.clientWidth,sh=spec.clientHeight;sg.clearRect(0,0,sw,sh);
  for(let i=0;i<48;i++){
    let v=playing&&bins?bins[Math.min(bins.length-1,Math.floor(Math.pow(i/47,2)*700))]/255:0;
    sg.fillStyle=i<12?'#d8b975':i<30?'#c3cf87':'#95b1a1';
    sg.fillRect(i*sw/48,sh-Math.max(2,v*sh),sw/48-3,Math.max(2,v*sh));
  }

  if(t%150<25){
    let peak=0,peakIndex=0;
    if(playing&&bins)for(let i=0;i<bins.length;i++)if(bins[i]>peak){peak=bins[i];peakIndex=i}
    $('level').innerHTML=(playing?Math.round(20*Math.log10(Math.max(energy,.001))):'—')+'<small>dB</small>';
    $('freq').innerHTML=(playing&&peak>0?Math.round(peakIndex*ctx.sampleRate/2048):'—')+'<small>Hz</small>';
    if(playing){const seconds=offset+ctx.currentTime-started;$('elapsed').textContent=format(seconds);if(buffer&&mode==='file')$('seek').value=seconds/buffer.duration*100}
  }
  requestAnimationFrame(frame);
}

function format(s){return Math.floor(s/60).toString().padStart(2,'0')+':'+Math.floor(s%60).toString().padStart(2,'0')}

function size(){for(const c of [canvas,spec]){const rect=c.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);c.width=Math.round(rect.width*d);c.height=Math.round(rect.height*d);c.getContext('2d').setTransform(d,0,0,d,0,0)}buildRods()}
new ResizeObserver(size).observe(canvas);new ResizeObserver(size).observe(spec);

/* ---------------- 音频 ---------------- */

async function audio(){
  if(!ctx){
    ctx=new AudioContext();
    analyser=ctx.createAnalyser();
    analyser.fftSize=2048;
    analyser.smoothingTimeConstant=.75;
    bins=new Uint8Array(analyser.frequencyBinCount);
    dbBuf=new Float32Array(analyser.frequencyBinCount);
    wave=new Float32Array(analyser.fftSize);
    master=ctx.createGain();
    master.gain.value=.4;
    analyser.connect(master);
    master.connect(ctx.destination);
  }
  await ctx.resume();
}
function stop(){session++;loading=false;if(source){source.onended=null;try{source.stop?.()}catch{}source.disconnect();source=null}demoNodes.forEach(n=>{try{n.stop?.();n.disconnect()}catch{}});demoNodes=[];if(stream){stream.getTracks().forEach(t=>t.stop());stream=null}playing=false;update()}
function update(){$('play').textContent=playing?'Ⅱ':'▶';$('play').setAttribute('aria-label',playing?'暂停':'播放');$('demo').classList.toggle('selected',mode==='demo');$('mic').classList.toggle('selected',mode==='mic');$('status').textContent=playing?'运行中 · '+(mode==='demo'?'演示信号':mode==='mic'?'实时输入':'音频分析'):'待机 · '+(mode==='demo'?'演示预览':'已暂停');$('tracksub').textContent=playing?'控制棒随频谱实时响应':'点击播放，启动声场';$('seek').disabled=mode!=='file';}
async function start(){if(loading||playing)return;loading=true;const attempt=++session;try{await audio();if(attempt!==session)return;if(mode==='mic'){const id=++session;loading=true;$('message').textContent='等待麦克风授权…';const s=await navigator.mediaDevices.getUserMedia({audio:true});if(id!==session){s.getTracks().forEach(t=>t.stop());return}stream=s;source=ctx.createMediaStreamSource(s);source.connect(analyser);master.gain.value=0;$('message').textContent='正在监听麦克风；停止或切换输入即可关闭。'}else{master.gain.value=+$('volume').value/100;if(mode==='file'&&buffer){if(offset>=buffer.duration)offset=0;source=ctx.createBufferSource();source.buffer=buffer;source.connect(analyser);source.onended=()=>{stop();offset=0;$('seek').value=0;$('elapsed').textContent='00:00'};source.start(0,offset)}else{[55,82.41,110,164.81,220,329.63,440,659.25,1200,2400,4600,8200].forEach((freq,i)=>{const osc=ctx.createOscillator(),v=ctx.createGain(),lfo=ctx.createOscillator(),lg=ctx.createGain();osc.type=i<3?'triangle':'sine';osc.frequency.value=freq;v.gain.value=i<8?.028:.017;lfo.frequency.value=.22+i*.087;lg.gain.value=i<8?.024:.009;lfo.connect(lg);lg.connect(v.gain);osc.connect(v);v.connect(analyser);osc.start();lfo.start();demoNodes.push(osc,lfo,v,lg)})}$('message').textContent='音频仅在本机处理，不会上传。'}started=ctx.currentTime;playing=true;update()}catch(e){stop();$('message').textContent=mode==='mic'?'无法访问麦克风，请检查浏览器权限，或导入音频。':'无法播放此音频，请尝试其他文件。'}finally{if(attempt===session||!playing)loading=false}}

$('play').onclick=()=>{if(playing){offset+=ctx.currentTime-started;stop()}else start()};
$('demo').onclick=()=>{stop();mode='demo';offset=0;buffer=null;$('trackname').textContent='REACTOR / 内置信号';$('duration').textContent='DEMO / LOOP';$('elapsed').textContent='00:00';$('seek').value=0;update();start()};
$('mic').onclick=()=>{stop();mode='mic';offset=0;buffer=null;$('trackname').textContent='MIC / 麦克风输入';$('duration').textContent='LIVE';$('elapsed').textContent='00:00';update();start()};
$('upload').onclick=()=>$('file').click();
$('file').onchange=async e=>{const f=e.target.files[0];if(!f)return;stop();const id=session;loading=true;$('message').textContent='正在读取音频…';try{await audio();const decoded=await ctx.decodeAudioData(await f.arrayBuffer());if(id!==session)return;buffer=decoded;mode='file';offset=0;$('trackname').textContent=f.name;$('duration').textContent=format(buffer.duration);$('elapsed').textContent='00:00';$('seek').value=0;update();loading=false;await start()}catch{$('message').textContent='无法读取该文件，请尝试 MP3 或 WAV 音频。'}finally{loading=false;e.target.value=''}};
$('seek').onchange=()=>{if(mode!=='file'||!buffer)return;const was=playing;stop();offset=+$('seek').value/100*buffer.duration;$('elapsed').textContent=format(offset);if(was)start()};
$('gain').oninput=e=>{gain=+e.target.value;$('gainval').textContent=gain.toFixed(1)+'×'};
$('smooth').oninput=e=>{smoothing=+e.target.value/100;$('smoothval').textContent=e.target.value+'%'};
$('volume').oninput=e=>{$('volumeval').textContent=e.target.value+'%';if(master&&mode!=='mic')master.gain.setTargetAtTime(+e.target.value/100,ctx.currentTime,.03)};
canvas.onpointerdown=e=>{drag={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId)};
canvas.onpointermove=e=>{if(!drag)return;angle+=(e.clientX-drag.x)*.006;tilt=Math.max(.25,Math.min(.85,tilt+(e.clientY-drag.y)*.002));drag={x:e.clientX,y:e.clientY}};
canvas.onpointerup=canvas.onpointercancel=()=>drag=null;
canvas.addEventListener('wheel',e=>{e.preventDefault();zoom=Math.max(.65,Math.min(1.5,zoom-e.deltaY*.001))},{passive:false});
$('reset').onclick=()=>{angle=-.32;tilt=.58;zoom=1};
$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen()}catch{$('message').textContent='当前浏览器不支持全屏。'}};
document.addEventListener('fullscreenchange',()=>{$('fullscreen').textContent=document.fullscreenElement?'退出全屏 ↙':'全屏 ↗'});
window.addEventListener('pagehide',stop);
update();
requestAnimationFrame(frame);

if(document.modelContext?.registerTool){try{Promise.resolve(document.modelContext.registerTool({name:'configure_reactor_response',description:'Adjust the reactor audio visualizer sensitivity and motion smoothing.',inputSchema:{type:'object',properties:{sensitivity:{type:'number',minimum:.3,maximum:3},smoothing:{type:'number',minimum:0,maximum:95}},required:['sensitivity','smoothing'],additionalProperties:false},execute(input){if(!input||!Number.isFinite(input.sensitivity)||input.sensitivity<.3||input.sensitivity>3||!Number.isFinite(input.smoothing)||input.smoothing<0||input.smoothing>95)throw Error('Invalid response settings');$('gain').value=input.sensitivity;$('gain').dispatchEvent(new Event('input'));$('smooth').value=input.smoothing;$('smooth').dispatchEvent(new Event('input'));return{ sensitivity:gain,smoothing:smoothing*100}}})).catch(()=>{})}catch{}}
