<template>
  <ul class="c-donation-wallets u-list-reset">
    <li v-for="wallet in wallets" :key="wallet.address" class="c-donation-wallets__card">
      <ul class="c-donation-wallets__chains u-list-reset">
        <li v-for="chain in wallet.chains" :key="chain" class="c-donation-wallets__badge">
          {{ chain }}
        </li>
      </ul>

      <div class="c-donation-wallets__address-row">
        <code class="c-donation-wallets__address" :title="wallet.address">
          {{ truncateAddress(wallet.address) }}
        </code>

        <button
          v-if="clipBoardIsSupported"
          type="button"
          class="c-button c-button--center-icon c-donation-wallets__copy-button"
          :aria-label="`Adresse für ${wallet.chains.join(', ')} kopieren`"
          @click="copyAddress(wallet)"
        >
          <CheckIcon
            v-if="copied && copiedAddress === wallet.address"
            width="18"
            height="18"
            aria-hidden="true"
          />
          <CopyIcon v-else width="18" height="18" aria-hidden="true" />
        </button>
      </div>
    </li>
  </ul>
</template>

<script setup lang="ts">
import type { FundingWallet } from "@services/queries/getCompanyFunding";

import { createToastNotify } from "@stores/toastNotify.ts";
import { trackEvent } from "@utils/analytics";
import { useClipboard } from "@vueuse/core";
import { defineAsyncComponent, ref } from "vue";

const CopyIcon = defineAsyncComponent(() => import("virtual:icons/lucide/copy"));
const CheckIcon = defineAsyncComponent(() => import("virtual:icons/lucide/check"));

const { wallets } = defineProps<{ wallets: FundingWallet[] }>();

const { copied, copy, isSupported: clipBoardIsSupported } = useClipboard();
const copiedAddress = ref("");

/**
 * Middle-ellipsis truncation for wallet addresses (display only)
 *
 * @param   {string}  address
 *
 * @return  {string}
 */
const truncateAddress = (address: string): string =>
  address.length <= 13 ? address : `${address.slice(0, 6)}…${address.slice(-4)}`;

/**
 * Copy the full wallet address to the clipboard
 *
 * @param   {FundingWallet}  wallet
 *
 * @return  {Promise<void>}
 */
const copyAddress = async (wallet: FundingWallet): Promise<void> => {
  await copy(wallet.address);
  copiedAddress.value = wallet.address;

  createToastNotify({ message: "Adresse kopiert, danke dir!", status: "success" });

  trackEvent("Donation", "copy-address", wallet.chains[0] ?? "unknown");
};
</script>

<style lang="scss">
@use "@styles/components/donation-wallets";
</style>
