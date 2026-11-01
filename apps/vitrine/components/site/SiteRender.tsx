"use client";

import { Render, type Data } from "@puckeditor/core";
import { config } from "@/blocks/config";

export function SiteRender({
  data,
  siteSlug,
  path,
}: {
  data: Data;
  siteSlug: string;
  path: string;
}) {
  return <Render config={config} data={data} metadata={{ siteSlug, path }} />;
}
