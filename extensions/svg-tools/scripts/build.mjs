import { build } from 'esbuild';
import { resolve } from 'node:path';
await build({ entryPoints:['src/extension.ts'],bundle:true,platform:'node',format:'cjs',target:'node18',external:['vscode'],outfile:'dist/extension.cjs',sourcemap:true });
await build({ entryPoints:['tests/OutlineParser.test.ts','tests/Providers.test.ts'],bundle:true,platform:'node',format:'cjs',target:'node18',alias:{vscode:resolve('tests/FakeVscode.ts')},outdir:'dist-test',outExtension:{'.js':'.cjs'} });
await build({ entryPoints:['tests/host.ts'],bundle:true,platform:'node',format:'cjs',target:'node18',external:['vscode'],outdir:'dist-test',outExtension:{'.js':'.cjs'} });
