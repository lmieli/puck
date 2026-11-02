/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  serverExternalPackages: [
    "@anthropic-ai/sdk",
    "@anthropic-ai/claude-agent-sdk",
    "better-sqlite3",
    "@aws-sdk/client-s3",
  ],
  experimental: { serverActions: { bodySizeLimit: "12mb" } },
};
