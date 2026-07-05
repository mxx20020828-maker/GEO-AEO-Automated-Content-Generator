import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { URL } from 'node:url';

const INPUT_FILE = 'aitseo-analysis/aitseo-urls.txt';
const CSV_OUTPUT_FILE = 'aitseo-analysis/aitseo-article-structure.csv';
const REPORT_OUTPUT_FILE = 'aitseo-analysis/aitseo-pattern-report.md';
const REQUEST_DELAY_MS = 1500;
const REQUEST_TIMEOUT_MS = 30000;
const USER_AGENT = 'Mozilla/5.0 (compatible; AITSEOArticleAnalyzer/1.2; +https://github.com/)';

const preferredContentSelectors = [
  'article',
  'main article',
  '.entry-content',
  '.post-content',
  '.article-content',
  '.content',
  '.wp-block-post-content',
  '#content',
  '#general-section article .content',
];
const fallbackCandidateSelectors = ['article', 'main', 'section', 'div'];
const csvColumns = [
  'url', 'status', 'analysisStatus', 'statusCode', 'error', 'title', 'metaDescription', 'ogTitle',
  'ogDescription', 'h1', 'h2List', 'h3List', 'faqQuestions', 'tableCount',
  'imageCount', 'imageAltList', 'internalLinkCount', 'externalLinkCount',
  'bodyWordOrChineseCharCount', 'contentSelectorUsed', 'extractedTextLength',
  'extractionWarning', 'hasVideoEmbed', 'hasSchemaJsonLd', 'introSample',
  'conclusionSample', 'bodyStart300', 'bodyEnd300',
];

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const urls = (await readFile(INPUT_FILE, 'utf8'))
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));

  if (!urls.length) throw new Error(`No URLs found in ${INPUT_FILE}`);

  const rows = [];
  for (const [index, url] of urls.entries()) {
    if (index > 0) await delay(REQUEST_DELAY_MS);
    console.log(`[${index + 1}/${urls.length}] ${url}`);
    rows.push(await analyzeUrl(url));
  }

  await mkdir('aitseo-analysis', { recursive: true });
  await writeFile(CSV_OUTPUT_FILE, toCsv(rows), 'utf8');
  await writeFile(REPORT_OUTPUT_FILE, buildMarkdownReport(rows), 'utf8');
  console.log(`Wrote ${CSV_OUTPUT_FILE}`);
  console.log(`Wrote ${REPORT_OUTPUT_FILE}`);
}

async function analyzeUrl(url) {
  try {
    const response = await fetchHtml(url);
    const html = response.body;
    const pageUrl = response.finalUrl || url;
    const title = extractTitle(html);
    const h1 = extractHeadings(html, 'h1')[0] || '';
    const content = extractArticleContent(html);
    const bodyText = content.text;
    const extractedTextLength = [...bodyText].length;
    const wordCount = estimateTextCount(bodyText);
    const analysisStatus = getAnalysisStatus(response.statusCode, extractedTextLength, wordCount, title, h1);
    const extractionWarning = analysisStatus === 'valid' && wordCount < 300 && (title || h1) ? 'possible_body_extraction_failed' : '';
    const links = countLinks(content.html, pageUrl);

    return {
      url,
      status: response.statusCode === 200 ? 'success' : 'failed',
      analysisStatus,
      statusCode: response.statusCode,
      error: response.statusCode === 200 ? '' : `HTTP ${response.statusCode}`,
      title,
      metaDescription: extractMetaByName(html, 'description'),
      ogTitle: extractMetaByProperty(html, 'og:title'),
      ogDescription: extractMetaByProperty(html, 'og:description'),
      h1,
      h2List: extractHeadings(content.html, 'h2'),
      h3List: extractHeadings(content.html, 'h3'),
      faqQuestions: extractFaqQuestions(content.html),
      tableCount: countMatches(content.html, /<table\b/gi),
      imageCount: countMatches(content.html, /<img\b/gi),
      imageAltList: extractImageAlts(content.html),
      internalLinkCount: links.internal,
      externalLinkCount: links.external,
      bodyWordOrChineseCharCount: wordCount,
      contentSelectorUsed: content.selector,
      extractedTextLength,
      extractionWarning,
      hasVideoEmbed: hasVideoEmbed(html),
      hasSchemaJsonLd: hasSchemaJsonLd(html),
      introSample: firstChars(bodyText, 300),
      conclusionSample: lastChars(bodyText, 300),
      bodyStart300: firstChars(bodyText, 300),
      bodyEnd300: lastChars(bodyText, 300),
    };
  } catch (error) {
    return failedRow(url, error.message);
  }
}

function getAnalysisStatus(statusCode, extractedTextLength, wordCount, title, h1) {
  if (statusCode !== 200) return 'http_failed';
  if (extractedTextLength === 0 && wordCount === 0 && !title && !h1) return 'empty_response';
  if (extractedTextLength === 0 || wordCount === 0) return 'extraction_failed';
  return 'valid';
}

function failedRow(url, error) {
  return {
    url, status: 'failed', analysisStatus: 'http_failed', statusCode: '', error, title: '', metaDescription: '', ogTitle: '',
    ogDescription: '', h1: '', h2List: [], h3List: [], faqQuestions: [], tableCount: 0,
    imageCount: 0, imageAltList: [], internalLinkCount: 0, externalLinkCount: 0,
    bodyWordOrChineseCharCount: 0, contentSelectorUsed: '', extractedTextLength: 0,
    extractionWarning: '', hasVideoEmbed: false, hasSchemaJsonLd: false, introSample: '',
    conclusionSample: '', bodyStart300: '', bodyEnd300: '',
  };
}

function fetchHtml(url, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (redirectCount > 5) return reject(new Error('Too many redirects'));
    const parsedUrl = new URL(url);
    const req = (parsedUrl.protocol === 'http:' ? httpRequest : httpsRequest)(
      parsedUrl,
      {
        method: 'GET',
        timeout: REQUEST_TIMEOUT_MS,
        headers: {
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7',
          'User-Agent': USER_AGENT,
        },
      },
      (res) => {
        const statusCode = res.statusCode || 0;
        if ([301, 302, 303, 307, 308].includes(statusCode) && res.headers.location) {
          res.resume();
          resolve(fetchHtml(new URL(res.headers.location, parsedUrl).toString(), redirectCount + 1));
          return;
        }
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const buffer = Buffer.concat(chunks);
          resolve({ statusCode, finalUrl: parsedUrl.toString(), body: buffer.toString(detectCharset(res, buffer)) });
        });
      },
    );
    req.on('timeout', () => req.destroy(new Error(`Request timed out after ${REQUEST_TIMEOUT_MS}ms`)));
    req.on('error', reject);
    req.end();
  });
}

function detectCharset(res, buffer) {
  const headerMatch = String(res.headers['content-type'] || '').match(/charset=([^;\s]+)/i);
  const htmlMatch = buffer.toString('latin1', 0, Math.min(buffer.length, 2048)).match(/<meta[^>]+charset=["']?([^"'\s/>]+)/i);
  const charset = (headerMatch?.[1] || htmlMatch?.[1] || 'utf-8').toLowerCase();
  return Buffer.isEncoding(charset) ? charset : 'utf-8';
}

function extractArticleContent(html) {
  const body = matchFirst(html, /<body\b[^>]*>([\s\S]*?)<\/body>/i) || html;
  const cleanedBody = removeNonContentBlocks(body);

  for (const selector of preferredContentSelectors) {
    const best = chooseBestCandidate(findSelectorMatches(cleanedBody, selector).map((candidate) => buildCandidate(candidate, selector)));
    if (best && best.text.length >= 300) return best;
  }

  const fallbackCandidates = fallbackCandidateSelectors.flatMap((selector) =>
    findSelectorMatches(cleanedBody, selector).map((candidate) => buildCandidate(candidate, `longest:${selector}`)),
  );
  return chooseBestCandidate(fallbackCandidates) || buildCandidate(cleanedBody, 'body_fallback');
}

function buildCandidate(html, selector) {
  const cleanHtml = removeNonContentBlocks(html);
  return { selector, html: cleanHtml, text: cleanText(stripTags(cleanHtml)) };
}

function chooseBestCandidate(candidates) {
  return candidates
    .filter((candidate) => candidate.text.length > 0)
    .sort((a, b) => contentScore(b) - contentScore(a))[0];
}

function contentScore(candidate) {
  const textLength = [...candidate.text].length;
  const paragraphCount = countMatches(candidate.html, /<p\b/gi);
  const headingCount = countMatches(candidate.html, /<h[1-3]\b/gi);
  const linkCount = countMatches(candidate.html, /<a\b/gi);
  const linkPenalty = linkCount && textLength / linkCount < 35 ? linkCount * 25 : 0;
  return textLength + paragraphCount * 120 + headingCount * 40 - linkPenalty;
}

function removeNonContentBlocks(html) {
  let cleaned = html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<nav\b[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<header\b[\s\S]*?<\/header>/gi, ' ')
    .replace(/<footer\b[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<aside\b[\s\S]*?<\/aside>/gi, ' ');

  const noise = '(?:sidebar|side-bar|related(?:[-_\\s]?posts?)?|comments?|comment[-_\\s]?area|cookie(?:[-_\\s]?(?:notice|banner|consent|bar))?)';
  const noiseBlock = new RegExp(`<([a-z][a-z0-9:-]*)\\b[^>]*(?:class|id)=["'][^"']*${noise}[^"']*["'][^>]*>[\\s\\S]*?<\\/\\1>`, 'gi');
  let previous;
  do {
    previous = cleaned;
    cleaned = cleaned.replace(noiseBlock, ' ');
  } while (cleaned !== previous);
  return cleaned;
}

function findSelectorMatches(html, selector) {
  return selector.split(/\s+/).filter(Boolean).reduce((contexts, part) =>
    contexts.flatMap((context) => findSimpleSelectorMatches(context, part)), [html]);
}

function findSimpleSelectorMatches(html, selector) {
  const parsed = parseSimpleSelector(selector);
  const tagNames = parsed.tag ? [parsed.tag] : getElementTagNames(html);
  return tagNames.flatMap((tag) => findElementBlocks(html, tag)
    .filter((block) => elementMatchesSelector(block.openingTag, parsed))
    .map((block) => block.html));
}

function parseSimpleSelector(selector) {
  if (selector.startsWith('.')) return { tag: '', id: '', className: selector.slice(1) };
  if (selector.startsWith('#')) return { tag: '', id: selector.slice(1), className: '' };
  return {
    tag: selector.match(/^[a-z][a-z0-9:-]*/i)?.[0] || '',
    id: selector.match(/#([a-z0-9_-]+)/i)?.[1] || '',
    className: selector.match(/\.([a-z0-9_-]+)/i)?.[1] || '',
  };
}

function getElementTagNames(html) {
  return unique([...html.matchAll(/<([a-z][a-z0-9:-]*)\b[^>]*>/gi)].map((match) => match[1].toLowerCase())
    .filter((tag) => !['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr'].includes(tag)));
}

function findElementBlocks(html, tagName) {
  const blocks = [];
  const tagRe = new RegExp(`<\\/?${escapeRegExp(tagName)}\\b[^>]*>`, 'gi');
  let match;
  while ((match = tagRe.exec(html))) {
    if (match[0].startsWith('</')) continue;
    const start = match.index;
    const openingTag = match[0];
    let depth = 1;
    let end = tagRe.lastIndex;
    let inner;
    while ((inner = tagRe.exec(html))) {
      depth += inner[0].startsWith('</') ? -1 : 1;
      if (depth === 0) {
        end = tagRe.lastIndex;
        break;
      }
    }
    if (depth === 0) blocks.push({ openingTag, html: html.slice(start, end) });
    tagRe.lastIndex = start + openingTag.length;
  }
  return blocks;
}

function elementMatchesSelector(openingTag, selector) {
  const attrs = parseAttributes(openingTag);
  const tagName = openingTag.match(/^<([a-z][a-z0-9:-]*)/i)?.[1]?.toLowerCase() || '';
  if (selector.tag && tagName !== selector.tag.toLowerCase()) return false;
  if (selector.id && attrs.id !== selector.id) return false;
  if (selector.className && !String(attrs.class || '').split(/\s+/).includes(selector.className)) return false;
  return true;
}

function extractTitle(html) { return cleanText(matchFirst(html, /<title[^>]*>([\s\S]*?)<\/title>/i)); }
function extractMetaByName(html, name) { return extractMetaContent(html, 'name', name); }
function extractMetaByProperty(html, property) { return extractMetaContent(html, 'property', property); }
function extractMetaContent(html, attrName, attrValue) {
  for (const tag of html.match(/<meta\b[^>]*>/gi) || []) {
    const attrs = parseAttributes(tag);
    if (String(attrs[attrName] || '').toLowerCase() === attrValue.toLowerCase()) return cleanText(attrs.content || '');
  }
  return '';
}
function extractHeadings(html, level) {
  return unique([...html.matchAll(new RegExp(`<${level}\\b[^>]*>([\\s\\S]*?)<\\/${level}>`, 'gi'))]
    .map((match) => cleanText(stripTags(match[1]))).filter(Boolean));
}
function extractFaqQuestions(html) {
  const questions = new Set();
  for (const block of extractJsonLdBlocks(html)) collectFaqQuestionsFromJson(block, questions);
  for (const heading of [...extractHeadings(html, 'h2'), ...extractHeadings(html, 'h3')]) if (isQuestionLike(heading)) questions.add(heading);
  for (const match of html.matchAll(/<summary\b[^>]*>([\s\S]*?)<\/summary>/gi)) questions.add(cleanText(stripTags(match[1])));
  return [...questions].filter(isQuestionLike);
}
function extractJsonLdBlocks(html) {
  return [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
    .map((match) => { try { return JSON.parse(decodeHtmlEntities(match[1].trim())); } catch { return null; } })
    .filter(Boolean);
}
function collectFaqQuestionsFromJson(value, questions) {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) return value.forEach((item) => collectFaqQuestionsFromJson(item, questions));
  const types = Array.isArray(value['@type']) ? value['@type'] : [value['@type']];
  if (types.some((type) => String(type).toLowerCase() === 'faqpage') && Array.isArray(value.mainEntity)) {
    value.mainEntity.forEach((item) => item?.name && questions.add(cleanText(item.name)));
  }
  Object.values(value).forEach((child) => collectFaqQuestionsFromJson(child, questions));
}
function countLinks(html, pageUrl) {
  const base = new URL(pageUrl);
  let internal = 0;
  let external = 0;
  for (const match of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi)) {
    const href = match[1].trim();
    if (!href || href.startsWith('#') || /^(mailto|tel|javascript):/i.test(href)) continue;
    try {
      const target = new URL(href, base);
      target.hostname.replace(/^www\./, '') === base.hostname.replace(/^www\./, '') ? internal++ : external++;
    } catch {}
  }
  return { internal, external };
}
function extractImageAlts(html) { return unique((html.match(/<img\b[^>]*>/gi) || []).map((tag) => cleanText(parseAttributes(tag).alt || '')).filter(Boolean)); }
function hasVideoEmbed(html) { return /youtube\.com|youtu\.be|<iframe\b[^>]*(video|embed)|<video\b|vimeo\.com/i.test(html); }
function hasSchemaJsonLd(html) { return /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>/i.test(html); }
function estimateTextCount(text) { return (text.match(/[\u3400-\u9fff]/g) || []).length + (text.replace(/[\u3400-\u9fff]/g, ' ').match(/\b[\p{L}\p{N}][\p{L}\p{N}'-]*\b/gu) || []).length; }
function parseAttributes(tag) {
  const attrs = {};
  for (const match of tag.matchAll(/([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g)) attrs[match[1].toLowerCase()] = decodeHtmlEntities(match[2] ?? match[3] ?? match[4] ?? '');
  return attrs;
}
function toCsv(rows) { return [csvColumns.join(','), ...rows.map((row) => csvColumns.map((column) => csvEscape(Array.isArray(row[column]) ? row[column].join(' | ') : row[column])).join(','))].join('\n'); }
function buildMarkdownReport(rows) {
  const httpSuccessful = rows.filter((row) => row.statusCode === 200);
  const valid = rows.filter((row) => row.analysisStatus === 'valid');
  const skipped = rows.filter((row) => row.analysisStatus === 'empty_response' || row.analysisStatus === 'http_failed');
  const warnings = rows.filter((row) => row.extractionWarning);
  return [
    '# AITSEO Article Pattern Report', '', `Generated at: ${new Date().toISOString()}`, '', '## Summary', '',
    `- Total URLs: ${rows.length}`,
    `- HTTP successful pages: ${httpSuccessful.length}`,
    `- Valid analyzed articles: ${valid.length}`,
    `- Empty / skipped pages: ${skipped.length}`,
    `- Extraction warnings: ${warnings.length}`,
    `- Average estimated body words / Chinese characters: ${Math.round(average(valid.map((row) => row.bodyWordOrChineseCharCount)))}`,
    `- Average H2 count: ${roundOne(average(valid.map((row) => row.h2List.length)))}`,
    `- Average H3 count: ${roundOne(average(valid.map((row) => row.h3List.length)))}`,
    `- Average table count: ${roundOne(average(valid.map((row) => row.tableCount)))}`,
    `- Pages with FAQ questions: ${valid.filter((row) => row.faqQuestions.length > 0).length}`,
    `- Average image count: ${roundOne(average(valid.map((row) => row.imageCount)))}`,
    '', '## Failed / Skipped URLs', '',
    rows.length - valid.length ? markdownTable(rows.filter((row) => row.analysisStatus !== 'valid'), ['url', 'analysisStatus', 'statusCode', 'error', 'extractionWarning']) : 'None.',
    '', '## Page Details', '',
    markdownTable(rows, ['url', 'status', 'analysisStatus', 'statusCode', 'title', 'h1', 'bodyWordOrChineseCharCount', 'contentSelectorUsed', 'extractedTextLength', 'extractionWarning', 'tableCount', 'imageCount', 'internalLinkCount', 'externalLinkCount', 'hasVideoEmbed', 'hasSchemaJsonLd']), '',
  ].join('\n');
}
function markdownTable(rows, columns) { return [`| ${columns.join(' | ')} |`, `| ${columns.map(() => '---').join(' | ')} |`, ...rows.map((row) => `| ${columns.map((column) => markdownCell(row[column])).join(' | ')} |`)].join('\n'); }
function markdownCell(value) { return (Array.isArray(value) ? value.join(' | ') : String(value ?? '')).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').slice(0, 180); }
function csvEscape(value) { return `"${String(value ?? '').replace(/"/g, '""')}"`; }
function stripTags(html) { return html.replace(/<[^>]+>/g, ' '); }
function cleanText(value) { return decodeHtmlEntities(String(value || '').replace(/\s+/g, ' ').trim()); }
function decodeHtmlEntities(value) { return String(value || '').replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&quot;/gi, '"').replace(/&#39;/gi, "'").replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code))).replace(/&#x([a-f0-9]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16))); }
function matchFirst(value, regex) { return value.match(regex)?.[1] || ''; }
function countMatches(value, regex) { return (value.match(regex) || []).length; }
function unique(values) { return [...new Set(values)]; }
function isQuestionLike(value) { return /[?\uFF1F]\s*$/.test(value) || /^(what|why|how|when|where|who|can|does|do|is|are|will|should)\b/i.test(value); }
function firstChars(value, count) { return [...value].slice(0, count).join(''); }
function lastChars(value, count) { return [...value].slice(-count).join(''); }
function average(values) { return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0; }
function roundOne(value) { return Math.round(value * 10) / 10; }
function escapeRegExp(value) { return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function delay(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
