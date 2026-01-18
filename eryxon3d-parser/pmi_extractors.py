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
from cartesian_extractor import CartesianExtractor

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

            # NEW: Extract target geometry for leader lines
            target_geometry = self._extract_target_geometry(entity, shape_ref)
            
            # NEW: Extract leader lines from DRAUGHTING_CALLOUT
            leader_lines = self._extract_leader_lines(entity.id)

            # Format text
            text = self._format_dimension_text(value, dim_type, tol_upper, tol_lower)

            # Extract tolerance class per ISO 286
            tolerance_class = self._extract_tolerance_class(entity.id)

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
                'tolerance_class': tolerance_class,  # NEW - ISO 286 tolerance class
                'associated_geometry': geometry_refs,
                'target_geometry': target_geometry,  # NEW - for leader lines
                'leader_lines': leader_lines,  # NEW - explicit leader line geometry
                'annotation_plane': {  # NEW - for Three.js positioning
                    'origin': [0, 0, 0],
                    'normal': [0, 0, -1],
                    'writing_direction': [1, 0, 0],
                },
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

            # NEW: Extract target geometry for leader lines (two endpoints)
            target_geometry = self._extract_target_geometry_location(entity, shape_ref1, shape_ref2)
            
            # NEW: Extract leader lines from DRAUGHTING_CALLOUT
            leader_lines = self._extract_leader_lines(entity.id)

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
                'target_geometry': target_geometry,  # NEW - for leader lines
                'leader_lines': leader_lines,  # NEW - explicit leader line geometry
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
        Parse SHAPE_DIMENSION_REPRESENTATION per Chen paper Appendix C.
        
        Format: SHAPE_DIMENSION_REPRESENTATION('', (measure_refs...), context_ref)
        
        Each MEASURE_REPRESENTATION_ITEM has a 'name' attribute:
        - 'nominal value' → nominal dimension
        - 'upper limit' → upper tolerance bound
        - 'lower limit' → lower tolerance bound
        """
        nominal = None
        upper = None
        lower = None
        tol_type = None

        measures = self.parser.get_attribute_value(sdr, 1)
        if not isinstance(measures, list):
            measures = [measures] if measures else []

        for measure_ref in measures:
            if not measure_ref or not isinstance(measure_ref, str):
                continue

            measure = self.parser.get_entity(measure_ref)
            if not measure:
                continue

            # Get the value
            value = self.parser.get_numeric_value_from_entity(measure)
            if value is None:
                continue

            # KEY FIX: Parse name attribute from MEASURE_REPRESENTATION_ITEM
            # Format: MEASURE_REPRESENTATION_ITEM('nominal value', LENGTH_MEASURE(48.0), #unit)
            name_attr = self.parser.get_attribute_value(measure, 0)
            
            if isinstance(name_attr, str):
                name_lower = name_attr.lower()
                if 'nominal' in name_lower:
                    nominal = value
                elif 'upper' in name_lower:
                    upper = value
                    tol_type = 'limits'
                elif 'lower' in name_lower:
                    lower = value
                    tol_type = 'limits'
                else:
                    # Default to nominal if unspecified
                    if nominal is None:
                        nominal = value
            else:
                # No name, default to nominal
                if nominal is None:
                    nominal = value

        return nominal, upper, lower, tol_type

    def _extract_tolerance_class(self, dim_entity_id: str) -> Optional[Dict[str, Any]]:
        """
        Extract LIMITS_AND_FITS tolerance class per ISO 286.
        
        Format: LIMITS_AND_FITS(form_variance, zone_variance, grade)
        Example: LIMITS_AND_FITS(.H., .HOLE., 7) → H7 hole tolerance
        """
        # Find PLUS_MINUS_TOLERANCE linking to this dimension
        pm_entities = self.parser.find_entities('PLUS_MINUS_TOLERANCE')
        
        for pm in pm_entities:
            pm_dim_ref = self.parser.get_attribute_value(pm, 1)
            if pm_dim_ref != dim_entity_id:
                continue
                
            tol_val_ref = self.parser.get_attribute_value(pm, 0)
            if not tol_val_ref:
                continue
                
            tol_val = self.parser.get_entity(tol_val_ref)
            if not tol_val or not tol_val.has_type('LIMITS_AND_FITS'):
                continue
                
            # LIMITS_AND_FITS(form_variance, zone_variance, grade)
            form_variance = self.parser.get_attribute_value(tol_val, 0)  # H, g, etc.
            zone_variance = self.parser.get_attribute_value(tol_val, 1)  # HOLE, SHAFT
            grade = self.parser.get_attribute_value(tol_val, 2)  # 7, 8, etc.
            
            return {
                'type': 'tolerance_class',
                'form_variance': form_variance,
                'zone_variance': zone_variance,
                'grade': grade,
                'text': f"{form_variance}{grade}" if form_variance and grade else None,
            }
        
        return None

    def _parse_legacy_shape_dimension_repr_fallback(self, sdr: StepEntity) -> Tuple[Optional[float], Optional[float], Optional[float], Optional[str]]:
        """Legacy fallback method for parsing shape dimension representation."""
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

    def _extract_target_geometry(self, dim_entity: StepEntity, shape_ref: str) -> Optional[Dict[str, Any]]:
        """
        Extract target geometry information for DIMENSIONAL_SIZE entities (diameter, radius).
        
        Returns dict with shape_aspect_refs, feature_type, and attachment_points.
        """
        try:
            if not shape_ref:
                return None
                
            # Get the shape aspect entity
            shape_aspect = self.parser.get_entity(shape_ref)
            if not shape_aspect:
                return None
                
            # Determine feature type from shape aspect
            feature_type = self._determine_feature_type(shape_aspect)
            
            # Calculate attachment points
            attachment_points = self._get_attachment_points_from_shape([shape_ref])
            
            return {
                'shape_aspect_refs': [shape_ref],
                'feature_type': feature_type,
                'attachment_points': attachment_points
            }
            
        except Exception as e:
            logger.debug(f"Could not extract target geometry for {dim_entity.id}: {e}")
            return None

    def _extract_target_geometry_location(self, dim_entity: StepEntity, shape_ref1: str, shape_ref2: str) -> Optional[Dict[str, Any]]:
        """
        Extract target geometry information for DIMENSIONAL_LOCATION entities (linear distances).
        
        Returns dict with shape_aspect_refs, feature_type, and attachment_points for two endpoints.
        """
        try:
            shape_refs = [ref for ref in [shape_ref1, shape_ref2] if ref]
            if not shape_refs:
                return None
                
            # For linear dimensions, feature type is typically edge-to-edge or face-to-face
            feature_type = 'linear_distance'
            
            # Calculate attachment points for both endpoints
            attachment_points = self._get_attachment_points_from_shape(shape_refs)
            
            return {
                'shape_aspect_refs': shape_refs,
                'feature_type': feature_type, 
                'attachment_points': attachment_points
            }
            
        except Exception as e:
            logger.debug(f"Could not extract target geometry for location {dim_entity.id}: {e}")
            return None

    def _determine_feature_type(self, shape_aspect: StepEntity) -> str:
        """Determine the geometric feature type from a SHAPE_ASPECT."""
        try:
            # Check shape aspect type and name
            if shape_aspect.has_type('COMPOSITE_GROUP_SHAPE_ASPECT'):
                name = self.parser.get_attribute_value(shape_aspect, 0) or ''
                name_lower = name.lower()
                
                if 'hole' in name_lower or 'cylinder' in name_lower:
                    return 'cylindrical_surface'
                elif 'radius' in name_lower or 'radial' in name_lower:
                    return 'circular_edge'
                elif 'diameter' in name_lower:
                    return 'cylindrical_surface'
                elif 'face' in name_lower:
                    return 'planar_surface'
                elif 'edge' in name_lower:
                    return 'linear_edge'
                    
            # Find linked geometry to determine type
            geometry_refs = self._get_associated_geometry(shape_aspect.id)
            for geom_ref in geometry_refs:
                geom = self.parser.get_entity(geom_ref)
                if geom:
                    if geom.has_type('CYLINDRICAL_SURFACE'):
                        return 'cylindrical_surface'
                    elif geom.has_type('CIRCLE') or geom.has_type('CIRCULAR_EDGE'):
                        return 'circular_edge'
                    elif geom.has_type('PLANE') or geom.has_type('ADVANCED_FACE'):
                        return 'planar_surface'
                    elif geom.has_type('LINE') or geom.has_type('EDGE_CURVE'):
                        return 'linear_edge'
            
            return 'unknown_feature'
            
        except Exception:
            return 'unknown_feature'

    def _get_attachment_points_from_shape(self, shape_refs: List[str]) -> List[Dict[str, float]]:
        """Calculate attachment points for leader lines from SHAPE_ASPECT references."""
        attachment_points = []
        
        for shape_ref in shape_refs:
            point = self._get_attachment_point(shape_ref)
            if point:
                attachment_points.append({
                    'x': point[0], 
                    'y': point[1], 
                    'z': point[2]
                })
                
        return attachment_points
    
    def _get_attachment_point(self, shape_ref: str) -> Optional[Tuple[float, float, float]]:
        """Get attachment point for a leader line from a SHAPE_ASPECT reference."""
        try:
            # Find geometry linked to this shape aspect
            geometry_refs = self._get_associated_geometry(shape_ref)
            
            for geom_ref in geometry_refs:
                geom = self.parser.get_entity(geom_ref)
                if not geom:
                    continue
                    
                # Handle different geometry types
                if geom.has_type('VERTEX_POINT'):
                    point_ref = self.parser.get_attribute_value(geom, 0)
                    return self.parser.get_point_coordinates(point_ref)
                    
                elif geom.has_type('CYLINDRICAL_SURFACE'):
                    # Get axis placement (center of cylinder)
                    axis_ref = self.parser.get_attribute_value(geom, 0)
                    if axis_ref:
                        placement = self.parser.get_axis_placement(axis_ref)
                        if placement:
                            return tuple(placement.get('origin', [0, 0, 0]))
                            
                elif geom.has_type('CIRCLE'):
                    # Get center point
                    center_ref = self.parser.get_attribute_value(geom, 0)
                    if center_ref:
                        placement = self.parser.get_axis_placement(center_ref)
                        if placement:
                            return tuple(placement.get('origin', [0, 0, 0]))
                            
                elif geom.has_type('EDGE_CURVE'):
                    # Get midpoint of edge - need start and end vertices
                    edge_start = self.parser.get_attribute_value(geom, 1)
                    edge_end = self.parser.get_attribute_value(geom, 2)
                    
                    start_pt = self._get_vertex_position(edge_start)
                    end_pt = self._get_vertex_position(edge_end)
                    
                    if start_pt and end_pt:
                        # Return midpoint
                        return (
                            (start_pt[0] + end_pt[0]) / 2,
                            (start_pt[1] + end_pt[1]) / 2, 
                            (start_pt[2] + end_pt[2]) / 2
                        )
                        
                elif geom.has_type('ADVANCED_FACE'):
                    # For faces, check the underlying surface first
                    # ADVANCED_FACE('name', (bounds), surface_ref, orientation)
                    if len(geom.parsed_attributes) >= 3:
                        surface_ref = geom.parsed_attributes[2]
                        if isinstance(surface_ref, str) and surface_ref.startswith('#'):
                            surface = self.parser.get_entity(surface_ref)
                            if surface:
                                if surface.has_type('CYLINDRICAL_SURFACE'):
                                    # CYLINDRICAL_SURFACE('', axis_ref, radius)
                                    axis_ref = self.parser.get_attribute_value(surface, 1)
                                    if axis_ref:
                                        placement = self.parser.get_axis_placement(axis_ref)
                                        if placement:
                                            return tuple(placement.get('origin', [0, 0, 0]))
                                elif surface.has_type('PLANE'):
                                    # PLANE('', axis_ref)  
                                    axis_ref = self.parser.get_attribute_value(surface, 1)
                                    if axis_ref:
                                        placement = self.parser.get_axis_placement(axis_ref)
                                        if placement:
                                            return tuple(placement.get('origin', [0, 0, 0]))
                    
                    # Fallback: try to get centroid or a representative point from face bounds
                    bounds = self.parser.get_attribute_value(geom, 1)  # Face bounds (2nd attribute)
                    if bounds and isinstance(bounds, list):
                        for bound_ref in bounds[:1]:  # Just first bound
                            bound = self.parser.get_entity(bound_ref)
                            if bound:
                                # Get first vertex from bound
                                vertex_pt = self._find_first_vertex_in_bound(bound)
                                if vertex_pt:
                                    return vertex_pt
            
            return None
            
        except Exception as e:
            logger.debug(f"Could not get attachment point for {shape_ref}: {e}")
            return None

    def _get_vertex_position(self, vertex_ref: str) -> Optional[Tuple[float, float, float]]:
        """Get 3D position of a VERTEX_POINT."""
        try:
            vertex = self.parser.get_entity(vertex_ref)
            if vertex and vertex.has_type('VERTEX_POINT'):
                point_ref = self.parser.get_attribute_value(vertex, 0)
                return self.parser.get_point_coordinates(point_ref)
            return None
        except Exception:
            return None

    def _find_first_vertex_in_bound(self, bound_entity: StepEntity) -> Optional[Tuple[float, float, float]]:
        """Find first vertex in a face bound (simplified traversal)."""
        try:
            # This is a simplified implementation - full topology traversal would be complex
            refs = self.parser.extract_references(bound_entity)
            for ref in refs[:10]:  # Check first few references
                entity = self.parser.get_entity(ref)
                if entity and entity.has_type('VERTEX_POINT'):
                    point_ref = self.parser.get_attribute_value(entity, 0)
                    coords = self.parser.get_point_coordinates(point_ref)
                    if coords:
                        return coords
            return None
        except Exception:
            return None

    def _extract_leader_lines(self, dim_id: str) -> List[Dict[str, Any]]:
        """Extract explicit leader line geometry from DRAUGHTING_CALLOUT if present."""
        try:
            # Find DMIA that references this dimension
            dmia_entities = self.parser.find_entities('DRAUGHTING_MODEL_ITEM_ASSOCIATION')
            for dmia in dmia_entities:
                item_ref = self.parser.get_attribute_value(dmia, 2)
                if item_ref == dim_id:
                    # Get the presentation (DRAUGHTING_CALLOUT)
                    callout_ref = self.parser.get_attribute_value(dmia, 4)
                    if not callout_ref:
                        continue
                        
                    callout = self.parser.get_entity(callout_ref)
                    if not callout or not callout.has_type('DRAUGHTING_CALLOUT'):
                        continue
                        
                    # Get contents of the callout
                    contents = self.parser.get_attribute_value(callout, 1)
                    if not isinstance(contents, list):
                        contents = [contents] if contents else []
                        
                    leader_lines = []
                    
                    for content_ref in contents:
                        content = self.parser.get_entity(content_ref)
                        if not content:
                            continue
                            
                        # Look for ANNOTATION_CURVE_OCCURRENCE or LEADER_LINE
                        if content.has_type('ANNOTATION_CURVE_OCCURRENCE') or content.has_type('LEADER_LINE'):
                            # Get the curve geometry
                            curve_ref = self.parser.get_attribute_value(content, 0)
                            curve = self.parser.get_entity(curve_ref)
                            if curve:
                                line_data = self._extract_curve_geometry(curve)
                                if line_data:
                                    line_data['has_arrowhead'] = self._has_terminator(content_ref)
                                    leader_lines.append(line_data)
                    
                    return leader_lines
            
            return []
            
        except Exception as e:
            logger.debug(f"Could not extract leader lines for {dim_id}: {e}")
            return []

    def _extract_curve_geometry(self, curve_entity: StepEntity) -> Optional[Dict[str, Any]]:
        """Extract geometric points from a curve entity."""
        try:
            if curve_entity.has_type('POLYLINE'):
                # POLYLINE has list of points
                points_ref = self.parser.get_attribute_value(curve_entity, 0)
                if isinstance(points_ref, list):
                    points = []
                    for point_ref in points_ref:
                        coords = self.parser.get_point_coordinates(point_ref)
                        if coords:
                            points.append({'x': coords[0], 'y': coords[1], 'z': coords[2]})
                    
                    if len(points) >= 2:
                        return {
                            'type': 'polyline',
                            'points': points,
                            'start': points[0],
                            'end': points[-1]
                        }
                        
            elif curve_entity.has_type('LINE'):
                # LINE defined by point and direction
                point_ref = self.parser.get_attribute_value(curve_entity, 0)
                direction_ref = self.parser.get_attribute_value(curve_entity, 1)
                
                if point_ref and direction_ref:
                    start_coords = self.parser.get_point_coordinates(point_ref)
                    direction = self.parser.get_direction_vector(direction_ref)
                    
                    if start_coords and direction:
                        # Estimate end point (arbitrary length for visualization)
                        length = 10.0  # mm
                        end_coords = (
                            start_coords[0] + direction[0] * length,
                            start_coords[1] + direction[1] * length,
                            start_coords[2] + direction[2] * length
                        )
                        
                        return {
                            'type': 'line',
                            'points': [
                                {'x': start_coords[0], 'y': start_coords[1], 'z': start_coords[2]},
                                {'x': end_coords[0], 'y': end_coords[1], 'z': end_coords[2]}
                            ],
                            'start': {'x': start_coords[0], 'y': start_coords[1], 'z': start_coords[2]},
                            'end': {'x': end_coords[0], 'y': end_coords[1], 'z': end_coords[2]}
                        }
            
            return None
            
        except Exception as e:
            logger.debug(f"Could not extract curve geometry from {curve_entity.id}: {e}")
            return None

    def _has_terminator(self, annotation_ref: str) -> bool:
        """Check if an annotation curve has a terminator symbol (arrowhead)."""
        try:
            # Look for TERMINATOR_SYMBOL entities that reference this curve
            terminator_entities = self.parser.find_entities('TERMINATOR_SYMBOL')
            for terminator in terminator_entities:
                # TERMINATOR_SYMBOL typically has a reference to the annotated curve
                curve_ref = self.parser.get_attribute_value(terminator, 0)
                if curve_ref == annotation_ref:
                    return True
                    
            # Also check if the entity itself indicates termination
            entity = self.parser.get_entity(annotation_ref)
            if entity:
                # Check for arrow-related terms in the raw line
                raw = entity.raw_line.upper()
                if 'ARROW' in raw or 'TERMINATOR' in raw:
                    return True
                    
            return False
            
        except Exception:
            return False

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


class PresentationLinkExtractor:
    """
    Extract DRAUGHTING_MODEL_ITEM_ASSOCIATION chain per Chen paper Figure 12.
    
    Chain: DRAUGHTING_MODEL_ITEM_ASSOCIATION → DRAUGHTING_CALLOUT → 
           TESSELLATED_ANNOTATION_OCCURRENCE → ANNOTATION_PLANE
    """
    
    def __init__(self, parser: StepParser):
        self.parser = parser
        self._dmia_cache: Dict[str, StepEntity] = {}
        self._build_dmia_index()
    
    def _build_dmia_index(self):
        """Index DRAUGHTING_MODEL_ITEM_ASSOCIATION by referenced item."""
        dmia_entities = self.parser.find_entities('DRAUGHTING_MODEL_ITEM_ASSOCIATION')
        
        for entity in dmia_entities:
            # DMIA('name', 'description', #item_ref, #model_ref, #presentation_ref)
            item_ref = self.parser.get_attribute_value(entity, 2)
            if item_ref:
                self._dmia_cache[item_ref] = entity
                logger.debug(f"Indexed DMIA {entity.id} for item {item_ref}")
        
        logger.info(f"Built DMIA index with {len(self._dmia_cache)} entries")
    
    def get_presentation_for_dimension(self, dim_entity_id: str) -> Optional[Dict[str, Any]]:
        """
        Get presentation data for a dimension entity.
        
        Returns dict with:
        - annotation_type: 'linear dimension', 'angular dimension', etc.
        - plane_ref: reference to ANNOTATION_PLANE
        - position: extracted 3D position if available
        """
        dmia = self._dmia_cache.get(dim_entity_id)
        if not dmia:
            logger.debug(f"No DMIA found for dimension {dim_entity_id}")
            return None
            
        # Get presentation reference (5th parameter)
        presentation_ref = self.parser.get_attribute_value(dmia, 4)
        if not presentation_ref:
            logger.debug(f"No presentation ref in DMIA {dmia.id}")
            return None
            
        presentation = self.parser.get_entity(presentation_ref)
        if not presentation:
            return None
            
        result = {
            'annotation_type': 'dimension',
            'plane_ref': None,
            'position': None,
            'dmia_ref': dmia.id,
        }
        
        # Check if presentation is DRAUGHTING_CALLOUT
        if presentation.has_type('DRAUGHTING_CALLOUT'):
            # DRAUGHTING_CALLOUT('type', (#tessellated_refs))
            annotation_type = self.parser.get_attribute_value(presentation, 0)
            if annotation_type:
                result['annotation_type'] = annotation_type
            
            tess_refs = self.parser.get_attribute_value(presentation, 1)
            
            # Follow to TESSELLATED_ANNOTATION_OCCURRENCE
            if isinstance(tess_refs, list):
                for tess_ref in tess_refs:
                    tess = self.parser.get_entity(tess_ref)
                    if tess and tess.has_type('TESSELLATED_ANNOTATION_OCCURRENCE'):
                        # Get linked ANNOTATION_PLANE
                        plane_ref = self._find_annotation_plane(tess)
                        if plane_ref:
                            result['plane_ref'] = plane_ref
                            break
        
        return result if result.get('plane_ref') or result.get('annotation_type') != 'dimension' else None
    
    def _find_annotation_plane(self, tess_entity: StepEntity) -> Optional[str]:
        """Find ANNOTATION_PLANE linked to tessellated annotation."""
        # Check entity references for annotation plane
        refs = self.parser.extract_references(tess_entity)
        for ref in refs:
            entity = self.parser.get_entity(ref)
            if entity and entity.has_type('ANNOTATION_PLANE'):
                return ref
        
        # Check raw line parsing as fallback
        if hasattr(tess_entity, 'raw_line'):
            import re
            plane_matches = re.findall(r'#(\d+)', tess_entity.raw_line)
            for match in plane_matches:
                ref = f'#{match}'
                entity = self.parser.get_entity(ref)
                if entity and entity.has_type('ANNOTATION_PLANE'):
                    return ref
        
        return None


class AnnotationExtractor:
    """
    Extract annotation plane and presentation information using modular coordinate extraction.

    This provides the 3D positioning information needed for Three.js rendering
    by directly parsing CARTESIAN_POINT coordinates from STEP file text.
    """

    def __init__(self, parser: StepParser, step_file_path: str = None):
        self.parser = parser
        self.step_file_path = step_file_path

    def extract_annotation_planes(self) -> Dict[str, Dict[str, Any]]:
        """
        Extract ANNOTATION_PLANE entities with position/orientation data.
        
        Per Chen paper Section 4.1:
        - ANNOTATION_PLANE('PMI PLANE', (#items), #axis2_placement, (#assoc))
        - Links to AXIS2_PLACEMENT_3D for origin, z_axis (normal), x_axis (writing direction)
        """
        planes = {}
        
        ap_entities = self.parser.find_entities('ANNOTATION_PLANE')
        for entity in ap_entities:
            # ANNOTATION_PLANE(name, (item_refs), axis_placement_ref, (associated_refs))
            name = self.parser.get_attribute_value(entity, 0)
            axis_ref = self.parser.get_attribute_value(entity, 2)
            
            if not axis_ref:
                continue
                
            placement = self.parser.get_axis_placement(axis_ref)
            if placement:
                planes[entity.id] = {
                    'id': entity.id,
                    'name': name or 'PMI PLANE',
                    'origin': placement.get('origin', [0, 0, 0]),
                    'normal': placement.get('normal', [0, 0, -1]),  # z_axis
                    'writing_direction': placement.get('x_axis', [1, 0, 0]),
                }
                logger.debug(f"Extracted annotation plane {entity.id}: {name}")
                
        logger.info(f"Extracted {len(planes)} annotation planes")
        return planes

    def get_annotation_positions(self, pmi_data: Dict[str, Any]) -> None:
        """
        Enrich PMI data with correct annotation positions by following
        the DMIA chain per Chen paper Figure 12.
        
        For each dimension entity:
        DIMENSIONAL_LOCATION → DRAUGHTING_MODEL_ITEM_ASSOCIATION → DRAUGHTING_CALLOUT 
        → TESSELLATED_ANNOTATION_OCCURRENCE → AXIS2_PLACEMENT_3D → CARTESIAN_POINT
        """
        try:
            # Extract annotation planes first
            annotation_planes = self.extract_annotation_planes()
            
            # Build index of all DMIA entities for fast lookup
            dmia_entities = self.parser.find_entities('DRAUGHTING_MODEL_ITEM_ASSOCIATION')
            logger.info(f"Found {len(dmia_entities)} DRAUGHTING_MODEL_ITEM_ASSOCIATION entities")
            
            positions_found = 0
            
            # Process dimensions with correct DMIA chain following
            for dimension in pmi_data.get('dimensions', []):
                dim_id = dimension.get('id')
                if not dim_id:
                    continue
                
                position = self._extract_position_from_dmia_chain(dim_id, dmia_entities)
                if position:
                    dimension['position'] = position['position']
                    dimension['annotation_plane'] = position['annotation_plane']
                    positions_found += 1
                    logger.debug(f"Found position for dimension {dim_id}: {position['position']}")
                else:
                    # Fallback to origin if no position found
                    dimension['position'] = {'x': 0, 'y': 0, 'z': 0}
                    dimension['annotation_plane'] = {
                        'origin': [0, 0, 0],
                        'normal': [0, 0, -1],
                        'writing_direction': [1, 0, 0],
                    }
                    logger.warning(f"No position found for dimension {dim_id}, using fallback")

            # Process geometric tolerances
            for tolerance in pmi_data.get('geometric_tolerances', []):
                tol_id = tolerance.get('id')
                if not tol_id:
                    continue
                    
                position = self._extract_position_from_dmia_chain(tol_id, dmia_entities)
                if position:
                    tolerance['position'] = position['position']
                    tolerance['annotation_plane'] = position['annotation_plane']
                    positions_found += 1
                    logger.debug(f"Found position for tolerance {tol_id}: {position['position']}")
                else:
                    tolerance['position'] = {'x': 0, 'y': 0, 'z': 0}
                    tolerance['annotation_plane'] = {
                        'origin': [0, 0, 0],
                        'normal': [0, 0, -1],
                        'writing_direction': [1, 0, 0],
                    }

            # Process datums
            for datum in pmi_data.get('datums', []):
                datum_id = datum.get('id')
                if not datum_id:
                    continue
                    
                position = self._extract_position_from_dmia_chain(datum_id, dmia_entities)
                if position:
                    datum['position'] = position['position']
                    datum['annotation_plane'] = position['annotation_plane']
                    positions_found += 1
                    logger.debug(f"Found position for datum {datum_id}: {position['position']}")
                else:
                    datum['position'] = {'x': 0, 'y': 0, 'z': 0}
                    datum['annotation_plane'] = {
                        'origin': [0, 0, 0],
                        'normal': [0, 0, -1],
                        'writing_direction': [1, 0, 0],
                    }

            # Store annotation planes in PMI data for reference
            pmi_data['annotation_planes'] = list(annotation_planes.values())

            logger.info(f"Successfully extracted {positions_found} PMI positions via DMIA chain")
            
            # FALLBACK: If no DMIA positions found, use CartesianExtractor for real coordinates
            if positions_found == 0 and self.step_file_path:
                logger.warning("No DMIA chain positions found, falling back to CartesianExtractor")
                try:
                    from cartesian_extractor import CartesianExtractor
                    cartesian_extractor = CartesianExtractor()
                    pmi_positions = cartesian_extractor.get_pmi_positions(self.step_file_path)
                    
                    if pmi_positions:
                        coord_list = list(pmi_positions.values())
                        coord_index = 0
                        
                        # Apply fallback coordinates to dimensions
                        for dimension in pmi_data.get('dimensions', []):
                            if coord_index < len(coord_list):
                                x, y, z = coord_list[coord_index]
                                dimension['position'] = {'x': x, 'y': y, 'z': z}
                                dimension['annotation_plane'] = {
                                    'origin': [x, y, z],
                                    'normal': [0, 0, -1],
                                    'writing_direction': [1, 0, 0],
                                }
                                coord_index += 1
                                logger.debug(f"Applied fallback position to dimension {dimension.get('id')}: ({x}, {y}, {z})")
                        
                        # Apply to tolerances
                        for tolerance in pmi_data.get('geometric_tolerances', []):
                            if coord_index < len(coord_list):
                                x, y, z = coord_list[coord_index]
                                tolerance['position'] = {'x': x, 'y': y, 'z': z}
                                tolerance['annotation_plane'] = {
                                    'origin': [x, y, z],
                                    'normal': [0, 0, -1],
                                    'writing_direction': [1, 0, 0],
                                }
                                coord_index += 1
                        
                        # Apply to datums
                        for datum in pmi_data.get('datums', []):
                            if coord_index < len(coord_list):
                                x, y, z = coord_list[coord_index]
                                datum['position'] = {'x': x, 'y': y, 'z': z}
                                datum['annotation_plane'] = {
                                    'origin': [x, y, z],
                                    'normal': [0, 0, -1],
                                    'writing_direction': [1, 0, 0],
                                }
                                coord_index += 1
                        
                        logger.info(f"Applied {coord_index} fallback CartesianExtractor positions")
                except ImportError:
                    logger.error("CartesianExtractor not available for fallback")
                except Exception as e:
                    logger.error(f"Fallback CartesianExtractor failed: {e}")

        except Exception as e:
            logger.error(f"Failed to extract PMI positions: {e}")

    def _extract_position_from_dmia_chain(self, entity_id: str, dmia_entities: List[StepEntity]) -> Optional[Dict[str, Any]]:
        """
        Extract position for a specific PMI entity by following the DMIA chain.
        
        Returns dict with 'position' and 'annotation_plane' keys or None if not found.
        """
        try:
            # Step 1: Find DMIA that references this entity OR that this entity references
            target_dmia = None
            
            for dmia in dmia_entities:
                item_ref = self.parser.get_attribute_value(dmia, 2)
                
                # Direct match: DMIA references our entity ID
                if item_ref == entity_id:
                    target_dmia = dmia
                    logger.debug(f"Direct DMIA match: {dmia.id} references {entity_id}")
                    break
                
                # Indirect match: Our entity references what DMIA references
                # E.g., DIMENSIONAL_SIZE(#296) references #775, and DMIA references #775
                entity = self.parser.get_entity(entity_id)
                if entity:
                    # Check if our dimension entity references the same shape aspect that DMIA references
                    for attr in entity.parsed_attributes:
                        if isinstance(attr, str) and attr == item_ref:
                            target_dmia = dmia
                            logger.debug(f"Indirect DMIA match: {entity_id} references {item_ref}, DMIA {dmia.id} also references {item_ref}")
                            break
                    
                    if target_dmia:
                        break
            
            if not target_dmia:
                logger.debug(f"No DMIA found for entity {entity_id}")
                return None
            
            dmia = target_dmia
            logger.debug(f"Found DMIA {dmia.id} for entity {entity_id}")
            
            # Step 2: Get presentation ref (attribute index 4) → DRAUGHTING_CALLOUT
            callout_ref = self.parser.get_attribute_value(dmia, 4)
            if not callout_ref:
                logger.debug(f"No callout reference in DMIA {dmia.id}")
                return None
            
            callout = self.parser.get_entity(callout_ref)
            if not callout:
                logger.debug(f"Could not find callout entity {callout_ref}")
                return None
            
            logger.debug(f"Found DRAUGHTING_CALLOUT {callout_ref}")
            
            # Step 3: Get tessellated refs from callout (attribute index 1)
            tess_refs = self.parser.get_attribute_value(callout, 1)
            if not isinstance(tess_refs, list):
                tess_refs = [tess_refs] if tess_refs else []
            
            logger.debug(f"Found {len(tess_refs)} tessellated references")
            
            for tess_ref in tess_refs:
                if not tess_ref:
                    continue
                    
                tess = self.parser.get_entity(tess_ref)
                if not tess:
                    continue
                
                logger.debug(f"Processing tessellated entity {tess_ref}")
                
                # Step 4: Find AXIS2_PLACEMENT_3D reference in tessellated entity
                axis_ref = self._find_axis_placement_in_entity(tess)
                if not axis_ref:
                    logger.debug(f"No axis placement found in {tess_ref}")
                    continue
                
                logger.debug(f"Found axis placement {axis_ref}")
                
                # Step 5: Get position from AXIS2_PLACEMENT_3D
                placement = self.parser.get_axis_placement(axis_ref)
                if placement:
                    origin = placement.get('origin', [0, 0, 0])
                    logger.debug(f"Extracted position from axis placement: {origin}")
                    
                    return {
                        'position': {'x': origin[0], 'y': origin[1], 'z': origin[2]},
                        'annotation_plane': {
                            'origin': origin,
                            'normal': placement.get('normal', [0, 0, -1]),
                            'writing_direction': placement.get('x_axis', [1, 0, 0]),
                        }
                    }
            
            logger.debug(f"No DMIA chain found for entity {entity_id}")
            return None
            
        except Exception as e:
            logger.error(f"Error extracting position for {entity_id}: {e}")
            return None

    def _find_axis_placement_in_entity(self, entity: StepEntity) -> Optional[str]:
        """
        Find AXIS2_PLACEMENT_3D reference within a tessellated/repositioned entity.
        Searches entity attributes and raw line for #ID references to axis placements.
        """
        try:
            # Check parsed attributes for direct references
            for attr in entity.parsed_attributes:
                if isinstance(attr, str) and attr.startswith('#'):
                    ref_entity = self.parser.get_entity(attr)
                    if ref_entity and ref_entity.has_type('AXIS2_PLACEMENT_3D'):
                        logger.debug(f"Found direct axis placement reference: {attr}")
                        return attr
                    
                    # Recurse one level for REPOSITIONED_TESSELLATED_ITEM
                    if ref_entity:
                        for sub_attr in ref_entity.parsed_attributes:
                            if isinstance(sub_attr, str) and sub_attr.startswith('#'):
                                sub_entity = self.parser.get_entity(sub_attr)
                                if sub_entity and sub_entity.has_type('AXIS2_PLACEMENT_3D'):
                                    logger.debug(f"Found nested axis placement reference: {sub_attr}")
                                    return sub_attr
            
            # Fallback: regex search raw line for any axis placement references
            if hasattr(entity, 'raw_line'):
                import re
                refs = re.findall(r'#\d+', entity.raw_line)
                for ref in refs:
                    ref_entity = self.parser.get_entity(ref)
                    if ref_entity and ref_entity.has_type('AXIS2_PLACEMENT_3D'):
                        logger.debug(f"Found axis placement in raw line: {ref}")
                        return ref
            
            return None
            
        except Exception as e:
            logger.error(f"Error finding axis placement in entity {entity.id}: {e}")
            return None

    def _legacy_get_presentation_position(self, presentation_ref: str) -> Optional[Dict[str, float]]:
        """
        Legacy method for getting position from presentation entity.
        
        Kept for fallback compatibility but should not be used as it returns
        broken coordinates. Use modular coordinate extraction instead.
        """
        logger.warning("Using legacy coordinate extraction - positions will be incorrect")
        return {'x': 0, 'y': 0, 'z': 0}


class SurfaceFinishExtractor:
    """
    Extract surface finish/roughness symbols from STEP files.

    Supports ISO 1302 and ASME Y14.36 surface texture symbols.

    Entity types handled:
    - SURFACE_TEXTURE_REPRESENTATION (AP242)
    - SURFACE_TEXTURE_PARAMETER
    - MACHINING_ALLOWANCE
    - Plus text-based parsing for graphical annotations
    """

    # Lay direction symbols per ISO 1302
    LAY_SYMBOLS = {
        'PARALLEL': '=',      # Parallel to projection plane
        'PERPENDICULAR': '⊥', # Perpendicular to projection plane
        'CROSSED': 'X',       # Crossed (two directions)
        'MULTIDIRECTIONAL': 'M',
        'CIRCULAR': 'C',
        'RADIAL': 'R',
        'PARTICULATE': 'P',   # Particulate/non-directional
    }

    def __init__(self, parser: StepParser):
        self.parser = parser

    def extract_surface_finishes(self) -> List[Dict[str, Any]]:
        """
        Extract all surface finish symbols from the STEP file.

        Returns:
            List of surface finish dictionaries
        """
        surface_finishes = []
        index = 1

        # Method 1: Look for SURFACE_TEXTURE_REPRESENTATION (AP242 semantic)
        str_entities = self.parser.find_entities('SURFACE_TEXTURE_REPRESENTATION')
        for entity in str_entities:
            sf = self._extract_surface_texture_repr(entity, index)
            if sf:
                surface_finishes.append(sf)
                index += 1

        # Method 2: Look for SURFACE_TEXTURE_PARAMETER
        stp_entities = self.parser.find_entities('SURFACE_TEXTURE_PARAMETER')
        for entity in stp_entities:
            sf = self._extract_surface_texture_param(entity, index)
            if sf:
                surface_finishes.append(sf)
                index += 1

        # Method 3: Look for MACHINING_ALLOWANCE
        ma_entities = self.parser.find_entities('MACHINING_ALLOWANCE')
        for entity in ma_entities:
            sf = self._extract_machining_allowance(entity, index)
            if sf:
                surface_finishes.append(sf)
                index += 1

        # Method 4: Text-based search in annotations for roughness patterns
        # Look for text annotations containing Ra, Rz, etc.
        text_based = self._extract_from_text_annotations(index)
        surface_finishes.extend(text_based)

        logger.info(f"Extracted {len(surface_finishes)} surface finishes")
        return surface_finishes

    def _extract_surface_texture_repr(self, entity: StepEntity, index: int) -> Optional[Dict[str, Any]]:
        """Extract from SURFACE_TEXTURE_REPRESENTATION entity."""
        try:
            # Get roughness parameters from linked entities
            roughness_type = 'Ra'
            roughness_value = None

            for attr in entity.parsed_attributes:
                if isinstance(attr, str) and attr.startswith('#'):
                    ref = self.parser.get_entity(attr)
                    if ref:
                        val = self.parser.get_numeric_value_from_entity(ref)
                        if val is not None:
                            roughness_value = val
                            break

            if roughness_value is not None:
                return self._format_surface_finish(index, roughness_type, roughness_value, entity.id)

            return None

        except Exception as e:
            logger.debug(f"Could not extract surface texture repr {entity.id}: {e}")
            return None

    def _extract_surface_texture_param(self, entity: StepEntity, index: int) -> Optional[Dict[str, Any]]:
        """Extract from SURFACE_TEXTURE_PARAMETER entity."""
        try:
            # SURFACE_TEXTURE_PARAMETER('Ra', value, unit_ref)
            param_name = self.parser.get_attribute_value(entity, 0)
            value = None

            # Look for value in attributes
            for attr in entity.parsed_attributes:
                if isinstance(attr, (int, float)):
                    value = float(attr)
                    break
                if isinstance(attr, str) and attr.startswith('#'):
                    ref = self.parser.get_entity(attr)
                    if ref:
                        val = self.parser.get_numeric_value_from_entity(ref)
                        if val is not None:
                            value = val
                            break

            if value is not None:
                roughness_type = str(param_name) if param_name else 'Ra'
                return self._format_surface_finish(index, roughness_type, value, entity.id)

            return None

        except Exception as e:
            logger.debug(f"Could not extract surface texture param {entity.id}: {e}")
            return None

    def _extract_machining_allowance(self, entity: StepEntity, index: int) -> Optional[Dict[str, Any]]:
        """Extract machining allowance information."""
        try:
            value = None
            for attr in entity.parsed_attributes:
                if isinstance(attr, (int, float)):
                    value = float(attr)
                    break
                if isinstance(attr, str) and attr.startswith('#'):
                    ref = self.parser.get_entity(attr)
                    if ref:
                        val = self.parser.get_numeric_value_from_entity(ref)
                        if val is not None:
                            value = val
                            break

            if value is not None:
                return {
                    'id': entity.id,
                    'type': 'machining_allowance',
                    'roughness_type': None,
                    'roughness_value': None,
                    'machining_allowance': value,
                    'unit': 'mm',
                    'lay_symbol': None,
                    'text': f"Machining allowance: {value:.2f} mm",
                    'position': {'x': 0, 'y': 0, 'z': 0},
                    'associated_geometry': [],
                }

            return None

        except Exception as e:
            logger.debug(f"Could not extract machining allowance {entity.id}: {e}")
            return None

    def _extract_from_text_annotations(self, start_index: int) -> List[Dict[str, Any]]:
        """Extract surface finish from text annotations containing roughness values."""
        results = []
        index = start_index

        # Look for DRAUGHTING_ANNOTATION_OCCURRENCE or TEXT_LITERAL
        for entity_type in ['TEXT_LITERAL', 'ANNOTATION_TEXT_OCCURRENCE', 'DRAUGHTING_ANNOTATION_OCCURRENCE']:
            entities = self.parser.find_entities(entity_type)
            for entity in entities:
                # Check raw line for roughness patterns
                raw = entity.raw_line.upper()

                # Match patterns like Ra3.2, Rz12.5, Ra 1.6, etc.
                patterns = [
                    (r'RA\s*[=:]?\s*([\d.]+)', 'Ra'),
                    (r'RZ\s*[=:]?\s*([\d.]+)', 'Rz'),
                    (r'RY\s*[=:]?\s*([\d.]+)', 'Ry'),
                    (r'RQ\s*[=:]?\s*([\d.]+)', 'Rq'),
                ]

                for pattern, roughness_type in patterns:
                    match = re.search(pattern, raw)
                    if match:
                        try:
                            value = float(match.group(1))
                            sf = self._format_surface_finish(index, roughness_type, value, entity.id)
                            results.append(sf)
                            index += 1
                            break
                        except ValueError:
                            continue

        return results

    def _format_surface_finish(
        self,
        index: int,
        roughness_type: str,
        roughness_value: float,
        entity_id: str
    ) -> Dict[str, Any]:
        """Format surface finish data for output."""
        return {
            'id': entity_id,
            'type': 'surface_finish',
            'roughness_type': roughness_type,
            'roughness_value': roughness_value,
            'roughness_unit': 'μm',
            'machining_allowance': None,
            'lay_symbol': None,
            'text': f"{roughness_type} {roughness_value} μm",
            'position': {'x': 0, 'y': 0, 'z': 0},
            'associated_geometry': [],
        }


class WeldSymbolExtractor:
    """
    Extract weld symbols from STEP files.

    Supports AWS A2.4 and ISO 2553 weld symbol standards.

    Entity types handled:
    - WELD (base weld definition)
    - WELD_SYMBOL
    - WELDING_PROCESS
    - Plus text-based parsing for graphical annotations
    """

    # Weld type symbols per AWS A2.4 / ISO 2553
    WELD_TYPES = {
        'FILLET': '△',
        'GROOVE': 'V',
        'SQUARE': '||',
        'V_GROOVE': 'V',
        'BEVEL': '/',
        'U_GROOVE': 'U',
        'J_GROOVE': 'J',
        'FLARE_V': 'V~',
        'FLARE_BEVEL': '/~',
        'PLUG': '○',
        'SLOT': '▭',
        'SPOT': '●',
        'SEAM': '—',
        'BACK': '⌒',
        'SURFACING': '∿',
        'EDGE': '⊏',
    }

    def __init__(self, parser: StepParser):
        self.parser = parser

    def extract_weld_symbols(self) -> List[Dict[str, Any]]:
        """
        Extract all weld symbols from the STEP file.

        Returns:
            List of weld symbol dictionaries
        """
        weld_symbols = []
        index = 1

        # Method 1: Look for WELD entities (AP242)
        weld_entities = self.parser.find_entities('WELD')
        for entity in weld_entities:
            ws = self._extract_weld(entity, index)
            if ws:
                weld_symbols.append(ws)
                index += 1

        # Method 2: Look for WELD_SYMBOL entities
        ws_entities = self.parser.find_entities('WELD_SYMBOL')
        for entity in ws_entities:
            ws = self._extract_weld_symbol(entity, index)
            if ws:
                weld_symbols.append(ws)
                index += 1

        # Method 3: Look for WELDING_PROCESS
        wp_entities = self.parser.find_entities('WELDING_PROCESS')
        for entity in wp_entities:
            ws = self._extract_welding_process(entity, index)
            if ws:
                weld_symbols.append(ws)
                index += 1

        # Method 4: Text-based search for weld annotations
        text_based = self._extract_from_text_annotations(index)
        weld_symbols.extend(text_based)

        logger.info(f"Extracted {len(weld_symbols)} weld symbols")
        return weld_symbols

    def _extract_weld(self, entity: StepEntity, index: int) -> Optional[Dict[str, Any]]:
        """Extract from WELD entity."""
        try:
            name = self.parser.get_attribute_value(entity, 0) or ''
            weld_type = self._determine_weld_type(entity, name)

            return self._format_weld_symbol(index, weld_type, entity.id, name)

        except Exception as e:
            logger.debug(f"Could not extract weld {entity.id}: {e}")
            return None

    def _extract_weld_symbol(self, entity: StepEntity, index: int) -> Optional[Dict[str, Any]]:
        """Extract from WELD_SYMBOL entity."""
        try:
            name = self.parser.get_attribute_value(entity, 0) or ''
            weld_type = self._determine_weld_type(entity, name)

            return self._format_weld_symbol(index, weld_type, entity.id, name)

        except Exception as e:
            logger.debug(f"Could not extract weld symbol {entity.id}: {e}")
            return None

    def _extract_welding_process(self, entity: StepEntity, index: int) -> Optional[Dict[str, Any]]:
        """Extract from WELDING_PROCESS entity."""
        try:
            name = self.parser.get_attribute_value(entity, 0) or ''

            # Extract process type (e.g., GMAW, GTAW, SMAW)
            process_type = None
            for attr in entity.parsed_attributes:
                if isinstance(attr, str) and attr.upper() in ['GMAW', 'GTAW', 'SMAW', 'FCAW', 'SAW', 'MIG', 'TIG']:
                    process_type = attr.upper()
                    break

            return {
                'id': entity.id,
                'type': 'welding_process',
                'weld_type': 'process',
                'symbol': '',
                'process': process_type,
                'size': None,
                'length': None,
                'pitch': None,
                'text': f"Welding: {process_type or name}",
                'position': {'x': 0, 'y': 0, 'z': 0},
                'associated_geometry': [],
            }

        except Exception as e:
            logger.debug(f"Could not extract welding process {entity.id}: {e}")
            return None

    def _determine_weld_type(self, entity: StepEntity, name: str) -> str:
        """Determine weld type from entity or name."""
        name_upper = name.upper()
        raw_upper = entity.raw_line.upper()

        for weld_type in self.WELD_TYPES.keys():
            if weld_type in name_upper or weld_type in raw_upper:
                return weld_type.lower()

        return 'unknown'

    def _extract_from_text_annotations(self, start_index: int) -> List[Dict[str, Any]]:
        """Extract weld symbols from text annotations."""
        results = []
        index = start_index

        # Look for text annotations containing weld-related terms
        for entity_type in ['TEXT_LITERAL', 'ANNOTATION_TEXT_OCCURRENCE']:
            entities = self.parser.find_entities(entity_type)
            for entity in entities:
                raw = entity.raw_line.upper()

                # Check for weld-related keywords
                if any(kw in raw for kw in ['WELD', 'FILLET', 'GROOVE', 'GMAW', 'GTAW', 'SMAW']):
                    # Extract size if present (e.g., "5mm FILLET WELD")
                    size = None
                    size_match = re.search(r'(\d+(?:\.\d+)?)\s*(?:MM|IN)', raw)
                    if size_match:
                        size = float(size_match.group(1))

                    weld_type = 'unknown'
                    for wt in self.WELD_TYPES.keys():
                        if wt in raw:
                            weld_type = wt.lower()
                            break

                    ws = self._format_weld_symbol(index, weld_type, entity.id, '', size)
                    results.append(ws)
                    index += 1

        return results

    def _format_weld_symbol(
        self,
        index: int,
        weld_type: str,
        entity_id: str,
        name: str = '',
        size: Optional[float] = None
    ) -> Dict[str, Any]:
        """Format weld symbol data for output."""
        symbol = self.WELD_TYPES.get(weld_type.upper(), '')
        text = f"{symbol} {weld_type.replace('_', ' ').title()}"
        if size:
            text += f" {size}mm"

        return {
            'id': entity_id,
            'type': 'weld',
            'weld_type': weld_type,
            'symbol': symbol,
            'size': size,
            'length': None,
            'pitch': None,
            'process': None,
            'text': text,
            'position': {'x': 0, 'y': 0, 'z': 0},
            'associated_geometry': [],
        }


class AP203AP214Extractor:
    """
    Extract PMI from AP203/AP214 STEP files.

    These older formats store PMI differently than AP242:
    - Graphical PMI as polylines/curves (not semantic)
    - Text annotations with dimension values
    - Limited tolerance representation

    This extractor parses graphical PMI and attempts to extract
    values from text annotations.
    """

    def __init__(self, parser: StepParser):
        self.parser = parser

    def is_ap203_or_ap214(self) -> bool:
        """Check if the file is AP203 or AP214 format."""
        # Check FILE_SCHEMA in header by looking for these entity types
        # AP242 has specific entity types not in AP203/AP214

        # If we have AP242-specific entities, it's not AP203/AP214
        ap242_types = ['DIMENSIONAL_SIZE', 'GEOMETRIC_TOLERANCE', 'DATUM_SYSTEM']
        for t in ap242_types:
            if self.parser.find_entities(t):
                return False

        # Check for draughting entities common in AP203/AP214
        # Note: AP203 uses ANNOTATION_OCCURRENCE, not DRAUGHTING_ANNOTATION_OCCURRENCE
        ap203_types = [
            'ANNOTATION_OCCURRENCE',
            'DRAUGHTING_ANNOTATION_OCCURRENCE',
            'ANNOTATION_CURVE_OCCURRENCE',
            'DRAUGHTING_MODEL_ITEM_ASSOCIATION',
        ]
        for t in ap203_types:
            if self.parser.find_entities(t):
                return True

        return False

    def extract_graphical_dimensions(self) -> List[Dict[str, Any]]:
        """
        Extract dimension-like information from graphical PMI in AP203/AP214.

        This parses text annotations and attempts to extract numeric values.
        """
        dimensions = []
        index = 1

        # Look for ANNOTATION_OCCURRENCE (primary AP203 format)
        # Format: ANNOTATION_OCCURRENCE('type',(#item_refs),#curve_ref)
        ao_entities = self.parser.find_entities('ANNOTATION_OCCURRENCE')
        for entity in ao_entities:
            dim = self._extract_from_annotation_occurrence(entity, index)
            if dim:
                dimensions.append(dim)
                index += 1

        # Look for ANNOTATION_TEXT_OCCURRENCE
        text_entities = self.parser.find_entities('ANNOTATION_TEXT_OCCURRENCE')
        for entity in text_entities:
            dim = self._extract_dimension_from_text(entity, index)
            if dim:
                dimensions.append(dim)
                index += 1

        # Look for DRAUGHTING_ANNOTATION_OCCURRENCE
        dao_entities = self.parser.find_entities('DRAUGHTING_ANNOTATION_OCCURRENCE')
        for entity in dao_entities:
            dim = self._extract_dimension_from_draughting(entity, index)
            if dim:
                dimensions.append(dim)
                index += 1

        # Look for TEXT_LITERAL with numeric content
        text_lit_entities = self.parser.find_entities('TEXT_LITERAL')
        for entity in text_lit_entities:
            dim = self._extract_dimension_from_text_literal(entity, index)
            if dim:
                dimensions.append(dim)
                index += 1

        logger.info(f"AP203/AP214: Extracted {len(dimensions)} graphical dimensions")
        return dimensions

    def _extract_from_annotation_occurrence(self, entity: StepEntity, index: int) -> Optional[Dict[str, Any]]:
        """Extract dimension from ANNOTATION_OCCURRENCE (AP203 format)."""
        try:
            raw = entity.raw_line

            # Parse: ANNOTATION_OCCURRENCE('type',(#item_refs),#style_ref)
            # Types: 'radial dimension', 'linear dimension', 'angular dimension', 'fcf', 'datum', 'note'
            type_match = re.search(r"ANNOTATION_OCCURRENCE\s*\(\s*'([^']+)'", raw, re.IGNORECASE)
            if not type_match:
                return None

            annotation_type = type_match.group(1).lower()

            # Map annotation types to dimension types
            type_map = {
                'radial dimension': 'radius',
                'linear dimension': 'linear',
                'angular dimension': 'angular',
                'diameter dimension': 'diameter',
            }

            dim_type = type_map.get(annotation_type)
            if not dim_type:
                # This is not a dimension (might be fcf, datum, note)
                return None

            # Try to find associated text/value
            # Look for referenced items in parentheses: (#3431)
            item_refs = re.findall(r'#(\d+)', raw)
            value = None

            for ref_id in item_refs:
                ref_entity = self.parser.get_entity(ref_id)
                if ref_entity:
                    # Check if it's a composite curve or text
                    value = self._extract_numeric_from_entity(ref_entity)
                    if value is not None:
                        break

            # If no value found, create placeholder with type info
            if value is None:
                return {
                    'id': f'ap203_dim_{index}',
                    'type': dim_type,
                    'value': 0.0,
                    'unit': 'mm',
                    'tolerance': None,
                    'text': f'{annotation_type.title()}',
                    'position': {'x': 0, 'y': 0, 'z': 0},
                    'source': 'graphical_pmi',
                    'entity_id': entity.id,
                }

            return self._format_graphical_dimension(index, dim_type, value, entity.id)

        except Exception as e:
            logger.debug(f"Could not extract ANNOTATION_OCCURRENCE {entity.id}: {e}")
            return None

    def _extract_numeric_from_entity(self, entity: StepEntity) -> Optional[float]:
        """Try to extract a numeric value from an entity."""
        raw = entity.raw_line

        # Look for dimension value patterns
        patterns = [
            r'LENGTH_MEASURE\s*\(\s*([\d.]+)',
            r'PLANE_ANGLE_MEASURE\s*\(\s*([\d.]+)',
            r"'([\d.]+)'",  # Value in quotes
            r'\(\s*([\d.]+)\s*[,)]',  # First number in parentheses
        ]

        for pattern in patterns:
            match = re.search(pattern, raw)
            if match:
                try:
                    return float(match.group(1))
                except ValueError:
                    continue

        return None

    def extract_graphical_annotations(self) -> List[Dict[str, Any]]:
        """Extract graphical PMI (polylines, curves, symbols) from AP203/AP214."""
        annotations = []
        index = 1

        # Look for ANNOTATION_OCCURRENCE that are NOT dimensions (fcf, datum, note)
        ao_entities = self.parser.find_entities('ANNOTATION_OCCURRENCE')
        for entity in ao_entities:
            ann = self._extract_non_dimension_annotation(entity, index)
            if ann:
                annotations.append(ann)
                index += 1

        # Look for ANNOTATION_CURVE_OCCURRENCE
        curve_entities = self.parser.find_entities('ANNOTATION_CURVE_OCCURRENCE')
        for entity in curve_entities:
            ann = self._extract_curve_annotation(entity, index)
            if ann:
                annotations.append(ann)
                index += 1

        # Look for LEADER_CURVE
        leader_entities = self.parser.find_entities('LEADER_CURVE')
        for entity in leader_entities:
            ann = self._extract_leader(entity, index)
            if ann:
                annotations.append(ann)
                index += 1

        logger.info(f"AP203/AP214: Extracted {len(annotations)} graphical annotations")
        return annotations

    def _extract_non_dimension_annotation(self, entity: StepEntity, index: int) -> Optional[Dict[str, Any]]:
        """Extract non-dimension annotations (fcf, datum, note) from ANNOTATION_OCCURRENCE."""
        try:
            raw = entity.raw_line

            type_match = re.search(r"ANNOTATION_OCCURRENCE\s*\(\s*'([^']+)'", raw, re.IGNORECASE)
            if not type_match:
                return None

            annotation_type = type_match.group(1).lower()

            # Skip dimensions - those are handled by extract_graphical_dimensions
            dimension_types = {'radial dimension', 'linear dimension', 'angular dimension', 'diameter dimension'}
            if annotation_type in dimension_types:
                return None

            # Map annotation types to PMI types
            type_display = {
                'fcf': 'GD&T Feature Control Frame',
                'datum': 'Datum Reference',
                'note': 'Note',
                'surface finish': 'Surface Finish',
            }

            display_type = type_display.get(annotation_type, annotation_type.title())

            return {
                'id': f'ap203_ann_{index}',
                'type': annotation_type,
                'text': display_type,
                'position': {'x': 0, 'y': 0, 'z': 0},
                'source': 'graphical_pmi',
                'entity_id': entity.id,
            }

        except Exception as e:
            logger.debug(f"Could not extract non-dimension annotation {entity.id}: {e}")
            return None

    def _extract_dimension_from_text(self, entity: StepEntity, index: int) -> Optional[Dict[str, Any]]:
        """Extract dimension from text annotation."""
        try:
            # Look for numeric value in the annotation
            raw = entity.raw_line

            # Match dimension patterns: 25.4, Ø35, R10, 45°, etc.
            patterns = [
                (r'[ØⰆ∅]\s*([\d.]+)', 'diameter'),
                (r'R\s*([\d.]+)', 'radius'),
                (r'([\d.]+)\s*[°]', 'angular'),
                (r'([\d.]+)\s*(?:mm|MM|in|IN)', 'linear'),
                (r"'([\d.]+)'", 'linear'),  # Value in quotes
            ]

            for pattern, dim_type in patterns:
                match = re.search(pattern, raw)
                if match:
                    value = float(match.group(1))
                    return self._format_graphical_dimension(index, dim_type, value, entity.id)

            return None

        except Exception as e:
            logger.debug(f"Could not extract text dimension {entity.id}: {e}")
            return None

    def _extract_dimension_from_draughting(self, entity: StepEntity, index: int) -> Optional[Dict[str, Any]]:
        """Extract dimension from draughting annotation."""
        # Similar to text extraction but looks at linked entities
        try:
            for attr in entity.parsed_attributes:
                if isinstance(attr, str) and attr.startswith('#'):
                    ref = self.parser.get_entity(attr)
                    if ref and ref.has_type('TEXT_LITERAL'):
                        return self._extract_dimension_from_text_literal(ref, index)

            return None

        except Exception as e:
            logger.debug(f"Could not extract draughting dimension {entity.id}: {e}")
            return None

    def _extract_dimension_from_text_literal(self, entity: StepEntity, index: int) -> Optional[Dict[str, Any]]:
        """Extract dimension from TEXT_LITERAL entity."""
        try:
            # TEXT_LITERAL has text content in attributes
            text = None
            for attr in entity.parsed_attributes:
                if isinstance(attr, str) and not attr.startswith('#'):
                    text = attr
                    break

            if not text:
                text = entity.raw_line

            # Look for numeric values
            match = re.search(r'([\d.]+)', text)
            if match:
                value = float(match.group(1))

                # Determine type from context
                dim_type = 'linear'
                if 'Ø' in text or '∅' in text or 'diameter' in text.lower():
                    dim_type = 'diameter'
                elif text.startswith('R') or 'radius' in text.lower():
                    dim_type = 'radius'
                elif '°' in text:
                    dim_type = 'angular'

                return self._format_graphical_dimension(index, dim_type, value, entity.id)

            return None

        except Exception as e:
            logger.debug(f"Could not extract text literal {entity.id}: {e}")
            return None

    def _extract_curve_annotation(self, entity: StepEntity, index: int) -> Optional[Dict[str, Any]]:
        """Extract curve annotation (leader lines, dimension lines)."""
        try:
            return {
                'id': entity.id,
                'type': 'curve',
                'points': [],  # Would need to extract from geometry
                'position': {'x': 0, 'y': 0, 'z': 0},
            }
        except Exception:
            return None

    def _extract_leader(self, entity: StepEntity, index: int) -> Optional[Dict[str, Any]]:
        """Extract leader line."""
        try:
            return {
                'id': entity.id,
                'type': 'leader',
                'points': [],
                'position': {'x': 0, 'y': 0, 'z': 0},
            }
        except Exception:
            return None

    def _format_graphical_dimension(
        self,
        index: int,
        dim_type: str,
        value: float,
        entity_id: str
    ) -> Dict[str, Any]:
        """Format graphical dimension data."""
        prefix = ''
        unit = 'mm'
        if dim_type == 'diameter':
            prefix = '⌀'
        elif dim_type == 'radius':
            prefix = 'R'
        elif dim_type == 'angular':
            unit = '°'

        return {
            'id': entity_id,
            'type': dim_type,
            'value': value,
            'unit': unit,
            'tolerance': None,
            'associated_geometry': [],
            'position': {'x': 0, 'y': 0, 'z': 0},
            'text': f"{prefix}{value:.2f} {unit}",
            'source': 'graphical',  # Indicates this is from graphical PMI
        }


class PMIExtractor:
    """
    Main PMI extraction coordinator.

    Combines all extractors to produce complete PMI data.
    Supports AP203, AP214, and AP242 STEP files.
    """

    def __init__(self, step_file_path: str):
        """
        Initialize PMI extractor.

        Args:
            step_file_path: Path to STEP file
        """
        self.file_path = step_file_path
        self.parser = StepParser(step_file_path)

        # Core extractors
        self.dimension_extractor = DimensionExtractor(self.parser)
        self.tolerance_extractor = ToleranceExtractor(self.parser)
        self.datum_extractor = DatumExtractor(self.parser)
        self.annotation_extractor = AnnotationExtractor(self.parser, step_file_path)

        # Extended extractors
        self.surface_finish_extractor = SurfaceFinishExtractor(self.parser)
        self.weld_extractor = WeldSymbolExtractor(self.parser)
        self.ap203_extractor = AP203AP214Extractor(self.parser)

    def extract_all(self) -> Dict[str, Any]:
        """
        Extract all PMI from the STEP file.

        Automatically detects AP203/AP214 vs AP242 format and uses
        appropriate extraction methods.

        Returns:
            Complete PMI data structure
        """
        # Check if this is AP203/AP214 format
        is_legacy = self.ap203_extractor.is_ap203_or_ap214()

        pmi_data = {
            'version': '2.0',
            'source': 'text_parser',
            'schema': 'AP203/AP214' if is_legacy else 'AP242',
            'dimensions': [],
            'geometric_tolerances': [],
            'datums': [],
            'surface_finishes': [],
            'weld_symbols': [],
            'notes': [],
            'graphical_pmi': [],
        }

        if is_legacy:
            # AP203/AP214: Use graphical PMI extraction
            logger.info("Detected AP203/AP214 format, using graphical PMI extraction")
            pmi_data['dimensions'] = self.ap203_extractor.extract_graphical_dimensions()
            pmi_data['graphical_pmi'] = self.ap203_extractor.extract_graphical_annotations()
        else:
            # AP242: Use semantic PMI extraction
            pmi_data['dimensions'] = self.dimension_extractor.extract_dimensions()
            pmi_data['geometric_tolerances'] = self.tolerance_extractor.extract_tolerances()
            pmi_data['datums'] = self.datum_extractor.extract_datums()

            # NEW: Extract annotation planes and link PMI to presentation
            annotation_planes = self.annotation_extractor.extract_annotation_planes()
            
            # NEW: Link PMI to annotation planes via DMIA chain
            presentation_linker = PresentationLinkExtractor(self.parser)
            
            for dim in pmi_data['dimensions']:
                presentation = presentation_linker.get_presentation_for_dimension(dim['id'])
                if presentation and presentation.get('plane_ref'):
                    plane = annotation_planes.get(presentation['plane_ref'])
                    if plane:
                        # Use real annotation plane data
                        dim['annotation_plane'] = {
                            'origin': plane['origin'],
                            'normal': plane['normal'],
                            'writing_direction': plane['writing_direction'],
                        }
                        logger.debug(f"Linked dimension {dim['id']} to annotation plane {presentation['plane_ref']}")
            
            # Store annotation planes for reference
            pmi_data['annotation_planes'] = list(annotation_planes.values())

        # Extract surface finishes and welds (works for both formats)
        pmi_data['surface_finishes'] = self.surface_finish_extractor.extract_surface_finishes()
        pmi_data['weld_symbols'] = self.weld_extractor.extract_weld_symbols()

        # Enrich with annotation positions
        self.annotation_extractor.get_annotation_positions(pmi_data)

        # Add statistics
        pmi_data['statistics'] = {
            'dimension_count': len(pmi_data['dimensions']),
            'tolerance_count': len(pmi_data['geometric_tolerances']),
            'datum_count': len(pmi_data['datums']),
            'surface_finish_count': len(pmi_data['surface_finishes']),
            'weld_count': len(pmi_data['weld_symbols']),
            'is_legacy_format': is_legacy,
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
