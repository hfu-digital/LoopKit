/** Temporarily overlay built npm package artifacts, without publishing or changing manifests/locks.
 * node scripts/validate-consumer.mjs /absolute/consumer /absolute/package ... -- command args...
 */
import { cp, mkdtemp, readFile, rename, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
const args = process.argv.slice(2);
const separator = args.indexOf('--');
if (separator < 2 || !args[separator + 1]) throw Error('Expected consumer, package directories, --, command');
const consumer = resolve(args[0]);
const backup = await mkdtemp(join(tmpdir(), 'hfu-consumer-'));
const changes = [];
try {
    for (const [index, directory] of args.slice(1, separator).entries()) {
        const source = resolve(directory);
        const manifest = JSON.parse(await readFile(join(source, 'package.json'), 'utf8'));
        if (!manifest.name?.startsWith('@hfu.digital/')) throw Error('Only HFU kit artifacts may be overlaid');
        const destination = join(consumer, 'node_modules', manifest.name);
        const saved = join(backup, String(index));
        await rename(destination, saved);
        changes.push({ destination, saved });
        await cp(source, destination, { recursive: true, filter: (path) => path === source || path === join(source, 'package.json') || path.startsWith(join(source, 'dist')) });
    }
    const status = await new Promise((done, reject) => {
        const child = spawn(args[separator + 1], args.slice(separator + 2), { cwd: consumer, stdio: 'inherit' });
        child.on('error', reject);
        child.on('exit', (code) => done(code ?? 1));
    });
    process.exitCode = status;
} finally {
    for (const { destination, saved } of changes.reverse()) {
        await rm(destination, { recursive: true, force: true });
        await rename(saved, destination);
    }
    await rm(backup, { recursive: true, force: true });
}
