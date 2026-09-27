import NavList from "@components/NavList.vue";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

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
      props: { ariaLabel: "Main navigation", items: linkItems },
    });
    expect(wrapper.find("nav").attributes("aria-label")).toBe("Main navigation");
  });

  it("renders link href correctly", () => {
    const wrapper = mount(NavList, { props: { items: linkItems } });
    const links = wrapper.findAll("a");
    expect(links[0].attributes("href")).toBe("/about");
    expect(links[1].attributes("href")).toBe("/contact");
  });

  it("applies rel attribute to link items", () => {
    const itemsWithRel = [{ link: "https://example.com", rel: "noopener", title: "Link" }];
    const wrapper = mount(NavList, { props: { items: itemsWithRel } });
    expect(wrapper.find("a").attributes("rel")).toBe("noopener");
  });
});
