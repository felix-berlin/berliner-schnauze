import { createApp } from "vue";
import ToastNotify from "@components/ToastNotify.vue";
import ToastNotifyContainer from "@components/toast/ToastNotifyContainer.vue";
import toastNotify from "src/plugins/toastNotify";

// @see https://github.com/mdn/dom-examples/blob/f070e9132e76971d76dee6ce1a076e653e583085/popover-api/toast-popovers/index.js#L4
export default {
  install(app, options) {
    type ToastNotifyProps = {
      message: string;
      type?: "info" | "success" | "warning" | "error";
      showClose?: boolean;
      closeOnSwipe?: boolean;
      closeAfterTimeout?: boolean;
      closeTimeout?: number;
      position?: "top-right" | "top-left" | "bottom-right" | "bottom-left";
      positionSpacing?: string;
    };

    const updateCounter = (message = "ape") => {
      return `just a .... ${message}`;
    };

    const createToast = (message: string, options?: ToastNotifyProps) => {
      // Create an element and make it into a popover
      const popover = document.createElement("article");
      popover.popover = "manual";
      popover.classList.add("toast");
      popover.classList.add("newest");

      let msg;

      // Give the toast its text content, and add it to the DOM
      popover.textContent = message;
      document.body.appendChild(popover);

      // Show the popover
      popover.showPopover();

      // Update the counter paragraph
      updateCounter();

      // Remove the toast again after 4 seconds
      setTimeout(() => {
        popover.hidePopover();
        popover.remove();
      }, 4000);

      // When a new toast appears, run the movetoastsUp() function
      popover.addEventListener("toggle", (event) => {
        if (event.newState === "open") {
          moveToastsUp();
        }
      });
    };

    const moveToastsUp = () => {
      const toasts = document.querySelectorAll(".c-toast-notify");

      toasts.forEach((toast) => {
        // If the toast is the one that has just appeared, we don't want it to move up.
        if (toast.classList.contains("is-newest")) {
          toast.style.bottom = `5px`;
          toast.classList.remove("is-newest");
          return;
        }

        // Move up all the other toasts by the height of the new toast to make way for the new one
        const prevValue = parseInt(toast.style.bottom.replace("px", ""));
        const toastHeight = toast.getBoundingClientRect().height;
        const newValue = prevValue + toastHeight * 2 + 10;
        toast.style.bottom = `${newValue}px`;
      });
    };

    app.provide("toastNotify", {
      test: updateCounter(),
      show: (message: string) => createToast(message),
      create: ({
        message,
        type,
        position,
        positionSpacing,
        showClose,
        closeOnSwipe,
        closeAfterTimeout,
        closeTimeout,
      }: ToastNotifyProps) => {
        const toastApp = createApp(ToastNotify, {
          message,
          type,
          position,
          positionSpacing,
          showClose,
          closeOnSwipe,
          closeAfterTimeout,
          closeTimeout,
        });

        // Create a new div element
        const wrapper = document.createElement("div");

        // Give the new div a class
        wrapper.className = "toast-wrapper";

        // Append the new div to the body
        document.body.appendChild(wrapper);

        // Mount the Vue app to the new div
        toastApp.mount(wrapper);

        moveToastsUp();

        // console.log("toastApp", toastApp);

        toastApp._props.onClosed = () => {
          // app.unmount(wrapper);
          wrapper.remove();
          console.log("onCloseEvent");
        };
      },
      build: ({
        message,
        type,
        position,
        positionSpacing,
        showClose,
        closeOnSwipe,
        closeAfterTimeout,
        closeTimeout,
      }: ToastNotifyProps) => {
        let wrapper = document.querySelector(".toast-wrapper");
        let toastNotifyContainer;
        // If the wrapper doesn't exist, create a new one
        if (!wrapper) {
          toastNotifyContainer = createApp(ToastNotifyContainer, {
            message,
            type,
            position,
            positionSpacing,
            showClose,
            closeOnSwipe,
            closeAfterTimeout,
            closeTimeout,
          });

          // Create a new div element
          wrapper = document.createElement("div");

          // Give the new div a class
          wrapper.className = "toast-wrapper";

          // Append the new div to the body
          document.body.appendChild(wrapper);

          // Mount the Vue app to the new div
          toastNotifyContainer.mount(wrapper);
        }

        console.log("toastNotifyContainer", toastNotifyContainer);
        // toastNotifyContainer.component.proxy.test();
      },
      // init: () => {
      //   const toastNotifyContainer = createApp(ToastNotifyContainer);

      //   // Create a new div element
      //   const wrapper = document.createElement("div");

      //   // Give the new div a class
      //   wrapper.className = "toast-wrapper";

      //   // Append the new div to the body
      //   document.body.appendChild(wrapper);

      //   // Mount the Vue app to the new div
      //   toastNotifyContainer.mount(wrapper);
      // },
    });
  },
};
