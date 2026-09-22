import fs from 'fs';
import path from 'path';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: '**',
      },
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    } else {
      config.plugins.push({
        apply(compiler) {
          compiler.hooks.afterEmit.tap('EnsureCommonJSPackageJsonPlugin', (compilation) => {
            try {
              const outputPath = compilation.outputOptions.path;
              if (outputPath) {
                const pkgPath = path.join(outputPath, 'package.json');
                if (!fs.existsSync(pkgPath)) {
                  fs.writeFileSync(pkgPath, JSON.stringify({ type: 'commonjs' }, null, 2));
                }
              }
            } catch {
              // ignore
            }
          });
        },
      });
    }
    return config;
  },
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_SERVER_URL;
    if (backendUrl) {
      const cleanUrl = backendUrl.replace(/\/$/, '');
      return [
        {
          source: '/api/:path*',
          destination: `${cleanUrl}/api/:path*`,
        },
        {
          source: '/uploads/:path*',
          destination: `${cleanUrl}/uploads/:path*`,
        },
      ];
    }
    return [];
  },
};

export default nextConfig;
