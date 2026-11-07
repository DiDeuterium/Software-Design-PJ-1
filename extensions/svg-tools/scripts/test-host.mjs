import { runTests } from '@vscode/test-electron';
import { resolve } from 'node:path';
const executable = process.env.VSCODE_EXECUTABLE;
if (!executable) throw new Error('Set VSCODE_EXECUTABLE to the installed Code.exe');
await runTests({ vscodeExecutablePath: executable, extensionDevelopmentPath: resolve('.'),
  extensionTestsPath: resolve('dist-test/host.cjs'),
  launchArgs: [resolve('examples'), '--user-data-dir', resolve('.test-profile-host'), '--extensions-dir', resolve('.test-extensions'), '--skip-welcome', '--skip-release-notes'] });
