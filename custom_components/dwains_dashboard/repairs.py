"""Repairs (the Settings "Restart required" banner) for Dwains Dashboard.

When the integration is disabled, its sidebar dashboard and frontend resources
(the JS bundle / static path / websocket commands registered in async_setup)
can't be torn down at runtime, so a Home Assistant restart is needed to fully
remove them. We surface that as a fixable repair issue whose fix is a single
"Submit" that restarts Home Assistant. The issue is created on disable and
removed again on (re-)enable -- see __init__.py.
"""

import voluptuous as vol

from homeassistant import data_entry_flow
from homeassistant.components.repairs import RepairsFlow
from homeassistant.core import HomeAssistant


class RestartRequiredRepairFlow(RepairsFlow):
    """Fix flow that restarts Home Assistant."""

    async def async_step_init(
        self, user_input: dict | None = None
    ) -> data_entry_flow.FlowResult:
        return await self.async_step_confirm()

    async def async_step_confirm(
        self, user_input: dict | None = None
    ) -> data_entry_flow.FlowResult:
        if user_input is not None:
            # Fire-and-forget: the restart tears down the event loop, so don't
            # await it (awaiting can surface as a cancelled task during shutdown).
            self.hass.async_create_task(
                self.hass.services.async_call("homeassistant", "restart", blocking=False)
            )
            return self.async_create_entry(title="", data={})

        return self.async_show_form(step_id="confirm", data_schema=vol.Schema({}))


async def async_create_fix_flow(
    hass: HomeAssistant, issue_id: str, data: dict | None
) -> RepairsFlow:
    """Create the fix flow for a Dwains Dashboard repair issue."""
    return RestartRequiredRepairFlow()
