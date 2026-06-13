/**
 * SNIPER Saloon — image configuration
 *
 * Images live in: customer-website-saloon/src/assets/
 *   logo.png, hero-saloon.png, vip-banner.jpg
 *   full-service.jpg, shampoo-wash.jpg, water-wash.jpg
 */

import hero from '../assets/hero-saloon.png';
import vipBanner from '../assets/vip-banner.jpg';
import serviceFull from '../assets/full-service.jpg';
import serviceShampoo from '../assets/shampoo-wash.jpg';
import serviceWater from '../assets/water-wash.jpg';

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
