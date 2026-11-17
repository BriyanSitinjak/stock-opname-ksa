export function evaluateQtyNote(expression: string): string | null {
  const normalized = expression.replace(/×/g, "*").replace(/x/gi, "*").replace(/\s+/g, "");
  if (!normalized || !/^[0-9.+\-*/]+$/.test(normalized)) {
    return null;
  }
  const tokens = normalized.match(/(\d+\.?\d*|[+\-*/])/g);
  if (!tokens || tokens.length === 0) {
    return null;
  }
  const values: number[] = [];
  const ops: string[] = [];
  for (const token of tokens) {
    if (token === "+" || token === "-" || token === "*" || token === "/") {
      ops.push(token);
    } else {
      values.push(Number(token));
    }
  }
  if (values.length !== ops.length + 1) {
    return null;
  }
  let i = 0;
  while (i < ops.length) {
    if (ops[i] === "*" || ops[i] === "/") {
      const left = values[i] ?? 0;
      const right = values[i + 1] ?? 0;
      const next = ops[i] === "*" ? left * right : right === 0 ? null : left / right;
      if (next == null || !Number.isFinite(next)) {
        return null;
      }
      values.splice(i, 2, next);
      ops.splice(i, 1);
    } else {
      i += 1;
    }
  }
  let result = values[0] ?? 0;
  for (let j = 0; j < ops.length; j += 1) {
    const right = values[j + 1] ?? 0;
    result = ops[j] === "+" ? result + right : result - right;
  }
  if (!Number.isFinite(result) || result < 0) {
    return null;
  }
  return String(result);
}
