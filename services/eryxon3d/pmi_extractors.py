"""
PMI Extractors for STEP AP242 Files

Extracts Product Manufacturing Information (PMI) from parsed STEP files.
Supports dimensions, geometric tolerances, datums, and related annotations.

Based on:
- ISO 10303-242 (AP242) PMI schema
- Chen et al. (2025) "Three-Dimensional Visualization of PMI in a Web Browser"
- ASME Y14.5-2018 GD&T standard
"""

import re
import logging
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field

from step_parser import StepParser, StepEntity

logger = logging.getLogger(__name__)


# GD&T symbols per ASME Y14.5 / ISO 1101
GDT_SYMBOLS = {
    'FLATNESS_TOLERANCE': ('flatness', '⏥'),
    'STRAIGHTNESS_TOLERANCE': ('straightness', '⏤'),
    'CIRCULARITY_TOLERANCE': ('circularity', '○'),
    'CYLINDRICITY_TOLERANCE': ('cylindricity', '⌭'),
    'LINE_PROFILE_TOLERANCE': ('profile_line', '⌒'),
    'SURFACE_PROFILE_TOLERANCE': ('profile_surface', '⌓'),
    'PARALLELISM_TOLERANCE': ('parallelism', '∥'),
    'PERPENDICULARITY_TOLERANCE': ('perpendicularity', '⊥'),
    'ANGULARITY_TOLERANCE': ('angularity', '∠'),
    'POSITION_TOLERANCE': ('position', '⌖'),
    'CONCENTRICITY_TOLERANCE': ('concentricity', '◎'),
    'SYMMETRY_TOLERANCE': ('symmetry', '⌯'),
    'CIRCULAR_RUNOUT_TOLERANCE': ('circular_runout', '↗'),
    'TOTAL_RUNOUT_TOLERANCE': ('total_runout', '↗↗'),
    'COAXIALITY_TOLERANCE': ('coaxiality', '◎'),  # Same as concentricity
}

# Material condition modifiers
MATERIAL_MODIFIERS = {
    'MAXIMUM_MATERIAL_REQUIREMENT': 'Ⓜ',  # MMC
    'LEAST_MATERIAL_REQUIREMENT': 'Ⓛ',   # LMC
    'REGARDLESS_OF_FEATURE_SIZE': '',     # RFS (default)
}


@dataclass
class ExtractedDimension:
    """Represents an extracted dimension."""
    id: str
    dim_type: str  # linear, diameter, radius, angular
    value: float
    unit: str
    tolerance_upper: Optional[float] = None
    tolerance_lower: Optional[float] = None
    tolerance_type: Optional[str] = None  # plus_minus, limits, symmetric
    position: Optional[Dict[str, float]] = None
    associated_geometry: List[str] = field(default_factory=list)
    text: str = ""


@dataclass
class ExtractedTolerance:
    """Represents an extracted geometric tolerance."""
    id: str
    tol_type: str  # flatness, position, perpendicularity, etc.
    symbol: str
    value: float
    unit: str
    modifier: str = ""
    zone_modifier: str = ""
    datum_refs: List[str] = field(default_factory=list)
    position: Optional[Dict[str, float]] = None
    associated_geometry: List[str] = field(default_factory=list)
    text: str = ""


@dataclass
class ExtractedDatum:
    """Represents an extracted datum."""
    id: str
    label: str  # A, B, C, etc.
    position: Optional[Dict[str, float]] = None
    associated_geometry: List[str] = field(default_factory=list)


class DimensionExtractor:
    """
    Extract dimensional information from STEP AP242 files.

    Handles:
    - DIMENSIONAL_LOCATION (linear distances between features)
    - DIMENSIONAL_SIZE (diameters, radii)
    - ANGULAR_LOCATION (angles between features)
    - PLUS_MINUS_TOLERANCE (dimensional tolerances)
    """

    def __init__(self, parser: StepParser):
        self.parser = parser

    def extract_dimensions(self) -> List[Dict[str, Any]]:
        """
        Extract all dimensional information from the STEP file.

        Returns:
            List of dimension dictionaries in JSON-serializable format
        """
        dimensions = []

        # Extract DIMENSIONAL_SIZE (diameter, radius)
        dim_size_entities = self.parser.find_entities('DIMENSIONAL_SIZE')
        for entity in dim_size_entities:
            dim = self._extract_dimensional_size(entity)
            if dim:
                dimensions.append(dim)

        # Extract DIMENSIONAL_LOCATION (linear distances)
        dim_loc_entities = self.parser.find_entities('DIMENSIONAL_LOCATION')
        for entity in dim_loc_entities:
            dim = self._extract_dimensional_location(entity)
            if dim:
                dimensions.append(dim)

        # Extract ANGULAR_LOCATION (angles)
        angular_entities = self.parser.find_entities('ANGULAR_LOCATION')
        for entity in angular_entities:
            dim = self._extract_angular_location(entity)
            if dim:
                dimensions.append(dim)

        # Link tolerances to dimensions via PLUS_MINUS_TOLERANCE
        self._link_tolerances_to_dimensions(dimensions)

        # Link tolerances via DIMENSIONAL_CHARACTERISTIC_REPRESENTATION
        self._link_tolerances_via_dcr(dimensions)

        logger.info(f"Extracted {len(dimensions)} dimensions")
        return dimensions

    def _extract_dimensional_size(self, entity: StepEntity) -> Optional[Dict[str, Any]]:
        """Extract a DIMENSIONAL_SIZE entity."""
        try:
            # DIMENSIONAL_SIZE(shape_aspect_ref, 'diameter' or 'radius')
            shape_ref = self.parser.get_attribute_value(entity, 0)
            size_type = self.parser.get_attribute_value(entity, 1)

            dim_type = 'diameter' if size_type and 'diameter' in str(size_type).lower() else 'radius'
            if size_type and 'radius' in str(size_type).lower():
                dim_type = 'radius'

            # Get the value from linked SHAPE_DIMENSION_REPRESENTATION
            value, tol_upper, tol_lower, tol_type = self._get_dimension_value(entity.id)

            # Get associated geometry
            geometry_refs = self._get_associated_geometry(shape_ref)

            # Format text
            text = self._format_dimension_text(value, dim_type, tol_upper, tol_lower)

            return {
                'id': entity.id,
                'type': dim_type,
                'value': value if value is not None else 0.0,
                'unit': 'mm',
                'tolerance': {
                    'type': tol_type or 'symmetric',
                    'upper': tol_upper,
                    'lower': tol_lower,
                } if tol_upper is not None or tol_lower is not None else None,
                'associated_geometry': geometry_refs,
                'position': {'x': 0, 'y': 0, 'z': 0},  # Will be populated from presentation
                'text': text,
            }

        except Exception as e:
            logger.debug(f"Could not extract dimensional size {entity.id}: {e}")
            return None

    def _extract_dimensional_location(self, entity: StepEntity) -> Optional[Dict[str, Any]]:
        """Extract a DIMENSIONAL_LOCATION entity."""
        try:
            # DIMENSIONAL_LOCATION('linear distance', $, shape_aspect1, shape_aspect2)
            dim_name = self.parser.get_attribute_value(entity, 0)
            shape_ref1 = self.parser.get_attribute_value(entity, 2)
            shape_ref2 = self.parser.get_attribute_value(entity, 3)

            # Get the value
            value, tol_upper, tol_lower, tol_type = self._get_dimension_value(entity.id)

            # Get associated geometry
            geometry_refs = []
            if shape_ref1:
                geometry_refs.extend(self._get_associated_geometry(shape_ref1))
            if shape_ref2:
                geometry_refs.extend(self._get_associated_geometry(shape_ref2))

            # Format text
            text = self._format_dimension_text(value, 'linear', tol_upper, tol_lower)

            return {
                'id': entity.id,
                'type': 'linear',
                'value': value if value is not None else 0.0,
                'unit': 'mm',
                'tolerance': {
                    'type': tol_type or 'symmetric',
                    'upper': tol_upper,
                    'lower': tol_lower,
                } if tol_upper is not None or tol_lower is not None else None,
                'associated_geometry': geometry_refs,
                'position': {'x': 0, 'y': 0, 'z': 0},
                'text': text,
            }

        except Exception as e:
            logger.debug(f"Could not extract dimensional location {entity.id}: {e}")
            return None

    def _extract_angular_location(self, entity: StepEntity) -> Optional[Dict[str, Any]]:
        """Extract an ANGULAR_LOCATION entity."""
        try:
            # ANGULAR_LOCATION('angle', $, shape_aspect1, shape_aspect2, .EQUAL.)
            angle_name = self.parser.get_attribute_value(entity, 0)
            shape_ref1 = self.parser.get_attribute_value(entity, 2)
            shape_ref2 = self.parser.get_attribute_value(entity, 3)

            # Get the value
            value, tol_upper, tol_lower, tol_type = self._get_dimension_value(entity.id)

            # Get associated geometry
            geometry_refs = []
            if shape_ref1:
                geometry_refs.extend(self._get_associated_geometry(shape_ref1))
            if shape_ref2:
                geometry_refs.extend(self._get_associated_geometry(shape_ref2))

            # Format text
            text = self._format_dimension_text(value, 'angular', tol_upper, tol_lower, unit='°')

            return {
                'id': entity.id,
                'type': 'angular',
                'value': value if value is not None else 0.0,
                'unit': 'deg',
                'tolerance': {
                    'type': tol_type or 'symmetric',
                    'upper': tol_upper,
                    'lower': tol_lower,
                } if tol_upper is not None or tol_lower is not None else None,
                'associated_geometry': geometry_refs,
                'position': {'x': 0, 'y': 0, 'z': 0},
                'text': text,
            }

        except Exception as e:
            logger.debug(f"Could not extract angular location {entity.id}: {e}")
            return None

    def _get_dimension_value(self, dim_entity_id: str) -> Tuple[Optional[float], Optional[float], Optional[float], Optional[str]]:
        """
        Get the dimension value and tolerance from linked entities.

        Searches for:
        - DIMENSIONAL_CHARACTERISTIC_REPRESENTATION linking to dimension
        - SHAPE_DIMENSION_REPRESENTATION with measure values
        - PLUS_MINUS_TOLERANCE or limit values

        Returns:
            (nominal_value, upper_tolerance, lower_tolerance, tolerance_type)
        """
        nominal = None
        upper = None
        lower = None
        tol_type = None

        # Find DIMENSIONAL_CHARACTERISTIC_REPRESENTATION linking to this dimension
        dcr_entities = self.parser.find_entities('DIMENSIONAL_CHARACTERISTIC_REPRESENTATION')
        for dcr in dcr_entities:
            # DCR(dimension_ref, shape_dimension_representation_ref)
            dim_ref = self.parser.get_attribute_value(dcr, 0)
            sdr_ref = self.parser.get_attribute_value(dcr, 1)

            if dim_ref != dim_entity_id:
                continue

            # Get SHAPE_DIMENSION_REPRESENTATION
            if sdr_ref:
                sdr = self.parser.get_entity(sdr_ref)
                if sdr:
                    nominal, upper, lower, tol_type = self._parse_shape_dimension_repr(sdr)
                    break

        # Also check for PLUS_MINUS_TOLERANCE linked to this dimension
        pm_entities = self.parser.find_entities('PLUS_MINUS_TOLERANCE')
        for pm in pm_entities:
            # PLUS_MINUS_TOLERANCE(tolerance_value_ref, dimension_ref)
            tol_val_ref = self.parser.get_attribute_value(pm, 0)
            pm_dim_ref = self.parser.get_attribute_value(pm, 1)

            if pm_dim_ref == dim_entity_id:
                if tol_val_ref:
                    tol_val = self.parser.get_entity(tol_val_ref)
                    if tol_val:
                        u, l = self._parse_tolerance_value(tol_val)
                        if u is not None:
                            upper = u
                        if l is not None:
                            lower = l
                        tol_type = 'plus_minus'

        return nominal, upper, lower, tol_type

    def _parse_shape_dimension_repr(self, sdr: StepEntity) -> Tuple[Optional[float], Optional[float], Optional[float], Optional[str]]:
        """
        Parse a SHAPE_DIMENSION_REPRESENTATION to extract values.

        Format: SHAPE_DIMENSION_REPRESENTATION('', (measure_refs...), context_ref)
        """
        nominal = None
        upper = None
        lower = None
        tol_type = None

        # Get the list of measure references
        measures = self.parser.get_attribute_value(sdr, 1)
        if not isinstance(measures, list):
            measures = [measures] if measures else []

        for measure_ref in measures:
            if not measure_ref:
                continue

            measure = self.parser.get_entity(measure_ref)
            if not measure:
                continue

            # Get the value
            value = self.parser.get_numeric_value_from_entity(measure)
            if value is None:
                continue

            # Determine type from representation item name
            name_attr = None
            for attr in measure.parsed_attributes:
                if isinstance(attr, str) and attr.lower() in ['nominal value', 'upper limit', 'lower limit', '']:
                    name_attr = attr.lower()
                    break

            # Also check the raw line for these patterns
            raw_lower = measure.raw_line.lower()
            if 'nominal value' in raw_lower:
                nominal = value
            elif 'upper limit' in raw_lower:
                upper = value
                tol_type = 'limits'
            elif 'lower limit' in raw_lower:
                lower = value
                tol_type = 'limits'
            else:
                # Default to nominal if no specific type
                if nominal is None:
                    nominal = value

        return nominal, upper, lower, tol_type

    def _parse_tolerance_value(self, tol_val: StepEntity) -> Tuple[Optional[float], Optional[float]]:
        """
        Parse a TOLERANCE_VALUE entity.

        Format: TOLERANCE_VALUE(upper_ref, lower_ref)
        """
        upper_ref = self.parser.get_attribute_value(tol_val, 0)
        lower_ref = self.parser.get_attribute_value(tol_val, 1)

        upper = None
        lower = None

        if upper_ref:
            upper_ent = self.parser.get_entity(upper_ref)
            if upper_ent:
                upper = self.parser.get_numeric_value_from_entity(upper_ent)

        if lower_ref:
            lower_ent = self.parser.get_entity(lower_ref)
            if lower_ent:
                lower = self.parser.get_numeric_value_from_entity(lower_ent)

        return upper, lower

    def _get_associated_geometry(self, shape_aspect_ref: Any) -> List[str]:
        """Get geometry references from a SHAPE_ASPECT chain."""
        geometry_refs = []

        if not shape_aspect_ref or not isinstance(shape_aspect_ref, str):
            return geometry_refs

        # Find GEOMETRIC_ITEM_SPECIFIC_USAGE linking shape aspect to geometry
        gisu_entities = self.parser.find_entities('GEOMETRIC_ITEM_SPECIFIC_USAGE')
        for gisu in gisu_entities:
            # GISU('', 'type', shape_aspect_ref, representation_ref, geometry_ref)
            gisu_shape_ref = self.parser.get_attribute_value(gisu, 2)
            geometry_ref = self.parser.get_attribute_value(gisu, 4)

            if gisu_shape_ref == shape_aspect_ref and geometry_ref:
                geometry_refs.append(geometry_ref)

        # Also check SHAPE_ASPECT_RELATIONSHIP
        sar_entities = self.parser.find_entities('SHAPE_ASPECT_RELATIONSHIP')
        for sar in sar_entities:
            related_ref = self.parser.get_attribute_value(sar, 2)
            relating_ref = self.parser.get_attribute_value(sar, 3)

            if related_ref == shape_aspect_ref and relating_ref:
                # Recursively get geometry from relating aspect
                child_refs = self._get_associated_geometry(relating_ref)
                geometry_refs.extend(child_refs)

        return list(set(geometry_refs))  # Deduplicate

    def _link_tolerances_to_dimensions(self, dimensions: List[Dict]) -> None:
        """Link PLUS_MINUS_TOLERANCE to dimensions."""
        # Already handled in _get_dimension_value
        pass

    def _link_tolerances_via_dcr(self, dimensions: List[Dict]) -> None:
        """Additional tolerance linking via DCR."""
        # Already handled in _get_dimension_value
        pass

    def _format_dimension_text(
        self,
        value: Optional[float],
        dim_type: str,
        upper: Optional[float],
        lower: Optional[float],
        unit: str = 'mm'
    ) -> str:
        """Format dimension text for display."""
        if value is None:
            return ''

        prefix = ''
        if dim_type == 'diameter':
            prefix = '⌀'
        elif dim_type == 'radius':
            prefix = 'R'

        text = f"{prefix}{value:.2f}"

        if upper is not None and lower is not None:
            if abs(upper) == abs(lower):
                text += f" ±{abs(upper):.2f}"
            else:
                text += f" +{upper:.2f}/{lower:.2f}"
        elif upper is not None:
            text += f" +{upper:.2f}"
        elif lower is not None:
            text += f" {lower:.2f}"

        text += f" {unit}"
        return text


class ToleranceExtractor:
    """
    Extract geometric tolerance information from STEP AP242 files.

    Handles all 14 GD&T tolerance types per ASME Y14.5:
    - Form: Flatness, Straightness, Circularity, Cylindricity
    - Profile: Line Profile, Surface Profile
    - Orientation: Parallelism, Perpendicularity, Angularity
    - Location: Position, Concentricity, Symmetry
    - Runout: Circular Runout, Total Runout
    """

    def __init__(self, parser: StepParser):
        self.parser = parser

    def extract_tolerances(self) -> List[Dict[str, Any]]:
        """
        Extract all geometric tolerances from the STEP file.

        Returns:
            List of tolerance dictionaries in JSON-serializable format
        """
        tolerances = []

        # Find all GEOMETRIC_TOLERANCE entities
        # These are the base class, but we also check specific subtypes
        tolerance_types = list(GDT_SYMBOLS.keys())

        for tol_type_name in tolerance_types:
            entities = self.parser.find_entities(tol_type_name)
            for entity in entities:
                tol = self._extract_tolerance(entity, tol_type_name)
                if tol:
                    tolerances.append(tol)

        # Also extract from complex entities that include multiple types
        gt_entities = self.parser.find_entities('GEOMETRIC_TOLERANCE')
        for entity in gt_entities:
            # Check if this entity has a tolerance subtype
            for tol_type_name in tolerance_types:
                if entity.has_type(tol_type_name):
                    # Skip if already processed
                    if any(t['id'] == entity.id for t in tolerances):
                        continue
                    tol = self._extract_tolerance(entity, tol_type_name)
                    if tol:
                        tolerances.append(tol)
                    break

        logger.info(f"Extracted {len(tolerances)} geometric tolerances")
        return tolerances

    def _extract_tolerance(self, entity: StepEntity, tol_type_name: str) -> Optional[Dict[str, Any]]:
        """Extract a geometric tolerance entity."""
        try:
            type_info = GDT_SYMBOLS.get(tol_type_name, ('unknown', '?'))
            tol_type, symbol = type_info

            # GEOMETRIC_TOLERANCE('name', 'description', magnitude_ref, toleranced_shape_aspect_ref)
            name = self.parser.get_attribute_value(entity, 0)
            magnitude_ref = self.parser.get_attribute_value(entity, 2)
            shape_ref = self.parser.get_attribute_value(entity, 3)

            # Get tolerance value
            value = 0.0
            if magnitude_ref:
                mag_entity = self.parser.get_entity(magnitude_ref)
                if mag_entity:
                    val = self.parser.get_numeric_value_from_entity(mag_entity)
                    if val is not None:
                        value = val

            # Get datum references
            datum_refs = self._get_datum_references(entity)

            # Get material modifier if present
            modifier = self._get_material_modifier(entity)

            # Get zone modifier (diameter symbol for cylindrical zone)
            zone_modifier = self._get_zone_modifier(entity)

            # Get associated geometry
            geometry_refs = []
            if shape_ref:
                geometry_refs = self._get_associated_geometry(shape_ref)

            # Format feature control frame text
            text = self._format_fcf_text(symbol, value, zone_modifier, modifier, datum_refs)

            return {
                'id': entity.id,
                'type': tol_type,
                'value': value,
                'unit': 'mm',
                'symbol': symbol,
                'modifier': modifier,
                'zone_modifier': zone_modifier,
                'datum_refs': datum_refs,
                'associated_geometry': geometry_refs,
                'position': {'x': 0, 'y': 0, 'z': 0},
                'text': text,
            }

        except Exception as e:
            logger.debug(f"Could not extract tolerance {entity.id}: {e}")
            return None

    def _get_datum_references(self, entity: StepEntity) -> List[str]:
        """Get datum references for a tolerance."""
        datum_refs = []

        # Check for GEOMETRIC_TOLERANCE_WITH_DATUM_REFERENCE type
        if entity.has_type('GEOMETRIC_TOLERANCE_WITH_DATUM_REFERENCE'):
            # The datum reference is typically in the attributes
            for attr in entity.parsed_attributes:
                if isinstance(attr, list):
                    for item in attr:
                        if isinstance(item, str) and item.startswith('#'):
                            datum_ref = self._resolve_datum_reference(item)
                            if datum_ref:
                                datum_refs.append(datum_ref)

        # Also check the raw entity line for datum references
        # Pattern: (GEOMETRIC_TOLERANCE_WITH_DATUM_REFERENCE((#ref1, #ref2, ...)))
        match = re.search(r'GEOMETRIC_TOLERANCE_WITH_DATUM_REFERENCE\s*\(\s*\(([^)]+)\)', entity.raw_line)
        if match:
            ref_str = match.group(1)
            refs = re.findall(r'#\d+', ref_str)
            for ref in refs:
                datum_label = self._resolve_datum_reference(ref)
                if datum_label and datum_label not in datum_refs:
                    datum_refs.append(datum_label)

        # Also check for standalone tolerance with datum refs in last parameter
        # Format: TOLERANCE('name', '', #mag, #shape, (#datum_refs))
        if len(entity.parsed_attributes) >= 5:
            last_attr = entity.parsed_attributes[-1]
            if isinstance(last_attr, list):
                for item in last_attr:
                    if isinstance(item, str) and item.startswith('#'):
                        datum_label = self._resolve_datum_reference(item)
                        if datum_label and datum_label not in datum_refs:
                            datum_refs.append(datum_label)

        return datum_refs

    def _resolve_datum_reference(self, ref: str) -> Optional[str]:
        """Resolve a datum reference to its label (A, B, C, etc.)."""
        # First check DATUM_REFERENCE_COMPARTMENT
        drc = self.parser.get_entity(ref)
        if drc:
            if drc.has_type('DATUM_REFERENCE_COMPARTMENT'):
                # DATUM_REFERENCE_COMPARTMENT('', $, product_def, required, datum_ref, $)
                datum_ref = self.parser.get_attribute_value(drc, 4)
                if datum_ref:
                    return self._get_datum_label(datum_ref)

            if drc.has_type('DATUM_SYSTEM'):
                # DATUM_SYSTEM('name', $, product_def, required, (datum_refs...))
                datum_refs = self.parser.get_attribute_value(drc, 4)
                if isinstance(datum_refs, list):
                    labels = []
                    for d_ref in datum_refs:
                        if isinstance(d_ref, str) and d_ref.startswith('#'):
                            label = self._resolve_datum_reference(d_ref)
                            if label:
                                labels.append(label)
                    return '-'.join(labels) if labels else None

            # It might be a DATUM directly
            if drc.has_type('DATUM'):
                return self._get_datum_label(ref)

        return None

    def _get_datum_label(self, datum_ref: str) -> Optional[str]:
        """Get the label from a DATUM entity."""
        datum = self.parser.get_entity(datum_ref)
        if datum and datum.has_type('DATUM'):
            # DATUM('', $, product_def, required, 'A')
            label = self.parser.get_attribute_value(datum, 4)
            if isinstance(label, str):
                return label
        return None

    def _get_material_modifier(self, entity: StepEntity) -> str:
        """Get material modifier (MMC, LMC) for a tolerance."""
        # Check for GEOMETRIC_TOLERANCE_WITH_MODIFIERS type
        if entity.has_type('GEOMETRIC_TOLERANCE_WITH_MODIFIERS'):
            for attr in entity.parsed_attributes:
                if isinstance(attr, str):
                    attr_upper = attr.upper()
                    if 'MAXIMUM_MATERIAL' in attr_upper or attr_upper == 'MMC':
                        return 'Ⓜ'
                    if 'LEAST_MATERIAL' in attr_upper or attr_upper == 'LMC':
                        return 'Ⓛ'

        # Check raw line for modifier patterns
        raw_upper = entity.raw_line.upper()
        if 'MAXIMUM_MATERIAL' in raw_upper:
            return 'Ⓜ'
        if 'LEAST_MATERIAL' in raw_upper:
            return 'Ⓛ'

        return ''

    def _get_zone_modifier(self, entity: StepEntity) -> str:
        """Get zone modifier (diameter symbol for cylindrical tolerance zone)."""
        # Check for tolerance zone shape indicator
        raw_upper = entity.raw_line.upper()
        if 'CYLINDRICAL' in raw_upper or 'DIAMETER' in raw_upper:
            return '⌀'
        return ''

    def _get_associated_geometry(self, shape_ref: Any) -> List[str]:
        """Get geometry references from a shape aspect."""
        geometry_refs = []

        if not shape_ref or not isinstance(shape_ref, str):
            return geometry_refs

        # Find GEOMETRIC_ITEM_SPECIFIC_USAGE entities
        gisu_entities = self.parser.find_entities('GEOMETRIC_ITEM_SPECIFIC_USAGE')
        for gisu in gisu_entities:
            gisu_shape_ref = self.parser.get_attribute_value(gisu, 2)
            geometry_ref = self.parser.get_attribute_value(gisu, 4)

            if gisu_shape_ref == shape_ref and geometry_ref:
                geometry_refs.append(geometry_ref)

        return list(set(geometry_refs))

    def _format_fcf_text(
        self,
        symbol: str,
        value: float,
        zone_modifier: str,
        modifier: str,
        datum_refs: List[str]
    ) -> str:
        """Format Feature Control Frame text for display."""
        parts = [symbol]

        if zone_modifier:
            parts.append(zone_modifier)

        parts.append(f"{value:.3f}")

        if modifier:
            parts.append(modifier)

        if datum_refs:
            parts.append('|')
            parts.append(' | '.join(datum_refs))

        return ' '.join(parts)


class DatumExtractor:
    """
    Extract datum information from STEP AP242 files.

    Handles:
    - DATUM (datum references A, B, C, etc.)
    - DATUM_FEATURE (datum feature indicators)
    - DATUM_SYSTEM (datum reference frames)
    - DATUM_TARGET (datum target points/areas)
    """

    def __init__(self, parser: StepParser):
        self.parser = parser

    def extract_datums(self) -> List[Dict[str, Any]]:
        """
        Extract all datum information from the STEP file.

        Returns:
            List of datum dictionaries in JSON-serializable format
        """
        datums = []

        # Extract DATUM entities
        datum_entities = self.parser.find_entities('DATUM')
        for entity in datum_entities:
            datum = self._extract_datum(entity)
            if datum:
                datums.append(datum)

        # Also extract DATUM_FEATURE entities
        datum_feature_entities = self.parser.find_entities('DATUM_FEATURE')
        for entity in datum_feature_entities:
            datum = self._extract_datum_feature(entity)
            if datum:
                # Check if we already have this label
                label = datum.get('label', '')
                if not any(d.get('label') == label for d in datums):
                    datums.append(datum)

        logger.info(f"Extracted {len(datums)} datums")
        return datums

    def _extract_datum(self, entity: StepEntity) -> Optional[Dict[str, Any]]:
        """Extract a DATUM entity."""
        try:
            # DATUM('', $, product_def, required, 'A')
            label = self.parser.get_attribute_value(entity, 4)

            if not label or not isinstance(label, str):
                # Try to find label in other positions
                for attr in entity.parsed_attributes:
                    if isinstance(attr, str) and len(attr) == 1 and attr.isupper():
                        label = attr
                        break

            if not label:
                return None

            # Get associated geometry
            geometry_refs = self._get_datum_geometry(entity.id)

            return {
                'id': entity.id,
                'label': label,
                'position': {'x': 0, 'y': 0, 'z': 0},
                'associated_geometry': geometry_refs,
            }

        except Exception as e:
            logger.debug(f"Could not extract datum {entity.id}: {e}")
            return None

    def _extract_datum_feature(self, entity: StepEntity) -> Optional[Dict[str, Any]]:
        """Extract a DATUM_FEATURE entity."""
        try:
            # DATUM_FEATURE('Simple Datum.1', $, product_def, required)
            name = self.parser.get_attribute_value(entity, 0)

            # Find the linked DATUM to get the label
            label = None

            # Search for SHAPE_ASPECT_RELATIONSHIP linking this to a DATUM
            sar_entities = self.parser.find_entities('SHAPE_ASPECT_RELATIONSHIP')
            for sar in sar_entities:
                related = self.parser.get_attribute_value(sar, 2)
                relating = self.parser.get_attribute_value(sar, 3)

                if related == entity.id:
                    # Check if relating is a DATUM
                    datum_entity = self.parser.get_entity(relating)
                    if datum_entity and datum_entity.has_type('DATUM'):
                        label = self.parser.get_attribute_value(datum_entity, 4)
                        break

            if not label:
                # Try to extract from name
                match = re.search(r'Datum[.\s]*(\d+|[A-Z])', str(name), re.IGNORECASE)
                if match:
                    label = match.group(1)
                    if label.isdigit():
                        label = chr(ord('A') + int(label) - 1)

            if not label:
                return None

            # Get associated geometry
            geometry_refs = self._get_datum_geometry(entity.id)

            return {
                'id': entity.id,
                'label': label,
                'position': {'x': 0, 'y': 0, 'z': 0},
                'associated_geometry': geometry_refs,
            }

        except Exception as e:
            logger.debug(f"Could not extract datum feature {entity.id}: {e}")
            return None

    def _get_datum_geometry(self, entity_id: str) -> List[str]:
        """Get geometry associated with a datum."""
        geometry_refs = []

        # Find via GEOMETRIC_ITEM_SPECIFIC_USAGE
        gisu_entities = self.parser.find_entities('GEOMETRIC_ITEM_SPECIFIC_USAGE')
        for gisu in gisu_entities:
            shape_ref = self.parser.get_attribute_value(gisu, 2)
            geometry_ref = self.parser.get_attribute_value(gisu, 4)

            if shape_ref == entity_id and geometry_ref:
                geometry_refs.append(geometry_ref)

        # Also check ITEM_IDENTIFIED_REPRESENTATION_USAGE
        iiru_entities = self.parser.find_entities('ITEM_IDENTIFIED_REPRESENTATION_USAGE')
        for iiru in iiru_entities:
            item_ref = self.parser.get_attribute_value(iiru, 2)
            if item_ref == entity_id:
                # Get the SET_REPRESENTATION_ITEM
                repr_items = self.parser.get_attribute_value(iiru, 4)
                if isinstance(repr_items, list):
                    geometry_refs.extend([r for r in repr_items if isinstance(r, str) and r.startswith('#')])

        return list(set(geometry_refs))


class AnnotationExtractor:
    """
    Extract annotation plane and presentation information.

    This provides the 3D positioning information needed for Three.js rendering.
    """

    def __init__(self, parser: StepParser):
        self.parser = parser

    def get_annotation_positions(self, pmi_data: Dict[str, Any]) -> None:
        """
        Enrich PMI data with annotation plane positions.

        Updates dimensions, tolerances, and datums with 3D position data.
        """
        # Find DRAUGHTING_MODEL_ITEM_ASSOCIATION entities
        # These link PMI entities to their presentation locations
        dmia_entities = self.parser.find_entities('DRAUGHTING_MODEL_ITEM_ASSOCIATION')

        for dmia in dmia_entities:
            # DMIA('name', 'description', item_ref, model_ref, presentation_ref)
            item_ref = self.parser.get_attribute_value(dmia, 2)
            presentation_ref = self.parser.get_attribute_value(dmia, 4)

            if not item_ref or not presentation_ref:
                continue

            # Get position from presentation entity
            position = self._get_presentation_position(presentation_ref)
            if not position:
                continue

            # Update corresponding PMI item
            self._update_pmi_position(pmi_data, item_ref, position)

    def _get_presentation_position(self, presentation_ref: str) -> Optional[Dict[str, float]]:
        """Get 3D position from a presentation entity."""
        entity = self.parser.get_entity(presentation_ref)
        if not entity:
            return None

        # Look for AXIS2_PLACEMENT_3D in the entity chain
        axis_placement = None

        # Check entity attributes for placement reference
        for attr in entity.parsed_attributes:
            if isinstance(attr, str) and attr.startswith('#'):
                ref_entity = self.parser.get_entity(attr)
                if ref_entity and ref_entity.has_type('AXIS2_PLACEMENT_3D'):
                    axis_placement = self.parser.get_axis_placement(attr)
                    break

        if axis_placement and 'origin' in axis_placement:
            return {
                'x': axis_placement['origin'][0],
                'y': axis_placement['origin'][1],
                'z': axis_placement['origin'][2],
            }

        return None

    def _update_pmi_position(self, pmi_data: Dict, item_ref: str, position: Dict[str, float]) -> None:
        """Update PMI item with position data."""
        for category in ['dimensions', 'geometric_tolerances', 'datums']:
            for item in pmi_data.get(category, []):
                if item.get('id') == item_ref:
                    item['position'] = position
                    return


class PMIExtractor:
    """
    Main PMI extraction coordinator.

    Combines all extractors to produce complete PMI data.
    """

    def __init__(self, step_file_path: str):
        """
        Initialize PMI extractor.

        Args:
            step_file_path: Path to STEP file
        """
        self.parser = StepParser(step_file_path)
        self.dimension_extractor = DimensionExtractor(self.parser)
        self.tolerance_extractor = ToleranceExtractor(self.parser)
        self.datum_extractor = DatumExtractor(self.parser)
        self.annotation_extractor = AnnotationExtractor(self.parser)

    def extract_all(self) -> Dict[str, Any]:
        """
        Extract all PMI from the STEP file.

        Returns:
            Complete PMI data structure
        """
        pmi_data = {
            'version': '2.0',
            'source': 'text_parser',
            'dimensions': self.dimension_extractor.extract_dimensions(),
            'geometric_tolerances': self.tolerance_extractor.extract_tolerances(),
            'datums': self.datum_extractor.extract_datums(),
            'surface_finishes': [],  # To be implemented if needed
            'notes': [],
            'graphical_pmi': [],
        }

        # Enrich with annotation positions
        self.annotation_extractor.get_annotation_positions(pmi_data)

        # Add statistics
        pmi_data['statistics'] = {
            'dimension_count': len(pmi_data['dimensions']),
            'tolerance_count': len(pmi_data['geometric_tolerances']),
            'datum_count': len(pmi_data['datums']),
            'parser_stats': self.parser.get_statistics(),
        }

        return pmi_data


def extract_pmi_from_step(file_path: str) -> Dict[str, Any]:
    """
    Convenience function to extract PMI from a STEP file.

    Args:
        file_path: Path to STEP file

    Returns:
        Complete PMI data structure
    """
    extractor = PMIExtractor(file_path)
    return extractor.extract_all()
