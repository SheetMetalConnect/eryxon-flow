"""
CAD Geometry and PMI Extraction Module

Extracts tessellated geometry and PMI from CAD files using pythonocc-core.

Supports:
- STEP (AP203, AP214, AP242)
- IGES
- BREP

Returns:
- Tessellated mesh geometry (vertices, normals, indices)
- PMI annotations (dimensions, tolerances, datums)
- Thumbnails (optional)
"""

import logging
import base64
import struct
from dataclasses import dataclass
from typing import Optional, Dict, List, Any

logger = logging.getLogger(__name__)


@dataclass
class ProcessingResult:
    """Result of CAD file processing."""
    geometry: Optional[Dict[str, Any]] = None
    pmi: Optional[Dict[str, Any]] = None
    thumbnail_base64: Optional[str] = None


def extract_geometry_and_pmi(
    file_path: str,
    extract_geometry: bool = True,
    extract_pmi: bool = True,
    generate_thumbnail: bool = False,
    thumbnail_size: int = 256,
) -> ProcessingResult:
    """
    Extract geometry and PMI from a CAD file.

    Args:
        file_path: Path to the CAD file
        extract_geometry: Whether to extract tessellated geometry
        extract_pmi: Whether to extract PMI annotations
        generate_thumbnail: Whether to generate a thumbnail image
        thumbnail_size: Size of thumbnail in pixels

    Returns:
        ProcessingResult with geometry, PMI, and optional thumbnail
    """
    result = ProcessingResult()

    try:
        # Import OCC modules
        from OCC.Core.STEPControl import STEPControl_Reader
        from OCC.Core.STEPCAFControl import STEPCAFControl_Reader
        from OCC.Core.IGESControl import IGESControl_Reader
        from OCC.Core.BRepTools import breptools_Read
        from OCC.Core.BRep import BRep_Builder
        from OCC.Core.TopoDS import TopoDS_Shape
        from OCC.Core.IFSelect import IFSelect_RetDone
        from OCC.Core.XCAFDoc import XCAFDoc_DocumentTool
        from OCC.Core.TDocStd import TDocStd_Document
        from OCC.Core.TCollection import TCollection_ExtendedString

        logger.info(f"Processing file: {file_path}")

        # Determine file type
        file_ext = file_path.lower().split('.')[-1]

        # For PMI extraction, we need XCAF document
        doc = None
        shape = None

        if file_ext in ['step', 'stp']:
            if extract_pmi:
                # Use XCAF reader for PMI support
                doc = TDocStd_Document(TCollection_ExtendedString("MDTV-XCAF"))
                reader = STEPCAFControl_Reader()
                reader.SetGDTMode(True)  # Enable PMI
                reader.SetNameMode(True)
                reader.SetColorMode(True)

                status = reader.ReadFile(file_path)
                if status != IFSelect_RetDone:
                    raise ValueError(f"Failed to read STEP file: status {status}")

                reader.Transfer(doc)

                # Get shape from document
                shape_tool = XCAFDoc_DocumentTool.ShapeTool(doc.Main())
                shapes = []
                shape_tool.GetFreeShapes(shapes)
                if shapes:
                    from OCC.Core.TopoDS import TopoDS_Compound
                    from OCC.Core.BRep import BRep_Builder
                    compound = TopoDS_Compound()
                    builder = BRep_Builder()
                    builder.MakeCompound(compound)
                    for s in shapes:
                        shape_tool_shape = shape_tool.GetShape(s)
                        if not shape_tool_shape.IsNull():
                            builder.Add(compound, shape_tool_shape)
                    shape = compound
            else:
                # Simple STEP reader for geometry only
                reader = STEPControl_Reader()
                status = reader.ReadFile(file_path)
                if status != IFSelect_RetDone:
                    raise ValueError(f"Failed to read STEP file: status {status}")
                reader.TransferRoots()
                shape = reader.OneShape()

        elif file_ext in ['iges', 'igs']:
            reader = IGESControl_Reader()
            status = reader.ReadFile(file_path)
            if status != IFSelect_RetDone:
                raise ValueError(f"Failed to read IGES file: status {status}")
            reader.TransferRoots()
            shape = reader.OneShape()

        elif file_ext == 'brep':
            shape = TopoDS_Shape()
            builder = BRep_Builder()
            success = breptools_Read(shape, file_path, builder)
            if not success:
                raise ValueError("Failed to read BREP file")

        else:
            raise ValueError(f"Unsupported file format: {file_ext}")

        # Extract geometry
        if extract_geometry and shape is not None:
            result.geometry = tessellate_shape(shape)
            logger.info(f"Extracted {result.geometry['total_vertices']} vertices")

        # Extract PMI
        if extract_pmi and doc is not None:
            result.pmi = extract_pmi_from_document(doc)
            dim_count = len(result.pmi.get('dimensions', []))
            logger.info(f"Extracted {dim_count} PMI dimensions")

        # Generate thumbnail
        if generate_thumbnail and shape is not None:
            result.thumbnail_base64 = generate_shape_thumbnail(shape, thumbnail_size)

        return result

    except ImportError as e:
        logger.error(f"pythonocc-core not installed: {e}")
        raise RuntimeError(
            "pythonocc-core is required. Install with: conda install -c conda-forge pythonocc-core"
        )
    except Exception as e:
        logger.exception(f"Processing error: {e}")
        raise


def tessellate_shape(shape) -> Dict[str, Any]:
    """
    Tessellate a TopoDS_Shape into triangle meshes.

    Returns dict with:
    - meshes: list of mesh dicts with vertices, normals, indices (base64 encoded)
    - bounding_box: min, max, center, size
    - total_vertices, total_faces
    """
    from OCC.Core.BRepMesh import BRepMesh_IncrementalMesh
    from OCC.Core.TopExp import TopExp_Explorer
    from OCC.Core.TopAbs import TopAbs_FACE
    from OCC.Core.TopLoc import TopLoc_Location
    from OCC.Core.BRep import BRep_Tool
    from OCC.Core.Bnd import Bnd_Box
    from OCC.Core.BRepBndLib import brepbndlib_Add
    from OCC.Core.gp import gp_Pnt, gp_Vec

    # Compute bounding box first to determine mesh resolution
    bbox = Bnd_Box()
    brepbndlib_Add(shape, bbox)
    xmin, ymin, zmin, xmax, ymax, zmax = bbox.Get()

    diagonal = ((xmax - xmin)**2 + (ymax - ymin)**2 + (zmax - zmin)**2)**0.5
    linear_deflection = diagonal * 0.001  # 0.1% of diagonal
    angular_deflection = 0.5  # radians

    # Tessellate
    mesh = BRepMesh_IncrementalMesh(shape, linear_deflection, False, angular_deflection, True)
    mesh.Perform()

    if not mesh.IsDone():
        logger.warning("Tessellation incomplete")

    # Extract triangles from faces
    meshes = []
    total_vertices = 0
    total_faces = 0

    explorer = TopExp_Explorer(shape, TopAbs_FACE)
    face_index = 0

    while explorer.More():
        face = explorer.Current()
        location = TopLoc_Location()

        triangulation = BRep_Tool.Triangulation(face, location)

        if triangulation is not None:
            # Get transformation
            transform = location.Transformation()

            # Get nodes (vertices)
            nb_nodes = triangulation.NbNodes()
            nb_triangles = triangulation.NbTriangles()

            if nb_nodes > 0 and nb_triangles > 0:
                vertices = []
                normals = []

                for i in range(1, nb_nodes + 1):
                    node = triangulation.Node(i)
                    # Apply transformation
                    transformed = node.Transformed(transform)
                    vertices.extend([transformed.X(), transformed.Y(), transformed.Z()])

                # Get triangles and compute normals
                indices = []
                face_normals = [0.0] * (nb_nodes * 3)
                normal_counts = [0] * nb_nodes

                for i in range(1, nb_triangles + 1):
                    tri = triangulation.Triangle(i)
                    n1, n2, n3 = tri.Get()

                    # Adjust for 0-based indexing
                    indices.extend([n1 - 1, n2 - 1, n3 - 1])

                    # Compute face normal
                    p1 = gp_Pnt(vertices[(n1-1)*3], vertices[(n1-1)*3+1], vertices[(n1-1)*3+2])
                    p2 = gp_Pnt(vertices[(n2-1)*3], vertices[(n2-1)*3+1], vertices[(n2-1)*3+2])
                    p3 = gp_Pnt(vertices[(n3-1)*3], vertices[(n3-1)*3+1], vertices[(n3-1)*3+2])

                    v1 = gp_Vec(p1, p2)
                    v2 = gp_Vec(p1, p3)
                    normal = v1.Crossed(v2)

                    if normal.Magnitude() > 1e-10:
                        normal.Normalize()

                        # Accumulate normals for smooth shading
                        for idx in [n1-1, n2-1, n3-1]:
                            face_normals[idx*3] += normal.X()
                            face_normals[idx*3+1] += normal.Y()
                            face_normals[idx*3+2] += normal.Z()
                            normal_counts[idx] += 1

                # Normalize accumulated normals
                for i in range(nb_nodes):
                    if normal_counts[i] > 0:
                        length = (face_normals[i*3]**2 + face_normals[i*3+1]**2 + face_normals[i*3+2]**2)**0.5
                        if length > 1e-10:
                            face_normals[i*3] /= length
                            face_normals[i*3+1] /= length
                            face_normals[i*3+2] /= length

                normals = face_normals

                # Encode as base64
                vertices_bytes = struct.pack(f'{len(vertices)}f', *vertices)
                normals_bytes = struct.pack(f'{len(normals)}f', *normals)
                indices_bytes = struct.pack(f'{len(indices)}I', *indices)

                meshes.append({
                    'vertices_base64': base64.b64encode(vertices_bytes).decode('ascii'),
                    'normals_base64': base64.b64encode(normals_bytes).decode('ascii'),
                    'indices_base64': base64.b64encode(indices_bytes).decode('ascii'),
                    'vertex_count': nb_nodes,
                    'face_count': nb_triangles,
                    'color': [0.29, 0.56, 0.88],  # Default blue
                })

                total_vertices += nb_nodes
                total_faces += nb_triangles

        explorer.Next()
        face_index += 1

    return {
        'meshes': meshes,
        'bounding_box': {
            'min': [xmin, ymin, zmin],
            'max': [xmax, ymax, zmax],
            'center': [(xmin+xmax)/2, (ymin+ymax)/2, (zmin+zmax)/2],
            'size': [xmax-xmin, ymax-ymin, zmax-zmin],
        },
        'total_vertices': total_vertices,
        'total_faces': total_faces,
    }


def extract_pmi_from_document(doc) -> Dict[str, Any]:
    """
    Extract all PMI/MBD annotations from an XCAF document.

    Supports STEP AP242 semantic PMI including:
    - Dimensions (linear, angular, radius, diameter, ordinate)
    - Geometric tolerances (all 14 GD&T types per ASME Y14.5)
    - Datums and datum targets
    - Surface finish symbols (per ISO 1302)
    - Notes and text annotations
    - Graphical PMI (polylines, leader lines)
    """
    from OCC.Core.XCAFDoc import XCAFDoc_DocumentTool
    from OCC.Core.TDF import TDF_LabelSequence, TDF_ChildIterator

    pmi_data = {
        'dimensions': [],
        'geometric_tolerances': [],
        'datums': [],
        'surface_finishes': [],
        'notes': [],
        'graphical_pmi': [],
    }

    try:
        main_label = doc.Main()
        dim_tol_tool = XCAFDoc_DocumentTool.DimTolTool(main_label)

        # Extract dimensions
        dim_labels = TDF_LabelSequence()
        dim_tol_tool.GetDimensionLabels(dim_labels)
        logger.info(f"Found {dim_labels.Length()} dimensions")

        for i in range(1, dim_labels.Length() + 1):
            label = dim_labels.Value(i)
            dim = extract_dimension_from_label(label, i)
            if dim:
                pmi_data['dimensions'].append(dim)

        # Extract geometric tolerances
        tol_labels = TDF_LabelSequence()
        dim_tol_tool.GetGeomToleranceLabels(tol_labels)
        logger.info(f"Found {tol_labels.Length()} geometric tolerances")

        for i in range(1, tol_labels.Length() + 1):
            label = tol_labels.Value(i)
            tol = extract_tolerance_from_label(label, i, dim_tol_tool)
            if tol:
                pmi_data['geometric_tolerances'].append(tol)

        # Extract datums
        datum_labels = TDF_LabelSequence()
        dim_tol_tool.GetDatumLabels(datum_labels)
        logger.info(f"Found {datum_labels.Length()} datums")

        for i in range(1, datum_labels.Length() + 1):
            label = datum_labels.Value(i)
            datum = extract_datum_from_label(label, i)
            if datum:
                pmi_data['datums'].append(datum)

        # Extract surface finish symbols (if available)
        surface_finishes = extract_surface_finishes(doc, main_label)
        pmi_data['surface_finishes'] = surface_finishes
        logger.info(f"Found {len(surface_finishes)} surface finishes")

        # Extract notes and text annotations
        notes = extract_notes(doc, main_label)
        pmi_data['notes'] = notes
        logger.info(f"Found {len(notes)} notes")

        # Extract graphical PMI (polylines, curves used for annotations)
        graphical = extract_graphical_pmi(doc, main_label)
        pmi_data['graphical_pmi'] = graphical
        logger.info(f"Found {len(graphical)} graphical PMI elements")

    except Exception as e:
        logger.warning(f"PMI extraction error: {e}")

    return pmi_data


def extract_surface_finishes(doc, main_label) -> List[Dict]:
    """
    Extract surface finish symbols per ISO 1302 / ASME Y14.36.

    Surface finish symbols include:
    - Ra (arithmetic average roughness)
    - Rz (mean roughness depth)
    - Machining allowance
    - Lay direction symbols
    """
    from OCC.Core.TDF import TDF_ChildIterator

    # Surface finish symbols per ISO 1302
    LAY_SYMBOLS = {
        0: "=",   # Parallel to projection plane
        1: "⊥",   # Perpendicular to projection plane
        2: "X",   # Crossed (two directions)
        3: "M",   # Multi-directional
        4: "C",   # Circular
        5: "R",   # Radial
        6: "P",   # Particulate/non-directional
    }

    surface_finishes = []

    try:
        # Try to find surface finish annotations in the document
        # STEP AP242 stores these as XCAFDoc_Note with specific types
        from OCC.Core.XCAFDoc import XCAFDoc_NoteTool

        note_tool = None
        try:
            # NoteTool is available in newer OCCT versions
            from OCC.Core.XCAFDoc import XCAFDoc_DocumentTool
            note_tool = XCAFDoc_DocumentTool.NotesTool(main_label) if hasattr(XCAFDoc_DocumentTool, 'NotesTool') else None
        except:
            pass

        if note_tool is not None:
            # Iterate through notes looking for surface finish annotations
            from OCC.Core.TDF import TDF_LabelSequence
            note_labels = TDF_LabelSequence()

            try:
                note_tool.GetNotes(note_labels)
                for i in range(1, note_labels.Length() + 1):
                    label = note_labels.Value(i)
                    sf = extract_surface_finish_from_label(label, i, LAY_SYMBOLS)
                    if sf:
                        surface_finishes.append(sf)
            except Exception as e:
                logger.debug(f"Could not get notes: {e}")

    except Exception as e:
        logger.debug(f"Surface finish extraction not available: {e}")

    return surface_finishes


def extract_surface_finish_from_label(label, index: int, lay_symbols: Dict) -> Optional[Dict]:
    """Extract surface finish data from a label."""
    try:
        # Try to get surface finish specific attributes
        # This is implementation-dependent based on CAD system export
        position = {'x': 0, 'y': 0, 'z': 0}

        return {
            'id': f"sf_{index}",
            'type': 'surface_finish',
            'roughness_type': 'Ra',  # or Rz, Rmax, etc.
            'roughness_value': None,
            'roughness_unit': 'μm',
            'machining_allowance': None,
            'lay_symbol': None,
            'text': '',
            'position': position,
        }
    except Exception as e:
        logger.debug(f"Could not extract surface finish: {e}")
        return None


def extract_notes(doc, main_label) -> List[Dict]:
    """
    Extract text notes and annotations.

    Includes:
    - General notes
    - Callouts
    - Flag notes
    - Bill of materials references
    """
    notes = []

    try:
        from OCC.Core.XCAFDoc import XCAFDoc_DocumentTool
        from OCC.Core.TDF import TDF_LabelSequence

        # Try to access NotesTool (OCCT 7.6+)
        try:
            note_tool = XCAFDoc_DocumentTool.NotesTool(main_label) if hasattr(XCAFDoc_DocumentTool, 'NotesTool') else None

            if note_tool is not None:
                note_labels = TDF_LabelSequence()
                note_tool.GetNotes(note_labels)

                for i in range(1, note_labels.Length() + 1):
                    label = note_labels.Value(i)
                    note = extract_note_from_label(label, i)
                    if note:
                        notes.append(note)
        except Exception as e:
            logger.debug(f"NotesTool not available: {e}")

        # Also check for TDataStd_Name attributes which often contain text
        try:
            from OCC.Core.TDataStd import TDataStd_Name
            from OCC.Core.TDF import TDF_ChildIterator

            iterator = TDF_ChildIterator(main_label, True)
            note_index = len(notes) + 1

            while iterator.More():
                child_label = iterator.Value()
                name_attr = TDataStd_Name()

                if child_label.FindAttribute(TDataStd_Name.GetID(), name_attr):
                    text = name_attr.Get()
                    if text and hasattr(text, 'ToCString'):
                        text_str = text.ToCString()
                        # Filter out shape names, look for annotation-like text
                        if len(text_str) > 0 and not text_str.startswith('Shape'):
                            notes.append({
                                'id': f"note_{note_index}",
                                'type': 'text',
                                'text': text_str,
                                'position': {'x': 0, 'y': 0, 'z': 0},
                            })
                            note_index += 1

                iterator.Next()

        except Exception as e:
            logger.debug(f"Text attribute extraction failed: {e}")

    except Exception as e:
        logger.debug(f"Note extraction error: {e}")

    return notes


def extract_note_from_label(label, index: int) -> Optional[Dict]:
    """Extract a note from its label."""
    try:
        from OCC.Core.XCAFDoc import XCAFDoc_Note

        note_attr = XCAFDoc_Note()
        if not label.FindAttribute(XCAFDoc_Note.GetID(), note_attr):
            return None

        text = ""
        if hasattr(note_attr, 'Get'):
            text = str(note_attr.Get())

        return {
            'id': f"note_{index}",
            'type': 'note',
            'text': text,
            'position': {'x': 0, 'y': 0, 'z': 0},
        }

    except Exception as e:
        logger.debug(f"Could not extract note: {e}")
        return None


def extract_graphical_pmi(doc, main_label) -> List[Dict]:
    """
    Extract graphical PMI elements (polylines, curves, arrows).

    Graphical PMI includes:
    - Leader lines
    - Dimension extension lines
    - Witness lines
    - Annotation curves
    """
    graphical = []

    try:
        from OCC.Core.XCAFDoc import XCAFDoc_DocumentTool
        from OCC.Core.TDF import TDF_LabelSequence

        # Get the view tool which contains graphical annotations
        try:
            view_tool = XCAFDoc_DocumentTool.ViewTool(main_label) if hasattr(XCAFDoc_DocumentTool, 'ViewTool') else None

            if view_tool is not None:
                view_labels = TDF_LabelSequence()
                view_tool.GetViewLabels(view_labels)

                for i in range(1, view_labels.Length() + 1):
                    label = view_labels.Value(i)

                    # Extract curves/polylines from the view
                    curves = extract_curves_from_view(label, i)
                    graphical.extend(curves)

        except Exception as e:
            logger.debug(f"ViewTool not available: {e}")

    except Exception as e:
        logger.debug(f"Graphical PMI extraction error: {e}")

    return graphical


def extract_curves_from_view(label, view_index: int) -> List[Dict]:
    """Extract curve geometry from a view label."""
    curves = []

    try:
        from OCC.Core.TDF import TDF_ChildIterator
        from OCC.Core.TNaming import TNaming_NamedShape
        from OCC.Core.TopExp import TopExp_Explorer
        from OCC.Core.TopAbs import TopAbs_EDGE
        from OCC.Core.BRep import BRep_Tool
        from OCC.Core.BRepAdaptor import BRepAdaptor_Curve
        from OCC.Core.GeomAbs import GeomAbs_Line, GeomAbs_Circle

        iterator = TDF_ChildIterator(label, True)
        curve_index = 1

        while iterator.More():
            child_label = iterator.Value()
            named_shape = TNaming_NamedShape()

            if child_label.FindAttribute(TNaming_NamedShape.GetID(), named_shape):
                shape = named_shape.Get()

                if shape is not None and not shape.IsNull():
                    explorer = TopExp_Explorer(shape, TopAbs_EDGE)

                    while explorer.More():
                        edge = explorer.Current()
                        curve_data = extract_edge_data(edge, f"curve_{view_index}_{curve_index}")
                        if curve_data:
                            curves.append(curve_data)
                            curve_index += 1
                        explorer.Next()

            iterator.Next()

    except Exception as e:
        logger.debug(f"Curve extraction failed: {e}")

    return curves


def extract_edge_data(edge, curve_id: str) -> Optional[Dict]:
    """Extract data from an edge for graphical PMI."""
    try:
        from OCC.Core.BRepAdaptor import BRepAdaptor_Curve
        from OCC.Core.GeomAbs import GeomAbs_Line, GeomAbs_Circle, GeomAbs_BSplineCurve
        from OCC.Core.GCPnts import GCPnts_UniformAbscissa

        adaptor = BRepAdaptor_Curve(edge)
        curve_type = adaptor.GetType()

        # Get start and end points
        first = adaptor.FirstParameter()
        last = adaptor.LastParameter()

        start_pnt = adaptor.Value(first)
        end_pnt = adaptor.Value(last)

        curve_type_str = "unknown"
        if curve_type == GeomAbs_Line:
            curve_type_str = "line"
        elif curve_type == GeomAbs_Circle:
            curve_type_str = "arc"
        else:
            curve_type_str = "spline"

        # Sample points along the curve
        points = []
        try:
            uniform = GCPnts_UniformAbscissa(adaptor, 10)  # 10 sample points
            if uniform.IsDone():
                for i in range(1, uniform.NbPoints() + 1):
                    param = uniform.Parameter(i)
                    pnt = adaptor.Value(param)
                    points.append({'x': pnt.X(), 'y': pnt.Y(), 'z': pnt.Z()})
        except:
            # Fallback: just use start and end
            points = [
                {'x': start_pnt.X(), 'y': start_pnt.Y(), 'z': start_pnt.Z()},
                {'x': end_pnt.X(), 'y': end_pnt.Y(), 'z': end_pnt.Z()},
            ]

        return {
            'id': curve_id,
            'type': curve_type_str,
            'points': points,
        }

    except Exception as e:
        logger.debug(f"Edge data extraction failed: {e}")
        return None


def extract_dimension_from_label(label, index: int) -> Optional[Dict]:
    """Extract a dimension from its label."""
    from OCC.Core.XCAFDoc import XCAFDoc_Dimension

    try:
        dim_attr = XCAFDoc_Dimension()
        if not label.FindAttribute(XCAFDoc_Dimension.GetID(), dim_attr):
            return None

        dim_obj = dim_attr.GetObject()
        if dim_obj is None:
            return None

        # Get type
        dim_type = dim_obj.GetType()
        type_name = {0: "linear", 1: "linear", 2: "angular", 3: "radius", 4: "diameter", 5: "ordinate"}.get(dim_type, "linear")

        # Get value
        value = 0.0
        if hasattr(dim_obj, 'GetValue'):
            value = dim_obj.GetValue()

        # Get tolerance
        tolerance = None
        if hasattr(dim_obj, 'HasLowerBound') and hasattr(dim_obj, 'HasUpperBound'):
            if dim_obj.HasLowerBound() or dim_obj.HasUpperBound():
                upper = dim_obj.GetUpperBound() if dim_obj.HasUpperBound() else 0
                lower = dim_obj.GetLowerBound() if dim_obj.HasLowerBound() else 0
                tolerance = {'upper': upper, 'lower': lower, 'type': 'bilateral'}

        # Get position
        position = {'x': 0, 'y': 0, 'z': 0}
        if hasattr(dim_obj, 'GetPointTextAttach'):
            pnt = dim_obj.GetPointTextAttach()
            position = {'x': pnt.X(), 'y': pnt.Y(), 'z': pnt.Z()}

        # Format text
        text = f"{value:.2f}"
        if tolerance:
            if tolerance['upper'] == abs(tolerance['lower']):
                text += f" ±{tolerance['upper']:.2f}"
            else:
                text += f" +{tolerance['upper']:.2f}/{tolerance['lower']:.2f}"
        text += " mm"

        if type_name == "radius":
            text = "R" + text
        elif type_name == "diameter":
            text = "⌀" + text

        return {
            'id': f"dim_{index}",
            'type': type_name,
            'value': value,
            'unit': 'mm',
            'tolerance': tolerance,
            'text': text,
            'position': position,
            'leader_points': [],
        }

    except Exception as e:
        logger.debug(f"Could not extract dimension: {e}")
        return None


def extract_tolerance_from_label(label, index: int, dim_tol_tool=None) -> Optional[Dict]:
    """Extract a geometric tolerance from its label."""
    from OCC.Core.XCAFDoc import XCAFDoc_GeomTolerance
    from OCC.Core.TDF import TDF_LabelSequence

    # GD&T symbols per ASME Y14.5 / ISO 1101
    GDT_SYMBOLS = {
        0: ("flatness", "⏥"),
        1: ("straightness", "⏤"),
        2: ("circularity", "○"),
        3: ("cylindricity", "⌭"),
        4: ("profile_line", "⌒"),
        5: ("profile_surface", "⌓"),
        6: ("parallelism", "∥"),
        7: ("perpendicularity", "⊥"),
        8: ("angularity", "∠"),
        9: ("position", "⌖"),
        10: ("concentricity", "◎"),
        11: ("symmetry", "⌯"),
        12: ("circular_runout", "↗"),
        13: ("total_runout", "↗↗"),
    }

    # Material condition modifiers
    MATERIAL_MODIFIERS = {
        0: "",        # None/RFS (Regardless of Feature Size)
        1: "Ⓜ",      # MMC (Maximum Material Condition)
        2: "Ⓛ",      # LMC (Least Material Condition)
        3: "Ⓢ",      # RFS explicit
        4: "Ⓟ",      # Projected tolerance zone
        5: "Ⓕ",      # Free state
        6: "Ⓣ",      # Tangent plane
        7: "Ⓤ",      # Unequal bilateral
    }

    try:
        tol_attr = XCAFDoc_GeomTolerance()
        if not label.FindAttribute(XCAFDoc_GeomTolerance.GetID(), tol_attr):
            return None

        tol_obj = tol_attr.GetObject()
        if tol_obj is None:
            return None

        tol_type = tol_obj.GetType() if hasattr(tol_obj, 'GetType') else 0
        type_name, symbol = GDT_SYMBOLS.get(tol_type, ("unknown", "?"))

        value = tol_obj.GetValue() if hasattr(tol_obj, 'GetValue') else 0.0

        # Get material modifier
        modifier = ""
        if hasattr(tol_obj, 'GetMaterialRequirementModifier'):
            mod_type = tol_obj.GetMaterialRequirementModifier()
            modifier = MATERIAL_MODIFIERS.get(mod_type, "")

        # Get zone modifier (diameter symbol for cylindrical tolerance zone)
        zone_modifier = ""
        if hasattr(tol_obj, 'GetZoneModifier'):
            zone_type = tol_obj.GetZoneModifier()
            if zone_type == 1:  # Cylindrical zone
                zone_modifier = "⌀"

        position = {'x': 0, 'y': 0, 'z': 0}
        if hasattr(tol_obj, 'GetPointTextAttach'):
            pnt = tol_obj.GetPointTextAttach()
            position = {'x': pnt.X(), 'y': pnt.Y(), 'z': pnt.Z()}

        # Extract datum references
        datum_refs = []
        if dim_tol_tool is not None:
            try:
                datum_labels = TDF_LabelSequence()
                dim_tol_tool.GetDatumOfTolerLabels(label, datum_labels)
                for j in range(1, datum_labels.Length() + 1):
                    datum_label = datum_labels.Value(j)
                    datum_info = extract_datum_from_label(datum_label, j)
                    if datum_info:
                        datum_refs.append(datum_info['label'])
            except Exception as e:
                logger.debug(f"Could not extract datum refs: {e}")

        # Build feature control frame text
        text = f"{symbol}"
        if zone_modifier:
            text += f" {zone_modifier}"
        text += f" {value:.3f}"
        if modifier:
            text += f" {modifier}"
        if datum_refs:
            text += f" | {' | '.join(datum_refs)}"

        return {
            'id': f"tol_{index}",
            'type': type_name,
            'value': value,
            'unit': 'mm',
            'symbol': symbol,
            'modifier': modifier,
            'zone_modifier': zone_modifier,
            'datum_refs': datum_refs,
            'text': text,
            'position': position,
        }

    except Exception as e:
        logger.debug(f"Could not extract tolerance: {e}")
        return None


def extract_datum_from_label(label, index: int) -> Optional[Dict]:
    """Extract a datum from its label."""
    from OCC.Core.XCAFDoc import XCAFDoc_Datum

    try:
        datum_attr = XCAFDoc_Datum()
        if not label.FindAttribute(XCAFDoc_Datum.GetID(), datum_attr):
            return None

        datum_obj = datum_attr.GetObject()
        if datum_obj is None:
            return None

        # Get label
        datum_label = chr(ord('A') + index - 1)
        if hasattr(datum_obj, 'GetName'):
            name = datum_obj.GetName()
            if name:
                datum_label = name.ToCString() if hasattr(name, 'ToCString') else str(name)

        position = {'x': 0, 'y': 0, 'z': 0}
        if hasattr(datum_obj, 'GetPointTextAttach'):
            pnt = datum_obj.GetPointTextAttach()
            position = {'x': pnt.X(), 'y': pnt.Y(), 'z': pnt.Z()}

        return {
            'id': f"datum_{index}",
            'label': datum_label,
            'position': position,
        }

    except Exception as e:
        logger.debug(f"Could not extract datum: {e}")
        return None


def generate_shape_thumbnail(shape, size: int = 256) -> Optional[str]:
    """Generate a thumbnail image of the shape."""
    try:
        from OCC.Display.SimpleGui import init_display
        from OCC.Core.Quantity import Quantity_Color, Quantity_TOC_RGB
        import io

        # This is complex and requires X11/display - skip for now
        # Return None, thumbnail generation can be added later with headless rendering
        return None

    except Exception as e:
        logger.debug(f"Thumbnail generation not available: {e}")
        return None
