import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'منصة إدارة محافظ الشركاء - مركز الشاطبي',
    short_name: 'محافظ الشاطبي',
    description: 'نظام مالي وإداري متكامل لإدارة محافظ الشركاء في البورصة وحساب الأرباح والخسائر وأتعاب الإدارة',
    start_url: '/',
    display: 'standalone',
    background_color: '#0b1120',
    theme_color: '#059669',
    lang: 'ar',
    dir: 'rtl',
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
