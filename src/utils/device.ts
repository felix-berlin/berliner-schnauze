export class DeviceDetector {
  device: { isDesktop: boolean; isMobile: boolean; isTablet: boolean; };
  userAgent: string;

  constructor() {
    this.userAgent = navigator.userAgent;
    this.device = {
      isDesktop: true,
      isMobile: false,
      isTablet: false,
    };
    this.detectDevice();
  }

  detectDevice() {
    const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
    const tabletRegex = /iPad|Android/i;

    if (mobileRegex.test(this.userAgent)) {
      this.device.isMobile = true;
      this.device.isDesktop = false;
    }

    if (tabletRegex.test(this.userAgent)) {
      this.device.isTablet = true;
      this.device.isMobile = false;
      this.device.isDesktop = false;
    }
  }

  getDevice() {
    return this.device;
  }
}
