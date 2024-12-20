/* eslint-disable */
/**
 * This file was automatically generated by json-schema-to-typescript.
 * DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
 * and run json-schema-to-typescript to regenerate this file.
 */

/**
 * A pack delivered from the Taskless cloud, including information on how to retrieve the pack's runtime code
 */
export interface Pack {
  /**
   * The pack schema version used
   */
  schema: "pre1";
  /**
   * The pack name
   */
  name: string;
  /**
   * The pack version
   */
  version: string;
  /**
   * The pack description
   */
  description: string;
  /**
   * When a pack's excutable code is hosted remotely, this object describes how to download and verify it
   */
  url: {
    /**
     * A remote URL for downloading this Pack's executable code
     */
    source: string;
    /**
     * A sha-256 signature of the remote URL's content
     */
    signature: string;
    [k: string]: unknown;
  };
  /**
   * Describes the data this pack intends to capture
   */
  capture: {
    /**
     * This interface was referenced by `undefined`'s JSON-Schema definition
     * via the `patternProperty` "^(.*)$".
     */
    [k: string]: {
      /**
       * The type of data to capture
       */
      type: "string" | "number";
      description: string;
      [k: string]: unknown;
    };
  };
  /**
   * The permissions requested for this pack
   */
  permissions: {
    /**
     * The domains this pack is allowed to request data from as regular expressions.
     */
    domains?: string[];
    /**
     * The environment variables this pack is allowed to access on the host system
     */
    environment?: string[];
    /**
     * During the lifecycle, request access to additional properties such as 'headers' and 'body'
     */
    request?: string[];
    /**
     * During the lifecycle, response access to additional properties such as 'headers' and 'body'
     */
    response?: string[];
    [k: string]: unknown;
  };
  [k: string]: unknown;
}
