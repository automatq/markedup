// Simple in-memory store for passing template content between pages.
// Works because Next.js client-side navigation preserves JS module state.

let pending: any = null;

export function setPendingTemplate(content: any) {
  pending = content;
}

export function consumePendingTemplate(): any {
  const c = pending;
  pending = null;
  return c;
}
