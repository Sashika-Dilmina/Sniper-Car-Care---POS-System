/**
 * SNIPER 4x4 — image configuration
 *
 * Images live in: customer-website-4x4/src/assets/
 */

import hero from '../assets/black-jeep-climbing-rocks_1167344-39192.png';
import vipBanner from '../assets/vip-banner.avif';
import serviceFull from '../assets/services/full-4x4.jpg';
import serviceShampoo from '../assets/services/off-road.jpg';
import serviceWater from '../assets/services/quick-wash.jpg';

// import logo from '../assets/logo.png';  // add logo.png then uncomment

export const images = {
  logo: null, // logo — set to `logo` when logo.png exists
  hero,
  vip: vipBanner,
  defaultService: hero,
  byServiceName: {
    'Full Service': serviceFull,
    'Full Body Wash with Shampoo': serviceShampoo,
    'Only Water Body Wash': serviceWater,
  },
};

export function getServiceImage(pkg) {
  if (pkg && pkg.image_url) {
    let cleanUrl = pkg.image_url;
    if (cleanUrl.startsWith('http://localhost:5000')) {
      cleanUrl = cleanUrl.replace('http://localhost:5000', '');
    } else if (cleanUrl.startsWith('https://localhost:5000')) {
      cleanUrl = cleanUrl.replace('https://localhost:5000', '');
    }
    if (cleanUrl.startsWith('http')) {
      return cleanUrl;
    }
    const apiBaseUrl = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/$/, '') : (import.meta.env.PROD ? '' : 'http://localhost:5000');
    return `${apiBaseUrl}${cleanUrl.startsWith('/') ? '' : '/'}${cleanUrl}`;
  }
  return images.byServiceName[pkg ? pkg.name : ''] || images.defaultService;
}
