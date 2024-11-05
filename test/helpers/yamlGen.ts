import { getModuleName } from "@~/lib/sandbox.js";
import { type Config } from "@~/types.js";
import { uint8ArrayToBase64 } from "uint8array-extras";
import YAML from "yaml";
import sampleYamlConfig from "../../src/__generated__/config.yaml?raw";

const cfg = YAML.parse(sampleYamlConfig) as Config;

const pack = {
  ...cfg.packs[0],
  module: cfg.modules?.[getModuleName(cfg.packs[0])],
};

export const getYamlConfig = () => sampleYamlConfig;

export const getYamlPack = () => YAML.stringify(pack);

export const getJSONConfig = () => cfg;
