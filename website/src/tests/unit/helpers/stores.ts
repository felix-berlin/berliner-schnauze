import { ref, type Ref } from "vue";

type StoreEntry = [unknown, Ref<unknown>];

export function createStoreMockImpl(storeMap: StoreEntry[]) {
  return (store: unknown): Ref<unknown> => {
    const entry = storeMap.find(([s]) => s === store);
    return entry ? entry[1] : ref(null);
  };
}
