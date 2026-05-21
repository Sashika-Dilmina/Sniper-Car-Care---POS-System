/**
 * SNIPER 4x4 — image configuration
 *
 * HOW TO ADD / CHANGE IMAGES (manual, no database):
 * 1. Copy image files into src/assets/
 * 2. import each file below
 * 3. Assign to images / byServiceName
 *
 * Folder structure:
 *   src/assets/logo.png
 *   src/assets/black-jeep-climbing-rocks_....avif  (hero — already exists)
 *   src/assets/vip-banner.jpg
 *   src/assets/services/full-4x4.jpg
 *   src/assets/services/off-road.jpg
 *   src/assets/services/quick-wash.jpg
 */

import hero from '../assets/black-jeep-climbing-rocks_1167344-39192.png';

// --- Uncomment when you add the file ---
// import logo from '../assets/logo.png';
   import vipBanner from '../assets/vip-banner.avif';
   import serviceFull from '../assets/services/full-4x4.jpg';
   import serviceOffRoad from '../assets/services/off-road.jpg';
   import serviceQuick from '../assets/services/quick-wash.jpg';

export const images = {
  logo: null, // logo
  hero,
  vip: vipBanner,
  defaultService: hero,
  byServiceName: {
    'Full 4x4 Service': serviceFull,
    'Off-Road Refresh': serviceOffRoad,
    'Quick Water Wash': serviceQuick,
  },
};

export function getServiceImage(pkg) {
  return images.byServiceName[pkg.name] || images.defaultService;
}
