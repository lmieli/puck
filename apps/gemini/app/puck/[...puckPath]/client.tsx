"use client";

import type { Data } from "@puckeditor/core";
import { Puck } from "@puckeditor/core";
import config from "../../../puck.config";

export function Client({ path, data }: { path: string; data: Data }) {
  return (
    <Puck
      config={config}
      data={data}
      headerTitle="Gemini Engenharia"
      headerPath={path}
      onPublish={async (data) => {
        await fetch("/puck/api", {
          method: "post",
          body: JSON.stringify({ data, path }),
        });
      }}
    />
  );
}
