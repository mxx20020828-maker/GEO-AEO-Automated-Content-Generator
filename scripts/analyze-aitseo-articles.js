import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { URL } from 'node:url';

const INPUT_FILE = 'aitseo-analysis/aitseo-urls.txt';
const CSV_OUTPUT_FILE = 'aitseo-analysis/aitseo-article-structure.csv';
const REPORT_OUTPUT_FILE = 'aitseo-analysis/aitseo-pattern-report.md';
const REQUEST_DELAY_MS = 1500;
const REQUEST_TIMEOUT_MS = 30000;
const USER_AGENT =
  'Mozilla/5.0 (compatible; AITSEOArticleAnalyzer/1.0; +https://github.com/)';

const csvColumns = [
  'url',
  'status',
  'statusCode',
  'error',
  'title',
  'metaDescription',
  'ogTitle',
  'ogDescription',
  'h1',
  'h2List',
  'h3List',
  'faqQuestions',
  'tableCount',
  'imageCount',
  'imageAltList',
  'internalLinkCount',
  'externalLinkCount',
  'bodyWordOrChineseCharCount',
  'hasVideoEmbed',
  'hasSchemaJsonLd',
  'bodyStart300',
  'bodyEnd300',
];

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const urls = await readUrls(INPUT_FILE);

  if (urls.length === 0) {
    throw new Error(`No URLs found in ${INPUT_FILE}`);
  }

  const rows = [];

  for (const [index, url] of urls.entries()) {
    if (index > 0) {
      await delay(REQUEST_DELAY_MS);
    }

    console.log(`[${index + 1}/${urls.length}] ${url}`);
    rows.push(await analyzeUrl(url));
  }

  await mkdir('aitseo-analysis', { recursive: true });
  await writeFile(CSV_OUTPUT_FILE, toCsv(rows), 'utf8');
  await writeFile(REPORT_OUTPUT_FILE, buildMarkdownReport(rows), 'utf8');

  console.log(`Wrote ${CSV_OUTPUT_FILE}`);
  console.log(`Wrote ${REPORT_OUTPUT_FILE}`);
}

async function readUrls(filePath) {
  const content = await readFile(filePath, 'utf8');

  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));
}

async function analyzeUrl(url) {
  try {
    const response = await fetchHtml(url);
    const html = response.body;
    const pageUrl = response.finalUrl || url;
    const bodyText = extractBodyText(html);
    const imageAlts = extractImageAlts(html);
    const links = countLinks(html, pageUrl);

    return {
      url,
      status: response.statusCode >= 200 && response.statusCode < 400 ? 'success' : 'failed',
      statusCode: response.statusCode,
      error:
        response.statusCode >= 200 && response.statusCode < 400
          ? ''
          : `HTTP ${response.statusCode}`,
      title: extractTitle(html),
      metaDescription: extractMetaByName(html, 'description'),
      ogTitle: extractMetaByProperty(html, 'og:title'),
      ogDescription: extractMetaByProperty(html, 'og:description'),
      h1: extractHeadings(html, 'h1')[0] || '',
      h2List: extractHeadings(html, 'h2'),
      h3List: extractHeadings(html, 'h3'),
      faqQuestions: extractFaqQuestions(html),
      tableCount: countMatches(html, /<table\b/gi),
      imageCount: countMatches(html, /<img\b/gi),
      imageAltList: imageAlts,
      internalLinkCount: links.internal,
      externalLinkCount: links.external,
      bodyWordOrChineseCharCount: estimateTextCount(bodyText),
      hasVideoEmbed: hasVideoEmbed(html),
      hasSchemaJsonLd: hasSchemaJsonLd(html),
      bodyStart300: firstChars(bodyText, 300),
      bodyEnd300: lastChars(bodyText, 300),
    };
  } catch (error) {
    return {
      url,
      status: 'failed',
      statusCode: '',
      error: error.message,
      title: '',
      metaDescription: '',
      ogTitle: '',
      ogDescription: '',
      h1: '',
      h2List: [],
      h3List: [],
      faqQuestions: [],
      tableCount: 0,
      imageCount: 0,
      imageAltList: [],
      internalLinkCount: 0,
      externalLinkCount: 0,
      bodyWordOrChineseCharCount: 0,
      hasVideoEmbed: false,
      hasSchemaJsonLd: false,
      bodyStart300: '',
      bodyEnd300: '',
    };
  }
}

function fetchHtml(url, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (redirectCount > 5) {
      reject(new Error('Too many redirects'));
      return;
    }

    const parsedUrl = new URL(url);
    const requestFn = parsedUrl.protocol === 'http:' ? httpRequest : httpsRequest;

    const req = requestFn(
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
        const location = res.headers.location;

        if ([301, 302, 303, 307, 308].includes(statusCode) && location) {
          res.resume();
          const redirectUrl = new URL(location, parsedUrl).toString();
          resolve(fetchHtml(redirectUrl, redirectCount + 1));
          return;
        }

        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const buffer = Buffer.concat(chunks);
          const charset = detectCharset(res.headers['content-type'], buffer);
          resolve({
            statusCode,
            finalUrl: parsedUrl.toString(),
            body: buffer.toString(charset),
          });
        });
      },
    );

    req.on('timeout', () => req.destroy(new Error(`Request timed out after ${REQUEST_TIMEOUT_MS}ms`)));
    req.on('error', reject);
    req.end();
  });
}

function detectCharset(contentType, buffer) {
  const headerMatch = String(contentType || '').match(/charset=([^;\s]+)/i);
  const sample = buffer.toString('latin1', 0, Math.min(buffer.length, 2048));
  const htmlMatch = sample.match(/<meta[^>]+charset=["']?([^"'\s/>]+)/i);
  const charset = (headerMatch?.[1] || htmlMatch?.[1] || 'utf-8').toLowerCase();

  return Buffer.isEncoding(charset) ? charset : 'utf-8';
}

function extractTitle(html) {
  return cleanText(matchFirst(html, /<title[^>]*>([\s\S]*?)<\/title>/i));
}

function extractMetaByName(html, name) {
  return extractMetaContent(html, 'name', name);
}

function extractMetaByProperty(html, property) {
  return extractMetaContent(html, 'property', property);
}

function extractMetaContent(html, attrName, attrValue) {
  const metaTags = html.match(/<meta\b[^>]*>/gi) || [];

  for (const tag of metaTags) {
    const attrs = parseAttributes(tag);
    if (String(attrs[attrName] || '').toLowerCase() === attrValue.toLowerCase()) {
      return cleanText(attrs.content || '');
    }
  }

  return '';
}

function extractHeadings(html, level) {
  const re = new RegExp(`<${level}\\b[^>]*>([\\s\\S]*?)<\\/${level}>`, 'gi');
  return unique([...html.matchAll(re)].map((match) => cleanText(stripTags(match[1]))).filter(Boolean));
}

function extractFaqQuestions(html) {
  const questions = new Set();

  for (const block of extractJsonLdBlocks(html)) {
    collectFaqQuestionsFromJson(block, questions);
  }

  for (const question of extractDetailsQuestions(html)) {
    questions.add(question);
  }

  for (const heading of [...extractHeadings(html, 'h2'), ...extractHeadings(html, 'h3')]) {
    if (isQuestionLike(heading)) {
      questions.add(heading);
    }
  }

  return [...questions];
}

function extractJsonLdBlocks(html) {
  const scripts = [
    ...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi),
  ];
  const parsed = [];

  for (const script of scripts) {
    const json = decodeHtmlEntities(script[1].trim());
    try {
      parsed.push(JSON.parse(json));
    } catch {
      // Some pages include malformed or multiple JSON-LD objects. Other FAQ signals are still collected.
    }
  }

  return parsed;
}

function collectFaqQuestionsFromJson(value, questions) {
  if (!value || typeof value !== 'object') {
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectFaqQuestionsFromJson(item, questions);
    }
    return;
  }

  const type = value['@type'];
  const types = Array.isArray(type) ? type : [type];
  const isFaq = types.some((item) => String(item).toLowerCase() === 'faqpage');

  if (isFaq && Array.isArray(value.mainEntity)) {
    for (const item of value.mainEntity) {
      if (item?.name) {
        questions.add(cleanText(item.name));
      }
    }
  }

  for (const child of Object.values(value)) {
    collectFaqQuestionsFromJson(child, questions);
  }
}

function extractDetailsQuestions(html) {
  return [
    ...html.matchAll(/<summary\b[^>]*>([\s\S]*?)<\/summary>/gi),
    ...html.matchAll(/<button\b[^>]*>([\s\S]*?\?)\s*<\/button>/gi),
  ]
    .map((match) => cleanText(stripTags(match[1])))
    .filter(isQuestionLike);
}

function countLinks(html, pageUrl) {
  const base = new URL(pageUrl);
  const links = [...html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi)]
    .map((match) => match[1].trim())
    .filter((href) => href && !href.startsWith('#') && !/^(mailto|tel|javascript):/i.test(href));

  let internal = 0;
  let external = 0;

  for (const href of links) {
    try {
      const target = new URL(href, base);
      if (target.hostname.replace(/^www\./, '') === base.hostname.replace(/^www\./, '')) {
        internal += 1;
      } else {
        external += 1;
      }
    } catch {
      // Ignore malformed href values.
    }
  }

  return { internal, external };
}

function extractImageAlts(html) {
  return unique(
    (html.match(/<img\b[^>]*>/gi) || [])
      .map((tag) => parseAttributes(tag).alt || '')
      .map(cleanText)
      .filter(Boolean),
  );
}

function hasVideoEmbed(html) {
  return /youtube\.com|youtu\.be|<iframe\b[^>]*(video|embed)|<video\b|vimeo\.com/i.test(html);
}

function hasSchemaJsonLd(html) {
  return /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>/i.test(html);
}

function extractBodyText(html) {
  const body = matchFirst(html, /<body\b[^>]*>([\s\S]*?)<\/body>/i) || html;
  const main =
    matchFirst(body, /<article\b[^>]*>([\s\S]*?)<\/article>/i) ||
    matchFirst(body, /<main\b[^>]*>([\s\S]*?)<\/main>/i) ||
    body;

  return cleanText(
    stripTags(
      main
        .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
        .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, ' '),
    ),
  );
}

function estimateTextCount(text) {
  const chineseChars = (text.match(/[\u3400-\u9fff]/g) || []).length;
  const latinWords = (text.replace(/[\u3400-\u9fff]/g, ' ').match(/\b[\p{L}\p{N}][\p{L}\p{N}'-]*\b/gu) || [])
    .length;

  return chineseChars + latinWords;
}

function parseAttributes(tag) {
  const attrs = {};
  const attrRe = /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

  for (const match of tag.matchAll(attrRe)) {
    attrs[match[1].toLowerCase()] = decodeHtmlEntities(match[2] ?? match[3] ?? match[4] ?? '');
  }

  return attrs;
}

function toCsv(rows) {
  return [
    csvColumns.join(','),
    ...rows.map((row) =>
      csvColumns
        .map((column) => {
          const value = Array.isArray(row[column]) ? row[column].join(' | ') : row[column];
          return csvEscape(value);
        })
        .join(','),
    ),
  ].join('\n');
}

function buildMarkdownReport(rows) {
  const successfulRows = rows.filter((row) => row.status === 'success');
  const failedRows = rows.filter((row) => row.status === 'failed');
  const rowsWithFaq = successfulRows.filter((row) => row.faqQuestions.length > 0);
  const rowsWithTables = successfulRows.filter((row) => row.tableCount > 0);
  const rowsWithVideo = successfulRows.filter((row) => row.hasVideoEmbed);
  const rowsWithSchema = successfulRows.filter((row) => row.hasSchemaJsonLd);
  const averageCount = average(successfulRows.map((row) => row.bodyWordOrChineseCharCount));

  const lines = [
    '# AITSEO Article Pattern Report',
    '',
    `Generated at: ${new Date().toISOString()}`,
    '',
    '## Summary',
    '',
    `- Total URLs: ${rows.length}`,
    `- Successful: ${successfulRows.length}`,
    `- Failed: ${failedRows.length}`,
    `- Average estimated body words / Chinese characters: ${Math.round(averageCount)}`,
    `- Pages with FAQ questions: ${rowsWithFaq.length}`,
    `- Pages with tables: ${rowsWithTables.length}`,
    `- Pages with YouTube / video embeds: ${rowsWithVideo.length}`,
    `- Pages with schema / JSON-LD: ${rowsWithSchema.length}`,
    '',
    '## Structural Patterns',
    '',
    `- Average H2 count: ${roundOne(average(successfulRows.map((row) => row.h2List.length)))}`,
    `- Average H3 count: ${roundOne(average(successfulRows.map((row) => row.h3List.length)))}`,
    `- Average image count: ${roundOne(average(successfulRows.map((row) => row.imageCount)))}`,
    `- Average table count: ${roundOne(average(successfulRows.map((row) => row.tableCount)))}`,
    `- Average internal links: ${roundOne(average(successfulRows.map((row) => row.internalLinkCount)))}`,
    `- Average external links: ${roundOne(average(successfulRows.map((row) => row.externalLinkCount)))}`,
    '',
    '## Failed URLs',
    '',
    failedRows.length ? markdownTable(failedRows, ['url', 'statusCode', 'error']) : 'None.',
    '',
    '## Page Details',
    '',
    markdownTable(rows, [
      'url',
      'status',
      'statusCode',
      'title',
      'h1',
      'bodyWordOrChineseCharCount',
      'tableCount',
      'imageCount',
      'internalLinkCount',
      'externalLinkCount',
      'hasVideoEmbed',
      'hasSchemaJsonLd',
    ]),
    '',
  ];

  return lines.join('\n');
}

function markdownTable(rows, columns) {
  return [
    `| ${columns.join(' | ')} |`,
    `| ${columns.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${columns.map((column) => markdownCell(row[column])).join(' | ')} |`),
  ].join('\n');
}

function markdownCell(value) {
  const text = Array.isArray(value) ? value.join(' | ') : String(value ?? '');
  return text.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').slice(0, 180);
}

function csvEscape(value) {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

function stripTags(html) {
  return html.replace(/<[^>]+>/g, ' ');
}

function cleanText(value) {
  return decodeHtmlEntities(String(value || '').replace(/\s+/g, ' ').trim());
}

function decodeHtmlEntities(value) {
  return String(value || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([a-f0-9]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)));
}

function matchFirst(value, regex) {
  return value.match(regex)?.[1] || '';
}

function countMatches(value, regex) {
  return (value.match(regex) || []).length;
}

function unique(values) {
  return [...new Set(values)];
}

function isQuestionLike(value) {
  return /[?\uFF1F]\s*$/.test(value) || /^(what|why|how|when|where|who|can|does|do|is|are|will|should)\b/i.test(value);
}

function firstChars(value, count) {
  return [...value].slice(0, count).join('');
}

function lastChars(value, count) {
  return [...value].slice(-count).join('');
}

function average(values) {
  const numeric = values.filter((value) => Number.isFinite(value));
  return numeric.length ? numeric.reduce((sum, value) => sum + value, 0) / numeric.length : 0;
}

function roundOne(value) {
  return Math.round(value * 10) / 10;
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
