declare const __COMPONENT_ID__: string;

declare module "@component/app" {
  export const app: import("../shared/app-definition.js").AppDefinition;
}

declare module "@component/view" {
  const View: import("react").ComponentType<import("./view-props.js").AppViewProps>;
  export default View;
}
