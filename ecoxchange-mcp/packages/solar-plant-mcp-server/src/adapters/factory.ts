import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import type { SupportedBrand } from "@ecoxchange/shared";
import type { InverterAdapter } from "./base.js";
import { SolarEdgeAdapter } from "./solaredge.js";
import { EnphaseAdapter } from "./enphase.js";
import { FroniusAdapter } from "./fronius.js";
import { SmaAdapter } from "./sma.js";

export class BrandAdapterFactory {
  static create(brand: SupportedBrand): InverterAdapter {
    switch (brand) {
      case "solaredge":
        return new SolarEdgeAdapter();
      case "enphase":
        return new EnphaseAdapter();
      case "fronius":
        return new FroniusAdapter();
      case "sma":
        return new SmaAdapter();
      default:
        throw new McpError(
          ErrorCode.InvalidParams,
          `Unsupported brand: "${brand}". Supported: solaredge, enphase, fronius, sma`,
        );
    }
  }
}
