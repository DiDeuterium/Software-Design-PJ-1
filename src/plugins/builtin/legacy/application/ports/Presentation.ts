import type { SvgDocument } from '../../domain/document/SvgDocument.js';
import type { Shape } from '../../domain/shapes/Shape.js';

/** Structural ports: formatters need not import application to satisfy them. */
export interface TreeView { format(document: SvgDocument, id?: string): string; }
export interface ShapeView { format(shape: Shape): string; }
export interface HelpView { format(): string; }
