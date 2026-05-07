# -*- coding: utf-8 -*-
"""
DXF to SVG Converter — Generic CLI

Converts any DXF layout file to SVG + JSON metadata for the interactive plan viewer.
Suitable for use as an LLM tool or standalone command-line utility.

USAGE
-----
    python dxf_to_svg.py INPUT.dxf [OPTIONS]

REQUIRED
    INPUT.dxf
        Path to the DXF file to convert.

OPTIONS
    -o, --output-dir DIR
        Directory for output files.
        Default: same directory as INPUT.dxf.

    --template PATH
        Path to an HTML viewer template file.
        If omitted, viewer.html is not generated.

    --svg-width INT      SVG canvas width  (px). Default: 7680
    --svg-height INT     SVG canvas height (px). Default: 4320
    --margin INT         SVG canvas margin (px). Default: 80

    --title TEXT
        Title embedded in metadata and viewer.
        Default: stem of the input filename.

    --station-patterns PAT[,PAT...]
        Comma-separated DXF HATCH pattern names that identify STATION entities.
        Default: ANSI37

    --conveyor-patterns PAT[,PAT...]
        Comma-separated DXF HATCH pattern names that identify CONVEYOR entities.
        Default: ACAD_ISO02W100

    --conveyor-layer LAYER
        Layer name where conveyor HATCH entities reside.
        Default: 0

    --conveyor-min-aspect FLOAT
        Minimum long/short side ratio to classify a region as CONVEYOR.
        Default: 4.0

    --footpath-patterns PAT[,PAT...]
        Comma-separated DXF HATCH pattern names that identify FOOTPATH entities.
        Default: DOTS

    --footpath-layers LAYER[,LAYER...]
        Comma-separated layer names whose entities are classified as FOOTPATH.
        Default: YARD_DUCT

    --facility-colors JSON
        JSON object mapping ACI color index (string key) to facility name.
        Example: '{"2":"Wall","7":"AssemblyLine","20":"IK"}'
        Default: auto-detected from DXF layer names.

    --no-viewer
        Skip viewer HTML generation even when --template is provided.

OUTPUT FILES  (written to --output-dir)
    layout.svg      Rendered SVG drawing.
    metadata.json   Viewer metadata: annotations, PlantSim categories, statistics.
    analysis.json   DXF structure: layers, entity counts, bounding box, transform.
    viewer.html     Interactive HTML viewer (only when --template is supplied
                    and --no-viewer is not set).

EXIT CODES
    0   Success
    1   Input file not found or DXF parse error.
    2   Output directory could not be created.
"""

import argparse
import json
import math
import os
import re
import sys
from collections import Counter, defaultdict

import ezdxf
from ezdxf.colors import DXF_DEFAULT_COLORS


# ============================================================
# ACI COLOR LOOKUP TABLE
# ============================================================
ACI_TO_RGB = {}
for _i in range(256):
    try:
        _v = DXF_DEFAULT_COLORS[_i]
        if isinstance(_v, int):
            ACI_TO_RGB[_i] = f"#{(_v >> 16) & 0xFF:02X}{(_v >> 8) & 0xFF:02X}{_v & 0xFF:02X}"
    except Exception:
        pass
ACI_TO_RGB[0]   = "#000000"   # BYBLOCK  → black
ACI_TO_RGB[256] = "#FFFFFF"   # BYLAYER  → resolved per entity


# ============================================================
# PLANTSIM CATEGORY CONSTANTS  (universal)
# ============================================================
CAT_STATION   = "STATION"
CAT_CONVEYOR  = "CONVEYOR"
CAT_BUFFER    = "BUFFER"
CAT_FOOTPATH  = "FOOTPATH"
CAT_UNDEFINED = "UNDEFINED"

PLANTSIM_COLORS = {
    CAT_STATION:   "#FF9800",
    CAT_CONVEYOR:  "#2196F3",
    CAT_BUFFER:    "#9C27B0",
    CAT_FOOTPATH:  "#795548",
    CAT_UNDEFINED: "#9E9E9E",
}


# ============================================================
# CLI & CONFIGURATION
# ============================================================
def parse_args():
    if len(sys.argv) == 1:
        print(__doc__.strip())
        sys.exit(0)

    p = argparse.ArgumentParser(
        prog="dxf_to_svg",
        description="Convert a DXF layout file to SVG + JSON metadata.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    p.add_argument("input", metavar="INPUT.dxf",
                   help="DXF file to convert")
    p.add_argument("-o", "--output-dir", default=None,
                   help="Output directory (default: same dir as input)")
    p.add_argument("--template", default=None,
                   help="viewer.html template path; viewer.html skipped if omitted")
    p.add_argument("--svg-width",  type=int, default=7680)
    p.add_argument("--svg-height", type=int, default=4320)
    p.add_argument("--margin",     type=int, default=80)
    p.add_argument("--title",      default=None,
                   help="Document title (default: input filename stem)")

    # Categorization rules — all have sensible defaults
    p.add_argument("--station-patterns",     default="ANSI37",
                   help="Comma-separated HATCH patterns → STATION  (default: ANSI37)")
    p.add_argument("--conveyor-patterns",    default="ACAD_ISO02W100",
                   help="Comma-separated HATCH patterns → CONVEYOR (default: ACAD_ISO02W100)")
    p.add_argument("--conveyor-layer",       default="0",
                   help="Layer for CONVEYOR hatches (default: 0)")
    p.add_argument("--conveyor-min-aspect",  type=float, default=4.0,
                   help="Min long/short aspect ratio → CONVEYOR (default: 4.0)")
    p.add_argument("--footpath-patterns",    default="DOTS",
                   help="Comma-separated HATCH patterns → FOOTPATH (default: DOTS)")
    p.add_argument("--footpath-layers",      default="YARD_DUCT",
                   help="Comma-separated layer names → FOOTPATH   (default: YARD_DUCT)")
    p.add_argument("--facility-colors",      default=None, metavar="JSON",
                   help='JSON map ACI-index→name e.g. \'{"2":"Wall","20":"IK"}\'. '
                        "Default: auto from layer names.")
    p.add_argument("--no-viewer", action="store_true",
                   help="Skip viewer HTML generation")
    return p.parse_args()


class Config:
    """Runtime settings derived from CLI arguments."""

    def __init__(self, args):
        self.dxf_path   = os.path.abspath(args.input)
        self.output_dir = (os.path.abspath(args.output_dir) if args.output_dir
                           else os.path.dirname(self.dxf_path))
        self.template   = args.template
        self.svg_width  = args.svg_width
        self.svg_height = args.svg_height
        self.margin     = args.margin
        self.title      = (args.title
                           or os.path.splitext(os.path.basename(self.dxf_path))[0])

        self.station_patterns    = {p.strip() for p in args.station_patterns.split(",")}
        self.conveyor_patterns   = {p.strip() for p in args.conveyor_patterns.split(",")}
        self.conveyor_layer      = args.conveyor_layer
        self.conveyor_min_aspect = args.conveyor_min_aspect
        self.footpath_patterns   = {p.strip() for p in args.footpath_patterns.split(",")}
        self.footpath_layers     = {l.strip() for l in args.footpath_layers.split(",")}
        self.facility_colors_json = args.facility_colors
        self.no_viewer = args.no_viewer


# ============================================================
# PER-RUN STATE  (reset in main)
# ============================================================
skipped_entities = []


# ============================================================
# PART 1: DXF PARSING
# ============================================================
def build_facility_colors(doc, json_str=None):
    """
    Map ACI-color-index (int) → facility name (str).
    Uses json_str if provided; otherwise auto-detects from DXF layer names.
    """
    if json_str:
        raw = json.loads(json_str)
        return {int(k): str(v) for k, v in raw.items()}
    result = {}
    for layer in doc.layers:
        aci = layer.dxf.color
        if aci not in (0, 256) and aci not in result:
            result[aci] = layer.dxf.name
    return result


def parse_dxf(cfg):
    """Parse DXF file; returns (entities, doc, layer_colors, facility_colors)."""
    print(f"[1/6] Parsing DXF: {cfg.dxf_path}")
    doc = ezdxf.readfile(cfg.dxf_path)
    msp = doc.modelspace()

    layer_colors    = {layer.dxf.name: layer.dxf.color for layer in doc.layers}
    facility_colors = build_facility_colors(doc, cfg.facility_colors_json)

    entities = []
    for idx, e in enumerate(msp):
        try:
            ent = extract_entity(e, idx, layer_colors, doc, facility_colors)
            if ent:
                entities.append(ent)
        except Exception as ex:
            skipped_entities.append({
                "index": idx,
                "handle": getattr(e.dxf, "handle", "unknown"),
                "type": e.dxftype(),
                "reason": str(ex),
            })

    print(f"  Parsed {len(entities)} entities, skipped {len(skipped_entities)}")
    return entities, doc, layer_colors, facility_colors


def resolve_color(entity_color, layer_name, layer_colors):
    """Resolve ACI color, handling BYLAYER (256) and BYBLOCK (0)."""
    if entity_color == 256:
        c = layer_colors.get(layer_name, 7)
        return 7 if c == 256 else c
    if entity_color == 0:
        return 7
    return entity_color


def aci_to_hex(aci_color):
    """Convert ACI color index to hex RGB string."""
    if aci_color in ACI_TO_RGB:
        return ACI_TO_RGB[aci_color]
    try:
        v = DXF_DEFAULT_COLORS[aci_color]
        if isinstance(v, int):
            return f"#{(v >> 16) & 0xFF:02X}{(v >> 8) & 0xFF:02X}{v & 0xFF:02X}"
    except Exception:
        pass
    return "#FFFFFF"


def extract_entity(e, idx, layer_colors, doc, facility_colors):
    """Extract a single DXF entity into a plain dictionary."""
    etype  = e.dxftype()
    handle = getattr(e.dxf, "handle", f"idx_{idx}")
    layer  = getattr(e.dxf, "layer", "0")
    raw_color      = getattr(e.dxf, "color", 256)
    resolved_color = resolve_color(raw_color, layer, layer_colors)
    hex_color      = aci_to_hex(resolved_color)

    base = {
        "index": idx,
        "handle": handle,
        "type": etype,
        "layer": layer,
        "raw_color": raw_color,
        "resolved_color": resolved_color,
        "hex_color": hex_color,
        "plantsim_category": None,
        "facility": facility_colors.get(resolved_color),
    }

    if etype == "LINE":
        sx, sy = e.dxf.start.x, e.dxf.start.y
        ex, ey = e.dxf.end.x, e.dxf.end.y
        base.update({
            "geometry": "line",
            "start": (sx, sy), "end": (ex, ey),
            "bbox": (min(sx, ex), min(sy, ey), max(sx, ex), max(sy, ey)),
        })

    elif etype == "LWPOLYLINE":
        pts    = [(p[0], p[1]) for p in e.get_points()]
        closed = e.closed
        if pts:
            xs = [p[0] for p in pts]
            ys = [p[1] for p in pts]
            bbox = (min(xs), min(ys), max(xs), max(ys))
        else:
            bbox = (0, 0, 0, 0)
        base.update({"geometry": "polyline", "points": pts,
                     "closed": closed, "bbox": bbox})

    elif etype == "CIRCLE":
        cx, cy = e.dxf.center.x, e.dxf.center.y
        r = e.dxf.radius
        base.update({
            "geometry": "circle", "center": (cx, cy), "radius": r,
            "bbox": (cx - r, cy - r, cx + r, cy + r),
        })

    elif etype == "TEXT":
        text     = e.dxf.text
        ix, iy   = e.dxf.insert.x, e.dxf.insert.y
        rotation = getattr(e.dxf, "rotation", 0)
        height   = getattr(e.dxf, "height", 0)
        base.update({
            "geometry": "text", "text": text, "insert": (ix, iy),
            "rotation": rotation, "height": height,
            "bbox": (ix, iy, ix + height * len(text) * 0.6, iy + height),
        })

    elif etype == "HATCH":
        pattern    = getattr(e.dxf, "pattern_name", "SOLID")
        paths_data = []
        all_pts    = []
        for path in e.paths:
            ptype = type(path).__name__
            if ptype == "PolylinePath":
                verts = [(v[0], v[1]) for v in path.vertices]
                paths_data.append({"type": "polyline", "vertices": verts})
                all_pts.extend(verts)
            elif ptype == "EdgePath":
                edges = []
                for edge in path.edges:
                    en = type(edge).__name__
                    if en == "LineEdge":
                        s  = (edge.start[0], edge.start[1])
                        ev = (edge.end[0],   edge.end[1])
                        edges.append({"type": "line", "start": s, "end": ev})
                        all_pts.extend([s, ev])
                    elif en == "ArcEdge":
                        cx2, cy2 = edge.center[0], edge.center[1]
                        r2 = edge.radius
                        edges.append({
                            "type": "arc", "center": (cx2, cy2), "radius": r2,
                            "start_angle": getattr(edge, "start_angle", 0),
                            "end_angle":   getattr(edge, "end_angle", 360),
                            "ccw":         getattr(edge, "ccw", True),
                        })
                        all_pts += [(cx2 - r2, cy2 - r2), (cx2 + r2, cy2 + r2)]
                    elif en == "EllipseEdge":
                        cx2, cy2 = edge.center[0], edge.center[1]
                        ma = getattr(edge, "major_axis", (1, 0))
                        rm = (math.sqrt(ma[0]**2 + ma[1]**2)
                              if hasattr(ma, "__len__") else abs(ma))
                        all_pts += [(cx2 - rm, cy2 - rm), (cx2 + rm, cy2 + rm)]
                        edges.append({"type": "ellipse", "center": (cx2, cy2)})
                    elif en == "SplineEdge":
                        ctrl = [(cp[0], cp[1]) for cp in getattr(edge, "control_points", [])]
                        fit  = [(fp[0], fp[1]) for fp in getattr(edge, "fit_points", [])]
                        all_pts.extend(ctrl + fit)
                        edges.append({"type": "spline",
                                      "control_points": ctrl, "fit_points": fit})
                paths_data.append({"type": "edge", "edges": edges})
        if all_pts:
            xs = [p[0] for p in all_pts]
            ys = [p[1] for p in all_pts]
            bbox = (min(xs), min(ys), max(xs), max(ys))
        else:
            bbox = (0, 0, 0, 0)
        base.update({"geometry": "hatch", "pattern": pattern,
                     "paths": paths_data, "bbox": bbox})

    elif etype == "INSERT":
        ix, iy     = e.dxf.insert.x, e.dxf.insert.y
        block_name = e.dxf.name
        rotation   = getattr(e.dxf, "rotation", 0)
        x_scale    = getattr(e.dxf, "xscale", 1.0)
        y_scale    = getattr(e.dxf, "yscale", 1.0)
        base.update({
            "geometry": "insert", "block_name": block_name,
            "insert": (ix, iy), "rotation": rotation,
            "xscale": x_scale, "yscale": y_scale, "bbox": (ix, iy, ix, iy),
        })
        try:
            block = doc.blocks.get(block_name)
            if block:
                rad  = math.radians(rotation)
                cosr, sinr = math.cos(rad), math.sin(rad)
                def _t(px, py):
                    px2, py2 = px * x_scale, py * y_scale
                    return (px2 * cosr - py2 * sinr + ix,
                            px2 * sinr + py2 * cosr + iy)
                base["block_lines"] = [
                    (_t(be.dxf.start.x, be.dxf.start.y),
                     _t(be.dxf.end.x,   be.dxf.end.y))
                    for be in block if be.dxftype() == "LINE"
                ]
        except Exception:
            base["block_lines"] = []

    elif etype == "DIMENSION":
        base.update({"geometry": "dimension", "bbox": (0, 0, 0, 0)})
    else:
        base.update({"geometry": "unknown", "bbox": (0, 0, 0, 0)})

    return base


# ============================================================
# PART 2: BOUNDING BOX & COORDINATE SYSTEM
# ============================================================
def compute_drawing_bbox(entities):
    """Bounding box of all entities, excluding degenerate/outlier values."""
    all_x, all_y = [], []
    for ent in entities:
        bb = ent.get("bbox")
        if bb and bb != (0, 0, 0, 0):
            x1, y1, x2, y2 = bb
            if abs(x1) < 1e12 and abs(y1) < 1e12:
                all_x += [x1, x2]
                all_y += [y1, y2]
    if not all_x:
        return (0.0, 0.0, 1.0, 1.0)
    return (min(all_x), min(all_y), max(all_x), max(all_y))


def compute_thresholds(dxf_bbox):
    """
    Derive scale-invariant categorization thresholds from the drawing bounding box.
    All values are expressed as fractions of drawing dimensions so the same
    heuristics apply regardless of DXF unit (mm, inch, etc.) or drawing scale.
    """
    x1, y1, x2, y2 = dxf_bbox
    w    = max(x2 - x1, 1.0)
    h    = max(y2 - y1, 1.0)
    diag = math.sqrt(w * w + h * h)
    return {
        # Station merging
        "station_merge_gap":   h    * 0.028,  # max y-gap between mergeable hatches
        "station_x_tol":       w    * 0.003,  # x-boundary match tolerance
        "station_area_ratio":  0.4,            # size ratio to treat as sub-component
        "station_overlap_tol": diag * 0.003,  # polyline→station bbox match tolerance
        "station_text_expand": h    * 0.014,  # text search expand around station bbox
        "station_step_expand": w    * 0.003,  # step-number digit text search expand
        "station_min_circ_r":  h    * 0.014,  # min radius for circle-type station
        # Conveyor
        "conveyor_pl_expand":  diag * 0.0003, # polyline bbox overlap expand
        # Buffer / rack
        "rack_line_min":       diag * 0.0005, # min rack line length
        "rack_line_max":       diag * 0.016,  # max rack line length
        "rack_cluster_dist":   diag * 0.011,  # proximity threshold for line clustering
        "rack_group_x_dist":   w    * 0.12,   # rack-cluster x-distance for grouping
        "rack_group_y_dist":   h    * 0.35,   # rack-cluster y-distance for grouping
    }


def create_transform(dxf_bbox, svg_w, svg_h, margin=80):
    """Return (transform_fn, scale, offset, actual_size). Y-axis is flipped."""
    x1, y1, x2, y2 = dxf_bbox
    dxf_w  = max(x2 - x1, 1.0)
    dxf_h  = max(y2 - y1, 1.0)
    draw_w = svg_w - 2 * margin
    draw_h = svg_h - 2 * margin
    scale  = min(draw_w / dxf_w, draw_h / dxf_h)
    act_w  = dxf_w * scale
    act_h  = dxf_h * scale
    off_x  = margin + (draw_w - act_w) / 2
    off_y  = margin + (draw_h - act_h) / 2

    def transform(dx, dy):
        return ((dx - x1) * scale + off_x,
                (y2 - dy) * scale + off_y)   # flip Y

    return transform, scale, (off_x, off_y), (act_w, act_h)


# ============================================================
# PART 3: PLANTSIM CATEGORIZATION
# ============================================================
def categorize_entities(entities, cfg, thresholds):
    """Classify entities into PlantSim categories."""
    print("[2/6] Categorizing entities...")

    hatches   = [e for e in entities if e["type"] == "HATCH"]
    polylines = [e for e in entities if e["type"] == "LWPOLYLINE"]
    texts     = [e for e in entities if e["type"] == "TEXT"]
    circles   = [e for e in entities if e["type"] == "CIRCLE"]
    lines     = [e for e in entities if e["type"] == "LINE"]
    inserts   = [e for e in entities if e["type"] == "INSERT"]
    categorized = set()

    stations  = classify_stations(hatches, polylines, texts, circles,
                                   categorized, cfg, thresholds)

    # Exclude LWPOLYLINE entities whose bbox closely matches a station entity
    tol = thresholds["station_overlap_tol"]
    station_bboxes = [
        e["bbox"] for e in hatches + circles
        if e.get("plantsim_category") == CAT_STATION
    ]
    excluded = 0
    for pl in polylines:
        if pl["handle"] in categorized:
            continue
        bb = pl["bbox"]
        for sb in station_bboxes:
            if (abs(bb[0]-sb[0]) < tol and abs(bb[1]-sb[1]) < tol and
                    abs(bb[2]-sb[2]) < tol and abs(bb[3]-sb[3]) < tol):
                categorized.add(pl["handle"])
                excluded += 1
                break
    print(f"    Station-overlapping polylines excluded: {excluded}")

    conveyors = classify_conveyors(hatches, polylines, inserts, lines,
                                    categorized, cfg, thresholds)
    footpaths = classify_footpaths(hatches, polylines, categorized, cfg)
    buffers   = classify_buffers(polylines, lines, categorized, thresholds)

    # Remaining uncategorised LWPOLYLINE / HATCH → BUFFER
    extra = 0
    for e in entities:
        if e["type"] in ("LWPOLYLINE", "HATCH") and e["handle"] not in categorized:
            e["plantsim_category"] = CAT_BUFFER
            categorized.add(e["handle"])
            buffers.append({
                "type":   "area",
                "bbox":   e.get("bbox", (0, 0, 0, 0)),
                "handle": e["handle"],
                "layer":  e.get("layer", ""),
                "color":  e.get("resolved_color", 7),
            })
            extra += 1

    print(f"  STATION: {len(stations)}, CONVEYOR: {len(conveyors)}, "
          f"BUFFER: {len(buffers)} (rack: {len(buffers)-extra}, area: {extra}), "
          f"FOOTPATH: {len(footpaths)}")

    return {
        CAT_STATION:  stations,
        CAT_CONVEYOR: conveyors,
        CAT_BUFFER:   buffers,
        CAT_FOOTPATH: footpaths,
    }


def bbox_overlap(bb1, bb2, expand=0):
    x1a, y1a, x2a, y2a = bb1
    x1b, y1b, x2b, y2b = bb2
    return (x1a - expand <= x2b and x2a + expand >= x1b and
            y1a - expand <= y2b and y2a + expand >= y1b)


def point_in_bbox(px, py, bbox, expand=0):
    x1, y1, x2, y2 = bbox
    return (x1 - expand) <= px <= (x2 + expand) and (y1 - expand) <= py <= (y2 + expand)


def _digit_texts_in_bbox(bbox, texts, expand):
    """Return digit-only TEXT values whose insert point is inside bbox+expand."""
    return [
        t.get("text", "").strip()
        for t in texts
        if t.get("text", "").strip().isdigit()
        and point_in_bbox(t.get("insert", (0, 0))[0],
                          t.get("insert", (0, 0))[1],
                          bbox, expand=expand)
    ]


def classify_stations(hatches, polylines, texts, circles,
                       categorized, cfg, thresholds):
    """Classify STATION entities via HATCH pattern matching + spatial merging."""
    stations = []
    merge_gap   = thresholds["station_merge_gap"]
    x_tol       = thresholds["station_x_tol"]
    area_ratio  = thresholds["station_area_ratio"]
    text_expand = thresholds["station_text_expand"]
    step_expand = thresholds["station_step_expand"]
    min_circ_r  = thresholds["station_min_circ_r"]

    # 1) Collect & sort station-pattern hatches
    station_raw = sorted(
        [h for h in hatches if h.get("pattern") in cfg.station_patterns],
        key=lambda h: (h["bbox"][0], h["bbox"][1]),
    )

    # 2) Merge adjacent / overlapping hatches into single station groups
    merged_ids = set()
    station_groups = []

    for h in station_raw:
        if id(h) in merged_ids:
            continue
        group  = [h]
        grp_bb = list(h["bbox"])
        changed = True
        while changed:
            changed = False
            for h2 in station_raw:
                if id(h2) in merged_ids or any(id(h2) == id(g) for g in group):
                    continue
                bb2  = h2["bbox"]
                merge = False

                # Condition A: overlapping bboxes where one is much smaller
                if bbox_overlap(tuple(grp_bb), bb2, expand=x_tol):
                    a1 = (grp_bb[2]-grp_bb[0]) * (grp_bb[3]-grp_bb[1])
                    a2 = (bb2[2]-bb2[0])        * (bb2[3]-bb2[1])
                    if a2 < a1 * area_ratio or a1 < a2 * area_ratio:
                        merge = True

                # Condition B: same x-range, adjacent in y, same step-number text
                if not merge:
                    x_match = (abs(grp_bb[0]-bb2[0]) < x_tol and
                               abs(grp_bb[2]-bb2[2]) < x_tol)
                    y_gap   = min(abs(grp_bb[1]-bb2[3]), abs(grp_bb[3]-bb2[1]))
                    y_ovlap = grp_bb[1] <= bb2[3] and grp_bb[3] >= bb2[1]
                    if x_match and (y_gap < merge_gap or y_ovlap):
                        s1 = _digit_texts_in_bbox(tuple(grp_bb), texts, step_expand)
                        s2 = _digit_texts_in_bbox(bb2, texts, step_expand)
                        if s1 and s2 and set(s1) & set(s2):
                            merge = True

                if merge:
                    group.append(h2)
                    merged_ids.add(id(h2))
                    grp_bb[0] = min(grp_bb[0], bb2[0])
                    grp_bb[1] = min(grp_bb[1], bb2[1])
                    grp_bb[2] = max(grp_bb[2], bb2[2])
                    grp_bb[3] = max(grp_bb[3], bb2[3])
                    changed = True

        station_groups.append({
            "hatches": group, "bbox": tuple(grp_bb),
            "primary_handle": h["handle"],
            "color": h["resolved_color"], "layer": h["layer"],
        })

    # 3) Circle-type stations: large circle with nearby text label
    circle_stations = []
    for c in circles:
        if c["radius"] > min_circ_r:
            cx, cy = c["center"]
            for t in texts:
                txt  = t.get("text", "")
                tx, ty = t.get("insert", (0, 0))
                if math.sqrt((cx-tx)**2 + (cy-ty)**2) < c["radius"] * 2 and len(txt) >= 2:
                    circle_stations.append({"circle": c, "text": txt, "bbox": c["bbox"]})
                    break

    # 4) Attach nearby texts and mark entities
    for sg in station_groups:
        bb = sg["bbox"]
        sg["texts"] = [
            t.get("text", "") for t in texts
            if point_in_bbox(t.get("insert", (0, 0))[0],
                             t.get("insert", (0, 0))[1],
                             bb, expand=text_expand)
        ]
        for h in sg["hatches"]:
            h["plantsim_category"] = CAT_STATION
            categorized.add(h["handle"])
        stations.append({
            "type":   "hatch_station",
            "bbox":   sg["bbox"],
            "handle": sg["primary_handle"],
            "color":  sg["color"],
            "layer":  sg["layer"],
            "texts":  sg.get("texts", []),
        })

    for cs in circle_stations:
        cs["circle"]["plantsim_category"] = CAT_STATION
        categorized.add(cs["circle"]["handle"])
        stations.append({
            "type":   "circle_station",
            "bbox":   cs["bbox"],
            "handle": cs["circle"]["handle"],
            "color":  cs["circle"]["resolved_color"],
            "layer":  cs["circle"]["layer"],
            "texts":  [cs.get("text", "")],
        })

    print(f"    Stations: {len(stations)} "
          f"(hatch groups: {len(station_groups)}, circles: {len(circle_stations)})")
    return stations


def classify_conveyors(hatches, polylines, inserts, lines,
                        categorized, cfg, thresholds):
    """Classify CONVEYOR entities via HATCH pattern + elongation heuristic."""
    conveyors = []
    min_ar  = cfg.conveyor_min_aspect
    pl_exp  = thresholds["conveyor_pl_expand"]

    conv_hatches = [
        h for h in hatches
        if h.get("pattern") in cfg.conveyor_patterns
        and h["layer"] == cfg.conveyor_layer
    ]
    for ch in conv_hatches:
        bb = ch["bbox"]
        w  = bb[2] - bb[0]
        hv = bb[3] - bb[1]
        if w <= 0 or hv <= 0:
            continue
        ar = max(w / hv, hv / w)
        if ar < min_ar:
            continue

        ch["plantsim_category"] = CAT_CONVEYOR
        categorized.add(ch["handle"])

        for pl in polylines:
            if pl["handle"] in categorized:
                continue
            if not bbox_overlap(pl["bbox"], bb, expand=pl_exp):
                continue
            pw = pl["bbox"][2] - pl["bbox"][0]
            ph = pl["bbox"][3] - pl["bbox"][1]
            if pw > 0 and ph > 0 and max(pw / ph, ph / pw) >= min_ar:
                pl["plantsim_category"] = CAT_CONVEYOR
                categorized.add(pl["handle"])

        conveyors.append({"bbox": bb, "handle": ch["handle"], "aspect_ratio": ar})

    print(f"    Conveyors: {len(conveyors)}")
    return conveyors


def classify_footpaths(hatches, polylines, categorized, cfg):
    """Classify FOOTPATH entities via HATCH pattern or layer name."""
    footpaths = []

    for h in hatches:
        if (h.get("pattern") in cfg.footpath_patterns
                and h["layer"] in cfg.footpath_layers):
            h["plantsim_category"] = CAT_FOOTPATH
            categorized.add(h["handle"])
            footpaths.append({"bbox": h["bbox"], "handle": h["handle"]})

    for pl in polylines:
        if pl["layer"] in cfg.footpath_layers and pl["handle"] not in categorized:
            pl["plantsim_category"] = CAT_FOOTPATH
            categorized.add(pl["handle"])

    print(f"    Footpaths: {len(footpaths)}")
    return footpaths


def classify_buffers(polylines, lines, categorized, thresholds):
    """Classify BUFFER entities by detecting rack/ladder line-cluster patterns."""
    buffers     = []
    line_min     = thresholds["rack_line_min"]
    line_max     = thresholds["rack_line_max"]
    cluster_dist = thresholds["rack_cluster_dist"]
    grp_x        = thresholds["rack_group_x_dist"]
    grp_y        = thresholds["rack_group_y_dist"]

    # Collect candidate rack lines: moderate length, not yet categorized
    rack_lines = []
    for ln in lines:
        if ln["handle"] in categorized:
            continue
        bb = ln["bbox"]
        w  = bb[2] - bb[0]
        hv = bb[3] - bb[1]
        length = math.sqrt(w * w + hv * hv)
        if not (line_min < length < line_max):
            continue
        sx, sy = ln["start"]
        ex, ey = ln["end"]
        dx, dy = abs(ex - sx), abs(ey - sy)
        ori = "H" if dx > dy * 2 else ("V" if dy > dx * 2 else "D")
        rack_lines.append({
            "entity": ln,
            "cx": (sx + ex) / 2, "cy": (sy + ey) / 2,
            "ori": ori,
        })

    # Cluster rack lines by proximity
    used = set()
    rack_clusters = []

    for i, rl in enumerate(rack_lines):
        if i in used:
            continue
        cluster = [rl]
        used.add(i)
        changed = True
        while changed:
            changed = False
            for j, rl2 in enumerate(rack_lines):
                if j in used:
                    continue
                for cl in cluster:
                    d = math.sqrt((rl2["cx"]-cl["cx"])**2 + (rl2["cy"]-cl["cy"])**2)
                    if d < cluster_dist:
                        cluster.append(rl2)
                        used.add(j)
                        changed = True
                        break

        # Rack signature: ≥2 vertical lines + ≥3 horizontal lines
        h_cnt = sum(1 for c in cluster if c["ori"] == "H")
        v_cnt = sum(1 for c in cluster if c["ori"] == "V")
        if v_cnt < 2 or h_cnt < 3:
            continue

        all_bb = [c["entity"]["bbox"] for c in cluster]
        merged = (min(b[0] for b in all_bb), min(b[1] for b in all_bb),
                  max(b[2] for b in all_bb), max(b[3] for b in all_bb))
        for c in cluster:
            c["entity"]["plantsim_category"] = CAT_BUFFER
            categorized.add(c["entity"]["handle"])
        rack_clusters.append({
            "bbox":   merged,
            "center": (sum(c["cx"] for c in cluster) / len(cluster),
                       sum(c["cy"] for c in cluster) / len(cluster)),
            "line_count": len(cluster),
        })

    # Group nearby rack clusters into rack units
    used_r = set()
    for i, rc in enumerate(rack_clusters):
        if i in used_r:
            continue
        group = [rc]
        used_r.add(i)
        changed = True
        while changed:
            changed = False
            for j, rc2 in enumerate(rack_clusters):
                if j in used_r:
                    continue
                for g in group:
                    if (abs(rc2["center"][0]-g["center"][0]) < grp_x and
                            abs(rc2["center"][1]-g["center"][1]) < grp_y):
                        group.append(rc2)
                        used_r.add(j)
                        changed = True
                        break

        all_bb = [g["bbox"] for g in group]
        merged = (min(b[0] for b in all_bb), min(b[1] for b in all_bb),
                  max(b[2] for b in all_bb), max(b[3] for b in all_bb))
        buffers.append({
            "type":        "rack",
            "bbox":        merged,
            "rack_units":  len(group),
            "total_lines": sum(g["line_count"] for g in group),
        })

    print(f"    Buffers from rack clusters: {len(buffers)} groups "
          f"({len(rack_clusters)} units)")
    return buffers


# ============================================================
# PART 4: SVG GENERATION
# ============================================================
def generate_svg(entities, transform_fn, scale, categories, dxf_bbox, cfg):
    """Generate SVG content string and annotation list."""
    print("[3/6] Generating SVG...")

    svg_elements = []
    texts_for_annotation = []

    svg_elements.append(
        f'<rect width="{cfg.svg_width}" height="{cfg.svg_height}" fill="#0a0a0a"/>'
    )
    svg_elements.append(generate_grid(transform_fn, dxf_bbox, scale))

    draw_order = ["HATCH", "LINE", "LWPOLYLINE", "CIRCLE", "INSERT", "DIMENSION", "TEXT"]
    by_type = defaultdict(list)
    for e in entities:
        by_type[e["type"]].append(e)

    cat_elements = defaultdict(list)
    el_count = 0
    for etype in draw_order:
        for e in by_type.get(etype, []):
            try:
                svg_el = entity_to_svg(e, transform_fn, scale, texts_for_annotation)
                if svg_el:
                    cat_elements[e.get("plantsim_category") or ""].append(svg_el)
                    el_count += 1
            except Exception as ex:
                skipped_entities.append({
                    "handle": e.get("handle", "?"),
                    "type":   e.get("type", "?"),
                    "reason": f"SVG error: {ex}",
                })

    if "" in cat_elements:
        svg_elements.append('<g id="cat-base">')
        svg_elements.extend(cat_elements[""])
        svg_elements.append("</g>")

    for cat_name in [CAT_FOOTPATH, CAT_UNDEFINED, CAT_BUFFER, CAT_CONVEYOR, CAT_STATION]:
        if cat_name in cat_elements:
            svg_elements.append(f'<g id="cat-{cat_name}">')
            svg_elements.extend(cat_elements[cat_name])
            svg_elements.append("</g>")

    ann_svg, ann_data = generate_annotations(texts_for_annotation, transform_fn, scale)
    svg_elements.append(ann_svg)

    print(f"  Generated {el_count} SVG elements, {len(ann_data)} annotations")
    return "\n".join(svg_elements), ann_data


def generate_grid(transform_fn, dxf_bbox, scale):
    """Generate a light coordinate reference grid."""
    x1, y1, x2, y2 = dxf_bbox
    raw = max(x2 - x1, y2 - y1) / 10
    exp = math.floor(math.log10(raw)) if raw > 0 else 0
    spacing = max(10 ** exp * round(raw / 10**exp), 1)

    lines = ['<g id="grid" opacity="0.15" stroke="#444444" stroke-width="0.5">']
    x = math.ceil(x1 / spacing) * spacing
    while x <= x2:
        s = transform_fn(x, y1)
        e = transform_fn(x, y2)
        lines.append(f'<line x1="{s[0]:.1f}" y1="{s[1]:.1f}" '
                     f'x2="{e[0]:.1f}" y2="{e[1]:.1f}"/>')
        x += spacing
    y = math.ceil(y1 / spacing) * spacing
    while y <= y2:
        s = transform_fn(x1, y)
        e = transform_fn(x2, y)
        lines.append(f'<line x1="{s[0]:.1f}" y1="{s[1]:.1f}" '
                     f'x2="{e[0]:.1f}" y2="{e[1]:.1f}"/>')
        y += spacing
    lines.append("</g>")
    return "\n".join(lines)


def entity_to_svg(e, tf, scale, texts_list):
    """Convert one entity to an SVG element string; returns None to skip."""
    etype  = e["type"]
    color  = e["hex_color"]
    handle = e["handle"]
    cat    = e.get("plantsim_category") or ""
    fac    = e.get("facility") or ""
    cat_a  = f' data-plantsim-category="{cat}"' if cat else ' data-plantsim-category=""'
    fac_a  = f' data-facility="{fac}"' if fac else ""

    if etype == "LINE":
        sx, sy = tf(*e["start"])
        ex, ey = tf(*e["end"])
        return (f'<line x1="{sx:.2f}" y1="{sy:.2f}" x2="{ex:.2f}" y2="{ey:.2f}" '
                f'stroke="{color}" stroke-width="0.5" '
                f'data-handle="{handle}"{cat_a}{fac_a}/>')

    elif etype == "LWPOLYLINE":
        pts = e.get("points", [])
        if not pts:
            return None
        tpts = [tf(p[0], p[1]) for p in pts]
        pstr = " ".join(f"{p[0]:.2f},{p[1]:.2f}" for p in tpts)
        tag  = "polygon" if e.get("closed") else "polyline"
        fill, sw = "none", 1.0
        if cat == CAT_CONVEYOR:
            fill, sw = "rgba(33,150,243,0.15)", 1.5
        elif cat == CAT_STATION:
            sw = 1.5
        elif cat == CAT_BUFFER and e.get("closed"):
            fill = "transparent"  # hit-testable interior; "none" would block clicks
        return (f'<{tag} points="{pstr}" stroke="{color}" stroke-width="{sw}" '
                f'fill="{fill}" data-handle="{handle}"{cat_a}{fac_a}/>')

    elif etype == "CIRCLE":
        cx, cy = tf(*e["center"])
        r = e["radius"] * scale
        fill, sw = "none", 0.8
        if cat == CAT_STATION:
            fill, sw = "rgba(255,152,0,0.1)", 2.0
        return (f'<circle cx="{cx:.2f}" cy="{cy:.2f}" r="{r:.2f}" '
                f'stroke="{color}" stroke-width="{sw}" fill="{fill}" '
                f'data-handle="{handle}"{cat_a}{fac_a}/>')

    elif etype == "TEXT":
        text = e.get("text", "")
        if not text.strip():
            return None
        ix, iy = e["insert"]
        sx, sy = tf(ix, iy)
        texts_list.append({
            "text": text, "svg_x": sx, "svg_y": sy,
            "dxf_x": ix, "dxf_y": iy,
            "rotation": e.get("rotation", 0),
            "height": e.get("height", 0) * scale,
            "color": color, "layer": e["layer"], "handle": handle,
        })
        return None  # rendered as annotation marker

    elif etype == "HATCH":
        return hatch_to_svg(e, tf, scale, color, handle, cat_a, fac_a, cat)

    elif etype == "INSERT":
        block_lines = e.get("block_lines", [])
        if not block_lines:
            return None
        bname = e.get("block_name", "")
        parts = [
            f'<line x1="{tf(*s)[0]:.2f}" y1="{tf(*s)[1]:.2f}" '
            f'x2="{tf(*ev)[0]:.2f}" y2="{tf(*ev)[1]:.2f}" '
            f'stroke="{color}" stroke-width="0.3" '
            f'data-handle="{handle}"{cat_a}{fac_a}/>'
            for s, ev in block_lines
        ]
        return (f'<g data-handle="{handle}" data-block="{bname}"{cat_a}{fac_a}>\n'
                + "\n".join(parts) + "\n</g>")

    return None


def hatch_to_svg(e, tf, scale, color, handle, cat_attr, fac_attr, cat):
    """Convert HATCH entity to SVG path element(s)."""
    paths = e.get("paths", [])
    if not paths:
        return None

    pattern = e.get("pattern", "SOLID")
    opacity = "0.3"
    if cat == CAT_STATION:
        opacity = "0.25"
    elif cat == CAT_CONVEYOR:
        opacity = "0.2"
    elif cat == CAT_FOOTPATH:
        opacity = "0.15"

    svg_paths = []
    for p in paths:
        if p["type"] == "polyline":
            verts = p.get("vertices", [])
            if len(verts) < 2:
                continue
            tv = [tf(v[0], v[1]) for v in verts]
            d  = f"M {tv[0][0]:.2f},{tv[0][1]:.2f}"
            for pt in tv[1:]:
                d += f" L {pt[0]:.2f},{pt[1]:.2f}"
            svg_paths.append(d + " Z")

        elif p["type"] == "edge":
            d_parts = []
            for edge in p.get("edges", []):
                if edge["type"] == "line":
                    s  = tf(*edge["start"])
                    ev = tf(*edge["end"])
                    if not d_parts:
                        d_parts.append(f"M {s[0]:.2f},{s[1]:.2f}")
                    d_parts.append(f"L {ev[0]:.2f},{ev[1]:.2f}")
                elif edge["type"] == "arc":
                    cx2, cy2 = tf(*edge["center"])
                    r2  = edge["radius"] * scale
                    sa  = edge.get("start_angle", 0)
                    ea  = edge.get("end_angle", 360)
                    ccw = edge.get("ccw", True)
                    sar, ear = math.radians(sa), math.radians(ea)
                    sxa = cx2 + r2 * math.cos(sar)
                    sya = cy2 - r2 * math.sin(sar)
                    exa = cx2 + r2 * math.cos(ear)
                    eya = cy2 - r2 * math.sin(ear)
                    ad  = ea - sa
                    if ad < 0:
                        ad += 360
                    la  = 1 if ad > 180 else 0
                    sw  = 0 if ccw else 1
                    if not d_parts:
                        d_parts.append(f"M {sxa:.2f},{sya:.2f}")
                    d_parts.append(
                        f"A {r2:.2f},{r2:.2f} 0 {la},{sw} {exa:.2f},{eya:.2f}"
                    )
            if d_parts:
                svg_paths.append(" ".join(d_parts))

    if not svg_paths:
        return None

    if pattern == "DOTS":
        fill_str = 'fill="url(#dots-pattern)" fill-opacity="0.3"'
    elif pattern.startswith("ACAD_ISO"):
        fill_str = f'fill="{color}" fill-opacity="0.15"'
    else:
        fill_str = f'fill="{color}" fill-opacity="{opacity}"'

    return "\n".join(
        f'<path d="{sp}" stroke="{color}" stroke-width="0.5" '
        f'{fill_str} data-handle="{handle}"{cat_attr}{fac_attr}/>'
        for sp in svg_paths
    )


def generate_annotations(texts_list, tf, scale):
    """Generate annotation markers and sidebar data."""
    if not texts_list:
        return "", []

    texts_list.sort(key=lambda t: (round(t["dxf_x"] / 500000), -t["dxf_y"]))

    _ESC = {"<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;"}
    annotations = []
    parts = ['<g id="annotations">']

    for i, t in enumerate(texts_list):
        ann_id = i + 1
        sx, sy  = t["svg_x"], t["svg_y"]
        height  = max(t["height"], 4)
        mr = max(4, min(8, height * 0.3))
        fs = max(3, min(7, mr * 0.9))
        safe = "".join(_ESC.get(ch, ch) for ch in t["text"])

        parts.append(
            f'<g transform="translate({sx:.1f},{sy:.1f})" '
            f'class="annotation-marker" data-ann-id="{ann_id}">'
            f'<circle r="{mr:.1f}" fill="#FFD700" fill-opacity="0.9" '
            f'stroke="#000" stroke-width="0.5"/>'
            f'<text text-anchor="middle" dominant-baseline="central" '
            f'font-size="{fs:.1f}" font-weight="bold" fill="#000">{ann_id}</text>'
            f'</g>'
        )
        annotations.append({
            "id": ann_id, "text": t["text"],
            "x": round(sx, 1), "y": round(sy, 1),
            "dxf_x": round(t["dxf_x"], 0), "dxf_y": round(t["dxf_y"], 0),
            "rotation": t["rotation"], "color": t["color"],
            "layer": t["layer"], "handle": t["handle"],
        })

    parts.append("</g>")
    return "\n".join(parts), annotations


# ============================================================
# PART 5: METADATA GENERATION
# ============================================================
def generate_metadata(entities, categories, annotations, dxf_bbox,
                       facility_colors, cfg):
    """Generate JSON metadata for the viewer."""
    print("[4/6] Generating metadata...")

    type_counts  = Counter(e["type"]  for e in entities)
    layer_counts = Counter(e["layer"] for e in entities)

    cat_counts = {name: len(lst) for name, lst in categories.items()}
    cat_counts[CAT_UNDEFINED] = sum(
        1 for e in entities if e.get("plantsim_category") == CAT_UNDEFINED
    )

    # Facility legend (auto-detected or user-supplied)
    facility_legend = []
    for aci, name in facility_colors.items():
        count = sum(1 for e in entities if e.get("facility") == name)
        if count > 0:
            hex_c = aci_to_hex(aci)
            facility_legend.append({
                "name": name, "color": hex_c,
                "label": f"{name} ({hex_c})", "count": count,
            })

    # plantsim_legend as a flat dict so route.ts can use it directly as categoryColors
    plantsim_legend = dict(PLANTSIM_COLORS)

    return {
        "title": cfg.title,
        "resolution": f"{cfg.svg_width}x{cfg.svg_height}",
        "dxf_bbox": {
            "min_x": dxf_bbox[0], "min_y": dxf_bbox[1],
            "max_x": dxf_bbox[2], "max_y": dxf_bbox[3],
            "width":  dxf_bbox[2] - dxf_bbox[0],
            "height": dxf_bbox[3] - dxf_bbox[1],
        },
        "annotations": annotations,
        # Flat key→value dict: route.ts renders this as statsHtml
        "stats": {
            "Total Entities": len(entities),
            "Skipped":        len(skipped_entities),
            "Annotations":    len(annotations),
            CAT_STATION:      cat_counts.get(CAT_STATION, 0),
            CAT_CONVEYOR:     cat_counts.get(CAT_CONVEYOR, 0),
            CAT_BUFFER:       cat_counts.get(CAT_BUFFER, 0),
            CAT_FOOTPATH:     cat_counts.get(CAT_FOOTPATH, 0),
            CAT_UNDEFINED:    cat_counts.get(CAT_UNDEFINED, 0),
        },
        # Detailed breakdown (not rendered directly by viewer)
        "stats_detail": {
            "entity_types": dict(type_counts.most_common()),
            "layer_counts": dict(layer_counts.most_common()),
            "plantsim_cats": cat_counts,
        },
        "skipped_details":  skipped_entities[:100],
        "facility_legend":  facility_legend,
        "plantsim_legend":  plantsim_legend,
        "station_details":  [
            {"handle": s.get("handle",""), "type": s.get("type",""),
             "bbox": s.get("bbox",[]), "texts": s.get("texts",[])}
            for s in categories.get(CAT_STATION, [])
        ],
        "conveyor_details": categories.get(CAT_CONVEYOR, []),
    }


# ============================================================
# PART 6: VIEWER HTML GENERATION
# ============================================================
def generate_viewer_html(svg_content, metadata, cfg):
    """Inject SVG + metadata into the viewer.html template."""
    print("[5/6] Generating viewer HTML...")

    with open(cfg.template, "r", encoding="utf-8") as f:
        template = f.read()

    svg_defs = (
        '<defs>\n'
        '  <pattern id="dots-pattern" x="0" y="0" width="8" height="8"'
        ' patternUnits="userSpaceOnUse">\n'
        '    <circle cx="2" cy="2" r="1" fill="#795548" opacity="0.5"/>\n'
        '  </pattern>\n'
        '</defs>'
    )
    full_svg = f"{svg_defs}\n{svg_content}"

    stats = metadata.get("stats", {})
    filter_buttons = ['<button class="filter-button active" data-category="all">All</button>']
    category_items = []
    for cat_name, cat_color in PLANTSIM_COLORS.items():
        count = stats.get(cat_name, 0)
        filter_buttons.append(
            f'<button class="filter-button" data-category="{cat_name}" '
            f'style="border-left: 3px solid {cat_color}">'
            f'{cat_name} ({count})</button>'
        )
        category_items.append(
            f'<div class="category-item" data-category="{cat_name}" '
            f'style="border-left: 4px solid {cat_color};">'
            f'<div class="category-color" style="background:{cat_color};opacity:0.3;"></div>'
            f'<div class="category-info">'
            f'<div class="category-name">{cat_name}</div>'
            f'<div class="category-count">{count} entities</div>'
            f'</div></div>'
        )
    legend_items = [
        f'<div class="legend-item">'
        f'<div class="legend-color" style="background:{leg["color"]};"></div>'
        f'<div class="legend-label">{leg["label"]} ({leg["count"]})</div>'
        f'</div>'
        for leg in metadata.get("facility_legend", [])
    ]

    stats_items = list(stats.items())
    for etype, cnt in metadata.get("stats_detail", {}).get("entity_types", {}).items():
        stats_items.append((etype, cnt))
    annotations_json = json.dumps(metadata.get("annotations", []), ensure_ascii=True)

    html = template
    html = html.replace("<!-- SVG CONTENTS ... -->", full_svg)

    filter_pattern = re.compile(
        r'<button class="filter-button active" data-category="all">[^<]*</button>\s*'
        r'<!-- Fill buttons for toggling PlantSim Categories here -->',
        re.DOTALL,
    )
    html = filter_pattern.sub("\n                    ".join(filter_buttons), html)

    cat_pattern = re.compile(
        r'<!-- Enumerate all PlantSim Categories here.*?</div>\s*</div>\s*</div>',
        re.DOTALL,
    )
    html = cat_pattern.sub("\n                ".join(category_items), html)

    leg_pattern = re.compile(
        r'<!-- Iterate Legends per facility -->.*?'
        r'<div class="legend-label">[^<]*</div>\s*</div>',
        re.DOTALL,
    )
    html = leg_pattern.sub("\n                ".join(legend_items), html)

    perf_css = (
        "\n        /* === Performance optimizations === */\n"
        "        #svg-document { will-change: transform; contain: layout style paint; }\n"
        "        #svg-container { contain: layout style paint; }\n"
    )
    html = html.replace("</style>", perf_css + "    </style>")

    html = html.replace(
        '<span class="info-badge" id="entity-count">Loading...</span>',
        f'<span class="info-badge" id="entity-count">'
        f'{stats.get("Total Entities", 0)} Entities</span>',
    )
    html = html.replace(
        '<span class="info-badge" id="annotation-count">Loading...</span>',
        f'<span class="info-badge" id="annotation-count">'
        f'{len(metadata.get("annotations", []))} Annotations</span>',
    )

    viewer_script = generate_viewer_script(metadata, annotations_json, stats_items, cfg)
    html = html.replace(
        "// Embedded JSON metadata for SVG file: To support viewer functionality\n"
        '        const svgMetadata = {"annotations": [], "stats": []};\n\n'
        "        // IMPLEMENT INTERACTIVE VIEWER HERE",
        viewer_script,
    )
    return html


def generate_viewer_script(metadata, annotations_json, stats_items, cfg):
    """Generate the interactive viewer JavaScript block."""
    stats_html = "".join(
        f'<div class="stat-item">'
        f'<div class="stat-label">{label}</div>'
        f'<div class="stat-value">{value}</div></div>'
        for label, value in stats_items
    )
    cat_colors_js = json.dumps(PLANTSIM_COLORS, ensure_ascii=True)
    svg_w = cfg.svg_width
    svg_h = cfg.svg_height

    return f'''
        // Embedded JSON metadata
        const svgMetadata = {{
            annotations: {annotations_json},
            categoryColors: {cat_colors_js}
        }};

        // ---- State ----
        let currentZoom = 1;
        let panX = 0, panY = 0;
        let isPanning = false;
        let startX = 0, startY = 0;
        let activeCategory = "all";

        // ---- DOM References ----
        const svgDoc = document.getElementById("svg-document");
        const svgContainer = document.getElementById("svg-container");
        const zoomLevel = document.getElementById("zoom-level");

        // ---- Initialize ----
        function init() {{
            if (!svgDoc || !svgContainer) return;

            const statsContainer = document.getElementById("stats-container");
            if (statsContainer) {{
                statsContainer.innerHTML = `{stats_html.replace(chr(96), "'")}`;
            }}

            populateAnnotations(svgMetadata.annotations);
            setupTabs();
            setupZoomControls();
            setupPanning();
            setupCategoryFilters();
            setupAnnotationSearch();
            setTimeout(fitToScreen, 100);
        }}

        function populateAnnotations(annotations) {{
            const list = document.getElementById("annotations-list");
            if (!list) return;
            list.innerHTML = "";
            annotations.forEach(function(ann) {{
                const li = document.createElement("li");
                li.className = "annotation-item";
                li.dataset.annId = ann.id;
                li.innerHTML =
                    '<div class="annotation-header">' +
                    '<span class="annotation-id">' + ann.id + '</span>' +
                    '<span class="annotation-text">' + escapeHtml(ann.text) + '</span>' +
                    '</div>' +
                    '<div class="annotation-meta">' +
                    '<span>Layer: ' + ann.layer + '</span>' +
                    '<span>Pos: (' + Math.round(ann.dxf_x) + ', ' +
                                     Math.round(ann.dxf_y) + ')</span>' +
                    '<span>Rot: ' + ann.rotation + '</span>' +
                    '</div>';
                li.addEventListener("click", function() {{ panToAnnotation(ann); }});
                list.appendChild(li);
            }});
        }}

        function escapeHtml(text) {{
            var div = document.createElement("div");
            div.appendChild(document.createTextNode(text));
            return div.innerHTML;
        }}

        function setupTabs() {{
            var tabs = document.querySelectorAll(".tab");
            tabs.forEach(function(tab) {{
                tab.addEventListener("click", function() {{
                    var target = this.dataset.tab;
                    tabs.forEach(function(t) {{ t.classList.remove("active"); }});
                    this.classList.add("active");
                    document.querySelectorAll(".tab-panel").forEach(function(p) {{
                        p.classList.remove("active");
                    }});
                    var panel = document.getElementById(target + "-panel");
                    if (panel) panel.classList.add("active");
                }});
            }});
        }}

        function setupZoomControls() {{
            var zi = document.getElementById("zoom-in");
            var zo = document.getElementById("zoom-out");
            var zr = document.getElementById("zoom-reset");
            var zf = document.getElementById("zoom-fit");
            if (zi) zi.addEventListener("click", function() {{ zoom(1.3); }});
            if (zo) zo.addEventListener("click", function() {{ zoom(0.7); }});
            if (zr) zr.addEventListener("click", resetZoom);
            if (zf) zf.addEventListener("click", fitToScreen);
            if (svgContainer) {{
                svgContainer.addEventListener("wheel", function(ev) {{
                    ev.preventDefault();
                    zoom(ev.deltaY < 0 ? 1.15 : 0.87, ev.clientX, ev.clientY);
                }}, {{ passive: false }});
            }}
        }}

        function setupPanning() {{
            if (!svgContainer) return;
            svgContainer.addEventListener("mousedown", function(ev) {{
                if (ev.button === 0) {{
                    isPanning = true;
                    startX = ev.clientX - panX;
                    startY = ev.clientY - panY;
                    svgContainer.style.cursor = "grabbing";
                    ev.preventDefault();
                }}
            }});
            document.addEventListener("mousemove", function(ev) {{
                if (isPanning) {{
                    panX = ev.clientX - startX;
                    panY = ev.clientY - startY;
                    applyTransform();
                }}
            }});
            document.addEventListener("mouseup", function() {{
                isPanning = false;
                if (svgContainer) svgContainer.style.cursor = "grab";
            }});
            svgContainer.style.cursor = "grab";
        }}

        function zoom(factor, cx, cy) {{
            if (!svgContainer) return;
            var rect = svgContainer.getBoundingClientRect();
            if (cx === undefined) cx = rect.width  / 2;
            if (cy === undefined) cy = rect.height / 2;
            var lx = cx - rect.left, ly = cy - rect.top;
            var old = currentZoom;
            currentZoom = Math.max(0.1, Math.min(50, currentZoom * factor));
            var af = currentZoom / old;
            panX = lx - af * (lx - panX);
            panY = ly - af * (ly - panY);
            applyTransform();
        }}

        function resetZoom() {{ currentZoom = 1; panX = 0; panY = 0; applyTransform(); }}

        function fitToScreen() {{
            if (!svgContainer || !svgDoc) return;
            var rect = svgContainer.getBoundingClientRect();
            currentZoom = Math.min(rect.width / {svg_w}, rect.height / {svg_h}) * 0.95;
            panX = (rect.width  - {svg_w} * currentZoom) / 2;
            panY = (rect.height - {svg_h} * currentZoom) / 2;
            applyTransform();
        }}

        function applyTransform() {{
            if (!svgDoc) return;
            svgDoc.style.transform =
                "translate(" + panX + "px, " + panY + "px) scale(" + currentZoom + ")";
            svgDoc.style.transformOrigin = "0 0";
            if (zoomLevel) zoomLevel.textContent = Math.round(currentZoom * 100) + "%";
        }}

        var _cachedAnnItems = null;
        var _highlightStyleEl = document.createElement("style");
        _highlightStyleEl.id = "annotation-highlight-style";
        document.head.appendChild(_highlightStyleEl);

        function panToAnnotation(ann) {{
            if (!svgContainer) return;
            var rect = svgContainer.getBoundingClientRect();
            currentZoom = 3;
            panX = rect.width  / 2 - ann.x * currentZoom;
            panY = rect.height / 2 - ann.y * currentZoom;
            applyTransform();
            _highlightStyleEl.textContent =
                ".annotation-marker {{ opacity: 0.5; }}" +
                '.annotation-marker[data-ann-id="' + ann.id + '"] {{ opacity: 1; }}' +
                '.annotation-marker[data-ann-id="' + ann.id + '"] circle {{ r: 12px; }}';
            setTimeout(function() {{ _highlightStyleEl.textContent = ""; }}, 2000);
            if (!_cachedAnnItems)
                _cachedAnnItems = document.querySelectorAll(".annotation-item");
            _cachedAnnItems.forEach(function(item) {{ item.classList.remove("highlighted"); }});
            var li = document.querySelector(
                '.annotation-item[data-ann-id="' + ann.id + '"]');
            if (li) {{
                li.classList.add("highlighted");
                li.scrollIntoView({{ behavior: "smooth", block: "center" }});
            }}
        }}

        function setupCategoryFilters() {{
            var filterBtns = document.querySelectorAll(".filter-button");
            filterBtns.forEach(function(btn) {{
                btn.addEventListener("click", function() {{
                    activeCategory = this.dataset.category;
                    filterBtns.forEach(function(b) {{ b.classList.remove("active"); }});
                    this.classList.add("active");
                    filterByCategory(activeCategory);
                }});
            }});
            document.querySelectorAll(".category-item").forEach(function(item) {{
                item.addEventListener("click", function() {{
                    activeCategory = this.dataset.category;
                    filterBtns.forEach(function(b) {{ b.classList.remove("active"); }});
                    var mb = document.querySelector(
                        '.filter-button[data-category="' + activeCategory + '"]');
                    if (mb) mb.classList.add("active");
                    filterByCategory(activeCategory);
                    document.querySelectorAll(".category-item").forEach(function(ci) {{
                        ci.classList.remove("active");
                    }});
                    this.classList.add("active");
                }});
            }});
        }}

        var catGroupNames = ["STATION","CONVEYOR","BUFFER","FOOTPATH","UNDEFINED"];
        var catGroups = {{}};
        catGroupNames.forEach(function(c) {{
            catGroups[c] = document.getElementById("cat-" + c);
        }});

        function filterByCategory(cat) {{
            catGroupNames.forEach(function(c) {{
                var g = catGroups[c];
                if (g) g.style.opacity = (cat === "all" || cat === c) ? "1" : "0.08";
            }});
        }}

        function setupAnnotationSearch() {{
            var inp = document.getElementById("annotation-search");
            if (!inp) return;
            inp.addEventListener("input", function() {{
                var q = this.value.toLowerCase();
                document.querySelectorAll(".annotation-item").forEach(function(item) {{
                    item.style.display =
                        item.textContent.toLowerCase().includes(q) ? "" : "none";
                }});
            }});
        }}

        if (document.readyState === "loading") {{
            document.addEventListener("DOMContentLoaded", init);
        }} else {{
            init();
        }}'''


# ============================================================
# MAIN
# ============================================================
def main():
    global skipped_entities
    skipped_entities = []   # reset for this run

    args = parse_args()
    cfg  = Config(args)

    # Validate input file
    if not os.path.isfile(cfg.dxf_path):
        print(f"ERROR: Input file not found: {cfg.dxf_path}", file=sys.stderr)
        sys.exit(1)

    # Ensure output directory exists
    try:
        os.makedirs(cfg.output_dir, exist_ok=True)
    except OSError as e:
        print(f"ERROR: Cannot create output directory: {e}", file=sys.stderr)
        sys.exit(2)

    print("=" * 60)
    print(f"DXF → SVG  |  {cfg.title}")
    print("=" * 60)

    # ── Step 1: Parse ─────────────────────────────────────────
    entities, doc, layer_colors, facility_colors = parse_dxf(cfg)

    # ── Step 2: Bounding box + transform ──────────────────────
    dxf_bbox = compute_drawing_bbox(entities)
    print(f"  Drawing bbox: X=[{dxf_bbox[0]:.0f}, {dxf_bbox[2]:.0f}] "
          f"Y=[{dxf_bbox[1]:.0f}, {dxf_bbox[3]:.0f}]")
    print(f"  Size: {dxf_bbox[2]-dxf_bbox[0]:.0f} x {dxf_bbox[3]-dxf_bbox[1]:.0f}")

    thresholds = compute_thresholds(dxf_bbox)
    transform_fn, scale, offset, actual_size = create_transform(
        dxf_bbox, cfg.svg_width, cfg.svg_height, margin=cfg.margin
    )
    print(f"  Scale: {scale:.6f}, Offset: ({offset[0]:.1f}, {offset[1]:.1f})")

    # ── Step 3: Categorize ────────────────────────────────────
    categories = categorize_entities(entities, cfg, thresholds)

    # ── Step 4: Generate SVG ─────────────────────────────────
    svg_content, annotations = generate_svg(
        entities, transform_fn, scale, categories, dxf_bbox, cfg
    )

    # ── Step 5: Generate metadata ─────────────────────────────
    metadata = generate_metadata(
        entities, categories, annotations, dxf_bbox, facility_colors, cfg
    )

    # ── Step 6: Save outputs ──────────────────────────────────
    print("[6/6] Saving output files...")
    outputs = {}

    svg_full = (
        f'<svg xmlns="http://www.w3.org/2000/svg" id="svg-document" '
        f'width="{cfg.svg_width}" height="{cfg.svg_height}" '
        f'viewBox="0 0 {cfg.svg_width} {cfg.svg_height}">\n'
        f'{svg_content}\n</svg>'
    )
    svg_path = os.path.join(cfg.output_dir, "layout.svg")
    with open(svg_path, "w", encoding="utf-8") as f:
        f.write(svg_full)
    outputs["svg"] = svg_path
    print(f"  Saved: {svg_path}")

    json_path = os.path.join(cfg.output_dir, "metadata.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, ensure_ascii=False, indent=2)
    outputs["metadata"] = json_path
    print(f"  Saved: {json_path}")

    analysis = {
        "dxf_info": {
            "path": cfg.dxf_path,
            "version": doc.dxfversion,
            "total_entities": len(entities),
            "layers": {l.dxf.name: l.dxf.color for l in doc.layers},
        },
        "bbox": {
            "min_x": dxf_bbox[0], "min_y": dxf_bbox[1],
            "max_x": dxf_bbox[2], "max_y": dxf_bbox[3],
        },
        "transform": {
            "scale": scale,
            "offset_x": offset[0], "offset_y": offset[1],
            "svg_width": cfg.svg_width, "svg_height": cfg.svg_height,
        },
        "categories": {k: len(v) for k, v in categories.items()},
        "skipped": skipped_entities,
    }
    analysis_path = os.path.join(cfg.output_dir, "analysis.json")
    with open(analysis_path, "w", encoding="utf-8") as f:
        json.dump(analysis, f, ensure_ascii=False, indent=2)
    outputs["analysis"] = analysis_path
    print(f"  Saved: {analysis_path}")

    if cfg.template and not cfg.no_viewer:
        if not os.path.isfile(cfg.template):
            print(f"  WARNING: template not found, skipping viewer.html: {cfg.template}")
        else:
            viewer_html = generate_viewer_html(svg_content, metadata, cfg)
            viewer_path = os.path.join(cfg.output_dir, "viewer.html")
            with open(viewer_path, "w", encoding="utf-8") as f:
                f.write(viewer_html)
            outputs["viewer"] = viewer_path
            print(f"  Saved: {viewer_path}")

    # ── Summary ───────────────────────────────────────────────
    print()
    print("=" * 60)
    print("DONE")
    print("=" * 60)
    print(f"Entities processed : {len(entities)}")
    print(f"Skipped            : {len(skipped_entities)}")
    print(f"Annotations        : {len(annotations)}")
    print("Categories:")
    for k, v in categories.items():
        print(f"  {k:10s}: {len(v)}")
    print(f"  {'UNDEFINED':10s}: "
          f"{sum(1 for e in entities if e.get('plantsim_category') == CAT_UNDEFINED)}")
    print("Outputs:")
    for kind, path in outputs.items():
        print(f"  {kind:10s}: {path}")

    if skipped_entities:
        print(f"\nFirst 10 skipped entities:")
        for s in skipped_entities[:10]:
            print(f"  {s['handle']} ({s['type']}): {s['reason']}")


if __name__ == "__main__":
    main()
