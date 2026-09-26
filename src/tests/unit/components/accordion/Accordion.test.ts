import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  BaseAccordion,
} from "@components/accordion";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

const components = { AccordionContent, AccordionItem, AccordionTrigger, BaseAccordion };

function mountAccordion(template: string) {
  return mount({ components, template });
}

describe("Accordion (native <details>)", () => {
  it("renders details/summary with content", () => {
    const wrapper = mountAccordion(`
      <BaseAccordion>
        <AccordionItem>
          <AccordionTrigger>Frage</AccordionTrigger>
          <AccordionContent>Antwort</AccordionContent>
        </AccordionItem>
      </BaseAccordion>
    `);
    expect(wrapper.classes()).toContain("c-accordion");
    const details = wrapper.find("details.c-accordion__item");
    expect(details.find("summary.c-accordion__trigger").text()).toBe("Frage");
    expect(details.find(".c-accordion__content").text()).toBe("Antwort");
    expect(details.attributes("open")).toBeUndefined();
  });

  it("passes name (exclusive group) and open through to <details>", () => {
    const wrapper = mountAccordion(`
      <BaseAccordion>
        <AccordionItem name="faq" open><AccordionTrigger>a</AccordionTrigger></AccordionItem>
        <AccordionItem name="faq"><AccordionTrigger>b</AccordionTrigger></AccordionItem>
      </BaseAccordion>
    `);
    const [first, second] = wrapper.findAll("details");
    expect(first.attributes("name")).toBe("faq");
    expect(second.attributes("name")).toBe("faq");
    expect(first.element.open).toBe(true);
    expect(second.element.open).toBe(false);
  });

  it("wraps the label in a heading when level is set", () => {
    const wrapper = mount(AccordionTrigger, { props: { level: 3 }, slots: { default: "Frage" } });
    expect(wrapper.find("h3.c-accordion__trigger-label").text()).toBe("Frage");
  });

  it("uses a span label and the default chevron without level", () => {
    const wrapper = mount(AccordionTrigger, { slots: { default: "Frage" } });
    expect(wrapper.find("span.c-accordion__trigger-label").exists()).toBe(true);
    expect(wrapper.find(".c-accordion__trigger-icon").attributes("aria-hidden")).toBe("true");
  });

  it("replaces the icon via the icon slot", () => {
    const wrapper = mount(AccordionTrigger, {
      slots: { default: "Frage", icon: '<i data-test="icon" />' },
    });
    expect(wrapper.find("[data-test='icon']").exists()).toBe(true);
  });
});
