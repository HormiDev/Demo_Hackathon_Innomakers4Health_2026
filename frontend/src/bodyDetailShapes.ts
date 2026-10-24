import type { BodyDetail } from "./types";

type Region = { id: string; d: string };
export type DetailDrawing = { regions: Region[]; outline?: string; lines: string[] };

// Construye divisiones suaves que se recortan al contorno de cada región corporal.
function box(x: number, y: number, width: number, height: number): string {
  return `M${x + 3} ${y}H${x + width - 3}Q${x + width} ${y} ${x + width} ${y + 3}V${y + height - 3}Q${x + width} ${y + height} ${x + width - 3} ${y + height}H${x + 3}Q${x} ${y + height} ${x} ${y + height - 3}V${y + 3}Q${x} ${y} ${x + 3} ${y}Z`;
}

// Dibuja áreas pequeñas de cara, dedos y articulaciones con contornos elípticos.
function oval(x: number, y: number, rx: number, ry: number): string {
  return `M${x - rx} ${y}a${rx} ${ry} 0 1 0 ${rx * 2} 0a${rx} ${ry} 0 1 0 ${-rx * 2} 0`;
}

// Devuelve dibujos ampliados propios de cada parte, con la misma nomenclatura del catálogo.
export function detailDrawing(kind: BodyDetail["kind"], back: boolean): DetailDrawing {
  if (kind === "hand") return {
    regions: [
      { id: back ? "dorsum" : "palm", d: "M84 139L192 144L199 181Q199 211 173 229H103Q89 218 85 196L74 169Z" },
      { id: "thumb", d: "M87 160L56 127Q48 119 40 125Q33 131 39 141L66 195Q72 207 88 210L105 192Z" },
      { id: "index", d: "M83 142V65Q83 53 95 53Q107 53 107 65V141Z" },
      { id: "middle", d: "M111 139V40Q111 27 124 27Q137 27 137 40V139Z" },
      { id: "ring", d: "M141 141V53Q141 41 153 41Q165 41 165 53V144Z" },
      { id: "little", d: "M169 146V86Q169 75 180 75Q191 75 191 86V154Z" },
      { id: "wrist", d: "M103 232H173L171 266H106Z" },
    ],
    lines: back ? [
      "M102 215L96 151M122 220L125 149M143 219L153 151M161 216L181 155",
      "M89 65Q95 62 101 65M117 40Q124 36 131 40M147 53Q153 50 159 53M174 87Q180 84 186 87",
    ] : [
      "M96 165Q138 177 183 160M104 204Q137 185 173 201M95 180Q101 195 103 216",
      "M88 91H102M116 78H132M146 89H160M174 112H187M109 245H168",
    ],
  };
  if (kind === "foot") return {
    outline: "M83 57Q77 41 84 27Q93 13 107 24L126 35Q151 34 172 56Q187 75 181 105L168 148Q165 161 170 181Q180 206 166 237Q153 257 128 255Q103 256 94 237Q87 214 93 190L100 158Q102 145 94 122Q80 92 83 57Z" + (back ? "" : " M102 251H165L170 277H100Z"),
    regions: [
      { id: "big_toe", d: oval(100, 44, 19, 26) },
      { id: "other_toes", d: "M121 32Q158 30 177 59L180 79L120 70Z" },
      { id: "forefoot", d: box(81, 74, 103, 55) },
      { id: back ? "arch" : "midfoot", d: box(88, 132, 88, 60) },
      { id: "heel", d: box(90, 195, 85, 64) },
      ...(!back ? [{ id: "ankle", d: "M102 258H165L170 277H100Z" }] : []),
    ],
    lines: back ? ["M112 139Q146 160 111 184M111 219Q130 205 157 224"]
      : ["M122 87L137 177M146 89L151 165M126 47L126 62M143 49L145 67M158 55L161 70"],
  };
  if (kind === "arm" || kind === "leg") {
    const arm = kind === "arm";
    const outline = arm
      ? "M119 19Q89 18 80 51Q72 76 84 113L93 143L88 165L96 221L100 264H146L150 219L158 166L148 142L158 111Q172 73 157 45Q148 20 119 19Z"
      : "M82 14Q120 4 158 14Q173 55 157 108L146 141Q148 161 143 184L136 230L139 269H105L108 229Q95 199 94 176Q92 156 96 142L84 109Q68 62 82 14Z";
    const options = arm
      ? ["shoulder", "upper_arm", "elbow", "forearm", "wrist"]
      : [back ? "back_thigh" : "thigh", back ? "back_knee" : "knee", back ? "calf" : "shin", "ankle"];
    const boundaries = arm ? [15, 63, 128, 158, 232, 279] : [7, 121, 156, 235, 279];
    return {
      outline,
      regions: options.map((id, index) => ({ id, d: box(65, boundaries[index], 110, boundaries[index + 1] - boundaries[index] - 3) })),
      lines: arm ? ["M104 133Q122 143 143 134M103 244H143"]
        : [back ? "M104 139Q121 146 141 139M119 169L124 219" : "M106 138Q122 127 139 138M123 165L121 226"],
    };
  }
  if (kind === "head") return {
    outline: back
      ? "M120 20Q68 20 64 83L67 149Q70 191 120 201Q170 191 173 149L176 83Q172 20 120 20Z" + oval(66, 136, 10, 23) + oval(174, 136, 10, 23)
      : "M120 20Q70 20 66 78L67 135Q71 162 91 180Q106 202 120 207Q134 202 149 180Q169 162 173 135L174 78Q170 20 120 20Z" + oval(66, 136, 10, 23) + oval(174, 136, 10, 23),
    regions: [
      { id: "scalp", d: box(60, 14, 120, 55) },
      ...(back ? [{ id: "back_of_head", d: box(62, 72, 116, 142) }] : [
        { id: "forehead", d: box(64, 72, 112, 37) },
        { id: "right_eye", d: oval(92, 124, 25, 14) },
        { id: "left_eye", d: oval(148, 124, 25, 14) },
        { id: "nose", d: "M113 112H127L135 153Q120 164 105 153Z" },
        { id: "jaw", d: "M66 158H174L163 194L120 215L77 194Z" },
      ]),
      { id: "right_ear", d: oval(66, 136, 10, 23) },
      { id: "left_ear", d: oval(174, 136, 10, 23) },
    ],
    lines: back ? ["M87 179Q120 192 153 179"] : ["M82 122Q92 117 102 122M138 122Q148 117 158 122M107 177Q120 174 133 177"],
  };
  if (kind === "neck") return {
    outline: "M86 27Q120 42 154 27L158 111Q166 139 196 153L209 175Q120 207 31 175L44 153Q74 139 82 111Z",
    regions: [
      { id: "right_side", d: box(75, 20, 23, 185) },
      { id: back ? "nape" : "center", d: box(95, 20, 50, 185) },
      { id: "left_side", d: box(142, 20, 23, 185) },
    ],
    lines: back ? ["M120 50V159M98 153Q120 169 142 153"] : ["M92 64L104 139M148 64L136 139M104 139Q120 150 136 139"],
  };
  const torso = "M91 24Q120 37 149 24L184 42Q206 53 198 92L176 151Q167 170 181 220L186 251Q120 271 54 251L59 220Q73 170 64 151L42 92Q34 53 56 42Z";
  if (kind === "abdomen") return {
    outline: "M63 26Q120 43 177 26L166 112Q161 143 176 207L183 251Q120 274 57 251L64 207Q79 143 74 112Z",
    regions: ["upper_right", "upper_center", "upper_left", "right_side", "center", "left_side", "lower_right", "lower_center", "lower_left"]
      .map((id, index) => ({ id, d: box([55, 108, 135][index % 3], 24 + Math.floor(index / 3) * 80, [50, 24, 50][index % 3], 77) })),
    lines: ["M115 146Q120 153 125 146"],
  };
  if (kind === "pelvis") return {
    outline: "M57 39Q120 57 183 39Q212 91 203 144L144 213L139 259H101L96 213L37 144Q28 91 57 39Z",
    regions: [
      { id: "right_hip", d: box(25, 30, 64, 124) }, { id: "left_hip", d: box(151, 30, 64, 124) },
      { id: "center", d: box(92, 30, 56, 239) },
      { id: "right_groin", d: "M62 130L106 161L105 207L85 195L50 153Z" },
      { id: "left_groin", d: "M178 130L134 161L135 207L155 195L190 153Z" },
    ],
    lines: ["M56 88Q74 111 91 135M184 88Q166 111 149 135"],
  };
  if (kind === "lower_back") return {
    outline: "M66 22Q120 38 174 22L169 109Q171 148 190 184L176 236Q120 267 64 236L50 184Q69 148 71 109Z",
    regions: [
      { id: "right_side", d: box(45, 19, 57, 178) },
      { id: "center", d: box(105, 19, 30, 178) },
      { id: "left_side", d: box(138, 19, 57, 178) },
      { id: "sacrum", d: box(49, 200, 142, 64) },
    ],
    lines: ["M120 50V173M97 222Q120 239 143 222"],
  };
  const upper = kind === "upper_back";
  return {
    outline: torso,
    regions: [
      { id: upper ? "right_shoulder" : "upper_right", d: box(35, 20, 67, 93) },
      { id: upper ? "left_shoulder" : "upper_left", d: box(138, 20, 67, 93) },
      { id: "center", d: box(105, 20, 30, 250) },
      { id: upper ? "right_blade" : "lower_right", d: box(35, 116, 67, 155) },
      { id: upper ? "left_blade" : "lower_left", d: box(138, 116, 67, 155) },
    ],
    lines: upper ? ["M120 50V239M83 108Q68 138 86 170M157 108Q172 138 154 170"]
      : ["M72 61Q91 57 105 70M135 70Q149 57 168 61M120 79V207"],
  };
}
