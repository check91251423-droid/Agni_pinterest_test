/*
 * command: createTextLayer
 * Creates a NEW editable point-text layer, then applies a character style to it.
 * Used to rebuild copy on top of a flattened image: the new layer is live text,
 * so the wording stays editable and nothing is baked in.
 *
 *   {
 *     action: "createTextLayer",
 *     params: {
 *       name: "HEADLINE",
 *       contents: "THIN AS A\rCREDIT CARD",   // \r = new paragraph
 *       x: 64, y: 150,                        // baseline origin, document pixels
 *       font: "Sansation-Bold",
 *       size: 96,
 *       color: { r: 255, g: 255, b: 255 },
 *       tracking: -10,
 *       leading: 104,
 *       justification: "left"
 *     }
 *   }
 */

const { requireActiveDocument, runModal, batchPlay } = require("../photoshop/host");
const { findLayerByName } = require("../photoshop/layers");
const { buildTextStyle } = require("../photoshop/text");
const logger = require("../utils/logger");

const ALIGN = { left: "left", center: "center", right: "right" };

async function createTextLayer(params = {}) {
  const contents = params.contents;
  if (typeof contents !== "string" || !contents) {
    throw new Error("createTextLayer needs params.contents (the text string).");
  }

  const doc = requireActiveDocument();
  const name = params.name || contents.split(/[\r\n]/)[0].slice(0, 30);
  const x = typeof params.x === "number" ? params.x : 0;
  const y = typeof params.y === "number" ? params.y : 0;

  logger.info(`Creating text layer "${name}" at (${x}, ${y})`, JSON.stringify(params));

  await runModal(`Create text layer: ${name}`, async () => {
    const textLayer = {
      _obj: "textLayer",
      textKey: contents,
      textClickPoint: {
        _obj: "paint",
        horizontal: { _unit: "percentUnit", _value: (x / doc.width) * 100 },
        vertical: { _unit: "percentUnit", _value: (y / doc.height) * 100 },
      },
      textStyleRange: [
        {
          _obj: "textStyleRange",
          from: 0,
          to: contents.length,
          textStyle: buildTextStyle(params),
        },
      ],
    };

    if (params.justification && ALIGN[params.justification]) {
      textLayer.paragraphStyleRange = [
        {
          _obj: "paragraphStyleRange",
          from: 0,
          to: contents.length,
          paragraphStyle: {
            _obj: "paragraphStyle",
            align: { _enum: "alignmentType", _value: ALIGN[params.justification] },
          },
        },
      ];
    }

    await batchPlay([
      { _obj: "make", _target: [{ _ref: "textLayer" }], using: textLayer },
    ]);

    // batchPlay names the layer after its contents; rename it to the stable key.
    await batchPlay([
      {
        _obj: "set",
        _target: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }],
        to: { _obj: "layer", name },
      },
    ]);
  });

  const layer = findLayerByName(doc, name);
  if (!layer) throw new Error(`文字圖層 "${name}" 建立後找不到。`);

  logger.info(`Text layer created: id=${layer.id} name="${layer.name}"`);
  return { layerId: layer.id, layerName: layer.name, contents };
}

module.exports = { createTextLayer };
