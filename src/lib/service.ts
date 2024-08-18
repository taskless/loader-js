import { emptyConfig } from "@~/constants.js";
import {
  type Config,
  type DenormalizedRule,
  type Logger,
  type MaybePromise,
  type Pack,
} from "@~/types.js";
import { type NormalizeOAS, type OASClient } from "fets";
import type openapi from "@~/__generated__/openapi.js";

/** Extract all packs from the config, ensuring the config is resolved */
export const extractPacks = async (packs: Promise<Config>) => {
  const data = await packs;
  return data?.packs ?? [];
};

/** Fetch the configuration from taskless using the provided API secret */
export const getConfig = async (
  secret: string,
  {
    logger,
    client,
  }: { logger: Logger; client: OASClient<NormalizeOAS<typeof openapi>> }
): Promise<Config> => {
  const response = await client["/{version}/config"].get({
    headers: {
      authorization: `Bearer ${secret}`,
    },
    params: {
      version: "v1",
    },
  });

  if (!response.ok) {
    logger.error(
      `Failed to fetch configuration: ${response.status} ${response.statusText}. Taskless will not apply rules.`
    );
    return emptyConfig;
  }

  const data = await response.json();

  logger.debug(
    `Retrieved configuration from Taskless (orgId: ${data.organizationId}, schema: ${data.__v})`
  );
  return data;
};

/** Load rules into a denormalized form */
export const loadRules = async (
  packs: MaybePromise<Pack[]>,
  config: MaybePromise<Config | undefined>
) => {
  const [resolvedPacks, resolvedConfig] = await Promise.all([packs, config]);
  const flatRules: DenormalizedRule[] = [];

  for (const pack of resolvedPacks) {
    for (const rule of pack.rules) {
      flatRules.push({
        ...rule,
        __: {
          matches: new RegExp(rule.matches),
          packName: pack.name,
          packVersion: pack.version,
          configOrganizationId: resolvedConfig?.organizationId ?? "",
          sendData: pack.sends,
        },
      });
    }
  }

  return flatRules;
};
