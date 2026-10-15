/**
 * Variables de entorno (configuradas en Netlify > Site configuration > Environment variables).
 * Las llaves solo existen en el servidor; nunca se envían al navegador.
 */

declare const Netlify: { env: { get(name: string): string | undefined } };

export function env(name: string, fallback = ""): string {
  const value = typeof Netlify !== "undefined" ? Netlify.env.get(name) : undefined;
  return value ?? fallback;
}

export function settings() {
  return {
    anthropicApiKey: env("ANTHROPIC_API_KEY"),
    anthropicModel: env("ANTHROPIC_MODEL", "claude-opus-5-5"),
    anthropicMaxTokens: Number(env("ANTHROPIC_MAX_TOKENS", "4096")),
  };
}
