/* eslint-disable @typescript-eslint/no-explicit-any */
import { RippleHandlers } from "@material/mwc-ripple/ripple-handlers";
import { Ripple } from '@material/mwc-ripple';
import { LitElement, html, TemplateResult, css, PropertyValues, CSSResultGroup} from 'lit';
import { HassEntity } from 'home-assistant-js-websocket'
import { queryAsync } from 'lit-element'
import { customElement, property, state, eventOptions } from "lit/decorators";
import { findEntities } from "./././find-entities";
import { ifDefined } from "lit/directives/if-defined";
import { classMap } from "lit/directives/class-map";
import { HomeAssistant, hasAction, ActionHandlerEvent, handleAction, LovelaceCardEditor, getLovelace } from 'custom-card-helpers';
import './editor';
import type { BoilerplateCardConfig } from './types';
import { actionHandler } from './action-handler-directive';
import { CARD_VERSION, sidegatePost1, sidegatePost2, sidegateGate, UNAVAILABLE_STATES, UNAVAILABLE } from './const';
import { localize } from './localize/localize';
import { debounce } from "./common/debounce";
import ResizeObserver from "./common/resizeObserver";
import { hasConfigOrSensorChanged } from "./utils/hasSensorChanged";


console.info(
  `%c  RACELAND-gate-card \n%c  ${localize('common.version')} ${CARD_VERSION}    `,
  'color: orange; font-weight: bold; background: black',
  'color: white; font-weight: bold; background: dimgray',
);

(window as any).customCards = (window as any).customCards || [];
(window as any).customCards.push({
  type: 'gate-card',
  name: 'Gate',
  preview: true
});
@customElement('gate-card')
export class BoilerplateCard extends LitElement {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    return document.createElement('gate-card-editor');
  }

  @state() _stateSensor?: any;


  @queryAsync('mwc-ripple') private _ripple!: Promise<Ripple | null>;

  public static getStubConfig(
    hass: HomeAssistant,
    entities: string[],
    entitiesFallback: string[]
  ): BoilerplateCardConfig {
    const includeDomains = ["switch"];
    const maxEntities = 1;
    const foundEntities = findEntities(
      hass,
      maxEntities,
      entities,
      entitiesFallback,
      includeDomains
    );
    return {
      type: "custom:gate-card",
      entity: foundEntities[0] || "",
      sensor: "",
      "show_name": true,
      "show_state": true,
      "name": "Raceland",
      "show_preview": true,
      "icon": sidegatePost1 + ":" + sidegateGate + ":" + sidegatePost2,
    };
  }

  protected firstUpdated(): void {
    this._attachResizeObserver();
  }
  private _resizeObserver?: ResizeObserver;

  private async _attachResizeObserver(): Promise<void> {
    if (!this._resizeObserver) {
      this._resizeObserver = new ResizeObserver(
        debounce(
          (entries: any) => {
          const rootGrid = this.closest("div");
          const entry = entries[0];
          if (
            rootGrid &&
            entry.contentRect.width <= rootGrid.clientWidth / 2 &&
            entry.contentRect.width > rootGrid.clientWidth / 3
          ) {
            const shadow = this.shadowRoot?.querySelector("ha-card");
            shadow?.classList.remove("big-card");
            shadow?.classList.add("medium-card");
            const statusicon = this.shadowRoot?.querySelector(".ha-status-icon");
            statusicon?.classList.remove("ha-status-icon");
            statusicon?.classList.add("ha-status-icon-small");
            const statusrect = this.shadowRoot?.querySelector(".rect-card");
            statusrect?.classList.remove("rect-card");
            statusrect?.classList.add("rect-card-medium");
            const sidegate = this.shadowRoot?.querySelector(".svgicon-sidegate");
            sidegate?.classList.remove("svgicon-sidegate");
            sidegate?.classList.add("svgicon-sidegate-small");
          }
          else if (
            rootGrid &&
            entry.contentRect.width <= rootGrid.clientWidth / 3 &&
            entry.contentRect.width !== 0
          ) {
            const shadow = this.shadowRoot?.querySelector("ha-card");
            shadow?.classList.remove("big-card");
            shadow?.classList.add("small-card");
            const statusicon = this.shadowRoot?.querySelector(".ha-status-icon");
            statusicon?.classList.remove("ha-status-icon");
            statusicon?.classList.add("ha-status-icon-small");
            const statusrect = this.shadowRoot?.querySelector(".rect-card");
            statusrect?.classList.remove("rect-card");
            statusrect?.classList.add("rect-card-small");
            const sidegate = this.shadowRoot?.querySelector(".svgicon-sidegate");
            sidegate?.classList.remove("svgicon-sidegate");
            sidegate?.classList.add("svgicon-sidegate-small");
          }
        }, 250, true));
      }

    this._resizeObserver.observe(this);

    }
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private config!: BoilerplateCardConfig;

  @state() private _shouldRenderRipple = true;

  public setConfig(config: BoilerplateCardConfig): void {
    if (!config) {
      throw new Error(localize('common.invalidconfiguration'));
    }
    if (config.test_gui) {
      getLovelace().setEditMode(true);
    }

    this.config = {
      ...config,
      show_icon: true,
      tap_action: {
        action: "toggle",
      },
    };
  }

  public translate_state(stateObj): string{
    if(ifDefined(stateObj ? this.computeActiveState(stateObj) : undefined) === "on") {
      return localize("states.on");
    }
    else if(ifDefined(stateObj ? this.computeActiveState(stateObj) : undefined) === "off") {
      return localize("states.off");
    }
    else if(ifDefined(stateObj ? this.computeActiveState(stateObj) : undefined) === "unavailable") {
      return localize("states.unavailable");
    }
    else {
      return ""
    }
}

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    if (!this.config) {
      return false;
    }
    return hasConfigOrSensorChanged(this, changedProps, false);
  }

  protected render(): TemplateResult | void {
    if (this.config.show_warning) {
      return this._showWarning(localize('common.show_warning'));
    }
    if (this.config.show_error) {
      return this._showError(localize('common.show_error'));
    }
    const stateObj2 = this.config?.entity
      ? this.hass.states[this.config?.entity]
      : undefined;

    const stateObj = this.hass.states[this.config?.sensor];

    this._stateSensor = stateObj;

  return html`
    <ha-card
      class="big-card"
      @action=${this._handleAction}
      @focus=${this.handleRippleFocus}
      @blur=${this.handleRippleBlur}
      @mousedown=${this.handleRippleActivate}
      @mouseup=${this.handleRippleDeactivate}
      @touchstart=${this.handleRippleActivate}
      @touchend=${this.handleRippleDeactivate}
      @touchcancel=${this.handleRippleDeactivate}
      @keydown=${this._handleKeyDown}
      .disabled=${UNAVAILABLE_STATES.includes(stateObj2!.state)}
      .actionHandler=${actionHandler({
      hasHold: hasAction(this.config.hold_action),
      hasDoubleClick: hasAction(this.config.double_tap_action),
      })}
      tabindex="0"
      role="button"
      aria-label=${this.config.name ||
        (stateObj ? this.computeStateName(stateObj) : "")}
        tabindex=${ifDefined(
          hasAction(this.config.tap_action) ? "0" : undefined
        )}
      .label=${`gate: ${this.config.entity || 'No Entity Defined'}`}
    >
      ${this.config.show_icon && this.config.icon
    ? html`
          <div class="ha-status-icon">
            <svg class=
              "svgicon-sidegate"
              viewBox="0 0 50 50" height="100%" width="100%">
                  <path class=${classMap({
                    "state-on-sidegate":
                      ifDefined(stateObj? this.computeActiveState(stateObj) : undefined) === "off" && (this.config.icon === sidegatePost1 + ":" + sidegateGate + ":" + sidegatePost2),
                    "state-off-sidegate":
                      ifDefined(stateObj ? this.computeActiveState(stateObj) : "on") === "on" && (this.config.icon === sidegatePost1 + ":" + sidegateGate + ":" + sidegatePost2),
                    "state-unavailable": stateObj2?.state === UNAVAILABLE,
                  })} d=${this.config.icon.split(":")[0]} />
                  <path class=${classMap({
                    "state-on-sidegate":
                      ifDefined(stateObj? this.computeActiveState(stateObj) : undefined) === "off" && (this.config.icon === sidegatePost1 + ":" + sidegateGate + ":" + sidegatePost2),
                    "state-off-sidegate":
                      ifDefined(stateObj ? this.computeActiveState(stateObj) : "on") === "on" && (this.config.icon === sidegatePost1 + ":" + sidegateGate + ":" + sidegatePost2),
                    "state-unavailable": stateObj2?.state === UNAVAILABLE,
                  })} d=${this.config.icon.split(":")[2] ? this.config.icon.split(":")[2] : ""}/>
                  <path class=${classMap({
                    "state-on-sidegate-icon":
                      ifDefined(stateObj? this.computeActiveState(stateObj) : undefined) === "off" && (this.config.icon === sidegatePost1 + ":" + sidegateGate + ":" + sidegatePost2),
                    "state-off-sidegate-icon":
                      ifDefined(stateObj ? this.computeActiveState(stateObj) : "on") === "on" && (this.config.icon === sidegatePost1 + ":" + sidegateGate + ":" + sidegatePost2),
                    "state-unavailable": stateObj2?.state === UNAVAILABLE,
                  })}
                  d=${this.config.icon.split(":")[1]} />
              </svg>
            </div>
          `
        : ""}
    ${this.config.show_name
      ? html`
        <div tabindex = "-1" class="rect-card">
        ${this.config.name}
          </div>
          <div></div>
        `
      : ""}

    <!-- ${this.config.show_state
    ? html`
      <div tabindex="-1" class="state-div">
      ${this.translate_state(stateObj)}
      <div class="position"></div>
     </div><div></div>`: ""} -->
     ${this._shouldRenderRipple ? html`<mwc-ripple></mwc-ripple>` : ""}
     ${UNAVAILABLE_STATES.includes(stateObj2!.state)
              ? html`
                  <unavailable-icon></unavailable-icon>` : html ``}
      </ha-card>
    `;
  }

private computeActiveState = (stateObj: HassEntity): string => {
  const domain = stateObj.entity_id.split(".")[0];
  let state = stateObj.state;
  if (domain === "climate") {
    state = stateObj.attributes.hvac_action;
  }
  return state;
};

  private _handleAction(ev: ActionHandlerEvent): void {
    if (this.hass && this.config && ev.detail.action) {
      handleAction(this, this.hass, this.config, ev.detail.action);
    }
  }

  private _showWarning(warning: string): TemplateResult {
    return html`
      <hui-warning>${warning}</hui-warning>
    `;
  }

  private _showError(error: string): TemplateResult {
    const errorCard = document.createElement('hui-error-card');
    errorCard.setConfig({
      type: 'error',
      error,
      origConfig: this.config,
    });
    return html`
      ${errorCard}
    `;
  }

  private computeObjectId = (entityId: string): string =>
    entityId.substr(entityId.indexOf(".") + 1);

  private computeStateName = (stateObj: HassEntity): string =>
    stateObj.attributes.friendly_name === undefined
      ? this.computeObjectId(stateObj.entity_id).replace(/_/g, " ")
      : stateObj.attributes.friendly_name || "";


  private handleRippleFocus() {
    this._rippleHandlers.startFocus();
  }
  private _rippleHandlers: RippleHandlers = new RippleHandlers(() => {
    this._shouldRenderRipple = true;
    return this._ripple;
  });

  private _handleKeyDown(ev: KeyboardEvent) {
    if (ev.key === "Enter" || ev.key === " ") {
      handleAction(this, this.hass!, this.config!, "tap");
    }
  }

  @eventOptions({ passive: true })
  private handleRippleActivate(evt?: Event) {
    this._rippleHandlers.startPress(evt);
  }

  private handleRippleDeactivate() {
    this._rippleHandlers.endPress();
  }

  private handleRippleBlur() {
    this._rippleHandlers.endFocus();
  }

  static get styles(): CSSResultGroup {
    return css`
      .big-card {
        cursor: pointer;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        padding: 4% 0;
        font-size: 2.3rem;
        height: 100%;
        box-sizing: border-box;
        justify-content: center;
        position: relative;
        overflow: hidden;
        border-radius: 1.5rem;
        font-weight: 450;
      }

      .medium-card {
        cursor: pointer;
        display: flex;
        flex-direction: column;
        align-items: left;
        text-align: left;
        padding: 4% 0;
        font-size: 1.8rem;
        height: 100%;
        box-sizing: border-box;
        justify-content: center;
        position: relative;
        overflow: hidden;
        border-radius: 1.5rem;
        font-weight: 450;
      }
      .small-card {
        cursor: pointer;
        display: flex;
        flex-direction: column;
        align-items: left;
        text-align: left;
        padding: 4% 0;
        font-size: 1.2rem;
        height: 100%;
        box-sizing: border-box;
        justify-content: center;
        position: relative;
        overflow: hidden;
        border-radius: 1.5rem;
        font-weight: 450;
      }

      ha-card:focus {
        outline: none;
      }

      .ha-status-icon {
        width: 40%;
        height: auto;
        color: var(--paper-item-icon-color, #44739e);
        --mdc-icon-size: 100%;
      }

      .ha-status-icon-small {
        width: 50%;
        height: auto;
        color: var(--paper-item-icon-color, #44739e);
        --mdc-icon-size: 100%;
      }

      ha-state-icon,
      span {
        outline: none;
      }

      .rect-card-small {
        padding: 5%;
        padding-bottom: 4%;
        margin-bottom: 4%;
        margin-left: 7%;
        white-space: nowrap;
        display: inline-block;
        overflow: hidden;
        max-width: 120px;
        float: left;
        text-overflow: ellipsis;
      }

      .rect-card-medium {
        padding: 5%;
        padding-bottom: 4%;
        margin-bottom: 4%;
        margin-left: 7%;
        white-space: nowrap;
        display: inline-block;
        overflow: hidden;
        max-width: 170px;
        float: left;
        text-overflow: ellipsis;
      }

      .rect-card {
        padding: 5%;
        white-space: nowrap;
        display: inline-block;
        overflow: hidden;
        max-width: 300px;
        float: left;
        text-overflow: ellipsis;
      }
      unavailable-icon {
        position: absolute;
        top: 11px;
        right: 10%;
      }
      .svgicon-sidegate {
        transform: scale(1.5);
      }
      .svgicon-sidegate-small {
        margin-left: 30%;
        margin-bottom: 17%;
        margin-top: 5%;
        transform: scale(1.4);
      }
      .state-on-sidegate-icon {
        fill: var(--state-icon-active-color, #44739e);
        transform: matrix(0.000001, 0, 0, 1, 6, 0);
        transition: 1s ease-out;
      }
      .state-off-sidegate-icon {
        fill: var(--paper-item-icon-color, #44739e);
        transform: matrix(1, 0, 0, 1, 0, 0);
        transition: 1s ease-out;
      }
      .state-on-sidegate {
        fill: var(--state-icon-active-color, #44739e);
        transition: 1s ease-out;
      }
      .state-off-sidegate {
        fill: var(--paper-item-icon-color, #44739e);
        transition: 1s ease-out;
      }
      .state-unavailable {
        color: var(--state-unavailable-color, #bdbdbd);
      }

    `;
  }
}
