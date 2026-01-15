Model need to test: 
grok-4-1-fast-reasoning
grok-code-fast-1
grok-4-fast-reasoning
grok-4-0709
grok-3-maintain
grok-3
grok-2-vision-1212

Phase 1 - zero-shot prompt:
Extract requirements related to the ${title} from this text document.

TC Model -> grok-4-0709

Phase 2 - prompt evaluation:

TC Model with: 6 zero-shot, 6 few-shot, 6 chain-of-thought
Output file -> evaluations -> [0 -> zero-shot 1], [1 -> zero-shot 2] ... [6 -> few-shot 1]...