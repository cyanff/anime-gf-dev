import { Provider } from "@/lib/provider/provider";
import { Result } from "@shared/utils";
import { Messages, CompletionConfig } from "@/lib/provider/provider";

const models = ["gpt-3.5-turbo", "gpt-4.0-turbo-preview"];
interface ChatCompletion {
  id: string;
  object: "chat.completion";
  created: number;
  model: string;
  system_fingerprint: string;
  choices: Choice[];
  usage: Usage;
}
interface Choice {
  index: number;
  message: Message;
  logprobs: null;
  finish_reason: string;
}
interface Message {
  role: "user" | "assistant";
  content: string;
}
interface Usage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

function getModels(): string[] {
  return [...models];
}

// TODO add system message to the messages array if specifed
async function getChatCompletion(messages: Messages, config: CompletionConfig): Promise<Result<string, Error>> {
  const validationRes = await validateConfig(config);
  if (validationRes.kind == "err") {
    return validationRes;
  }

  // Get API key from either config or secret store
  let key;
  if (!config.apiKey) {
    const keyRes = await window.api.secret.get("openai");
    if (keyRes.kind == "err") {
      return keyRes;
    }
    key = keyRes.value;
  } else {
    key = config.apiKey;
  }

  const url = "https://api.openai.com/v1/chat/completions";
  const headers = {
    Authorization: `Bearer ${key}`
  };

  // Append a system prompt if specified
  const reqMessages = config.system ? [{ role: "system", content: config.system }, ...messages] : messages;
  const body = {
    model: config.model,
    messages: reqMessages
  };

  const completionRes = await window.api.xfetch.post(url, body, headers);
  if (completionRes.kind == "err") {
    return completionRes;
  }

  const completion = completionRes.value as ChatCompletion;
  return { kind: "ok", value: completion.choices[0].message.content };
}

async function streamChatCompletion(): Promise<any> {
  throw new Error("Not implemented");
}

async function getTextCompletion(): Promise<Result<string, Error>> {
  throw new Error("Not implemented");
}

async function validateConfig(config: CompletionConfig): Promise<Result<void, Error>> {
  if (!models.includes(config.model)) {
    return { kind: "err", error: new Error("Invalid model specified in CompletionConfig") };
  }
  return { kind: "ok", value: undefined };
}

export const openAI: Provider = {
  getModels,
  getChatCompletion,
  streamChatCompletion,
  getTextCompletion
};