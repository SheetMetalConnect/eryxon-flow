"""
Eryxon3D - CAD Extraction Engine

Extracts tessellated geometry and PMI from CAD files using pythonocc-core.

Supported formats:
- STEP (AP203, AP214, AP242 with PMI)
- IGES
- BREP

Output:
- Tessellated mesh geometry (vertices, normals, indices as base64)
- PMI annotations (dimensions, GD&T, datums, surface finish)
- Thumbnails (optional PNG)

PMI Extraction Strategy:
- Primary: Text-based parsing of STEP AP242 files (reliable, no binding issues)
- Fallback: XCAF/XDE API via pythonocc-core (may have incomplete bindings)
"""

import base64
import logging
import os
import struct
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

_FINDATTRIBUTE_SUPPORTED = True


def extract_pmi_via_text_parser(file_path: str) -> Dict[str, Any]:
    """
    Extract PMI from STEP file using direct text parsing.

    This method bypasses pythonocc-core's incomplete PMI bindings by parsing
    the STEP file as plain text according to ISO 10303-21 format.

    Based on Chen et al. (2025) "Three-Dimensional Visualization of PMI
    in a Web Browser Based on STEP AP242 and WebGL".

    Args:
        file_path: Path to STEP AP242 file

    Returns:
        PMI data structure with dimensions, tolerances, datums
    """
    try:
        from pmi_extractors import extract_pmi_from_step

        logger.info(f"Extracting PMI via text parser from: {file_path}")
        pmi_data = extract_pmi_from_step(file_path)

        dim_count = len(pmi_data.get("dimensions", []))
        tol_count = len(pmi_data.get("geometric_tolerances", []))
        datum_count = len(pmi_data.get("datums", []))

        logger.info(
            f"Text parser extracted: {dim_count} dimensions, "
            f"{tol_count} tolerances, {datum_count} datums"
        )

        return pmi_data

    except ImportError as e:
        logger.warning(f"Text parser not available: {e}")
        return _empty_pmi_data()
    except Exception as e:
        logger.error(f"Text parser PMI extraction failed: {e}")
        import traceback
        logger.debug(traceback.format_exc())
        return _empty_pmi_data()


def _empty_pmi_data() -> Dict[str, Any]:
    """Return empty PMI data structure."""
    return {
        "version": "1.0",
        "dimensions": [],
        "geometric_tolerances": [],
        "datums": [],
        "surface_finishes": [],
        "notes": [],
        "graphical_pmi": [],
    }


@dataclass
class ProcessingResult:
    """Result of CAD file processing."""

    geometry: Optional[Dict[str, Any]] = None
    pmi: Optional[Dict[str, Any]] = None
    thumbnail_base64: Optional[str] = None


def _create_xcaf_document():
    """
    Create a properly initialized XCAF document with version-aware API selection.
    """
    from OCC.Core.TCollection import TCollection_ExtendedString
    from OCC.Core.XCAFApp import XCAFApp_Application

    fmt_str = "MDTV-XCAF"
    fmt = TCollection_ExtendedString(fmt_str)
    app = XCAFApp_Application.GetApplication()

    def _pythonocc_version():
        try:
            import OCC

            major = getattr(OCC, "PYTHONOCC_VERSION_MAJOR", None)
            minor = getattr(OCC, "PYTHONOCC_VERSION_MINOR", None)
            patch = getattr(OCC, "PYTHONOCC_VERSION_PATCH", None)
            devel = getattr(OCC, "PYTHONOCC_VERSION_DEVEL", "")
            if all(isinstance(v, int) for v in [major, minor, patch]):
                return (major, minor, patch, devel)
        except Exception as occ_err:
            logger.debug(f"Failed to read pythonocc version: {occ_err}")
        return None

    try:
        from OCC.Core.Standard import Standard_Version

        version_str = getattr(Standard_Version, "OCC_VERSION_COMPLETE", None)
        if version_str:
            logger.info(f"OCCT version: {version_str}")
    except Exception as version_err:
        logger.debug(f"Failed to read OCCT version: {version_err}")

    occ_version = _pythonocc_version()
    if occ_version:
        logger.info(
            "pythonocc version: %d.%d.%d%s"
            % (occ_version[0], occ_version[1], occ_version[2], occ_version[3])
        )

    # Avoid direct TDocStd_Document creation only when explicitly disabled.
    allow_direct = True
    if occ_version:
        allow_direct = (occ_version[0], occ_version[1]) >= (7, 8)
    if os.getenv("XCAF_ALLOW_DIRECT") == "1":
        allow_direct = True
    if os.getenv("XCAF_DISABLE_DIRECT") == "1":
        allow_direct = False
    if not allow_direct:
        logger.info("Direct TDocStd_Document creation disabled for this environment")

    def _validate_document(doc) -> bool:
        if doc is None:
            logger.warning("XCAF document is None")
            return False
        if not hasattr(doc, "Main"):
            logger.warning("XCAF document missing Main()")
            return False
        main_label = doc.Main()
        if hasattr(main_label, "IsNull") and main_label.IsNull():
            logger.warning("XCAF main label is null")
            return False
        return True

    # Method 1: Try Handle wrapper approach (older pythonocc versions)
    try:
        from OCC.Core.TDocStd import Handle_TDocStd_Document

        logger.debug("Attempting Handle_TDocStd_Document creation")
        h_doc = Handle_TDocStd_Document()
        app.NewDocument(fmt, h_doc)
        if not h_doc.IsNull():
            doc_obj = h_doc.GetObject()
            if doc_obj is not None and _validate_document(doc_obj):
                logger.info("XCAF document created via Handle_TDocStd_Document")
                return h_doc, doc_obj
        logger.warning("Handle document creation produced invalid XCAF document")
    except Exception as handle_err:
        import traceback

        logger.warning(f"Handle document creation failed: {handle_err}")
        logger.debug(traceback.format_exc())

    # Method 2: Try NewDocument return style (varies by binding)
    try:
        logger.debug("Attempting NewDocument return style")
        result = app.NewDocument(fmt)
        if result is not None:
            if hasattr(result, "GetObject"):
                doc = result.GetObject()
                if doc is not None and _validate_document(doc):
                    logger.info("XCAF document created via NewDocument return handle")
                    return result, doc
            if hasattr(result, "Main") and _validate_document(result):
                logger.info("XCAF document created via NewDocument return doc")
                return None, result
    except Exception as new_doc_err:
        import traceback

        logger.warning(f"NewDocument return style failed: {new_doc_err}")
        logger.debug(traceback.format_exc())

    # Method 3: Direct TDocStd_Document creation (opt-in or older bindings)
    if allow_direct:
        try:
            from OCC.Core.TDocStd import TDocStd_Document

            logger.debug("Attempting direct TDocStd_Document creation")
            doc = TDocStd_Document(fmt_str)
            app.InitDocument(doc)

            if _validate_document(doc):
                logger.info("XCAF document created via TDocStd_Document")
                return None, doc
            logger.warning("Direct document creation produced invalid XCAF document")
        except Exception as direct_err:
            import traceback

            logger.warning(f"Direct document creation failed: {direct_err}")
            logger.debug(traceback.format_exc())

    logger.error("All XCAF document creation methods failed")
    return None


def _label_find_attribute(label, guid, attr) -> bool:
    global _FINDATTRIBUTE_SUPPORTED
    if not _FINDATTRIBUTE_SUPPORTED:
        return False
    try:
        return label.FindAttribute(guid, attr)
    except Exception as attr_err:
        logger.debug(f"Label FindAttribute failed: {attr_err}")
        _FINDATTRIBUTE_SUPPORTED = False
        return False


def _harray_to_list(arr) -> List[float]:
    if arr is None or not hasattr(arr, "Lower") or not hasattr(arr, "Upper"):
        return []
    values = []
    for i in range(arr.Lower(), arr.Upper() + 1):
        try:
            values.append(arr.Value(i))
        except Exception:
            break
    return values


def _as_string(value) -> Optional[str]:
    if value is None:
        return None
    if hasattr(value, "ToCString"):
        try:
            return value.ToCString()
        except Exception:
            return None
    return str(value)


def _parse_dimtol_result(result):
    success = True
    kind = None
    name = None
    description = None
    if isinstance(result, tuple):
        if result and isinstance(result[0], bool):
            success = result[0]
            result = result[1:]
        if len(result) > 0:
            kind = result[0]
        if len(result) > 1:
            name = result[1]
        if len(result) > 2:
            description = result[2]
    elif isinstance(result, bool):
        success = result
    else:
        kind = result
    return success, kind, name, description


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
        from OCC.Core.BRep import BRep_Builder
        from OCC.Core.BRepTools import breptools_Read
        from OCC.Core.IFSelect import IFSelect_RetDone
        from OCC.Core.IGESControl import IGESControl_Reader
        from OCC.Core.STEPCAFControl import STEPCAFControl_Reader
        from OCC.Core.STEPControl import STEPControl_Reader
        from OCC.Core.TopoDS import TopoDS_Shape
        from OCC.Core.XCAFDoc import XCAFDoc_DocumentTool

        logger.info(f"Processing file: {file_path}")

        # Determine file type
        file_ext = file_path.lower().split(".")[-1]

        # For PMI extraction, we need XCAF document
        doc = None
        shape = None

        # Keep reference to STEP reader for entity access
        step_reader = None

        if file_ext in ["step", "stp"]:
            if extract_pmi:
                # Use XCAF reader for PMI support
                doc_bundle = _create_xcaf_document()
                if doc_bundle is None:
                    logger.warning("XCAF document init failed; PMI extraction disabled")
                    extract_pmi = False
                else:
                    doc_handle, doc = doc_bundle
                    if not hasattr(doc, "Main"):
                        logger.warning(
                            "XCAF document missing Main(); PMI extraction disabled"
                        )
                        extract_pmi = False
                        doc = None
                    reader = STEPCAFControl_Reader()
                    reader.SetGDTMode(True)  # Enable PMI
                    reader.SetNameMode(True)
                    reader.SetColorMode(True)

                    # Set failure mode to continue on errors instead of crashing
                    reader.Reader().WS().TransferReader().TransientProcess().SetTraceLevel(
                        0
                    )

                    status = reader.ReadFile(file_path)
                    if status != IFSelect_RetDone:
                        raise ValueError(f"Failed to read STEP file: status {status}")

                    # Store reader for entity access
                    step_reader = reader.Reader()

                    # Check for unresolved references before transfer
                    ws = step_reader.WS()
                    model = ws.Model()
                    nb_roots = step_reader.NbRootsForTransfer()

                    logger.info(f"STEP file has {nb_roots} root entities")

                    # Check model validity
                    if model is not None:
                        nb_entities = model.NbEntities()
                        logger.info(f"STEP model has {nb_entities} entities")

                        # Check for unresolved references using check model
                        from OCC.Core.Interface import Interface_CheckIterator

                        check_iter = Interface_CheckIterator()
                        if hasattr(model, "FillChecks"):
                            model.FillChecks(check_iter)
                        else:
                            logger.debug(
                                "Interface model does not support FillChecks; skipping validation checks"
                            )

                        has_fails = False
                        fail_count = 0
                        if hasattr(check_iter, "NbChecks") and hasattr(
                            check_iter, "Value"
                        ):
                            for i in range(1, check_iter.NbChecks() + 1):
                                check = check_iter.Value(i)
                                if check.HasFailed():
                                    has_fails = True
                                    fail_count += 1
                                    if fail_count <= 5:  # Log first 5 failures
                                        for j in range(1, check.NbFails() + 1):
                                            logger.warning(
                                                f"STEP validation fail: {check.CFail(j)}"
                                            )
                        else:
                            logger.debug(
                                "Interface_CheckIterator lacks NbChecks/Value; skipping validation iteration"
                            )

                        if has_fails:
                            logger.warning(
                                f"STEP file has {fail_count} validation failures - attempting to continue"
                            )

                    # Attempt transfer with error handling
                    try:
                        # In pythonocc 7.x, Transfer takes the document directly
                        # Use doc_handle if available (older API), otherwise use doc directly
                        if doc_handle is not None:
                            transfer_status = reader.Transfer(doc_handle)
                        else:
                            transfer_status = reader.Transfer(doc)
                        if not transfer_status:
                            logger.warning(
                                "STEP transfer returned false, attempting to extract partial geometry"
                            )
                    except Exception as transfer_err:
                        logger.error(f"STEP transfer failed: {transfer_err}")
                        # Fall back to basic reader
                        logger.info("Falling back to basic STEP reader without PMI")
                        extract_pmi = False
                        doc = None
                        reader_basic = STEPControl_Reader()
                        status = reader_basic.ReadFile(file_path)
                        if status == IFSelect_RetDone:
                            reader_basic.TransferRoots()
                            shape = reader_basic.OneShape()
                        else:
                            raise ValueError(
                                "Failed to read STEP file with basic reader"
                            )

                    # Get shape from document if transfer succeeded
                    if doc is not None:
                        shape_tool = XCAFDoc_DocumentTool.ShapeTool(doc.Main())
                        shapes = []
                        try:
                            from OCC.Core.TDF import TDF_LabelSequence

                            seq = TDF_LabelSequence()
                            shape_tool.GetFreeShapes(seq)
                            for i in range(1, seq.Length() + 1):
                                shapes.append(seq.Value(i))
                        except Exception:
                            shape_tool.GetFreeShapes(shapes)
                        if shapes:
                            from OCC.Core.BRep import BRep_Builder
                            from OCC.Core.TopoDS import TopoDS_Compound

                            compound = TopoDS_Compound()
                            builder = BRep_Builder()
                            builder.MakeCompound(compound)
                            for s in shapes:
                                shape_tool_shape = shape_tool.GetShape(s)
                                if not shape_tool_shape.IsNull():
                                    builder.Add(compound, shape_tool_shape)
                            shape = compound

                        # Validate we got a shape
                        if shape is None or shape.IsNull():
                            logger.warning(
                                "No valid shape extracted from XCAF, trying basic reader"
                            )
                            extract_pmi = False
                            doc = None
                            reader_basic = STEPControl_Reader()
                            status = reader_basic.ReadFile(file_path)
                            if status == IFSelect_RetDone:
                                reader_basic.TransferRoots()
                                shape = reader_basic.OneShape()
            if not extract_pmi:
                # Simple STEP reader for geometry only
                reader = STEPControl_Reader()
                status = reader.ReadFile(file_path)
                if status != IFSelect_RetDone:
                    raise ValueError(f"Failed to read STEP file: status {status}")
                reader.TransferRoots()
                shape = reader.OneShape()

        elif file_ext in ["iges", "igs"]:
            reader = IGESControl_Reader()
            status = reader.ReadFile(file_path)
            if status != IFSelect_RetDone:
                raise ValueError(f"Failed to read IGES file: status {status}")
            reader.TransferRoots()
            shape = reader.OneShape()

        elif file_ext == "brep":
            shape = TopoDS_Shape()
            builder = BRep_Builder()
            success = breptools_Read(shape, file_path, builder)
            if not success:
                raise ValueError("Failed to read BREP file")

        else:
            raise ValueError(f"Unsupported file format: {file_ext}")

        # Extract geometry
        if extract_geometry and shape is not None:
            # Validate shape before tessellation
            if not shape.IsNull():
                try:
                    result.geometry = tessellate_shape(shape)
                    logger.info(
                        f"Extracted {result.geometry['total_vertices']} vertices"
                    )
                except Exception as tess_err:
                    logger.error(f"Tessellation failed: {tess_err}")
                    # Return error instead of crashing
                    raise ValueError(f"Geometry tessellation failed: {str(tess_err)}")
            else:
                logger.warning("Shape is null, cannot extract geometry")
                raise ValueError("Invalid shape - geometry extraction not possible")

        # Extract PMI - Use text parser as primary method (more reliable)
        if extract_pmi and file_ext in ["step", "stp"]:
            # Primary: Text-based parsing (bypasses pythonocc binding issues)
            result.pmi = extract_pmi_via_text_parser(file_path)

            dim_count = len(result.pmi.get("dimensions", []))
            tol_count = len(result.pmi.get("geometric_tolerances", []))
            datum_count = len(result.pmi.get("datums", []))

            # If text parser found PMI, use it
            if dim_count > 0 or tol_count > 0 or datum_count > 0:
                logger.info(
                    f"PMI extracted via text parser: {dim_count} dimensions, "
                    f"{tol_count} GD&T, {datum_count} datums"
                )
            else:
                # Fallback: Try XCAF extraction if text parser found nothing
                logger.info("Text parser found no PMI, trying XCAF fallback...")
                if doc is not None:
                    xcaf_pmi = extract_pmi_from_document(doc, step_reader)
                    xcaf_dim_count = len(xcaf_pmi.get("dimensions", []))
                    xcaf_tol_count = len(xcaf_pmi.get("geometric_tolerances", []))
                    xcaf_datum_count = len(xcaf_pmi.get("datums", []))

                    if xcaf_dim_count > 0 or xcaf_tol_count > 0 or xcaf_datum_count > 0:
                        result.pmi = xcaf_pmi
                        logger.info(
                            f"PMI extracted via XCAF: {xcaf_dim_count} dimensions, "
                            f"{xcaf_tol_count} GD&T, {xcaf_datum_count} datums"
                        )
                    else:
                        logger.info("No PMI found in file (may be geometry-only)")
        elif extract_pmi and doc is not None:
            # Non-STEP files: use XCAF extraction only
            result.pmi = extract_pmi_from_document(doc, step_reader)
            dim_count = len(result.pmi.get("dimensions", []))
            tol_count = len(result.pmi.get("geometric_tolerances", []))
            datum_count = len(result.pmi.get("datums", []))
            logger.info(
                f"Extracted PMI: {dim_count} dimensions, {tol_count} GD&T, {datum_count} datums"
            )

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
    from OCC.Core.Bnd import Bnd_Box
    from OCC.Core.BRep import BRep_Tool
    from OCC.Core.BRepBndLib import brepbndlib_Add
    from OCC.Core.BRepCheck import BRepCheck_Analyzer
    from OCC.Core.BRepMesh import BRepMesh_IncrementalMesh
    from OCC.Core.gp import gp_Pnt, gp_Vec
    from OCC.Core.TopAbs import TopAbs_FACE
    from OCC.Core.TopExp import TopExp_Explorer
    from OCC.Core.TopLoc import TopLoc_Location

    # Validate shape geometry before tessellation
    try:
        analyzer = BRepCheck_Analyzer(shape)
        if not analyzer.IsValid():
            logger.warning(
                "Shape has invalid geometry, attempting to tessellate anyway"
            )
    except Exception as check_err:
        logger.warning(
            f"Geometry validation failed: {check_err}, attempting to continue"
        )

    # Compute bounding box first to determine mesh resolution
    try:
        bbox = Bnd_Box()
        brepbndlib_Add(shape, bbox)

        # Check if bounding box is valid
        if bbox.IsVoid():
            raise ValueError("Shape has void bounding box - no geometry found")

        xmin, ymin, zmin, xmax, ymax, zmax = bbox.Get()

        # Validate bounding box dimensions
        if not all(
            isinstance(v, (int, float)) and not (v != v)
            for v in [xmin, ymin, zmin, xmax, ymax, zmax]
        ):
            raise ValueError("Invalid bounding box coordinates")

    except Exception as bbox_err:
        logger.error(f"Bounding box computation failed: {bbox_err}")
        raise ValueError(f"Cannot compute bounding box: {str(bbox_err)}")

    diagonal = ((xmax - xmin) ** 2 + (ymax - ymin) ** 2 + (zmax - zmin) ** 2) ** 0.5
    linear_deflection = diagonal * 0.001  # 0.1% of diagonal
    angular_deflection = 0.5  # radians

    # Tessellate with error handling
    try:
        mesh = BRepMesh_IncrementalMesh(
            shape, linear_deflection, False, angular_deflection, True
        )
        mesh.Perform()

        if not mesh.IsDone():
            logger.warning("Tessellation incomplete - mesh may have errors")

    except Exception as mesh_err:
        logger.error(f"Mesh generation failed: {mesh_err}")
        raise ValueError(f"Tessellation failed: {str(mesh_err)}")

    # Extract triangles from faces
    meshes = []
    total_vertices = 0
    total_faces = 0

    explorer = TopExp_Explorer(shape, TopAbs_FACE)
    face_index = 0
    failed_faces = 0

    while explorer.More():
        try:
            face = explorer.Current()
            location = TopLoc_Location()

            triangulation = BRep_Tool.Triangulation(face, location)
        except Exception as face_err:
            logger.warning(f"Failed to process face {face_index}: {face_err}")
            failed_faces += 1
            explorer.Next()
            face_index += 1
            continue

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
                    p1 = gp_Pnt(
                        vertices[(n1 - 1) * 3],
                        vertices[(n1 - 1) * 3 + 1],
                        vertices[(n1 - 1) * 3 + 2],
                    )
                    p2 = gp_Pnt(
                        vertices[(n2 - 1) * 3],
                        vertices[(n2 - 1) * 3 + 1],
                        vertices[(n2 - 1) * 3 + 2],
                    )
                    p3 = gp_Pnt(
                        vertices[(n3 - 1) * 3],
                        vertices[(n3 - 1) * 3 + 1],
                        vertices[(n3 - 1) * 3 + 2],
                    )

                    v1 = gp_Vec(p1, p2)
                    v2 = gp_Vec(p1, p3)
                    normal = v1.Crossed(v2)

                    if normal.Magnitude() > 1e-10:
                        normal.Normalize()

                        # Accumulate normals for smooth shading
                        for idx in [n1 - 1, n2 - 1, n3 - 1]:
                            face_normals[idx * 3] += normal.X()
                            face_normals[idx * 3 + 1] += normal.Y()
                            face_normals[idx * 3 + 2] += normal.Z()
                            normal_counts[idx] += 1

                # Normalize accumulated normals
                for i in range(nb_nodes):
                    if normal_counts[i] > 0:
                        length = (
                            face_normals[i * 3] ** 2
                            + face_normals[i * 3 + 1] ** 2
                            + face_normals[i * 3 + 2] ** 2
                        ) ** 0.5
                        if length > 1e-10:
                            face_normals[i * 3] /= length
                            face_normals[i * 3 + 1] /= length
                            face_normals[i * 3 + 2] /= length

                normals = face_normals

                # Encode as base64
                vertices_bytes = struct.pack(f"{len(vertices)}f", *vertices)
                normals_bytes = struct.pack(f"{len(normals)}f", *normals)
                indices_bytes = struct.pack(f"{len(indices)}I", *indices)

                meshes.append(
                    {
                        "vertices_base64": base64.b64encode(vertices_bytes).decode(
                            "ascii"
                        ),
                        "normals_base64": base64.b64encode(normals_bytes).decode(
                            "ascii"
                        ),
                        "indices_base64": base64.b64encode(indices_bytes).decode(
                            "ascii"
                        ),
                        "vertex_count": nb_nodes,
                        "face_count": nb_triangles,
                        "color": [0.29, 0.56, 0.88],  # Default blue
                    }
                )

                total_vertices += nb_nodes
                total_faces += nb_triangles

        explorer.Next()
        face_index += 1

    # Log extraction results
    if failed_faces > 0:
        logger.warning(f"Failed to process {failed_faces} faces out of {face_index}")

    # Validate we got some geometry
    if len(meshes) == 0:
        raise ValueError(
            "No valid geometry extracted from shape - all faces failed tessellation"
        )

    if total_vertices == 0 or total_faces == 0:
        raise ValueError(
            f"Invalid tessellation result: {total_vertices} vertices, {total_faces} faces"
        )

    logger.info(
        f"Successfully tessellated {len(meshes)} mesh components with {total_vertices} vertices and {total_faces} faces"
    )

    return {
        "meshes": meshes,
        "bounding_box": {
            "min": [xmin, ymin, zmin],
            "max": [xmax, ymax, zmax],
            "center": [(xmin + xmax) / 2, (ymin + ymax) / 2, (zmin + zmax) / 2],
            "size": [xmax - xmin, ymax - ymin, zmax - zmin],
        },
        "total_vertices": total_vertices,
        "total_faces": total_faces,
    }


def extract_pmi_from_document(doc, step_reader=None) -> Dict[str, Any]:
    """
    Extract all PMI/MBD annotations from an XCAF document.

    Supports STEP AP242 semantic PMI including:
    - Dimensions (linear, angular, radius, diameter, ordinate)
    - Geometric tolerances (all 14 GD&T types per ASME Y14.5)
    - Datums and datum targets
    - Surface finish symbols (per ISO 1302)
    - Notes and text annotations
    - Graphical PMI (polylines, leader lines)

    Args:
        doc: XCAF document from STEPCAFControl_Reader
        step_reader: Optional STEPControl_Reader for entity-level access
    """
    from OCC.Core.TDF import TDF_ChildIterator, TDF_LabelSequence
    from OCC.Core.XCAFDoc import XCAFDoc_DocumentTool

    pmi_data = {
        "version": "1.0",
        "dimensions": [],
        "geometric_tolerances": [],
        "datums": [],
        "surface_finishes": [],
        "notes": [],
        "graphical_pmi": [],
    }

    try:
        if not hasattr(doc, "Main"):
            logger.warning(
                "XCAF document does not expose Main(); skipping PMI extraction"
            )
            return pmi_data

        main_label = doc.Main()
        if hasattr(main_label, "IsNull") and main_label.IsNull():
            logger.warning("XCAF main label is null; skipping PMI extraction")
            return pmi_data

        # Ensure XCAF tools are initialized for this document.
        try:
            XCAFDoc_DocumentTool.ShapeTool(main_label)
        except Exception as tool_err:
            logger.warning(f"XCAF ShapeTool unavailable: {tool_err}")

        dim_tol_tool = XCAFDoc_DocumentTool.DimTolTool(main_label)
        if dim_tol_tool is None or (
            hasattr(dim_tol_tool, "IsNull") and dim_tol_tool.IsNull()
        ):
            logger.warning("XCAF DimTolTool unavailable; skipping PMI extraction")
            return pmi_data

        # Extract dimensions via XDE
        dim_labels = TDF_LabelSequence()
        dim_tol_tool.GetDimensionLabels(dim_labels)
        logger.info(f"Found {dim_labels.Length()} dimension labels")

        for i in range(1, dim_labels.Length() + 1):
            label = dim_labels.Value(i)
            dim = extract_dimension_from_label(label, i)
            if dim:
                pmi_data["dimensions"].append(dim)

        # Extract geometric tolerances via XDE
        tol_labels = TDF_LabelSequence()
        dim_tol_tool.GetGeomToleranceLabels(tol_labels)
        logger.info(f"Found {tol_labels.Length()} tolerance labels")

        for i in range(1, tol_labels.Length() + 1):
            label = tol_labels.Value(i)
            tol = extract_tolerance_from_label(label, i, dim_tol_tool)
            if tol:
                pmi_data["geometric_tolerances"].append(tol)

        # Extract datums via XDE
        datum_labels = TDF_LabelSequence()
        dim_tol_tool.GetDatumLabels(datum_labels)
        logger.info(f"Found {datum_labels.Length()} datum labels")

        for i in range(1, datum_labels.Length() + 1):
            label = datum_labels.Value(i)
            datum = extract_datum_from_label(label, i)
            if datum:
                pmi_data["datums"].append(datum)

        # Extract surface finish from STEP entities
        if step_reader is not None:
            surface_finishes = extract_surface_finishes_from_step(step_reader)
            pmi_data["surface_finishes"] = surface_finishes
        else:
            # Fallback to document traversal
            surface_finishes = extract_surface_finishes(doc, main_label)
            pmi_data["surface_finishes"] = surface_finishes

        # Extract notes and text annotations
        notes = extract_notes(doc, main_label)
        pmi_data["notes"] = notes

        # Extract graphical PMI (polylines, curves used for annotations)
        graphical = extract_graphical_pmi(doc, main_label)
        pmi_data["graphical_pmi"] = graphical

    except Exception as e:
        logger.warning(f"PMI extraction error: {e}")
        import traceback

        logger.debug(traceback.format_exc())

    return pmi_data


def extract_surface_finishes_from_step(step_reader) -> List[Dict]:
    """
    Extract surface finish from STEP entities directly.

    STEP AP242 stores surface finish as:
    - surface_texture_representation
    - machining_allowance_representation

    These are linked via draughting_model_item_association to geometry.
    """
    surface_finishes = []

    try:
        from OCC.Core.Interface import Interface_Static

        # Get the workspace model
        ws = step_reader.WS()
        if ws is None:
            return surface_finishes

        model = ws.Model()
        if model is None:
            return surface_finishes

        nb_entities = model.NbEntities()
        logger.debug(f"STEP model has {nb_entities} entities")

        sf_index = 1

        # Traverse entities looking for surface texture
        for i in range(1, nb_entities + 1):
            ent = model.Entity(i)
            if ent is None:
                continue

            type_name = ent.DynamicType().Name()

            # Look for surface texture entities
            if "surface_texture" in type_name.lower():
                sf = _parse_surface_texture_entity(ent, sf_index, model)
                if sf:
                    surface_finishes.append(sf)
                    sf_index += 1

            # Also check for mechanical_design_representation with roughness
            elif "roughness" in type_name.lower():
                sf = _parse_roughness_entity(ent, sf_index, model)
                if sf:
                    surface_finishes.append(sf)
                    sf_index += 1

    except Exception as e:
        logger.debug(f"STEP entity traversal: {e}")

    return surface_finishes


def _parse_surface_texture_entity(ent, index: int, model) -> Optional[Dict]:
    """Parse a surface_texture STEP entity."""
    try:
        # Surface texture has parameters like Ra, Rz values
        # The exact parsing depends on the STEP schema

        roughness_type = "Ra"
        roughness_value = None

        # Try to get attributes from the entity
        if hasattr(ent, "NbFields"):
            for field_idx in range(1, ent.NbFields() + 1):
                try:
                    field = ent.Field(field_idx)
                    if hasattr(field, "Real"):
                        # Likely a roughness value
                        roughness_value = field.Real()
                        break
                except:
                    pass

        if roughness_value is not None:
            return {
                "id": f"sf_{index}",
                "type": "surface_finish",
                "roughness_type": roughness_type,
                "roughness_value": roughness_value,
                "roughness_unit": "μm",
                "machining_allowance": None,
                "lay_symbol": None,
                "text": f"{roughness_type} {roughness_value} μm",
                "position": {"x": 0, "y": 0, "z": 0},
            }

        return None

    except Exception as e:
        logger.debug(f"Surface texture parse: {e}")
        return None


def _parse_roughness_entity(ent, index: int, model) -> Optional[Dict]:
    """Parse a roughness-related STEP entity."""
    # Similar structure to surface texture
    return _parse_surface_texture_entity(ent, index, model)


def extract_surface_finishes(doc, main_label) -> List[Dict]:
    """
    Extract surface finish symbols per ISO 1302 / ASME Y14.36.

    STEP AP242 encodes surface finish in draughting_model_item_association
    with surface_texture_representation entities. OCCT accesses these via
    the STEP reader's entity traversal.

    Note: Direct XDE API for surface finish is limited. This extracts
    from STEP entities where available.
    """
    from OCC.Core.TDF import TDF_ChildIterator

    # Surface finish symbols per ISO 1302
    LAY_SYMBOLS = {
        0: "=",  # Parallel to projection plane
        1: "⊥",  # Perpendicular to projection plane
        2: "X",  # Crossed (two directions)
        3: "M",  # Multi-directional
        4: "C",  # Circular
        5: "R",  # Radial
        6: "P",  # Particulate/non-directional
    }

    surface_finishes = []

    try:
        from OCC.Core.TDataStd import TDataStd_Name, TDataStd_Real
        from OCC.Core.TDF import TDF_LabelSequence
        from OCC.Core.XCAFDoc import XCAFDoc_DocumentTool

        # Traverse the document looking for surface finish annotations
        # These are typically stored with specific naming conventions
        iterator = TDF_ChildIterator(main_label, True)
        sf_index = 1

        while iterator.More():
            label = iterator.Value()

            # Check for name attribute indicating surface finish
            name_attr = TDataStd_Name()
            if label.FindAttribute(TDataStd_Name.GetID(), name_attr):
                name = name_attr.Get()
                if hasattr(name, "ToCString"):
                    name_str = name.ToCString().lower()

                    # Detect surface finish by naming convention
                    if any(
                        kw in name_str
                        for kw in [
                            "surface_finish",
                            "roughness",
                            "texture",
                            "ra ",
                            "rz ",
                        ]
                    ):
                        sf = _parse_surface_finish_label(label, sf_index, name_str)
                        if sf:
                            surface_finishes.append(sf)
                            sf_index += 1

            iterator.Next()

    except Exception as e:
        logger.debug(f"Surface finish extraction: {e}")

    return surface_finishes


def _parse_surface_finish_label(label, index: int, name_str: str) -> Optional[Dict]:
    """Parse surface finish data from label name and attributes."""
    try:
        import re

        from OCC.Core.TDataStd import TDataStd_Real

        position = {"x": 0, "y": 0, "z": 0}

        # Try to extract roughness value from name
        roughness_value = None
        roughness_type = None

        # Match patterns like "Ra 3.2" or "Rz 12.5"
        ra_match = re.search(r"\bra\s*[=:]?\s*([\d.]+)", name_str, re.IGNORECASE)
        rz_match = re.search(r"\brz\s*[=:]?\s*([\d.]+)", name_str, re.IGNORECASE)

        if ra_match:
            roughness_type = "Ra"
            roughness_value = float(ra_match.group(1))
        elif rz_match:
            roughness_type = "Rz"
            roughness_value = float(rz_match.group(1))

        # Try to get real value attribute
        real_attr = TDataStd_Real()
        if label.FindAttribute(TDataStd_Real.GetID(), real_attr):
            roughness_value = real_attr.Get()

        # Only return if we have actual data
        if roughness_value is not None:
            return {
                "id": f"sf_{index}",
                "type": "surface_finish",
                "roughness_type": roughness_type or "Ra",
                "roughness_value": roughness_value,
                "roughness_unit": "μm",
                "machining_allowance": None,
                "lay_symbol": None,
                "text": f"{roughness_type or 'Ra'} {roughness_value} μm",
                "position": position,
            }

        return None

    except Exception as e:
        logger.debug(f"Could not parse surface finish: {e}")
        return None


def extract_notes(doc, main_label) -> List[Dict]:
    """
    Extract text notes and annotations from XCAF document.

    STEP AP242 stores notes as draughting_annotation_occurrence with
    text_literal entities. OCCT exposes these via XCAFDoc_NoteTool (7.6+)
    and TDataStd_Comment attributes.
    """
    notes = []

    try:
        from OCC.Core.TDataStd import TDataStd_Comment, TDataStd_Name
        from OCC.Core.TDF import TDF_LabelSequence
        from OCC.Core.XCAFDoc import XCAFDoc_DocumentTool

        note_index = 1

        # Method 1: XCAFDoc_NoteTool (OCCT 7.6+)
        try:
            if hasattr(XCAFDoc_DocumentTool, "NotesTool"):
                note_tool = XCAFDoc_DocumentTool.NotesTool(main_label)

                if note_tool is not None:
                    note_labels = TDF_LabelSequence()
                    note_tool.GetNotes(note_labels)

                    for i in range(1, note_labels.Length() + 1):
                        label = note_labels.Value(i)
                        note = _extract_note_from_tool(label, note_index, note_tool)
                        if note and note.get("text"):
                            notes.append(note)
                            note_index += 1

        except Exception as e:
            logger.debug(f"NotesTool: {e}")

        # Method 2: TDataStd_Comment attributes (general text annotations)
        try:
            from OCC.Core.TDF import TDF_ChildIterator

            iterator = TDF_ChildIterator(main_label, True)

            while iterator.More():
                child_label = iterator.Value()

                # Check for Comment attribute (actual notes/annotations)
                comment_attr = TDataStd_Comment()
                if child_label.FindAttribute(TDataStd_Comment.GetID(), comment_attr):
                    comment = comment_attr.Get()
                    if hasattr(comment, "ToCString"):
                        text_str = comment.ToCString()
                        if text_str and len(text_str.strip()) > 0:
                            notes.append(
                                {
                                    "id": f"note_{note_index}",
                                    "type": "note",
                                    "text": text_str.strip(),
                                    "position": {"x": 0, "y": 0, "z": 0},
                                }
                            )
                            note_index += 1

                iterator.Next()

        except Exception as e:
            logger.debug(f"Comment extraction: {e}")

    except Exception as e:
        logger.debug(f"Note extraction: {e}")

    return notes


def _extract_note_from_tool(label, index: int, note_tool) -> Optional[Dict]:
    """Extract note content from NoteTool label."""
    try:
        # Get note object
        note_obj = note_tool.GetNote(label)
        if note_obj is None:
            return None

        text = ""
        position = {"x": 0, "y": 0, "z": 0}

        # Get text content
        if hasattr(note_obj, "Comment"):
            text = (
                note_obj.Comment().ToCString()
                if hasattr(note_obj.Comment(), "ToCString")
                else str(note_obj.Comment())
            )

        # Get position if available
        if hasattr(note_obj, "GetPoint"):
            pnt = note_obj.GetPoint()
            position = {"x": pnt.X(), "y": pnt.Y(), "z": pnt.Z()}

        if text:
            return {
                "id": f"note_{index}",
                "type": "note",
                "text": text,
                "position": position,
            }

        return None

    except Exception as e:
        logger.debug(f"Note extraction from tool: {e}")
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
        from OCC.Core.TDF import TDF_LabelSequence
        from OCC.Core.XCAFDoc import XCAFDoc_DocumentTool

        # Get the view tool which contains graphical annotations
        try:
            view_tool = (
                XCAFDoc_DocumentTool.ViewTool(main_label)
                if hasattr(XCAFDoc_DocumentTool, "ViewTool")
                else None
            )

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
        from OCC.Core.BRep import BRep_Tool
        from OCC.Core.BRepAdaptor import BRepAdaptor_Curve
        from OCC.Core.GeomAbs import GeomAbs_Circle, GeomAbs_Line
        from OCC.Core.TDF import TDF_ChildIterator
        from OCC.Core.TNaming import TNaming_NamedShape
        from OCC.Core.TopAbs import TopAbs_EDGE
        from OCC.Core.TopExp import TopExp_Explorer

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
                        curve_data = extract_edge_data(
                            edge, f"curve_{view_index}_{curve_index}"
                        )
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
        from OCC.Core.GCPnts import GCPnts_UniformAbscissa
        from OCC.Core.GeomAbs import GeomAbs_BSplineCurve, GeomAbs_Circle, GeomAbs_Line

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
                    points.append({"x": pnt.X(), "y": pnt.Y(), "z": pnt.Z()})
        except:
            # Fallback: just use start and end
            points = [
                {"x": start_pnt.X(), "y": start_pnt.Y(), "z": start_pnt.Z()},
                {"x": end_pnt.X(), "y": end_pnt.Y(), "z": end_pnt.Z()},
            ]

        return {
            "id": curve_id,
            "type": curve_type_str,
            "points": points,
        }

    except Exception as e:
        logger.debug(f"Edge data extraction failed: {e}")
        return None


def extract_dimension_from_label(
    label, index: int, dim_tol_tool=None
) -> Optional[Dict]:
    """Extract a dimension from its label."""
    try:
        from OCC.Core.XCAFDoc import XCAFDoc_Dimension

        dim_attr = XCAFDoc_Dimension()
        if _label_find_attribute(label, XCAFDoc_Dimension.GetID(), dim_attr):
            dim_obj = dim_attr.GetObject()
            if dim_obj is None:
                return None

            # Get type
            dim_type = dim_obj.GetType()
            type_name = {
                0: "linear",
                1: "linear",
                2: "angular",
                3: "radius",
                4: "diameter",
                5: "ordinate",
            }.get(dim_type, "linear")

            # Get value
            value = 0.0
            if hasattr(dim_obj, "GetValue"):
                value = dim_obj.GetValue()

            # Get tolerance
            tolerance = None
            if hasattr(dim_obj, "HasLowerBound") and hasattr(dim_obj, "HasUpperBound"):
                if dim_obj.HasLowerBound() or dim_obj.HasUpperBound():
                    upper = dim_obj.GetUpperBound() if dim_obj.HasUpperBound() else 0
                    lower = dim_obj.GetLowerBound() if dim_obj.HasLowerBound() else 0
                    tolerance = {"upper": upper, "lower": lower, "type": "bilateral"}

            # Get position
            position = {"x": 0, "y": 0, "z": 0}
            if hasattr(dim_obj, "GetPointTextAttach"):
                pnt = dim_obj.GetPointTextAttach()
                position = {"x": pnt.X(), "y": pnt.Y(), "z": pnt.Z()}

            # Format text
            text = f"{value:.2f}"
            if tolerance:
                if tolerance["upper"] == abs(tolerance["lower"]):
                    text += f" ±{tolerance['upper']:.2f}"
                else:
                    text += f" +{tolerance['upper']:.2f}/{tolerance['lower']:.2f}"
            text += " mm"

            if type_name == "radius":
                text = "R" + text
            elif type_name == "diameter":
                text = "⌀" + text

            return {
                "id": f"dim_{index}",
                "type": type_name,
                "value": value,
                "unit": "mm",
                "tolerance": tolerance,
                "text": text,
                "position": position,
                "leader_points": [],
            }

    except Exception as e:
        logger.debug(f"Could not extract dimension from attribute: {e}")

    if dim_tol_tool is None:
        return None

    try:
        from OCC.Core.TColStd import TColStd_HArray1OfReal

        if hasattr(dim_tol_tool, "IsDimension") and not dim_tol_tool.IsDimension(label):
            return None

        values = TColStd_HArray1OfReal(1, 3)
        result = dim_tol_tool.GetDimTol(label, values)
        success, _, name, description = _parse_dimtol_result(result)
        if success is False:
            return None

        vals = _harray_to_list(values)
        value = vals[0] if vals else 0.0
        tolerance = None
        if len(vals) >= 3:
            tolerance = {"upper": vals[1], "lower": vals[2], "type": "bilateral"}

        name_str = _as_string(name)
        desc_str = _as_string(description)
        text = " ".join([v for v in [name_str, desc_str] if v])
        if not text:
            text = f"{value:.3f} mm" if value else "dimension"

        return {
            "id": f"dim_{index}",
            "type": "linear",
            "value": value,
            "unit": "mm",
            "tolerance": tolerance,
            "text": text,
            "position": {"x": 0, "y": 0, "z": 0},
            "leader_points": [],
        }
    except Exception as e:
        logger.debug(f"Dimension tool extraction failed: {e}")
        return None


def extract_tolerance_from_label(
    label, index: int, dim_tol_tool=None
) -> Optional[Dict]:
    """Extract a geometric tolerance from its label."""
    from OCC.Core.TDF import TDF_LabelSequence
    from OCC.Core.XCAFDoc import XCAFDoc_GeomTolerance

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
        0: "",  # None/RFS (Regardless of Feature Size)
        1: "Ⓜ",  # MMC (Maximum Material Condition)
        2: "Ⓛ",  # LMC (Least Material Condition)
        3: "Ⓢ",  # RFS explicit
        4: "Ⓟ",  # Projected tolerance zone
        5: "Ⓕ",  # Free state
        6: "Ⓣ",  # Tangent plane
        7: "Ⓤ",  # Unequal bilateral
    }

    try:
        tol_attr = XCAFDoc_GeomTolerance()
        if not label.FindAttribute(XCAFDoc_GeomTolerance.GetID(), tol_attr):
            return None

        tol_obj = tol_attr.GetObject()
        if tol_obj is None:
            return None

        tol_type = tol_obj.GetType() if hasattr(tol_obj, "GetType") else 0
        type_name, symbol = GDT_SYMBOLS.get(tol_type, ("unknown", "?"))

        value = tol_obj.GetValue() if hasattr(tol_obj, "GetValue") else 0.0

        # Get material modifier
        modifier = ""
        if hasattr(tol_obj, "GetMaterialRequirementModifier"):
            mod_type = tol_obj.GetMaterialRequirementModifier()
            modifier = MATERIAL_MODIFIERS.get(mod_type, "")

        # Get zone modifier (diameter symbol for cylindrical tolerance zone)
        zone_modifier = ""
        if hasattr(tol_obj, "GetZoneModifier"):
            zone_type = tol_obj.GetZoneModifier()
            if zone_type == 1:  # Cylindrical zone
                zone_modifier = "⌀"

        position = {"x": 0, "y": 0, "z": 0}
        if hasattr(tol_obj, "GetPointTextAttach"):
            pnt = tol_obj.GetPointTextAttach()
            position = {"x": pnt.X(), "y": pnt.Y(), "z": pnt.Z()}

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
                        datum_refs.append(datum_info["label"])
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
            "id": f"tol_{index}",
            "type": type_name,
            "value": value,
            "unit": "mm",
            "symbol": symbol,
            "modifier": modifier,
            "zone_modifier": zone_modifier,
            "datum_refs": datum_refs,
            "text": text,
            "position": position,
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
        datum_label = chr(ord("A") + index - 1)
        if hasattr(datum_obj, "GetName"):
            name = datum_obj.GetName()
            if name:
                datum_label = (
                    name.ToCString() if hasattr(name, "ToCString") else str(name)
                )

        position = {"x": 0, "y": 0, "z": 0}
        if hasattr(datum_obj, "GetPointTextAttach"):
            pnt = datum_obj.GetPointTextAttach()
            position = {"x": pnt.X(), "y": pnt.Y(), "z": pnt.Z()}

        return {
            "id": f"datum_{index}",
            "label": datum_label,
            "position": position,
        }

    except Exception as e:
        logger.debug(f"Could not extract datum: {e}")
        return None


def generate_shape_thumbnail(shape, size: int = 256) -> Optional[str]:
    """Generate a thumbnail image of the shape."""
    try:
        import io

        from OCC.Core.Quantity import Quantity_Color, Quantity_TOC_RGB
        from OCC.Display.SimpleGui import init_display

        # This is complex and requires X11/display - skip for now
        # Return None, thumbnail generation can be added later with headless rendering
        return None

    except Exception as e:
        logger.debug(f"Thumbnail generation not available: {e}")
        return None
