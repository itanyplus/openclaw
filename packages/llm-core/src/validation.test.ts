import { describe, expect, it } from "vitest";
import type { Tool } from "./types.js";
import { validateToolArguments } from "./validation.js";

const decimalTool = {
  name: "decimal-tool",
  description: "test tool",
  parameters: {
    type: "object",
    properties: {
      amount: { type: "number" },
      count: { type: "integer" },
    },
    required: ["amount", "count"],
    additionalProperties: false,
  },
} as Tool;

function makeUnreadableParameterTool(): Tool {
  const tool = {
    name: "broken-tool",
    description: "broken test tool",
    parameters: {
      type: "object",
      properties: {},
    },
  };
  Object.defineProperty(tool, "parameters", {
    enumerable: true,
    get() {
      throw new Error("fuzzplugin parameters getter exploded");
    },
  });
  return tool as Tool;
}

function makeUnreadableNestedSchemaTool(): Tool {
  const parameters = {
    type: "object",
    properties: {},
  };
  Object.defineProperty(parameters, "properties", {
    enumerable: true,
    get() {
      throw new Error("fuzzplugin properties getter exploded");
    },
  });
  return {
    name: "nested-broken-tool",
    description: "nested broken test tool",
    parameters,
  } as unknown as Tool;
}

describe("validateToolArguments", () => {
  it("coerces strict decimal numeric strings for plain JSON schemas", () => {
    expect(
      validateToolArguments(decimalTool, {
        type: "toolCall",
        id: "call-1",
        name: "decimal-tool",
        arguments: { amount: "1e3", count: "+3" },
      }),
    ).toEqual({ amount: 1000, count: 3 });
  });

  it("rejects non-decimal numeric strings for plain JSON schemas", () => {
    expect(() =>
      validateToolArguments(decimalTool, {
        type: "toolCall",
        id: "call-1",
        name: "decimal-tool",
        arguments: { amount: "0x10", count: "0b10" },
      }),
    ).toThrow(/Validation failed for tool "decimal-tool"/);
  });

  it("reports unreadable tool parameters as validation failure", () => {
    expect(() =>
      validateToolArguments(makeUnreadableParameterTool(), {
        type: "toolCall",
        id: "call-1",
        name: "broken-tool",
        arguments: {},
      }),
    ).toThrow(
      /Validation failed for tool "broken-tool":\n {2}- parameters: schema could not be read or compiled/,
    );
  });

  it("reports unreadable nested schemas as validation failure", () => {
    expect(() =>
      validateToolArguments(makeUnreadableNestedSchemaTool(), {
        type: "toolCall",
        id: "call-1",
        name: "nested-broken-tool",
        arguments: {},
      }),
    ).toThrow(
      /Validation failed for tool "nested-broken-tool":\n {2}- parameters: schema could not be read or compiled/,
    );
  });
});
