import { PropertyValues } from "lit";

import { HomeAssistant } from 'custom-card-helpers';

// Check if config or Entity changed
export function hasConfigOrSensorChanged(
  element: any,
  changedProps: PropertyValues,
  forceUpdate: boolean,
): boolean {
  if (changedProps.has('config') || forceUpdate) {
    return true;
  }

  if (element._stateSensor) {
    const oldHass = changedProps.get('hass') as HomeAssistant | undefined;
    if (oldHass) {
      return (
        oldHass.states[element.config.sensor]
        !== element.hass!.states[element.config.sensor]
      );
    }
    return true;
  } else {
    return false;
  }
}