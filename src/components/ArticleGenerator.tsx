import { useMemo, useState } from 'react';
import {
  BrandProfile,
  BrandProfileId,
  brandProfiles,
  getBrandProfile
} from '../config/brandProfiles';

const articleLengths = [
  { value: 'short', label: 'Short (800-1200 words)' },
  { value: 'medium', label: 'Medium (1500-2500 words)' },
  { value: 'long', label: 'Long (2500-4000 words)' }
];

const outputFormats = [
  { value: 'shopify-html', label: 'Shopify-ready HTML' },
  { value: 'full-package', label: 'Full blog package + HTML' }
];

interface GeneratorForm extends BrandProfile {
  productName: string;
  productDetails: string;
  targetKeyword: string;
  targetAudience: string;
  competitorReferenceNotes: string;
  articleLength: string;
  outputFormat: string;
  additionalInstructions: string;
}

const initialProfile = getBrandProfile('nanolab');

const createFormFromProfile = (profile: BrandProfile): GeneratorForm => ({
  ...profile,
  productName: '',
  productDetails: '',
  targetKeyword: profile.defaultKeywords.split('\n').find(Boolean) || '',
  targetAudience: profile.targetCustomers,
  competitorReferenceNotes: '',
  articleLength: 'medium',
  outputFormat: 'full-package',
  additionalInstructions: ''
});

const cleanModelOutput = (content: string) =>
  content
    .replace(/```html/gi, '')
    .replace(/```/g, '')
    .trim();

const extractHtmlArticle = (content: string) => {
  const cleaned = cleanModelOutput(content);
  const match = cleaned.match(/HTML article:\s*([\s\S]*?)(?:\n\s*FAQ:|$)/i);
  return (match?.[1] || cleaned).trim();
};

const buildPrompt = (form: GeneratorForm) => `
You are a professional English blog writer for ecommerce and B2B websites.

Write a useful, SEO-friendly English blog article based only on the selected brand profile and user inputs below.

BRAND PROFILE
Brand name: ${form.brandName}
Website: ${form.website || 'Not provided'}
Industry: ${form.industry}
Target customers:
${form.targetCustomers}

Product categories:
${form.productCategories}

Brand advantages:
${form.brandAdvantages}

Writing style:
${form.writingStyle}

Internal link notes:
${form.internalLinkNotes || 'Suggest natural internal link opportunities only when relevant.'}

Forbidden claims:
${form.forbiddenClaims}

ARTICLE INPUTS
Product name: ${form.productName || 'Not specified'}
Product details:
${form.productDetails || 'Not specified'}

Target keyword: ${form.targetKeyword}
Target audience:
${form.targetAudience}

Competitor reference notes:
${form.competitorReferenceNotes || 'No competitor notes provided.'}

Article length: ${articleLengths.find((item) => item.value === form.articleLength)?.label}
Output format: ${outputFormats.find((item) => item.value === form.outputFormat)?.label}
Additional instructions:
${form.additionalInstructions || 'None'}

STRICT BRAND SEPARATION RULES
- Use only the currently selected brand profile.
- Do not include content from any other brand profile.
- If the selected brand is MrFairing, do not mention laboratory supplies, Nanolab, sterilization pouches, biohazard bags, silicone tubing, centrifuge bottles, or lab goggles.
- If the selected brand is Nanolab, do not mention motorcycle fairings, sportbikes, ABS fairing kits, Honda CBR, Yamaha R1, Kawasaki Ninja, Suzuki GSXR, or MrFairing.
- Never mention unrelated legacy cloud computing or model infrastructure topics from other projects.
- Do not invent certifications, guarantees, affiliations, exact delivery times, performance claims, safety claims, or statistics.

REQUIRED OUTPUT
Return the answer in this exact order:

Blog title:
[A natural blog title]

SEO title:
[SEO title under 60 characters if possible]

Meta description:
[Meta description around 140-160 characters]

URL slug:
[lowercase-url-slug]

Blog tags:
[comma-separated tags]

Image alt text:
[descriptive image alt text]

Full blog article:
[Plain English article text, with clear section headings]

HTML article:
[Shopify-ready HTML only. Use h2, h3, p, ul, ol, table where useful. Do not include h1 inside the HTML article. Do not include scripts or unsafe markup.]

FAQ:
[5 useful FAQ items with concise answers]

HTML REQUIREMENTS
- The HTML article must be suitable for copying into a Shopify blog content editor.
- Use clean semantic HTML with h2, h3, p, ul, ol, and table when useful.
- Keep the tone professional and natural, not hard advertising.
- Naturally mention the selected brand only where relevant.
- Make the content match the selected website industry and the target keyword.
- Include practical buyer guidance, comparison points, and decision criteria where appropriate.
`;

export function ArticleGenerator() {
  const [selectedProfileId, setSelectedProfileId] = useState<BrandProfileId>('nanolab');
  const [form, setForm] = useState<GeneratorForm>(() => createFormFromProfile(initialProfile));
  const [generatedPackage, setGeneratedPackage] = useState('');
  const [htmlArticle, setHtmlArticle] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const defaultKeywords = useMemo(
    () => form.defaultKeywords.split('\n').filter(Boolean),
    [form.defaultKeywords]
  );

  const updateField = (field: keyof GeneratorForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleProfileChange = (value: BrandProfileId) => {
    const profile = getBrandProfile(value);
    setSelectedProfileId(value);
    setForm(createFormFromProfile(profile));
    setGeneratedPackage('');
    setHtmlArticle('');
    setStatusMessage('');
  };

  const generateArticle = async () => {
    if (!form.brandName.trim()) {
      setStatusMessage('Please enter a brand name.');
      return;
    }

    if (!form.industry.trim()) {
      setStatusMessage('Please enter an industry.');
      return;
    }

    if (!form.targetKeyword.trim()) {
      setStatusMessage('Please enter a target keyword.');
      return;
    }

    setIsGenerating(true);
    setStatusMessage('Generating article...');

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: buildPrompt(form) })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || 'Article generation failed.');
      }

      const cleanedOutput = cleanModelOutput(data.content);
      setGeneratedPackage(cleanedOutput);
      setHtmlArticle(extractHtmlArticle(cleanedOutput));
      setStatusMessage('Article generated successfully.');
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Article generation failed.');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async () => {
    if (!htmlArticle) return;
    await navigator.clipboard.writeText(htmlArticle);
    setStatusMessage('HTML article copied to clipboard.');
  };

  return (
    <div className="generator">
      <section className="page-header">
        <div>
          <p className="eyebrow">Local multi-brand writing tool</p>
          <h1>AI Blog Generator</h1>
          <p className="lede">
            Generate English blog articles for different brands, then copy the final HTML into your blog editor.
          </p>
        </div>
      </section>

      <section className="workspace">
        <form className="panel form-panel" onSubmit={(event) => event.preventDefault()}>
          <div className="section-heading">
            <h2>Article Settings</h2>
            <p>Choose a profile, then edit any field before generating.</p>
          </div>

          <label>
            Brand Profile
            <select
              value={selectedProfileId}
              onChange={(event) => handleProfileChange(event.target.value as BrandProfileId)}
            >
              {brandProfiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.label}
                </option>
              ))}
            </select>
          </label>

          <div className="field-grid">
            <label>
              Brand name
              <input value={form.brandName} onChange={(event) => updateField('brandName', event.target.value)} />
            </label>

            <label>
              Website
              <input value={form.website} onChange={(event) => updateField('website', event.target.value)} />
            </label>
          </div>

          <label>
            Industry
            <textarea value={form.industry} onChange={(event) => updateField('industry', event.target.value)} />
          </label>

          <div className="field-grid">
            <label>
              Product name
              <input
                value={form.productName}
                onChange={(event) => updateField('productName', event.target.value)}
                placeholder="Optional product or category name"
              />
            </label>

            <label>
              Target keyword
              <input
                value={form.targetKeyword}
                onChange={(event) => updateField('targetKeyword', event.target.value)}
                list="keyword-suggestions"
              />
              <datalist id="keyword-suggestions">
                {defaultKeywords.map((keyword) => (
                  <option key={keyword} value={keyword} />
                ))}
              </datalist>
            </label>
          </div>

          <label>
            Product details
            <textarea
              value={form.productDetails}
              onChange={(event) => updateField('productDetails', event.target.value)}
              placeholder="Add product materials, models, use cases, specs, limitations, or page notes."
            />
          </label>

          <label>
            Target audience
            <textarea
              value={form.targetAudience}
              onChange={(event) => updateField('targetAudience', event.target.value)}
            />
          </label>

          <label>
            Product categories
            <textarea
              value={form.productCategories}
              onChange={(event) => updateField('productCategories', event.target.value)}
            />
          </label>

          <label>
            Brand advantages
            <textarea
              value={form.brandAdvantages}
              onChange={(event) => updateField('brandAdvantages', event.target.value)}
            />
          </label>

          <label>
            Writing style
            <textarea value={form.writingStyle} onChange={(event) => updateField('writingStyle', event.target.value)} />
          </label>

          <label>
            Forbidden claims
            <textarea
              value={form.forbiddenClaims}
              onChange={(event) => updateField('forbiddenClaims', event.target.value)}
            />
          </label>

          <label>
            Default keywords
            <textarea
              value={form.defaultKeywords}
              onChange={(event) => updateField('defaultKeywords', event.target.value)}
            />
          </label>

          <label>
            Competitor reference notes
            <textarea
              value={form.competitorReferenceNotes}
              onChange={(event) => updateField('competitorReferenceNotes', event.target.value)}
              placeholder="Optional comparison notes. Do not paste copyrighted competitor text."
            />
          </label>

          <div className="field-grid">
            <label>
              Article length
              <select value={form.articleLength} onChange={(event) => updateField('articleLength', event.target.value)}>
                {articleLengths.map((length) => (
                  <option key={length.value} value={length.value}>
                    {length.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Output format
              <select value={form.outputFormat} onChange={(event) => updateField('outputFormat', event.target.value)}>
                {outputFormats.map((format) => (
                  <option key={format.value} value={format.value}>
                    {format.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label>
            Additional instructions
            <textarea
              value={form.additionalInstructions}
              onChange={(event) => updateField('additionalInstructions', event.target.value)}
              placeholder="Optional tone, structure, product page, or internal linking notes."
            />
          </label>

          <div className="actions">
            <button type="button" className="primary-button" onClick={generateArticle} disabled={isGenerating}>
              {isGenerating ? 'Generating...' : 'Generate Article'}
            </button>
            {htmlArticle && (
              <button type="button" className="secondary-button" onClick={copyToClipboard}>
                Copy HTML
              </button>
            )}
          </div>

          {statusMessage && <p className="status">{statusMessage}</p>}
        </form>

        <section className="panel output-panel">
          <div className="section-heading">
            <h2>Article Preview</h2>
            <p>Review the generated content and edit the source if needed.</p>
          </div>

          {htmlArticle ? (
            <div className="result-tabs">
              <article className="article-preview" dangerouslySetInnerHTML={{ __html: htmlArticle }} />
              <label className="source-label">
                HTML Source
                <textarea
                  className="source-editor"
                  value={htmlArticle}
                  onChange={(event) => setHtmlArticle(event.target.value)}
                />
              </label>
              <label className="source-label">
                Full Generated Result
                <textarea className="package-editor" value={generatedPackage} readOnly />
              </label>
            </div>
          ) : (
            <div className="empty-state">
              <h3>No article yet</h3>
              <p>Select a brand profile, enter a target keyword, and generate a blog article.</p>
            </div>
          )}
        </section>
      </section>
    </div>
  );
}
