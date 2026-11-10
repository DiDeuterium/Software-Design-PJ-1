/** @internal Structural access is reserved for SvgDocument, not application commands. */
export const treeEdit: unique symbol = Symbol('document tree edit');
export const treeOwner: unique symbol = Symbol('document membership');
export const treeChildren: unique symbol = Symbol('document children replacement');
