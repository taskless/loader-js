import { type Pack } from "@~/__generated__/pack.js";
import { v7 } from "uuid";

/** create a 128 bit uuid7 and remove the dashes, turning it into a k-ordered bigint in hex */
export const id = () => `${v7().replaceAll("-", "")}`;

/** extract an identifier for the pack */
export const packIdentifier = (pack: Pack) => `${pack.name}@${pack.version}`;
