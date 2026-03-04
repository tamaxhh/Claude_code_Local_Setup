/**
 * fromOllama.js
 * Converts an Ollama /api/chat response → Anthropic /v1/messages response format.
 *
 * Ollama response:
 * {
 *   model, message: { role, content }, done, done_reason,
 *   prompt_eval_count, eval_count
 * }
 *
 * Anthropic response:
 * {
 *   id, type, role, content: [{type, text}],
 *   model, stop_reason, stop_sequence,
 *   usage: { input_tokens, output_tokens }
 * }
 */

let messageCounter = 0;

function fromOllama(ollamaResponse, requestedModel) {
    messageCounter++;
    const id = `msg_local_${Date.now()}_${messageCounter}`;

    const text = ollamaResponse.message?.content || '';
    const stopReason = ollamaResponse.done_reason === 'stop' ? 'end_turn' : 'max_tokens';

    return {
        id,
        type: 'message',
        role: 'assistant',
        content: [
            {
                type: 'text',
                text,
            },
        ],
        model: requestedModel || ollamaResponse.model || 'local-model',
        stop_reason: stopReason,
        stop_sequence: null,
        usage: {
            input_tokens: ollamaResponse.prompt_eval_count || 0,
            output_tokens: ollamaResponse.eval_count || 0,
        },
    };
}

/**
 * For streaming: converts a single Ollama streaming chunk → Anthropic SSE chunk.
 * Ollama stream chunk: { model, message: { role, content }, done }
 */
function fromOllamaStreamChunk(chunk, index) {
    if (index === 0) {
        // First chunk: send message_start + content_block_start
        return [
            { type: 'message_start', message: { id: `msg_local_${Date.now()}`, type: 'message', role: 'assistant', content: [], model: chunk.model, usage: { input_tokens: 0 } } },
            { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } },
        ];
    }

    if (chunk.done) {
        return [
            { type: 'content_block_stop', index: 0 },
            { type: 'message_delta', delta: { stop_reason: 'end_turn', stop_sequence: null }, usage: { output_tokens: chunk.eval_count || 0 } },
            { type: 'message_stop' },
        ];
    }

    return [
        { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: chunk.message?.content || '' } },
    ];
}

module.exports = { fromOllama, fromOllamaStreamChunk };
