/*
 * Text layer helpers. Everything goes through batchPlay textStyleRange /
 * paragraphStyleRange so the layer stays a live, editable text layer —
 * no rasterizing, and the string contents are never touched.
 */

const { batchPlay } = require("./host");

const JUSTIFY = {
  left: "left",
  center: "center",
  right: "right",
  justifyAll: "justifyAll",
};

function buildTextStyle(style = {}) {
  const textStyle = { _obj: "textStyle" };

  if (style.font) textStyle.fontPostScriptName = style.font;
  if (style.fontName) textStyle.fontName = style.fontName;
  if (style.fontStyle) textStyle.fontStyleName = style.fontStyle;

  if (typeof style.size === "number") {
    textStyle.size = { _unit: "pointsUnit", _value: style.size };
  }
  if (typeof style.tracking === "number") textStyle.tracking = style.tracking;
  if (typeof style.leading === "number") {
    textStyle.autoLeading = false;
    textStyle.leading = { _unit: "pointsUnit", _value: style.leading };
  } else if (style.autoLeading === true) {
    textStyle.autoLeading = true;
  }
  if (typeof style.color === "object" && style.color) {
    textStyle.color = {
      _obj: "RGBColor",
      red: style.color.r,
      grain: style.color.g,
      blue: style.color.b,
    };
  }
  return textStyle;
}

/**
 * Apply a character style across the whole string of a text layer.
 * `length` is the character count of layer.textItem.contents.
 */
async function applyTextStyle(layerId, length, style) {
  const descriptor = {
    _obj: "set",
    _target: [{ _ref: "textLayer", _id: layerId }],
    to: {
      _obj: "textLayer",
      textStyleRange: [
        {
          _obj: "textStyleRange",
          from: 0,
          to: length,
          textStyle: buildTextStyle(style),
        },
      ],
    },
  };

  if (style.justification && JUSTIFY[style.justification]) {
    descriptor.to.paragraphStyleRange = [
      {
        _obj: "paragraphStyleRange",
        from: 0,
        to: length,
        paragraphStyle: {
          _obj: "paragraphStyle",
          align: { _enum: "alignmentType", _value: JUSTIFY[style.justification] },
        },
      },
    ];
  }

  return batchPlay([descriptor]);
}

module.exports = { applyTextStyle, buildTextStyle };
