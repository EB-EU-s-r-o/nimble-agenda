/**
 * Certifikovaná mriežka viewportov pre responzívny test.
 * Šírky/výšky zodpovedajú bežným zariadeniam (iPhone, Android, tablet, desktop).
 */
export interface ViewportSpec {
  name: string;
  width: number;
  height: number;
  type: "mobile" | "tablet" | "desktop";
}

export const CERTIFIED_VIEWPORTS: ViewportSpec[] = [
  { name: "iPhone SE", width: 375, height: 667, type: "mobile" },
  { name: "iPhone 12/14", width: 390, height: 844, type: "mobile" },
  { name: "iPhone 14 Pro Max", width: 430, height: 932, type: "mobile" },
  { name: "Pixel 5", width: 393, height: 851, type: "mobile" },
  { name: "Samsung Galaxy S20", width: 412, height: 915, type: "mobile" },
  { name: "Extra small (320)", width: 320, height: 568, type: "mobile" },
  { name: "iPad Mini", width: 768, height: 1024, type: "tablet" },
  { name: "iPad Pro 11", width: 834, height: 1194, type: "tablet" },
  { name: "Desktop SM", width: 1280, height: 800, type: "desktop" },
  { name: "Desktop LG", width: 1920, height: 1080, type: "desktop" },
];
