import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'https://drop-talk.vercel.app';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/chat',
          '/dm',
          '/channels/',
          '/notifications',
          '/settings',
          '/profile',
          '/set-username',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
