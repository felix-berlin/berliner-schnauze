import NavList from "@components/NavList.vue";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { defineComponent } from "vue";

describe("NavList.vue", () => {
  const linkItems = [
    { link: "/about", title: "About" },
    { link: "/contact", title: "Contact" },
  ];

  const externalLinkItems = [
    { link: "https://example.com", title: "External" },
    { link: "http://another.com", title: "Another External" },
  ];

  it("renders a nav element", () => {
    const wrapper = mount(NavList, { props: { items: linkItems } });
    expect(wrapper.find("nav").exists()).toBe(true);
  });

  it("renders the correct number of list items", () => {
    const wrapper = mount(NavList, { props: { items: linkItems } });
    expect(wrapper.findAll("li")).toHaveLength(2);
  });

  it("renders link titles", () => {
    const wrapper = mount(NavList, { props: { items: linkItems } });
    const links = wrapper.findAll("a");
    expect(links[0].text()).toBe("About");
    expect(links[1].text()).toBe("Contact");
  });

  it("internal links get target='_self'", () => {
    const wrapper = mount(NavList, { props: { items: linkItems } });
    const links = wrapper.findAll("a");
    links.forEach((link) => {
      expect(link.attributes("target")).toBe("_self");
    });
  });

  it("external https links get target='_blank'", () => {
    const wrapper = mount(NavList, { props: { items: externalLinkItems } });
    const links = wrapper.findAll("a");
    links.forEach((link) => {
      expect(link.attributes("target")).toBe("_blank");
    });
  });

  it("external http links get target='_blank'", () => {
    const wrapper = mount(NavList, {
      props: { items: [{ link: "http://example.com", title: "HTTP" }] },
    });
    expect(wrapper.find("a").attributes("target")).toBe("_blank");
  });

  it("applies ariaLabel to the nav element", () => {
    const wrapper = mount(NavList, {
      props: { items: linkItems, ariaLabel: "Main navigation" },
    });
    expect(wrapper.find("nav").attributes("aria-label")).toBe("Main navigation");
  });

  it("renders link href correctly", () => {
    const wrapper = mount(NavList, { props: { items: linkItems } });
    const links = wrapper.findAll("a");
    expect(links[0].attributes("href")).toBe("/about");
    expect(links[1].attributes("href")).toBe("/contact");
  });

  it("renders component items via <component :is>", () => {
    const TestComponent = defineComponent({
      template: '<span class="test-component">Test</span>',
    });
    const componentItems = [{ component: TestComponent, props: {} }];
    const wrapper = mount(NavList, { props: { items: componentItems } });
    expect(wrapper.find(".test-component").exists()).toBe(true);
  });

  it("renders mixed link and component items", () => {
    const TestComponent = defineComponent({
      template: '<span class="comp-item">Comp</span>',
    });
    const mixedItems = [
      { link: "/home", title: "Home" },
      { component: TestComponent, props: {} },
    ];
    const wrapper = mount(NavList, { props: { items: mixedItems } });
    expect(wrapper.find("a").exists()).toBe(true);
    expect(wrapper.find(".comp-item").exists()).toBe(true);
  });

  it("applies rel attribute to link items", () => {
    const itemsWithRel = [{ link: "https://example.com", title: "Link", rel: "noopener" }];
    const wrapper = mount(NavList, { props: { items: itemsWithRel } });
    expect(wrapper.find("a").attributes("rel")).toBe("noopener");
  });

  it("isVueComponent returns true for object with render property (covers line 58)", () => {
    const wrapper = mount(NavList, { props: { items: linkItems } });
    const { isVueComponent } = (wrapper.getCurrentComponent() as any).setupState;
    expect(isVueComponent({ render: () => {} })).toBe(true);
  });

  it("isVueComponent returns true for object with setup property", () => {
    const wrapper = mount(NavList, { props: { items: linkItems } });
    const { isVueComponent } = (wrapper.getCurrentComponent() as any).setupState;
    expect(isVueComponent({ setup: () => ({}) })).toBe(true);
  });

  it("isVueComponent returns true for object with components property", () => {
    const wrapper = mount(NavList, { props: { items: linkItems } });
    const { isVueComponent } = (wrapper.getCurrentComponent() as any).setupState;
    expect(isVueComponent({ components: {} })).toBe(true);
  });

  it("isVueComponent returns false for plain link object", () => {
    const wrapper = mount(NavList, { props: { items: linkItems } });
    const { isVueComponent } = (wrapper.getCurrentComponent() as any).setupState;
    expect(isVueComponent({ link: "/about", title: "About" })).toBe(false);
  });
});
