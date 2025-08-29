/**
 * A valid Taskless cloud configuration
 */
export type Schema = {
  /**
   * The config schema version used
   */
  schema: "pre2";
  organizationId: string;
  packs: Array<{
    /**
     * The pack schema version used
     */
    schema: "pre2";
    /**
     * The pack name
     */
    name: string;
    /**
     * The pack version, using semantic versioning conventions
     */
    version: string;
    /**
     * A short description of the pack's functionality
     */
    description: string;
    /**
     * Supported methods for this pack, defaults to pre and post
     */
    methods?: Array<"pre" | "post" | "chunk">;
    /**
     * The permissions requested for this pack from the host system
     */
    permissions: {
      /**
       * The environment variables this pack is allowed to access on the host system
       */
      environment?: string[];
      /**
       * [deprecated] Whether this pack can access the request and response body, always true
       */
      body?: boolean;
    };
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
    };
    /**
     * The user's configuration for this pack
     */
    configuration?: Record<string, unknown>;
  }>;
};
