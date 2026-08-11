import type { ReactElement } from "react";

import AggregateViewImplementation from "./components/AggregateView.js";
import ChartImplementation from "./components/Chart.js";
import CheckboxImplementation from "./components/Checkbox.js";
import CheckboxGroupImplementation from "./components/CheckboxGroup.js";
import InputTextImplementation from "./components/Input.js";
import MultiSelectDropdownImplementation from "./components/MultiSelectDropdown.js";
import ProvenanceButtonImplementation from "./components/ProvenanceButton.js";
import RadiobuttonImplementation from "./components/Radiobutton.js";
import RadioGroupImplementation from "./components/RadioGroup.js";
import RangesliderImplementation from "./components/Rangeslider.js";
import SingleSelectDropdownImplementation from "./components/SingleSelectDropdown.js";
import SinglesliderImplementation from "./components/Singleslider.js";
import TimelineVisImplementation from "./components/TimelineVis.js";
import SuperProvenanceWidgetImplementation from "./components/SuperProvenance.js";
import ProvenanceProviderImplementation from "./components/providers/ProvenanceProvider.js";
import useProvenanceImplementation from "./components/hooks/useProvenance.js";
import useRevertedValueImplementation from "./components/hooks/useRevertedValue.js";
import useProvenanceControllerImplementation from "./components/hooks/useProvenanceController.js";
import useWidgetRegistryImplementation from "./components/hooks/useWidgetRegistry.js";
import type {
  AggregateViewProps,
  ChartProps,
  CheckboxGroupProps,
  CheckboxProps,
  InputTextProps,
  MultiSelectDropdownProps,
  ProvenanceButtonProps,
  ProvenanceComponent,
  ProvenanceProviderProps,
  RadiobuttonProps,
  RadioGroupProps,
  RangesliderProps,
  SingleSelectDropdownProps,
  SinglesliderProps,
  SuperProvenanceWidgetProps,
  TimelineVisProps,
  UseProvenance,
  UseProvenanceController,
  UseRevertedValue,
  UseWidgetRegistry,
} from "./types/components";

export * from "@provenance-widgets/core";

export type {
  CommonProvenanceWidgetProps,
  LegacyProvenanceRecord,
  LegacySerializedProvenance,
  ProvenanceChangeMeta,
  ProvenanceChangeSource,
  ProvenanceMode,
  ProvenanceRecordKind,
  ProvenanceView,
  ProvenanceWidgetType,
  SerializedProvenance,
  SerializedProvenanceRecord,
  WidgetRegistration,
} from "./types/provenance";

export type * from "./types/components";

export const AggregateView =
  AggregateViewImplementation as ProvenanceComponent<AggregateViewProps>;

export const Chart = ChartImplementation as ProvenanceComponent<ChartProps>;

export const Checkbox = CheckboxImplementation as <TValue = unknown>(
  props: CheckboxProps<TValue>
) => ReactElement | null;

export const CheckboxGroup = CheckboxGroupImplementation as <
  TValue = unknown,
>(props: CheckboxGroupProps<TValue>) => ReactElement | null;

export const InputText =
  InputTextImplementation as ProvenanceComponent<InputTextProps>;

export const MultiSelectDropdown = MultiSelectDropdownImplementation as <
  TOption = unknown,
  TKey = unknown,
>(props: MultiSelectDropdownProps<TOption, TKey>) => ReactElement | null;

export const ProvenanceButton =
  ProvenanceButtonImplementation as ProvenanceComponent<ProvenanceButtonProps>;

export const Radiobutton = RadiobuttonImplementation as <TValue = unknown>(
  props: RadiobuttonProps<TValue>
) => ReactElement | null;

export const RadioGroup = RadioGroupImplementation as <TValue = unknown>(
  props: RadioGroupProps<TValue>
) => ReactElement | null;

export const Rangeslider =
  RangesliderImplementation as ProvenanceComponent<RangesliderProps>;

export const SingleSelectDropdown = SingleSelectDropdownImplementation as <
  TOption = unknown,
  TKey = unknown,
>(props: SingleSelectDropdownProps<TOption, TKey>) => ReactElement | null;

export const Singleslider =
  SinglesliderImplementation as ProvenanceComponent<SinglesliderProps>;

export const TimelineVis = TimelineVisImplementation as <TValue = unknown>(
  props: TimelineVisProps<TValue>
) => ReactElement | null;

export const SuperProvenanceWidget =
  SuperProvenanceWidgetImplementation as ProvenanceComponent<
    SuperProvenanceWidgetProps
  >;

export const ProvenanceProvider =
  ProvenanceProviderImplementation as ProvenanceComponent<
    ProvenanceProviderProps
  >;

export const useProvenance = useProvenanceImplementation as UseProvenance;
export const useRevertedValue =
  useRevertedValueImplementation as UseRevertedValue;
export const useProvenanceController =
  useProvenanceControllerImplementation as UseProvenanceController;
export const useWidgetRegistry =
  useWidgetRegistryImplementation as unknown as UseWidgetRegistry;
