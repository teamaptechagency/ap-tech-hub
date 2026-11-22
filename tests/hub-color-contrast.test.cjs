const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const css=fs.readFileSync(path.join(__dirname,'../app/hub-colors.css'),'utf8');
function luminance(hex){const v=hex.slice(1).match(/../g).map(x=>parseInt(x,16)/255).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4);return v[0]*.2126+v[1]*.7152+v[2]*.0722;}
function contrast(a,b){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
const palettes={};
for(const m of css.matchAll(/--hub-(\w+)-(fg|bg):(#[a-fA-F0-9]{6})/g)){const key=m[1];palettes[key]??=[{},{}];const phase=palettes[key][0][m[2]]?1:0;palettes[key][phase][m[2]]=m[3];}
for(const [name,themes]of Object.entries(palettes))for(const [i,p]of themes.entries())test(`${name} ${i?'dark':'light'} status text meets 4.5:1 contrast`,()=>{assert.ok(contrast(p.fg,p.bg)>=4.5,`${name}: ${contrast(p.fg,p.bg).toFixed(2)}`);assert.ok(contrast(p.fg,i?'#1a2b25':'#ffffff')>=4.5);});
