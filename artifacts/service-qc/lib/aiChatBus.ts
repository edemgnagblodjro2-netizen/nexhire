type Listener = () => void;

const listeners = new Set<Listener>();

export function openAIChat() {
  listeners.forEach((l) => l());
}

export function subscribeOpenAIChat(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
