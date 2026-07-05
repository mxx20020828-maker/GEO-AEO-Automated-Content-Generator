export type BrandProfileId = 'nanolab' | 'mrfairing' | 'custom';

export interface BrandProfile {
  id: BrandProfileId;
  label: string;
  brandName: string;
  website: string;
  industry: string;
  targetAudience: string;
  productCategories: string;
  brandAdvantages: string;
  writingStyle: string;
  forbiddenClaims: string;
  recommendedLanguage: string;
  defaultKeywords: string;
  internalLinks: string;
  competitorNotes: string;
}

export const brandProfiles: BrandProfile[] = [
  {
    id: 'nanolab',
    label: 'Nanolab',
    brandName: 'Nanolab',
    website: 'https://www.nanolab9.com',
    industry: 'laboratory consumables, sterilization supplies, lab safety, sample handling, laboratory procurement',
    targetAudience:
      'Laboratory procurement teams\nResearch laboratories\nBiotech companies\nUniversity labs\nMedical and dental clinics\nIndustrial laboratories\nLab managers\nPurchasing managers',
    productCategories:
      'Autoclavable biohazard bags\nSterilization pouches\nSilicone tubing\nVented caps and breathable caps\nCentrifuge bottles\nLab safety consumables\nSample handling supplies',
    brandAdvantages:
      'Practical laboratory consumables for procurement teams\nUseful product information for lab buyers\nProduct categories aligned with sterilization, sample handling, and lab safety workflows',
    writingStyle:
      'Professional B2B laboratory procurement style\nClear, practical, and SEO-friendly\nInstructional but not overly technical\nCautious compliance language\nNo hard advertising',
    forbiddenClaims:
      'Do not claim guaranteed sterility.\nDo not invent certifications.\nDo not claim universal compatibility.\nDo not provide universal sterilization cycle parameters.\nDo not claim chemical indicators prove successful sterilization by themselves.\nDo not make unverified safety or compliance claims.\nDo not claim products meet FDA, CE, ISO, USP, ASTM, or EN standards unless proof is provided.\nDo not use hard advertising language.',
    recommendedLanguage:
      'when compatible\naccording to product instructions\ndepending on facility SOPs\nmay be suitable for\ndesigned for routine laboratory use\nprocurement teams can evaluate\nusers should verify compatibility',
    defaultKeywords:
      'autoclavable biohazard bags\nsterilization pouches\nlaboratory silicone tubing\nvented caps for lab bottles\ncentrifuge bottles\nlab safety consumables',
    internalLinks:
      'Suggest relevant Nanolab product category or collection links when the user provides URLs.',
    competitorNotes:
      'Use a cautious procurement-guide angle. Do not copy competitor wording or invent standards.'
  },
  {
    id: 'mrfairing',
    label: 'MrFairing',
    brandName: 'MrFairing',
    website: 'https://www.mrfairing.com',
    industry: 'aftermarket motorcycle fairing kits, sportbike fairings, motorcycle bodywork replacement, motorcycle customization',
    targetAudience:
      'Sportbike owners\nMotorcycle riders replacing damaged fairings\nRiders customizing motorcycle appearance\nDIY motorcycle repair users\nAftermarket fairing buyers\nHonda, Yamaha, Suzuki, Kawasaki, Ducati, BMW, Triumph sportbike owners',
    productCategories:
      'Aftermarket motorcycle fairing kits\nABS plastic fairings\nPainted fairing kits\nReplacement fairings\nCustom motorcycle fairings\nBrand/model/year-specific fairing kits',
    brandAdvantages:
      'Aftermarket fairing kits for popular sportbike brands\nModel- and year-specific shopping paths\nCustom look options\nHelpful buyer guidance for replacement bodywork',
    writingStyle:
      'English\nPractical motorcycle buyer guide style\nHelpful, rider-friendly, SEO-focused\nClear but not too technical\nAvoid exaggerated claims\nAvoid fake OEM wording',
    forbiddenClaims:
      'Do not claim OEM if product is aftermarket.\nDo not claim perfect fitment for every bike.\nDo not claim professional installation is unnecessary for every rider.\nDo not claim exact installation time unless framed as an estimate.\nDo not claim paint color will perfectly match the original motorcycle.\nDo not claim universal compatibility.\nDo not invent warranty, shipping, or certification details.\nDo not mention official Honda/Yamaha/Suzuki/Kawasaki/Ducati/BMW/Triumph affiliation.\nDo not use unsafe riding or repair advice.',
    recommendedLanguage:
      'aftermarket fairing kit\nmodel- and year-specific\ndesigned for compatible sportbike models\nprofessional installation may be recommended\nfitment should be checked before installation\npainted fairing kit\nreplacement bodywork\ncustom look',
    defaultKeywords:
      'aftermarket motorcycle fairings\nmotorcycle fairing kit\nOEM vs aftermarket fairings\npainted motorcycle fairings\nABS motorcycle fairings\nmotorcycle fairing replacement cost\ncustom motorcycle fairing kit',
    internalLinks:
      'Suggest model, brand, year, fairing kit, and custom fairing internal link opportunities when the user provides URLs.',
    competitorNotes:
      'Use a practical rider buyer-guide angle. Do not imply official manufacturer affiliation.'
  },
  {
    id: 'custom',
    label: 'Custom Brand',
    brandName: 'Custom Brand',
    website: '',
    industry: '',
    targetAudience: '',
    productCategories: '',
    brandAdvantages: '',
    writingStyle: 'English\nProfessional, natural, practical, and SEO-friendly\nNo hard advertising',
    forbiddenClaims: 'Do not invent facts, certifications, statistics, guarantees, delivery times, or official affiliations.',
    recommendedLanguage: 'Use cautious, accurate, brand-appropriate wording.',
    defaultKeywords: '',
    internalLinks: '',
    competitorNotes: ''
  }
];

export const getBrandProfile = (id: BrandProfileId) =>
  brandProfiles.find((profile) => profile.id === id) || brandProfiles[0];
