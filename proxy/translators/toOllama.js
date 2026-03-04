/**
 * toOllama.js
 * Converts an Anthropic-style /v1/messages request body → Ollama /api/chat format.
 *
 * Anthropic format:
 * {
 *   model, system, messages: [{role, content}], max_tokens, temperature, stream
 * }
 *
 * Ollama format:
 * {
 *   model, messages: [{role, content}], stream, options: { temperature, num_predict }
 * }
 */

function toOllama(anthropicBody, overrideModel) {
  const { model, system, messages, max_tokens, temperature, stream } = anthropicBody;

  // Build Ollama messages array
  const ollamaMessages = [];

  // If there's a system prompt, prepend it as a system message
  if (system) {
    ollamaMessages.push({ role: 'system', content: system });
  }

  // Convert Anthropic messages → Ollama messages
  for (const msg of messages || []) {
    // Anthropic content can be a string or an array of content blocks
    let content = '';
    if (typeof msg.content === 'string') {
      content = msg.content;
    } else if (Array.isArray(msg.content)) {
      // Extract text from content blocks
      content = msg.content
        .filter((block) => block.type === 'text')
        .map((block) => block.text)
        .join('\n');
    }
    ollamaMessages.push({ role: msg.role, content });
  }

  return {
    model: overrideModel || model,
    messages: ollamaMessages,
    stream: stream === true,
    options: {
      temperature: temperature ?? 0.7,
      num_predict: max_tokens ?? 4096,
    },
  };
}

module.exports = { toOllama };
