import type { FundingWallet } from "@services/queries/getCompanyFunding";

import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick, ref } from "vue";

vi.mock("@vueuse/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@vueuse/core")>();
  return {
    ...actual,
    useClipboard: vi.fn(() => ({
      copied: ref(false),
      copy: vi.fn().mockResolvedValue(undefined),
      isSupported: ref(true),
      text: ref(""),
    })),
  };
});

vi.mock("@stores/toastNotify.ts", () => ({
  createToastNotify: vi.fn(),
}));

vi.mock("@utils/analytics", () => ({
  trackEvent: vi.fn(),
}));

const EVM_ADDRESS = "0x4A21A332cAc9809dBCAdcD4CeDD43fdF32661eeE";
const BITCOIN_ADDRESS = "bc1qdp6ucj4pcp7w94y4nevktzazpul53pr2jxt040";
const SOLANA_ADDRESS = "HUj6hkvdb9kHhRGwLQfT4K6q1RBeXsR7xxCNekT9ZjrA";

const walletsFixture: FundingWallet[] = [
  { address: EVM_ADDRESS, chains: ["Ethereum", "Base", "Polygon"] },
  { address: BITCOIN_ADDRESS, chains: ["Bitcoin"] },
  { address: SOLANA_ADDRESS, chains: ["Solana"] },
];

describe("DonationWallets.vue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders one card per wallet", async () => {
    const DonationWallets = (await import("@components/DonationWallets.vue")).default;
    const wrapper = mount(DonationWallets, { props: { wallets: walletsFixture } });

    expect(wrapper.findAll(".c-donation-wallets__card")).toHaveLength(3);
  });

  it("renders one badge per chain of a wallet", async () => {
    const DonationWallets = (await import("@components/DonationWallets.vue")).default;
    const wrapper = mount(DonationWallets, { props: { wallets: walletsFixture } });

    const cards = wrapper.findAll(".c-donation-wallets__card");
    expect(cards[0]?.findAll(".c-donation-wallets__badge")).toHaveLength(3);
    expect(cards[0]?.findAll(".c-donation-wallets__badge").map((badge) => badge.text())).toEqual([
      "Ethereum",
      "Base",
      "Polygon",
    ]);
    expect(cards[1]?.findAll(".c-donation-wallets__badge")).toHaveLength(1);
    expect(cards[2]?.findAll(".c-donation-wallets__badge")).toHaveLength(1);
  });

  it("displays a middle-truncated address but keeps the full address in the title", async () => {
    const DonationWallets = (await import("@components/DonationWallets.vue")).default;
    const wrapper = mount(DonationWallets, { props: { wallets: walletsFixture } });

    const address = wrapper.find(".c-donation-wallets__address");
    expect(address.text()).toBe("0x4A21…1eeE");
    expect(address.text()).not.toContain(EVM_ADDRESS);
    expect(address.attributes("title")).toBe(EVM_ADDRESS);
  });

  it("copies the FULL address on copy click, not the truncated one", async () => {
    const { useClipboard } = await import("@vueuse/core");
    const copyMock = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useClipboard).mockReturnValueOnce({
      copied: ref(false),
      copy: copyMock,
      isSupported: ref(true),
      text: ref(""),
    });

    const DonationWallets = (await import("@components/DonationWallets.vue")).default;
    const wrapper = mount(DonationWallets, { props: { wallets: walletsFixture } });

    await wrapper.find(".c-donation-wallets__copy-button").trigger("click");

    expect(copyMock).toHaveBeenCalledWith(EVM_ADDRESS);
  });

  it("shows a success toast after copying", async () => {
    const DonationWallets = (await import("@components/DonationWallets.vue")).default;
    const wrapper = mount(DonationWallets, { props: { wallets: walletsFixture } });

    await wrapper.find(".c-donation-wallets__copy-button").trigger("click");
    await nextTick();

    const { createToastNotify } = await import("@stores/toastNotify.ts");
    expect(vi.mocked(createToastNotify)).toHaveBeenCalledWith({
      message: "Adresse kopiert, danke dir!",
      status: "success",
    });
  });

  it("tracks the copy event with the wallet's first chain", async () => {
    const DonationWallets = (await import("@components/DonationWallets.vue")).default;
    const wrapper = mount(DonationWallets, { props: { wallets: walletsFixture } });

    const copyButtons = wrapper.findAll(".c-donation-wallets__copy-button");
    await copyButtons[0]?.trigger("click");
    await nextTick();

    const { trackEvent } = await import("@utils/analytics");
    expect(vi.mocked(trackEvent)).toHaveBeenCalledWith("Donation", "copy-address", "Ethereum");

    await copyButtons[1]?.trigger("click");
    await nextTick();
    expect(vi.mocked(trackEvent)).toHaveBeenCalledWith("Donation", "copy-address", "Bitcoin");
  });

  it("hides copy buttons when clipboard is not supported", async () => {
    const { useClipboard } = await import("@vueuse/core");
    vi.mocked(useClipboard).mockReturnValueOnce({
      copied: ref(false),
      copy: vi.fn().mockResolvedValue(undefined),
      isSupported: ref(false),
      text: ref(""),
    });

    const DonationWallets = (await import("@components/DonationWallets.vue")).default;
    const wrapper = mount(DonationWallets, { props: { wallets: walletsFixture } });

    expect(wrapper.find(".c-donation-wallets__copy-button").exists()).toBe(false);
  });

  it("renders the auto-stubbed copy icon", async () => {
    const DonationWallets = (await import("@components/DonationWallets.vue")).default;
    const wrapper = mount(DonationWallets, { props: { wallets: walletsFixture } });

    // defineAsyncComponent resolves the icon loader asynchronously — wait for the re-render
    await vi.waitFor(() => {
      expect(wrapper.find('[data-testid="icon-lucide-copy"]').exists()).toBe(true);
    });
  });
});
