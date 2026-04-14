const React = require("react");
const { View } = require("react-native");

const noop = () => null;

const MapView = React.forwardRef((props, ref) => React.createElement(View, { ref, style: props.style }));
MapView.displayName = "MapView";

const Marker = noop;
const Callout = noop;
const Polyline = noop;
const Polygon = noop;
const Circle = noop;
const Overlay = noop;

const PROVIDER_GOOGLE = "google";
const PROVIDER_DEFAULT = null;

module.exports = {
  default: MapView,
  MapView,
  Marker,
  Callout,
  Polyline,
  Polygon,
  Circle,
  Overlay,
  PROVIDER_GOOGLE,
  PROVIDER_DEFAULT,
};
