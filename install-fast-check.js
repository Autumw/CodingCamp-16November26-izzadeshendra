/**
 * Bootstrap script: downloads fast-check and pure-rand from npm registry
 * and unpacks them into node_modules using only Node built-ins.
 * Run: .\node.exe install-fast-check.js
 */
'use strict';

const https = require('https');
const http  = require('http');
const fs    = require('fs');
const path  = require('path');
const zlib  = require('zlib');

const PACKAGES = [
  { name: 'pure-rand',   version: '6.1.0' },
  { name: 'fast-check',  version: '3.22.0' },
];

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http;
    const file  = fs.createWriteStream(dest);
    function fetch(u) {
      proto.get(u, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          file.destroy();
          fs.unlinkSync(dest);
          const loc = res.headers.location;
          // Re-open the file and fetch the redirect target
          const file2 = fs.createWriteStream(dest);
          fetch2(loc, file2, resolve, reject);
          return;
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP ${res.statusCode} for ${u}`));
        }
        res.pipe(file);
        file.on('finish', () => file.close(resolve));
      }).on('error', reject);
    }
    function fetch2(u, f, res, rej) {
      const p2 = u.startsWith('https') ? https : http;
      p2.get(u, (response) => {
        if (response.statusCode !== 200) {
          return rej(new Error(`HTTP ${response.statusCode} for ${u}`));
        }
        response.pipe(f);
        f.on('finish', () => f.close(res));
      }).on('error', rej);
    }
    fetch(url);
  });
}

function extractTgz(tgzPath, destDir) {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(destDir, { recursive: true });
    const chunks = [];
    const stream = fs.createReadStream(tgzPath).pipe(zlib.createGunzip());
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => {
      const buf = Buffer.concat(chunks);
      let offset = 0;
      while (offset + 512 <= buf.length) {
        const header = buf.slice(offset, offset + 512);
        if (header.every(b => b === 0)) break;
        const name     = header.slice(0, 100).toString('utf8').replace(/\0/g, '');
        const sizeStr  = header.slice(124, 136).toString('utf8').replace(/\0/g, '').trim();
        const size     = parseInt(sizeStr, 8) || 0;
        const typeflag = header[156];
        offset += 512;
        if (typeflag === 0 || typeflag === 48) {
          const relPath  = name.replace(/^package\//, '');
          const filePath = path.join(destDir, relPath);
          fs.mkdirSync(path.dirname(filePath), { recursive: true });
          fs.writeFileSync(filePath, buf.slice(offset, offset + size));
        }
        offset += Math.ceil(size / 512) * 512;
      }
      resolve();
    });
    stream.on('error', reject);
  });
}

async function installPackage(name, version) {
  const url     = `https://registry.npmjs.org/${name}/-/${name}-${version}.tgz`;
  const tgzPath = path.join(__dirname, `${name.replace('/', '-')}.tgz`);
  const destDir = path.join(__dirname, 'node_modules', name);

  if (fs.existsSync(path.join(destDir, 'package.json'))) {
    console.log(`  ${name}@${version} already installed, skipping.`);
    return;
  }

  console.log(`  Downloading ${name}@${version}...`);
  await download(url, tgzPath);
  console.log(`  Extracting ${name}@${version}...`);
  await extractTgz(tgzPath, destDir);
  fs.unlinkSync(tgzPath);
  console.log(`  ${name}@${version} installed.`);
}

(async () => {
  console.log('Installing packages...');
  for (const pkg of PACKAGES) {
    await installPackage(pkg.name, pkg.version);
  }
  console.log('\nAll packages installed successfully.');
})().catch((err) => {
  console.error('Installation failed:', err);
  process.exit(1);
});
