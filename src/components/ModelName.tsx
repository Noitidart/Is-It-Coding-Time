import type { ModelConfig } from '../time';

// Matches the source URL embedded in a model's name parenthetical,
// e.g. "GLM (Z.AI - https://z.ai)" or "DeepSeek (https://deepseek.com)".
const URL_PART = /(https?:\/\/[^\s)]+)/;

// Renders the model name with the embedded URL turned into a clickable
// link. The protocol prefix is stripped visually — the href keeps it.
export default function ModelName({ model }: { model: ModelConfig }) {
  const [before, url, after] = model.name.split(URL_PART);
  if (!url) {
    return <>{model.name}</>;
  }
  return (
    <>
      {before}
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="underline decoration-zinc-300 underline-offset-4 hover:text-zinc-700 hover:decoration-zinc-500 dark:decoration-zinc-600 dark:hover:text-zinc-200"
      >
        {url.replace(/^https?:\/\//, '')}
      </a>
      {after}
    </>
  );
}
