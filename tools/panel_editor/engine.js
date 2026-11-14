/* A deliberately small C expression interpreter. All arithmetic operands are
 * uint32_t; comparison/logical results are 0 or 1, return value is uint8_t.
 * BigInt avoids JS double rounding and signed bitwise coercion. */
(function (root) {
'use strict';
const u32 = n => BigInt.asUintN(32, n);
const precedence = {'||':1,'&&':2,'|':3,'^':4,'&':5,'==':6,'!=':6,'<':7,'<=':7,'>':7,'>=':7,'<<':8,'>>':8,'+':9,'-':9,'*':10,'/':10,'%':10};
function compile(source) {
  const tokens = []; let pos = 0;
  const pattern = /\s*(0[xX][0-9a-fA-F]+[uU]?|[0-9]+[uU]?|t\b|<<|>>|<=|>=|==|!=|&&|\|\||[()+\-*/%~!<>&^|?:])/y;
  while (pos < source.length) {
    if (!source.slice(pos).trim()) break;
    pattern.lastIndex = pos;
    const match = pattern.exec(source);
    if (!match) throw Error(`Unsupported syntax at character ${pos + 1}. Use an integer expression in t.`);
    tokens.push(match[1]); pos = pattern.lastIndex;
  }
  let i = 0;
  function atom() {
    const token = tokens[i++];
    if (token === '(') {const n = expression(0); if (tokens[i++] !== ')') throw Error('Expected )'); return n;}
    if (['+','-','~','!'].includes(token)) return {op: 'unary' + token, a: atom()};
    if (token === 't') return {op:'t'};
    if (token && /^(0[xX][\da-fA-F]+|\d+)[uU]?$/.test(token)) {
      const literal = token.replace(/[uU]$/, '');
      if (/^0\d+/.test(literal)) throw Error('Use decimal without leading zeros, or hexadecimal (0x...).');
      const n = BigInt(literal); if (n > 0xffffffffn) throw Error('Integer literals must fit uint32_t.');
      return {op:'number', n};
    }
    throw Error('Expected t, an integer, or a parenthesized expression.');
  }
  function expression(min) {
    let a = atom();
    while (i < tokens.length && precedence[tokens[i]] >= min) {
      const op = tokens[i++]; a = {op, a, b:expression(precedence[op] + 1)};
    }
    if (min === 0 && tokens[i] === '?') {
      i++; const b = expression(0);
      if (tokens[i++] !== ':') throw Error('Expected : in conditional expression');
      a = {op:'?:', a, b, c:expression(0)};
    }
    return a;
  }
  const tree = expression(0);
  if (i !== tokens.length) throw Error(`Unexpected token ${tokens[i]}`);
  function run(n, t) {
    if (n.op === 't') return t;
    if (n.op === 'number') return n.n;
    const a = run(n.a,t);
    if (n.op === 'unary+') return a;
    if (n.op === 'unary-') return u32(-a);
    if (n.op === 'unary~') return u32(~a);
    if (n.op === 'unary!') return BigInt(!a);
    if (n.op === '?:') return run(a ? n.b : n.c,t);
    if (n.op === '&&') return BigInt(Boolean(a) && Boolean(run(n.b,t)));
    if (n.op === '||') return BigInt(Boolean(a) || Boolean(run(n.b,t)));
    const b = run(n.b,t);
    switch(n.op) {
      case '+': return u32(a+b); case '-': return u32(a-b); case '*': return u32(a*b);
      case '/': case '%': if (!b) throw Error('Division or remainder by zero'); return n.op === '/' ? a/b : a%b;
      case '<<': case '>>':
        if (b >= 32n) throw Error('Shift count must be between 0 and 31 (C otherwise has undefined behavior).');
        return n.op === '<<' ? u32(a<<b) : a>>b;
      case '&': return a&b; case '|': return a|b; case '^': return a^b;
      case '<': return BigInt(a<b); case '<=': return BigInt(a<=b);
      case '>': return BigInt(a>b); case '>=': return BigInt(a>=b);
      case '==': return BigInt(a===b); case '!=': return BigInt(a!==b);
    }
    throw Error('Unknown operator');
  }
  function emit(n) {
    if (n.op === 't') return 't';
    if (n.op === 'number') return n.n.toString() + 'U';
    if (n.op.startsWith('unary')) return `(uint32_t)(${n.op.slice(5)}(${emit(n.a)}))`;
    if (n.op === '?:') return `(uint32_t)(${emit(n.a)} ? ${emit(n.b)} : ${emit(n.c)})`;
    return `(uint32_t)(${emit(n.a)} ${n.op} ${emit(n.b)})`;
  }
  const evaluate = t => Number(run(tree,u32(BigInt(t))) & 255n);
  evaluate.cExpression = emit(tree);
  return evaluate;
}
const expressions = [
 't * (((t >> 12) | (t >> 8)) & (63 & (t >> 4)))',
 '((t & 4096) ? ((t * (t ^ t % 255) | (t >> 4)) >> 1) : (t >> 3) | ((t & 8192) ? t << 2 : t))',
 't * (t >> 3 | t >> 1) & 255',
 't * (t >> 3 | t >> 9) & 511',
 't * (t >> 3 | t >> 21) & 1023',
 '2 * (t >> 5 & t) - (t >> 5) + t * (t >> 14 & 14)',
 '(~t >> 2) * ((127 & t * (7 & t >> 10)) < (245 & t * (2 + (5 & t >> 14))))',
 't >> 5 | (t << 3) + 12 * t * (t >> 13 | (t >> 1 | t >> 10 | t >> 2) & t >> 8)',
 't+(t&t^t>>6)-t*(t>>9&(t%16?2:6)&t>>9)'
];
function defaults() {
 return {version:1, formulas:expressions.map((expression,i)=>({name:`Formula ${i}`,expression})), palettes:[
 {name:'GPT',colors:['#ff00ff','#00ffff','#ffff00','#ff6600','#ff0000','#00ff00','#0000ff','#cc00cc','#ff99cc','#ff3399','#ffcc33','#00ff66','#66ff00','#00ccff','#9933ff','#ffff99','#ff66ff','#66ffff','#ffcccc','#66ff66','#ffcc00','#cc0066','#0099ff','#ff3300','#00ffcc']},
 {name:'Aguayo',colors:['#e2097d','#140a75','#c91437','#f8b82f','#0eb2d5','#6f2b20','#0b2f87','#a55027','#6e22b8','#4ba181','#4ec4eb','#135c37','#b7ffac']},
 {name:'8bit',colors:['#ff0000','#ffff00','#ff00ff','#00ff00','#00ffff','#0000ff']}
 ], formula:0,palette:0,settings:{initialT:305419896,seed:42,frameMs:33,brightness:127,shuffle:true}};
}
function validate(project) {
 if (!project || project.version !== 1) throw Error('Unsupported project format');
 for (const key of ['formulas','palettes']) {
   if (!Array.isArray(project[key]) || !project[key].length || project[key].length > 256) throw Error(`Invalid ${key} list`);
   for (const item of project[key]) {
     if (typeof item.name !== 'string' || !item.name.trim() || item.name.length > 100) throw Error('Names must contain 1–100 characters');
     if (key === 'formulas') {if (typeof item.expression !== 'string' || item.expression.length > 4096) throw Error('Invalid formula'); compile(item.expression);}
     else if (!Array.isArray(item.colors) || item.colors.length < 1 || item.colors.length > 64 || !item.colors.every(c=>/^#[\da-fA-F]{6}$/.test(c))) throw Error('Palettes need 1–64 RGB colors');
   }
 }
 for (const key of ['formula','palette']) {
   if (!Number.isInteger(project[key]) || project[key] < 0 || project[key] >= project[key === 'formula' ? 'formulas':'palettes'].length) throw Error(`Invalid ${key} selection`);
 }
 const s = project.settings;
 if (!s || ![s.initialT,s.seed].every(n=>Number.isInteger(n)&&n>=0&&n<=0xffffffff) || !Number.isInteger(s.frameMs)||s.frameMs<1||s.frameMs>1000 || !Number.isInteger(s.brightness)||s.brightness<0||s.brightness>255 || typeof s.shuffle !== 'boolean') throw Error('Invalid simulation settings');
 return project;
}
class Panel {
 constructor(project) {
   this.expression = project.formulas[project.formula].expression;
   this.evaluate = compile(this.expression);
   this.settings = {...project.settings}; this.t = this.settings.initialT;
   this.state = this.settings.seed >>> 0; this.frame = 0; this.colorIndex = 0;
   this.paletteSource = JSON.stringify(project.palettes[project.palette].colors);
   this.colors = [...project.palettes[project.palette].colors];
   this.rows = Array.from({length:64},()=>Array(8).fill('#000000'));
   if(this.settings.shuffle) this.shuffle();
 }
 updateLibraries(project) {
   const expression = project.formulas[project.formula].expression;
   // Compile before modifying live state, so invalid edits leave playback intact.
   const evaluate = expression === this.expression ? this.evaluate : compile(expression);
   const colors = project.palettes[project.palette].colors;
   const paletteSource = JSON.stringify(colors);
   this.expression = expression; this.evaluate = evaluate;
   if (paletteSource !== this.paletteSource) {
     this.paletteSource = paletteSource;
     this.colors = [...colors];
     this.colorIndex %= this.colors.length;
   }
 }
 random(max) {this.state = (Math.imul(this.state,1664525)+1013904223)>>>0; return Math.floor(this.state/4294967296*max);}
 shuffle() {for(let i=this.colors.length-1;i>0;i--){const j=this.random(i+1); [this.colors[i],this.colors[j]]=[this.colors[j],this.colors[i]];}}
 step() {
   const byte = this.evaluate(this.t);
   if(this.frame && this.frame*this.settings.frameMs > (this.lastShuffle || 0)+30000 && this.settings.shuffle) {
     this.shuffle(); this.lastShuffle=this.frame*this.settings.frameMs;
   }
   if(this.random(100)<4) this.colorIndex=(this.colorIndex+1)%this.colors.length;
   this.rows.shift(); this.rows.push(Array.from({length:8},(_,x)=>byte>>x&1 ? this.colors[(this.colorIndex+x)%this.colors.length]:'#000000'));
   this.t=(this.t+1)>>>0; this.frame++; return byte;
 }
 pixels() {
   const result = new Uint8ClampedArray(16*64*4), brightness=this.settings.brightness;
   this.rows.forEach((row,y)=>{
     for(let x=0;x<16;x++) {
       const color=row[x<8?x:15-x]; const p=(y*16+x)*4;
       for(let c=0;c<3;c++) result[p+c]=(parseInt(color.slice(1+c*2,3+c*2),16)*(brightness+1))>>8;
       result[p+3]=255;
     }
   }); return result;
 }
}
function parseColors(source) {
 const hex = source.trim().replace(/^#/, '');
 if (!hex || !/^[0-9a-fA-F]+$/.test(hex)) throw Error('Enter a continuous RGB hex string, for example ff2dd1fdffb84dffbe63c8ff.');
 if (hex.length % 6 !== 0) throw Error('Each RGB color needs 6 hex digits; the last color is incomplete.');
 if (hex.length / 6 > 64) throw Error('A palette can contain at most 64 colors.');
 return hex.toLowerCase().match(/.{6}/g).map(color => '#' + color);
}
function cSource(project) {
 const colors=project.palettes[project.palette].colors;
 return `// uint32_t t; result wraps to uint8_t.\nuint8_t bytebeat(uint32_t t) {\n  return (uint8_t)(${compile(project.formulas[project.formula].expression).cExpression});\n}\n\n// FastLED C++: zero-initialized tail; only use [0, maxColors).\nCRGB lookupTable[64] = {\n${colors.map(c=>'  CRGB('+[1,3,5].map(i=>parseInt(c.slice(i,i+2),16)).join(', ')+')').join(',\n')}\n};\nconst uint8_t maxColors = ${colors.length};\n`;
}
const api={compile,defaults,validate,Panel,cSource,parseColors};
if(typeof module !== 'undefined') module.exports=api; else root.PanelEngine=api;
})(globalThis);
