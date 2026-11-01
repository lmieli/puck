/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  serverExternalPackages: ["@anthropic-ai/sdk"],
  experimental: { serverActions: { bodySizeLimit: "12mb" } },
};
