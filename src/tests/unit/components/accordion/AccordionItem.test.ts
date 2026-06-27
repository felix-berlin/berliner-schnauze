import AccordionContent from "@components/accordion/AccordionContent.vue";
import AccordionItem from "@components/accordion/AccordionItem.vue";
import AccordionTrigger from "@components/accordion/AccordionTrigger.vue";
import BaseAccordion from "@components/accordion/BaseAccordion.vue";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

const components = { AccordionContent, AccordionItem, AccordionTrigger, BaseAccordion };

function mountAccordion(template: string) {
  return mount({ template, components });
}

describe("AccordionItem", () => {
  it("throws when mounted outside BaseAccordion (covers line 31 throw branch)", () => {
    expect(() => mount(AccordionItem, { props: { value: "x" } })).toThrow(
      "AccordionItem must be inside BaseAccordion",
    );
  });

  it("renders .c-accordion__item", () => {
    const wrapper = mountAccordion(`
      <BaseAccordion><AccordionItem value="x" /></BaseAccordion>
    `);
    expect(wrapper.find(".c-accordion__item").exists()).toBe(true);
  });

  it("disabled defaults to false when prop is omitted (covers ?? false branch on line 37)", () => {
    // No disabled prop → computed returns false → no is-disabled class
    const wrapper = mountAccordion(`
      <BaseAccordion><AccordionItem value="x" /></BaseAccordion>
    `);
    expect(wrapper.find(".c-accordion__item").classes()).not.toContain("is-disabled");
  });

  it("adds is-open class when open", async () => {
    const wrapper = mountAccordion(`
      <BaseAccordion type="single" v-slot="{ toggle }">
        <AccordionItem value="x">
          <button data-test="btn" @click="toggle('x')">t</button>
        </AccordionItem>
      </BaseAccordion>
    `);
    expect(wrapper.find(".c-accordion__item").classes()).not.toContain("is-open");
    await wrapper.find("[data-test='btn']").trigger("click");
    expect(wrapper.find(".c-accordion__item").classes()).toContain("is-open");
  });

  it("adds is-disabled class when disabled prop is true (covers ?? branch truthy side)", () => {
    const wrapper = mountAccordion(`
      <BaseAccordion><AccordionItem value="x" disabled /></BaseAccordion>
    `);
    expect(wrapper.find(".c-accordion__item").classes()).toContain("is-disabled");
  });

  it("disabled item cannot be toggled via AccordionTrigger", async () => {
    const wrapper = mountAccordion(`
      <BaseAccordion type="single" collapsible>
        <AccordionItem value="x" disabled>
          <AccordionTrigger>Label</AccordionTrigger>
        </AccordionItem>
      </BaseAccordion>
    `);
    await wrapper.find(".c-accordion__trigger").trigger("click");
    expect(wrapper.find(".c-accordion__item").classes()).not.toContain("is-open");
  });

  it("toggle() on a disabled item is a no-op (covers line 40 false branch)", async () => {
    const wrapper = mountAccordion(`
      <BaseAccordion type="single" collapsible>
        <AccordionItem value="x" disabled />
      </BaseAccordion>
    `);
    const itemWrapper = wrapper.findComponent(AccordionItem);
    const { toggle } = (itemWrapper.getCurrentComponent() as any).setupState;
    toggle();
    expect(wrapper.find(".c-accordion__item").classes()).not.toContain("is-open");
  });

  it("toggle() on an enabled item opens it (covers line 40 true branch)", async () => {
    const wrapper = mountAccordion(`
      <BaseAccordion type="single" collapsible>
        <AccordionItem value="x" />
      </BaseAccordion>
    `);
    const itemWrapper = wrapper.findComponent(AccordionItem);
    const { toggle } = (itemWrapper.getCurrentComponent() as any).setupState;
    toggle();
    await new Promise((r) => setTimeout(r, 0));
    expect(wrapper.find(".c-accordion__item").classes()).toContain("is-open");
  });
});
