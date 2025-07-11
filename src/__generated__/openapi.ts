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
                  _def: {
                    options: [
                      {
                        _def: {
                          unknownKeys: "strip",
                          catchall: {
                            _def: {
                              typeName: "ZodNever",
                            },
                            "~standard": {
                              version: 1,
                              vendor: "zod",
                            },
                          },
                          typeName: "ZodObject",
                          description: "A valid Taskless cloud configuration",
                        },
                        "~standard": {
                          version: 1,
                          vendor: "zod",
                        },
                        _cached: {
                          shape: {
                            schema: {
                              _def: {
                                value: "pre1",
                                typeName: "ZodLiteral",
                                description: "The config schema version used",
                              },
                              "~standard": {
                                version: 1,
                                vendor: "zod",
                              },
                            },
                            organizationId: {
                              _def: {
                                checks: [],
                                typeName: "ZodString",
                                coerce: false,
                              },
                              "~standard": {
                                version: 1,
                                vendor: "zod",
                              },
                            },
                            packs: {
                              _def: {
                                type: {
                                  _def: {
                                    unknownKeys: "strip",
                                    catchall: {
                                      _def: {
                                        typeName: "ZodNever",
                                      },
                                      "~standard": {
                                        version: 1,
                                        vendor: "zod",
                                      },
                                    },
                                    typeName: "ZodObject",
                                    description:
                                      "A pack delivered from the Taskless cloud, including information on how to retrieve the pack's runtime code",
                                  },
                                  "~standard": {
                                    version: 1,
                                    vendor: "zod",
                                  },
                                  _cached: {
                                    shape: {
                                      schema: {
                                        _def: {
                                          value: "pre1",
                                          typeName: "ZodLiteral",
                                          description:
                                            "The pack schema version used",
                                        },
                                        "~standard": {
                                          version: 1,
                                          vendor: "zod",
                                        },
                                      },
                                      name: {
                                        _def: {
                                          checks: [],
                                          typeName: "ZodString",
                                          coerce: false,
                                          description: "The pack name",
                                        },
                                        "~standard": {
                                          version: 1,
                                          vendor: "zod",
                                        },
                                      },
                                      version: {
                                        _def: {
                                          checks: [],
                                          typeName: "ZodString",
                                          coerce: false,
                                          description: "The pack version",
                                        },
                                        "~standard": {
                                          version: 1,
                                          vendor: "zod",
                                        },
                                      },
                                      description: {
                                        _def: {
                                          checks: [],
                                          typeName: "ZodString",
                                          coerce: false,
                                          description: "The pack description",
                                        },
                                        "~standard": {
                                          version: 1,
                                          vendor: "zod",
                                        },
                                      },
                                      url: {
                                        _def: {
                                          unknownKeys: "strip",
                                          catchall: {
                                            _def: {
                                              typeName: "ZodNever",
                                            },
                                            "~standard": {
                                              version: 1,
                                              vendor: "zod",
                                            },
                                          },
                                          typeName: "ZodObject",
                                          description:
                                            "When a pack's excutable code is hosted remotely, this object describes how to download and verify it",
                                        },
                                        "~standard": {
                                          version: 1,
                                          vendor: "zod",
                                        },
                                        _cached: {
                                          shape: {
                                            source: {
                                              _def: {
                                                checks: [],
                                                typeName: "ZodString",
                                                coerce: false,
                                                description:
                                                  "A remote URL for downloading this Pack's executable code",
                                              },
                                              "~standard": {
                                                version: 1,
                                                vendor: "zod",
                                              },
                                            },
                                            signature: {
                                              _def: {
                                                checks: [],
                                                typeName: "ZodString",
                                                coerce: false,
                                                description:
                                                  "A sha-256 signature of the remote URL's content",
                                              },
                                              "~standard": {
                                                version: 1,
                                                vendor: "zod",
                                              },
                                            },
                                          },
                                          keys: ["source", "signature"],
                                        },
                                      },
                                      capture: {
                                        _def: {
                                          keyType: {
                                            _def: {
                                              checks: [],
                                              typeName: "ZodString",
                                              coerce: false,
                                            },
                                            "~standard": {
                                              version: 1,
                                              vendor: "zod",
                                            },
                                          },
                                          valueType: {
                                            _def: {
                                              unknownKeys: "strip",
                                              catchall: {
                                                _def: {
                                                  typeName: "ZodNever",
                                                },
                                                "~standard": {
                                                  version: 1,
                                                  vendor: "zod",
                                                },
                                              },
                                              typeName: "ZodObject",
                                            },
                                            "~standard": {
                                              version: 1,
                                              vendor: "zod",
                                            },
                                            _cached: {
                                              shape: {
                                                type: {
                                                  _def: {
                                                    options: [
                                                      {
                                                        _def: {
                                                          value: "string",
                                                          typeName:
                                                            "ZodLiteral",
                                                        },
                                                        "~standard": {
                                                          version: 1,
                                                          vendor: "zod",
                                                        },
                                                      },
                                                      {
                                                        _def: {
                                                          value: "number",
                                                          typeName:
                                                            "ZodLiteral",
                                                        },
                                                        "~standard": {
                                                          version: 1,
                                                          vendor: "zod",
                                                        },
                                                      },
                                                    ],
                                                    typeName: "ZodUnion",
                                                    description:
                                                      "The type of data to capture",
                                                  },
                                                  "~standard": {
                                                    version: 1,
                                                    vendor: "zod",
                                                  },
                                                },
                                                description: {
                                                  _def: {
                                                    checks: [],
                                                    typeName: "ZodString",
                                                    coerce: false,
                                                  },
                                                  "~standard": {
                                                    version: 1,
                                                    vendor: "zod",
                                                  },
                                                },
                                              },
                                              keys: ["type", "description"],
                                            },
                                          },
                                          typeName: "ZodRecord",
                                          description:
                                            "Describes the data this pack intends to capture",
                                        },
                                        "~standard": {
                                          version: 1,
                                          vendor: "zod",
                                        },
                                      },
                                      permissions: {
                                        _def: {
                                          unknownKeys: "strip",
                                          catchall: {
                                            _def: {
                                              typeName: "ZodNever",
                                            },
                                            "~standard": {
                                              version: 1,
                                              vendor: "zod",
                                            },
                                          },
                                          typeName: "ZodObject",
                                          description:
                                            "The permissions requested for this pack",
                                        },
                                        "~standard": {
                                          version: 1,
                                          vendor: "zod",
                                        },
                                        _cached: {
                                          shape: {
                                            domains: {
                                              _def: {
                                                innerType: {
                                                  _def: {
                                                    type: {
                                                      _def: {
                                                        checks: [],
                                                        typeName: "ZodString",
                                                        coerce: false,
                                                      },
                                                      "~standard": {
                                                        version: 1,
                                                        vendor: "zod",
                                                      },
                                                    },
                                                    minLength: null,
                                                    maxLength: null,
                                                    exactLength: null,
                                                    typeName: "ZodArray",
                                                  },
                                                  "~standard": {
                                                    version: 1,
                                                    vendor: "zod",
                                                  },
                                                },
                                                typeName: "ZodOptional",
                                                description:
                                                  "The domains this pack is allowed to request data from as regular expressions.",
                                              },
                                              "~standard": {
                                                version: 1,
                                                vendor: "zod",
                                              },
                                            },
                                            environment: {
                                              _def: {
                                                innerType: {
                                                  _def: {
                                                    type: {
                                                      _def: {
                                                        checks: [],
                                                        typeName: "ZodString",
                                                        coerce: false,
                                                      },
                                                      "~standard": {
                                                        version: 1,
                                                        vendor: "zod",
                                                      },
                                                    },
                                                    minLength: null,
                                                    maxLength: null,
                                                    exactLength: null,
                                                    typeName: "ZodArray",
                                                  },
                                                  "~standard": {
                                                    version: 1,
                                                    vendor: "zod",
                                                  },
                                                },
                                                typeName: "ZodOptional",
                                                description:
                                                  "The environment variables this pack is allowed to access on the host system",
                                              },
                                              "~standard": {
                                                version: 1,
                                                vendor: "zod",
                                              },
                                            },
                                            request: {
                                              _def: {
                                                innerType: {
                                                  _def: {
                                                    type: {
                                                      _def: {
                                                        checks: [],
                                                        typeName: "ZodString",
                                                        coerce: false,
                                                      },
                                                      "~standard": {
                                                        version: 1,
                                                        vendor: "zod",
                                                      },
                                                    },
                                                    minLength: null,
                                                    maxLength: null,
                                                    exactLength: null,
                                                    typeName: "ZodArray",
                                                  },
                                                  "~standard": {
                                                    version: 1,
                                                    vendor: "zod",
                                                  },
                                                },
                                                typeName: "ZodOptional",
                                                description:
                                                  "During the lifecycle, request access to additional properties such as 'headers' and 'body'",
                                              },
                                              "~standard": {
                                                version: 1,
                                                vendor: "zod",
                                              },
                                            },
                                            response: {
                                              _def: {
                                                innerType: {
                                                  _def: {
                                                    type: {
                                                      _def: {
                                                        checks: [],
                                                        typeName: "ZodString",
                                                        coerce: false,
                                                      },
                                                      "~standard": {
                                                        version: 1,
                                                        vendor: "zod",
                                                      },
                                                    },
                                                    minLength: null,
                                                    maxLength: null,
                                                    exactLength: null,
                                                    typeName: "ZodArray",
                                                  },
                                                  "~standard": {
                                                    version: 1,
                                                    vendor: "zod",
                                                  },
                                                },
                                                typeName: "ZodOptional",
                                                description:
                                                  "During the lifecycle, response access to additional properties such as 'headers' and 'body'",
                                              },
                                              "~standard": {
                                                version: 1,
                                                vendor: "zod",
                                              },
                                            },
                                          },
                                          keys: [
                                            "domains",
                                            "environment",
                                            "request",
                                            "response",
                                          ],
                                        },
                                      },
                                    },
                                    keys: [
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
                                minLength: null,
                                maxLength: null,
                                exactLength: null,
                                typeName: "ZodArray",
                              },
                              "~standard": {
                                version: 1,
                                vendor: "zod",
                              },
                            },
                          },
                          keys: ["schema", "organizationId", "packs"],
                        },
                      },
                      {
                        _def: {
                          unknownKeys: "strip",
                          catchall: {
                            _def: {
                              typeName: "ZodNever",
                            },
                            "~standard": {
                              version: 1,
                              vendor: "zod",
                            },
                          },
                          typeName: "ZodObject",
                          description: "A valid Taskless cloud configuration",
                        },
                        "~standard": {
                          version: 1,
                          vendor: "zod",
                        },
                        _cached: null,
                      },
                    ],
                    typeName: "ZodUnion",
                  },
                  "~standard": {
                    version: 1,
                    vendor: "zod",
                  },
                },
              },
            },
          },
          "404": {
            description: "Default Response",
            content: {
              "application/json": {
                schema: {
                  _def: {
                    unknownKeys: "strip",
                    catchall: {
                      _def: {
                        typeName: "ZodNever",
                      },
                      "~standard": {
                        version: 1,
                        vendor: "zod",
                      },
                    },
                    typeName: "ZodObject",
                  },
                  "~standard": {
                    version: 1,
                    vendor: "zod",
                  },
                  _cached: null,
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
                    type: "object",
                    properties: {
                      seq: {
                        type: "string",
                        description:
                          "The sequence ID (uuid v7 as an unsigned 128-bit integer)",
                      },
                      dim: {
                        type: "string",
                        description: "The dimension key",
                      },
                      str: {
                        type: "string",
                        description: "The dimension value as a string",
                      },
                      num: {
                        type: "string",
                        description: "The dimension value as a number",
                      },
                    },
                    required: ["seq", "dim"],
                    additionalProperties: false,
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
                  _def: {
                    unknownKeys: "strip",
                    catchall: {
                      _def: {
                        typeName: "ZodNever",
                      },
                      "~standard": {
                        version: 1,
                        vendor: "zod",
                      },
                    },
                    typeName: "ZodObject",
                  },
                  "~standard": {
                    version: 1,
                    vendor: "zod",
                  },
                  _cached: {
                    shape: {
                      received: {
                        _def: {
                          checks: [],
                          typeName: "ZodNumber",
                          coerce: false,
                          description: "The number of events received",
                        },
                        "~standard": {
                          version: 1,
                          vendor: "zod",
                        },
                      },
                    },
                    keys: ["received"],
                  },
                },
              },
            },
          },
          "404": {
            description: "Default Response",
            content: {
              "application/json": {
                schema: {
                  _def: {
                    unknownKeys: "strip",
                    catchall: {
                      _def: {
                        typeName: "ZodNever",
                      },
                      "~standard": {
                        version: 1,
                        vendor: "zod",
                      },
                    },
                    typeName: "ZodObject",
                  },
                  "~standard": {
                    version: 1,
                    vendor: "zod",
                  },
                  _cached: null,
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
                  _def: {
                    unknownKeys: "strip",
                    catchall: {
                      _def: {
                        typeName: "ZodNever",
                      },
                      "~standard": {
                        version: 1,
                        vendor: "zod",
                      },
                    },
                    typeName: "ZodObject",
                    description: "A valid Taskless cloud configuration",
                  },
                  "~standard": {
                    version: 1,
                    vendor: "zod",
                  },
                  _cached: {
                    shape: {
                      schema: {
                        _def: {
                          value: "pre1",
                          typeName: "ZodLiteral",
                          description: "The config schema version used",
                        },
                        "~standard": {
                          version: 1,
                          vendor: "zod",
                        },
                      },
                      organizationId: {
                        _def: {
                          checks: [],
                          typeName: "ZodString",
                          coerce: false,
                        },
                        "~standard": {
                          version: 1,
                          vendor: "zod",
                        },
                      },
                      packs: {
                        _def: {
                          type: {
                            _def: {
                              unknownKeys: "strip",
                              catchall: {
                                _def: {
                                  typeName: "ZodNever",
                                },
                                "~standard": {
                                  version: 1,
                                  vendor: "zod",
                                },
                              },
                              typeName: "ZodObject",
                              description:
                                "A pack delivered from the Taskless cloud, including information on how to retrieve the pack's runtime code",
                            },
                            "~standard": {
                              version: 1,
                              vendor: "zod",
                            },
                            _cached: {
                              shape: {
                                schema: {
                                  _def: {
                                    value: "pre1",
                                    typeName: "ZodLiteral",
                                    description: "The pack schema version used",
                                  },
                                  "~standard": {
                                    version: 1,
                                    vendor: "zod",
                                  },
                                },
                                name: {
                                  _def: {
                                    checks: [],
                                    typeName: "ZodString",
                                    coerce: false,
                                    description: "The pack name",
                                  },
                                  "~standard": {
                                    version: 1,
                                    vendor: "zod",
                                  },
                                },
                                version: {
                                  _def: {
                                    checks: [],
                                    typeName: "ZodString",
                                    coerce: false,
                                    description: "The pack version",
                                  },
                                  "~standard": {
                                    version: 1,
                                    vendor: "zod",
                                  },
                                },
                                description: {
                                  _def: {
                                    checks: [],
                                    typeName: "ZodString",
                                    coerce: false,
                                    description: "The pack description",
                                  },
                                  "~standard": {
                                    version: 1,
                                    vendor: "zod",
                                  },
                                },
                                url: {
                                  _def: {
                                    unknownKeys: "strip",
                                    catchall: {
                                      _def: {
                                        typeName: "ZodNever",
                                      },
                                      "~standard": {
                                        version: 1,
                                        vendor: "zod",
                                      },
                                    },
                                    typeName: "ZodObject",
                                    description:
                                      "When a pack's excutable code is hosted remotely, this object describes how to download and verify it",
                                  },
                                  "~standard": {
                                    version: 1,
                                    vendor: "zod",
                                  },
                                  _cached: {
                                    shape: {
                                      source: {
                                        _def: {
                                          checks: [],
                                          typeName: "ZodString",
                                          coerce: false,
                                          description:
                                            "A remote URL for downloading this Pack's executable code",
                                        },
                                        "~standard": {
                                          version: 1,
                                          vendor: "zod",
                                        },
                                      },
                                      signature: {
                                        _def: {
                                          checks: [],
                                          typeName: "ZodString",
                                          coerce: false,
                                          description:
                                            "A sha-256 signature of the remote URL's content",
                                        },
                                        "~standard": {
                                          version: 1,
                                          vendor: "zod",
                                        },
                                      },
                                    },
                                    keys: ["source", "signature"],
                                  },
                                },
                                capture: {
                                  _def: {
                                    keyType: {
                                      _def: {
                                        checks: [],
                                        typeName: "ZodString",
                                        coerce: false,
                                      },
                                      "~standard": {
                                        version: 1,
                                        vendor: "zod",
                                      },
                                    },
                                    valueType: {
                                      _def: {
                                        unknownKeys: "strip",
                                        catchall: {
                                          _def: {
                                            typeName: "ZodNever",
                                          },
                                          "~standard": {
                                            version: 1,
                                            vendor: "zod",
                                          },
                                        },
                                        typeName: "ZodObject",
                                      },
                                      "~standard": {
                                        version: 1,
                                        vendor: "zod",
                                      },
                                      _cached: {
                                        shape: {
                                          type: {
                                            _def: {
                                              options: [
                                                {
                                                  _def: {
                                                    value: "string",
                                                    typeName: "ZodLiteral",
                                                  },
                                                  "~standard": {
                                                    version: 1,
                                                    vendor: "zod",
                                                  },
                                                },
                                                {
                                                  _def: {
                                                    value: "number",
                                                    typeName: "ZodLiteral",
                                                  },
                                                  "~standard": {
                                                    version: 1,
                                                    vendor: "zod",
                                                  },
                                                },
                                              ],
                                              typeName: "ZodUnion",
                                              description:
                                                "The type of data to capture",
                                            },
                                            "~standard": {
                                              version: 1,
                                              vendor: "zod",
                                            },
                                          },
                                          description: {
                                            _def: {
                                              checks: [],
                                              typeName: "ZodString",
                                              coerce: false,
                                            },
                                            "~standard": {
                                              version: 1,
                                              vendor: "zod",
                                            },
                                          },
                                        },
                                        keys: ["type", "description"],
                                      },
                                    },
                                    typeName: "ZodRecord",
                                    description:
                                      "Describes the data this pack intends to capture",
                                  },
                                  "~standard": {
                                    version: 1,
                                    vendor: "zod",
                                  },
                                },
                                permissions: {
                                  _def: {
                                    unknownKeys: "strip",
                                    catchall: {
                                      _def: {
                                        typeName: "ZodNever",
                                      },
                                      "~standard": {
                                        version: 1,
                                        vendor: "zod",
                                      },
                                    },
                                    typeName: "ZodObject",
                                    description:
                                      "The permissions requested for this pack",
                                  },
                                  "~standard": {
                                    version: 1,
                                    vendor: "zod",
                                  },
                                  _cached: {
                                    shape: {
                                      domains: {
                                        _def: {
                                          innerType: {
                                            _def: {
                                              type: {
                                                _def: {
                                                  checks: [],
                                                  typeName: "ZodString",
                                                  coerce: false,
                                                },
                                                "~standard": {
                                                  version: 1,
                                                  vendor: "zod",
                                                },
                                              },
                                              minLength: null,
                                              maxLength: null,
                                              exactLength: null,
                                              typeName: "ZodArray",
                                            },
                                            "~standard": {
                                              version: 1,
                                              vendor: "zod",
                                            },
                                          },
                                          typeName: "ZodOptional",
                                          description:
                                            "The domains this pack is allowed to request data from as regular expressions.",
                                        },
                                        "~standard": {
                                          version: 1,
                                          vendor: "zod",
                                        },
                                      },
                                      environment: {
                                        _def: {
                                          innerType: {
                                            _def: {
                                              type: {
                                                _def: {
                                                  checks: [],
                                                  typeName: "ZodString",
                                                  coerce: false,
                                                },
                                                "~standard": {
                                                  version: 1,
                                                  vendor: "zod",
                                                },
                                              },
                                              minLength: null,
                                              maxLength: null,
                                              exactLength: null,
                                              typeName: "ZodArray",
                                            },
                                            "~standard": {
                                              version: 1,
                                              vendor: "zod",
                                            },
                                          },
                                          typeName: "ZodOptional",
                                          description:
                                            "The environment variables this pack is allowed to access on the host system",
                                        },
                                        "~standard": {
                                          version: 1,
                                          vendor: "zod",
                                        },
                                      },
                                      request: {
                                        _def: {
                                          innerType: {
                                            _def: {
                                              type: {
                                                _def: {
                                                  checks: [],
                                                  typeName: "ZodString",
                                                  coerce: false,
                                                },
                                                "~standard": {
                                                  version: 1,
                                                  vendor: "zod",
                                                },
                                              },
                                              minLength: null,
                                              maxLength: null,
                                              exactLength: null,
                                              typeName: "ZodArray",
                                            },
                                            "~standard": {
                                              version: 1,
                                              vendor: "zod",
                                            },
                                          },
                                          typeName: "ZodOptional",
                                          description:
                                            "During the lifecycle, request access to additional properties such as 'headers' and 'body'",
                                        },
                                        "~standard": {
                                          version: 1,
                                          vendor: "zod",
                                        },
                                      },
                                      response: {
                                        _def: {
                                          innerType: {
                                            _def: {
                                              type: {
                                                _def: {
                                                  checks: [],
                                                  typeName: "ZodString",
                                                  coerce: false,
                                                },
                                                "~standard": {
                                                  version: 1,
                                                  vendor: "zod",
                                                },
                                              },
                                              minLength: null,
                                              maxLength: null,
                                              exactLength: null,
                                              typeName: "ZodArray",
                                            },
                                            "~standard": {
                                              version: 1,
                                              vendor: "zod",
                                            },
                                          },
                                          typeName: "ZodOptional",
                                          description:
                                            "During the lifecycle, response access to additional properties such as 'headers' and 'body'",
                                        },
                                        "~standard": {
                                          version: 1,
                                          vendor: "zod",
                                        },
                                      },
                                    },
                                    keys: [
                                      "domains",
                                      "environment",
                                      "request",
                                      "response",
                                    ],
                                  },
                                },
                              },
                              keys: [
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
                          minLength: null,
                          maxLength: null,
                          exactLength: null,
                          typeName: "ZodArray",
                        },
                        "~standard": {
                          version: 1,
                          vendor: "zod",
                        },
                      },
                    },
                    keys: ["schema", "organizationId", "packs"],
                  },
                },
              },
            },
          },
        },
      },
    },
    "/public/{version}/config": {
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
        ],
        responses: {
          "200": {
            description: "Default Response",
            content: {
              "application/json": {
                schema: {
                  _def: {
                    options: [
                      {
                        _def: {
                          unknownKeys: "strip",
                          catchall: {
                            _def: {
                              typeName: "ZodNever",
                            },
                            "~standard": {
                              version: 1,
                              vendor: "zod",
                            },
                          },
                          typeName: "ZodObject",
                          description: "A valid Taskless cloud configuration",
                        },
                        "~standard": {
                          version: 1,
                          vendor: "zod",
                        },
                        _cached: {
                          shape: {
                            schema: {
                              _def: {
                                value: "pre1",
                                typeName: "ZodLiteral",
                                description: "The config schema version used",
                              },
                              "~standard": {
                                version: 1,
                                vendor: "zod",
                              },
                            },
                            organizationId: {
                              _def: {
                                checks: [],
                                typeName: "ZodString",
                                coerce: false,
                              },
                              "~standard": {
                                version: 1,
                                vendor: "zod",
                              },
                            },
                            packs: {
                              _def: {
                                type: {
                                  _def: {
                                    unknownKeys: "strip",
                                    catchall: {
                                      _def: {
                                        typeName: "ZodNever",
                                      },
                                      "~standard": {
                                        version: 1,
                                        vendor: "zod",
                                      },
                                    },
                                    typeName: "ZodObject",
                                    description:
                                      "A pack delivered from the Taskless cloud, including information on how to retrieve the pack's runtime code",
                                  },
                                  "~standard": {
                                    version: 1,
                                    vendor: "zod",
                                  },
                                  _cached: {
                                    shape: {
                                      schema: {
                                        _def: {
                                          value: "pre1",
                                          typeName: "ZodLiteral",
                                          description:
                                            "The pack schema version used",
                                        },
                                        "~standard": {
                                          version: 1,
                                          vendor: "zod",
                                        },
                                      },
                                      name: {
                                        _def: {
                                          checks: [],
                                          typeName: "ZodString",
                                          coerce: false,
                                          description: "The pack name",
                                        },
                                        "~standard": {
                                          version: 1,
                                          vendor: "zod",
                                        },
                                      },
                                      version: {
                                        _def: {
                                          checks: [],
                                          typeName: "ZodString",
                                          coerce: false,
                                          description: "The pack version",
                                        },
                                        "~standard": {
                                          version: 1,
                                          vendor: "zod",
                                        },
                                      },
                                      description: {
                                        _def: {
                                          checks: [],
                                          typeName: "ZodString",
                                          coerce: false,
                                          description: "The pack description",
                                        },
                                        "~standard": {
                                          version: 1,
                                          vendor: "zod",
                                        },
                                      },
                                      url: {
                                        _def: {
                                          unknownKeys: "strip",
                                          catchall: {
                                            _def: {
                                              typeName: "ZodNever",
                                            },
                                            "~standard": {
                                              version: 1,
                                              vendor: "zod",
                                            },
                                          },
                                          typeName: "ZodObject",
                                          description:
                                            "When a pack's excutable code is hosted remotely, this object describes how to download and verify it",
                                        },
                                        "~standard": {
                                          version: 1,
                                          vendor: "zod",
                                        },
                                        _cached: {
                                          shape: {
                                            source: {
                                              _def: {
                                                checks: [],
                                                typeName: "ZodString",
                                                coerce: false,
                                                description:
                                                  "A remote URL for downloading this Pack's executable code",
                                              },
                                              "~standard": {
                                                version: 1,
                                                vendor: "zod",
                                              },
                                            },
                                            signature: {
                                              _def: {
                                                checks: [],
                                                typeName: "ZodString",
                                                coerce: false,
                                                description:
                                                  "A sha-256 signature of the remote URL's content",
                                              },
                                              "~standard": {
                                                version: 1,
                                                vendor: "zod",
                                              },
                                            },
                                          },
                                          keys: ["source", "signature"],
                                        },
                                      },
                                      capture: {
                                        _def: {
                                          keyType: {
                                            _def: {
                                              checks: [],
                                              typeName: "ZodString",
                                              coerce: false,
                                            },
                                            "~standard": {
                                              version: 1,
                                              vendor: "zod",
                                            },
                                          },
                                          valueType: {
                                            _def: {
                                              unknownKeys: "strip",
                                              catchall: {
                                                _def: {
                                                  typeName: "ZodNever",
                                                },
                                                "~standard": {
                                                  version: 1,
                                                  vendor: "zod",
                                                },
                                              },
                                              typeName: "ZodObject",
                                            },
                                            "~standard": {
                                              version: 1,
                                              vendor: "zod",
                                            },
                                            _cached: {
                                              shape: {
                                                type: {
                                                  _def: {
                                                    options: [
                                                      {
                                                        _def: {
                                                          value: "string",
                                                          typeName:
                                                            "ZodLiteral",
                                                        },
                                                        "~standard": {
                                                          version: 1,
                                                          vendor: "zod",
                                                        },
                                                      },
                                                      {
                                                        _def: {
                                                          value: "number",
                                                          typeName:
                                                            "ZodLiteral",
                                                        },
                                                        "~standard": {
                                                          version: 1,
                                                          vendor: "zod",
                                                        },
                                                      },
                                                    ],
                                                    typeName: "ZodUnion",
                                                    description:
                                                      "The type of data to capture",
                                                  },
                                                  "~standard": {
                                                    version: 1,
                                                    vendor: "zod",
                                                  },
                                                },
                                                description: {
                                                  _def: {
                                                    checks: [],
                                                    typeName: "ZodString",
                                                    coerce: false,
                                                  },
                                                  "~standard": {
                                                    version: 1,
                                                    vendor: "zod",
                                                  },
                                                },
                                              },
                                              keys: ["type", "description"],
                                            },
                                          },
                                          typeName: "ZodRecord",
                                          description:
                                            "Describes the data this pack intends to capture",
                                        },
                                        "~standard": {
                                          version: 1,
                                          vendor: "zod",
                                        },
                                      },
                                      permissions: {
                                        _def: {
                                          unknownKeys: "strip",
                                          catchall: {
                                            _def: {
                                              typeName: "ZodNever",
                                            },
                                            "~standard": {
                                              version: 1,
                                              vendor: "zod",
                                            },
                                          },
                                          typeName: "ZodObject",
                                          description:
                                            "The permissions requested for this pack",
                                        },
                                        "~standard": {
                                          version: 1,
                                          vendor: "zod",
                                        },
                                        _cached: {
                                          shape: {
                                            domains: {
                                              _def: {
                                                innerType: {
                                                  _def: {
                                                    type: {
                                                      _def: {
                                                        checks: [],
                                                        typeName: "ZodString",
                                                        coerce: false,
                                                      },
                                                      "~standard": {
                                                        version: 1,
                                                        vendor: "zod",
                                                      },
                                                    },
                                                    minLength: null,
                                                    maxLength: null,
                                                    exactLength: null,
                                                    typeName: "ZodArray",
                                                  },
                                                  "~standard": {
                                                    version: 1,
                                                    vendor: "zod",
                                                  },
                                                },
                                                typeName: "ZodOptional",
                                                description:
                                                  "The domains this pack is allowed to request data from as regular expressions.",
                                              },
                                              "~standard": {
                                                version: 1,
                                                vendor: "zod",
                                              },
                                            },
                                            environment: {
                                              _def: {
                                                innerType: {
                                                  _def: {
                                                    type: {
                                                      _def: {
                                                        checks: [],
                                                        typeName: "ZodString",
                                                        coerce: false,
                                                      },
                                                      "~standard": {
                                                        version: 1,
                                                        vendor: "zod",
                                                      },
                                                    },
                                                    minLength: null,
                                                    maxLength: null,
                                                    exactLength: null,
                                                    typeName: "ZodArray",
                                                  },
                                                  "~standard": {
                                                    version: 1,
                                                    vendor: "zod",
                                                  },
                                                },
                                                typeName: "ZodOptional",
                                                description:
                                                  "The environment variables this pack is allowed to access on the host system",
                                              },
                                              "~standard": {
                                                version: 1,
                                                vendor: "zod",
                                              },
                                            },
                                            request: {
                                              _def: {
                                                innerType: {
                                                  _def: {
                                                    type: {
                                                      _def: {
                                                        checks: [],
                                                        typeName: "ZodString",
                                                        coerce: false,
                                                      },
                                                      "~standard": {
                                                        version: 1,
                                                        vendor: "zod",
                                                      },
                                                    },
                                                    minLength: null,
                                                    maxLength: null,
                                                    exactLength: null,
                                                    typeName: "ZodArray",
                                                  },
                                                  "~standard": {
                                                    version: 1,
                                                    vendor: "zod",
                                                  },
                                                },
                                                typeName: "ZodOptional",
                                                description:
                                                  "During the lifecycle, request access to additional properties such as 'headers' and 'body'",
                                              },
                                              "~standard": {
                                                version: 1,
                                                vendor: "zod",
                                              },
                                            },
                                            response: {
                                              _def: {
                                                innerType: {
                                                  _def: {
                                                    type: {
                                                      _def: {
                                                        checks: [],
                                                        typeName: "ZodString",
                                                        coerce: false,
                                                      },
                                                      "~standard": {
                                                        version: 1,
                                                        vendor: "zod",
                                                      },
                                                    },
                                                    minLength: null,
                                                    maxLength: null,
                                                    exactLength: null,
                                                    typeName: "ZodArray",
                                                  },
                                                  "~standard": {
                                                    version: 1,
                                                    vendor: "zod",
                                                  },
                                                },
                                                typeName: "ZodOptional",
                                                description:
                                                  "During the lifecycle, response access to additional properties such as 'headers' and 'body'",
                                              },
                                              "~standard": {
                                                version: 1,
                                                vendor: "zod",
                                              },
                                            },
                                          },
                                          keys: [
                                            "domains",
                                            "environment",
                                            "request",
                                            "response",
                                          ],
                                        },
                                      },
                                    },
                                    keys: [
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
                                minLength: null,
                                maxLength: null,
                                exactLength: null,
                                typeName: "ZodArray",
                              },
                              "~standard": {
                                version: 1,
                                vendor: "zod",
                              },
                            },
                          },
                          keys: ["schema", "organizationId", "packs"],
                        },
                      },
                      {
                        _def: {
                          unknownKeys: "strip",
                          catchall: {
                            _def: {
                              typeName: "ZodNever",
                            },
                            "~standard": {
                              version: 1,
                              vendor: "zod",
                            },
                          },
                          typeName: "ZodObject",
                          description: "A valid Taskless cloud configuration",
                        },
                        "~standard": {
                          version: 1,
                          vendor: "zod",
                        },
                        _cached: null,
                      },
                    ],
                    typeName: "ZodUnion",
                  },
                  "~standard": {
                    version: 1,
                    vendor: "zod",
                  },
                },
              },
            },
          },
          "404": {
            description: "Default Response",
            content: {
              "application/json": {
                schema: {
                  _def: {
                    unknownKeys: "strip",
                    catchall: {
                      _def: {
                        typeName: "ZodNever",
                      },
                      "~standard": {
                        version: 1,
                        vendor: "zod",
                      },
                    },
                    typeName: "ZodObject",
                  },
                  "~standard": {
                    version: 1,
                    vendor: "zod",
                  },
                  _cached: null,
                },
              },
            },
          },
        },
      },
    },
  },
} as const;
