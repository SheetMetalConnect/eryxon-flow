"""
STEP AP242 Text Parser

Parses STEP files as plain text to extract entities and their relationships.
This approach bypasses pythonocc-core's incomplete PMI bindings.

Based on ISO 10303-21 (STEP Part 21) file format specification.
"""

import re
import logging
from typing import Dict, List, Optional, Tuple, Any, Set
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


class EntityNotFoundError(Exception):
    """Raised when a referenced entity is not found."""
    pass


class ParseError(Exception):
    """Raised when a STEP entity cannot be parsed."""
    pass


class CircularReferenceError(Exception):
    """Raised when circular entity references are detected."""
    pass


@dataclass
class StepEntity:
    """Represents a parsed STEP entity."""

    id: str
    types: List[str]  # Can have multiple types (complex entity)
    attributes: str
    raw_line: str
    parsed_attributes: List[Any] = field(default_factory=list)

    @property
    def primary_type(self) -> str:
        """Return the first (primary) entity type."""
        return self.types[0] if self.types else "UNKNOWN"

    def has_type(self, type_name: str) -> bool:
        """Check if this entity has the given type."""
        return type_name.upper() in [t.upper() for t in self.types]


class StepParser:
    """
    Parse STEP AP242 files as plain text.

    STEP files follow ISO 10303-21 format:
    - ASCII text format
    - Entities defined as: #ID = ENTITY_TYPE(attributes);
    - References to other entities use #ID notation
    - Complex entities can have multiple types: (#ID = (TYPE1() TYPE2() ...);)

    Example:
        parser = StepParser('/path/to/file.stp')
        dims = parser.find_entities('DIMENSIONAL_LOCATION')
        for dim in dims:
            print(f"Found dimension: {dim.id}")
    """

    def __init__(self, step_file_path: str):
        """
        Load and parse a STEP file.

        Args:
            step_file_path: Path to the STEP file
        """
        self.file_path = step_file_path
        self.entities: Dict[str, StepEntity] = {}
        self.entities_by_type: Dict[str, List[str]] = {}  # type -> [entity_ids]
        self._parse_file(step_file_path)

    def _parse_file(self, path: str) -> None:
        """
        Read STEP file and parse all entities.

        The DATA section is between 'DATA;' and 'ENDSEC;'.
        Each entity is defined as: #ID = ENTITY_TYPE(attributes);
        Complex entities can span multiple lines.
        """
        try:
            with open(path, 'r', encoding='utf-8', errors='replace') as f:
                content = f.read()
        except Exception as e:
            logger.error(f"Failed to read STEP file: {e}")
            raise

        # Extract DATA section
        data_match = re.search(r'DATA\s*;(.*?)ENDSEC\s*;', content, re.DOTALL | re.IGNORECASE)
        if not data_match:
            raise ValueError("No DATA section found in STEP file")

        data_section = data_match.group(1)

        # Normalize whitespace while preserving string content
        # This handles multi-line entities
        data_section = self._normalize_step_content(data_section)

        # Parse entities
        # Pattern matches: #ID = ENTITY_TYPE(attributes); or #ID = (complex types);
        # Handles complex entities with multiple types
        entity_pattern = re.compile(
            r'#(\d+)\s*=\s*'        # Entity ID
            r'('                     # Start capturing types and attributes
            r'\([^;]+\)'            # Complex entity: (TYPE1() TYPE2() ...)
            r'|'                     # OR
            r'[A-Z_][A-Z0-9_]*'     # Simple entity type
            r'\([^;]*\)'            # Followed by attributes
            r')\s*;',               # End with semicolon
            re.IGNORECASE | re.DOTALL
        )

        for match in entity_pattern.finditer(data_section):
            entity_id = f"#{match.group(1)}"
            entity_body = match.group(2).strip()
            raw_line = match.group(0)

            try:
                types, attributes = self._parse_entity_body(entity_body)
                entity = StepEntity(
                    id=entity_id,
                    types=types,
                    attributes=attributes,
                    raw_line=raw_line
                )

                # Parse attributes into structured form
                entity.parsed_attributes = self._parse_attributes(attributes)

                self.entities[entity_id] = entity

                # Index by type
                for t in types:
                    t_upper = t.upper()
                    if t_upper not in self.entities_by_type:
                        self.entities_by_type[t_upper] = []
                    self.entities_by_type[t_upper].append(entity_id)

            except Exception as e:
                logger.debug(f"Could not parse entity {entity_id}: {e}")
                continue

        logger.info(f"Parsed {len(self.entities)} entities from STEP file")

    def _normalize_step_content(self, content: str) -> str:
        """
        Normalize STEP content by handling multi-line entities.

        Preserves string literals while normalizing other whitespace.
        """
        # Replace newlines with spaces (entities can span multiple lines)
        # but preserve strings
        result = []
        in_string = False
        i = 0
        while i < len(content):
            char = content[i]
            if char == "'" and (i == 0 or content[i-1] != '\\'):
                in_string = not in_string
                result.append(char)
            elif char in '\n\r' and not in_string:
                result.append(' ')
            else:
                result.append(char)
            i += 1

        # Collapse multiple spaces (outside strings)
        normalized = ''.join(result)
        # Collapse whitespace outside strings
        final = []
        in_string = False
        prev_space = False
        for char in normalized:
            if char == "'":
                in_string = not in_string
                final.append(char)
                prev_space = False
            elif char == ' ' and not in_string:
                if not prev_space:
                    final.append(char)
                prev_space = True
            else:
                final.append(char)
                prev_space = False

        return ''.join(final)

    def _parse_entity_body(self, body: str) -> Tuple[List[str], str]:
        """
        Parse entity body into types and attributes.

        Handles both simple and complex entities:
        - Simple: ENTITY_TYPE(attributes)
        - Complex: (TYPE1(...) TYPE2(...) ...)
        """
        body = body.strip()

        if body.startswith('(') and not body.startswith('(('):
            # Complex entity with multiple types
            # Format: (TYPE1(...) TYPE2(...) ...)
            types = []
            all_attributes = []

            # Remove outer parentheses
            inner = body[1:-1].strip() if body.endswith(')') else body[1:].strip()

            # Parse each type and its attributes
            # Match TYPE_NAME() or TYPE_NAME(...)
            type_pattern = re.compile(r'([A-Z_][A-Z0-9_]*)\s*\(([^)]*)\)', re.IGNORECASE)
            for m in type_pattern.finditer(inner):
                types.append(m.group(1))
                attr = m.group(2).strip()
                if attr:
                    all_attributes.append(attr)

            # Combine all attributes
            combined_attrs = ','.join(all_attributes) if all_attributes else ''
            return types, combined_attrs

        else:
            # Simple entity: TYPE(attributes)
            match = re.match(r'([A-Z_][A-Z0-9_]*)\s*\((.*)\)', body, re.IGNORECASE | re.DOTALL)
            if match:
                return [match.group(1)], match.group(2)
            else:
                # Entity type only, no attributes
                type_match = re.match(r'([A-Z_][A-Z0-9_]*)', body, re.IGNORECASE)
                if type_match:
                    return [type_match.group(1)], ''
                raise ParseError(f"Cannot parse entity body: {body[:100]}")

    def _parse_attributes(self, attr_string: str) -> List[Any]:
        """
        Parse attribute string into a list of values.

        Handles:
        - Entity references: #123
        - Strings: 'text'
        - Numbers: 123, 45.67
        - Enums: .ENUM_VALUE.
        - Lists: (item1, item2, ...)
        - Nested structures
        - Empty values: $, *
        """
        if not attr_string or not attr_string.strip():
            return []

        result = []
        current = ''
        depth = 0
        in_string = False
        i = 0

        while i < len(attr_string):
            char = attr_string[i]

            if char == "'" and (i == 0 or attr_string[i-1] != '\\'):
                in_string = not in_string
                current += char
            elif in_string:
                current += char
            elif char == '(':
                depth += 1
                current += char
            elif char == ')':
                depth -= 1
                current += char
            elif char == ',' and depth == 0:
                # End of attribute
                result.append(self._parse_single_value(current.strip()))
                current = ''
            else:
                current += char
            i += 1

        # Add final attribute
        if current.strip():
            result.append(self._parse_single_value(current.strip()))

        return result

    def _parse_single_value(self, value: str) -> Any:
        """Parse a single attribute value."""
        value = value.strip()

        if not value or value in ('$', '*'):
            return None

        # Entity reference
        if value.startswith('#'):
            return value

        # String
        if value.startswith("'") and value.endswith("'"):
            return value[1:-1]

        # Enum
        if value.startswith('.') and value.endswith('.'):
            return value[1:-1]

        # List/tuple
        if value.startswith('(') and value.endswith(')'):
            inner = value[1:-1]
            if not inner.strip():
                return []
            return self._parse_attributes(inner)

        # Number
        try:
            if '.' in value or 'e' in value.lower():
                return float(value)
            return int(value)
        except ValueError:
            pass

        # Return as-is
        return value

    def get_entity(self, entity_id: str) -> Optional[StepEntity]:
        """
        Get entity by ID.

        Args:
            entity_id: Entity ID (e.g., '#17' or '17')

        Returns:
            StepEntity if found, None otherwise
        """
        if not entity_id:
            return None

        # Normalize ID format
        if not entity_id.startswith('#'):
            entity_id = f'#{entity_id}'

        return self.entities.get(entity_id)

    def find_entities(self, entity_type: str) -> List[StepEntity]:
        """
        Find all entities of a given type.

        Args:
            entity_type: Entity type name (e.g., 'DIMENSIONAL_LOCATION')

        Returns:
            List of matching entities
        """
        entity_ids = self.entities_by_type.get(entity_type.upper(), [])
        return [self.entities[eid] for eid in entity_ids]

    def find_entities_any_type(self, type_names: List[str]) -> List[StepEntity]:
        """
        Find all entities matching any of the given types.

        Args:
            type_names: List of entity type names

        Returns:
            List of matching entities (deduplicated)
        """
        result_ids: Set[str] = set()
        for type_name in type_names:
            entity_ids = self.entities_by_type.get(type_name.upper(), [])
            result_ids.update(entity_ids)
        return [self.entities[eid] for eid in result_ids]

    def extract_references(self, entity: StepEntity) -> List[str]:
        """
        Extract all entity references from an entity's attributes.

        Args:
            entity: The entity to extract references from

        Returns:
            List of entity IDs (e.g., ['#17', '#19'])
        """
        refs = re.findall(r'#\d+', entity.attributes)
        return refs

    def follow_reference(
        self,
        ref_id: str,
        visited: Optional[Set[str]] = None,
        max_depth: int = 50
    ) -> Optional[StepEntity]:
        """
        Follow an entity reference, detecting circular references.

        Args:
            ref_id: Entity ID to follow
            visited: Set of already visited entity IDs
            max_depth: Maximum recursion depth

        Returns:
            Referenced entity

        Raises:
            CircularReferenceError: If circular reference detected
        """
        if visited is None:
            visited = set()

        if len(visited) > max_depth:
            raise CircularReferenceError(f"Max depth {max_depth} exceeded following {ref_id}")

        if ref_id in visited:
            raise CircularReferenceError(f"Circular reference detected: {ref_id}")

        visited.add(ref_id)
        return self.get_entity(ref_id)

    def get_attribute_value(self, entity: StepEntity, index: int) -> Any:
        """
        Get a parsed attribute value by index.

        Args:
            entity: The entity
            index: Zero-based attribute index

        Returns:
            Parsed attribute value, or None if out of range
        """
        if index < len(entity.parsed_attributes):
            return entity.parsed_attributes[index]
        return None

    def resolve_reference(self, ref: Any) -> Optional[StepEntity]:
        """
        Resolve a reference value to an entity.

        Args:
            ref: A reference value (string starting with #)

        Returns:
            The referenced entity, or None
        """
        if isinstance(ref, str) and ref.startswith('#'):
            return self.get_entity(ref)
        return None

    def get_numeric_value_from_entity(self, entity: StepEntity) -> Optional[float]:
        """
        Extract a numeric value from a measure entity.

        Handles entities like:
        - LENGTH_MEASURE(48.0)
        - POSITIVE_LENGTH_MEASURE(48.0)
        - MEASURE_WITH_UNIT(LENGTH_MEASURE(48.0), #unit)

        Args:
            entity: A measure-related entity

        Returns:
            Numeric value if found
        """
        # Check attributes directly
        for attr in entity.parsed_attributes:
            if isinstance(attr, (int, float)):
                return float(attr)
            if isinstance(attr, str) and attr.startswith('#'):
                # Follow reference
                ref_entity = self.get_entity(attr)
                if ref_entity:
                    val = self.get_numeric_value_from_entity(ref_entity)
                    if val is not None:
                        return val
            if isinstance(attr, list):
                for item in attr:
                    if isinstance(item, (int, float)):
                        return float(item)

        # Try to find value in raw attributes using regex
        # Matches patterns like LENGTH_MEASURE(48.0), POSITIVE_LENGTH_MEASURE(1.5),
        # LENGTH_MEASURE(35.), etc.
        patterns = [
            # LENGTH_MEASURE(35.) or LENGTH_MEASURE(35.0) or POSITIVE_LENGTH_MEASURE(1.5)
            r'(?:POSITIVE_)?LENGTH_MEASURE\s*\(\s*([-+]?\d+\.?\d*)\s*[,\)]',
            # PLANE_ANGLE_MEASURE(60.0)
            r'PLANE_ANGLE_MEASURE\s*\(\s*([-+]?\d+\.?\d*)\s*[,\)]',
            # MEASURE_WITH_UNIT(...(value), ...)
            r'MEASURE_WITH_UNIT\s*\([^(]*\(\s*([-+]?\d+\.?\d*)\s*\)',
            # Fallback: any number in parentheses
            r'\(\s*([-+]?\d+\.?\d*)\s*[,\)]',
        ]

        for pattern in patterns:
            match = re.search(pattern, entity.raw_line, re.IGNORECASE)
            if match:
                try:
                    val_str = match.group(1)
                    # Handle trailing decimal point (e.g., "35.")
                    if val_str.endswith('.'):
                        val_str += '0'
                    return float(val_str)
                except ValueError:
                    continue

        return None

    def get_point_coordinates(self, entity_id: str) -> Optional[Tuple[float, float, float]]:
        """
        Get 3D coordinates from a CARTESIAN_POINT entity.

        Args:
            entity_id: Reference to a CARTESIAN_POINT entity

        Returns:
            Tuple of (x, y, z) coordinates, or None
        """
        entity = self.get_entity(entity_id)
        if not entity or not entity.has_type('CARTESIAN_POINT'):
            return None

        # CARTESIAN_POINT('name', (x, y, z))
        coords = self.get_attribute_value(entity, 1)
        if isinstance(coords, list) and len(coords) >= 3:
            try:
                return (float(coords[0]), float(coords[1]), float(coords[2]))
            except (ValueError, TypeError):
                pass

        return None

    def get_direction_vector(self, entity_id: str) -> Optional[Tuple[float, float, float]]:
        """
        Get direction vector from a DIRECTION entity.

        Args:
            entity_id: Reference to a DIRECTION entity

        Returns:
            Tuple of (x, y, z) direction, or None
        """
        entity = self.get_entity(entity_id)
        if not entity or not entity.has_type('DIRECTION'):
            return None

        # DIRECTION('name', (x, y, z))
        direction = self.get_attribute_value(entity, 1)
        if isinstance(direction, list) and len(direction) >= 3:
            try:
                return (float(direction[0]), float(direction[1]), float(direction[2]))
            except (ValueError, TypeError):
                pass

        return None

    def get_axis_placement(self, entity_id: str) -> Optional[Dict[str, Any]]:
        """
        Get axis placement information (position and orientation).

        Handles AXIS2_PLACEMENT_3D entities.

        Args:
            entity_id: Reference to an AXIS2_PLACEMENT_3D entity

        Returns:
            Dict with 'origin', 'z_axis' (normal), 'x_axis'
        """
        entity = self.get_entity(entity_id)
        if not entity:
            return None

        if entity.has_type('AXIS2_PLACEMENT_3D'):
            # AXIS2_PLACEMENT_3D('name', #point, #z_direction, #x_direction)
            point_ref = self.get_attribute_value(entity, 1)
            z_dir_ref = self.get_attribute_value(entity, 2)
            x_dir_ref = self.get_attribute_value(entity, 3)

            result = {}

            if point_ref:
                coords = self.get_point_coordinates(point_ref)
                if coords:
                    result['origin'] = list(coords)

            if z_dir_ref:
                direction = self.get_direction_vector(z_dir_ref)
                if direction:
                    result['z_axis'] = list(direction)
                    result['normal'] = list(direction)  # Alias

            if x_dir_ref:
                direction = self.get_direction_vector(x_dir_ref)
                if direction:
                    result['x_axis'] = list(direction)

            return result if result else None

        return None

    def count_entities_by_type(self) -> Dict[str, int]:
        """
        Count entities by type.

        Returns:
            Dict mapping entity type to count
        """
        return {t: len(ids) for t, ids in self.entities_by_type.items()}

    def get_statistics(self) -> Dict[str, Any]:
        """
        Get parsing statistics.

        Returns:
            Dict with statistics about the parsed file
        """
        type_counts = self.count_entities_by_type()

        # Count PMI-related entities
        pmi_types = [
            'DIMENSIONAL_LOCATION', 'DIMENSIONAL_SIZE', 'ANGULAR_LOCATION',
            'GEOMETRIC_TOLERANCE', 'POSITION_TOLERANCE', 'FLATNESS_TOLERANCE',
            'PERPENDICULARITY_TOLERANCE', 'SURFACE_PROFILE_TOLERANCE',
            'DATUM', 'DATUM_FEATURE', 'DATUM_SYSTEM',
            'PLUS_MINUS_TOLERANCE', 'TOLERANCE_VALUE',
        ]

        pmi_count = sum(type_counts.get(t, 0) for t in pmi_types)

        return {
            'total_entities': len(self.entities),
            'unique_types': len(type_counts),
            'pmi_entities': pmi_count,
            'top_types': sorted(type_counts.items(), key=lambda x: -x[1])[:20],
        }


def parse_step_file(file_path: str) -> StepParser:
    """
    Convenience function to parse a STEP file.

    Args:
        file_path: Path to the STEP file

    Returns:
        StepParser instance
    """
    return StepParser(file_path)
