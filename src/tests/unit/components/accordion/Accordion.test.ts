import AccordionContent from "@components/accordion/AccordionContent.vue";
import AccordionHeader from "@components/accordion/AccordionHeader.vue";
import AccordionItem from "@components/accordion/AccordionItem.vue";
import AccordionTrigger from "@components/accordion/AccordionTrigger.vue";
import BaseAccordion from "@components/accordion/BaseAccordion.vue";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

const components = { AccordionContent, AccordionHeader, AccordionItem, AccordionTrigger, BaseAccordion };

function mountAccordion(template: string) {
  return mount({ template, components });
}

describe("BaseAccordion", () => {
  it("renders .c-accordion wrapper", () => {
    const wrapper = mount(BaseAccordion);
    expect(wrapper.classes()).toContain("c-accordion");
  });

  it("v-slot exposes isOpen and toggle", async () => {
    const wrapper = mountAccordion(`
      <BaseAccordion type="multiple" v-slot="{ isOpen, toggle }">
        <button data-test="btn" @click="toggle('x')">toggle</button>
        <span data-test="state">{{ isOpen('x') }}</span>
      </BaseAccordion>
    `);
    expect(wrapper.find("[data-test='state']").text()).toBe("false");
    await wrapper.find("[data-test='btn']").trigger("click");
    expect(wrapper.find("[data-test='state']").text()).toBe("true");
  });

  it("type=single closes other items on open", async () => {
    const wrapper = mountAccordion(`
      <BaseAccordion type="single" v-slot="{ isOpen, toggle }">
        <button data-test="a" @click="toggle('a')">a</button>
        <button data-test="b" @click="toggle('b')">b</button>
        <span data-test="state-a">{{ isOpen('a') }}</span>
        <span data-test="state-b">{{ isOpen('b') }}</span>
      </BaseAccordion>
    `);
    await wrapper.find("[data-test='a']").trigger("click");
    expect(wrapper.find("[data-test='state-a']").text()).toBe("true");
    await wrapper.find("[data-test='b']").trigger("click");
    expect(wrapper.find("[data-test='state-a']").text()).toBe("false");
    expect(wrapper.find("[data-test='state-b']").text()).toBe("true");
  });

  it("type=multiple allows multiple open", async () => {
    const wrapper = mountAccordion(`
      <BaseAccordion type="multiple" v-slot="{ isOpen, toggle }">
        <button data-test="a" @click="toggle('a')">a</button>
        <button data-test="b" @click="toggle('b')">b</button>
        <span data-test="state-a">{{ isOpen('a') }}</span>
        <span data-test="state-b">{{ isOpen('b') }}</span>
      </BaseAccordion>
    `);
    await wrapper.find("[data-test='a']").trigger("click");
    await wrapper.find("[data-test='b']").trigger("click");
    expect(wrapper.find("[data-test='state-a']").text()).toBe("true");
    expect(wrapper.find("[data-test='state-b']").text()).toBe("true");
  });

  it("type=single collapsible allows closing last open item", async () => {
    const wrapper = mountAccordion(`
      <BaseAccordion type="single" collapsible v-slot="{ isOpen, toggle }">
        <button data-test="a" @click="toggle('a')">a</button>
        <span data-test="state">{{ isOpen('a') }}</span>
      </BaseAccordion>
    `);
    await wrapper.find("[data-test='a']").trigger("click");
    expect(wrapper.find("[data-test='state']").text()).toBe("true");
    await wrapper.find("[data-test='a']").trigger("click");
    expect(wrapper.find("[data-test='state']").text()).toBe("false");
  });

  it("type=single non-collapsible cannot close last open item", async () => {
    const wrapper = mountAccordion(`
      <BaseAccordion type="single" v-slot="{ isOpen, toggle }">
        <button data-test="a" @click="toggle('a')">a</button>
        <span data-test="state">{{ isOpen('a') }}</span>
      </BaseAccordion>
    `);
    await wrapper.find("[data-test='a']").trigger("click");
    expect(wrapper.find("[data-test='state']").text()).toBe("true");
    await wrapper.find("[data-test='a']").trigger("click");
    expect(wrapper.find("[data-test='state']").text()).toBe("true");
  });

  it("watcher ignores modelValue change to undefined, preserving open state (covers line 42 false branch)", async () => {
    const wrapper = mount({
      components,
      data() {
        return { modelVal: "a" as string | undefined };
      },
      template: `
        <BaseAccordion type="single" :model-value="modelVal" v-slot="{ isOpen }">
          <span data-test="state">{{ isOpen('a') }}</span>
        </BaseAccordion>
      `,
    });
    expect(wrapper.find("[data-test='state']").text()).toBe("true");
    await wrapper.setData({ modelVal: undefined });
    // watcher fires with undefined → guard is false → openIds unchanged → still open
    expect(wrapper.find("[data-test='state']").text()).toBe("true");
  });

  it("defaultValue sets initial open state", () => {
    const wrapper = mountAccordion(`
      <BaseAccordion type="single" default-value="a" v-slot="{ isOpen }">
        <span data-test="state">{{ isOpen('a') }}</span>
      </BaseAccordion>
    `);
    expect(wrapper.find("[data-test='state']").text()).toBe("true");
  });

  it("defaultValue as array opens multiple items (covers line 34 Array.isArray true branch)", () => {
    const wrapper = mountAccordion(`
      <BaseAccordion type="multiple" :default-value="['a', 'b']" v-slot="{ isOpen }">
        <span data-test="state-a">{{ isOpen('a') }}</span>
        <span data-test="state-b">{{ isOpen('b') }}</span>
      </BaseAccordion>
    `);
    expect(wrapper.find("[data-test='state-a']").text()).toBe("true");
    expect(wrapper.find("[data-test='state-b']").text()).toBe("true");
  });

  it("watcher updates openIds when modelValue changes to a non-undefined value (covers line 42 true branch)", async () => {
    const wrapper = mount({
      components,
      data() {
        return { modelVal: "a" as string | undefined };
      },
      template: `
        <BaseAccordion type="single" :model-value="modelVal" v-slot="{ isOpen }">
          <span data-test="state-a">{{ isOpen('a') }}</span>
          <span data-test="state-b">{{ isOpen('b') }}</span>
        </BaseAccordion>
      `,
    });
    expect(wrapper.find("[data-test='state-a']").text()).toBe("true");
    await wrapper.setData({ modelVal: "b" });
    expect(wrapper.find("[data-test='state-a']").text()).toBe("false");
    expect(wrapper.find("[data-test='state-b']").text()).toBe("true");
  });
});

describe("AccordionHeader", () => {
  it("renders as div by default", () => {
    const wrapper = mount(AccordionHeader);
    expect(wrapper.element.tagName).toBe("DIV");
    expect(wrapper.classes()).toContain("c-accordion__header");
  });

  it.each([1, 2, 3, 4, 5, 6] as const)("renders as h%i when level=%i", (level) => {
    const wrapper = mount(AccordionHeader, { props: { level } });
    expect(wrapper.element.tagName).toBe(`H${level}`);
  });

  it("renders slot content", () => {
    const wrapper = mount(AccordionHeader, { slots: { default: "Heading text" } });
    expect(wrapper.text()).toBe("Heading text");
  });
});

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

  it("adds is-disabled class when disabled", () => {
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

  it("toggle() called directly on disabled AccordionItem is a no-op (covers line 40 false branch)", async () => {
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
});

describe("AccordionTrigger", () => {
  it("throws when mounted outside AccordionItem (covers line 30 throw branch)", () => {
    expect(() => mount(AccordionTrigger)).toThrow(
      "AccordionTrigger must be inside AccordionItem",
    );
  });

  function mountTrigger(open = false) {
    return mountAccordion(`
      <BaseAccordion type="single" :default-value="'item'" v-if="${open}">
        <AccordionItem value="item">
          <AccordionTrigger>Label</AccordionTrigger>
          <AccordionContent>Content</AccordionContent>
        </AccordionItem>
      </BaseAccordion>
      <BaseAccordion type="single" v-else>
        <AccordionItem value="item">
          <AccordionTrigger>Label</AccordionTrigger>
          <AccordionContent>Content</AccordionContent>
        </AccordionItem>
      </BaseAccordion>
    `);
  }

  it("renders a button", () => {
    const wrapper = mountAccordion(`
      <BaseAccordion>
        <AccordionItem value="x">
          <AccordionTrigger>Label</AccordionTrigger>
        </AccordionItem>
      </BaseAccordion>
    `);
    expect(wrapper.find("button.c-accordion__trigger").exists()).toBe(true);
  });

  it("aria-expanded is false when closed", () => {
    const wrapper = mountAccordion(`
      <BaseAccordion>
        <AccordionItem value="x">
          <AccordionTrigger>Label</AccordionTrigger>
        </AccordionItem>
      </BaseAccordion>
    `);
    expect(wrapper.find(".c-accordion__trigger").attributes("aria-expanded")).toBe("false");
  });

  it("aria-expanded is true after click", async () => {
    const wrapper = mountAccordion(`
      <BaseAccordion type="single" collapsible>
        <AccordionItem value="x">
          <AccordionTrigger>Label</AccordionTrigger>
        </AccordionItem>
      </BaseAccordion>
    `);
    await wrapper.find(".c-accordion__trigger").trigger("click");
    expect(wrapper.find(".c-accordion__trigger").attributes("aria-expanded")).toBe("true");
  });

  it("aria-controls matches AccordionContent id", () => {
    const wrapper = mountAccordion(`
      <BaseAccordion>
        <AccordionItem value="x">
          <AccordionTrigger>Label</AccordionTrigger>
          <AccordionContent>Content</AccordionContent>
        </AccordionItem>
      </BaseAccordion>
    `);
    const triggerControls = wrapper.find(".c-accordion__trigger").attributes("aria-controls");
    const contentId = wrapper.find(".c-accordion__body").attributes("id");
    expect(triggerControls).toBe(contentId);
    expect(triggerControls).toBeTruthy();
  });

  it("renders slot content as label", () => {
    const wrapper = mountAccordion(`
      <BaseAccordion>
        <AccordionItem value="x">
          <AccordionTrigger>My Label</AccordionTrigger>
        </AccordionItem>
      </BaseAccordion>
    `);
    expect(wrapper.find(".c-accordion__trigger-label").text()).toBe("My Label");
  });
});

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

  it("isOpen defaults to false when no open prop and no AccordionItem context (covers ?? false branch)", () => {
    const wrapper = mount(AccordionContent);
    expect(wrapper.find(".c-accordion__body").classes()).not.toContain("is-open");
  });

  it("standalone :open=true adds is-open class", () => {
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

  it("isOpen is true when inside an open AccordionItem (covers itemCtx?.isOpen.value true branch)", () => {
    const wrapper = mountAccordion(`
      <BaseAccordion type="single" default-value="x">
        <AccordionItem value="x">
          <AccordionContent>Body</AccordionContent>
        </AccordionItem>
      </BaseAccordion>
    `);
    expect(wrapper.find(".c-accordion__item").classes()).toContain("is-open");
    expect(wrapper.find(".c-accordion__body").exists()).toBe(true);
  });

  it("isOpen computed returns false when inside a closed AccordionItem (covers line 26 itemCtx exists + isOpen false)", () => {
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
