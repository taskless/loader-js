export default {
  openapi: "3.1.0",
  info: {
    title: "tskl.es",
    termsOfService: "https://taskless.io/legal/terms",
    license: {
      name: "Apache 2.0",
      url: "https://www.apache.org/licenses/LICENSE-2.0.html",
    },
    version: "1.0.0",
  },
  components: {
    schemas: {},
  },
  paths: {
    "/{version}/config": {
      get: {
        parameters: [
          {
            schema: {
              type: "string",
            },
            in: "path",
            name: "version",
            required: true,
            description: "The schema version of the config to retrieve.",
          },
          {
            schema: {
              type: "string",
            },
            in: "header",
            name: "authorization",
            required: true,
            description: "Bearer token",
          },
        ],
        responses: {
          "200": {
            description: "Default Response",
            content: {
              "application/json": {
                schema: {
                  anyOf: [
                    {
                      description: "A valid Taskless cloud configuration",
                      type: "object",
                      properties: {
                        schema: {
                          description: "The config schema version used",
                          type: "number",
                          enum: [1],
                        },
                        organizationId: {
                          type: "string",
                        },
                        packs: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              schema: {
                                description: "The pack schema version used",
                                type: "number",
                                enum: [3],
                              },
                              name: {
                                description: "The pack name",
                                type: "string",
                              },
                              version: {
                                description: "The pack version",
                                type: "string",
                              },
                              description: {
                                description: "The pack description",
                                type: "string",
                              },
                              capture: {
                                description:
                                  "Describes the data this pack intends to capture",
                                type: "object",
                                additionalProperties: {
                                  type: "object",
                                  properties: {
                                    type: {
                                      description:
                                        "The type of data to capture",
                                      anyOf: [
                                        {
                                          const: "string",
                                          type: "string",
                                        },
                                        {
                                          const: "number",
                                          type: "string",
                                        },
                                      ],
                                    },
                                    description: {
                                      type: "string",
                                    },
                                  },
                                  required: ["type", "description"],
                                },
                              },
                              permissions: {
                                description:
                                  "The permissions requested for this pack",
                                type: "object",
                                properties: {
                                  domains: {
                                    description:
                                      "The domains this pack is allowed to request data from as regular expressions.",
                                    type: "array",
                                    items: {
                                      type: "string",
                                    },
                                  },
                                  environment: {
                                    description:
                                      "The environment variables this pack is allowed to access on the host system",
                                    type: "array",
                                    items: {
                                      type: "string",
                                    },
                                  },
                                  request: {
                                    description:
                                      "During the lifecycle, request access to additional properties such as 'headers' and 'body'",
                                    type: "array",
                                    items: {
                                      type: "string",
                                    },
                                  },
                                  response: {
                                    description:
                                      "During the lifecycle, response access to additional properties such as 'headers' and 'body'",
                                    type: "array",
                                    items: {
                                      type: "string",
                                    },
                                  },
                                },
                              },
                              displays: {
                                description:
                                  "A set of pre-configured graphs or display modules available in this pack",
                                type: "array",
                                items: {
                                  type: "object",
                                  properties: {
                                    name: {
                                      description:
                                        "A name for the display module, unique to the pack",
                                      type: "string",
                                    },
                                    title: {
                                      description: "The title",
                                      type: "string",
                                    },
                                    query: {
                                      description:
                                        "Describes the query that retrieves data for this module",
                                      type: "object",
                                      properties: {
                                        count: {
                                          type: "string",
                                        },
                                        group: {
                                          type: "string",
                                        },
                                        where: {
                                          type: "object",
                                          additionalProperties: {
                                            anyOf: [
                                              {
                                                type: "string",
                                              },
                                              {
                                                type: "number",
                                              },
                                            ],
                                          },
                                        },
                                      },
                                    },
                                    display: {
                                      description:
                                        "The default display mode for this module",
                                      anyOf: [
                                        {
                                          type: "string",
                                          enum: ["graph"],
                                        },
                                        {
                                          type: "string",
                                          enum: ["table"],
                                        },
                                      ],
                                    },
                                  },
                                  required: [
                                    "name",
                                    "title",
                                    "query",
                                    "display",
                                  ],
                                },
                              },
                              module: {
                                description:
                                  "If this pack contains runtime code, this contains a base64 of the module's content. When packs are added to a config, modules are hoisted to reduce duplication.",
                                type: "string",
                              },
                            },
                            required: ["schema", "name", "version"],
                          },
                        },
                        modules: {
                          type: "object",
                          additionalProperties: {
                            description: "The module content",
                            type: "string",
                          },
                        },
                      },
                      required: ["schema", "organizationId", "packs"],
                    },
                    {
                      description: "A valid Taskless cloud configuration",
                      type: "object",
                      properties: {
                        schema: {
                          description: "The config schema version used",
                          type: "string",
                          enum: ["pre1"],
                        },
                        organizationId: {
                          type: "string",
                        },
                        packs: {
                          type: "array",
                          items: {
                            description:
                              "A pack delivered from the Taskless cloud, including information on how to retrieve the pack's runtime code",
                            type: "object",
                            properties: {
                              schema: {
                                description: "The pack schema version used",
                                type: "string",
                                enum: ["pre1"],
                              },
                              name: {
                                description: "The pack name",
                                type: "string",
                              },
                              version: {
                                description: "The pack version",
                                type: "string",
                              },
                              description: {
                                description: "The pack description",
                                type: "string",
                              },
                              url: {
                                description:
                                  "When a pack's excutable code is hosted remotely, this object describes how to download and verify it",
                                type: "object",
                                properties: {
                                  source: {
                                    description:
                                      "A remote URL for downloading this Pack's executable code",
                                    type: "string",
                                  },
                                  signature: {
                                    description:
                                      "A sha-256 signature of the remote URL's content",
                                    type: "string",
                                  },
                                },
                                required: ["source", "signature"],
                              },
                              capture: {
                                description:
                                  "Describes the data this pack intends to capture",
                                type: "object",
                                additionalProperties: {
                                  type: "object",
                                  properties: {
                                    type: {
                                      description:
                                        "The type of data to capture",
                                      anyOf: [
                                        {
                                          const: "string",
                                          type: "string",
                                        },
                                        {
                                          const: "number",
                                          type: "string",
                                        },
                                      ],
                                    },
                                    description: {
                                      type: "string",
                                    },
                                  },
                                  required: ["type", "description"],
                                },
                              },
                              permissions: {
                                description:
                                  "The permissions requested for this pack",
                                type: "object",
                                properties: {
                                  domains: {
                                    description:
                                      "The domains this pack is allowed to request data from as regular expressions.",
                                    type: "array",
                                    items: {
                                      type: "string",
                                    },
                                  },
                                  environment: {
                                    description:
                                      "The environment variables this pack is allowed to access on the host system",
                                    type: "array",
                                    items: {
                                      type: "string",
                                    },
                                  },
                                  request: {
                                    description:
                                      "During the lifecycle, request access to additional properties such as 'headers' and 'body'",
                                    type: "array",
                                    items: {
                                      type: "string",
                                    },
                                  },
                                  response: {
                                    description:
                                      "During the lifecycle, response access to additional properties such as 'headers' and 'body'",
                                    type: "array",
                                    items: {
                                      type: "string",
                                    },
                                  },
                                },
                              },
                            },
                            required: [
                              "schema",
                              "name",
                              "version",
                              "description",
                              "url",
                              "capture",
                              "permissions",
                            ],
                          },
                        },
                      },
                      required: ["schema", "organizationId", "packs"],
                    },
                  ],
                },
              },
            },
          },
          "404": {
            description: "Default Response",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    error: {
                      type: "string",
                    },
                    message: {
                      type: "string",
                    },
                  },
                  required: ["error", "message"],
                },
              },
            },
          },
        },
      },
    },
    "/public/config": {
      get: {
        responses: {
          "200": {
            description: "A valid Taskless cloud configuration",
            content: {
              "application/json": {
                schema: {
                  description: "A valid Taskless cloud configuration",
                  type: "object",
                  properties: {
                    schema: {
                      description: "The config schema version used",
                      type: "string",
                      enum: ["pre1"],
                    },
                    organizationId: {
                      type: "string",
                    },
                    packs: {
                      type: "array",
                      items: {
                        description:
                          "A pack delivered from the Taskless cloud, including information on how to retrieve the pack's runtime code",
                        type: "object",
                        properties: {
                          schema: {
                            description: "The pack schema version used",
                            type: "string",
                            enum: ["pre1"],
                          },
                          name: {
                            description: "The pack name",
                            type: "string",
                          },
                          version: {
                            description: "The pack version",
                            type: "string",
                          },
                          description: {
                            description: "The pack description",
                            type: "string",
                          },
                          url: {
                            description:
                              "When a pack's excutable code is hosted remotely, this object describes how to download and verify it",
                            type: "object",
                            properties: {
                              source: {
                                description:
                                  "A remote URL for downloading this Pack's executable code",
                                type: "string",
                              },
                              signature: {
                                description:
                                  "A sha-256 signature of the remote URL's content",
                                type: "string",
                              },
                            },
                            required: ["source", "signature"],
                          },
                          capture: {
                            description:
                              "Describes the data this pack intends to capture",
                            type: "object",
                            additionalProperties: {
                              type: "object",
                              properties: {
                                type: {
                                  description: "The type of data to capture",
                                  anyOf: [
                                    {
                                      const: "string",
                                      type: "string",
                                    },
                                    {
                                      const: "number",
                                      type: "string",
                                    },
                                  ],
                                },
                                description: {
                                  type: "string",
                                },
                              },
                              required: ["type", "description"],
                            },
                          },
                          permissions: {
                            description:
                              "The permissions requested for this pack",
                            type: "object",
                            properties: {
                              domains: {
                                description:
                                  "The domains this pack is allowed to request data from as regular expressions.",
                                type: "array",
                                items: {
                                  type: "string",
                                },
                              },
                              environment: {
                                description:
                                  "The environment variables this pack is allowed to access on the host system",
                                type: "array",
                                items: {
                                  type: "string",
                                },
                              },
                              request: {
                                description:
                                  "During the lifecycle, request access to additional properties such as 'headers' and 'body'",
                                type: "array",
                                items: {
                                  type: "string",
                                },
                              },
                              response: {
                                description:
                                  "During the lifecycle, response access to additional properties such as 'headers' and 'body'",
                                type: "array",
                                items: {
                                  type: "string",
                                },
                              },
                            },
                          },
                        },
                        required: [
                          "schema",
                          "name",
                          "version",
                          "description",
                          "url",
                          "capture",
                          "permissions",
                        ],
                      },
                    },
                  },
                  required: ["schema", "organizationId", "packs"],
                },
              },
            },
          },
        },
      },
    },
    "/{version}/events": {
      post: {
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                additionalProperties: {
                  type: "array",
                  items: {
                    anyOf: [
                      {
                        type: "object",
                        properties: {
                          seq: {
                            description:
                              "The sequence ID (uuid v7 as an unsighed 128-bit integer)",
                            type: "string",
                          },
                          dim: {
                            description: "The dimension key",
                            type: "string",
                          },
                          str: {
                            description: "The dimension value as a string",
                            type: "string",
                          },
                        },
                        required: ["seq", "dim", "str"],
                      },
                      {
                        type: "object",
                        properties: {
                          seq: {
                            description:
                              "The sequence ID (uuid v7 as an unsighed 128-bit integer)",
                            type: "string",
                          },
                          dim: {
                            description: "The dimension key",
                            type: "string",
                          },
                          num: {
                            description: "The dimension value as a number",
                            type: "string",
                          },
                        },
                        required: ["seq", "dim", "num"],
                      },
                    ],
                  },
                },
              },
            },
          },
        },
        parameters: [
          {
            schema: {
              type: "string",
              enum: ["v1"],
            },
            in: "path",
            name: "version",
            required: true,
            description:
              "The schema version of the config to retrieve. Currently only 'v1' is supported.",
          },
          {
            schema: {
              type: "string",
            },
            in: "header",
            name: "authorization",
            required: true,
            description: "Bearer token",
          },
        ],
        responses: {
          "200": {
            description: "Default Response",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    received: {
                      description: "The number of events received",
                      type: "number",
                    },
                  },
                  required: ["received"],
                },
              },
            },
          },
        },
      },
    },
  },
} as const;
