# AITSEO-like Multi-Agent Blog Generator 产品需求文档

## 1. 项目目标

开发一个本地使用的 AITSEO-like Multi-Agent AI Blog Generator，用于生成接近 AITSEO 风格的长篇英文 SEO 博客文章。

这个工具不是简单的“输入关键词 → 一个模型一次性生成文章”，而是按多个 Agent 分阶段生成：

```text
主题理解
↓
搜索意图分析
↓
SEO Brief
↓
大纲规划
↓
正文撰写
↓
表格 / 数据模块
↓
FAQ / AEO / GEO 模块
↓
SEO 元信息
↓
图片 Alt / Banner Prompt
↓
HTML 格式化
↓
质量检查
↓
最终输出

目标是生成适合 Nanolab、MrFairing 和 Custom Brand 使用的英文 SEO 博客文章，最终可复制到 Shopify 博客后台。

2. 参考 AITSEO 文章结构标准

根据已分析的 AITSEO 样本文章，目标文章应接近以下标准：

正文长度：2500–4500 英文词为主
H2 数量：8–14 个
H3 数量：10–25 个
表格数量：2–5 个
FAQ 数量：5–8 个问题
图片建议：4–6 张
结构：标题 + intro + 多个 H2/H3 + 表格 + FAQ + conclusion
SEO：SEO title、meta description、slug、tags、image alt text
HTML：Shopify-ready HTML

文章类型应支持：

How to...
What is...
X vs Y
The Real Cost of...
Complete Guide
Buyer Guide
Top 7 / 10 / 12...
Explained
With Data
With Checklist
3. 核心功能需求
3.1 Brand Profile 选择

页面顶部提供品牌选择：

Nanolab
MrFairing
Custom Brand

选择品牌后自动填充：

Brand name
Website
Industry
Target audience
Product categories
Brand advantages
Writing style
Forbidden claims
Default keywords
Internal link candidates
Competitor notes
3.2 用户输入字段

页面需要包含以下输入：

Brand Profile
Brand name
Website
Industry
Product name
Product details
Target keyword
Secondary keywords
Search intent
Target audience
Competitor reference URLs
Competitor reference notes
Internal links
External reference links
Article title
Article length
Output format
Additional instructions

核心必填项：

Target keyword
Product details
Article title
Additional instructions
3.3 模型设置

支持每个 Agent 单独选择 OpenRouter 模型。

页面中增加一个 AI Model Settings 区域：

Topic / Intent Agent
SEO Brief Agent
Outline Agent
Research Notes Agent
Table / Data Module Agent
Writer Agent
Rewrite Agent
FAQ / AEO / GEO Agent
SEO Metadata Agent
Internal / External Link Agent
Image / Alt Text Agent
HTML Formatter Agent
Quality Checker Agent

每个 Agent 可以选择模型，例如：

x-ai/grok-4.3
deepseek/deepseek-chat
qwen/qwen-2.5-72b-instruct
meta-llama/llama-3.1-405b-instruct

默认模型建议：

OPENROUTER_MODEL=x-ai/grok-4.3

API Key 必须放在 .env，不能写在前端代码中。

4. Multi-Agent 工作流程
Agent 1：Topic & Search Intent Agent
作用

判断文章主题属于哪种搜索意图：

Informational
Commercial investigation
Comparison
How-to guide
Buyer guide
Cost guide
Troubleshooting
Product education
输入
Brand profile
Target keyword
Article title
Product details
Target audience
Competitor notes
输出
{
  "primaryIntent": "",
  "secondaryIntent": "",
  "readerProblems": [],
  "readerQuestions": [],
  "buyingStage": "",
  "contentAngle": "",
  "riskNotes": []
}
Prompt
You are the Topic and Search Intent Agent for an SEO blog generator.

Analyze the target keyword, article title, brand profile, product details, and target audience.

Return:
1. Primary search intent
2. Secondary search intent
3. Reader problems
4. Reader questions
5. Buying stage
6. Best content angle
7. Risk notes or claims to avoid

Brand profile:
{{brandProfile}}

Target keyword:
{{targetKeyword}}

Article title:
{{articleTitle}}

Product details:
{{productDetails}}

Target audience:
{{targetAudience}}

Competitor notes:
{{competitorNotes}}

Rules:
- Do not write the article.
- Do not invent unsupported product claims.
- Be specific to the brand and industry.
- Output structured JSON only.
Agent 2：SEO Brief Agent
作用

生成文章写作简报，包括关键词、内容范围、标题方向、需要覆盖的问题。

输出
{
  "primaryKeyword": "",
  "secondaryKeywords": [],
  "semanticKeywords": [],
  "suggestedTitle": "",
  "contentGoals": [],
  "mustCoverSections": [],
  "questionsToAnswer": [],
  "tablesNeeded": [],
  "faqNeeded": true,
  "recommendedWordCount": 3500
}
Prompt
You are the SEO Brief Agent.

Create a detailed SEO content brief for a long-form blog article.

Use the search intent analysis and brand profile to define:
- Primary keyword
- Secondary keywords
- Semantic keywords
- Search intent
- Reader questions
- Required sections
- Recommended table topics
- Recommended FAQ topics
- Recommended word count

Target keyword:
{{targetKeyword}}

Article title:
{{articleTitle}}

Search intent analysis:
{{intentAnalysis}}

Brand profile:
{{brandProfile}}

Rules:
- The brief should support a 2500–4500 word article.
- Include commercial and informational angles when relevant.
- Do not copy competitor wording.
- Do not make unsupported claims.
- Output structured JSON only.
Agent 3：Outline Agent
作用

生成完整 H2/H3 大纲。

标准
H2：8–14 个
H3：10–25 个
必须包含 FAQ
必须包含 Conclusion
根据主题决定是否加入表格
输出
{
  "h1": "",
  "introGoal": "",
  "outline": [
    {
      "h2": "",
      "purpose": "",
      "h3": []
    }
  ],
  "tables": [],
  "faqQuestions": [],
  "conclusionGoal": ""
}
Prompt
You are the Outline Agent.

Create a detailed long-form SEO article outline based on the SEO brief.

Requirements:
- Use 8–14 H2 sections.
- Use H3 subsections where useful.
- Include at least 2–4 table ideas when the topic benefits from comparison, checklist, cost, specifications, risks, or buyer decisions.
- Include 5–8 FAQ questions.
- Include a conclusion.
- The structure should support a 2500–4500 word article.
- Do not write full paragraphs yet.

SEO brief:
{{seoBrief}}

Brand profile:
{{brandProfile}}

Rules:
- Use practical, search-friendly headings.
- Avoid repetitive headings.
- Avoid hard advertising.
- Use cautious wording for regulated or technical topics.
- Output structured JSON only.
Agent 4：Research / Reference Notes Agent
作用

整理用户提供的竞对资料、外链资料、产品资料。
如果工具未来支持联网，可抓取 SERP 或 URL；如果不支持，就只使用用户粘贴的资料。

输出
{
  "usableFacts": [],
  "competitorAngles": [],
  "externalReferenceSuggestions": [],
  "doNotUse": [],
  "factGaps": []
}
Prompt
You are the Research Notes Agent.

Review the provided product details, competitor reference notes, and external reference notes.

Extract only usable, non-copyrighted insights:
- Common topic angles
- Important factual points
- Buyer concerns
- Comparison dimensions
- Risk or compliance notes
- External reference suggestions

Inputs:
{{productDetails}}
{{competitorNotes}}
{{externalReferences}}

Rules:
- Do not copy competitor text.
- Do not invent facts.
- If data is missing, mark it as a fact gap.
- Output structured JSON only.
Agent 5：Table / Data Module Agent
作用

生成文章中的表格模块。

表格类型
Comparison table
Checklist table
Cost factors table
Specification table
Pros and cons table
Mistakes table
Buyer decision table
Steam vs EO table
OEM vs aftermarket table
输出
{
  "tables": [
    {
      "title": "",
      "purpose": "",
      "columns": [],
      "rows": []
    }
  ]
}
Prompt
You are the Table and Data Module Agent.

Create practical tables for the article based on the outline and SEO brief.

Article outline:
{{outline}}

SEO brief:
{{seoBrief}}

Brand profile:
{{brandProfile}}

Rules:
- Create 2–5 useful tables.
- Tables must help the reader compare, choose, calculate, or avoid mistakes.
- Do not invent exact technical specifications unless provided.
- Do not invent prices unless clearly framed as estimates or factors.
- Use cautious wording when data is not verified.
- Output structured JSON only.
Agent 6：Writer Agent
作用

撰写完整正文。

标准
2500–4500 英文词
专业但容易读
自然植入品牌
包含表格位置
包含 FAQ 位置
不生成最终 HTML，先生成 Markdown 或结构化正文
Prompt
You are the Writer Agent.

Write a complete long-form SEO blog article based on the outline, SEO brief, research notes, and table modules.

Article title:
{{articleTitle}}

SEO brief:
{{seoBrief}}

Outline:
{{outline}}

Research notes:
{{researchNotes}}

Tables:
{{tables}}

Brand profile:
{{brandProfile}}

Requirements:
- Write in English.
- Target length: {{targetWordCount}} words.
- Use a professional, practical, buyer-friendly tone.
- Use H2 and H3 headings.
- Include the provided table content in the right sections.
- Mention the brand naturally, not as hard advertising.
- Add practical examples, decision guidance, buyer considerations, and common mistakes.
- Do not invent certifications, performance guarantees, test results, or exact specifications unless supplied.
- Do not copy competitor wording.

Return the full article in Markdown format.
Agent 7：Rewrite / Humanize Agent
作用

改写正文，让文章减少 AI 感，增强专业度和自然度。

改写要求
减少重复句型
减少模板感
增强自然过渡
减少硬广
让段落更像人工写作
保留 SEO 结构
保留关键词
Prompt
You are the Rewrite and Humanization Agent.

Rewrite the article to make it more natural, professional, and less AI-like.

Original article:
{{draftArticle}}

Brand profile:
{{brandProfile}}

Rules:
- Preserve all factual meaning.
- Preserve headings and SEO structure.
- Reduce repetitive phrasing.
- Improve transitions.
- Remove hard advertising tone.
- Keep brand mentions natural.
- Do not add unsupported claims.
- Do not shorten the article too much.
- Maintain a professional B2B tone.

Return the improved article in Markdown format.
Agent 8：FAQ / AEO / GEO Agent
作用

生成适合 Google、AI Search、GEO/AEO 的 FAQ。

输出
{
  "faq": [
    {
      "question": "",
      "answer": ""
    }
  ],
  "peopleAlsoAskStyleQuestions": [],
  "aiOverviewFriendlySummary": ""
}
Prompt
You are the FAQ, AEO, and GEO Agent.

Create FAQ content that helps the article answer search engine and AI search questions clearly.

Article:
{{rewrittenArticle}}

SEO brief:
{{seoBrief}}

Brand profile:
{{brandProfile}}

Requirements:
- Generate 5–8 FAQ questions.
- Answers should be concise but useful.
- Use direct answers first, then brief explanation.
- Include buyer-oriented and practical questions.
- Avoid unsupported claims.
- Avoid legal, medical, or compliance guarantees.
- Output structured JSON only.
Agent 9：SEO Metadata Agent
作用

生成 SEO Title、Meta Description、URL Slug、Tags、Excerpt。

输出
{
  "seoTitle": "",
  "metaDescription": "",
  "urlSlug": "",
  "blogTags": [],
  "excerpt": "",
  "focusKeyword": "",
  "secondaryKeywords": []
}
Prompt
You are the SEO Metadata Agent.

Create SEO metadata for this blog article.

Article title:
{{articleTitle}}

Article:
{{rewrittenArticle}}

SEO brief:
{{seoBrief}}

Brand profile:
{{brandProfile}}

Requirements:
- SEO title should be compelling and keyword-focused.
- Meta description should be 140–160 characters when possible.
- URL slug should be lowercase, hyphenated, and concise.
- Blog tags should be practical and relevant.
- Excerpt should summarize the article for blog listing pages.
- Do not use clickbait.
- Do not make unsupported claims.

Return structured JSON only.
Agent 10：Internal / External Link Agent
作用

规划站内链接和外部参考链接。

输出
{
  "internalLinks": [
    {
      "anchorText": "",
      "url": "",
      "placement": ""
    }
  ],
  "externalLinks": [
    {
      "anchorText": "",
      "url": "",
      "reason": ""
    }
  ],
  "linkingWarnings": []
}
Prompt
You are the Internal and External Link Agent.

Suggest natural internal and external links for the article.

Article:
{{rewrittenArticle}}

Available internal links:
{{internalLinks}}

External reference candidates:
{{externalReferences}}

Brand profile:
{{brandProfile}}

Rules:
- Internal links should be relevant to the article topic.
- External links should support factual, technical, safety, regulatory, or educational claims.
- Do not over-link.
- Do not link to direct competitors unless the user requests competitor references.
- Anchor text should be natural.
- Output structured JSON only.
Agent 11：Image / Alt Text Agent
作用

生成图片建议、Banner Prompt、Alt Text。

输出
{
  "featuredImagePrompt": "",
  "featuredImageAltText": "",
  "inArticleImages": [
    {
      "placement": "",
      "imageIdea": "",
      "altText": ""
    }
  ]
}
Prompt
You are the Image and Alt Text Agent.

Create image ideas and SEO-friendly alt text for this blog article.

Article:
{{rewrittenArticle}}

Brand profile:
{{brandProfile}}

Requirements:
- Generate one featured image prompt.
- Generate 4–6 in-article image ideas.
- Alt text should be descriptive, natural, and include relevant terms only when appropriate.
- Do not stuff keywords.
- Do not include text overlays unless requested.
- For Shopify blogs, featured image should work as a clean 16:9 blog banner.

Return structured JSON only.
Agent 12：HTML Formatter Agent
作用

把最终文章转成 Shopify-ready HTML。

HTML 标准
不包含 <html>、<head>、<body>
正文从 <p> 或 <h2> 开始
使用 h2 / h3 / p / ul / ol / table / blockquote
FAQ 用 h2 + h3 + p
表格使用标准 table / thead / tbody / tr / th / td
不要 inline 复杂 CSS
不要输出 Markdown
Prompt
You are the HTML Formatter Agent.

Convert the final article into Shopify-ready HTML.

Inputs:
Article:
{{rewrittenArticle}}

Tables:
{{tables}}

FAQ:
{{faq}}

Links:
{{links}}

Image suggestions:
{{imageSuggestions}}

Rules:
- Do not include html, head, or body tags.
- Do not include the blog title as H1. Shopify will use the title separately.
- Use H2 for main sections.
- Use H3 for subsections.
- Use p, ul, ol, table, thead, tbody, tr, th, td.
- Insert tables in the correct sections.
- Insert FAQ near the end.
- Keep HTML clean and easy to paste into Shopify.
- Do not add unsupported claims.
- Return only HTML.
Agent 13：Quality Checker Agent
作用

检查文章是否符合要求。

检查项目
字数
H2 数量
H3 数量
表格数量
FAQ 数量
品牌植入是否自然
是否有硬广
是否有违规/绝对化表述
是否缺少 SEO Title / Meta / Slug / Tags
HTML 是否干净
是否适合 Shopify
输出
{
  "score": 0,
  "passed": true,
  "issues": [],
  "requiredFixes": [],
  "optionalImprovements": []
}
Prompt
You are the Quality Checker Agent.

Review the generated blog package.

Check:
- Word count
- H2 count
- H3 count
- Table count
- FAQ count
- SEO title
- Meta description
- URL slug
- Blog tags
- HTML cleanliness
- Brand mention quality
- Unsupported claims
- Hard advertising tone
- Missing safety or compliance disclaimers
- Keyword stuffing
- Repetitive AI-like writing

Brand profile:
{{brandProfile}}

Blog package:
{{blogPackage}}

Rules:
- Be strict.
- If the article is too short, mark it as failed.
- If HTML includes head/body/html tags, mark it as failed.
- If unsupported claims appear, mark them clearly.
- Output structured JSON only.
5. Nanolab 使用规则
5.1 品牌定位
Brand name: Nanolab
Website: https://www.nanolab9.com
Industry: laboratory consumables, sterilization supplies, lab safety, sample handling, laboratory procurement
5.2 目标读者
Laboratory procurement teams
Research laboratories
Biotech companies
University labs
Medical and dental clinics
Industrial laboratories
Lab managers
Purchasing managers
5.3 产品方向
Autoclavable biohazard bags
Sterilization pouches
Silicone tubing
Vented caps and breathable caps
Centrifuge bottles
Lab safety consumables
Sample handling supplies
5.4 写作风格
Professional B2B laboratory procurement style
Clear, practical, and SEO-friendly
Instructional but not overly technical
Cautious compliance language
No hard advertising
5.5 禁止声明

Nanolab 文章必须避免：

Do not claim guaranteed sterility.
Do not invent certifications.
Do not claim universal compatibility.
Do not provide universal sterilization cycle parameters.
Do not claim chemical indicators prove successful sterilization by themselves.
Do not make unverified safety or compliance claims.
Do not claim products meet FDA, CE, ISO, USP, ASTM, or EN standards unless user provides proof.
Do not use hard advertising language.
5.6 推荐用语
when compatible
according to product instructions
depending on facility SOPs
may be suitable for
designed for routine laboratory use
procurement teams can evaluate
users should verify compatibility
5.7 Nanolab 文章常见结构

适合 Nanolab 的文章结构：

Introduction
What is [product/category]?
How it works
Common use cases
Key specifications to compare
How to choose
Common mistakes
Safety / handling / storage reminders
Buyer checklist
FAQ
Conclusion
6. MrFairing 使用规则
6.1 品牌定位
Brand name: MrFairing
Website: https://www.mrfairing.com
Industry: aftermarket motorcycle fairing kits, sportbike fairings, motorcycle bodywork replacement, motorcycle customization
6.2 目标读者
Sportbike owners
Motorcycle riders replacing damaged fairings
Riders customizing motorcycle appearance
DIY motorcycle repair users
Aftermarket fairing buyers
Honda, Yamaha, Suzuki, Kawasaki, Ducati, BMW, Triumph sportbike owners
6.3 产品方向
Aftermarket motorcycle fairing kits
ABS plastic fairings
Painted fairing kits
Replacement fairings
Custom motorcycle fairings
Brand/model/year-specific fairing kits
6.4 写作风格
English
Practical motorcycle buyer guide style
Helpful, rider-friendly, SEO-focused
Clear but not too technical
Avoid exaggerated claims
Avoid fake OEM wording
6.5 禁止声明

MrFairing 文章必须避免：

Do not claim OEM if product is aftermarket.
Do not claim perfect fitment for every bike.
Do not claim professional installation is unnecessary for every rider.
Do not claim exact installation time unless framed as an estimate.
Do not claim paint color will perfectly match the original motorcycle.
Do not claim universal compatibility.
Do not invent warranty, shipping, or certification details.
Do not mention official Honda/Yamaha/Suzuki/Kawasaki/Ducati/BMW/Triumph affiliation.
Do not use unsafe riding or repair advice.
6.6 推荐用语
aftermarket fairing kit
model- and year-specific
designed for compatible sportbike models
professional installation may be recommended
fitment should be checked before installation
painted fairing kit
replacement bodywork
custom look
6.7 MrFairing 文章常见结构

适合 MrFairing 的文章结构：

Introduction
What are motorcycle fairings?
When should you replace fairings?
OEM vs aftermarket fairings
Cost factors
Material comparison
Fitment and model/year compatibility
Installation considerations
Common buying mistakes
Buyer checklist
FAQ
Conclusion
7. 最终输出格式

生成器最终必须输出一个完整 Blog Package。

7.1 输出字段
{
  "blogTitle": "",
  "seoTitle": "",
  "metaDescription": "",
  "urlSlug": "",
  "blogTags": [],
  "excerpt": "",
  "featuredImagePrompt": "",
  "featuredImageAltText": "",
  "inArticleImageIdeas": [],
  "focusKeyword": "",
  "secondaryKeywords": [],
  "internalLinkSuggestions": [],
  "externalLinkSuggestions": [],
  "fullArticleMarkdown": "",
  "shopifyHtml": "",
  "faq": [],
  "qualityReport": {}
}
7.2 Shopify HTML 输出标准

最终 HTML 不能包含：

<html>
<head>
<body>
<style>
<script>

正文结构示例：

<p>Intro paragraph...</p>

<h2>What Are Self-Sealing Sterilization Pouches?</h2>
<p>...</p>

<h2>Steam vs EO Sterilization: Key Differences</h2>
<table>
  <thead>
    <tr>
      <th>Factor</th>
      <th>Steam Sterilization</th>
      <th>EO Sterilization</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Typical use</td>
      <td>...</td>
      <td>...</td>
    </tr>
  </tbody>
</table>

<h2>FAQ</h2>
<h3>Question?</h3>
<p>Answer...</p>

<h2>Conclusion</h2>
<p>...</p>
8. 页面 UI 需求
8.1 左侧输入区
Brand Profile
Article Title
Target Keyword
Secondary Keywords
Product Name
Product Details
Target Audience
Competitor Notes
Internal Links
External References
Article Length
Output Format
Additional Instructions
8.2 中间 Agent 流程区

显示每个 Agent 状态：

Topic Agent: Pending / Running / Complete / Failed
SEO Brief Agent
Outline Agent
Research Agent
Table Agent
Writer Agent
Rewrite Agent
FAQ Agent
SEO Metadata Agent
Link Agent
Image Agent
HTML Formatter Agent
Quality Checker Agent

每一步生成后都可以：

View
Edit
Regenerate
Approve
8.3 右侧输出区

Tabs：

Preview
HTML Source
SEO Package
FAQ
Image Ideas
Quality Report
Agent Logs

按钮：

Generate Full Article
Run Next Agent
Regenerate Current Agent
Copy HTML
Copy SEO Package
Export Markdown
Export JSON
9. 开发 MVP 范围

第一版先实现：

Brand Profile: Nanolab / MrFairing / Custom Brand
OpenRouter API
Agent-by-agent workflow
每个 Agent 的 prompt 可编辑
支持一键 Run All
支持单步 Regenerate
输出 Shopify HTML
输出 SEO package
输出 FAQ
输出 image alt text
输出 quality report

暂时不做：

自动发布 Shopify
自动发布 WordPress
自动抓 SERP
自动下载图片
自动生成图片
用户登录系统
数据库
10. 给 Codex 的开发指令

请基于当前仓库重新开发一个 AITSEO-like Multi-Agent AI Blog Generator。

目标：
做一个本地使用的多 Agent 英文博客生成器，用于 Nanolab、MrFairing 和 Custom Brand。它不是单模型一次性生成，而是分步骤调用 OpenRouter 模型，依次生成 SEO Brief、Outline、正文、改写、FAQ、SEO 元信息、图片 Alt、HTML 和质量检查。

请实现：

10.1 Brand Profiles
Nanolab
MrFairing
Custom Brand
10.2 Agent Workflow
Topic & Search Intent Agent
SEO Brief Agent
Outline Agent
Research Notes Agent
Table / Data Module Agent
Writer Agent
Rewrite / Humanize Agent
FAQ / AEO / GEO Agent
SEO Metadata Agent
Internal / External Link Agent
Image / Alt Text Agent
HTML Formatter Agent
Quality Checker Agent
10.3 每个 Agent 都需要包含
prompt template
input
output
model setting
status
regenerate button
10.4 支持 OpenRouter
API Key 放在 .env
不要写死在前端
使用本地 Node/Express 后端代理
支持每个 Agent 单独配置模型
默认模型 x-ai/grok-4.3
10.5 UI
左侧输入区
中间 Agent 流程区
右侧输出区
输出区包含 Preview、HTML Source、SEO Package、FAQ、Image Ideas、Quality Report、Agent Logs
10.6 最终输出
Blog Title
SEO Title
Meta Description
URL Slug
Blog Tags
Excerpt
Featured Image Prompt
Featured Image Alt Text
In-Article Image Ideas
Full Article Markdown
Shopify-ready HTML
FAQ
Quality Report
10.7 HTML 要求
不包含 html/head/body
不包含 style/script
使用 h2/h3/p/ul/ol/table/thead/tbody/tr/th/td
不把标题作为 H1 输出
适合复制到 Shopify 博客正文
10.8 Brand Rules
Nanolab
专业 B2B 实验室耗材采购风格
避免保证灭菌、虚构认证、通用兼容、绝对安全或合规声明
MrFairing
aftermarket motorcycle fairing kits 风格
避免 OEM、官方品牌关联、完美适配、绝对安装时间、颜色完全一致等声明
10.9 不需要
WordPress 发布
Shopify 发布
自动下载图片
用户登录
数据库

请创建 PR。
