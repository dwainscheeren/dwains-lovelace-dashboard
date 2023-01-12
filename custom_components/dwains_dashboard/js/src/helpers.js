import { selectTree } from "card-tools/src/helpers";

export async function closePopup() {
    const root = document.querySelector("home-assistant") || document.querySelector("hc-root");
    //fireEvent("hass-more-info", {entityId: "."}, root);
    const el = await selectTree(root, "$ card-tools-popup");
  
    if(el)
      el.closeDialog();
  }