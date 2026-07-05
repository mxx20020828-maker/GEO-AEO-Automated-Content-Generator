export type BrandProfileId = 'nanolab' | 'mrfairing' | 'custom';

export interface BrandProfile {
  id: BrandProfileId;
  label: string;
  brandName: string;
  website: string;
  industry: string;
  targetCustomers: string;
  productCategories: string;
  brandAdvantages: string;
  writingStyle: string;
  defaultKeywords: string;
  internalLinkNotes: string;
  forbiddenClaims: string;
}

export const brandProfiles: BrandProfile[] = [
  {
    id: 'nanolab',
    label: 'Nanolab',
    brandName: 'Nanolab',
    website: 'https://www.nanolab9.com',
    industry:
      'laboratory consumables, sterilization supplies, lab safety, sample handling, laboratory procurement',
    targetCustomers:
      'Laboratories\nResearch facilities\nUniversities\nBiotech companies\nMedical labs\nIndustrial labs',
    productCategories:
      'Autoclavable biohazard bags\nSterilization pouches\nSilicone tubing\nVented caps and breathable caps\nCentrifuge bottles\nSterilizable goggles\nLaboratory small supplies',
    brandAdvantages:
      'Practical laboratory consumables for procurement teams\nUseful product information for lab buyers\nProduct categories aligned with sterilization, sample handling, and lab safety workflows',
    writingStyle:
      'English\nProfessional B2B laboratory procurement style\nClear, practical, and SEO-friendly\nDo not sound like hard advertising',
    defaultKeywords:
      'autoclavable biohazard bags\nsterilization pouches\nlaboratory silicone tubing\nvented caps for lab bottles\ncentrifuge bottles\nsterilizable lab goggles\nlaboratory consumables supplier',
    internalLinkNotes:
      'Naturally mention the Nanolab website where relevant. Suggest linking product category names to corresponding collection or product pages when available.',
    forbiddenClaims:
      'Do not claim medical approval unless provided\nDo not claim guaranteed sterility unless the product data supports it\nDo not invent certifications\nDo not make unverified safety or compliance claims\nDo not use hard advertising language'
  },
  {
    id: 'mrfairing',
    label: 'MrFairing',
    brandName: 'MrFairing',
    website: 'https://www.mrfairing.com',
    industry:
      'aftermarket motorcycle fairing kits, sportbike fairings, motorcycle bodywork, replacement fairings',
    targetCustomers:
      'Sportbike owners\nMotorcycle riders\nRiders replacing damaged fairings\nRiders customizing motorcycle appearance\nMotorcycle repair shops\nMotorcycle modification enthusiasts',
    productCategories:
      'Motorcycle fairing kits\nAftermarket fairings\nSportbike bodywork\nReplacement fairing panels\nCustom fairing kits\nBrand/model/year-specific fairings\nHonda\nYamaha\nSuzuki\nKawasaki\nDucati\nBMW\nTriumph',
    brandAdvantages:
      'Motorcycle fairing kits for multiple popular sportbike brands\nModel and year-specific product selection\nCustom fairing service\nAffordable aftermarket fairing options\nSuitable for riders replacing damaged or old fairings\nSuitable for riders who want a new look for their motorcycle',
    writingStyle:
      'English\nProfessional but rider-friendly\nUseful for motorcycle owners, not overly technical\nSEO-friendly\nDo not sound like hard advertising\nNaturally mention MrFairing where relevant\nAvoid exaggerated claims',
    defaultKeywords:
      'motorcycle fairing replacement cost\naftermarket motorcycle fairings\nOEM vs aftermarket fairings\nmotorcycle fairing kit\npainted motorcycle fairings\nABS motorcycle fairings\nhow to replace motorcycle fairings\ncustom motorcycle fairing kit\nsportbike fairings\nfairing kit for Honda CBR\nfairing kit for Yamaha R1\nfairing kit for Kawasaki Ninja\nfairing kit for Suzuki GSXR',
    internalLinkNotes:
      'Use model, brand, and year-specific internal link opportunities when relevant. Suggest linking fairing kit, custom fairing, and brand/model collection phrases to matching MrFairing pages.',
    forbiddenClaims:
      'Do not claim OEM original parts\nDo not claim perfect fit for every bike\nDo not claim official manufacturer affiliation\nDo not claim professional installation is always unnecessary\nDo not claim exact delivery time unless provided\nDo not say 100% guaranteed fit\nDo not make safety claims that cannot be verified'
  },
  {
    id: 'custom',
    label: 'Custom Brand',
    brandName: 'Custom Brand',
    website: '',
    industry: '',
    targetCustomers: '',
    productCategories: '',
    brandAdvantages: '',
    writingStyle:
      'English\nProfessional, natural, practical, and SEO-friendly\nDo not sound like hard advertising',
    defaultKeywords: '',
    internalLinkNotes: '',
    forbiddenClaims:
      'Do not invent facts, certifications, statistics, guarantees, delivery times, or official affiliations.'
  }
];

export const getBrandProfile = (id: BrandProfileId) =>
  brandProfiles.find((profile) => profile.id === id) || brandProfiles[0];
