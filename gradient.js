/*!
 * Bontgenoten jubileum-verloop (2027)
 * Engine: ODB_BONTGENOTEN_MOTION, from guides.odb.nl/bontgenoten (Gradient-tool · jubileum),
 * used with ODB's permission. Extracted by BORING on 2026-11-18.
 * ODB's code and shader text are kept verbatim; only tool UI, export, logo and storage code are left out.
 * Changes are marked "BORING". The API at the bottom mirrors the tool's preview loop (rebuildSource/tick).
 *
 * Usage: const g = BGFGradient.create(canvas, { preset: 'p7', text: '10' });
 *        g.setPreset('p7rev'); g.setState({ grain: .08 }); g.pause(); g.play(); g.destroy();
 * BORING interaction (all off = ODB's look): setState({ pointerStrips, lens, lensRadius, lensStrength, lensSoftness, pointerSmooth })
 *        + g.setPointer(x, y | null); option below: 'LINE-UP' + g.setScroll(0..1) slides the sheet behind the glass.
 * BORING live mask: g.setMask(canvas) replaces the text with any canvas (white = shape, black = empty), drawn like the source:
 *        the viewport is the middle 1/(1+2*0.3) of it (g.maskInset tells the inset as a fraction). Call g.updateMask() after drawing.
 * Needs the font family "Suisse BP" (weight 700) loaded on the page for the 10 to match.
 * BORING (site copy, site-code/gradient.js): the Webflow site names the font "Suisse Bp Intl", tried first; the canvas fires
 *        "bgf:rendered" after its first frame (site.js fades it in then).
 */
(function(){
'use strict';
// ---------- kleine hulpfuncties ----------
const clamp = (x,a,b) => Math.min(b, Math.max(a, x));
const lerp = (a,b,t) => a + (b-a)*t;
const TAU = Math.PI*2;
function fnv(str){ let h = 2166136261>>>0; for (let i=0;i<str.length;i++){ h ^= str.charCodeAt(i); h = Math.imul(h, 16777619)>>>0; } return h>>>0; }
function seedFromName(name){ return (fnv(String(name).trim().toLowerCase()) % 999999) + 1; }
function rng(seed){ let a = (seed>>>0) || 1; return function(){ a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const deep = o => JSON.parse(JSON.stringify(o));

// ---------- kleur ----------
function hexToRgb(h){ h = String(h||'#000').replace('#',''); if (h.length===3) h = h.split('').map(x=>x+x).join(''); const n = parseInt(h.slice(0,6),16) || 0; return [(n>>16&255)/255, (n>>8&255)/255, (n&255)/255]; }
const s2l = c => c <= 0.04045 ? c/12.92 : Math.pow((c+0.055)/1.055, 2.4);
function rgbToOklab(rgb){ const r=s2l(rgb[0]), g=s2l(rgb[1]), b=s2l(rgb[2]);
  const l=0.4122214708*r+0.5363325363*g+0.0514459929*b, m=0.2119034982*r+0.6806995451*g+0.1073969566*b, s=0.0883024619*r+0.2817188376*g+0.6299787005*b;
  const l_=Math.cbrt(l), m_=Math.cbrt(m), s_=Math.cbrt(s);
  return [0.2104542553*l_+0.7936177850*m_-0.0040720468*s_, 1.9779984951*l_-2.4285922050*m_+0.4505937099*s_, 0.0259040371*l_+0.7827717662*m_-0.8086757660*s_]; }
function sortedStops(st){ const s = (st.stops||[]).slice(0,8).map(x=>({c:x.c, p:clamp(+x.p,0,1)})); s.sort((a,b)=>a.p-b.p); if (!s.length) s.push({c:'#000000',p:0}); return s; }

// ---------- paletten (uit de referentiebeelden) ----------
const PALETTES = [
  { name:'Bontgenoten pitch', stops:[{c:'#F25921',p:0},{c:'#F48ADA',p:.22},{c:'#A7A2EE',p:.42},{c:'#0E0F19',p:.62},{c:'#458C13',p:.82},{c:'#F25921',p:1}] },
  { name:'Screenshot palet', stops:[{c:'#5B0341',p:0},{c:'#FB0401',p:.34},{c:'#A7C5EA',p:.68},{c:'#7994EE',p:1}] },
  { name:'Blauwe banden', stops:[{c:'#0A2238',p:0},{c:'#0A84E0',p:.38},{c:'#D7C3FE',p:.74},{c:'#F3EEFF',p:1}] },
  { name:'Oranje lila groen', stops:[{c:'#F07648',p:0},{c:'#CC9EF0',p:.45},{c:'#5DBB34',p:.78},{c:'#B4E45A',p:1}] },
  { name:'Inkt 19', stops:[{c:'#12060E',p:0},{c:'#12060E',p:1}] },
  { name:'ODB mint', stops:[{c:'#000000',p:0},{c:'#181A17',p:.3},{c:'#D7E5CB',p:.7},{c:'#EFFFE2',p:1}] },
  { name:'Neon', stops:[{c:'#7B0A0D',p:0},{c:'#F85B0D',p:.2},{c:'#AC64F7',p:.45},{c:'#C295E3',p:.65},{c:'#D5B381',p:.82},{c:'#95AD07',p:1}] },
  { name:'Vuur en lila', stops:[{c:'#420C04',p:0},{c:'#BA2405',p:.14},{c:'#FD4D14',p:.3},{c:'#EF6E46',p:.4},{c:'#ABAEEB',p:.58},{c:'#C8C9D4',p:.72},{c:'#F7ACBB',p:.88},{c:'#883379',p:1}] },
  { name:'Rood en grijs', stops:[{c:'#5A0F3A',p:0},{c:'#E50515',p:.28},{c:'#9EADB5',p:.62},{c:'#A6B6BD',p:.78},{c:'#FA3823',p:1}] },
  { name:'Zonsondergang', stops:[{c:'#1D0849',p:0},{c:'#7160C3',p:.2},{c:'#E6BACF',p:.4},{c:'#E2D2D1',p:.52},{c:'#E0C07E',p:.66},{c:'#E96E3B',p:.8},{c:'#390904',p:1}] },
];

// ---------- standaardinstellingen ----------
const DEFAULTS = {
  v: 1,
  name: 'Bontgenoten', seed: seedFromName('Bontgenoten'),
  seedMotion: true, seedStrips: true, seedColor: true, seedComp: true, compVar: 0.35,
  srcType: 'text', text: '10', fontWeight: 900, userFontName: '', textSize: 1.08, tracking: -0.03, leading: 0.9,
  posX: 0, posY: 0, rotation: 0, stretchX: 1, imgMode: 'lum', imgScale: 1, imageName: '',
  view: 'glass',
  loopSec: 8, fps: 25, nMoments: 5, hold: 0.32, ease: 3, easeType: 'zacht', loopMode: 'loop', loopOffset: 0, stagger: 0, staggerDir: 'lr',
  animDisp: true, animStrips: true, animZoom: true, animBlur: true, animGrad: true,
  dispMin: 0.012, dispMax: 0.42, blurMin: 0.006, blurMax: 0.12, stripsMin: 9, stripsMax: 20, zoomMax: 3.4,
  breathAmp: 0.12, breathCycles: 2, driftAmp: 0, driftCycles: 1, flowCycles: 0, floatAmp: 0,
  lockMoments: false, moments: [],
  glassType: 'ribbel', axis: 'v', curve: 0.6, randOff: 0.3, shiftB: 0, persp: 0, widthVar: 0.35, frost: 0, edge: 0, wave: 1.5, wrap: false,
  colorMode: 'shape', stops: deep(PALETTES[0].stops), hard: 0.12, mix: 'oklab', chromaKeep: 0.5, lift: 0.15,
  bg: '#CDCDCD', transparent: false, gradAngle: 90, gradLen: 1.3, gradOffset: 0, gradRepeat: 'mirror', maskInfl: 0.25, stripColorRand: 0.4, stripColorStep: 0,
  shapeLo: 0.12, shapeHi: 0.82,
  gMomentAmt: 0.6, gCouple: 0.35, gStripCouple: 0.5, gPulseAmp: 0.12, gPulseCycles: 2, gPulseSpread: 0.6, gPulseMode: 'wave', gLenPulse: 0, gTurns: 0, gSwing: 0,
  dAxis: 'v', dShrink: 'thick', dDensity: 64, dStretchA: 1, dStretchL: 3, dGapA: 0.22, dGapL: 0.08, dMin: 0, dMax: 1, dInvert: false, dGamma: 1, dRound: 0, dColor: 'image', dSolid: '#000000', dUnder: 0, dSource: 'shape',
  grain: 0.055, grainSize: 1.2, grainAnim: true, grainColor: false,
  ripAmt: 0, ripMode: 'adem', ripWaves: 1.5, ripCycles: 2,
  fluidAmt: 0, fluidScale: 1, fluidCycles: 1, fluidSwirl: 0, fluidDetail: 0.4, gSoft: 0,
  aspect: '4:5', customW: 1080, customH: 1350, res: 1, previewQ: 1, exportAA: true, mp4Quality: 'hoog', pngEvery: 1, batchNames: '', batchCount: 6, batchMode: 'names', batchKind: 'png',
};
// ---------- choreografie: momenten in een naadloze loop ----------
function genMoments(st, ink){
  const n = clamp(Math.round(st.nMoments),1,8);
  const r = rng((st.seedMotion ? st.seed : 1) * 7919 + n);
  const pick = () => { if (!ink || !ink.length) return [ (r()-.5)*.3, (r()-.5)*.3 ]; const p = ink[Math.floor(r()*ink.length)]; return [p[0], p[1]]; };
  const kinds = ['leesbaar'];
  const pool = ['abstract','close','half','abstract','close'];
  for (let i=1;i<n;i++){ let k; let guard=0; do { k = pool[Math.floor(r()*pool.length)]; guard++; } while ((k===kinds[i-1] || (i===n-1 && k===kinds[0])) && guard<20); kinds.push(k); }
  if (n>=3 && !kinds.includes('abstract')) kinds[1] = 'abstract';
  return kinds.map(k => {
    const m = { kind:k, c:0, z:1, fx:0, fy:0, b:0, s:r(), rot:0 };
    if (k==='leesbaar'){ m.c = .02 + r()*.08; m.b = r()*.12; }
    if (k==='half'){ m.c = .3 + r()*.25; m.z = 1 + r()*.35; m.b = .1 + r()*.25; const f = pick(); m.fx = f[0]; m.fy = f[1]; }
    if (k==='abstract'){ m.c = .72 + r()*.28; m.z = 1 + r()*.6; m.b = .05 + r()*.25; const f = pick(); m.fx = f[0]; m.fy = f[1]; }
    if (k==='close'){ m.c = .12 + r()*.3; m.z = st.zoomMax*(.6 + r()*.4); m.b = .65 + r()*.35; const f = pick(); m.fx = f[0]; m.fy = f[1]; m.rot = (r()-.5)*6; }
    for (const key of ['c','z','fx','fy','b','s','rot']) m[key] = Math.round(m[key]*1000)/1000;
    return m; }).map((m, i) => {
      // verloopstand en duur per moment (aparte reeks, zodat de rest van de momenten gelijk blijft)
      const r2 = rng((st.seedMotion ? st.seed : 1) * 104729 + i*31 + n);
      const span = m.kind === 'abstract' ? 1 : (m.kind === 'close' ? .7 : .45);
      m.g = Math.round((r2()-.5)*span*1000)/1000;
      m.d = Math.round((m.kind === 'leesbaar' ? 1.15 : (m.kind === 'close' ? 1.1 : .9 + r2()*.2))*100)/100;
      return m; });
}
const EASES = { zacht:0, lineair:1, in:2, uit:3, overshoot:4, elastisch:5, stuiter:6, cut:7 };
function easeFn(x, type, p){
  x = clamp(x, 0, 1); p = Math.max(1, p);
  switch (type){
    case 'lineair': return x;
    case 'in': return Math.pow(x, p);
    case 'uit': return 1 - Math.pow(1-x, p);
    case 'overshoot': { const c1 = .6*p, c3 = c1+1, y = x-1; return 1 + c3*y*y*y + c1*y*y; }
    case 'elastisch': return x <= 0 ? 0 : (x >= 1 ? 1 : Math.pow(2, -(4+p)*x) * Math.sin((x*10 - .75) * TAU/3) + 1);
    case 'stuiter': { const n1 = 7.5625, d1 = 2.75; if (x < 1/d1) return n1*x*x; if (x < 2/d1){ x -= 1.5/d1; return n1*x*x + .75; } if (x < 2.5/d1){ x -= 2.25/d1; return n1*x*x + .9375; } x -= 2.625/d1; return n1*x*x + .984375; }
    case 'cut': return x < .5 ? 0 : 1;
    default: return x < .5 ? .5*Math.pow(2*x, p) : 1 - .5*Math.pow(2*(1-x), p);
  }
}
const DEFAULT_MOMENT = { kind:'leesbaar', c:.05, z:1, fx:0, fy:0, b:.1, s:.5, rot:0, g:0, d:1 };
function momentTimes(st){
  const ms = (st.moments && st.moments.length) ? st.moments : [DEFAULT_MOMENT];
  const n = ms.length, pp = st.loopMode === 'pingpong';
  const segs = pp ? n-1 : n; const w = []; for (let i=0;i<segs;i++) w.push(Math.max(.05, ms[i].d ?? 1));
  const tot = w.reduce((a,b)=>a+b, 0) || 1; const T = [0]; for (let i=0;i<segs;i++) T.push(T[i] + w[i]/tot);
  return { ms, n, segs, T, pp };
}
function loopPos(st, t){ const tt = (((t + (st.loopOffset||0)) % 1) + 1) % 1; return st.loopMode === 'pingpong' ? 1 - Math.abs(2*tt - 1) : tt; }
function poseAt(st, t){
  t = ((t%1)+1)%1;
  const { ms, segs, T, n } = momentTimes(st); const tm = loopPos(st, t);
  let ia = 0, ib = 0, u = 0;
  if (segs > 0){ let i = 0; while (i < segs-1 && tm >= T[i+1]) i++; ia = i; ib = (i+1) % n; u = clamp((tm - T[i]) / Math.max(T[i+1]-T[i], 1e-6), 0, 1); }
  const h = clamp(st.hold, 0, .95);
  const e = segs > 0 ? (u < h ? 0 : easeFn((u-h)/(1-h), st.easeType, st.ease)) : 0;
  const a = ms[ia], b = ms[ib], m0 = ms[0];
  const val = (m, k) => (m[k] ?? DEFAULT_MOMENT[k]);
  const ch = (k, on) => on ? lerp(val(a,k), val(b,k), e) : val(m0, k);
  const chA = (k, on) => on ? val(a,k) : val(m0,k), chB = (k, on) => on ? val(b,k) : val(m0,k);
  const on = k => st[k] !== false;
  const breath = 1 + st.breathAmp * Math.sin(TAU * Math.round(st.breathCycles) * t);
  const dsp = c => Math.max(0, lerp(st.dispMin, st.dispMax, c) * breath);
  const c = ch('c', on('animDisp')), z = Math.max(1, ch('z', on('animZoom'))), bl = ch('b', on('animBlur')), s = ch('s', on('animStrips'));
  const fl = st.floatAmp, pc = Math.round(st.gPulseCycles||0);
  const gA = chA('g', on('animGrad')) * (st.gMomentAmt ?? 0), gB = chB('g', on('animGrad')) * (st.gMomentAmt ?? 0);
  return {
    c, disp: dsp(c), dA: dsp(chA('c', on('animDisp'))), dB: dsp(chB('c', on('animDisp'))), segU: segs > 0 ? u : 0,
    gA, gB, gm: lerp(gA, gB, e),
    strips: Math.max(1, lerp(st.stripsMin, st.stripsMax, s)),
    blur: Math.max(0, lerp(st.blurMin, st.blurMax, bl)),
    zoom: z,
    fx: ch('fx', on('animZoom')) + fl*.05*Math.sin(TAU*t), fy: ch('fy', on('animZoom')) + fl*.05*Math.sin(TAU*2*t + 1.3),
    rot: (ch('rot', on('animZoom')) + fl*2*Math.sin(TAU*t + .7)) * Math.PI/180,
    phase: st.driftAmp * Math.sin(TAU * Math.round(st.driftCycles) * t),
    flow: st.gradRepeat==='clamp' ? .25*Math.sin(TAU*Math.round(st.flowCycles)*t)*(st.flowCycles?1:0) : Math.round(st.flowCycles)*t*(st.gradRepeat==='mirror'?2:1),
    gPh: TAU * pc * t,
    gLen: Math.max(.05, st.gradLen * (1 + (st.gLenPulse||0) * Math.sin(TAU*pc*t) * .6)),
    gAng: Math.round(st.gTurns||0) * 360 * t + (st.gSwing||0) * Math.sin(TAU*pc*t + .9),
  };
}

// ---------- seed-afgeleide waarden ----------
function seeded(st){
  const rs = rng((st.seedStrips ? st.seed : 1)*31 + 5);
  const rc = rng((st.seedColor ? st.seed : 1)*131 + 9);
  const rp = rng((st.seedComp ? st.seed : 1)*577 + 3);
  const wph = [1.3 + rs(), rs()*TAU, 2.7 + rs()*1.2, rs()*TAU];
  const stripSeed = Math.floor(rs()*4294967295)>>>0;
  const colOff = st.seedColor ? (rc()-.5)*.6 : 0;
  const colAng = st.seedColor ? (rc()-.5)*30 : 0;
  const k = st.seedComp ? st.compVar : 0;
  const comp = { dx:(rp()-.5)*k*.5, dy:(rp()-.5)*k*.4, rot:(rp()-.5)*k*16, sc:1 + (rp()-.5)*k*.35 };
  return { wph, stripSeed, colOff, colAng, comp };
}
// ---------- shaders ----------
const VS = `#version 300 es
in vec2 aPos; out vec2 vUv; void main(){ vUv = aPos*0.5+0.5; gl_Position = vec4(aPos,0.0,1.0); }`;

const FS_CAM = `#version 300 es
precision highp float; in vec2 vUv; out vec4 o;
uniform sampler2D uSrc; uniform vec2 uAsp; uniform float uM; uniform vec2 uS; uniform float uZoom; uniform vec2 uF; uniform float uRot;
uniform vec2 uSC; uniform float uOffY; // BORING: source centre + vertical sheet offset (scroll); 0 = ODB
void main(){
  vec2 fu = mix(vec2(-uM), vec2(1.0+uM), vUv);
  vec2 c = vec2((fu.x-0.5)*uAsp.x, (0.5-fu.y)*uAsp.y);
  vec2 cz = c/uZoom; float cs = cos(uRot), sn = sin(uRot);
  vec2 s = vec2(cs*cz.x - sn*cz.y, sn*cz.x + cs*cz.y) + uF*(1.0 - 1.0/uZoom);
  vec2 st = (s + vec2(0.0, uOffY) - uSC)/(2.0*uS) + 0.5; float v = 0.0; // BORING: was s/(2.0*uS) + 0.5
  if (all(greaterThanEqual(st, vec2(0.0))) && all(lessThanEqual(st, vec2(1.0)))) v = texture(uSrc, st).r;
  o = vec4(v, 0.0, 0.0, 1.0);
}`;

const FS_BLUR = `#version 300 es
precision highp float; in vec2 vUv; out vec4 o;
uniform sampler2D uTex; uniform vec2 uDir; uniform float uSigma;
void main(){
  float s = uSigma; if (s < 0.35){ o = texture(uTex, vUv); return; }
  float stp = max(1.0, s/3.0); int n = int(ceil(3.0*s/stp));
  vec4 acc = texture(uTex, vUv); float ws = 1.0;
  for (int i=1;i<=40;i++){ if (i>n) break; float x = float(i)*stp; float w = exp(-0.5*x*x/(s*s)); acc += w*(texture(uTex, vUv+uDir*x) + texture(uTex, vUv-uDir*x)); ws += 2.0*w; }
  o = acc/ws;
}`;

const FS_MAIN = `#version 300 es
precision highp float; precision highp int;
in vec2 vUv; out vec4 outColor;
uniform vec2 uRes; uniform float uShort; uniform vec2 uAsp; uniform sampler2D uMask; uniform float uM; uniform int uView; uniform uint uSeedS;
uniform int uGType; uniform int uAxis; uniform float uN; uniform float uCurve;
uniform float uDA; uniform float uDB; uniform float uGA; uniform float uGB; uniform float uSegU; uniform float uHold; uniform int uEaseT; uniform float uEaseP; uniform float uStag; uniform int uStagMode;
uniform float uRipA; uniform float uRipF; uniform float uRipPh; uniform int uRipMode;
uniform float uGPAmp; uniform float uGPPh; uniform float uGPSpread; uniform int uGPMode; uniform float uRandOff; uniform float uShiftB; uniform float uPersp; uniform float uWVar; uniform vec4 uWPh; uniform float uPhase; uniform float uFrost; uniform float uEdge; uniform float uWave; uniform int uWrap;
uniform vec3 uStop[8]; uniform float uSPos[8]; uniform int uNS; uniform float uHard; uniform int uMixM;
uniform float uFAmt; uniform float uFScale; uniform float uFT; uniform float uFSwirl; uniform float uFDetail; uniform float uGSoft;
uniform int uCMode; uniform vec3 uBg; uniform int uTransp; uniform vec2 uGDir; uniform float uGLen; uniform float uGOff; uniform int uGRep; uniform float uMInfl; uniform float uSRand; uniform float uSStep; uniform float uLo; uniform float uHi;
uniform int uDAxis; uniform int uDShrink; uniform float uDCell; uniform vec2 uDStretch; uniform vec2 uDGap; uniform float uDMin; uniform float uDMax; uniform int uDInv; uniform float uDGamma; uniform float uDRound; uniform int uDCol; uniform vec3 uDSolid; uniform float uDUnder; uniform int uDSrc;
uniform float uGrain; uniform float uGrainSize; uniform float uFrame; uniform int uGrainCol; uniform int uAA;
// BORING: lens under the pointer (uLensAmt 0 = ODB). srcAt = FS_CAM's camera on the unblurred source.
uniform vec2 uPointer; uniform float uLensR; uniform float uLensAmt; uniform float uLensSoft;
uniform sampler2D uSrc; uniform vec2 uS; uniform float uZoom; uniform vec2 uF; uniform float uRot; uniform vec2 uSC; uniform float uOffY;
float lensF(vec2 c){ return uLensAmt*(1.0 - smoothstep(uLensR*(1.0 - uLensSoft) - 1e-4, uLensR, length(c - uPointer))); }
float srcAt(vec2 p){ vec2 cz = p/uZoom; float cs = cos(uRot), sn = sin(uRot);
  vec2 s = vec2(cs*cz.x - sn*cz.y, sn*cz.x + cs*cz.y) + uF*(1.0 - 1.0/uZoom); vec2 st = (s + vec2(0.0, uOffY) - uSC)/(2.0*uS) + 0.5;
  if (any(lessThan(st, vec2(0.0))) || any(greaterThan(st, vec2(1.0)))) return 0.0; return texture(uSrc, st).r; }

uint pcg(uint v){ uint s = v*747796405u + 2891336453u; uint w = ((s >> ((s >> 28u) + 4u)) ^ s) * 277803737u; return (w >> 22u) ^ w; }
float rndI(int i, uint k){ return float(pcg(uint(i + 1048576) ^ pcg(k + uSeedS))) / 4294967295.0; }
float hash2(vec2 p, float f){ ivec2 q = ivec2(floor(p)) + 65536; uint h = pcg(uint(q.x) + pcg(uint(q.y) + pcg(uint(int(f) + 7)))); return float(h)/4294967295.0; }

vec3 oklab2lin(vec3 c){ float l_ = c.x + 0.3963377774*c.y + 0.2158037573*c.z; float m_ = c.x - 0.1055613458*c.y - 0.0638541728*c.z; float s_ = c.x - 0.0894841775*c.y - 1.2914855480*c.z;
  float l = l_*l_*l_, m = m_*m_*m_, s = s_*s_*s_;
  return vec3(4.0767416621*l - 3.3077115913*m + 0.2309699292*s, -1.2684380046*l + 2.6097574011*m - 0.3413193965*s, -0.0041960863*l - 0.7034186147*m + 1.7076147010*s); }
vec3 lin2srgb(vec3 c){ c = clamp(c, 0.0, 1.0); return mix(c*12.92, 1.055*pow(c, vec3(1.0/2.4)) - 0.055, step(vec3(0.0031308), c)); }
uniform float uCKeep; uniform float uLift;
vec3 mixStops(vec3 a, vec3 b, float u){
  float ca = length(a.yz), cb = length(b.yz);
  if (uMixM == 1){ float ha = atan(a.z, a.y), hb = atan(b.z, b.y);
    if (ca < 0.02) ha = hb; if (cb < 0.02) hb = ha; float dh = hb - ha; dh = dh - 6.2831853*floor((dh + 3.14159265)/6.2831853);
    float h = ha + dh*u; float C = mix(ca, cb, u); return vec3(mix(a.x, b.x, u) + uLift*4.0*u*(1.0-u)*0.25, C*cos(h), C*sin(h)); }
  vec3 m = mix(a, b, u);
  if (uMixM == 0){
    float cl = mix(ca, cb, u), cm = length(m.yz);
    float loss = clamp(1.0 - cm/max(cl, 1e-4), 0.0, 1.0);
    if (uCKeep > 0.0 && cm > 1e-4) m.yz *= mix(1.0, min(cl/cm, 6.0), uCKeep);
    m.x += uLift*4.0*u*(1.0-u)*loss;
  }
  return m; }
vec3 toOut(vec3 c){ return uMixM == 2 ? c : lin2srgb(oklab2lin(c)); }
vec3 gradM(float t){
  if (t <= uSPos[0]) return uStop[0];
  for (int i=0;i<7;i++){ if (i >= uNS-1) break; float a = uSPos[i], b = uSPos[i+1];
    if (t <= b){ float u = (t-a)/max(b-a, 1e-5); float w = max(1.0-uHard, 0.002); u = clamp((u-0.5)/w + 0.5, 0.0, 1.0); return mixStops(uStop[i], uStop[i+1], u); } }
  return uStop[uNS-1]; }
vec3 grad(float t){ return toOut(gradM(t)); }
// vloeiend verloop: zachte ruis die naadloos rondloopt in de tijd (cirkel door de ruisruimte)
float fh(vec2 i){ return fract(sin(dot(i, vec2(127.1, 311.7)))*43758.5453); }
float fnoise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.0 - 2.0*f);
  return mix(mix(fh(i), fh(i + vec2(1.0, 0.0)), u.x), mix(fh(i + vec2(0.0, 1.0)), fh(i + vec2(1.0, 1.0)), u.x), u.y); }
float ffbm(vec2 p){ float a = fnoise(p); float w = uFDetail; a += w*0.5*fnoise(p*2.03 + 17.1); a += w*w*0.25*fnoise(p*4.01 + 31.7); return a/(1.0 + w*0.5 + w*w*0.25); }
vec2 fluidWarp(vec2 p){
  if (uFAmt <= 0.0 && uFSwirl <= 0.0) return p;
  vec2 ring = vec2(cos(uFT), sin(uFT));
  if (uFSwirl > 0.0){ float r = length(p); float a = uFSwirl*0.9*sin(uFT + r*3.0)*exp(-r*r*0.6); float ca = cos(a), sa = sin(a); p = vec2(ca*p.x - sa*p.y, sa*p.x + ca*p.y); }
  if (uFAmt > 0.0){
    vec2 q = p*1.4/max(uFScale, 0.05);
    vec2 w = vec2(ffbm(q + ring*0.9), ffbm(q + vec2(5.2, 1.3) - ring.yx*0.9)) - 0.5;
    vec2 r2 = vec2(ffbm(q + 2.2*w + vec2(1.7, 9.2) + ring*0.6), ffbm(q + 2.2*w + vec2(8.3, 2.8) - ring*0.6)) - 0.5;
    p += uFAmt*0.9*max(uFScale, 0.05)*r2; }
  return p; }
float wrapT(float t){ if (uGRep == 0) return clamp(t, 0.0, 1.0); if (uGRep == 1) return fract(t); return 1.0 - abs(fract(t*0.5)*2.0 - 1.0); }

float easeF(float x){ x = clamp(x, 0.0, 1.0); float p = max(1.0, uEaseP);
  if (uEaseT == 1) return x;
  if (uEaseT == 2) return pow(x, p);
  if (uEaseT == 3) return 1.0 - pow(1.0 - x, p);
  if (uEaseT == 4){ float c1 = 0.6*p; float c3 = c1 + 1.0; float y = x - 1.0; return 1.0 + c3*y*y*y + c1*y*y; }
  if (uEaseT == 5){ if (x <= 0.0) return 0.0; if (x >= 1.0) return 1.0; return pow(2.0, -(4.0 + p)*x)*sin((x*10.0 - 0.75)*2.0943951) + 1.0; }
  if (uEaseT == 6){ float n1 = 7.5625, d1 = 2.75; if (x < 1.0/d1) return n1*x*x; if (x < 2.0/d1){ x -= 1.5/d1; return n1*x*x + 0.75; } if (x < 2.5/d1){ x -= 2.25/d1; return n1*x*x + 0.9375; } x -= 2.625/d1; return n1*x*x + 0.984375; }
  if (uEaseT == 7) return x < 0.5 ? 0.0 : 1.0;
  return x < 0.5 ? 0.5*pow(2.0*x, p) : 1.0 - 0.5*pow(2.0*(1.0 - x), p); }
float segEase(float u){ return u < uHold ? 0.0 : easeF((u - uHold)/max(1.0 - uHold, 1e-4)); }
struct G { vec2 p; float f; float r1; float idx; float r2; float ge; };
G glass(vec2 c){
  G g; g.p = c; g.f = 0.5; g.r1 = 0.5; g.idx = 0.0; g.r2 = 0.5; g.ge = mix(uGA, uGB, segEase(uSegU));
  if (uView == 1) return g;
  float span = uAxis == 0 ? uAsp.x : uAsp.y;
  float a = uAxis == 0 ? c.x : c.y; float b = uAxis == 0 ? c.y : c.x;
  float u = a/span + 0.5;
  float up = u + uPersp*u*(1.0-u);
  float w = uWVar*(0.6*sin(6.2831853*uWPh.x*up + uWPh.y)/(6.2831853*uWPh.x) + 0.4*sin(6.2831853*uWPh.z*up + uWPh.w)/(6.2831853*uWPh.z));
  // rimpel: de glasplaten schuiven naar elkaar toe en uit elkaar (staand) of als lopende golf
  float rp = 0.0;
  if (uRipA > 0.0){ float ph = 6.2831853*uRipF*up; rp = uRipMode == 0 ? sin(uRipPh)*sin(ph) : sin(ph - uRipPh); rp *= uRipA/(6.2831853*max(uRipF, 0.05)); }
  float s = uN*(up + w + rp - 0.5) + uPhase;
  float i = floor(s); float f = fract(s); int ii = int(i);
  float r1 = rndI(ii, 11u), r2 = rndI(ii, 23u);
  float t = 2.0*f - 1.0; float prof;
  if (uGType == 0) prof = t;
  else if (uGType == 1) prof = mix(t, t*t*t, uCurve);
  else if (uGType == 2) prof = 0.0;
  else if (uGType == 3) prof = sin(6.2831853*(f + b*uWave));
  else { float per = floor(2.0 + uCurve*10.0); prof = (mod(i, per)/max(per-1.0, 1.0))*2.0 - 1.0; }
  // cascade: elke strook start de overgang iets later
  float ord = 0.0; float pos = clamp((i + 0.5 - uPhase)/max(uN, 1.0) + 0.5, 0.0, 1.0);
  if (uStagMode == 0) ord = pos; else if (uStagMode == 1) ord = 1.0 - pos; else if (uStagMode == 2) ord = abs(pos - 0.5)*2.0; else ord = rndI(ii, 53u);
  float lu = uStag > 0.0 ? clamp((uSegU - uStag*ord)/max(1.0 - uStag, 1e-4), 0.0, 1.0) : uSegU;
  float es = segEase(lu);
  float dsp = mix(uDA, uDB, es);
  float d = dsp*(prof + uRandOff*(2.0*r1 - 1.0));
  if (uLensAmt > 0.0) d *= 1.0 - lensF(c); // BORING: the glass clears under the lens
  if (uFrost > 0.0) d += uFrost*0.04*(hash2(c*uShort*0.5, 3.0) - 0.5);
  float db = uShiftB*(2.0*r2 - 1.0);
  a += d; b += db;
  g.p = uAxis == 0 ? vec2(a, b) : vec2(b, a);
  g.f = f; g.r1 = r1; g.idx = i; g.r2 = rndI(ii, 71u); g.ge = mix(uGA, uGB, es);
  return g; }

float maskAt(vec2 p){
  vec2 fu = vec2(p.x/uAsp.x + 0.5, 0.5 - p.y/uAsp.y);
  if (uWrap == 1) fu = fract(fu);
  vec2 m = (fu + uM)/(1.0 + 2.0*uM);
  if (any(lessThan(m, vec2(0.0))) || any(greaterThan(m, vec2(1.0)))) return 0.0;
  return clamp(texture(uMask, m).r, 0.0, 1.0); }

vec4 scene(vec2 c){
  G g = glass(c);
  float v = maskAt(g.p);
  if (uLensAmt > 0.0){ float lf = lensF(c); if (lf > 0.0){ // BORING: sharp shape, no strip steps, no edge light under the lens
    v = mix(v, srcAt(g.p), lf); g.idx = mix(g.idx, g.idx + g.f - 0.5, lf); g.r1 = mix(g.r1, 0.5, lf); g.f = mix(g.f, 0.5, lf); } }
  float ph = uGPMode == 0 ? 6.2831853*uGPSpread*g.idx/max(uN, 1.0) : 6.2831853*uGPSpread*g.r2;
  float tg = dot(fluidWarp(g.p), uGDir)/uGLen + 0.5 + uGOff + g.ge + uGPAmp*sin(uGPPh - ph) + uMInfl*(v - 0.5) + uSRand*(g.r1 - 0.5) + uSStep*g.idx;
  vec3 col;
  if (uGSoft > 0.0){ float sw = uGSoft*0.22; vec3 c0 = gradM(wrapT(tg));
    vec3 m = (gradM(wrapT(tg - sw)) + 2.0*gradM(wrapT(tg - sw*0.5)) + 3.0*c0 + 2.0*gradM(wrapT(tg + sw*0.5)) + gradM(wrapT(tg + sw)))/9.0;
    if (uMixM != 2){ float ca = length(m.yz), cc = length(c0.yz); if (ca > 1e-4) m.yz *= mix(1.0, clamp(cc/ca, 1.0, 2.0), 0.7); }
    col = toOut(m); }
  else col = grad(wrapT(tg));
  if (uEdge != 0.0 && uView != 1){ float e = smoothstep(0.8, 1.0, g.f)*0.7 - (1.0 - smoothstep(0.0, 0.14, g.f))*0.5; col = clamp(col + uEdge*e*0.35, 0.0, 1.0); }
  float al = uCMode == 0 ? smoothstep(uLo, max(uHi, uLo + 1e-4), v) : 1.0;
  return vec4(col, al); }

vec4 comp(vec4 s){ if (uTransp == 1) return s; return vec4(mix(uBg, s.rgb, s.a), 1.0); }

vec4 ditherAt(vec2 c){
  vec2 px = c*uShort;
  float acr = uDCell*uDStretch.x, alo = uDCell*uDStretch.y;
  vec2 cs = uDAxis == 0 ? vec2(acr, alo) : vec2(alo, acr);
  vec2 gq = px/cs; vec2 ci = floor(gq); vec2 lc = fract(gq) - 0.5;
  vec2 cc = (ci + 0.5)*cs/uShort;
  vec4 s = scene(cc);
  vec3 base = mix(uBg, s.rgb, s.a);
  float v = uDSrc == 0 ? s.a : 1.0 - dot(uTransp == 1 ? s.rgb*s.a : base, vec3(0.2126, 0.7152, 0.0722));
  if (uDInv == 1) v = 1.0 - v;
  v = pow(clamp(v, 0.0, 1.0), uDGamma);
  float sz = mix(uDMin, uDMax, v);
  float hA = (0.5 - 0.5*uDGap.x)*acr*((uDShrink == 0 || uDShrink == 2) ? sz : 1.0);
  float hL = (0.5 - 0.5*uDGap.y)*alo*((uDShrink == 1 || uDShrink == 2) ? sz : 1.0);
  vec2 he = uDAxis == 0 ? vec2(hA, hL) : vec2(hL, hA);
  vec2 lp = lc*cs;
  float r = uDRound*min(he.x, he.y);
  vec2 q = abs(lp) - he + r;
  float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  float cov = clamp(0.5 - d, 0.0, 1.0);
  if (min(he.x, he.y) <= 0.02) cov = 0.0;
  vec3 bc;
  if (uDCol == 0) bc = s.rgb;
  else if (uDCol == 1){ float al = uDAxis == 0 ? lc.y : lc.x; bc = grad(wrapT((al + 0.5)*0.6 + v*0.4 + uGOff)); }
  else bc = uDSolid;
  vec3 ur = uBg; float ua = uTransp == 1 ? 0.0 : 1.0;
  if (uDUnder > 0.0){ vec4 sp = scene(c); vec3 bu = uTransp == 1 ? sp.rgb : mix(uBg, sp.rgb, sp.a); float au = uTransp == 1 ? sp.a : 1.0;
    ur = mix(ur, bu, uDUnder); ua = mix(ua, au, uDUnder); }
  float a = cov + ua*(1.0 - cov);
  vec3 rgb = (bc*cov + ur*ua*(1.0 - cov))/max(a, 1e-4);
  return vec4(rgb, a); }

vec4 shade(vec2 fc){
  vec2 c = vec2(fc.x - 0.5*uRes.x, (uRes.y - fc.y) - 0.5*uRes.y)/uShort;
  if (uView == 0) return comp(scene(c));
  return ditherAt(c); }

void main(){
  vec2 fc = gl_FragCoord.xy; vec4 acc;
  if (uAA > 1){ acc = vec4(0.0);
    for (int k=0;k<4;k++){ vec2 o = vec2(k == 0 || k == 2 ? -0.25 : 0.25, k < 2 ? -0.25 : 0.25); vec4 s = shade(fc + o); acc += vec4(s.rgb*s.a, s.a); }
    acc *= 0.25; acc.rgb = acc.a > 0.0 ? acc.rgb/acc.a : vec3(0.0); }
  else acc = shade(fc);
  if (uGrain > 0.0){ vec2 gp = fc/max(uGrainSize*uShort/1080.0, 0.35);
    if (uGrainCol == 1){ vec3 n = vec3(hash2(gp, uFrame*3.0+1.0), hash2(gp, uFrame*3.0+2.0), hash2(gp, uFrame*3.0+3.0)) + vec3(hash2(gp+17.0, uFrame*3.0+1.0), hash2(gp+17.0, uFrame*3.0+2.0), hash2(gp+17.0, uFrame*3.0+3.0)) - 1.0; acc.rgb += n*uGrain; }
    else { float n = hash2(gp, uFrame) + hash2(gp + 31.0, uFrame + 0.5) - 1.0; acc.rgb += n*uGrain; } }
  outColor = vec4(clamp(acc.rgb, 0.0, 1.0), clamp(acc.a, 0.0, 1.0));
}`;

// ---------- engine ----------
const OVERSCAN_MASK = 0.3;   // extra marge rond het beeld voor verschoven samples
const OVERSCAN_SRC = 0.3;    // extra marge in de bron (tekst mag buiten beeld vallen)
class Engine {
  constructor(canvas){
    this.canvas = canvas;
    const gl = canvas.getContext('webgl2', { alpha:true, premultipliedAlpha:false, preserveDrawingBuffer:true, antialias:false });
    if (!gl) throw new Error('webgl2');
    this.gl = gl;
    this.floatOK = !!gl.getExtension('EXT_color_buffer_float');
    gl.getExtension('OES_texture_float_linear');
    this.maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    this.pCam = this.prog(VS, FS_CAM); this.pBlur = this.prog(VS, FS_BLUR); this.pMain = this.prog(VS, FS_MAIN);
    this.vao = gl.createVertexArray(); gl.bindVertexArray(this.vao);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
    for (const p of [this.pCam, this.pBlur, this.pMain]){ const loc = gl.getAttribLocation(p.p, 'aPos'); if (loc >= 0){ gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0); } }
    this.srcTex = gl.createTexture(); this.levels = {}; this.W = 0; this.H = 0; this.srcReady = false;
  }
  prog(vs, fs){
    const gl = this.gl; const mk = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    const p = gl.createProgram(); gl.attachShader(p, mk(gl.VERTEX_SHADER, vs)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs)); gl.bindAttribLocation(p, 0, 'aPos'); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const cache = {}; return { p, u: n => (n in cache) ? cache[n] : (cache[n] = gl.getUniformLocation(p, n)) };
  }
  setOutput(w, h){
    if (w === this.W && h === this.H) return;
    this.W = w; this.H = h; this.canvas.width = w; this.canvas.height = h;
    const gl = this.gl; for (const k in this.levels){ const L = this.levels[k]; for (const t of L.tex) gl.deleteTexture(t); for (const f of L.fb) gl.deleteFramebuffer(f); } this.levels = {};
  }
  level(L){
    if (this.levels[L]) return this.levels[L];
    const gl = this.gl; const mw = Math.ceil(this.W*(1+2*OVERSCAN_MASK)), mh = Math.ceil(this.H*(1+2*OVERSCAN_MASK));
    const w = Math.max(2, Math.ceil(mw/Math.pow(2,L))), h = Math.max(2, Math.ceil(mh/Math.pow(2,L)));
    const tex = [], fb = [];
    for (let i=0;i<2;i++){ const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
      if (this.floatOK) gl.texImage2D(gl.TEXTURE_2D, 0, gl.R16F, w, h, 0, gl.RED, gl.HALF_FLOAT, null); else gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, w, h, 0, gl.RED, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      const f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
      tex.push(t); fb.push(f); }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return (this.levels[L] = { w, h, tex, fb });
  }
  setSource(cv, info){
    const gl = this.gl; gl.bindTexture(gl.TEXTURE_2D, this.srcTex); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, cv); gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.srcInfo = info; this.srcReady = true;
  }
  render(st, t, frame, aa, gscale=1){
    if (st.showShape === false) st = Object.assign({}, st, { colorMode:'field', maskInfl:0 });  // zonder 10: alleen het verloop
    const gl = this.gl, W = this.W, H = this.H; if (!W || !H || !this.srcReady) return;
    const short = Math.min(W, H), asp = [W/short, H/short];
    const pose = poseAt(st, t), sd = seeded(st);
    const bx = st.boring || {}; // BORING: interaction from the wrapper; empty = ODB's render
    if (bx.strips){ pose.strips = Math.max(1, lerp(st.stripsMin, st.stripsMax, bx.strips.s)); pose.phase += bx.strips.phase; }
    // 1. camera → mask (op het blur-niveau)
    const sigma = pose.blur * short;
    const L = sigma > 6 ? clamp(Math.ceil(Math.log2(sigma/6)), 0, 5) : 0;
    const lv = this.level(L);
    gl.bindVertexArray(this.vao); gl.disable(gl.BLEND);
    gl.useProgram(this.pCam.p); gl.bindFramebuffer(gl.FRAMEBUFFER, lv.fb[0]); gl.viewport(0, 0, lv.w, lv.h);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.srcTex);
    const U = this.pCam.u; gl.uniform1i(U('uSrc'), 0); gl.uniform2f(U('uAsp'), asp[0], asp[1]); gl.uniform1f(U('uM'), OVERSCAN_MASK);
    gl.uniform2f(U('uS'), asp[0]/2*(1+2*OVERSCAN_SRC), asp[1]/2*(1+2*OVERSCAN_SRC)); gl.uniform1f(U('uZoom'), pose.zoom); gl.uniform2f(U('uF'), pose.fx, pose.fy); gl.uniform1f(U('uRot'), pose.rot);
    const sheetS = [asp[0]/2*(1+2*OVERSCAN_SRC), bx.srcHY || asp[1]/2*(1+2*OVERSCAN_SRC)]; // BORING: tall sheet source
    gl.uniform2f(U('uS'), sheetS[0], sheetS[1]); gl.uniform2f(U('uSC'), 0, bx.srcCY || 0); gl.uniform1f(U('uOffY'), bx.offY || 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    // 2. blur (gescheiden, op lager niveau bij grote blur)
    const sL = sigma / Math.pow(2, L);
    let cur = 0;
    if (sL >= 0.35){
      gl.useProgram(this.pBlur.p); const B = this.pBlur.u; gl.uniform1i(B('uTex'), 0); gl.uniform1f(B('uSigma'), sL);
      gl.bindFramebuffer(gl.FRAMEBUFFER, lv.fb[1]); gl.bindTexture(gl.TEXTURE_2D, lv.tex[0]); gl.uniform2f(B('uDir'), 1/lv.w, 0); gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.bindFramebuffer(gl.FRAMEBUFFER, lv.fb[0]); gl.bindTexture(gl.TEXTURE_2D, lv.tex[1]); gl.uniform2f(B('uDir'), 0, 1/lv.h); gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    // 3. hoofdpass
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, W, H);
    gl.useProgram(this.pMain.p); const M = this.pMain.u;
    gl.bindTexture(gl.TEXTURE_2D, lv.tex[cur]); gl.uniform1i(M('uMask'), 0);
    gl.uniform2f(M('uRes'), W, H); gl.uniform1f(M('uShort'), short); gl.uniform2f(M('uAsp'), asp[0], asp[1]); gl.uniform1f(M('uM'), OVERSCAN_MASK);
    gl.uniform1i(M('uView'), st.view==='dither'?1:(st.view==='both'?2:0)); gl.uniform1ui(M('uSeedS'), sd.stripSeed);
    gl.uniform1i(M('uGType'), ({ribbel:0,cilinder:1,prisma:2,golf:3,trap:4})[st.glassType] ?? 0); gl.uniform1i(M('uAxis'), st.axis==='h'?1:0);
    gl.uniform1f(M('uN'), pose.strips);
    gl.uniform1f(M('uDA'), pose.dA); gl.uniform1f(M('uDB'), pose.dB); gl.uniform1f(M('uGA'), pose.gA); gl.uniform1f(M('uGB'), pose.gB); gl.uniform1f(M('uSegU'), pose.segU);
    gl.uniform1f(M('uHold'), clamp(st.hold, 0, .95)); gl.uniform1i(M('uEaseT'), EASES[st.easeType] ?? 0); gl.uniform1f(M('uEaseP'), st.ease);
    gl.uniform1f(M('uStag'), clamp(st.stagger, 0, .95)); gl.uniform1i(M('uStagMode'), ({lr:0,rl:1,mid:2,rand:3})[st.staggerDir] ?? 0);
    gl.uniform1f(M('uGPAmp'), st.gPulseAmp); gl.uniform1f(M('uGPPh'), pose.gPh); gl.uniform1f(M('uGPSpread'), st.gPulseSpread); gl.uniform1i(M('uGPMode'), st.gPulseMode==='rand'?1:0); gl.uniform1f(M('uCurve'), st.curve); gl.uniform1f(M('uRandOff'), st.randOff);
    gl.uniform1f(M('uShiftB'), st.shiftB); gl.uniform1f(M('uPersp'), clamp(st.persp,-.95,.95)); gl.uniform1f(M('uWVar'), clamp(st.widthVar,0,.95)); gl.uniform4f(M('uWPh'), ...sd.wph);
    gl.uniform1f(M('uRipA'), Math.min(st.ripAmt || 0, Math.max(0, .97 - clamp(st.widthVar,0,.95)))); gl.uniform1f(M('uRipF'), st.ripWaves || 1); gl.uniform1f(M('uRipPh'), TAU*Math.round(st.ripCycles || 0)*t); gl.uniform1i(M('uRipMode'), st.ripMode === 'golf' ? 1 : 0);
    gl.uniform1f(M('uPhase'), pose.phase); gl.uniform1f(M('uFrost'), st.frost); gl.uniform1f(M('uEdge'), st.edge); gl.uniform1f(M('uWave'), st.wave); gl.uniform1i(M('uWrap'), st.wrap?1:0);
    const stops = sortedStops(st); const mixM = st.mix==='oklch'?1:(st.mix==='rgb'?2:0);
    const sv = new Float32Array(24), sp = new Float32Array(8);
    stops.forEach((s,i) => { const c = mixM===2 ? hexToRgb(s.c) : rgbToOklab(hexToRgb(s.c)); sv.set(c, i*3); sp[i] = s.p; });
    for (let i=stops.length;i<8;i++){ sp[i] = 2; }
    gl.uniform3fv(M('uStop[0]'), sv); gl.uniform1fv(M('uSPos[0]'), sp); gl.uniform1i(M('uNS'), stops.length); gl.uniform1f(M('uHard'), st.hard); gl.uniform1i(M('uMixM'), mixM); gl.uniform1f(M('uCKeep'), st.chromaKeep); gl.uniform1f(M('uLift'), st.lift);
    gl.uniform1i(M('uCMode'), st.colorMode==='field'?1:0); gl.uniform3fv(M('uBg'), hexToRgb(st.bg)); gl.uniform1i(M('uTransp'), st.transparent?1:0);
    const ang = (st.gradAngle + sd.colAng + pose.gAng) * Math.PI/180; gl.uniform2f(M('uGDir'), Math.cos(ang), Math.sin(ang));
    gl.uniform1f(M('uFAmt'), st.fluidAmt||0); gl.uniform1f(M('uFScale'), st.fluidScale||1); gl.uniform1f(M('uFT'), TAU*Math.round(st.fluidCycles||0)*t); gl.uniform1f(M('uFSwirl'), st.fluidSwirl||0); gl.uniform1f(M('uFDetail'), st.fluidDetail ?? .4); gl.uniform1f(M('uGSoft'), st.gSoft||0);
    gl.uniform1f(M('uGLen'), pose.gLen); gl.uniform1f(M('uGOff'), st.gradOffset + sd.colOff + pose.flow + (st.gCouple||0)*pose.c); gl.uniform1i(M('uGRep'), ({clamp:0,repeat:1,mirror:2})[st.gradRepeat] ?? 2);
    gl.uniform1f(M('uMInfl'), st.maskInfl); gl.uniform1f(M('uSRand'), st.stripColorRand + (st.gStripCouple||0)*pose.c); gl.uniform1f(M('uSStep'), st.stripColorStep); gl.uniform1f(M('uLo'), st.shapeLo); gl.uniform1f(M('uHi'), st.shapeHi);
    gl.uniform1i(M('uDAxis'), st.dAxis==='h'?1:0); gl.uniform1i(M('uDShrink'), ({thick:0,length:1,both:2})[st.dShrink] ?? 0);
    gl.uniform1f(M('uDCell'), short/Math.max(4, st.dDensity)); gl.uniform2f(M('uDStretch'), st.dStretchA, st.dStretchL); gl.uniform2f(M('uDGap'), st.dGapA, st.dGapL);
    gl.uniform1f(M('uDMin'), st.dMin); gl.uniform1f(M('uDMax'), st.dMax); gl.uniform1i(M('uDInv'), st.dInvert?1:0); gl.uniform1f(M('uDGamma'), st.dGamma); gl.uniform1f(M('uDRound'), st.dRound);
    gl.uniform1i(M('uDCol'), ({image:0,gradient:1,solid:2})[st.dColor] ?? 0); gl.uniform3fv(M('uDSolid'), hexToRgb(st.dSolid)); gl.uniform1f(M('uDUnder'), st.dUnder); gl.uniform1i(M('uDSrc'), st.dSource==='lum'?1:0);
    gl.uniform1f(M('uGrain'), st.grain*gscale); gl.uniform1f(M('uGrainSize'), st.grainSize); gl.uniform1f(M('uFrame'), st.grainAnim ? frame : 0); gl.uniform1i(M('uGrainCol'), st.grainColor?1:0); gl.uniform1i(M('uAA'), aa ? 4 : 1);
    // BORING: lens uniforms (uLensAmt 0 = ODB); the unblurred source on unit 1 with the same camera as FS_CAM
    gl.uniform2f(M('uPointer'), bx.px || 0, bx.py || 0); gl.uniform1f(M('uLensR'), bx.lensR || .2); gl.uniform1f(M('uLensAmt'), bx.lensAmt || 0); gl.uniform1f(M('uLensSoft'), bx.lensSoft ?? .5);
    if (bx.lensAmt > 0){ gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.srcTex); gl.activeTexture(gl.TEXTURE0); }
    gl.uniform1i(M('uSrc'), 1); gl.uniform2f(M('uS'), sheetS[0], sheetS[1]); gl.uniform1f(M('uZoom'), pose.zoom); gl.uniform2f(M('uF'), pose.fx, pose.fy); gl.uniform1f(M('uRot'), pose.rot);
    gl.uniform2f(M('uSC'), 0, bx.srcCY || 0); gl.uniform1f(M('uOffY'), bx.offY || 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  destroy(){ const ext = this.gl.getExtension('WEBGL_lose_context'); if (ext) ext.loseContext(); }
}
// =====================================================================
// Gradient-tool · jubileum (engine: ODB_BONTGENOTEN_MOTION)
// Vorm is altijd de tekst "10" in Suisse BP Int'l. Presets: Original Preset + twee varianten.
// =====================================================================
const P7_STOPS = [{c:'#FDAE04',p:0},{c:'#F57513',p:.2},{c:'#FF2A00',p:.4},{c:'#033509',p:.6},{c:'#0580CD',p:.8},{c:'#EC7CEE',p:1}];
const PRESET7 = {
  seed: seedFromName('Bontgenoten'), seedComp:false, compVar:0,
  textSize:1.27, showShape:true, dupCount:1, dupMode:'h', dupGap:.15, tracking:-.03, leading:.9, fontWeight:700, stretchX:1.02, posX:.016, posY:0, rotation:0, view:'glass',
  stripsMin:7, stripsMax:8, ripAmt:.05, ripMode:'golf', ripWaves:4.2, ripCycles:6,
  glassType:'ribbel', axis:'v', curve:.36, randOff:.3, shiftB:0, widthVar:.29, persp:-.05, wave:1.5, frost:0, edge:-.25, wrap:false,
  colorMode:'field', bg:'#ACAEEC', transparent:false, stops:P7_STOPS, hard:.08, mix:'oklab', chromaKeep:.5, lift:.15,
  gradAngle:120, gradLen:1.5, gradOffset:-.05, gradRepeat:'mirror', maskInfl:-.18, stripColorRand:.3, stripColorStep:-.1,
  gMomentAmt:.6, gCouple:.35, gStripCouple:.5, gPulseAmp:.12, gPulseCycles:2, gPulseSpread:.6, gPulseMode:'wave', gLenPulse:0,
  fluidAmt:.9, fluidScale:1, fluidCycles:1, fluidSwirl:.6, fluidDetail:.4, gSoft:.6, gTurns:2, gSwing:16,
  shapeLo:.12, shapeHi:.82, aspect:'16:9', loopSec:8, fps:25, grain:.055, grainSize:1.2, res:1, mp4Quality:'hoog', exportAA:true,
};
const PRESETS = [
  { id:'p7', name:'Original Preset', desc:'Het origineel', patch:{} },
  { id:'p7rev', name:'Original Preset (reversed)', desc:'Kleuren in omgekeerde volgorde', patch:{ stops: P7_STOPS.map(s => ({ c:s.c, p:+(1-s.p).toFixed(2) })).reverse() } },
  { id:'p7ten', name:'Preset extra glasstroken', desc:'Tien glasstroken in plaats van zeven', patch:{ stripsMin:10, stripsMax:11 } },
  { id:'p7still', name:'Preset vaste "10"', desc:'De 10 blijft de hele loop duidelijk in beeld', patch:{ animDisp:false, animZoom:false, animBlur:false, maskInfl:-.4 } },
  // BORING: calm background with mouse-driven strips and the lens (tuned by BORING, 2026-11-18)
  { id:'bgf-interactive', name:'BGF interactief', desc:'Rustige loop, stroken volgen de muis, lens rond de cursor', patch:{
    loopSec:20, hold:.55, animDisp:false, animGrad:false, dispMin:.034, dispMax:.525, zoomMax:1.6, blurMax:.075, gMomentAmt:.32, gTurns:1, ripAmt:.06, maskInfl:-.21,
    pointerStrips:true, pointerShift:.6, lens:true, lensRadius:.5, lensSoftness:.74, pointerSmooth:.98 } },
  // BORING: hero of the site (2026-11-24): as bgf-interactive, but the 10 stays put (no zoom, focus or rotation moments, no blur pulse);
  // colour flow, strips, ripple and the mouse interaction keep moving
  { id:'bgf-hero', name:'BGF hero', desc:'Als BGF interactief, met een stilstaande 10', patch:{
    loopSec:20, hold:.55, animDisp:false, animGrad:false, animZoom:false, animBlur:false, dispMin:.034, dispMax:.525, zoomMax:1.6, blurMax:.075, gMomentAmt:.32, gTurns:1, ripAmt:.06, maskInfl:-.21,
    pointerStrips:true, pointerShift:.6, lens:true, lensRadius:.5, lensSoftness:.74, pointerSmooth:.98 } },
];
Object.assign(DEFAULTS, deep(PRESET7));
// ---------- bron: "10" in Suisse BP Int'l ----------
async function ensureSource(){ try { await Promise.all([400, 500, 700].map(w => document.fonts.load(`${w} 100px "Suisse Bp Intl", "Suisse BP"`, '10'))); } catch(e){} }
function buildSource(st, W, H, maxTex){
  const short = Math.min(W, H), asp = [W/short, H/short];
  const cover = 1 + 2*OVERSCAN_SRC;
  let k = Math.max(512, short*1.6);
  k = Math.min(k, (Math.min(maxTex, 8192)) / (cover*Math.max(asp[0], asp[1])));
  k = Math.min(k, Math.sqrt(28e6 / (cover*cover*asp[0]*asp[1])));
  const cw = Math.round(asp[0]*cover*k), ch = Math.round(asp[1]*cover*k);
  const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
  const ctx = cv.getContext('2d'); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cw, ch);
  if (st.showShape !== false) {
    const chars = [...String(st.text || '10')]; /* BORING: was ['1','0'] */
    const font = s => `${st.fontWeight || 700} ${s}px "Suisse Bp Intl", "Suisse BP", "Helvetica Neue", Arial, sans-serif`;
    // BORING: fit mode. st.fitMarginPx (output px) set = the text's ink spans the output width minus that margin per side, centred.
    const fit = st.fitMarginPx != null, ink = s => { // ink box of the tracked string at size s, relative to the drawing start x = -tw/2
      ctx.font = font(s); const t = (st.tracking || 0) * s, mm = chars.map(c => ctx.measureText(c)), w = mm.reduce((a, b) => a + b.width, 0) + t*(chars.length-1);
      const l = -w/2 - (mm[0].actualBoundingBoxLeft || 0), r = w/2 - mm[mm.length-1].width + (mm[mm.length-1].actualBoundingBoxRight || mm[mm.length-1].width);
      return { l, r }; };
    let px = st.textSize * asp[1] * k, shift = 0;
    if (fit) { const b = ink(100), target = asp[0]*k*Math.max(.1, 1 - 2*st.fitMarginPx/W); px = 100*target/((b.r - b.l)*(st.stretchX || 1)); const c = ink(px); shift = -(c.l + c.r)/2; }
    const tr = (st.tracking || 0) * px;
    ctx.font = font(px); ctx.textBaseline = 'alphabetic'; ctx.fillStyle = '#fff';
    const ws = chars.map(c => ctx.measureText(c).width), tw = ws.reduce((a, b) => a + b, 0) + tr*(chars.length-1);
    const m = ctx.measureText(String(st.text || '10')), asc  /* BORING: was '10' */ = m.actualBoundingBoxAscent || px*.7, dsc = m.actualBoundingBoxDescent || 0;
    ctx.save(); ctx.translate(cw/2 + (fit ? 0 : st.posX)*k*asp[0] + shift*(st.stretchX || 1), ch/2 + st.posY*k*asp[1]); ctx.rotate((st.rotation||0)*Math.PI/180); ctx.scale(st.stretchX || 1, 1);
    // dupliceren: meerdere 10-en in een rij, kolom of raster, als geheel gecentreerd
    const n = clamp(Math.round(st.dupCount || 1), 1, 12), mode = st.dupMode || 'h', gap = st.dupGap ?? .15;
    const cellW = tw*(1 + gap), cellH = (asc + dsc)*(1 + gap);
    const cols = mode === 'v' ? 1 : (mode === 'h' ? n : Math.ceil(Math.sqrt(n))), rows = Math.ceil(n/cols);
    for (let j = 0; j < n; j++){
      const ci = j % cols, ri = Math.floor(j/cols), inRow = Math.min(cols, n - ri*cols);
      const ox = (ci - (inRow - 1)/2)*cellW, oy = (ri - (rows - 1)/2)*cellH;
      let x = -tw/2 + ox; const y = (asc - dsc)/2 + oy; chars.forEach((c, i) => { ctx.fillText(c, x, y); x += ws[i] + tr; });
    }
    ctx.restore();
  }
  const sw = 160, sh = Math.max(1, Math.round(160*ch/cw)); const sm = document.createElement('canvas'); sm.width = sw; sm.height = sh; const sc = sm.getContext('2d', { willReadFrequently:true });
  sc.drawImage(cv, 0, 0, sw, sh); const data = sc.getImageData(0, 0, sw, sh).data; const all = [], edge = [];
  const halfW = asp[0]/2*cover, halfH = asp[1]/2*cover; const on = (x, y) => x >= 0 && y >= 0 && x < sw && y < sh && data[(y*sw+x)*4] > 140;
  for (let y=0;y<sh;y+=2) for (let x=0;x<sw;x+=2){ if (on(x, y)){ const fx = (x/sw*2-1)*halfW, fy = (y/sh*2-1)*halfH; if (Math.abs(fx) < asp[0]*.48 && Math.abs(fy) < asp[1]*.48){ const p = [+fx.toFixed(3), +fy.toFixed(3)]; all.push(p); if (!on(x+5,y) || !on(x-5,y) || !on(x,y+5) || !on(x,y-5)) edge.push(p); } } }
  return { canvas: cv, ink: edge.length > 8 ? edge : all };
}

// ---------- BORING: small API around ODB's preview loop (rebuildSource + tick from the tool) ----------
const SOURCE_KEYS = new Set(['nMoments','zoomMax','seedMotion','fitMarginPx','showShape','dupCount','dupMode','dupGap','textSize','fontWeight','posX','posY','aspect','customW','customH','seed','text','tracking','stretchX','rotation','below','belowMargin']);
// BORING: interaction keys (not ODB's; all off = ODB's look). They survive a preset switch.
const INTERACT = { pointerStrips:false, pointerShift:1.5, pointerSmooth:.45, lens:false, lensRadius:.22, lensStrength:1, lensSoftness:.6, scrollSmooth:.35 };
function presetState(id){ const p = PRESETS.find(x => x.id === id) || PRESETS[0]; return Object.assign(deep(DEFAULTS), deep(PRESET7), deep(INTERACT), deep(p.patch), { moments:[] }); } // BORING: INTERACT before the patch, so a preset can turn interaction on
// critically damped spring (Game Programming Gems 4 "SmoothDamp"); settle (~2%) ≈ settle seconds
function damp(sp, target, settle, dt){ const T = Math.max(1e-3, settle/2.9), w = 2/T, x = w*dt, e = 1/(1 + x + .48*x*x + .235*x*x*x);
  const ch = sp.x - target, tmp = (sp.v + w*ch)*dt; sp.v = (sp.v - w*tmp)*e; sp.x = target + (ch + tmp)*e; return Math.abs(ch) > 1e-4 || Math.abs(sp.v) > 1e-3; }

function create(canvas, options){
  // margin: CSS px per side; set = text fits the canvas width minus the margin (BORING); null = ODB's own size
  // below: second text one viewport height lower on the same sheet (fit to the width minus belowMargin CSS px); reach it with setScroll(0..1)
  const o = Object.assign({ preset:'p7', text:'10', autoplay:true, maxDpr:2, margin:null, below:null, belowMargin:48 }, options);
  const view = new Engine(canvas);
  let state = Object.assign(presetState(o.preset), { text:o.text, below:o.below, belowMargin:o.belowMargin }, pick(options, Object.keys(INTERACT)));
  let playing = false, tNow = 0, playStart = 0, raf = 0, dirty = true, srcDirty = true, srcBusy = false, momentsStale = true, dead = false;
  let shown = false; // BORING: first frame drawn → 'bgf:rendered' on the canvas
  let sheet = null, last = 0, ptr = null, scrollT = 0, liveMask = null, maskDirty = false; // BORING: liveMask = caller's canvas instead of the text // sheet: tall-source geometry; ptr: {x,y} canvas 0..1 or null
  const sp = { sx:{x:.5,v:0}, lx:{x:.5,v:0}, ly:{x:.5,v:0}, la:{x:0,v:0}, sc:{x:0,v:0} };
  function pick(src, keys){ const r = {}; for (const k of keys) if (src && k in src) r[k] = src[k]; return r; }
  const outPx = css => css == null ? null : css*view.W/Math.max(1, canvas.clientWidth);

  function layout(){
    const dpr = Math.min(window.devicePixelRatio || 1, o.maxDpr);
    let w = Math.max(2, Math.round(canvas.clientWidth*dpr)), h = Math.max(2, Math.round(canvas.clientHeight*dpr)); w += w%2; h += h%2;
    if (w !== view.W || h !== view.H){ view.setOutput(w, h); srcDirty = true; momentsStale = true; }
    state.fitMarginPx = outPx(o.margin);
    dirty = true; kick();
  }
  // BORING: the 'below' text sits one viewport lower on one tall source; the camera pass offsets into it (uOffY)
  function buildSheet(st, W, H, maxTex){
    const a = buildSource(st, W, H, maxTex); if (!st.below) return { canvas:a.canvas, ink:a.ink, geo:null };
    const b = buildSource(Object.assign({}, st, { text:st.below, fitMarginPx:outPx(st.belowMargin) }), W, H, maxTex);
    const short = Math.min(W, H), asp = [W/short, H/short], cover = 1 + 2*OVERSCAN_SRC;
    const cw = a.canvas.width, ch = a.canvas.height, k = cw/(asp[0]*cover), step = asp[1]*k, th = ch + step;
    const f = Math.min(1, Math.sqrt(28e6/(cw*th)), Math.min(maxTex, 8192)/th);
    const cv = document.createElement('canvas'); cv.width = Math.round(cw*f); cv.height = Math.round(th*f);
    const ctx = cv.getContext('2d'); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cv.width, cv.height); ctx.globalCompositeOperation = 'lighten';
    ctx.drawImage(a.canvas, 0, 0, cw*f, ch*f); ctx.drawImage(b.canvas, 0, step*f, cw*f, ch*f);
    // focus points of both texts, each in its own viewport coordinates, so zooms land on whichever text is in view
    return { canvas:cv, ink:a.ink.concat(b.ink), geo:{ srcCY:asp[1]/2, srcHY:(asp[1]*cover + asp[1])/2, step:asp[1] } };
  }
  async function rebuildSource(){
    if (srcBusy) return; srcBusy = true; srcDirty = false;
    try {
      await ensureSource(); if (dead) return;
      const src = buildSheet(state, view.W, view.H, view.maxTex);
      view.setSource(liveMask || src.canvas); sheet = src.geo; // BORING: a live mask wins over the text
      if (momentsStale || !state.moments || !state.moments.length){ state.moments = genMoments(state, src.ink); momentsStale = false; }
      dirty = true; kick();
    } finally { srcBusy = false; }
  }
  // BORING: springs for pointer strips, lens and scroll; returns the per-frame interaction for Engine.render (null = ODB)
  function interact(dt){
    const st = state, on = !!ptr; let moving = false, bx = null;
    if (st.pointerStrips){ moving = damp(sp.sx, on ? ptr.x : .5, st.pointerSmooth, dt) || moving;
      bx = { strips:{ s:clamp(.5 + sp.sx.v*.3, 0, 1), phase:(.5 - sp.sx.x)*st.pointerShift } }; }
    if (st.lens){ if (on){ moving = damp(sp.lx, ptr.x, st.pointerSmooth, dt) || moving; moving = damp(sp.ly, ptr.y, st.pointerSmooth, dt) || moving; }
      moving = damp(sp.la, on ? 1 : 0, st.pointerSmooth, dt) || moving;
      if (sp.la.x > 1e-3){ const short = Math.min(view.W, view.H);
        bx = Object.assign(bx || {}, { px:(sp.lx.x - .5)*view.W/short, py:(sp.ly.x - .5)*view.H/short, lensR:st.lensRadius, lensAmt:clamp(st.lensStrength, 0, 1)*clamp(sp.la.x, 0, 1), lensSoft:clamp(st.lensSoftness, 0, 1) }); } }
    if (sheet){ moving = damp(sp.sc, scrollT, st.scrollSmooth, dt) || moving;
      bx = Object.assign(bx || {}, { srcCY:sheet.srcCY, srcHY:sheet.srcHY, offY:clamp(sp.sc.x, 0, 1)*sheet.step }); }
    return { bx, moving };
  }
  function tick(now){
    raf = 0; if (dead || document.hidden) return; // BORING: no rendering in a hidden tab
    const dt = last ? Math.min(.1, (now - last)/1000) : 1/60; last = now;
    if (playing){ tNow = (((now - playStart)/1000) / state.loopSec) % 1; dirty = true; }
    if (srcDirty && !srcBusy) rebuildSource();
    if (liveMask && maskDirty && view.srcReady){ view.setSource(liveMask); maskDirty = false; dirty = true; } // BORING
    const ix = interact(dt); if (ix.moving) dirty = true;
    if (dirty && view.srcReady){ const F = Math.max(1, Math.round(state.loopSec * state.fps)); const fi = Math.floor(tNow*F) % F;
      const gs = Math.sqrt(Math.min(1, Math.min(view.W, view.H)/1080)); // tool: grain scaled to the 16:9 export (short side 1080)
      view.render(ix.bx ? Object.assign({}, state, { boring:ix.bx }) : state, tNow, fi, false, gs); dirty = false;
      if (!shown){ shown = true; canvas.dispatchEvent(new Event('bgf:rendered')); } }
    if (playing || dirty || srcDirty || ix.moving) raf = requestAnimationFrame(tick); else last = 0;
  }
  function kick(){ if (!raf && !dead) raf = requestAnimationFrame(tick); }
  const onVis = () => { if (!document.hidden){ last = 0; kick(); } };
  document.addEventListener('visibilitychange', onVis);

  const ro = new ResizeObserver(layout); ro.observe(canvas); layout();
  const api = {
    get state(){ return state; },
    get time(){ return tNow; },
    // BORING: live mask (see header); setMask(null) goes back to the text
    get maskInset(){ return OVERSCAN_SRC/(1 + 2*OVERSCAN_SRC); },
    setMask(cv){ liveMask = cv || null; maskDirty = !!cv; if (!cv) srcDirty = true; dirty = true; kick(); },
    updateMask(){ if (liveMask){ maskDirty = true; kick(); } },
    // BORING: a preset defines interaction too (bgf-interactive), so only text and layout carry over
    setPreset(id){ state = Object.assign(presetState(id), pick(state, ['text','fitMarginPx','below','belowMargin'])); srcDirty = true; momentsStale = true; dirty = true; kick(); },
    setState(patch){ if ('margin' in patch){ o.margin = patch.margin; patch = Object.assign({}, patch, { fitMarginPx: outPx(o.margin) }); delete patch.margin; }
      const keepPhase = 'loopSec' in patch && playing; // BORING: a new loop length keeps the current position in the loop
      Object.assign(state, patch); if (keepPhase) playStart = performance.now() - tNow*state.loopSec*1000; if (Object.keys(patch).some(k => SOURCE_KEYS.has(k))){ srcDirty = true; momentsStale = true; } dirty = true; kick(); },
    // BORING: pointer in canvas-relative 0..1 (y down); null = no pointer, strips and lens settle to neutral
    setPointer(x, y){ ptr = x == null ? null : { x:+x, y:+y }; kick(); },
    // BORING: 0 = first text, 1 = the 'below' text fully in view; smoothed by scrollSmooth (0 = jump)
    setScroll(p, jump){ scrollT = clamp(+p || 0, 0, 1); if (jump){ sp.sc.x = scrollT; sp.sc.v = 0; dirty = true; } kick(); },
    seek(t){ tNow = ((t%1)+1)%1; if (playing) playStart = performance.now() - tNow*state.loopSec*1000; dirty = true; kick(); },
    play(){ if (playing) return; playing = true; playStart = performance.now() - tNow*state.loopSec*1000; kick(); },
    pause(){ playing = false; },
    get playing(){ return playing; },
    destroy(){ dead = true; ro.disconnect(); document.removeEventListener('visibilitychange', onVis); if (raf) cancelAnimationFrame(raf); view.destroy(); },
  };
  if (o.autoplay) api.play();
  return api;
}
window.BGFGradient = { create, presets: PRESETS.map(p => ({ id:p.id, name:p.name, desc:p.desc })) };
})();
