import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * The Tailwind theme defines CUSTOM font-size tokens (text-body-md, text-body-sm,
 * text-title-sm, …). tailwind-merge doesn't know these are font sizes, so by
 * default it lumps them into the same conflict group as text COLORS — which made
 * a later `text-body-sm` (e.g. from a `size="sm"` button) silently strip an
 * earlier `text-white`, leaving primary buttons with inherited dark text.
 *
 * Registering the tokens in the `font-size` group keeps colour and size in
 * separate groups, so `text-white` is never dropped.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "label-upper",
            "body-sm",
            "body-md",
            "title-sm",
            "headline-md",
            "display-lg",
          ],
        },
      ],
    },
  },
});

/** Merge conditional class names, de-duplicating conflicting Tailwind utils. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
