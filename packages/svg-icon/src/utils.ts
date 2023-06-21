/* eslint-disable unicorn/no-array-reduce */
import { load } from 'cheerio';
import micromatch from 'micromatch';

const CHEERIO_OPTIONS = {
  lowerCaseTags: true,
  lowerCaseAttributeNames: true,
  _useHtmlParser2: true,
};

const getAttributes = (attrs: Record<string, unknown>) =>
  Object.keys(attrs).reduce((acc, key) => {
    const value = attrs[key];

    return value ? `${acc} ${key}="${value}"` : acc;
  }, '');

export function toSymbol(content: string, id: string) {
  const $svg = load(content, CHEERIO_OPTIONS)('svg').first();

  const attrNames = Object.keys($svg.attr() || {});

  const width = $svg.attr('width');
  const height = $svg.attr('height');
  const viewBox = $svg.attr('viewBox');

  const attrNamesToPreserve = micromatch(
    attrNames,
    [
      'id',
      'viewBox',
      'preserveAspectRatio',
      'class',
      'overflow',
      'stroke?(-*)',
      'fill?(-*)',
      'xmlns?(:*)',
    ],
    { nocase: true },
  );

  const attrs: Record<string, any> = {};

  for (const name of attrNamesToPreserve) {
    attrs[name] = $svg.attr(name);
  }

  if (!viewBox && width && height) {
    attrs.viewBox = `0 0 ${width} ${height}`;
  }

  attrs.id = id;

  return `<symbol${getAttributes(attrs)}>${$svg.html()}</symbol>`;
}
