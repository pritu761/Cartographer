import OpenAI from "openai";
import { wrapOpenAI } from "langsmith/wrappers";

/**
 * Single place where the AI client is constructed and traced.
 * Rule: One place constructs the AI client. Anywhere else silently skips tracing.
 */
function createTracedOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY || "dummy_key_for_mock";

  const rawClient = new OpenAI({
    apiKey,
  });

  // Only wrap with LangSmith tracing if LangSmith or OpenAI keys are present,
  // or wrap unconditionally to capture local run traces
  try {
    return wrapOpenAI(rawClient);
  } catch {
    return rawClient;
  }
}

export const tracedOpenAIClient = createTracedOpenAIClient();
