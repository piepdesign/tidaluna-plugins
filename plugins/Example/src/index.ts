import { InfoMessage, redux, Signal, type LunaUnload } from "@luna/lib";
import { intercept } from "plugins/lib/src/redux";

InfoMessage(`Hello ${redux.store.getState().user.meta.profileName} from the Example plugin!`);

// Example plugin settings
export { Settings } from "./Settings";

// Functions in unloads are called when plugin is unloaded.
// Used to clean up resources, even listener dispose etc should be added here
export const unloads = new Set<LunaUnload>();

// Log to console whenever changing page
intercept("page/SET_PAGE_ID", unloads, console.log);

// Error signal allowing us to show error messages in the UI
export const errSignal = new Signal<string | undefined>(undefined);

errSignal._ = "Example plugin error signal";
