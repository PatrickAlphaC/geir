const ESC = String.fromCharCode(27);

let colorEnabled = process.stdout.isTTY === true && !process.env["NO_COLOR"];
let quietMode = false;

export function configureLog(opts: { color?: boolean; quiet?: boolean }): void {
  if (opts.color !== undefined) colorEnabled = opts.color;
  if (opts.quiet !== undefined) quietMode = opts.quiet;
}

function paint(code: string, text: string): string {
  return colorEnabled ? `${ESC}[${code}m${text}${ESC}[0m` : text;
}

function out(line: string): void {
  process.stdout.write(`${line}\n`);
}

function err(line: string): void {
  process.stderr.write(`${line}\n`);
}

export const log = {
  info: (msg: string): void => {
    if (!quietMode) out(msg);
  },
  step: (msg: string): void => {
    if (!quietMode) out(`${paint("36", "▸")} ${msg}`);
  },
  ok: (msg: string): void => {
    if (!quietMode) out(`${paint("32", "✓")} ${msg}`);
  },
  warn: (msg: string): void => {
    err(`${paint("33", "⚠")} ${msg}`);
  },
  error: (msg: string): void => {
    err(`${paint("31", "✗")} ${msg}`);
  },
  plain: out,
};

export function humanBytes(bytes: number): string {
  const units = ["B", "KB", "MB", "GB"];
  let n = bytes;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i += 1;
  }
  return `${n.toFixed(n >= 10 || i === 0 ? 0 : 1)} ${units[i] ?? "B"}`;
}
