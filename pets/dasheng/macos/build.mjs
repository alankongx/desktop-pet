import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, cpSync, createReadStream, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { packager } from '@electron/packager';

const { values } = parseArgs({ options: { output: {type:'string'}, 'electron-zip-dir': {type:'string'} } });
if (process.platform !== 'darwin' || !values.output) throw Error('On macOS use: node macos/build.mjs --output FILE.pkg [--electron-zip-dir DIR]');
const project = path.dirname(import.meta.dirname);
const version = JSON.parse(readFileSync(path.join(project, 'package.json'))).version;
const output = path.resolve(values.output);
const temp = mkdtempSync(path.join(tmpdir(), 'dasheng-build-'));
const runtime = '45.3.4';
const checksums = {
  arm64: 'f3ac0124c48a6cc3aa9332caca0e913cc478cd3610a378881729ca33452caa72',
  x64: 'c78311efcf842a973238c44a28a899592c9cc38727bb96660aca9bbeb9bf6b3d'
};
const run = (command, args) => execFileSync(command, args, {stdio:'inherit'});
try {
  const zipDir = values['electron-zip-dir'] ? path.resolve(values['electron-zip-dir']) : temp;
  for (const [arch, expected] of Object.entries(checksums)) {
    const name = `electron-v${runtime}-darwin-${arch}.zip`;
    const archive = path.join(zipDir, name);
    if (!values['electron-zip-dir']) run('curl', ['--fail','--location','--retry','2','--output',archive,`https://github.com/electron/electron/releases/download/v${runtime}/${name}`]);
    const hash = createHash('sha256');
    for await (const chunk of createReadStream(archive)) hash.update(chunk);
    if (hash.digest('hex') !== expected) throw Error('Electron checksum mismatch for '+arch);
  }
  const source = path.join(temp, 'app');
  for (const file of JSON.parse(readFileSync(path.join(project,'packaging-files.json')))) {
    const dest = path.join(source,file);
    mkdirSync(path.dirname(dest), {recursive:true});
    copyFileSync(path.join(project,file),dest);
  }
  const icons = path.join(temp,'dasheng.iconset');
  mkdirSync(icons);
  for (const size of [16,32,128,256,512]) {
    for (const scale of [1,2]) run('sips', ['-z',String(size*scale),String(size*scale),path.join(source,'assets/dasheng.png'),'--out',path.join(icons,`icon_${size}x${size}${scale===2?'@2x':''}.png`)]);
  }
  const icon = path.join(temp,'dasheng.icns');
  run('iconutil',['-c','icns','-o',icon,icons]);
  const [build] = await packager({dir:source, out:path.join(temp,'build'), electronZipDir:zipDir,
    electronVersion:runtime, platform:'darwin', arch:'universal', name:'大圣喵', executableName:'DashengPet',
    appBundleId:'com.alankongx.dasheng-pet', appVersion:version, buildVersion:version, icon,
    appCategoryType:'public.app-category.entertainment', extendInfo:{LSUIElement:true}, prune:false, asar:false});
  const bundle = path.join(build,'大圣喵.app');
  const resources = path.join(bundle,'Contents','Resources');
  const licenses = path.join(resources,'licenses');
  mkdirSync(licenses);
  for (const file of readdirSync(build).filter(s=>s.startsWith('LICENSE'))) cpSync(path.join(build,file),path.join(licenses,file));
  if (!existsSync(path.join(licenses,'LICENSES.chromium.html'))) throw Error('Missing Chromium notices');
  run('codesign',['--force','--deep','--sign','-','--timestamp=none',bundle]);
  run('codesign',['--verify','--deep','--strict',bundle]);
  const arches = execFileSync('lipo',['-archs',path.join(bundle,'Contents','MacOS','DashengPet')],{encoding:'utf8'}).trim().split(/\s+/);
  if (!['x86_64','arm64'].every(arch=>arches.includes(arch))) throw Error('Missing architecture: '+arches);
  const root = path.join(temp,'root');
  mkdirSync(root);
  run('mv',[bundle,root]);
  const component = path.join(temp,'component.plist');
  writeFileSync(component,'<plist version="1.0"><array><dict><key>RootRelativeBundlePath</key><string>大圣喵.app</string><key>BundleIsRelocatable</key><false/><key>BundleIsVersionChecked</key><true/><key>BundleOverwriteAction</key><string>upgrade</string></dict></array></plist>');
  const payload = path.join(temp,'DashengPet.pkg');
  run('pkgbuild',['--root',root,'--component-plist',component,'--install-location','/Applications','--identifier','com.alankongx.dasheng-pet.pkg','--version',version,payload]);
  const req = path.join(temp,'requirements.plist');
  const minOS = execFileSync('/usr/libexec/PlistBuddy',['-c','Print :LSMinimumSystemVersion',path.join(root,'大圣喵.app/Contents/Info.plist')],{encoding:'utf8'}).trim();
  writeFileSync(req,`<plist version="1.0"><dict><key>arch</key><array><string>arm64</string><string>x86_64</string></array><key>os</key><array><string>${minOS}</string></array></dict></plist>`);
  const dist = path.join(temp,'Distribution');
  run('productbuild',['--synthesize','--product',req,'--package',payload,dist]);
  mkdirSync(path.dirname(output),{recursive:true});
  run('productbuild',['--distribution',dist,'--package-path',temp,output]);
} finally {
  rmSync(temp,{recursive:true,force:true});
}
