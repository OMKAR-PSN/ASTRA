const projectRoot = new URL('../', import.meta.url);

async function resolveWithExtensions(url, context, next) {
  try {
    return await next(url, context);
  } catch (error) {
    if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error;
    for (const extension of ['.ts', '.tsx', '/index.ts', '/index.tsx']) {
      try {
        return await next(url + extension, context);
      } catch (inner) {
        if (inner.code !== 'ERR_MODULE_NOT_FOUND') throw inner;
      }
    }
    throw error;
  }
}

/** Dev-only resolver for node --test: supports the app's @/ alias and extensionless TS imports. */
export async function resolve(specifier, context, next) {
  if (specifier.startsWith('@/')) {
    return resolveWithExtensions(new URL(specifier.slice(2), projectRoot).href, context, next);
  }
  if (specifier.startsWith('./') || specifier.startsWith('../')) {
    return resolveWithExtensions(specifier, context, next);
  }
  return next(specifier, context);
}
