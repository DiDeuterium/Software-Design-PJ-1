export let statType = 1;
export let statFails = false;
export function setStat(type: number, fails = false): void { statType = type; statFails = fails; }
export const workspace = { fs: { async stat(): Promise<{ type: number }> { if (statFails) throw new Error('missing'); return { type: statType }; } } };
export const FileType = { File: 1, Directory: 2 };
export const SymbolKind = { Object: 18 };
export { Range } from './fakes/Range';
export { DocumentSymbol } from './fakes/DocumentSymbol';
export { FileDecoration } from './fakes/FileDecoration';
export { EventEmitter } from './fakes/EventEmitter';
