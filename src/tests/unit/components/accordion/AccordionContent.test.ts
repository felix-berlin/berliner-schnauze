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

describe("AccordionContent", () => {
  it("renders .c-accordion__body and .c-accordion__content", () => {
    const wrapper = mountAccordion(`
      <BaseAccordion>
        <AccordionItem value="x">
          <AccordionContent>Body</AccordionContent>
        </AccordionItem>
      </BaseAccordion>
    `);
    expect(wrapper.find(".c-accordion__body").exists()).toBe(true);
    expect(wrapper.find(".c-accordion__content").exists()).toBe(true);
  });

  it("has role=region", () => {
    const wrapper = mountAccordion(`
      <BaseAccordion>
        <AccordionItem value="x">
          <AccordionContent>Body</AccordionContent>
        </AccordionItem>
      </BaseAccordion>
    `);
    expect(wrapper.find(".c-accordion__body").attributes("role")).toBe("region");
  });

  it("aria-labelledby matches trigger id", () => {
    const wrapper = mountAccordion(`
      <BaseAccordion>
        <AccordionItem value="x">
          <AccordionTrigger>Label</AccordionTrigger>
          <AccordionContent>Body</AccordionContent>
        </AccordionItem>
      </BaseAccordion>
    `);
    const triggerId = wrapper.find(".c-accordion__trigger").attributes("id");
    const labelledBy = wrapper.find(".c-accordion__body").attributes("aria-labelledby");
    expect(labelledBy).toBe(triggerId);
    expect(labelledBy).toBeTruthy();
  });

  it("isOpen defaults to false (covers ?? false branch) when mounted without accordion context and without open prop", () => {
    // No inject("accordion-item") context, no open prop → computed falls through to ?? false
    const wrapper = mount(AccordionContent);
    expect(wrapper.find(".c-accordion__body").classes()).not.toContain("is-open");
  });

  it("standalone :open=true adds is-open class (covers props.open ?? branch)", () => {
    // itemCtx is null, so isOpen = props.open ?? false → true
    const wrapper = mount(AccordionContent, { props: { open: true } });
    expect(wrapper.find(".c-accordion__body").classes()).toContain("is-open");
  });

  it("standalone :open=false has no is-open class", () => {
    const wrapper = mount(AccordionContent, { props: { open: false } });
    expect(wrapper.find(".c-accordion__body").classes()).not.toContain("is-open");
  });

  it("renders slot content", () => {
    const wrapper = mountAccordion(`
      <BaseAccordion>
        <AccordionItem value="x">
          <AccordionContent>Slot text</AccordionContent>
        </AccordionItem>
      </BaseAccordion>
    `);
    expect(wrapper.find(".c-accordion__content").text()).toBe("Slot text");
  });

  it("isOpen reflects itemCtx.isOpen when inside an open AccordionItem (covers itemCtx?.isOpen.value branch)", () => {
    const wrapper = mountAccordion(`
      <BaseAccordion type="single" default-value="x">
        <AccordionItem value="x">
          <AccordionContent>Body</AccordionContent>
        </AccordionItem>
      </BaseAccordion>
    `);
    // When itemCtx exists, isOpen class is NOT applied to .c-accordion__body (template: !itemCtx && isOpen)
    // but the item itself has is-open
    expect(wrapper.find(".c-accordion__item").classes()).toContain("is-open");
    expect(wrapper.find(".c-accordion__body").exists()).toBe(true);
  });

  it("isOpen computed returns false when inside a closed AccordionItem (covers itemCtx?.isOpen.value = false branch)", () => {
    const wrapper = mountAccordion(`
      <BaseAccordion type="single">
        <AccordionItem value="x">
          <AccordionContent>Body</AccordionContent>
        </AccordionItem>
      </BaseAccordion>
    `);
    expect(wrapper.find(".c-accordion__item").classes()).not.toContain("is-open");
    expect(wrapper.find(".c-accordion__body").exists()).toBe(true);
  });
});
