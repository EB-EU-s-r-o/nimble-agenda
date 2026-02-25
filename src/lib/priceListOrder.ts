export type PriceListCategoryKey = "damske" | "panske";

interface CanonicalService {
  name: string;
  orderIndex: number;
}

interface CanonicalSection {
  name: string;
  orderIndex: number;
  services: CanonicalService[];
}

const DAMSKE_SECTIONS: CanonicalSection[] = [
  {
    name: "Strih & Styling",
    orderIndex: 1,
    services: [
      { name: "Dámsky strih", orderIndex: 1 },
      { name: "Fúkaná dlhé vlasy", orderIndex: 2 },
      { name: "Fúkaná polodlhé vlasy", orderIndex: 3 },
      { name: "Finálny styling", orderIndex: 4 },
    ],
  },
  {
    name: "Farbenie",
    orderIndex: 2,
    services: [
      { name: "Farbenie odrastov so strihom", orderIndex: 1 },
      { name: "Farbenie odrastov", orderIndex: 2 },
      { name: "Kompletné farbenie", orderIndex: 3 },
      { name: "Kompletné farbenie so strihom", orderIndex: 4 },
    ],
  },
  {
    name: "Balayage & Melír",
    orderIndex: 3,
    services: [
      { name: "Balayage komplet", orderIndex: 1 },
      { name: "Balayage dorábka", orderIndex: 2 },
      { name: "Melír dorábka", orderIndex: 3 },
      { name: "Melír komplet", orderIndex: 4 },
    ],
  },
  {
    name: "Odfarbovanie & Regenerácia",
    orderIndex: 4,
    services: [
      { name: "Gumovanie alebo čistenie farby", orderIndex: 1 },
      { name: "Sťahovanie farby", orderIndex: 2 },
      { name: "Methamorphyc - rýchla kúra", orderIndex: 3 },
      { name: "Methamorphyc - exkluzívna kúra", orderIndex: 4 },
      { name: "Brazílsky keratín", orderIndex: 5 },
    ],
  },
  {
    name: "Predlžovanie & Účesy",
    orderIndex: 5,
    services: [
      { name: "Aplikácia Tape-in", orderIndex: 1 },
      { name: "Prepojenie Tape-in", orderIndex: 2 },
      { name: "Zapletané vrkôčiky", orderIndex: 3 },
      { name: "Spoločenský účes", orderIndex: 4 },
    ],
  },
];

const PANSKE_SECTIONS: CanonicalSection[] = [
  {
    name: "Vlasy",
    orderIndex: 1,
    services: [
      { name: "Strih Junior (do 15r.)", orderIndex: 1 },
      { name: "Pánsky strih", orderIndex: 2 },
    ],
  },
  {
    name: "Brada & Kombinácie",
    orderIndex: 2,
    services: [
      { name: "Úprava brady", orderIndex: 1 },
      { name: "Kombinácia vlasy a brada", orderIndex: 2 },
      { name: "Pánsky špeciál", orderIndex: 3 },
    ],
  },
  {
    name: "Farbenie",
    orderIndex: 3,
    services: [
      { name: "Trvalá", orderIndex: 1 },
      { name: "Zosvetlenie vlasov", orderIndex: 2 },
      { name: "Farbenie brady", orderIndex: 3 },
      { name: "Tónovanie sedín", orderIndex: 4 },
    ],
  },
  {
    name: "Doplnkové Služby",
    orderIndex: 4,
    services: [
      { name: "Depilácia nosa aj uši", orderIndex: 1 },
      { name: "Ušné sviečky", orderIndex: 2 },
      { name: "Čierna zlupovacia maska", orderIndex: 3 },
    ],
  },
];

const CANONICAL_SECTIONS: Record<PriceListCategoryKey, CanonicalSection[]> = {
  damske: DAMSKE_SECTIONS,
  panske: PANSKE_SECTIONS,
};

const serviceOrderMap = new Map<string, number>();
const sectionOrderMap = new Map<string, number>();

for (const [category, sections] of Object.entries(CANONICAL_SECTIONS) as Array<[PriceListCategoryKey, CanonicalSection[]]>) {
  sections.forEach((section) => {
    sectionOrderMap.set(`${category}|${section.name}`, section.orderIndex);
    section.services.forEach((service) => {
      serviceOrderMap.set(`${category}|${section.name}|${service.name}`, service.orderIndex);
    });
  });
}

interface ServiceLike {
  category: string | null;
  subcategory: string | null;
  name_sk: string;
}

export function getSectionOrderIndex(category: string | null, section: string | null): number {
  if (!category || !section) return Number.MAX_SAFE_INTEGER;
  return sectionOrderMap.get(`${category}|${section}`) ?? Number.MAX_SAFE_INTEGER;
}

export function getServiceOrderIndex(category: string | null, section: string | null, serviceName: string): number {
  if (!category || !section) return Number.MAX_SAFE_INTEGER;
  return serviceOrderMap.get(`${category}|${section}|${serviceName}`) ?? Number.MAX_SAFE_INTEGER;
}

export function sortServicesByCanonicalOrder<T extends ServiceLike>(services: T[]): T[] {
  return [...services].sort((a, b) => {
    const sectionDiff = getSectionOrderIndex(a.category, a.subcategory) - getSectionOrderIndex(b.category, b.subcategory);
    if (sectionDiff !== 0) return sectionDiff;

    const serviceDiff = getServiceOrderIndex(a.category, a.subcategory, a.name_sk) - getServiceOrderIndex(b.category, b.subcategory, b.name_sk);
    if (serviceDiff !== 0) return serviceDiff;

    return a.name_sk.localeCompare(b.name_sk, "sk");
  });
}

export function getSubcategoriesInCanonicalOrder(category: PriceListCategoryKey, services: ServiceLike[]): string[] {
  const available = new Set(
    services
      .filter((service) => service.category === category && service.subcategory)
      .map((service) => service.subcategory as string),
  );

  return CANONICAL_SECTIONS[category]
    .filter((section) => available.has(section.name))
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((section) => section.name);
}
