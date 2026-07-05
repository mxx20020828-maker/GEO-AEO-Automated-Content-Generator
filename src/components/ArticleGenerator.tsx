import { useMemo, useState } from 'react';
import { BrandProfile, BrandProfileId, brandProfiles, getBrandProfile } from '../config/brandProfiles';

type AgentStatus = 'pending' | 'running' | 'complete' | 'failed';
type OutputTab = 'preview' | 'html' | 'seo' | 'faq' | 'images' | 'quality' | 'logs';

interface GeneratorForm extends BrandProfile {
  productName: string;
  productDetails: string;
  targetKeyword: string;
  secondaryKeywords: string;
  searchIntent: string;
  competitorReferenceUrls: string;
  competitorReferenceNotes: string;
  externalReferences: string;
  articleTitle: string;
  articleLength: string;
  outputFormat: string;
  additionalInstructions: string;
}

interface AgentRun {
  id: string;
  name: string;
  shortName: string;
  outputKey: string;
  model: string;
  prompt: string;
  status: AgentStatus;
  output: string;
  error?: string;
}

const defaultModel = 'x-ai/grok-4.3';
const modelOptions = ['x-ai/grok-4.3', 'deepseek/deepseek-chat', 'qwen/qwen-2.5-72b-instruct', 'meta-llama/llama-3.1-405b-instruct'];
const articleLengths = ['2500-3000 words', '3000-3500 words', '3500-4500 words'];

const agentSeeds = [
  ['intent', 'Topic & Search Intent Agent', 'Topic', 'intentAnalysis', 'Analyze primary/secondary search intent, reader problems, questions, buying stage, content angle, and risk notes. Return structured JSON only.'],
  ['brief', 'SEO Brief Agent', 'Brief', 'seoBrief', 'Create an SEO brief with primary keyword, secondary and semantic keywords, content goals, required sections, questions, tables, FAQ need, and word count. Return structured JSON only.'],
  ['outline', 'Outline Agent', 'Outline', 'outline', 'Create an H2/H3 outline with 8-14 H2s, useful H3s, 2-5 table ideas, 5-8 FAQs, and a conclusion goal. Return structured JSON only.'],
  ['research', 'Research Notes Agent', 'Research', 'researchNotes', 'Use only provided product details, competitor notes, URLs, and external references. Extract usable facts, angles, references, do-not-use items, and fact gaps. Return JSON only.'],
  ['tables', 'Table / Data Module Agent', 'Tables', 'tables', 'Create 2-5 practical tables for comparison, checklist, cost factors, mistakes, specs, or buying decisions. Do not invent exact specs or prices. Return JSON only.'],
  ['writer', 'Writer Agent', 'Writer', 'draftArticle', 'Write the full long-form English SEO blog article in Markdown using prior outputs. Include headings, tables, practical guidance, and cautious brand mentions.'],
  ['rewrite', 'Rewrite / Humanize Agent', 'Rewrite', 'fullArticleMarkdown', 'Rewrite the draft to sound natural, expert, less AI-like, and less promotional while preserving facts, headings, SEO structure, and keywords. Return Markdown.'],
  ['faq', 'FAQ / AEO / GEO Agent', 'FAQ', 'faq', 'Generate 5-8 useful FAQ items, people-also-ask style questions, and an AI-overview-friendly summary. Return structured JSON only.'],
  ['seo', 'SEO Metadata Agent', 'SEO', 'seoPackage', 'Create SEO title, meta description, URL slug, tags, excerpt, focus keyword, and secondary keywords. Return structured JSON only.'],
  ['links', 'Internal / External Link Agent', 'Links', 'links', 'Suggest natural internal and external links with anchor text and placement. Do not over-link or link to direct competitors unless requested. Return JSON only.'],
  ['images', 'Image / Alt Text Agent', 'Images', 'imageIdeas', 'Create one featured image prompt, featured image alt text, and 4-6 in-article image ideas with natural alt text. Return JSON only.'],
  ['html', 'HTML Formatter Agent', 'HTML', 'shopifyHtml', 'Convert the final article, tables, FAQ, links, and image suggestions into clean Shopify-ready HTML. Do not include html/head/body/style/script/H1. Return only HTML.'],
  ['quality', 'Quality Checker Agent', 'Quality', 'qualityReport', 'Review word count, H2/H3 counts, tables, FAQ, SEO metadata, HTML cleanliness, brand fit, unsupported claims, hard advertising, and Shopify suitability. Return JSON only.']
];

const createAgents = (): AgentRun[] => agentSeeds.map(([id, name, shortName, outputKey, prompt]) => ({
  id, name, shortName, outputKey, prompt, model: defaultModel, status: 'pending', output: ''
}));

const createFormFromProfile = (profile: BrandProfile): GeneratorForm => ({
  ...profile,
  productName: '',
  productDetails: '',
  targetKeyword: profile.defaultKeywords.split('\n').find(Boolean) || '',
  secondaryKeywords: profile.defaultKeywords,
  searchIntent: '',
  competitorReferenceUrls: '',
  competitorReferenceNotes: profile.competitorNotes,
  externalReferences: '',
  articleTitle: '',
  articleLength: '3000-3500 words',
  outputFormat: 'Full Blog Package + Shopify HTML',
  additionalInstructions: ''
});

const parseJsonish = (value: string) => {
  const cleaned = value.replace(/```json/gi, '').replace(/```/g, '').trim();
  const match = cleaned.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  try { return JSON.parse(match?.[0] || cleaned); } catch { return null; }
};

const stringify = (value: unknown) => typeof value === 'string' ? value : JSON.stringify(value, null, 2);
const markdownToPreviewHtml = (markdown: string) => markdown
  .replace(/^### (.*)$/gm, '<h3>$1</h3>')
  .replace(/^## (.*)$/gm, '<h2>$1</h2>')
  .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
  .split(/\n{2,}/)
  .map((block) => /^<h[23]>|^<table|^<ul|^<ol/.test(block) ? block : `<p>${block.replace(/\n/g, '<br />')}</p>`)
  .join('');

export function ArticleGenerator() {
  const [selectedProfileId, setSelectedProfileId] = useState<BrandProfileId>('nanolab');
  const [form, setForm] = useState<GeneratorForm>(() => createFormFromProfile(getBrandProfile('nanolab')));
  const [agents, setAgents] = useState<AgentRun[]>(createAgents);
  const [outputs, setOutputs] = useState<Record<string, string>>({});
  const [logs, setLogs] = useState<string[]>([]);
  const [activeAgentId, setActiveAgentId] = useState('intent');
  const [activeTab, setActiveTab] = useState<OutputTab>('preview');
  const [isRunning, setIsRunning] = useState(false);

  const activeAgent = agents.find((agent) => agent.id === activeAgentId) || agents[0];
  const shopifyHtml = outputs.shopifyHtml || '';
  const previewHtml = shopifyHtml || markdownToPreviewHtml(outputs.fullArticleMarkdown || outputs.draftArticle || '');
  const seoPackage = parseJsonish(outputs.seoPackage || '');
  const faq = parseJsonish(outputs.faq || '');
  const imageIdeas = parseJsonish(outputs.imageIdeas || '');
  const qualityReport = parseJsonish(outputs.qualityReport || '');
  const brandSummary = useMemo(() => JSON.stringify({
    brandName: form.brandName,
    website: form.website,
    industry: form.industry,
    targetAudience: form.targetAudience,
    productCategories: form.productCategories,
    brandAdvantages: form.brandAdvantages,
    writingStyle: form.writingStyle,
    forbiddenClaims: form.forbiddenClaims,
    recommendedLanguage: form.recommendedLanguage,
    internalLinks: form.internalLinks
  }, null, 2), [form]);

  const updateField = (field: keyof GeneratorForm, value: string) => setForm((current) => ({ ...current, [field]: value }));
  const updateAgent = (id: string, changes: Partial<AgentRun>) => setAgents((current) => current.map((agent) => agent.id === id ? { ...agent, ...changes } : agent));
  const log = (message: string) => setLogs((current) => [`${new Date().toLocaleTimeString()} ${message}`, ...current]);

  const switchProfile = (id: BrandProfileId) => {
    setSelectedProfileId(id);
    setForm(createFormFromProfile(getBrandProfile(id)));
    setAgents(createAgents());
    setOutputs({});
    setLogs([]);
  };

  const buildPrompt = (agent: AgentRun, currentOutputs: Record<string, string>) => `
${agent.prompt}

GLOBAL RULES
- Write in English unless structured JSON is requested.
- Follow the brand profile and forbidden claims.
- Do not invent certifications, guarantees, prices, exact specs, affiliations, or compliance claims.
- Do not publish to Shopify, WordPress, or any external system.

BRAND PROFILE
${brandSummary}

USER INPUTS
Article title: ${form.articleTitle}
Target keyword: ${form.targetKeyword}
Secondary keywords: ${form.secondaryKeywords}
Search intent: ${form.searchIntent || 'Infer if blank.'}
Product name: ${form.productName}
Product details: ${form.productDetails}
Target audience: ${form.targetAudience}
Competitor reference URLs: ${form.competitorReferenceUrls}
Competitor notes: ${form.competitorReferenceNotes}
External references: ${form.externalReferences}
Article length: ${form.articleLength}
Output format: ${form.outputFormat}
Additional instructions: ${form.additionalInstructions}

PREVIOUS AGENT OUTPUTS
${JSON.stringify(currentOutputs, null, 2)}
`;

  const runAgent = async (agentId: string, seedOutputs = outputs) => {
    const agent = agents.find((item) => item.id === agentId);
    if (!agent) return seedOutputs;
    updateAgent(agent.id, { status: 'running', error: '' });
    setActiveAgentId(agent.id);
    log(`${agent.name} started`);
    try {
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentName: agent.name, model: agent.model, prompt: buildPrompt(agent, seedOutputs) })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || `${agent.name} failed`);
      const nextOutputs = { ...seedOutputs, [agent.outputKey]: data.content };
      setOutputs(nextOutputs);
      updateAgent(agent.id, { status: 'complete', output: data.content });
      log(`${agent.name} complete`);
      return nextOutputs;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Agent failed';
      updateAgent(agent.id, { status: 'failed', error: message });
      log(`${agent.name} failed: ${message}`);
      throw error;
    }
  };

  const runAll = async () => {
    if (!form.targetKeyword.trim() || !form.productDetails.trim() || !form.articleTitle.trim()) {
      log('Target keyword, product details, and article title are required.');
      return;
    }
    setIsRunning(true);
    let currentOutputs = outputs;
    try {
      for (const agent of agents) currentOutputs = await runAgent(agent.id, currentOutputs);
      setActiveTab('preview');
    } finally {
      setIsRunning(false);
    }
  };

  const regenerateCurrent = async () => {
    setIsRunning(true);
    try { await runAgent(activeAgentId, outputs); } finally { setIsRunning(false); }
  };

  const copyText = async (value: string, label: string) => {
    await navigator.clipboard.writeText(value);
    log(`${label} copied`);
  };

  return (
    <div className="generator">
      <header className="app-header">
        <div><p className="eyebrow">AITSEO-like local MVP</p><h1>Multi-Agent AI Blog Generator</h1></div>
        <div className="header-actions">
          <button type="button" className="primary-button" onClick={runAll} disabled={isRunning}>Run All</button>
          <button type="button" className="secondary-button" onClick={regenerateCurrent} disabled={isRunning}>Regenerate Current Agent</button>
        </div>
      </header>

      <section className="workspace">
        <aside className="panel input-panel">
          <h2>Inputs</h2>
          <label>Brand Profile<select value={selectedProfileId} onChange={(event) => switchProfile(event.target.value as BrandProfileId)}>{brandProfiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.label}</option>)}</select></label>
          <label>Article Title<input value={form.articleTitle} onChange={(event) => updateField('articleTitle', event.target.value)} /></label>
          <label>Target Keyword<input value={form.targetKeyword} onChange={(event) => updateField('targetKeyword', event.target.value)} /></label>
          <label>Secondary Keywords<textarea value={form.secondaryKeywords} onChange={(event) => updateField('secondaryKeywords', event.target.value)} /></label>
          <label>Product Name<input value={form.productName} onChange={(event) => updateField('productName', event.target.value)} /></label>
          <label>Product Details<textarea value={form.productDetails} onChange={(event) => updateField('productDetails', event.target.value)} /></label>
          <label>Target Audience<textarea value={form.targetAudience} onChange={(event) => updateField('targetAudience', event.target.value)} /></label>
          <label>Competitor Reference URLs<textarea value={form.competitorReferenceUrls} onChange={(event) => updateField('competitorReferenceUrls', event.target.value)} /></label>
          <label>Competitor Notes<textarea value={form.competitorReferenceNotes} onChange={(event) => updateField('competitorReferenceNotes', event.target.value)} /></label>
          <label>Internal Links<textarea value={form.internalLinks} onChange={(event) => updateField('internalLinks', event.target.value)} /></label>
          <label>External References<textarea value={form.externalReferences} onChange={(event) => updateField('externalReferences', event.target.value)} /></label>
          <label>Article Length<select value={form.articleLength} onChange={(event) => updateField('articleLength', event.target.value)}>{articleLengths.map((length) => <option key={length}>{length}</option>)}</select></label>
          <label>Additional Instructions<textarea value={form.additionalInstructions} onChange={(event) => updateField('additionalInstructions', event.target.value)} /></label>
        </aside>

        <section className="panel agent-panel">
          <h2>Agent Workflow</h2>
          <div className="agent-list">{agents.map((agent) => <button type="button" key={agent.id} className={`agent-row ${agent.id === activeAgentId ? 'active' : ''}`} onClick={() => setActiveAgentId(agent.id)}><span>{agent.shortName}</span><strong data-status={agent.status}>{agent.status}</strong></button>)}</div>
          <div className="agent-editor">
            <h3>{activeAgent.name}</h3>
            <label>Model<select value={activeAgent.model} onChange={(event) => updateAgent(activeAgent.id, { model: event.target.value })}>{modelOptions.map((model) => <option key={model}>{model}</option>)}</select></label>
            <label>Prompt<textarea value={activeAgent.prompt} onChange={(event) => updateAgent(activeAgent.id, { prompt: event.target.value })} /></label>
            <label>Output<textarea className="agent-output" value={activeAgent.output || activeAgent.error || ''} readOnly /></label>
          </div>
        </section>

        <section className="panel output-panel">
          <h2>Blog Package</h2>
          <nav className="tabs">{(['preview', 'html', 'seo', 'faq', 'images', 'quality', 'logs'] as OutputTab[]).map((tab) => <button key={tab} type="button" className={activeTab === tab ? 'active' : ''} onClick={() => setActiveTab(tab)}>{tab}</button>)}</nav>
          {activeTab === 'preview' && <article className="preview" dangerouslySetInnerHTML={{ __html: previewHtml || '<p>No output yet.</p>' }} />}
          {activeTab === 'html' && <div className="stack"><button type="button" className="secondary-button" onClick={() => copyText(shopifyHtml, 'HTML')}>Copy HTML</button><textarea className="code-box" value={shopifyHtml} readOnly /></div>}
          {activeTab === 'seo' && <div className="stack"><button type="button" className="secondary-button" onClick={() => copyText(stringify(seoPackage || outputs.seoPackage), 'SEO Package')}>Copy SEO Package</button><pre>{stringify(seoPackage || outputs.seoPackage || 'No SEO package yet.')}</pre></div>}
          {activeTab === 'faq' && <pre>{stringify(faq || outputs.faq || 'No FAQ yet.')}</pre>}
          {activeTab === 'images' && <pre>{stringify(imageIdeas || outputs.imageIdeas || 'No image ideas yet.')}</pre>}
          {activeTab === 'quality' && <pre>{stringify(qualityReport || outputs.qualityReport || 'No quality report yet.')}</pre>}
          {activeTab === 'logs' && <div className="stack"><div className="export-actions"><button type="button" className="secondary-button" onClick={() => copyText(outputs.fullArticleMarkdown || outputs.draftArticle || '', 'Markdown')}>Export Markdown</button><button type="button" className="secondary-button" onClick={() => copyText(JSON.stringify({ form, outputs }, null, 2), 'JSON package')}>Export JSON</button></div><pre>{logs.join('\n') || 'No agent logs yet.'}</pre></div>}
        </section>
      </section>
    </div>
  );
}
