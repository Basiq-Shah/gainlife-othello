export type Keys = { openai: string, anthropic: string, gemini: string }

export async function loadKeys(): Promise<Keys> {
  const res = await fetch('/keys.json');
  if (!res.ok) throw new Error('Could not load keys.json');
  return (await res.json()) as Keys;
}