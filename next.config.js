/** @type {import('next').NextConfig} */
const nextConfig = {
  // @napi-rs/canvas embarca um binario nativo (.node) - precisa ficar de
  // fora do bundle do webpack e ser carregado via require() normal do Node.
  experimental: {
    serverComponentsExternalPackages: ['@napi-rs/canvas'],
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'a.espncdn.com' },
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
};

module.exports = nextConfig;
