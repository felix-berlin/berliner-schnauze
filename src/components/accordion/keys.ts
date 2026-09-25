import type { ComputedRef, InjectionKey } from "vue";

export interface AccordionContext {
  type: "single" | "multiple";
  isOpen: (id: string | number) => boolean;
  toggle: (id: string | number) => void;
}

export interface AccordionItemContext {
  value: string | number;
  isOpen: ComputedRef<boolean>;
  toggle: () => void;
  triggerId: string;
  contentId: string;
  disabled: ComputedRef<boolean>;
}

export const ACCORDION_KEY: InjectionKey<AccordionContext> = Symbol("accordion");
export const ACCORDION_ITEM_KEY: InjectionKey<AccordionItemContext> = Symbol("accordion-item");
