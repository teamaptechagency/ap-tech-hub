import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const brand = path.join(root, "public", "brand");
const background = "#101623";
await mkdir(brand, { recursive: true });
for (const name of ["wordmark-light", "wordmark-dark", "mark-light", "mark-dark", "mark"]) {
  let image = sharp(path.join(brand, "source", `${name}.png`));
  const alphaStats = await image.stats();
  if (name === "mark") {
    const {data, info} = await sharp(path.join(brand,"source","mark-dark.png")).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    const colors = new Map();
    const source = await sharp(path.join(brand,"source","mark.png")).removeAlpha().raw().toBuffer();
    for(let i=0;i<source.length;i+=3){ if(source[i]>245&&source[i+1]>245&&source[i+2]>245)continue; const key=[source[i],source[i+1],source[i+2]].join(',');colors.set(key,(colors.get(key)||0)+1); }
    const green=[...colors].sort((a,b)=>b[1]-a[1])[0][0].split(',').map(Number);
    for(let i=0;i<data.length;i+=4){data[i]=green[0];data[i+1]=green[1];data[i+2]=green[2];}
    image=sharp(data,{raw:{width:info.width,height:info.height,channels:4}});
  } else if (alphaStats.channels[3]?.min === 255 && name.endsWith("-light")) {
    const mask=await sharp(path.join(brand,"source",`${name.replace("-light","-dark")}.png`)).extractChannel("alpha").png().toBuffer();
    image=sharp(path.join(brand,"source",`${name}.png`)).removeAlpha().joinChannel(mask);
  }
  await image.trim().resize({ height: name.startsWith("wordmark") ? 256 : 512 }).png().toFile(path.join(brand, `${name}.png`));
}
const mark = await readFile(path.join(brand, "mark-dark.png"));
async function icon(size, inset = 0.16, transparent = false) {
  const logo = await sharp(mark).resize(Math.round(size * (1 - inset * 2)), Math.round(size * (1 - inset * 2)), { fit: "inside" }).png().toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background: transparent ? { r: 0, g: 0, b: 0, alpha: 0 } : background } }).composite([{ input: logo, gravity: "centre" }]).png().toBuffer();
}
async function save(file, bytes) { await mkdir(path.dirname(file), { recursive: true }); await writeFile(file, bytes); }
for (const size of [192, 512]) await save(path.join(root, "public", "app-icons", `icon-${size}.png`), await icon(size));
await save(path.join(root, "public", "app-icons", "icon-maskable-512.png"), await icon(512, 0.25));
await save(path.join(root, "public", "app-icons", "play-store-icon-512.png"), await icon(512));
const res = path.join(root, "android", "app", "src", "main", "res");
for (const [density, size, foreground] of [["mdpi",48,108],["hdpi",72,162],["xhdpi",96,216],["xxhdpi",144,324],["xxxhdpi",192,432]]) {
  await save(path.join(res, `mipmap-${density}`, "ic_launcher.png"), await icon(size));
  await save(path.join(res, `mipmap-${density}`, "ic_launcher_foreground.png"), await icon(foreground, 0.25, true));
}
await save(path.join(res, "drawable", "splash.png"), await icon(512, 0.3));
const sizes = [16, 24, 32, 48, 64, 128, 256];
const images = await Promise.all(sizes.map(size => icon(size, 0.1)));
const header = Buffer.alloc(6 + sizes.length * 16); header.writeUInt16LE(1, 2); header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
images.forEach((image, i) => { const p = 6 + i * 16; header[p] = sizes[i] === 256 ? 0 : sizes[i]; header[p+1] = header[p]; header.writeUInt16LE(1,p+4); header.writeUInt16LE(32,p+6); header.writeUInt32LE(image.length,p+8); header.writeUInt32LE(offset,p+12); offset += image.length; });
await save(path.join(root,"desktop-agent","app.ico"),Buffer.concat([header,...images]));
console.log("Official logo assets, web icons, Android resources and Windows icon generated.");
