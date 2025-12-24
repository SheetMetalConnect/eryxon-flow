"""
PMI Extraction Module

Extracts Product Manufacturing Information (PMI) from STEP AP242 files
using pythonocc-core (OpenCASCADE Python bindings).

This module handles:
- Dimensions (linear, angular, radius, diameter)
- Geometric tolerances (GD&T)
- Datums
"""

import logging
from typing import List, Optional, Tuple
from pydantic import BaseModel

logger = logging.getLogger(__name__)


# ============================================================================
# Data Models
# ============================================================================

class Vector3(BaseModel):
    """3D vector/point."""
    x: float
    y: float
    z: float


class Tolerance(BaseModel):
    """Dimension tolerance specification."""
    upper: float
    lower: float
    type: str = "bilateral"  # bilateral, unilateral, limit


class AssociatedGeometry(BaseModel):
    """References to associated CAD geometry."""
    face_ids: List[str] = []
    edge_ids: List[str] = []


class Dimension(BaseModel):
    """A dimension annotation (linear, angular, radius, diameter)."""
    id: str
    type: str  # linear, angular, radius, diameter, ordinate
    value: float
    unit: str = "mm"
    tolerance: Optional[Tolerance] = None
    text: str  # Display text: "50.00 ±0.1"
    position: Vector3
    leader_points: List[Vector3] = []
    associated_geometry: Optional[AssociatedGeometry] = None


class GeometricTolerance(BaseModel):
    """A geometric tolerance (GD&T) annotation."""
    id: str
    type: str  # flatness, parallelism, position, etc.
    value: float
    unit: str = "mm"
    symbol: str  # GD&T symbol character
    datum_refs: List[str] = []  # Referenced datum labels
    modifiers: List[str] = []  # MMC, LMC, etc.
    text: str  # Full GD&T frame text
    position: Vector3
    leader_points: List[Vector3] = []
    associated_geometry: Optional[AssociatedGeometry] = None


class Datum(BaseModel):
    """A datum feature reference."""
    id: str
    label: str  # "A", "B", "C"
    position: Vector3
    associated_geometry: Optional[AssociatedGeometry] = None


class PMIData(BaseModel):
    """Complete PMI data extracted from a STEP file."""
    version: str = "1.0"
    dimensions: List[Dimension] = []
    geometric_tolerances: List[GeometricTolerance] = []
    datums: List[Datum] = []


# ============================================================================
# GD&T Symbol Mapping
# ============================================================================

GDT_SYMBOLS = {
    "flatness": "⏥",
    "straightness": "⏤",
    "circularity": "○",
    "cylindricity": "⌭",
    "profile_line": "⌒",
    "profile_surface": "⌓",
    "parallelism": "∥",
    "perpendicularity": "⊥",
    "angularity": "∠",
    "position": "⌖",
    "concentricity": "◎",
    "symmetry": "⌯",
    "circular_runout": "↗",
    "total_runout": "↗↗",
}


# ============================================================================
# PMI Extraction Functions
# ============================================================================

def extract_pmi_from_file(file_path: str) -> PMIData:
    """
    Extract PMI data from a STEP file.

    Args:
        file_path: Path to the STEP file

    Returns:
        PMIData containing all extracted annotations
    """
    try:
        # Import OCC modules
        from OCC.Core.STEPCAFControl import STEPCAFControl_Reader
        from OCC.Core.XCAFDoc import XCAFDoc_DocumentTool
        from OCC.Core.TDocStd import TDocStd_Document
        from OCC.Core.TCollection import TCollection_ExtendedString
        from OCC.Core.IFSelect import IFSelect_RetDone

        logger.info(f"Loading STEP file: {file_path}")

        # Create XCAF document
        doc = TDocStd_Document(TCollection_ExtendedString("MDTV-XCAF"))

        # Create reader with GDT mode enabled
        reader = STEPCAFControl_Reader()
        reader.SetGDTMode(True)  # CRITICAL: enables PMI import
        reader.SetNameMode(True)
        reader.SetColorMode(True)

        # Read file
        status = reader.ReadFile(file_path)
        if status != IFSelect_RetDone:
            logger.warning(f"STEP read returned status: {status}")
            return PMIData()

        # Transfer to document
        if not reader.Transfer(doc):
            logger.warning("Failed to transfer STEP data to document")
            return PMIData()

        # Get tools
        main_label = doc.Main()
        dim_tol_tool = XCAFDoc_DocumentTool.DimTolTool(main_label)
        shape_tool = XCAFDoc_DocumentTool.ShapeTool(main_label)

        pmi_data = PMIData()

        # Extract dimensions
        pmi_data.dimensions = extract_dimensions(dim_tol_tool, shape_tool)

        # Extract geometric tolerances
        pmi_data.geometric_tolerances = extract_geometric_tolerances(dim_tol_tool, shape_tool)

        # Extract datums
        pmi_data.datums = extract_datums(dim_tol_tool, shape_tool)

        logger.info(
            f"Extraction complete: {len(pmi_data.dimensions)} dimensions, "
            f"{len(pmi_data.geometric_tolerances)} tolerances, "
            f"{len(pmi_data.datums)} datums"
        )

        return pmi_data

    except ImportError as e:
        logger.error(f"pythonocc-core not installed: {e}")
        raise RuntimeError(
            "pythonocc-core is required for PMI extraction. "
            "Install with: conda install -c conda-forge pythonocc-core"
        )
    except Exception as e:
        logger.exception(f"PMI extraction error: {e}")
        return PMIData()


def extract_dimensions(dim_tol_tool, shape_tool) -> List[Dimension]:
    """Extract dimension annotations from the document."""
    from OCC.Core.TDF import TDF_LabelSequence
    from OCC.Core.XCAFDimTolObjects import XCAFDimTolObjects_DimensionObject

    dimensions = []

    try:
        dim_labels = TDF_LabelSequence()
        dim_tol_tool.GetDimensionLabels(dim_labels)

        logger.info(f"Found {dim_labels.Length()} dimension labels")

        for i in range(1, dim_labels.Length() + 1):
            label = dim_labels.Value(i)

            try:
                dim = extract_single_dimension(label, dim_tol_tool, i)
                if dim:
                    dimensions.append(dim)
            except Exception as e:
                logger.warning(f"Failed to extract dimension {i}: {e}")
                continue

    except Exception as e:
        logger.warning(f"Error getting dimension labels: {e}")

    return dimensions


def extract_single_dimension(label, dim_tol_tool, index: int) -> Optional[Dimension]:
    """Extract a single dimension from its label."""
    from OCC.Core.XCAFDimTolObjects import XCAFDimTolObjects_DimensionType
    from OCC.Core.XCAFDoc import XCAFDoc_Dimension

    try:
        # Get dimension attribute
        dim_attr = XCAFDoc_Dimension()
        if not label.FindAttribute(XCAFDoc_Dimension.GetID(), dim_attr):
            return None

        dim_obj = dim_attr.GetObject()
        if dim_obj is None:
            return None

        # Get dimension type
        dim_type = dim_obj.GetType()
        type_name = get_dimension_type_name(dim_type)

        # Get value
        value = dim_obj.GetValue()
        if hasattr(dim_obj, 'GetValues'):
            values = dim_obj.GetValues()
            if len(values) > 0:
                value = values[0]

        # Get tolerance
        tolerance = None
        if dim_obj.HasLowerBound() or dim_obj.HasUpperBound():
            upper = dim_obj.GetUpperBound() if dim_obj.HasUpperBound() else 0
            lower = dim_obj.GetLowerBound() if dim_obj.HasLowerBound() else 0
            tolerance = Tolerance(upper=upper, lower=lower)

        # Get position (annotation placement point)
        position = Vector3(x=0, y=0, z=0)
        if hasattr(dim_obj, 'GetPointTextAttach'):
            pnt = dim_obj.GetPointTextAttach()
            position = Vector3(x=pnt.X(), y=pnt.Y(), z=pnt.Z())
        elif hasattr(dim_obj, 'GetPoint'):
            pnt = dim_obj.GetPoint()
            position = Vector3(x=pnt.X(), y=pnt.Y(), z=pnt.Z())

        # Build display text
        text = format_dimension_text(value, tolerance, type_name)

        return Dimension(
            id=f"dim_{index}",
            type=type_name,
            value=value,
            unit="mm",
            tolerance=tolerance,
            text=text,
            position=position,
        )

    except Exception as e:
        logger.debug(f"Could not extract dimension: {e}")
        return None


def get_dimension_type_name(dim_type) -> str:
    """Convert OCCT dimension type enum to string."""
    type_map = {
        0: "linear",
        1: "linear",
        2: "angular",
        3: "radius",
        4: "diameter",
        5: "ordinate",
    }
    return type_map.get(dim_type, "linear")


def format_dimension_text(value: float, tolerance: Optional[Tolerance], dim_type: str) -> str:
    """Format dimension value and tolerance as display text."""
    # Format value
    text = f"{value:.2f}"

    # Add tolerance if present
    if tolerance:
        if tolerance.upper == abs(tolerance.lower):
            text += f" ±{tolerance.upper:.2f}"
        else:
            text += f" +{tolerance.upper:.2f}/{tolerance.lower:.2f}"

    # Add unit
    text += " mm"

    # Add symbol for radius/diameter
    if dim_type == "radius":
        text = "R" + text
    elif dim_type == "diameter":
        text = "⌀" + text

    return text


def extract_geometric_tolerances(dim_tol_tool, shape_tool) -> List[GeometricTolerance]:
    """Extract geometric tolerance (GD&T) annotations from the document."""
    from OCC.Core.TDF import TDF_LabelSequence

    tolerances = []

    try:
        tol_labels = TDF_LabelSequence()
        dim_tol_tool.GetGeomToleranceLabels(tol_labels)

        logger.info(f"Found {tol_labels.Length()} geometric tolerance labels")

        for i in range(1, tol_labels.Length() + 1):
            label = tol_labels.Value(i)

            try:
                tol = extract_single_tolerance(label, dim_tol_tool, i)
                if tol:
                    tolerances.append(tol)
            except Exception as e:
                logger.warning(f"Failed to extract tolerance {i}: {e}")
                continue

    except Exception as e:
        logger.warning(f"Error getting tolerance labels: {e}")

    return tolerances


def extract_single_tolerance(label, dim_tol_tool, index: int) -> Optional[GeometricTolerance]:
    """Extract a single geometric tolerance from its label."""
    from OCC.Core.XCAFDoc import XCAFDoc_GeomTolerance

    try:
        # Get tolerance attribute
        tol_attr = XCAFDoc_GeomTolerance()
        if not label.FindAttribute(XCAFDoc_GeomTolerance.GetID(), tol_attr):
            return None

        tol_obj = tol_attr.GetObject()
        if tol_obj is None:
            return None

        # Get tolerance type
        tol_type = tol_obj.GetType()
        type_name = get_tolerance_type_name(tol_type)
        symbol = GDT_SYMBOLS.get(type_name, "?")

        # Get value
        value = tol_obj.GetValue() if hasattr(tol_obj, 'GetValue') else 0.0

        # Get datum references
        datum_refs = []
        if hasattr(tol_obj, 'GetDatumSystem'):
            # Extract datum references from datum system
            pass  # Complex extraction - simplified for now

        # Get position
        position = Vector3(x=0, y=0, z=0)
        if hasattr(tol_obj, 'GetPointTextAttach'):
            pnt = tol_obj.GetPointTextAttach()
            position = Vector3(x=pnt.X(), y=pnt.Y(), z=pnt.Z())

        # Build display text
        text = f"{symbol} {value:.3f}"
        if datum_refs:
            text += " " + " ".join(datum_refs)

        return GeometricTolerance(
            id=f"tol_{index}",
            type=type_name,
            value=value,
            unit="mm",
            symbol=symbol,
            datum_refs=datum_refs,
            text=text,
            position=position,
        )

    except Exception as e:
        logger.debug(f"Could not extract tolerance: {e}")
        return None


def get_tolerance_type_name(tol_type) -> str:
    """Convert OCCT tolerance type enum to string."""
    # XCAFDimTolObjects_GeomToleranceType enum values
    type_map = {
        0: "flatness",
        1: "straightness",
        2: "circularity",
        3: "cylindricity",
        4: "profile_line",
        5: "profile_surface",
        6: "parallelism",
        7: "perpendicularity",
        8: "angularity",
        9: "position",
        10: "concentricity",
        11: "symmetry",
        12: "circular_runout",
        13: "total_runout",
    }
    return type_map.get(tol_type, "unknown")


def extract_datums(dim_tol_tool, shape_tool) -> List[Datum]:
    """Extract datum feature references from the document."""
    from OCC.Core.TDF import TDF_LabelSequence

    datums = []

    try:
        datum_labels = TDF_LabelSequence()
        dim_tol_tool.GetDatumLabels(datum_labels)

        logger.info(f"Found {datum_labels.Length()} datum labels")

        for i in range(1, datum_labels.Length() + 1):
            label = datum_labels.Value(i)

            try:
                datum = extract_single_datum(label, dim_tol_tool, i)
                if datum:
                    datums.append(datum)
            except Exception as e:
                logger.warning(f"Failed to extract datum {i}: {e}")
                continue

    except Exception as e:
        logger.warning(f"Error getting datum labels: {e}")

    return datums


def extract_single_datum(label, dim_tol_tool, index: int) -> Optional[Datum]:
    """Extract a single datum from its label."""
    from OCC.Core.XCAFDoc import XCAFDoc_Datum

    try:
        # Get datum attribute
        datum_attr = XCAFDoc_Datum()
        if not label.FindAttribute(XCAFDoc_Datum.GetID(), datum_attr):
            return None

        datum_obj = datum_attr.GetObject()
        if datum_obj is None:
            return None

        # Get datum label (A, B, C, etc.)
        datum_label = ""
        if hasattr(datum_obj, 'GetName'):
            name = datum_obj.GetName()
            if name:
                datum_label = name.ToCString() if hasattr(name, 'ToCString') else str(name)

        if not datum_label:
            datum_label = chr(ord('A') + index - 1)  # Default to A, B, C...

        # Get position
        position = Vector3(x=0, y=0, z=0)
        if hasattr(datum_obj, 'GetPointTextAttach'):
            pnt = datum_obj.GetPointTextAttach()
            position = Vector3(x=pnt.X(), y=pnt.Y(), z=pnt.Z())

        return Datum(
            id=f"datum_{index}",
            label=datum_label,
            position=position,
        )

    except Exception as e:
        logger.debug(f"Could not extract datum: {e}")
        return None
