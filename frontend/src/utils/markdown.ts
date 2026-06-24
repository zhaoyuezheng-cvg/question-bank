import MarkdownIt from 'markdown-it';
import katex from 'katex';

// Initialize markdown-it with LaTeX support
const md = new MarkdownIt({
  html: false,
  breaks: true,
  linkify: true,
});

// Custom LaTeX block/inline rendering
// Display math: $$ ... $$
// Inline math: $ ... $
function latexPlugin(md: MarkdownIt) {
  // Inline math
  md.inline.rules.math = function (state, silent) {
    if (state.src.charCodeAt(state.pos) !== 0x24 /* $ */) return false;
    if (state.src.charCodeAt(state.pos + 1) === 0x24) return false; // skip $$

    const start = state.pos + 1;
    let end = start;
    while (end < state.posMax && state.src.charCodeAt(end) !== 0x24) {
      end++;
    }
    if (end >= state.posMax) return false;

    const content = state.src.slice(start, end).trim();
    if (!content) return false;

    if (!silent) {
      const token = state.push('math_inline', 'math', 0);
      token.content = content;
      token.markup = '$';
    }
    state.pos = end + 1;
    return true;
  };

  // Display math
  md.block.rules.math = function (state, startLine, endLine, silent) {
    const startPos = state.bMarks[startLine] + state.tShift[startLine];
    const maxPos = state.eMarks[startLine];

    if (state.src.charCodeAt(startPos) !== 0x24 || state.src.charCodeAt(startPos + 1) !== 0x24) return false;

    let nextLine = startLine + 1;
    let found = false;

    while (nextLine < endLine) {
      const lineStart = state.bMarks[nextLine] + state.tShift[nextLine];
      const lineEnd = state.eMarks[nextLine];
      const line = state.src.slice(lineStart, lineEnd).trim();

      if (line.endsWith('$$')) {
        found = true;
        break;
      }
      nextLine++;
    }

    if (!found) return false;
    if (silent) return true;

    const content = state.src.slice(
      state.bMarks[startLine] + state.tShift[startLine] + 2,
      state.eMarks[nextLine]
    ).replace(/\$\$/, '').trim();

    const token = state.push('math_block', 'math', 0);
    token.content = content;
    token.markup = '$$';
    token.map = [startLine, nextLine + 1];
    state.line = nextLine + 1;
    return true;
  };

  // Renderers
  md.renderer.rules.math_inline = function (tokens, idx) {
    try {
      return `<span class="math-inline">${katex.renderToString(tokens[idx].content, { throwOnError: false, displayMode: false })}</span>`;
    } catch {
      return `<span class="math-error">${tokens[idx].content}</span>`;
    }
  };

  md.renderer.rules.math_block = function (tokens, idx) {
    try {
      return `<div class="math-block">${katex.renderToString(tokens[idx].content, { throwOnError: false, displayMode: true })}</div>`;
    } catch {
      return `<div class="math-error">${tokens[idx].content}</div>`;
    }
  };
}

// Underline syntax: ==text==
function underlinePlugin(md: MarkdownIt) {
  md.inline.rules.underline = function (state, silent) {
    if (state.src.charCodeAt(state.pos) !== 0x3D /* = */) return false;
    if (state.src.charCodeAt(state.pos + 1) !== 0x3D) return false;

    const start = state.pos + 2;
    let end = start;
    while (end < state.posMax - 1) {
      if (state.src.charCodeAt(end) === 0x3D && state.src.charCodeAt(end + 1) === 0x3D) break;
      end++;
    }
    if (end >= state.posMax - 1) return false;

    if (!silent) {
      const token = state.push('underline', 'u', 0);
      token.content = state.src.slice(start, end);
    }
    state.pos = end + 2;
    return true;
  };

  md.renderer.rules.underline = function (tokens, idx) {
    return `<u>${tokens[idx].content}</u>`;
  };
}

// Blank/fill-in: ___
function blankPlugin(md: MarkdownIt) {
  md.inline.rules.blank = function (state, silent) {
    const pos = state.pos;
    if (state.src.charCodeAt(pos) !== 0x5F /* _ */) return false;
    if (state.src.charCodeAt(pos + 1) !== 0x5F || state.src.charCodeAt(pos + 2) !== 0x5F) return false;

    if (!silent) {
      const token = state.push('blank', 'span', 0);
    }
    state.pos = pos + 3;
    return true;
  };

  md.renderer.rules.blank = function () {
    return '<span class="fill-blank">________</span>';
  };
}

md.use(latexPlugin);
md.use(underlinePlugin);
md.use(blankPlugin);

export function renderMarkdown(text: string): string {
  if (!text) return '';
  return md.render(text);
}
