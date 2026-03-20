const Module = require('module');
const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  const exportsValue = originalLoad.apply(this, arguments);
  if (
    exportsValue &&
    (typeof exportsValue === 'object' || typeof exportsValue === 'function') &&
    !('default' in exportsValue) &&
    Object.isExtensible(exportsValue)
  ) {
    try {
      exportsValue.default = exportsValue;
    } catch {}
  }
  return exportsValue;
};
